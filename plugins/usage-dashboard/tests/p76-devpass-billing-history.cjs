'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const DESIGN = 'docs/USAGE_DASHBOARD_5109_DEVPASS_BILLING_HISTORY_DESIGN.md';
const ADDENDUM = 'docs/USAGE_DASHBOARD_5109_SOURCE_TRUTH_MATRIX_ADDENDUM.md';
const SPEC = '.github/usage-dashboard/releases/5.109.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_devpass_billing_history_5109.py';
const CAPTURE = 'plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs';
const SOURCES = 'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs';
const HTTP = 'plugins/usage-dashboard/runtime-src/bridge-engine/70-http-diagnostics.part.mjs';
const CORE = 'plugins/usage-dashboard/src/00-runtime-core.part.js';
const BRIDGE_IO = 'plugins/usage-dashboard/src/20-bridge-io.part.js';
const REFRESH = 'plugins/usage-dashboard/src/30-refresh-runtime.part.js';
const DIAG = 'plugins/usage-dashboard/src/40-diagnostics.part.js';
const DASH = 'plugins/usage-dashboard/src/50-dashboard-context.part.js';
const MARKUP = 'plugins/usage-dashboard/src/54-dashboard-markup.part.js';
const SETTINGS = 'plugins/usage-dashboard/src/60-settings-runtime.part.js';
const LEDGER = 'plugins/usage-dashboard/src/14-request-ledger.part.js';
const PROV = 'plugins/usage-dashboard/src/15-request-provenance.part.js';
const ENGINE = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';
const MANAGER = 'plugins/usage-dashboard/runtime/bridge-manager.cjs';
const MANIFEST = 'plugins/usage-dashboard/runtime/product-manifest.json';
const LATEST = 'plugins/usage-dashboard/latest.js';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function sliceBetween(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `P76 slice missing: ${start} .. ${end}`);
  return text.slice(a, b);
}

assert.equal(release.productVersion, '3.0.0-alpha.5.109');
assert.equal(release.specPath, SPEC);
const spec = JSON.parse(read(SPEC));
assert.equal(spec.engineVersion, '1.6.43');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p76-devpass-billing-history.cjs');
assert.equal(spec.authority?.featureIssue, 1916);
assert.equal(spec.authority?.designPullRequest, 1917);
assert.equal(release.evidenceView?.acceptedBaseline?.productVersion, '3.0.0-alpha.5.108');
assert.equal(release.evidenceView?.acceptedBaseline?.releaseSha, '05862999df0521c73b6890fbc561c01be3f9f36e');
assert.equal(release.evidenceView?.acceptedBaseline?.issue, 1905);
assert.equal(release.evidenceView?.acceptedBaseline?.commentId, 5585420039);
assert.equal(release.evidenceView?.acceptedBaseline?.verdict, 'accepted');

const design = read(DESIGN);
const addendum = read(ADDENDUM);
for (const marker of [
  'DESIGN FROZEN',
  'GET /dev-plans/invoices',
  'at most the first five server-ordered valid rows',
  'type\ndate\namount\ncurrency\nstatus',
  'amount === null',
  'invalid-history',
  'partial',
  'No new periodic timer, poller or background refresh',
]) assert.ok(design.includes(marker), `P76 frozen design marker missing: ${marker}`);
assert.ok(addendum.includes('V-DEVPASS-BILLING-HISTORY'));
const intakeState = JSON.parse(read('.github/usage-dashboard/upstream-idea-intake-state.json'));
assert.equal(intakeState.knownCandidateKeys.find(item => item.id === 'V-DEVPASS-BILLING-HISTORY')?.status, 'source-proven-design-5.109');

const materializer = read(MATERIALIZER);
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.108'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.109'",
  "BASE_ENGINE = '1.6.42'",
  "TARGET_ENGINE = '1.6.43'",
  "BASE_RELEASE_SHA = '05862999df0521c73b6890fbc561c01be3f9f36e'",
  "BASE_ENGINE_SHA = '232de12457f1550ec0d99dab480b98623d0a3f22b60cdac17cd84204e95f9f8e'",
  "BASE_MANAGER_SHA = '322187b95f182d87745b9fa3bcd24fc37fa9069b20fb3de8e189bfea201dcbcb'",
]) assert.ok(materializer.includes(marker), `P76 materializer baseline marker missing: ${marker}`);
assert.ok(!materializer.includes('release_generation: E27'));

const capture = read(CAPTURE);
const sources = read(SOURCES);
const http = read(HTTP);
const core = read(CORE);
const bridgeIo = read(BRIDGE_IO);
const refresh = read(REFRESH);
const diag = read(DIAG);
const dash = read(DASH);
const markup = read(MARKUP);
const settings = read(SETTINGS);
const engine = read(ENGINE);
const manager = read(MANAGER);
const latest = read(LATEST);
const manifest = JSON.parse(read(MANIFEST));

assert.ok(capture.includes("const requestedBillingHistory = String(process.env.DEVPASS_BRIDGE_BILLING_HISTORY || '') === '1';"));
assert.ok(capture.includes('devpassBillingHistory: null'));
assert.ok(capture.includes('const sanitizeDevPassBillingHistory = (value) => {'));
assert.ok(capture.includes("target.pathname = (prefix + '/dev-plans/invoices').replace"));
assert.ok(capture.includes("storeDevPassBillingHistory(result, 'fetch-devpass-billing-history')"));
assert.ok(capture.includes("storeDevPassBillingHistory(result, 'node-request-devpass-billing-history')"));

const sanitizerText = sliceBetween(capture, '  const sanitizeDevPassBillingHistory = (value) => {', '\n\n  const sanitizeApiKeyPlanLimits = (value) => {');
const sanitizerFactory = new Function(`${sanitizerText}\nreturn sanitizeDevPassBillingHistory;`);
const sanitize = sanitizerFactory();
const row = (n, overrides={}) => ({
  id:`invoice-${n}`,
  type:'credit_topup',
  date:`2026-09-0${Math.min(n,9)}T0${Math.min(n,9)}:00:00Z`,
  amount:n,
  creditAmount:999,
  currency:'USD',
  status:'completed',
  description:'must-not-cross',
  refundEligibility:{eligible:true},
  billingEmail:'secret@example.com',
  ...overrides,
});
const six = sanitize({invoices:[row(6),row(5),row(4),row(3),row(2),row(1)]});
assert.equal(six.state, 'ok');
assert.equal(six.receivedCount, 6);
assert.equal(six.validCount, 6);
assert.equal(six.rows.length, 5);
assert.deepEqual(six.rows.map(x=>x.amount), [6,5,4,3,2]);
for (const boundedRow of six.rows) assert.deepEqual(Object.keys(boundedRow).sort(), ['amount','currency','date','status','type']);
assert.deepEqual(sanitize({invoices:[]}), {state:'empty',rows:[],validCount:0,receivedCount:0});
const nullAmount = sanitize({invoices:[row(1,{amount:null})]});
assert.equal(nullAmount.state, 'ok');
assert.equal(nullAmount.rows[0].amount, null);
const zeroAmount = sanitize({invoices:[row(1,{amount:0})]});
assert.equal(zeroAmount.state, 'ok');
assert.equal(zeroAmount.rows[0].amount, 0);
const partial = sanitize({invoices:[row(2),row(1,{type:'future_unknown_billing_type'})]});
assert.equal(partial.state, 'partial');
assert.equal(partial.validCount, 1);
assert.equal(partial.receivedCount, 2);
assert.equal(partial.rows.length, 1);
for (const bad of [
  row(1,{type:'future_unknown_billing_type'}),
  row(1,{date:'not-a-date'}),
  row(1,{status:'refunded'}),
  row(1,{amount:'0'}),
]) {
  const result = sanitize({invoices:[bad]});
  assert.equal(result.state, 'invalid-history');
  assert.equal(result.validCount, 0);
  assert.equal(result.receivedCount, 1);
  assert.deepEqual(result.rows, []);
}
assert.equal(sanitize({invoices:null}).state, 'invalid-history');
for (const forbidden of ['row.id','row.description','row.creditAmount','row.refundEligibility','row.billingEmail','row.paymentMethod','row.taxId']) {
  assert.ok(!sanitizerText.includes(forbidden), `P76 capture sanitizer must not retain ${forbidden}`);
}

for (const marker of [
  "function devPassBillingHistoryUnknown(state = 'source-unavailable'",
  'function normalizeDevPassBillingHistoryCapture(capture, now = Date.now())',
  'async function captureDevPassBillingHistoryViaCliSession()',
  "runCliProcess(['orgs', 'list', '--json']",
  "DEVPASS_BRIDGE_BILLING_HISTORY: '1'",
  "cached('devpassBillingHistory'",
  "name === 'devpassBillingHistory' ? 300_000",
]) assert.ok(sources.includes(marker), `P76 Engine source marker missing: ${marker}`);
assert.ok(!sources.includes("runCliProcess(['billing'"), 'P76 must not introduce a billing CLI command family');

const normText = sliceBetween(sources, "function devPassBillingHistoryUnknown(state = 'source-unavailable'", '\n\nasync function captureDevPassBillingHistoryViaCliSession');
const normFactory = new Function(`${normText}\nreturn normalizeDevPassBillingHistoryCapture;`);
const normalize = normFactory();
assert.deepEqual(normalize({state:'empty',rows:[],validCount:0,receivedCount:0}, 1000), {state:'empty',source:'devpass-invoices',rows:[],validCount:0,receivedCount:0,newest:null,fetchedAt:1000});
const normalized = normalize({state:'ok',rows:[{type:'credit_refund',date:'2026-09-08T05:20:00Z',amount:10,currency:'USD',status:'completed'}],validCount:1,receivedCount:1},1000);
assert.equal(normalized.state,'ok');
assert.equal(normalized.rows[0].type,'credit_refund');
assert.equal(normalized.newest,'2026-09-08T05:20:00Z');
assert.equal(normalize({state:'permission-unavailable'},1000).state,'permission-unavailable');
assert.equal(normalize({state:'source-unavailable'},1000).state,'source-unavailable');
assert.equal(normalize({state:'ok',rows:[{type:'future_unknown_billing_type',date:'2026-09-08T05:20:00Z',amount:1,currency:'USD',status:'completed'}],validCount:1,receivedCount:1},1000).state,'invalid-history');

assert.ok(http.includes("url.pathname === '/devpass-billing-history'"));
assert.ok(http.includes('await loadDevPassBillingHistory()'));
const localRoute = sliceBetween(http, "if (url.pathname === '/devpass-billing-history')", "if (url.pathname === '/api-key-plan-limits')");
assert.ok(!localRoute.includes('projectId'));
assert.ok(!localRoute.includes('creditsOrgId'));

assert.ok(core.includes('//@version 3.0.0-alpha.5.109'));
assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.109';"));
assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.43';"));
assert.ok(core.includes('const DEVPASS_BILLING_HISTORY_UI_TTL_MS = 5 * 60_000;'));
assert.ok(core.includes('devpassBillingHistoryRuntime = {value:null,fetchedAt:0}'));

for (const marker of [
  'function normalizeDevPassBillingHistoryLocal(raw)',
  "`${base}/devpass-billing-history`",
  'async function refreshDevPassBillingHistory(force = false)',
  'DEVPASS_BILLING_HISTORY_UI_TTL_MS',
  'if (devpassBillingHistoryInFlight) return devpassBillingHistoryInFlight;',
]) assert.ok(bridgeIo.includes(marker), `P76 Product bridge marker missing: ${marker}`);
const productFetch = sliceBetween(bridgeIo, 'async function fetchDevPassBillingHistory()', '\n\n  async function refreshDevPassBillingHistory');
assert.ok(!productFetch.includes('projectId'));
assert.ok(!productFetch.includes('organizationId'));
assert.ok(!productFetch.includes("method:'POST'"));
assert.ok(!productFetch.includes("method:'PUT'"));
assert.ok(!productFetch.includes("method:'DELETE'"));

assert.ok(dash.includes('function devPassBillingHistorySectionHtml(truth)'));
assert.ok(dash.includes('결제 내역 · DevPass'));
assert.ok(dash.includes('결제 내역 · 최근 5건'));
assert.ok(dash.includes('결제 내역 · 없음'));
assert.ok(dash.includes("credit_refund:'환불'"));
assert.ok(dash.includes("credit_topup:'PAYG 충전'"));
assert.ok(dash.includes('return currency.toUpperCase() === \'USD\' ? `$${value}` : `${value} ${currency}`;'));
assert.ok(dash.includes('if (row?.amount === null'));
const billingUi = sliceBetween(dash, '  function devPassBillingHistorySectionHtml(truth) {', '\n\n  function apiKeyOrgLimitSectionHtml(truth) {');
assert.ok(billingUi.includes('<details class="usage-detail-box devpass-billing-history-card">'));
for (const forbidden of ['invoicePdf','billingEmail','paymentMethod','taxId','refundEligibility','description']) {
  assert.ok(!billingUi.includes(forbidden), `P76 billing UI leaked ${forbidden}`);
}
const accountPlacement = "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}";
const apiKeyPlacement = "${dashboardView === 'devpass' ? apiKeyOrgLimitSectionHtml(apiKeyOrgLimitTruth) : ''}";
const billingPlacement = "${dashboardView === 'devpass' ? devPassBillingHistorySectionHtml(devPassBillingHistoryTruth) : ''}";
assert.ok(markup.includes(`${accountPlacement}${apiKeyPlacement}`), 'P76 must preserve P75 DevPass account/API-key adjacency');
assert.ok(markup.includes(`${accountPlacement}${apiKeyPlacement}${billingPlacement}`), 'P76 billing history must render after the existing API-key block');
assert.ok(settings.includes("if (next === 'devpass') void refreshDevPassBillingHistory();"));
assert.ok(settings.includes("if (next === 'devpass') void refreshApiKeyPlanLimits();"));
assert.ok(!refresh.includes('refreshDevPassBillingHistory'), 'P76 billing source must stay off recurring snapshot refresh runtime');
assert.ok(!refresh.includes('devpass-billing-history'), 'P76 local billing route must stay off recurring snapshot path');

assert.ok(diag.includes('function devPassBillingHistoryDiagnosticText(value)'));
assert.ok(diag.includes('DevPass billing history:'));
const diagFn = sliceBetween(diag, '  function devPassBillingHistoryDiagnosticText(value) {', '\n\n  function apiKeyOrgLimitDiagnosticText(value) {');
for (const forbidden of ['invoiceId','transactionId','description','creditAmount','refundReason','billingEmail','paymentMethod','taxId']) {
  assert.ok(!diagFn.includes(forbidden), `P76 bounded diagnostics leaked ${forbidden}`);
}

assert.equal(read(LEDGER).includes('devpass-billing-history'), false, 'P76 must not add Request Ledger ownership');
assert.equal(read(PROV).includes('devpass-billing-history'), false, 'P76 must not add request-provenance ownership');
for (const prior of [
  'apiKeyOrgLimitSectionHtml',
  'API Keys · 조직 한도',
  'gatewayNextTierUnlockLimitsHtml',
  'gatewayEndpointRpmLimitsHtml',
  'gatewayNextTierProgressionHtml',
]) assert.ok(dash.includes(prior), `P76 prior release marker missing: ${prior}`);
assert.ok(diag.includes('API key org limit:'));
assert.ok(diag.includes('Gateway next-tier limits:'));
assert.ok(diag.includes('Gateway endpoint RPM:'));

assert.equal(manifest.productVersion, '3.0.0-alpha.5.109');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.109');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.43');
assert.equal(manifest.components.bridgeManager.version, '1.3.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.109');
assert.equal(manifest.components.bridgeManager.managedCliVersion, '1.10.0');
assert.equal(manifest.components.bridgeManager.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.ok(engine.includes("const VERSION = '1.6.43';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.109';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.43';"));
assert.ok(latest.includes('결제 내역 · DevPass'));
assert.ok(latest.includes('DevPass billing history:'));

console.log(`usage-dashboard P76 DevPass billing-history contract: OK · ${release.productVersion} · invoices-only · max5 sanitized rows · lazy bounded authority`);