'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const engineCore = fs.readFileSync(`${root}/runtime-src/bridge-engine/00-core.part.mjs`, 'utf8');
const engineSources = fs.readFileSync(`${root}/runtime-src/bridge-engine/40-sources.part.mjs`, 'utf8');
const analytics = fs.readFileSync(`${src}/16-usage-analytics.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${src}/40-diagnostics.part.js`, 'utf8');
const dashboard = fs.readFileSync(`${src}/50-dashboard-context.part.js`, 'utf8');
const analyticsContext = fs.readFileSync(`${src}/52-analytics-context.part.js`, 'utf8');
const markup = fs.readFileSync(`${src}/54-dashboard-markup.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.82') {
  console.log(`P47 Billing Cycle Truth Strip: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.82`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.23');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
assert.ok(engineCore.includes("const VERSION = '1.6.23';"), 'P47 Engine source must be 1.6.23');
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.0';"), 'P47 Manager version must remain 1.3.0');
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.82';"), 'P47 Manager product identity must track 5.82');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`)).digest('hex');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P47 generated Engine hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P47 bootstrap must remain byte-identical');

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `P47 missing start marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.ok(end > start, `P47 missing end marker: ${endMarker}`);
  return text.slice(start, end);
}

const independent = sliceBetween(engineSources, 'function normalizeIndependentDevPassStatus(payload) {', '\n\nasync function loadDevPassStatus()');
const fallback = sliceBetween(engineSources, 'async function loadDevPassStatus() {', '\n\nfunction deepFindNumber');
const organizations = sliceBetween(engineSources, 'function normalizeOrganizations(rawOrgs, rawCredits) {', '\n\nfunction mergeOrganizations');
const enrichment = sliceBetween(engineSources, 'function enrichDevPassFromStatus(rows, payload) {', '\n\nfunction normalizeIndependentDevPassStatus');

assert.ok(engineSources.includes('function explicitBillingCycle(value) {'), 'P47 explicit cycle helper missing');
assert.ok(engineSources.includes('function explicitBillingBoolean(value) {'), 'P47 explicit boolean helper missing');
assert.ok(independent.includes("const cycle = explicitBillingCycle(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], null));"), 'P47 independent cycle must be explicit-or-null');
assert.equal(independent.includes("'monthly'"), false, 'P47 independent status must not infer monthly cycle');
assert.ok(independent.includes("cancelled: explicitBillingBoolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], null))"), 'P47 independent cancellation must be explicit boolean-or-null');
assert.equal(independent.includes('cancelled: Boolean('), false, 'P47 independent status must not Boolean-coerce cancellation');
assert.ok(organizations.includes("devPlanCycle: explicitBillingCycle(pick(row, ['devPlanCycle', 'dev_plan_cycle'], null))"), 'P47 org normalization must keep cycle nullable');
assert.ok(organizations.includes("devPlanCancelled: explicitBillingBoolean(pick(row, ['devPlanCancelled', 'dev_plan_cancelled'], null))"), 'P47 org normalization must keep cancellation nullable');
assert.ok(enrichment.includes('devPlanCycle: explicitBillingCycle('), 'P47 enriched org cycle fidelity missing');
assert.ok(enrichment.includes('devPlanCancelled: explicitBillingBoolean('), 'P47 enriched org cancellation fidelity missing');
assert.ok(fallback.includes('cycle: explicitBillingCycle(devOrg.devPlanCycle)'), 'P47 compatibility fallback cycle fidelity missing');
assert.ok(fallback.includes('cancelled: explicitBillingBoolean(devOrg.devPlanCancelled)'), 'P47 compatibility fallback cancellation fidelity missing');

const pickFn = sliceBetween(engineSources, 'function pick(obj, keys, fallback = null) {', '\n\nfunction finite(value)');
const finiteFn = sliceBetween(engineSources, 'function finite(value) {', '\n\nfunction explicitBillingCycle(value)');
const billingHelpers = sliceBetween(engineSources, 'function explicitBillingCycle(value) {', '\nfunction normalizeOrganizations(rawOrgs, rawCredits)');
const normalizerFactory = new Function(`${pickFn}\n${finiteFn}\n${billingHelpers}\n${independent}\nreturn normalizeIndependentDevPassStatus;`);
const normalizeStatus = normalizerFactory();

const explicitTrue = normalizeStatus({devPlan:'pro', devPlanCycle:'Monthly', devPlanCancelled:true});
assert.equal(explicitTrue.cycle, 'monthly');
assert.equal(explicitTrue.cancelled, true);
const explicitFalse = normalizeStatus({devPlan:'pro', devPlanCycle:'annual', devPlanCancelled:false});
assert.equal(explicitFalse.cycle, 'annual');
assert.equal(explicitFalse.cancelled, false);
const missing = normalizeStatus({devPlan:'pro'});
assert.equal(missing.cycle, null, 'P47 missing cycle must remain UNKNOWN/null');
assert.equal(missing.cancelled, null, 'P47 missing cancellation must remain UNKNOWN/null');
const invalid = normalizeStatus({devPlan:'pro', devPlanCycle:'   ', devPlanCancelled:'false'});
assert.equal(invalid.cycle, null, 'P47 empty cycle must remain UNKNOWN/null');
assert.equal(invalid.cancelled, null, 'P47 string cancellation must not be coerced');

assert.ok(analytics.includes("cycle:typeof ds.cycle === 'string' ? ds.cycle.trim() : ''"), 'P47 plugin cycle adapter must preserve explicit string only');
assert.ok(analytics.includes("cancelled:typeof ds.cancelled === 'boolean' ? ds.cancelled : null"), 'P47 plugin cancellation adapter must preserve tri-state');
assert.equal(analytics.includes('cancelled:ds.cancelled === true'), false, 'P47 plugin must not collapse missing cancellation to false');

const combinedUi = dashboard + analyticsContext + markup;
for (const marker of [
  'billing-cycle-truth-strip',
  '<h3>Billing Cycle</h3>',
  '<span>Plan</span>',
  '<span>Cycle</span>',
  '<span>기간 시작</span>',
  '<span>기간 종료</span>',
  '<span>남은 기간</span>',
  '<span>취소 상태</span>',
  "devpassAccount?.cancelled === true ? '취소 예정' : '—'",
  'billingEndTimestamp > Date.now()',
  'dashboardDateText(devpassAccount?.billingCycleStart, true)',
  'dashboardDateText(devpassAccount?.expiresAt, true)',
  "dashboardView === 'devpass' ? devpassAccountDetailHtml : ''",
]) assert.ok(combinedUi.includes(marker), `P47 billing truth UI marker missing: ${marker}`);
for (const forbidden of ['자동 갱신', '다음 결제일', '<span>월간 갱신</span>']) {
  assert.equal(combinedUi.includes(forbidden), false, `P47 forbidden inferred billing wording remains: ${forbidden}`);
}
for (const retained of ['DevPass account','Reset Pass · PAYG','PAYG overflow','Regular Credits']) {
  assert.ok(combinedUi.includes(retained), `P47 existing DevPass parity surface must remain: ${retained}`);
}

const billingValues = sliceBetween(dashboard, 'const billingPlanText', '    const devpassIncludedPassText');
const billingBox = sliceBetween(dashboard, 'billing-cycle-truth-strip', '</div></div>\n        </div>`');
for (const forbidden of [
  'nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(',
  'scheduleRefresh(', 'schedulePanelRender(', 'store.setItem(', 'organizationId', 'projectId', 'apiKey', 'payment'
]) {
  assert.equal((billingValues + billingBox).includes(forbidden), false, `P47 Billing Cycle UI must add zero I/O/persistence/identifier surface: ${forbidden}`);
}

assert.ok(diagnostics.includes('DevPass billing period:'), 'P47 bounded billing diagnostics missing');
assert.ok(diagnostics.includes("cancelled ${typeof diagAccount?.cancelled === 'boolean' ? (diagAccount.cancelled ? 'yes' : 'no') : 'unknown'}"), 'P47 diagnostics must preserve cancellation unknown');
const billingDiag = diagnostics.split('\n').find(line => line.includes('DevPass billing period:')) || '';
for (const forbidden of ['organizationId','projectId','apiKey','payment','token','cookie','header']) {
  assert.equal(billingDiag.includes(forbidden), false, `P47 billing diagnostics must not expose ${forbidden}`);
}

assert.ok(latest.includes('billing-cycle-truth-strip'), 'P47 generated plugin must contain Billing Cycle Truth Strip');
assert.ok(engine.includes("const VERSION = '1.6.23';"), 'P47 generated Engine must be 1.6.23');

for (const name of ['p5-devpass-account-parity.cjs', 'p5-service-tier-fidelity.cjs', 'behavior-state-contract.cjs']) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P47 requires ${name} GREEN`);
}

const suite = discoverTests();
assert.ok(suite.regressions.includes('p46-lifecycle-stress-ownership.cjs'), 'P47 registry must retain P46');
assert.ok(suite.regressions.includes('p47-billing-cycle-truth-strip.cjs'), 'P47 registry must include P47');

console.log('P47 Billing Cycle Truth Strip: OK · Engine nullable cycle/cancelled fidelity · explicit true/false/UNKNOWN fixtures · source-truth UI/diagnostics · zero new I/O · existing DevPass parity retained');
