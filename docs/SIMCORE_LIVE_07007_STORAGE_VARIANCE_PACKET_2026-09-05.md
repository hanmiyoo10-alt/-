# SimCore v0.70.7 — Storage Variance Live Packet

Date: 2026-09-05 KST
Status: **PARTIAL LIVE EVIDENCE · STRONG SIMILAR-SIZE HIGH-VARIANCE SIGNAL · LIVE GATE NOT CLOSED**
Classification: **REAL LONG-CHAT EVIDENCE · OUTPUT SNAPSHOT STORAGE ATTRIBUTION · WATCH PRESERVATION**

## 1. Production authority

Fresh repository authority at evidence intake:

```text
production version = 0.70.7
release = Output Snapshot Set Cost Attribution
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
validation = PENDING_REAL_LONG_CHAT
current priority = 07007_OUTPUT_SNAPSHOT_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
provider cache = UNVERIFIED
```

The production branch readback identifies the published release commit as `434df54760bc997b1bcd9223eeaff428aeee66d3`.

## 2. Operator-supplied runtime packet

All supplied diagnostics came from the same runtime generation:

```text
runtime boot = 2026-09-05T13:26:06.406Z
generation = mtof1ufa-rw8y3r
runtime version = 0.70.7
```

The packet contains one fresh/COLD_INIT ordinary turn, one next ordinary turn, one representation-reconcile turn, and two later repeat-send/retry observations for the same user/output indices.

The final two repeat-send observations are recognizable from `Pre snapshot: REPEAT-SEND`; the exact operator action subtype is not independently asserted by this record.

## 3. Output snapshot attribution observations

### Sample A — fresh/COLD_INIT ordinary output

Captured `2026-09-05T13:30:27.505Z`:

```text
binding = BOUND
stability = PASS
mirror = COMMITTED
warnings = 0
continuity = PASS
payload chars = 13,003
serialize = 0.0 ms
set = 1.514 s
set/1K = 116.43 ms
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
output hotspot = OUT_STORAGE / 1.514 s / 85.5%
```

This is a clean Stage-A-compatible attribution sample.

### Sample B — next same-generation ordinary output

Captured `2026-09-05T13:33:43.244Z`:

```text
binding = BOUND
stability = OBSERVED
mirror = OUTPUT_MISMATCH
warnings = 0
continuity = REPAIRED
payload chars = 13,003
serialize = 0.0 ms
set = 1.583 s
set/1K = 121.74 ms
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
output hotspot = OUT_STORAGE / 1.583 s / 89.1%
```

The storage attribution itself is exact, but this is not promoted to a clean accepted Stage B because the same output carried `OUTPUT_MISMATCH` and repaired continuity/frame state.

### Sample C — next same-generation representation reconcile

Captured `2026-09-05T13:36:38.173Z`:

```text
edit = REPRESENTATION_FAST_RECONCILED
edit origin = REPRESENTATION_DRIFT_CORRELATED
snapshot = UNCHANGED
stability = PASS
mirror = COMMITTED
payload chars = 13,003
serialize = 0.0 ms
set = 378.0 ms
set/1K = 29.07 ms
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
output hotspot = OUT_STORAGE / 378.0 ms / 78.4%
warnings = 2
```

The warnings are COMMUNITY validator warnings, not storage attribution failures. This sample is valid bounded storage evidence but is not used as the clean Stage-B acceptance control.

### Sample D — repeat-send/retry observation

Captured `2026-09-05T13:39:26.712Z`:

```text
pre snapshot = REPEAT-SEND / READ HIT
edit reconcile = MANUAL_EDIT_REBUILT
edit origin = REPRESENTATION_DRIFT_CORRELATED
snapshot = UPDATED
manual edit commit = set 375.0 ms / prune 2.0 ms / total 377.0 ms
payload chars = 13,005
serialize = 0.0 ms
set = 351.0 ms
set/1K = 26.99 ms
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
stability = PASS
mirror = COMMITTED
warnings = 2
```

This sample is supplemental only because it is a repeat-send/retry path rather than an ordinary new request.

### Sample E — later repeat-send/retry observation

Captured `2026-09-05T13:42:18.643Z`:

```text
pre snapshot = REPEAT-SEND / READ HIT
edit reconcile = HOST_COMPATIBLE
snapshot = UNCHANGED
payload chars = 13,005
serialize = 0.0 ms
set = 493.0 ms
set/1K = 37.91 ms
API = PLUGIN_STORAGE_SET_ITEM
prune = INLINE_DISABLED
confidence = EXACT
stability = PASS
mirror = COMMITTED
warnings = 0
continuity = PASS
```

This sample is also supplemental only because it is a repeat-send/retry path.

## 4. Similar-size variance result

Across the supplied output-snapshot samples:

```text
minimum payload = 13,003 chars
maximum payload = 13,005 chars
payload spread = 2 chars
relative payload spread ~= 0.0154%

minimum set = 351 ms
maximum set = 1,583 ms
set spread = 1,232 ms
max/min set ratio ~= 4.51x

minimum normalized set cost = 26.99 ms/1K
maximum normalized set cost = 121.74 ms/1K
normalized max/min ratio ~= 4.51x
```

The key same-size comparison is exact:

```text
13,003 chars -> 1,514 ms / 116.43 ms/1K
13,003 chars -> 1,583 ms / 121.74 ms/1K
13,003 chars ->   378 ms /  29.07 ms/1K
```

The output snapshot size is identical while the awaited `PLUGIN_STORAGE_SET_ITEM` span changes by more than 4x.

This is strong evidence that output-snapshot character count alone is insufficient to explain the repeated storage latency.

Provisional evidence classification:

```text
V07007_CAUSAL_SIGNAL = SIMILAR_SIZE_HIGH_VARIANCE
CONFIDENCE = STRONG_WITHIN_GENERATION
PAYLOAD_SIZE_AS_SOLE_DOMINANT_EXPLANATION = NOT SUPPORTED
HOST_INTERNAL_CAUSE = NOT CLAIMED
PROVIDER_CACHE_CAUSE = NOT CLAIMED
```

This classification does not claim what inside the Host/backend caused the variance. v0.70.7 only establishes the measured boundary at the awaited `pluginStorage.setItem` span.

## 5. Turn-storage corroboration

The request-side turn-storage metric also varied materially in the same generation:

```text
28,482 chars -> 646 ms / 22.68 ms/1K
28,965 chars -> 340 ms / 11.74 ms/1K
28,412 chars -> 340 ms / 11.97 ms/1K
28,412 chars ->  26 ms /  0.92 ms/1K
28,412 chars ->  26 ms /  0.92 ms/1K
```

This is supporting context only. The v0.70.7 target remains the authoritative output snapshot set span, not turn-storage optimization.

## 6. Required live matrix disposition

The frozen v0.70.7 design requires:

```text
Stage A = fresh runtime ordinary output
Stage B = same-generation ordinary output
Stage C = independent fresh runtime ordinary output
```

Current strict disposition:

```text
Stage A = PASS
  clean fresh/COLD_INIT sample
  warnings 0
  stability/binding/mirror/continuity normal
  exact output snapshot attribution present

Stage B = NOT YET CLEANLY SATISFIED
  next ordinary sample carried OUTPUT_MISMATCH / repaired continuity
  later same-generation storage samples are either warning-bearing representation reconcile or repeat-send/retry

Stage C = NOT EXERCISED
  no independent second runtime generation exists in this packet
```

Therefore:

```text
REQUIRED_LIVE_MATRIX_COMPLETE = NO
LIVE_PASS_READY = NO
LIVE_GATE_CLOSE = NOT AUTHORIZED BY THIS PACKET
```

One independent fresh runtime ordinary control remains mandatory, and a clean same-generation ordinary Stage B should be collected if strict acceptance parity with Stage A is maintained.

## 7. Preserved anomalies

### WATCH — transient output representation mismatch

The second ordinary output reported:

```text
mirror = OUTPUT_MISMATCH
canonical = 4302 chars
fresh = 4300 chars
CANONICAL<->FRESH delta = -2
```

The next request classified the prior visible form as:

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
mirror COMMITTED
```

Disposition:

```text
WATCH · TRANSIENT_OUTPUT_MISMATCH_WITH_NEXT_TURN_RECONCILIATION
correctness corruption = NOT OBSERVED
state loss = NOT OBSERVED
blocker = NO at current evidence
```

### WATCH — repeat-send reconcile path variance

Two later observations for the same request/output indices reported different bounded reconciliation outcomes:

```text
REPEAT-SEND -> MANUAL_EDIT_REBUILT / snapshot UPDATED
REPEAT-SEND -> HOST_COMPATIBLE / snapshot UNCHANGED
```

The first also carried `Edit origin: REPRESENTATION_DRIFT_CORRELATED` rather than an explicit user-edit origin.

Because the exact operator action subtype is not separately supplied and both outputs completed with binding/mirror/continuity intact, this record does not promote the behavior to FIX.

Disposition:

```text
WATCH · REPEAT_SEND_RECONCILE_PATH_VARIANCE
operator action subtype = UNCONFIRMED
manual-edit false-positive = NOT PROVEN
correctness corruption = NOT OBSERVED
blocker = NO at current evidence
next action = preserve and compare against another naturally occurring repeat-send/reroll only if available
```

### Existing performance watch

The original watch remains materially confirmed:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
```

v0.70.7 now adds a stronger causal disposition:

```text
SIMILAR_SIZE_HIGH_VARIANCE = STRONGLY SUPPORTED WITHIN THIS GENERATION
```

## 8. What this packet authorizes

This packet supports the design-prescribed next disposition:

```text
favor Host/backend variance analysis or DEFER
DO NOT trim state speculatively
DO NOT compress/change snapshot format speculatively
DO NOT stop awaiting authoritative out save
DO NOT change retention/edit/mirror semantics
```

It does not authorize a new runtime optimization release by itself.

A future optimization design must first complete the v0.70.7 live matrix and preserve the final human evidence classification.

## 9. Repository / production boundary

This evidence transaction is documentation-only.

```text
runtime implementation mutation = NONE
release-simcore mutation = NONE
production deployment = NOT APPLICABLE
real-long-chat evidence = THIS RECORD
```

Production remains the published v0.70.7 runtime while this packet is recorded on `main`.

## 10. Current disposition

```text
V07007_ATTRIBUTION_LINE = PASS
OUTPUT_PAYLOAD_MEASUREMENT = PASS
PLUGIN_STORAGE_SET_ITEM_OWNER = EXACT
SIMILAR_SIZE_HIGH_VARIANCE_SIGNAL = STRONG
STAGE_A = PASS
STAGE_B = NEEDS CLEAN ACCEPTED CONTROL
STAGE_C = MISSING
TRANSIENT_OUTPUT_MISMATCH = WATCH / NONBLOCKING
REPEAT_SEND_RECONCILE_PATH_VARIANCE = WATCH / NONBLOCKING / ACTION_SUBTYPE_UNCONFIRMED
REPEATED_OUT_STORAGE_LATENCY = WATCH / CONFIRMED
LIVE_PASS = NOT READY
```
