from pathlib import Path
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
replacements = {
    '- Version: `0.63.58`': '- Version: `0.63.59`',
    '- Release: `Narrative Tail Time Contract`': '- Release: `Broadcast End Closure Contract`',
    '- Release commit: `4dc71f01cc5dade0ae69005ee0f771961f638be0`': '- Release commit: `7c0f6f4a8e0b7e42a5996dc7bacd149f27e3751d`',
    '- Release blob: `eb976adc97fd5b8ac1cec2ad10672638ae83c7e2`': '- Release blob: `da47e5d8123c0abfe9902f016c84ac758f766032`',
    '- Primary optimization target: `06358_NARRATIVE_TAIL_TIME_LIVE_VALIDATION`': '- Primary optimization target: `06359_BROADCAST_END_CLOSURE_LIVE_VALIDATION`',
    '`v0.63.58` is the current production release. It is a narrow pre-M2-2 narrative-tail contract inserted after direct long-chat evidence showed that a scene could visibly progress from 01:00 to a 03:00 ending in prose while Time still reported `scenes 0 / FRAME_ONLY` and persisted 01:00. `v0.63.57` Current Timeline Authority remains in force, M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline.': '`v0.63.59` is the current production release. It is the final intended pre-M2 correctness mini-patch, focused only on B_END closure after a natural 24-hour broadcast proved that end authority/unlock could succeed while terminal airtime stayed at the opening 08:30 frame and the required two COMMUNITY blocks collapsed into one six-section block. `v0.63.58` Narrative Tail Time Contract and `v0.63.57` Current Timeline Authority remain in force, M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline.',
}
for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'CURRENT_DEVELOPMENT replacement expected once: {old!r}, found {count}')
    text = text.replace(old, new, 1)

anchor = '## v0.63.58 — Narrative Tail Time Contract\n'
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
if text.count(anchor) != 1:
    raise SystemExit(f'CURRENT_DEVELOPMENT v0.63.58 anchor expected once, found {text.count(anchor)}')
text = text.replace(anchor, section + anchor, 1)
current.write_text(text, encoding='utf-8')

# SIMCORE_M2_LIVE_EVIDENCE.md
text = evidence.read_text(encoding='utf-8')
anchor = '## Pre-M2-2 mini patch — v0.63.58 Narrative Tail Time Contract\n'
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

A separate same-version genuine hand-edit positive control had already shown:

```text
Prior representation EXACT
current matches neither canonical nor Fresh
Edit origin USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
corrected timestamp absorbed into state
```

Historical response-variant restore was also naturally exercised: an older answer for the same input could become the current visible/canonical answer, and reroll returned authority to the newly generated output without stale historical persistence.

### B_END closure defect found by RAW cross-check

The final B_END diagnostic looked healthy at the lifecycle level:

```text
Broadcast lifecycle: ENDING
Broadcast end authority: ALLOWED · explicit-b-end
Stored broadcast: UNLOCKED
```

RAW showed that this was only a partial success. The response opened at `08:30 AM`, then explicitly described `30 minutes remaining`, later `5 minutes remaining`, and finally ended a broadcast that began at `09:00 AM` the previous day. The correct terminal airtime was therefore `09:00 AM`, while persisted airtime stayed `08:30 AM`.

The same output also produced a true-positive B_END structure failure:

```text
required: 2 COMMUNITY blocks × 3 platform sections
observed: 1 COMMUNITY block × 6 platform sections
warnings: 8
state quarantine: response=1, COMMUNITY=1/2
```

This validates the diagnostic-forensics rule: `End Authority ALLOWED` / `UNLOCKED` did not imply complete B_END closure.

### v0.63.59 implementation boundary

- B_END always requests an explicit terminal canonical broadcast timestamp.
- `commitBroadcastAirtime()` may select the final timestamp only when a line-level sequence is monotonic and contains an explicit terminal line.
- No prose-time parser or semantic time inference was added.
- Existing B_END COMMUNITY expectations are clarified as exactly `2 × 3`; Structure remains non-repairing.
- New `Broadcast closure` and `Broadcast terminal coverage` diagnostics make partial closure visible.

Validation status: **PENDING_REAL_LONG_CHAT**. One clean natural B_END closure is the intended final pre-M2 correctness gate.

'''
if text.count(anchor) != 1:
    raise SystemExit(f'SIMCORE_M2_LIVE_EVIDENCE v0.63.58 anchor expected once, found {text.count(anchor)}')
text = text.replace(anchor, section + anchor, 1)

old_remaining = '''Still not exercised by these samples:

```text
bootstrap-migration history-bootstrap cold path
natural B-mode cross-check after M2-1
genuine user-edit positive control
```

The genuine-user-edit control becomes mandatory again before/when M2 moves the Edit Reconcile implementation itself; it is not inferred from the representation-fast pass.

### Immediate next validation gate

Continue with a new natural turn rather than regenerating or intentionally editing the previous output. Prefer a natural B-mode path when available. Confirm that Broadcast lifecycle, output compatibility, continuity, and frame guards remain stable under the split.

If a later cold/reload path naturally invokes history bootstrap, capture it separately; do not force state mutation solely to exercise it.
'''
new_remaining = '''Additional pre-M2 evidence obtained after these initial samples:

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
if text.count(old_remaining) != 1:
    raise SystemExit(f'SIMCORE_M2_LIVE_EVIDENCE remaining-gate block expected once, found {text.count(old_remaining)}')
text = text.replace(old_remaining, new_remaining, 1)
evidence.write_text(text, encoding='utf-8')

# SIMCORE_ANOMALY_WATCH.md
text = anomaly.read_text(encoding='utf-8')
addition = '''

## B_END terminal airtime stale after visible end-time progression

Status: `PATCHED_IN_0.63.59_PENDING_LIVE_VALIDATION`

Direct natural 24-hour broadcast evidence showed:

```text
B_END frame: 2030-09-09 08:30 AM
visible progression: 30 minutes remaining -> 5 minutes remaining -> broadcast end
broadcast start: 2030-09-08 09:00 AM
expected terminal airtime: 2030-09-09 09:00 AM
stored broadcast airtime: 2030-09-09 08:30 AM
```

Root boundary: Mode B was excluded from v0.63.58 narrative-tail handling and `commitBroadcastAirtime()` selected only the first timestamp. v0.63.59 adds a B_END-only explicit terminal timestamp contract and monotonic final-timestamp commit. Do not add arbitrary prose-time inference.

## B_END unresolved Thoughts + malformed COMMUNITY correlation

Status: `WATCH_ONLY`

One B_END sample simultaneously showed:

```text
THOUGHTS_COMPAT action: UNRESOLVED
preamble chars: ~4200
CANONICAL/FRESH delta: ~-4189
COMMUNITY shape: 1 block x 6 sections instead of 2 x 3
Structure quarantine: active
```

The numerical proximity is worth preserving as evidence, but causality is not proven. The visible COMMUNITY structure was independently malformed, so do not fold this into Representation Ownership or broaden envelope recovery without recurrence/correlation.

## Partial previous-turn replay inside new B_CONTINUE output

Status: `WATCH_ONLY`

One first-generation B_CONTINUE response replayed a large semantic prefix from the preceding turn before continuing with the new requested material. Existing recurrence telemetry reported `FIRST / NO MATCH`; a reroll of the same user input removed the replay and proceeded directly with the new content.

Preserve as `PARTIAL_PREVIOUS_TURN_REPLAY`. Do not patch Recurrence from one sample. Escalate only if the same partial carryover shape recurs naturally.
'''
if '## B_END terminal airtime stale after visible end-time progression' not in text:
    text = text.rstrip() + addition + '\n'
anomaly.write_text(text, encoding='utf-8')

print('SimCore v0.63.59 development memory patched')
