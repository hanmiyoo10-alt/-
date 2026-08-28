# SimCore v0.64.9 — Session Transport Root Resolution Activation

Date: 2026-08-28
Status: **DESIGN ACTIVATED · IMPLEMENTATION NOT STARTED · RUNTIME CHANGE REQUIRED**
Parent production: `v0.64.8 — Output-Complete Telemetry Checkpoint Repair`
Parent release commit: `f5e29464452728f859a1a6a8191a846468353531`
Parent release blob: `bed3d5faff9641071cdd9003b67c45d42b3e32ee`
Major milestone/checkpoint: `2.0M / M2-2` unchanged
Required live scenario after release: `06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT`

## 1. Activation decision

The v0.64.8 repair successfully proved in real long chat that the missing OUTPUT_COMMIT checkpoint callsite now executes after authoritative output commit and fails open without breaking normal Core output behavior.

Three consecutive natural outputs in one production runtime reported:

```text
Telemetry checkpoint: SESSION · UNAVAILABLE · 0 chars · <0-1 ms> · trigger OUTPUT_COMMIT
Runtime status: ACTIVE · output COMMITTED
Warnings: 0
```

The v0.64.8 live contract requires a pre-refresh `SESSION · WRITTEN` checkpoint before crossing the full-page-refresh boundary. That prerequisite is repeatedly unsatisfied in the actual host runtime.

For release sequencing purposes, v0.64.8 is therefore classified as:

```text
06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
= FAIL AT PRE-REFRESH PREREQUISITE

confirmed release-level failure
= REQUIRED SESSION SIDECAR NOT WRITABLE THROUGH CURRENT BINDING

exact root cause
= OPEN / HOST_CAPABILITY_OR_BINDING_UNRESOLVED
```

A full refresh is not required to prove this narrower failure because the positive live contract explicitly requires the durable session sidecar to exist before refresh.

This classification does **not** prove that PocketRisu/WebView lacks `sessionStorage` globally. The v0.64.8 implementation only attempted resolution through:

```text
typeof window !== 'undefined' ? window : null
```

and collapsed several distinct surface conditions into `UNAVAILABLE`.

No existing repository reservation for `v0.64.9` was found at activation review time.

The next runtime release is activated as:

```text
Version: 0.64.9
Name: Session Transport Root Resolution
Class: narrow runtime-telemetry transport/capability repair mini
Parent: immutable v0.64.8
Primary axis: sessionStorage root resolution + bounded attribution
M2-3: FROZEN
```

---

## 2. Repair objective

v0.64.9 must answer and act on the exact unresolved boundary without guessing:

```text
Is a usable sessionStorage surface exposed through `window`?
Is a usable sessionStorage surface exposed through `globalThis`?
Are they the same storage object or distinct surfaces?
Which root was selected for the real telemetry checkpoint?
If the preferred root cannot perform the real checkpoint, can the other usable root do so?
```

The release must achieve this without synthetic storage writes.

Canonical strategy:

```text
passive bounded root/surface inspection
        ↓
ordered candidate set
        ↓
normal OUTPUT_COMMIT telemetry checkpoint
        ↓
real write attempt on selected candidate
        ↓
optional bounded fallback to second distinct usable candidate
        ↓
root-attributed diagnostic result
```

This is not a generic browser capability scanner and not a full Host Capability Receipt implementation.

---

## 3. Relationship to frozen Host Capability Receipt design

`docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md` remains frozen and parked as the generic S-07 design.

v0.64.9 reuses only its already-frozen constitutional rules relevant to `BROWSER_SESSION_STORAGE`:

```text
surface presence != use outcome
no synthetic write solely to discover capability
bounded property/function presence checks are allowed
existing normal operation results are valid evidence
no provider/cache inference
no Host Health aggregate
```

v0.64.9 does **not** implement the full S-07 capability list, generic receipt UI, clipboard rows, Host hook rows, or a new capability service.

The new logic remains owned by `runtime-telemetry` plus the existing Last Turn Diagnostic projection.

---

## 4. Root candidates

The session transport has exactly two candidate roots in v0.64.9:

```text
WINDOW
= `window` when that binding exists

GLOBAL_THIS
= `globalThis`
```

Only the `sessionStorage` surface is inspected on these roots.

No additional roots such as `self`, `top`, `parent`, `document.defaultView`, Host APIs, pluginStorage, localStorage, IndexedDB, filesystem, cookies, network storage, or custom WebView bridges may be added in this release.

---

## 5. Passive surface inspection

Introduce one tiny pure/bounded root inspector conceptually equivalent to:

```text
inspectSessionSurface(root, label)
```

It may do only:

```text
1. determine whether the root binding/object exists
2. attempt to read `root.sessionStorage`
3. inspect whether getItem / setItem / removeItem are functions
4. return a bounded status object
```

It must not call `getItem`, `setItem`, or `removeItem` merely to determine surface availability.

Frozen surface vocabulary:

```text
ROOT_ABSENT
STORAGE_ABSENT
ACCESS_ERROR
METHODS_INCOMPLETE
USABLE
```

Meaning:

```text
ROOT_ABSENT
= root object was not supplied/exposed

STORAGE_ABSENT
= root exists but sessionStorage is null/undefined

ACCESS_ERROR
= reading the sessionStorage property threw

METHODS_INCOMPLETE
= a storage-like object was returned but one or more required methods are not callable

USABLE
= getItem, setItem, and removeItem surfaces are all present
```

No exception message, stack, object serialization, browser identity, UA string, origin, URL, or raw Host object may be retained.

---

## 6. Candidate de-duplication and relation

When both roots expose a `USABLE` storage object, compare object identity only.

Bounded relation vocabulary:

```text
SAME_OBJECT
DISTINCT_OBJECTS
SINGLE_CANDIDATE
NONE
```

Rules:

```text
same storage object through window and globalThis
→ one physical candidate
→ never double-read/write/remove it

usable distinct storage objects
→ preserve ordered candidates WINDOW then GLOBAL_THIS

only one usable root
→ SINGLE_CANDIDATE

no usable root
→ NONE
```

Do not fingerprint or enumerate storage contents.

---

## 7. Publish/checkpoint semantics

The existing v0.64.8 outer checkpoint boundary remains frozen:

```text
active authoritative output committed
AND runtime generation still current
AND location key known
→ checkpointRuntimeTelemetry('OUTPUT_COMMIT')
```

`UNLOAD` remains last-chance redundancy.

The memory transport remains exactly as before:

```text
globalThis[__SIMCORE_TELEMETRY_HANDOFF_V1__]
```

Session publishing changes only in root resolution.

### 7.1 Serialization

The capsule is serialized once per checkpoint after at least one usable session candidate is available.

Preserve:

```text
MAX_SESSION_CHARS = 16384
schema = 1
MAX_AGE_MS = 10 minutes
metadata-only capsule
```

If serialization fails:

```text
SESSION = FAILED
no storage write attempt
output remains COMMITTED
```

If serialized size exceeds the bound:

```text
SESSION = OVERSIZE
no fallback candidate can change that fact
remove stale session key best-effort only from already-addressable candidates as explicitly covered by implementation tests
output remains COMMITTED
```

No truncation is permitted.

### 7.2 Real write order

For a normal eligible telemetry checkpoint:

```text
candidate priority: WINDOW → GLOBAL_THIS
```

Attempt at most one write per distinct candidate and stop at the first successful write.

Examples:

```text
WINDOW USABLE + setItem WRITTEN
→ SESSION WRITTEN via WINDOW
→ do not write GLOBAL_THIS

WINDOW unavailable + GLOBAL_THIS USABLE + setItem WRITTEN
→ SESSION WRITTEN via GLOBAL_THIS

WINDOW USABLE but real setItem throws
+ GLOBAL_THIS distinct + USABLE
→ bounded fallback attempt on GLOBAL_THIS
→ if successful: SESSION WRITTEN via GLOBAL_THIS, fallbackFrom WINDOW_FAILED

both unavailable
→ SESSION UNAVAILABLE

both usable but both real writes fail
→ SESSION FAILED
```

The second write attempt is not a synthetic probe. It is a bounded fallback attempt to complete the already-authorized real telemetry checkpoint.

Maximum real session write attempts per checkpoint: **2**.

No retries, loops, timers, backoff, polling, or background repair are allowed.

---

## 8. Claim semantics across reload

Boot-time claim must not assume the same root remains preferred/exposed after refresh.

Required session claim sequence:

```text
1. inspect WINDOW and GLOBAL_THIS surfaces
2. de-duplicate identical storage objects
3. read/consume the telemetry key from each usable distinct storage candidate at most once
4. validate memory transport first as today
5. if memory is not accepted, validate consumed session candidates in priority order WINDOW → GLOBAL_THIS
6. accept the first compatible session capsule
7. all consumed candidates remain consumed so stale duplicates cannot replay later
```

This protects against root availability changing across the runtime boundary.

Examples:

```text
pre-refresh write via GLOBAL_THIS
post-refresh WINDOW becomes usable too
→ claim still examines GLOBAL_THIS
→ compatible capsule can be adopted

pre-refresh WINDOW and GLOBAL_THIS were same storage object
→ one read/remove only

both roots contain capsules
→ consume both once
→ choose first valid by fixed priority
→ no later duplicate re-adoption
```

Memory-first priority remains frozen and must not be weakened.

---

## 9. Diagnostic attribution

v0.64.8 proved that session-only `UNAVAILABLE` is too coarse for live ownership decisions.

v0.64.9 must expose two bounded lines.

### 9.1 Session surface line

Example shapes:

```text
Session surface: WINDOW STORAGE_ABSENT · GLOBAL_THIS USABLE · relation SINGLE_CANDIDATE
```

```text
Session surface: WINDOW USABLE · GLOBAL_THIS USABLE · relation SAME_OBJECT
```

```text
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS STORAGE_ABSENT · relation NONE
```

This line is passive surface attribution only.

### 9.2 Telemetry checkpoint line

Promote the existing hidden memory disposition and root attribution into the copied diagnostic.

Positive example:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION WRITTEN via GLOBAL_THIS · 1842 chars · 0.4 ms · trigger OUTPUT_COMMIT
```

Fallback example:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION WRITTEN via GLOBAL_THIS · fallback WINDOW_FAILED · 1842 chars · 0.7 ms · trigger OUTPUT_COMMIT
```

Unavailable example:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · root NONE · 0 chars · 0.1 ms · trigger OUTPUT_COMMIT
```

Failure example:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION FAILED · attempted WINDOW,GLOBAL_THIS · 1842 chars · 0.8 ms · trigger OUTPUT_COMMIT
```

The exact formatter may be shortened, but it must expose at least:

```text
memory disposition
session disposition
successful session root when any
bounded fallback/attempt attribution when material
serialized char count when known
checkpoint elapsed time
trigger
```

No exception text may be exposed.

### 9.3 Continuity line

`Telemetry continuity` remains semantically separate from write diagnostics.

For session adoption, add root attribution without changing the transport class:

```text
Telemetry continuity: ADOPTED · via session · root GLOBAL_THIS · from 0.64.9 · ...
```

A `SESSION WRITTEN` line does not itself prove a later claim succeeds.

Provider cache remains exactly:

```text
UNVERIFIED
```

---

## 10. Failure routing

v0.64.9 intentionally distinguishes three materially different live outcomes.

### Route A — root binding mismatch repaired

```text
WINDOW not usable
GLOBAL_THIS usable
real OUTPUT_COMMIT write via GLOBAL_THIS = WRITTEN
```

Interpretation:

```text
confirmed current binding insufficiency
alternate existing browser-local root usable
continue same-tab refresh live gate
```

### Route B — usable surface but actual writes fail

```text
one or both roots = USABLE
real setItem attempts = FAILED
```

Interpretation:

```text
surface present
use failed
not an absence claim
refresh gate remains blocked
next repair must address write permission/behavior rather than root binding
```

### Route C — no usable session surface through either root

```text
WINDOW != USABLE
GLOBAL_THIS != USABLE
```

Interpretation:

```text
current runtime exposes no qualifying sessionStorage surface through the two authorized roots
refresh gate remains blocked
next architecture must evaluate a different durable same-tab transport
```

v0.64.9 must not automatically introduce that alternative transport.

---

## 11. Performance contract

The new work remains bounded O(1) with respect to chat length.

Maximum additional work:

```text
per eligible checkpoint:
- inspect at most 2 root properties
- inspect 3 required method surfaces per candidate
- serialize capsule once
- at most 2 real session setItem attempts

per runtime boot claim:
- inspect at most 2 root properties
- at most 2 getItem attempts on distinct usable roots
- at most 2 removeItem attempts for consumed keys
```

No history scan, chat scan, timer, interval, network request, pluginStorage operation, extra SnapshotStore write, Host chat write, or provider call may be added.

Checkpoint cost remains outside the request→provider critical path.

---

## 12. Privacy and persistence boundary

Preserve the existing telemetry capsule exactly in semantic scope:

```text
schema
sourceVersion
locationKey
capturedAt
runtimePromptCache bounded export
requestTopology bounded export
cacheCandidates bounded export
```

Forbidden:

```text
raw user body
raw assistant body
Fresh body
system prompt
runtime prompt text
full chat history
Core semantic snapshot
Host objects
sessionStorage contents other than the exact SimCore telemetry key
exception messages/stacks
browser fingerprinting
```

No new persistent key is authorized.

The session key remains:

```text
__SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
```

---

## 13. Frozen semantic owners

No Core semantic behavior may move in v0.64.9.

Frozen:

```text
Store schema / retention
Lifecycle / mode / broadcast
Time / Narrative / post-B_END clock handoff
Frame / chronology
Representation / Edit Reconcile
Runtime Mirror / Deferred Mirror
Recovery / Output Compat / Bootstrap Migration
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Structure / COMMUNITY / Reaction
Prompt compiler semantics / placement
request-history mutation behavior
provider cache claims
M2-3 ownership extraction
```

The release may only change session-transport root discovery/selection/claim and bounded diagnostics around that transport.

---

## 14. Permanent verification requirements

Minimum v0.64.9 regression matrix:

```text
1. WINDOW absent + GLOBAL_THIS usable -> publish WRITTEN via GLOBAL_THIS
2. WINDOW storage absent + GLOBAL_THIS usable -> WRITTEN via GLOBAL_THIS
3. WINDOW session getter throws + GLOBAL_THIS usable -> ACCESS_ERROR + WRITTEN via GLOBAL_THIS
4. WINDOW methods incomplete + GLOBAL_THIS usable -> METHODS_INCOMPLETE + WRITTEN via GLOBAL_THIS
5. WINDOW usable + GLOBAL_THIS same object -> one physical write only
6. WINDOW usable write succeeds + GLOBAL_THIS distinct usable -> no second write
7. WINDOW write fails + GLOBAL_THIS distinct usable -> bounded fallback succeeds via GLOBAL_THIS
8. both usable distinct and both writes fail -> SESSION FAILED, output still COMMITTED
9. no usable candidates -> SESSION UNAVAILABLE, output still COMMITTED
10. serialization failure -> FAILED without storage attempts
11. oversize >16384 -> OVERSIZE, no successful write
12. claim reads GLOBAL_THIS capsule when WINDOW unavailable
13. claim reads WINDOW capsule when GLOBAL_THIS unavailable
14. claim can recover valid GLOBAL_THIS capsule even if WINDOW becomes newly usable after boundary
15. same-object roots are read/removed once
16. two distinct consumed capsules cannot replay after first boot claim
17. memory-valid capsule still wins over session candidates
18. stale/schema/location controls remain unchanged
19. MAX_AGE_MS remains 10 minutes
20. schema remains 1
21. SESSION_KEY unchanged
22. no raw-body/prompt retention
23. diagnostic surface uses bounded vocabulary/no exception text
24. OUTPUT_COMMIT and UNLOAD both use the same canonical resolver/publish path
25. inactive/BYPASSED/stale output cannot overwrite checkpoint
26. authoritative output-save failure cannot checkpoint
27. latest.js == install.js
28. architecture/Contracts checks pass
29. v0.64.8 OUTPUT_COMMIT callsite regression remains permanently covered
30. Representation fast-reconcile + genuine-edit frozen controls pass
31. Broadcast/Time/Frame/COMMUNITY/Summary frozen controls pass
32. no new network/timer/pluginStorage/chat-write/SnapshotStore surface
```

Tests must distinguish `surface USABLE` from `write SUCCEEDED` rather than treating them as one boolean.

---

## 15. Natural live close gate

### Phase A — pre-refresh root resolution

After installing v0.64.9, send one or more ordinary natural requests without refreshing first.

Required diagnostic evidence:

```text
Session surface: explicit WINDOW state + GLOBAL_THIS state
Telemetry checkpoint: explicit MEMORY state + SESSION state + root attribution
```

Positive precondition:

```text
SESSION WRITTEN via WINDOW or GLOBAL_THIS
```

Only then proceed to the refresh boundary.

If session remains `UNAVAILABLE` or `FAILED`, stop before refresh and route according to §10.

### Phase B — same-tab full page refresh

Preserve:

```text
pre-refresh runtime generation
pre-refresh checkpoint root
pre-refresh trajectory/topology state
```

Perform an ordinary same-tab full page refresh and verify a genuinely new runtime generation.

### Phase C — first natural post-refresh request

Positive target:

```text
Telemetry continuity: ADOPTED · via session · root <WINDOW|GLOBAL_THIS>
compatible location/schema/age accepted
restorable runtime-prefix/topology/trajectory metadata adopted where compatible
current request compares against restored prior observer state
provider cache UNVERIFIED
normal Core request/output semantics unchanged
```

A truthful PRE_SIMCORE host/history mutation may remain visible and does not by itself fail the release if the previous observer state was demonstrably adopted.

### Phase D — second natural post-refresh request

Required:

```text
no repeated adoption of consumed pre-refresh capsule
trajectory continues from restored + first-post-refresh state
new OUTPUT_COMMIT checkpoint is SESSION WRITTEN
no artificial second BASELINE reset caused by telemetry handoff
normal semantic controls remain healthy
```

Gate result:

```text
pre-refresh WRITTEN
+ new generation
+ first request ADOPTED via session with root attribution
+ second request continues without replay/reset
→ 06409 LIVE PASS

pre-refresh root surface resolved but session write FAILED/UNAVAILABLE
→ 06409 LIVE FAIL / classified before refresh

pre-refresh WRITTEN but first request FRESH
→ 06409 LIVE FAIL

first request ADOPTED but second request re-adopts/resets
→ 06409 LIVE FAIL
```

---

## 16. Release-system boundary

Release System v2.2 is already permanent-CI-qualified and remains non-runtime.

v0.64.9 must use the standing clean product release path rather than creating a special publisher or one-off workflow:

```text
explicit release work item
→ product/intent PR
→ generic candidate + immutable receipt
→ exact delegated approval
→ permanent publication to release-simcore
→ LIVE_PENDING convergence
→ real long-chat gate
→ human LIVE_PASS closure only after direct evidence
```

R2.2 current-state and blocker-incident closure semantics must remain truthful through any failed/recovered release attempt.

No release-system change is part of the v0.64.9 runtime patch.

---

## 17. Release ordering

Canonical runtime order becomes:

```text
v0.64.7 Cross-Reload Cache Observer Continuity
→ LIVE FAIL: output-complete checkpoint callsite omitted

v0.64.8 Output-Complete Telemetry Checkpoint Repair
→ OUTPUT_COMMIT callsite LIVE PROVEN
→ LIVE FAIL at pre-refresh prerequisite: SESSION UNAVAILABLE through current binding

v0.64.9 Session Transport Root Resolution
→ resolve WINDOW vs GLOBAL_THIS session surfaces
→ perform bounded real checkpoint fallback where eligible
→ repeat real same-tab reload continuity gate

then, only after v0.64.9 LIVE PASS
→ v0.65.0 M2-3 Edit Reconcile Ownership Extraction
```

No unrelated runtime release may jump ahead of the continuity repair chain.

---

## 18. Implementation handoff

Implementation must begin from exact immutable production parent:

```text
P = f5e29464452728f859a1a6a8191a846468353531
version = 0.64.8
latest == install
```

Expected narrow product diff:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
products/simcore/tooling/build-06409-session-transport-root-resolution.py
products/simcore/tests/suites/reload-cache-continuity.test.mjs and/or narrowly named companion fixture as required
release intent/evidence surfaces required by the permanent release flow
```

Preferred runtime structure:

```text
runtime-telemetry
├─ passive inspectSessionSurface(root,label)
├─ bounded distinct candidate resolution
├─ canonical publish across ordered candidate roots
├─ canonical claim across ordered candidate roots
└─ diagnostics() root/surface/write/claim metadata

outer runtime
├─ existing OUTPUT_COMMIT checkpoint callsite unchanged
├─ existing UNLOAD checkpoint callsite unchanged
└─ Last Turn Diagnostic bounded projection expanded
```

Do not implement from this design commit implicitly. A separate explicit implementation transaction is required.

---

## 19. Final activation verdict

```text
next runtime release: v0.64.9
name: Session Transport Root Resolution
status: DESIGN ACTIVATED
implementation: NOT STARTED
parent production: immutable v0.64.8
repair axis: sessionStorage root resolution + real checkpoint fallback + attribution
synthetic storage probe: FORBIDDEN
candidate roots: WINDOW / GLOBAL_THIS only
session key: UNCHANGED
capsule schema: UNCHANGED / 1
age bound: UNCHANGED / 10 minutes
size bound: UNCHANGED / 16384 chars
memory-first continuity priority: PRESERVED
provider cache: UNVERIFIED
M2-3: BLOCKED UNTIL v0.64.9 LIVE PASS
```

Related evidence and authority:

- `docs/SIMCORE_LIVE_06408_PRE_REFRESH_SESSION_UNAVAILABLE_2026-08-28.md`
- `docs/SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`
- `docs/SIMCORE_06408_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_2_IMPLEMENTATION_EVIDENCE_2026-08-28.md`
- `products/simcore/tooling/build-06407-reload-cache-continuity.py`
- `products/simcore/tooling/build-06408-output-complete-checkpoint-repair.py`
- `release-simcore/plugins/simcore/latest.js`
