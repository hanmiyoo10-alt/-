'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.94');
assert.equal(release.engineVersion, '1.6.30');
assert.equal(release.managerVersion, '1.3.4');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.94.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Compact Authoritative 24h Cost Drivers');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_cost_drivers_594.py');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});

const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
assert.equal(engineSha, '035aa5d6535edd357df3390b7cd22acff2dec298a79e86d2fe2b4b0d3f2b4228', '5.94 must preserve 5.93 Engine exact bytes');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', '5.94 bootstrap must remain exact-byte unchanged');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.4';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.94';",
  "const BUNDLED_ENGINE_VERSION = '1.6.30';",
  `const BUNDLED_ENGINE_SHA256 = '${engineSha}';`,
  "const MANAGED_CLI_VERSION = '1.10.0';",
]) assert.ok(manager.includes(marker), `5.94 Manager invariant missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.94');
assert.equal(manifest.components?.plugin?.version, '3.0.0-alpha.5.94');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.30');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.4');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.94');
assert.equal(manifest.components?.bridgeManager?.sha256, crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs')).digest('hex'));
assert.equal(manifest.components?.bridgeManager?.bootstrapSha256, bootstrapSha);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const analyticsSource = fs.readFileSync('plugins/usage-dashboard/src/16-usage-analytics.part.js', 'utf8');
const helperStart = analyticsSource.indexOf('function costDriverMeaningfulName(value)');
const helperEnd = analyticsSource.indexOf('function normalize(payload)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '5.94 cost-driver helper boundary missing');
const helperSource = analyticsSource.slice(helperStart, helperEnd);
for (const marker of [
  'function costDriverMeaningfulName(value)',
  'function costDriverCodePointCompare(left, right)',
  'function costDriverLeader(rows, totalCost)',
  'function compactCostDriverTruth(window)',
  'function costDriverDiagnosticText(scope, window)',
]) assert.ok(helperSource.includes(marker), `5.94 helper API missing: ${marker}`);
for (const forbidden of ['fetch(', 'XMLHttpRequest', 'Risuai.', 'setTimeout(', 'setInterval(', 'localStorage', '/logs', '/activity', 'catalog', 'pricing']) {
  assert.equal(helperSource.toLowerCase().includes(forbidden.toLowerCase()), false, `cost-driver helper must remain pure/local: ${forbidden}`);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__cost = {costDriverLeader, compactCostDriverTruth, costDriverDiagnosticText};`, sandbox);
const {costDriverLeader, compactCostDriverTruth, costDriverDiagnosticText} = sandbox.__cost;

const sourceWindow = {
  totalCost:10,
  models:[
    {name:'z-model', cost:2, requests:999},
    {name:'b-model', cost:5, requests:1},
    {name:'a-model', cost:5, requests:500},
    {name:'zero-model', cost:0, requests:9999},
    {name:'Unknown', cost:99, requests:9999},
    {name:'missing-cost'},
  ],
  providers:[
    {name:'provider-z', cost:1},
    {name:'provider-a', cost:6},
    {name:'provider-zero', cost:0},
  ],
};
const sourceBefore = JSON.stringify(sourceWindow);
let truth = compactCostDriverTruth(sourceWindow);
assert.equal(truth.model.name, 'a-model', 'equal-cost model tie must use exact source display name code-point order, not requests');
assert.equal(truth.model.cost, 5);
assert.equal(truth.model.share, 50);
assert.equal(truth.model.state, 'ok');
assert.equal(truth.provider.name, 'provider-a');
assert.equal(truth.provider.cost, 6);
assert.equal(truth.provider.share, 60);
assert.equal(JSON.stringify(sourceWindow), sourceBefore, 'selector must not mutate or reorder source analytics rows');

truth = compactCostDriverTruth({totalCost:10,models:[{name:'zero',cost:0},{name:'missing'},{name:'bad',cost:Number.NaN}],providers:[]});
assert.equal(truth.model.name, null);
assert.equal(truth.model.cost, null);
assert.equal(truth.model.state, 'no-positive-cost', 'zero/missing/invalid cost must never become a 5.94 leader');
assert.equal(truth.provider.state, 'source-unavailable');

let leader = costDriverLeader([{name:'Unknown',cost:9},{name:'',cost:8}], 20);
assert.equal(leader.name, null);
assert.equal(leader.state, 'name-unavailable', 'positive cost without a meaningful source name must remain UNKNOWN');

leader = costDriverLeader([{name:'model-a',cost:9}], 8);
assert.equal(leader.name, 'model-a');
assert.equal(leader.cost, 9);
assert.equal(leader.share, null, 'inconsistent totalCost must not be clamped into a plausible share');
assert.equal(leader.shareState, 'total-unknown');
leader = costDriverLeader([{name:'model-a',cost:9}], 0);
assert.equal(leader.share, null, 'zero denominator must keep share UNKNOWN');
leader = costDriverLeader([{name:'model-a',cost:9}], null);
assert.equal(leader.share, null, 'missing denominator must keep share UNKNOWN');

const diag = costDriverDiagnosticText('devpass', sourceWindow);
assert.match(diag, /^Cost drivers: scope devpass · window 24h · model a-model \$5\.0000 · share 50\.0% · provider provider-a \$6\.0000 · share 60\.0% · fidelity positive-cost-only$/);
assert.match(costDriverDiagnosticText('credits', {models:[{name:'zero',cost:0}],providers:[]}), /model — \(no-positive-cost\) · provider — \(source-unavailable\)/);

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.ok(dashboard.includes('const scopeCostDrivers = compactCostDriverTruth(scopeActivity);'));
assert.ok(dashboard.includes('const costDriverUiText = row =>'));
assert.equal(dashboard.includes('scopeActivity.providers[0]'), false, '5.94 usage summary must not trust first provider row');
assert.equal(dashboard.includes('scopeActivity.models[0]'), false, '5.94 usage summary must not trust first model row');

const analyticsContext = fs.readFileSync('plugins/usage-dashboard/src/52-analytics-context.part.js', 'utf8');
assert.ok(analyticsContext.includes('const analyticsCostDrivers = compactCostDriverTruth(analyticsW24);'));
assert.equal(analyticsContext.includes('analyticsW24.providers[0]'), false, '5.94 Analytics must not trust first provider row');
assert.equal(analyticsContext.includes('analyticsW24.models[0]'), false, '5.94 Analytics must not trust first model row');

const markup = fs.readFileSync('plugins/usage-dashboard/src/54-dashboard-markup.part.js', 'utf8');
for (const marker of ['24h 비용 주도 · Top Model', '24h 비용 주도 · Top Provider', '.mini.cost-driver b{white-space:normal']) {
  assert.ok(markup.includes(marker), `5.94 compact UI marker missing: ${marker}`);
}
assert.ok(markup.includes('7일 총 비용'), 'existing 7d analytics must remain');
assert.ok(markup.includes('30일 총 비용'), 'existing 30d analytics must remain');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
assert.ok(diagnostics.includes('costDriverDiagnosticText(diagAnalyticsScopeKey, diagAnalyticsW24)'), 'Diagnostics must consume the same cost-driver truth helper');
assert.ok(diagnostics.includes('devpassCycleSummaryDiagnosticText(devpassCycleSummaryTruth(diagAccount, d.analyticsScopes?.scopes?.devpass))'), '5.93 cycle summary diagnostics must remain');
assert.ok(diagnostics.includes('premiumAllowanceDiagnosticText(d.weekly)'), 'Premium diagnostics must remain');
assert.ok(diagnostics.includes('paygAccountDiagnosticText(diagAccount)'), 'PAYG diagnostics must remain');

const p59 = fs.readFileSync('plugins/usage-dashboard/tests/p59-truthful-devpass-cycle-summary.cjs', 'utf8');
assert.ok(p59.includes("if (release.productVersion !== '3.0.0-alpha.5.93')"), 'P59 must become an exact historical applicability regression on 5.94');
assert.ok(p59.includes('UD_HISTORICAL_VERSION_LOCK'), 'P59 stale manifest Product assertion must be explicitly historical');
assert.ok(p59.includes("assert.equal(truth.mode, 'billing-cycle-exact')"), 'P59 historical body must remain intact');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_cost_drivers_594.py', 'utf8');
for (const marker of [
  "BASE_VERSION = '3.0.0-alpha.5.93'",
  "TARGET_VERSION = '3.0.0-alpha.5.94'",
  "TARGET_ENGINE = '1.6.30'",
  `BASE_ENGINE_SHA = '${engineSha}'`,
  'BASE_MANAGER_SHA',
  'BASE_BOOTSTRAP_SHA',
  "build_bridge_engine.cjs'), '--check'",
  "build_usage_dashboard.cjs'), '--write'",
  'positive-cost-only cost drivers',
]) assert.ok(materializer.includes(marker), `5.94 materializer invariant missing: ${marker}`);
assert.equal(materializer.includes("build_bridge_engine.cjs'), '--write'"), false, '5.94 must not rebuild/write Engine bytes');

console.log(`P60 Compact Authoritative Cost Drivers: OK · Product 5.94 · Engine 1.6.30 exact ${engineSha.slice(0,12)} · Manager 1.3.4 · positive-cost-only · no new I/O`);
