const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.39'));
assert(src.includes('// v0.63.39 Cache Trajectory Identity & Representation Diagnostics:'));
assert(src.includes("'Version: 0.63.39'"));
assert(src.includes("sourceVersion: '0.63.39'"));

const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
const frozenRuntime = new Set([
  'runtime-contracts','runtime-host','runtime-cache','runtime-session','runtime-mirror','runtime-hooks','runtime-telemetry',
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
for (const name of frozenRuntime) assert.strictEqual(amods.get(name), bmods.get(name), `frozen runtime module changed: ${name}`);

function loadSimCore(text) {
  const start = text.indexOf('const SimCore = (() => {');
  const end = text.indexOf('\n\n(async () => {', start);
  assert(start >= 0 && end > start);
  return new Function(`${text.slice(start, end)}\nreturn SimCore;`)();
}

const SimCore = loadSimCore(src);
const topologyRules = SimCore.require('runtime-topology');
const candidates = SimCore.require('runtime-cache-candidates');
const probeRules = SimCore.require('runtime-probe');
const runtimeContracts = SimCore.require('runtime-contracts');

assert.strictEqual(runtimeContracts.cache.requestOrder, 'FROZEN');
assert.strictEqual(runtimeContracts.cache.runtimePromptPlacement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(runtimeContracts.cache.runtimePromptPolicy, 'OBSERVE_ONLY');
assert.strictEqual(runtimeContracts.cache.providerCache, 'UNVERIFIED');

const tracker = topologyRules.createRequestTopologyTracker();
const req1 = [
  { role: 'system', content: 'stable head' },
  { role: 'user', content: 'same user turn' },
  { role: 'system', content: 'runtime A' },
];
const t1 = tracker.observe('chat:1', req1, { runtimeIndex: 2, at: 1000 });
assert.strictEqual(t1.baseline, true);
assert.ok(t1.currentUserSignature.includes('user|text|'));
assert.strictEqual(t1.cadenceMs, null);

// Same user turn and same family prelude, but a different assembled request body after that user turn.
const reqRetry = [
  { role: 'system', content: 'stable head' },
  { role: 'user', content: 'same user turn' },
  { role: 'assistant', content: 'retry assembly variant' },
  { role: 'system', content: 'runtime A' },
];
const tr = tracker.observe('chat:1', reqRetry, { runtimeIndex: 3, at: 2000 });
assert.notStrictEqual(tr.requestFingerprint, t1.requestFingerprint);
assert.strictEqual(tr.currentUserSignature, t1.currentUserSignature);
assert.strictEqual(tr.familyId, t1.familyId);
assert.strictEqual(tr.cadenceMs, 1000);

const c = candidates.createCacheCandidateTracker();
let cp = c.observe('chat:1', t1, { sendIndex: 10, at: 1000 });
assert.strictEqual(cp.status, 'BASELINE');
assert.strictEqual(cp.distinct, 1);
assert.strictEqual(cp.attempts, 1);
assert.strictEqual(cp.cadenceEmaMs, null);
assert.strictEqual(cp.lastObservation, 'DISTINCT');

cp = c.observe('chat:1', tr, { sendIndex: 10, at: 2000 });
assert.strictEqual(cp.status, 'BASELINE', 'retry must not advance trajectory status');
assert.strictEqual(cp.distinct, 1, 'retry must not increment distinct');
assert.strictEqual(cp.attempts, 2);
assert.strictEqual(cp.cadenceEmaMs, null, 'retry timing must not seed distinct cadence EMA');
assert.strictEqual(cp.lastObservation, 'RETRY');

const t2 = {
  ...tr,
  baseline: false,
  currentUserSignature: 'user|text|8|newturn1',
  requestFingerprint: 'different-request-2',
  familyId: t1.familyId,
  commonChars: 70000,
  commonMessages: 10,
  at: 11000,
};
cp = c.observe('chat:1', t2, { sendIndex: 11, at: 11000 });
assert.strictEqual(cp.status, 'OBSERVING');
assert.strictEqual(cp.distinct, 2);
assert.strictEqual(cp.attempts, 3);
assert.strictEqual(cp.cadenceEmaMs, 10000, 'first distinct cadence must be exact EMA seed');
assert.strictEqual(cp.lastObservation, 'DISTINCT');

cp = c.observe('chat:1', { ...t2, requestFingerprint: 'retry-variant-2' }, { sendIndex: 11, at: 13000 });
assert.strictEqual(cp.status, 'OBSERVING');
assert.strictEqual(cp.distinct, 2);
assert.strictEqual(cp.attempts, 4);
assert.strictEqual(cp.cadenceEmaMs, 10000);
assert.strictEqual(cp.lastObservation, 'RETRY');

const t3 = {
  ...t2,
  currentUserSignature: 'user|text|8|newturn2',
  requestFingerprint: 'different-request-3',
  commonChars: 76000,
  commonMessages: 16,
  at: 21000,
};
cp = c.observe('chat:1', t3, { sendIndex: 12, at: 21000 });
assert.strictEqual(cp.status, 'ESTABLISHED');
assert.strictEqual(cp.distinct, 3);
assert.strictEqual(cp.attempts, 5);
assert.strictEqual(cp.cadenceEmaMs, 10000);
assert.strictEqual(cp.stableFloorChars, 70000);
assert.strictEqual(cp.movingFrontierChars, 76000);

assert.strictEqual(c.importState({ version: 1, state: {} }), false);
const saved = c.exportState();
assert.strictEqual(saved.version, 2);
const c2 = candidates.createCacheCandidateTracker();
assert.strictEqual(c2.importState(saved), true);
assert.strictEqual(c2.exportState().state.distinct, 3);

assert.strictEqual(probeRules.cadence(null), 'BASELINE');
assert.strictEqual(probeRules.cadence(undefined), 'BASELINE');
const baselineLabel = probeRules.trajectory({
  status: 'BASELINE', familyId: 'abcd1234', distinct: 1, attempts: 1, lastObservation: 'DISTINCT',
  stableFloorChars: null, stableFloorMessages: null, movingFrontierChars: 0, movingFrontierMessages: 0,
  frontierStreak: 0, divergenceCount: 0, cadenceEmaMs: null,
});
assert(baselineLabel.includes('frontier n/a'));
assert(baselineLabel.includes('cadence EMA BASELINE'));
assert(baselineLabel.includes('last DISTINCT'));

assert.strictEqual(probeRules.representation({ canonicalFingerprint: '3089:aaaa', freshFingerprint: '3087:bbbb', fingerprintMatch: 'MISMATCH' }), 'CANONICAL↔FRESH Δchars -2 · DIFFERENT · raw bodies NOT RETAINED');
assert.strictEqual(probeRules.representation({ canonicalFingerprint: '3022:aaaa', freshFingerprint: '3022:aaaa', fingerprintMatch: 'CANONICAL' }), 'CANONICAL↔FRESH Δchars +0 · EXACT · raw bodies NOT RETAINED');

assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
assert(src.includes("runtimePromptPolicy: 'OBSERVE_ONLY'"));
assert(src.includes("providerCache: 'UNVERIFIED'"));
for (const forbidden of ['cache_control','cached_content','prompt_cache_key']) assert(!src.toLowerCase().includes(forbidden));
const gate = "if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {";
assert.strictEqual(src.split(gate).length - 1, 1);
assert.strictEqual(before.split(gate).length - 1, 1);

for (const token of [
  'Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(', 'Risuai.getCharacter(', 'Risuai.setChatToIndex(',
  'pluginStorage.getItem(', 'pluginStorage.setItem(', 'pluginStorage.removeItem(', 'pluginStorage.keys(',
  'setTimeout(', 'setInterval(', 'requestAnimationFrame('
]) assert.strictEqual(src.split(token).length, before.split(token).length, `call count changed: ${token}`);

const frozenBytes = [...coreModules].reduce((n, name) => n + Buffer.byteLength(amods.get(name)), 0);
const coreDigest = crypto.createHash('sha256')
  .update([...coreModules].sort().map((name) => `${name}:${crypto.createHash('sha256').update(amods.get(name)).digest('hex')}`).join('\n'))
  .digest('hex');

console.log('SimCore 0.63.39 trajectory identity/EMA/representation fixtures: PASS');
console.log('frozen core modules:', coreModules.size, 'bytes:', frozenBytes, 'digest:', coreDigest);
console.log('retry identity: attempts include retry · distinct excludes retry · EMA distinct-only');
console.log('representation: fingerprint-length diagnostics only · raw bodies NOT RETAINED');
console.log('provider cache: UNVERIFIED · prompt/order/mirror acceptance unchanged');
