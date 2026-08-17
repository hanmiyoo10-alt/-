const fs = require('fs');
const vm = require('vm');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const after = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(after.includes('//@version 0.63.33'), 'missing 0.63.33 metadata');
assert(after.includes("'Version: 0.63.33'"), 'missing diagnostic version');
assert(after.includes('⚙️ SimCore v0.63.33'), 'missing panel version');
assert(after.includes('Output handler breakdown:'), 'missing output handler breakdown');
assert(after.includes('Output process:'), 'missing output process breakdown');
assert(after.includes('Output mirror:'), 'missing output mirror breakdown');
assert(after.includes('Output hotspot:'), 'missing output hotspot');
assert(after.includes('diagnosticOutputBreakdown(lastOutputPerf)'), 'missing lastOutputPerf diagnostic binding');

function extractFunction(src, name, nextName) {
  const start = src.indexOf(`  function ${name}(`);
  const end = src.indexOf(`\n\n  function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`cannot extract ${name}`);
  return src.slice(start + 2, end);
}

const fnSource = extractFunction(after, 'diagnosticOutputBreakdown', 'buildLastTurnDiagnosticReport');
const context = {};
vm.createContext(context);
vm.runInContext(`${fnSource}; this.breakdown = diagnosticOutputBreakdown;`, context);
const breakdown = context.breakdown;

const warm = breakdown({
  totalMs: 283,
  indicesMs: 1,
  chatLoadMs: 20,
  sessionLoadMs: 0,
  sessionProcessMs: 61,
  mirrorMs: 196,
  diagnosticsMs: 3,
  outputDetail: {
    stateLoadSource: 'memory-fast',
    stateLoadMs: 0,
    prepareMs: 3,
    validateMs: 2,
    finalizeMs: 5,
    outSerializeMs: 0,
    outSetMs: 50,
    outPruneMs: 0,
    pruneDeferred: false,
  },
  mirrorDetail: { chatLoadMs: 0, prepareMs: 1, setChatMs: 193 },
});
assert(warm.stateSource === 'MEMORY_FAST', `wrong warm state source ${warm.stateSource}`);
assert(warm.processOther === 1, `wrong process other ${warm.processOther}`);
assert(warm.mirrorOther === 2, `wrong mirror other ${warm.mirrorOther}`);
assert(warm.handlerOther === 2, `wrong handler other ${warm.handlerOther}`);
assert(warm.hotspot === 'CHAT_MIRROR_WRITE', `expected mirror hotspot, got ${warm.hotspot}`);
assert(warm.hotspotMs === 193, `wrong mirror hotspot ms ${warm.hotspotMs}`);
assert(Math.abs(warm.hotspotPercent - (193 / 283 * 100)) < 1e-9, 'wrong warm hotspot percent');

const fallback = breakdown({
  totalMs: 220,
  indicesMs: 1,
  chatLoadMs: 20,
  sessionLoadMs: 0,
  sessionProcessMs: 150,
  mirrorMs: 40,
  diagnosticsMs: 5,
  outputDetail: {
    stateLoadSource: 'storage-fallback',
    stateLoadMs: 120,
    prepareMs: 5,
    validateMs: 2,
    finalizeMs: 3,
    outSerializeMs: 0,
    outSetMs: 15,
    outPruneMs: 0,
    pruneDeferred: true,
  },
  mirrorDetail: { chatLoadMs: 0, prepareMs: 1, setChatMs: 37 },
});
assert(fallback.stateSource === 'STORAGE_FALLBACK', `wrong fallback state source ${fallback.stateSource}`);
assert(fallback.processOther === 5, `wrong fallback process other ${fallback.processOther}`);
assert(fallback.mirrorOther === 2, `wrong fallback mirror other ${fallback.mirrorOther}`);
assert(fallback.handlerOther === 4, `wrong fallback handler other ${fallback.handlerOther}`);
assert(fallback.hotspot === 'OUTPUT_STATE_LOAD', `expected state-load hotspot, got ${fallback.hotspot}`);
assert(fallback.hotspotMs === 120, `wrong fallback hotspot ms ${fallback.hotspotMs}`);
assert(fallback.pruneDeferred === true, 'prune deferred telemetry lost');

// Request breakdown must remain exactly the v0.63.32 implementation.
const beforeReq = extractFunction(before, 'diagnosticRequestBreakdown', 'buildLastTurnDiagnosticReport');
const afterReqStart = after.indexOf('  function diagnosticRequestBreakdown(');
const afterReqEnd = after.indexOf('\n\n  function diagnosticOutputBreakdown(', afterReqStart);
assert(afterReqStart >= 0 && afterReqEnd >= 0, 'cannot extract post-patch request breakdown');
const afterReq = after.slice(afterReqStart + 2, afterReqEnd);
assert(beforeReq === afterReq, 'request breakdown changed');

console.log('SimCore 0.63.33 output commit breakdown fixtures: PASS');
