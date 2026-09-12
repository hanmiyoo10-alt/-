import { BasicCrawler, Configuration, RequestQueue } from '@crawlee/basic';
import { RobotsTxtFile } from '@crawlee/utils';
import { acquireRenderedPage } from './render.mjs';
import { startPolicyProxy } from './policy-proxy.mjs';
import { TargetPolicyError, validateTarget } from './policy.mjs';

const METHOD = 'CRAWLEE_QUEUE_PLAYWRIGHT_RENDER';
const SILENT_LOG = {
  getOptions() { return { prefix: 'WebAcquisition' }; },
  child() { return this; },
  debug() {}, info() {}, warning() {}, warningOnce() {},
  error() {}, exception() {}, deprecated() {}, internal() {}, perf() {},
};
const MAX_SKIPPED = 100;
const DEFAULTS = {
  maxDepth: 1,
  maxPages: 5,
  textLimit: 8_000,
  linkLimit: 50,
  aggregateTextLimit: 40_000,
};
const CEILINGS = {
  maxDepth: 3,
  maxPages: 20,
  textLimit: 20_000,
  linkLimit: 100,
  aggregateTextLimit: 100_000,
};

function safeUrl(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    return parsed.href;
  } catch { return value; }
}
function boundedInteger(name, value, fallback, min, max) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    const error = new Error(`INVALID_${name.toUpperCase()}`);
    error.code = error.message;
    throw error;
  }
  return resolved;
}

function normalizedOptions(options = {}) {
  return {
    maxDepth: boundedInteger('max_depth', options.maxDepth, DEFAULTS.maxDepth, 0, CEILINGS.maxDepth),
    maxPages: boundedInteger('max_pages', options.maxPages, DEFAULTS.maxPages, 1, CEILINGS.maxPages),
    textLimit: boundedInteger('text_limit', options.textLimit, DEFAULTS.textLimit, 1, CEILINGS.textLimit),
    linkLimit: boundedInteger('link_limit', options.linkLimit, DEFAULTS.linkLimit, 1, CEILINGS.linkLimit),
    aggregateTextLimit: boundedInteger(
      'aggregate_text_limit', options.aggregateTextLimit,
      DEFAULTS.aggregateTextLimit, 1, CEILINGS.aggregateTextLimit,
    ),
  };
}

function baseResult(seedUrl, bounds) {
  return {
    status: 'UNKNOWN', method: METHOD, seedUrl: safeUrl(seedUrl), scope: 'SAME_ORIGIN',
    maxDepth: bounds.maxDepth, maxPages: bounds.maxPages, visitedCount: 0,
    pages: [], skipped: [], truncated: false, warnings: [], failureReason: null,
  };
}
function addSkipped(result, url, reason) {
  if (result.skipped.length < MAX_SKIPPED) {
    result.skipped.push({ url: safeUrl(url), reason });
    return;
  }
  if (!result.warnings.includes('SKIPPED_EVIDENCE_TRUNCATED')) {
    result.warnings.push('SKIPPED_EVIDENCE_TRUNCATED');
  }
  result.truncated = true;
}

function policyCode(error) {
  return error instanceof TargetPolicyError ? error.code : 'TARGET_POLICY_FAILED';
}

function aggregateStatus(result) {
  const statuses = result.pages.map((page) => page.status);
  if (statuses.includes('BLOCKED')) return 'BLOCKED';
  if (statuses.includes('FAILED')) return 'FAILED';
  if (statuses.includes('UNKNOWN')) return 'UNKNOWN';
  if (result.truncated || statuses.includes('PARTIAL')) return 'PARTIAL';
  return 'OK';
}

function firstFailureReason(result) {
  return result.pages.find((page) => page.failureReason)?.failureReason ?? null;
}

function proxyFailure(proxy) {
  return proxy?.blocked() ?? proxy?.failed() ?? null;
}
async function loadRobots(seedUrl, policyOptions, timeoutMillis) {
  let proxy;
  try {
    proxy = await startPolicyProxy(policyOptions);
  } catch {
    return { robots: null, status: 'FAILED', reason: 'POLICY_PROXY_UNAVAILABLE' };
  }
  try {
    const robots = await RobotsTxtFile.find(seedUrl, proxy.url, { timeoutMillis });
    const boundaryFailure = proxyFailure(proxy);
    if (boundaryFailure?.startsWith('TARGET_')) {
      return { robots: null, status: 'BLOCKED', reason: boundaryFailure };
    }
    if (boundaryFailure) return { robots: null, status: 'FAILED', reason: boundaryFailure };
    return { robots, status: 'OK', reason: null };
  } catch {
    const boundaryFailure = proxyFailure(proxy);
    if (boundaryFailure?.startsWith('TARGET_')) {
      return { robots: null, status: 'BLOCKED', reason: boundaryFailure };
    }
    return {
      robots: null,
      status: 'FAILED',
      reason: boundaryFailure ?? 'ROBOTS_FETCH_FAILED',
    };
  } finally {
    await proxy.close().catch(() => {});
  }
}

function markLimit(result, warning) {
  result.truncated = true;
  if (!result.warnings.includes(warning)) result.warnings.push(warning);
}
export async function crawlRenderedSite(seedUrl, options = {}) {
  let bounds;
  try {
    bounds = normalizedOptions(options);
  } catch (error) {
    const fallback = normalizedOptions();
    const result = baseResult(seedUrl, fallback);
    result.status = 'FAILED';
    result.failureReason = error?.code ?? 'INVALID_CRAWL_OPTIONS';
    return result;
  }
  const result = baseResult(seedUrl, bounds);
  const testMode = options.testMode === true;
  const allowPrivate = testMode && options.allowPrivate === true;
  const policyOptions = {
    allowPrivate, testMode,
    testPrivateHosts: options.testPrivateHosts,
    lookup: options.lookup,
  };

  let seed;
  try {
    seed = await validateTarget(seedUrl, policyOptions);
  } catch (error) {
    result.status = 'BLOCKED';
    result.failureReason = policyCode(error);
    return result;
  }
  seed.hash = '';
  const seedOrigin = seed.origin;
  const robotsTimeoutMs = Math.min(options.robotsTimeoutMs ?? 5_000, 10_000);
  const robotsResult = await loadRobots(seed.href, policyOptions, robotsTimeoutMs);
  if (robotsResult.status !== 'OK') {
    result.status = robotsResult.status;
    result.failureReason = robotsResult.reason;
    return result;
  }
  const robots = robotsResult.robots;
  if (!robots.isAllowed(seed.href)) {
    result.status = 'BLOCKED';
    result.failureReason = 'ROBOTS_DISALLOWED';
    addSkipped(result, seed.href, 'ROBOTS_DISALLOWED');
    return result;
  }

  const config = new Configuration({ persistStorage: false });
  const queue = await RequestQueue.open(null, { config });
  await queue.addRequest({ url: seed.href, userData: { depth: 0 } });
  const scheduled = new Set([seed.href]);
  let aggregateTextUsed = 0;

  const renderOptions = {
    allowPrivate, testMode,
    testPrivateHosts: options.testPrivateHosts,
    lookup: options.lookup,
    launchOptions: options.launchOptions,
    timeoutMs: options.timeoutMs,
    renderWaitMs: options.renderWaitMs,
    textLimit: bounds.textLimit,
    linkLimit: bounds.linkLimit,
  };
  const crawler = new BasicCrawler({
    requestQueue: queue,
    minConcurrency: 1,
    maxConcurrency: 1,
    maxRequestsPerCrawl: bounds.maxPages,
    maxRequestRetries: 0,
    retryOnBlocked: false,
    useSessionPool: false,
    respectRobotsTxtFile: false,
    log: SILENT_LOG,
    requestHandler: async ({ request }) => {
      const depth = Number.isInteger(request.userData?.depth) ? request.userData.depth : 0;
      const page = await acquireRenderedPage(request.url, renderOptions);
      const candidateLinks = [...page.links];
      page.links = page.links.map((link) => safeUrl(link));
      const remaining = Math.max(0, bounds.aggregateTextLimit - aggregateTextUsed);
      if (page.text.length > remaining) {
        page.text = page.text.slice(0, remaining);
        page.truncated = true;
        if (!page.warnings.includes('AGGREGATE_TEXT_TRUNCATED')) {
          page.warnings.push('AGGREGATE_TEXT_TRUNCATED');
        }
        if (page.status === 'OK') page.status = 'PARTIAL';
        page.failureReason ??= 'AGGREGATE_TEXT_LIMIT';
        markLimit(result, 'AGGREGATE_TEXT_LIMIT_REACHED');
      }
      aggregateTextUsed += page.text.length;
      if (page.truncated) markLimit(result, 'PAGE_OUTPUT_TRUNCATED');
      result.pages.push({ depth, ...page });
      result.visitedCount = result.pages.length;

      if (!page.rendered || !['OK', 'PARTIAL'].includes(page.status)) return;
      for (const rawLink of candidateLinks) {
        let candidate;
        try {
          candidate = new URL(rawLink);
          candidate.hash = '';
        } catch {
          addSkipped(result, rawLink, 'INVALID_URL');
          continue;
        }
        if (!['http:', 'https:'].includes(candidate.protocol)) {
          try { await validateTarget(candidate.href, policyOptions); }
          catch (error) { addSkipped(result, candidate.href, policyCode(error)); }
          continue;
        }
        if (candidate.origin !== seedOrigin) {
          addSkipped(result, candidate.href, 'CROSS_ORIGIN');
          continue;
        }
        if (scheduled.has(candidate.href)) {
          addSkipped(result, candidate.href, 'DUPLICATE');
          continue;
        }
        if (depth >= bounds.maxDepth) {
          addSkipped(result, candidate.href, 'DEPTH_LIMIT');
          markLimit(result, 'DEPTH_LIMIT_REACHED');
          continue;
        }
        try {
          await validateTarget(candidate.href, policyOptions);
        } catch (error) {
          addSkipped(result, candidate.href, policyCode(error));
          continue;
        }
        if (!robots.isAllowed(candidate.href)) {
          addSkipped(result, candidate.href, 'ROBOTS_DISALLOWED');
          continue;
        }
        if (scheduled.size >= bounds.maxPages) {
          addSkipped(result, candidate.href, 'PAGE_LIMIT');
          markLimit(result, 'PAGE_LIMIT_REACHED');
          continue;
        }
        const queued = await queue.addRequest({
          url: candidate.href,
          userData: { depth: depth + 1 },
        });
        if (queued.wasAlreadyPresent) {
          addSkipped(result, candidate.href, 'DUPLICATE');
          continue;
        }
        scheduled.add(candidate.href);
      }
    },
  }, config);

  try {
    await crawler.run();
  } catch {
    result.status = 'FAILED';
    result.failureReason = 'CRAWLER_RUN_FAILED';
    return result;
  }
  if (result.pages.length === 0) {
    result.status = 'FAILED';
    result.failureReason = 'CRAWL_NO_PAGES';
    return result;
  }
  result.status = aggregateStatus(result);
  result.failureReason = firstFailureReason(result);
  if (result.status === 'PARTIAL' && !result.failureReason) {
    result.failureReason = 'CRAWL_LIMIT_REACHED';
  }
  return result;
}
