# SimCore Host-Local Telemetry Checkpoint Latency Watch

Date: 2026-09-06 KST
Status: **WATCH · PERFORMANCE · EXACT OWNER OBSERVED ON ONE OUTPUT · CORRECTNESS INTACT**
Classification: **SIMCORE · RUNTIME TELEMETRY / HOST-LOCAL TRANSPORT · SEPARATE FROM v0.70.8 CORRECTNESS REPAIR**

## 1. Triggering live specimen

Production:

```text
v0.70.8 Repeat-Send Representation Rewind Guard
release-simcore = 01010564649a033e02a0658a167f5f38a6a23632
runtime generation = mtom5tgq-rbmuf3
request user @3152
output assistant @3153
mode C
```

The accepted diagnostic reports:

```text
Output handler breakdown:
indices 1.0 ms
chat 111.0 ms
session 0.0 ms
process 1.023 s
mirror 0.0 ms
diagnostics 0.0 ms
other 6.338 s
total 7.473 s

Telemetry checkpoint:
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
4,859 chars
host 6.337 s
6.337 s total
trigger OUTPUT_COMMIT
```

Numerical closure:

```text
output-handler other = 6.338 s
telemetry checkpoint total = 6.337 s
telemetry checkpoint host = 6.337 s
```

At copied diagnostic precision, the awaited Host-local telemetry checkpoint directly owns essentially the entire output-handler `other` spike in this specimen.

## 2. Correctness disposition

The same output reports:

```text
Runtime status ACTIVE / output COMMITTED
Stability PASS
Deferred mirror COMMITTED
Warnings 0
Continuity PASS
Telemetry capsule COMPACT_V2 / OK
Host-local transport API PRESENT / store USABLE
```

Therefore:

```text
TELEMETRY_CHECKPOINT_CORRECTNESS = PASS
HOST_LOCAL_WRITE_DURABILITY = PASS
OUTPUT_COMMIT_CORRECTNESS = PASS
LATENCY = WATCH
```

This is not evidence that the v0.70.8 Repeat-Send Representation Rewind Guard is incorrect.

## 3. Scope boundary

The currently deployed telemetry contract intentionally awaits the OUTPUT_COMMIT Host-local write so the copied diagnostic can report durable publication state. This record does not change that policy.

Do not infer from one latency spike that the correct repair is to:

```text
make authoritative checkpoint fire-and-forget
remove Host-local durability
change telemetry capsule schema
add retry/polling/background worker
add another Host-local key
change release/runtime correctness semantics
```

Any future optimization must first prove a bounded safe mechanism while preserving the established Host-local handoff contract or explicitly design a separate contract change.

## 4. Related first-request observation

The same generation's first accepted request reported:

```text
post-onSend total = 8.975 s
prompt accounting = 8.970 s
first-request = COLD_INIT
```

Current source structure includes first-request telemetry adoption/Host-local work inside the broad prompt-accounting span. This sample therefore supports a cold-path performance observation, but the exact 8.970 s owner is not isolated by the copied fields strongly enough to assign all of it to Host-local telemetry.

Disposition:

```text
FIRST_REQUEST_POST_ONSEND_LATENCY = WATCH / EXISTING COLD-PATH FAMILY
EXACT_CAUSE_OF_8_970S = UNRESOLVED
```

Do not conflate this bounded first-request observation with the exact 6.337 s OUTPUT_COMMIT checkpoint ownership above.

## 5. Advancement disposition

```text
classification = WATCH
correctness blocker = NO
new runtime FIX = NO
next-version authorization = NO
```

This finding remains separate from:

```text
#1556 repeat-send pre-snapshot READ HIT latency
REPEATED_OUT_STORAGE_LATENCY / SIMILAR_SIZE_HIGH_VARIANCE
v0.70.8 Representation/Edit-Reconcile correctness
provider cache = UNVERIFIED
```

## 6. Production immutability

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-system mutation = NONE
```
