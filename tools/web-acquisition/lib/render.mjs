import http from 'node:http';
import net from 'node:net';
import { chromium } from 'playwright';
import { extractRenderedEvidence } from './extract.mjs';
import { resolveTarget, TargetPolicyError, validateTarget } from './policy.mjs';

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

function proxyPolicy(options) {
  return {
    allowPrivate: options.allowPrivate,
    testMode: options.testMode,
    testPrivateHosts: options.testPrivateHosts,
    lookup: options.lookup,
    cache: new Map(),
  };
}

function stripProxyHeaders(headers) {
  const next = { ...headers };
  delete next['proxy-connection'];
  delete next['proxy-authorization'];
  return next;
}
async function startPolicyProxy(options) {
  const policy = proxyPolicy(options);
  let blocked = null;
  let failed = null;

  const server = http.createServer((request, response) => {
    void (async () => {
      let resolved;
      try {
        resolved = await resolveTarget(request.url, policy);
      } catch (error) {
        blocked ??= policyCode(error);
        response.writeHead(403).end('blocked');
        return;
      }
      if (resolved.url.protocol !== 'http:') {
        blocked ??= 'TARGET_UNSAFE_PROXY_REQUEST';
        response.writeHead(403).end('blocked');
        return;
      }
      const address = resolved.addresses[0]?.address;
      const upstream = http.request({
        host: address,
        port: Number(resolved.url.port || 80),
        method: request.method,
        path: `${resolved.url.pathname}${resolved.url.search}`,
        headers: stripProxyHeaders(request.headers),
        agent: false,
      });      upstream.on('response', (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on('error', () => {
        failed ??= 'POLICY_PROXY_CONNECT_FAILED';
        if (!response.headersSent) response.writeHead(502);
        response.end('proxy connect failed');
      });
      request.pipe(upstream);
    })().catch(() => {
      failed ??= 'POLICY_PROXY_FAILED';
      if (!response.headersSent) response.writeHead(500);
      response.end('proxy failed');
    });
  });

  server.on('connect', (request, clientSocket, head) => {
    void (async () => {
      let authority;
      try {
        authority = new URL(`https://${request.url}/`);
      } catch {
        blocked ??= 'TARGET_INVALID_URL';
        clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }
      let resolved;
      try {
        resolved = await resolveTarget(authority.href, policy);
      } catch (error) {
        blocked ??= policyCode(error);
        clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        return;
      }      const address = resolved.addresses[0]?.address;
      const upstream = net.connect({
        host: address,
        port: Number(authority.port || 443),
      });
      upstream.once('connect', () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      upstream.once('error', () => {
        failed ??= 'POLICY_PROXY_CONNECT_FAILED';
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      });
      clientSocket.once('error', () => upstream.destroy());
    })().catch(() => {
      failed ??= 'POLICY_PROXY_FAILED';
      clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    blocked: () => blocked,
    failed: () => failed,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
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
