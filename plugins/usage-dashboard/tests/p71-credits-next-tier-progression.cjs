'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.105';
const BASE = '3.0.0-alpha.5.104';
const BASE_RELEASE_SHA = 'e1d1455592449bcad943e3dec6e1eb205136bd92';
const BASE_ENGINE_SHA = '085273bd748b852de35cbcc7e00241f349ab0cb6ac38dd62c6c5354ad2f56fea';
const SPEC = '.github/usage-dashboard/releases/5.105.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_credits_next_tier_5105.py';
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
assert.equal(spec.releaseTitle, 'Credits Next-Tier Progression');
assert.equal(spec.engineVersion, '1.6.39');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p71-credits-next-tier-progression.cjs');
assert.equal(spec.authority?.featureIssue, 1864);
assert.equal(spec.authority?.designPullRequest, 1867);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5105_CREDITS_NEXT_TIER_DESIGN.md', 'utf8');
for (const marker of [
  'GET /orgs/{selectedCreditsOrgId}/limits',
  'nextTier',
  'daysUntilQualify',
  'spendUsdUntilQualify',
  'daysUntilSpendPathUnlocks',
  'accountAgeDays',
  'lifetimeSpendUsd',
  '고정 Tier · 자동 승급 미적용',
  '최고 Tier',
]) assert.ok(design.includes(marker), `P71 design marker missing: ${marker}`);

const materializer = fs.readFileSync(MATERIALIZER, 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.104'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.105'",
  "BASE_ENGINE = '1.6.38'",
  "TARGET_ENGINE = '1.6.39'",
  `BASE_RELEASE_SHA = '${BASE_RELEASE_SHA}'`,
  `BASE_ENGINE_SHA = '${BASE_ENGINE_SHA}'`,
  "const REQUIRED_BRIDGE_VERSION = '1.6.39';",
  "safe.nextTier = null",
  "safe.nextTier = nextTier",
  "'daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks'",
  "state:'max-tier'",
  "state:'tier-overridden'",
  'function gatewayNextTierProgressionHtml(nextTier)',
  'function gatewayNextTierDiagnosticText(value)',
  "if '/gateway-next-tier' in",
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P71 materializer marker missing: ${marker}`);
for (const forbidden of ['rep(LEDGER,', 'rep(PROV,', 'setInterval(', 'setTimeout(']) {
  assert.equal(materializer.includes(forbidden), false, `P71 materializer forbidden owner: ${forbidden}`);
}

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P71 Credits next-tier progression: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.39');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1861);
  assert.equal(row?.commentId, 5577292772);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.39');
assert.equal(manifest.components?.bridge?.sha256, sha256(ENGINE));
assert.notEqual(sha256(ENGINE), BASE_ENGINE_SHA, 'P71 Engine bytes must change for bounded nextTier truth');
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
const latest = fs.readFileSync(LATEST, 'utf8');
assert.ok(latest.includes("const REQUIRED_BRIDGE_VERSION = '1.6.39';"), 'P71 Product required bridge version must match Engine 1.6.39');

const capture = fs.readFileSync(CAPTURE, 'utf8');
const sanitizerStart = capture.indexOf('  const sanitizeGatewayLimits = (value) => {');
const sanitizerEnd = capture.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P71 Gateway Limits sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
for (const field of ['nextTier','tier','daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks']) {
  assert.ok(sanitizer.includes(field), `P71 bounded nextTier field missing: ${field}`);
}
for (const forbidden of [
  'accountAgeDays','lifetimeSpendUsd','ageDaysRequired','spendUsdRequired',
  'minAgeDaysRequired','topUpDailyCapUsd','endpoints'
]) assert.equal(sanitizer.includes(forbidden), false, `P71 minimization violation: ${forbidden}`);

const sources = fs.readFileSync(SOURCES, 'utf8');
const helperStart = sources.indexOf('function gatewayLimitsNumber(value) {');
const helperEnd = sources.indexOf('async function captureGatewayLimitsViaCliSession', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P71 Gateway Limits helper boundary missing');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${sources.slice(helperStart, helperEnd)}\nthis.normalize=normalizeGatewayLimitsCapture;`, sandbox);
const normalize = (captureValue, now=123456) => JSON.parse(JSON.stringify(sandbox.normalize(captureValue, now)));
const regularPayload = (nextTier, extra = {}) => ({
  enterprise:false,
  planClass:'regular',
  rateLimitsApply:true,
  tierOverridden:false,
  capsApply:true,
  tier:{tier:3,rpmMultiplier:3,dailyCapUsd:100,monthlyCapUsd:1000},
  usage:{dailySpentUsd:2,monthlySpentUsd:20},
  topUp:{capUsd:100,windowHours:24,usedUsd:25,remainingUsd:75},
  nextTier,
  ...extra,
});

const value = normalize({state:'ok',payload:regularPayload({
  tier:4,
  daysUntilQualify:30,
  spendUsdUntilQualify:4988.5,
  daysUntilSpendPathUnlocks:0,
})});
assert.deepEqual(value.nextTier, {
  state:'value', currentTier:3, tier:4,
  daysUntilQualify:30, spendUsdUntilQualify:4988.5, daysUntilSpendPathUnlocks:0,
});
assert.equal(value.daily.state, 'value');
assert.equal(value.monthly.state, 'value');
assert.equal(value.topUp.state, 'value');

const zero = normalize({state:'ok',payload:regularPayload({
  tier:4,
  daysUntilQualify:0,
  spendUsdUntilQualify:0,
  daysUntilSpendPathUnlocks:0,
})});
assert.equal(zero.nextTier.state, 'value');
assert.equal(zero.nextTier.daysUntilQualify, 0);
assert.equal(zero.nextTier.spendUsdUntilQualify, 0);
assert.equal(zero.nextTier.daysUntilSpendPathUnlocks, 0);

const maxTier = normalize({state:'ok',payload:regularPayload(null)});
assert.equal(maxTier.nextTier.state, 'max-tier');
const pinned = normalize({state:'ok',payload:regularPayload(null, {tierOverridden:true})});
assert.equal(pinned.nextTier.state, 'tier-overridden');
const enterprise = normalize({state:'ok',payload:{enterprise:true,planClass:'enterprise',rateLimitsApply:false,capsApply:false,topUp:null,nextTier:null}});
assert.equal(enterprise.nextTier.state, 'not-applicable');
const nonRegular = normalize({state:'ok',payload:{enterprise:false,planClass:'devpass',rateLimitsApply:false,tierOverridden:false,capsApply:false,topUp:null,nextTier:null}});
assert.equal(nonRegular.nextTier.state, 'not-applicable');
const malformed = normalize({state:'ok',payload:regularPayload({tier:4,daysUntilQualify:2,spendUsdUntilQualify:100})});
assert.equal(malformed.nextTier.state, 'unknown');
assert.equal(normalize({state:'permission-unavailable'}).nextTier.state, 'unknown');
assert.equal(normalize({state:'source-unavailable'}).nextTier.state, 'unknown');

for (const marker of [
  "cached(`gatewayLimits:${exactOrgId}`",
  "name.startsWith('gatewayLimits:') ? 300_000",
  'DEVPASS_BRIDGE_LIMITS_ORG_ID: exactOrgId',
]) assert.ok(sources.includes(marker), `P71 selected-org/cache marker missing: ${marker}`);
assert.equal(sources.includes('accountAgeDays'), false, 'P71 normalized Engine must not retain account age total');
assert.equal(sources.includes('lifetimeSpendUsd'), false, 'P71 normalized Engine must not retain lifetime spend total');

const http = fs.readFileSync(HTTP, 'utf8');
assert.ok(http.includes("url.pathname === '/gateway-limits'"));
assert.ok(http.includes('loadGatewayLimits(creditsOrgId)'));
assert.equal(http.includes('/gateway-next-tier'), false, 'P71 must not add a local next-tier route');

const bridgeIo = fs.readFileSync(BRIDGE_IO, 'utf8');
for (const marker of [
  'function normalizeGatewayLimitsLocal(raw)',
  "['value','max-tier','tier-overridden','not-applicable','unknown']",
  'daysUntilQualify',
  'spendUsdUntilQualify',
  'daysUntilSpendPathUnlocks',
  '/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}',
]) assert.ok(bridgeIo.includes(marker), `P71 Product transport marker missing: ${marker}`);
assert.equal(bridgeIo.includes('/gateway-next-tier'), false);

const dashboard = fs.readFileSync(DASH, 'utf8');
const uiStart = dashboard.indexOf('  function gatewayNextTierProgressionHtml(nextTier) {');
const uiEnd = dashboard.indexOf('  function gatewayLimitsSectionHtml(truth)', uiStart);
assert.ok(uiStart >= 0 && uiEnd > uiStart, 'P71 next-tier UI helper boundary missing');
const uiSandbox = {esc:(value)=>String(value), money:(value)=>`$${Number(value).toFixed(2)}`};
vm.createContext(uiSandbox);
vm.runInContext(`${dashboard.slice(uiStart, uiEnd)}\nthis.render=gatewayNextTierProgressionHtml;`, uiSandbox);
const render = uiSandbox.render;
const valueHtml = render({state:'value',tier:4,daysUntilQualify:30,spendUsdUntilQualify:4988.5,daysUntilSpendPathUnlocks:0});
for (const marker of ['다음 Tier · Tier 4','나이 경로','30일 남음','사용 경로','$4988.50 더','사용 경로 연령','충족']) {
  assert.ok(valueHtml.includes(marker), `P71 UI value marker missing: ${marker}`);
}
const zeroHtml = render({state:'value',tier:4,daysUntilQualify:0,spendUsdUntilQualify:0,daysUntilSpendPathUnlocks:0});
assert.ok(zeroHtml.includes('금액 충족'));
assert.ok(zeroHtml.includes('충족'));
assert.ok(render({state:'max-tier'}).includes('최고 Tier'));
assert.ok(render({state:'tier-overridden'}).includes('고정 Tier · 자동 승급 미적용'));
assert.ok(render({state:'not-applicable'}).includes('미적용'));
assert.ok(render({state:'unknown'}).includes('—'));
for (const prior of [
  'function gatewayLimitsUtilizationPercent(value, cap)',
  "gatewayLimitsUtilizationBarHtml(truth?.daily,'used','일간 spend 사용률 · UTC')",
  "gatewayLimitsUtilizationBarHtml(truth?.monthly,'used','월간 spend 사용률')",
  "gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')",
]) assert.ok(dashboard.includes(prior), `P71 must preserve 5.104 utilization: ${prior}`);

const diagnostics = fs.readFileSync(DIAG, 'utf8');
const diagStart = diagnostics.indexOf('  function gatewayNextTierDiagnosticText(value) {');
const diagEnd = diagnostics.indexOf('  function modelCategoryCatalogDiagnosticText', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart, 'P71 next-tier diagnostics boundary missing');
const diagHelper = diagnostics.slice(diagStart, diagEnd);
assert.equal(diagHelper.includes('orgId'), false);
assert.equal(diagHelper.includes('organizationId'), false);
assert.equal(diagHelper.includes('accountAgeDays'), false);
assert.equal(diagHelper.includes('lifetimeSpendUsd'), false);
const diagSandbox = {};
vm.createContext(diagSandbox);
vm.runInContext(`${diagHelper}\nthis.diag=gatewayNextTierDiagnosticText;`, diagSandbox);
assert.equal(
  diagSandbox.diag({state:'ok',nextTier:{state:'value',currentTier:3,tier:4,daysUntilQualify:30,spendUsdUntilQualify:4988.5,daysUntilSpendPathUnlocks:0}}),
  'Gateway next tier: scope credits · current 3 · next 4 · age-left 30d · spend-left 4988.5 · spend-age-left 0d · source org-limits · state ok'
);
assert.ok(diagSandbox.diag({state:'ok',nextTier:{state:'max-tier'}}).includes('state max-tier'));
assert.ok(diagSandbox.diag({state:'ok',nextTier:{state:'tier-overridden'}}).includes('state tier-overridden'));
assert.ok(diagSandbox.diag({state:'source-unavailable'}).includes('state source-unavailable'));

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['nextTier','Gateway next tier','/gateway-next-tier']) {
    assert.equal(text.includes(forbidden), false, `P71 request identity leak: ${path} ${forbidden}`);
  }
}

console.log('P71 Credits next-tier progression: PASS');