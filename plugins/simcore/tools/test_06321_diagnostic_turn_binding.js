const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06320-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }
function count(source, token) { return String(source).split(token).length - 1; }

function moduleBlock(source, name) {
  const marker = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`module missing: ${name}`);
  let end = source.indexOf('\nSimCore.define("', start + marker.length);
  if (end < 0) end = source.indexOf('\n(async () => {', start + marker.length);
  if (end < 0) fail(`module end missing: ${name}`);
  return source.slice(start, end);
}

assert(newSource.includes('//@version 0.63.21'), 'version not patched');
assert(newSource.includes('// v0.63.21 Diagnostic Turn Binding:'), '0.63.21 changelog missing');
assert(newSource.includes("status: result.active ? 'ACTIVE' : 'INACTIVE'"), 'request runtime status telemetry missing');
assert(newSource.includes("handshake: promptProbe.active ? 'FOUND' : 'NOT FOUND'"), 'handshake telemetry missing');
assert(newSource.includes("status: 'ERROR', active: false, mode: null, errorStage: 'beforeRequest'"), 'beforeRequest error telemetry missing');
assert(newSource.includes("outputStatus: 'COMMITTED'"), 'output commit binding missing');
assert(newSource.includes("outputStatus: 'BYPASSED'"), 'inactive output binding missing');

const frozenModules = [
  'contracts', 'kernel', 'store', 'lifecycle', 'time', 'frame', 'recurrence', 'lineage', 'handoff',
  'evidence', 'community', 'reaction', 'structure', 'recovery', 'prompt', 'session', 'ops',
];
for (const name of frozenModules) {
  assert(moduleBlock(oldSource, name) === moduleBlock(newSource, name), `frozen module changed: ${name}`);
}

for (const ioToken of [
  'Risuai.getChatFromIndex', 'Risuai.setChatToIndex', 'Risuai.getCurrentCharacterIndex',
  'Risuai.getCurrentChatIndex', 'pluginStorage', "addRisuReplacer('beforeRequest'",
  "addRisuScriptHandler('output'", 'setTimeout(',
]) {
  assert(count(oldSource, ioToken) === count(newSource, ioToken), `host/storage/timer call-site count changed: ${ioToken}`);
}

assert(!newSource.includes("`Mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`"), 'stale mode fallback still present in copied diagnostic');
assert(!newSource.includes("[`Current mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`]"), 'stale recent-section mode fallback still present');
assert(newSource.includes("`Mode: ${runtimeMode || 'n/a'}`"), 'runtime-only Mode line missing');
assert(newSource.includes("`Stored last mode: ${state?.lastMode || 'n/a'}`"), 'stored mode provenance line missing');
assert(newSource.includes("`Probe context: ${probeFresh ? 'CURRENT TURN'"), 'CURRENT TURN provenance label missing');
assert(newSource.includes("RAW frame continuity:"), 'RAW frame provenance label missing');
assert(newSource.includes("Stored broadcast:"), 'stored broadcast provenance label missing');
assert(newSource.includes("Short-C source lock: ${runtimeActive ?"), 'source-lock freshness gate missing');

const helperStart = newSource.indexOf('  function diagnosticRequestProbeFresh(');
const helperEnd = newSource.indexOf('  function markDiagnosticRequestProbe(', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'diagnostic pure helpers missing');
const helperSource = newSource.slice(helperStart, helperEnd);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(helperSource, ctx, { filename: 'diagnostic-helpers.js' });

const fresh = ctx.diagnosticRequestProbeFresh;
const runtimeMode = ctx.diagnosticRuntimeMode;
assert(typeof fresh === 'function' && typeof runtimeMode === 'function', 'diagnostic helpers did not load');

const activeA = { locationKey: '0:7:chat-x', sendIndex: 1620, status: 'ACTIVE', mode: 'A' };
assert(fresh(activeA, '0:7:chat-x', 1620) === true, 'current A request should be fresh');
assert(runtimeMode(true, activeA) === 'A', 'current active A mode missing');

const priorC = { locationKey: '0:7:chat-x', sendIndex: 1618, status: 'ACTIVE', mode: 'C' };
assert(fresh(priorC, '0:7:chat-x', 1620) === false, 'prior same-chat C probe must be stale after A turn');
assert(runtimeMode(false, priorC) === null, 'stale prior C must not surface as current mode');

const inactiveCurrent = { locationKey: '0:7:chat-x', sendIndex: 1620, status: 'INACTIVE', mode: null };
assert(fresh(inactiveCurrent, '0:7:chat-x', 1620) === true, 'current inactive route should still be CURRENT TURN');
assert(runtimeMode(true, inactiveCurrent) === null, 'inactive current request must expose runtime mode n/a');

const errorCurrent = { locationKey: '0:7:chat-x', sendIndex: 1620, status: 'ERROR', mode: null };
assert(fresh(errorCurrent, '0:7:chat-x', 1620) === true, 'current error route should still bind to current turn');
assert(runtimeMode(true, errorCurrent) === null, 'error current request must expose runtime mode n/a');

assert(fresh(activeA, '0:8:other-chat', 1620) === false, 'different chat must be stale');
assert(fresh(activeA, '0:7:chat-x', 1621) === false, 'different user index must be stale');
assert(fresh(null, '0:7:chat-x', 1620) === false, 'missing probe must be unavailable');

const frame = moduleBlock(newSource, 'frame');
assert(frame.includes("applied.push('CHAPTER_TITLE_HOLD')"), '0.63.20 same-title hold missing');
assert(frame.includes("previous.chapterTitle === observed.chapterTitle"), 'same-title equality guard missing');
assert(moduleBlock(oldSource, 'frame') === frame, 'Frame changed during diagnostics-only release');
assert(moduleBlock(oldSource, 'evidence') === moduleBlock(newSource, 'evidence'), 'Evidence changed during diagnostics-only release');
assert(moduleBlock(oldSource, 'prompt') === moduleBlock(newSource, 'prompt'), 'Prompt changed during diagnostics-only release');
assert(moduleBlock(oldSource, 'time') === moduleBlock(newSource, 'time'), 'Time changed during diagnostics-only release');

const oldPrompt = moduleBlock(oldSource, 'prompt');
const newPrompt = moduleBlock(newSource, 'prompt');
assert(oldPrompt === newPrompt, 'runtime prompt serialization changed');

console.log('0.63.21 Diagnostic Turn Binding OK; same-chat old probes cannot masquerade as the current turn');
console.log('Route telemetry OK: CURRENT active/inactive/error are distinguishable; runtime mode never falls back to stored lastMode');
console.log('freeze OK: all 17 internal modules byte-identical; Frame/Evidence/Prompt/Time semantics and host/storage/timer call-site counts unchanged');
