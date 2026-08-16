const fs = require('fs');
const source = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

function moduleSnippet(name, nextName) {
  const start = source.indexOf(`SimCore.define("${name}", function (require, module, exports) {`);
  if (start < 0) throw new Error(`missing module ${name}`);
  const end = source.indexOf(`SimCore.define("${nextName}", function (require, module, exports) {`, start + 1);
  if (end < 0) throw new Error(`missing next module ${nextName}`);
  return source.slice(start, end);
}

function evaluateModule(snippet) {
  let output = null;
  global.SimCore = {
    define(_name, fn) {
      const module = { exports: {} };
      fn(() => { throw new Error('time module must not require deps'); }, module, module.exports);
      output = module.exports;
    },
  };
  eval(snippet);
  delete global.SimCore;
  return output;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const time = evaluateModule(moduleSnippet('time', 'lifecycle'));
const frame = '⏱️[2029-06-14 (Thu) 03:00 PM]';
const equal = '⏱️[2029-06-14 (Thu) 03:00 PM]';
const forward = '⏱️[2029-06-14 (Thu) 07:30 PM]';
const backward = '⏱️[2029-06-14 (Thu) 01:00 PM]';
const futureYear = '⏱️[2030-01-01 (Tue) 12:15 AM]';

function response(lines = []) {
  return ['host preamble with inline ⏱️[2099-01-01 (Thu) 11:59 PM]', '# 응답', '', '## 볼륨 65: 테스트', '### 챕터 2: 테스트', '#### Chatindex: 801∮', frame, '', ...lines, '', '<Knowledge>ok</Knowledge>'].join('\n');
}

function canonicalResponse(lines = []) {
  const raw = response(lines);
  return raw.slice(raw.indexOf('# 응답'));
}

let seq = time.narrativeTimestampSequence(response());
assert(seq.frameTimestamp === frame, 'A: frame timestamp must be scoped after # 응답');
assert(seq.candidate === frame && seq.sceneCount === 0 && seq.tailStatus === 'FRAME_ONLY', 'A: frame-only output must preserve legacy commit');

seq = time.narrativeTimestampSequence(response(['장면', '', forward]));
assert(seq.candidate === forward, 'B: monotonic body tail must be candidate');
assert(seq.sceneCount === 1 && seq.tailStatus === 'MONOTONIC' && seq.tailPromoted, 'B: one scene timestamp must promote');

seq = time.narrativeTimestampSequence(response([equal, '', forward]));
assert(seq.candidate === forward && seq.sceneCount === 2 && seq.tailStatus === 'MONOTONIC', 'C: equal then forward is monotonic');

seq = time.narrativeTimestampSequence(response([backward, '', forward]));
assert(seq.candidate === frame && seq.tailStatus === 'SKIPPED_NON_MONOTONIC' && !seq.tailPromoted, 'D: non-monotonic sequence must fail open to frame');

seq = time.narrativeTimestampSequence(response([forward, '', '⏱️[2029-06-14 (Thu) 99:99 PM]']));
assert(seq.candidate === frame && seq.tailStatus === 'SKIPPED_MALFORMED', 'E: malformed timestamp marker must fail open to frame');

seq = time.narrativeTimestampSequence(response(['본문 안 inline ' + backward, '', forward]));
assert(seq.candidate === forward && seq.sceneCount === 1, 'F: inline timestamp mention must not become a scene boundary');

let state = { narrativeTimestamp: '⏱️[2029-06-14 (Thu) 02:00 PM]' };
let commit = time.commitNarrativeTimestamp(state, { mode: 'A', narrativeTimestampPrevious: state.narrativeTimestamp }, response(['장면', '', forward]));
assert(commit.reason === 'committed' && commit.timestamp === forward && state.narrativeTimestamp === forward, 'G: monotonic tail must persist');

state = { narrativeTimestamp: '⏱️[2029-06-14 (Thu) 02:00 PM]' };
commit = time.commitNarrativeTimestamp(state, { mode: 'A', narrativeTimestampPrevious: state.narrativeTimestamp }, response([backward, '', forward]));
assert(commit.timestamp === frame && state.narrativeTimestamp === frame && commit.tailStatus === 'SKIPPED_NON_MONOTONIC', 'H: skipped tail must persist frame only');

let floorInput = canonicalResponse([])
  .replace(frame, '⏱️[2029-06-14 (Thu) 01:00 PM]')
  .replace('<Knowledge>', `${forward}\n\n<Knowledge>`);
let floor = time.enforceNarrativeCurrentTimeFloor(floorInput, frame);
assert(floor.changed, 'I: backward frame must still clamp');
state = { narrativeTimestamp: frame };
commit = time.commitNarrativeTimestamp(state, { mode: 'A', narrativeTimestampPrevious: frame }, floor.content);
assert(commit.timestamp === forward && state.narrativeTimestamp === forward, 'I: safe tail after a frame clamp may still promote');

state = { narrativeTimestamp: frame };
assert(time.syncNarrativeTimestamp(state, response([futureYear]), 'A'), 'J: sync path must use safe tail');
assert(state.narrativeTimestamp === futureYear, 'J: sync path must persist future-year tail');

const broadcastState = { broadcastAirtime: null, broadcastAirtimeStart: null };
const broadcastCommit = time.commitBroadcastAirtime(broadcastState, { mode: 'B_START', broadcastAirtimeIsNew: true }, canonicalResponse([forward]));
assert(broadcastCommit.timestamp === frame && broadcastState.broadcastAirtime === frame, 'K: broadcast airtime must remain first-timestamp based');

console.log('SimCore 0.63.28 multi-scene narrative clock fixtures: PASS');
