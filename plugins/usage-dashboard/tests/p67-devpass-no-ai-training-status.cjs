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
assert.equal(spec.authority?.featureIssue, 1598);
assert.equal(spec.authority?.designPullRequest, 1600);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_devpass_no_ai_training_5101.py', 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.100'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.101'",
  "TARGET_ENGINE = '1.6.36'",
  "MANAGER_VER = '1.3.6'",
  "BASE_RELEASE_SHA = '478fcd368734b1cf1aa5a98932cb34bb29f1d1e4'",
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

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P67 DevPass No-AI-Training Status: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

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

const capture = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
const sanitizerStart = capture.indexOf('  const sanitizeStatus = (value) => {');
const sanitizerEnd = capture.indexOf('  const sanitizeModel = (row) => {', sanitizerStart);
assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart, 'P67 sanitizer boundary missing');
const sanitizer = capture.slice(sanitizerStart, sanitizerEnd);
assert.ok(sanitizer.includes("'defaultRoutingStrategy','blockApiTraining'"));
assert.equal((sanitizer.match(/blockApiTraining/g) || []).length, 1);
assert.equal(sanitizer.includes('providerCompliancePolicy'), false);
assert.equal(sanitizer.includes('providerCacheControlMode'), false);

const sources = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const helperStart = sources.indexOf('function devPassNoAiTrainingTruth(raw) {');
const helperEnd = sources.indexOf('function normalizeIndependentDevPassStatus(payload) {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P67 pure helper boundary missing');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${sources.slice(helperStart, helperEnd)}\nthis.truth=devPassNoAiTrainingTruth;`, sandbox);
const truth = value => JSON.parse(JSON.stringify(sandbox.truth(value)));
assert.deepEqual(truth({blockApiTraining:true}), {state:'enabled',source:'/dev-plans/status.blockApiTraining'});
assert.deepEqual(truth({blockApiTraining:false}), {state:'disabled',source:'/dev-plans/status.blockApiTraining'});
for (const raw of [{}, {blockApiTraining:null}, {blockApiTraining:'true'}, {blockApiTraining:1}, {blockApiTraining:0}, null]) {
  assert.deepEqual(truth(raw), {state:'unknown',source:'unavailable'});
}
for (const marker of [
  'const noAiTraining = devPassNoAiTrainingTruth(raw);',
  'noAiTrainingState: noAiTraining.state',
  'noAiTrainingSource: noAiTraining.source',
  "out.noAiTrainingState !== 'unknown'",
  "noAiTrainingState: 'unknown'",
  "noAiTrainingSource: 'unavailable'",
]) assert.ok(sources.includes(marker), `P67 normalized truth missing: ${marker}`);

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.ok(dashboard.includes("devpassAccount?.noAiTrainingState === 'enabled' ? '사용'"));
assert.ok(dashboard.includes("devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—'"));
assert.ok(dashboard.includes('<span>AI 학습 차단</span>'));
assert.ok(dashboard.indexOf('<span>Routing</span>') < dashboard.indexOf('<span>AI 학습 차단</span>'));
assert.ok(dashboard.indexOf('<span>AI 학습 차단</span>') < dashboard.indexOf('<span>Pending tier</span>'));

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function devPassNoAiTrainingDiagnosticText(account)',
  "account?.noAiTrainingState === 'enabled' ? 'enabled'",
  "account?.noAiTrainingState === 'disabled' ? 'disabled' : 'unknown'",
  "'/dev-plans/status.blockApiTraining'",
  'DevPass no-AI-training:',
  'devPassNoAiTrainingDiagnosticText(diagAccount)',
  'Model lifecycle fidelity:',
]) assert.ok(diagnostics.includes(marker), `P67 diagnostics/fidelity marker missing: ${marker}`);

for (const path of ['plugins/usage-dashboard/src/14-request-ledger.part.js','plugins/usage-dashboard/src/15-request-provenance.part.js']) {
  const text = fs.readFileSync(path, 'utf8');
  for (const forbidden of ['blockApiTraining','noAiTrainingState','noAiTrainingSource']) assert.equal(text.includes(forbidden), false);
}

const category = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
  'mapping?.providerId === providerId',
]) assert.ok(category.includes(marker), `P67 5.100 model fidelity missing: ${marker}`);
assert.equal(category.includes('blockApiTraining'), false);

const p66 = fs.readFileSync('plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.cjs', 'utf8');
assert.ok(p66.includes("if (release.productVersion !== '3.0.0-alpha.5.100')"));
assert.ok(p66.includes('FORWARD-PRESERVED'));
assert.ok(fs.existsSync('plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.legacy.js'));

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
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.36');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log('P67 DevPass No-AI-Training Status: OK · exact boolean tri-state · existing account capture · zero extra I/O owner · UI/Diagnostics · request identity unchanged · E21 evidenceView · P66 preserved');
