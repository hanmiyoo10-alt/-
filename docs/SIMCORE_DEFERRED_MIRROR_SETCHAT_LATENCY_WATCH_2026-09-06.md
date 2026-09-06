# SimCore Deferred Mirror setChat Latency Watch

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · MIRROR SAFETY PASS**
Tracking: `#1652`
Source set: v0.70.10 Lens 2 · generation `mtp6ixup-wzmr63`

## Observation

Specimen B reports a materially slow deferred mirror commit:

```text
Deferred mirror = COMMITTED
chat = 1.915 s
prepare = 0 ms
setChat = 3.530 s
total = 5.445 s
critical path = 0.0 ms
```

The surrounding output is exact and healthy:

```text
CANONICAL == FRESH_CHAT
output COMMITTED
binding BOUND
Warnings 0
```

Adjacent same-generation mirror observations are much lower:

```text
A OUTPUT_MISMATCH total = 573 ms
C COMMITTED total = 651 ms
D COMMITTED total = 782 ms
```

## Safety interpretation

The sequence still respects the frozen mirror safety contract.

Specimen A has canonical != Fresh and fails closed:

```text
Deferred mirror = OUTPUT_MISMATCH
```

Specimens B/C/D have canonical == Fresh and commit safely. No write-through mismatch or visible output corruption is observed.

## Disposition

```text
DEFERRED_MIRROR_SAFETY = PASS
EXACT_COMMIT_WHEN_SAFE = PASS
FAIL_CLOSED_ON_MISMATCH = PASS
DEFERRED_MIRROR_LATENCY_5_445S = WATCH
SETCHAT_LEAF = OBSERVED 3.530S
CHAT_LEAF = OBSERVED 1.915S
RECURRENCE = NOT YET ESTABLISHED
HOST_INTERNAL_CAUSE = NOT CLAIMED
OPTIMIZATION_MECHANISM = NOT AUTHORIZED
```

This lane is distinct from `#1588` Host-local telemetry checkpoint set latency and `#1587` output snapshot backend-set latency.

## Production boundary

Evidence-only record. No runtime, release-simcore, release-state, latest.js, or install.js mutation.