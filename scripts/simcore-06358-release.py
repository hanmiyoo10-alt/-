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

release_block = """// v0.63.58 Narrative Tail Time Contract:
// - Follows direct long-chat evidence where a visible non-broadcast scene began at 01:00, explicitly progressed in prose to a 03:00 ending, but emitted no later canonical timestamp line; Time therefore reported scenes 0 / FRAME_ONLY and persisted 01:00 into the next turn
// - Requires non-broadcast rendering to emit a canonical timestamp line whenever the current scene advances beyond the frame time, including a user-stated later current/end time; elapsed current time must not exist only as prose when it changes the terminal narrative time
// - Reuses the existing v0.63.28 line-level monotonic timestamp sequence and commit logic unchanged: SimCore does not infer or auto-commit arbitrary prose clock mentions, avoiding confusion with historical/event/reference times
// - Adds Narrative tail coverage diagnostics so FRAME_ONLY explicitly means no terminal timestamp beyond the frame was observable and copied RAW prose must be cross-checked for elapsed/current/end-time cues
// - Scope is renderer time-tail contract + diagnostics only: v0.63.57 current-timeline authority, M2-1 Recovery boundaries, Representation/Edit Reconcile, Deferred Mirror, Broadcast, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
"""

old_timeline_block = """  if (!/^B_/.test(String(p.mode || '')) && p.narrativeTimestampPrevious) {
    lines.push(`current_timeline_anchor=${p.narrativeTimestampPrevious}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
"""

new_timeline_block = """  if (!/^B_/.test(String(p.mode || '')) && p.narrativeTimestampPrevious) {
    lines.push(`current_timeline_anchor=${p.narrativeTimestampPrevious}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
  if (!/^B_/.test(String(p.mode || ''))) {
    lines.push('narrative_tail_time_contract=1;current_scene_time_advancement_requires_canonical_timestamp_line=1');
    lines.push('terminal_current_time_must_be_explicit_when_changed_from_frame=1;do_not_leave_current_time_advancement_only_in_prose=1');
    lines.push('user_stated_later_current_or_end_time_must_be_rendered_as_current_canonical_timestamp=1');
  }
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
"""

old_diag = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Visible chronology: ${probeFresh && narrative ? (narrative.tailStatus === 'SKIPPED_NON_MONOTONIC' ? 'NON_MONOTONIC_VISIBLE_SEQUENCE · state floor protected · body unchanged' : (narrative.tailStatus === 'SKIPPED_MALFORMED' ? 'MALFORMED_VISIBLE_SEQUENCE · state floor protected · body unchanged' : 'PASS_OR_NOT_APPLICABLE')) : 'n/a'}`,
"""

new_diag = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Narrative tail coverage: ${probeFresh && narrative ? (/^FRAME_ONLY/.test(String(narrative.tailStatus || '')) ? 'FRAME_ONLY · no explicit terminal timestamp beyond frame · RAW prose cross-check required for elapsed/current/end-time cues' : (narrative.tailPromoted ? 'EXPLICIT_TAIL · terminal timestamp observed and committed' : `NO_TAIL_PROMOTION · ${narrative.tailStatus || 'n/a'}`)) : 'n/a'}`,
      `Visible chronology: ${probeFresh && narrative ? (narrative.tailStatus === 'SKIPPED_NON_MONOTONIC' ? 'NON_MONOTONIC_VISIBLE_SEQUENCE · state floor protected · body unchanged' : (narrative.tailStatus === 'SKIPPED_MALFORMED' ? 'MALFORMED_VISIBLE_SEQUENCE · state floor protected · body unchanged' : 'PASS_OR_NOT_APPLICABLE')) : 'n/a'}`,
"""

for path, text in zip(files, before):
    checks = {
        'metadata version': ('//@version 0.63.57', '//@version 0.63.58'),
        'runtime version': ("const SIMCORE_RUNTIME_VERSION = '0.63.57';", "const SIMCORE_RUNTIME_VERSION = '0.63.58';"),
        'release header anchor': ('// v0.63.57 Current Timeline Authority Guard:\n', release_block + '// v0.63.57 Current Timeline Authority Guard:\n'),
        'timeline contract anchor': (old_timeline_block, new_timeline_block),
        'narrative tail diagnostic': (old_diag, new_diag),
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
    '//@version 0.63.58',
    "const SIMCORE_RUNTIME_VERSION = '0.63.58';",
    '// v0.63.58 Narrative Tail Time Contract:',
    'narrative_tail_time_contract=1;current_scene_time_advancement_requires_canonical_timestamp_line=1',
    'terminal_current_time_must_be_explicit_when_changed_from_frame=1;do_not_leave_current_time_advancement_only_in_prose=1',
    'user_stated_later_current_or_end_time_must_be_rendered_as_current_canonical_timestamp=1',
    'Narrative tail coverage:',
    'FRAME_ONLY · no explicit terminal timestamp beyond frame · RAW prose cross-check required for elapsed/current/end-time cues',
]
for token in required:
    if token not in latest:
        raise SystemExit(f'missing required token after patch: {token}')

if latest.count('function commitNarrativeTimestamp(') != before[0].count('function commitNarrativeTimestamp('):
    raise SystemExit('commitNarrativeTimestamp function count changed unexpectedly')

for path in files:
    subprocess.run(['node', '--check', str(path)], check=True)

print('SimCore v0.63.58 patch validated')
print(f'production bytes: {len(latest.encode("utf-8"))}')
