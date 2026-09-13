import { chromium } from 'playwright';
import { extractRenderedEvidence } from './extract.mjs';
import { TargetPolicyError, validateTarget } from './policy.mjs';
import { startPolicyProxy } from './policy-proxy.mjs';
import { RevealPlanError, executeRevealPlan, normalizeRevealPlan } from './reveal.mjs';

const METHODS = {
  render: 'PLAYWRIGHT_RENDER',
  boundedReveal: 'PLAYWRIGHT_BOUNDED_REVEAL',
};
const REVEAL_WARNING = 'REVEAL_GET_HEAD_EFFECTS_REMAIN_SITE_CONTROLLED';

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

function safeEffectUrl(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    return parsed.href;
  } catch { return null; }
}
export function acquisitionResult(requestedUrl, mode = 'render') {
  const result = {
    status: 'UNKNOWN',
    method: METHODS[mode] ?? null,
    requestedUrl: safeRequestedUrl(requestedUrl),
    finalUrl: null,
    title: '',
    text: '',
    links: [],
    rendered: false,
    truncated: false,
    warnings: mode === 'boundedReveal' ? [REVEAL_WARNING] : [],
    failureReason: null,
  };
  if (mode === 'boundedReveal') {
    Object.assign(result, {
      actionsRequested: 0,
      actionsExecuted: 0,
      actionResults: [],
      blockedEffects: [],
    });
  }
  return result;
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

function boundedEffectRecord(reason, event = {}) {
  return {
    reason,
    method: event.request?.method ?? null,
    url: safeEffectUrl(event.request?.url ?? event.url ?? null),
  };
}

function combinedPolicyFailure(guard, proxy) {
  return guard?.policyBlocked() ?? proxy?.blocked() ?? proxy?.failed() ?? null;
}

function revealFailureStatus(reason) {
  if (reason === 'REVEAL_CONTROL_FORBIDDEN') return 'BLOCKED';
  if (reason?.startsWith('REVEAL_METHOD_')) return 'BLOCKED';
  if (reason?.startsWith('REVEAL_TOP_LEVEL_')) return 'BLOCKED';
  if (reason?.startsWith('REVEAL_POPUP_')) return 'BLOCKED';
  if (reason?.startsWith('REVEAL_DOWNLOAD_')) return 'BLOCKED';
  if (reason?.startsWith('REVEAL_DIALOG_')) return 'BLOCKED';
  return 'FAILED';
}
async function installNetworkGuard(context, page, options) {
  const cache = new Map();
  const blockedEffects = [];
  let policyBlocked = null;
  let revealArmed = false;
  const cdp = await context.newCDPSession(page);
  let mainFrameId = null;
  if (options.revealMode) {
    await cdp.send('Page.enable').catch(() => {});
    const frameTree = await cdp.send('Page.getFrameTree').catch(() => null);
    mainFrameId = frameTree?.frameTree?.frame?.id ?? null;
  }

  function recordEffect(reason, event = {}) {
    if (blockedEffects.length < 20) {
      blockedEffects.push(boundedEffectRecord(reason, event));
    }
  }

  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '*', requestStage: 'Request' }],
  });
  cdp.on('Fetch.requestPaused', (event) => {
    void (async () => {
      try {
        if (revealArmed && !['GET', 'HEAD'].includes(event.request.method)) {
          recordEffect('REVEAL_METHOD_FORBIDDEN', event);
          await cdp.send('Fetch.failRequest', {
            requestId: event.requestId, errorReason: 'BlockedByClient',
          }).catch(() => {});
          return;
        }
        if (revealArmed && event.resourceType === 'Document'
            && mainFrameId && event.frameId === mainFrameId) {
          recordEffect('REVEAL_TOP_LEVEL_NAVIGATION_FORBIDDEN', event);
          await cdp.send('Fetch.failRequest', {
            requestId: event.requestId, errorReason: 'BlockedByClient',
          }).catch(() => {});
          return;
        }
        await validateTarget(event.request.url, {
          allowPrivate: options.allowPrivate,
          testMode: options.testMode,
          testPrivateHosts: options.testPrivateHosts,
          lookup: options.lookup,
          cache,
        });
        if (policyBlocked) {
          await cdp.send('Fetch.failRequest', {
            requestId: event.requestId, errorReason: 'BlockedByClient',
          }).catch(() => {});
          return;
        }
        await cdp.send('Fetch.continueRequest', { requestId: event.requestId });
      } catch (error) {
        policyBlocked ??= policyCode(error);
        await cdp.send('Fetch.failRequest', {
          requestId: event.requestId, errorReason: 'BlockedByClient',
        }).catch(() => {});
      }
    })().catch(() => { policyBlocked ??= 'TARGET_POLICY_FAILED'; });
  });
  let popupHandler = null;
  let downloadHandler = null;
  let dialogHandler = null;

  async function armReveal() {
    if (revealArmed) return;
    revealArmed = true;
    await page.evaluate(() => {
      const recordDownload = (anchor) => {
        window.__u26RevealDownloadBlocked = { attempted: true, url: anchor.href || null };
      };
      const nativeAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function guardedDownloadClick() {
        if (this.hasAttribute('download')) { recordDownload(this); return; }
        return nativeAnchorClick.call(this);
      };
      document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('a[download]') : null;
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        recordDownload(target);
      }, true);
    });
    popupHandler = (popup) => {
      if (popup === page) return;
      recordEffect('REVEAL_POPUP_FORBIDDEN', { url: popup.url() });
      void popup.close().catch(() => {});
    };
    downloadHandler = (download) => {
      recordEffect('REVEAL_DOWNLOAD_FORBIDDEN', { url: download.url() });
      void download.cancel().catch(() => {});
    };
    dialogHandler = (dialog) => {
      recordEffect('REVEAL_DIALOG_FORBIDDEN');
      void dialog.dismiss().catch(() => {});
    };
    context.on('page', popupHandler);
    page.on('download', downloadHandler);
    page.on('dialog', dialogHandler);
  }

  async function flushRevealEffects() {
    if (!revealArmed) return;
    const effect = await page.evaluate(() => {
      const value = window.__u26RevealDownloadBlocked ?? null;
      window.__u26RevealDownloadBlocked = null;
      return value;
    }).catch(() => null);
    if (effect?.attempted) recordEffect('REVEAL_DOWNLOAD_FORBIDDEN', { url: effect.url });
  }

  async function stop() {
    if (popupHandler) context.off('page', popupHandler);
    if (downloadHandler) page.off('download', downloadHandler);
    if (dialogHandler) page.off('dialog', dialogHandler);
    await cdp.send('Fetch.disable').catch(() => {});
  }
  return {
    policyBlocked: () => policyBlocked,
    blockedEffects: () => blockedEffects.slice(0, 20),
    firstBlockedReason: () => blockedEffects[0]?.reason ?? null,
    armReveal,
    flushRevealEffects,
    stop,
  };
}

function copyEvidence(result, evidence) {
  result.title = evidence.title;
  result.text = evidence.text;
  result.links = evidence.links;
  result.truncated = evidence.truncated;
  result.warnings.push(...evidence.warnings);
  result.rendered = true;
}

function applyRevealOutcome(result, outcome, guard) {
  result.actionsExecuted = outcome.actionsExecuted;
  result.actionResults = outcome.actionResults.slice(0, 5);
  result.blockedEffects = guard.blockedEffects();
  if (!outcome.ok) {
    return fail(result, revealFailureStatus(outcome.failureReason), outcome.failureReason);
  }
  const blocked = guard.firstBlockedReason();
  return blocked ? fail(result, 'BLOCKED', blocked) : null;
}
export async function acquirePage(requestedUrl, options = {}) {
  const mode = options.mode ?? 'render';
  const result = acquisitionResult(requestedUrl, mode);
  if (!Object.hasOwn(METHODS, mode)) {
    return fail(result, 'FAILED', 'ACQUISITION_MODE_UNSUPPORTED');
  }

  let revealPlan = null;
  if (mode === 'boundedReveal') {
    try {
      revealPlan = normalizeRevealPlan(options.plan);
      result.actionsRequested = revealPlan.actions.length;
    } catch (error) {
      const reason = error instanceof RevealPlanError
        ? error.code : 'REVEAL_PLAN_INVALID';
      return fail(result, 'BLOCKED', reason);
    }
  }

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
    context = await browser.newContext({
      serviceWorkers: 'block',
      ...(mode === 'boundedReveal' ? { acceptDownloads: false } : {}),
    });
    const page = await context.newPage();
    guard = await installNetworkGuard(context, page, {
      allowPrivate, testMode, testPrivateHosts, lookup: options.lookup,
      revealMode: mode === 'boundedReveal',
    });

    let response;
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

    if (mode === 'boundedReveal') {
      await guard.armReveal();
      const outcome = await executeRevealPlan(page, revealPlan, guard);
      const revealFailure = applyRevealOutcome(result, outcome, guard);
      if (revealFailure) return revealFailure;
    }

    const evidence = await extractRenderedEvidence(page, options);
    const afterExtract = combinedPolicyFailure(guard, proxy);
    if (afterExtract?.startsWith('TARGET_')) return fail(result, 'BLOCKED', afterExtract);
    if (afterExtract) return fail(result, 'FAILED', afterExtract);
    if (mode === 'boundedReveal' && guard.firstBlockedReason()) {
      result.blockedEffects = guard.blockedEffects();
      return fail(result, 'BLOCKED', guard.firstBlockedReason());
    }
    copyEvidence(result, evidence);
    if (response && response.status() >= 400) {
      result.warnings.push(`HTTP_STATUS_${response.status()}`);
      result.status = 'PARTIAL';
    } else if (!result.title && !result.text) {
      return fail(result, 'PARTIAL', 'EMPTY_RENDERED_CONTENT');
    } else {
      result.status = 'OK';
    }
    return result;
  } catch (error) {
    const boundaryFailure = combinedPolicyFailure(guard, proxy);
    if (boundaryFailure?.startsWith('TARGET_')) return fail(result, 'BLOCKED', boundaryFailure);
    if (guard?.firstBlockedReason()) {
      if (mode === 'boundedReveal') result.blockedEffects = guard.blockedEffects();
      return fail(result, 'BLOCKED', guard.firstBlockedReason());
    }
    return fail(result, 'FAILED', boundaryFailure ?? 'RENDER_FAILED');
  } finally {
    await guard?.stop();
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
    await proxy.close().catch(() => {});
  }
}
