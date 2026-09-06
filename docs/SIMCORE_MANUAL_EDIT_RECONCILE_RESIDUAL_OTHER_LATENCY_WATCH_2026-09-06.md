# SimCore Manual-Edit Reconcile Residual-Other Latency Watch

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · CORRECTNESS PASS**
Tracking: `#1651`
Source set: v0.70.10 Lens 2 · generation `mtp6ixup-wzmr63`

## Observation

Two consecutive operator-confirmed physical hand edits both take the genuine manual-edit rebuild path and both leave a multi-second bounded residual `other` span after the named stages are removed.

```text
Specimen C
MANUAL_EDIT_REBUILT = 2.560 s
classify = 1 ms
prepare = 4 ms
recovery = 0 ms
finalize = 0 ms
commit = 397 ms
other = 2.157 s
confidence = BOUNDED

Specimen D
MANUAL_EDIT_REBUILT = 3.215 s
classify = 1 ms
prepare = 3 ms
recovery = 0 ms
finalize = 1 ms
commit = 557 ms
other = 2.652 s
confidence = BOUNDED
```

Both are `USER_EDIT_CANDIDATE`, both update the previous snapshot, both use `INLINE_PRUNE_SKIPPED · SAME_OUT_KEY_OVERWRITE`, and both subsequently produce a committed new output with canonical == Fresh and Deferred Mirror COMMITTED.

## Correctness boundary

```text
PHYSICAL_OPERATOR_EDIT = YES / YES
EDIT_CLASSIFICATION = PASS
MANUAL_EDIT_REBUILD = PASS
SNAPSHOT_UPDATED = PASS
ELIGIBLE_INLINE_PRUNE_ELISION = PASS
VISIBLE_OUTPUT_CORRUPTION = NONE OBSERVED
```

The residual is therefore a performance observation, not a correctness failure.

## Historical relation

v0.70.9 genuine-edit evidence exposed a separate bounded `other = 1.667 s` while the dominant cost in that specimen was an 18.834 s retention prune. The prune-specific lane remains owned by `#1619`.

Current C/D do not reproduce that prune geometry:

```text
prune = 0
INLINE_PRUNE_SKIPPED
```

Therefore do not attribute the current residual to pruning.

## Disposition

```text
MANUAL_EDIT_RESIDUAL_OTHER_LATENCY = WATCH / RECURRING
EXACT_INTERNAL_OWNER = UNKNOWN
PRUNE_CAUSE = NOT SUPPORTED
HOST_INTERNAL_CAUSE = NOT CLAIMED
PROVIDER_CACHE_CAUSE = NOT CLAIMED
RUNTIME_CORRECTNESS_FIX = NO
OPTIMIZATION_MECHANISM = NOT AUTHORIZED
```

## Production boundary

Evidence-only record. No runtime, release-simcore, release-state, latest.js, or install.js mutation.