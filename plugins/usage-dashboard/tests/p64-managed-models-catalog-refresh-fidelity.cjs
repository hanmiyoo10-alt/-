'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.98');
assert.equal(release.engineVersion, '1.6.34');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.98.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Managed Models 1.280.0 Catalog Refresh');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.managedCliAuthority?.exact, true);
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.package, '@llmgateway/models');
assert.equal(spec.managedModelCatalogAuthority?.version, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.exact, true);
assert.equal(spec.managedModelCatalogAuthority?.upstreamRepository, 'theopenco/llmgateway');
assert.equal(spec.managedModelCatalogAuthority?.upstreamCommit, 'fbb40efa41c379db5223dff708509b6dd82e05a9');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});

const evidenceView = release.evidenceView;
assert.equal(evidenceView.mode, 'structured');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = evidenceView[role];
  assert.equal(row.productVersion, '3.0.0-alpha.5.97');
  assert.equal(row.releaseSha, 'ef4686126addf26eac07b1d4c3e047e2dfacaaae');
  assert.equal(row.verdict, 'accepted');
  assert.equal(row.issue, 960);
  assert.equal(row.commentId, 5475876406);
}

const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
for (const marker of [
  "const VERSION = '1.6.34';",
  "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
  "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(engineCore.includes(marker), `5.98 Engine identity missing: ${marker}`);
assert.equal(engineCore.includes("const MODEL_CATALOG_VERSION = '1.251.0';"), false, 'old Models pin must be retired from active Engine core');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.98';",
  "const BUNDLED_ENGINE_VERSION = '1.6.34';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
  '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
  "packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION",
  'catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE',
  'catalogVersion:MANAGED_MODEL_CATALOG_VERSION',
  'catalogEntry:verified.catalogEntry',
]) assert.ok(manager.includes(marker), `5.98 Manager exact pair missing: ${marker}`);
for (const forbidden of ['^1.280.0','~1.280.0']) assert.equal(manager.includes(forbidden), false, `Models authority must remain exact: ${forbidden}`);
assert.ok(manager.includes('fs.renameSync(stage, MANAGED_CLI_VERSION_ROOT);'), 'atomic package-root promotion must remain');
assert.ok(manager.includes('quarantine'), 'existing rollback/quarantine semantics must remain');

const engineCli = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
for (const marker of [
  'descriptor?.catalogPackage !== MODEL_CATALOG_PACKAGE',
  'descriptor?.catalogVersion !== MODEL_CATALOG_VERSION',
  'packageJson?.name !== MODEL_CATALOG_PACKAGE || packageJson?.version !== MODEL_CATALOG_VERSION',
  'modelCatalogEntry',
  "modelCatalogState:'ready'",
]) assert.ok(engineCli.includes(marker), `5.98 Engine pair verifier missing: ${marker}`);

const categorySource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']) {
  assert.equal(categorySource.includes(forbidden), false, `catalog refresh must add no classifier I/O: ${forbidden}`);
}
for (const marker of [
  'function normalizeModelCategoryId(usedModel)',
  'function buildModelCategoryMap(models)',
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'inputPrice >= 5e-6',
  'outputPrice >= 15e-6',
  "modelCategory:'unknown',modelCategorySource:'unknown'",
  "modelCategorySource:'llmgateway-model-catalog'",
  'await import(pathToFileURL(runtime.modelCatalogEntry).href)',
]) assert.ok(categorySource.includes(marker), `5.98 classifier invariant missing: ${marker}`);

const helperStart = categorySource.indexOf('function normalizeModelCategoryId(usedModel)');
const helperEnd = categorySource.indexOf('async function ensureModelCategoryCatalog()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'pure classifier helper boundary missing');
const helper = categorySource.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helper}\nthis.__category={normalizeModelCategoryId,buildModelCategoryMap,classifyModelCategoryFromMap};`, sandbox);
const {normalizeModelCategoryId, buildModelCategoryMap, classifyModelCategoryFromMap} = sandbox.__category;
assert.equal(normalizeModelCategoryId('anthropic/claude-premium:global'), 'claude-premium');
assert.equal(normalizeModelCategoryId('openai/gpt-regular'), 'gpt-regular');
const map = buildModelCategoryMap([
  {id:'input-premium',providers:[{inputPrice:'0.000005',outputPrice:'0.000001'}]},
  {id:'output-premium',providers:[{inputPrice:'0.000001',outputPrice:'0.000015'}]},
  {id:'regular',providers:[{inputPrice:'0.0000049',outputPrice:'0.0000149'}]},
]);
assert.equal(classifyModelCategoryFromMap('provider/input-premium', map).modelCategory, 'premium');
assert.equal(classifyModelCategoryFromMap('provider/output-premium', map).modelCategory, 'premium');
assert.equal(classifyModelCategoryFromMap('provider/regular', map).modelCategory, 'regular');
assert.deepEqual(JSON.parse(JSON.stringify(classifyModelCategoryFromMap('provider/not-in-catalog', map))), {modelCategory:'unknown',modelCategorySource:'unknown'});

const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('function collectRecentRequestLedger(data)', keyStart);
assert.ok(keyStart >= 0 && keyEnd > keyStart, 'request identity helper boundary missing');
const keySource = ledger.slice(keyStart, keyEnd);
assert.equal(keySource.includes('modelCategory'), false, 'model category must remain enrichment-only');
assert.equal(keySource.includes('modelCategorySource'), false, 'model category source must remain outside request identity');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function runtimeIdentityVersionTruth(engineValue, managerValue)',
  'function managedRuntimeIdentityTruth(diagnostics)',
  'Bridge CLI runtime: ${bridgeCliRuntimeText(state.data?.bridge?.diagnostics)}',
  'Model category catalog: ${modelCategoryCatalogDiagnosticText(state.data?.bridge?.diagnostics)}',
  '@llmgateway/cli ${truth.cli.version',
  '@llmgateway/models ${truth.models.version',
]) assert.ok(diagnostics.includes(marker), `5.98 full diagnostics identity separation missing: ${marker}`);
assert.equal(diagnostics.includes('1.280.0'), false, 'Plugin diagnostics must derive Models identity instead of hardcoding 1.280.0');

const workspace = fs.readFileSync('plugins/usage-dashboard/src/62-diagnostics-workspace.part.js', 'utf8');
for (const marker of [
  'const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);',
  'modelVersion:truth.models.version',
  "CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}",
]) assert.ok(workspace.includes(marker), `5.98 compact diagnostics identity separation missing: ${marker}`);

const p61 = fs.readFileSync('plugins/usage-dashboard/tests/p61-catalog-pinned-request-model-category-fidelity.cjs', 'utf8');
assert.ok(p61.includes("if (release.productVersion !== '3.0.0-alpha.5.95')"), 'P61 historical classifier proof must remain frozen');
const p62 = fs.readFileSync('plugins/usage-dashboard/tests/p62-managed-runtime-diagnostic-identity-fidelity.cjs', 'utf8');
assert.ok(p62.includes("if (release.productVersion !== '3.0.0-alpha.5.96')"), 'P62 historical diagnostic identity proof must remain frozen');
const p63 = fs.readFileSync('plugins/usage-dashboard/tests/p63-credits-spend-composition-source-fidelity.cjs', 'utf8');
assert.ok(p63.includes("if (release.productVersion !== '3.0.0-alpha.5.97')"), 'P63 must become exact historical applicability on 5.98');
assert.ok(p63.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.97');"), 'P63 historical Product lock must be explicit');
assert.ok(p63.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(manifest.productVersion, '3.0.0-alpha.5.97');"), 'P63 historical manifest lock must be explicit');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_models_catalog_598.py', 'utf8');
assert.ok(materializer.includes('MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}'), '5.98 materializer must provide second-pass no-op proof');
assert.ok(materializer.includes('classifier source changed during catalog-only materialization'), '5.98 materializer must lock classifier source byte-neutrality');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.98');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.34');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.98');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P64 Managed Models Catalog Refresh Fidelity: OK · Product 5.98 · Engine 1.6.34 ${engineSha.slice(0,12)} · Manager 1.3.6 ${managerSha.slice(0,12)} · CLI 1.10.0 · Models 1.280.0 exact · classifier policy unchanged · E21 canonical evidence view · no new I/O`);
