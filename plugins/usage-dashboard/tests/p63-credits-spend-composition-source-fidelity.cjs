'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');
const evidence = require('../tools/release_evidence_contract_e20.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.97');
assert.equal(release.engineVersion, '1.6.33');
assert.equal(release.managerVersion, '1.3.5');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.97.json','utf8'));
assert.equal(spec.releaseTitle, 'Credits Spend Composition Source Fidelity');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.251.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.creditsSpendCompositionContract?.window, '24h');
assert.equal(spec.creditsSpendCompositionContract?.usageCostSource, 'activity.creditsCost');
assert.equal(spec.creditsSpendCompositionContract?.dataStorageCostSource, 'activity.creditsDataStorageCost');
assert.equal(spec.creditsSpendCompositionContract?.missingValue, 'unknown');
assert.equal(spec.creditsSpendCompositionContract?.explicitZeroKnown, true);
assert.equal(spec.creditsSpendCompositionContract?.wholeWindowRequiresCompleteBuckets, true);
assert.equal(spec.creditsSpendCompositionContract?.totalRequiresBothComponents, true);
assert.equal(spec.creditsSpendCompositionContract?.sharesRequirePositiveCompleteTotal, true);
assert.equal(spec.creditsSpendCompositionContract?.newIo, false);
assert.equal(Object.hasOwn(spec,'verifiedBaseline'), false);
assert.equal(Object.hasOwn(spec,'latestInstalledEvidence'), false);
assert.deepEqual(evidence.inspectReleaseEvidence(spec.releaseEvidence,{required:true,targetProductVersion:release.productVersion}), []);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = spec.releaseEvidence[role];
  assert.equal(row.productVersion, '3.0.0-alpha.5.96');
  assert.equal(row.releaseSha, '5fc75fbc0725962997f65de17db4ffaf156ba6f9');
  assert.equal(row.verdict, 'accepted');
  assert.equal(row.issue, 1017);
}

const capture = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs','utf8');
for (const marker of ['creditsCost','creditsDataStorageCost']) assert.ok(capture.includes(marker), `existing activity capture must retain ${marker}`);

const engineSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs','utf8');
for (const marker of [
  'function explicitCreditsSpendComponent(row, key)',
  'function boundedCreditsSpendComposition(raw, range)',
  "explicitCreditsSpendComponent(row, 'creditsCost')",
  "explicitCreditsSpendComponent(row, 'creditsDataStorageCost')",
  "usageCostSource:usageKnown ? 'activity.creditsCost' : 'unknown'",
  "dataStorageCostSource:storageKnown ? 'activity.creditsDataStorageCost' : 'unknown'",
  'totalSpend:complete ? usageCost + dataStorageCost : null',
]) assert.ok(engineSource.includes(marker), `5.97 Engine source-fidelity marker missing: ${marker}`);
const engineHelperStart = engineSource.indexOf('function officialActivityRows(root)');
const engineHelperEnd = engineSource.indexOf('function normalizeCapturedRecentLogs(root)', engineHelperStart);
assert.ok(engineHelperStart >= 0 && engineHelperEnd > engineHelperStart, '5.97 Engine helper boundary missing');
const engineHelpers = engineSource.slice(engineHelperStart, engineHelperEnd);
for (const forbidden of ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/logs']) {
  assert.equal(engineHelpers.includes(forbidden), false, `5.97 composition helper must add no I/O: ${forbidden}`);
}
const engineSandbox = {};
vm.createContext(engineSandbox);
vm.runInContext(`${engineHelpers}\nthis.__creditsSpend=boundedCreditsSpendComposition;`, engineSandbox);
const creditsSpend = engineSandbox.__creditsSpend;
const clone = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(clone(creditsSpend({activity:[{creditsCost:1.25,creditsDataStorageCost:0.25},{creditsCost:0.5,creditsDataStorageCost:0}]},'24h')), {
  window:'24h',usageCost:1.75,dataStorageCost:0.25,totalSpend:2,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:true,
});
assert.deepEqual(clone(creditsSpend({activity:[{creditsCost:0,creditsDataStorageCost:0}]},'24h')), {
  window:'24h',usageCost:0,dataStorageCost:0,totalSpend:0,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:true,
}, 'explicit zero must remain known zero');
assert.deepEqual(clone(creditsSpend({activity:[{creditsCost:1,creditsDataStorageCost:0},{creditsCost:2}]},'24h')), {
  window:'24h',usageCost:3,dataStorageCost:null,totalSpend:null,usageCostSource:'activity.creditsCost',dataStorageCostSource:'unknown',complete:false,
}, 'incomplete bucket coverage must fail closed for the whole-window component');
assert.deepEqual(clone(creditsSpend({activity:[{creditsCost:-1,creditsDataStorageCost:0}]},'24h')), {
  window:'24h',usageCost:null,dataStorageCost:0,totalSpend:null,usageCostSource:'unknown',dataStorageCostSource:'activity.creditsDataStorageCost',complete:false,
});
assert.deepEqual(clone(creditsSpend({activity:[]},'24h')), {
  window:'24h',usageCost:null,dataStorageCost:null,totalSpend:null,usageCostSource:'unknown',dataStorageCostSource:'unknown',complete:false,
});
assert.equal(creditsSpend({activity:[{creditsCost:1,creditsDataStorageCost:2}]},'7d'), null, 'projection is deliberately bounded to 24h');

const pluginSource = fs.readFileSync('plugins/usage-dashboard/src/16-usage-analytics.part.js','utf8');
for (const marker of ['function normalizeCreditsSpendComposition(value)','function creditsSpendCompositionDiagnosticText(value)']) assert.ok(pluginSource.includes(marker), `5.97 Plugin marker missing: ${marker}`);
const pluginHelperStart = pluginSource.indexOf('function normalizeCreditsSpendComposition(value)');
const pluginHelperEnd = pluginSource.indexOf('function normalizeScopeActivity(raw)', pluginHelperStart);
const pluginSandbox = {};
vm.createContext(pluginSandbox);
vm.runInContext(`${pluginSource.slice(pluginHelperStart,pluginHelperEnd)}\nthis.__normalize=normalizeCreditsSpendComposition;`, pluginSandbox);
const normalize = pluginSandbox.__normalize;
assert.deepEqual(clone(normalize({window:'24h',usageCost:1,dataStorageCost:2,totalSpend:3,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:true})), {
  window:'24h',usageCost:1,dataStorageCost:2,totalSpend:3,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:true,
});
assert.deepEqual(clone(normalize({window:'24h',usageCost:1,dataStorageCost:2,totalSpend:99,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:true})), {
  window:'24h',usageCost:1,dataStorageCost:2,totalSpend:null,usageCostSource:'activity.creditsCost',dataStorageCostSource:'activity.creditsDataStorageCost',complete:false,
}, 'Plugin must fail closed on contradictory Engine total');

const analytics = fs.readFileSync('plugins/usage-dashboard/src/52-analytics-context.part.js','utf8');
for (const marker of ['Credits 비용 구성 · 24h','사용 비용','데이터 보관','총 비용','analyticsCreditsSpend?.complete']) assert.ok(analytics.includes(marker), `5.97 Credits Analytics card marker missing: ${marker}`);
assert.equal(analytics.includes('Savings'), false, '5.97 must not claim Credits-specific savings');
const markup = fs.readFileSync('plugins/usage-dashboard/src/54-dashboard-markup.part.js','utf8');
assert.ok(markup.includes('${analyticsCreditsSpendCard}'), '5.97 card must be mounted inside existing Analytics surface');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js','utf8');
assert.ok(diagnostics.includes('creditsSpendCompositionDiagnosticText(diagCreditsSpend)'), 'full Diagnostics must expose bounded composition truth');
const workspace = fs.readFileSync('plugins/usage-dashboard/src/62-diagnostics-workspace.part.js','utf8');
assert.ok(workspace.includes('creditsSpendCompositionDiagnosticText(model.creditsSpendComposition)'), 'compact Diagnostics must share the same composition truth');

const p62 = fs.readFileSync('plugins/usage-dashboard/tests/p62-managed-runtime-diagnostic-identity-fidelity.cjs','utf8');
assert.ok(p62.includes("if (release.productVersion !== '3.0.0-alpha.5.96')"), 'P62 must become exact historical applicability on 5.97');
assert.ok(p62.includes('UD_HISTORICAL_VERSION_LOCK'), 'P62 historical lock must be explicit');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_credits_spend_597.py','utf8');
assert.ok(materializer.includes('MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}'), '5.97 materializer must provide second-pass no-op proof');
assert.ok(materializer.includes("build_usage_dashboard.cjs','--write"), '5.97 must materialize Plugin bundle from modules');
assert.ok(materializer.includes("build_bridge_engine.cjs','--write"), '5.97 must materialize Engine bundle from modules');

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json','utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh')).digest('hex');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.97');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.33');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.5');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.97');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.251.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P63 Credits Spend Composition Source Fidelity: OK · Product 5.97 · Engine 1.6.33 ${engineSha.slice(0,12)} · Manager 1.3.5 ${managerSha.slice(0,12)} · explicit zero known · incomplete UNKNOWN · no new I/O`);
