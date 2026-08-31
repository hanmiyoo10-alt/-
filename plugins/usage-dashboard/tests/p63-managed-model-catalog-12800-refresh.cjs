'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.97');
assert.equal(release.engineVersion, '1.6.33');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.97.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Managed Models Catalog 1.280.0 Refresh');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.managedCliAuthority?.exact, true);
assert.equal(spec.managedCliAuthority?.tagCommit, '6b1cda1988f32010a9b090c00eb9b2fe672145fe');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.package, '@llmgateway/models');
assert.equal(spec.managedModelCatalogAuthority?.version, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.exact, true);
assert.equal(spec.managedModelCatalogAuthority?.tag, '@llmgateway/models@1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.tagCommit, 'fbb40efa41c379db5223dff708509b6dd82e05a9');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(Object.hasOwn(spec, 'verifiedBaseline'), false, '5.97 must not restore legacy baseline prose ownership');
assert.equal(Object.hasOwn(spec, 'latestInstalledEvidence'), false, '5.97 must not restore legacy latest-installed prose ownership');
assert.deepEqual(spec.releaseEvidence, {
  schemaVersion:1,
  acceptedBaseline:{
    productVersion:'3.0.0-alpha.5.96',
    releaseSha:'5fc75fbc0725962997f65de17db4ffaf156ba6f9',
    verdict:'accepted',
    issue:1012,
    commentId:5474037489,
  },
  latestInstalled:{
    productVersion:'3.0.0-alpha.5.96',
    releaseSha:'5fc75fbc0725962997f65de17db4ffaf156ba6f9',
    verdict:'accepted',
    issue:1012,
    commentId:5474037489,
  },
});

const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
for (const marker of [
  "const VERSION = '1.6.33';",
  "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
  "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(engineCore.includes(marker), `5.97 Engine package authority missing: ${marker}`);

const category = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function normalizeModelCategoryId(usedModel)',
  'function buildModelCategoryMap(models)',
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'inputPrice >= 5e-6',
  'outputPrice >= 15e-6',
  "modelCategory:'unknown',modelCategorySource:'unknown'",
  "modelCategorySource:'llmgateway-model-catalog'",
  'runtime?.modelCatalogVersion !== MODEL_CATALOG_VERSION',
  'modelCatalogVersion:MODEL_CATALOG_VERSION',
]) assert.ok(category.includes(marker), `5.97 classifier/catalog invariant missing: ${marker}`);
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']) {
  assert.equal(category.includes(forbidden), false, `5.97 catalog refresh must not add model-category I/O: ${forbidden}`);
}

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.97';",
  "const BUNDLED_ENGINE_VERSION = '1.6.33';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
  '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
  'catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE',
  'catalogVersion:MANAGED_MODEL_CATALOG_VERSION',
  "packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION",
  "!pathInside(catalogRoot, catalogEntry) || !pathInside(rootReal, catalogEntry)",
]) assert.ok(manager.includes(marker), `5.97 Manager exact-pair invariant missing: ${marker}`);
assert.equal(manager.includes("const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';"), false, 'Manager must retire the 1.251.0 current pin');
assert.equal(manager.includes("const MANAGED_CLI_VERSION = '1.10.0';"), true, 'CLI must stay pinned to 1.10.0');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function runtimeIdentityVersionTruth(engineValue, managerValue)',
  'function managedRuntimeIdentityTruth(diagnostics)',
  'const models = runtimeIdentityVersionTruth(runtime?.modelCatalogVersion, manager?.cliCatalogVersion);',
  "truth.models.state === 'mismatch'",
  '@llmgateway/models ${truth.models.version',
]) assert.ok(diagnostics.includes(marker), `5.97 disjoint diagnostic identity missing: ${marker}`);
assert.equal(diagnostics.includes('1.280.0'), false, 'Plugin diagnostic renderer must stay source-backed instead of owning the Models pin');

const workspace = fs.readFileSync('plugins/usage-dashboard/src/62-diagnostics-workspace.part.js', 'utf8');
for (const marker of [
  'const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);',
  'modelVersion:truth.models.version',
  'modelIdentityState:truth.models.state',
]) assert.ok(workspace.includes(marker), `5.97 compact Diagnostics identity sharing missing: ${marker}`);

const p62 = fs.readFileSync('plugins/usage-dashboard/tests/p62-managed-runtime-diagnostic-identity-fidelity.cjs', 'utf8');
assert.ok(p62.includes("if (release.productVersion !== '3.0.0-alpha.5.96')"), 'P62 must be exact historical applicability after 5.97');
assert.ok(p62.includes('UD_HISTORICAL_VERSION_LOCK'), 'P62 historical scope must be explicit');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_models_catalog_597.py', 'utf8');
for (const marker of [
  "BASE_CATALOG = '1.251.0'",
  "TARGET_CATALOG = '1.280.0'",
  "MODELS_TAG_SHA = 'fbb40efa41c379db5223dff708509b6dd82e05a9'",
  "MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}",
  "build_bridge_engine.cjs'), '--write'",
  "build_usage_dashboard.cjs'), '--write'",
]) assert.ok(materializer.includes(marker), `5.97 materializer invariant missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs')).digest('hex');
const managerSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs')).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.97');
assert.equal(manifest.components?.plugin?.version, '3.0.0-alpha.5.97');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.33');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.97');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P63 Managed Models Catalog 1.280.0 Refresh: OK · Product 5.97 · Engine 1.6.33 ${engineSha.slice(0,12)} · Manager 1.3.6 ${managerSha.slice(0,12)} · CLI 1.10.0 · Models 1.280.0 · E20 structured baseline 5.96 accepted · classifier truth preserved · no new I/O`);
