const fs = require('fs');
const vm = require('vm');

const file = 'plugins/simcore/latest.js';
const source = fs.readFileSync(file, 'utf8');

function expectedCommunityBlocks(mode) {
  return mode === 'B_END' ? 2
    : (mode === 'B_START' || mode === 'B_CONTINUE' || mode === 'C') ? 1 : 0;
}
function modeFamily(mode) {
  return /^B_/.test(String(mode || '')) ? 'B' : (mode === 'C' ? 'C' : 'A');
}
function elapsedMinutes(start, previous) {
  if (!start || !previous) return null;
  return 75;
}

const modules = {
  kernel: { reconcileState: (state) => state },
  lifecycle: { expectedCommunityBlocks },
  time: { elapsedMinutes },
  recurrence: { modeFamily },
};

const startMarker = 'SimCore.define("prompt", function (require, module, exports) {';
const endMarker = 'SimCore.define("session", function (require, module, exports) {';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + 1);
if (start < 0 || end < 0) throw new Error('prompt module boundary missing');
const promptSource = source.slice(start, end);

let factory = null;
const context = {
  SimCore: {
    define(name, fn) {
      if (name === 'prompt') factory = fn;
    },
  },
};
vm.runInNewContext(promptSource, context, { filename: 'prompt-module.js' });
if (!factory) throw new Error('prompt module factory not captured');
const promptModule = { exports: {} };
factory((name) => modules[String(name).replace(/^\.\//, '').replace(/\.js$/, '')], promptModule, promptModule.exports);
const { PROMPT_COMPILER_VERSION, compileRuntimePrompt, renderRuntimePrompt } = promptModule.exports;
if (PROMPT_COMPILER_VERSION !== 1) throw new Error('unexpected prompt compiler version');
if (compileRuntimePrompt !== renderRuntimePrompt && renderRuntimePrompt.toString().length === 0) throw new Error('render bridge missing');

const PLATFORM_MAX = {
  'YouTube(EN)': 1000001,
  'TikTok(EN)': 1000002,
  'X(EN)': 1000003,
  Reddit: 1000004,
  '네이버 카페': 1000005,
  '맘카페': 1000006,
  '에브리타임': 1000007,
  '블라인드': 1000008,
  '유튜브': 1000009,
  '인스타': 1000010,
  '틱톡': 1000011,
  X: 1000012,
  '더쿠': 1000013,
  '네이트판': 1000014,
  '펨코': 1000015,
  DC: 1000016,
};

function makeState(mode, overrides = {}) {
  const isB = /^B_/.test(mode);
  const pending = {
    active: true,
    mode,
    secondaryConfigured: true,
    secondaryActive: false,
    narrativeProgressionActive: !isB,
    narrativeProgressionReason: 'calendar-transition',
    narrativeClockGuard: !isB,
    narrativeTimestampPrevious: !isB ? '2017-04-27 오후 3:00' : null,
    broadcastAirtimePrevious: isB ? '2017-04-27 오후 12:15' : null,
    broadcastAirtimeStart: isB ? '2017-04-27 오전 11:00' : null,
    templateRecurrenceRepeated: false,
    templateRecurrenceModeFamily: modeFamily(mode),
    communitySourceHandoffNewSource: false,
    communitySourceHandoffEligible: mode === 'C',
    communitySourceHandoffRootMode: mode === 'C' ? 'A' : null,
    ...overrides.pending,
  };
  return {
    broadcastLocked: isB,
    episodeNo: overrides.episodeNo ?? (isB ? 12 : 11),
    koreanAgeOffset: overrides.koreanAgeOffset ?? 8,
    worldYear: overrides.worldYear ?? 2017,
    community: { platformMax: overrides.platformMax || { ...PLATFORM_MAX } },
    pending,
  };
}

function oldRenderRuntimePrompt(state) {
  const s = state;
  const p = s.pending;
  if (!p?.active) return '';
  const communityExpected = expectedCommunityBlocks(p.mode);
  const lines = [
    '[SIMCORE CORE STATE — AUTHORITATIVE]',
    `mode=${p.mode}`,
    `broadcast_locked=${s.broadcastLocked ? 1 : 0}`,
    `episode_no=${s.episodeNo}`,
    `secondary_configured=${p.secondaryConfigured ? 1 : 0}`,
    `secondary_active=${p.secondaryActive ? 1 : 0}`,
    `korean_age_offset=+${s.koreanAgeOffset}`,
    ...(Number(s.koreanAgeOffset || 0) > 0 ? [`current_korean_age=character_reference_age+${s.koreanAgeOffset};past_event_age_not_current=1`] : []),
    `world_year=${s.worldYear ?? 'unknown'}`,
    'required_frame=응답,볼륨,챕터,Chatindex,timestamp',
    'response_envelope=exactly_one_no_restart',
    'reference_sources=character_card+currently_exposed_lore_if_present',
    'character_world_facts_use_reference_sources=1',
    `community_blocks_expected=${communityExpected}`,
  ];
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
    lines.push('timestamp_semantics=current_narrative_time');
    lines.push('embedded_preview_flashback_or_event_time_does_not_replace_current_timestamp=1');
    lines.push(`narrative_progression_hint=${p.narrativeProgressionReason || 'forward'}`);
    if (p.narrativeClockGuard && p.narrativeTimestampPrevious) {
      lines.push(`narrative_timestamp_previous=${p.narrativeTimestampPrevious}`);
      lines.push('narrative_timestamp_must_not_precede_previous=1');
    }
  }
  if (/^B_/.test(String(p.mode || ''))) {
    lines.push('mode_b_timestamp_semantics=broadcast_airtime');
    lines.push('mode_b_timestamp_is_not=depicted_scene_or_event_time');
    lines.push('broadcast_airtime_progression=advance_only_by_elapsed_program_runtime');
    lines.push('depicted_scene_time_may_jump_hours_or_days_without_copying_that_jump_to_broadcast_airtime=1');
    lines.push(`broadcast_airtime_previous=${p.broadcastAirtimePrevious || 'unknown'}`);
    lines.push(`broadcast_airtime_start=${p.broadcastAirtimeStart || 'unknown'}`);
    if (p.broadcastAirtimePrevious) lines.push('broadcast_airtime_must_not_precede_previous=1');
    const elapsed = elapsedMinutes(p.broadcastAirtimeStart, p.broadcastAirtimePrevious);
    if (elapsed != null && elapsed >= 0) lines.push(`broadcast_airtime_elapsed_program_minutes=${elapsed}`);
  }
  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
  if (p.communitySourceHandoffNewSource) {
    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);
    lines.push('derive_reaction_from_current_source_not_prior_answer=1');
  }
  else if (p.mode === 'C' && p.communitySourceHandoffEligible) {
    lines.push('short_community_request_context_is_current_lineage=1');
  }
  if (communityExpected > 0) {
    lines.push('platform_groups_required=3_distinct');
    lines.push('platform_group_reuse_forbidden=1');
    if (/^B_/.test(p.mode)) lines.push('community_placement=after_broadcast_prose');
    if (p.mode === 'B_END') {
      lines.push('b_end_output_order=broadcast_prose_then_scene_community_then_episode_community');
      lines.push('b_end_communities_must_be_contiguous_at_end=1');
      lines.push('b_end_platform_groups_required=6_distinct_across_blocks');
      lines.push('b_end_cross_block_group_reuse_forbidden=1');
    }
    lines.push('community_comment_shape=4_top_level+1_nested_reply_exactly');
    lines.push('reaction_required=each_comment_and_reply');
    lines.push('reaction_floor_scope=per_platform_family');
    lines.push('reaction_history_shared_across_modes=1');
    lines.push(`reaction_max=${JSON.stringify(s.community.platformMax)}`);
  }
  lines.push('knowledge_required=1');
  lines.push('knowledge_position=final_output_block');
  if (communityExpected > 0) lines.push('knowledge_after_last_community=1');
  lines.push('required_knowledge_block=exactly_one_complete_<Knowledge>...</Knowledge>');
  lines.push(`final_required_blocks=COMMUNITY:${communityExpected},Knowledge:1_last`);
  lines.push('[/SIMCORE CORE STATE]');
  return lines.join('\n');
}

const generalizedCommunityLines = new Set([
  'community_comment_shape=4_top_level+1_nested_reply_exactly',
  'reaction_required=each_comment_and_reply',
  'reaction_floor_scope=per_platform_family',
  'reaction_history_shared_across_modes=1',
]);

function semanticLines(text, communityExpected, isNew) {
  let lines = String(text || '').split('\n').filter(Boolean);
  if (isNew) {
    lines = lines.filter((line) => line !== 'community_format_contract_condition=community_blocks_expected>0');
    if (communityExpected === 0) lines = lines.filter((line) => !generalizedCommunityLines.has(line));
  }
  return lines.sort();
}

function assertEqualArrays(a, b, label) {
  if (a.length !== b.length) throw new Error(`${label}: length ${a.length} != ${b.length}`);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) throw new Error(`${label}: mismatch at ${i}\nOLD ${a[i]}\nNEW ${b[i]}`);
  }
}

const cases = [
  makeState('A'),
  makeState('A', { koreanAgeOffset: 0, pending: { narrativeProgressionActive: false, narrativeClockGuard: false, narrativeTimestampPrevious: null } }),
  makeState('C'),
  makeState('C', { pending: { templateRecurrenceRepeated: true, templateRecurrenceModeFamily: 'C', communitySourceHandoffEligible: false } }),
  makeState('C', { pending: { communitySourceHandoffNewSource: true, communitySourceHandoffEligible: true, communitySourceHandoffRootMode: 'B' } }),
  makeState('B_START'),
  makeState('B_CONTINUE'),
  makeState('B_END'),
];

for (const state of cases) {
  const expected = expectedCommunityBlocks(state.pending.mode);
  const oldText = oldRenderRuntimePrompt(state);
  const newText = renderRuntimePrompt(state);
  assertEqualArrays(
    semanticLines(oldText, expected, false),
    semanticLines(newText, expected, true),
    `semantic parity ${state.pending.mode}`,
  );
  if (!newText.endsWith(`final_required_blocks=COMMUNITY:${expected},Knowledge:1_last\n[/SIMCORE CORE STATE]`)) {
    throw new Error(`footer contract changed for ${state.pending.mode}`);
  }
}

const stablePrefix = [
  '[SIMCORE CORE STATE — AUTHORITATIVE]',
  'required_frame=응답,볼륨,챕터,Chatindex,timestamp',
  'response_envelope=exactly_one_no_restart',
  'reference_sources=character_card+currently_exposed_lore_if_present',
  'character_world_facts_use_reference_sources=1',
  'knowledge_required=1',
  'knowledge_position=final_output_block',
  'required_knowledge_block=exactly_one_complete_<Knowledge>...</Knowledge>',
  'community_format_contract_condition=community_blocks_expected>0',
  'community_comment_shape=4_top_level+1_nested_reply_exactly',
  'reaction_required=each_comment_and_reply',
  'reaction_floor_scope=per_platform_family',
  'reaction_history_shared_across_modes=1',
].join('\n');
for (const state of cases) {
  const text = renderRuntimePrompt(state);
  if (!text.startsWith(stablePrefix)) throw new Error(`stable prefix drifted for ${state.pending.mode}`);
}

function commonPrefixPercent(previous, current) {
  const a = String(previous || '');
  const b = String(current || '');
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1;
  return b.length ? (i / b.length) * 100 : 100;
}

const transitionStates = {
  A: makeState('A', { worldYear: 2017, koreanAgeOffset: 8, episodeNo: 11, pending: { secondaryActive: false } }),
  C: makeState('C', { worldYear: 2018, koreanAgeOffset: 9, episodeNo: 11, pending: { secondaryActive: true } }),
  B_START: makeState('B_START', { worldYear: 2019, koreanAgeOffset: 10, episodeNo: 12, pending: { secondaryActive: false } }),
  B_CONTINUE: makeState('B_CONTINUE', { worldYear: 2019, koreanAgeOffset: 10, episodeNo: 12, pending: { secondaryActive: true } }),
  B_END: makeState('B_END', { worldYear: 2020, koreanAgeOffset: 11, episodeNo: 13, pending: { secondaryActive: false } }),
};
const names = Object.keys(transitionStates);
let worst = { pair: '', percent: Infinity };
for (const from of names) {
  for (const to of names) {
    if (from === to) continue;
    const pct = commonPrefixPercent(renderRuntimePrompt(transitionStates[from]), renderRuntimePrompt(transitionStates[to]));
    if (pct < worst.percent) worst = { pair: `${from}->${to}`, percent: pct };
    if (pct + 1e-9 < 20) throw new Error(`cache floor failed ${from}->${to}: ${pct.toFixed(2)}%`);
  }
}

const sameC1 = makeState('C', { platformMax: { ...PLATFORM_MAX } });
const bumped = { ...PLATFORM_MAX, DC: PLATFORM_MAX.DC + 999 };
const sameC2 = makeState('C', { platformMax: bumped });
const sameCPct = commonPrefixPercent(renderRuntimePrompt(sameC1), renderRuntimePrompt(sameC2));
if (sameCPct < 60) throw new Error(`same-mode hot-state prefix target failed C->C: ${sameCPct.toFixed(2)}%`);

if (/pluginStorage|Risuai\.|getChatFromIndex|setChatToIndex/.test(promptSource)) {
  throw new Error('Prompt module acquired host/storage I/O');
}

console.log(`SimCore 0.63.0 prompt compiler tests OK; worst transition ${worst.pair} ${worst.percent.toFixed(2)}%, hot C->C ${sameCPct.toFixed(2)}%`);
