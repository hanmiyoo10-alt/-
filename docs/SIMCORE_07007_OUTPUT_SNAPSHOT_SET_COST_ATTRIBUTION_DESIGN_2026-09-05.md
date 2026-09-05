# SimCore v0.70.7 Output Snapshot Set Cost Attribution Design

Date: 2026-09-05 KST
Status: **DESIGN FROZEN · VERSION RESERVED · POST-R2.11 SOURCE PREFLIGHT PASS · IMPLEMENTATION NOT AUTHORIZED**
Classification: **RUNTIME OBSERVABILITY MINI · OUTPUT SNAPSHOT STORAGE COST ATTRIBUTION · NO STORAGE SEMANTIC CHANGE**

## 1. Decision

Freeze the next SimCore runtime patch as:

```text
Version: 0.70.7
Release: Output Snapshot Set Cost Attribution
Parent production: v0.70.6 Manual Edit Redundant Prune Elision
Runtime authority when published: release-simcore
Design/evidence authority: main
```

The selected problem is the repeatedly preserved performance watch:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
```

This release is **observability only**. It does not attempt to make storage faster yet.

The exact current timing owner is already known: `OUT_STORAGE` is the awaited output-snapshot backend set span. What is not known is whether the expensive set duration is materially explained by serialized snapshot size or by host/backend latency that is not size-proportional.

Therefore v0.70.7 adds the missing payload-size evidence without adding a second serialization pass, storage read/write, key scan, timer, network call, or state semantic.

## 2. Fresh authority and version reservation

The design transaction began from main `38996853abb58397e012cf954c0eae47b5118277` while R2.11 was still executing in a separate non-runtime lane.

R2.11 then completed first. The design branch was deliberately rebased onto the fresh post-R2.11 main authority instead of merging a stale design head.

Fresh post-R2.11 authority at design freeze:

```text
main = c0b22f7f60f0e3e66ba1bf6718fc611c524dc64e
R2.11 = IMPLEMENTATION CLOSED / QUALIFIED / NORMAL PATH ACTIVE
R2.11 implementation merge = ba19899f03dc55baa7a75abc01b7146c586b6cf6
R2.11 closure merge = c0b22f7f60f0e3e66ba1bf6718fc611c524dc64e
production = 0.70.6 Manual Edit Redundant Prune Elision
validation = LIVE_PASS
checkpoint = M2-6
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
production blob = 83714d78537906fc9f2060c06c9e4ce349568a19
latest.js == install.js = VERIFIED
provider cache = UNVERIFIED
```

R2.11 direct production readback proved the same pre/post production identity and no runtime or `release-simcore` mutation.

Repository search found no competing current runtime authority that had already reserved or published `0.70.7`. Existing mentions were only future/candidate references.

Accordingly `0.70.7` is now reserved for this frozen design.

## 3. R2.11 separation and post-close preflight

R2.11 and v0.70.7 are different transactions:

```text
R2.11 = release-system validation inventory / non-runtime / CLOSED
v0.70.7 = plugin runtime observability / DESIGN ONLY
shared implementation transaction = FORBIDDEN
```

R2.11 closure explicitly preserved:

```text
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
production version = 0.70.6
latest.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
install.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
runtime mutation = NONE
```

The exact deployed v0.70.6 source owner used by this design was re-read after R2.11 closure and remained unchanged.

Disposition:

```text
POST_R2_11_PRODUCTION_IDENTITY = MATCH
POST_R2_11_RUNTIME_SOURCE = UNCHANGED
POST_R2_11_V07007_DESIGN_CONTRADICTION = NONE
POST_R2_11_SOURCE_PREFLIGHT = PASS
```

This design freeze still does **not** itself grant implementation authorization.

## 4. Live evidence selecting this problem

The output-storage watch has recurred across real long-chat evidence while correctness remained healthy.

Recent v0.70.6 accepted controls included output-storage observations around:

```text
595 ms
2.148 s
1.775 s
```

Earlier accepted evidence also preserved an `OUT_STORAGE` hotspot around `1.756 s` and roughly 90% of output-handler time in that sample.

These observations are not treated as a correctness bug. Accepted controls retained normal stability/binding/continuity/frame behavior and no new storage-corruption evidence.

Disposition:

```text
symptom = REPEATED
correctness failure = NONE OBSERVED
performance impact = MATERIAL IN SOME TURNS
runtime candidate = YES
optimization authority = NOT YET
```

## 5. Exact deployed-source owner audit

The deployed v0.70.6 Store path is structurally:

```js
const payload = JSON.stringify(state);
metric.serializeMs = ...;
await this.b.set(this._k(phase, index), payload);
metric.setMs = ...;
```

The Host adapter binds:

```js
set: (k, v) => Risuai.pluginStorage.setItem(k, v)
```

The ordinary authoritative output commit performs:

```js
await this.store.save('out', outIndex, result.state, { prune: false, metric: outMetric });
detail.outSerializeMs = outMetric.serializeMs;
detail.outSetMs = outMetric.setMs;
detail.outPruneMs = 0;
```

The output hotspot classifier maps:

```text
OUT_SERIALIZE = detail.outSerializeMs
OUT_STORAGE   = detail.outSetMs
```

Therefore the existing `OUT_STORAGE` value is not a residual or inferred wall-clock gap. It is the exact awaited backend set span for the authoritative `out` snapshot, ultimately delegated to `Risuai.pluginStorage.setItem`.

### What is still missing

The same Store method already owns the exact serialized string before `setItem`, but ordinary `save()` metrics currently expose only:

```text
serializeMs
setMs
pruneMs
```

`saveTurn()` already demonstrates the safe pattern of recording `payload.length` from its existing serialized string. Ordinary `save()` does not yet expose the equivalent payload-character count.

So current evidence can say:

```text
pluginStorage.setItem was slow
```

but cannot yet say whether:

```text
large output snapshot -> proportionally slower set
```

or:

```text
similar-size output snapshots -> highly variable set latency
```

## 6. Design goal

Add exact, zero-extra-I/O payload-size attribution to the existing output snapshot set measurement.

Target diagnostic model:

```text
output snapshot payload chars
+ existing OUT_SERIALIZE ms
+ existing OUT_STORAGE / set ms
+ derived set ms per 1K chars
+ exact API owner label
= bounded output snapshot set-cost evidence
```

The release must not change the authoritative timing envelope. Existing `outSetMs` remains authoritative for `OUT_STORAGE`.

## 7. Frozen implementation shape

### 7.1 Store metric extension

In `SnapshotStore.save()` only, reuse the already-created serialized string:

```js
const payload = JSON.stringify(state);
```

and, when a metric object exists, add:

```text
metric.payloadChars = payload.length
```

This must be a direct `.length` read on the existing string.

Forbidden for this metric:

```text
second JSON.stringify
TextEncoder
Blob
UTF-8 byte scan
compression pass
hash pass
storage read
key scan
```

Character length is intentionally the metric, matching the established v0.63.32 snapshot-cost attribution precedent.

### 7.2 Ordinary output propagation

The `processOutput()` performance detail may add exactly the bounded field:

```text
outPayloadChars
```

It is populated from the same `outMetric.payloadChars` produced by the authoritative output `store.save('out', ...)` call.

The existing fields remain unchanged:

```text
outSerializeMs
outSetMs
outPruneMs
```

`OUT_STORAGE` continues to equal `outSetMs` exactly.

### 7.3 Pure derived ratio

Diagnostics may derive:

```text
outSetMsPer1kChars
```

as a pure presentation/accounting value only when:

```text
payloadChars > 0
setMs is finite and non-negative
```

Recommended formula:

```text
setMs / (payloadChars / 1000)
```

If inputs are unavailable/invalid, render `n/a`; do not invent zero or infinity.

No persistent state stores this ratio.

### 7.4 Diagnostic line

Add one bounded copied-diagnostic line adjacent to output performance attribution, conceptually:

```text
Output snapshot set: <chars> chars · serialize <ms> · set <ms> · <ms/1K chars> · API PLUGIN_STORAGE_SET_ITEM · prune INLINE_DISABLED · confidence EXACT
```

Exact wording may be adjusted during implementation if existing diagnostic conventions require it, but the semantic fields are frozen:

```text
payload chars
serialize ms
set ms
normalized set cost
API owner
inline prune disposition
confidence
```

This line must contain no raw state body, storage key, user content, assistant content, prompt text, or exception message.

## 8. Why v0.70.7 does not optimize yet

The current code already proves the slow leaf is the host storage set span, but not its causal mechanism.

Unsafe premature responses would include:

```text
stop awaiting the authoritative out save
move the out save off-path
compress/change the snapshot format
drop state fields
replace pluginStorage
batch multiple out saves
add a cache/index
skip ordinary output persistence
```

Those changes can affect durability, reload recovery, edit reconciliation, bounded retention, or host compatibility.

The required evidence question comes first:

```text
Is set cost materially size-correlated, or is similar-size set latency highly variable?
```

Only after that answer exists may a later optimization design select a mechanism.

## 9. Frozen semantics and side-effect boundary

v0.70.7 must preserve:

```text
SnapshotStore key format
out snapshot payload bytes for identical state
JSON serialization content/order
awaited authoritative out save
ordinary output save count
pluginStorage.setItem call count/order
inline output prune=false behavior
deferred Store housekeeping/retention authority
keepN policy and retention thresholds
manual-edit USER_EDIT_CANDIDATE semantics
MANUAL_EDIT_REBUILT semantics
v0.70.6 SAME_OUT_KEY_OVERWRITE prune elision
Representation fast paths
Deferred Mirror scheduling and gates
runtime telemetry checkpoint order
persistent state/schema versions
Core / Prompt / Community / Frame / Time / Continuity semantics
provider cache = UNVERIFIED
```

No new:

```text
await
yield
timer
polling
network call
pluginStorage operation
chat write
history mutation
storage key
persistent schema field
background worker
retry loop
```

is authorized.

## 10. Module / ownership boundary

Preferred implementation touches only existing owners:

```text
Store
  expose payloadChars on the existing metric object

Session / output performance plumbing
  propagate outPayloadChars from the authoritative out save

OPS / diagnostics
  derive bounded normalized cost and render one line
```

No new runtime module is justified.

No new require/import edge is justified.

If implementation would require storage-format or state-semantic changes, stop and revise the design instead of widening scope.

## 11. Static and permanent validation contract

Implementation qualification must prove at minimum:

```text
latest.js == install.js
metadata/runtime/host identity == 0.70.7
parent production identity == exact v0.70.6 production
syntax PASS
Contracts v2 PASS
persistent schema versions unchanged
PROMPT_COMPILER_VERSION unchanged
COMMUNITY_CLASSIFIER_VERSION unchanged
```

### Exact Store assertions

Permanent regression must prove:

```text
SnapshotStore.save still performs exactly one JSON.stringify for the saved state
payloadChars comes from the already-created payload.length
SnapshotStore.save still performs exactly one backend set
backend set remains awaited
out save key remains phase 'out' / same key format
ordinary processOutput out save still uses prune:false
OUT_STORAGE remains outSetMs
outPayloadChars equals the actual serialized payload character length
invalid/zero payload ratio input renders unresolved/n/a rather than false zero
```

### Protected side-effect parity

Candidate-equal-to-parent call counts must remain frozen for relevant surfaces, including:

```text
pluginStorage.setItem
pluginStorage.getItem
pluginStorage.removeItem
pluginStorage.keys
setChatToIndex
getChatFromIndex
setTimeout
setInterval
fetch
XMLHttpRequest
history.splice
messages.splice
```

No side-effect increase is authorized by attribution.

## 12. Deterministic fixture contract

A bounded Store/output-performance fixture should cover:

```text
normal state -> payloadChars equals existing serialized string length
zero/empty-like valid object -> positive JSON payload chars
serialize/set metrics remain non-negative
out payload propagation -> exact integer chars
ratio calculation -> finite non-negative when eligible
ratio calculation -> n/a/unresolved on invalid inputs
one stringify / one set invariant
prune:false output path -> prune contribution 0
```

The fixture must not depend on real host storage latency to pass.

## 13. Real long-chat validation protocol

After future publication, collect ordinary natural output samples. Do not manufacture artificial storage pressure.

Required minimum matrix:

### Stage A — fresh runtime ordinary output

Capture one accepted ordinary long-chat output after a fresh runtime generation.

Required:

```text
Output hotspot / output breakdown present
Output snapshot set line present
payload chars > 0
serialize ms finite
set ms finite
normalized set cost finite when payload chars > 0
API owner = PLUGIN_STORAGE_SET_ITEM
inline output prune = disabled / 0
warnings = 0 on accepted control
continuity/frame/binding normal
```

### Stage B — same-generation ordinary output

Send the next natural request in the same runtime generation and capture the same fields.

### Stage C — independent fresh runtime ordinary output

Create a second fresh runtime generation and capture one more accepted ordinary output.

A natural reroll or genuine manual-edit turn may be retained as supplemental evidence, but neither is required to force this release's acceptance.

## 14. Post-live evidence classification

v0.70.7 does not need to prove an optimization. It needs to make the next decision evidence-based.

### `SIZE_CORRELATED_CANDIDATE`

Use only when the accepted sample set contains meaningful payload-size variation and larger payloads repeatedly track with larger set cost strongly enough that payload size remains a plausible dominant factor.

This verdict authorizes only a later **payload-shape/size optimization design investigation**. It does not itself authorize compression or state removal.

### `SIMILAR_SIZE_HIGH_VARIANCE`

Use when accepted samples with materially similar payload character counts show substantially different set latency.

This means payload size alone is insufficient to explain the watch. Because the exact measured span is `pluginStorage.setItem`, the next disposition should favor host/backend variance analysis or DEFER rather than speculative state trimming.

### `MIXED_OR_UNRESOLVED`

Use when samples disagree, payload-size spread is too small, or evidence is insufficient to distinguish the two cases.

Result:

```text
WATCH preserved
no speculative optimization
```

No automatic numeric threshold is promoted to runtime truth by this design. The evidence record must preserve raw bounded values and the human terminal classification.

## 15. Success conditions

v0.70.7 succeeds when:

1. the existing exact `OUT_STORAGE` span is preserved unchanged;
2. every accepted output can report the exact serialized output-snapshot character count with zero additional serialization/I/O;
3. normalized set cost is derived purely and fail-closed;
4. output/storage/state/edit/mirror/retention semantics remain unchanged;
5. at least the Stage A/B/C live matrix is collected after publication;
6. the terminal evidence classifies the watch as `SIZE_CORRELATED_CANDIDATE`, `SIMILAR_SIZE_HIGH_VARIANCE`, or `MIXED_OR_UNRESOLVED` without inventing provider-cache or host-internal claims.

A performance improvement is **not** an acceptance criterion for this attribution release.

## 16. Explicit non-goals

Do not fold any of the following into v0.70.7:

```text
R2.11 release-system implementation
provider/cache optimization
PRE_SIMCORE / CHAT_HISTORY prefix work
manual-edit optimization beyond already-shipped v0.70.6
snapshot compression
state schema redesign
retention redesign
mirror redesign
Community/Prompt/Time/Frame semantic repair
3M feature work
new storage backend
host API replacement
```

## 17. Tooling-call anomaly preservation

During design registration, three premature `create-pull-request` calls were issued before the intended design branch existed. GitHub rejected all three with HTTP 422 `head invalid`, so no PR or repository mutation resulted.

A separate accidental temporary issue was then created and immediately closed as duplicate #1525.

Classification:

```text
FIX · TOOLING_CALL_MISROUTE · NON_RUNTIME · PRODUCTION_UNCHANGED
```

Canonical design work item is #1524.

These connector mistakes do not change design/runtime/release authority.

## 18. Concurrent-main handling

The first design commit was created from pre-R2.11-close main while #1523/#1526 were completing.

When the design PR observed main had advanced to the R2.11 closure commit, the stale work-branch head was not merged. The design branch was reset onto exact current main and this document was re-created from that fresh base with the R2.11 closure reflected explicitly.

Disposition:

```text
CONCURRENT_MAIN_ADVANCE = REOBSERVED
R2_11_RESULT = INCORPORATED AS PREDECESSOR AUTHORITY
DESIGN/R2_11 SOURCE MIXING = NO
STALE_HEAD_MERGE = NO
```

## 19. Implementation boundary

Current state after this design freeze:

```text
V07007_DESIGN = FROZEN
V07007_VERSION = RESERVED
POST_R2_11_SOURCE_PREFLIGHT = PASS
V07007_IMPLEMENTATION = NOT STARTED
V07007_IMPLEMENTATION_AUTHORIZATION = NOT GRANTED BY THIS DESIGN
release-simcore mutation = NONE
production mutation = NONE
```

The next legal v0.70.7 step, if separately authorized, is:

```text
fresh authority readback immediately before mutation
-> dedicated v0.70.7 implementation branch
-> implement only the frozen attribution scope
```

This document intentionally stops before runtime implementation authorization.
