# SimCore v0.70.10 Host-Local Telemetry Set Cost Attribution Design

Date: 2026-09-06 KST
Status: **DESIGN FROZEN · VERSION RESERVED · SOURCE PREFLIGHT PASS · IMPLEMENTATION NOT AUTHORIZED**
Classification: **RUNTIME OBSERVABILITY MINI · HOST-LOCAL TELEMETRY CHECKPOINT COST ATTRIBUTION · NO TRANSPORT SEMANTIC CHANGE**
Design work item: `#1635`
Primary evidence owner: `#1588`

## 1. Decision

Freeze the next SimCore runtime patch design as:

```text
Version: 0.70.10
Release: Host-Local Telemetry Set Cost Attribution
Parent production: v0.70.9 Inline Planning Marker Hygiene Guard
Runtime authority when published: release-simcore
Design/evidence authority: main
```

The selected problem is the preserved intermittent performance watch:

```text
#1588 · HOST_LOCAL_CHECKPOINT_LATENCY
```

This release is **observability only**. It does not detach, defer, skip, batch, rate-limit, or otherwise optimize the Host-local telemetry checkpoint.

The exact question is narrower:

```text
When OUTPUT_COMMIT Host-local telemetry is slow,
is the delay in Host-store acquisition/promise resolution,
in the actual Host-local setItem operation,
or still mixed/unresolved?
```

The existing total Host-local elapsed metric cannot answer that because it currently starts before Host-store acquisition and ends only after the real `setItem` attempt.

v0.70.10 therefore splits the already-existing Host-local checkpoint span into exact bounded sub-spans without adding another Host operation.

## 2. Fresh authority and version reservation

Fresh authority at design start:

```text
main = af6f6fe6ca44be2ca03d4664d3ca9024da77d961
production = 0.70.9 Inline Planning Marker Hygiene Guard
validation = LIVE_PASS
current priority = POST_07009_NEXT_STEP_REVIEW
major checkpoint = M2-6
release-simcore = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
production blob = dc82006c468ebef76fa0126e0533dda245bd222d
latest.js == install.js = VERIFIED
provider cache = UNVERIFIED
```

Repository search found no existing `0.70.10` reservation or published authority.

Accordingly:

```text
V07010_VERSION = RESERVED BY THIS DESIGN
V07010_IMPLEMENTATION = NOT STARTED
```

The manifest remains on `POST_07009_NEXT_STEP_REVIEW` during this design-only transaction. A later implementation authorization may promote the operational priority separately.

## 3. Why #1588 is selected before the other performance WATCH lanes

The post-v0.70.9 review retains several performance observations, notably:

```text
#1556 repeat-send pre-snapshot READ HIT latency recurrence
#1587 output snapshot set similar-size high variance recurrence
#1588 Host-local telemetry OUTPUT_COMMIT latency spike
```

### #1556

The correctness path is healthy and the expensive operation is a storage read. Current evidence does not identify a safe SimCore-owned mechanism that reduces that Host/storage read cost without changing repeat-send snapshot semantics.

Disposition:

```text
WATCH retained
optimization mechanism = NOT SOURCE-PROVEN
```

### #1587

v0.70.7/v0.70.8 already established that similar-size output snapshots can have large `pluginStorage.setItem` variance. Payload size alone is not a sufficient dominant explanation, and current evidence does not identify the Host/backend internal cause.

Disposition:

```text
WATCH retained
similar-size high variance = SUPPORTED
speculative state trimming/compression = NOT AUTHORIZED
```

### #1588

The v0.70.8 output-side specimen has exact numerical closure:

```text
Output handler other = 6.338 s
Telemetry checkpoint host = 6.337 s
Telemetry checkpoint total = 6.337 s
trigger = OUTPUT_COMMIT
HOST_LOCAL WRITTEN
```

v0.70.9 then supplied a useful non-recurrence control in one generation:

```text
Host-local checkpoint totals ~=
182 ms
47 ms
51 ms
55 ms
67 ms
```

All remained correctness-PASS and `HOST_LOCAL WRITTEN`.

Therefore #1588 is not yet an optimization authorization. It is, however, the strongest candidate for one more zero-extra-I/O attribution step because current source visibly conflates two separately measurable operations inside the already-attributed Host-local total.

## 4. Existing durability contract that must not be weakened

The Host-local telemetry fallback was introduced to preserve the bounded telemetry handoff when browser `sessionStorage` is unavailable.

Frozen transport order:

```text
MEMORY
-> browser SESSION
-> HOST_LOCAL only when SESSION did not write
```

Frozen Host-local mailbox contract:

```text
one SimCore-owned Host-local key
metadata-only capsule
10-minute maximum age
16,384-character whole-capsule maximum
exact location guard
consume-before-adopt for matching location
foreign location is non-destructive
no retry / polling / queue / key scan
provider cache = UNVERIFIED
```

The existing OUTPUT_COMMIT durability boundary is intentionally:

```text
CoreRulesetSession.processOutput returned active
AND runtime generation is still current
AND location key is known
-> await checkpointRuntimeTelemetry('OUTPUT_COMMIT')
```

Historical design explicitly made the Host-local `setItem` awaited after authoritative Core output success so a copied Last Turn Diagnostic can report completed `HOST_LOCAL WRITTEN` before an operator refresh episode.

Therefore v0.70.10 must **not** respond to one latency spike by changing this to detached/fire-and-forget work.

## 5. Exact deployed-source owner audit

The deployed v0.70.9 runtime still gates the checkpoint after active output success:

```js
if (runtimeIsCurrent() && String(coreKey || coreLocationKey || '')) {
  await checkpointRuntimeTelemetry('OUTPUT_COMMIT');
}
```

For OUTPUT_COMMIT, the checkpoint delegates to the Host-local-aware publisher:

```js
await runtimeTelemetryRules.publishWithHostLocal(
  globalThis,
  typeof window !== 'undefined' ? window : null,
  Risuai,
  capsule,
);
```

The current `publishWithHostLocal()` Host path is structurally:

```js
const startedAt = Date.now();
const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
if (acquired.status === 'USABLE') {
  try {
    await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
    hostLocal = 'WRITTEN';
  } catch (_) {
    hostLocal = 'FAILED';
  }
} else {
  hostLocal = 'UNAVAILABLE';
}
hostElapsedMs = Math.max(0, Date.now() - startedAt);
```

Thus the existing `hostElapsedMs` includes:

```text
Host-store lazy promise acquisition/reuse resolution
+ small synchronous control overhead
+ real Host-local setItem attempt when usable
```

It does **not** currently expose those components separately.

The checkpoint probe already carries the existing serialized capsule character count, so v0.70.10 does not need another serialization or payload measurement pass.

## 6. Design goal

Add exact, zero-extra-Host-I/O cost decomposition to the existing Host-local checkpoint measurement.

Target accounting model:

```text
existing host total ms
= acquire/reuse-resolution ms
+ Host-local setItem ms
+ bounded synchronous residual

existing serialized chars
+ setItem ms
-> pure set ms per 1K chars
```

The total `hostElapsedMs` remains the authoritative outer Host-local timing span.

The new fields are attribution only.

## 7. Frozen implementation shape

### 7.1 Runtime-telemetry metric extension

Inside the existing `publishWithHostLocal()` Host-eligible branch only, introduce bounded timing fields:

```text
hostAcquireMs
hostSetMs
```

Timing boundaries:

```text
hostAcquireMs
= time spent awaiting/resolving getHostLocalTelemetryStoreOnce(hostApi)

hostSetMs
= time spent awaiting the actual acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded)
```

No second acquisition call and no second set call may be introduced.

The implementation should reuse timestamp boundaries so the existing total remains enclosing and the decomposition can be checked without pretending sub-millisecond precision.

### 7.2 Non-attempted paths

The new fields must be explicit zero on branches where the relevant operation did not occur.

Examples:

```text
SESSION WRITTEN -> HOST_LOCAL NOT_NEEDED
  hostAcquireMs = 0
  hostSetMs = 0

prepared OVERSIZE / invalid
  hostAcquireMs = 0
  hostSetMs = 0

Host acquisition resolves non-USABLE
  hostAcquireMs = measured
  hostSetMs = 0

Host set throws/rejects
  hostAcquireMs = measured
  hostSetMs = measured failed attempt
  hostLocal = FAILED unchanged
```

A failed real set is still useful cost evidence and must not be rendered as zero merely because durability failed.

### 7.3 Existing total preserved

Preserve:

```text
hostElapsedMs
```

with the same enclosing semantic meaning as today.

Diagnostics may derive a pure residual:

```text
hostResidualMs = max(0, hostElapsedMs - hostAcquireMs - hostSetMs)
```

This residual is accounting only. It is not a new runtime timer span or a new Host operation.

If coarse clock rounding prevents exact arithmetic closure, diagnostics must report bounded/rounding residual rather than forcing a false exact zero.

### 7.4 Existing serialized size reused

Reuse the already-available checkpoint field:

```text
serializedChars
```

No new:

```text
JSON.stringify
TextEncoder
Blob
hash
compression
payload scan
storage read
```

is authorized.

### 7.5 Pure normalized set cost

Diagnostics may derive:

```text
hostSetMsPer1kChars
```

only when:

```text
hostSetMs is finite and non-negative
serializedChars > 0
real Host set attempt occurred
```

Recommended formula:

```text
hostSetMs / (serializedChars / 1000)
```

If inputs are unavailable or the Host set was not attempted, render `n/a`.

### 7.6 Diagnostic surface

Add one bounded copied-diagnostic line adjacent to the existing telemetry checkpoint line, conceptually:

```text
Telemetry host cost: <chars> chars · acquire <ms> · set <ms> · total <ms> · residual <ms> · <ms/1K chars> · API RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM · confidence EXACT/BOUNDED
```

Exact prose may follow existing diagnostic conventions, but the semantic fields are frozen:

```text
serialized capsule chars
Host acquire/reuse-resolution ms
Host setItem ms
existing Host total ms
bounded residual
normalized Host set cost
exact API owner label
confidence
```

The line must expose no key value, raw capsule, user/assistant body, prompt text, Host object, URL, device identity, or exception text.

## 8. Why v0.70.10 does not optimize yet

The v0.70.8 6.337-second Host sample is material, but v0.70.9 did not reproduce it and instead showed five bounded samples between roughly 47 and 182 ms.

Current evidence therefore supports:

```text
INTERMITTENT HOST-LOCAL CHECKPOINT VARIANCE = YES
CORRECTNESS FAILURE = NO
EXACT SLOW SUB-OPERATION = NOT YET PROVEN
```

Unsafe premature responses include:

```text
remove await from OUTPUT_COMMIT
fire-and-forget Host setItem
skip Host durability on ordinary output
move checkpoint before authoritative output success
rate-limit or debounce durable handoff
batch/coalesce output checkpoints
change Host-local key/schema/TTL
change transport order
replace Host storage API
add retry/polling/background queue
```

All can alter reload continuity, diagnostics, stale-runtime behavior, or Host compatibility.

v0.70.10 asks the narrower causal question first.

## 9. Frozen semantics and side-effect boundary

v0.70.10 must preserve:

```text
OUTPUT_COMMIT remains awaited
checkpoint occurs only after authoritative active output success
runtime-current guard
location-key guard
MEMORY -> SESSION -> HOST_LOCAL order
Host-local fallback eligibility
one Host-local key
single lazy Host-store acquisition promise
single boot mailbox read/consume behavior
matching-location consume-before-adopt
foreign-location non-destructive behavior
10-minute TTL
16,384-char whole capsule cap
bounded telemetry capsule format/content
UNLOAD v0.69.1 behavior
Host write success/failure dispositions
output COMMITTED semantics
runtime disposal/stale-work safety
persistent state/schema versions
Prompt / Community / Frame / Time / Continuity / Representation / Edit Reconcile semantics
provider cache = UNVERIFIED
```

No new:

```text
Host read
Host write
storage key
await/yield boundary
setTimeout / setInterval
network request
retry
polling
queue
background worker
chat write
history mutation
persistent schema field
raw-body retention
```

is authorized.

Additional clock reads used only to decompose the already-existing awaited Host span are permitted.

## 10. Module and ownership boundary

Preferred implementation touches only existing owners:

```text
runtime-telemetry
  split existing Host total into acquire + set timing metadata

outer checkpoint probe / OPS diagnostics
  propagate bounded fields and render one diagnostic line
```

No new runtime module is justified.

No new Host transport owner is justified.

No new require/import edge should be necessary.

If implementation requires changing the telemetry capsule schema, Host-local mailbox semantics, output commit ordering, or release-system machinery, stop and revise the design rather than widening scope.

## 11. Static and permanent validation contract

Implementation qualification must prove at minimum:

```text
latest.js == install.js
metadata/runtime/host identity == 0.70.10
parent production identity == exact v0.70.9 production
syntax PASS
Contracts v2 PASS
profile-driven validation PASS
persistent semantic schema versions unchanged
PROMPT_COMPILER_VERSION unchanged
COMMUNITY_CLASSIFIER_VERSION unchanged
```

### Host-local exact assertions

Permanent regression must prove:

```text
OUTPUT_COMMIT checkpoint call count unchanged
OUTPUT_COMMIT checkpoint remains awaited
publishWithHostLocal call count/order unchanged
getLocalPluginStorage acquisition attempt count unchanged
Host-local setItem attempt count unchanged
Host-local mailbox key unchanged
Host-local TTL and size cap unchanged
SESSION WRITTEN still avoids Host acquisition/set
OVERSIZE still avoids Host acquisition/set
UNAVAILABLE acquisition records acquire cost and zero set cost
WRITTEN records both eligible costs
FAILED set records measured set attempt and keeps FAILED disposition
hostElapsedMs remains enclosing total
serializedChars remains the existing payload measurement
normalized set cost is pure derived accounting only
```

### Protected side-effect parity

Candidate-equal-to-parent counts/order must remain frozen for relevant surfaces including:

```text
Risuai.getLocalPluginStorage
store.getItem
store.setItem
store.removeItem
pluginStorage.getItem
pluginStorage.setItem
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

No I/O increase is authorized by attribution.

## 12. Deterministic fixture contract

Deterministic regression should cover at least:

```text
SESSION WRITTEN -> hostAcquireMs 0 / hostSetMs 0
Host API/store unavailable -> acquire span only / set 0
Host WRITTEN -> acquire + set spans non-negative / total enclosing
Host set failure -> set span still measured / disposition FAILED
OVERSIZE -> no Host timing attempt
serializedChars reused unchanged
ms-per-1K finite only for eligible real set attempts
invalid/zero chars -> n/a rather than false zero/infinity
coarse-clock residual -> bounded, never negative fabricated attribution
```

Tests must not depend on real Host latency. A deterministic clock or controlled promise boundary may be used by the fixture without introducing runtime timers.

## 13. Real long-chat validation protocol

After future publication, collect natural ordinary outputs. Do not manufacture storage pressure or rapidly refresh solely to force a spike.

### Stage A — fresh runtime first accepted ordinary output

Capture:

```text
Telemetry checkpoint line
Telemetry host cost line
serialized chars
host acquire ms
host set ms
host total ms
residual/confidence
HOST_LOCAL disposition
output committed/stability/warnings
```

This stage is useful for seeing whether fresh-runtime acquisition contributes materially.

### Stage B — same-generation warm ordinary outputs

Collect at least three subsequent natural accepted outputs in the same runtime generation.

This is the primary control for a memoized/reused Host store where acquisition should normally be small and any large Host total can be localized to the set or residual span.

### Stage C — independent fresh runtime ordinary output

Capture at least one accepted ordinary output in a separate fresh runtime generation.

A natural reroll/manual-edit may be preserved as supplemental evidence but is not required for v0.70.10 acceptance.

## 14. Post-live evidence classification

v0.70.10 succeeds by making the next decision evidence-based, not by reducing latency.

### `HOST_SET_DOMINANT_CANDIDATE`

Use only when one or more materially slow Host checkpoints are observed and the actual `setItem` span accounts for the dominant portion of the Host total.

This may authorize a later **Host-set/output-critical-path optimization design investigation**.

It does not itself authorize detaching the write, changing durability cadence, or changing transport.

### `HOST_ACQUIRE_DOMINANT_CANDIDATE`

Use only when a materially slow Host checkpoint is dominated by the `getHostLocalTelemetryStoreOnce()` await/resolution span.

This may authorize a later **Host-store acquisition/lifecycle investigation**.

It does not itself authorize eager/background acquisition.

### `NO_SPIKE_REPRODUCED`

Use when the required matrix is healthy and no material slow Host sample recurs.

Result:

```text
#1588 remains WATCH / intermittent
instrumentation acceptance may still PASS
no optimization mechanism promoted
```

### `MIXED_OR_UNRESOLVED`

Use when slow samples do not localize cleanly, residual/clock granularity is material, or the accepted matrix is insufficient.

Result:

```text
WATCH preserved
no speculative optimization
```

No automatic dominance percentage is promoted to runtime truth by this design. Preserve raw bounded values and make the terminal classification from the coherent specimen set.

## 15. Success conditions

v0.70.10 succeeds when:

1. the existing awaited OUTPUT_COMMIT Host-local durability path is byte-semantically preserved;
2. the existing `hostElapsedMs` total remains authoritative;
3. every eligible Host checkpoint can report exact/bounded acquire and set sub-spans without additional Host I/O;
4. the existing serialized capsule char count is reused without another serialization pass;
5. set-ms-per-1K is pure and fail-closed;
6. Host/mailbox/reload/output/persistent semantics remain unchanged;
7. Stage A/B/C natural live evidence is collected after publication;
8. the terminal evidence classifies #1588 as `HOST_SET_DOMINANT_CANDIDATE`, `HOST_ACQUIRE_DOMINANT_CANDIDATE`, `NO_SPIKE_REPRODUCED`, or `MIXED_OR_UNRESOLVED` without inventing Host-internal/provider-cache causes.

A performance improvement is **not** an acceptance criterion for this attribution release.

## 16. Explicit non-goals

Do not fold any of the following into v0.70.10:

```text
#1556 repeat-send pre-snapshot read optimization
#1587 output snapshot/pluginStorage optimization
provider cache investigation
fire-and-forget telemetry
Host-local write cadence/coalescing
telemetry schema/key/TTL redesign
runtime unload/update redesign
snapshot compression/state trimming
Prompt/Community/Time/Frame semantics
Representation/Edit Reconcile changes
release-system/repository-system restructuring
```

Each remains a separate evidence lane.

## 17. Implementation boundary

Current state after this design freeze:

```text
V07010_DESIGN = FROZEN
V07010_VERSION = RESERVED
V07010_SOURCE_PREFLIGHT = PASS
V07010_IMPLEMENTATION = NOT STARTED
V07010_IMPLEMENTATION_AUTHORIZATION = NOT GRANTED BY THIS DESIGN
release-simcore mutation = NONE
production mutation = NONE
```

The next legal v0.70.10 step, if separately authorized, is:

```text
fresh main + release-simcore authority readback
-> dedicated v0.70.10 runtime implementation branch
-> implement only acquire/set cost attribution
-> keep latest.js == install.js
-> static/permanent CI
-> release-simcore publication through the existing release authority
-> real long-chat Stage A/B/C
-> main evidence/long-memory synchronization
```

This design intentionally stops before runtime implementation authorization.
