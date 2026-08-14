'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const path = 'plugins/simcore/latest.js';
const source = fs.readFileSync(path, 'utf8');
const moduleEnd = source.indexOf('\n(async () => {');
assert(moduleEnd > 0, 'runtime IIFE boundary missing');
const moduleSource = source.slice(0, moduleEnd) + '\n;globalThis.__SimCore = SimCore;';
const context = { console };
vm.createContext(context);
vm.runInContext(moduleSource, context, { filename: path });
const SimCore = context.__SimCore;
assert(SimCore, 'SimCore module loader unavailable');

const kernel = SimCore.require('kernel');
const prompt = SimCore.require('prompt');
const lifecycle = SimCore.require('lifecycle');

function family(mode) {
  return /^B_/.test(mode) ? 'B' : mode;
}

function makeState(mode, overrides = {}) {
  const s = kernel.initialState();
  s.worldYear = 2028;
  s.koreanAgeOffset = 2;
  s.episodeNo = 12;
  s.broadcastLocked = /^B_/.test(mode) && mode !== 'B_END';
  s.community.platformMax = { X: 14000000, '더쿠': 12700000 };
  s.pending = {
    active: true,
    sendIndex: 758,
    mode,
    secondaryConfigured: false,
    secondaryActive: false,
    narrativeProgressionActive: false,
    narrativeProgressionReason: 'none',
    narrativeTimestampPrevious: null,
    narrativeClockGuard: false,
    broadcastAirtimePrevious: /^B_/.test(mode) ? '⏱️[2028-12-25 (Mon) 09:30 PM]' : null,
    broadcastAirtimeStart: /^B_/.test(mode) ? '⏱️[2028-12-25 (Mon) 09:00 PM]' : null,
    templateRecurrenceEligible: false,
    templateRecurrenceRepeated: false,
    templateRecurrenceModeFamily: family(mode),
    communitySourceHandoffEligible: false,
    communitySourceHandoffSeen: false,
    communitySourceHandoffNewSource: false,
    communitySourceHandoffRootMode: null,
    communitySourceHandoffRootIndex: -1,
    requestLineageInlineSource: false,
    ...overrides,
  };
  return s;
}

function render(mode, overrides = {}) {
  return prompt.renderRuntimePrompt(makeState(mode, overrides));
}

function commonPrefixPercent(a, b) {
  const left = String(a);
  const right = String(b);
  const limit = Math.min(left.length, right.length);
  let i = 0;
  while (i < limit && left.charCodeAt(i) === right.charCodeAt(i)) i += 1;
  return i / Math.max(left.length, right.length, 1) * 100;
}

// Baseline compiler semantics retained.
for (const mode of ['A', 'B_START', 'B_CONTINUE', 'B_END', 'C']) {
  const text = render(mode);
  assert(text.startsWith('[SIMCORE CORE STATE — AUTHORITATIVE]\n'), `${mode}: stable header missing`);
  assert(text.includes('required_frame=응답,볼륨,챕터,Chatindex,timestamp'), `${mode}: frame contract missing`);
  assert(text.includes('response_envelope=exactly_one_no_restart'), `${mode}: envelope contract missing`);
  assert(text.includes('reference_sources=character_card+currently_exposed_lore_if_present'), `${mode}: reference contract missing`);
  assert(text.includes('knowledge_required=1'), `${mode}: knowledge contract missing`);
  assert(text.endsWith('[/SIMCORE CORE STATE]'), `${mode}: footer missing`);
  assert(text.includes(`community_blocks_expected=${lifecycle.expectedCommunityBlocks(mode)}`), `${mode}: community count mismatch`);
}

assert(!render('A').includes('reaction_max='), 'A must not receive reaction_max');
assert(render('C').includes('reaction_max='), 'C reaction_max missing');
assert(render('B_END').includes('b_end_platform_groups_required=6_distinct_across_blocks'), 'B_END six-group contract missing');

// Reproduction fixture: A(Hwaa source) -> short C("[커뮤니티] 스페셜무대 반응").
const shortC = render('C', {
  communitySourceHandoffEligible: true,
  communitySourceHandoffSeen: false,
  communitySourceHandoffNewSource: false,
  communitySourceHandoffRootMode: 'A',
  communitySourceHandoffRootIndex: 757,
});
const requiredSourceLock = [
  'short_community_request_context_is_current_lineage=1',
  'short_community_source_selector=current_lineage_root_turn',
  'short_community_source_root_mode=A',
  'short_community_source_root_index=757',
  'short_community_source_is_authoritative=1',
  'do_not_substitute_prior_similar_source_or_prior_community_answer=1',
];
for (const token of requiredSourceLock) assert(shortC.includes(token), `short-C source lock missing: ${token}`);
assert(!shortC.includes('short_community_request_reused_with_new_source='), 'FIRST short-C must not claim NEW SOURCE');

const newSourceC = render('C', {
  communitySourceHandoffEligible: true,
  communitySourceHandoffSeen: true,
  communitySourceHandoffNewSource: true,
  communitySourceHandoffRootMode: 'B',
  communitySourceHandoffRootIndex: 810,
});
for (const token of [
  'short_community_source_selector=current_lineage_root_turn',
  'short_community_source_root_mode=B',
  'short_community_source_root_index=810',
  'short_community_source_is_authoritative=1',
  'short_community_request_reused_with_new_source=B',
  'derive_reaction_from_current_source_not_prior_answer=1',
]) assert(newSourceC.includes(token), `NEW SOURCE compatibility missing: ${token}`);

const ineligibleC = render('C');
assert(!ineligibleC.includes('short_community_source_selector='), 'ineligible C must not receive source lock');
assert(!render('A', { communitySourceHandoffEligible: true, communitySourceHandoffRootMode: 'A', communitySourceHandoffRootIndex: 757 }).includes('short_community_source_selector='), 'Mode A must not receive short-C source lock');

// Cache contract: all synthetic mode transitions keep >=20% exact runtime-block prefix.
const modePrompts = Object.fromEntries(['A', 'B_START', 'B_CONTINUE', 'B_END', 'C'].map((m) => [m, render(m)]));
let worst = { label: '', pct: 101 };
for (const from of Object.keys(modePrompts)) {
  for (const to of Object.keys(modePrompts)) {
    if (from === to) continue;
    const pct = commonPrefixPercent(modePrompts[from], modePrompts[to]);
    if (pct < worst.pct) worst = { label: `${from}->${to}`, pct };
    assert(pct >= 20, `cache floor failed ${from}->${to}: ${pct.toFixed(2)}%`);
  }
}

const hotC1 = render('C', {
  communitySourceHandoffEligible: true,
  communitySourceHandoffRootMode: 'A',
  communitySourceHandoffRootIndex: 757,
});
const hotState2 = makeState('C', {
  communitySourceHandoffEligible: true,
  communitySourceHandoffRootMode: 'A',
  communitySourceHandoffRootIndex: 757,
});
hotState2.community.platformMax.X = 14001000;
const hotC2 = prompt.renderRuntimePrompt(hotState2);
const hotPct = commonPrefixPercent(hotC1, hotC2);
assert(hotPct >= 60, `same-source C hot-state prefix too low: ${hotPct.toFixed(2)}%`);

const rootMovedC = render('C', {
  communitySourceHandoffEligible: true,
  communitySourceHandoffRootMode: 'A',
  communitySourceHandoffRootIndex: 758,
});
const rootMovePct = commonPrefixPercent(hotC1, rootMovedC);
assert(rootMovePct >= 60, `short-C root-index change prefix too low: ${rootMovePct.toFixed(2)}%`);

// Manual diagnostic-copy feature is raw-first and storage-free.
for (const token of [
  'function buildLastTurnDiagnosticReport(chat, state)',
  "navigator.clipboard?.writeText",
  'copy-turn-diag',
  'ROOT SOURCE TURN (RAW)',
  'PARENT TURN (RAW)',
  'CURRENT TURN (RAW)',
  'Diagnostic format: raw-lineage-v1',
  "sourceAnchor: runtimeBudgetLines.some((line) => line === 'short_community_source_is_authoritative=1')",
]) assert(source.includes(token), `diagnostic-copy sentinel missing: ${token}`);

assert(source.includes('//@version 0.63.1'), '0.63.1 metadata missing');
assert(source.includes('// v0.63.1 Short-C Source Lock + Turn Diagnostic Copy:'), '0.63.1 changelog missing');

console.log(`SimCore 0.63.1 tests OK; worst transition ${worst.label} ${worst.pct.toFixed(2)}%, hot C ${hotPct.toFixed(2)}%, root-move C ${rootMovePct.toFixed(2)}%`);
