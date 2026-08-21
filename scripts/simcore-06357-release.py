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

release_block = """// v0.63.57 Current Timeline Authority Guard:
// - Follows direct long-chat evidence where the persisted/current frame remained in 2030 while a non-broadcast response silently reverted visible scene timestamps and character-era state to 2017; existing Continuity correctly protected the persisted narrative clock but left the visible body unchanged
// - Adds a current-timeline authority anchor on every non-broadcast request with a known persisted narrative timestamp, not only turns that contain an explicit forward calendar transition
// - Historical context remains usable as reference, and explicitly user-requested past scenes/flashbacks remain allowed; absent such a request, historical context must not silently replace the current scene timeline or current character age/status
// - Adds explicit visible-chronology diagnostics for non-monotonic scene timestamp sequences while preserving the existing fail-closed state floor and leaving generated body text untouched rather than performing unsafe semantic/date rewrites
// - Scope is chronology authority + diagnostics only: M2-1 Recovery boundaries, Representation/Edit Reconcile, Deferred Mirror, Broadcast, Frame sequencing, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history, storage/API/network/timer behavior and persistent schema remain frozen
//
"""

old_prompt_anchor = """  if (p.mode === 'C') lines.push('mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1');
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
"""
new_prompt_anchor = """  if (p.mode === 'C') lines.push('mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1');
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeTimestampPrevious) {
    lines.push(`current_timeline_anchor=${p.narrativeTimestampPrevious}`);
    lines.push('current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1');
    lines.push('current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1');
  }
  if (!/^B_/.test(String(p.mode || '')) && p.narrativeProgressionActive) {
"""

old_diag = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Stored broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,
"""
new_diag = """      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
      `Visible chronology: ${probeFresh && narrative ? (narrative.tailStatus === 'SKIPPED_NON_MONOTONIC' ? 'NON_MONOTONIC_VISIBLE_SEQUENCE · state floor protected · body unchanged' : (narrative.tailStatus === 'SKIPPED_MALFORMED' ? 'MALFORMED_VISIBLE_SEQUENCE · state floor protected · body unchanged' : 'PASS_OR_NOT_APPLICABLE')) : 'n/a'}`,
      `Stored broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,
"""

for path, text in zip(files, before):
    checks = {
        'metadata version': ('//@version 0.63.56', '//@version 0.63.57'),
        'runtime version': ("const SIMCORE_RUNTIME_VERSION = '0.63.56';", "const SIMCORE_RUNTIME_VERSION = '0.63.57';"),
        'release header anchor': ('// v0.63.56 M2-1 Recovery Boundary Split:\n', release_block + '// v0.63.56 M2-1 Recovery Boundary Split:\n'),
        'timeline prompt anchor': (old_prompt_anchor, new_prompt_anchor),
        'visible chronology diagnostic': (old_diag, new_diag),
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
    '//@version 0.63.57',
    "const SIMCORE_RUNTIME_VERSION = '0.63.57';",
    '// v0.63.57 Current Timeline Authority Guard:',
    'current_timeline_authority=1;historical_context_reference_only=1;explicit_user_requested_past_scene_or_flashback_may_depart=1',
    'current_character_age_and_status_follow_current_timeline=1;past_event_age_or_status_not_current=1',
    'Visible chronology:',
    'NON_MONOTONIC_VISIBLE_SEQUENCE · state floor protected · body unchanged',
]
for token in required:
    if token not in latest:
        raise SystemExit(f'missing required token after patch: {token}')

for path in files:
    subprocess.run(['node', '--check', str(path)], check=True)

print('SimCore v0.63.57 patch validated')
print(f'production bytes: {len(latest.encode("utf-8"))}')
