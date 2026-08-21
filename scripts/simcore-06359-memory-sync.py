from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
current = root / 'docs/CURRENT_DEVELOPMENT.md'
evidence = root / 'docs/SIMCORE_M2_LIVE_EVIDENCE.md'
anomaly = root / 'docs/SIMCORE_ANOMALY_WATCH.md'

for path in (current, evidence, anomaly):
    if not path.exists():
        raise SystemExit(f'missing memory file: {path}')

# CURRENT_DEVELOPMENT.md
text = current.read_text(encoding='utf-8')
snapshot = '''<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: SimCore
- Version: `0.63.59`
- Release: `Broadcast End Closure Contract`
- Release branch: `release-simcore`
- Release commit: `7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d`
- Release blob: `da47e5d8123c0abfe9902f016c84ac758f766032`
- Validation status: `PENDING_REAL_LONG_CHAT`
- Primary optimization target: `06359_BROADCAST_END_CLOSURE_LIVE_VALIDATION`
- Provider cache: `UNVERIFIED`

This block is machine-managed after each production release update.
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'''
text, count = re.subn(
    r'<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->.*?<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->',
    snapshot,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('CURRENT_DEVELOPMENT production snapshot not found')

verdict = '`v0.63.59` is the current production release. It is the final intended pre-M2 correctness mini-patch, focused only on B_END closure after a natural 24-hour broadcast proved that end authority/unlock could succeed while terminal airtime stayed at the opening 08:30 frame and the required two COMMUNITY blocks collapsed into one six-section block. `v0.63.58` Narrative Tail Time Contract and `v0.63.57` Current Timeline Authority remain in force, M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline.'
text, count = re.subn(
    r'^`v0\.63\.58` is the current production release\..*$',
    verdict,
    text,
    count=1,
    flags=re.M,
)
if count == 0 and verdict not in text:
    raise SystemExit('CURRENT_DEVELOPMENT production verdict anchor not found')

section = '''## v0.63.59 — Broadcast End Closure Contract

Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**

Triggering evidence came from a natural 24-hour broadcast that exercised the complete lifecycle:

```text
B_START 09/08 09:00
→ multiple B_CONTINUE turns
→ same-turn reroll
→ runtime cold init / location reuse
→ date rollover to 09/09
→ B_END
```

Broadcast lifecycle itself remained strong: B_CONTINUE repeatedly denied premature end authority, explicit B_END alone was allowed, and the stored broadcast unlocked. However the final B_END response exposed two independent closure gaps:

```text
frame airtime: 08:30 AM
visible prose: "30 minutes remaining" → "5 minutes remaining" → broadcast ends after a 24h run
expected terminal airtime: 09:00 AM
stored broadcast airtime: 08:30 AM

required COMMUNITY shape: 2 blocks × 3 platform sections
visible output: 1 block × 6 platform sections
Structure: warnings + state quarantine
```

The airtime defect was structural, not merely prompt wording: v0.63.58's narrative-tail contract excluded Mode B, and `commitBroadcastAirtime()` consumed only the first canonical timestamp. Therefore simply emitting a later B_END timestamp would still have persisted the frame time.

v0.63.59 closes that exact boundary:

```text
B_END renderer
→ always emit an explicit terminal canonical broadcast timestamp line
→ terminal timestamp means final current broadcast airtime
→ never leave B_END current/end-time progression only in prose

B_END Time commit
→ parse complete line-level canonical timestamp sequence
→ only if monotonic + explicit terminal line exists, commit the final timestamp
→ malformed/non-monotonic/missing terminal sequence fails closed to existing frame airtime
→ no arbitrary prose-time inference

B_END COMMUNITY
→ existing two-block/six-family contract preserved
→ explicitly state 2 × 3 block shape
→ explicitly reject 1 × 6 as equivalent
→ Structure remains judge/quarantine-only; no generated-body repair

Diagnostics
→ Broadcast closure: COMPLETE / PARTIAL
→ terminal coverage shown separately from COMMUNITY structural closure
→ successful unlock alone is not treated as complete closure
```

Frozen in v0.63.59:

- B_START / B_CONTINUE airtime semantics;
- v0.63.58 non-broadcast narrative-tail behavior;
- v0.63.57 current-timeline authority;
- M2-1 Recovery boundaries;
- Representation/Edit Reconcile and genuine-user-edit semantics;
- Deferred Mirror;
- Frame, Evidence, Lineage, Handoff, Recurrence;
- cache/history, storage/API/network/timer behavior and persistent schema.

Required final pre-M2 live gate:

1. natural B_END emits an explicit terminal canonical timestamp;
2. `Stored broadcast airtime` equals that terminal timestamp rather than the opening frame;
3. B_END produces two COMMUNITY blocks with three valid platform sections each;
4. `Broadcast closure: COMPLETE` is observed;
5. ordinary representation/edit/reroll behavior shows no regression.

After this gate, do not continue open-ended mini-patch discovery. Only a newly confirmed hard state-corruption/lifecycle regression should block M2-2; lower-priority anomalies remain WATCH items.

'''
anchor = '## v0.63.58 — Narrative Tail Time Contract\n'
if '## v0.63.59 — Broadcast End Closure Contract' not in text:
    if anchor not in text:
        raise SystemExit('CURRENT_DEVELOPMENT v0.63.58 anchor missing')
    text = text.replace(anchor, section + anchor, 1)
current.write_text(text, encoding='utf-8')

# SIMCORE_M2_LIVE_EVIDENCE.md
text = evidence.read_text(encoding='utf-8')
section = '''## Pre-M2-2 mini patch — v0.63.59 Broadcast End Closure Contract

Production baseline:

```text
Version: 0.63.59
Release: Broadcast End Closure Contract
Release commit: 7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d
Release blob: da47e5d8123c0abfe9902f016c84ac758f766032
```

### Triggering natural-B evidence

A real 24-hour broadcast supplied the strongest pre-M2 B-mode baseline so far:

```text
B_START                    PASS
multiple B_CONTINUE        PASS
broadcast remains OPEN     PASS
premature end denied       PASS
runtime cold init          PASS
same-turn reroll           PASS
date rollover              PASS
explicit B_END authority   PASS
broadcast unlock           PASS
```

The same run also exercised representation behavior:

```text
normal EXACT representations                 PASS
small CANONICAL/FRESH mismatch               OBSERVED
next request REPRESENTATION_FAST_RECONCILED  PASS
same-turn reroll replacement                  PASS
```

A separate same-version genuine hand-edit positive control had already shown `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`, with the corrected timestamp absorbed into state. Historical response-variant restore was also naturally exercised: an older answer could become the current visible/canonical answer, and reroll returned authority to the newly generated output without stale historical persistence.

### B_END closure defect found by RAW cross-check

Lifecycle telemetry correctly showed `ENDING`, explicit end authority and `UNLOCKED`, but RAW proved closure was partial. The response opened at `08:30 AM`, then described `30 minutes remaining`, later `5 minutes remaining`, and ended a broadcast that began at `09:00 AM` the previous day. Correct terminal airtime was `09:00 AM`; persisted airtime stayed `08:30 AM`.

The same output produced a true-positive structural failure:

```text
required: 2 COMMUNITY blocks × 3 platform sections
observed: 1 COMMUNITY block × 6 platform sections
warnings: 8
state quarantine: response=1, COMMUNITY=1/2
```

### v0.63.59 implementation boundary

- B_END always requests an explicit terminal canonical broadcast timestamp.
- `commitBroadcastAirtime()` selects the final timestamp only when the line-level sequence is monotonic and has an explicit terminal line.
- No prose-time parser or semantic time inference was added.
- Existing B_END COMMUNITY expectations are clarified as exactly `2 × 3`; Structure remains non-repairing.
- New `Broadcast closure` and `Broadcast terminal coverage` diagnostics make partial closure visible.

Validation status: **PENDING_REAL_LONG_CHAT**. One clean natural B_END closure is the intended final pre-M2 correctness gate.

'''
anchor = '## Pre-M2-2 mini patch — v0.63.58 Narrative Tail Time Contract\n'
if '## Pre-M2-2 mini patch — v0.63.59 Broadcast End Closure Contract' not in text:
    if anchor not in text:
        raise SystemExit('SIMCORE_M2_LIVE_EVIDENCE v0.63.58 anchor missing')
    text = text.replace(anchor, section + anchor, 1)

replacement = '''Additional pre-M2 evidence obtained after these initial samples:

```text
natural B_START / B_CONTINUE / B_END lifecycle       PASS
genuine user-edit positive control                   PASS
same-turn reroll / replacement                       PASS
historical response-variant restore + reroll         PASS
small representation mismatch -> fast reconcile      PASS
runtime COLD_INIT during active broadcast             PASS
```

Still not meaningfully exercised:

```text
bootstrap-migration legacy/history-bootstrap migration path
```

This remaining migration-specific path is not a blocker for M2-2 unless the next ownership move changes that migration boundary. The immediate blocker is now only the v0.63.59 B_END closure regression gate described above.
'''
pattern = re.compile(
    r'Still not exercised by these samples:\n\n```text\nbootstrap-migration history-bootstrap cold path\nnatural B-mode cross-check after M2-1\ngenuine user-edit positive control\n```\n\nThe genuine-user-edit control becomes mandatory again before/when M2 moves the Edit Reconcile implementation itself; it is not inferred from the representation-fast pass\.\n\n### Immediate next validation gate\n\nContinue with a new natural turn rather than regenerating or intentionally editing the previous output\. Prefer a natural B-mode path when available\. Confirm that Broadcast lifecycle, output compatibility, continuity, and frame guards remain stable under the split\.\n\nIf a later cold/reload path naturally invokes history bootstrap, capture it separately; do not force state mutation solely to exercise it\.\n',
    re.S,
)
text, _ = pattern.subn(replacement, text, count=1)
evidence.write_text(text, encoding='utf-8')

# SIMCORE_ANOMALY_WATCH.md
text = anomaly.read_text(encoding='utf-8')
addition = '''

## B_END terminal airtime stale after visible end-time progression

Status: `PATCHED_IN_0.63.59_PENDING_LIVE_VALIDATION`

Direct natural 24-hour broadcast evidence showed `08:30 AM` frame airtime, visible progression through 30 minutes remaining and 5 minutes remaining, then broadcast end; with a prior-day `09:00 AM` start, expected terminal airtime was `09:00 AM` while stored airtime stayed `08:30 AM`.

Root boundary: Mode B was excluded from v0.63.58 narrative-tail handling and `commitBroadcastAirtime()` selected only the first timestamp. v0.63.59 adds a B_END-only explicit terminal timestamp contract and monotonic final-timestamp commit. Do not add arbitrary prose-time inference.

## B_END unresolved Thoughts + malformed COMMUNITY correlation

Status: `WATCH_ONLY`

One B_END sample combined a roughly 4200-character unresolved THOUGHTS_COMPAT preamble, roughly -4189 CANONICAL/FRESH delta, a malformed `1 × 6` COMMUNITY shape instead of `2 × 3`, and Structure quarantine. Preserve the correlation, but causality is not proven; do not broaden Representation/Recovery from this sample alone.

## Partial previous-turn replay inside new B_CONTINUE output

Status: `WATCH_ONLY`

One first-generation B_CONTINUE response replayed a large semantic prefix from the preceding turn before continuing with the new requested material. Recurrence telemetry reported `FIRST / NO MATCH`; reroll removed the replay and proceeded directly with the new content. Preserve as `PARTIAL_PREVIOUS_TURN_REPLAY`; escalate only on natural recurrence.
'''
if '## B_END terminal airtime stale after visible end-time progression' not in text:
    text = text.rstrip() + addition + '\n'
anomaly.write_text(text, encoding='utf-8')

print('SimCore v0.63.59 development memory patched')
