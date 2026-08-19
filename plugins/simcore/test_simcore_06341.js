const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');

const before = fs.readFileSync('/tmp/simcore-before.js', 'utf8');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');

assert(src.includes('//@version 0.63.41'));
assert(src.includes("const SIMCORE_RUNTIME_VERSION = '0.63.41';"));
assert(src.includes('// v0.63.41 Deterministic Continuity Consolidation:'));
assert(src.includes('Continuity summary:'));
assert(src.includes('Calendar transition:'));
assert(src.includes('Frame sequence:'));
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
const intentionalCore = new Set(['contracts', 'time', 'lifecycle', 'frame', 'prompt', 'session']);
const coreModules = new Set([
  'contracts','store','community','recurrence','lineage','handoff','evidence','kernel','time',
  'lifecycle','reaction','frame','structure','recovery','prompt','session','ops',
]);
for (const name of coreModules) {
  if (intentionalCore.has(name)) assert.notStrictEqual(amods.get(name), bmods.get(name), `intended core module unchanged: ${name}`);
  else assert.strictEqual(amods.get(name), bmods.get(name), `unexpected core module changed: ${name}`);
}

function loadSimCore(text) {
  const start = text.indexOf('const SimCore = (() => {');
  const end = text.indexOf('\n\n(async () => {', start);
  assert(start >= 0 && end > start);
  const constants = "const SIMCORE_RUNTIME_VERSION = '0.63.41';\nconst SIMCORE_LOG_PREFIX = `[simcore/v${SIMCORE_RUNTIME_VERSION}]`;\n";
  return new Function(`${constants}${text.slice(start, end)}\nreturn SimCore;`)();
}

const SimCore = loadSimCore(src);
const time = SimCore.require('time');
const frame = SimCore.require('frame');
const kernel = SimCore.require('kernel');
const lifecycle = SimCore.require('lifecycle');
const prompt = SimCore.require('prompt');
const topologyRules = SimCore.require('runtime-topology');
const candidates = SimCore.require('runtime-cache-candidates');
const runtimeContracts = SimCore.require('runtime-contracts');

// Calendar transition resolution: the live year-rollover regression fixture.
const prevTs = '⏱️[2029-12-31 (Mon) 11:50 PM]';
let target = time.resolveCalendarTransition('한편 1월 1일이 되고 올해 활동 계획을 말했다', prevTs, 2029);
assert.strictEqual(target.eligible, true);
assert.strictEqual(target.reason, 'YEAR_ROLLOVER');
assert.strictEqual(target.targetDate, '2030-01-01');
assert.strictEqual(target.weekday, 'Tue');
assert.strictEqual(target.singleYearRollover, true);

let sameYear = time.resolveCalendarTransition('한편 6월 1일이 되고', '⏱️[2029-05-10 (Thu) 09:00 AM]', 2029);
assert.strictEqual(sameYear.targetDate, '2029-06-01');
assert.strictEqual(sameYear.reason, 'SAME_YEAR');
let nextYear = time.resolveCalendarTransition('한편 4월 1일이 되고', '⏱️[2029-05-10 (Thu) 09:00 AM]', 2029);
assert.strictEqual(nextYear.targetDate, '2030-04-01');
assert.strictEqual(nextYear.reason, 'YEAR_ROLLOVER');
let explicit = time.resolveCalendarTransition('한편 2032년 3월 2일이 되고', prevTs, 2029);
assert.strictEqual(explicit.targetDate, '2032-03-02');
assert.strictEqual(explicit.reason, 'EXPLICIT_YEAR');
let invalid = time.resolveCalendarTransition('한편 2월 30일이 되고', prevTs, 2029);
assert.strictEqual(invalid.eligible, false);
assert.strictEqual(invalid.reason, 'INVALID_DATE');
let retrospective = time.resolveCalendarTransition('작년 1월 1일을 회상했다', prevTs, 2029);
assert.strictEqual(retrospective.eligible, false);
let explicitBackward = time.resolveCalendarTransition('한편 2028년 1월 1일이 되고', prevTs, 2029);
assert.strictEqual(explicitBackward.eligible, false);
assert.strictEqual(explicitBackward.reason, 'EXPLICIT_BACKWARD');

// Frame date + weekday repair preserves model-chosen time of day.
const wrongFrame = [
  '# 응답',
  '## 볼륨 67: 무한한 궤도',
  '### 챕터 12: 궤도의 재편',
  '#### Chatindex: 829∮',
  '⏱️[2029-12-31 (Mon) 11:50 PM]',
  'scene',
].join('\n');
let calendarRepair = time.enforceNarrativeCalendarTarget(wrongFrame, target);
assert.strictEqual(calendarRepair.changed, true);
assert.strictEqual(calendarRepair.dateChanged, true);
assert(calendarRepair.content.includes('⏱️[2030-01-01 (Tue) 11:50 PM]'));

// The exact live stale-year tail is repaired only under a proven single-year rollover.
const staleTail = [
  '# 응답',
  '## 볼륨 67: 무한한 궤도',
  '### 챕터 12: 궤도의 재편',
  '#### Chatindex: 829∮',
  '⏱️[2030-01-01 (Tue) 11:50 PM]',
  '',
  'scene',
  '⏱️[2029-01-02 (Tue) 12:00 AM]',
].join('\n');
let rolloverRepair = time.repairNarrativeYearRolloverSequence(staleTail, target);
assert.strictEqual(rolloverRepair.changed, true);
assert.strictEqual(rolloverRepair.count, 1);
assert(rolloverRepair.content.includes('⏱️[2030-01-02 (Wed) 12:00 AM]'));
assert.strictEqual(time.narrativeTimestampSequence(rolloverRepair.content).tailStatus, 'MONOTONIC');

function frameText(volume, chapter, title, chatindex) {
  return ['# 응답', `## 볼륨 ${volume}: V`, `### 챕터 ${chapter}: ${title}`, `#### Chatindex: ${chatindex}∮`, '⏱️[2030-01-01 (Tue) 01:00 PM]'].join('\n');
}
const previousFrame = frame.parseFrame(frameText(67, 12, '궤도의 재편', 828));

// Same chapter title holds, Chatindex is exact previous+1.
let f = frame.enforceContinuity(frameText(67, 13, '궤도의 재편', 828), previousFrame);
let parsed = frame.parseFrame(f.content);
assert.strictEqual(parsed.volume, 67);
assert.strictEqual(parsed.chapter, 12);
assert.strictEqual(parsed.chatindex, 829);
assert(f.probe.repairs.includes('CHAPTER_TITLE_HOLD'));
assert(f.probe.repairs.includes('CHATINDEX_SAME'));

// Changed title is the model's structural signal; SimCore changes only the number.
f = frame.enforceContinuity(frameText(67, 12, '새로운 질서', 831), previousFrame);
parsed = frame.parseFrame(f.content);
assert.strictEqual(parsed.chapter, 13);
assert.strictEqual(parsed.chapterTitle, '새로운 질서');
assert.strictEqual(parsed.chatindex, 829);
assert(f.probe.repairs.includes('CHAPTER_TITLE_ADVANCE'));
assert(f.probe.repairs.includes('CHATINDEX_JUMP'));

// A model-signaled Volume advance normalizes jumps and resets Chapter to 1.
f = frame.enforceContinuity(frameText(70, 13, '완전한 독립', 831), previousFrame);
parsed = frame.parseFrame(f.content);
assert.strictEqual(parsed.volume, 68);
assert.strictEqual(parsed.chapter, 1);
assert.strictEqual(parsed.chapterTitle, '완전한 독립');
assert.strictEqual(parsed.chatindex, 829);
assert(f.probe.repairs.includes('VOLUME_JUMP'));
assert(f.probe.repairs.includes('CHAPTER_RESET'));

// Same Volume is never advanced by SimCore on semantic guesswork.
f = frame.enforceContinuity(frameText(67, 12, '궤도의 재편', 829), previousFrame);
parsed = frame.parseFrame(f.content);
assert.strictEqual(parsed.volume, 67);
assert.strictEqual(f.probe.sequenceStatus, 'PASS');

// A visible manual edit becomes the next baseline; no hidden persistent counter fights it.
const manuallyEditedPrevious = frame.parseFrame(frameText(67, 12, '궤도의 재편', 829));
f = frame.enforceContinuity(frameText(67, 12, '궤도의 재편', 829), manuallyEditedPrevious);
parsed = frame.parseFrame(f.content);
assert.strictEqual(parsed.chatindex, 830);

// Lifecycle resolves the target before prompt render and advances existing world-year/age state.
const base = kernel.initialState();
base.worldYear = 2029;
base.koreanAgeOffset = 2;
base.narrativeTimestamp = prevTs;
const probe = { __simcorePromptProbe: true, active: true, config: { protagonist: '', secondaryName: '', secondaryKeyword: '' } };
const prepared = lifecycle.prepareTurn(base, '한편 1월 1일이 되고 새해 계획을 말했다', probe, 100);
assert.strictEqual(prepared.worldYear, 2030);
assert.strictEqual(prepared.koreanAgeOffset, 3);
assert.strictEqual(prepared.pending.narrativeCalendarTarget.targetDate, '2030-01-01');
const runtimePrompt = prompt.renderRuntimePrompt(prepared);
assert(runtimePrompt.includes('world_year=2030'));
assert(runtimePrompt.includes('narrative_calendar_target=2030-01-01'));
assert(runtimePrompt.includes('narrative_calendar_weekday=Tue'));
assert(runtimePrompt.includes('time_of_day_unspecified_by_calendar_target=1'));

// Source Integrity and unrelated state machines remain byte-identical to v0.63.40.
for (const name of ['evidence','lineage','handoff','recurrence','reaction','community','structure','recovery','kernel','store','ops']) {
  assert.strictEqual(amods.get(name), bmods.get(name), `frozen module changed: ${name}`);
}

assert.strictEqual(runtimeContracts.cache.requestOrder, 'FROZEN');
assert.strictEqual(runtimeContracts.cache.runtimePromptPlacement, 'TAIL_AFTER_CURRENT_USER');
assert.strictEqual(runtimeContracts.cache.runtimePromptPolicy, 'OBSERVE_ONLY');
assert.strictEqual(runtimeContracts.cache.providerCache, 'UNVERIFIED');

// v0.63.39 retry identity and EMA semantics remain frozen.
const tracker = topologyRules.createRequestTopologyTracker();
const req1 = [{ role: 'system', content: 'stable' }, { role: 'user', content: 'same turn' }, { role: 'system', content: 'runtime' }];
const t1 = tracker.observe('chat:1', req1, { runtimeIndex: 2, at: 1000 });
const tr = tracker.observe('chat:1', [...req1.slice(0,2), { role: 'assistant', content: 'variant' }, req1[2]], { runtimeIndex: 3, at: 2000 });
const c = candidates.createCacheCandidateTracker();
let cp = c.observe('chat:1', t1, { sendIndex: 10, at: 1000 });
cp = c.observe('chat:1', tr, { sendIndex: 10, at: 2000 });
assert.strictEqual(cp.distinct, 1);
assert.strictEqual(cp.attempts, 2);
assert.strictEqual(cp.cadenceEmaMs, null);
const t2 = { ...tr, baseline: false, currentUserSignature: 'new', familyId: t1.familyId, commonChars: 70000, commonMessages: 10, at: 11000 };
cp = c.observe('chat:1', t2, { sendIndex: 11, at: 11000 });
assert.strictEqual(cp.distinct, 2);
assert.strictEqual(cp.cadenceEmaMs, 10000);

assert.strictEqual(src.split("messages.push({ role: 'system', content: result.promptBlock });").length - 1, 1);
assert(src.includes("runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER'"));
assert(src.includes("providerCache: 'UNVERIFIED'"));
for (const forbidden of ['cache_control','cached_content','prompt_cache_key']) assert(!src.toLowerCase().includes(forbidden));
const gate = "if ((canonical || hostRaw) && actualFingerprint !== canonical && actualFingerprint !== hostRaw) {";
assert.strictEqual(src.split(gate).length - 1, before.split(gate).length - 1, 'mirror/edit acceptance gate changed');
for (const token of [
  'Risuai.getCurrentCharacterIndex(', 'Risuai.getCurrentChatIndex(', 'Risuai.getChatFromIndex(', 'Risuai.getCharacter(', 'Risuai.setChatToIndex(',
  'pluginStorage.getItem(', 'pluginStorage.setItem(', 'pluginStorage.removeItem(', 'pluginStorage.keys(',
  'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'fetch(', 'XMLHttpRequest('
]) assert.strictEqual(src.split(token).length, before.split(token).length, `call count changed: ${token}`);

const frozenDigest = crypto.createHash('sha256')
  .update([...coreModules].filter((x) => !intentionalCore.has(x)).sort().map((name) => `${name}:${crypto.createHash('sha256').update(amods.get(name)).digest('hex')}`).join('\n'))
  .digest('hex');

console.log('SimCore 0.63.41 Deterministic Continuity fixtures: PASS');
console.log('calendar: SAME_YEAR / YEAR_ROLLOVER / EXPLICIT_YEAR / INVALID / RETROSPECTIVE guarded');
console.log('frame: Volume / Chapter / Chatindex deterministic sequencing PASS');
console.log('source integrity: frozen from v0.63.40');
console.log('trajectory retry/EMA: preserved');
console.log('frozen core digest:', frozenDigest);
console.log('provider cache: UNVERIFIED · request/mirror/storage/network/timer surfaces guarded');