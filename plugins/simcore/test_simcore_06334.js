const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.34'));
assert(src.includes('// v0.63.34 Deferred Chat Mirror:'));
assert(src.includes('function captureCoreMirrorSnapshot('));
assert(src.includes('function scheduleDeferredCoreMirror('));
assert(src.includes("const timer = setTimeout(() => { void runDeferredMirror(); }, 0);"));
assert(src.includes("const chat = chatArg || await Risuai.getChatFromIndex(chaIdx, chatIdx);"));
assert(src.includes("detail.status = 'OUTPUT_NOT_READY'"));
assert(src.includes("detail.status = 'OUTPUT_MISMATCH'"));
assert(src.includes("detail.status = 'LOCATION_MISMATCH'"));
assert(src.includes("detail.status = 'GUARD_DROPPED'"));
assert(src.includes("deferredMirrorLatestByLocation.get(locationKey) === sequence"));
assert(src.includes("scheduleDeferredCoreMirror(chaIdx, chatIdx, chat, outIndex, result.state)"));
assert(!src.includes('await mirrorCoreState(chaIdx, chatIdx, chat, mirrorDetail);'));
assert(src.includes('Output mirror: ${outputBreakdown ? `DEFERRED · critical path'));
assert(src.includes('Deferred mirror: ${deferredMirror ?'));
assert(src.includes('deferredMirrorLatestByLocation.clear();'));

const processStart = src.indexOf('  async function processCoreOutput(');
const processEnd = src.indexOf('\n\n  const beforeRequestHandler', processStart);
assert(processStart >= 0 && processEnd > processStart);
const processBlock = src.slice(processStart, processEnd);
assert(processBlock.includes("markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED'"));
assert(processBlock.indexOf("outputStatus: 'COMMITTED'") < processBlock.indexOf('scheduleDeferredCoreMirror('));
assert(processBlock.includes('perf.mirrorMs = 0;'));
assert(processBlock.includes('return result.content;'));

const mirrorStart = src.indexOf('  async function mirrorCoreState(');
const mirrorEnd = src.indexOf('\n\n  function scheduleDeferredCoreMirror(', mirrorStart);
assert(mirrorStart >= 0 && mirrorEnd > mirrorStart);
const mirrorBlock = src.slice(mirrorStart, mirrorEnd);
const getPos = mirrorBlock.indexOf('await Risuai.getChatFromIndex');
const firstGuardAfterGet = mirrorBlock.indexOf('if (!guard())', getPos);
const setPos = mirrorBlock.indexOf('await Risuai.setChatToIndex');
const guardBeforeSet = mirrorBlock.lastIndexOf('if (!guard())', setPos);
assert(getPos >= 0 && firstGuardAfterGet > getPos);
assert(setPos > getPos && guardBeforeSet > getPos && guardBeforeSet < setPos);
assert(mirrorBlock.indexOf('actualFingerprint !== canonical && actualFingerprint !== hostRaw') > getPos);

console.log('SimCore 0.63.34 deferred chat mirror fixtures: PASS');
