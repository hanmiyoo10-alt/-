'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.107';
const BASE = '3.0.0-alpha.5.106';
const BASE_RELEASE_SHA = '77cf4524d230a907ab90c89ac7fd25e1f96a48f9';
const BASE_ENGINE_SHA = '2c44fbc01771dbdedab2bc407a090699a523feb3c0056f5b646fa773e457a427';
const SPEC = '.github/usage-dashboard/releases/5.107.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_credits_next_tier_unlock_limits_5107.py';
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
assert.equal(spec.releaseTitle, 'Credits Next-tier Unlock Limits');
assert.equal(spec.engineVersion, '1.6.41');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p73-credits-next-tier-unlock-limits.cjs');
assert.equal(spec.authority?.featureIssue, 1888);
assert.equal(spec.authority?.designPullRequest, 1889);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5107_CREDITS_NEXT_TIER_UNLOCK_LIMITS_DESIGN.md', 'utf8');
for (const marker of [
  'DESIGN FROZEN',
  '다음 Tier 한도 · 현재 기준',
  'rpmMultiplier',
  'dailyCapUsd',
  'monthlyCapUsd',
  'topUpDailyCapUsd',
  'Explicit zero remains known zero',
  'entire unlock sub-block fails closed to UNKNOWN',
  'No new route, timer, poller, persistence, credential, or Request Ledger owner',
]) assert.ok(design.includes(marker), `P73 design marker missing: ${marker}`);

const materializer = fs.readFileSync(MATERIALIZER, 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.106'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.107'",
  "BASE_ENGINE = '1.6.40'",
  "TARGET_ENGINE = '1.6.41'",
  `BASE_ENGINE_SHA = '${BASE_ENGINE_SHA}'`,
  "const REQUIRED_BRIDGE_VERSION = '1.6.41';",
  'nextTierLimitsFromRaw(nextTierRaw)',
  "nextTierLimitsUnknown('invalid-next-tier-limits')",
  'function gatewayNextTierUnlockLimitsHtml(nextTier)',
  'function gatewayNextTierLimitsDiagnosticText(value)',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P73 materializer marker missing: ${marker}`);
for (const forbidden of [
  BASE_RELEASE_SHA,
  '5580176074',
  'rep(LEDGER,',
  'rep(PROV,',
  'setInterval(',
  'setTimeout(',
  "url.pathname === '/gateway-next-tier-limits'",
]) assert.equal(materializer.includes(forbidden), false, `P73 materializer forbidden authority/owner: ${forbidden}`);

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P73 Credits next-tier unlock limits: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.41');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1877);
  assert.equal(row?.commentId, 5580176074);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.41');
assert.equal(manifest.components?.bridge?.sha256, sha256(ENGINE));
assert.notEqual(sha256(ENGINE), BASE_ENGINE_SHA, 'P73 Engine bytes must change for exact next-tier unlock truth');
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
const latest = fs.readFileSync(LATEST, 'utf8');
assert.ok(latest.includes("const REQUIRED_BRIDGE_VERSION = '1.6.41';"));

const capture = fs.readFileSync(CAPTURE, 'utf8');
const sanitizerStart = capture.indexOf("    if (Object.prototype.hasOwnProperty.call(raw, 'nextTier')) {");
const sanitizerEnd = capture.indexOf("    if (Object.prototype.hasOwnProperty.call(raw, 'endpoints')) {", sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P73 nextTier sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
for (const marker of ['rpmMultiplier','dailyCapUsd','monthlyCapUsd','topUpDailyCapUsd']) {
  assert.ok(sanitizer.includes(marker), `P73 nextTier sanitizer field missing: ${marker}`);
}
for (const forbidden of ['accountAgeDays','lifetimeSpendUsd','ageDaysRequired','spendUsdRequired','row.path','endpoint.path']) {
  assert.equal(sanitizer.includes(forbidden), false, `P73 nextTier sanitizer minimization violation: ${forbidden}`);
}

const sources = fs.readFileSync(SOURCES, 'utf8');
const helperStart = sources.indexOf('function gatewayLimitsNumber(value) {');
const helperEnd = sources.indexOf('async function captureGatewayLimitsViaCliSession', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P73 Gateway Limits helper boundary missing');
const helperSource = sources.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.normalize=normalizeGatewayLimitsCapture;`, sandbox);
const normalize = (captureValue, now=123456) => JSON.parse(JSON.stringify(sandbox.normalize(captureValue, now)));
const endpointRows = [
  {key:'chat.completions',rpm:5000},
  {key:'models',rpm:0},
];
const regularPayload = (nextTierOverrides = {}, topLevelOverrides = {}) => ({
  enterprise:false,
  planClass:'regular',
  rateLimitsApply:true,
  tierOverridden:false,
  capsApply:true,
  tier:{tier:3,rpmMultiplier:3,dailyCapUsd:100,monthlyCapUsd:1000},
  usage:{dailySpentUsd:2,monthlySpentUsd:20},
  topUp:{capUsd:100,windowHours:24,usedUsd:25,remainingUsd:75},
  nextTier:{
    tier:4,
    daysUntilQualify:24,
    spendUsdUntilQualify:4987.2,
    daysUntilSpendPathUnlocks:0,
    rpmMultiplier:20,
    dailyCapUsd:10000,
    monthlyCapUsd:100000,
    topUpDailyCapUsd:20000,
    ...nextTierOverrides,
  },
  endpoints:endpointRows,
  ...topLevelOverrides,
});

const value = normalize({state:'ok',payload:regularPayload()});
assert.equal(value.nextTier.state, 'value');
assert.deepEqual(value.nextTier.limits, {
  state:'value',
  rpmMultiplier:20,
  dailyCapUsd:10000,
  monthlyCapUsd:100000,
  topUpDailyCapUsd:20000,
});
assert.equal(value.nextTier.daysUntilQualify, 24);
assert.equal(value.nextTier.spendUsdUntilQualify, 4987.2);
assert.equal(value.nextTier.daysUntilSpendPathUnlocks, 0);
assert.equal(value.endpointRates.state, 'value');
assert.deepEqual(value.endpointRates.rows, endpointRows);

const zeros = normalize({state:'ok',payload:regularPayload({rpmMultiplier:0,dailyCapUsd:0,monthlyCapUsd:0,topUpDailyCapUsd:0})});
assert.deepEqual(zeros.nextTier.limits, {
  state:'value',rpmMultiplier:0,dailyCapUsd:0,monthlyCapUsd:0,topUpDailyCapUsd:0,
});

const invalidCases = [
  {dailyCapUsd:undefined},
  {monthlyCapUsd:-1},
  {rpmMultiplier:Infinity},
  {topUpDailyCapUsd:'20000'},
];
for (const patch of invalidCases) {
  const result = normalize({state:'ok',payload:regularPayload(patch)});
  assert.deepEqual(result.nextTier.limits, {
    state:'invalid-next-tier-limits',rpmMultiplier:null,dailyCapUsd:null,monthlyCapUsd:null,topUpDailyCapUsd:null,
  });
  assert.equal(result.nextTier.state, 'value', 'P73 unlock invalidity must not rewrite the 5.105 progression truth');
}

const maxTier = normalize({state:'ok',payload:regularPayload({}, {nextTier:null})});
assert.equal(maxTier.nextTier.state, 'max-tier');
assert.equal(maxTier.nextTier.limits.state, 'max-tier');
const overridden = normalize({state:'ok',payload:regularPayload({}, {tierOverridden:true,nextTier:null})});
assert.equal(overridden.nextTier.state, 'tier-overridden');
assert.equal(overridden.nextTier.limits.state, 'tier-overridden');
const enterprise = normalize({state:'ok',payload:{enterprise:true,planClass:'enterprise',rateLimitsApply:false,tierOverridden:false,capsApply:false,topUp:null,nextTier:null,endpoints:null}});
assert.equal(enterprise.nextTier.state, 'not-applicable');
assert.equal(enterprise.nextTier.limits.state, 'not-applicable');
assert.equal(normalize({state:'permission-unavailable'}).nextTier.limits.state, 'permission-unavailable');
assert.equal(normalize({state:'source-unavailable'}).nextTier.limits.state, 'source-unavailable');

for (const marker of [
  "cached(`gatewayLimits:${exactOrgId}`",
  "name.startsWith('gatewayLimits:') ? 300_000",
  'DEVPASS_BRIDGE_LIMITS_ORG_ID: exactOrgId',
]) assert.ok(sources.includes(marker), `P73 selected-org/cache marker missing: ${marker}`);
for (const forbidden of ['publicTierTable','requestHistory','spendHistory','runway','rpmRemaining','rateHeadroom']) {
  assert.equal(helperSource.includes(forbidden), false, `P73 must not derive next-tier unlock truth: ${forbidden}`);
}

const http = fs.readFileSync(HTTP, 'utf8');
assert.ok(http.includes("url.pathname === '/gateway-limits'"));
assert.ok(http.includes('loadGatewayLimits(creditsOrgId)'));
assert.equal(http.includes('/gateway-next-tier-limits'), false, 'P73 must reuse the existing local limits route');

const bridgeIo = fs.readFileSync(BRIDGE_IO, 'utf8');
for (const marker of [
  'function normalizeGatewayLimitsLocal(raw)',
  "'invalid-next-tier-limits'",
  'unlockLimits',
  'topUpDailyCapUsd',
  'endpointRates',
  '/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}',
]) assert.ok(bridgeIo.includes(marker), `P73 Product transport marker missing: ${marker}`);
assert.equal(bridgeIo.includes('/gateway-next-tier-limits'), false);

const bridgeStart = bridgeIo.indexOf('  function normalizeGatewayLimitsLocal(raw) {');
const bridgeEnd = bridgeIo.indexOf('  async function fetchGatewayLimitsForOrg', bridgeStart);
assert.ok(bridgeStart >= 0 && bridgeEnd > bridgeStart);
const bridgeSandbox = {num:(candidate)=>typeof candidate === 'number' && Number.isFinite(candidate)};
vm.createContext(bridgeSandbox);
vm.runInContext(`${bridgeIo.slice(bridgeStart, bridgeEnd)}\nthis.normalizeLocal=normalizeGatewayLimitsLocal;`, bridgeSandbox);
const local = (raw) => JSON.parse(JSON.stringify(bridgeSandbox.normalizeLocal(raw)));
const localValue = local({
  state:'ok',
  nextTier:{
    state:'value',currentTier:3,tier:4,daysUntilQualify:24,spendUsdUntilQualify:4987.2,daysUntilSpendPathUnlocks:0,
    limits:{state:'value',rpmMultiplier:20,dailyCapUsd:10000,monthlyCapUsd:100000,topUpDailyCapUsd:20000},
  },
  endpointRates:{state:'value',rows:endpointRows},
});
assert.equal(localValue.nextTier.state, 'value');
assert.deepEqual(localValue.nextTier.limits, {state:'value',rpmMultiplier:20,dailyCapUsd:10000,monthlyCapUsd:100000,topUpDailyCapUsd:20000});
assert.deepEqual(localValue.endpointRates.rows, endpointRows, 'P73 must preserve 5.106 endpoint RPM transport');
const localBad = local({
  state:'ok',
  nextTier:{
    state:'value',currentTier:3,tier:4,daysUntilQualify:24,spendUsdUntilQualify:1,daysUntilSpendPathUnlocks:0,
    limits:{state:'value',rpmMultiplier:20,dailyCapUsd:10000,monthlyCapUsd:100000},
  },
});
assert.equal(localBad.nextTier.limits.state, 'invalid-next-tier-limits');
assert.equal(localBad.nextTier.limits.topUpDailyCapUsd, null);

const dashboard = fs.readFileSync(DASH, 'utf8');
const uiStart = dashboard.indexOf('  function gatewayNextTierUnlockLimitsHtml(nextTier) {');
const uiEnd = dashboard.indexOf('  function gatewayNextTierProgressionHtml(nextTier)', uiStart);
assert.ok(uiStart >= 0 && uiEnd > uiStart, 'P73 next-tier unlock UI helper boundary missing');
const uiSandbox = {
  esc:(candidate)=>String(candidate),
  money:(candidate)=>`$${Number(candidate).toFixed(2)}`,
};
vm.createContext(uiSandbox);
vm.runInContext(`${dashboard.slice(uiStart, uiEnd)}\nthis.render=gatewayNextTierUnlockLimitsHtml;`, uiSandbox);
const render = uiSandbox.render;
const html = render({tier:4,limits:{state:'value',rpmMultiplier:20,dailyCapUsd:10000,monthlyCapUsd:100000,topUpDailyCapUsd:20000}});
for (const marker of ['다음 Tier 한도 · 현재 기준','일간 spend','$10000.00/일','월간 spend','$100000.00/월','24h 충전','$20000.00/24h','Rate multiplier','20×']) {
  assert.ok(html.includes(marker), `P73 unlock UI marker missing: ${marker}`);
}
const zeroHtml = render({tier:4,limits:{state:'value',rpmMultiplier:0,dailyCapUsd:0,monthlyCapUsd:0,topUpDailyCapUsd:0}});
for (const marker of ['$0.00/일','$0.00/월','$0.00/24h','0×']) assert.ok(zeroHtml.includes(marker), `P73 explicit zero UI lost: ${marker}`);
assert.ok(render({limits:{state:'max-tier'}}).includes('미적용'));
assert.ok(render({limits:{state:'tier-overridden'}}).includes('미적용'));
assert.ok(render({limits:{state:'not-applicable'}}).includes('미적용'));
assert.ok(render({limits:{state:'invalid-next-tier-limits'}}).includes('—'));
for (const prior of [
  'function gatewayNextTierProgressionHtml(nextTier)',
  '나이 경로',
  '사용 경로',
  '사용 경로 연령',
  'function gatewayEndpointRpmLimitsHtml(endpointRates)',
  'Endpoint RPM · 조직 한도',
  'function gatewayLimitsUtilizationPercent(value, cap)',
]) assert.ok(dashboard.includes(prior), `P73 must preserve prior Gateway Limits UI: ${prior}`);
assert.ok(dashboard.includes('${gatewayNextTierUnlockLimitsHtml(nextTier)}'), 'P73 unlock block must be nested under next-tier rendering');

const diagnostics = fs.readFileSync(DIAG, 'utf8');
const diagStart = diagnostics.indexOf('  function gatewayNextTierLimitsDiagnosticText(value) {');
const diagEnd = diagnostics.indexOf('  function gatewayEndpointRpmDiagnosticText(value)', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart, 'P73 next-tier limits diagnostics boundary missing');
const diagHelper = diagnostics.slice(diagStart, diagEnd);
for (const forbidden of ['orgId','organizationId','accountAgeDays','lifetimeSpendUsd','endpoint.path','rawPath']) assert.equal(diagHelper.includes(forbidden), false);
const diagSandbox = {};
vm.createContext(diagSandbox);
vm.runInContext(`${diagHelper}\nthis.diag=gatewayNextTierLimitsDiagnosticText;`, diagSandbox);
assert.equal(
  diagSandbox.diag({state:'ok',nextTier:{state:'value',tier:4,limits:{state:'value',rpmMultiplier:20,dailyCapUsd:10000,monthlyCapUsd:100000,topUpDailyCapUsd:20000}}}),
  'Gateway next-tier limits: scope credits · next 4 · daily 10000 · monthly 100000 · topup24h 20000 · multiplier 20 · source org-limits · state ok'
);
assert.ok(diagSandbox.diag({state:'ok',nextTier:{state:'max-tier',limits:{state:'max-tier'}}}).includes('state max-tier'));
assert.ok(diagSandbox.diag({state:'ok',nextTier:{state:'value',tier:4,limits:{state:'invalid-next-tier-limits'}}}).includes('state invalid-next-tier-limits'));
assert.ok(diagSandbox.diag({state:'permission-unavailable'}).includes('state permission-unavailable'));
assert.ok(diagnostics.includes('gatewayNextTierDiagnosticText('), 'P73 must preserve 5.105 next-tier diagnostics');
assert.ok(diagnostics.includes('gatewayEndpointRpmDiagnosticText('), 'P73 must preserve 5.106 endpoint RPM diagnostics');

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['Gateway next-tier limits','/gateway-next-tier-limits','topUpDailyCapUsd']) {
    assert.equal(text.includes(forbidden), false, `P73 Request Ledger/provenance identity must stay unchanged: ${path}:${forbidden}`);
  }
}

console.log('P73 Credits next-tier unlock limits: OK · exact four-field source fidelity · zero preserved · invalid group fail-closed · current-basis qualifier · prior progression/endpoint RPM preserved');
