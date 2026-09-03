import fs from 'node:fs';

const sourcePath = process.argv[2] || 'plugins/simcore/latest.js';
const text = fs.readFileSync(sourcePath, 'utf8');
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

function moduleSlice(name) {
  const marker = `SimCore.define("${name}"`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`module start missing: ${name}`);
  const next = text.indexOf('\nSimCore.define("', start + marker.length);
  if (next < 0) throw new Error(`module end missing: ${name}`);
  return text.slice(start, next);
}

function loadModule(name, deps = {}) {
  let out = null;
  const SimCore = {
    define(n, factory) {
      if (n !== name) return;
      const module = { exports: {} };
      factory((id) => deps[id] || {}, module, module.exports);
      out = module.exports;
    },
  };
  new Function('SimCore', moduleSlice(name))(SimCore);
  if (!out) throw new Error(`requested module not loaded: ${name}`);
  return out;
}

const kernel = loadModule('kernel');
const community = loadModule('community');
const time = loadModule('time');
const lifecycle = loadModule('lifecycle', {
  './kernel': kernel,
  './time': time,
  './recurrence': {},
  './lineage': {},
  './handoff': {},
});
const reaction = loadModule('reaction', { './community': community });
const structure = loadModule('structure', {
  './kernel': kernel,
  './lifecycle': lifecycle,
  './time': time,
  './community': community,
  './reaction': reaction,
});
const representation = loadModule('representation');
const session = loadModule('session', {
  './store': { SnapshotStore: class SnapshotStore {} },
  './kernel': kernel,
  './lifecycle': lifecycle,
  './time': time,
  './frame': {},
  './community': community,
  './reaction': reaction,
  './structure': structure,
  './recovery': {},
  './recurrence': {},
  './prompt': {
    renderRuntimePrompt() { return ''; },
    compileRuntimePromptParts() { return { text: '', identityTiers: {}, endAuthority: {} }; },
  },
});

function resolvePreviousBEndInspector() {
  if (typeof session.inspectPreviousBEndOutput === 'function') return session.inspectPreviousBEndOutput;

  const sessionSource = moduleSlice('session');
  const startMarker = 'function inspectPreviousBEndOutput(historyMessages, sendIndex) {';
  const start = sessionSource.indexOf(startMarker);
  if (start < 0) throw new Error('legacy fixture private Session inspector missing');
  const end = sessionSource.indexOf('\nclass CoreRulesetSession', start);
  if (end < 0) throw new Error('legacy fixture private Session inspector boundary missing');
  const declaration = sessionSource.slice(start, end).trim();
  const inspector = new Function(
    'kernel',
    'time',
    'structure',
    `${declaration}\nreturn inspectPreviousBEndOutput;`,
  )(kernel, time, structure);
  if (typeof inspector !== 'function') throw new Error('legacy fixture private Session inspector load failed');
  return inspector;
}

const inspectPreviousBEndOutput = resolvePreviousBEndInspector();

const oldNarr = '⏱️[2031-03-14 (Fri) 11:30 PM]';
const terminal = '⏱️[2031-03-28 (Fri) 10:15 PM]';
const laterNarr = '⏱️[2031-03-28 (Fri) 10:50 PM]';
const sendIndex = 2;
const lineageB = { lastRequestMode: 'B', lastRequestIndex: 0 };
const state = { broadcastLocked: false, broadcastAirtime: terminal };
const facts = Object.freeze({
  available: true,
  outIndex: 1,
  closureComplete: true,
  terminalExplicit: true,
  terminalTimestamp: terminal,
  structureClean: true,
  issueCount: 0,
  reason: 'complete',
});
const eligibility = () => lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, lineageB, facts, sendIndex);

// 1. stale Narrative + direct complete B_END -> APPLIED
let e = eligibility();
let f = time.resolvePostBEndCurrentTimeFloor(oldNarr, e);
assert(e.eligible && f.disposition === 'APPLIED' && f.effectiveFloor === terminal, `fixture1 ${JSON.stringify({ e, f })}`);

// 2. Narrative already later -> ALREADY_SATISFIED
f = time.resolvePostBEndCurrentTimeFloor(laterNarr, e);
assert(f.disposition === 'ALREADY_SATISFIED' && f.effectiveFloor === laterNarr, `fixture2 ${JSON.stringify(f)}`);

// 3. Source Handoff is not a clock prerequisite
assert(!lifecycle.derivePostBEndClockEligibility.toString().toLowerCase().includes('handoff'), 'fixture3 Source Handoff dependency');

// 4. B_END -> C -> C applies only to first direct C
assert(!lifecycle.derivePostBEndClockEligibility('C', 'C', state, { lastRequestMode: 'C', lastRequestIndex: 2 }, facts, 4).eligible, 'fixture4 second C bridged');

// 5-7. unrelated transitions are ineligible
assert(!lifecycle.derivePostBEndClockEligibility('C', 'B_CONTINUE', state, lineageB, facts, sendIndex).eligible, 'fixture5 B_CONTINUE->C eligible');
assert(!lifecycle.derivePostBEndClockEligibility('C', 'B_START', state, lineageB, facts, sendIndex).eligible, 'fixture6 B_START->C eligible');
assert(!lifecycle.derivePostBEndClockEligibility('A', 'B_END', state, lineageB, facts, sendIndex).eligible, 'fixture7 B_END->A eligible');

// 8. malformed visible terminal fails closed
const invalidFacts = { ...facts, terminalTimestamp: 'bad timestamp' };
e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, lineageB, invalidFacts, sendIndex);
f = time.resolvePostBEndCurrentTimeFloor(oldNarr, e);
assert(f.disposition === 'INVALID_SOURCE' && f.effectiveFloor === oldNarr, `fixture8 ${JSON.stringify(f)}`);

// 9. current frame floors, explicit historical timestamp remains unchanged
const historical = [oldNarr, '현재 반응 프레임', '과거 회상:', '⏱️[2017-06-01 (Thu) 08:00 PM]'].join('\n');
const clamped = time.enforceNarrativeCurrentTimeFloor(historical, terminal);
assert(clamped.changed && clamped.content.includes(terminal), 'fixture9 current frame floor missing');
assert(clamped.content.includes('⏱️[2017-06-01 (Thu) 08:00 PM]'), 'fixture9 historical timestamp rewritten');

// 10. later Narrative tail wins; floor is not a ceiling
const laterTail = [terminal, '현재 반응', '⏱️[2031-03-28 (Fri) 11:00 PM]'].join('\n');
const floorPass = time.enforceNarrativeCurrentTimeFloor(laterTail, terminal);
assert(!floorPass.changed, 'fixture10 later tail was clamped');
const nstate = { narrativeTimestamp: oldNarr };
const ncommit = time.commitNarrativeTimestamp(nstate, { mode: 'C', narrativeTimestampPrevious: oldNarr }, floorPass.content);
assert(ncommit.timestamp === '⏱️[2031-03-28 (Fri) 11:00 PM]', `fixture10 ${JSON.stringify(ncommit)}`);

// 11. current-era rollback is blocked without rewriting later historical tokens
const rollback = ['⏱️[2017-06-01 (Thu) 08:00 PM]', '현재라고 잘못 렌더', '⏱️[2016-01-01 (Fri) 01:00 PM]'].join('\n');
const rollbackFixed = time.enforceNarrativeCurrentTimeFloor(rollback, terminal);
assert(rollbackFixed.changed && rollbackFixed.content.startsWith(terminal), 'fixture11 rollback not blocked');
assert(rollbackFixed.content.includes('⏱️[2016-01-01 (Fri) 01:00 PM]'), 'fixture11 historical token rewritten');

// 12. B_END terminal commit remains unchanged
const bstate = {
  broadcastAirtime: '⏱️[2031-03-28 (Fri) 09:45 PM]',
  broadcastAirtimeStart: '⏱️[2031-03-28 (Fri) 09:45 PM]',
};
const bout = ['⏱️[2031-03-28 (Fri) 09:45 PM]', '방송 진행', terminal].join('\n');
const bcommit = time.commitBroadcastAirtime(bstate, { mode: 'B_END', broadcastAirtimePrevious: bstate.broadcastAirtime }, bout);
assert(bcommit.timestamp === terminal && bstate.broadcastAirtime === terminal, `fixture12 ${JSON.stringify(bcommit)}`);

// 13. v0.64.5 logical multiline reaction units remain valid
const bilingual = [
  '- @a: English top', '(번역) [RT 1,001]',
  'ㄴ @b: reply', '(답글) [RT 1,002]',
  '- @c: top', '(번역) [RT 1,003]',
  '- @d: top', '(번역) [RT 1,004]',
  '- @e: top', '(번역) [RT 1,005]',
].join('\n');
const units = community.commentUnits(bilingual);
assert(units.length === 5 && units.filter((x) => x.kind === 'TOP').length === 4 && units.filter((x) => x.kind === 'REPLY').length === 1, 'fixture13 cardinality');
assert(units.every((x) => reaction.inspectCommentReactionLine(x.text).ok), 'fixture13 reaction regression');

// 14. Representation EXACT/SAME_FAST control
const exactRow = { fingerprintMatch: 'CANONICAL', canonicalFingerprint: '10:aaa', freshFingerprint: '10:aaa', hostRawFingerprint: '10:aaa' };
let rel = representation.inspectCarryover('10:aaa', exactRow);
assert(rel.priorRepresentation === 'EXACT' && rel.currentMatch === 'FRESH_CHAT' && text.includes('SAME_FAST'), `fixture14 ${JSON.stringify(rel)}`);

// 15. OUTPUT_MISMATCH -> Fresh exact carryover remains the fast relation
const driftRow = { fingerprintMatch: 'OUTPUT_MISMATCH', canonicalFingerprint: '11:canon', freshFingerprint: '10:fresh', hostRawFingerprint: '' };
rel = representation.inspectCarryover('10:fresh', driftRow);
assert(rel.priorRepresentation === 'OUTPUT_MISMATCH' && rel.currentMatch === 'FRESH_CHAT' && rel.deltaShape === 'FRESH_EXACT_CARRYOVER', 'fixture15 relation');
assert(text.includes('REPRESENTATION_FAST_RECONCILED') && text.includes("reason: 'representation-fast-reconciled'"), 'fixture15 fast reconcile markers');

// 16. genuine visible edit relation remains unchanged
rel = representation.inspectCarryover('10:edited', exactRow);
assert(rel.priorRepresentation === 'EXACT' && rel.currentMatch === 'NONE' && rel.deltaShape === 'NEW_VISIBLE_REPRESENTATION', 'fixture16 edit relation');
assert(text.includes('USER_EDIT_CANDIDATE') && text.includes('MANUAL_EDIT_REBUILT'), 'fixture16 edit markers');

// 17. Summary Scope remains executable/registered
const annual = lifecycle.classifySummaryScope('2030년 연말 결산을 해줘', 'C');
const yoy = lifecycle.classifySummaryScope('2029년과 2030년 연말 누적 수치를 비교해줘', 'C');
assert(annual && typeof annual.scope === 'string' && yoy && typeof yoy.scope === 'string', 'fixture17 Summary Scope execution');
assert(text.includes('ANNUAL_ONLY') && text.includes('CUMULATIVE_YOY'), 'fixture17 Summary Scope markers');

// 18. second ordinary C has no retained B_END floor
assert(!lifecycle.derivePostBEndClockEligibility('C', 'C', state, { lastRequestMode: 'C', lastRequestIndex: 2 }, { ...facts, outIndex: 3 }, 4).eligible, 'fixture18 retained B_END floor');

function section(platform, n) {
  return [
    `[${platform}]`,
    `제목: test ${n}`,
    `body ${n}`,
    '[베댓]',
    `- @a${n}: top [RT ${n}01]`,
    `ㄴ @b${n}: reply [RT ${n}02]`,
    `- @c${n}: top [RT ${n}03]`,
    `- @d${n}: top [RT ${n}04]`,
    `- @e${n}: top [RT ${n}05]`,
  ].join('\n');
}
const c1 = `<COMMUNITY>\n${[
  section('X(EN)', 1),
  section('네이버 카페', 2),
  section('에브리타임', 3),
].join('\n---\n')}\n</COMMUNITY>`;
const c2 = `<COMMUNITY>\n${[
  section('블라인드', 4),
  section('유튜브', 5),
  section('더쿠', 6),
].join('\n---\n')}\n</COMMUNITY>`;
const validBEnd = [
  '# 응답',
  '## 볼륨 1: Test',
  '### 챕터 1: Test',
  '#### Chatindex: 100 ∮',
  '⏱️[2031-03-28 (Fri) 09:45 PM]',
  '방송 마무리',
  terminal,
  c1,
  c2,
  '<Knowledge>test</Knowledge>',
].join('\n');
const rows = [
  { role: 'user', content: '[방송 종료]' },
  { role: 'assistant', content: validBEnd },
  { role: 'user', content: '[커뮤니티]' },
];
const realFacts = inspectPreviousBEndOutput(rows, 2);

// 19. real Structure rejects incomplete prior B_END and accepts bounded complete B_END
const invalidRows = [rows[0], { role: 'assistant', content: validBEnd.replace(c2, '') }, rows[2]];
const badFacts = inspectPreviousBEndOutput(invalidRows, 2);
assert(badFacts.available && !badFacts.closureComplete && (!badFacts.structureClean || !badFacts.terminalExplicit), `fixture19-invalid ${JSON.stringify(badFacts)}`);
assert(realFacts.available && realFacts.structureClean && realFacts.terminalExplicit && realFacts.closureComplete && realFacts.terminalTimestamp === terminal, `fixture19-valid ${JSON.stringify(realFacts)}`);

// 20. closure incomplete -> Lifecycle fail closed
const incomplete = { ...facts, closureComplete: false, structureClean: false, reason: 'structure-not-clean' };
e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, lineageB, incomplete, sendIndex);
assert(!e.eligible && e.reason === 'previous-b-end-closure-incomplete', `fixture20 ${JSON.stringify(e)}`);

// 21. visible terminal != stored B_END airtime -> Time INVALID_SOURCE
const mismatchState = { broadcastLocked: false, broadcastAirtime: '⏱️[2031-03-28 (Fri) 10:10 PM]' };
e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', mismatchState, lineageB, facts, sendIndex);
f = time.resolvePostBEndCurrentTimeFloor(oldNarr, e);
assert(e.eligible && f.disposition === 'INVALID_SOURCE' && f.reason === 'terminal-stored-airtime-mismatch' && f.effectiveFloor === oldNarr, `fixture21 ${JSON.stringify({ e, f })}`);

// 22. previous B request must be exactly two slots back
 e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, { lastRequestMode: 'B', lastRequestIndex: -2 }, facts, sendIndex);
assert(!e.eligible && e.reason === 'previous-request-not-direct-b', `fixture22 ${JSON.stringify(e)}`);

// 23. previous visible assistant output must be exactly one slot back
 e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, lineageB, { ...facts, outIndex: 0 }, sendIndex);
assert(!e.eligible && e.reason === 'previous-output-not-direct', `fixture23 ${JSON.stringify(e)}`);

// 24. real complete/direct facts + matching stored terminal + stale Narrative -> APPLIED
 e = lifecycle.derivePostBEndClockEligibility('C', 'B_END', state, lineageB, realFacts, sendIndex);
f = time.resolvePostBEndCurrentTimeFloor(oldNarr, e);
assert(e.eligible && e.reason === 'eligible-direct-complete-post-b-end-c' && f.disposition === 'APPLIED' && f.effectiveFloor === terminal, `fixture24 ${JSON.stringify({ e, f })}`);

// 25. same complete/direct facts + later Narrative -> ALREADY_SATISFIED
f = time.resolvePostBEndCurrentTimeFloor(laterNarr, e);
assert(f.disposition === 'ALREADY_SATISFIED' && f.effectiveFloor === laterNarr, `fixture25 ${JSON.stringify(f)}`);

console.log('v0.64.6 closure + timeline regression fixtures 1-25: PASS');