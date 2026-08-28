import vm from 'node:vm';
import { equal, assert } from '../../tooling/assertions.mjs';
import { extractModuleSource } from '../../tooling/bundle-loader.mjs';

function loadPatchedRuntime(source) {
  const factories = new Map();
  const instances = new Map();
  let wholeCapsuleStringifies = 0;
  const JsonProxy = Object.create(JSON);
  JsonProxy.stringify = (value, ...args) => {
    if (value?.schema === 1 && value?.handoff?.format === 'COMPACT_V2') wholeCapsuleStringifies += 1;
    return JSON.stringify(value, ...args);
  };
  JsonProxy.parse = (...args) => JSON.parse(...args);
  const SimCore = {
    define(name, factory) { factories.set(String(name), factory); },
    require(name) {
      const key = String(name);
      if (instances.has(key)) return instances.get(key);
      const factory = factories.get(key);
      if (typeof factory !== 'function') throw new Error(`module missing ${key}`);
      const module = { exports: {} };
      const localRequire = (id) => {
        const value = String(id || '');
        if (!value.startsWith('./')) throw new Error(`unsupported require ${value}`);
        return SimCore.require(value.slice(2));
      };
      factory(localRequire, module, module.exports);
      instances.set(key, module.exports);
      return module.exports;
    },
  };
  const context = vm.createContext({ SimCore, JSON: JsonProxy, console: Object.freeze({ log() {}, warn() {}, error() {} }) });
  for (const name of ['runtime-cache', 'runtime-topology', 'runtime-cache-candidates', 'runtime-telemetry']) {
    new vm.Script(extractModuleSource(source, name)).runInContext(context, { timeout: 1000 });
  }
  const patchStart = source.indexOf('// v0.64.11 bounded handoff adapters:');
  const patchEnd = source.indexOf('\n(async () => {', patchStart);
  assert(patchStart >= 0 && patchEnd > patchStart, 'v0.64.11 adapter layer bounds');
  new vm.Script(source.slice(patchStart, patchEnd)).runInContext(context, { timeout: 1000 });
  return { require: SimCore.require, wholeCapsuleStringifies: () => wholeCapsuleStringifies };
}

class HostStore {
  constructor() { this.map = new Map(); this.reads = 0; this.writes = 0; this.removes = 0; }
  async getItem(key) { this.reads += 1; return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  async setItem(key, value) { this.writes += 1; this.map.set(String(key), String(value)); }
  async removeItem(key) { this.removes += 1; this.map.delete(String(key)); }
}

function disabledSessionRoot() {
  const root = {};
  Object.defineProperty(root, 'sessionStorage', { get() { throw new Error('disabled'); } });
  return root;
}

function makeMessages(systemText, count = 70) {
  const rows = [{ role: 'system', content: systemText }];
  for (let i = 1; i < count; i += 1) rows.push({ role: i % 2 ? 'user' : 'assistant', content: `message-${i}-SECRET-BODY` });
  return rows;
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.11') {
    assert(version === '0.64.10', `bounded telemetry control version ${version}`);
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v06410-pre-release-control', status: 'PASS' }] };
  }

  const fixture = ctx.fixtures[0];
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });
  const runtime = loadPatchedRuntime(ctx.source);
  const cacheRules = runtime.require('runtime-cache');
  const topoRules = runtime.require('runtime-topology');
  const candidateRules = runtime.require('runtime-cache-candidates');
  const telemetry = runtime.require('runtime-telemetry');
  const key = 'character:chat';
  const now = 2000000000000;

  const promptLines = Array.from({ length: fixture.input.promptLines }, (_, i) => `prompt-line-${i}-SECRET-PROMPT`);
  const promptText = promptLines.join('\n');
  const promptTracker = cacheRules.createRuntimePromptCacheTracker();
  promptTracker.observe(key, promptText, { sendIndex: 1, mode: 'A', at: now });
  const promptHandoff = promptTracker.exportHandoffState();
  equal(promptHandoff.handoffDisposition, 'OK', 'prompt handoff disposition');
  assert(promptHandoff.sketch.lines.length <= fixture.expected.maxPromptLines, 'prompt handoff line bound');
  assert(JSON.stringify(promptHandoff).length <= fixture.expected.promptBudget, 'prompt handoff component budget');
  assert(!JSON.stringify(promptHandoff).includes('SECRET-PROMPT'), 'raw prompt retained');
  assert(!promptHandoff.sketch.prefixHashes, 'per-character prefix hashes leaked into handoff');
  pass('prompt-bounded-handoff');

  const systemText = 'SYSTEM-SECRET-' + 'S'.repeat(fixture.input.systemChars);
  const messages = makeMessages(systemText, fixture.input.messageCount);
  const topologyTracker = topoRules.createRequestTopologyTracker();
  const topologyProbe = topologyTracker.observe(key, messages, { runtimeIndex: messages.length - 1, locationKey: key, at: now });
  const topologyHandoff = topologyTracker.exportHandoffState();
  equal(topologyHandoff.handoffDisposition, 'OK', 'topology handoff disposition');
  assert(topologyHandoff.previous.signatures.length <= fixture.expected.maxTopologySignatures, 'topology signature bound');
  assert(topologyHandoff.previous.system0Sketch.headBlocks.length <= fixture.expected.maxSystemEdgeBlocks, 'system head bound');
  assert(topologyHandoff.previous.system0Sketch.tailBlocks.length <= fixture.expected.maxSystemEdgeBlocks, 'system tail bound');
  assert(JSON.stringify(topologyHandoff).length <= fixture.expected.topologyBudget, 'topology component budget');
  assert(!JSON.stringify(topologyHandoff).includes('SECRET-BODY') && !JSON.stringify(topologyHandoff).includes('SYSTEM-SECRET'), 'raw request/system body retained');
  pass('topology-and-system0-bounded-handoff');

  const candidates = candidateRules.createCacheCandidateTracker();
  candidates.observe(key, topologyProbe, { sendIndex: messages.length - 1, at: now });
  const trajectoryHandoff = candidates.exportState();
  assert(JSON.stringify(trajectoryHandoff).length <= fixture.expected.trajectoryBudget, 'trajectory component budget');

  const capsule = telemetry.captureCompact({
    sourceVersion: '0.64.11', locationKey: key, capturedAt: now,
    runtimePromptCache: promptHandoff, requestTopology: topologyHandoff, cacheCandidates: trajectoryHandoff,
  });
  assert(capsule, 'compact capsule rejected');
  const compactDiag = telemetry.diagnostics().compaction;
  equal(compactDiag.status, 'OK', 'compaction status');
  assert(compactDiag.wholeChars <= fixture.expected.wholeBudget, 'whole capsule hard cap');
  equal(runtime.wholeCapsuleStringifies(), 1, 'whole capsule authoritative serialization count before publish');
  pass('whole-capsule-bounded-once');

  let acquired = 0;
  const store = new HostStore();
  const host = { async getLocalPluginStorage() { acquired += 1; return store; } };
  await telemetry.publishWithHostLocal({}, disabledSessionRoot(), host, capsule);
  const write = telemetry.diagnostics().write;
  equal(write.memory, 'WRITTEN', 'memory write');
  equal(write.session, 'UNAVAILABLE', 'disabled session classification');
  equal(write.hostLocal, 'WRITTEN', 'Host-local compact write');
  equal(acquired, 1, 'Host-local store acquisition count');
  equal(store.writes, 1, 'Host-local write count');
  equal(runtime.wholeCapsuleStringifies(), 1, 'publish reserialized complete compact capsule');
  pass('host-local-compact-write-no-reserialize');

  const restoredPrompt = cacheRules.createRuntimePromptCacheTracker();
  assert(restoredPrompt.importHandoffState(promptHandoff), 'prompt handoff import');
  const changedPrompt = promptLines.map((line, i) => i === 70 ? `${line}-changed` : line).join('\n');
  const firstPromptProbe = restoredPrompt.observe(key, changedPrompt, { sendIndex: 2, mode: 'A', at: now + 1000 });
  equal(firstPromptProbe.precision, 'PREFIX_FLOOR', 'prompt first-reload floor precision');
  assert(firstPromptProbe.firstChangedLine == null, 'prompt floor fabricated exact line');
  const secondPromptProbe = restoredPrompt.observe(key, changedPrompt, { sendIndex: 3, mode: 'A', at: now + 2000 });
  assert(secondPromptProbe.precision !== 'PREFIX_FLOOR', 'prompt same-generation precision did not recover');
  assert(secondPromptProbe.stable, 'prompt same-generation stable control');
  pass('prompt-first-reload-floor-then-exact');

  const restoredTopology = topoRules.createRequestTopologyTracker();
  assert(restoredTopology.importHandoffState(topologyHandoff), 'topology handoff import');
  const changedMessages = messages.map((row) => ({ ...row }));
  changedMessages[65] = { ...changedMessages[65], content: `${changedMessages[65].content}-changed` };
  const firstTopologyProbe = restoredTopology.observe(key, changedMessages, { runtimeIndex: changedMessages.length - 1, locationKey: key, at: now + 1000 });
  equal(firstTopologyProbe.precision, 'PREFIX_FLOOR', 'topology first-reload floor precision');
  equal(firstTopologyProbe.firstChangeStatus, 'UNRESOLVED_AFTER_RETAINED_PREFIX', 'topology floor exactness guard');

  const restoredCandidates = candidateRules.createCacheCandidateTracker();
  assert(restoredCandidates.importState(trajectoryHandoff), 'trajectory import');
  const trajectoryBefore = JSON.stringify(restoredCandidates.exportState());
  const skipped = restoredCandidates.observe(key, firstTopologyProbe, { sendIndex: changedMessages.length - 1, at: now + 1000 });
  equal(skipped.lastObservation, 'SKIPPED_BOUNDED_REOBSERVE', 'bounded reobserve skip');
  equal(JSON.stringify(restoredCandidates.exportState()), trajectoryBefore, 'bounded reobserve mutated imported trajectory');
  const secondTopologyProbe = restoredTopology.observe(key, changedMessages, { runtimeIndex: changedMessages.length - 1, locationKey: key, at: now + 2000 });
  assert(secondTopologyProbe.precision !== 'PREFIX_FLOOR', 'topology same-generation precision did not recover');
  pass('topology-floor-skips-trajectory-once');

  const interiorTracker = topoRules.createRequestTopologyTracker();
  assert(interiorTracker.importHandoffState(topologyHandoff), 'interior topology import');
  const interiorMessages = messages.map((row) => ({ ...row }));
  const editAt = Math.floor(fixture.input.systemChars / 2);
  interiorMessages[0].content = systemText.slice(0, editAt) + 'X' + systemText.slice(editAt + 1);
  const interiorProbe = interiorTracker.observe(key, interiorMessages, { runtimeIndex: interiorMessages.length - 1, locationKey: key, at: now + 1000 });
  equal(interiorProbe.hostPrefixProbe.status, 'INTERIOR_CHANGED_UNLOCALIZED', 'bounded system0 interior classification');
  equal(interiorProbe.hostPrefixProbe.confidence, 'BOUNDED', 'bounded system0 confidence');
  pass('system0-interior-no-false-localization');

  const failed = telemetry.captureCompact({
    sourceVersion: '0.64.11', locationKey: key, capturedAt: now,
    runtimePromptCache: { version: 2, handoffDisposition: 'OK', precision: 'LINE_BOUND', payload: 'x'.repeat(fixture.expected.promptBudget + 100) },
    requestTopology: topologyHandoff, cacheCandidates: trajectoryHandoff,
  });
  equal(failed, null, 'oversized component must fail compaction');
  equal(telemetry.diagnostics().compaction.status, 'COMPACTION_FAILED', 'component failure classification');
  equal(telemetry.diagnostics().compaction.components.prompt.disposition, 'COMPONENT_OVERSIZE', 'prompt oversize attribution');
  pass('component-failure-no-partial-capsule');

  for (const marker of [
    "const MAX_SERIALIZED_CHARS = 16384;",
    "const HOST_LOCAL_KEY = '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__';",
    "scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT'",
    'Telemetry capsule:', 'Handoff precision:', 'COMPACTION_FAILED', 'SKIPPED_BOUNDED_REOBSERVE',
  ]) assert(ctx.source.includes(marker), `v0.64.11 source marker missing ${marker}`);
  const patchStart = ctx.source.indexOf('// v0.64.11 bounded handoff adapters:');
  const patchEnd = ctx.source.indexOf('\n(async () => {', patchStart);
  const patch = ctx.source.slice(patchStart, patchEnd);
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) assert(!patch.includes(forbidden), `v0.64.11 adapter introduced ${forbidden}`);
  pass('runtime-surface-freeze');

  equal(assertions.length, fixture.expected.assertionCount, 'bounded telemetry fixture assertion count');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
