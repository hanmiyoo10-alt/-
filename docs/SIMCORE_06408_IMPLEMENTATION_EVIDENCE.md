# SimCore v0.64.8 — Output-Complete Telemetry Checkpoint Repair Implementation Evidence

Date: 2026-08-27
Status: **PR1 IMPLEMENTED · PERMANENT VERIFIER UPDATED · CANDIDATE PENDING · NO PRODUCTION MUTATION**

Release work item: `#623`
Design authority: `docs/SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`
Parent production P: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Parent version: `0.64.7`
Target version: `0.64.8`
Target release: `Output-Complete Telemetry Checkpoint Repair`
Live gate after publication: `06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Major checkpoint: `2.0M / M2-2` unchanged

## 1. Trigger and classification

Natural v0.64.7 same-tab refresh evidence closed the previous live gate as:

```text
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
= FAIL / CONFIRMED_BLOCKING
```

Source review isolated the defect as:

```text
OUTPUT_CHECKPOINT_CALLSITE_OMITTED
= FIX / BLOCKER
```

The v0.64.7 runtime-telemetry helper could publish memory + same-tab sessionStorage, but the released outer runtime invoked that publish only from `Risuai.onUnload(...)`. The intended output-complete durability edge was therefore absent.

No broader runtime redesign is justified by the evidence.

## 2. Immutable implementation parent

The candidate request binds exact production parent:

```text
P = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
version = 0.64.7
release blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
latest.js == install.js = required
```

PR1 does not copy production plugin bytes into `main`. The generic R2.1 candidate controller will materialize the exact candidate from P using the merged PR1 commit as immutable source S.

## 3. Runtime implementation boundary

Builder:

```text
products/simcore/tooling/build-06408-output-complete-checkpoint-repair.py
```

Allowed candidate runtime paths remain exactly:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

The builder performs the following bounded patch only:

```text
0.64.7 -> 0.64.8 metadata/runtime version
+ v0.64.8 release note
+ one lastTelemetryCheckpointProbe
+ one canonical checkpointRuntimeTelemetry(trigger) wrapper
+ one OUTPUT_COMMIT callsite after active authoritative processOutput return
+ one bounded Last Turn Diagnostic line
+ UNLOAD routed through the same checkpoint wrapper
```

No change is made to the `runtime-telemetry` capsule schema or its claim/adoption algorithm.

## 4. Exact source seam

Production v0.64.7 outer output flow is:

```text
await cs.processOutput(...)
→ if !result.active: BYPASSED / return
→ mark outputStatus COMMITTED
→ diagnostics / deferred mirror work
```

`cs.processOutput(...)` returns active only after its authoritative output persistence path succeeds and the live Core session state/fingerprints advance.

v0.64.8 inserts:

```text
await cs.processOutput(...)
→ if !result.active: BYPASSED / return
→ if current runtime generation + known location
     checkpointRuntimeTelemetry('OUTPUT_COMMIT')
→ mark outputStatus COMMITTED
```

The checkpoint wrapper is synchronous/browser-local and fully catches its own failures. A telemetry failure cannot throw into the already-successful Core output path.

## 5. Shared checkpoint path

`checkpointRuntimeTelemetry(trigger)` is the only new capsule-capture callsite owner.

It captures the already-existing bounded tracker exports exactly once per invocation:

```text
runtimePromptCache.exportState()
requestTopology.exportState()
cacheCandidates.exportState()
```

Then it reuses the existing:

```text
runtimeTelemetryRules.capture(...)
runtimeTelemetryRules.publish(globalThis, windowLike, capsule)
runtimeTelemetryRules.diagnostics().write
```

Triggers:

```text
OUTPUT_COMMIT
UNLOAD
```

The old direct unload capture/publish block is removed so OUTPUT_COMMIT and UNLOAD cannot drift into two telemetry schemas.

## 6. Bounded checkpoint probe

The new memory-only diagnostic probe contains only:

```text
trigger
memory write disposition
session write disposition
serializedChars
elapsedMs
retainedBodies = false
```

Failure fallback contains bounded status only. It retains no exception message and no serialized capsule.

Last Turn Diagnostic gains one line:

```text
Telemetry checkpoint: SESSION · <disposition> · <chars> chars · <cost> · trigger <OUTPUT_COMMIT|UNLOAD>
```

`Telemetry continuity` remains a separate adoption/claim statement.

Provider wording remains:

```text
provider cache UNVERIFIED
```

## 7. Frozen transport and privacy contracts

Unchanged:

```text
capsule schema = 1
memory transport key = __SIMCORE_TELEMETRY_HANDOFF_V1__
session key = __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
MAX_AGE_MS = 10 minutes
MAX_SESSION_CHARS = 16384
claim priority = valid memory first, session fallback
session claim consumption = once
```

Retained data boundary remains:

```text
NO raw user body
NO raw assistant body
NO raw Fresh body
NO system/runtime prompt bytes
NO generated output body
NO COMMUNITY/comment text
NO full chat history
NO Core semantic snapshot
```

## 8. Runtime audit lens

The standing SimCore pre-release runtime audit was applied to the new path.

### Memory / retention

```text
new unbounded collection: NONE
new raw-body retention: NONE
new long-lived payload retention: NONE
checkpoint probe: one bounded latest-value object only
```

### CPU / event loop

```text
request->provider critical-path work: NONE
new loop: NONE
new scan: NONE
new timer/polling: NONE
checkpoint work: one bounded JSON serialization + same-tab browser-local write after output commit
```

### Async / race safety

```text
checkpoint eligibility requires current runtime generation
inactive output returns before checkpoint
failed authoritative processOutput cannot reach checkpoint
wrapper catches transport failures
UNLOAD remains last-chance redundancy only
```

### Resource lifecycle

```text
new listener: NONE
new observer: NONE
new interval/timeout loop: NONE
new network handle: NONE
sessionStorage resource ownership: existing runtime-telemetry module unchanged
```

Current audit disposition:

```text
new BLOCKER found: NONE
new FIX found: NONE
new WATCH found: NONE
new DEFER found: NONE
```

This is static evidence only and does not replace candidate CI or real long-chat validation.

## 9. Permanent verifier change

Existing golden suite remains the owner:

```text
reload-cache-continuity
```

Its fixture advances to `reload-cache-continuity-v2` while preserving all v0.64.7 transport cases.

For a v0.64.8 candidate it additionally requires:

```text
OUTPUT_COMMIT checkpoint ordered after cs.processOutput + active gate
OUTPUT_COMMIT checkpoint ordered before COMMITTED bookkeeping
exactly one OUTPUT_COMMIT callsite
current-generation + known-location eligibility guard
exactly one UNLOAD callsite
no direct unload runtimeTelemetryRules.publish fork
canonical wrapper failure isolation
bounded Telemetry checkpoint diagnostic
frozen session key / 10-minute age / 16,384-char bound
```

Critical permanent assertion:

```text
runtime-telemetry helper can publish sessionStorage
!= output-complete checkpoint integration is wired
```

The suite therefore inspects the real outer callsite and cannot repeat the v0.64.7 false-positive coverage gap.

## 10. Candidate intent

PR1 contains:

```text
products/simcore/releases/candidate-requests/simcore-v0.64.8-intent-01.json
```

Bound intent:

```text
releaseId = simcore-v0.64.8-new-01
releaseMode = NEW_VERSION
P = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
builder = products/simcore/tooling/build-06408-output-complete-checkpoint-repair.py
verificationSuite = batch-a
changeClass = RUNTIME_CORRECTNESS_REPAIR
primaryGoalId = 06408_OUTPUT_CHECKPOINT_REPAIR
liveGate = 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
closeAuthority = HUMAN_EVIDENCE
```

No candidate commit/blob is manually entered. The permanent controller owns those machine-known identities after PR1 merge.

## 11. R2.1 genuine-release proof boundary

This release uses the already-qualified permanent R2.1 path without modifying release-system implementation:

```text
issue #623 explicit release work item
→ PR1 product + intent
→ generic candidate + machine receipt/spec shadow
→ PR2 delegated exact approval
→ permanent publication
→ durable LIVE_PENDING convergence
→ human plugin apply + real long-chat
→ LIVE_PASS closure only from real evidence
```

Any defect found in this release-operation path is evidence for the R track and must not be folded into the v0.64.8 runtime patch.

## 12. Current gate

At this evidence checkpoint:

```text
runtime design          ACTIVATED
PR1 implementation      COMPLETE ON WORK BRANCH
permanent verifier      UPDATED ON WORK BRANCH
candidate               NOT YET MATERIALIZED
production mutation     NONE
release-simcore         STILL v0.64.7
target live gate        NOT YET ELIGIBLE
M2-3                     FROZEN
```

Do not claim candidate PASS, publication, LIVE_PENDING, or LIVE_PASS until the corresponding machine/human evidence exists.
