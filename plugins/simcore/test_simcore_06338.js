const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.38'));
assert(src.includes('// v0.63.38 Cache Trajectory & Refreshless Telemetry Continuity:'));
assert(src.includes('Cache trajectory: ${probeFresh ? runtimeProbeRules.trajectory(trajectoryProbe)'));
assert(src.includes('Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)'));
assert(src.includes('Output provenance: ${deferredMirror ?'));

const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
const runtimeModules = new Set([
  'runtime-contracts','runtime-host','runtime-cache','runtime-topology','runtime-cache-candidates',
  'runtime-telemetry','runtime-session','runtime-mirror','runtime-hooks','runtime-probe',
]);

function extractModules(text) {
  const re = /SimCore\.define\("([^"]+)", function \(require, module, exports\) \{/g;
  const hits = [...text.matchAll(re)];
  const out = new Map();
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.indexOf('\n\n(async () => {', start);
    assert(start >= 0 && end > start, `module boundary ${hits[i][1]}`);
    out.set(hits[i][1], text.slice(start, end).trimEnd());
  }
  return out;
}

const bmods = extractModules(before);
const amods = extractModules(src);
for (const name of coreModules) assert.strictEqual(amods.get(name), bmods.get(name), `core module changed: ${name}`);
for (const name of ['runtime-contracts','runtime-host','runtime-session','runtime-mirror','runtime-hooks']) {
  assert.strictEqual(amods.get(name), bmods.get(name), `frozen runtime module changed: ${name}`);
}
assert.deepStrictEqual(new Set(amods.keys()), new Set([...coreModules, ...runtimeModules]));

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
const topology = SimCore.require('runtime-topology');
const runtimeCache = SimCore.require('runtime-cache');
const candidates = SimCore.require('runtime-cache-candidates');
const telemetry = SimCore.require('runtime-telemetry');
const runtimeProbe = SimCore.require('runtime-probe');
const runtimeContracts = SimCore.require('runtime-contracts');
const { createMirrorRuntime } = SimCore.require('runtime-mirror');

assert.strictEqual(runtimeContracts.cache.requestOrder, 'FROZEN');
assert.strictEqual(runtimeContracts.cache.runtimePromptPlacement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(runtimeContracts.cache.runtimePromptPolicy, 'OBSERVE_ONLY');
assert.strictEqual(runtimeContracts.cache.providerCache, 'UNVERIFIED');

// v0.63.37-or-earlier -> v0.63.38 has no retroactive capsule and must start FRESH.
const emptyRoot = {};
assert.strictEqual(telemetry.claim(emptyRoot), null);
let validation = telemetry.validate(null, 'chat:1', 1000);
assert.strictEqual(validation.accepted, false);
assert.strictEqual(validation.reason, 'no-compatible-handoff');
assert(runtimeProbe.continuity(null).startsWith('FRESH'));

// Runtime prompt continuity uses a compact hash sketch, not the raw runtime prompt.
const cache1 = runtimeCache.createRuntimePromptCacheTracker(runtimeContracts.cache);
let cp = cache1.observe('chat:1', 'alpha\nbeta\nmode=A', { at: 1000, sendIndex: 1, mode: 'A' });
assert.strictEqual(cp.baseline, true);
const cacheState = cache1.exportState();
assert(cacheState && cacheState.sketch && Array.isArray(cacheState.sketch.prefixHashes));
assert.strictEqual(JSON.stringify(cacheState).includes('alpha'), false);
assert.strictEqual(JSON.stringify(cacheState).includes('beta'), false);
const cache2 = runtimeCache.createRuntimePromptCacheTracker(runtimeContracts.cache);
assert.strictEqual(cache2.importState(cacheState), true);
cp = cache2.observe('chat:1', 'alpha\nbeta\nmode=C', { at: 2000, sendIndex: 2, mode: 'C' });
assert.strictEqual(cp.baseline, false);
assert(cp.stablePrefixChars > 0);
assert.strictEqual(cp.continuitySource, 'HANDOFF_SKETCH');

// Topology state is exportable/importable using signatures only; raw message bodies never enter the capsule.
const t1 = topology.createRequestTopologyTracker();
const request1 = [
  { role: 'system', content: 'stable system block' },
  { role: 'user', content: 'first user' },
  { role: 'system', content: 'runtime mode=A' },
];
let tp = t1.observe('chat:1', request1, { runtimeIndex: 2, at: 100000 });
assert.strictEqual(tp.baseline, true);
assert(tp.requestFingerprint && tp.familyId);
const topologyState = t1.exportState();
assert(topologyState);
assert.strictEqual(JSON.stringify(topologyState).includes('stable system block'), false);
const t2 = topology.createRequestTopologyTracker();
assert.strictEqual(t2.importState(topologyState), true);
const request2 = [
  { role: 'system', content: 'stable system block' },
  { role: 'user', content: 'first user' },
  { role: 'assistant', content: 'first assistant' },
  { role: 'user', content: 'second user' },
  { role: 'system', content: 'runtime mode=C' },
];
tp = t2.observe('chat:1', request2, { runtimeIndex: 4, at: 142500 });
assert.strictEqual(tp.baseline, false);
assert.strictEqual(tp.commonMessages, 2);
assert.strictEqual(tp.firstChangeIndex, 2);
assert.strictEqual(tp.cadenceMs, 42500);
assert.strictEqual(runtimeProbe.cadence(tp.cadenceMs), '42.5 s');
assert(runtimeProbe.topology(tp).includes('COMMON_PREFIX'));

// Candidate trajectory separates attempts from distinct observations and establishes after 3 distinct turns.
const c1 = candidates.createCacheCandidateTracker();
let tr = c1.observe('chat:1', { ...tp, baseline: true, cadenceMs: null }, { sendIndex: 10, at: 1 });
assert.strictEqual(tr.status, 'BASELINE');
assert.strictEqual(tr.distinct, 1);
assert.strictEqual(tr.attempts, 1);
tr = c1.observe('chat:1', { ...tp, baseline: true, cadenceMs: null }, { sendIndex: 10, at: 2 });
assert.strictEqual(tr.distinct, 1, 'retry must not count as a distinct observation');
assert.strictEqual(tr.attempts, 2);
const p2 = { ...tp, baseline: false, requestFingerprint: 'req2', commonChars: 1000, commonMessages: 5, cadenceMs: 30000, familyId: tp.familyId };
tr = c1.observe('chat:1', p2, { sendIndex: 11, at: 30000 });
assert.strictEqual(tr.status, 'OBSERVING');
assert.strictEqual(tr.distinct, 2);
const p3 = { ...p2, requestFingerprint: 'req3', commonChars: 1200, commonMessages: 6, cadenceMs: 20000 };
tr = c1.observe('chat:1', p3, { sendIndex: 12, at: 50000 });
assert.strictEqual(tr.status, 'ESTABLISHED');
assert.strictEqual(tr.distinct, 3);
assert.strictEqual(tr.stableFloorChars, 1000);
assert.strictEqual(tr.movingFrontierChars, 1200);
assert(tr.cadenceEmaMs > 0);
assert(runtimeProbe.trajectory(tr).includes('ESTABLISHED'));

// A single drop below the established floor is REGRESSED; a second consecutive drop is VOLATILE.
const p4 = { ...p3, requestFingerprint: 'req4', commonChars: 900, commonMessages: 4, cadenceMs: 10000 };
tr = c1.observe('chat:1', p4, { sendIndex: 13, at: 60000 });
assert.strictEqual(tr.status, 'REGRESSED');
assert.strictEqual(tr.divergenceCount, 1);
const p5 = { ...p4, requestFingerprint: 'req5', commonChars: 850, commonMessages: 4, cadenceMs: 10000 };
tr = c1.observe('chat:1', p5, { sendIndex: 14, at: 70000 });
assert.strictEqual(tr.status, 'VOLATILE');
assert.strictEqual(tr.divergenceCount, 2);

// v0.63.38 -> v0.63.38+ refreshless handoff is pure-data, location/age checked and adoptable.
const candidateState = c1.exportState();
const capsule = telemetry.capture({
  sourceVersion: '0.63.38', locationKey: 'chat:1', capturedAt: 100000,
  runtimePromptCache: cache2.exportState(), requestTopology: t2.exportState(), cacheCandidates: candidateState,
});
assert(capsule);
const capsuleJson = JSON.stringify(capsule);
assert.strictEqual(capsuleJson.includes('stable system block'), false);
assert.strictEqual(capsuleJson.includes('first assistant'), false);
const handoffRoot = {};
assert.strictEqual(telemetry.publish(handoffRoot, capsule), true);
const claimed = telemetry.claim(handoffRoot);
assert(claimed);
assert.strictEqual(telemetry.claim(handoffRoot), null, 'claim must consume the capsule');
validation = telemetry.validate(claimed, 'chat:1', 101000);
assert.strictEqual(validation.accepted, true);
assert.strictEqual(validation.reason, 'adopted');
assert.strictEqual(validation.ageMs, 1000);
assert.strictEqual(telemetry.validate(claimed, 'chat:other', 101000).reason, 'location-mismatch');
assert.strictEqual(telemetry.validate(claimed, 'chat:1', 100000 + 11 * 60 * 1000).reason, 'expired');
const c2 = candidates.createCacheCandidateTracker();
assert.strictEqual(c2.importState(validation.capsule.cacheCandidates), true);
const restored = c2.exportState();
assert.strictEqual(restored.state.distinct, candidateState.state.distinct);
assert(runtimeProbe.continuity({ accepted: true, sourceVersion: '0.63.38', ageMs: 1000, topology: true, runtimePrefix: true, trajectory: true }).startsWith('ADOPTED'));

// Family changes reset trajectory instead of smearing unrelated prompt families together.
const familyChanged = { ...p5, familyId: 'different-family', requestFingerprint: 'req6' };
tr = c2.observe('chat:1', familyChanged, { sendIndex: 15, at: 80000 });
assert.strictEqual(tr.familyReset, true);
assert.strictEqual(tr.status, 'BASELINE');
assert.strictEqual(tr.distinct, 1);

// Multimodal/non-string content remains signature-only.
const mmTracker = topology.createRequestTopologyTracker();
const secret = 'DO_NOT_RETAIN_THIS_BODY';
const mmProbe = mmTracker.observe('chat:mm', [
  { role: 'user', content: [{ type: 'text', text: secret }, { type: 'image_url', image_url: { url: 'x' } }] },
  { role: 'system', content: 'runtime' },
], { runtimeIndex: 1, at: 1 });
assert.strictEqual(mmProbe.retainedBodies, false);
assert.strictEqual(JSON.stringify(mmProbe).includes(secret), false);

async function mirrorFixtures() {
  let epoch = 1;
  const writes = [];
  let visible = 'canonical';
  const state = {
    lastMode: 'C', broadcastLocked: false, community: { activationCount: 1 }, koreanAgeOffset: 1,
    outputFingerprint: 'fp:canonical', hostOutputFingerprint: 'fp:hostraw',
  };
  const session = {
    current: state,
    currentOutputIndex: 0,
    portableState() { return { ok: true }; },
  };
  const chat = { id: 'chat-1', message: [{ role: 'assistant', get content() { return visible; } }], scriptstate: {} };
  const mirror = createMirrorRuntime({
    coreRules: { fingerprintText: (x) => `fp:${x}` },
    host: { async getChat() { return chat; }, async setChat(a,b,c) { writes.push([a,b,c]); } },
    perfNow: () => Date.now(), perfMs: (start) => Math.max(0, Date.now() - start),
    textMessageContent: (m) => m?.content || '', diagnosticLocationKey: (a,b,c) => `${a}:${b}:${c?.id ?? ''}`,
    getCoreSession: () => session, runtimeIsCurrent: (e) => e === epoch, getRuntimeEpoch: () => epoch,
  });
  assert.strictEqual(mirror.schedule(1,2,chat,0,state), true);
  await new Promise(r => setTimeout(r, 15));
  let mp = mirror.lastProbe();
  assert.strictEqual(mp.status, 'COMMITTED');
  assert.strictEqual(mp.fingerprintMatch, 'CANONICAL');
  visible = 'different';
  assert.strictEqual(mirror.schedule(1,2,chat,0,state), true);
  await new Promise(r => setTimeout(r, 15));
  mp = mirror.lastProbe();
  assert.strictEqual(mp.status, 'OUTPUT_MISMATCH');
  assert.strictEqual(mp.fingerprintMatch, 'MISMATCH');
  assert.strictEqual(writes.length, 1, 'mismatch must remain fail-open');
}

async function main() {
  await mirrorFixtures();

  // Generation/cache behavior remains observational only.
  assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert.strictEqual(before.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
  assert(src.includes("runtimePromptPolicy: 'OBSERVE_ONLY'"));
  assert(src.includes("providerCache: 'UNVERIFIED'"));
  assert(!src.toLowerCase().includes('cache_control'));
  assert(!src.includes('cached_content'));
  assert(!src.includes('prompt_cache_key'));

  // Authoritative output ordering and mirror acceptance gate stay exact.
  assert(src.includes("await this.store.save('out', outIndex, result.state"));
  assert(src.indexOf("outputStatus: 'COMMITTED'") < src.indexOf('runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state)'));
  const gate = "if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {";
  assert.strictEqual(src.split(gate).length - 1, 1);
  assert.strictEqual(before.split(gate).length - 1, 1);

  // Handoff/candidate work adds no host/storage/network/timer surface.
  for (const token of ['Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(', 'Risuai.getCharacter(', 'Risuai.setChatToIndex(',
    'pluginStorage.getItem(', 'pluginStorage.setItem(', 'pluginStorage.removeItem(', 'pluginStorage.keys(',
    'setTimeout(', 'setInterval(', 'requestAnimationFrame(']) {
    assert.strictEqual(src.split(token).length, before.split(token).length, `call count changed: ${token}`);
  }

  console.log('SimCore 0.63.38 cache trajectory/telemetry continuity fixtures: PASS');
  console.log('frozen core modules:', coreModules.size, 'bytes:', frozenBytes, 'digest:', coreDigest);
  console.log('runtime modules:', [...runtimeModules].sort().join(', '));
  console.log('contracts: prompt order FROZEN · provider cache UNVERIFIED · mirror gate unchanged · no prior telemetry required');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
