'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {runDashboard} = require('./harness/dashboard-process.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const targetVersion = '3.0.0-alpha.5.68';
const baselineVersion = '3.0.0-alpha.5.67';
const baselineEngineSha = 'f17d689f39bd469bcadf1a2125313146cd6e04cb38299a5b4583d903a696cf09';
const baselineManagerSha = 'ff899b3c8a98bf04b39e7430bad67236d8361fd18faa6a01489aecbca12a950e';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const currentRelease = assertCurrentReleaseArtifacts();
if (currentRelease.productVersion !== targetVersion) {
  console.log(`P30 Diagnostics Capture Identity: SKIP · candidate ${currentRelease.productVersion} is not ${targetVersion}`);
  process.exit(0);
}

assert.equal(currentRelease.engineVersion, '1.6.19');
assert.equal(currentRelease.managerVersion, '1.3.0');
assert.equal(currentRelease.snapshotContract, 1);
assert.equal(currentRelease.recentRequestContract, 1);

const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.equal(sha256(engine), baselineEngineSha, '5.68 must keep the 1.6.19 Engine artifact byte-identical');
const normalizedManager = manager.replace(
  `const PRODUCT_VERSION = '${targetVersion}';`,
  `const PRODUCT_VERSION = '${baselineVersion}';`,
);
assert.ok(normalizedManager.includes(`const PRODUCT_VERSION = '${baselineVersion}';`));
assert.equal(sha256(normalizedManager), baselineManagerSha, '5.68 Manager functional body may change only by product-version synchronization');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.19');
assert.equal(manifest.components.bridgeManager.version, '1.3.0');
assert.equal(manifest.components.bridgeManager.productVersion, targetVersion);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

for (const marker of [
  'function diagnosticsCaptureIdentity(capturedAt = Date.now())',
  'function diagnosticsCaptureIdentityText(',
  'Diagnostic captured:',
  'Refresh identity:',
  'Captured #',
]) assert.ok(workspace.includes(marker), `capture identity workspace marker missing: ${marker}`);
assert.ok(diagnostics.includes('Diagnostic refresh identity:'), 'Full Diagnostics must expose compact refresh identity');

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction, 'Basic model boundary missing');
assert.equal(basicFunction[1].includes('diagText('), false, 'Basic must remain independent from full diagText()');
for (const forbidden of ['nativeFetch(', 'enqueueRefresh(', 'scheduleRefresh(', 'runCli(', 'setInterval(', 'setTimeout(']) {
  assert.equal(workspace.includes(forbidden), false, `capture identity must not add runtime I/O or polling: ${forbidden}`);
}
for (const section of [
  'Runtime & Update',
  'Bridge & Managed CLI',
  'Snapshot & Performance',
  'Cache & Secondary Refresh',
  'Data Fidelity & Request Ledger',
  'Scheduler, UI & Recovery',
]) assert.ok(workspace.includes(section), `Detailed section lost: ${section}`);
for (const label of [
  'Bridge snapshot attribution:',
  'Bridge CLI operations:',
  'Bridge CLI runtime:',
  'Cache observer:',
  'Request fidelity:',
  'Refresh phase duration:',
  'Stable readiness:',
]) assert.ok(source.includes(label), `legacy Full Diagnostics label lost: ${label}`);

function state(refreshCount, reason, lastSyncAt, diagnosticsMode = 'basic') {
  return {
    bridgeBase:'http://127.0.0.1:39117',
    bridgeEnabled:false,
    bridgeStatus:'off',
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
    diagnosticsMode,
    usageScopeView:'all',
    analyticsScopeView:'all',
    refreshCount,
    lastRefreshReason:reason,
    lastSyncAt,
    lastSyncDurationMs:1234,
    consecutiveFailures:0,
    data:null,
  };
}

async function capture(refreshCount, reason, lastSyncAt, diagnosticsMode = 'basic') {
  const run = await runDashboard({
    state:state(refreshCount, reason, lastSyncAt, diagnosticsMode),
    captureSettingsViews:true,
    captureInitialSettingsView:true,
    waitFor:'views',
    expectedViews:1,
    timeoutMs:5_000,
  });
  const view = run.views.find(row => row.reason === 'initial-state');
  assert.ok(view && !view.error, `initial Diagnostics view missing: ${view?.error || 'not captured'}`);
  assert.ok(view.summary, 'summary copy must be captured by the production process harness');
  assert.ok(view.diag, 'full Diagnostics copy must be captured by the production process harness');
  return {run,view};
}

function line(text, prefix) {
  const row = String(text || '').split('\n').find(value => value.startsWith(prefix));
  assert.ok(row, `missing ${prefix}`);
  return row.slice(prefix.length).trim();
}

(async () => {
  const sync10 = Date.parse('2026-08-23T06:20:10.000Z');
  const sync11 = Date.parse('2026-08-23T06:21:11.000Z');

  const visibility = await capture(10, 'visibility', sync10, 'basic');
  const timer = await capture(11, 'timer', sync11, 'detailed');

  const basic10 = line(visibility.view.summary, 'Refresh identity:');
  const full11 = line(timer.view.diag, 'Diagnostic refresh identity:');
  assert.equal(basic10, '#10 · visibility · sync 2026-08-23T06:20:10.000Z');
  assert.equal(full11, '#11 · timer · sync 2026-08-23T06:21:11.000Z');
  assert.notEqual(basic10, full11, 'different completed refreshes must be self-identifying as different');

  const basic11 = line(timer.view.summary, 'Refresh identity:');
  assert.equal(basic11, full11, 'Basic and Full created from the same refresh state must report identical refresh identity');
  assert.ok(timer.view.html.includes('Captured #11'), 'Basic/Detailed workspace header must expose the refresh count');
  assert.ok(timer.view.html.includes('timer'), 'workspace header must preserve the source refresh reason');
  assert.ok(timer.view.html.includes('2026-08-23T06:21:11.000Z'), 'workspace header must preserve the source sync timestamp');

  const summaryCaptured = line(timer.view.summary, 'Diagnostic captured:');
  const fullCaptured = line(timer.view.diag, 'Diagnostic captured:');
  assert.match(summaryCaptured, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} KST$/, 'summary copy must carry an exact KST capture timestamp');
  assert.match(fullCaptured, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} KST$/, 'Full Diagnostics must retain its exact KST capture timestamp');

  const unknown = await capture(12, 'timer', null, 'basic');
  assert.equal(line(unknown.view.summary, 'Refresh identity:'), '#12 · timer · sync UNKNOWN');
  assert.equal(line(unknown.view.diag, 'Diagnostic refresh identity:'), '#12 · timer · sync UNKNOWN');
  assert.equal(unknown.view.summary.includes('1970-01-01T00:00:00.000Z'), false, 'unknown sync time must never be fabricated as epoch zero');
  assert.equal(unknown.view.diag.includes('1970-01-01T00:00:00.000Z'), false, 'Full Diagnostics must not fabricate an unknown sync time');

  assert.equal(visibility.run.fetches.length, timer.run.fetches.length, 'capture identity presentation must not add network activity across modes');
  assert.equal(visibility.run.state.refreshCount, 10, 'opening/copying Diagnostics must not execute a refresh');
  assert.equal(timer.run.state.refreshCount, 11, 'opening/copying Diagnostics must not execute a refresh');

  console.log('P30 Diagnostics Capture Identity: OK · Basic, screen, and Full export are self-identifying across same and different refresh states without new runtime work');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
