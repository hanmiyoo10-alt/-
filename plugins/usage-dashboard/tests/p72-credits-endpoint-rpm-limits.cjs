'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.106';
const BASE = '3.0.0-alpha.5.105';
const BASE_RELEASE_SHA = '0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c';
const BASE_ENGINE_SHA = 'f9be84372a776dd743496ef811abea5a0a5582135efb5da9b1fcce58c4b001ae';
const SPEC = '.github/usage-dashboard/releases/5.106.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_credits_endpoint_rpm_5106.py';
const CAPTURE = 'plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs';
const SOURCES = 'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs';
const HTTP = 'plugins/usage-dashboard/runtime-src/bridge-engine/70-http-diagnostics.part.mjs';
const ENGINE = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';
const MANIFEST = 'plugins/usage-dashboard/runtime/product-manifest.json';
const LATEST = 'plugins/usage-dashboard/latest.js';
const BRIDGE_IO = 'plugins/usage-dashboard/src/20-bridge-io.part.js';
const DASH = 'plugins/usage-dashboard/src/50-dashboard-context.part.js';
const DIAG = 'plugins/usage-dashboard/src/40-diagnostics.part.js';

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'Credits Endpoint RPM Limits');
assert.equal(spec.engineVersion, '1.6.40');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p72-credits-endpoint-rpm-limits.cjs');
assert.equal(spec.authority?.featureIssue, 1874);
assert.equal(spec.authority?.designPullRequest, 1875);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5106_CREDITS_ENDPOINT_RPM_DESIGN.md', 'utf8');
for (const marker of [
  'DESIGN FROZEN',
  'endpoints[].key',
  'endpoints[].rpm',
  'Explicit `rpm === 0` is known `Unlimited`',
  'Duplicate keys',
  'Preserve source row order',
  'Unknown future keys',
  '**not** live per-minute usage',
  'No new timer, poller, persistence, credential',
]) assert.ok(design.includes(marker), `P72 design marker missing: ${marker}`);

const materializer = fs.readFileSync(MATERIALIZER, 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.105'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.106'",
  "BASE_ENGINE = '1.6.39'",
  "TARGET_ENGINE = '1.6.40'",
  `BASE_ENGINE_SHA = '${BASE_ENGINE_SHA}'`,
  "const REQUIRED_BRIDGE_VERSION = '1.6.40';",
  'safe.endpoints = valid ? rows : null',
  "state:'invalid-endpoints'",
  'function gatewayEndpointRpmLimitsHtml(endpointRates)',
  'function gatewayEndpointRpmDiagnosticText(value)',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P72 materializer marker missing: ${marker}`);
for (const forbidden of [
  BASE_RELEASE_SHA,
  '5578155765',
  'rep(LEDGER,',
  'rep(PROV,',
  'setInterval(',
  'setTimeout(',
  "url.pathname === '/gateway-endpoint-rpm'",
]) assert.equal(materializer.includes(forbidden), false, `P72 materializer forbidden authority/owner: ${forbidden}`);

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P72 Credits endpoint RPM limits: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.40');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1869);
  assert.equal(row?.commentId, 5578155765);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.40');
assert.equal(manifest.components?.bridge?.sha256, sha256(ENGINE));
assert.notEqual(sha256(ENGINE), BASE_ENGINE_SHA, 'P72 Engine bytes must change for bounded endpoint RPM truth');
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
const latest = fs.readFileSync(LATEST, 'utf8');
assert.ok(latest.includes("const REQUIRED_BRIDGE_VERSION = '1.6.40';"));

const capture = fs.readFileSync(CAPTURE, 'utf8');
const sanitizerStart = capture.indexOf('  const sanitizeGatewayLimits = (value) => {');
const sanitizerEnd = capture.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P72 Gateway Limits sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
for (const marker of ['endpoints','key','rpm','safe.endpoints = null','safe.endpoints = valid ? rows : null','seen.has(key)','rows.push({key,rpm})']) {
  assert.ok(sanitizer.includes(marker), `P72 endpoint sanitizer marker missing: ${marker}`);
}
for (const forbidden of ['row.path','endpoint.path','accountAgeDays','lifetimeSpendUsd','requestCount','429']) {
  assert.equal(sanitizer.includes(forbidden), false, `P72 endpoint sanitizer minimization violation: ${forbidden}`);
}

const sources = fs.readFileSync(SOURCES, 'utf8');
const helperStart = sources.indexOf('function gatewayLimitsNumber(value) {');
const helperEnd = sources.indexOf('async function captureGatewayLimitsViaCliSession', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P72 Gateway Limits helper boundary missing');
const helperSource = sources.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.normalize=normalizeGatewayLimitsCapture;`, sandbox);
const normalize = (captureValue, now=123456) => JSON.parse(JSON.stringify(sandbox.normalize(captureValue, now)));
const regularPayload = (endpoints, extra = {}) => {
  const payload = {
    enterprise:false,
    planClass:'regular',
    rateLimitsApply:true,
    tierOverridden:false,
    capsApply:true,
    tier:{tier:3,rpmMultiplier:3,dailyCapUsd:100,monthlyCapUsd:1000},
    usage:{dailySpentUsd:2,monthlySpentUsd:20},
    topUp:{capUsd:100,windowHours:24,usedUsd:25,remainingUsd:75},
    nextTier:{tier:4,daysUntilQualify:24,spendUsdUntilQualify:4987.2,daysUntilSpendPathUnlocks:0},
    ...extra,
  };
  if (endpoints !== undefined) payload.endpoints = endpoints;
  return payload;
};

const rows = [
  {key:'chat.completions',rpm:5000},
  {key:'models',rpm:0},
  {key:'future.endpoint',rpm:7},
];
const value = normalize({state:'ok',payload:regularPayload(rows)});
assert.equal(value.endpointRates.state, 'value');
assert.deepEqual(value.endpointRates.rows, rows);
assert.equal(value.endpointRates.rows[1].rpm, 0);
assert.equal(value.nextTier.state, 'value');
assert.equal(value.daily.state, 'value');
assert.equal(value.monthly.state, 'value');
assert.equal(value.topUp.state, 'value');

const noRate = normalize({state:'ok',payload:regularPayload(undefined,{rateLimitsApply:false})});
assert.deepEqual(noRate.endpointRates, {state:'not-applicable',rows:[]});
const enterprise = normalize({state:'ok',payload:{enterprise:true,planClass:'enterprise',rateLimitsApply:false,capsApply:false,topUp:null,nextTier:null,endpoints:null}});
assert.deepEqual(enterprise.endpointRates, {state:'not-applicable',rows:[]});
const missing = normalize({state:'ok',payload:regularPayload(undefined)});
assert.equal(missing.endpointRates.state, 'source-unavailable');
for (const bad of [
  null,
  [{key:'ok',rpm:-1}],
  [{key:'ok',rpm:Infinity}],
  [{key:'',rpm:1}],
  [{key:'dup',rpm:1},{key:'dup',rpm:2}],
  [{key:'x'.repeat(97),rpm:1}],
]) {
  const result = normalize({state:'ok',payload:regularPayload(bad)});
  assert.equal(result.endpointRates.state, 'invalid-endpoints');
  assert.deepEqual(result.endpointRates.rows, []);
}
assert.equal(normalize({state:'permission-unavailable'}).endpointRates.state, 'permission-unavailable');
assert.equal(normalize({state:'source-unavailable'}).endpointRates.state, 'source-unavailable');

for (const marker of [
  "cached(`gatewayLimits:${exactOrgId}`",
  "name.startsWith('gatewayLimits:') ? 300_000",
  'DEVPASS_BRIDGE_LIMITS_ORG_ID: exactOrgId',
]) assert.ok(sources.includes(marker), `P72 selected-org/cache marker missing: ${marker}`);
for (const forbidden of ['requestHistory','requestsPerMinuteUsed','rpmRemaining','rateHeadroom']) {
  assert.equal(helperSource.includes(forbidden), false, `P72 must not infer live RPM usage: ${forbidden}`);
}

const http = fs.readFileSync(HTTP, 'utf8');
assert.ok(http.includes("url.pathname === '/gateway-limits'"));
assert.ok(http.includes('loadGatewayLimits(creditsOrgId)'));
assert.equal(http.includes('/gateway-endpoint-rpm'), false, 'P72 must reuse the existing local limits route');

const bridgeIo = fs.readFileSync(BRIDGE_IO, 'utf8');
for (const marker of [
  'function normalizeGatewayLimitsLocal(raw)',
  "['value','not-applicable','source-unavailable','permission-unavailable','invalid-endpoints']",
  'endpointRates',
  'rows.push({key,rpm})',
  '/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}',
]) assert.ok(bridgeIo.includes(marker), `P72 Product transport marker missing: ${marker}`);
assert.equal(bridgeIo.includes('/gateway-endpoint-rpm'), false);

const bridgeStart = bridgeIo.indexOf('  function normalizeGatewayLimitsLocal(raw) {');
const bridgeEnd = bridgeIo.indexOf('  async function fetchGatewayLimitsForOrg', bridgeStart);
assert.ok(bridgeStart >= 0 && bridgeEnd > bridgeStart);
const bridgeSandbox = {num:(value)=>typeof value === 'number' && Number.isFinite(value)};
vm.createContext(bridgeSandbox);
vm.runInContext(`${bridgeIo.slice(bridgeStart, bridgeEnd)}\nthis.normalizeLocal=normalizeGatewayLimitsLocal;`, bridgeSandbox);
const local = (raw) => JSON.parse(JSON.stringify(bridgeSandbox.normalizeLocal(raw)));
assert.deepEqual(local({state:'ok',endpointRates:{state:'value',rows}}).endpointRates.rows, rows);
assert.equal(local({state:'ok',endpointRates:{state:'value',rows:[{key:'dup',rpm:1},{key:'dup',rpm:2}]}}).endpointRates.state, 'invalid-endpoints');

const dashboard = fs.readFileSync(DASH, 'utf8');
const uiStart = dashboard.indexOf('  function gatewayEndpointRpmLimitsHtml(endpointRates) {');
const uiEnd = dashboard.indexOf('  function gatewayLimitsSectionHtml(truth)', uiStart);
assert.ok(uiStart >= 0 && uiEnd > uiStart, 'P72 endpoint RPM UI helper boundary missing');
const uiSandbox = {esc:(value)=>String(value)};
vm.createContext(uiSandbox);
vm.runInContext(`${dashboard.slice(uiStart, uiEnd)}\nthis.render=gatewayEndpointRpmLimitsHtml;`, uiSandbox);
const render = uiSandbox.render;
const html = render({state:'value',rows});
for (const marker of ['<details','Endpoint RPM · 조직 한도','chat.completions','5,000 /분','models','Unlimited','future.endpoint','실시간 사용량/남은 RPM 아님']) {
  assert.ok(html.includes(marker), `P72 endpoint RPM UI marker missing: ${marker}`);
}
assert.equal(/<details[^>]*\sopen(?:\s|>|=)/.test(html), false, 'P72 endpoint table must be collapsed by default');
assert.ok(render({state:'not-applicable',rows:[]}).includes('미적용'));
assert.ok(render({state:'source-unavailable',rows:[]}).includes('—'));
assert.ok(render({state:'invalid-endpoints',rows:[]}).includes('—'));
for (const prior of [
  'function gatewayNextTierProgressionHtml(nextTier)',
  '다음 Tier · 최고 Tier',
  'function gatewayLimitsUtilizationPercent(value, cap)',
  "gatewayLimitsUtilizationBarHtml(truth?.daily,'used','일간 spend 사용률 · UTC')",
  "gatewayLimitsUtilizationBarHtml(truth?.monthly,'used','월간 spend 사용률')",
  "gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')",
]) assert.ok(dashboard.includes(prior), `P72 must preserve prior Gateway Limits UI: ${prior}`);

const diagnostics = fs.readFileSync(DIAG, 'utf8');
const diagStart = diagnostics.indexOf('  function gatewayEndpointRpmDiagnosticText(value) {');
const diagEnd = diagnostics.indexOf('  function modelCategoryCatalogDiagnosticText', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart, 'P72 endpoint RPM diagnostics boundary missing');
const diagHelper = diagnostics.slice(diagStart, diagEnd);
for (const forbidden of ['orgId','organizationId','endpoint.path','rawPath']) assert.equal(diagHelper.includes(forbidden), false);
const diagSandbox = {};
vm.createContext(diagSandbox);
vm.runInContext(`${diagHelper}\nthis.diag=gatewayEndpointRpmDiagnosticText;`, diagSandbox);
assert.equal(
  diagSandbox.diag({state:'ok',endpointRates:{state:'value',rows}}),
  'Gateway endpoint RPM: scope credits · rows 3 · unlimited 1 · source org-limits · state ok'
);
assert.ok(diagSandbox.diag({state:'ok',endpointRates:{state:'not-applicable',rows:[]}}).includes('state not-applicable'));
assert.ok(diagSandbox.diag({state:'ok',endpointRates:{state:'invalid-endpoints',rows:[]}}).includes('state invalid-endpoints'));
assert.ok(diagSandbox.diag({state:'permission-unavailable'}).includes('state permission-unavailable'));
assert.ok(diagnostics.includes('gatewayNextTierDiagnosticText('), 'P72 must preserve 5.105 next-tier diagnostics');

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['Gateway endpoint RPM','/gateway-endpoint-rpm','endpointRates']) {
    assert.equal(text.includes(forbidden), false, `P72 Request Ledger/provenance identity must stay unchanged: ${path}:${forbidden}`);
  }
}

console.log('P72 Credits endpoint RPM limits: OK · selected-org source fidelity · zero=Unlimited · malformed/duplicate fail-closed · bounded collapsed UI · no live headroom inference · prior Gateway Limits preserved');
