const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06317-baseline.js', 'utf8');
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

function probeBlock(source) {
  const begin = source.indexOf('// EVIDENCE_MAPPING_PROBE_BEGIN');
  const end = source.indexOf('// EVIDENCE_MAPPING_PROBE_END');
  if (begin < 0 || end < 0 || end <= begin) fail('evidence probe block missing');
  return source.slice(begin, end + '// EVIDENCE_MAPPING_PROBE_END'.length);
}

function loadProbe(source) {
  const block = probeBlock(source);
  const context = {};
  vm.runInNewContext(`${block}\nthis.__probe = buildEvidenceMappingProbe;`, context, { filename: 'evidence-shape-probe.js' });
  return context.__probe;
}

assert(newSource.includes('//@version 0.63.17'), 'version not patched');
assert(newSource.includes('// v0.63.17 Evidence Shape Probe:'), '0.63.17 changelog missing');

const modules = [
  'contracts', 'kernel', 'store', 'lifecycle', 'time', 'frame', 'recurrence', 'lineage',
  'handoff', 'community', 'reaction', 'structure', 'recovery', 'prompt', 'session', 'ops',
];
for (const name of modules) {
  assert(moduleBlock(oldSource, name) === moduleBlock(newSource, name), `internal module changed: ${name}`);
}

for (const ioToken of [
  'Risuai.getChatFromIndex', 'Risuai.setChatToIndex', 'pluginStorage',
  "addRisuReplacer('beforeRequest'", "addRisuScriptHandler('output'",
]) {
  assert(count(oldSource, ioToken) === count(newSource, ioToken), `host/storage call-site count changed: ${ioToken}`);
}

assert(count(newSource, 'let lastEvidenceMappingProbe = null;') === 1, 'probe runtime slot changed');
assert(count(newSource, 'buildEvidenceMappingProbe(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)') === 1, 'probe request call changed');
assert(newSource.includes('`Evidence shape: ${evidenceMap ?'), 'diagnostic Evidence shape line missing');
assert(!newSource.includes('`Evidence map: ${evidenceMap ?'), 'old Evidence map line still present');
assert(!newSource.includes('requestMessages[rootIndex]'), 'raw root index used directly against request array');

const buildProbe = loadProbe(newSource);
const getText = (m) => m?.content ?? m?.data ?? m?.text ?? '';
const pending = {
  active: true,
  mode: 'C',
  requestLineageRootIndex: 0,
  requestLineageSourceKind: 'CHAIN',
};
const rootText = 'ROOT USER UNIQUE TEXT 123';
const assistantText = 'SOURCE ASSISTANT UNIQUE TEXT 456';
const chat = [
  { role: 'user', content: rootText },
  { role: 'char', content: assistantText },
  { role: 'user', content: '[커뮤니티] 반응' },
];

let request = [
  { role: 'system', content: 'system preface' },
  { role: 'user', content: rootText },
  { role: 'assistant', content: assistantText },
  { role: 'user', content: '[커뮤니티] 반응' },
];
let r = buildProbe(request, chat, pending, 2, getText);
assert(r.status === 'EXACT' && r.rootUserShape === 'EXACT' && r.sourceAssistantShape === 'EXACT', 'EXACT mapping failed');
assert(r.rootUserRequestIndex === 1 && r.sourceAssistantRequestIndex === 2, 'EXACT request indices wrong');
assert(r.rootUserRequestRole === 'user' && r.sourceAssistantRequestRole === 'assistant', 'request roles not recorded');

request = [
  { role: 'system', content: 'system preface' },
  { role: 'user', content: '  ROOT\nUSER   UNIQUE TEXT 123  ' },
  { role: 'assistant', content: 'SOURCE   ASSISTANT\nUNIQUE TEXT 456' },
];
const normalizedChat = [
  { role: 'user', content: 'ROOT USER UNIQUE TEXT 123' },
  { role: 'char', content: 'SOURCE ASSISTANT UNIQUE TEXT 456' },
  { role: 'user', content: '[커뮤니티] 반응' },
];
r = buildProbe(request, normalizedChat, pending, 2, getText);
assert(r.status === 'NORMALIZED' && r.rootUserShape === 'NORMALIZED' && r.sourceAssistantShape === 'NORMALIZED', 'NORMALIZED mapping failed');

request = [
  { role: 'system', content: `PREFIX >>> ${rootText} <<< SUFFIX` },
  { role: 'assistant', content: `wrapper start ${assistantText} wrapper end` },
];
r = buildProbe(request, chat, pending, 2, getText);
assert(r.status === 'EMBEDDED', 'EMBEDDED combined status failed');
assert(r.rootUserShape === 'EMBEDDED' && r.sourceAssistantShape === 'EMBEDDED', 'EMBEDDED per-source status failed');
assert(r.rootUserRequestRole === 'system', 'role transformation was not exposed');

const longRoot = 'A'.repeat(80) + 'ROOT-MIDDLE-' + 'B'.repeat(120) + '-ROOT-END-' + 'C'.repeat(80);
const longAssistant = 'D'.repeat(80) + 'ASSIST-MIDDLE-' + 'E'.repeat(120) + '-ASSIST-END-' + 'F'.repeat(80);
const longChat = [
  { role: 'user', content: longRoot },
  { role: 'char', content: longAssistant },
  { role: 'user', content: '[커뮤니티] 반응' },
];
request = [
  { role: 'user', content: longRoot.slice(0, 95) + ' HOST TRANSFORMED THE CENTER ' + longRoot.slice(-95) },
  { role: 'assistant', content: longAssistant.slice(0, 95) + ' HOST TRANSFORMED THE CENTER ' + longAssistant.slice(-95) },
];
r = buildProbe(request, longChat, pending, 2, getText);
assert(r.status === 'TRANSFORMED' && r.rootUserShape === 'TRANSFORMED' && r.sourceAssistantShape === 'TRANSFORMED', 'TRANSFORMED anchor mapping failed');

request = [
  { role: 'user', content: rootText },
  { role: 'system', content: rootText },
  { role: 'assistant', content: assistantText },
];
r = buildProbe(request, chat, pending, 2, getText);
assert(r.status === 'AMBIGUOUS' && r.rootUserShape === 'AMBIGUOUS', 'AMBIGUOUS mapping failed');

request = [
  { role: 'system', content: 'unrelated system' },
  { role: 'user', content: 'unrelated user' },
  { role: 'assistant', content: 'unrelated assistant' },
];
r = buildProbe(request, chat, pending, 2, getText);
assert(r.status === 'ABSENT' && r.rootUserShape === 'ABSENT' && r.sourceAssistantShape === 'ABSENT', 'ABSENT mapping failed');

assert(!JSON.stringify(r).includes(rootText), 'probe retained root text');
assert(!JSON.stringify(r).includes(assistantText), 'probe retained assistant text');
r = buildProbe(request, chat, { ...pending, mode: 'A' }, 2, getText);
assert(r === null, 'non-C request should be ineligible');
r = buildProbe(request, chat, { ...pending, requestLineageSourceKind: 'UNSEEDED' }, 2, getText);
assert(r === null, 'unseeded request should be ineligible');

assert(moduleBlock(oldSource, 'prompt') === moduleBlock(newSource, 'prompt'), 'Prompt changed');
assert(moduleBlock(oldSource, 'frame') === moduleBlock(newSource, 'frame'), 'Frame changed');
assert(moduleBlock(oldSource, 'time') === moduleBlock(newSource, 'time'), 'Time changed');

console.log('0.63.17 Evidence Shape Probe OK; all 16 internal modules byte-identical to 0.63.16');
console.log('shape semantics OK: EXACT/NORMALIZED/EMBEDDED/TRANSFORMED/AMBIGUOUS/ABSENT classified mechanically with request role/index telemetry only');
console.log('behavior freeze OK: Prompt/Frame/Time/output generation unchanged; no new host/storage call sites or source retention');
