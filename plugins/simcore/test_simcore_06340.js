const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.40'));
assert(src.includes("const SIMCORE_RUNTIME_VERSION = '0.63.40';"));
assert(src.includes('const SIMCORE_LOG_PREFIX = `[simcore/v${SIMCORE_RUNTIME_VERSION}]`;'));
assert(src.includes('// v0.63.40 Current Source Integrity & Runtime Surface Consolidation:'));
assert(src.includes('`Version: ${SIMCORE_RUNTIME_VERSION}`'));
assert(src.includes('sourceVersion: SIMCORE_RUNTIME_VERSION'));
assert(src.includes('SimCore v${escapeHtml(SIMCORE_RUNTIME_VERSION)}'));
assert(src.includes('Runtime & Integrity Diagnostics'));
assert(!src.includes('SimCore v0.63.36'));
assert(!src.includes('[simcore/v0.63.4]'));

const metadataVersion = src.match(/^\/\/@version\s+([^\s]+)$/m)?.[1];
const runtimeVersion = src.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)'/)?.[1];
assert.strictEqual(metadataVersion, runtimeVersion, 'metadata/runtime version mismatch');

function extractModules(text) {
  const re = /SimCore\.define\("([^"]+)", function \(require, module, exports\) \{/g;
  const hits = [...text.matchAll(re)];
  const out = new Map();
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.indexOf('\n\n(async () => {', start);
    assert(start >= 0 && end > start, `module boundary ${hits[i][1]}`);
    out.set(hits[i][1], text.slice(start, end).trimEnd());
  }
  return out;
}

const bmods = extractModules(before);
const amods = extractModules(src);
const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
const intentionalCore = new Set(['evidence', 'prompt']);
for (const name of coreModules) {
  if (intentionalCore.has(name)) assert.notStrictEqual(amods.get(name), bmods.get(name), `intended core module did not change: ${name}`);
  else assert.strictEqual(amods.get(name), bmods.get(name), `unexpected core module changed: ${name}`);
}

const runtimeModules = [...amods.keys()].filter((x) => x.startsWith('runtime-'));
const changedRuntime = runtimeModules.filter((name) => amods.get(name) !== bmods.get(name));
for (const name of changedRuntime) assert(['runtime-mirror'].includes(name), `unexpected runtime module changed: ${name}`);

function loadSimCore(text) {
  const start = text.indexOf('const SimCore = (() => {');
  const end = text.indexOf('\n\n(async () => {', start);
  assert(start >= 0 && end > start);
  const constants = "const SIMCORE_RUNTIME_VERSION = '0.63.40';\nconst SIMCORE_LOG_PREFIX = `[simcore/v${SIMCORE_RUNTIME_VERSION}]`;\n";
  return new Function(`${constants}${text.slice(start, end)}\nreturn SimCore;`)();
}

const SimCore = loadSimCore(src);
const evidence = SimCore.require('evidence');
const topologyRules = SimCore.require('runtime-topology');
const candidates = SimCore.require('runtime-cache-candidates');
const runtimeContracts = SimCore.require('runtime-contracts');

assert.strictEqual(runtimeContracts.cache.requestOrder, 'FROZEN');
assert.strictEqual(runtimeContracts.cache.runtimePromptPlacement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(runtimeContracts.cache.runtimePromptPolicy, 'OBSERVE_ONLY');
assert.strictEqual(runtimeContracts.cache.providerCache, 'UNVERIFIED');

const rootText = [
  'CURRENT ROOT FACTS',
  'The current event explicitly says the prior plan is complete.',
  'The current state is authoritative and must not be replaced by an older planned future state.',
  'ROOT-END-UNIQUE',
].join(' ');
const sourceText = [
  'SOURCE-START-UNIQUE',
  'A'.repeat(110),
  'SOURCE-MIDDLE-UNIQUE',
  'B'.repeat(110),
  'SOURCE-END-UNIQUE',
  'C'.repeat(110),
].join(' ');
const currentShort = '[커뮤니티] 라이브 반응';
const pending = {
  active: true,
  mode: 'C',
  requestLineageRootIndex: 0,
  requestLineageSourceKind: 'ROOT',
};
const chat = [
  { role: 'user', content: rootText },
  { role: 'assistant', content: sourceText },
  { role: 'user', content: currentShort },
];

// DUAL: both current root and rendered source are exact/safe.
{
  const request = [
    { role: 'system', content: 'stable prelude' },
    { role: 'user', content: rootText },
    { role: 'assistant', content: sourceText },
    { role: 'user', content: currentShort },
  ];
  const r = evidence.inspectAndFence(request, chat, pending, 2);
  assert.strictEqual(r.mode, 'DUAL');
  assert.strictEqual(r.rootFence.status, 'APPLIED');
  assert.strictEqual(r.sourceFence.status, 'APPLIED');
  assert(request[1].content.startsWith('<CURRENT_ROOT_EVIDENCE>\n'));
  assert(request[1].content.endsWith('\n</CURRENT_ROOT_EVIDENCE>'));
  assert(request[2].content.startsWith('<CURRENT_SOURCE_EVIDENCE>\n'));
  assert(request[2].content.endsWith('\n</CURRENT_SOURCE_EVIDENCE>'));
  assert.strictEqual(request.length, 4, 'fencing must not add request messages');
  const serializedProbe = JSON.stringify(r);
  assert(!serializedProbe.includes('CURRENT ROOT FACTS'), 'probe must not retain root body');
  assert(!serializedProbe.includes('SOURCE-START-UNIQUE'), 'probe must not retain source body');
}

// ROOT_ONLY: root is exact, assistant source is deterministically transformed/unsafe.
{
  const transformedSource = [
    'SOURCE-START-UNIQUE',
    'A'.repeat(110),
    'SOURCE-MIDDLE-UNIQUE',
    'B'.repeat(70),
    'HOST-APPENDED-UNRELATED',
    'Z'.repeat(180),
  ].join(' ');
  const request = [
    { role: 'system', content: 'stable prelude' },
    { role: 'user', content: rootText },
    { role: 'assistant', content: transformedSource },
    { role: 'user', content: currentShort },
  ];
  const r = evidence.inspectAndFence(request, chat, pending, 2);
  assert.strictEqual(r.mapping.rootUserShape, 'EXACT');
  assert.strictEqual(r.mapping.sourceAssistantShape, 'TRANSFORMED');
  assert.strictEqual(r.mode, 'ROOT_ONLY');
  assert.strictEqual(r.rootFence.status, 'APPLIED');
  assert.strictEqual(r.sourceFence.status, 'SKIPPED');
  assert.strictEqual(r.sourceFence.reason, 'unsafe-source-boundary');
  assert(request[1].content.includes('<CURRENT_ROOT_EVIDENCE>'));
  assert(!request[2].content.includes('<CURRENT_SOURCE_EVIDENCE>'));
}

// UNFENCED: unsafe root must not unlock a source-only promotion.
{
  const request = [
    { role: 'system', content: 'stable prelude' },
    { role: 'user', content: `HOST PREFIX ${rootText} HOST SUFFIX` },
    { role: 'assistant', content: sourceText },
    { role: 'user', content: currentShort },
  ];
  const r = evidence.inspectAndFence(request, chat, pending, 2);
  assert.strictEqual(r.mapping.rootUserShape, 'EMBEDDED');
  assert.strictEqual(r.mode, 'UNFENCED');
  assert.strictEqual(r.rootFence.reason, 'unsafe-root-boundary');
  assert.strictEqual(r.sourceFence.reason, 'root-boundary-required');
  assert(!request[1].content.includes('<CURRENT_ROOT_EVIDENCE>'));
  assert(!request[2].content.includes('<CURRENT_SOURCE_EVIDENCE>'));
}

// Source lock off remains inert.
{
  const request = [{ role: 'user', content: 'ordinary request' }];
  const r = evidence.inspectAndFence(request, chat, { active: true, mode: 'A' }, 0);
  assert.strictEqual(r.mode, 'INELIGIBLE');
  assert.strictEqual(request[0].content, 'ordinary request');
}

// Root-first prompt contract is explicit but semantic interpretation remains with the main model.
const promptModule = amods.get('prompt');
for (const token of [
  'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',
  'current_root_evidence=CURRENT_ROOT_EVIDENCE_when_present;root_explicit_facts_highest_authority=1',
  'current_source_evidence=CURRENT_SOURCE_EVIDENCE_when_present;rendered_context_only_when_conflicting_with_root=1',
  'event_fact_precedence=CURRENT_ROOT_EVIDENCE>current_lineage_root>CURRENT_SOURCE_EVIDENCE>prior_similar_history',
  'CURRENT_SOURCE_EVIDENCE_may_support_only_nonconflicting_rendered_details=1',
]) assert(promptModule.includes(token), `missing prompt contract: ${token}`);

// v0.63.39 trajectory identity/EMA semantics remain unchanged.
const tracker = topologyRules.createRequestTopologyTracker();
const req1 = [
  { role: 'system', content: 'stable head' },
  { role: 'user', content: 'same user turn' },
  { role: 'system', content: 'runtime A' },
];
const t1 = tracker.observe('chat:1', req1, { runtimeIndex: 2, at: 1000 });
const reqRetry = [
  { role: 'system', content: 'stable head' },
  { role: 'user', content: 'same user turn' },
  { role: 'assistant', content: 'retry assembly variant' },
  { role: 'system', content: 'runtime A' },
];
const tr = tracker.observe('chat:1', reqRetry, { runtimeIndex: 3, at: 2000 });
const c = candidates.createCacheCandidateTracker();
let cp = c.observe('chat:1', t1, { sendIndex: 10, at: 1000 });
assert.strictEqual(cp.distinct, 1);
assert.strictEqual(cp.attempts, 1);
assert.strictEqual(cp.cadenceEmaMs, null);
cp = c.observe('chat:1', tr, { sendIndex: 10, at: 2000 });
assert.strictEqual(cp.distinct, 1);
assert.strictEqual(cp.attempts, 2);
assert.strictEqual(cp.cadenceEmaMs, null);
const t2 = { ...tr, baseline: false, currentUserSignature: 'user|text|8|newturn1', familyId: t1.familyId, commonChars: 70000, commonMessages: 10, at: 11000 };
cp = c.observe('chat:1', t2, { sendIndex: 11, at: 11000 });
assert.strictEqual(cp.distinct, 2);
assert.strictEqual(cp.attempts, 3);
assert.strictEqual(cp.cadenceEmaMs, 10000);

// Frozen request/provider/mirror/storage/network/timer surfaces.
assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
assert(src.includes("runtimePromptPolicy: 'OBSERVE_ONLY'"));
assert(src.includes("providerCache: 'UNVERIFIED'"));
for (const forbidden of ['cache_control','cached_content','prompt_cache_key']) assert(!src.toLowerCase().includes(forbidden));
const gate = "if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {";
assert.strictEqual(src.split(gate).length - 1, 1);
assert.strictEqual(before.split(gate).length - 1, 1);
for (const token of [
  'Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(', 'Risuai.getCharacter(', 'Risuai.setChatToIndex(',
  'pluginStorage.getItem(', 'pluginStorage.setItem(', 'pluginStorage.removeItem(', 'pluginStorage.keys(',
  'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'fetch(', 'XMLHttpRequest('
]) assert.strictEqual(src.split(token).length, before.split(token).length, `call count changed: ${token}`);

const frozenCore = [...coreModules].filter((x) => !intentionalCore.has(x));
const digest = crypto.createHash('sha256')
  .update(frozenCore.sort().map((name) => `${name}:${crypto.createHash('sha256').update(amods.get(name)).digest('hex')}`).join('\n'))
  .digest('hex');

console.log('SimCore 0.63.40 Current Source Integrity fixtures: PASS');
console.log('evidence modes: DUAL / ROOT_ONLY / UNFENCED / INELIGIBLE');
console.log('frozen non-Evidence/non-Prompt Core modules:', frozenCore.length, 'digest:', digest);
console.log('trajectory retry/EMA: preserved');
console.log('provider cache: UNVERIFIED · request/mirror/storage/network/timer surfaces guarded');
