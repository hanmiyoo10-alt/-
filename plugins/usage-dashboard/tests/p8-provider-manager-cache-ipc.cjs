const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const bridge = fs.readFileSync(`${root}/src/20-bridge-io.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const diag = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const patcher = fs.readFileSync(`${root}/tools/patch_provider_manager_cache_observability.py`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(core.includes('//@allowed-ipc provider-manager'), 'Dashboard must mutually whitelist Provider Manager');
assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.48';"));
assert.ok(core.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(core.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
assert.ok(core.includes("const PROVIDER_MANAGER_CACHE_IPC_VERSION = 1;"));
assert.ok(core.includes('const providerManagerCacheRuntime = {'));
assert.ok(core.includes('const providerManagerCachePending = new Map();'));

for (const marker of [
  'function fetchProviderManagerCacheObservability()',
  "PROVIDER_MANAGER_REQUEST_CHANNEL = 'provider-manager/request'",
  "PROVIDER_MANAGER_RESPONSE_CHANNEL = 'provider-manager/response'",
  "op:'cacheObservability'",
  "sender:{pluginName:'local_usage_dashboard_modular'",
  'function providerManagerCacheCandidateScore(request, cacheRow)',
  "return {score:1000,kind:'exact'}",
  'providerManagerCacheModelMatch',
  "replace(/[_\\s]+/g,'-')",
  'providerManagerCacheRuntime.ambiguous',
  "request.cacheMetricSource = 'provider-manager-ipc-v1'",
  'cacheCreation5mTokens',
  'cacheCreation1hTokens'
]) assert.ok(latest.includes(marker) || bridge.includes(marker), `missing PM cache IPC marker: ${marker}`);

assert.ok(refresh.includes('const providerManagerCachePromise = fetchProviderManagerCacheObservability();'));
assert.ok(refresh.includes("finishRefreshPhase('provider-cache'"));
assert.ok(refresh.indexOf('enrichDataWithProviderManagerCache(state.data, providerManagerCache);') < refresh.indexOf('collectRecentRequestLedger(state.data);'), 'PM enrichment must happen before ledger merge');

assert.ok(diag.includes('Provider Manager cache IPC:'));
assert.ok(diag.includes('Provider Manager IPC v1 when available'));
const readiness = diag.match(/function stableReadinessSnapshot[\s\S]*?\n  function diagText|function stableReadinessSnapshot[\s\S]*?\n  function providerManagerCacheDiagnosticText/);
assert.ok(readiness, 'stable readiness block must be discoverable');
assert.ok(!readiness[0].includes('providerManagerCacheRuntime'), 'optional PM cache IPC must never block Stable readiness');

assert.ok(!latest.includes('pm_request_logs'), 'Dashboard must not read Provider Manager private storage');
assert.ok(!bridge.includes('getLocalPluginStorage(provider-manager'), 'Dashboard must not reach into another plugin storage');

for (const marker of [
  "EXPECTED_VERSION = '1.13.0'",
  "DASHBOARD_PLUGIN = 'local_usage_dashboard_modular'",
  'cacheObservability',
  'async cacheObs(t)',
  'provider-manager-request-log',
  'cacheReadInputTokens',
  'cacheCreationInputTokens',
  'cacheCreation5mTokens',
  'cacheCreation1hTokens',
  '--self-test'
]) assert.ok(patcher.includes(marker), `missing PM local patcher marker: ${marker}`);
assert.ok(!patcher.includes('requestBody:String'), 'patcher must not export request bodies');
assert.ok(!patcher.includes('responseBody:String'), 'patcher must not export response bodies');

assert.ok(latest.includes('//@version 3.0.0-alpha.5.48'));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.48';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.48');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('usage-dashboard P8 Provider Manager cache IPC: OK · optional read-only enrichment locked');
