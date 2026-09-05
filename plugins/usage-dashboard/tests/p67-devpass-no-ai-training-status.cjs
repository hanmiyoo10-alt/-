'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.101';
const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.101.json', 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'DevPass No-AI-Training Status');
assert.equal(spec.engineVersion, '1.6.36');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_devpass_no_ai_training_5101.py');
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p67-devpass-no-ai-training-status.cjs');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = spec.releaseEvidence?.[role];
  assert.equal(row?.productVersion, '3.0.0-alpha.5.100');
  assert.equal(row?.releaseSha, '478fcd368734b1cf1aa5a98932cb34bb29f1d1e4');
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1540);
  assert.equal(row?.commentId, 5553562006);
}
assert.equal(spec.authority?.featureIssue, 1598);
assert.equal(spec.authority?.designPullRequest, 1600);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_devpass_no_ai_training_5101.py', 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.100'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.101'",
  "BASE_ENGINE = '1.6.35'",
  "TARGET_ENGINE = '1.6.36'",
  "MANAGER_VER = '1.3.6'",
  "BASE_RELEASE_SHA = '478fcd368734b1cf1aa5a98932cb34bb29f1d1e4'",
  "BASE_ENGINE_SHA = '6fc3faab12d5c37344bc2799b8182c209d8168d01ce50025bbaa35b8465409f5'",
  "BASE_MANAGER_SHA = '55c6fc1e873a113f365650325946e6d045bf80f6f7e86318ff598062ce592e4d'",
  "BOOT_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'",
  "'defaultRoutingStrategy','blockApiTraining'",
  'function devPassNoAiTrainingTruth(raw)',
  "raw.blockApiTraining === true",
  "raw.blockApiTraining === false",
  "noAiTrainingState: noAiTraining.state",
  "noAiTrainingSource: noAiTraining.source",
  'AI 학습 차단',
  'DevPass no-AI-training:',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P67 materializer marker missing: ${marker}`);
assert.equal(materializer.includes('rep(LEDGER,'), false, '5.101 must not mutate Request Ledger');
assert.equal(materializer.includes('rep(PROV,'), false, '5.101 must not mutate request provenance/identity');

const intake = JSON.parse(fs.readFileSync('.github/usage-dashboard/upstream-idea-intake-state.json', 'utf8'));
const intakeRow = intake.knownCandidateKeys?.find(row => row.id === 'V-DEVPASS-NO-TRAINING-STATUS');
assert.ok(['implementation-source-5.101','implemented-5.101'].includes(String(intakeRow?.status)), '5.101 intake state must identify implementation authority');

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P67 DevPass No-AI-Training Status: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.productVersion, TARGET);
assert.equal(release.engineVersion, '1.6.36');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, '3.0.0-alpha.5.100');
  assert.equal(row?.releaseSha, '478fcd368734b1cf1aa5a98932cb34bb29f1d1e4');
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1540);
  assert.equal(row?.commentId, 5553562006);
}

const captureSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
const sanitizerStart = captureSource.indexOf('  const sanitizeStatus = (value) => {');
const sanitizerEnd = captureSource.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P67 sanitizer boundary missing');
const sanitizer = captureSource.slice(sanitizerStart, sanitizerEnd);
assert.ok(sanitizer.includes("'defaultRoutingStrategy','blockApiTraining'"), 'P67 sanitizer must retain only the exact no-training source field addition');
assert.equal(sanitizer.includes('providerCompliancePolicy'), false, 'P67 must not retain raw provider compliance policy');
assert.equal(sanitizer.includes('providerCacheControlMode'), false, 'P67 must not widen capture to unrelated cache policy mode');
assert.equal((sanitizer.match(/blockApiTraining/g) || []).length, 1, 'P67 sanitizer should add one bounded blockApiTraining allowlist entry');

const sourceFile = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const helperStart = sourceFile.indexOf('function devPassNoAiTrainingTruth(raw) {');
const helperEnd = sourceFile.indexOf('function normalizeIndependentDevPassStatus(payload) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P67 pure no-training helper boundary missing');
const helperSource = sourceFile.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__truth=devPassNoAiTrainingTruth;`, sandbox);
const truth = value => JSON.parse(JSON.stringify(sandbox.__truth(value)));
assert.deepEqual(truth({blockApiTraining:true}), {state:'enabled',source:'/dev-plans/status.blockApiTraining'});
assert.deepEqual(truth({blockApiTraining:false}), {state:'disabled',source:'/dev-plans/status.blockApiTraining'});
for (const raw of [{}, {blockApiTraining:null}, {blockApiTraining:'true'}, {blockApiTraining:1}, {blockApiTraining:0}, null]) {
  assert.deepEqual(truth(raw), {state:'unknown',source:'unavailable'}, 'missing/non-boolean no-training evidence must stay UNKNOWN');
}
for (const marker of [
  'const noAiTraining = devPassNoAiTrainingTruth(raw);',
  'noAiTrainingState: noAiTraining.state',
  'noAiTrainingSource: noAiTraining.source',
  "out.noAiTrainingState !== 'unknown'",
  "noAiTrainingState: 'unknown'",
  "noAiTrainingSource: 'unavailable'",
]) assert.ok(sourceFile.includes(marker), `P67 normalized account truth missing: ${marker}`);
assert.equal(sourceFile.includes('providerCompliancePolicy'), false, 'P67 normalized source owner must not retain raw policy object');

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
for (const marker of [
  "devpassAccount?.noAiTrainingState === 'enabled' ? '사용'",
  "devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—'",
  '<span>AI 학습 차단</span>',
]) assert.ok(dashboard.includes(marker), `P67 DevPass account UI missing: ${marker}`);
const routingIndex = dashboard.indexOf('<span>Routing</span>');
const noTrainingIndex = dashboard.indexOf('<span>AI 학습 차단</span>');
const pendingIndex = dashboard.indexOf('<span>Pending tier</span>');
assert.ok(routingIndex >= 0 && noTrainingIndex > routingIndex && pendingIndex > noTrainingIndex, 'P67 no-training row must live after Routing in the existing account box');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function devPassNoAiTrainingDiagnosticText(account)',
  "account?.noAiTrainingState === 'enabled' ? 'enabled'",
  "account?.noAiTrainingState === 'disabled' ? 'disabled' : 'unknown'",
  "'/dev-plans/status.blockApiTraining'",
  '`DevPass no-AI-training: ${state} · source ${source}`',
  'devPassNoAiTrainingDiagnosticText(diagAccount)',
]) assert.ok(diagnostics.includes(marker), `P67 diagnostics marker missing: ${marker}`);

for (const path of [
  'plugins/usage-dashboard/src/14-request-ledger.part.js',
  'plugins/usage-dashboard/src/15-request-provenance.part.js',
]) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['blockApiTraining','noAiTrainingState','noAiTrainingSource']) {
    assert.equal(text.includes(forbidden), false, `P67 current account policy must not enter request owner ${path}: ${forbidden}`);
  }
}

const category = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
  'mapping?.providerId === providerId',
]) assert.ok(category.includes(marker), `P67 5.100 model fidelity must remain intact: ${marker}`);
assert.equal(category.includes('blockApiTraining'), false, 'P67 provider/model catalog must not infer account no-training state');
assert.equal(category.includes('noTraining'), false, 'P67 provider/model noTraining metadata must not become account truth');
assert.ok(diagnostics.includes('Model lifecycle fidelity:'), 'P67 5.100 lifecycle diagnostics must remain intact');

const p65 = fs.readFileSync('plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs', 'utf8');
assert.ok(p65.includes("if (release.productVersion !== '3.0.0-alpha.5.99')"), 'P67 P65 historical applicability must remain bounded');
const p66 = fs.readFileSync('plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.cjs', 'utf8');
assert.ok(p66.includes("if (release.productVersion !== '3.0.0-alpha.5.100')"), 'P67 P66 historical applicability/forward wrapper must remain bounded');
assert.ok(p66.includes('FORWARD-PRESERVED'), 'P67 P66 must preserve lifecycle checks on forward releases');
assert.ok(fs.existsSync('plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.legacy.js'), 'P67 original 5.100 P66 proof must remain byte-preserved as legacy source');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.101';",
  "const BUNDLED_ENGINE_VERSION = '1.6.36';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(manager.includes(marker), `P67 Manager authority missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs')).digest('hex');
const managerSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs')).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.plugin?.version, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.36');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('P67 DevPass No-AI-Training Status: OK · exact boolean tri-state · existing account capture · zero extra I/O owner · UI/Diagnostics · request identity unchanged · P65/P66 preserved');
