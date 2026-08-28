# SimCore v0.64.10 — Host-Local One-Shot Telemetry Handoff Implementation Evidence

Date: 2026-08-28 KST
Status: **IMPLEMENTED ON WORK BRANCH · CANDIDATE/PERMANENT CI PENDING · RUNTIME CHANGE · LIVE PROOF PENDING**
Release work item: `#679`
Design authority: `docs/SIMCORE_06410_HOST_LOCAL_ONE_SHOT_TELEMETRY_HANDOFF_ACTIVATION.md`
Trigger evidence: `docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md`
Parent production commit: `1c1037e44d6b3e903b3d622b579095b1f315758e`
Parent production blob: `7d2731d256b8aa18598c389fd919550cf3bbf146`
Required live gate: `06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT`

## 1. Bounded implementation slice

v0.64.10 changes only the runtime-telemetry durability/diagnostic path and the existing operator release card.

Canonical publish priority remains:

```text
MEMORY
→ BROWSER SESSION (v0.64.9 WINDOW / GLOBAL_THIS resolver)
→ HOST_LOCAL only when SESSION did not write
```

Authorized new Host surface:

```text
Risuai.getLocalPluginStorage()
```

Authorized new telemetry slot:

```text
__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__
```

The implementation owns exactly one Host-local pending mailbox and does not create per-chat, per-turn, per-generation, timestamped, enumerated, or swept storage keys.

## 2. Existing capsule/privacy contract preserved

The Host-local path reuses the existing schema-1 metadata-only telemetry capsule.

Frozen bounds remain:

```text
MAX_AGE_MS = 10 minutes
MAX_SERIALIZED_CHARS = 16384
locationKey = exact match
provider cache = UNVERIFIED
```

The Host-local writer cannot bypass a common serialization failure or the 16,384-character bound.

No raw user body, raw assistant body, prompt text, full history, Core semantic snapshot, Knowledge/COMMUNITY body, Host object, exception message/stack, URL/origin/user-agent, or provider-cache inference is persisted.

## 3. Host store lifecycle

The runtime-telemetry owner adds one runtime-scoped lazy acquisition promise.

```text
Host store acquisition attempts / runtime generation <= 1
Host mailbox reads / runtime generation <= 1
Host checkpoint writes / eligible checkpoint <= 1
Host consume operations / runtime generation <= 1
```

Success and failure acquisition results are both memoized for the runtime generation.

No retry loop, timer, interval, queue, polling, background acquisition, storage scan, or keys enumeration is added.

## 4. Publish / output isolation

The authoritative output boundary remains the existing one:

```text
CoreRulesetSession.processOutput returned active
AND runtime generation still current
AND location key known
→ await checkpointRuntimeTelemetry('OUTPUT_COMMIT')
```

The Host-local `setItem` may be awaited only after authoritative Core output success.

The wait is needed so the copied Last Turn Diagnostic reports a completed `HOST_LOCAL WRITTEN` before the operator performs the refresh episode.

A Host API/store/write failure remains telemetry-only and cannot roll back or downgrade the already successful output.

`UNLOAD` reuses the same canonical async checkpoint helper and does not fork a second writer.

## 5. Claim / one-shot semantics

Claim priority remains:

```text
valid MEMORY
→ valid SESSION
→ valid consumed HOST_LOCAL
```

The first request waits for the one-shot Host-local mailbox read before telemetry adoption is finalized and before the existing observer state is imported/observed.

Foreign mailbox rule:

```text
locationKey differs
→ FOREIGN_LOCATION
→ no adoption
→ no destructive clear
```

Matching mailbox rule:

```text
parse basic envelope
→ destructive consume by removeItem or empty-string setItem
→ only after consume succeeds, compatibility validation/adoption may proceed
```

Consume failure is fail-closed:

```text
CONSUME_FAILED
→ no adoption
```

A matching stale, structurally malformed, or incompatible capsule is consumed and then rejected, so it cannot replay on a later runtime.

A matching lower Host-local duplicate is consumed even when valid MEMORY or SESSION wins.

## 6. Diagnostic attribution

v0.64.9 Session surface diagnostics are preserved.

v0.64.10 adds bounded Host-local attribution:

```text
Host API PRESENT / ABSENT
store API_ABSENT / ACQUIRE_FAILED / METHODS_INCOMPLETE / USABLE
clear REMOVE / EMPTY_WRITE / UNKNOWN
boot EMPTY / READ_FAILED / FOREIGN_LOCATION / CONSUMED / CONSUME_FAILED / STALE / MALFORMED / INCOMPATIBLE / UNAVAILABLE
checkpoint HOST_LOCAL NOT_NEEDED / UNAVAILABLE / WRITTEN / FAILED / OVERSIZE
Host write elapsed time
common serialization disposition when it is not OK
```

No exception text or stored capsule body is rendered.

The continuity formatter reuses the existing transport field, so a successful Host-local candidate reports `ADOPTED · via host-local` without inventing a same-tab runtime fact.

## 7. Operator Release Card

The existing collapsed `업데이트 내역` surface is updated in-place.

Current identity:

```text
v0.64.10 — Host-Local One-Shot Telemetry Handoff
06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT
```

Recent ledger:

```text
0.64.10
0.64.9
0.64.8
```

The card requires an actual `SESSION WRITTEN` or `HOST_LOCAL WRITTEN` before refresh and keeps anomaly capture before retry/edit/reroll.

Top-level `Risuai.registerButton` / `Risuai.registerSetting` counts remain unchanged and no rendering-time storage/network/timer operation is introduced.

## 8. Permanent regression surface

Existing required suites remain active, including R2.1 release-spec parity, R2.2 closure-integrity and R2.3 stability-seal.

The v0.64.9 reload suite is wrapped only to understand the v0.64.10 async checkpoint spelling while continuing to execute the actual v0.64.10 runtime-telemetry module.

New required suite:

```text
host-local-telemetry
coverage = EXECUTABLE
required = true
goldenGate = true
batch-a = included
```

It covers, among other controls:

```text
SESSION WRITTEN -> HOST_LOCAL NOT_NEEDED
SESSION UNAVAILABLE -> exactly one Host-local write
SESSION FAILED -> exactly one Host-local write
API absent / acquire rejected / methods incomplete
Host real write failure with no retry
common serialization failure -> no Host acquisition/write
oversize -> no Host acquisition/write
Host acquisition once and boot read once
READ_FAILED one-shot behavior
FOREIGN_LOCATION non-destructive behavior
removeItem consume path
empty-string consume fallback
CONSUME_FAILED -> no adoption
matching stale/malformed/incompatible consumed then rejected
MEMORY > SESSION > HOST_LOCAL priority
matching lower Host duplicate consumed
first-request Host claim awaited before observer adoption
active/current authoritative-output gate around Host checkpoint
single Host-local key owner
no localStorage / IndexedDB / storage scan / timers / network
provider cache remains UNVERIFIED
no new top-level UI registration
```

## 9. Pre-merge audit / fixes

The SimCore pre-release runtime audit lens was applied before PR creation.

Runtime result:

```text
Memory growth        = bounded single promise/result/probe objects only
Long-lived Map/Set   = NONE added
CPU/chat-length work = O(1)
Timers/polling       = NONE
Network              = NONE
Async race surface   = single shared acquisition promise; one-shot read flag
Resource lifecycle   = one store handle per runtime generation only
Raw body retention   = NONE
Core semantic writes = NONE
Provider claims      = NONE
```

No runtime BLOCKER was found in the implemented scope.

Three pre-PR implementation/test-harness findings were closed before candidate creation:

```text
06410_BUILDER_HOST_API_NOTE_COUNT
= FIX / TEST_HARNESS_POSTCONDITION / NON_RUNTIME / CLOSED_PRE_PR

Cause:
The draft builder counted `getLocalPluginStorage` across the complete generated bundle, so the release-note mention collided with the single executable API call.

Resolution:
The release builder keeps the executable runtime use exact and makes the release note refer to the authorized Host-local API generically.

06410_HOST_KEY_LITERAL_COUNT_ASSERTION
= FIX / TEST_HARNESS_ASSERTION / NON_RUNTIME / CLOSED_PRE_PR

Cause:
The first draft test confused total key-literal occurrences with storage-key ownership.

Resolution:
The permanent wrapper verifies exactly one `HOST_LOCAL_KEY` declaration and exactly one quoted Host-local key literal in the actual runtime-telemetry module before running the executable matrix.

06410_SERIALIZATION_DIAGNOSTIC_ATTRIBUTION
= FIX / DIAGNOSTIC_ATTRIBUTION / NON_SEMANTIC / CLOSED_PRE_PR

Cause:
Common serialization failure already blocked Host I/O but its disposition was not projected into the outer Last Turn Diagnostic probe.

Resolution:
The release builder retains the bounded serialization disposition and exposes it when non-OK; no raw payload/error text is retained.
```

## 10. Release-system boundary

PR1 must not directly modify production plugin bytes on `main`.

The permanent candidate system owns materialization from the exact immutable v0.64.9 parent using:

```text
products/simcore/tooling/build-06410-host-local-one-shot-telemetry-handoff-release.py
```

Candidate acceptance still requires:

```text
direct parent = 1c1037e44d6b3e903b3d622b579095b1f315758e
changed runtime paths = latest.js + install.js only
latest.js == install.js
version = 0.64.10
batch-a = PASS
machine receipt = PASS
```

## 11. Frozen semantic owners

No change is authorized to Store semantic schema/retention, Lifecycle/modes, Broadcast/Time/Frame, Representation/Edit Reconcile, Runtime/Deferred Mirror, Recovery, Output Compat, Bootstrap Migration, Evidence/Lineage/Handoff/Recurrence, Summary Scope, Structure/COMMUNITY/Reaction, prompt semantics, request-history mutation, provider-cache claims, or M2-3 ownership extraction.

## 12. Honest verdict

```text
implementation = PROPOSED ON WORK BRANCH
runtime scope = HOST-LOCAL TELEMETRY FALLBACK ONLY
static/permanent candidate qualification = PENDING
production publication = NOT YET PERFORMED
real long-chat = PENDING
provider cache = UNVERIFIED
```

Static/executable evidence cannot prove that the Host store survives the actual same-tab full-page refresh.

Only the required human episode `06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT` may close that claim.
