'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const root = 'plugins/usage-dashboard';
const release = assertCurrentReleaseArtifacts();
assert.equal(release.productVersion, '3.0.0-alpha.5.72');
assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
assert.equal(sha256(engine), '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', '5.72 must keep the 5.71 Engine artifact byte-identical');

const moduleSource = fs.readFileSync(`${root}/src/63-diagnostics-instant-mode.part.js`, 'utf8');
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const settingsRuntime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const {PARTS} = require('../src/parts.cjs');
assert.ok(PARTS.some(part => part.file === '63-diagnostics-instant-mode.part.js'));
assert.match(moduleSource, /state\.diagnosticsMode = next;\s*renderSettingsPartial\(\);\s*void persistDiagnosticsModeSerialized\(\);/s, 'visual switch must happen before persistence scheduling');
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
  const state = {diagnosticsMode:'basic'};
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
    `const persist = () => __persist();\n` +
    `const document = {querySelector:(selector)=>__buttons[selector] || null};\n` +
    moduleSource +
    `\nbindSettings();\nreturn {buttons:__buttons,state};\n})()`;
  Object.assign(context, {
    __state:state,
    __renders:renders,
    __buttons:buttons,
    __legacyBinds:() => { legacyBinds += 1; },
    __persist:() => {
      persistCalls += 1;
      const gate = deferred();
      const snapshot = state.diagnosticsMode;
      gates.push({gate,snapshot});
      return gate.promise.then(() => { persisted.push(snapshot); });
    },
  });
  const api = vm.runInNewContext(wrapper, context);
  return {api,state,renders,persisted,gates,buttons,get persistCalls(){return persistCalls;},get legacyBinds(){return legacyBinds;}};
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

(async () => {
  const one = buildHarness();
  one.buttons['#diagnostics-mode-detailed'].onclick();
  assert.equal(one.state.diagnosticsMode, 'detailed');
  assert.deepEqual(one.renders, ['detailed'], 'Basic → Detailed must render synchronously before persistence resolves');
  assert.equal(one.persistCalls, 0, 'persistence must be deferred out of the click stack');
  await flush();
  assert.equal(one.persistCalls, 1);
  assert.deepEqual(one.persisted, []);
  one.gates[0].gate.resolve();
  await flush();
  assert.deepEqual(one.persisted, ['detailed']);

  one.buttons['#diagnostics-mode-basic'].onclick();
  assert.equal(one.state.diagnosticsMode, 'basic');
  assert.deepEqual(one.renders, ['detailed','basic'], 'Detailed → Basic must also render before persistence resolves');
  await flush();
  assert.equal(one.persistCalls, 2);
  one.gates[1].gate.resolve();
  await flush();
  assert.deepEqual(one.persisted, ['detailed','basic']);

  const rapid = buildHarness();
  rapid.buttons['#diagnostics-mode-detailed'].onclick();
  await flush();
  assert.equal(rapid.persistCalls, 1);
  rapid.buttons['#diagnostics-mode-basic'].onclick();
  rapid.buttons['#diagnostics-mode-detailed'].onclick();
  assert.deepEqual(rapid.renders, ['detailed','basic','detailed']);
  await flush();
  assert.equal(rapid.persistCalls, 1, 'later writes must wait for the first write');
  rapid.gates[0].gate.resolve();
  await flush();
  assert.equal(rapid.persistCalls, 2);
  rapid.gates[1].gate.resolve();
  await flush();
  assert.equal(rapid.persistCalls, 3);
  rapid.gates[2].gate.resolve();
  await flush();
  assert.equal(rapid.persisted.at(-1), 'detailed', 'last selected mode must win persistence ordering');

  const failure = buildHarness();
  failure.buttons['#diagnostics-mode-detailed'].onclick();
  assert.deepEqual(failure.renders, ['detailed'], 'persistence failure must not block immediate visual switch');
  await flush();
  failure.gates[0].gate.reject(new Error('injected persist failure'));
  await flush();
  failure.buttons['#diagnostics-mode-basic'].onclick();
  assert.deepEqual(failure.renders, ['detailed','basic']);
  await flush();
  assert.equal(failure.persistCalls, 2, 'serialized queue must recover after a rejected persistence');
  failure.gates[1].gate.resolve();
  await flush();
  assert.equal(failure.persisted.at(-1), 'basic');

  console.log('P36 Diagnostics Instant Mode Switch: OK · immediate partial render, serialized latest-safe persistence, zero mode-switch I/O, Engine byte-identical');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
