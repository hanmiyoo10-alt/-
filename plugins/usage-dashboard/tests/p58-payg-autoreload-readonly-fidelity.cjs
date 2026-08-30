'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
if (release.productVersion !== '3.0.0-alpha.5.92') {
  console.log(`P58 PAYG + Auto-Reload Read-Only Fidelity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.92`);
  process.exit(0);
}
assert.equal(release.engineVersion, '1.6.29');
assert.equal(release.managerVersion, '1.3.4');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.92.json', 'utf8'));
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_payg_autoreload_fidelity_592.py');

const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
assert.notEqual(engineSha, '803a8c2ee45ced2681ff7f3bf5e9db65059f8012999fff5c9a81e806b49f4b4b', '5.92 Engine semantic release must not reuse the 5.91 Engine artifact');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.4';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.92';",
  "const BUNDLED_ENGINE_VERSION = '1.6.29';",
  `const BUNDLED_ENGINE_SHA256 = '${engineSha}';`,
  "const MANAGED_CLI_VERSION = '1.10.0';",
]) assert.ok(manager.includes(marker), `5.92 Manager invariant missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
// UD_HISTORICAL_VERSION_LOCK — P58 verifies the immutable 5.92 release when that release is current.
assert.equal(manifest.productVersion, '3.0.0-alpha.5.92');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.29');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.4');
// UD_HISTORICAL_VERSION_LOCK — Manager Product identity is part of the frozen 5.92 regression.
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.92');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', '5.92 bootstrap must remain exact-byte unchanged');

const helperSource = fs.readFileSync('plugins/usage-dashboard/src/19-payg-account.part.js', 'utf8');
for (const forbidden of [
  'fetch(', 'XMLHttpRequest', 'Risuai.', 'setTimeout(', 'setInterval(', 'localStorage', 'persist', '/logs',
  'paymentMethod', 'stripeCustomer', 'cardNumber', 'PAYG covering', 'charged from credits'
]) assert.ok(!helperSource.includes(forbidden), `PAYG helper must remain pure/read-only: ${forbidden}`);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__payg = {paygAccountTruth, paygAccountDiagnosticText};`, sandbox);
const {paygAccountTruth, paygAccountDiagnosticText} = sandbox.__payg;

let truth = paygAccountTruth({paygEnabled:true, regularCredits:12.5, autoTopUpEnabled:true, autoTopUpThreshold:10, autoTopUpAmount:25});
assert.equal(truth.paygEnabled, true);
assert.equal(truth.paygState, 'on');
assert.equal(truth.balanceState, 'available');
assert.equal(truth.balanceStateLabel, '사용 가능');
assert.equal(truth.autoTopUpState, 'on');
assert.equal(truth.autoTopUpThreshold, 10);
assert.equal(truth.autoTopUpAmount, 25);

truth = paygAccountTruth({paygEnabled:true, regularCredits:0, autoTopUpEnabled:false, autoTopUpThreshold:0, autoTopUpAmount:0});
assert.equal(truth.regularCredits, 0, 'explicit Regular Credits zero must remain known zero');
assert.equal(truth.balanceState, 'empty');
assert.equal(truth.autoTopUpEnabled, false);
assert.equal(truth.autoTopUpState, 'off');
assert.equal(truth.autoTopUpThreshold, 0, 'explicit threshold zero must remain known zero');
assert.equal(truth.autoTopUpAmount, 0, 'explicit amount zero must remain known zero');

truth = paygAccountTruth({paygEnabled:false, regularCredits:4});
assert.equal(truth.balanceState, 'held-off');
assert.equal(truth.balanceStateLabel, '보유 중 · PAYG OFF');
truth = paygAccountTruth({paygEnabled:false, regularCredits:0});
assert.equal(truth.balanceState, 'off');
assert.equal(truth.balanceStateLabel, 'PAYG OFF');

for (const value of [undefined, null, 0, 1, 'false', 'true']) {
  truth = paygAccountTruth({paygEnabled:value, regularCredits:5, autoTopUpEnabled:value});
  assert.equal(truth.paygEnabled, null, `non-boolean/missing PAYG must stay UNKNOWN: ${String(value)}`);
  assert.equal(truth.paygState, 'unknown');
  assert.equal(truth.paygLabel, '—');
  assert.equal(truth.balanceState, 'unknown');
  assert.equal(truth.autoTopUpEnabled, null);
  assert.equal(truth.autoTopUpState, 'unknown');
}
truth = paygAccountTruth({paygEnabled:true, regularCredits:-1});
assert.equal(truth.regularCredits, -1, 'exact source numeric balance may remain visible');
assert.equal(truth.balanceState, 'unknown', 'unsupported numeric balance shape must not be semantically classified');
assert.match(paygAccountDiagnosticText({paygEnabled:null, regularCredits:null}), /overflow unknown · credits — · balance-state unknown · auto-reload unknown · threshold — · amount —/);

const engineSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
assert.ok(engineSource.includes('function explicitBillingBoolean(value)'), '5.92 must reuse the existing exact boolean helper');
assert.ok(engineSource.includes("devPlanPaygEnabled: explicitBillingBoolean(pick(row, ['devPlanPaygEnabled', 'dev_plan_payg_enabled'], null))"), 'org compatibility PAYG must preserve UNKNOWN');
assert.ok(engineSource.includes("paygEnabled: explicitBillingBoolean(pick(raw, ['devPlanPaygEnabled', 'dev_plan_payg_enabled', 'paygEnabled'], null))"), 'independent PAYG must preserve UNKNOWN');
assert.ok(engineSource.includes('autoTopUpEnabled: explicitBillingBoolean'), 'Engine must promote Auto-Reload boolean truth');
assert.ok(engineSource.includes("autoTopUpThreshold: ['autoTopUpThreshold'"), 'Engine must promote explicit threshold values');
assert.ok(engineSource.includes("autoTopUpAmount: ['autoTopUpAmount'"), 'Engine must promote explicit amount values');
assert.ok(!engineSource.includes('devPlanPaygEnabled: Boolean('), 'org PAYG must never collapse missing to false');
assert.ok(!engineSource.includes('paygEnabled: Boolean(pick(raw'), 'independent PAYG must never collapse missing to false');

const normalize = fs.readFileSync('plugins/usage-dashboard/src/16-usage-analytics.part.js', 'utf8');
for (const marker of [
  "paygEnabled:typeof ds.paygEnabled === 'boolean' ? ds.paygEnabled : null",
  "autoTopUpEnabled:typeof ds.autoTopUpEnabled === 'boolean' ? ds.autoTopUpEnabled : null",
  'autoTopUpThreshold:num(ds.autoTopUpThreshold) ? Number(ds.autoTopUpThreshold) : null',
  'autoTopUpAmount:num(ds.autoTopUpAmount) ? Number(ds.autoTopUpAmount) : null',
]) assert.ok(normalize.includes(marker), `Plugin account truth normalization missing: ${marker}`);
assert.ok(!normalize.includes('paygEnabled:ds.paygEnabled === true'), 'Plugin must not collapse PAYG UNKNOWN to false');

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.ok(dashboard.includes('const paygTruth = paygAccountTruth(devpassAccount);'), 'DevPass UI must consume shared PAYG truth helper');
assert.ok(dashboard.includes("paygTruth.paygState === 'on' ? 'PAYG ON' : paygTruth.paygState === 'off' ? 'PAYG OFF' : 'PAYG —'"), 'PAYG UNKNOWN header must render dash, never OFF');
for (const label of ['PAYG overflow</span>', 'Regular Credits</span>', 'Overflow balance</span>', 'Auto-Reload</span>', 'Reload threshold</span>', 'Reload amount</span>']) {
  assert.ok(dashboard.includes(label), `5.92 PAYG card field missing: ${label}`);
}
assert.equal((dashboard.match(/premium-allowance-card/g) || []).length, 1, '5.91 Premium allowance card must remain exactly one owner');
assert.ok(dashboard.includes('premiumAllowanceTruth(d.weekly)'), '5.91 Premium helper integration must remain unchanged');
assert.ok(!dashboard.includes("devpassAccount.paygEnabled ? 'PAYG ON' : 'PAYG OFF'"), 'UI must not collapse PAYG UNKNOWN to OFF');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
assert.ok(diagnostics.includes('paygAccountDiagnosticText(diagAccount)'), 'Diagnostics must consume the same PAYG truth helper');
assert.ok(diagnostics.includes('premiumAllowanceDiagnosticText(d.weekly)'), '5.91 Premium diagnostics must remain present');
assert.ok(!diagnostics.includes("diagAccount?.paygEnabled ? 'on' : 'off'"), 'Diagnostics must not collapse PAYG UNKNOWN to off');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_payg_autoreload_fidelity_592.py', 'utf8');
for (const marker of [
  'BASE_ENGINE_SHA',
  "build_bridge_engine.cjs'), '--write'",
  "build_bridge_engine.cjs'), '--check'",
  'patch_manager(engine_sha)',
  'BASE_BOOTSTRAP_SHA',
  'devPlanPaygEnabled: explicitBillingBoolean',
]) assert.ok(materializer.includes(marker), `5.92 materializer invariant missing: ${marker}`);

for (const publicText of [helperSource, dashboard, diagnostics]) {
  for (const forbidden of ['Stripe customer', 'card number', 'payment method', 'this request used PAYG', 'charged from credits']) {
    assert.equal(publicText.toLowerCase().includes(forbidden.toLowerCase()), false, `5.92 public surface must not expose/infer ${forbidden}`);
  }
}

console.log(`P58 PAYG + Auto-Reload Read-Only Fidelity: OK · Product 5.92 · Engine 1.6.29 ${engineSha.slice(0,12)} · Manager semantic 1.3.4 · tri-state truth + source-only read parity · no new I/O`);
