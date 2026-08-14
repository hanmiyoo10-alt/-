from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.63.0 Cache-Aware Prompt Compiler:\n// - Replaces the monolithic runtime-prompt serializer with explicit Stable/Slow/Mode/Conditional/Hot/Footer compiler tiers inside the existing Prompt module\n// - Keeps lifecycle/time/recurrence/lineage/handoff/reaction/recovery/state ownership unchanged; Prompt still serializes already-computed state only\n// - Moves mode-independent output/reference/Knowledge contracts to the stable prefix and generalizes the existing Community comment/reaction format contract behind an explicit community_blocks_expected>0 guard\n// - Keeps the proven Prompt Cache Probe active for live A/B/C verification; cache-floor tests require >=20% exact SimCore runtime-block common prefix across all synthetic A/B/C mode transitions\n// - No state schema, storage key, snapshot, pluginStorage/API call, history scan, output repair, visible-Thoughts/preamble recovery, lore fetch, or creative/semantic ownership change\n//\n'''

PROMPT_MODULE = r'''SimCore.define("prompt", function (require, module, exports) {
const kernel = require('./kernel');
const lifecycle = require('./lifecycle');
const time = require('./time');
const recurrence = require('./recurrence');

const PROMPT_COMPILER_VERSION = 1;

function compileStableContract() {
  return [
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
  ];
}

function compileSlowState(s, p) {
  const lines = [
    `korean_age_offset=+${s.koreanAgeOffset}`,
  ];
  if (Number(s.koreanAgeOffset || 0) > 0) {
    lines.push(`current_korean_age=character_reference_age+${s.koreanAgeOffset};past_event_age_not_current=1`);
  }
  lines.push(`world_year=${s.worldYear ?? 'unknown'}`);
  lines.push(`secondary_configured=${p.secondaryConfigured ? 1 : 0}`);
  lines.push(`secondary_active=${p.secondaryActive ? 1 : 0}`);
  lines.push(`episode_no=${s.episodeNo}`);
  return lines;
}

function compileModeState(s, p, communityExpected) {
  return [
    `mode=${p.mode}`,
    `broadcast_locked=${s.broadcastLocked ? 1 : 0}`,
    `community_blocks_expected=${communityExpected}`,
  ];
}

function compileConditionalGuidance(s, p, communityExpected) {
  const lines = [];
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
    const elapsed = time.elapsedMinutes(p.broadcastAirtimeStart, p.broadcastAirtimePrevious);
    if (elapsed != null && elapsed >= 0) lines.push(`broadcast_airtime_elapsed_program_minutes=${elapsed}`);
  }
  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
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
    lines.push('knowledge_after_last_community=1');
  }
  return lines;
}

function compileHotState(s, communityExpected) {
  return communityExpected > 0
    ? [`reaction_max=${JSON.stringify(s.community.platformMax)}`]
    : [];
}

function compileFooter(communityExpected) {
  return [
    `final_required_blocks=COMMUNITY:${communityExpected},Knowledge:1_last`,
    '[/SIMCORE CORE STATE]',
  ];
}

function compileRuntimePrompt(state) {
  const s = kernel.reconcileState(state);
  const p = s.pending;
  if (!p?.active) return '';
  const communityExpected = lifecycle.expectedCommunityBlocks(p.mode);
  const tiers = [
    compileStableContract(),
    compileSlowState(s, p),
    compileModeState(s, p, communityExpected),
    compileConditionalGuidance(s, p, communityExpected),
    compileHotState(s, communityExpected),
    compileFooter(communityExpected),
  ];
  return tiers.flat().join('\n');
}

function renderRuntimePrompt(state) {
  return compileRuntimePrompt(state);
}

module.exports = { PROMPT_COMPILER_VERSION, compileRuntimePrompt, renderRuntimePrompt };
});'''


def patch_text(text: str) -> str:
    if '//@version 0.62.36' not in text:
        raise SystemExit('expected 0.62.36 metadata not found')
    if '// v0.63.0 Cache-Aware Prompt Compiler:' in text:
        raise SystemExit('0.63.0 changelog already present')

    text = text.replace('//@version 0.62.36', '//@version 0.63.0', 1)

    # Runtime log/UI version literals should follow the release, but historical comment headings stay untouched.
    rows = text.splitlines(keepends=True)
    out = []
    for row in rows:
        stripped = row.lstrip()
        if '0.62.36' in row and not stripped.startswith('//'):
            row = row.replace('0.62.36', '0.63.0')
        out.append(row)
    text = ''.join(out)

    text = text.replace(
        "// - Prompt: runtime prompt serialization only; does not own semantic state\n",
        "// - Prompt: cache-aware runtime prompt compilation/serialization only; does not own semantic state\n",
        1,
    )
    marker = '// v0.62.36 Prompt Cache Probe:\n'
    if marker not in text:
        raise SystemExit('0.62.36 changelog marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    start_marker = 'SimCore.define("prompt", function (require, module, exports) {'
    end_marker = 'SimCore.define("session", function (require, module, exports) {'
    start = text.find(start_marker)
    end = text.find(end_marker, start + 1)
    if start < 0 or end < 0:
        raise SystemExit('prompt/session module boundary not found')
    text = text[:start] + PROMPT_MODULE + '\n\n' + text[end:]
    return text


for path in FILES:
    original = path.read_text(encoding='utf-8')
    patched = patch_text(original)
    path.write_text(patched, encoding='utf-8')

if FILES[0].read_bytes() != FILES[1].read_bytes():
    raise SystemExit('latest.js/install.js parity failed after patch')

print('patched SimCore 0.63.0 latest.js/install.js')
