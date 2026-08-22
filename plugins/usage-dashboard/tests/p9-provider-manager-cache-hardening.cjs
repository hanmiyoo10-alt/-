const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const bridge = fs.readFileSync(`${root}/src/20-bridge-io.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const diag = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const bootstrap = fs.readFileSync(`${root}/src/90-bootstrap.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(core.includes('const PROVIDER_MANAGER_CACHE_TIMEOUT_MS = 1200;'));
assert.ok(core.includes('const PROVIDER_MANAGER_CACHE_MAX_BACKOFF_MS = 300000;'));
assert.ok(core.includes('const PROVIDER_MANAGER_CACHE_SIDE_PROBE_DELAY_MS = 250;'));
assert.ok(core.includes("circuitState:'closed'"));
assert.ok(core.includes('let providerManagerCacheProbeTimer = null;'));
assert.ok(core.includes('let providerManagerCacheProbePromise = null;'));

for (const marker of [
  'function providerManagerCacheCircuitBlocked()',
  'function scheduleProviderManagerCacheEnrichment(',
  "runtime.circuitState = 'half-open'",
  "runtime.circuitState = 'open'",
  "runtime.circuitState = 'closed'",
  'PROVIDER_MANAGER_CACHE_MAX_BACKOFF_MS',
  'state.data !== targetData',
  'providerManagerCacheRuntime.staleDrops',
  'providerManagerCacheRuntime.coalesced',
  'collectRecentRequestLedger(targetData)',
  'schedulePanelRender(false)'
]) assert.ok(bridge.includes(marker) || latest.includes(marker), `missing cache hardening marker: ${marker}`);

assert.ok(!refresh.includes('const providerManagerCachePromise = fetchProviderManagerCacheObservability();'), 'primary refresh must not retain PM cache promise');
assert.ok(!refresh.includes('await providerManagerCachePromise'), 'primary refresh must never await PM cache probe');
assert.ok(!refresh.includes("finishRefreshPhase('provider-cache'"), 'optional PM cache probe must not be a primary refresh phase');
assert.ok(refresh.includes('scheduleProviderManagerCacheEnrichment(state.data, refreshEpoch, refreshLifecycleGeneration);'), 'primary refresh must schedule optional enrichment after success');
const renderAt = refresh.indexOf("await renderRefreshWidget(reason, 'refresh-success-render');");
const scheduleAt = refresh.indexOf('scheduleProviderManagerCacheEnrichment(state.data, refreshEpoch, refreshLifecycleGeneration);');
assert.ok(renderAt >= 0 && scheduleAt > renderAt, 'optional cache enrichment must be scheduled only after the primary widget render');

assert.ok(diag.includes('Optional integrations: Provider cache'));
assert.ok(diag.includes('primary refresh independent'));
assert.ok(diag.includes('circuit ${circuit}'));
assert.ok(diag.includes('stale drops'));
const readinessStart = diag.indexOf('function stableReadinessSnapshot');
const readinessEnd = readinessStart >= 0 ? diag.indexOf('\n  function ', readinessStart + 'function stableReadinessSnapshot'.length) : -1;
assert.ok(readinessStart >= 0 && readinessEnd > readinessStart);
assert.ok(!diag.slice(readinessStart, readinessEnd).includes('providerManagerCacheRuntime'), 'optional PM cache health must not block Stable readiness');

for (const marker of [
  'if(providerManagerCacheProbeTimer){clearTimeout(providerManagerCacheProbeTimer)',
  'providerManagerCachePending.clear();',
  'providerManagerCacheProbePromise=null;',
  'providerManagerCacheRuntime.inFlight=false;'
]) assert.ok(bootstrap.includes(marker) || latest.includes(marker), `missing cache probe cleanup marker: ${marker}`);

assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('usage-dashboard P9 Provider Manager cache hardening: OK · primary refresh isolated from optional IPC');

