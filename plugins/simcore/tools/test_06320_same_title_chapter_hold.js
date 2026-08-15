const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06319-baseline.js', 'utf8');
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

function loadModule(source, name, deps = {}) {
  const block = moduleBlock(source, name);
  let factory = null;
  vm.runInNewContext(block, {
    SimCore: { define(definedName, fn) { if (definedName === name) factory = fn; } },
  }, { filename: `${name}.js` });
  if (!factory) fail(`factory missing: ${name}`);
  const module = { exports: {} };
  factory((requested) => {
    const key = String(requested).replace(/^\.\//, '').replace(/\.js$/, '');
    if (!(key in deps)) fail(`${name}: unexpected dependency ${requested}`);
    return deps[key];
  }, module, module.exports);
  return module.exports;
}

assert(newSource.includes('//@version 0.63.20'), 'version not patched');
assert(newSource.includes('// v0.63.20 Same-Title Chapter Hold:'), '0.63.20 changelog missing');
assert(count(newSource, 'SimCore.define("frame", function (require, module, exports) {') === 1, 'Frame module count != 1');

const frozenModules = [
  'kernel', 'store', 'lifecycle', 'time', 'recurrence', 'lineage', 'handoff', 'evidence',
  'community', 'reaction', 'structure', 'recovery', 'prompt', 'session', 'ops',
];
for (const name of frozenModules) {
  assert(moduleBlock(oldSource, name) === moduleBlock(newSource, name), `frozen module changed: ${name}`);
}

const contracts = moduleBlock(newSource, 'contracts');
assert(contracts.includes("same-title Chapter-number hold"), 'Frame contract did not gain same-title hold ownership');
assert(contracts.includes("semantic title interpretation"), 'Frame contract missing semantic non-goal');

const frameSource = moduleBlock(newSource, 'frame');
for (const forbidden of ['pluginStorage', 'Risuai.', 'getChatFromIndex', 'setChatToIndex', 'fetch(', 'summar', 'history search']) {
  assert(!frameSource.includes(forbidden), `Frame module acquired forbidden responsibility/token: ${forbidden}`);
}
assert(frameSource.includes("applied.push('CHAPTER_TITLE_HOLD')"), 'same-title hold probe marker missing');
assert(frameSource.includes("text.normalize('NFKC')"), 'chapter-title normalization missing');

for (const ioToken of [
  'Risuai.getChatFromIndex', 'Risuai.setChatToIndex', 'pluginStorage',
  "addRisuReplacer('beforeRequest'", "addRisuScriptHandler('output'",
]) {
  assert(count(oldSource, ioToken) === count(newSource, ioToken), `host/storage call-site count changed: ${ioToken}`);
}

const frame = loadModule(newSource, 'frame');
const previousText = `# 응답\n\n## 볼륨 63: 완전한 궤도\n### 챕터 9: 맑은 눈의 광인\n#### Chatindex: 782∮\n⏱️[2029-01-29 (Mon) 02:30 PM]\n\n<COMMUNITY>x</COMMUNITY>`;
const previous = frame.parseFrame(previousText);
assert(previous.volume === 63 && previous.chapter === 9 && previous.chatindex === 782, 'parseFrame numeric parse failed');
assert(previous.chapterTitle === '맑은 눈의 광인', 'Chapter title parse failed');
assert(previous.chapterHeader === '### 챕터 9: 맑은 눈의 광인', 'full Chapter heading not preserved');

function candidate(volume, volumeTitle, chapter, chapterTitle, chatindex) {
  return `# 응답\n\n## 볼륨 ${volume}: ${volumeTitle}\n### 챕터 ${chapter}: ${chapterTitle}\n#### Chatindex: ${chatindex}∮\n⏱️[2029-01-30 (Tue) 10:00 AM]\n\n<COMMUNITY>x</COMMUNITY>`;
}

let r = frame.enforceContinuity(candidate(63, '완전한 궤도', 10, '맑은 눈의 광인', 783), previous);
assert(r.probe.applied, 'same-title Chapter advance was not held');
assert(r.probe.regression === 'CHAPTER_TITLE_HOLD', `unexpected hold probe: ${r.probe.regression}`);
assert(r.probe.observed.chapter === 10 && r.probe.output.chapter === 9, 'same-title Chapter number was not restored');
assert(r.probe.output.chatindex === 783, 'valid Chatindex advance changed during Chapter hold');
assert(r.content.includes('### 챕터 9: 맑은 눈의 광인'), 'previous full Chapter heading not restored');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 12, '맑은   눈의   광인', 790), previous);
assert(r.probe.regression === 'CHAPTER_TITLE_HOLD', 'whitespace-normalized identical title was not held');
assert(r.probe.output.chapter === 9 && r.probe.output.chatindex === 790, 'normalized-title hold touched unrelated frame values');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 10, '새로운 챕터', 783), previous);
assert(!r.probe.applied && r.probe.output.chapter === 10, 'different-title Chapter advance must pass');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 783), previous);
assert(!r.probe.applied && r.probe.output.chapter === 9, 'same-title same-number frame should pass');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 5, '맑은 눈의 광인', 783), previous);
assert(r.probe.regression === 'CHAPTER', 'existing same-volume backward Chapter floor changed');
assert(r.probe.output.chapter === 9 && r.probe.output.chatindex === 783, 'backward Chapter floor output changed');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 5, '다른 제목', 777), previous);
assert(r.probe.regression === 'CHAPTER+CHATINDEX', 'existing combined backward floor changed');
assert(r.probe.output.chapter === 9 && r.probe.output.chatindex === 782, 'combined backward floor failed');

r = frame.enforceContinuity(candidate(64, '다음 볼륨', 1, '새 출발', 783), previous);
assert(!r.probe.applied, 'Volume advance + different-title Chapter reset must remain allowed');
assert(r.probe.output.volume === 64 && r.probe.output.chapter === 1, 'Volume-advance Chapter reset changed');

r = frame.enforceContinuity(candidate(64, '다음 볼륨', 10, '맑은 눈의 광인', 783), previous);
assert(r.probe.regression === 'CHAPTER_TITLE_HOLD', 'same-title Chapter advance across Volume boundary must still hold');
assert(r.probe.output.volume === 64 && r.probe.output.chapter === 9, 'same-title hold incorrectly changed Volume or failed Chapter hold');

r = frame.enforceContinuity(candidate(62, '과거 볼륨', 15, '과거 챕터', 783), previous);
assert(r.probe.regression === 'VOLUME+CHAPTER', 'Volume regression behavior changed');
assert(r.probe.output.volume === 63 && r.probe.output.chapter === 9 && r.probe.output.chatindex === 783, 'Volume regression floor failed');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 900), previous);
assert(!r.probe.applied && r.probe.output.chatindex === 900, 'Frame must not enforce Chatindex +1');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 700), previous);
assert(r.probe.regression === 'CHATINDEX' && r.probe.output.chatindex === 782, 'Chatindex backward floor changed');

const noTitlePrevious = frame.parseFrame(candidate(63, '완전한 궤도', 9, '', 782));
r = frame.enforceContinuity(candidate(63, '완전한 궤도', 10, '', 783), noTitlePrevious);
assert(!r.probe.applied, 'empty Chapter title should fail open rather than invent identity');

assert(moduleBlock(oldSource, 'evidence') === moduleBlock(newSource, 'evidence'), 'Evidence Fence changed');
assert(moduleBlock(oldSource, 'prompt') === moduleBlock(newSource, 'prompt'), 'Prompt changed');
assert(moduleBlock(oldSource, 'time') === moduleBlock(newSource, 'time'), 'Time changed');
assert(moduleBlock(oldSource, 'session') === moduleBlock(newSource, 'session'), 'Session plumbing changed');

console.log('0.63.20 Same-Title Chapter Hold OK; identical non-empty Chapter title cannot advance Chapter number');
console.log('Frame compatibility OK: backward Volume/Chapter/Chatindex floors preserved; different-title advance and Volume reset preserved; Chatindex remains independent');
console.log('freeze OK: Evidence/Prompt/Time/Session and all non-Contracts/non-Frame modules byte-identical; no new host/storage call sites');
