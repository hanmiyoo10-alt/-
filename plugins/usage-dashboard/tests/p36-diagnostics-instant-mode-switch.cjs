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
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const settingsRuntime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`);
const engine571Sha = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69';
assert.equal(sha256(engine), engine571Sha, '5.72 must keep the 5.71 Engine artifact byte-identical');

for (const marker of [
  "let diagnosticsModePersistTail = Promise.resolve();",
  'function diagnosticsWorkspaceQueuePersist()',
  'diagnosticsModePersistTail = diagnosticsModePersistTail.then(() => persist()).catch(() => undefined);',
  'state.diagnosticsMode = next;',
  'renderSettingsPartial();',
  'void diagnosticsWorkspaceQueuePersist();',
]) assert.ok(workspace.includes(marker), `missing instant-mode marker: ${marker}`);

const handler = workspace.match(/const setMode = mode => \{([\s\S]*?)\n    \};/);
assert.ok(handler, 'Diagnostics setMode handler boundary missing');
const handlerText = handler[1];
assert.ok(handlerText.indexOf('state.diagnosticsMode = next;') < handlerText.indexOf('renderSettingsPartial();'));
assert.ok(handlerText.indexOf('renderSettingsPartial();') < handlerText.indexOf('diagnosticsWorkspaceQueuePersist();'));
assert.equal(handlerText.includes('await persist()'), false, 'visible switch must never wait for persistence');
assert.equal(handlerText.includes('renderSettings();'), false, 'direct mode switch must use bounded partial settings render');
for (const forbidden of ['nativeFetch(', 'enqueueRefresh(', 'scheduleRefresh(', 'runCli(', 'schedulePanelRender(']) {
  assert.equal(handlerText.includes(forbidden), false, `mode switch must not trigger runtime I/O/scheduler: ${forbidden}`);
}

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'Basic remains independent of full Diagnostics generation');
assert.ok(workspace.includes("for (const line of diagText().split('\\n'))"), 'Detailed remains lazy over existing diagText()');
assert.ok(workspace.includes('copy-diag-summary'));
assert.ok(workspace.includes('copy-diag'));
assert.ok(source.includes('Basic · Detailed · Full Copy'));

assert.ok(settingsRuntime.includes('// Keep Local Bridge config inputs untouched so typed-but-unsaved values survive,'));
assert.ok(settingsRuntime.includes("const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');"));
assert.ok(settingsRuntime.includes('if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext)'));
assert.ok(source.includes('interaction quiet 700ms · defer 750ms'), 'automatic panel refresh quiet/defer policy must remain unchanged');

function gate() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function makeSandbox({failFirstPersist = false} = {}) {
  const buttons = {
    basic:{onclick:null},
    detailed:{onclick:null},
    summary:{onclick:null,textContent:'요약 복사',isConnected:true},
  };
  const renders = [];
  const persistSnapshots = [];
  const persisted = [];
  const gates = [gate(), gate(), gate()];
  let persistCalls = 0;
  let typedBridgeBase = 'http://typed-but-unsaved.local:39117';
  const state = {diagnosticsMode:'basic'};

  const context = vm.createContext({
    Promise,
    Map,
    Date,
    Number,
    String,
    Array,
    Object,
    Math,
    console,
    state,
    settingsHtml:() => '<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>요약 · 전체 진단</span></summary><div class="advanced-body"></div></details>',
    bindSettings:() => undefined,
    renderSettingsPartial:() => {
      renders.push(state.diagnosticsMode);
      assert.equal(typedBridgeBase, 'http://typed-but-unsaved.local:39117');
    },
    persist:() => {
      const call = persistCalls++;
      const snapshot = state.diagnosticsMode;
      persistSnapshots.push(snapshot);
      if (failFirstPersist && call === 0) return Promise.reject(new Error('injected persist failure'));
      const currentGate = gates[call] || {promise:Promise.resolve()};
      return currentGate.promise.then(() => { persisted.push(snapshot); });
    },
    document:{
      querySelector(selector) {
        if (selector === '#diagnostics-mode-basic') return buttons.basic;
        if (selector === '#diagnostics-mode-detailed') return buttons.detailed;
        if (selector === '#copy-diag-summary') return buttons.summary;
        return null;
      },
    },
    navigator:{clipboard:{writeText:async () => undefined}},
  });
  vm.runInContext(workspace, context, {filename:'62-diagnostics-workspace.part.js'});
  context.bindSettings();
  return {context, state, buttons, renders, persistSnapshots, persisted, gates, get persistCalls() { return persistCalls; }, get typedBridgeBase() { return typedBridgeBase; }};
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

(async () => {
  const run = makeSandbox();
  run.buttons.detailed.onclick();
  assert.deepEqual(run.renders, ['detailed'], 'Basic→Detailed must render synchronously before persistence starts/finishes');
  assert.equal(run.state.diagnosticsMode, 'detailed');
  await flush();
  assert.equal(run.persistCalls, 1);
  assert.deepEqual(run.persisted, [], 'first persistence must still be gated while Detailed is already visible');

  run.buttons.basic.onclick();
  assert.deepEqual(run.renders, ['detailed','basic'], 'Detailed→Basic must also render synchronously while first write is blocked');
  assert.equal(run.state.diagnosticsMode, 'basic');
  await flush();
  assert.equal(run.persistCalls, 1, 'second write must wait behind the first write');
  run.gates[0].resolve();
  await flush();
  assert.equal(run.persistCalls, 2, 'second persistence starts only after first completes');
  assert.deepEqual(run.persistSnapshots, ['detailed','basic'], 'serialized writes must snapshot mode in click order');
  run.gates[1].resolve();
  await flush();
  assert.deepEqual(run.persisted, ['detailed','basic'], 'last selected Basic must be the final stored mode');

  const rapid = makeSandbox();
  rapid.buttons.detailed.onclick();
  rapid.buttons.basic.onclick();
  rapid.buttons.detailed.onclick();
  assert.deepEqual(rapid.renders, ['detailed','basic','detailed']);
  await flush();
  rapid.gates[0].resolve();
  await flush();
  rapid.gates[1].resolve();
  await flush();
  rapid.gates[2].resolve();
  await flush();
  assert.equal(rapid.persisted.at(-1), 'detailed', 'rapid toggles must persist the final selection');

  const failed = makeSandbox({failFirstPersist:true});
  failed.buttons.detailed.onclick();
  assert.deepEqual(failed.renders, ['detailed'], 'persist failure must not block the immediate visual switch');
  await flush();
  failed.buttons.basic.onclick();
  assert.deepEqual(failed.renders, ['detailed','basic']);
  await flush();
  assert.equal(failed.persistCalls, 2, 'a failed persistence must not poison the serialization tail');
  failed.gates[1].resolve();
  await flush();
  assert.equal(failed.persisted.at(-1), 'basic');

  console.log('usage-dashboard P36 Diagnostics Instant Mode Switch: OK · immediate partial render precedes serialized persistence, failures do not poison tail, Engine/network/scheduler boundaries preserved');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
