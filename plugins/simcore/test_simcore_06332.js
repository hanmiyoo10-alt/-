const fs = require('fs');
const vm = require('vm');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const after = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(after.includes('//@version 0.63.32'), 'missing 0.63.32 metadata');
assert(after.includes("'Version: 0.63.32'"), 'missing diagnostic version');
assert(after.includes('⚙️ SimCore v0.63.32'), 'missing panel version');
assert(after.includes('Pre snapshot:'), 'missing pre snapshot diagnostic');
assert(after.includes('Turn storage:'), 'missing turn storage diagnostic');
assert(after.includes('metric.payloadChars = payload.length;'), 'missing O(1) payload length metric');
assert(after.includes('detail.turnPayloadChars = Number(turnMetric.payloadChars || 0);'), 'missing payload metric plumbing');
assert(after.includes('set/1K'), 'missing set per 1K diagnostic');
assert(!after.includes('TextEncoder'), 'must not add TextEncoder payload scan');
assert(!after.includes('new Blob('), 'must not add Blob payload scan');

const payloadAnchor = 'const payload = JSON.stringify({ snapshotVersion: 1, pre: preState, send: sendState });';
assert(before.includes(payloadAnchor), 'baseline bundled payload anchor missing');
assert(after.includes(payloadAnchor), 'bundled payload shape changed');
assert((after.match(/JSON\.stringify\(\{ snapshotVersion: 1, pre: preState, send: sendState \}\)/g) || []).length === 1,
  'bundled payload must still stringify exactly once');

function extractFunction(src, name, nextName) {
  const start = src.indexOf(`  function ${name}(`);
  const end = src.indexOf(`\n\n  function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`cannot extract ${name}`);
  return src.slice(start + 2, end);
}

const diagnosticNumericDelta = (from, to) => {
  const a = Number(from);
  const b = Number(to);
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= a ? b - a : null;
};

const fnSource = extractFunction(after, 'diagnosticRequestBreakdown', 'buildLastTurnDiagnosticReport');
const context = { diagnosticNumericDelta };
vm.createContext(context);
vm.runInContext(`${fnSource}; this.breakdown = diagnosticRequestBreakdown;`, context);
const breakdown = context.breakdown;

const forward = breakdown(
  { at: 1000, handshakeAt: 1055, requestTotalMs: 212 },
  {
    totalMs: 212,
    indicesMs: 1, chatLoadMs: 53, sessionLoadMs: 0, promptScanMs: 1,
    bootstrapMs: 0, editReconcileMs: 0, aliasRepairMs: 3, onSendMs: 153, postOnSendMs: 0,
    sessionDetail: { path: 'LOCATION_REUSE', chatFallbackMs: 0, characterLoadMs: 0, initScanMs: 0, initMs: 0 },
    snapshotDetail: {
      preLoadMs: 0, templateBootstrapMs: 0, lifecycleMs: 3, turnSerializeMs: 0,
      turnSetMs: 149, turnPayloadChars: 20000, runtimeRenderMs: 1,
      restoreReason: 'forward', mustRestorePre: false, existingPre: false,
    },
  }
);
assert(forward.restoreReason === 'forward', 'forward reason lost');
assert(forward.preRead === false && forward.preHit === false, 'forward pre-read classification wrong');
assert(forward.turnPayloadChars === 20000, 'payload chars lost');
assert(Math.abs(forward.turnSetPerKChars - 7.45) < 1e-9, 'set/1K math wrong');
assert(forward.hotspot === 'TURN_STORAGE', `expected TURN_STORAGE hotspot, got ${forward.hotspot}`);

const repeat = breakdown(
  { at: 1000, handshakeAt: 1059, requestTotalMs: 527 },
  {
    totalMs: 527,
    indicesMs: 2, chatLoadMs: 52, sessionLoadMs: 0, promptScanMs: 1,
    bootstrapMs: 0, editReconcileMs: 1, aliasRepairMs: 2, onSendMs: 464, postOnSendMs: 2,
    sessionDetail: { path: 'LOCATION_REUSE', chatFallbackMs: 0, characterLoadMs: 0, initScanMs: 0, initMs: 0 },
    snapshotDetail: {
      preLoadMs: 319, templateBootstrapMs: 0, lifecycleMs: 7, turnSerializeMs: 0,
      turnSetMs: 138, turnPayloadChars: 19500, runtimeRenderMs: 0,
      restoreReason: 'repeat-send', mustRestorePre: true, existingPre: true,
    },
  }
);
assert(repeat.restoreReason === 'repeat-send', 'repeat-send reason lost');
assert(repeat.preRead === true && repeat.preHit === true, 'repeat-send pre-read classification wrong');
assert(repeat.hotspot === 'PRE_LOAD', `expected PRE_LOAD hotspot, got ${repeat.hotspot}`);
assert(repeat.turnPayloadChars === 19500, 'repeat payload chars lost');

console.log('SimCore 0.63.32 snapshot write attribution fixtures: PASS');
