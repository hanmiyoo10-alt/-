# SimCore v0.70.0 live evidence — stale diagnostic probe fail-closed bonus

Date: 2026-08-30 KST

Status: **STALE PROBE DIRECTLY OBSERVED · CURRENT-TURN AUTHORITY WITHHELD · STAGE C NOT CLOSED · NO RUNTIME CHANGE**

Classification: **WATCH · OBSERVABILITY BONUS · DIAGNOSTIC FRESHNESS · PRODUCT GATE NEUTRAL**

Release:

```text
Version: 0.70.0
Name: Current Task Primacy Guard
Runtime generation: mtfc7tze-9mosvb
```

Related live evidence:

- `docs/SIMCORE_LIVE_07000_CURRENT_TASK_PRIMACY_GUARD_PARTIAL_PASS_2026-08-30.md`
- `docs/SIMCORE_LIVE_06500_REROLL_STALE_PROBE_FAIL_CLOSED_BONUS_2026-08-28.md`

## 1. Direct freshness result

The supplied diagnostic reports:

```text
Probe context: STALE · probe user @2586 · current user @2584
Request hook: n/a
Core handshake: n/a
Runtime status: n/a · output n/a
Mode: n/a
Turn binding: request user @n/a · output assistant @n/a
Stability: NOT_EXERCISED
Edit reconcile: n/a
Output provenance: n/a
Frame sequence: n/a
Frame guard: n/a
```

This is the expected fail-closed shape for a stale diagnostic probe. The report does not project the probe identity onto the current visible turn and does not fabricate a coherent request/output lifecycle.

Disposition:

```text
V07000_STALE_PROBE_FAIL_CLOSED = PASS AS OBSERVABILITY SAFETY
FALSE_CURRENT_TURN_BINDING = PREVENTED
CURRENT_TURN_RUNTIME_AUTHORITY = WITHHELD
```

## 2. Trigger boundary

The operator supplied the report but did not state the exact UI action that created the probe/current mismatch.

Therefore the trigger must remain:

```text
TRIGGER = UNKNOWN / NOT ATTRIBUTED
```

Do not infer input reroll, output reroll, edit, panel timing, or host mutation solely from:

```text
probe user @2586
current user @2584
```

The older v0.65 specimen proves that input-only reroll can produce this stale-fail-closed class, but that prior trigger does not authorize assigning the same trigger to this v0.70 packet without operator evidence.

## 3. What remains observable

The stale report still exposes bounded retained/non-current facts:

```text
Representation ledger 5
Telemetry continuity ADOPTED via host-local
Telemetry capsule COMPACT_V2 4753/16384 OK
Host-local transport API PRESENT / store USABLE / boot CONSUMED
Telemetry checkpoint HOST_LOCAL WRITTEN
RAW frame continuity 87/6/1262 -> 87/7/1263
RAW frame regression NONE
Stored broadcast UNLOCKED
```

These do not establish a fresh @2586 request/output lifecycle.

## 4. Embedded RAW pair @2584 -> @2585

The report includes the visible recent pair:

```text
user @2584:
[커뮤니티] 사람들이 데뷔초부터 한결같이 시우는 종종 일침이나 소신을 얘기하는데 ...

assistant @2585:
Community response about why the character's direct/conviction-based speech is accepted:
- boundary discipline
- soft delivery
- cushion language
- long-term consistency between words and actions
```

Semantic review shows:

```text
current requested topic = speech / conviction / communication style
previous @2582 topic = physique / dense muscle analysis
@2585 remains on the new speech-style task
previous physique categories are not replayed as the current semantic job
```

This is useful qualitative evidence for Current Task Primacy.

However the diagnostic is explicitly stale, so the packet lacks authoritative current-turn fields for @2584/@2585 such as:

```text
Request hook
Runtime status
Mode
Turn binding
Stability
Warnings
Frame sequence
Frame guard
```

Therefore:

```text
STAGE_C_SEMANTIC_CANDIDATE = POSITIVE
STAGE_C_FORMAL_PASS = NOT AUTHORIZED FROM THIS STALE PACKET
```

Do not close the v0.70 product live gate from this packet alone.

## 5. Relationship to the previous OUTPUT_MISMATCH

The preceding accepted packet recorded a natural @2581 `CANONICAL != FRESH_CHAT` mismatch and requested that an optional follow-up preserve the state if Representation fast-reconcile evidence was desired.

This stale report cannot classify that follow-up path because:

```text
Edit reconcile = n/a
Prior representation = n/a
Edit origin = n/a
Output provenance = n/a
```

Therefore it neither proves nor disproves:

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
manual-edit rebuild
mismatch persistence
```

The prior `WATCH · NATURAL_OUTPUT_REPRESENTATION_MISMATCH` remains unchanged.

## 6. Gate disposition

```text
Stage A ordinary continuity       PASS previously
Stage B first task shift          PASS previously
Stage C second independent shift  STILL REQUIRES FRESH CURRENT-TURN DIAGNOSTIC
Stage D explicit reuse            PASS previously
stale diagnostic safety           PASS / BONUS OBSERVABILITY
HUMAN_EVIDENCE LIVE_PASS          NOT YET AUTHORIZED
```

No runtime, release-simcore, architecture, or release-system mutation is authorized from this stale specimen.

## 7. Final classification

```text
WATCH · V07000_STALE_DIAGNOSTIC_PROBE
FAIL_CLOSED = CORRECT
STATE CORRUPTION = NOT OBSERVED
CURRENT-TASK REGRESSION = NOT ESTABLISHED
STAGE_C CONTENT = POSITIVE CANDIDATE ONLY
STAGE_C GATE = NOT CLOSED
RUNTIME PATCH = NONE
```
