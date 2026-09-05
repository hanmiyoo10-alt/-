# SimCore v0.70.9 Repeat-Send Rewind Natural-Target Corroboration

Date: 2026-09-06 KST
Status: **PASS · POST-v0.70.8 NATURAL TARGET CORROBORATION · NO REOPEN**
Historical repair tracking: `#1544` (closed)
Current generation: `mtorokbu-gq7rk8`

## 1. Why this specimen matters

v0.70.8 repaired a narrow repeat-send rewind condition:

```text
Prior representation = OUTPUT_MISMATCH
current visible = exact prior Fresh
repeat-send / rewind geometry active
```

Expected behavior:

```text
REPRESENTATION_DRIFT_CORRELATED
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED
-> fresh-exact-repeat-send-rewind
```

The original v0.70.8 real-long-chat packet did not naturally reproduce this exact target; deterministic owner-level regression remained the primary proof.

## 2. v0.70.9 natural live specimen

The operator confirmed the final specimen is a reroll of request `@3168`.

Observed request state:

```text
Pre snapshot = REWIND · READ HIT · 1.781 s
Prior representation = OUTPUT_MISMATCH
canonical = 5119:bd1c6b54
Fresh = 5115:63b970aa
current = 5115:63b970aa
match = FRESH_CHAT
shape = FRESH_EXACT_CARRYOVER
Edit origin = REPRESENTATION_DRIFT_CORRELATED
```

Reconcile result:

```text
Edit reconcile = REPRESENTATION_FAST_RECONCILED · 1.0 ms
snapshot = UNCHANGED
representation = fresh-exact-repeat-send-rewind
```

Isolation controls:

```text
Cache topology = STABLE · 48/48 · 100%
History mutation = NONE
Runtime compiler identity = SAME on stable/slow/volatile/full
SimCore contribution = NO_BREAK
Warnings = 0
```

## 3. Verdict

```text
V07008_EXACT_TARGET_NATURAL_REPRODUCTION = PASS
FALSE_MANUAL_EDIT_REBUILD = NOT REPRODUCED
SNAPSHOT_UNSAFE_REWRITE = NONE
REPEAT_SEND_REWIND_GUARD = HEALTHY UNDER v0.70.9
```

This materially strengthens the original v0.70.8 closure evidence, but it does not reopen #1544 because the repair is behaving correctly.

The associated 1.781 s pre-snapshot read is a separate performance WATCH under `#1556` and must not be confused with reconcile correctness.

## 4. Production boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
```
