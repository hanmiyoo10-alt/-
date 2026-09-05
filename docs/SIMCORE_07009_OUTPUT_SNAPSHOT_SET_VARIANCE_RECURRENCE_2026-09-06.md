# SimCore v0.70.9 Output Snapshot Set Variance Recurrence

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · CROSS-VERSION RECURRENCE · CORRECTNESS INTACT**
Primary existing tracker: `#1587`
Packet tracker: `#1622`
Generation: `mtorokbu-gq7rk8`

## 1. New v0.70.9 samples

Exact output snapshot-set measurements from the supplied packet:

```text
13,001 chars -> 1.060 s -> 81.53 ms/1K
13,002 chars ->   468 ms -> 35.99 ms/1K
13,000 chars ->   355 ms -> 27.31 ms/1K
13,003 chars -> 1.831 s -> 140.81 ms/1K
13,003 chars -> 1.100 s -> 84.60 ms/1K
```

Every sample reports:

```text
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
output = COMMITTED
Warnings = 0
```

## 2. Cross-version interpretation

Payload lengths remain within a 3-character band while exact awaited backend-set latency spans `355 ms -> 1.831 s`, approximately `5.16x`.

This independently reinforces the existing #1587 conclusion:

```text
SIMILAR_SIZE_HIGH_VARIANCE = SUPPORTED
PAYLOAD_SIZE_AS_SOLE_DOMINANT_EXPLANATION = NOT SUPPORTED
OUT_STORAGE_CORRECTNESS = PASS
OUT_STORAGE_LATENCY = WATCH / RECURRENCE
HOST_INTERNAL_CAUSE = NOT CLAIMED
PROVIDER_CACHE_CAUSE = NOT CLAIMED
```

## 3. Release isolation

The v0.70.9 change is a pure Output Compat line-filter/canonicalization repair and did not add storage I/O or alter snapshot-set semantics.

Therefore this recurrence is preserved separately and does not change the v0.70.9 Lens 1 release-specific verdict.

No storage optimization is authorized solely from this packet.
