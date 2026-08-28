# SimCore v0.64.10 — Host-Local One-Shot Telemetry Handoff Activation

Date: 2026-08-28
Status: **DESIGN ACTIVATED · IMPLEMENTATION NOT STARTED · RUNTIME CHANGE REQUIRED**
Parent production: `v0.64.9 — Session Transport Root Resolution`
Parent release commit: `1c1037e44d6b3e903b3d622b579095b1f315758e`
Parent release blob: `7d2731d256b8aa18598c389fd919550cf3bbf146`
Triggering live evidence: `docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md`
Major milestone/checkpoint: `2.0M / M2-2` unchanged
Required live scenario after release: `06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT`

---

## 1. Activation decision

v0.64.9 successfully resolved the browser-session ambiguity but failed the real-long-chat reload continuity gate before refresh.

Two consecutive natural outputs in the actual production runtime showed:

```text
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · 0 chars · <0-1 ms> · trigger OUTPUT_COMMIT
```

The bounded live conclusion is now direct:

```text
WINDOW.sessionStorage      -> property access throws
GLOBAL_THIS.sessionStorage -> property access throws
usable browser session candidate -> NONE
memory telemetry sidecar          -> WRITTEN
session telemetry sidecar         -> UNAVAILABLE
```

Per the frozen v0.64.9 Route C contract, another patch that merely changes `window` / `globalThis` selection is not authorized without new evidence.

The next runtime release is therefore activated as:

```text
Version: 0.64.10
Name: Host-Local One-Shot Telemetry Handoff
Class: narrow runtime-telemetry durable-transport repair mini
Parent: immutable v0.64.9
Primary axis: Host local plugin storage as bounded fallback transport
M2-3 runtime ownership extraction: FROZEN
```

Repository evidence confirms that another production plugin already uses the Host API shape:

```text
store = await Risuai.getLocalPluginStorage()
await store.getItem(key)
await store.setItem(key, value)
```

and uses `removeItem` when exposed, with an empty-value `setItem` fallback for explicit clearing.

That repository precedent establishes only that the Host API exists in at least one plugin implementation. It does **not** prove that SimCore can acquire/use the surface in the current runtime, nor that it survives a same-tab full-page refresh. v0.64.10 must prove those facts with its own normal telemetry operation and live evidence.

No repository reservation for `v0.64.10` was found at activation review time.

---

## 2. Repair objective

v0.64.10 must answer the next bounded question exposed by v0.64.9:

```text
When browser sessionStorage cannot be used,
can SimCore persist the existing bounded telemetry handoff capsule
through the Host local plugin-storage API,
consume it exactly once after a runtime boundary,
and restore compatible observer continuity without changing Core semantics?
```

Canonical transport order becomes:

```text
MEMORY
  globalThis[__SIMCORE_TELEMETRY_HANDOFF_V1__]
        ↓
BROWSER SESSION
  v0.64.9 WINDOW / GLOBAL_THIS sessionStorage resolver
        ↓ only when browser session did not write
HOST LOCAL ONE-SHOT
  Risuai.getLocalPluginStorage()
```

The new transport is a fallback, not a replacement for the previous transports.

If browser `sessionStorage` becomes usable in another host/runtime:

```text
SESSION WRITTEN
→ HOST_LOCAL NOT_NEEDED
```

The release must not weaken or remove the v0.64.9 root diagnostics.

---

## 3. Why this is not called a session transport

Host local plugin storage may live longer than one browser document/session and may survive boundaries broader than a same-tab page refresh.

Therefore the new path must be named and diagnosed as:

```text
HOST_LOCAL
```

not:

```text
SESSION
BROWSER_SESSION
SAME_TAB_STORAGE
```

The storage mechanism itself must never be used to claim which physical boundary occurred.

Canonical evidence separation:

```text
transport fact:
Telemetry continuity ADOPTED via host-local

operator/sequence fact:
same-tab full-page refresh occurred between pre- and post-boundary packets
```

Only the bounded Diagnostic Review Episode may combine those facts into a same-tab refresh continuity claim.

---

## 4. Authorized Host surface

v0.64.10 authorizes exactly one new Host storage acquisition path:

```text
Risuai.getLocalPluginStorage()
```

The returned store is eligible when it exposes:

```text
getItem: function
setItem: function
```

`removeItem` is preferred but optional because repository production precedent already supports explicit clearing through:

```text
removeItem(key)
else setItem(key, '')
```

Frozen acquisition/surface vocabulary:

```text
API_ABSENT
ACQUIRE_FAILED
METHODS_INCOMPLETE
USABLE
```

Meaning:

```text
API_ABSENT
= `Risuai.getLocalPluginStorage` is not callable

ACQUIRE_FAILED
= the normal acquisition call rejects/throws/returns no usable store object

METHODS_INCOMPLETE
= store object exists but getItem/setItem are not callable

USABLE
= getItem/setItem are callable; removeItem availability is recorded separately
```

Do not retain exception messages, stacks, Host objects, keys enumeration, storage size, unrelated storage contents, device/browser identity, URL, origin, or user-agent data.

No other durable transport may be introduced in this release.

Forbidden alternatives include:

```text
localStorage
IndexedDB
cookies
filesystem
network/backend persistence
Host chat messages
character/card state
SnapshotStore semantic state
custom WebView bridge
```

---

## 5. One new telemetry-only Host-local key

Authorize exactly one new SimCore-owned local-plugin-storage slot:

```text
__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__
```

This key is owned by `runtime-telemetry` only.

It is **not**:

```text
Core Store state
SnapshotStore semantic schema
chat history
session semantic state
operator settings
release state
provider/cache state
```

The key is a single pending telemetry mailbox.

Canonical ownership:

```text
0 or 1 serialized telemetry capsule
last successful eligible writer wins
```

Do not create a key per chat, turn, request, runtime generation, or timestamp in v0.64.10.

Reason:
- per-location/per-generation keys would create cleanup and unbounded-key lifecycle questions beyond this repair;
- one slot is enough to prove the active continuity contract;
- `locationKey` inside the capsule prevents cross-location adoption.

The single-slot design accepts one bounded availability limitation:

```text
multiple concurrent SimCore locations may overwrite the pending mailbox
→ continuity evidence may be lost
→ cross-location semantic adoption must still be impossible
```

This is a loss-of-continuity possibility, not permission for wrong-location adoption.

If real multi-location use later proves this limitation material, a separate bounded-slot design is required.

---

## 6. Capsule contract remains metadata-only

Reuse the existing telemetry handoff capsule semantic payload.

Preserve:

```text
schema = 1
sourceVersion
locationKey
capturedAt
runtimePromptCache bounded export
requestTopology bounded export
cacheCandidates bounded export
```

Preserve limits:

```text
MAX_AGE_MS = 10 minutes
MAX_SERIALIZED_CHARS = 16384
```

The same serialized capsule may be used for browser-session and Host-local transport.

No larger payload is authorized merely because Host local storage may have a larger capacity.

Forbidden persistence remains:

```text
raw user body
raw assistant body
Fresh body
system prompt
runtime prompt text
full chat history
Core semantic snapshot
Knowledge content
COMMUNITY content
Host objects
exception messages/stacks
provider metadata inferred from behavior
```

Provider cache remains exactly:

```text
UNVERIFIED
```

---

## 7. Host-local store lifecycle

Use one runtime-scoped lazy acquisition helper conceptually equivalent to:

```text
getHostLocalTelemetryStoreOnce()
```

Rules:

```text
acquisition attempts per runtime generation <= 1
successful store handle cached in bounded memory
failed acquisition result cached in bounded memory
no polling
no retry loop
no background acquisition
```

The helper may be reached from:

```text
boot/first-request host-local claim
or
first eligible OUTPUT_COMMIT fallback checkpoint
```

Whichever path reaches it first owns the single acquisition attempt; later callers await/reuse the same bounded result.

This prevents duplicate Host acquisition races.

---

## 8. Publish/checkpoint semantics

The existing authoritative output checkpoint boundary remains frozen:

```text
active authoritative output committed
AND runtime generation still current
AND location key known
→ checkpointRuntimeTelemetry('OUTPUT_COMMIT')
```

`UNLOAD` remains last-chance redundancy, but it must reuse the same canonical transport writer and must not introduce a second storage owner.

### 8.1 Ordered publish disposition

For one eligible checkpoint:

```text
1. MEMORY publish
2. browser SESSION publish using v0.64.9 resolver
3. if SESSION == WRITTEN
      HOST_LOCAL = NOT_NEEDED
   else if serialized capsule is valid and <= 16384 chars
      one HOST_LOCAL setItem attempt
4. record bounded dispositions
```

Host-local fallback is eligible when browser session cannot provide a successful durable write, including:

```text
SESSION UNAVAILABLE
SESSION FAILED
```

It is not eligible when the common payload itself is invalid:

```text
serialization failure
OVERSIZE > 16384
```

A larger/more durable store must not bypass the common privacy/size contract.

### 8.2 Serialization

Serialize the capsule at most once per checkpoint.

If browser-session processing already produced the serialized payload/char count, reuse it.

Do not stringify independently for each transport.

### 8.3 Host-local write statuses

Frozen checkpoint vocabulary:

```text
NOT_NEEDED
UNAVAILABLE
WRITTEN
FAILED
OVERSIZE
```

Meaning:

```text
NOT_NEEDED
= higher-priority browser SESSION already wrote successfully

UNAVAILABLE
= Host local API/store was not usable

WRITTEN
= real setItem of the authorized telemetry capsule completed

FAILED
= usable surface was reached but the actual real operation failed

OVERSIZE
= common capsule exceeded 16384 chars; no Host-local write attempted
```

Maximum Host-local real write attempts per checkpoint:

```text
1
```

No retry, exponential backoff, second key, timer, interval, queue, or background repair is authorized.

### 8.4 Output failure isolation

The Host-local write occurs only after authoritative output success.

If Host-local acquisition/write/clear fails:

```text
already successful output remains COMMITTED
Core state is not rolled back
Mirror semantics are unchanged
ordinary Core warnings are not added solely for transport failure
```

The failure is exposed through bounded telemetry diagnostics.

---

## 9. Why OUTPUT_COMMIT may await one Host-local write

The v0.64.10 live contract requires the operator to know that durable fallback storage exists **before refreshing**.

Therefore the normal eligible output telemetry stage may await the single Host-local `setItem` operation before finalizing the copied Last Turn Diagnostic.

This wait is outside the request→provider generation critical path and occurs after authoritative output success.

Required semantic separation:

```text
visible/Core output success
!=
telemetry sidecar durability success
```

The diagnostic must show actual completion, not an unverified scheduled write.

Do not introduce a `PENDING` background write state in v0.64.10.

This keeps operator behavior simple:

```text
HOST_LOCAL WRITTEN
→ safe to preserve baseline and proceed to refresh step
```

rather than requiring a second polling/copy action.

Record Host-local write elapsed time explicitly so real performance cost is observable.

---

## 10. Boot / boundary claim semantics

Claim priority remains:

```text
MEMORY valid
→ BROWSER SESSION valid
→ HOST_LOCAL valid
```

Host local is lowest priority because it has the broadest persistence lifetime.

The Host-local claim is a real transport operation, not a synthetic capability probe.

### 10.1 First-request readiness

Host-local claim must finish before the first natural request of a new runtime is allowed to establish a fresh cache-observer baseline when Host-local continuity may exist.

Preferred integration contract:

```text
new runtime / first request bootstrap
→ resolve current locationKey
→ acquire Host-local store once
→ read pending mailbox once
→ perform bounded consume/validation flow
→ import compatible telemetry if selected
→ only then allow first request topology/trajectory observation to become authoritative
```

This work may be attached to the existing first-request/session bootstrap path rather than creating a new timer or background owner.

No Host-local mailbox read is allowed on every request.

Maximum Host-local mailbox reads per runtime generation:

```text
1
```

### 10.2 Read result vocabulary

Frozen claim/read statuses:

```text
EMPTY
READ_FAILED
FOREIGN_LOCATION
CONSUMED
CONSUME_FAILED
STALE
MALFORMED
INCOMPATIBLE
UNAVAILABLE
```

### 10.3 Foreign-location rule

Because the Host-local key is a single plugin-wide pending mailbox, the location guard must be checked before destructive consumption.

```text
capsule.locationKey != current locationKey
→ FOREIGN_LOCATION
→ do not adopt
→ do not remove/clear the mailbox solely from this location
```

This prevents one chat/runtime from destroying a pending handoff that may belong to another location.

The mailbox may later be overwritten by another legitimate eligible output because the design is intentionally single-slot.

### 10.4 Same-location consume-before-adopt

For a capsule whose location matches the current location:

```text
read
→ basic parse/schema envelope check
→ attempt destructive consume
→ only if consume succeeds, continue adoption validation/selection
```

Preferred consume operation:

```text
removeItem(HOST_LOCAL_KEY)
```

Fallback when `removeItem` is not callable:

```text
setItem(HOST_LOCAL_KEY, '')
```

Empty string is treated as no pending capsule.

If destructive consumption fails:

```text
CONSUME_FAILED
→ do not adopt
```

This fail-closed rule prevents a persistent capsule from being repeatedly re-adopted across later runtime boots.

### 10.5 Validation after successful consumption

After same-location consumption succeeds, apply the existing compatibility checks:

```text
schema == 1
capturedAt age <= 10 minutes
sourceVersion compatible
locationKey exact
bounded exports structurally valid
```

Then classify:

```text
valid        -> candidate HOST_LOCAL
stale        -> STALE
malformed    -> MALFORMED
incompatible -> INCOMPATIBLE
```

A consumed invalid capsule must not be restored to storage.

### 10.6 Lower-priority cleanup when higher transport wins

If MEMORY or browser SESSION supplies the accepted compatible candidate, a same-location Host-local capsule that was safely consumed remains consumed.

Do not leave a duplicate matching Host-local capsule behind to replay on a later boot.

A foreign-location capsule remains untouched.

---

## 11. Cross-boundary identity limits

Host-local persistence cannot prove that the new runtime is the same physical browser tab.

Therefore v0.64.10 must not invent a `sameTab=true` field or equivalent claim.

Supported runtime fact:

```text
compatible metadata capsule for this location was consumed from Host local plugin storage
```

Same-tab proof comes from the operator episode:

```text
pre-refresh diagnostic
+ explicit same-tab F5/page refresh
+ changed runtime generation
+ first post-refresh diagnostic
+ second post-refresh diagnostic
```

This distinction is mandatory in both diagnostics and evidence documents.

---

## 12. Diagnostic surface

Keep v0.64.9 lines unchanged in meaning:

```text
Session surface: WINDOW ... · GLOBAL_THIS ... · relation ...
Telemetry continuity: ...
```

Add bounded Host-local transport attribution.

### 12.1 Host-local surface/claim line

Example:

```text
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
```

or:

```text
Host-local transport: API PRESENT · store USABLE · clear EMPTY_WRITE · boot CONSUMED
```

or:

```text
Host-local transport: API PRESENT · store ACQUIRE_FAILED · boot UNAVAILABLE
```

The exact formatter may be shorter, but it must expose at least:

```text
Host API surface presence
store acquisition disposition
clear mode when known
last boot-claim disposition
```

No exception text may be included.

### 12.2 Checkpoint line

Positive current-host expected shape:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 1842 chars · host 18.0 ms · trigger OUTPUT_COMMIT
```

Browser-session positive control:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION WRITTEN via WINDOW · HOST_LOCAL NOT_NEEDED · 1842 chars · trigger OUTPUT_COMMIT
```

Host-local actual failure:

```text
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL FAILED · 1842 chars · host 9.0 ms · trigger OUTPUT_COMMIT
```

The diagnostic must not collapse `UNAVAILABLE` and `FAILED`.

### 12.3 Continuity line

Successful Host-local adoption:

```text
Telemetry continuity: ADOPTED · via host-local · from 0.64.10 · age <...> · location compatible
```

If browser session wins, preserve existing `via session · root ...` semantics.

If memory wins, preserve existing memory/hot-reload semantics.

Provider cache remains `UNVERIFIED` in every case.

---

## 13. Transport priority matrix

Canonical publish matrix:

```text
MEMORY      SESSION                  HOST_LOCAL
WRITTEN     WRITTEN                  NOT_NEEDED
WRITTEN     UNAVAILABLE              attempt one real Host-local write
WRITTEN     FAILED                   attempt one real Host-local write
WRITTEN     OVERSIZE                 OVERSIZE / no Host-local write
FAILED      WRITTEN                  NOT_NEEDED
FAILED      UNAVAILABLE/FAILED       Host-local may still attempt if common capsule valid
```

Canonical claim matrix:

```text
valid MEMORY
→ accept MEMORY
→ safely consume matching lower durable duplicates where addressed

no valid MEMORY + valid SESSION
→ accept SESSION
→ safely consume matching HOST_LOCAL duplicate

no valid MEMORY/SESSION + valid consumed HOST_LOCAL
→ accept HOST_LOCAL

none valid
→ FRESH
```

Do not blend metadata from multiple candidate capsules into one synthetic trajectory.

One accepted candidate supplies the imported telemetry snapshot.

---

## 14. Live failure routing

v0.64.10 distinguishes these operational routes.

### Route A — Host-local fallback works

```text
SESSION unavailable/failed
HOST_LOCAL WRITTEN pre-refresh
same-tab refresh
HOST_LOCAL matching capsule read + consumed
Telemetry continuity ADOPTED via host-local
second natural request continues trajectory without re-adoption
```

Interpretation:

```text
Host-local fallback LIVE PROVEN
same-tab continuity chain can close if all semantic/regression controls pass
```

### Route B — Host API/store unavailable

```text
API_ABSENT / ACQUIRE_FAILED / METHODS_INCOMPLETE
→ HOST_LOCAL UNAVAILABLE
```

Interpretation:

```text
pre-refresh gate fails
no refresh required
next architecture needs different Host-supported durability evidence
```

### Route C — usable store but real write fails

```text
store USABLE
setItem real telemetry checkpoint -> FAILED
```

Interpretation:

```text
surface exists
use failed
not an absence claim
pre-refresh gate fails
```

### Route D — write succeeds but consume fails after refresh

```text
pre-refresh HOST_LOCAL WRITTEN
post-refresh matching mailbox found
remove/clear fails
→ CONSUME_FAILED
→ no adoption
```

Interpretation:

```text
persistence exists
safe one-shot semantics not established
live gate FAIL
```

### Route E — stale/malformed/incompatible candidate

```text
matching mailbox consumed
validation rejects
→ no adoption
```

Interpretation depends on reason; do not treat rejection as transport absence.

---

## 15. Performance contract

All new work remains O(1) with respect to chat length.

Maximum additional Host-local work per runtime generation:

```text
store acquisition: 1
boot mailbox getItem: 1
boot consume: at most 1 removeItem OR empty setItem
```

Maximum additional Host-local work per eligible checkpoint when browser session did not write:

```text
setItem: 1
```

Forbidden:

```text
history scan
chat scan
keys enumeration
storage sweep
polling
interval
background retry
network
filesystem
IndexedDB
localStorage
second Host-local key
raw body serialization
```

The Last Turn Diagnostic must expose Host-local write timing separately from existing Turn/Output Store timings so later performance review does not conflate different storage owners.

No correctness failure is inferred from latency alone without an owning threshold or demonstrated consequence.

---

## 16. Privacy / persistence threat boundary

Host-local storage has a broader lifetime than browser sessionStorage, so the following protections are mandatory rather than optional:

```text
metadata-only capsule
16,384-char hard cap
10-minute freshness cap
exact location guard
one pending mailbox
consume-before-adopt for matching location
no raw bodies/prompts
no semantic state
no provider claim
```

Never expose Host-local stored capsule contents in the diagnostic panel/update card.

Diagnostics may expose only bounded dispositions, char count, age, timing, transport name, and compatibility result.

---

## 17. Core semantic owners remain frozen

v0.64.10 may not change:

```text
Store semantic schema / retention
Lifecycle / mode / broadcast
Time / Narrative / post-B_END handoff
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

The release may change only:

```text
runtime-telemetry Host-local fallback transport
bounded transport diagnostics
operator release-card static content for v0.64.10
fixtures/tests/build metadata required for this release
```

---

## 18. Operator Release Card update contract

The existing `업데이트 내역` panel is now a permanent release-maintenance surface and must be updated in the same v0.64.10 release.

Top-level UI invariants remain:

```text
Risuai.registerButton count unchanged
Risuai.registerSetting count unchanged
ordinary simcoreUiParts = 2
no new top-level UI part
```

Current card identity:

```text
v0.64.10 — Host-Local One-Shot Telemetry Handoff
scenario: 06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Recent ledger:

```text
0.64.10 Host-Local One-Shot Telemetry Handoff
0.64.9  Session Transport Root Resolution
0.64.8  Output-Complete Telemetry Checkpoint Repair
```

Canonical simple Korean update summary:

```text
• 브라우저 sessionStorage를 쓸 수 없을 때 Host 로컬 저장소를 telemetry handoff 대체 경로로 사용
• 저장 내용은 10분 TTL / location 일치 / 16KB 이하의 메타데이터-only capsule으로 제한
• 같은 location의 capsule은 안전하게 지운 뒤에만 한 번 채택
• SESSION 또는 HOST_LOCAL이 실제 WRITTEN일 때만 새로고침 실험 진행
```

The card remains guidance only and never becomes PASS/FAIL authority.

It performs no extra storage operation merely to render the card.

---

## 19. Exact v0.64.10 live test card

### Step 1 — first natural request after update

```text
v0.64.10 설치/업데이트
→ 새로고침하지 않음
→ 자연 요청 1회
→ 전체 진단 확인/복사
```

Required fields:

```text
Version: 0.64.10
Runtime boot / generation
Session surface
Host-local transport
Telemetry checkpoint
Warnings / Compatibility
RAW current input/output semantic fit
```

### Step 2 — pre-refresh positive condition

Continue only if a durable transport actually reports `WRITTEN`.

Expected in the currently observed host:

```text
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN
```

Alternate healthy host:

```text
SESSION WRITTEN
HOST_LOCAL NOT_NEEDED
```

Then:

```text
pre-refresh full diagnostic preserved
→ same-tab page refresh/F5
```

Stop before refresh if any of these occur:

```text
HOST_LOCAL UNAVAILABLE
HOST_LOCAL FAILED
HOST_LOCAL OVERSIZE
common serialization failure
required transport diagnostic field missing
unexpected output/Core semantic regression
```

### Step 3 — first natural request after refresh

```text
ordinary same-tab refresh
→ natural request #1
→ full diagnostic copy
```

Expected current-host route:

```text
runtime generation changed
Telemetry continuity: ADOPTED · via host-local
matching Host-local capsule consumed successfully
compatible observer state restored where eligible
provider cache remains UNVERIFIED
visible response semantics healthy
```

### Step 4 — second natural request after refresh

Without retry/reroll/manual edit between post-refresh requests:

```text
natural request #2
→ full diagnostic copy
```

Expected:

```text
no repeated adoption of old capsule
trajectory continues from restored observer state
no artificial second BASELINE reset
new OUTPUT_COMMIT checkpoint writes a fresh durable capsule again
normal Core semantics remain healthy
```

Recommended submission packet:

```text
A. pre-refresh durable-WRITTEN diagnostic
B. first post-refresh diagnostic
C. second post-refresh diagnostic
+ explicit operator note: same-tab page refresh between A and B
```

---

## 20. Permanent verification requirements

Minimum executable/static regression matrix before publication:

```text
1. version/card/scenario identify 0.64.10 exactly
2. parent inputs are exact immutable v0.64.9 release bytes
3. latest.js == install.js
4. existing v0.64.9 browser session root tests remain passing
5. session WRITTEN -> HOST_LOCAL NOT_NEEDED and no Host-local setItem
6. session UNAVAILABLE + Host store usable -> exactly one Host-local setItem
7. session FAILED + Host store usable -> exactly one Host-local setItem
8. host API absent -> HOST_LOCAL UNAVAILABLE, output remains COMMITTED
9. host acquisition rejects -> ACQUIRE_FAILED / UNAVAILABLE, output remains COMMITTED
10. store missing getItem or setItem -> METHODS_INCOMPLETE
11. real Host-local setItem rejects -> HOST_LOCAL FAILED, no retry
12. serialization failure -> no Host-local write
13. >16384 chars -> OVERSIZE, no Host-local write
14. Host-local uses same metadata-only capsule / schema 1
15. acquisition occurs at most once per runtime generation
16. boot mailbox read occurs at most once per runtime generation
17. empty mailbox -> EMPTY
18. foreign-location capsule -> FOREIGN_LOCATION, no adopt, no destructive clear
19. matching valid capsule + removeItem success -> CONSUMED then eligible adoption
20. matching valid capsule + no removeItem + empty setItem success -> CONSUMED then eligible adoption
21. matching capsule consume failure -> CONSUME_FAILED, no adoption
22. stale matching capsule is consumed then rejected
23. malformed matching capsule is consumed then rejected
24. incompatible matching capsule is consumed then rejected
25. valid MEMORY beats valid SESSION/HOST_LOCAL
26. valid SESSION beats valid HOST_LOCAL when MEMORY absent
27. valid HOST_LOCAL adopted only when higher transports not accepted
28. matching lower Host-local duplicate is consumed even when higher transport wins
29. foreign-location mailbox is not destroyed by another location boot
30. no second Host-local key is introduced
31. no storage keys enumeration/sweep
32. no localStorage/IndexedDB/filesystem/network transport
33. no timer/polling/background retry added
34. inactive/BYPASSED/stale output cannot write Host-local checkpoint
35. authoritative output-save failure cannot write Host-local checkpoint
36. Host-local failure cannot downgrade already successful output
37. no raw user/assistant/prompt body is persisted
38. provider cache remains UNVERIFIED
39. Last Turn Diagnostic exposes Host-local acquisition/claim/write disposition without exception text
40. update card current + previous 2 release ledger is 0.64.10/0.64.9/0.64.8
41. update card requires durable WRITTEN before refresh
42. update card says capture anomaly before retry/edit
43. update card does not perform storage/network/timer operations
44. ordinary simcoreUiParts remains 2
45. architecture/Contracts and frozen semantic-owner suites pass
```

---

## 21. Required live acceptance

Scenario:

```text
06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

PASS requires one coherent Diagnostic Review Episode proving:

```text
pre-refresh:
- v0.64.10
- ordinary Core output healthy
- durable checkpoint WRITTEN
- in current host, expected durable path = HOST_LOCAL

boundary:
- explicit same-tab full-page refresh
- runtime boot/generation changes

post-refresh #1:
- natural request
- compatible telemetry ADOPTED via host-local (or session if that host unexpectedly supports it)
- previous observer trajectory/topology restored where compatible
- no provider-cache overclaim
- visible RAW semantics healthy

post-refresh #2:
- natural request without intervening retry/edit/reroll
- no repeated adoption of old capsule
- trajectory continues
- fresh checkpoint written for the new runtime
- visible RAW semantics healthy
```

Any PRE_SIMCORE Host/history change must continue to be reported truthfully and does not automatically fail the release unless it violates this transport contract.

A provider-cache HIT/MISS claim is neither required nor allowed.

---

## 22. Gate / sequencing rule

Current sequence becomes:

```text
v0.64.9 LIVE FAIL / Route C
→ v0.64.10 Host-Local One-Shot Telemetry Handoff
→ static + permanent fixture qualification
→ genuine release publication through current release system
→ 06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
→ only after LIVE PASS may the blocked M2 runtime ownership sequence advance
```

Do not start or mix M2-3 runtime ownership extraction into v0.64.10.

Do not silently classify Host-local persistence as product success before the actual refresh/adoption episode exists.

---

## 23. Non-goals

v0.64.10 does not attempt to:

```text
fix PocketRisu/WebView sessionStorage ACCESS_ERROR
identify the underlying browser security exception
make Host local storage transactional
support arbitrary multi-tab routing guarantees
create per-chat persistent telemetry keys
persist Core semantic state across reload
improve provider cache reuse
change request/history mutation
change prompt semantics
solve existing storage latency
implement the full Host Capability Receipt S-07
implement M2-3
```

---

## 24. Final frozen verdict

```text
release: v0.64.10 — Host-Local One-Shot Telemetry Handoff
status: DESIGN ACTIVATED
runtime change: REQUIRED
parent: immutable v0.64.9
new durable fallback: Risuai.getLocalPluginStorage()
new Host-local telemetry slot: exactly 1
persistence model: one pending mailbox
payload: existing metadata-only schema-1 capsule
max age: 10 minutes
max serialized chars: 16384
publish priority: MEMORY -> SESSION -> HOST_LOCAL
claim priority: MEMORY -> SESSION -> HOST_LOCAL
matching-location adoption rule: consume-before-adopt
foreign-location rule: no adopt / no destructive clear
provider cache: UNVERIFIED
Core semantic changes: NONE
operator update card: UPDATE REQUIRED, same panel/UI parts 2
required live gate: 06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
M2-3: BLOCKED UNTIL THIS CONTINUITY CHAIN CLOSES
```

Related authority:

- `docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md`
- `docs/SIMCORE_06409_SESSION_TRANSPORT_ROOT_RESOLUTION_ACTIVATION.md`
- `docs/SIMCORE_06409_OPERATOR_RELEASE_CARD_ADJUNCT_DESIGN.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- production `release-simcore/plugins/simcore/latest.js`
- repository Host-local precedent `plugins/usage-dashboard/src/90-bootstrap.part.js`
- repository Host-local clear precedent `plugins/usage-dashboard/src/60-settings-runtime.part.js`
