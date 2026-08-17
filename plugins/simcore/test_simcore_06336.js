const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.36'));
assert(src.includes('// v0.63.36 Runtime Boundary Modularization + Cache Contract:'));
assert(src.includes('Cache posture: ${runtimeProbeRules.cachePosture(cacheProbe, runtimeContracts.cache)}'));

const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
const runtimeModules = new Set([
  'runtime-contracts','runtime-host','runtime-cache','runtime-session','runtime-mirror','runtime-hooks','runtime-probe',
]);

function extractModules(text) {
  const re = /SimCore\.define\("([^"]+)", function \(require, module, exports\) \{/g;
  const hits = [...text.matchAll(re)];
  const out = new Map();
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.indexOf('\n\n(async () => {', start);
    assert(start >= 0 && end > start, `module boundary ${hits[i][1]}`);
    out.set(hits[i][1], text.slice(start, end));
  }
  return out;
}

const bmods = extractModules(before);
const amods = extractModules(src);
assert.deepStrictEqual(new Set(bmods.keys()), coreModules);
for (const name of coreModules) assert.strictEqual(amods.get(name), bmods.get(name), `core module changed: ${name}`);
for (const name of runtimeModules) assert(amods.has(name), `missing runtime module ${name}`);
assert.strictEqual(amods.size, coreModules.size + runtimeModules.size);
const frozenBytes = [...coreModules].reduce((n, name) => n + Buffer.byteLength(amods.get(name)), 0);
const coreDigest = crypto.createHash('sha256')
  .update([...coreModules].sort().map((name) => `${name}:${crypto.createHash('sha256').update(amods.get(name)).digest('hex')}`).join('\n'))
  .digest('hex');

function loadSimCore(text) {
  const start = text.indexOf('const SimCore = (() => {');
  const end = text.indexOf('\n\n(async () => {', start);
  assert(start >= 0 && end > start);
  return new Function(`${text.slice(start, end)}\nreturn SimCore;`)();
}

const SimCore = loadSimCore(src);
const runtimeContracts = SimCore.require('runtime-contracts');
const { createHostAdapter } = SimCore.require('runtime-host');
const { createRuntimePromptCacheTracker, buildRuntimePromptCacheProbe } = SimCore.require('runtime-cache');
const { createSessionRuntime } = SimCore.require('runtime-session');
const { createMirrorRuntime } = SimCore.require('runtime-mirror');
const runtimeHooks = SimCore.require('runtime-hooks');
const runtimeProbe = SimCore.require('runtime-probe');

assert.deepStrictEqual(runtimeContracts.cache, {
  requestOrder: 'FROZEN',
  runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER',
  runtimePromptPolicy: 'OBSERVE_ONLY',
  providerCache: 'UNVERIFIED',
});

// Cache observation is still the old runtime-block comparison, now module-owned.
const tracker = createRuntimePromptCacheTracker(runtimeContracts.cache);
let cp = tracker.observe('chat:1', 'mode=A\nworld_year=2029\nfoo=bar', { sendIndex: 1 });
assert.strictEqual(cp.baseline, true);
assert.strictEqual(cp.placement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(cp.providerCache, 'UNVERIFIED');
cp = tracker.observe('chat:1', 'mode=A\nworld_year=2030\nfoo=bar', { sendIndex: 3 });
assert.strictEqual(cp.baseline, false);
assert.strictEqual(cp.firstChangedLine, 2);
assert.strictEqual(cp.reason, 'age/world-year');
assert(cp.stablePrefixPercent > 0 && cp.stablePrefixPercent < 100);
tracker.reset();
assert.strictEqual(tracker.observe('chat:1', 'same').baseline, true);
const directProbe = buildRuntimePromptCacheProbe('abc\ndef', 'abc\nxyz');
assert.strictEqual(directProbe.firstChangedLine, 2);
assert.strictEqual(runtimeProbe.cachePosture(cp, runtimeContracts.cache).includes('provider cache UNVERIFIED'), true);

// Host adapter is a 1:1 API boundary, not an extra-call layer.
const hostCalls = [];
const storage = new Map();
const fakeRisu = {
  async getCurrentCharacterIndex() { hostCalls.push('cha'); return 7; },
  async getCurrentChatIndex() { hostCalls.push('chatIndex'); return 9; },
  async getChatFromIndex(a,b) { hostCalls.push(`getChat:${a}:${b}`); return { id: 'c1', message: [] }; },
  async getCharacter() { hostCalls.push('getCharacter'); return { chaId: 'char-1' }; },
  async setChatToIndex(a,b,chat) { hostCalls.push(`setChat:${a}:${b}`); return chat; },
  pluginStorage: {
    async getItem(k) { hostCalls.push(`get:${k}`); return storage.get(k) ?? null; },
    async setItem(k,v) { hostCalls.push(`set:${k}`); storage.set(k,v); },
    async removeItem(k) { hostCalls.push(`remove:${k}`); storage.delete(k); },
    async keys() { hostCalls.push('keys'); return [...storage.keys()]; },
  },
};
const host = createHostAdapter(fakeRisu);

async function main() {
  assert.deepStrictEqual(await host.currentIndices(), { chaIdx: 7, chatIdx: 9 });
  await host.getChat(7,9);
  await host.getCharacter();
  await host.setChat(7,9,{});
  const backend = host.storageBackend();
  await backend.set('x','1');
  assert.strictEqual(await backend.get('x'), '1');
  await backend.keys();
  await backend.remove('x');
  assert.deepStrictEqual(hostCalls.slice(0,5), ['cha','chatIndex','getChat:7:9','getCharacter','setChat:7:9']);

  // Session ownership: cold init once, then LOCATION_REUSE without another character fetch.
  let runtimeState = { coreSession: null, coreKey: null, coreLocationKey: null };
  const sessionCalls = [];
  class FakeSession {
    constructor(backend, options) { this.backend = backend; this.options = options; this.current = { lastMode: 'A' }; sessionCalls.push(`ctor:${options.chatId}`); }
    async init(lastAssistant, mirror, fingerprint) { sessionCalls.push(`init:${lastAssistant}:${fingerprint || 'none'}`); }
  }
  const fakeCoreRules = {
    CoreRulesetSession: FakeSession,
    fingerprintText(text) { return `fp:${text}`; },
  };
  const fakeHost = {
    getChat: async () => { sessionCalls.push('chat-fallback'); return { id: 'chat-1', message: [] }; },
    getCharacter: async () => { sessionCalls.push('character'); return { chaId: 'char-1' }; },
    storageBackend: () => ({}),
  };
  let clock = 0;
  const sr = createSessionRuntime({
    coreRules: fakeCoreRules,
    host: fakeHost,
    perfNow: () => ++clock,
    perfMs: (start) => Math.max(0, clock - start),
    textMessageContent: (m) => m?.content || '',
    readState: () => runtimeState,
    writeState: (next) => { runtimeState = { ...next }; },
  });
  const chat = { id: 'chat-1', message: [{ role: 'assistant', content: 'hello' }], scriptstate: {} };
  const d1 = {};
  const s1 = await sr.loadCoreForChat(1,2,chat,d1);
  assert(s1 instanceof FakeSession);
  assert.strictEqual(d1.path, 'COLD_INIT');
  assert.strictEqual(sessionCalls.filter(x => x === 'character').length, 1);
  const d2 = {};
  const s2 = await sr.loadCoreForChat(1,2,chat,d2);
  assert.strictEqual(s2, s1);
  assert.strictEqual(d2.path, 'LOCATION_REUSE');
  assert.strictEqual(sessionCalls.filter(x => x === 'character').length, 1);

  // Deferred mirror remains off-path, fingerprint-gated, and epoch-safe.
  const mirrorWrites = [];
  let epoch = 1;
  const mirrorChat = { id: 'chat-1', message: [{ role: 'assistant', content: 'canonical' }], scriptstate: {} };
  const mirrorSession = {
    current: { lastMode: 'C', broadcastLocked: false, community: { activationCount: 2 }, koreanAgeOffset: 1, outputFingerprint: 'fp:canonical', hostOutputFingerprint: null },
    currentOutputIndex: 0,
    portableState() { return { stable: true }; },
  };
  const mr = createMirrorRuntime({
    coreRules: { fingerprintText: (x) => `fp:${x}` },
    host: {
      async getChat() { return mirrorChat; },
      async setChat(a,b,c) { mirrorWrites.push([a,b,c.scriptstate['$simcore_core_mode']]); },
    },
    perfNow: () => Date.now(),
    perfMs: (start) => Math.max(0, Date.now() - start),
    textMessageContent: (m) => m?.content || '',
    diagnosticLocationKey: (a,b,c) => `${a}:${b}:${c?.id ?? ''}`,
    getCoreSession: () => mirrorSession,
    runtimeIsCurrent: (e) => e === epoch,
    getRuntimeEpoch: () => epoch,
  });
  assert.strictEqual(mr.schedule(1,2,mirrorChat,0,mirrorSession.current), true);
  await new Promise(r => setTimeout(r, 15));
  assert.strictEqual(mirrorWrites.length, 1);
  assert.strictEqual(mr.lastProbe().status, 'COMMITTED');
  epoch = 2;
  assert.strictEqual(mr.schedule(1,2,mirrorChat,0,mirrorSession.current), true);
  epoch = 3;
  await new Promise(r => setTimeout(r, 15));
  assert.strictEqual(mirrorWrites.length, 1);
  assert.strictEqual(mr.lastProbe().status, 'STALE_DROPPED');
  mr.clear();
  assert.strictEqual(mr.lastProbe(), null);

  // Named hook lifecycle keeps the exact same callback objects.
  const hookRows = [];
  const beforeHandler = () => {};
  const outputHandler = () => {};
  const hookHost = {
    async addRisuReplacer(name, fn) { hookRows.push(['add-before', name, fn]); },
    async addRisuScriptHandler(name, fn) { hookRows.push(['add-output', name, fn]); },
    async removeRisuReplacer(name, fn) { hookRows.push(['remove-before', name, fn]); },
    async removeRisuScriptHandler(name, fn) { hookRows.push(['remove-output', name, fn]); },
  };
  await runtimeHooks.addBefore(hookHost, beforeHandler);
  await runtimeHooks.addOutput(hookHost, outputHandler);
  await runtimeHooks.remove(hookHost, beforeHandler, outputHandler);
  assert.strictEqual(hookRows[0][2], beforeHandler);
  assert.strictEqual(hookRows[2][2], beforeHandler);
  assert.strictEqual(hookRows[1][2], outputHandler);
  assert.strictEqual(hookRows[3][2], outputHandler);

  // Request/prompt/cache contracts: ordering and prompt bytes are deliberately not refactored.
  assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert.strictEqual(before.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert(src.includes("const runtimeBudgetText = String(result.promptBlock || '');"));
  assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
  assert(src.includes("runtimePromptPolicy: 'OBSERVE_ONLY'"));
  assert(!src.includes('providerCache: \'HIT\''));

  // Authoritative output ordering and storage schema remain in frozen Core modules.
  assert(src.includes("await this.store.save('out', outIndex, result.state"));
  assert(src.indexOf("outputStatus: 'COMMITTED'") < src.indexOf('runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state)'));
  assert.strictEqual(src.split('setTimeout(').length, before.split('setTimeout(').length);
  assert.strictEqual(src.split('setInterval(').length, before.split('setInterval(').length);
  assert.strictEqual(src.split('requestAnimationFrame(').length, before.split('requestAnimationFrame(').length);
  assert(src.includes('runtimePromptCache.reset();'));
  assert(src.includes('runtimeMirror.clear();'));

  console.log('SimCore 0.63.36 runtime boundary modularization fixtures: PASS');
  console.log('frozen core modules:', coreModules.size, 'bytes:', frozenBytes, 'digest:', coreDigest);
  console.log('runtime modules:', [...runtimeModules].sort().join(', '));
  console.log('cache contract: request order FROZEN · runtime TAIL_AFTER_CURRENT_USER · provider UNVERIFIED');
}

main().catch((e) => { console.error(e); process.exit(1); });
