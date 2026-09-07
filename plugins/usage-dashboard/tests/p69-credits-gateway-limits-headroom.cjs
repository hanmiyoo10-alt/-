'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.103';
const BASE = '3.0.0-alpha.5.102';
const BASE_RELEASE_SHA = 'd0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77';
const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.103.json', 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'Credits Gateway Limits & Headroom');
assert.equal(spec.engineVersion, '1.6.38');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_credits_gateway_limits_5103.py');
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p69-credits-gateway-limits-headroom.cjs');
assert.equal(spec.authority?.featureIssue, 1829);
assert.equal(spec.authority?.designPullRequest, 1831);
assert.equal(spec.authority?.releaseGeneration, 'E13');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = spec.releaseEvidence?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1803);
  assert.equal(row?.commentId, 5565569980);
}

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5103_GATEWAY_LIMITS_HEADROOM_DESIGN.md', 'utf8');
const matrix = fs.readFileSync('docs/USAGE_DASHBOARD_5103_SOURCE_TRUTH_MATRIX_ADDENDUM.md', 'utf8');
for (const marker of [
  'GET /orgs/{selectedCreditsOrgId}/limits',
  'TTL target: at least 5 minutes',
  'never silently fall back to a different organization',
  'daily spend is explicitly a **UTC-day** source boundary',
]) assert.ok(design.includes(marker), `P69 design marker missing: ${marker}`);
for (const marker of [
  'V-GATEWAY-LIMITS-HEADROOM',
  'accountAgeDays',
  'lifetimeSpendUsd',
  'nextTier',
  'endpoint RPM table',
  'Cross-org isolation',
]) assert.ok(matrix.includes(marker), `P69 truth-matrix marker missing: ${marker}`);

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_credits_gateway_limits_5103.py', 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.102'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.103'",
  "BASE_ENGINE = '1.6.37'",
  "TARGET_ENGINE = '1.6.38'",
  "BASE_RELEASE_SHA = 'd0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77'",
  "BASE_ENGINE_SHA = 'ec0af46fe89005c1fcafd95bd18468bb223906745a2b836cd9514dcbfa3e093c'",
  "BASE_MANAGER_SHA = 'a000d9915206b60b18adad6db4ce99f25c9dda283f62818ff25c96844e81f057'",
  'DEVPASS_BRIDGE_LIMITS_ORG_ID',
  'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
  "cached(`gatewayLimits:${exactOrgId}`",
  "name.startsWith('gatewayLimits:') ? 300_000",
  "url.pathname === '/gateway-limits'",
  'GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000',
  'Gateway Limits · Credits',
  '일간 spend · UTC',
  'Gateway limits: scope credits',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P69 materializer marker missing: ${marker}`);
assert.equal(materializer.includes('rep(LEDGER,'), false, '5.103 must not mutate Request Ledger');
assert.equal(materializer.includes('rep(PROV,'), false, '5.103 must not mutate request provenance');

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P69 Credits Gateway Limits & Headroom: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.38');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1803);
  assert.equal(row?.commentId, 5565569980);
}

const capture = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
for (const marker of [
  'DEVPASS_BRIDGE_LIMITS_ORG_ID',
  "capture.v11",
  'const sanitizeGatewayLimits = (value) => {',
  'const limitsTarget = (orgUrl, orgId) => {',
  "encodeURIComponent(exactOrgId) + '/limits'",
  'requestGatewayLimitsWithFetch',
  'requestGatewayLimitsNode',
  "storeGatewayLimits(result, 'fetch-limits')",
  "storeGatewayLimits(result, 'node-request-limits')",
]) assert.ok(capture.includes(marker), `P69 capture marker missing: ${marker}`);
assert.equal(capture.includes('const limitsCandidates'), false, 'P69 must not fan out limits candidates');
const sanitizerStart = capture.indexOf('  const sanitizeGatewayLimits = (value) => {');
const sanitizerEnd = capture.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P69 sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
for (const allowed of [
  'enterprise','planClass','rateLimitsApply','tierOverridden','capsApply',
  'rpmMultiplier','dailyCapUsd','monthlyCapUsd','dailySpentUsd','monthlySpentUsd',
  'capUsd','windowHours','usedUsd','remainingUsd'
]) assert.ok(sanitizer.includes(allowed), `P69 sanitizer required field missing: ${allowed}`);
for (const forbidden of ['accountAgeDays','lifetimeSpendUsd','nextTier','topUpDailyCapUsd','endpoints']) {
  assert.equal(sanitizer.includes(forbidden), false, `P69 minimization violation: ${forbidden}`);
}

const sources = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const helperStart = sources.indexOf('function gatewayLimitsNumber(value) {');
const helperEnd = sources.indexOf('async function captureGatewayLimitsViaCliSession', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P69 pure helper boundary missing');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${sources.slice(helperStart, helperEnd)}\nthis.normalize=normalizeGatewayLimitsCapture;`, sandbox);
const normalize = (captureValue, now=123456) => JSON.parse(JSON.stringify(sandbox.normalize(captureValue, now)));
const regular = normalize({state:'ok',payload:{
  enterprise:false, planClass:'regular', rateLimitsApply:true, tierOverridden:false, capsApply:true,
  tier:{tier:2,rpmMultiplier:2,dailyCapUsd:50,monthlyCapUsd:500},
  usage:{dailySpentUsd:12.34,monthlySpentUsd:123.45},
  topUp:{capUsd:100,windowHours:24,usedUsd:25,remainingUsd:75},
}});
assert.equal(regular.state, 'ok');
assert.equal(regular.source, 'org-limits');
assert.equal(regular.trustTierState, 'value');
assert.equal(regular.trustTier, 2);
assert.equal(regular.rateState, 'value');
assert.equal(regular.rateMultiplier, 2);
assert.equal(regular.daily.state, 'value');
assert.ok(Math.abs(regular.daily.remaining - 37.66) < 1e-9);
assert.equal(regular.monthly.state, 'value');
assert.ok(Math.abs(regular.monthly.remaining - 376.55) < 1e-9);
assert.deepEqual(regular.topUp, {state:'value',cap:100,windowHours:24,used:25,remaining:75});
assert.equal(regular.fetchedAt, 123456);
assert.equal(Object.prototype.hasOwnProperty.call(regular, 'organizationId'), false);
assert.equal(Object.prototype.hasOwnProperty.call(regular, 'orgId'), false);

const enterprise = normalize({state:'ok',payload:{enterprise:true,planClass:'enterprise',rateLimitsApply:false,capsApply:false,topUp:null}});
assert.equal(enterprise.enterprise, true);
assert.equal(enterprise.trustTierState, 'not-applicable');
assert.equal(enterprise.rateState, 'not-applicable');
assert.equal(enterprise.daily.state, 'not-applicable');
assert.equal(enterprise.monthly.state, 'not-applicable');
assert.equal(enterprise.topUp.state, 'not-applicable');
assert.notEqual(enterprise.rateMultiplier, 0);

const nonRegular = normalize({state:'ok',payload:{enterprise:false,planClass:'devpass',rateLimitsApply:false,capsApply:false,topUp:null}});
assert.equal(nonRegular.trustTierState, 'not-applicable');
assert.equal(nonRegular.rateState, 'not-applicable');
assert.equal(nonRegular.daily.state, 'not-applicable');

const missingMetric = normalize({state:'ok',payload:{enterprise:false,planClass:'regular',rateLimitsApply:true,capsApply:true,tier:{tier:1,rpmMultiplier:1,dailyCapUsd:50,monthlyCapUsd:500},usage:{monthlySpentUsd:10},topUp:null}});
assert.equal(missingMetric.daily.state, 'unknown');
assert.equal(missingMetric.monthly.state, 'value');
assert.equal(missingMetric.topUp.state, 'not-applicable');

const invalidTopUp = normalize({state:'ok',payload:{enterprise:false,planClass:'regular',rateLimitsApply:true,capsApply:true,tier:{tier:1,rpmMultiplier:1,dailyCapUsd:10,monthlyCapUsd:100},usage:{dailySpentUsd:1,monthlySpentUsd:10},topUp:{capUsd:100,windowHours:24,usedUsd:25}}});
assert.equal(invalidTopUp.topUp.state, 'unknown');
assert.equal(normalize({state:'permission-unavailable'}).state, 'permission-unavailable');
assert.equal(normalize({state:'source-unavailable'}).state, 'source-unavailable');

for (const marker of [
  "cached(`gatewayLimits:${exactOrgId}`",
  "name.startsWith('gatewayLimits:') ? 300_000",
  "!name.startsWith('gatewayLimits:')",
  'DEVPASS_BRIDGE_LIMITS_ORG_ID: exactOrgId',
]) assert.ok(sources.includes(marker), `P69 cache/isolation marker missing: ${marker}`);

const http = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/70-http-diagnostics.part.mjs', 'utf8');
assert.ok(http.includes("url.pathname === '/gateway-limits'"));
assert.ok(http.includes("if (!creditsOrgId) return json(res, 400"));
assert.ok(http.includes('loadGatewayLimits(creditsOrgId)'));

const core = fs.readFileSync('plugins/usage-dashboard/src/00-runtime-core.part.js', 'utf8');
assert.ok(core.includes('GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000'));
assert.ok(core.includes("gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0}"));
const defaultsStart = core.indexOf('  const DEFAULTS = {');
const defaultsEnd = core.indexOf('\n  };', defaultsStart);
assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart);
assert.equal(core.slice(defaultsStart, defaultsEnd).includes('gatewayLimits'), false, 'P69 Gateway Limits must not become persisted DEFAULTS state');

const bridgeIo = fs.readFileSync('plugins/usage-dashboard/src/20-bridge-io.part.js', 'utf8');
for (const marker of [
  'function normalizeGatewayLimitsLocal(raw)',
  'async function fetchGatewayLimitsForOrg(creditsOrgId)',
  '/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}',
  'async function refreshGatewayLimitsForOrg(creditsOrgId, force = false)',
  'gatewayLimitsRuntime.orgId === exactOrgId',
  'gatewayLimitsInFlight?.orgId === exactOrgId',
]) assert.ok(bridgeIo.includes(marker), `P69 Product lazy loader missing: ${marker}`);
const loaderStart = bridgeIo.indexOf('  function normalizeGatewayLimitsLocal(raw)');
const loaderEnd = bridgeIo.indexOf('  function bridgeManagerAuthHeaders()', loaderStart);
const loader = bridgeIo.slice(loaderStart, loaderEnd);
assert.equal(loader.includes('setInterval'), false);
assert.equal(loader.includes('setTimeout'), false);
assert.equal(loader.includes('persist('), false, 'P69 Gateway Limits loader must remain runtime-only');

const refresh = fs.readFileSync('plugins/usage-dashboard/src/30-refresh-runtime.part.js', 'utf8');
assert.equal(refresh.includes('/gateway-limits'), false, 'P69 limits must stay off snapshot foreground path');
assert.equal(refresh.includes('refreshGatewayLimitsForOrg'), false, 'P69 limits must stay off recurring refresh path');

const settings = fs.readFileSync('plugins/usage-dashboard/src/60-settings-runtime.part.js', 'utf8');
for (const marker of [
  "if (next === 'credits')",
  'void refreshGatewayLimitsForOrg(limitsOrgId)',
  'void refreshGatewayLimitsForOrg(next)',
  "String(state.dashboardView || '') === 'credits'",
]) assert.ok(settings.includes(marker), `P69 lazy Credits trigger missing: ${marker}`);

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
for (const marker of [
  'function gatewayLimitsSectionHtml(truth)',
  'Gateway Limits · Credits',
  'Trust tier',
  'Rate multiplier',
  '일간 spend · UTC',
  '월간 spend',
  'Enterprise · 조직 단위 Gateway rate/spend cap 없음',
  "gatewayLimitsRuntime.orgId === selectedCreditsOrgId ? gatewayLimitsRuntime.value : null",
]) assert.ok(dashboard.includes(marker), `P69 Credits UI marker missing: ${marker}`);
assert.equal(dashboard.includes('일간 spend · KST'), false, 'P69 must not relabel UTC daily limit as KST');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const diagStart = diagnostics.indexOf('  function gatewayLimitsDiagnosticText(value) {');
const diagEnd = diagnostics.indexOf('  function modelCategoryCatalogDiagnosticText', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart, 'P69 diagnostics helper boundary missing');
const diagHelper = diagnostics.slice(diagStart, diagEnd);
assert.ok(diagHelper.includes('Gateway limits: scope credits'));
assert.ok(diagHelper.includes('source org-limits'));
assert.equal(diagHelper.includes('orgId'), false, 'P69 Diagnostics must not include raw org ID');
assert.equal(diagHelper.includes('organizationId'), false, 'P69 Diagnostics must not include raw organization ID');

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['gatewayLimits','Gateway limits','DEVPASS_BRIDGE_LIMITS_ORG_ID','/gateway-limits']) {
    assert.equal(text.includes(forbidden), false, `P69 request identity leak: ${path} ${forbidden}`);
  }
}

for (const marker of [
  'function devPassProviderCachePolicyTruth(raw)',
  "raw.providerCacheControlMode === 'auto'",
  "raw.providerCacheControlMode === 'passthrough'",
  "raw.providerCacheControlMode === 'off'",
  'function devPassNoAiTrainingTruth(raw)',
  'noAiTrainingState: noAiTraining.state',
]) assert.ok(sources.includes(marker), `P69 prior Engine truth missing: ${marker}`);
assert.ok(dashboard.includes('<span>AI 학습 차단</span>'));
assert.ok(dashboard.includes('<span>Provider 캐시 정책</span>'));
assert.ok(diagnostics.includes('devPassNoAiTrainingDiagnosticText(diagAccount)'));
assert.ok(diagnostics.includes('devPassProviderCachePolicyDiagnosticText(diagAccount)'));

const category = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
  'mapping?.providerId === providerId',
]) assert.ok(category.includes(marker), `P69 5.100 model fidelity missing: ${marker}`);
assert.equal(category.includes('gatewayLimits'), false);

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.103';",
  "const BUNDLED_ENGINE_VERSION = '1.6.38';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(manager.includes(marker), `P69 Manager authority missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs')).digest('hex');
const managerSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs')).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.38');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('P69 Credits Gateway Limits & Headroom: OK · selected-org exact binding · one bounded /limits family · 5m org cache · no stale/fallback · enterprise/N-A/UNKNOWN · UTC daily truth · data minimization · lazy Credits UI · ID-free diagnostics · request identity unchanged · 5.102 preserved');
