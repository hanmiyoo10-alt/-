# SimCore v0.70.9 Turn Storage Variance Recurrence

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · CROSS-VERSION RECURRENCE · CORRECTNESS INTACT**
Tracking: `#1626`
Generation: `mtorokbu-gq7rk8`

## 1. Topic boundary

This record covers request-side `Turn storage` only.

Keep separate from:

```text
#1587 output snapshot-set latency variance
#1556 repeat-send pre-snapshot READ HIT latency
#1619 genuine-edit prune latency
provider cache investigation
```

## 2. v0.70.9 samples

```text
29,900 chars -> 580 ms -> 19.40 ms/1K
28,393 chars -> 801 ms -> 28.21 ms/1K
28,516 chars -> 361 ms -> 12.66 ms/1K
28,465 chars -> 803 ms -> 28.21 ms/1K
28,465 chars ->  65 ms ->  2.28 ms/1K
```

The final two samples have the exact same payload character count:

```text
28,465 chars -> 803 ms
28,465 chars ->  65 ms
ratio ~= 12.35x
```

The 803 ms specimen is a natural forward C request; the 65 ms specimen is the operator-confirmed reroll of that request. Because action state differs, this packet does not prove the cause of the variance. It does prove that character count alone is insufficient as the sole latency explanation.

## 3. Historical comparator

The v0.70.7 full diagnostic audit already recorded:

```text
28,412 chars -> 340 ms
28,412 chars ->  26 ms
```

Therefore the request-side variance is recurrent across versions and long-chat generations.

## 4. Correctness

All current samples complete normally:

```text
request hook = SEEN
binding = BOUND
Turn storage set completes
output subsequently COMMITTED
Warnings = 0
```

No storage-write loss or state corruption is observed.

## 5. Classification

```text
TURN_STORAGE_CORRECTNESS = PASS
TURN_STORAGE_LATENCY_VARIANCE = WATCH / CROSS-VERSION RECURRENCE
SAME_PAYLOAD_HIGH_VARIANCE = STRONGLY SUPPORTED
PAYLOAD_SIZE_AS_SOLE_DOMINANT_EXPLANATION = NOT SUPPORTED
HOST_INTERNAL_CAUSE = NOT CLAIMED
REROLL_CAUSE = NOT CLAIMED
V07009_OUTPUT_COMPAT_CAUSALITY = NOT ESTABLISHED
OPTIMIZATION = NOT AUTHORIZED FROM THIS PACKET
```

Future optimization requires a source-proven SimCore-owned mechanism rather than guessing from Host timing alone.

## 6. Production boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
```
