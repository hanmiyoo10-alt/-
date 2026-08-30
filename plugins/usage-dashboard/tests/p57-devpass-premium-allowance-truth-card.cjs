'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.91');
assert.equal(release.engineVersion, '1.6.28');
assert.equal(release.managerVersion, '1.3.4');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.91.json', 'utf8'));
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_premium_allowance_truth_card_591.py');

const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
assert.equal(engineSha, '803a8c2ee45ced2681ff7f3bf5e9db65059f8012999fff5c9a81e806b49f4b4b', '5.91 must preserve the 5.90 Engine artifact exactly');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.4';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.91';",
  "const BUNDLED_ENGINE_VERSION = '1.6.28';",
  "const BUNDLED_ENGINE_SHA256 = '803a8c2ee45ced2681ff7f3bf5e9db65059f8012999fff5c9a81e806b49f4b4b';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
]) assert.ok(manager.includes(marker), `5.91 Manager invariant missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.91');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.28');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.4');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.91');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const helperSource = fs.readFileSync('plugins/usage-dashboard/src/18-premium-allowance.part.js', 'utf8');
for (const forbidden of [
  'fetch(', 'XMLHttpRequest', 'Risuai.', 'setTimeout(', 'setInterval(', 'localStorage', 'persist', '/logs', 'PAYG covering', 'charged from credits'
]) assert.ok(!helperSource.includes(forbidden), `Premium allowance helper must remain pure/read-only: ${forbidden}`);

const sandbox = {
  resetTimestamp(value) {
    if (value === null || value === undefined || value === '') return NaN;
    const parsed = typeof value === 'number' ? value : Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : NaN;
  },
};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__premium = {premiumAllowanceTruth, premiumAllowanceDiagnosticText};`, sandbox);
const {premiumAllowanceTruth, premiumAllowanceDiagnosticText} = sandbox.__premium;

let truth = premiumAllowanceTruth({used:0, limit:50, resetAt:'2026-09-01T00:00:00Z'});
assert.equal(truth.used, 0, 'explicit zero usage must remain known zero');
assert.equal(truth.limit, 50);
assert.equal(truth.remaining, 50);
assert.equal(truth.percentUsed, 0);
assert.equal(truth.visualPercent, 0);
assert.equal(truth.state, 'normal');
assert.equal(truth.stateLabel, '정상');
assert.equal(truth.resetAt, '2026-09-01T00:00:00Z');

for (const used of [null, undefined, '', -1, 'nope']) {
  truth = premiumAllowanceTruth({used, limit:50});
  assert.equal(truth.used, null, `invalid/missing used must stay UNKNOWN: ${String(used)}`);
  assert.equal(truth.remaining, null);
  assert.equal(truth.percentUsed, null);
  assert.equal(truth.state, 'unknown');
}

for (const limit of [null, undefined, '', 0, -1, 'nope']) {
  truth = premiumAllowanceTruth({used:10, limit});
  assert.equal(truth.limit, null, `invalid/non-positive limit must stay UNKNOWN: ${String(limit)}`);
  assert.equal(truth.remaining, null);
  assert.equal(truth.percentUsed, null);
}

truth = premiumAllowanceTruth({used:39.999, limit:50});
assert.equal(truth.state, 'normal');
truth = premiumAllowanceTruth({used:40, limit:50});
assert.equal(truth.percentUsed, 80);
assert.equal(truth.state, 'warning');
assert.equal(truth.stateLabel, '주의');
truth = premiumAllowanceTruth({used:49.999, limit:50});
assert.equal(truth.state, 'warning');
truth = premiumAllowanceTruth({used:50, limit:50});
assert.equal(truth.percentUsed, 100);
assert.equal(truth.state, 'exhausted');
assert.equal(truth.stateLabel, '소진');
truth = premiumAllowanceTruth({used:60, limit:50});
assert.equal(truth.remaining, 0);
assert.equal(truth.percentUsed, 120, 'actual derived percentage must preserve over-limit evidence');
assert.equal(truth.visualPercent, 100, 'visual percentage may clamp without rewriting actual diagnostics percentage');
assert.equal(truth.state, 'exhausted');
assert.equal(premiumAllowanceTruth({used:10,limit:50,resetAt:'not-a-date'}).resetAt, null, 'invalid reset must stay UNKNOWN');
assert.match(premiumAllowanceDiagnosticText({used:60,limit:50}), /remaining 0 · 120\.0% · reset — · state exhausted/);

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.equal((dashboard.match(/premium-allowance-card/g) || []).length, 1, 'Premium allowance card must have one owner');
const resetPassIndex = dashboard.indexOf('Reset Pass · PAYG');
const premiumIndex = dashboard.indexOf('Premium 주간 한도');
const billingIndex = dashboard.indexOf('Billing Cycle');
assert.ok(resetPassIndex >= 0 && premiumIndex > resetPassIndex && billingIndex > premiumIndex, 'Premium card must sit after Reset Pass/PAYG and before Billing Cycle');
for (const label of ['사용</span>', '한도</span>', '남음</span>', '사용률</span>', '리셋</span>']) {
  assert.ok(dashboard.includes(label), `Premium card field missing: ${label}`);
}
for (const marker of [
  'premiumAllowance.used === null',
  'premiumAllowance.limit === null',
  'premiumAllowance.remaining === null',
  'premiumAllowance.percentUsed === null',
  "premiumAllowance.resetAt ? remainingTimeForDashboard(premiumAllowance.resetAt) : '—'",
]) assert.ok(dashboard.includes(marker), `Premium card UNKNOWN/source boundary missing: ${marker}`);
for (const forbidden of ['PAYG covering','charged from credits','week start + 7d','avgDailySpend7d']) {
  const start = Math.max(0, premiumIndex - 1000);
  const end = billingIndex + 100;
  assert.ok(!dashboard.slice(start,end).includes(forbidden), `Premium card must not infer unavailable truth: ${forbidden}`);
}

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
assert.ok(diagnostics.includes('premiumAllowanceDiagnosticText(d.weekly)'), 'Diagnostics must consume the same Premium truth helper');

const widget = fs.readFileSync('plugins/usage-dashboard/src/70-widget-render.part.js', 'utf8');
assert.ok(widget.includes('d.weekly'), 'existing floating Premium widget source must remain present');
assert.ok(!widget.includes('premiumAllowanceTruth'), '5.91 must not redesign or reroute the floating Premium widget');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_premium_allowance_truth_card_591.py', 'utf8');
for (const marker of [
  'BASE_ENGINE_SHA',
  "sha256(ENGINE) != BASE_ENGINE_SHA",
  'patch_manager_product_identity()',
  "build_bridge_engine.cjs'), '--check'",
  "build_usage_dashboard.cjs'), '--write'",
]) assert.ok(materializer.includes(marker), `5.91 materializer invariant missing: ${marker}`);
assert.ok(!materializer.includes("build_bridge_engine.cjs'), '--write'"), '5.91 must not rebuild the exact-byte Engine');

console.log('P57 DevPass Weekly Premium Allowance Truth Card: OK · Product 5.91 · Engine exact-byte 1.6.28 · Manager semantic 1.3.4 · source-only allowance truth · UNKNOWN preserved · no new I/O');
