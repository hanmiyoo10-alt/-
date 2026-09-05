# SimCore Repeat-Send Pre-Snapshot READ HIT Latency Recurrence

Date: 2026-09-05 KST · updated 2026-09-06 KST
Status: **WATCH · PERFORMANCE · CROSS-VERSION RECURRENCE · CORRECTNESS PASS**
Tracking: `#1556`

## 1. Topic boundary

This document records only repeat-send pre-snapshot storage-read latency.

It is separate from:

```text
#1544 Representation/Edit-Reconcile false rebuild correctness (closed by v0.70.8 repair)
#1587 output snapshot-set variance
#1619 genuine-edit prune latency
#1626 Turn-storage variance
provider cache investigation
```

Do not use this WATCH to weaken or strengthen genuine manual-edit semantics.

## 2. v0.70.7 operator-confirmed reroll specimen

```text
runtime generation = mtogo9ij-squn2g
request = @3148
Pre snapshot = REPEAT-SEND / READ HIT / 1.839 s
Edit reconcile = SAME_SNAPSHOT / 1.684 s
snapshot = UNCHANGED
Prior representation = EXACT
current == canonical == Fresh
Edit origin = NONE
History mutation = NONE
Cache topology = STABLE / 58 of 58 / 100%
SimCore contribution = NO_BREAK
```

This is a healthy reroll correctness control with a slow pre-snapshot read.

## 3. Prior recurrence evidence

Previously accepted/observed examples include:

```text
v0.70.6 operator-confirmed reroll
Pre snapshot READ HIT ~= 1.429 s
SAME_SNAPSHOT ~= 1.940 s
snapshot UNCHANGED

v0.70.7 earlier packet
READ HIT = 853 ms
READ HIT = 741 ms

v0.70.8 operator-confirmed clean reroll
READ HIT = 790 ms
SAME_SNAPSHOT = 774 ms
snapshot UNCHANGED
```

## 4. v0.70.9 exact-target reroll recurrence

The v0.70.9 Lens-2 packet supplies a stronger correctness control while the read latency remains elevated:

```text
runtime generation = mtorokbu-gq7rk8
operator action = reroll @3168 -> @3169
Pre snapshot = REWIND / READ HIT / 1.781 s
Prior representation = OUTPUT_MISMATCH
current = exact prior Fresh
Edit origin = REPRESENTATION_DRIFT_CORRELATED
Edit reconcile = REPRESENTATION_FAST_RECONCILED / 1 ms
representation = fresh-exact-repeat-send-rewind
snapshot = UNCHANGED
History mutation = NONE
Cache topology = STABLE / 48 of 48 / 100%
SimCore contribution = NO_BREAK
```

This specimen naturally exercises the former #1544 exact target geometry and passes. Therefore reconcile correctness and pre-snapshot latency are cleanly separable:

```text
REWIND_GUARD_CORRECTNESS = PASS
READ_HIT_LATENCY = WATCH
```

## 5. Classification

```text
READ_HIT_CORRECTNESS = PASS
REPEAT_SEND_RECONCILE_CORRECTNESS = PASS
SNAPSHOT_MUTATION = NONE
REPEAT_SEND_PRE_SNAPSHOT_READ_LATENCY = WATCH / CROSS-VERSION RECURRENT
VISIBLE_OUTPUT_FAILURE = NONE OBSERVED
```

The latency is large enough to remain a real performance observation, but the supplied evidence does not prove:

```text
pluginStorage backend root cause
host internal implementation cause
provider cache cause
payload-size cause
```

## 6. Relation to #1544

#1544 is now closed by the v0.70.8 bounded repeat-send rewind repair.

The original v0.70.8 live set did not naturally exercise the exact target condition, but the v0.70.9 reroll now does and reports the expected `fresh-exact-repeat-send-rewind` fast reconcile.

Therefore:

```text
#1544 REPAIR HEALTH = NATURALLY CORROBORATED
#1544 REOPEN = NO
#1556 LATENCY WATCH = STILL OPEN / DISTINCT
```

## 7. Next treatment

Keep this item as WATCH unless a future source-proven owner shows avoidable redundant read work or comparable evidence establishes a bounded optimization opportunity.

Do not create a runtime release solely to chase Host-storage latency without a source-proven SimCore-owned mechanism.

## 8. Production boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
product-manifest mutation = NONE
```
