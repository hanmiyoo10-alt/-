# SimCore v0.70.7 Live Evidence — Repeat-Send Reconcile Anomaly

Date: 2026-09-05 KST
Status: **FIX · EARLIER SPECIMEN UNEXPLAINED · FINAL WHITESPACE-EDIT CONTROL CLARIFIED**
Classification: **REPRESENTATION / EDIT RECONCILE · REPEAT-SEND FAMILY**
Tracking: `#1544`, operator clarification `#1551`

## 1. Sequence boundary

Production runtime:

```text
Version = 0.70.7
Generation = mtof1ufa-rw8y3r
Repeated request/output slot = @3144 -> @3145
```

Two different repeated specimens must not be conflated.

## 2. Earlier repeated specimen — still unexplained

The earlier repeated attempt reports:

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

The operator clarification about a manual whitespace edit does **not** refer to this specimen.

Frozen Representation/Edit-Reconcile authority expects:

```text
Prior OUTPUT_MISMATCH + current exact prior Fresh
-> REPRESENTATION_DRIFT_CORRELATED
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED
```

Therefore this earlier specimen remains:

```text
EARLIER_REPEAT_SEND_FALSE_REBUILD = FIX / UNEXPLAINED
VISIBLE_OUTPUT_CORRUPTION = NOT OBSERVED
INTERNAL_SNAPSHOT_MUTATION = OBSERVED
V07007_CAUSALITY = UNPROVEN
```

Independent clean reproduction is still required before causal attribution or runtime repair.

## 3. Final specimen — operator-confirmed whitespace edit

The final repeated specimen is different. The operator explicitly confirmed that one extra whitespace character was manually inserted near the front of the visible prior assistant output.

That final specimen reports a one-character new visible representation and finishes:

```text
Edit origin = NONE
Edit reconcile = HOST_COMPATIBLE
snapshot = UNCHANGED
```

This is expected under production v0.70.7 source semantics.

The Edit-Reconcile owner states that when the raw PocketRisu representation, after output finalization/canonicalization, resolves to the already committed saved output fingerprint, the representation is output-compatible rather than a meaningful user edit. The snapshot is not rewritten or pruned.

Therefore:

```text
PHYSICAL_OPERATOR_EDIT = YES
EDIT_KIND = +1 WHITESPACE
CANONICAL_OUTPUT_DELTA = NONE
HOST_COMPATIBLE = EXPECTED
SNAPSHOT_UNCHANGED = EXPECTED
FALSE_NEGATIVE_MANUAL_EDIT = NO FOR THIS CANONICAL-EQUIVALENT EDIT
```

The final specimen is useful as a normalization/equivalence negative control.

## 4. Corrected packet interpretation

```text
natural exact-Fresh carryover
-> REPRESENTATION_FAST_RECONCILED
-> PASS

later repeated exact-Fresh specimen
-> unexpected MANUAL_EDIT_REBUILT
-> FIX / unexplained

final operator whitespace edit
-> canonical-equivalent HOST_COMPATIBLE
-> PASS / expected normalization control
```

Do not use the final whitespace-edit clarification to dismiss the earlier distinct anomaly.

Do not repair the earlier anomaly by weakening genuine semantic `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT` conservatism.

## 5. Scope

No runtime, release-state, or `release-simcore` mutation is authorized by this evidence correction.
