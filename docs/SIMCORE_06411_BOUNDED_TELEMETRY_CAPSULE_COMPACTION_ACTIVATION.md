# SimCore v0.64.11 — Bounded Telemetry Capsule Compaction

Date: 2026-08-28 KST
Status: **DESIGN FROZEN · RUNTIME CHANGE · NOT IMPLEMENTED · NO RELEASE MUTATION IN THIS TRANSACTION**
Target version: `0.64.11`
Release name: `Bounded Telemetry Capsule Compaction`
Parent production: `v0.64.10 — Host-Local One-Shot Telemetry Handoff`
Parent production commit: `e43ace74241984f21f69299eff690d0c4f483381`
Trigger evidence: `docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md`
Required live gate after publication: `06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Major checkpoint: `M2-2` unchanged
M2-3: **FROZEN until this live gate closes**
Provider cache: **UNVERIFIED**

---

## 1. Trigger and exact problem statement

v0.64.10 proved a new fact in the real long-chat host:

```text
Session surface:
WINDOW ACCESS_ERROR
GLOBAL_THIS ACCESS_ERROR
relation NONE

Host-local transport:
API PRESENT
store USABLE
clear REMOVE
boot EMPTY
```

The Host-local capability itself therefore reached a usable live state.

However, three consecutive natural checkpoints in one production generation failed before the Host-local `setItem` boundary:

```text
44,660 chars -> HOST_LOCAL OVERSIZE
40,291 chars -> HOST_LOCAL OVERSIZE
59,965 chars -> HOST_LOCAL OVERSIZE
```

The frozen telemetry maximum remains:

```text
MAX_SERIALIZED_CHARS = 16,384
```

The failure classification is therefore:

```text
06410_REAL_EXPORT_CAPSULE_SIZE_GAP
= FIX
= RUNTIME_TELEMETRY_EXPORT_SHAPE
= LIVE_GATE_BLOCKING
= HOST_SURFACE_PROVEN
= HOST_WRITE_NOT_REACHED
= TEST_COVERAGE_GAP_CONFIRMED
```

This is **not** evidence that the Host-local store is too small.

The real Host-local write was never reached because common capsule serialization rejected the payload first.

---

## 2. Source audit boundary

The v0.64.10 checkpoint currently captures three observer exports:

```text
runtimePromptCache.exportState()
requestTopology.exportState()
cacheCandidates.exportState()
```

The source audit proves that at least two serialized shapes are unbounded relative to the frozen 16,384-character handoff contract.

### 2.1 Runtime-prompt cache sketch

The current runtime-prompt sketch keeps one rolling prefix hash per prompt character:

```text
prefixHashes = new Array(value.length)
```

That is useful for in-generation exact prefix localization but becomes JSON-expensive when serialized for reload handoff.

### 2.2 Host-prefix/system0 sketch

The current request-topology state keeps system0 hashes for every 512-character block from both the head and tail:

```text
headBlocks = every 512-char block from start
tailBlocks = every 512-char block from end
```

A real host system0 around hundreds of thousands of characters therefore creates a large serialized metadata array even though no raw body is retained.

### 2.3 Request signatures

The previous request signature list is also linear in the request message count.

It was not proven to be the dominant contributor in the v0.64.10 specimens, so this design does not assign an unsupported byte percentage to it. It is nevertheless included in the handoff-specific bounding contract because a durable capsule must not become unbounded as chat length grows.

### 2.4 Cache trajectory

`cacheCandidates` already retains a fixed trajectory window (`WINDOW = 3`) and is not identified as the main size defect.

Its semantics remain frozen except for one bounded-reobserve guard described later.

---

## 3. Central repair rule

v0.64.11 MUST NOT solve the failure by increasing the 16,384-character limit.

The repair is:

```text
KEEP precise in-generation observers
+
ADD dedicated compact handoff exports/imports
+
KEEP whole-capsule 16,384 hard cap
+
MAKE post-reload reduced precision explicit when exact reconstruction is impossible
```

Central invariant:

> **Normal runtime precision remains local and rich; cross-reload telemetry becomes deliberately compact, bounded, and truthfully precision-labeled.**

---

## 4. Frozen non-goals

v0.64.11 does NOT authorize:

- a larger persistent capsule limit,
- raw runtime prompt persistence,
- raw user or assistant body persistence,
- raw system0/host-prefix persistence,
- full chat-history persistence,
- Core semantic snapshot persistence through telemetry,
- provider cache inference,
- network transport,
- localStorage,
- IndexedDB,
- timers, polling, queues, backoff, or background writers,
- a second Host-local mailbox key,
- change to `MEMORY -> SESSION -> HOST_LOCAL` transport priority,
- change to the 10-minute age rule,
- change to exact location matching,
- change to consume-before-adopt Host-local semantics,
- change to Representation/Edit/Recovery/Broadcast/Frame/Time/Evidence/Lineage/Handoff/Recurrence/Summary/Structure/COMMUNITY/Reaction semantics,
- M2-3 ownership extraction.

---

## 5. Dedicated handoff API

The ordinary observer state and the durable handoff state become separate concepts.

### 5.1 Runtime prompt cache

Add dedicated methods conceptually equivalent to:

```text
exportHandoffState()
importHandoffState()
```

The existing in-memory `previousText` and precise `cacheSketch()` remain unchanged during the same runtime generation.

The normal request path therefore keeps the current exact in-generation behavior.

### 5.2 Request topology

Add dedicated methods conceptually equivalent to:

```text
exportHandoffState()
importHandoffState()
```

The full in-memory previous signature list and full in-generation system0 sketch remain unchanged while the runtime is alive.

### 5.3 Cache trajectory

The existing bounded `cacheCandidates.exportState()/importState()` may remain the durable representation, subject to the whole-capsule component budget and the first-post-reload precision guard below.

### 5.4 Checkpoint boundary

`checkpointRuntimeTelemetry()` must use only the dedicated handoff exports for the two previously unbounded observers.

It must not serialize the rich in-generation state accidentally.

---

## 6. Frozen serialized budget

The existing hard cap remains authoritative:

```text
MAX_SERIALIZED_CHARS = 16,384
```

v0.64.11 adds component budgets as engineering invariants:

```text
RUNTIME_PROMPT_HANDOFF_BUDGET = 4,096 chars
REQUEST_TOPOLOGY_HANDOFF_BUDGET = 6,144 chars
CACHE_TRAJECTORY_HANDOFF_BUDGET = 2,048 chars
ENVELOPE_AND_SLACK_RESERVE = 2,048 chars
```

These values are not permission to pad each component to its maximum.

They are hard upper bounds intended to leave whole-capsule headroom.

The final serialized capsule MUST still pass the existing common 16,384-character check.

The final whole-capsule check remains the authority even if every component individually reports within budget.

---

## 7. Runtime Prompt Handoff Sketch v2

The current per-character `prefixHashes` array MUST NOT be serialized into the reload capsule.

### 7.1 Handoff shape

The compact prompt handoff retains only bounded metadata needed for the first post-reload comparison:

```text
version
key
prompt chars
full prompt hash / existing bounded identity facts
line count
up to 64 leading line summaries
compiler-tier identity metadata already required by Runtime Identity
```

Each retained line summary contains bounded metadata only:

```text
line chars
fixed-size line hash
bounded reason/tier code
```

No raw line text is retained.

### 7.2 Maximum retained prompt lines

```text
MAX_HANDOFF_PROMPT_LINES = 64
```

The present real runtime prompts are within this order of magnitude, but 64 is a hard contract, not an assumption that future prompts can never be larger.

If the prior prompt has more than 64 lines, the export records the real total line count and marks that only the leading 64-line comparison surface is retained.

### 7.3 First post-reload comparison

If the compact prior prompt and current prompt have the same bounded full identity and character count, the observer may report stable equality under the same existing hash-based identity semantics.

If they differ, compare retained line summaries in order.

If the first differing line is inside the retained 64-line surface:

```text
precision = LINE_BOUND
common prefix chars = exact sum of complete equal lines only
first changed line = known
within-line changed char = not claimed
```

If all retained lines match but the full prompt identity differs after the retained surface:

```text
precision = PREFIX_FLOOR
common prefix = at least the retained complete-line chars
first exact changed line = UNRESOLVED_AFTER_RETAINED_PREFIX
```

### 7.4 Diagnostic truth rule

A handoff-derived line-floor result MUST NOT be rendered as an exact character prefix.

Example:

```text
Prompt prefix: >=35.1% · HANDOFF_LINE_FLOOR
```

not:

```text
Prompt prefix: 35.1%
```

unless exact in-generation text comparison is available.

### 7.5 Same-generation behavior

After the first post-reload natural request, the tracker again owns the full current runtime prompt in memory.

The next natural request therefore returns to the current exact same-generation comparison path.

---

## 8. Request Topology Handoff v3

The durable request-topology representation becomes a bounded prefix signature sketch rather than an unbounded previous-message export.

### 8.1 Signature prefix

Retain at most:

```text
MAX_HANDOFF_TOPOLOGY_SIGNATURES = 64
```

Each signature is encoded as a compact tuple equivalent to:

```text
(role, kind, chars, fixed-size hash)
```

Object-per-signature verbose JSON is not required in the durable form.

The export also retains bounded scalar facts:

```text
previous total message count
previous total chars
current-user index
runtime index
leading system-message count
request/family fingerprints needed by the existing observer
```

### 8.2 Exactness when previous request <=64 messages

When the prior request contains 64 or fewer signatures, the complete previous signature list is present in the handoff.

The first post-reload request may therefore recover the current exact message-level common-prefix frontier using the same signature semantics.

### 8.3 Bounded behavior when previous request >64 messages

If all retained 64 signatures match and the previous request had more messages, the observer MUST NOT pretend the exact frontier is known.

It reports:

```text
precision = PREFIX_FLOOR
common messages >=64
common chars >= sum(retained signature chars)
first exact change = UNRESOLVED_AFTER_RETAINED_PREFIX
```

If a mismatch occurs inside the retained signatures, the exact first changed message index remains knowable within that prefix.

### 8.4 First-post-reload trajectory guard

A `PREFIX_FLOOR` topology result MUST NOT be fed into cache trajectory as if it were an exact frontier.

For that one observation:

```text
imported trajectory remains restored
regression/divergence/floor mutation = SKIPPED_BOUNDED_REOBSERVE
```

The current full request signatures are then retained in memory.

The second natural request in the same new generation resumes exact topology observation and normal trajectory updates.

This prevents an intentionally compact handoff from manufacturing a false cache regression.

---

## 9. Host Prefix Handoff Sketch v2

The current serialized system0 sketch MUST NOT retain every 512-character head and tail block.

The rich in-generation system0 sketch may remain unchanged in memory.

The handoff form is bounded.

### 9.1 Retained facts

Retain:

```text
system0 total chars
block size = 512
full message signature already used by topology
first 8 block hashes
last 8 block hashes
real total block count
```

Constants:

```text
MAX_HANDOFF_SYSTEM_HEAD_BLOCKS = 8
MAX_HANDOFF_SYSTEM_TAIL_BLOCKS = 8
```

No raw system text is persisted.

### 9.2 Stable system0

If the prior and current full system-message signatures match, Host prefix may continue to report `STABLE` under the existing signature semantics.

The bounded edge sketch is not needed to fabricate extra detail when the complete message signature is unchanged.

### 9.3 Changed system0

If the full signature changes:

- a mismatch inside retained head blocks may produce a bounded head localization,
- a mismatch inside retained tail blocks may produce a bounded tail localization,
- matching retained edges plus changed full signature means an interior change is known but exact position is not.

Truthful classification:

```text
INTERIOR_CHANGED_UNLOCALIZED
confidence BOUNDED
```

The observer MUST NOT reconstruct an exact hundreds-of-thousands-character common head/tail value from data that was not persisted.

### 9.4 Next request

After the first new-generation request, the full current system0 sketch is again available in memory and subsequent same-generation host-prefix observations retain their existing precision.

---

## 10. Scalar and string bounds

A structurally bounded array is insufficient if arbitrary strings can still grow without limit.

The handoff encoder must enforce bounded scalar/string contracts.

At minimum:

- hashes are fixed-size existing hash strings,
- role/kind values must fit known bounded host forms or make the topology handoff ineligible,
- line reason/tier values use bounded enum/code values,
- tracker keys must satisfy a reviewed maximum or make that component ineligible rather than silently truncate identity,
- `locationKey` remains exact and MUST NOT be truncated for persistence.

No string truncation may create a false equality claim.

If an exact identity scalar cannot be represented safely within its bound, fail that component explicitly.

---

## 11. Whole-capsule assembly

The v0.64.11 capsule assembly order is:

```text
1. capture exact envelope metadata
2. request compact runtime-prompt handoff
3. request compact topology handoff
4. request existing bounded cache trajectory handoff
5. serialize each component for budget accounting
6. assemble capsule
7. serialize complete capsule exactly once for authoritative size check
8. publish MEMORY
9. try SESSION
10. if SESSION did not write, try HOST_LOCAL
```

No Host store acquisition is required before the common complete capsule is known to be valid and within 16,384 characters.

The Host-local one-shot semantics from v0.64.10 remain unchanged.

---

## 12. Component failure policy

The repair MUST NOT silently drop required continuity components and then report a full continuity PASS.

Component export dispositions include bounded values such as:

```text
OK
INELIGIBLE
COMPONENT_OVERSIZE
IDENTITY_UNREPRESENTABLE
FAILED
```

The complete durable checkpoint is eligible for reload-continuity validation only when the required continuity components are representable under the frozen budgets.

If a required component cannot be exported safely:

```text
Telemetry checkpoint = COMPACTION_FAILED
SESSION/HOST_LOCAL durable write = not attempted
Core output = remains COMMITTED
```

This preserves failure isolation without creating a partial capsule that looks complete.

---

## 13. Diagnostics

v0.64.11 adds bounded size and precision attribution.

### 13.1 Capsule line

Example successful pre-refresh result:

```text
Telemetry capsule: COMPACT_V2 · 7,842/16,384 chars
· prompt 2,116/4,096
· topology 4,308/6,144
· trajectory 612/2,048
· prompt precision LINE_BOUND
· topology precision COMPLETE_PREFIX
```

### 13.2 Checkpoint line

Expected current-host path:

```text
Telemetry checkpoint:
MEMORY WRITTEN
· SESSION UNAVAILABLE
· HOST_LOCAL WRITTEN
· serialization OK
· 7,842 chars
· trigger OUTPUT_COMMIT
```

### 13.3 Post-reload line

Expected first post-refresh result:

```text
Telemetry continuity: ADOPTED · via host-local
Host-local transport: ... boot CONSUMED
Handoff precision: prompt LINE_BOUND · topology COMPLETE_PREFIX|PREFIX_FLOOR
```

### 13.4 No false exactness

If bounded state cannot localize an exact char/message frontier, diagnostics must use `>=`, `FLOOR`, `BOUNDED`, or `UNRESOLVED` wording.

`PASS`, `Warnings: 0`, or `ADOPTED` must not erase a precision limitation.

---

## 14. Host-local contract preserved

The v0.64.10 Host-local design remains authoritative for transport behavior:

```text
one mailbox key only
10-minute TTL
exact location guard
one store acquisition per generation
one boot read per generation
matching consume-before-adopt
foreign location non-destructive
consume failure -> no adoption
SESSION success -> HOST_LOCAL NOT_NEEDED
SESSION unavailable/failed -> HOST_LOCAL fallback
```

v0.64.11 changes the payload representation reaching that transport, not the one-shot mailbox ownership model.

---

## 15. Operator Release Card update

The existing in-panel `업데이트 내역` surface must be updated in-place.

Current identity:

```text
v0.64.11 — Bounded Telemetry Capsule Compaction
06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Recent ledger:

```text
0.64.11
0.64.10
0.64.9
```

Recommended experiment card:

```text
1. update to v0.64.11
2. DO NOT refresh yet
3. send one natural request
4. copy diagnostic
5. require Telemetry capsule <=16,384 and HOST_LOCAL WRITTEN
6. only then same-tab refresh
7. first natural request -> copy diagnostic
8. second natural request -> copy diagnostic
```

Stop conditions before refresh:

```text
COMPACTION_FAILED
COMPONENT_OVERSIZE
HOST_LOCAL UNAVAILABLE
HOST_LOCAL FAILED
HOST_LOCAL OVERSIZE
```

Any of those means:

```text
copy current diagnostic
DO NOT refresh
submit the packet
```

The update card remains static/pure guidance and adds no top-level UI registration, storage probe, timer, network call, automatic request, automatic refresh, or automatic PASS/FAIL mutation.

`UI parts 2` remains the expected registration topology.

---

## 16. Permanent regression requirements

v0.64.11 MUST add executable coverage using the actual exporter modules rather than only hand-constructed small capsules.

### 16.1 Real exporter-size fixture

A permanent fixture must construct a realistic long-chat observer state including at least:

```text
runtime prompt >= the live 0.64.10 order of magnitude
runtime prompt line count covering the current 38-53 line range
system0 >= 350,000 chars
request message count >= 56
cache trajectory established
```

The test must call the actual trackers, actual handoff exports, actual capsule capture and actual common serializer.

Required assertion:

```text
serialized complete capsule <= 16,384
```

A handcrafted miniature object is not sufficient for this acceptance.

### 16.2 Stress bounds

Additional stress fixtures must exceed each retained-count boundary:

```text
prompt lines >64
request signatures >64
system0 blocks far beyond retained 8+8 edges
```

The result must remain bounded and truthfully precision-labeled.

### 16.3 Same-generation byte-equivalence controls

Normal same-generation runtime-prompt and request-topology probes must remain behaviorally unchanged for existing fixtures.

The compaction must not alter the ordinary observer merely because a checkpoint might later occur.

### 16.4 First-post-reload precision controls

Tests must cover:

```text
prompt exact stable
prompt first changed line inside retained prefix
prompt change after retained 64-line prefix
request mismatch inside retained 64 signatures
request common prefix beyond retained 64 signatures
system0 stable full signature
system0 changed inside retained head edge
system0 changed inside retained tail edge
system0 interior change outside retained edges
```

No test may permit an exact frontier claim when only a lower bound was persisted.

### 16.5 Trajectory guard

A `PREFIX_FLOOR` first post-reload topology result must not mutate imported cache trajectory as an exact regression/divergence event.

The second same-generation request must resume ordinary exact trajectory progression.

### 16.6 Transport integration

With both browser session roots reproducing ACCESS_ERROR and a usable Host-local store:

```text
actual exporter state
-> complete capsule under cap
-> exactly one Host-local setItem
-> HOST_LOCAL WRITTEN
```

Boot integration must then prove:

```text
read once
consume once
adopt via host-local
no replay on second claim
```

### 16.7 Frozen safety assertions

Continue asserting:

- one Host-local key owner,
- no raw body retention,
- no raw prompt/system0 persistence,
- no localStorage/IndexedDB/network/timer/polling,
- no new top-level UI registration,
- latest.js == install.js,
- provider cache remains UNVERIFIED,
- M2-3 remains frozen.

---

## 17. Live acceptance gate

Required gate:

```text
06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

### Phase A — pre-refresh

Use the already-long real chat.

Send one natural request without refreshing first.

Required:

```text
Version 0.64.11
output COMMITTED
Warnings acceptable only if independently explained
Session surface remains truthfully reported
Host-local API/store usable
Telemetry capsule serialization OK
complete capsule <= 16,384 chars
HOST_LOCAL WRITTEN
```

If `HOST_LOCAL WRITTEN` is absent, STOP before refresh.

### Phase B — same-tab refresh

Only after Phase A succeeds:

```text
same tab
ordinary page refresh
new runtime generation
```

### Phase C — first natural post-refresh request

Required:

```text
new generation
Host-local boot CONSUMED
Telemetry continuity ADOPTED via host-local
location compatible
runtime-prefix state restored with truthful handoff precision
request topology restored with truthful precision
cache trajectory restored
no replay/edit/retry used to manufacture success
visible output semantically fits current request
Core output COMMITTED
```

If topology precision is `PREFIX_FLOOR`, trajectory must show the bounded-reobserve guard rather than a fabricated exact frontier mutation.

### Phase D — second natural post-refresh request

Required:

```text
no repeated adoption of the consumed old capsule
same-generation precise observer state resumes
trajectory continues normally
new OUTPUT_COMMIT creates a fresh <=16,384 capsule
HOST_LOCAL WRITTEN again
visible semantics healthy
```

### PASS rule

The live gate passes only when all four phases are satisfied.

`HOST_LOCAL WRITTEN` before refresh alone is not sufficient.

`ADOPTED via host-local` alone is not sufficient.

---

## 18. Failure routing

### Route A — component still oversized

```text
Telemetry capsule component = COMPONENT_OVERSIZE
```

Action:

```text
STOP before refresh
record exact component and size
repair that bounded exporter only
```

### Route B — complete capsule still >16,384

```text
components individually within budget
whole capsule OVERSIZE
```

Action:

```text
STOP before refresh
inspect envelope/slack accounting
DO NOT raise the cap as first response
```

### Route C — compact capsule valid but Host write fails

```text
serialization OK
size <=16,384
HOST_LOCAL FAILED/UNAVAILABLE
```

Action:

```text
transport-specific evidence
separate from compaction semantics
```

### Route D — Host write succeeds but reload adoption fails

```text
pre-refresh HOST_LOCAL WRITTEN
post-refresh no compatible adoption
```

Action:

```text
consume/location/compatibility/boot-order repair scope
```

### Route E — adoption succeeds but telemetry precision mutates semantics falsely

```text
bounded handoff reported as exact
or bounded topology causes false trajectory regression
```

Action:

```text
LIVE FAIL
precision/observer repair before M2-3
```

---

## 19. Performance and memory constraints

The handoff compaction executes only at the existing telemetry checkpoint / import boundary.

It must not add a second scan of raw long chat or system0 solely for persistence.

Preferred implementation reuses already-computed in-memory hashes/signatures and slices/maps them into bounded handoff forms.

Expected properties:

```text
new persistent keys = 0
new timers = 0
new network = 0
new Host acquisitions = 0 beyond v0.64.10 contract
handoff arrays = fixed-count bounded
serialized capsule = <=16,384
raw-body retention = 0
```

The normal request observer already computes its precise state; v0.64.11 must not duplicate the 350k+ system0 traversal just to build a compact export.

---

## 20. Privacy contract

Compaction is not permission to retain more revealing data.

The durable capsule remains metadata-only.

Forbidden durable content remains:

```text
raw user text
raw assistant text
raw runtime prompt text
raw system0 text
raw chat history
Knowledge body
COMMUNITY body
Host objects
exception messages/stacks
provider response/cache internals
```

The compact design stores hashes, lengths, bounded enum metadata, bounded trajectory state, and exact location identity only as already authorized for handoff continuity.

---

## 21. Implementation boundary

This design does not implement v0.64.11.

A separately authorized implementation transaction should touch only the bounded runtime-telemetry/export/import path, relevant executable tests/fixtures, release builder material, and the existing operator release card.

Expected primary runtime ownership:

```text
runtime-prompt cache handoff export/import
request-topology handoff export/import
runtime-cache-candidates bounded-reobserve guard
runtime-telemetry capsule diagnostics/assembly
outer checkpoint/adoption glue only as required
```

No unrelated feature work may be bundled into this release.

---

## 22. Release acceptance checklist

Static / candidate / permanent acceptance must prove:

- [ ] v0.64.11 version identity exact
- [ ] latest.js == install.js
- [ ] normal same-generation observer behavior preserved
- [ ] per-character runtime-prompt prefix hash array is absent from durable handoff
- [ ] full system0 head/tail block arrays are absent from durable handoff
- [ ] prompt handoff retains <=64 line summaries
- [ ] topology handoff retains <=64 signature tuples
- [ ] system0 handoff retains <=8 head + <=8 tail blocks
- [ ] cache trajectory remains fixed-window bounded
- [ ] actual long-chat exporter fixture produces complete capsule <=16,384
- [ ] component budgets enforced
- [ ] whole-capsule cap remains authoritative
- [ ] no false exactness after compact import
- [ ] bounded topology cannot create false trajectory regression
- [ ] Host-local fallback is reached after current-host SESSION ACCESS_ERROR
- [ ] exactly one Host-local write on eligible checkpoint
- [ ] one-shot consume/adopt semantics preserved
- [ ] no raw bodies/prompt/system0 persisted
- [ ] no new storage key/network/timer/polling/UI part
- [ ] provider cache remains UNVERIFIED
- [ ] M2-3 remains frozen pending live gate

Live acceptance must then prove the same-tab sequence described in Section 17.

---

## 23. Forbidden shortcuts

The following are explicitly rejected:

```text
16K -> 64K and call it fixed
compress raw prompt text and persist it
persist raw system0 because hashes are too large
silently drop topology or trajectory and still report ADOPTED healthy
truncate identity strings and compare truncated identities as exact
treat >=prefix floor as exact prefix
treat Host-local API PRESENT as proof of write durability
refresh before a durable WRITTEN checkpoint exists
reuse retry/reroll as the required natural second post-refresh request
```

---

## 24. Frozen design verdict

v0.64.10 established that the current Host-local API surface is usable but the real metadata capsule does not satisfy its own long-standing 16,384-character durability bound.

v0.64.11 repairs the exporter, not the limit.

Final design rule:

> **KEEP THE 16K CONTRACT, EXPORT ONLY BOUNDED HANDOFF SKETCHES, AND LABEL ANY LOST CROSS-RELOAD PRECISION INSTEAD OF PRETENDING IT WAS PRESERVED.**

Implementation status after this document:

```text
DESIGN FROZEN
IMPLEMENTATION NOT STARTED
release-simcore remains v0.64.10
live gate remains pending/failed handoff until v0.64.11 is published
M2-3 remains frozen
```
