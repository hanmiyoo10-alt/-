'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const workspacePath = `${root}/src/62-diagnostics-workspace.part.js`;
const instantPath = `${root}/src/63-diagnostics-instant-mode.part.js`;
const release = assertCurrentReleaseArtifacts();
assert.match(release.productVersion, /^3\.0\.0-alpha\.5\.\d+$/, 'P36 must run against the current alpha.5 release authority');
assert.match(release.managerVersion, /^1\.3\.\d+$/, 'P36 must accept the current 1.3.x Manager authority; exact release identity is owned by the current-release contract');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
if (release.engineVersion === '1.6.22') {
  assert.equal(sha256(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)), '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P36 Engine 1.6.22 historical byte lock must remain exact');
}

const workspace = fs.readFileSync(workspacePath, 'utf8');
const settingsRuntime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const {PARTS} = require('../src/parts.cjs');
assert.equal(fs.existsSync(instantPath), false, 'P36 direct-owner lineage must not restore module 63');
assert.equal(PARTS.some(part => part.file === '63-diagnostics-instant-mode.part.js'), false);
assert.match(workspace, /state\.diagnosticsMode = next;\s*renderSettingsPartial\(\);\s*void persistDiagnosticsModeSerialized\(next\);/s);
assert.match(workspace, /store\.setItem\(STATE_KEY, \{\.\.\.state, diagnosticsMode:capturedMode\}\)/);
const instantStart = workspace.indexOf('  let diagnosticsModePersistTail = Promise.resolve();');
const instantEnd = workspace.indexOf('  function diagnosticsCaptureIdentity', instantStart);
assert.ok(instantStart >= 0 && instantEnd > instantStart, 'P36 workspace must contain bounded instant-mode owner slice');
const instantSource = workspace.slice(instantStart, instantEnd);
assert.doesNotMatch(instantSource, /renderSettings\(\)|schedulePanelRender\(|nativeFetch\(|enqueueRefresh\(|fetchSnapshot\(|runCli\(|setTimeout\(|setInterval\(/);
assert.match(settingsRuntime, /Keep Local Bridge config inputs untouched so typed-but-unsaved values survive/);
assert.match(settingsRuntime, /const diagnosticsCurrent = currentAdvanced\[1\]\?\.querySelector\('\.advanced-body'\)/);
assert.equal((settingsRuntime.match(/bindDiagnosticsWorkspaceControls\(\);/g) || []).length, 1, 'native bindSettings must invoke Diagnostics controls exactly once');
assert.match(workspace, /function bindDiagnosticsWorkspaceControls\(\)/, 'module 62 must expose the normal Diagnostics controls binder');
assert.doesNotMatch(workspace, /diagnosticsWorkspaceLegacyBindSettings|bindSettings\s*=\s*function/, 'P36 must not restore the legacy bindSettings wrapper');
assert.match(diagnostics, /interaction quiet 700ms · defer 750ms/);

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'Basic must remain independent of diagText()');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/);
assert.match(workspace, /id="copy-diag"/);
assert.match(workspace, /diagnosticsCaptureIdentity\(/);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function buildHarness() {
  const state = {diagnosticsMode:'basic', typedButUnsaved:'draft-value'};
  const renders = [];
  const persisted = [];
  const gates = [];
  const buttons = {
    '#diagnostics-mode-basic':{onclick:null},
    '#diagnostics-mode-detailed':{onclick:null},
  };
  let persistCalls = 0;
  const context = {Promise, console:{log() {}}};
  const wrapper = `(function(){\n` +
    `const state = __state;\n` +
    `const renderSettingsPartial = () => { __renders.push(state.diagnosticsMode); };\n` +
    `const runtimeDisposed = false;\n` +
    `const dropStaleAsync = () => undefined;\n` +
    `const STATE_KEY = 'local-usage-dashboard-v3';\n` +
    `const powerRuntime = {persistWrites:0};\n` +
    `const store = {setItem:(key,payload)=>__persist(key,payload)};\n` +
    `const document = {querySelector:(selector)=>__buttons[selector] || null};\n` +
    workspace +
    `\nbindDiagnosticsWorkspaceControls();\nreturn {buttons:__buttons,state,powerRuntime};\n})()`;
  Object.assign(context, {
    __state:state,
    __renders:renders,
    __buttons:buttons,
    __persist:(key, payload) => {
      assert.equal(key, 'local-usage-dashboard-v3');
      persistCalls += 1;
      const gate = deferred();
      const snapshot = {...payload};
      gates.push({gate,snapshot});
      return gate.promise.then(() => { persisted.push(snapshot); });
    },
  });
  const api = vm.runInNewContext(wrapper, context);
  return {api,state,renders,persisted,gates,buttons,get persistCalls(){return persistCalls;}};
}

async function settleUntil(predicate, label) {
  for (let i = 0; i < 24; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.ok(predicate(), `promise chain did not settle: ${label}`);
}

(async () => {
  const one = buildHarness();
  one.buttons['#diagnostics-mode-basic'].onclick();
  assert.deepEqual(one.renders, [], 'same-mode click must remain a no-op');
  assert.equal(one.persistCalls, 0);

  one.buttons['#diagnostics-mode-detailed'].onclick();
  assert.equal(one.state.diagnosticsMode, 'detailed');
  assert.equal(one.state.typedButUnsaved, 'draft-value');
  assert.deepEqual(one.renders, ['detailed']);
  assert.equal(one.persistCalls, 0, 'persistence must be deferred out of the click stack');
  await settleUntil(() => one.persistCalls === 1, 'first Detailed write starts');
  one.gates[0].gate.resolve();
  await settleUntil(() => one.persisted.length === 1, 'first Detailed write resolves');
  assert.equal(one.persisted[0].diagnosticsMode, 'detailed');

  one.buttons['#diagnostics-mode-basic'].onclick();
  assert.equal(one.state.diagnosticsMode, 'basic');
  assert.deepEqual(one.renders, ['detailed','basic']);
  await settleUntil(() => one.persistCalls === 2, 'Basic write starts');
  one.gates[1].gate.resolve();
  await settleUntil(() => one.persisted.length === 2, 'Basic write resolves');
  assert.deepEqual(one.persisted.map(row => row.diagnosticsMode), ['detailed','basic']);

  const rapid = buildHarness();
  rapid.buttons['#diagnostics-mode-detailed'].onclick();
  await settleUntil(() => rapid.persistCalls === 1, 'rapid first write starts');
  rapid.buttons['#diagnostics-mode-basic'].onclick();
  rapid.buttons['#diagnostics-mode-detailed'].onclick();
  assert.deepEqual(rapid.renders, ['detailed','basic','detailed']);
  assert.equal(rapid.state.typedButUnsaved, 'draft-value');
  await Promise.resolve();
  assert.equal(rapid.persistCalls, 1, 'later writes must wait for the first write');
  rapid.gates[0].gate.resolve();
  await settleUntil(() => rapid.persistCalls === 2, 'rapid second write starts');
  assert.equal(rapid.gates[1].snapshot.diagnosticsMode, 'basic');
  rapid.gates[1].gate.resolve();
  await settleUntil(() => rapid.persistCalls === 3, 'rapid third write starts');
  assert.equal(rapid.gates[2].snapshot.diagnosticsMode, 'detailed');
  rapid.gates[2].gate.resolve();
  await settleUntil(() => rapid.persisted.length === 3, 'rapid writes all resolve');
  assert.deepEqual(rapid.persisted.map(row => row.diagnosticsMode), ['detailed','basic','detailed']);
  assert.equal(rapid.persisted.at(-1).diagnosticsMode, 'detailed');

  const failure = buildHarness();
  failure.buttons['#diagnostics-mode-detailed'].onclick();
  assert.deepEqual(failure.renders, ['detailed']);
  await settleUntil(() => failure.persistCalls === 1, 'failure fixture first write starts');
  failure.gates[0].gate.reject(new Error('injected persist failure'));
  await settleUntil(() => failure.persistCalls === 1, 'rejected write caught');
  failure.buttons['#diagnostics-mode-basic'].onclick();
  assert.deepEqual(failure.renders, ['detailed','basic']);
  await settleUntil(() => failure.persistCalls === 2, 'queue recovers after rejected persistence');
  failure.gates[1].gate.resolve();
  await settleUntil(() => failure.persisted.length === 1, 'post-failure Basic write resolves');
  assert.equal(failure.persisted.at(-1).diagnosticsMode, 'basic');

  console.log(`P36 Diagnostics Instant Mode Switch: OK · module 62 direct controls owner · native module-60 bind · immediate partial render · click-time serialized persistence · zero mode-switch network/CLI I/O · Engine ${release.engineVersion} authority verified`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
