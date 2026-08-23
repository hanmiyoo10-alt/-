function isAuthorized(req) {
  const provided = String(req.headers['x-devpass-bridge-key'] || '');
  if (!provided || !bridgeToken) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(bridgeToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});

  // Read-only, localhost-only update feed. It exposes only the staged plugin
  // JavaScript and never reads credentials, CLI config, or arbitrary files.
  if (url.pathname === '/plugin/latest' && (req.method === 'GET' || req.method === 'HEAD')) {
    return serveLatestPlugin(req, res);
  }
  if (url.pathname === '/plugin/update-info' && req.method === 'GET') {
    return json(res, 200, await pluginUpdateInfo());
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });

  if (url.pathname === '/health') {
    return json(res, 200, { ok: true, status: 'healthy', version: VERSION, protocolVersion: PROTOCOL_VERSION, compatibility: { minPluginVersion: MIN_PLUGIN_VERSION, recommendedPluginVersion: RECOMMENDED_PLUGIN_VERSION }, update: await pluginUpdateInfo(), host: HOST, port: PORT, uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000), cli: { active: cliStats.active, queued: cliStats.queued }, circuits: { open: Object.values(circuitSnapshot()).filter((row) => row.state === 'open').length } });
  }
  if (!isAuthorized(req)) return json(res, 401, { error: 'Bridge token required' });

  try {
    const creditsOrgId = String(url.searchParams.get('creditsOrgId') || '').trim();
    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile, creditsOrgId));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());
    if (url.pathname === '/devpass-status') return json(res, 200, await loadDevPassStatus());
    if (url.pathname === '/activity') return json(res, 200, await activity(creditsOrgId));
    if (url.pathname === '/analytics') return json(res, 200, await analytics(creditsOrgId));
    if (url.pathname === '/usage-scopes') return json(res, 200, await usageScopes(creditsOrgId));
    if (url.pathname === '/analytics-scopes') return json(res, 200, await analyticsScopes(creditsOrgId));
    if (url.pathname === '/v1/summary') return json(res, 200, await snapshot('full', creditsOrgId));
    const match = url.pathname.match(/^\/orgs\/([^/]+)\/credits-runway$/);
    if (match) return json(res, 200, await runwayFor(decodeURIComponent(match[1])));
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    logRateLimited('error', `endpoint:${url.pathname}:${safeMessage(error).slice(0,120)}`, safeMessage(error));
    return json(res, 502, {
      error: 'LLMGateway request failed',
      code: error?.code === 'CIRCUIT_OPEN' ? 'CIRCUIT_OPEN' : classifyError(error),
      message: safeMessage(error),
      retryable: !['AUTH_UNAUTHORIZED','AUTH_FORBIDDEN'].includes(classifyError(error)),
      hint: 'Run: npx @llmgateway/cli auth status',
    });
  }
}

await ensureToken();
const server = http.createServer((req, res) => {
  void handle(req, res).catch((error) => {
    const route = String(req?.url || '/').split('?')[0].slice(0, 160) || '/';
    const message = safeMessage(error);
    logRateLimited('error', `request-boundary:${route}:${message.slice(0,120)}`, `Unhandled request error on ${route}: ${message}`, 30_000);
    if (res.writableEnded) return;
    if (res.headersSent) {
      try { res.destroy(); } catch {}
      return;
    }
    json(res, 500, {
      error: 'Bridge internal request error',
      code: 'BRIDGE_INTERNAL_ERROR',
      retryable: true,
    });
  });
});
server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`LLMGateway DevPass Termux Bridge v${VERSION}`);
  console.log(`URL   : http://${HOST}:${PORT}`);
  console.log(`TOKEN : stored securely at ${TOKEN_FILE}`);
  console.log('');
  console.log(`PocketRisu에서 토큰이 필요하면 Termux 로컬에서: cat ${TOKEN_FILE}`);
  console.log('LLMGateway 비밀번호/세션 쿠키/config.json 내용은 붙여넣지 마세요.');
  console.log('종료: Ctrl+C');
});
