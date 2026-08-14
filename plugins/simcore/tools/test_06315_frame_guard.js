const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06315-baseline.js', 'utf8');
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

assert(newSource.includes('//@version 0.63.15'), 'version not patched');
assert(newSource.includes('// v0.63.15 Frame Guard:'), '0.63.15 changelog missing');
assert(count(newSource, 'SimCore.define("frame", function (require, module, exports) {') === 1, 'Frame module count != 1');

const frozenModules = [
  'kernel', 'store', 'lifecycle', 'time', 'recurrence', 'lineage', 'handoff',
  'community', 'reaction', 'structure', 'recovery', 'prompt', 'ops',
];
for (const name of frozenModules) {
  assert(moduleBlock(oldSource, name) === moduleBlock(newSource, name), `frozen module changed: ${name}`);
}
assert(!moduleBlock(newSource, 'prompt').includes('frameFloor'), 'Prompt learned frameFloor state');
assert(!moduleBlock(newSource, 'prompt').includes("require('./frame')"), 'Prompt acquired Frame dependency');

const contracts = moduleBlock(newSource, 'contracts');
assert(contracts.includes("frame: Object.freeze({ owns: 'visible response-frame parsing and deterministic backward continuity floor'"), 'Frame contract missing');
assert(contracts.includes("excludes: 'progression decisions, semantic rewriting, host/storage I/O'"), 'Frame exclusions missing');

const session = moduleBlock(newSource, 'session');
assert(count(session, "const frame = require('./frame');") === 1, 'Session Frame require count != 1');
assert(count(session, 'state.pending.frameFloor = frame.capturePreviousFrame(historyMessages, sendIndex, kernel.textOfMessage);') === 1, 'frame floor capture plumbing missing');
assert(count(session, 'const frameGuard = frame.enforceContinuity(finalText, p.frameFloor || null);') === 1, 'frame enforcement plumbing missing');
assert(count(session, 'frameGuardProbe: frameGuard.probe') === 1, 'frame probe return missing');

const frameSource = moduleBlock(newSource, 'frame');
for (const forbidden of ['pluginStorage', 'Risuai.', 'getChatFromIndex', 'setChatToIndex', 'fetch(', 'semantic', 'summar']) {
  assert(!frameSource.includes(forbidden), `Frame module acquired forbidden responsibility/token: ${forbidden}`);
}

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
assert(previous.chapterHeader === '### 챕터 9: 맑은 눈의 광인', 'parseFrame did not preserve full chapter heading');

const history = [
  { role: 'assistant', content: '# 응답\n## 볼륨 62: old\n### 챕터 20: old\n#### Chatindex: 780∮' },
  { role: 'user', content: 'old user' },
  { role: 'char', content: previousText },
  { role: 'user', content: '[커뮤니티] 런닝맨 반응' },
];
const captured = frame.capturePreviousFrame(history, 3, (m) => m.content);
assert(captured && captured.sourceAssistantIndex === 2, 'capturePreviousFrame did not choose immediate prior assistant');
assert(captured.volume === 63 && captured.chapter === 9 && captured.chatindex === 782, 'captured frame mismatch');

function candidate(volume, volumeTitle, chapter, chapterTitle, chatindex) {
  return `# 응답\n\n## 볼륨 ${volume}: ${volumeTitle}\n### 챕터 ${chapter}: ${chapterTitle}\n#### Chatindex: ${chatindex}∮\n⏱️[2029-01-29 (Mon) 02:30 PM]\n\n<COMMUNITY>x</COMMUNITY>`;
}

let r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 782), previous);
assert(!r.probe.applied && r.probe.regression === 'NONE', 'same frame should pass');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 10, '새 챕터', 783), previous);
assert(!r.probe.applied, 'forward Chapter/Chatindex should pass');
assert(r.probe.output.chapter === 10 && r.probe.output.chatindex === 783, 'forward frame changed');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 5, '일요일의 맑은 눈', 783), previous);
assert(r.probe.applied && r.probe.regression === 'CHAPTER', 'same-volume Chapter regression not detected');
assert(r.content.includes('### 챕터 9: 맑은 눈의 광인'), 'Chapter regression did not restore full prior heading');
assert(!r.content.includes('### 챕터 9: 일요일의 맑은 눈'), 'Frankenstein Chapter heading produced');
assert(r.probe.output.chatindex === 783, 'valid advanced Chatindex was modified during Chapter clamp');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 5, '일요일의 맑은 눈', 777), previous);
assert(r.probe.regression === 'CHAPTER+CHATINDEX', 'combined Chapter+Chatindex regression not detected');
assert(r.probe.output.chapter === 9 && r.probe.output.chatindex === 782, 'combined frame floor failed');

r = frame.enforceContinuity(candidate(64, '다음 볼륨', 1, '새 출발', 783), previous);
assert(!r.probe.applied, 'Chapter reset after Volume advance must remain allowed');
assert(r.probe.output.volume === 64 && r.probe.output.chapter === 1, 'Volume-advance reset changed');

r = frame.enforceContinuity(candidate(62, '과거 볼륨', 15, '과거 챕터', 783), previous);
assert(r.probe.applied && r.probe.regression === 'VOLUME+CHAPTER', 'Volume regression must restore Volume+Chapter frame pair');
assert(r.content.includes('## 볼륨 63: 완전한 궤도'), 'Volume heading was not fully restored');
assert(r.content.includes('### 챕터 9: 맑은 눈의 광인'), 'Chapter heading was not paired with restored Volume');
assert(r.probe.output.chatindex === 783, 'advanced Chatindex should survive Volume clamp');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 900), previous);
assert(!r.probe.applied && r.probe.output.chatindex === 900, 'Frame Guard must not enforce +1 progression');

r = frame.enforceContinuity(candidate(63, '완전한 궤도', 9, '맑은 눈의 광인', 700), previous);
assert(r.probe.regression === 'CHATINDEX' && r.probe.output.chatindex === 782, 'Chatindex backward floor failed');

r = frame.enforceContinuity('no valid frame here', previous);
assert(!r.probe.applied && r.content === 'no valid frame here', 'invalid/missing candidate frame should not be invented or repaired');

assert(newSource.includes("`Frame guard: ${frameGuard ? `${frameGuard.applied ? 'CLAMPED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`"), 'raw diagnostic Frame guard line missing');
assert(newSource.includes('let lastFrameGuardProbe = null;'), 'frame guard runtime probe slot missing');

const oldPrompt = moduleBlock(oldSource, 'prompt');
const newPrompt = moduleBlock(newSource, 'prompt');
assert(oldPrompt === newPrompt, 'runtime Prompt compiler changed');

console.log('0.63.15 Frame Guard OK; 16th Frame module owns backward-only continuity; Prompt/Time/Structure/Recovery and 9 other modules byte-identical');
console.log('semantics OK: same/forward pass; same-volume Chapter floor; Chatindex floor; Volume+Chapter pair floor; Chapter reset after Volume advance allowed; no +1 rule invented');
console.log('I/O OK: no new host/storage call sites; previous frame captured from already-loaded request history only');
