'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {runDashboard} = require('./harness/dashboard-process.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const baselineVersion = '3.0.0-alpha.5.66';
const baselineEngineVersion = '1.6.19';
const baselineEngineSha = 'f17d689f39bd469bcadf1a2125313146cd6e04cb38299a5b4583d903a696cf09';
const baselineManagerSha = '9f3530b882ecea7b9e0d407c7831c44487f218b5db9210a6709158a6315c36c0';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const json = relative => JSON.parse(fs.readFileSync(`${root}/${relative}`, 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

const currentRelease = assertCurrentReleaseArtifacts();
const targetVersion = currentRelease.productVersion;
const modularizationRelease = targetVersion === '3.0.0-alpha.5.69';
if (!['3.0.0-alpha.5.67','3.0.0-alpha.5.68','3.0.0-alpha.5.69'].includes(targetVersion)) {
  console.log(`P29 Diagnostics Workspace Separation: SKIP · candidate ${targetVersion} is outside the locked Diagnostics workspace lineage`);
  process.exit(0);
}

const expectedEngineVersion = modularizationRelease ? '1.6.20' : baselineEngineVersion;
assert.equal(currentRelease.engineVersion, expectedEngineVersion);
assert.equal(currentRelease.managerVersion, '1.3.0');
assert.equal(currentRelease.snapshotContract, 1);
assert.equal(currentRelease.recentRequestContract, 1);

const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const manifest = json('runtime/product-manifest.json');
const {PARTS} = require('../src/parts.cjs');

const engineSha = sha256(engine);
if (modularizationRelease) {
  const normalizedEngine = engine.toString('utf8').replace(
    "const VERSION = '1.6.20';",
    "const VERSION = '1.6.19';",
  );
  assert.equal(sha256(Buffer.from(normalizedEngine, 'utf8')), baselineEngineSha, '5.69 Engine must preserve Diagnostics-era runtime bytes beyond the Engine VERSION literal');
} else {
  assert.equal(engineSha, baselineEngineSha, 'Diagnostics-only release must keep the 5.66 Engine artifact byte-identical');
}
let normalizedManager = manager.replace(
  `const PRODUCT_VERSION = '${targetVersion}';`,
  `const PRODUCT_VERSION = '${baselineVersion}';`,
);
if (modularizationRelease) {
  normalizedManager = normalizedManager
    .replace("const BUNDLED_ENGINE_VERSION = '1.6.20';", "const BUNDLED_ENGINE_VERSION = '1.6.19';")
    .replace(`const BUNDLED_ENGINE_SHA256 = '${engineSha}';`, `const BUNDLED_ENGINE_SHA256 = '${baselineEngineSha}';`);
}
assert.ok(normalizedManager.includes(`const PRODUCT_VERSION = '${baselineVersion}';`));
assert.equal(sha256(normalizedManager), baselineManagerSha, 'Manager functional body may change only by release and bundled-Engine identity synchronization');
assert.equal(manifest.components.bridge.requiredVersion, expectedEngineVersion);
assert.equal(manifest.components.bridgeManager.version, '1.3.0');
assert.equal(manifest.components.bridgeManager.productVersion, targetVersion);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.equal(PARTS.length, 23);
assert.ok(PARTS.some(part => part.file === '62-diagnostics-workspace.part.js'));

for (const marker of [
  'Basic · Detailed · Full Copy',
  'diagnostics-mode-basic',
  'diagnostics-mode-detailed',
  'copy-diag-summary',
  '전체 Diagnostics 복사',
  'Runtime & Update',
  'Bridge & Managed CLI',
  'Snapshot & Performance',
  'Cache & Secondary Refresh',
  'Data Fidelity & Request Ledger',
  'Scheduler, UI & Recovery',
  "state.diagnosticsMode = next;",
  'await persist();',
]) assert.ok(workspace.includes(marker), `missing Diagnostics workspace marker: ${marker}`);

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction, 'Basic model function boundary missing');
assert.equal(basicFunction[1].includes('diagText('), false, 'Basic mode must not generate full Diagnostics');
assert.ok(workspace.includes("for (const line of diagText().split('\\n'))"), 'Detailed mode must lazily group the existing full Diagnostics evidence');
for (const forbidden of ['nativeFetch(', 'enqueueRefresh(', 'scheduleRefresh(', 'runCli(', 'setInterval(', 'setTimeout(']) {
  assert.equal(workspace.includes(forbidden), false, `Diagnostics workspace must not add runtime I/O or polling: ${forbidden}`);
}
for (const label of [
  'Bridge snapshot attribution:',
  'Bridge CLI operations:',
  'Bridge CLI runtime:',
  'Cache observer:',
  'Request fidelity:',
  'Refresh phase duration:',
  'Stable readiness:',
  'Request outcome taxonomy:',
]) assert.ok(source.includes(label), `full Diagnostics compatibility label missing: ${label}`);

function state(extra = {}) {
  return {
    bridgeBase:'http://127.0.0.1:39117',
    bridgeEnabled:true,
    bridgeStatus:'connected',
    refreshMs:0,
    backgroundPause:false,
    syncOnFocus:false,
    performanceGuard:false,
    adaptiveRefresh:false,
    schedulerEnabled:false,
    staleAfterMs:0,
    stalePolicyV37Migrated:true,
    widgetVisible:false,
    dashboardView:'settings',
    refreshCount:0,
    consecutiveFailures:0,
    ...extra,
  };
}

function snapshot() {
  const value = clone(json('tests/fixtures/p1-bridge-contract.json'));
  value.activity = {
    totalRequests:1,
    totalCost:0.1,
    totalTokens:10,
    errorRate:0,
    source:'p29-diagnostics-workspace',
  };
  value.bridgeManager = {
    managed:true,
    selfUpdate:true,
    engineManaged:true,
    managementProtocol:'bridge-manager-v1',
    version:'1.3.0',
    productVersion:targetVersion,
  };
  return value;
}

async function runMode(mode) {
  const initial = state(mode ? {diagnosticsMode:mode} : {});
  return runDashboard({
    state:initial,
    token:'p29-diagnostics-fixture-token',
    snapshot:snapshot(),
    captureSettingsViews:true,
    captureRefreshViews:true,
    waitFor:'views',
    expectedViews:1,
    timeoutMs:5_000,
  });
}

(async () => {
  const basic = await runMode('');
  const detailed = await runMode('detailed');
  const basicView = basic.views.find(row => String(row.reason || '').startsWith('refresh:init:'));
  const detailedView = detailed.views.find(row => String(row.reason || '').startsWith('refresh:init:'));
  assert.ok(basicView && !basicView.error, `Basic Diagnostics view missing: ${basicView?.error || 'not captured'}`);
  assert.ok(detailedView && !detailedView.error, `Detailed Diagnostics view missing: ${detailedView?.error || 'not captured'}`);

  assert.equal(basic.state.diagnosticsMode, 'basic', 'preference-free state must hydrate to Basic');
  assert.equal(detailed.state.diagnosticsMode, 'detailed', 'Detailed preference must survive state hydration and refresh persistence');
  assert.ok(basicView.html.includes('id="diagnostics-mode-basic" class="active"'));
  assert.ok(basicView.html.includes('<span>Status</span>'));
  assert.ok(basicView.html.includes('<span>Last refresh</span>'));
  assert.ok(basicView.html.includes('<span>Data</span>'));
  assert.ok(basicView.html.includes('<span>Updater</span>'));
  assert.equal(basicView.html.includes('Snapshot &amp; Performance'), false, 'Basic mode must not render Detailed sections');
  assert.equal(basicView.html.includes('Bridge snapshot cache decisions:'), false, 'Basic mode must not eagerly render full Diagnostics lines');

  for (const section of [
    'Runtime &amp; Update',
    'Bridge &amp; Managed CLI',
    'Snapshot &amp; Performance',
    'Cache &amp; Secondary Refresh',
    'Data Fidelity &amp; Request Ledger',
    'Scheduler, UI &amp; Recovery',
  ]) assert.ok(detailedView.html.includes(section), `Detailed section missing: ${section}`);
  for (const label of ['Bridge snapshot attribution:', 'Bridge CLI runtime:', 'Cache observer:', 'Request fidelity:', 'Stable readiness:']) {
    assert.ok(detailedView.html.includes(label), `Detailed view lost existing evidence: ${label}`);
    assert.ok(basicView.diag.includes(label), `Basic-mode Full Copy lost existing evidence: ${label}`);
    assert.ok(detailedView.diag.includes(label), `Detailed-mode Full Copy lost existing evidence: ${label}`);
  }

  const fetchShape = run => run.fetches.map(row => `${row.method} ${row.url.replace(/\?.*$/, '')}`);
  assert.deepEqual(fetchShape(detailed), fetchShape(basic), 'Detailed presentation must not add Bridge/network calls');
  assert.equal(basic.fetches.filter(row => row.url.includes('/snapshot')).length, 1);
  assert.equal(detailed.fetches.filter(row => row.url.includes('/snapshot')).length, 1);
  assert.equal(basic.state.refreshCount, detailed.state.refreshCount, 'Diagnostics mode must not change refresh execution count');
  assert.equal(basic.state.bridgeStatus, detailed.state.bridgeStatus, 'Diagnostics mode must not change Bridge lifecycle state');
  assert.ok(!JSON.stringify(basic).includes('p29-diagnostics-fixture-token'));
  assert.ok(!JSON.stringify(detailed).includes('p29-diagnostics-fixture-token'));

  console.log(`P29 Diagnostics Workspace Separation: OK · ${targetVersion} keeps Basic cheap, Detailed lazy/grouped, Full Copy compatible, and Engine/network behavior unchanged`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
