'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const release = assertCurrentReleaseArtifacts();
assert.match(release.productVersion, /^3\.0\.0-alpha\.5\.\d+$/, 'P36 must run against the current alpha.5 release authority');
assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
assert.equal(sha256(engine), '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P36 lineage must keep the 5.71 Engine artifact byte-identical');

const moduleSource = fs.readFileSync(`${root}/src/63-diagnostics-instant-mode.part.js`, 'utf8');
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const settingsRuntime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const {PARTS} = require('../src/parts.cjs');
assert.ok(PARTS.some(part => part.file === '63-diagnostics-instant-mode.part.js'));
assert.match(moduleSource, /state\.diagnosticsMode = next;\s*renderSettingsPartial\(\);\s*void persistDiagnosticsModeSerialized\(next\);/s, 'visual switch must happen before persistence scheduling and queue the clicked mode');
assert.match(moduleSource, /store\.setItem\(STATE_KEY, \{\.\.\.state, diagnosticsMode:capturedMode\}\)/, 'queued persistence must combine latest state with the click-time mode snapshot');
assert.doesNotMatch(moduleSource, /renderSettings\(\)|schedulePanelRender\(|nativeFetch\(|enqueueRefresh\(|fetchSnapshot\(|runCli\(|setTimeout\(|setInterval\(/, 'mode switching must not trigger full render, scheduler delay, Bridge/network/CLI work, or polling');
assert.match(settingsRuntime, /Keep Local Bridge config inputs untouched so typed-but-unsaved values survive/);
assert.match(settingsRuntime, /const diagnosticsCurrent = currentAdvanced\[1\]\?\.querySelector\('\.advanced-body'\)/);
assert.match(diagnostics, /interaction quiet 700ms · defer 750ms/);

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'Basic must remain independent of diagText()');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'Detailed must remain lazy over existing diagText()');
assert.match(workspace, /id="copy-diag"/);
assert.match(workspace, /diagnosticsCaptureIdentity\(/, '5.68 capture identity must remain present');

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
  let legacyBinds = 0;
  const context = {
    Promise,
    console:{log() {}},
  };
  const wrapper = `(function(){\n` +
    `const state = __state;\n` +
    `let bindSettings = () => { __legacyBinds(); };\n` +
    `const diagnosticsWorkspaceMode = () => state.diagnosticsMode === 'detailed' ? 'detailed' : 'basic';\n` +
    `const renderSettingsPartial = () => { __renders.push(state.diagnosticsMode); };\n` +
    `const runtimeDisposed = false;\n` +
    `const dropStaleAsync = () => undefined;\n` +
    `const STATE_KEY = 'local-usage-dashboard-v3';\n` +
    `const powerRuntime = {persistWrites:0};\n` +
    `const store = {setItem:(key,payload)=>__persist(key,payload)};\n` +
    `const document = {querySelector:(selector)=>__buttons[selector] || null};\n` +
    moduleSource +
    `\nbindSettings();\nreturn {buttons:__buttons,state,powerRuntime};\n})()`;
  Object.assign(context, {
    __state:state,
    __renders:renders,
    __buttons:buttons,
    __legacyBinds:() => { legacyBinds += 1; },
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
  return {api,state,renders,persisted,gates,buttons,get persistCalls(){return persistCalls;},get legacyBinds(){return legacyBinds;}};
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
  one.buttons['#diagnostics-mode-detailed'].onclick();
  assert.equal(one.state.diagnosticsMode, 'detailed');
  assert.equal(one.state.typedButUnsaved, 'draft-value', 'partial render must not discard unrelated Settings state');
  assert.deepEqual(one.renders, ['detailed'], 'Basic → Detailed must render synchronously before persistence resolves');
  assert.equal(one.persistCalls, 0, 'persistence must be deferred out of the click stack');
  await settleUntil(() => one.persistCalls === 1, 'first Detailed write starts');
  assert.deepEqual(one.persisted, []);
  one.gates[0].gate.resolve();
  await settleUntil(() => one.persisted.length === 1, 'first Detailed write resolves');
  assert.equal(one.persisted[0].diagnosticsMode, 'detailed');

  one.buttons['#diagnostics-mode-basic'].onclick();
  assert.equal(one.state.diagnosticsMode, 'basic');
  assert.deepEqual(one.renders, ['detailed','basic'], 'Detailed → Basic must also render before persistence resolves');
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
  await settleUntil(() => rapid.persistCalls === 2, 'rapid second write starts after first resolves');
  assert.equal(rapid.gates[1].snapshot.diagnosticsMode, 'basic', 'second queued write must retain the Basic click snapshot even though live state is Detailed');
  rapid.gates[1].gate.resolve();
  await settleUntil(() => rapid.persistCalls === 3, 'rapid third write starts after second resolves');
  assert.equal(rapid.gates[2].snapshot.diagnosticsMode, 'detailed');
  rapid.gates[2].gate.resolve();
  await settleUntil(() => rapid.persisted.length === 3, 'rapid writes all resolve');
  assert.deepEqual(rapid.persisted.map(row => row.diagnosticsMode), ['detailed','basic','detailed'], 'serialized writes must preserve click order');
  assert.equal(rapid.persisted.at(-1).diagnosticsMode, 'detailed', 'last selected mode must win persistence ordering');

  const failure = buildHarness();
  failure.buttons['#diagnostics-mode-detailed'].onclick();
  assert.deepEqual(failure.renders, ['detailed'], 'persistence failure must not block immediate visual switch');
  await settleUntil(() => failure.persistCalls === 1, 'failure fixture first write starts');
  failure.gates[0].gate.reject(new Error('injected persist failure'));
  await settleUntil(() => failure.persistCalls === 1, 'rejected write caught');
  failure.buttons['#diagnostics-mode-basic'].onclick();
  assert.deepEqual(failure.renders, ['detailed','basic']);
  await settleUntil(() => failure.persistCalls === 2, 'queue recovers after rejected persistence');
  failure.gates[1].gate.resolve();
  await settleUntil(() => failure.persisted.length === 1, 'post-failure Basic write resolves');
  assert.equal(failure.persisted.at(-1).diagnosticsMode, 'basic');

  console.log('P36 Diagnostics Instant Mode Switch: OK · immediate partial render, click-time serialized persistence, zero mode-switch network/CLI I/O, Engine byte-identical');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
