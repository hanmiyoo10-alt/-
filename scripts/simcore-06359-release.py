from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
files = [root / 'plugins/simcore/latest.js', root / 'plugins/simcore/install.js']

for path in files:
    if not path.exists():
        raise SystemExit(f'missing production file: {path}')

before = [p.read_text(encoding='utf-8') for p in files]
if before[0] != before[1]:
    raise SystemExit('precondition failed: latest.js and install.js are not identical')

release_block = """// v0.63.59 Broadcast End Closure Contract:
// - Follows direct 24-hour B_START -> B_CONTINUE -> B_END long-chat evidence where Broadcast End Authority correctly allowed the explicit B_END and unlocked the session, but the response began at 08:30, visibly progressed through "5 minutes remaining" to the 09:00 end, and persisted broadcast airtime at the stale 08:30 frame timestamp
// - Extends the v0.63.58 explicit terminal-time contract only to B_END: every B_END must emit a final canonical timestamp line for the terminal current broadcast airtime, even when equal to the frame time; prose-only end-time progression is not authoritative
// - B_END airtime commit now uses the last line-level canonical timestamp only when the complete timestamp sequence is monotonic and an explicit terminal line exists; malformed/non-monotonic/missing tails fail closed to the existing frame airtime rather than inferring arbitrary prose times
// - Clarifies the already-existing B_END COMMUNITY contract as exactly two COMMUNITY blocks with exactly three platform sections each; one COMMUNITY block containing six sections is explicitly invalid, while Structure remains judge/quarantine-only and performs no output repair
// - Adds Broadcast closure / terminal coverage diagnostics separating end authority, terminal airtime coverage and COMMUNITY structural closure; unlock success alone no longer reads as complete closure
// - Scope is B_END closure only: B_START/B_CONTINUE airtime semantics, v0.63.58 non-broadcast Narrative Tail Time Contract, v0.63.57 current-timeline authority, Representation/Edit Reconcile, Recovery, Deferred Mirror, Frame, Evidence/Lineage/Handoff/Recurrence, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
"""

old_commit_broadcast = """function commitBroadcastAirtime(state, pending, content) {
  if (!/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'not-broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const current = parsed.raw;
  const previous = pending?.broadcastAirtimePrevious || state.broadcastAirtime || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous };
  }
  const changed = state.broadcastAirtime !== current;
  if (!state.broadcastAirtimeStart || pending?.broadcastAirtimeIsNew) state.broadcastAirtimeStart = current;
  state.broadcastAirtime = current;
  return { changed, reason: 'committed', timestamp: current, previous };
}
"""

new_commit_broadcast = """function commitBroadcastAirtime(state, pending, content) {
  if (!/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'not-broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const isEnd = String(pending?.mode || '') === 'B_END';
  const terminal = isEnd ? narrativeTimestampSequence(content) : null;
  const terminalExplicit = !!(terminal
    && terminal.sceneCount > 0
    && terminal.tailStatus === 'MONOTONIC'
    && terminal.candidate);
  const current = terminalExplicit ? terminal.candidate : parsed.raw;
  const previous = pending?.broadcastAirtimePrevious || state.broadcastAirtime || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return {
      changed: false,
      reason: 'backward',
      timestamp: current,
      previous,
      frameTimestamp: parsed.raw,
      sequenceCount: Number(terminal?.sequenceCount || 0),
      sceneCount: Number(terminal?.sceneCount || 0),
      tailStatus: terminal?.tailStatus || 'n/a',
      terminalExplicit,
    };
  }
  const changed = state.broadcastAirtime !== current;
  if (!state.broadcastAirtimeStart || pending?.broadcastAirtimeIsNew) state.broadcastAirtimeStart = current;
  state.broadcastAirtime = current;
  return {
    changed,
    reason: 'committed',
    timestamp: current,
    previous,
    frameTimestamp: parsed.raw,
    sequenceCount: Number(terminal?.sequenceCount || 0),
    sceneCount: Number(terminal?.sceneCount || 0),
    tailStatus: terminal?.tailStatus || (isEnd ? 'FRAME_ONLY' : 'n/a'),
    terminalExplicit,
  };
}
"""

old_broadcast_prompt = """  if (/^B_/.test(String(p.mode || ''))) {
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
"""

new_broadcast_prompt = """  if (/^B_/.test(String(p.mode || ''))) {
    lines.push('mode_b_timestamp_semantics=broadcast_airtime');
    lines.push('mode_b_timestamp_is_not=depicted_scene_or_event_time');
    lines.push('broadcast_airtime_progression=advance_only_by_elapsed_program_runtime');
    lines.push('depicted_scene_time_may_jump_hours_or_days_without_copying_that_jump_to_broadcast_airtime=1');
    lines.push(`broadcast_airtime_previous=${p.broadcastAirtimePrevious || 'unknown'}`);
    lines.push(`broadcast_airtime_start=${p.broadcastAirtimeStart || 'unknown'}`);
    if (p.broadcastAirtimePrevious) lines.push('broadcast_airtime_must_not_precede_previous=1');
    const elapsed = time.elapsedMinutes(p.broadcastAirtimeStart, p.broadcastAirtimePrevious);
    if (elapsed != null && elapsed >= 0) lines.push(`broadcast_airtime_elapsed_program_minutes=${elapsed}`);
    if (p.mode === 'B_END') {
      lines.push('broadcast_end_closure_contract=1;broadcast_end_always_emit_terminal_canonical_timestamp_line=1');
      lines.push('broadcast_terminal_timestamp_means_final_current_broadcast_airtime=1;do_not_leave_broadcast_end_time_only_in_prose=1');
    }
  }
"""

old_b_end_community = """    if (p.mode === 'B_END') {
      lines.push('b_end_output_order=broadcast_prose_then_scene_community_then_episode_community');
      lines.push('b_end_communities_must_be_contiguous_at_end=1');
      lines.push('b_end_platform_groups_required=6_distinct_across_blocks');
      lines.push('b_end_cross_block_group_reuse_forbidden=1');
    }
"""

new_b_end_community = """    if (p.mode === 'B_END') {
      lines.push('b_end_output_order=broadcast_prose_then_scene_community_then_episode_community');
      lines.push('b_end_communities_must_be_contiguous_at_end=1');
      lines.push('b_end_platform_groups_required=6_distinct_across_blocks');
      lines.push('b_end_cross_block_group_reuse_forbidden=1');
      lines.push('b_end_block_shape=2_community_blocks_x_3_platform_sections_each');
      lines.push('b_end_one_community_block_with_6_platform_sections_is_invalid=1');
    }
"""

old_diag_probe = """    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;
    const preamble = outputFresh ? (lastPreambleProvenance || null) : null;
"""

new_diag_probe = """    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;
    const broadcastTerminal = outputFresh && runtimeMode === 'B_END' && latestAssistantIndex >= 0
      ? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))
      : null;
    const preamble = outputFresh ? (lastPreambleProvenance || null) : null;
"""

old_diag_warning = """    const warnings = outputFresh && Array.isArray(lastCore?.issues) ? lastCore.issues : [];
    const compatibility = outputFresh && Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];
"""

new_diag_warning = """    const warnings = outputFresh && Array.isArray(lastCore?.issues) ? lastCore.issues : [];
    const compatibility = outputFresh && Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];
    const broadcastTerminalExplicit = !!(broadcastTerminal
      && broadcastTerminal.sceneCount > 0
      && broadcastTerminal.tailStatus === 'MONOTONIC'
      && broadcastTerminal.candidate);
    const broadcastCommunityClean = !warnings.some((x) => /^COMMUNITY\\b/.test(String(x || '')));
"""

old_diag_lines = """      `Broadcast end authority: ${probeFresh && budget ? `${budget.broadcastEndAuthority || 'NOT_APPLICABLE'} · ${budget.broadcastEndReason || 'unknown'}` : 'n/a'}`,
      `End boundary: ${probeFresh && budget && budget.broadcastEndAuthority === 'DENIED' ? 'PROSE+COMMUNITY+KNOWLEDGE · explicit B_END required' : (probeFresh && budget && budget.broadcastEndAuthority === 'ALLOWED' ? 'END AUTHORIZED' : 'n/a')}`,
      `Short-C source lock: ${runtimeActive ? (budget?.sourceAnchor ? 'ON' : 'OFF') : 'n/a'}`,
"""

new_diag_lines = """      `Broadcast end authority: ${probeFresh && budget ? `${budget.broadcastEndAuthority || 'NOT_APPLICABLE'} · ${budget.broadcastEndReason || 'unknown'}` : 'n/a'}`,
      `End boundary: ${probeFresh && budget && budget.broadcastEndAuthority === 'DENIED' ? 'PROSE+COMMUNITY+KNOWLEDGE · explicit B_END required' : (probeFresh && budget && budget.broadcastEndAuthority === 'ALLOWED' ? 'END AUTHORIZED' : 'n/a')}`,
      `Broadcast closure: ${outputFresh && runtimeMode === 'B_END' ? `${broadcastTerminalExplicit && broadcastCommunityClean ? 'COMPLETE' : 'PARTIAL'} · terminal ${broadcastTerminalExplicit ? 'EXPLICIT' : 'MISSING_OR_INVALID'} · structure ${broadcastCommunityClean ? 'PASS' : 'QUARANTINED'}` : 'n/a'}`,
      `Broadcast terminal coverage: ${outputFresh && runtimeMode === 'B_END' ? (broadcastTerminalExplicit ? `EXPLICIT_TERMINAL · frame ${broadcastTerminal?.frameTimestamp || 'n/a'} · terminal ${broadcastTerminal?.candidate || 'n/a'} · stored ${state?.broadcastAirtime || 'n/a'}` : `${broadcastTerminal?.tailStatus || 'MISSING'} · explicit terminal canonical timestamp absent or invalid · RAW prose cross-check required for elapsed/end-time cues`) : 'n/a'}`,
      `Short-C source lock: ${runtimeActive ? (budget?.sourceAnchor ? 'ON' : 'OFF') : 'n/a'}`,
"""

for path, text in zip(files, before):
    checks = {
        'metadata version': ('//@version 0.63.58', '//@version 0.63.59'),
        'runtime version': ("const SIMCORE_RUNTIME_VERSION = '0.63.58';", "const SIMCORE_RUNTIME_VERSION = '0.63.59';"),
        'release header anchor': ('// v0.63.58 Narrative Tail Time Contract:\n', release_block + '// v0.63.58 Narrative Tail Time Contract:\n'),
        'broadcast airtime terminal commit': (old_commit_broadcast, new_commit_broadcast),
        'broadcast end time prompt': (old_broadcast_prompt, new_broadcast_prompt),
        'broadcast end community shape': (old_b_end_community, new_b_end_community),
        'broadcast terminal diagnostic probe': (old_diag_probe, new_diag_probe),
        'broadcast closure diagnostic state': (old_diag_warning, new_diag_warning),
        'broadcast closure diagnostic lines': (old_diag_lines, new_diag_lines),
    }
    for label, (old, new) in checks.items():
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'{path.name}: {label} expected exactly once, found {count}')
        text = text.replace(old, new, 1)
    path.write_text(text, encoding='utf-8')

latest = files[0].read_text(encoding='utf-8')
install = files[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('postcondition failed: latest.js and install.js differ')

required = [
    '//@version 0.63.59',
    "const SIMCORE_RUNTIME_VERSION = '0.63.59';",
    '// v0.63.59 Broadcast End Closure Contract:',
    "const isEnd = String(pending?.mode || '') === 'B_END';",
    'const terminal = isEnd ? narrativeTimestampSequence(content) : null;',
    'broadcast_end_closure_contract=1;broadcast_end_always_emit_terminal_canonical_timestamp_line=1',
    'broadcast_terminal_timestamp_means_final_current_broadcast_airtime=1;do_not_leave_broadcast_end_time_only_in_prose=1',
    'b_end_block_shape=2_community_blocks_x_3_platform_sections_each',
    'b_end_one_community_block_with_6_platform_sections_is_invalid=1',
    'Broadcast closure:',
    'Broadcast terminal coverage:',
]
for token in required:
    if token not in latest:
        raise SystemExit(f'missing required token after patch: {token}')

if latest.count('function commitNarrativeTimestamp(') != before[0].count('function commitNarrativeTimestamp('):
    raise SystemExit('commitNarrativeTimestamp function count changed unexpectedly')
if latest.count('function commitBroadcastAirtime(') != before[0].count('function commitBroadcastAirtime('):
    raise SystemExit('commitBroadcastAirtime function count changed unexpectedly')
if latest.count('REPRESENTATION_FAST_RECONCILED') != before[0].count('REPRESENTATION_FAST_RECONCILED'):
    raise SystemExit('representation fast reconcile token count changed unexpectedly')

for path in files:
    subprocess.run(['node', '--check', str(path)], check=True)

print('SimCore v0.63.59 patch validated')
print(f'production bytes: {len(latest.encode("utf-8"))}')
