from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


text = LATEST.read_text(encoding='utf-8')

for marker in (
    '//@version 0.64.5',
    "const SIMCORE_RUNTIME_VERSION = '0.64.5';",
    '// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:',
    'function compareTimestamps(a, b)',
    'function prepareTurn(baseState, userText, promptProbe, sendIndex)',
    'function enforceNarrativeCurrentTimeFloor(content, previous)',
    'function commentUnits(commentScope)',
    'REPRESENTATION_FAST_RECONCILED',
    'USER_EDIT_CANDIDATE',
    'MANUAL_EDIT_REBUILT',
):
    if marker not in text:
        raise SystemExit(f'missing expected v0.64.5 marker: {marker}')

if '// v0.64.6 Post-B_END C Clock Handoff Authority:' in text:
    raise SystemExit('v0.64.6 release note already present')
if 'function derivePostBEndClockEligibility(' in text:
    raise SystemExit('v0.64.6 Lifecycle helper already present')
if 'function resolvePostBEndCurrentTimeFloor(' in text:
    raise SystemExit('v0.64.6 Time helper already present')

release_note = """// v0.64.6 Post-B_END C Clock Handoff Authority:
// - Repairs the directly recurrent POST_BEND_C_CLOCK_DOMAIN_GAP: the first direct Mode C after a completed B_END may no longer use a stale Narrative current-time anchor earlier than the completed broadcast terminal airtime
// - Adds a request-scoped POST_B_END_CURRENT_TIME_FLOOR only for the direct first C after B_END; Lifecycle owns eligibility, Time owns timestamp validation/comparison/floor selection, Prompt serializes the resulting current-frame authority, and finalization reuses the existing Narrative floor primitive
// - Keeps Broadcast airtime and Narrative/event time as separate domains: no B_END-time Narrative mutation, no persistent Broadcast→Narrative coupling, no invented offset, and explicit user-requested historical/flashback timestamps remain allowed below the current-frame floor
// - Source Handoff eligibility is intentionally not a clock prerequisite; a recurrence-owned Source Handoff may still receive the post-B_END clock bridge when lifecycle/lineage conditions are direct and valid
// - Consolidates regression checks for Current Timeline Authority, Narrative Tail Time, B_END terminal airtime authority, explicit past-scene allowance, current calendar baseline, Representation/Edit controls, Summary Scope, and v0.64.5 COMMUNITY multiline behavior without changing those owners
// - Adds no persistent schema/key, host read/write, network call, timer, request-history mutation, Representation taxonomy change, Edit Reconcile movement, Reaction normalization change, COMMUNITY structure change, Bootstrap Migration change, or cache/provider claim
//
"""

text = one(text, '//@version 0.64.5', '//@version 0.64.6', 'metadata version')
text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.64.5';", "const SIMCORE_RUNTIME_VERSION = '0.64.6';", 'runtime version')
text = one(text, '// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:', release_note + '// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:', 'release note')

compare_anchor = """function compareTimestamps(a, b) {
  const pa = parseTimestamp(a);
  const pb = parseTimestamp(b);
  if (!pa || !pb) return null;
  return pa.minuteKey === pb.minuteKey ? 0 : (pa.minuteKey > pb.minuteKey ? 1 : -1);
}
"""
compare_replacement = compare_anchor + """
function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility) {
  const narrativeRaw = typeof narrativeTimestamp === 'string' && narrativeTimestamp.trim() ? narrativeTimestamp.trim() : null;
  const base = eligibility && typeof eligibility === 'object' ? eligibility : { eligible: false, reason: 'not-eligible' };
  if (!base.eligible) {
    return Object.freeze({
      disposition: 'INELIGIBLE',
      source: base.source || 'NONE',
      reason: base.reason || 'not-eligible',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const terminal = parseTimestamp(base.floorTimestamp);
  if (!terminal) {
    return Object.freeze({
      disposition: 'INVALID_SOURCE',
      source: base.source || 'B_END_TERMINAL',
      reason: 'invalid-b-end-terminal',
      terminalTimestamp: base.floorTimestamp || null,
      narrativeTimestamp: narrativeRaw,
      effectiveFloor: narrativeRaw,
    });
  }

  const narrative = narrativeRaw ? parseTimestamp(narrativeRaw) : null;
  if (!narrative || terminal.minuteKey > narrative.minuteKey) {
    return Object.freeze({
      disposition: 'APPLIED',
      source: base.source || 'B_END_TERMINAL',
      reason: narrative ? 'b-end-terminal-after-narrative' : 'narrative-missing',
      terminalTimestamp: terminal.raw,
      narrativeTimestamp: narrative ? narrative.raw : narrativeRaw,
      effectiveFloor: terminal.raw,
    });
  }

  return Object.freeze({
    disposition: 'ALREADY_SATISFIED',
    source: base.source || 'B_END_TERMINAL',
    reason: terminal.minuteKey === narrative.minuteKey ? 'narrative-equals-terminal' : 'narrative-after-terminal',
    terminalTimestamp: terminal.raw,
    narrativeTimestamp: narrative.raw,
    effectiveFloor: narrative.raw,
  });
}
"""
text = one(text, compare_anchor, compare_replacement, 'Time post-B_END floor helper')

export_anchor = """  timestampYear,
  compareTimestamps,
  elapsedMinutes,"""
export_replacement = """  timestampYear,
  compareTimestamps,
  resolvePostBEndCurrentTimeFloor,
  elapsedMinutes,"""
text = one(text, export_anchor, export_replacement, 'Time export')

prepare_anchor = "function prepareTurn(baseState, userText, promptProbe, sendIndex) {"
eligibility_helper = """function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage) {
  if (String(mode || '') !== 'C') return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'not-c' });
  if (String(previousMode || '') !== 'B_END') return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'not-direct-post-b-end-c' });
  if (state?.broadcastLocked) return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'broadcast-still-locked' });
  const floorTimestamp = typeof state?.broadcastAirtime === 'string' && state.broadcastAirtime.trim() ? state.broadcastAirtime.trim() : null;
  if (!floorTimestamp) return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'missing-b-end-terminal' });
  const priorFamily = String(requestLineage?.lastRequestMode || '');
  const priorIndex = Number(requestLineage?.lastRequestIndex);
  if (priorFamily !== 'B' || !Number.isInteger(priorIndex) || priorIndex < 0) {
    return Object.freeze({ eligible: false, floorTimestamp: null, source: 'NONE', reason: 'previous-request-not-b' });
  }
  return Object.freeze({ eligible: true, floorTimestamp, source: 'B_END_TERMINAL', reason: 'eligible-direct-post-b-end-c' });
}

"""
text = one(text, prepare_anchor, eligibility_helper + prepare_anchor, 'Lifecycle eligibility helper')

old_narrative_block = """  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);
  const narrativeCalendarTarget = /^B_/.test(c.mode)
    ? { eligible: false, reason: 'BROADCAST', targetDate: null }
    : time.resolveCalendarTransition(input, narrativeTimestampPrevious, state.worldYear);
  const narrativeProgression = /^B_/.test(c.mode)
    ? { active: false, reason: 'broadcast' }
    : (narrativeCalendarTarget.eligible ? { active: true, reason: 'calendar-resolved' } : time.narrativeProgressionHint(input));
  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);
  const templateRecurrence = recurrence.observe(state, input, c.mode);
"""
new_narrative_block = """  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);
  const previousMode = state.lastMode || 'A';
  const postBEndClockEligibility = derivePostBEndClockEligibility(c.mode, previousMode, state, state.requestLineage);
  const postBEndClockHandoff = time.resolvePostBEndCurrentTimeFloor(narrativeTimestampPrevious, postBEndClockEligibility);
  const narrativeCurrentTimeFloor = postBEndClockHandoff.effectiveFloor || narrativeTimestampPrevious || null;
  const narrativeCalendarTarget = /^B_/.test(c.mode)
    ? { eligible: false, reason: 'BROADCAST', targetDate: null }
    : time.resolveCalendarTransition(input, narrativeCurrentTimeFloor, state.worldYear);
  const narrativeProgression = /^B_/.test(c.mode)
    ? { active: false, reason: 'broadcast' }
    : (narrativeCalendarTarget.eligible ? { active: true, reason: 'calendar-resolved' } : time.narrativeProgressionHint(input));
  const narrativeClockGuard = !!((narrativeProgression.active || postBEndClockHandoff.disposition === 'APPLIED') && narrativeCurrentTimeFloor);
  const templateRecurrence = recurrence.observe(state, input, c.mode);
"""
text = one(text, old_narrative_block, new_narrative_block, 'Lifecycle request clock derivation')

pending_anchor = """    narrativeProgressionReason: narrativeProgression.reason || 'none',
    narrativeTimestampPrevious,
    narrativeClockGuard,
    narrativeCalendarTarget,"""
pending_replacement = """    narrativeProgressionReason: narrativeProgression.reason || 'none',
    narrativeTimestampPrevious,
    narrativeCurrentTimeFloor,
    narrativeClockGuard,
    narrativeCalendarTarget,
    postBEndClockEligible: !!postBEndClockEligibility.eligible,
    postBEndClockDisposition: postBEndClockHandoff.disposition || 'INELIGIBLE',
    postBEndClockFloor: postBEndClockHandoff.terminalTimestamp || postBEndClockEligibility.floorTimestamp || null,
    postBEndClockReason: postBEndClockHandoff.reason || postBEndClockEligibility.reason || 'unknown',
    currentTimeAuthority: postBEndClockHandoff.disposition === 'APPLIED' ? 'POST_B_END_FLOOR' : 'NARRATIVE',"""
text = one(text, pending_anchor, pending_replacement, 'pending clock fields')

lifecycle_export_anchor = "module.exports = { classifyMode, classifySummaryScope, prepareTurn, expectedCommunityBlocks };"
lifecycle_export_replacement = "module.exports = { classifyMode, classifySummaryScope, derivePostBEndClockEligibility, prepareTurn, expectedCommunityBlocks };"
text = one(text, lifecycle_export_anchor, lifecycle_export_replacement, 'Lifecycle export')

prompt_anchor = """  if (p.mode === 'C') lines.push('mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1');
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeTimestampPrevious) {
    lines.push(`current_timeline_anchor=${p.narrativeTimestampPrevious}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
"""
prompt_replacement = """  if (p.mode === 'C') lines.push('mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1');
  const currentTimelineAnchor = p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious || null;
  if (!/^B_/.test(String(p.mode || '')) && currentTimelineAnchor) {
    lines.push(`current_timeline_anchor=${currentTimelineAnchor}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
  if (p.mode === 'C' && (p.postBEndClockDisposition === 'APPLIED' || p.postBEndClockDisposition === 'ALREADY_SATISFIED')) {
    lines.push(`post_b_end_current_time_floor=${p.postBEndClockFloor || currentTimelineAnchor}`);
    lines.push(`post_b_end_clock_handoff=${p.postBEndClockDisposition}`);
    lines.push('post_b_end_floor_is_current_frame_minimum_only=1;broadcast_airtime_is_not_depicted_event_time=1');
    lines.push('explicit_user_requested_past_scene_or_flashback_may_predate_post_b_end_floor=1');
  }
"""
text = one(text, prompt_anchor, prompt_replacement, 'Prompt current-time authority')

calendar_guard_anchor = """    if (p.narrativeClockGuard && p.narrativeTimestampPrevious) {
      lines.push(`narrative_timestamp_previous=${p.narrativeTimestampPrevious}`);
      lines.push('narrative_timestamp_must_not_precede_previous=1');
    }
"""
calendar_guard_replacement = """    if (p.narrativeClockGuard && (p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious)) {
      lines.push(`narrative_timestamp_previous=${p.narrativeTimestampPrevious || 'n/a'}`);
      lines.push(`narrative_current_time_floor=${p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious}`);
      lines.push('narrative_timestamp_must_not_precede_current_time_floor=1');
    }
"""
text = one(text, calendar_guard_anchor, calendar_guard_replacement, 'Prompt narrative floor guard')

finalize_anchor = """    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(
      finalText,
      p.narrativeTimestampPrevious || state.narrativeTimestamp || null,
    );"""
finalize_replacement = """    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(
      finalText,
      p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious || state.narrativeTimestamp || null,
    );"""
text = one(text, finalize_anchor, finalize_replacement, 'Finalization current-time floor consumption')

probe_anchor = """          trigger: pendingProbe.narrativeProgressionReason || 'none',
          previousAnchor: pendingProbe.narrativeTimestampPrevious || null,
          outputTimestamp: null,"""
probe_replacement = """          trigger: pendingProbe.narrativeProgressionReason || 'none',
          previousAnchor: pendingProbe.narrativeTimestampPrevious || null,
          effectiveFloor: pendingProbe.narrativeCurrentTimeFloor || pendingProbe.narrativeTimestampPrevious || null,
          postBEndClockDisposition: pendingProbe.postBEndClockDisposition || 'INELIGIBLE',
          postBEndClockFloor: pendingProbe.postBEndClockFloor || null,
          postBEndClockReason: pendingProbe.postBEndClockReason || 'unknown',
          currentTimeAuthority: pendingProbe.currentTimeAuthority || 'NARRATIVE',
          outputTimestamp: null,"""
text = one(text, probe_anchor, probe_replacement, 'Pending diagnostic probe')

output_probe_anchor = """        ...result.narrativeClockProbe,
        phase: 'output',
        previousMode: priorProbe?.previousMode || null,
      };"""
output_probe_replacement = """        ...result.narrativeClockProbe,
        phase: 'output',
        previousMode: priorProbe?.previousMode || null,
        effectiveFloor: priorProbe?.effectiveFloor || result.narrativeClockProbe.previous || null,
        postBEndClockDisposition: priorProbe?.postBEndClockDisposition || 'INELIGIBLE',
        postBEndClockFloor: priorProbe?.postBEndClockFloor || null,
        postBEndClockReason: priorProbe?.postBEndClockReason || 'unknown',
        currentTimeAuthority: priorProbe?.currentTimeAuthority || 'NARRATIVE',
      };"""
text = one(text, output_probe_anchor, output_probe_replacement, 'Output diagnostic probe carryover')

diag_anchor = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Narrative tail coverage:"""
diag_replacement = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Post-B_END clock handoff: ${probeFresh && narrative ? `${narrative.postBEndClockDisposition || 'INELIGIBLE'} · floor ${narrative.postBEndClockFloor || 'n/a'} · narrative ${narrative.previousAnchor || 'n/a'} · effective ${narrative.effectiveFloor || narrative.previousAnchor || 'n/a'} · reason ${narrative.postBEndClockReason || 'unknown'}` : 'n/a'}`,
      `Current-time authority: ${probeFresh && narrative ? (narrative.currentTimeAuthority || 'NARRATIVE') : 'n/a'}`,
      `Narrative tail coverage:"""
text = one(text, diag_anchor, diag_replacement, 'Diagnostic clock handoff lines')

for marker in (
    'function resolvePostBEndCurrentTimeFloor(narrativeTimestamp, eligibility)',
    'function derivePostBEndClockEligibility(mode, previousMode, state, requestLineage)',
    'post_b_end_current_time_floor=',
    'post_b_end_floor_is_current_frame_minimum_only=1',
    'p.narrativeCurrentTimeFloor || p.narrativeTimestampPrevious || state.narrativeTimestamp || null',
    'Post-B_END clock handoff:',
    'Current-time authority:',
):
    if marker not in text:
        raise SystemExit(f'missing v0.64.6 post-patch marker: {marker}')

if 'if (sourceHandoffEligible)' in text:
    raise SystemExit('unexpected Source Handoff dependency marker introduced')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('SimCore v0.64.6 Post-B_END C Clock Handoff Authority patch applied')
