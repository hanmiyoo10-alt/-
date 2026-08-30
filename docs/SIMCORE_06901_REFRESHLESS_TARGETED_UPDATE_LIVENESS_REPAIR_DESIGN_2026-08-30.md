# SimCore v0.69.1 Refreshless Targeted Update Liveness Repair Design

Date: 2026-08-30 KST
Status: **DESIGN FROZEN · IMPLEMENTATION NOT YET AUTHORIZED**
Classification: **CORRECTNESS MINI · RUNTIME LIFECYCLE / TARGETED UNLOAD · M2-6 MAINTENANCE · NO M2-7**

## 1. Release identity

```text
Target version: 0.69.1
Release name: Refreshless Targeted Update Liveness Repair
Parent production: v0.69.0
Parent release-simcore commit: 31b4c5075659a55861731c6fd73f999402321e94
Parent latest/install blob: 86954f4d7ff7dec9119e2a8c047bfbfa6f801d56
Major phase: M2
Major checkpoint: M2-6 unchanged
```

This is not M2-7.

Post-M2-5 roadmap authority explicitly states that M2-6 is the final currently justified structural M2 checkpoint and that M2-7 is not preauthorized. v0.69.1 is a narrow correctness mini discovered while closing v0.69.0 live acceptance.

Trigger authority:

- `docs/SIMCORE_06900_REFRESHLESS_PLUS_UPDATE_RECHECK_2026-08-30.md`
- `docs/SIMCORE_06900_M2_6_REAL_LONG_CHAT_EVIDENCE_2026-08-30.md`
- `docs/SIMCORE_POST_M2_5_ROADMAP_RECONCILIATION_2026-08-30.md`

## 2. Why this release exists

v0.69.0 M2-6 passed its real long-chat warm, non-fresh state rehydration, Community continuity, and genuine-edit semantic controls.

However, terminal LIVE_PASS is intentionally held by one separate runtime-lifecycle concern in the no-page-refresh `+` install/update path.

Current targeted unload ordering is:

```js
await Risuai.onUnload(async () => {
  runtimeDisposed = true;
  runtimeEpoch += 1;
  await checkpointRuntimeTelemetry('UNLOAD');
  await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);
  // UI + memory cleanup follows
});
```

The UNLOAD telemetry checkpoint currently uses the Host-aware durable path:

```text
runtimeTelemetryRules.publishWithHostLocal(...)
```

When browser Session transport is unavailable, the path can await Host-local acquisition and Host-local `setItem` with no bounded timeout.

Therefore the host can encounter this sequence:

```text
targeted replacement requested
-> old runtime logically DISPOSED
-> old runtime waits on optional telemetry I/O
-> old beforeRequest/output hooks are still physically registered
-> old onUnload callback has not completed
-> new runtime initialization can be delayed or appear stuck
```

Disposed/epoch guards protect state correctness while the old runtime is logically invalid, but they do not guarantee replacement liveness.

## 3. Design principle

The priority order is frozen as:

```text
RETIRE OLD RUNTIME FIRST
PRESERVE STALE-WORK SAFETY
PRESERVE EXACTLY-ONE ACTIVE HOOK PAIR
PRESERVE EXACTLY-ONE UI SURFACE
KEEP OUTPUT_COMMIT AS DURABLE TELEMETRY AUTHORITY
KEEP UNLOAD TELEMETRY BEST-EFFORT AND NON-HOST-BLOCKING
NO BACKGROUND RETRY
NO POLLING
NO NEW TIMER
NO NEW STORAGE KEY
NO NEW AUTHORITY
```

The release must repair the liveness boundary rather than weakening the v0.63.23-v0.63.25 targeted-reload safety model.

## 4. Existing telemetry authority that remains intact

The current telemetry subsystem already has two distinct publication capabilities:

```text
publish(...)
= memory + browser Session only
= synchronous local publication
= no Host-local acquisition/write

publishWithHostLocal(...)
= memory + browser Session + Host-local fallback
= may await Host API acquisition and Host-local write
```

Historical v0.64.10 authority explicitly made successful `OUTPUT_COMMIT` the awaited durable publication point after Core output success.

That contract remains correct and is preserved.

v0.69.1 therefore does not remove Host-local telemetry from normal output completion. It changes only which transport is allowed to participate in the targeted UNLOAD retirement path.

## 5. Selected repair

### 5.1 Split publication policy by trigger

Frozen target:

```text
OUTPUT_COMMIT
-> keep existing full durable publication
-> MEMORY -> SESSION -> HOST_LOCAL fallback
-> existing awaited semantics unchanged

UNLOAD
-> MUST NOT call or await Host-local transport
-> MAY publish only through existing synchronous local `publish(...)`
-> failure remains telemetry-only
-> no Host API acquisition
-> no Host-local setItem
```

The existing synchronous local `publish(...)` path is preferred over inventing a new transport because it already implements bounded memory/Session publication and does not touch the Host-local async surface.

If exact implementation audit proves that even the local-only UNLOAD publication is unnecessary, it may be omitted only if permanent regression still proves ordinary full-page refresh continuity from the authoritative OUTPUT_COMMIT checkpoint. The implementation must not silently substitute a new async mechanism.

### 5.2 Targeted unload ordering

Frozen ordering:

```text
onUnload begins
-> runtimeDisposed = true
-> runtimeEpoch += 1
-> physically remove named beforeRequest/output hooks
-> unregister SimCore UI parts
-> perform at most local-only UNLOAD telemetry publication
-> clear runtime-local handles/state
-> onUnload returns
```

No optional Host-local I/O may occur before hook retirement or before unload completion.

The highest-priority physical action after logical invalidation is old-hook retirement.

### 5.3 No fire-and-forget Host-local write

The repair must not replace the current await with:

```text
void publishWithHostLocal(...)
Promise without await
background continuation
setTimeout retry
polling loop
queue for later
```

That would create a stale old-runtime writer capable of racing the newly initialized runtime and could overwrite the one-shot Host-local mailbox after replacement.

Therefore:

```text
UNLOAD HOST_LOCAL WRITE = FORBIDDEN
BACKGROUND OLD-RUNTIME TELEMETRY = FORBIDDEN
```

## 6. Why not merely reorder the current Host-local await

Rejected design:

```text
mark disposed
-> remove hooks
-> await current Host-local UNLOAD checkpoint
-> return
```

This would improve hook safety but would not fully solve replacement liveness if the host waits for `onUnload` to resolve before loading the new plugin.

The design target is stronger:

```text
optional Host-local telemetry must not control targeted unload completion
```

## 7. Why not add a timeout

Rejected design:

```text
Promise.race(hostWrite, timeout)
```

Reasons:

- adds a new timer surface only to protect optional telemetry;
- leaves the underlying Host-local operation potentially alive after timeout;
- requires additional stale-writer suppression and completion bookkeeping;
- is broader than needed because OUTPUT_COMMIT is already the durable telemetry authority.

No timer, retry, polling, or detached Host write is authorized by v0.69.1.

## 8. Preserved safety model

The historical refreshless safety primitives remain mandatory:

```text
runtimeDisposed
runtimeEpoch
runtimeIsCurrent(epoch)
staleRuntimeDrops
named beforeRequestHandler
named outputHandler
explicit runtimeHooks.remove(...)
explicit SimCore UI unregister
```

v0.69.1 does not revert to the old assumption that API 3.0 automatically removes legacy Set-backed callbacks.

The intended relationship remains:

```text
physical hook retirement = primary targeted replacement guarantee
disposed/epoch guard      = secondary stale-work defense
```

## 9. Version and compatibility identity

The candidate must converge all runtime identities on the patch release:

```text
userscript metadata version = 0.69.1
SIMCORE_RUNTIME_VERSION      = 0.69.1
HOST_COMPAT_VERSION          = 0.69.1
```

Host-local telemetry capsules from v0.69.0 may fail closed as incompatible after the version change. That is acceptable and already part of the compatibility contract. Core semantic state does not depend on runtime telemetry capsule adoption.

No telemetry schema bump is authorized.

## 10. State and architecture freeze

This release is runtime-lifecycle only.

The complete v0.69 M2-6 State Reconcile architecture remains frozen:

```text
Kernel upward domain dependencies = zero
State Reconcile physical owner = retained
State Reconcile state semantics = unchanged
STATE_VERSION = unchanged
CORE_STATE_VERSION = unchanged
Community classifier version = unchanged
persistent state shape = unchanged
SnapshotStore keys = unchanged
mirror portable-state shape = unchanged
```

No architecture owner/module movement is authorized.

## 11. Explicit non-goals

v0.69.1 does not authorize:

- M2-7;
- Request Pipeline or Turn Pipeline extraction;
- generic State module work;
- Runtime Topology fingerprint dedupe;
- genuine-edit latency optimization;
- long-chat storage latency optimization;
- `PARTIAL_PREVIOUS_TURN_REPLAY` repair;
- Community platform-family diversity work;
- B_START heuristic work;
- `THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE` repair;
- provider-cache engineering or claims;
- cache/history mutation;
- new persistent schema or storage keys;
- new network calls;
- new timers;
- polling or retry loops;
- release-system R2.x changes;
- unrelated documentation/repository-system restructuring inside the runtime implementation transaction.

## 12. Implementation preflight

Before runtime mutation, the work branch must re-audit exact v0.69.0 production and prove:

1. the current `onUnload` callback has exactly one awaited `checkpointRuntimeTelemetry('UNLOAD')` before `runtimeHooks.remove`;
2. `checkpointRuntimeTelemetry('UNLOAD')` reaches Host-aware `publishWithHostLocal` in current production;
3. existing local-only `runtimeTelemetryRules.publish(...)` performs no Host API acquisition or Host-local write;
4. `runtimeHooks.remove` still owns explicit Set-backed beforeRequest/output retirement;
5. SimCore UI cleanup remains explicitly available and bounded;
6. successful OUTPUT_COMMIT still performs the durable Host-local-capable checkpoint;
7. no other unload caller depends on Host-local publication completing before teardown;
8. no new source discovery requires a broader lifecycle redesign.

Any contradiction is a stop condition and requires design revision before implementation.

## 13. Deterministic targeted-replacement regression harness

A new permanent lifecycle specimen is mandatory.

The harness must model the historical host semantics rather than only grep source ordering.

### Runtime A setup

```text
install runtime A
-> beforeRequest Set size = 1
-> output Set size = 1
-> SimCore UI parts = expected count
-> generation A active
```

### Adversarial Host-local setup

The Host-local API must be able to simulate a never-resolving or otherwise blocked acquisition/write surface.

The key assertion is that targeted unload never calls this Host-local surface.

### Runtime A targeted unload

Require:

```text
runtimeDisposed = true
runtimeEpoch incremented
old beforeRequest callback removed
old output callback removed
old UI parts removed
Host-local acquisition count during UNLOAD = 0
Host-local write count during UNLOAD = 0
unload completes without depending on the blocked Host-local promise
```

### Runtime B replacement

Then install runtime B in the same host process/tab model and require:

```text
beforeRequest Set size = 1
output Set size = 1
only B callbacks remain
only B UI surfaces remain
B generation active
B version identity active
```

### Captured stale-A callback control

The harness must retain a direct reference to at least one old A callback before removal and invoke it after A disposal.

Require:

```text
stale A callback cannot commit Core state
stale A callback cannot commit output
stale A callback cannot recreate UI
stale A callback cannot register new hooks
```

This proves that physical retirement and disposed/epoch defense both remain valid.

## 14. Telemetry regression matrix

The targeted-update fix must not accidentally break the full-page refresh telemetry contract.

Permanent tests must preserve:

### OUTPUT_COMMIT durable path

```text
successful Core output
-> checkpoint after authoritative output commit
-> browser Session unavailable
-> Host-local fallback usable
-> Host-local write attempted exactly as before
-> output remains COMMITTED even if telemetry fails
```

### Ordinary full-page refresh / boot

Using a valid capsule written by OUTPUT_COMMIT:

```text
runtime A output commit
-> durable capsule written
-> page reload / runtime B boot
-> valid matching capsule may be adopted
-> one-shot consume semantics preserved
-> no raw bodies retained
```

### UNLOAD local-only path

```text
UNLOAD
-> memory/Session local publication allowed
-> Host-local acquisition forbidden
-> Host-local write forbidden
```

## 15. Static release gate

Require at minimum:

```text
node --check latest.js PASS
node --check install.js PASS
latest.js == install.js byte-for-byte
metadata/runtime/HOST version identity = 0.69.1
Contracts v2 PASS
M2-6 architecture graph unchanged
State Reconcile differential fixtures PASS
ordinary Representation/Edit controls PASS
Deferred Mirror controls PASS
Community v3 fixtures PASS
Frame/Time/Broadcast fixtures PASS
THOUGHTS compatibility fixtures PASS
```

New lifecycle assertions:

```text
UNLOAD host-local acquire calls = 0
UNLOAD host-local writes = 0
old hook removal precedes optional local telemetry
old UI unregister occurs before unload completion
no detached Promise/timer/retry added
OUTPUT_COMMIT Host-local path unchanged semantically
```

## 16. Surface-delta gate

Relative to exact v0.69.0 production, require no increase in:

```text
persistent storage keys
telemetry schema fields
network calls
timer calls
polling loops
background retry loops
host API families
request-history writes
Core state versions
```

Expected intentional differences are bounded to:

```text
release identity 0.69.0 -> 0.69.1
UNLOAD retirement ordering
UNLOAD telemetry transport selection
new deterministic targeted-replacement test coverage
release/operator metadata made stale by those changes
```

## 17. Real live acceptance

The primary live gate is a genuine same-tab `+` update without browser/page refresh.

### Stage A - pre-update baseline

Before pressing `+`, capture one ordinary current-turn diagnostic from v0.69.0 or the currently installed predecessor:

```text
Version expected predecessor
CURRENT TURN
request hook SEEN
output COMMITTED
binding BOUND
stale 0
UI parts expected count
```

### Stage B - targeted `+` replacement

Perform the real plugin update in the same tab without a full page refresh.

Required observations:

```text
update completes without apparent hang
new SimCore version becomes 0.69.1
runtime boot/generation changes
UI parts do not duplicate
no old-version UI remains active
no browser/page refresh was required
```

### Stage C - first post-update natural request

Require:

```text
Version 0.69.1
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE
output COMMITTED
binding BOUND
stale drops 0
no duplicate output processing
no duplicate hook symptom
no missing state/module/bootstrap exception
```

Telemetry continuity may be FRESH or incompatible across the version boundary and is not itself a failure as long as Core state remains coherent and the telemetry path fails closed.

### Stage D - second same-generation request

Require another ordinary request after Stage C:

```text
same new generation
exactly one active processing path
normal SAME_FAST when eligible
output COMMITTED
binding BOUND
stale drops 0
no duplicate UI/hooks
```

### Stage E - ordinary full page refresh

After at least one successful v0.69.1 OUTPUT_COMMIT, perform one ordinary page refresh and then one natural request.

Purpose:

```text
prove removal of Host-local work from UNLOAD did not regress the already-authoritative OUTPUT_COMMIT reload handoff
```

Accept valid Host-local adoption, another legitimate non-fresh Core session source, or safe fail-closed telemetry behavior as long as normal Core state and the next request remain coherent.

## 18. Live stop conditions

Immediately preserve and classify as FIX or BLOCKER if any of the following occurs:

- `+` update still hangs or requires a page refresh;
- new runtime does not initialize after targeted unload;
- old beforeRequest/output hook remains registered;
- request or output fires twice after replacement;
- UI parts duplicate or stale UI survives;
- old generation commits state/output after disposal;
- State Reconcile/Core state changes attributable to the patch;
- ordinary OUTPUT_COMMIT Host-local durability regresses;
- full-page refresh continuity regresses because of the change;
- telemetry background work from old runtime survives replacement;
- persistent schema/key or timer/network surface changes;
- latest.js and install.js diverge.

## 19. Existing WATCH lanes remain separate

Do not fold these into v0.69.1:

```text
WATCH genuine-edit rebuild latency
WATCH long-chat storage latency
WATCH/DEFER PRE_SIMCORE cache-history frontier
DEFER PARTIAL_PREVIOUS_TURN_REPLAY
DEFER Community platform-family diversity recurrence
WATCH B_START closure expression
WATCH provider cache UNVERIFIED
```

The v0.69.0 M2-6 live matrix remains valid evidence for State Reconcile semantics and should be carried forward as regression authority rather than repeated from scratch unless v0.69.1 unexpectedly touches those paths.

## 20. Release and closure sequence

After separate explicit implementation authorization:

1. re-read exact current `main` and `release-simcore`;
2. create a dedicated v0.69.1 runtime work branch;
3. bind the deterministic builder/patch to exact v0.69.0 production bytes;
4. implement only the frozen targeted-unload repair;
5. add the host-level targeted-replacement regression harness;
6. run syntax, identity, architecture, regression and permanent CI;
7. materialize a fresh immutable v0.69.1 candidate through the current authorized release system;
8. publish to `release-simcore` only after exact approval;
9. verify production `latest.js == install.js` and exact commit/blob identity;
10. perform real same-tab `+` replacement Stage A-D;
11. perform ordinary page-refresh Stage E;
12. preserve every anomaly as WATCH / DEFER / FIX / BLOCKER;
13. only after human acceptance, converge terminal release state through the current durable human-evidence authority;
14. synchronize main docs/long-term state;
15. perform architecture freeze / observation review, not automatic M2-7.

## 21. Authorization verdict

```text
V06900_M2_6_LIVE_MATRIX
= PASS

V06900_TERMINAL_LIVE_PASS
= HELD BY TARGETED_UPDATE_LIFECYCLE_FIX

NEXT_VERSION
= 0.69.1

RELEASE_NAME
= REFRESHLESS_TARGETED_UPDATE_LIVENESS_REPAIR

MAJOR_CHECKPOINT
= M2-6 UNCHANGED

M2_7
= NOT AUTHORIZED

DESIGN
= FROZEN

IMPLEMENTATION
= NOT AUTHORIZED YET

RUNTIME_MUTATION_THIS_DOCUMENT
= NONE

RELEASE_SIMCORE_MUTATION_THIS_DOCUMENT
= NONE
```
