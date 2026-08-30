'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
if (release.productVersion !== '3.0.0-alpha.5.95') {
  console.log(`P61 Catalog-Pinned Request Model Category Fidelity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.95`);
  process.exit(0);
}
// UD_HISTORICAL_VERSION_LOCK
assert.equal(release.productVersion, '3.0.0-alpha.5.95');
assert.equal(release.engineVersion, '1.6.31');
assert.equal(release.managerVersion, '1.3.5');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.95.json', 'utf8'));
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedCliAuthority?.package, '@llmgateway/cli');
assert.equal(spec.managedCliAuthority?.version, '1.10.0');
assert.equal(spec.managedCliAuthority?.exact, true);
assert.equal(spec.managedModelCatalogVersion, '1.251.0');
assert.equal(spec.managedModelCatalogAuthority?.package, '@llmgateway/models');
assert.equal(spec.managedModelCatalogAuthority?.version, '1.251.0');
assert.equal(spec.managedModelCatalogAuthority?.exact, true);
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});

const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
for (const marker of [
  "const MANAGER_VERSION = '1.3.5';",
  "const PRODUCT_VERSION = '3.0.0-alpha.5.95';",
  "const BUNDLED_ENGINE_VERSION = '1.6.31';",
  "const MANAGED_CLI_VERSION = '1.10.0';",
  "const MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
  '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
  'catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE',
  'catalogVersion:MANAGED_MODEL_CATALOG_VERSION',
  'catalogEntry:verified.catalogEntry',
  "cliCatalogState:'ready'",
]) assert.ok(manager.includes(marker), `5.95 Manager pair contract missing: ${marker}`);
for (const forbidden of ['^1.251.0','~1.251.0','latest']) assert.equal(manager.includes(forbidden), false, `catalog authority must remain exact: ${forbidden}`);
assert.ok(manager.includes("fs.renameSync(stage, MANAGED_CLI_VERSION_ROOT);"), 'atomic stage promotion must remain');
assert.ok(manager.includes('quarantine'), 'existing quarantine/rollback semantics must remain');
assert.ok(manager.includes("packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION"), 'wrong catalog package/version must fail READY');
assert.ok(manager.includes("!pathInside(catalogRoot, catalogEntry) || !pathInside(rootReal, catalogEntry)"), 'escaped catalog entry must fail READY');

const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
for (const marker of [
  "const VERSION = '1.6.31';",
  "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
  "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
  "const MODEL_CATALOG_VERSION = '1.251.0';",
  "import { pathToFileURL } from 'node:url';",
]) assert.ok(engineCore.includes(marker), `5.95 Engine catalog authority missing: ${marker}`);

const engineCli = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
for (const marker of [
  "descriptor?.catalogPackage !== MODEL_CATALOG_PACKAGE",
  "descriptor?.catalogVersion !== MODEL_CATALOG_VERSION",
  "packageJson?.name !== MODEL_CATALOG_PACKAGE || packageJson?.version !== MODEL_CATALOG_VERSION",
  'modelCatalogEntry',
  "modelCatalogState:'ready'",
]) assert.ok(engineCli.includes(marker), `5.95 Engine pair verifier missing: ${marker}`);

const categorySource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/45-model-category.part.mjs', 'utf8');
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']) {
  assert.equal(categorySource.includes(forbidden), false, `model-category enrichment must be local-only: ${forbidden}`);
}
for (const marker of [
  'function normalizeModelCategoryId(usedModel)',
  'function buildModelCategoryMap(models)',
  'function classifyModelCategoryFromMap(usedModel, catalogMap)',
  "inputPrice >= 5e-6",
  "outputPrice >= 15e-6",
  "modelCategory:'unknown',modelCategorySource:'unknown'",
  "modelCategorySource:'llmgateway-model-catalog'",
  'await import(pathToFileURL(runtime.modelCatalogEntry).href)',
  'const loadAccountCaptureBeforeModelCategory = loadAccountCapture;',
  'const normalizeCapturedRecentLogsBeforeModelCategory = normalizeCapturedRecentLogs;',
]) assert.ok(categorySource.includes(marker), `5.95 category implementation missing: ${marker}`);

const helperStart = categorySource.indexOf('function normalizeModelCategoryId(usedModel)');
const helperEnd = categorySource.indexOf('async function ensureModelCategoryCatalog()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '5.95 pure classifier helper boundary missing');
const helper = categorySource.slice(helperStart, helperEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helper}\nthis.__category={normalizeModelCategoryId,buildModelCategoryMap,classifyModelCategoryFromMap};`, sandbox);
const {normalizeModelCategoryId, buildModelCategoryMap, classifyModelCategoryFromMap} = sandbox.__category;
assert.equal(normalizeModelCategoryId('anthropic/claude-premium:global'), 'claude-premium');
assert.equal(normalizeModelCategoryId('claude-premium:us-east'), 'claude-premium');
assert.equal(normalizeModelCategoryId('openai/gpt-regular'), 'gpt-regular');
assert.equal(normalizeModelCategoryId(''), '');

const map = buildModelCategoryMap([
  {id:'claude-premium',providers:[{inputPrice:'0.000005',outputPrice:'0.000001'}]},
  {id:'output-premium',providers:[{inputPrice:'0.000001',outputPrice:'0.000015'}]},
  {id:'gpt-regular',providers:[{inputPrice:'0.0000049',outputPrice:'0.0000149'}]},
  {id:'invalid-pricing',providers:[{inputPrice:'NaN',outputPrice:'wat'}]},
  {id:'no-pricing',providers:[]},
]);
assert.equal(classifyModelCategoryFromMap('anthropic/claude-premium:global', map).modelCategory, 'premium');
assert.equal(classifyModelCategoryFromMap('provider/output-premium', map).modelCategory, 'premium');
assert.equal(classifyModelCategoryFromMap('provider/gpt-regular:region', map).modelCategory, 'regular');
assert.equal(classifyModelCategoryFromMap('provider/invalid-pricing', map).modelCategory, 'regular', 'invalid pricing alone must not create Premium');
assert.equal(classifyModelCategoryFromMap('provider/no-pricing', map).modelCategory, 'regular', 'exact member without threshold-crossing explicit price is Regular');
assert.deepEqual(JSON.parse(JSON.stringify(classifyModelCategoryFromMap('provider/not-in-catalog', map))), {modelCategory:'unknown',modelCategorySource:'unknown'}, 'catalog miss must remain UNKNOWN');
assert.deepEqual(JSON.parse(JSON.stringify(classifyModelCategoryFromMap('premium-looking-name', map))), {modelCategory:'unknown',modelCategorySource:'unknown'}, 'model name must never infer Premium');

const provenance = fs.readFileSync('plugins/usage-dashboard/src/15-request-provenance.part.js', 'utf8');
for (const marker of [
  "return ['premium','regular','unknown'].includes(text) ? text : 'unknown';",
  "if (category === 'premium') return 'Premium';",
  "if (category === 'regular') return 'Regular';",
  "return '?';",
  'function preferKnownModelCategory',
  'function requestModelCategoryStats',
  'function categoryPair(row)',
  'function mergeCategory(row, current)',
]) assert.ok(provenance.includes(marker), `Plugin category helper provenance missing: ${marker}`);

const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
for (const marker of [
  'const cat=categoryPair(row);',
  'const modelCategoryTruth=mergeCategory(row,current);',
  'modelCategory:modelCategoryTruth.modelCategory',
  'modelCategorySource:modelCategoryTruth.modelCategorySource',
  'requestModelCategoryText(row)',
]) assert.ok(ledger.includes(marker), `Plugin category ledger binding missing: ${marker}`);
assert.equal(ledger.includes('function requestModelCategoryValue(value)'), false, 'category helper implementation must stay out of the bounded ledger owner');
assert.ok(fs.statSync('plugins/usage-dashboard/src/14-request-ledger.part.js').size <= 37 * 1024, 'request ledger owner must remain within the 37 KiB hard ceiling');
const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('function collectRecentRequestLedger(data)', keyStart);
const keySource = ledger.slice(keyStart, keyEnd);
assert.equal(keySource.includes('modelCategory'), false, 'category/source must never change request dedupe identity');
assert.equal(keySource.includes('modelCategorySource'), false, 'category source must never change request dedupe identity');

const bridgeIo = fs.readFileSync('plugins/usage-dashboard/src/20-bridge-io.part.js', 'utf8');
assert.ok(bridgeIo.includes('cliCatalogState:'), 'Manager catalog status must be bounded into Plugin diagnostics');
assert.ok(bridgeIo.includes('cliCatalogVersion:'), 'Manager catalog version must be bounded into Plugin diagnostics');

const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
for (const marker of [
  'Model category catalog:',
  'Model category fidelity:',
  '@llmgateway/models 1.251.0',
  'Premium ${stats.premium} · Regular ${stats.regular} · Unknown ${stats.unknown}',
]) assert.ok(diagnostics.includes(marker), `5.95 diagnostics missing: ${marker}`);
for (const forbidden of ['inputPrice','outputPrice','providers:[','modelCatalogEntry']) assert.equal(diagnostics.includes(forbidden), false, `raw catalog/pricing must not reach diagnostics: ${forbidden}`);

const p60 = fs.readFileSync('plugins/usage-dashboard/tests/p60-compact-authoritative-cost-drivers.cjs', 'utf8');
assert.ok(p60.includes("if (release.productVersion !== '3.0.0-alpha.5.94')"), 'P60 must be exact historical applicability on 5.95');
assert.ok(p60.includes('UD_HISTORICAL_VERSION_LOCK'), 'P60 stale Product assertion must be explicitly historical');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
// UD_HISTORICAL_VERSION_LOCK
assert.equal(manifest.productVersion, '3.0.0-alpha.5.95');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.31');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.5');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.95');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.251.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P61 Catalog-Pinned Request Model Category Fidelity: OK · Product 5.95 · Engine 1.6.31 ${engineSha.slice(0,12)} · Manager 1.3.5 ${managerSha.slice(0,12)} · CLI 1.10.0 + Models 1.251.0 exact · Premium/Regular/UNKNOWN · no new I/O · ledger budget preserved`);
