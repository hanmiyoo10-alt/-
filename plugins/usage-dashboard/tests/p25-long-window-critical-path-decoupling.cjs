const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const snapshotContract = JSON.parse(fs.readFileSync('plugins/usage-dashboard/contracts/snapshot-v1.schema.json', 'utf8'));
const recentContract = JSON.parse(fs.readFileSync('plugins/usage-dashboard/contracts/recent-request-v1.schema.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/stage-usage-dashboard-563-long-window-critical-path-decoupling.yml', 'utf8');

assert.match(engine, /const VERSION = '1\.6\.16';/);
assert.match(manager, /const MANAGER_VERSION = '1\.2\.6';/);
assert.match(manager, /const PRODUCT_VERSION = '3\.0\.0-alpha\.5\.63';/);
assert.match(manager, /const BUNDLED_ENGINE_VERSION = '1\.6\.16';/);
assert.equal(manifest.productVersion, '3.0.0-alpha.5.63');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.16');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
assert.ok(snapshotContract && recentContract);

// Frozen performance and source-fidelity contracts.
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /accountCapture: 30_000/);
assert.match(engine, /creditsBootstrap: 30_000/);
assert.match(engine, /'activity:24h': 60_000/);
assert.match(engine, /'activity:7d': 300_000/);
assert.match(engine, /'activity:30d': 600_000/);
const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5, '5.63 must not add a runCli call site');
assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h'"));
assert.ok(engine.includes("runCli(['orgs', 'list', '--json'])"));
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"));

// One lane, 32 unique keys, no new secondary start during a foreground snapshot.
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.ok(engine.includes('if (valueIsStale(value))'), 'stale aggregates must not be promoted to a fresh last-good generation');
assert.ok(engine.includes('if (secondaryDrainScheduled || secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;'));
assert.ok(engine.includes('if (inFlight.has(name) || secondaryRefreshKeys.has(name)) return true;'));
assert.ok(engine.includes('if (secondaryRefreshKeys.size >= SECONDARY_REFRESH_MAX_KEYS)'));
assert.ok(engine.includes('snapshotAttributionStorage.run(undefined'));
assert.ok(engine.includes('foregroundSnapshotsActive += 1;'));
assert.ok(engine.includes('foregroundSnapshotsActive = Math.max(0, foregroundSnapshotsActive - 1);'));
assert.ok(engine.includes('lastForegroundEndedAt = Date.now();'));

// Only the full snapshot opts in. Standalone endpoints preserve blocking semantics.
assert.ok(engine.includes("runwayFor(creditsOrg.id, { deferExpired:true })"));
assert.ok(engine.includes("analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true })"));
assert.ok(engine.includes("return json(res, 200, await analyticsScopes(creditsOrgId))"));
assert.ok(engine.includes("return json(res, 200, await runwayFor(decodeURIComponent(match[1])))"));
assert.ok(engine.includes("options?.deferExpired === true && ['7d','30d'].includes(String(range))"));
assert.ok(engine.includes("options?.deferExpired === true && ['7d','30d'].includes(normalizedRange)"));
assert.ok(!/usageForOrg\([^\n]*'24h'[^\n]*deferExpired:true/.test(engine), '24h usage must never opt into deferral');

// Runway defers its own existing last-good only; its loader keeps blocking leaves.
const runwayStart = engine.indexOf('async function runwayFor(');
const runwayEnd = engine.indexOf('\nfunction newestCacheAt(', runwayStart);
const runwaySource = engine.slice(runwayStart, runwayEnd);
assert.ok(runwaySource.includes("{ deferExpired:options?.deferExpired === true }"));
assert.ok(runwaySource.includes("usageForOrg(org, '7d')"));
assert.ok(!runwaySource.includes("usageForOrg(org, '7d',"));
assert.ok(runwaySource.includes("activityForScope('7d', 'credits', orgId)"));
assert.ok(!runwaySource.includes("activityForScope('7d', 'credits', orgId,"));
assert.ok(runwaySource.includes("if (valueIsStale(usage)) throw new Error('Runway usage source is stale')"));
assert.ok(runwaySource.includes("if (valueIsStale(creditsOnly)) throw new Error('Runway activity source is stale')"));

// Exercise cached() with a held foreground snapshot.
const secondaryStart = engine.indexOf('function secondaryRefreshSnapshot(');
const cachedEnd = engine.indexOf('\nfunction firstArray(', secondaryStart);
assert.ok(secondaryStart >= 0 && cachedEnd > secondaryStart);
const cacheSource = engine.slice(secondaryStart, cachedEnd);
const context = {
  Map,
  Set,
  Date,
  Number,
  Math,
  Promise,
  setImmediate,
  CACHE_TTL: {},
  CACHE_STALE_MAX_MS: 30 * 60_000,
  SECONDARY_REFRESH_CONCURRENCY: 1,
  SECONDARY_REFRESH_MAX_KEYS: 32,
  secondaryRefreshQueue: [],
  secondaryRefreshKeys: new Set(),
  secondaryRefreshStats: {servedStale:0,completed:0,errors:0,blocked:0,superseded:0,foregroundHeld:0,dropped:0,lastStartAt:null,lastStartAfterForegroundMs:null},
  secondaryRefreshRunning: false,
  secondaryDrainScheduled: false,
  foregroundSnapshotsActive: 1,
  lastForegroundEndedAt: null,
  cache: new Map(),
  inFlight: new Map(),
  cacheStats: {hits:0,misses:0,joins:0,loads:0,errors:0,staleFallbacks:0,totalLoadMs:0,lastLoadMs:0},
  snapshotAttributionStorage: {run: (_store, fn) => fn()},
  noteSnapshotCacheDecision: () => {},
  noteSnapshotCounter: () => {},
  circuitBeforeLoad: () => ({allowed:true,circuit:{state:'closed'}}),
  getCircuit: () => ({state:'closed'}),
  circuitSuccess: () => {},
  circuitFailure: () => ({state:'closed'}),
  pruneCache: () => {},
  logRateLimited: () => {},
  safeMessage: (error) => String(error?.message || error || 'unknown error'),
  staleClone: (value, ageMs, error) => ({...value,_cache:{stale:true,ageMs,reason:String(error?.message || error)}}),
  valueIsStale: (value) => value?._cache?.stale === true,
  staleValueReason: (value) => value?._cache?.reason === 'deferred-refresh' ? 'deferred-refresh' : 'refresh-error',
};
vm.createContext(context);
vm.runInContext(`${cacheSource}\nthis.cached = cached; this.drainSecondaryRefresh = drainSecondaryRefresh; this.secondaryRefreshSnapshot = secondaryRefreshSnapshot;`, context);

(async () => {
  let loads = 0;
  const now = Date.now();

  context.cache.set('usage:org:7d', {at:now - 300_500,value:{totalCost:7}});
  const deferred = await context.cached('usage:org:7d', async () => { loads += 1; return {totalCost:8}; }, {deferExpired:true});
  assert.equal(loads, 0);
  assert.equal(deferred.totalCost, 7);
  assert.equal(deferred._cache.stale, true);
  assert.equal(deferred._cache.reason, 'deferred-refresh');
  assert.equal(context.secondaryRefreshQueue.length, 1);
  assert.equal(context.secondaryRefreshStats.foregroundHeld, 1);

  const duplicate = await context.cached('usage:org:7d', async () => { loads += 1; return {totalCost:9}; }, {deferExpired:true});
  assert.equal(duplicate._cache.stale, true);
  assert.equal(context.secondaryRefreshQueue.length, 1, 'same raw key must remain deduplicated');
  assert.equal(loads, 0);

  context.cache.set('usage:cold:30d', undefined);
  const cold = await context.cached('usage:cold:30d', async () => { loads += 1; return {totalCost:30}; }, {deferExpired:true});
  assert.equal(cold.totalCost, 30);
  assert.equal(loads, 1, 'cold cache must retain blocking completeness');

  context.cache.set('usage:old:30d', {at:Date.now() - (31 * 60_000),value:{totalCost:1}});
  const tooOld = await context.cached('usage:old:30d', async () => { loads += 1; return {totalCost:2}; }, {deferExpired:true});
  assert.equal(tooOld.totalCost, 2);
  assert.equal(loads, 2, 'too-old last-good must retain blocking load');

  const aggregateAt = Date.now() - 600_500;
  context.cache.set('activity:all:default:30d', {at:aggregateAt,value:{totalCost:1}});
  const staleAggregate = await context.cached('activity:all:default:30d', async () => ({
    totalCost:2,
    _cache:{stale:true,ageMs:600_500,reason:'deferred-refresh'},
  }));
  assert.equal(staleAggregate._cache.reason, 'deferred-refresh');
  assert.equal(context.cache.get('activity:all:default:30d').at, aggregateAt, 'stale aggregate must not advance the last-good timestamp');

  context.inFlight.set('usage:joining:30d', Promise.resolve({totalCost:99}));
  context.cache.set('usage:joining:30d', {at:Date.now() - 600_500,value:{totalCost:4}});
  const joinedDeferred = await context.cached('usage:joining:30d', async () => { loads += 1; return {totalCost:5}; }, {deferExpired:true});
  assert.equal(joinedDeferred.totalCost, 4);
  assert.equal(joinedDeferred._cache.reason, 'deferred-refresh');
  assert.equal(loads, 2, 'existing inFlight must retain ownership without a duplicate load');
  context.inFlight.delete('usage:joining:30d');

  // The queued loader cannot start until the foreground count reaches zero.
  await context.drainSecondaryRefresh();
  assert.equal(loads, 2);
  context.foregroundSnapshotsActive = 0;
  context.lastForegroundEndedAt = Date.now();
  await context.drainSecondaryRefresh();
  assert.equal(loads, 3);
  assert.equal(context.secondaryRefreshStats.completed, 1, 'completed requires an advanced cache timestamp');
  assert.equal(context.secondaryRefreshQueue.length, 0);

  // A key refreshed by another owner before drain is neither a completion nor an error.
  context.foregroundSnapshotsActive = 1;
  context.cache.set('usage:superseded:30d', {at:Date.now() - 600_500,value:{totalCost:1}});
  await context.cached('usage:superseded:30d', async () => ({totalCost:2}), {deferExpired:true});
  context.cache.set('usage:superseded:30d', {at:Date.now(),value:{totalCost:3}});
  context.foregroundSnapshotsActive = 0;
  await context.drainSecondaryRefresh();
  assert.equal(context.secondaryRefreshStats.superseded, 1);
  assert.equal(context.secondaryRefreshStats.errors, 0);

  // Queue saturation fails safe rather than silently dropping refresh ownership.
  context.foregroundSnapshotsActive = 1;
  context.secondaryRefreshKeys.clear();
  context.secondaryRefreshQueue.length = 0;
  for (let i = 0; i < 32; i += 1) {
    context.cache.set(`usage:q${i}:30d`, {at:Date.now() - 600_500,value:{totalCost:i}});
    const value = await context.cached(`usage:q${i}:30d`, async () => ({totalCost:i+100}), {deferExpired:true});
    assert.equal(value._cache.stale, true);
  }
  assert.equal(context.secondaryRefreshQueue.length, 32);
  context.cache.set('usage:overflow:30d', {at:Date.now() - 600_500,value:{totalCost:1}});
  const overflow = await context.cached('usage:overflow:30d', async () => { loads += 1; return {totalCost:2}; }, {deferExpired:true});
  assert.equal(overflow.totalCost, 2, 'queue overflow must use the blocking fail-safe');
  assert.equal(context.secondaryRefreshStats.dropped, 1);

  // Explicit stale topology: leaf -> analytics window -> scopes -> module status.
  const staleStart = engine.indexOf('function staleCacheMetadata(');
  const staleEnd = engine.indexOf('\nfunction moduleValueStatus(', staleStart);
  const staleContext = {};
  vm.createContext(staleContext);
  vm.runInContext(`${engine.slice(staleStart, staleEnd)}\nthis.valueIsStale = valueIsStale;`, staleContext);
  const topology = {scopes:{all:{windows:{'24h':{totalCost:1},'7d':{totalCost:2,_cache:{stale:true,reason:'deferred-refresh'}}}}}};
  assert.equal(staleContext.valueIsStale(topology), true);
  assert.equal(staleContext.valueIsStale({scopes:{all:{windows:{'24h':{totalCost:1},'7d':{totalCost:2}}}}}), false);

  // Merged activity must preserve bounded provenance and never copy arbitrary source errors.
  const mergeStart = engine.indexOf('function mergeUsageActivities(');
  const mergeEnd = engine.indexOf('\nfunction creditsBootstrapCandidate(', mergeStart);
  const mergeContext = {
    Map,
    Date,
    Math,
    Number,
    blankMetrics: () => ({errorCount:0,cacheCount:0}),
    finite: (value) => Number.isFinite(Number(value)) ? Number(value) : null,
    addMetrics: () => {},
    addNamed: () => {},
  };
  vm.createContext(mergeContext);
  vm.runInContext(`${engine.slice(mergeStart, mergeEnd)}\nthis.mergeUsageActivities = mergeUsageActivities;`, mergeContext);
  const merged = mergeContext.mergeUsageActivities([
    {totalRequests:1,totalCost:1,_cache:{stale:true,ageMs:301000,reason:'deferred-refresh'}},
    {totalRequests:1,totalCost:2,_cache:{stale:true,ageMs:302000,reason:'SECRET arbitrary upstream text'}},
  ], '7d');
  assert.deepEqual(JSON.parse(JSON.stringify(merged._cache)), {stale:true,ageMs:302000,reason:'deferred-refresh'});

  assert.ok(diagnostics.includes("['hit','miss','join','load','stale','deferred','blocked','error']"));
  assert.ok(diagnostics.includes("['empty','expired','deferred-refresh','circuit-open','refresh-error']"));
  assert.ok(diagnostics.includes('function bridgeSecondaryRefreshText(performance)'));
  assert.ok(latest.includes('Bridge secondary refresh:'));
  assert.ok(latest.includes('deferred-refresh'));
  const secondaryTextStart = diagnostics.indexOf('function bridgeSecondaryRefreshText(');
  const secondaryTextEnd = diagnostics.indexOf('\n  function stableReadinessSnapshot(', secondaryTextStart);
  const secondaryTextSource = diagnostics.slice(secondaryTextStart, secondaryTextEnd);
  assert.ok(!/organizationId|orgId|rawKey|cacheKey|\.key\b/.test(secondaryTextSource), 'secondary diagnostics must not expose raw identity');

  assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.63 — Long-window Critical Path Decoupling`'));
  assert.ok(guidelines.includes('Last verified real-device baseline: `3.0.0-alpha.5.62 — Snapshot Decision Attribution`'));
  assert.match(workflow, /group: repo-main-write/);
  assert.match(workflow, /check_release_monotonic\.py/);
  assert.match(workflow, /--check-artifacts/);
  assert.match(workflow, /p22-monotonic-release-integrity\.cjs/);
  assert.match(workflow, /p24-snapshot-decision-attribution\.cjs/);
  assert.match(workflow, /p25-long-window-critical-path-decoupling\.cjs/);
  assert.ok(workflow.indexOf('check_release_monotonic.py') < workflow.indexOf("git commit -m 'release: publish Local Usage Dashboard 3.0.0-alpha.5.63 product artifacts'"));
  assert.ok(guidelines.includes('UNKNOWN stays distinct from known zero'));
  assert.ok(guidelines.includes('## Long-term update roadmap'));

  console.log('usage-dashboard P25 Long-window Critical Path Decoupling: OK · 24h foreground truth preserved, bounded one-lane long-window refresh verified');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
