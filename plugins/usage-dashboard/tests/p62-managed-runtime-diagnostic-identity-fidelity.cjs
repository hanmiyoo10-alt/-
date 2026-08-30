'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.96');
assert.equal(release.engineVersion, '1.6.32');
assert.equal(release.managerVersion, '1.3.5');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.96.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Managed Runtime Diagnostic Identity Fidelity Repair');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.managedCliAuthority?.exact, true);
assert.equal(spec.managedModelCatalogVersion, '1.251.0');
assert.equal(spec.managedModelCatalogAuthority?.package, '@llmgateway/models');
assert.equal(spec.managedModelCatalogAuthority?.version, '1.251.0');
assert.equal(spec.managedModelCatalogAuthority?.exact, true);
assert.equal(spec.diagnosticIdentityContract?.disjointVersionFields, true);
assert.equal(spec.diagnosticIdentityContract?.engineManagerMismatch, 'fail-closed');
assert.equal(spec.diagnosticIdentityContract?.pluginCatalogVersionHardcode, false);
assert.equal(spec.diagnosticIdentityContract?.fullAndCompactShareTruth, true);
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});

const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
for (const marker of [
  "const VERSION = '1.6.32';",
  "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
  "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MODEL_CATALOG_VERSION = '1.251.0';",
]) assert.ok(engineCore.includes(marker), `5.96 Engine identity authority missing: ${marker}`);

const engineCli = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
for (const marker of [
  'state:runtime.state',
  'version:runtime.version',
  'cliVersion:runtime.version',
  'modelCatalogState:runtime.modelCatalogState',
  'modelCatalogVersion:runtime.modelCatalogVersion',
  'modelCatalogExpectedVersion:runtime.modelCatalogExpectedVersion',
]) assert.ok(engineCli.includes(marker), `5.96 Engine CLI diagnostic field missing: ${marker}`);

const categorySource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
assert.equal(categorySource.includes('return {...runtime, ...modelCategoryCatalogStatus};'), false, 'model catalog status must never overwrite generic CLI diagnostics');
assert.equal(categorySource.includes("Object.freeze({state:"), false, 'model catalog diagnostic status must not own generic state/version keys');
for (const marker of [
  "modelCatalogState:'unavailable'",
  "modelCatalogState:'ready'",
  'modelCatalogVersion:MODEL_CATALOG_VERSION',
  'modelCatalogExpectedVersion:MODEL_CATALOG_VERSION',
  'modelCatalogState:modelCategoryCatalogStatus.modelCatalogState',
  'modelCatalogVersion:modelCategoryCatalogStatus.modelCatalogVersion',
  'modelCatalogExpectedVersion:modelCategoryCatalogStatus.modelCatalogExpectedVersion',
]) assert.ok(categorySource.includes(marker), `5.96 namespaced model catalog status missing: ${marker}`);
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']) {
  assert.equal(categorySource.includes(forbidden), false, `5.96 diagnostic repair must not add model-category I/O: ${forbidden}`);
}
for (const classifierMarker of [
  'function normalizeModelCategoryId(usedModel)',
  'function buildModelCategoryMap(models)',
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  "inputPrice >= 5e-6",
  "outputPrice >= 15e-6",
  "modelCategory:'unknown',modelCategorySource:'unknown'",
  "modelCategorySource:'llmgateway-model-catalog'",
]) assert.ok(categorySource.includes(classifierMarker), `5.95 classifier semantics must remain: ${classifierMarker}`);

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function runtimeIdentityVersionTruth(engineValue, managerValue)',
  'function managedRuntimeIdentityTruth(diagnostics)',
  "const cli = runtimeIdentityVersionTruth(runtime?.cliVersion || runtime?.version, manager?.cliRuntimeVersion);",
  'const models = runtimeIdentityVersionTruth(runtime?.modelCatalogVersion, manager?.cliCatalogVersion);',
  "truth.cli.state === 'mismatch'",
  "truth.models.state === 'mismatch'",
  '@llmgateway/cli ${truth.cli.version',
  '@llmgateway/models ${truth.models.version',
  'Bridge CLI runtime: ${bridgeCliRuntimeText(state.data?.bridge?.diagnostics)}',
  'Model category catalog: ${modelCategoryCatalogDiagnosticText(state.data?.bridge?.diagnostics)}',
]) assert.ok(diagnostics.includes(marker), `5.96 shared diagnostic truth missing: ${marker}`);
assert.equal(diagnostics.includes('1.251.0'), false, 'Plugin diagnostic renderer must not hardcode the managed Models version');

const helperStart = diagnostics.indexOf('function runtimeIdentityVersionTruth(engineValue, managerValue)');
const helperEnd = diagnostics.indexOf('function managedRuntimeIdentityTruth(diagnostics)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '5.96 pure runtime identity helper boundary missing');
const helper = diagnostics.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helper}\nthis.__versionTruth=runtimeIdentityVersionTruth;`, sandbox);
const versionTruth = sandbox.__versionTruth;
assert.deepEqual(JSON.parse(JSON.stringify(versionTruth('1.10.0', '1.10.0'))), {state:'known',version:'1.10.0',engine:'1.10.0',manager:'1.10.0'});
assert.deepEqual(JSON.parse(JSON.stringify(versionTruth('1.10.0', ''))), {state:'known',version:'1.10.0',engine:'1.10.0',manager:''});
assert.deepEqual(JSON.parse(JSON.stringify(versionTruth('', '1.10.0'))), {state:'known',version:'1.10.0',engine:'',manager:'1.10.0'});
assert.deepEqual(JSON.parse(JSON.stringify(versionTruth('1.10.0', '1.251.0'))), {state:'mismatch',version:'',engine:'1.10.0',manager:'1.251.0'}, 'component version disagreement must fail closed instead of selecting one source');
assert.deepEqual(JSON.parse(JSON.stringify(versionTruth('', ''))), {state:'unknown',version:'',engine:'',manager:''});

const workspace = fs.readFileSync('plugins/usage-dashboard/src/62-diagnostics-workspace.part.js', 'utf8');
for (const marker of [
  'const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);',
  'identityState:truth.cli.state',
  'modelVersion:truth.models.version',
  'modelIdentityState:truth.models.state',
  "CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}",
  "CLI ${esc(model.cli.version || '—')} · Models ${esc(model.cli.modelVersion || '—')} · ${esc(model.cli.state)}",
  "if (cli.identityState === 'mismatch') issues.push('CLI identity mismatch');",
  "if (cli.modelIdentityState === 'mismatch') issues.push('Models identity mismatch');",
]) assert.ok(workspace.includes(marker), `5.96 compact diagnostics must share the same identity truth: ${marker}`);
assert.equal(workspace.includes('Managed CLI ${model.cli.version'), false, 'legacy compact generic CLI version projection must be retired');

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.5';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.96';",
  "const BUNDLED_ENGINE_VERSION = '1.6.32';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
  '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
  "packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION",
  "!pathInside(catalogRoot, catalogEntry) || !pathInside(rootReal, catalogEntry)",
]) assert.ok(manager.includes(marker), `5.96 Manager pair/provisioning invariant missing: ${marker}`);

const p61 = fs.readFileSync('plugins/usage-dashboard/tests/p61-catalog-pinned-request-model-category-fidelity.cjs', 'utf8');
assert.ok(p61.includes("if (release.productVersion !== '3.0.0-alpha.5.95')"), 'P61 must be exact historical applicability on 5.96');
assert.ok(p61.includes('UD_HISTORICAL_VERSION_LOCK'), 'P61 stale Product assertion must be explicitly historical');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_diagnostic_identity_596.py', 'utf8');
assert.ok(materializer.includes("MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}"), '5.96 materializer must provide target second-pass no-op proof');
assert.equal(materializer.includes("build_bridge_engine.cjs'), '--write'"), true, '5.96 Engine source change must materialize generated Engine bytes');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.96');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.32');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.5');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.96');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.251.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P62 Managed Runtime Diagnostic Namespace & Identity Fidelity: OK · Product 5.96 · Engine 1.6.32 ${engineSha.slice(0,12)} · Manager 1.3.5 ${managerSha.slice(0,12)} · CLI 1.10.0 · Models 1.251.0 · disjoint identity · mismatch fail-closed · full/compact shared truth · no new I/O`);
