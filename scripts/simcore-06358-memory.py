from pathlib import Path
import json
import os
import re

version = os.environ['VERSION']
release_name = os.environ['RELEASE_NAME']
release_commit = os.environ['RELEASE_COMMIT']
release_blob = os.environ['RELEASE_BLOB']

if version != '0.63.58':
    raise SystemExit(f'unexpected production version: {version}')

# Manifest
manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest.update({
    'production_version': version,
    'release_name': release_name,
    'release_branch': 'release-simcore',
    'release_commit': release_commit,
    'release_blob': release_blob,
    'current_priority': '06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION',
    'validation_status': 'PENDING_REAL_LONG_CHAT',
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# CURRENT_DEVELOPMENT
p = Path('docs/CURRENT_DEVELOPMENT.md')
dev = p.read_text(encoding='utf-8')
begin = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->'
end = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'
snapshot = f'''{begin}
## Current Production Snapshot

- Product: SimCore
- Version: `{version}`
- Release: `{release_name}`
- Release branch: `release-simcore`
- Release commit: `{release_commit}`
- Release blob: `{release_blob}`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
{end}'''
dev, n = re.subn(re.escape(begin) + r'.*?' + re.escape(end), snapshot, dev, count=1, flags=re.S)
if n != 1:
    raise SystemExit('production snapshot markers missing/ambiguous')

old_verdict = "`v0.63.57` is the current production release. It is a narrow pre-M2-2 chronology guard inserted after direct long-chat evidence showed that persisted 2030 state could remain protected while the visible response silently regressed scene timestamps and character-era state to 2017. M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline."
new_verdict = "`v0.63.58` is the current production release. It is a narrow pre-M2-2 narrative-tail contract inserted after direct long-chat evidence showed that a scene could visibly progress from 01:00 to a 03:00 ending in prose while Time still reported `scenes 0 / FRAME_ONLY` and persisted 01:00. `v0.63.57` Current Timeline Authority remains in force, M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline."
if old_verdict not in dev:
    raise SystemExit('expected v0.63.57 production verdict not found')
dev = dev.replace(old_verdict, new_verdict, 1)

section_marker = '## v0.63.57 — Current Timeline Authority Guard'
new_section = '''## v0.63.58 — Narrative Tail Time Contract

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Direct triggering evidence came from a non-broadcast live-scene turn that began with a canonical `01:00 AM` frame but explicitly reached and ended at `03:00 AM` only in prose. The renderer emitted no later canonical timestamp line, so Time observed:

```text
Narrative clock: SAME
frame: 01:00 AM
committed: 01:00 AM
scenes: 0
tail: FRAME_ONLY
```

The following C turn inherited the stale `01:00 AM`. A later hand-edit changing the visible prior timestamp to `03:00 AM` was correctly classified as a genuine edit (`USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`) and the rebuilt state then used `03:00 AM` as the previous narrative anchor. This proves the missing piece is terminal timestamp observability, not inability of the existing commit path to accept a valid later canonical timestamp.

The v0.63.58 patch is intentionally narrow:

```text
non-broadcast rendering
→ if current scene time advances beyond frame time
→ emit canonical timestamp line at transition or terminal current point
→ if the user states a later current/end time, render it as canonical current timestamp
→ do not leave terminal current-time advancement only in prose

Time commit
→ existing v0.63.28 line-level monotonic sequence unchanged
→ no arbitrary prose-time auto-commit

Diagnostics
→ FRAME_ONLY explicitly reports that no terminal timestamp beyond frame was observable
→ copied RAW prose must be cross-checked for elapsed/current/end-time cues
```

Frozen:

- v0.63.57 current-timeline authority behavior;
- M2-1 Recovery / output-compat / bootstrap-migration ownership;
- Representation Fast Reconcile and genuine-user-edit semantics;
- Deferred Mirror;
- Broadcast and Frame behavior;
- Evidence / Lineage / Handoff / Recurrence;
- Structure / COMMUNITY;
- cache/history, storage/API/network/timer surfaces, persistent schema.

Real long-chat validation target:

1. a natural scene whose current time advances inside one response emits an explicit later canonical timestamp and commits it;
2. the next natural turn inherits that terminal time instead of the opening frame time;
3. ordinary single-time responses may remain `FRAME_ONLY` without being treated as faults, but RAW must be checked when prose contains time advancement;
4. v0.63.57 current-era authority and v0.63.55 representation/edit controls remain unchanged.

The separate COMMUNITY platform-family warning observed during v0.63.57 validation is not repaired in v0.63.58; keep it as an independent recurrence watch.

'''
if section_marker not in dev:
    raise SystemExit('v0.63.57 section marker missing')
if '## v0.63.58 — Narrative Tail Time Contract' not in dev:
    dev = dev.replace(section_marker, new_section + section_marker, 1)

p.write_text(dev, encoding='utf-8')

# Live evidence ledger
p = Path('docs/SIMCORE_M2_LIVE_EVIDENCE.md')
live = p.read_text(encoding='utf-8')
live_marker = '## Pre-M2-2 mini patch — v0.63.57 Current Timeline Authority Guard'
live_section = f'''## Pre-M2-2 mini patch — v0.63.58 Narrative Tail Time Contract

Production baseline:

```text
Version: {version}
Release: {release_name}
Release commit: {release_commit}
Release blob: {release_blob}
```

### Triggering evidence — intra-turn terminal time lost

In runtime `mt2fgh3v-6ti55c`, the source A turn visibly began at `2030-09-01 01:00 AM` and the prose explicitly reached a `03:00 AM` ending, but no second canonical timestamp line was emitted. The following C diagnostic therefore showed the stale inherited clock:

```text
Narrative clock: SAME
previous: 01:00 AM
frame: 01:00 AM
committed: 01:00 AM
scenes: 0
tail: FRAME_ONLY
```

This is a confirmed **intra-turn narrative-time advancement coverage gap**: visible current time advanced, while persisted narrative time did not.

### Positive control — genuine edit rebuild absorbs corrected terminal timestamp

The visible prior assistant timestamp was then hand-edited from `01:00 AM` to `03:00 AM` without changing length. On request `@1934`, SimCore correctly reported:

```text
Prior representation: EXACT
current fingerprint: different from canonical and Fresh
Edit origin: USER_EDIT_CANDIDATE
Edit reconcile: MANUAL_EDIT_REBUILT · 6.213 s
snapshot UPDATED
```

After rebuild:

```text
Narrative clock: ADVANCED
previous: 03:00 AM
frame: 03:30 AM
committed: 03:30 AM
```

Interpretation: genuine-user-edit semantics remain intact under v0.63.57, and the existing narrative-clock path can consume a valid explicit terminal timestamp. The defect is specifically that terminal current time can be left only in prose and therefore remain invisible to the line-level commit path.

### v0.63.58 behavior

The patch adds a renderer contract requiring a canonical timestamp line when current scene time advances beyond the frame, including user-stated later current/end times. It deliberately does **not** infer arbitrary prose times or alter `commitNarrativeTimestamp()` semantics. A new `Narrative tail coverage` diagnostic makes `FRAME_ONLY` explicitly require RAW prose cross-check for elapsed/current/end-time cues.

Validation remains `PENDING_REAL_LONG_CHAT` until a natural advancing scene proves the later canonical timestamp is emitted and inherited by the next turn.

### Separate observation — COMMUNITY family diversity

The same later v0.63.57 C sample produced a true-positive Structure warning: three named sites mapped to only two distinct platform families. This remains independent from v0.63.58 and should be promoted only if it recurs naturally.

'''
if live_marker not in live:
    raise SystemExit('v0.63.57 live evidence marker missing')
if '## Pre-M2-2 mini patch — v0.63.58 Narrative Tail Time Contract' not in live:
    live = live.replace(live_marker, live_section + live_marker, 1)
p.write_text(live, encoding='utf-8')

# Anomaly watch
p = Path('docs/SIMCORE_ANOMALY_WATCH.md')
watch = p.read_text(encoding='utf-8')
watch_section = '''\n---\n\n## INTRA_TURN_NARRATIVE_TIME_ADVANCEMENT_GAP — DIRECT EVIDENCE / MITIGATED\n\nFirst confirmed: 2026-08-21\nProduction at discovery: `v0.63.57 — Current Timeline Authority Guard`\nRuntime: `mt2fgh3v-6ti55c`\n\nA non-broadcast response began at a canonical `01:00 AM` frame and explicitly reached a `03:00 AM` ending in prose, but emitted no later canonical timestamp line. Time therefore reported `scenes 0 / FRAME_ONLY` and persisted the opening time. The next C turn inherited the stale `01:00 AM`.\n\nA hand edit that changed the prior visible canonical timestamp to `03:00 AM` was correctly detected as `USER_EDIT_CANDIDATE`, rebuilt, and became the next narrative anchor. This isolates the gap to **terminal time observability** rather than the commit mechanism itself.\n\n`v0.63.58 — Narrative Tail Time Contract` mitigates this by requiring the renderer to emit a canonical timestamp line whenever current scene time advances beyond the frame, especially when the user explicitly states a later current/end time. Arbitrary prose-time auto-commit remains forbidden.\n\nPromotion / recurrence check:\n\n- if RAW prose clearly advances current time but `Narrative tail coverage` remains `FRAME_ONLY`, treat it as recurrence;\n- if a later canonical timestamp is emitted and `Narrative clock` commits it, record a positive live validation;\n- always verify the next turn inherits the terminal time.\n'''
if '## INTRA_TURN_NARRATIVE_TIME_ADVANCEMENT_GAP' not in watch:
    watch = watch.rstrip() + watch_section.rstrip() + '\n'
p.write_text(watch, encoding='utf-8')

# Guideline current production baseline only; durable forensic rules already exist.
p = Path('docs/SIMCORE_GUIDELINES.md')
guide = p.read_text(encoding='utf-8')
guide, n = re.subn(r'SimCore v0\.63\.57 — Current Timeline Authority Guard', 'SimCore v0.63.58 — Narrative Tail Time Contract', guide, count=1)
if n != 1:
    raise SystemExit('guideline production baseline v0.63.57 not found exactly once')
p.write_text(guide, encoding='utf-8')

# Teach generic state sync current priorities for both recent mini patches.
p = Path('scripts/simcore-sync-memory.py')
sync = p.read_text(encoding='utf-8')
old = "    '0.63.56': '2M_MAJOR_M2_1_LIVE_VALIDATION',\n}"
new = "    '0.63.56': '2M_MAJOR_M2_1_LIVE_VALIDATION',\n    '0.63.57': '06357_CURRENT_TIMELINE_AUTHORITY_LIVE_VALIDATION',\n    '0.63.58': '06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION',\n}"
if old in sync:
    sync = sync.replace(old, new, 1)
elif "'0.63.58': '06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION'" not in sync:
    raise SystemExit('generic sync priority anchor missing')
p.write_text(sync, encoding='utf-8')

print('SimCore v0.63.58 durable memory prepared')

# One-shot trigger marker; removed with the command file after successful sync.
