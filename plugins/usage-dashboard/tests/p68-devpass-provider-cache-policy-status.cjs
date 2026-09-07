'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.102';
const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.102.json', 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'DevPass Provider Cache Policy Status');
assert.equal(spec.engineVersion, '1.6.37');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_devpass_provider_cache_policy_5102.py');
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p68-devpass-provider-cache-policy-status.cjs');
assert.equal(spec.authority?.featureIssue, 1803);
assert.equal(spec.authority?.designPullRequest, 1805);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_devpass_provider_cache_policy_5102.py', 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.101'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.102'",
  "TARGET_ENGINE = '1.6.37'",
  "MANAGER_VER = '1.3.6'",
  "BASE_RELEASE_SHA = 'fa27d1dd6eaa17a8388c96da475ea3965e0572c8'",
  "'blockApiTraining','providerCacheControlMode'",
  'function devPassProviderCachePolicyTruth(raw)',
  "raw.providerCacheControlMode === 'auto'",
  "raw.providerCacheControlMode === 'passthrough'",
  "raw.providerCacheControlMode === 'off'",
  'providerCachePolicyState: providerCachePolicy.state',
  'providerCachePolicyMode: providerCachePolicy.mode',
  'providerCachePolicySource: providerCachePolicy.source',
  'Provider 캐시 정책',
  'DevPass provider cache policy:',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P68 materializer marker missing: ${marker}`);
assert.equal(materializer.includes('rep(LEDGER,'), false, '5.102 must not mutate Request Ledger');
assert.equal(materializer.includes('rep(PROV,'), false, '5.102 must not mutate request provenance/identity');

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P68 DevPass Provider Cache Policy Status: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.37');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, '3.0.0-alpha.5.101');
  assert.equal(row?.releaseSha, 'fa27d1dd6eaa17a8388c96da475ea3965e0572c8');
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1598);
  assert.equal(row?.commentId, 5562249836);
}

const capture = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
const sanitizerStart = capture.indexOf('  const sanitizeStatus = (value) => {');
const sanitizerEnd = capture.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P68 sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
assert.ok(sanitizer.includes("'blockApiTraining','providerCacheControlMode'"));
assert.equal((sanitizer.match(/providerCacheControlMode/g) || []).length, 1);
assert.equal((sanitizer.match(/blockApiTraining/g) || []).length, 1);
assert.equal(sanitizer.includes('providerCompliancePolicy'), false);

const sources = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const helperStart = sources.indexOf('function devPassProviderCachePolicyTruth(raw) {');
const helperEnd = sources.indexOf('function normalizeIndependentDevPassStatus(payload) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P68 pure helper boundary missing');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${sources.slice(helperStart, helperEnd)}\nthis.truth=devPassProviderCachePolicyTruth;`, sandbox);
const truth = value => JSON.parse(JSON.stringify(sandbox.truth(value)));
const SOURCE = '/dev-plans/status.providerCacheControlMode';
assert.deepEqual(truth({providerCacheControlMode:'auto'}), {state:'automatic',mode:'auto',source:SOURCE});
assert.deepEqual(truth({providerCacheControlMode:'passthrough'}), {state:'client-managed',mode:'passthrough',source:SOURCE});
assert.deepEqual(truth({providerCacheControlMode:'off'}), {state:'disabled',mode:'off',source:SOURCE});
for (const raw of [
  {},
  {providerCacheControlMode:null},
  {providerCacheControlMode:'AUTO'},
  {providerCacheControlMode:'automatic'},
  {providerCacheControlMode:'disabled'},
  {providerCacheControlMode:''},
  {providerCacheControlMode:false},
  {providerCacheControlMode:0},
  null,
]) {
  assert.deepEqual(truth(raw), {state:'unknown',mode:'unknown',source:'unavailable'});
}
for (const marker of [
  'const providerCachePolicy = devPassProviderCachePolicyTruth(raw);',
  'providerCachePolicyState: providerCachePolicy.state',
  'providerCachePolicyMode: providerCachePolicy.mode',
  'providerCachePolicySource: providerCachePolicy.source',
  "out.providerCachePolicyState !== 'unknown'",
  "providerCachePolicyState: 'unknown'",
  "providerCachePolicyMode: 'unknown'",
  "providerCachePolicySource: 'unavailable'",
]) assert.ok(sources.includes(marker), `P68 normalized truth missing: ${marker}`);
assert.equal(sources.includes('providerCacheControlMode ??'), false, 'P68 must not import upstream presentation fallback');

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.ok(dashboard.includes("providerCachePolicyState === 'automatic' ? '자동'"));
assert.ok(dashboard.includes("providerCachePolicyState === 'client-managed' ? '클라이언트 관리'"));
assert.ok(dashboard.includes("providerCachePolicyState === 'disabled' ? '꺼짐' : '—'"));
assert.ok(dashboard.includes('<span>Provider 캐시 정책</span>'));
assert.ok(dashboard.indexOf('<span>AI 학습 차단</span>') < dashboard.indexOf('<span>Provider 캐시 정책</span>'));
assert.ok(dashboard.indexOf('<span>Provider 캐시 정책</span>') < dashboard.indexOf('<span>Pending tier</span>'));

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function devPassProviderCachePolicyDiagnosticText(account)',
  "state === 'automatic' ? 'auto'",
  "state === 'client-managed' ? 'passthrough'",
  "state === 'disabled' ? 'off'",
  "'/dev-plans/status.providerCacheControlMode'",
  'DevPass provider cache policy:',
  'devPassProviderCachePolicyDiagnosticText(diagAccount)',
  'DevPass no-AI-training:',
  'Model lifecycle fidelity:',
]) assert.ok(diagnostics.includes(marker), `P68 diagnostics/fidelity marker missing: ${marker}`);

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of [
    'providerCacheControlMode','providerCachePolicyState','providerCachePolicyMode','providerCachePolicySource'
  ]) assert.equal(text.includes(forbidden), false, `P68 request identity leak: ${path} ${forbidden}`);
}

for (const marker of [
  'function devPassNoAiTrainingTruth(raw)',
  "raw.blockApiTraining === true",
  "raw.blockApiTraining === false",
  'noAiTrainingState: noAiTraining.state',
  'noAiTrainingSource: noAiTraining.source',
]) assert.ok(sources.includes(marker), `P68 5.101 Engine truth missing: ${marker}`);
assert.ok(dashboard.includes('<span>AI 학습 차단</span>'));
assert.ok(diagnostics.includes('devPassNoAiTrainingDiagnosticText(diagAccount)'));

const category = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
  'mapping?.providerId === providerId',
]) assert.ok(category.includes(marker), `P68 5.100 model fidelity missing: ${marker}`);
assert.equal(category.includes('providerCacheControlMode'), false);

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.102';",
  "const BUNDLED_ENGINE_VERSION = '1.6.37';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(manager.includes(marker), `P68 Manager authority missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs')).digest('hex');
const managerSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs')).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.37');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('P68 DevPass Provider Cache Policy Status: OK · exact enum quad-state · existing account capture · no telemetry inference · zero extra I/O owner · UI/Diagnostics · request identity unchanged · 5.101 preserved');
