'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.100');
assert.equal(release.engineVersion, '1.6.35');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.100.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Request Model Lifecycle Fidelity');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.package, '@llmgateway/models');
assert.equal(spec.managedModelCatalogAuthority?.version, '1.280.0');
assert.equal(spec.managedModelCatalogAuthority?.exact, true);
assert.equal(spec.managedModelCatalogAuthority?.upstreamRepository, 'theopenco/llmgateway');
assert.equal(spec.managedModelCatalogAuthority?.upstreamCommit, 'fbb40efa41c379db5223dff708509b6dd82e05a9');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_request_model_lifecycle_5100.py');
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.cjs');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, '3.0.0-alpha.5.99');
  assert.equal(row?.releaseSha, '91c3d11d6aa7d5299b701ff94956a230a07d4be2');
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1487);
  assert.equal(row?.commentId, 5552058215);
}

const categorySource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const marker of [
  'function normalizeModelCategoryId(usedModel)',
  'function buildModelCategoryMap(models)',
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  'function buildModelLifecycleMap(models)',
  'function modelLifecycleDateTruth(value)',
  'function unknownModelLifecycle()',
  'function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())',
  'const MODEL_LIFECYCLE_NOTICE_MS = 90 * 24 * 60 * 60 * 1000;',
  'mapping?.providerId === providerId',
  "modelLifecycleSource:'llmgateway-model-catalog'",
  '...classifyModelLifecycleFromMap(row?.model, row?.provider, modelLifecycleCatalogMap)',
]) assert.ok(categorySource.includes(marker), `P66 Engine lifecycle marker missing: ${marker}`);
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']) {
  assert.equal(categorySource.includes(forbidden), false, `P66 lifecycle owner must remain local-only: ${forbidden}`);
}

const helperStart = categorySource.indexOf('function normalizeModelCategoryId(usedModel)');
const helperEnd = categorySource.indexOf('async function ensureModelCategoryCatalog()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P66 pure Engine helper boundary missing');
const helperSource = categorySource.slice(helperStart, helperEnd);
const engineSandbox = {};
vm.createContext(engineSandbox);
vm.runInContext(`${helperSource}\nthis.__model={normalizeModelCategoryId,buildModelCategoryMap,classifyModelCategoryFromMap,buildModelLifecycleMap,modelLifecycleDateTruth,classifyModelLifecycleFromMap};`, engineSandbox);
const engine = engineSandbox.__model;

const now = Date.parse('2026-09-05T00:00:00.000Z');
const days = n => new Date(now + n * 24 * 60 * 60 * 1000);
const lifecycleMap = engine.buildModelLifecycleMap([
  {id:'active-model',providers:[{providerId:'exact-provider'}]},
  {id:'scheduled-model',providers:[{providerId:'exact-provider',deprecatedAt:days(-20),deactivatedAt:days(10)}]},
  {id:'deprecated-model',providers:[{providerId:'exact-provider',deprecatedAt:days(-20),deactivatedAt:days(120)}]},
  {id:'deactivated-model',providers:[{providerId:'exact-provider',deprecatedAt:days(-40),deactivatedAt:days(-1)}]},
  {id:'far-future-model',providers:[{providerId:'exact-provider',deactivatedAt:days(91)}]},
  {id:'invalid-model',providers:[{providerId:'exact-provider',deactivatedAt:'definitely-not-a-date'}]},
  {id:'ambiguous-model',providers:[
    {providerId:'exact-provider',deactivatedAt:days(20)},
    {providerId:'exact-provider',deactivatedAt:days(30)},
  ]},
]);
const classify = (model, provider = 'exact-provider') => JSON.parse(JSON.stringify(engine.classifyModelLifecycleFromMap(model, provider, lifecycleMap, now)));
assert.equal(classify('active-model').modelLifecycleStatus, 'active');
assert.equal(classify('scheduled-model').modelLifecycleStatus, 'scheduled', 'scheduled must beat deprecated inside 90-day notice');
assert.equal(classify('deprecated-model').modelLifecycleStatus, 'deprecated', 'deprecated must beat far-future deactivation');
assert.equal(classify('deactivated-model').modelLifecycleStatus, 'deactivated', 'deactivated must be highest urgency');
assert.equal(classify('far-future-model').modelLifecycleStatus, 'active', 'far-future deactivation outside 90 days remains active');
assert.equal(classify('scheduled-model').modelLifecycleDeactivatedAt, days(10).toISOString());
assert.equal(classify('deprecated-model').modelLifecycleDeprecatedAt, days(-20).toISOString());
for (const value of [
  classify('invalid-model'),
  classify('ambiguous-model'),
  classify('missing-model'),
  classify('active-model', 'wrong-provider'),
  classify('active-model', 'EXACT-PROVIDER'),
  classify(''),
]) assert.deepEqual(value, {
  modelLifecycleStatus:'unknown',
  modelLifecycleSource:'unknown',
  modelLifecycleDeprecatedAt:null,
  modelLifecycleDeactivatedAt:null,
}, 'missing/invalid/ambiguous/non-exact lifecycle evidence must fail closed');
assert.equal(classify('active-model').modelLifecycleSource, 'llmgateway-model-catalog');

const categoryMap = engine.buildModelCategoryMap([
  {id:'premium-model',providers:[{providerId:'exact-provider',inputPrice:'0.000005',outputPrice:'0.000001'}]},
  {id:'regular-model',providers:[{providerId:'exact-provider',inputPrice:'0.000001',outputPrice:'0.000001'}]},
]);
assert.equal(engine.classifyModelCategoryFromMap('provider/premium-model:region', categoryMap).modelCategory, 'premium', 'existing category normalization must remain intact');
assert.equal(engine.classifyModelCategoryFromMap('provider/regular-model', categoryMap).modelCategory, 'regular');
assert.equal(engine.classifyModelCategoryFromMap('provider/missing-model', categoryMap).modelCategory, 'unknown');

const provenance = fs.readFileSync('plugins/usage-dashboard/src/15-request-provenance.part.js', 'utf8');
for (const marker of [
  "return ['premium','regular','unknown'].includes(text) ? text : 'unknown';",
  'function requestModelLifecycleValue(value)',
  "return ['active','scheduled','deprecated','deactivated','unknown'].includes(text) ? text : 'unknown';",
  'function lifecyclePair(row)',
  'function mergeLifecycle(row, current)',
  'void current;',
  'function requestModelLifecycleText(row)',
  '모델 상태 ACTIVE',
  '모델 상태 종료 예정',
  '모델 상태 DEPRECATED',
  '모델 상태 DEACTIVATED',
  '모델 상태 —',
  'function requestModelLifecycleStats(rows)',
]) assert.ok(provenance.includes(marker), `P66 Plugin lifecycle marker missing: ${marker}`);

const pluginStart = provenance.indexOf('  function requestModelLifecycleValue(value)');
assert.ok(pluginStart >= 0, 'P66 Plugin lifecycle helper boundary missing');
const pluginSource = provenance.slice(pluginStart);
const pluginSandbox = {
  recentRequestValue(row, keys, fallback) {
    for (const key of keys) {
      if (row && Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    }
    return fallback;
  },
};
vm.createContext(pluginSandbox);
vm.runInContext(`${pluginSource}\nthis.__life={requestModelLifecycleValue,lifecyclePair,mergeLifecycle,requestModelLifecycleText,requestModelLifecycleStats};`, pluginSandbox);
const plugin = pluginSandbox.__life;
const known = {
  modelLifecycleStatus:'scheduled',
  modelLifecycleSource:'llmgateway-model-catalog',
  modelLifecycleDeprecatedAt:'2026-08-01T00:00:00.000Z',
  modelLifecycleDeactivatedAt:'2026-09-15T00:00:00.000Z',
};
assert.equal(plugin.requestModelLifecycleText(known), '모델 상태 종료 예정 · 2026-09-15');
assert.equal(plugin.lifecyclePair(known).modelLifecycleStatus, 'scheduled');
assert.equal(plugin.lifecyclePair({...known,modelLifecycleDeactivatedAt:'bad'}).modelLifecycleStatus, 'unknown', 'invalid lifecycle date must fail closed in Plugin');
assert.equal(plugin.lifecyclePair({...known,modelLifecycleSource:'inferred'}).modelLifecycleStatus, 'unknown', 'non-catalog source must fail closed');
const staleKnown = {...known,modelLifecycleStatus:'deactivated',modelLifecycleDeactivatedAt:'2026-08-30T00:00:00.000Z'};
const incomingUnknown = {modelLifecycleStatus:'unknown',modelLifecycleSource:'unknown'};
assert.equal(plugin.mergeLifecycle(incomingUnknown, staleKnown).modelLifecycleStatus, 'unknown', 'incoming UNKNOWN must replace stale known lifecycle truth');
const stats = JSON.parse(JSON.stringify(plugin.requestModelLifecycleStats([
  {modelLifecycleStatus:'active',modelLifecycleSource:'llmgateway-model-catalog'},
  known,
  {modelLifecycleStatus:'deprecated',modelLifecycleSource:'llmgateway-model-catalog',modelLifecycleDeprecatedAt:'2026-08-01'},
  staleKnown,
  incomingUnknown,
])));
assert.deepEqual(stats, {rows:5,active:1,scheduled:1,deprecated:1,deactivated:1,unknown:1});

const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
for (const marker of [
  'const lifecycle=lifecyclePair(row);',
  'modelLifecycleStatus:lifecycle.modelLifecycleStatus',
  'const modelLifecycleTruth=mergeLifecycle(row,current);',
  'modelLifecycleStatus:modelLifecycleTruth.modelLifecycleStatus',
  'modelLifecycleDeactivatedAt:modelLifecycleTruth.modelLifecycleDeactivatedAt',
  'requestModelLifecycleText(row)',
]) assert.ok(ledger.includes(marker), `P66 ledger lifecycle binding missing: ${marker}`);
assert.ok(fs.statSync('plugins/usage-dashboard/src/14-request-ledger.part.js').size <= 37 * 1024, 'P66 request ledger owner must remain within 37 KiB hard ceiling');
const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('function collectRecentRequestLedger(data)', keyStart);
assert.ok(keyStart >= 0 && keyEnd > keyStart, 'P66 request identity boundary missing');
const keySource = ledger.slice(keyStart, keyEnd);
for (const forbidden of ['modelLifecycleStatus','modelLifecycleSource','modelLifecycleDeprecatedAt','modelLifecycleDeactivatedAt']) {
  assert.equal(keySource.includes(forbidden), false, `P66 lifecycle must never enter request dedupe identity: ${forbidden}`);
}

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'function modelLifecycleFidelityDiagnosticText(rows)',
  'Model lifecycle fidelity:',
  'Active ${stats.active} · Scheduled ${stats.scheduled} · Deprecated ${stats.deprecated} · Deactivated ${stats.deactivated} · Unknown ${stats.unknown}',
  "source = (stats.active + stats.scheduled + stats.deprecated + stats.deactivated) > 0 ? 'llmgateway-model-catalog' : 'unknown'",
]) assert.ok(diagnostics.includes(marker), `P66 lifecycle diagnostics missing: ${marker}`);

const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
for (const marker of [
  "const VERSION = '1.6.35';",
  "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
  "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(engineCore.includes(marker), `P66 Engine authority missing: ${marker}`);

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.6';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.100';",
  "const BUNDLED_ENGINE_VERSION = '1.6.35';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
]) assert.ok(manager.includes(marker), `P66 Manager authority missing: ${marker}`);

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.100');
assert.equal(manifest.components?.plugin?.version, '3.0.0-alpha.5.100');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.35');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.100');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const p65 = fs.readFileSync('plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs', 'utf8');
assert.ok(p65.includes("if (release.productVersion !== '3.0.0-alpha.5.99')"), 'P65 must be frozen to exact historical applicability on 5.100');
assert.ok(p65.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.99');"), 'P65 historical release lock must be explicit');
assert.ok(p65.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(manifest.productVersion, '3.0.0-alpha.5.99');"), 'P65 historical manifest lock must be explicit');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_request_model_lifecycle_5100.py', 'utf8');
for (const marker of [
  'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}',
  "BASE_PRODUCT = '3.0.0-alpha.5.99'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.100'",
  "TARGET_ENGINE = '1.6.35'",
  "BASE_RELEASE_SHA = '91c3d11d6aa7d5299b701ff94956a230a07d4be2'",
  'lifecycle must not enter request identity',
]) assert.ok(materializer.includes(marker), `P66 materializer safety marker missing: ${marker}`);

console.log(`P66 Request Model Lifecycle Fidelity: OK · Product 5.100 · Engine 1.6.35 ${engineSha.slice(0,12)} · Manager 1.3.6 ${managerSha.slice(0,12)} · Models 1.280.0 exact · active/scheduled/deprecated/deactivated/UNKNOWN · 90-day pinned semantics · identity unchanged · no new I/O`);
