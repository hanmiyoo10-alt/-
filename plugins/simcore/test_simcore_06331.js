const fs = require('fs');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const after = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function modules(src) {
  const re = /SimCore\.define\("([^"]+)", function \(require, module, exports\) \{/g;
  const hits = [...src.matchAll(re)];
  const out = {};
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : src.indexOf('\n\n(async () => {', start);
    out[hits[i][1]] = src.slice(start, end);
  }
  return out;
}

const bmods = modules(before);
const amods = modules(after);
const expected = ['contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time','lifecycle','reaction','frame','structure','recovery','prompt','session','ops'];
assert(JSON.stringify(Object.keys(bmods)) === JSON.stringify(expected), 'baseline module registry mismatch');
assert(JSON.stringify(Object.keys(amods)) === JSON.stringify(expected), 'patched module registry mismatch');
for (const name of expected) assert(bmods[name] === amods[name], `module changed: ${name}`);

const helperStart = after.indexOf('function diagnosticNumericDelta(');
const helperEnd = after.indexOf('function buildLastTurnDiagnosticReport(', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'diagnostic helper block missing');
const helperSource = after.slice(helperStart, helperEnd);
const helpers = new Function(`${helperSource}\nreturn { diagnosticNumericDelta, diagnosticFormatMs, diagnosticRequestBreakdown };`)();

const coldProbe = { at: 1000, handshakeAt: 1752, requestTotalMs: 818 };
const coldPerf = {
  totalMs: 818,
  indicesMs: 10,
  chatLoadMs: 20,
  sessionLoadMs: 700,
  promptScanMs: 10,
  bootstrapMs: 5,
  editReconcileMs: 2,
  aliasRepairMs: 1,
  onSendMs: 40,
  postOnSendMs: 10,
  sessionDetail: {
    path: 'COLD_INIT',
    chatFallbackMs: 0,
    characterLoadMs: 100,
    initScanMs: 5,
    initMs: 580,
  },
  snapshotDetail: {
    preLoadMs: 2,
    templateBootstrapMs: 3,
    lifecycleMs: 5,
    turnSerializeMs: 4,
    turnSetMs: 10,
    runtimeRenderMs: 1,
  },
};
const cold = helpers.diagnosticRequestBreakdown(coldProbe, coldPerf);
assert(cold.handshakeTotal === 752, 'cold handshake total');
assert(cold.handshakeOther === 12, 'cold handshake other');
assert(cold.postHandshakeTotal === 66, 'cold post-handshake total');
assert(cold.postHandshakeOther === 8, 'cold post-handshake other');
assert(cold.sessionPath === 'COLD_INIT', 'cold session path');
assert(cold.sessionOther === 15, 'cold session other');
assert(cold.onSendOther === 15, 'cold onSend other');
assert(cold.hotspot === 'SESSION_INIT' && cold.hotspotMs === 580, 'cold hotspot should be session init');
assert(Math.abs(cold.hotspotPercent - (580 / 818 * 100)) < 1e-9, 'cold hotspot percent');

const warmProbe = { at: 2000, handshakeAt: 2030, requestTotalMs: 77 };
const warmPerf = {
  totalMs: 77,
  indicesMs: 4,
  chatLoadMs: 5,
  sessionLoadMs: 1,
  promptScanMs: 8,
  bootstrapMs: 0,
  editReconcileMs: 3,
  aliasRepairMs: 2,
  onSendMs: 35,
  postOnSendMs: 5,
  sessionDetail: { path: 'LOCATION_REUSE', chatFallbackMs: 0, characterLoadMs: 0, initScanMs: 0, initMs: 0 },
  snapshotDetail: { preLoadMs: 1, templateBootstrapMs: 0, lifecycleMs: 4, turnSerializeMs: 3, turnSetMs: 20, runtimeRenderMs: 1 },
};
const warm = helpers.diagnosticRequestBreakdown(warmProbe, warmPerf);
assert(warm.handshakeTotal === 30, 'warm handshake total');
assert(warm.sessionPath === 'LOCATION_REUSE', 'warm session path');
assert(warm.hotspot === 'TURN_STORAGE' && warm.hotspotMs === 20, 'warm hotspot should be storage');
assert(helpers.diagnosticFormatMs(77) === '77.0 ms', 'ms formatting');
assert(helpers.diagnosticFormatMs(1234) === '1.234 s', 'seconds formatting');
assert(helpers.diagnosticNumericDelta(10, 20) === 10, 'numeric delta');
assert(helpers.diagnosticNumericDelta(20, 10) === null, 'backward delta rejected');

for (const token of [
  'Handshake breakdown:', 'Session load:', 'Post-handshake breakdown:', 'onSend breakdown:', 'Request hotspot:',
  "detail.path = 'LOCATION_REUSE'", "detail.path = 'KEY_REUSE'", "detail.path = 'COLD_INIT'",
]) assert(after.includes(token), `missing token: ${token}`);

assert(after.includes('Preamble provenance:'), 'preamble diagnostics must remain');
assert(after.includes('policy ${preamble.policy'), 'v0.63.30 preamble policy display must remain');

console.log('SimCore 0.63.31 request breakdown fixtures: PASS');
