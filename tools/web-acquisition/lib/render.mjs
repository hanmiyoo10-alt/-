import { chromium } from 'playwright';
import { extractRenderedEvidence } from './extract.mjs';
import { TargetPolicyError, validateTarget } from './policy.mjs';
import { startPolicyProxy } from './policy-proxy.mjs';

const METHOD = 'PLAYWRIGHT_RENDER';

function safeRequestedUrl(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = '';
      parsed.password = '';
      return parsed.href;
    }
  } catch {}
  return value;
}

function baseResult(requestedUrl) {
  return {
    status: 'UNKNOWN', method: METHOD, requestedUrl: safeRequestedUrl(requestedUrl),
    finalUrl: null, title: '', text: '', links: [], rendered: false,
    truncated: false, warnings: [], failureReason: null,
  };
}
function fail(result, status, reason, warning = null) {
  result.status = status;
  result.failureReason = reason;
  if (warning) result.warnings.push(warning);
  return result;
}

function policyCode(error) {
  return error instanceof TargetPolicyError ? error.code : 'TARGET_POLICY_FAILED';
}

async function installNetworkGuard(context, page, options) {
  const cache = new Map();
  let blocked = null;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '*', requestStage: 'Request' }],
  });
  cdp.on('Fetch.requestPaused', (event) => {
    void (async () => {
      try {
        await validateTarget(event.request.url, {
          allowPrivate: options.allowPrivate,
          testMode: options.testMode,
          testPrivateHosts: options.testPrivateHosts,
          lookup: options.lookup,
          cache,
        });
        if (blocked) {
          await cdp.send('Fetch.failRequest', {
            requestId: event.requestId, errorReason: 'BlockedByClient',
          }).catch(() => {});
          return;
        }
        await cdp.send('Fetch.continueRequest', { requestId: event.requestId });
      } catch (error) {
        blocked ??= policyCode(error);
        await cdp.send('Fetch.failRequest', {
          requestId: event.requestId, errorReason: 'BlockedByClient',
        }).catch(() => {});
      }
    })().catch(() => { blocked ??= 'TARGET_POLICY_FAILED'; });
  });
  return {
    blocked: () => blocked,
    stop: () => cdp.send('Fetch.disable').catch(() => {}),
  };
}

function combinedPolicyFailure(guard, proxy) {
  return guard?.blocked() ?? proxy?.blocked() ?? proxy?.failed() ?? null;
}

export async function acquireRenderedPage(requestedUrl, options = {}) {
  const result = baseResult(requestedUrl);
  const testMode = options.testMode === true;
  const allowPrivate = testMode && options.allowPrivate === true;
  const testPrivateHosts = options.testPrivateHosts;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const renderWaitMs = options.renderWaitMs ?? 400;
  const cache = new Map();
  try {
    await validateTarget(requestedUrl, {
      allowPrivate, testMode, testPrivateHosts, lookup: options.lookup, cache,
    });
  } catch (error) {
    return fail(result, 'BLOCKED', policyCode(error));
  }

  let proxy;
  try {
    proxy = await startPolicyProxy({
      allowPrivate, testMode, testPrivateHosts, lookup: options.lookup,
    });
  } catch {
    return fail(result, 'FAILED', 'POLICY_PROXY_UNAVAILABLE');
  }
  let browser;
  try {
    const launchOptions = options.launchOptions ?? {};
    const args = [
      ...(launchOptions.args ?? []),
      '--disable-background-networking',
      '--disable-component-update',
      '--no-first-run',
      '--proxy-bypass-list=<-loopback>',
    ];
    browser = await chromium.launch({
      ...launchOptions,
      args,
      headless: true,
      proxy: { server: proxy.url },
    });
  } catch {
    await proxy.close().catch(() => {});
    return fail(result, 'UNKNOWN', 'BROWSER_UNAVAILABLE');
  }

  let context;
  let guard;
  try {
    context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    guard = await installNetworkGuard(context, page, {
      allowPrivate, testMode, testPrivateHosts, lookup: options.lookup,
    });    let response;
    try {
      response = await page.goto(requestedUrl, {
        waitUntil: 'domcontentloaded', timeout: timeoutMs,
      });
    } catch (error) {
      const boundaryFailure = combinedPolicyFailure(guard, proxy);
      if (boundaryFailure?.startsWith('TARGET_')) {
        return fail(result, 'BLOCKED', boundaryFailure);
      }
      if (boundaryFailure) return fail(result, 'FAILED', boundaryFailure);
      const timedOut = error?.name === 'TimeoutError';
      return fail(result, 'FAILED', timedOut ? 'NAVIGATION_TIMEOUT' : 'NAVIGATION_FAILED');
    }

    await page.waitForTimeout(renderWaitMs);
    const afterWait = combinedPolicyFailure(guard, proxy);
    if (afterWait?.startsWith('TARGET_')) return fail(result, 'BLOCKED', afterWait);
    if (afterWait) return fail(result, 'FAILED', afterWait);

    result.finalUrl = safeRequestedUrl(page.url());
    try {
      await validateTarget(page.url(), {
        allowPrivate, testMode, testPrivateHosts, lookup: options.lookup, cache,
      });
    } catch (error) {
      return fail(result, 'BLOCKED', policyCode(error));
    }
    const evidence = await extractRenderedEvidence(page, options);
    const afterExtract = combinedPolicyFailure(guard, proxy);
    if (afterExtract?.startsWith('TARGET_')) return fail(result, 'BLOCKED', afterExtract);
    if (afterExtract) return fail(result, 'FAILED', afterExtract);

    Object.assign(result, evidence, { rendered: true });
    if (response && response.status() >= 400) {
      result.warnings.push(`HTTP_STATUS_${response.status()}`);
      result.status = 'PARTIAL';
    } else if (!result.title && !result.text) {
      return fail(result, 'PARTIAL', 'EMPTY_RENDERED_CONTENT');
    } else {
      result.status = 'OK';
    }
    return result;
  } catch {
    const boundaryFailure = combinedPolicyFailure(guard, proxy);
    if (boundaryFailure?.startsWith('TARGET_')) return fail(result, 'BLOCKED', boundaryFailure);
    return fail(result, 'FAILED', boundaryFailure ?? 'RENDER_FAILED');
  } finally {
    await guard?.stop();
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
    await proxy.close().catch(() => {});
  }
}
