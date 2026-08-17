const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.37'));
assert(src.includes('// v0.63.37 Cache Topology, Cadence & Output Provenance Diagnostics:'));
assert(src.includes('Cache topology: ${probeFresh ? runtimeProbeRules.topology(topologyProbe)'));
assert(src.includes('Cache cadence: ${probeFresh && topologyProbe'));
assert(src.includes('Output provenance: ${deferredMirror ?'));

const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
const runtimeModules = new Set([
  'runtime-contracts','runtime-host','runtime-cache','runtime-topology','runtime-session',
  'runtime-mirror','runtime-hooks','runtime-probe',
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
assert.deepStrictEqual(new Set(bmods.keys()), new Set([...coreModules, 'runtime-contracts','runtime-host','runtime-cache','runtime-session','runtime-mirror','runtime-hooks','runtime-probe']));
assert.deepStrictEqual(new Set(amods.keys()), new Set([...coreModules, ...runtimeModules]));
for (const name of coreModules) assert.strictEqual(amods.get(name), bmods.get(name), `core module changed: ${name}`);
for (const name of ['runtime-host','runtime-cache','runtime-session','runtime-hooks']) {
  assert.strictEqual(amods.get(name), bmods.get(name), `frozen runtime module changed: ${name}`);
}

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
const runtimeProbe = SimCore.require('runtime-probe');
const runtimeContracts = SimCore.require('runtime-contracts');
const { createMirrorRuntime } = SimCore.require('runtime-mirror');

assert.strictEqual(runtimeContracts.ownership.topology, 'runtime-topology');
assert.strictEqual(runtimeContracts.cache.requestOrder, 'FROZEN');
assert.strictEqual(runtimeContracts.cache.runtimePromptPlacement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(runtimeContracts.cache.runtimePromptPolicy, 'OBSERVE_ONLY');
assert.strictEqual(runtimeContracts.cache.providerCache, 'UNVERIFIED');

// Topology tracker retains signatures only and reports the actual full-request prefix break.
const tracker = topology.createRequestTopologyTracker();
const request1 = [
  { role: 'system', content: 'stable system block' },
  { role: 'user', content: 'first user' },
  { role: 'system', content: 'runtime mode=A' },
];
let tp = tracker.observe('chat:1', request1, { runtimeIndex: 2, at: 100000 });
assert.strictEqual(tp.baseline, true);
assert.strictEqual(tp.messages, 3);
assert.strictEqual(tp.currentUserIndex, 1);
assert.strictEqual(tp.runtimeIndex, 2);
assert.strictEqual(tp.retainedBodies, false);
assert.strictEqual(tp.signatureKind, 'role+kind+chars+fnv1a32');
assert.strictEqual(tp.cadenceMs, null);

const request2 = [
  { role: 'system', content: 'stable system block' },
  { role: 'user', content: 'first user' },
  { role: 'assistant', content: 'first assistant' },
  { role: 'user', content: 'second user' },
  { role: 'system', content: 'runtime mode=C' },
];
tp = tracker.observe('chat:1', request2, { runtimeIndex: 4, at: 142500 });
assert.strictEqual(tp.baseline, false);
assert.strictEqual(tp.stable, false);
assert.strictEqual(tp.commonMessages, 2);
assert.strictEqual(tp.firstChangeIndex, 2);
assert.strictEqual(tp.previousRole, 'system');
assert.strictEqual(tp.currentRole, 'assistant');
assert.strictEqual(tp.currentUserIndex, 3);
assert.strictEqual(tp.currentUserPosition, 'AFTER_PREFIX_BREAK');
assert.strictEqual(tp.runtimeIndex, 4);
assert.strictEqual(tp.runtimePosition, 'AFTER_PREFIX_BREAK');
assert.strictEqual(tp.cadenceMs, 42500);
assert(tp.commonRatio > 0 && tp.commonRatio < 100);
assert.strictEqual(runtimeProbe.cadence(tp.cadenceMs), '42.5 s');
assert(runtimeProbe.topology(tp).includes('COMMON_PREFIX'));
assert(runtimeProbe.topology(tp).includes('first change @2 system→assistant'));

// Identical full requests are classified as stable; changing chat key creates a new baseline.
const same2 = tracker.observe('chat:1', request2, { runtimeIndex: 4, at: 145000 });
assert.strictEqual(same2.stable, true);
assert.strictEqual(same2.firstChangeIndex, null);
assert.strictEqual(same2.commonMessages, request2.length);
assert.strictEqual(same2.runtimePosition, 'WITHIN_COMMON_PREFIX');
assert.strictEqual(runtimeProbe.cadence(1250), '1.3 s');
assert.strictEqual(runtimeProbe.cadence(663000), '11m 3.0s');
tracker.reset();
assert.strictEqual(tracker.observe('chat:1', request2, { runtimeIndex: 4, at: 200000 }).baseline, true);

// Multimodal/non-string content is represented by metadata+hash only, never copied into the probe.
const mmTracker = topology.createRequestTopologyTracker();
const secret = 'DO_NOT_RETAIN_THIS_BODY';
const mmProbe = mmTracker.observe('chat:mm', [
  { role: 'user', content: [{ type: 'text', text: secret }, { type: 'image_url', image_url: { url: 'x' } }] },
  { role: 'system', content: 'runtime' },
], { runtimeIndex: 1, at: 1 });
assert.strictEqual(mmProbe.retainedBodies, false);
assert.strictEqual(JSON.stringify(mmProbe).includes(secret), false);

// Deferred mirror provenance reports existing fingerprints without weakening acceptance.
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
    host: {
      async getChat() { return chat; },
      async setChat(a,b,c) { writes.push([a,b,c]); },
    },
    perfNow: () => Date.now(),
    perfMs: (start) => Math.max(0, Date.now() - start),
    textMessageContent: (m) => m?.content || '',
    diagnosticLocationKey: (a,b,c) => `${a}:${b}:${c?.id ?? ''}`,
    getCoreSession: () => session,
    runtimeIsCurrent: (e) => e === epoch,
    getRuntimeEpoch: () => epoch,
  });

  assert.strictEqual(mirror.schedule(1,2,chat,0,state), true);
  await new Promise(r => setTimeout(r, 15));
  let mp = mirror.lastProbe();
  assert.strictEqual(mp.status, 'COMMITTED');
  assert.strictEqual(mp.canonicalFingerprint, 'fp:canonical');
  assert.strictEqual(mp.hostRawFingerprint, 'fp:hostraw');
  assert.strictEqual(mp.freshFingerprint, 'fp:canonical');
  assert.strictEqual(mp.fingerprintMatch, 'CANONICAL');
  assert.strictEqual(writes.length, 1);

  visible = 'hostraw';
  assert.strictEqual(mirror.schedule(1,2,chat,0,state), true);
  await new Promise(r => setTimeout(r, 15));
  mp = mirror.lastProbe();
  assert.strictEqual(mp.status, 'COMMITTED');
  assert.strictEqual(mp.fingerprintMatch, 'HOST_RAW');
  assert.strictEqual(writes.length, 2);

  visible = 'different';
  assert.strictEqual(mirror.schedule(1,2,chat,0,state), true);
  await new Promise(r => setTimeout(r, 15));
  mp = mirror.lastProbe();
  assert.strictEqual(mp.status, 'OUTPUT_MISMATCH');
  assert.strictEqual(mp.fingerprintMatch, 'MISMATCH');
  assert.strictEqual(mp.freshFingerprint, 'fp:different');
  assert.strictEqual(writes.length, 2, 'mismatch must remain fail-open with no setChat');
}

async function main() {
  await mirrorFixtures();

  // Cache work is observational only: request prompt/order and provider controls stay untouched.
  assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert.strictEqual(before.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
  assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
  assert(src.includes("runtimePromptPolicy: 'OBSERVE_ONLY'"));
  assert(src.includes("providerCache: 'UNVERIFIED'"));
  assert(!src.toLowerCase().includes('cache_control'));
  assert(!src.includes('cached_content'));
  assert(!src.includes('prompt_cache_key'));

  // Existing authoritative ordering and fail-open mirror predicate remain exact.
  assert(src.includes("await this.store.save('out', outIndex, result.state"));
  assert(src.indexOf("outputStatus: 'COMMITTED'") < src.indexOf('runtimeMirror.schedule(chaIdx, chatIdx, chat, outIndex, result.state)'));
  const gate = "if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {";
  assert.strictEqual(src.split(gate).length - 1, 1);
  assert.strictEqual(before.split(gate).length - 1, 1);

  // No new host/storage/network/timer surface. The only intentional extra work is in-memory request signatures.
  for (const token of ['Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(', 'Risuai.getCharacter(', 'Risuai.setChatToIndex(',
    'pluginStorage.getItem(', 'pluginStorage.setItem(', 'pluginStorage.removeItem(', 'pluginStorage.keys(',
    'setTimeout(', 'setInterval(', 'requestAnimationFrame(']) {
    assert.strictEqual(src.split(token).length, before.split(token).length, `call count changed: ${token}`);
  }

  assert(src.includes("editCompatibilitySource: String(edit.compatibilitySource || 'n/a')"));
  assert(src.includes('CACHE_TOPOLOGY'));
  assert(src.includes('raw bodies ${topologyProbe.retainedBodies ? \'RETAINED\' : \'NOT RETAINED\'}'));

  console.log('SimCore 0.63.37 cache topology/cadence/provenance fixtures: PASS');
  console.log('frozen core modules:', coreModules.size, 'bytes:', frozenBytes, 'digest:', coreDigest);
  console.log('runtime modules:', [...runtimeModules].sort().join(', '));
  console.log('contracts: prompt order FROZEN · provider cache UNVERIFIED · mirror gate unchanged');
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
