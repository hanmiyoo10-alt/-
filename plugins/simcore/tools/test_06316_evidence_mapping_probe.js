const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06316-baseline.js', 'utf8');
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
  vm.runInNewContext(`${block}\nthis.__probe = buildEvidenceMappingProbe;`, context, { filename: 'evidence-probe.js' });
  return context.__probe;
}

assert(newSource.includes('//@version 0.63.16'), 'version not patched');
assert(newSource.includes('// v0.63.16 Evidence Mapping Probe:'), '0.63.16 changelog missing');

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

assert(count(newSource, 'let lastEvidenceMappingProbe = null;') === 1, 'probe runtime slot missing');
assert(count(newSource, 'buildEvidenceMappingProbe(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)') === 1, 'probe request call missing');
assert(newSource.includes('lastRuntimePromptBudget.sourceAnchor'), 'probe is not gated by sourceAnchor');
assert(newSource.includes('`Evidence map: ${evidenceMap ?'), 'diagnostic Evidence map line missing');
assert(!newSource.includes('messages[rootIndex]'), 'raw root index used directly against request messages');

const buildProbe = loadProbe(newSource);
const getText = (m) => m?.content ?? m?.data ?? m?.text ?? '';
const pending = {
  active: true,
  mode: 'C',
  requestLineageRootIndex: 0,
  requestLineageSourceKind: 'CHAIN',
};
const chat = [
  { role: 'user', content: 'ROOT USER UNIQUE TEXT 123' },
  { role: 'char', content: 'SOURCE ASSISTANT UNIQUE TEXT 456' },
  { role: 'user', content: '[커뮤니티] 반응' },
];
const request = [
  { role: 'system', content: 'system preface' },
  { role: 'user', content: 'ROOT USER UNIQUE TEXT 123' },
  { role: 'assistant', content: 'SOURCE ASSISTANT UNIQUE TEXT 456' },
  { role: 'user', content: '[커뮤니티] 반응' },
];

let r = buildProbe(request, chat, pending, 2, getText);
assert(r && r.status === 'UNIQUE', 'unique root/source request mapping not detected');
assert(r.rootUserRawIndex === 0 && r.rootUserRequestIndex === 1, 'root user raw/request coordinates conflated');
assert(r.sourceAssistantRawIndex === 1 && r.sourceAssistantRequestIndex === 2, 'source assistant raw/request coordinates conflated');
assert(r.rootUserMatches === 1 && r.sourceAssistantMatches === 1, 'unique match counts incorrect');
assert(!JSON.stringify(r).includes('ROOT USER UNIQUE TEXT'), 'probe retained root source text');
assert(!JSON.stringify(r).includes('SOURCE ASSISTANT UNIQUE TEXT'), 'probe retained assistant source text');

r = buildProbe([
  ...request,
  { role: 'assistant', content: 'SOURCE ASSISTANT UNIQUE TEXT 456' },
], chat, pending, 2, getText);
assert(r.status === 'AMBIGUOUS' && r.sourceAssistantMatches === 2, 'duplicate request source did not become AMBIGUOUS');

r = buildProbe([
  { role: 'system', content: 'system preface' },
  { role: 'user', content: 'ROOT USER UNIQUE TEXT 123' },
  { role: 'assistant', content: 'SOURCE ASSISTANT CHANGED BY HOST' },
  { role: 'user', content: '[커뮤니티] 반응' },
], chat, pending, 2, getText);
assert(r.status === 'MISSING' && r.sourceAssistantMatches === 0, 'missing/transformed source did not become MISSING');

r = buildProbe(request, chat, { ...pending, mode: 'A' }, 2, getText);
assert(r === null, 'non-C request should be ineligible');
r = buildProbe(request, chat, { ...pending, requestLineageSourceKind: 'UNSEEDED' }, 2, getText);
assert(r === null, 'unseeded C request should be ineligible');

assert(moduleBlock(oldSource, 'prompt') === moduleBlock(newSource, 'prompt'), 'Prompt compiler changed');
assert(moduleBlock(oldSource, 'frame') === moduleBlock(newSource, 'frame'), 'Frame Guard changed');
assert(moduleBlock(oldSource, 'time') === moduleBlock(newSource, 'time'), 'Time changed');

console.log('0.63.16 Evidence Mapping Probe OK; all 16 internal modules byte-identical to 0.63.15');
console.log('mapping semantics OK: raw chat index and request index stay separate; UNIQUE/MISSING/AMBIGUOUS exact mapping classified without retaining source text');
console.log('behavior freeze OK: Prompt/Frame/Time/output generation unchanged; no new host/storage call sites');
