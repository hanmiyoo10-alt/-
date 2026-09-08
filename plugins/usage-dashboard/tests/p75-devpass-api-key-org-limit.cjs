'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
const DESIGN = 'docs/USAGE_DASHBOARD_5108_API_KEY_ORG_LIMIT_DESIGN.md';
const AMENDMENT = 'docs/USAGE_DASHBOARD_5108_AUTH_SEAM_AMENDMENT.md';
const SPEC = '.github/usage-dashboard/releases/5.108.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_devpass_api_key_org_limit_5108.py';
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
  assert.ok(a >= 0 && b > a, `P75 slice missing: ${start} .. ${end}`);
  return text.slice(a, b);
}

assert.equal(release.productVersion, '3.0.0-alpha.5.109');
assert.equal(release.specPath, '.github/usage-dashboard/releases/5.109.json');
const spec = JSON.parse(read(SPEC));
assert.equal(spec.engineVersion, '1.6.42');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p75-devpass-api-key-org-limit.cjs');
assert.equal(spec.authority?.featureIssue, 1899);
assert.equal(spec.authority?.designPullRequest, 1902);
assert.equal(release.evidenceView?.acceptedBaseline?.productVersion, '3.0.0-alpha.5.107');
assert.equal(release.evidenceView?.acceptedBaseline?.releaseSha, 'b5ff566fdf164580b0edfa6e2db1d07cc88992bf');
assert.equal(release.evidenceView?.acceptedBaseline?.issue, 1892);
assert.equal(release.evidenceView?.acceptedBaseline?.commentId, 5581888722);
assert.equal(release.evidenceView?.acceptedBaseline?.verdict, 'accepted');

const design = read(DESIGN);
const amendment = read(AMENDMENT);
for (const marker of [
  'DESIGN FROZEN',
  'GET /keys/api?projectId=<project>&filter=mine',
  'planLimits.currentCount',
  'planLimits.maxKeys',
  'API Keys · 조직 한도',
  'project-unavailable',
  'invalid-plan-limits',
]) assert.ok(design.includes(marker), `P75 frozen design marker missing: ${marker}`);
for (const marker of [
  'orgs list --json',
  'no new CLI command family',
  'only `GET /keys/api?projectId=<exact>&filter=mine`',
  'only `planLimits.currentCount` and `planLimits.maxKeys` may cross the capture boundary',
]) assert.ok(amendment.includes(marker), `P75 auth-seam amendment marker missing: ${marker}`);

const materializer = read(MATERIALIZER);
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.107'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.108'",
  "BASE_ENGINE = '1.6.41'",
  "TARGET_ENGINE = '1.6.42'",
  "BASE_RELEASE_SHA = 'b5ff566fdf164580b0edfa6e2db1d07cc88992bf'",
  "BASE_ENGINE_SHA = '69860f90a52aca0996bf53024208de68a4fbc8cde655361cd2da6fedb76c5e3f'",
  "BASE_MANAGER_SHA = '5d8c6d715babb8cac31055e57fc1f198b34329b7d7fe9442006b860ef9605b63'",
]) assert.ok(materializer.includes(marker), `P75 materializer baseline marker missing: ${marker}`);
assert.ok(!materializer.includes("release_generation: E26"));

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

assert.ok(capture.includes("const requestedApiKeyProjectId = String(process.env.DEVPASS_BRIDGE_API_KEY_PROJECT_ID || '').trim();"));
assert.ok(capture.includes('apiKeyPlanLimits: null'));
assert.ok(capture.includes('const sanitizeApiKeyPlanLimits = (value) => {'));
assert.ok(capture.includes("target.pathname = (prefix + '/keys/api').replace"));
assert.ok(capture.includes("target.searchParams.set('projectId', exactProjectId);"));
assert.ok(capture.includes("target.searchParams.set('filter', 'mine');"));
assert.ok(capture.includes("storeApiKeyPlanLimits(result, 'fetch-api-key-plan-limits')"));
assert.ok(capture.includes("storeApiKeyPlanLimits(result, 'node-request-api-key-plan-limits')"));

const sanitizerText = sliceBetween(capture, '  const sanitizeApiKeyPlanLimits = (value) => {', '\n\n  const sanitizeGatewayLimits = (value) => {');
const sanitizerFactory = new Function(`${sanitizerText}\nreturn sanitizeApiKeyPlanLimits;`);
const sanitizeApiKeyPlanLimits = sanitizerFactory();
assert.deepEqual(sanitizeApiKeyPlanLimits({planLimits:{currentCount:2,maxKeys:5,plan:'secret-ish'},apiKeys:[{id:'k1',maskedKey:'sk-***',creator:{email:'x@example.com'}}]}), {state:'ok',currentCount:2,maxKeys:5});
assert.deepEqual(sanitizeApiKeyPlanLimits({planLimits:{currentCount:0,maxKeys:0}}), {state:'ok',currentCount:0,maxKeys:0});
assert.deepEqual(sanitizeApiKeyPlanLimits({apiKeys:[{id:'k1'}]}), {state:'plan-limits-unavailable',currentCount:null,maxKeys:null});
assert.deepEqual(sanitizeApiKeyPlanLimits({planLimits:{currentCount:1.5,maxKeys:5}}), {state:'invalid-plan-limits',currentCount:null,maxKeys:null});
assert.deepEqual(Object.keys(sanitizeApiKeyPlanLimits({planLimits:{currentCount:2,maxKeys:5},apiKeys:[{id:'k1'}]})).sort(), ['currentCount','maxKeys','state']);
for (const forbidden of ['maskedKey','creator','description','iamRules','budget','expiresAt']) {
  assert.ok(!sanitizerText.includes(`safe.${forbidden}`), `P75 capture must not retain ${forbidden}`);
}

for (const marker of [
  'function apiKeyPlanLimitsUnknown(state = \'source-unavailable\'',
  'function normalizeApiKeyPlanLimitsCapture(capture, now = Date.now())',
  'async function captureApiKeyPlanLimitsViaCliSession(projectId)',
  "DEVPASS_BRIDGE_API_KEY_PROJECT_ID: exactProjectId",
  "status = await loadDevPassStatus();",
  "const exactProjectId = String(status?.projectId || '').trim();",
  "cached(`apiKeyPlanLimits:${exactProjectId}`",
  "name.startsWith('apiKeyPlanLimits:') ? 300_000",
]) assert.ok(sources.includes(marker), `P75 Engine source marker missing: ${marker}`);
assert.ok(!sources.includes("apiKeyPlanLimits:${creditsOrgId}"));

const normText = sliceBetween(sources, "function apiKeyPlanLimitsUnknown(state = 'source-unavailable'", '\n\nasync function captureApiKeyPlanLimitsViaCliSession');
const normFactory = new Function(`${normText}\nreturn normalizeApiKeyPlanLimitsCapture;`);
const normalizeApiKeyPlanLimitsCapture = normFactory();
assert.deepEqual(normalizeApiKeyPlanLimitsCapture({state:'ok',currentCount:2,maxKeys:5}, 1000), {state:'ok',source:'keys-api-plan-limits',currentCount:2,maxKeys:5,headroom:3,fetchedAt:1000});
assert.deepEqual(normalizeApiKeyPlanLimitsCapture({state:'ok',currentCount:0,maxKeys:0}, 1000), {state:'ok',source:'keys-api-plan-limits',currentCount:0,maxKeys:0,headroom:0,fetchedAt:1000});
assert.deepEqual(normalizeApiKeyPlanLimitsCapture({state:'ok',currentCount:7,maxKeys:5}, 1000), {state:'ok',source:'keys-api-plan-limits',currentCount:7,maxKeys:5,headroom:0,fetchedAt:1000});
for (const bad of [
  {state:'ok',currentCount:1,maxKeys:null},
  {state:'ok',currentCount:-1,maxKeys:5},
  {state:'ok',currentCount:1.2,maxKeys:5},
  {state:'ok',currentCount:1,maxKeys:Infinity},
]) assert.equal(normalizeApiKeyPlanLimitsCapture(bad,1000).state, 'invalid-plan-limits');
assert.equal(normalizeApiKeyPlanLimitsCapture({state:'permission-unavailable'},1000).state, 'permission-unavailable');
assert.equal(normalizeApiKeyPlanLimitsCapture({state:'plan-limits-unavailable'},1000).state, 'plan-limits-unavailable');

assert.ok(http.includes("url.pathname === '/api-key-plan-limits'"));
assert.ok(http.includes('await loadApiKeyPlanLimits()'));
const apiRoute = sliceBetween(http, "if (url.pathname === '/api-key-plan-limits')", "if (url.pathname === '/gateway-limits')");
assert.ok(!apiRoute.includes('projectId'));
assert.ok(!apiRoute.includes('creditsOrgId'));

assert.ok(core.includes('//@version 3.0.0-alpha.5.109'));
assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.109';"));
assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.43';"));
assert.ok(core.includes('const API_KEY_PLAN_LIMITS_UI_TTL_MS = 5 * 60_000;'));
assert.ok(core.includes('apiKeyPlanLimitsRuntime = {value:null,fetchedAt:0}'));

for (const marker of [
  'function normalizeApiKeyPlanLimitsLocal(raw)',
  "`${base}/api-key-plan-limits`",
  'async function refreshApiKeyPlanLimits(force = false)',
  'API_KEY_PLAN_LIMITS_UI_TTL_MS',
]) assert.ok(bridgeIo.includes(marker), `P75 Product bridge marker missing: ${marker}`);
const productFetch = sliceBetween(bridgeIo, 'async function fetchApiKeyPlanLimits()', '\n\n  async function refreshApiKeyPlanLimits');
assert.ok(!productFetch.includes('projectId'));
assert.ok(!productFetch.includes('organizationId'));

assert.ok(dash.includes('function apiKeyOrgLimitSectionHtml(truth)'));
assert.ok(dash.includes('API Keys · 조직 한도'));
assert.ok(dash.includes('활성 API 키 · 조직 전체'));
assert.ok(dash.includes('생성 여유'));
const devpassAccountPlacement = "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}";
const apiKeyOrgLimitPlacement = "${dashboardView === 'devpass' ? apiKeyOrgLimitSectionHtml(apiKeyOrgLimitTruth) : ''}";
assert.ok(markup.includes(devpassAccountPlacement), 'P75 must preserve existing DevPass account placement');
assert.ok(markup.includes(`${devpassAccountPlacement}${apiKeyOrgLimitPlacement}`), 'P75 API-key org limit must render immediately after existing DevPass account placement');
assert.ok(settings.includes("if (next === 'devpass') void refreshApiKeyPlanLimits();"));
assert.ok(!refresh.includes('refreshApiKeyPlanLimits'), 'P75 API-key source must stay off recurring snapshot refresh runtime');
assert.ok(!refresh.includes('api-key-plan-limits'), 'P75 local API-key source must stay off recurring snapshot path');

assert.ok(diag.includes('function apiKeyOrgLimitDiagnosticText(value)'));
assert.ok(diag.includes('API key org limit:'));
const diagFn = sliceBetween(diag, '  function apiKeyOrgLimitDiagnosticText(value) {', '\n\n  function gatewayLimitsDiagnosticText(value) {');
for (const forbidden of ['projectId','organizationId','maskedKey','creator','apiKeys','plan ']) {
  assert.ok(!diagFn.includes(forbidden), `P75 bounded diagnostics leaked ${forbidden}`);
}

for (const prior of [
  'gatewayNextTierUnlockLimitsHtml',
  'Gateway next-tier limits:',
  'gatewayEndpointRpmLimitsHtml',
  'Gateway endpoint RPM:',
  'gatewayNextTierProgressionHtml',
]) assert.ok(dash.includes(prior) || diag.includes(prior), `P75 prior Credits release marker missing: ${prior}`);
assert.equal(read(LEDGER).includes('api-key-plan-limits'), false, 'P75 must not add Request Ledger ownership');
assert.equal(read(PROV).includes('api-key-plan-limits'), false, 'P75 must not add request-provenance ownership');

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
assert.ok(latest.includes('API Keys · 조직 한도'));
assert.ok(latest.includes('API key org limit:'));

console.log(`usage-dashboard P75 API-key organization-limit contract: OK · ${release.productVersion} · exact org-wide current/max + bounded headroom + lazy child-capture authority`);
