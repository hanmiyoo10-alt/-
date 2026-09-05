# SimCore v0.70.7 Live Evidence — Repeat-Send False Manual-Edit Rebuild

Date: 2026-09-05 KST
Status: **FIX · LIVE-CLOSE HOLD · REPRO/TRIAGE REQUIRED**
Classification: **REPRESENTATION / EDIT RECONCILE · REPEAT-SEND / RETRY FAMILY**
Tracking: `#1544`

## 1. Natural specimen

Production runtime:

```text
Version = 0.70.7
Generation = mtof1ufa-rw8y3r
Repeated request/output slot = @3144 -> @3145
```

The critical repeated attempt reports:

```text
Pre snapshot = REPEAT-SEND · READ HIT · 853.0 ms
Prior representation = OUTPUT_MISMATCH
canonical = 4302:8162b9a4
fresh = 4300:5d8a429d
current = 4300:5d8a429d
match = FRESH_CHAT
shape = FRESH_EXACT_CARRYOVER
Edit origin = REPRESENTATION_DRIFT_CORRELATED
History mutation = NONE
Cache topology = STABLE · 54/54 · 100%
```

but then:

```text
Edit reconcile = MANUAL_EDIT_REBUILT · 2.280 s
snapshot = UPDATED
Manual edit commit = 377.0 ms
```

## 2. Contract conflict

Frozen Representation/Edit-Reconcile authority requires:

```text
Prior OUTPUT_MISMATCH + current exact prior Fresh
-> REPRESENTATION_DRIFT_CORRELATED
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED
-> no false manual-edit rebuild
```

The same packet contains a prior natural control that follows that contract correctly:

```text
current exact Fresh
-> REPRESENTATION_DRIFT_CORRELATED
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED
```

A later retry also avoids mutation through:

```text
HOST_COMPATIBLE
snapshot UNCHANGED
```

Therefore the `MANUAL_EDIT_REBUILT` result is not an unavoidable repeat-send outcome.

## 3. Why this is stronger than a latency watch

This is not merely a slow request:

```text
visible output corruption = not observed
internal snapshot mutation = observed
manual-edit rebuild = observed without USER_EDIT_CANDIDATE
exact prior-Fresh carryover = observed
history mutation at this attempt = NONE
```

The false path therefore crosses a frozen correctness boundary even though the final visible response is usable.

## 4. Causality boundary

v0.70.7 is an output-storage observability release. This evidence does not by itself prove that the new release caused the reconcile behavior.

Required before causal attribution:

1. independent fresh-generation operator-confirmed reroll/retry reproduction;
2. parent v0.70.6 decision-path comparison;
3. exact source comparison of the relevant Representation/Edit-Reconcile owner;
4. preserve genuine manual-edit positive controls.

Do not weaken `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT` conservatism as a repair shortcut.

## 5. Disposition

```text
REROLL_REPRESENTATION_FALSE_MANUAL_EDIT_REBUILD = FIX
VISIBLE_OUTPUT_CORRUPTION = NO OBSERVED
SNAPSHOT_MUTATION = YES
PERFORMANCE_IMPACT = MATERIAL
V07007_CAUSALITY = UNPROVEN
TERMINAL_07007_LIVE_CLOSE = HOLD
```

No runtime or `release-simcore` mutation is authorized by this evidence record.