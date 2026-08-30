'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
if (release.productVersion !== '3.0.0-alpha.5.93') {
  console.log(`P59 Truthful DevPass Cycle / Source-Window Summary: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.93`);
  process.exit(0);
}
assert.equal(release.engineVersion, '1.6.30');
assert.equal(release.managerVersion, '1.3.4');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.93.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Truthful DevPass Cycle / Source-Window Summary');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_cycle_summary_593.py');

const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
assert.notEqual(engineSha, '19a74fa0b1ae3ef24008a66e325b170edb4e29d6a84b84e0d4d49ad72293bcd7', '5.93 Engine semantic release must not reuse 5.92 Engine artifact');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', '5.93 bootstrap must remain exact-byte unchanged');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.4';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.93';",
  "const BUNDLED_ENGINE_VERSION = '1.6.30';",
  `const BUNDLED_ENGINE_SHA256 = '${engineSha}';`,
  "const MANAGED_CLI_VERSION = '1.10.0';",
]) assert.ok(manager.includes(marker), `5.93 Manager invariant missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.93');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.30');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.4');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.93');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const captureSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
for (const marker of [
  "'date','requestCount','inputTokens','outputTokens','cachedTokens','cacheWriteTokens','totalTokens'",
  "if (typeof raw.granularity === 'string') safe.granularity = raw.granularity;",
  "'devPlanResetPassPrice','devPlanBillingCycleStart','devPlanCancelled','devPlanExpiresAt'",
]) assert.ok(captureSource.includes(marker), `existing capture authority missing: ${marker}`);

const engineSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
for (const marker of [
  'function explicitDailyActivityMetric(value)',
  'function boundedDailyActivitySeries(raw, range)',
  'dailySeries = boundedDailyActivitySeries(raw, range)',
  'dailySeriesCandidates.length === 1 ? dailySeriesCandidates[0] : null',
]) assert.ok(engineSource.includes(marker), `5.93 Engine daily truth marker missing: ${marker}`);
const boundedStart = engineSource.indexOf('function boundedDailyActivitySeries(raw, range)');
const boundedEnd = engineSource.indexOf('\nfunction normalizeCapturedRecentLogs', boundedStart);
const boundedBody = engineSource.slice(boundedStart, boundedEnd > boundedStart ? boundedEnd : boundedStart + 4000);
assert.ok(!boundedBody.includes('usageMetricValues('), 'daily scalar extraction must not reuse aggregate zero-filling semantics');
assert.ok(!boundedBody.includes('?? 0'), 'daily scalar extraction must not synthesize zero from missing fields');
for (const forbidden of ['modelBreakdown', 'organizationId', 'projectId', 'apiKey', 'prompt', 'response']) {
  assert.equal(boundedBody.includes(forbidden), false, `daily scalar series must stay bounded: ${forbidden}`);
}

const normalize = fs.readFileSync('plugins/usage-dashboard/src/16-usage-analytics.part.js', 'utf8');
assert.ok(normalize.includes('function normalizeDailyScalarSeries(value)'), 'Plugin must preserve bounded daily scalar metadata');
assert.ok(normalize.includes('dailySeries:normalizeDailyScalarSeries(raw.dailySeries)'), 'Plugin scoped analytics must expose daily series without creating another source');

const helperSource = fs.readFileSync('plugins/usage-dashboard/src/17-cycle-summary.part.js', 'utf8');
for (const forbidden of ['fetch(', 'XMLHttpRequest', 'Risuai.', 'setTimeout(', 'setInterval(', 'localStorage', 'persist', '/logs', 'credits']) {
  assert.equal(helperSource.toLowerCase().includes(forbidden.toLowerCase()), false, `cycle helper must remain pure DevPass-only truth: ${forbidden}`);
}
const sandbox = {KST_TIME_ZONE:'Asia/Seoul', Intl, Date};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__cycle = {devpassCycleSummaryTruth, devpassCycleSummaryDiagnosticText};`, sandbox);
const {devpassCycleSummaryTruth, devpassCycleSummaryDiagnosticText} = sandbox.__cycle;

const daily30 = {
  windows: {
    '30d': {dailySeries:{range:'30d',granularity:'daily',buckets:[
      {date:'2026-08-01',requestCount:1,inputTokens:80,cachedTokens:40,totalTokens:100},
      {date:'2026-08-02',requestCount:0,inputTokens:0,cachedTokens:0,totalTokens:0},
      {date:'2026-08-03',requestCount:2,inputTokens:160,cachedTokens:80,totalTokens:200},
    ]}},
    '7d': {dailySeries:{range:'7d',granularity:'daily',buckets:[
      {date:'2026-08-02',requestCount:0,inputTokens:0,cachedTokens:0,totalTokens:0},
      {date:'2026-08-03',requestCount:2,inputTokens:160,cachedTokens:80,totalTokens:200},
    ]}},
  }
};
const exactAccount = {
  billingCycleStart:'2026-08-01T00:00:00+09:00',
  expiresAt:'2026-09-01T00:00:00+09:00',
};
let truth = devpassCycleSummaryTruth(exactAccount, daily30, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.mode, 'billing-cycle-exact');
assert.equal(truth.title, '이번 사이클');
assert.equal(truth.reason, 'ok');
assert.equal(truth.requests, 3);
assert.equal(truth.totalTokens, 300);
assert.equal(truth.cachedInputShare, 50);
assert.equal(truth.peakDay, '2026-08-03');
assert.match(devpassCycleSummaryDiagnosticText(truth), /mode billing-cycle-exact · reason ok · requests 3 · tokens 300 · cached-input 50\.0% · peak 2026-08-03/);

truth = devpassCycleSummaryTruth({
  billingCycleStart:'2026-08-01T20:39:00+09:00',
  expiresAt:'2026-09-01T20:39:00+09:00',
}, daily30, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.mode, 'window-30d');
assert.equal(truth.title, '최근 30일');
assert.equal(truth.reason, 'boundary-not-kst-day');
assert.equal(truth.requests, 3);

const sevenOnly = {windows:{'7d':daily30.windows['7d']}};
truth = devpassCycleSummaryTruth(exactAccount, sevenOnly, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.mode, 'window-7d');
assert.equal(truth.title, '최근 7일');
assert.equal(truth.reason, 'coverage-insufficient');

const incomplete = JSON.parse(JSON.stringify(daily30));
incomplete.windows['30d'].dailySeries.buckets[1].cachedTokens = null;
truth = devpassCycleSummaryTruth({billingCycleStart:null,expiresAt:null}, incomplete, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.mode, 'window-30d');
assert.equal(truth.cachedInputShare, null, 'missing cachedTokens must remain UNKNOWN rather than zero');
assert.equal(truth.requests, 3, 'independent complete request metric remains known');

const zeroWindow = {windows:{'30d':{dailySeries:{range:'30d',granularity:'daily',buckets:[
  {date:'2026-08-01',requestCount:0,inputTokens:0,cachedTokens:0,totalTokens:0},
  {date:'2026-08-02',requestCount:0,inputTokens:0,cachedTokens:0,totalTokens:0},
]}}}};
truth = devpassCycleSummaryTruth({billingCycleStart:null,expiresAt:null}, zeroWindow, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.requests, 0);
assert.equal(truth.peakDay, null, 'explicit zero-request window must not invent a peak day');
assert.equal(truth.cachedInputShare, null, 'zero input denominator must leave cached input share UNKNOWN');

const tieWindow = {windows:{'30d':{dailySeries:{range:'30d',granularity:'daily',buckets:[
  {date:'2026-08-01',requestCount:4,inputTokens:10,cachedTokens:1,totalTokens:20},
  {date:'2026-08-02',requestCount:4,inputTokens:10,cachedTokens:1,totalTokens:20},
]}}}};
truth = devpassCycleSummaryTruth({billingCycleStart:null,expiresAt:null}, tieWindow, Date.parse('2026-08-03T12:00:00+09:00'));
assert.equal(truth.peakDay, '2026-08-01', 'peak tie must choose earliest source day deterministically');

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
for (const marker of [
  'const cycleSummary = devpassCycleSummaryTruth(devpassAccount, d.analyticsScopes?.scopes?.devpass);',
  'devpass-cycle-summary',
  'Cached input share',
  'Peak day',
  'billing-cycle-truth-strip',
  'premium-allowance-card',
  'paygAccountTruth(devpassAccount)',
]) assert.ok(dashboard.includes(marker), `5.93 dashboard invariant missing: ${marker}`);
assert.equal((dashboard.match(/devpass-cycle-summary/g) || []).length, 1, 'cycle summary must have exactly one UI owner');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
assert.ok(diagnostics.includes('devpassCycleSummaryDiagnosticText(devpassCycleSummaryTruth(diagAccount, d.analyticsScopes?.scopes?.devpass))'), 'Diagnostics must consume the same cycle truth helper');
assert.ok(diagnostics.includes('premiumAllowanceDiagnosticText(d.weekly)'), 'Premium diagnostics must remain unchanged');
assert.ok(diagnostics.includes('paygAccountDiagnosticText(diagAccount)'), 'PAYG diagnostics must remain unchanged');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_cycle_summary_593.py', 'utf8');
for (const marker of [
  'BASE_ENGINE_SHA',
  'BASE_MANAGER_SHA',
  "build_bridge_engine.cjs'), '--write'",
  "build_bridge_engine.cjs'), '--check'",
  'render_e16_status_doc.cjs',
  'patch_manager(engine_sha)',
  'BASE_BOOTSTRAP_SHA',
]) assert.ok(materializer.includes(marker), `5.93 materializer invariant missing: ${marker}`);

console.log(`P59 Truthful DevPass Cycle / Source-Window Summary: OK · Product 5.93 · Engine 1.6.30 ${engineSha.slice(0,12)} · Manager 1.3.4 · source-window fail-closed · no new I/O`);
