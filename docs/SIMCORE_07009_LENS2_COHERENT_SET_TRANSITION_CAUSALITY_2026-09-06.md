# SimCore v0.70.9 Lens 2 Coherent-Set Transition / Causality Audit

Date: 2026-09-06 KST
Status: **LENS 2 PASS + PERFORMANCE WATCHES · LENS 3 NOT YET REVIEWED · TERMINAL CLOSE NOT EXECUTED**
Release: `v0.70.9 Inline Planning Marker Hygiene Guard`
Production: `release-simcore@1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17`
Generation: `mtorokbu-gq7rk8`
Protocol: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`
Lens 1 authority: `docs/SIMCORE_07009_LENS1_RELEASE_SPECIFIC_LIVE_EVIDENCE_2026-09-06.md`

## 1. Review boundary

This record performs **Lens 2 only**:

```text
What does the supplied packet mean as one operator/action flow?
```

It does not re-score the v0.70.9 release-specific contract and does not perform the exhaustive Lens-3 field ledger.

Operator clarification is first-class evidence and is bound exactly as follows:

```text
1. @3162 -> @3163 = first real turn after page refresh
2. @3164 -> @3165 = genuine hand edit (+1 visible character)
3. @3166 -> @3167 = next natural C turn
4. @3168 -> @3169 = next natural C turn
5. @3168 -> @3169 = operator-confirmed reroll of specimen 4
```

All five specimens belong to the same runtime generation and therefore form one coherent causal set.

## 2. Set-level transition map

```text
POST-REFRESH FIRST A
  prior representation unavailable
  -> output canonical/Fresh mismatch
  -> Deferred Mirror fail-closed OUTPUT_MISMATCH

GENUINE +1 HAND EDIT OF THAT PRIOR OUTPUT
  prior representation OUTPUT_MISMATCH
  current matches neither prior canonical nor prior Fresh
  -> AMBIGUOUS_CHANGE
  -> MANUAL_EDIT_REBUILT
  -> snapshot UPDATED
  -> regenerated output canonical == Fresh / mirror COMMITTED

NEXT NATURAL C
  prior representation EXACT
  -> SAME_FAST
  -> snapshot UNCHANGED
  -> new output canonical/Fresh mismatch

NEXT NATURAL C
  prior representation OUTPUT_MISMATCH
  current == exact prior Fresh
  -> REPRESENTATION_DRIFT_CORRELATED
  -> REPRESENTATION_FAST_RECONCILED
  -> snapshot UNCHANGED
  -> new output canonical/Fresh mismatch

REROLL OF SAME REQUEST
  REWIND + READ HIT
  prior representation OUTPUT_MISMATCH
  current == exact prior Fresh
  -> REPRESENTATION_DRIFT_CORRELATED
  -> REPRESENTATION_FAST_RECONCILED
  -> fresh-exact-repeat-send-rewind
  -> snapshot UNCHANGED
```

The set distinguishes genuine edit, ordinary representation drift, and repeat-send rewind rather than collapsing them into one edit class.

## 3. Specimen 1 — post-refresh first A

The first specimen is correctly treated as a fresh-runtime control:

```text
Session load = COLD_INIT
Telemetry continuity = FRESH · host-local-foreign_location
Runtime ACTIVE / output COMMITTED
binding BOUND
Warnings 0
```

The output reports:

```text
canonical = 6279:d102924
Fresh = 6279:9face96
match = MISMATCH
Deferred mirror = OUTPUT_MISMATCH
```

This is an observable Host representation drift state. Mirror does not overwrite through the mismatch.

The frame layer reports:

```text
Continuity summary = REPAIRED
Frame sequence = REPAIRED
Frame guard = REPAIRED · CHAPTER_TITLE_ADVANCE
```

The visible committed frame is correct and all later C turns return ordinary `PASS`; prior SimCore evidence already defines this as the expected corrective Frame path.

Disposition:

```text
POST_REFRESH_FIRST_TURN = PASS
OUTPUT_MISMATCH_OBSERVATION = PASS / SAFE
DEFERRED_MIRROR_FAIL_CLOSED = PASS
FRAME_CORRECTIVE_PATH = PASS
```

## 4. Specimen 2 — genuine +1 hand edit

The operator physically edited the prior visible assistant by one character before request `@3164`.

Because the prior output itself had an `OUTPUT_MISMATCH`, the next request sees three distinguishable bodies:

```text
prior canonical = 6279:d1029249
prior Fresh = 6279:9face96f
current = 6280:23b51b
current vs canonical = +1
current vs Fresh = +1
match = NONE
```

The runtime therefore fails closed to:

```text
Edit origin = AMBIGUOUS_CHANGE
Edit reconcile = MANUAL_EDIT_REBUILT
snapshot = UPDATED
```

This is semantically correct. The genuine third representation is not swallowed by either the ordinary Fresh alias guard or the repeat-send rewind exception.

The regenerated output returns:

```text
canonical == Fresh
Deferred mirror = COMMITTED
Warnings = 0
Continuity = PASS
```

### Short-C evidence behavior after the edit

The same request is a short Community handoff:

```text
Short-C source lock = ON
Source handoff = NEW SOURCE
Evidence mode = ROOT_ONLY
root fence = APPLIED
source assistant = ABSENT
source fence = SKIPPED · unsafe-source-boundary
```

This is consistent with the established fail-closed Evidence contract after a deliberate prior visible edit: unsafe/unavailable transformed source evidence is not forced into the request. The root fence remains safe and the visible Community output commits successfully.

Disposition:

```text
GENUINE_EDIT_CLASSIFICATION = PASS
MANUAL_EDIT_REBUILD = PASS
SNAPSHOT_UPDATE = PASS
GENUINE_EDIT_SWALLOWED_BY_REPRESENTATION_GUARD = NO
SHORT_C_ROOT_ONLY_FALLBACK = PASS / FAIL-CLOSED
```

## 5. Specimen 3 — natural post-edit convergence

The next natural C request sees the regenerated prior output as exact:

```text
Prior representation = EXACT
current = canonical = Fresh
Edit origin = NONE
Edit reconcile = SAME_FAST
snapshot = UNCHANGED
```

This proves the genuine edit did not leave persistent representation damage.

The new output itself again ends in a bounded canonical/Fresh mismatch:

```text
canonical = 5119:bd1c6b5
Fresh = 5115:63b970a
Deferred mirror = OUTPUT_MISMATCH
```

That mismatch becomes the next request's representation-drift control.

Disposition:

```text
POST_EDIT_CONVERGENCE = PASS
PERSISTENT_EDIT_RECONCILE_DAMAGE = NONE OBSERVED
NEW_OUTPUT_MISMATCH = SAFE / NEXT-TURN CONTROL
```

## 6. Specimen 4 — ordinary forward exact-Fresh drift recovery

The next natural request observes:

```text
Prior representation = OUTPUT_MISMATCH
current = exact prior Fresh
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Pre snapshot = FORWARD · SKIPPED
Edit reconcile = REPRESENTATION_FAST_RECONCILED
snapshot = UNCHANGED
representation = fresh-exact-carryover
```

This is the ordinary forward form of representation-drift recovery. No manual-edit rebuild occurs and the canonical snapshot is not rewritten.

Disposition:

```text
FORWARD_OUTPUT_MISMATCH_EXACT_FRESH = PASS
REPRESENTATION_FAST_RECONCILE = PASS
FALSE_MANUAL_EDIT_REBUILD = NONE
SNAPSHOT_UNSAFE_REWRITE = NONE
```

## 7. Specimen 5 — reroll exact repeat-send rewind target

The final specimen is the operator-confirmed reroll of specimen 4. It naturally exercises the exact geometry that motivated v0.70.8 and that the original v0.70.8 live set did not naturally reproduce:

```text
Pre snapshot = REWIND · READ HIT · 1.781 s
Prior representation = OUTPUT_MISMATCH
canonical = 5119:bd1c6b54
Fresh = 5115:63b970aa
current = 5115:63b970aa
match = FRESH_CHAT
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Edit reconcile = REPRESENTATION_FAST_RECONCILED · 1 ms
snapshot = UNCHANGED
representation = fresh-exact-repeat-send-rewind
```

The surrounding state isolates this strongly:

```text
Cache topology = STABLE · 48/48 · 100%
History mutation = NONE
Runtime compiler identity = SAME across all tiers
SimCore contribution = NO_BREAK
Warnings = 0
```

Therefore the old false rebuild condition is naturally exercised and does **not** recur.

Post-closure corroboration is recorded on `#1544`.

Disposition:

```text
V07008_EXACT_TARGET_NATURAL_REPRODUCTION = PASS
FRESH_EXACT_REPEAT_SEND_REWIND = PASS
FALSE_MANUAL_EDIT_REBUILD = NOT REPRODUCED
SNAPSHOT_UNSAFE_REWRITE = NONE
V07008_REPAIR_HEALTH_UNDER_V07009 = CONFIRMED
```

## 8. Deferred Mirror sequence

Across the set, mirror behavior tracks output representation state:

```text
specimen 1 output -> OUTPUT_MISMATCH
specimen 2 output -> COMMITTED
specimen 3 output -> OUTPUT_MISMATCH
specimen 4 output -> OUTPUT_MISMATCH
specimen 5 reroll output -> OUTPUT_MISMATCH
```

Every mismatch has `canonical != Fresh`; the exact specimen commits. No unsafe mirror write through a mismatch is observed.

Disposition:

```text
DEFERRED_MIRROR_SAFETY = PASS
EXACT_COMMIT_WHEN_SAFE = PASS
FAIL_CLOSED_ON_MISMATCH = PASS
```

## 9. Cache / history causality

Natural forward requests show `PRE_SIMCORE / CHAT_HISTORY` prefix breaks and moving history frontiers, while the reroll is completely stable:

```text
natural C: SimCore contribution = NOT_FIRST_BREAK
reroll: Cache topology = STABLE 48/48 100%
reroll: History mutation = NONE
reroll: SimCore contribution = NO_BREAK
```

No evidence attributes the host-history prefix break to SimCore. Provider cache remains `UNVERIFIED` and no provider-cache causal claim is authorized.

Disposition:

```text
CACHE_HISTORY_CAUSALITY_TO_SIMCORE = NOT SUPPORTED
REROLL_STABLE_CONTROL = PASS
PROVIDER_CACHE_CAUSE = UNVERIFIED / NOT CLAIMED
```

## 10. Performance findings preserved separately

Lens 2 identifies correctness as coherent but retains these independent performance WATCH lanes.

### 10.1 Genuine-edit slow path

```text
Edit reconcile = 20.875 s
Manual edit commit = 19.201 s
prune = 18.834 s
```

Tracked in `#1619` and `docs/SIMCORE_07009_MANUAL_EDIT_PRUNE_LATENCY_WATCH_2026-09-06.md`.

Historical v0.69.0 evidence already contains a genuine-edit rebuild at 18.476 s, so the broad genuine-edit slow path is now `WATCH / CROSS-VERSION RECURRENCE`. The exact prune owner is proven for the current specimen only; prune-specific recurrence is not yet established.

### 10.2 Repeat-send pre-snapshot read

```text
REWIND READ HIT = 1.781 s
correctness = PASS
```

Tracked in `#1556`. This is another recurrence, not a correctness failure.

### 10.3 Turn storage variance

Current exact same-payload control:

```text
28,465 chars -> 803 ms
28,465 chars -> 65 ms
```

Approximately 12.35x apart. Tracked in `#1626` and the dedicated v0.70.9 Turn-storage record.

### 10.4 Output snapshot set variance

Already preserved under `#1587` and the v0.70.9 Lens-1 recurrence record. The current set continues similar-size high variance with correctness intact.

### 10.5 Host-local checkpoint non-recurrence

Current five checkpoint totals are approximately:

```text
182 ms
47 ms
51 ms
55 ms
67 ms
```

The prior exact `6.337 s` spike from v0.70.8 is not reproduced here. `#1588` remains WATCH because a clean packet does not erase the earlier exact specimen.

## 11. Lens-2 verdict

```text
LENS_2 = PASS + PERFORMANCE WATCHES
COHERENT_SET = YES
OPERATOR_ACTION_BINDING = PASS
POST_REFRESH_FIRST_TURN = PASS
GENUINE_HAND_EDIT = PASS
SHORT_C_AFTER_HAND_EDIT_FAIL_CLOSED = PASS
POST_EDIT_CONVERGENCE = PASS
FORWARD_REPRESENTATION_DRIFT_RECOVERY = PASS
REROLL_EXACT_REWIND_TARGET = PASS
DEFERRED_MIRROR_SAFETY = PASS
CACHE/HISTORY_CAUSALITY_TO_SIMCORE = NOT SUPPORTED

NEW_FIX = NONE FROM LENS_2
NEW_BLOCKER = NONE FROM LENS_2

WATCH #1619 genuine-edit slow path / current prune 18.834 s
WATCH #1556 repeat-send pre-snapshot READ HIT 1.781 s
WATCH #1626 Turn-storage same-payload variance
WATCH #1587 output-snapshot set variance
WATCH #1588 Host-local checkpoint intermittent spike / not reproduced here
```

The set is stronger than the prior v0.70.8 live packet for Representation/Edit-Reconcile because it naturally exercises the exact repeat-send rewind target and passes.

## 12. Advancement boundary

Lens 2 does not authorize terminal convergence by itself.

```text
Lens 1 = PASS
Lens 2 = PASS + WATCH
Lens 3 = NOT YET REVIEWED
HUMAN_EVIDENCE terminal close = NOT EXECUTED
#1589 final live closure = NOT YET AUTHORIZED
```

Per the adopted three-lens protocol, next review step is Lens 3 exhaustive element inventory. WATCH findings remain non-blocking unless later evidence promotes them to FIX/BLOCKER.

## 13. Production boundary

This is evidence-only work.

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state terminal convergence = NONE
latest.js mutation = NONE
install.js mutation = NONE
```
