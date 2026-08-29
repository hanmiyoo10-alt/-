# SimCore v0.69.0 Refreshless `+` Update Recheck

Date: 2026-08-30 KST

Status: **FIX CANDIDATE · RUNTIME LIFECYCLE · TARGETED UPDATE / UNLOAD · IMPLEMENTATION NOT YET AUTHORIZED**

## Trigger

Operator reported that the existing no-page-refresh `+` install/update path appears to have a problem and requested a recheck before continuing v0.69 real-long-chat acceptance.

The relevant behavior is the same-tab targeted plugin replacement path:

```text
old SimCore runtime active
→ operator presses `+` install/update
→ host targets SimCore for plugin unload/replacement without a full page refresh
→ old runtime onUnload must retire safely
→ new plugin bytes must initialize in the same tab
```

This is separate from an ordinary browser/page refresh.

## Historical authority

### v0.63.23

`Refreshless Update Safety` introduced:

- `runtimeDisposed`;
- `runtimeEpoch`;
- stale-work drops;
- explicit SimCore UI-part cleanup.

It initially assumed API 3.0 targeted unload automatically removed beforeRequest/output hooks.

### v0.63.24

`Refreshless Identity Probe` was used to observe real targeted replacement identity behavior.

### v0.63.25

`Targeted Reload Hook Cleanup` corrected the assumption after live/host behavior showed that Risu V3 delegates the relevant callbacks to legacy Set-based hook storage and does not automatically unregister them on targeted plugin unload.

The repair therefore preserved named callback references and explicitly removed the old beforeRequest and output callbacks during `onUnload`.

Historical commit:

```text
f32cc233fb1f4833238c8339a7099f4a807e32cf
stage: SimCore v0.63.25 Targeted Reload Hook Cleanup
```

The intended safety ordering at that time was that old-runtime hook retirement is a first-class targeted-reload requirement, with disposed/epoch guards as secondary defense.

## Current v0.69 production re-audit

Production authority:

```text
release-simcore C = 31b4c5075659a55861731c6fd73f999402321e94
blob              = 86954f4d7ff7dec9119e2a8c047bfbfa6f801d56
version           = 0.69.0
```

The current runtime still contains the intended safety primitives:

```text
runtimeDisposed = false
runtimeEpoch = 1
staleRuntimeDrops = 0
runtimeIsCurrent(epoch)
named beforeRequestHandler
named outputHandler
runtimeHooks.remove(...)
UI unregister on unload
```

Current unload sequence is materially important:

```js
await Risuai.onUnload(async () => {
  runtimeDisposed = true;
  runtimeEpoch += 1;
  await checkpointRuntimeTelemetry('UNLOAD');
  await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);
  // UI + memory cleanup follows
});
```

Therefore old work is logically invalidated immediately, but physical hook retirement is delayed until the asynchronous UNLOAD telemetry checkpoint resolves.

## Current UNLOAD telemetry path

`checkpointRuntimeTelemetry('UNLOAD')` calls the Host-aware transport:

```text
runtimeTelemetryRules.publishWithHostLocal(...)
```

When browser Session transport is unavailable or fails, the Host-local path can execute:

```js
const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
...
await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
```

Neither Host-local acquisition nor Host-local write has a bounded timeout in this path.

Thus current targeted unload contains a potentially unbounded asynchronous boundary before physical hook retirement and before the `onUnload` callback can complete.

## Why this matches the operator symptom

If the host waits for the old plugin's `onUnload` callback before completing targeted replacement, the current sequence permits:

```text
press `+`
→ old runtime marks itself DISPOSED
→ unload awaits Host-local telemetry I/O
→ hook removal has not run yet
→ old plugin unload callback has not completed
→ new plugin initialization/replacement may be delayed or appear not to happen
```

The disposed/epoch guard protects Core state correctness if an old callback fires during this window, but it does not make the plugin replacement callback finish.

This risk is especially relevant because prior real SimCore telemetry evidence observed browser `sessionStorage` access failures, which makes the Host-local fallback a real rather than theoretical branch.

## Permanent-test coverage finding

Current v0.69 reload suite is a compatibility wrapper:

```text
reload-cache-continuity-v06900.test.mjs
→ normalize 0.69 metadata to 0.68
→ reuse v0.68 gate
→ v0.67
→ v0.66
→ v0.65
→ v0.64.11
→ v0.64.10
→ legacy reload-cache-continuity.test.mjs
```

The v0.64.10 wrapper additionally rewrites async/await source details before invoking the older suite.

The inherited legacy suite statically requires UNLOAD telemetry checkpointing before `runtimeHooks.remove`, but it does **not** execute a host-level lifecycle specimen equivalent to:

```text
install runtime A
→ target-unload A
→ install runtime B in the same tab
→ assert A hooks are gone
→ assert exactly one B hook pair remains
→ assert B generation/version is active
```

Consequently the permanent test currently preserves the suspicious ordering without proving refreshless targeted replacement liveness.

## Classification

```text
V06900_REFRESHLESS_PLUS_UPDATE
= FIX CANDIDATE

LAYER
= RUNTIME LIFECYCLE / TARGETED UNLOAD

STATIC_SAFETY_PRIMITIVES
= PRESENT

PHYSICAL_HOOK_RETIREMENT
= DELAYED_BEHIND_ASYNC_UNLOAD_TELEMETRY

UNLOAD_HOST_LOCAL_BOUND
= NONE

TARGETED_REPLACEMENT_E2E_REGRESSION
= MISSING

PROVEN_CURRENT_USER_VISIBLE_FAILURE
= NOT YET CAPTURED AS DIAGNOSTIC

RUNTIME_MUTATION_THIS_DOCUMENT
= NONE

RELEASE_SIMCORE_MUTATION_THIS_DOCUMENT
= NONE
```

This is promoted above a generic WATCH because the risky await ordering and unbounded Host-local branch are directly present in current production and the historical targeted-unload contract specifically requires prompt old-hook retirement. The exact user-visible failure remains to be captured in a live specimen.

## Required next proof

Before any runtime fix is released, add a deterministic targeted-replacement lifecycle harness that models the historical Set-based hook semantics and proves:

1. runtime A registers exactly one beforeRequest and one output callback;
2. targeted unload invalidates A immediately;
3. A hook callbacks are physically removed without waiting behind optional telemetry transport;
4. runtime B can initialize in the same tab;
5. exactly one active hook pair remains after replacement;
6. stale A work cannot commit state or output;
7. UI parts do not duplicate;
8. ordinary page-refresh telemetry continuity remains preserved by the already-authoritative output-complete checkpoint or an explicitly bounded unload mechanism.

## Candidate repair direction

Do not delete the v0.63.25 safety model.

The preferred repair should restore priority order:

```text
targeted unload begins
→ mark disposed / bump epoch
→ physically retire old hooks immediately
→ retire UI immediately or in the same bounded critical section
→ optional/redundant telemetry cleanup must not gate plugin replacement indefinitely
→ clear local runtime state
```

Exact telemetry treatment must be frozen only after checking the output-complete checkpoint contract and page-refresh continuity. Possible solutions include making UNLOAD Host-local work non-authoritative/bounded or using only already-bounded/synchronous transports during unload. No new background retry or polling is allowed.

## v0.69 live gate impact

Until this targeted replacement concern is resolved or explicitly disproven:

```text
v0.69 production publication = unchanged / valid
v0.69 release-simcore identity = unchanged
v0.69 LIVE_PENDING = unchanged
HUMAN_EVIDENCE = still pending
v0.69 LIVE_PASS = MUST NOT be declared
```

The targeted `+` update path should be checked before using reload/re-entry evidence as Stage B acceptance for v0.69.
