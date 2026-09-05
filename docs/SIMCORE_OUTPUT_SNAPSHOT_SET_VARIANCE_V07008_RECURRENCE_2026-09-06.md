# SimCore Output Snapshot Set Variance — v0.70.8 Recurrence

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · CROSS-VERSION RECURRENCE · CORRECTNESS INTACT**
Classification: **SIMCORE · SNAPSHOT STORE / PLUGIN_STORAGE_SET_ITEM · NON-BLOCKING PERFORMANCE WATCH**
Parent evidence:
- `docs/SIMCORE_LIVE_07007_STORAGE_VARIANCE_PACKET_2026-09-05.md`
- `docs/SIMCORE_LIVE_07007_FULL_DIAGNOSTIC_AUDIT_2026-09-05.md`
- `docs/SIMCORE_LIVE_07007_PASS2_INDEPENDENT_DIAGNOSTIC_AUDIT_2026-09-05.md`

## 1. Fresh production boundary

```text
production = v0.70.8 Repeat-Send Representation Rewind Guard
release-simcore = 01010564649a033e02a0658a167f5f38a6a23632
release blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
runtime generation = mtom5tgq-rbmuf3
```

v0.70.8 does not change output storage semantics. This record is recurrence evidence only.

## 2. Same-generation output-set samples

Accepted real long-chat diagnostics reported:

```text
payload chars | set time | normalized set cost
13,002        | 1.430 s  | 109.98 ms/1K
13,003        | 1.014 s  | 77.98 ms/1K
13,003        | 2.104 s  | 161.81 ms/1K
13,003        | 1.468 s  | 112.90 ms/1K
13,002        | 2.011 s  | 154.67 ms/1K
```

Every sample reports:

```text
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
serialize = 0.0 ms at copied precision
output correctness = COMMITTED
```

The five payload sizes differ by only one character while set latency spans:

```text
minimum = 1.014 s
maximum = 2.104 s
range = 1.090 s
max/min ratio ≈ 2.07x
```

## 3. Causal disposition

This independently reinforces the frozen v0.70.7 terminal attribution:

```text
SIMILAR_SIZE_HIGH_VARIANCE = STRONGLY SUPPORTED
PAYLOAD_SIZE_AS_SOLE_DOMINANT_EXPLANATION = NOT SUPPORTED
```

The evidence does **not** establish why `Risuai.pluginStorage.setItem(...)` varies.

Forbidden causal upgrades from this packet:

```text
HOST_INTERNAL_CAUSE = NOT CLAIMED
DEVICE_IO_CAUSE = NOT CLAIMED
GC_CAUSE = NOT CLAIMED
PROVIDER_CACHE_CAUSE = NOT CLAIMED
PAYLOAD_SIZE_CAUSE = NOT CLAIMED
```

## 4. Correctness boundary

Across the same set:

```text
Warnings = 0
output COMMITTED = YES
Deferred mirror COMMITTED = YES
Continuity = PASS
Frame = PASS
Representation correctness = PASS
```

Therefore:

```text
OUT_STORAGE_CORRECTNESS = PASS
OUT_STORAGE_LATENCY = WATCH
SEVERITY = NON-BLOCKING PERFORMANCE
```

This recurrence must not be folded into the v0.70.8 Representation/Edit-Reconcile repair or used to infer a correctness regression.

## 5. Next safe action

Do not optimize storage format or state shape from this evidence alone.

A future performance design may investigate the exact Host/backend wait only if it remains one bounded problem and preserves:

```text
authoritative awaited out save
snapshot content/schema
save count/order
pluginStorage API authority
latest.js == install.js
no speculative provider/cache claim
```

Until then:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
classification = SIMILAR_SIZE_HIGH_VARIANCE
```

## 6. Production immutability

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-system mutation = NONE
```
