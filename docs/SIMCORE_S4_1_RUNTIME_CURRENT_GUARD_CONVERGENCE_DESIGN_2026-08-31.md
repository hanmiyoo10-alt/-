# SimCore S4-1 Runtime Current Guard Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · IMPLEMENTATION NOT YET AUTHORIZED UNTIL MAIN MERGE**
Classification: **POST-M2 SIMPLIFICATION / S4 / OUTER RUNTIME SHELL / STALE-RUNTIME GUARD DEDUPE**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S3_DIAGNOSTICS_TELEMETRY_BOOKKEEPING_CLOSURE_2026-08-31.md`
- exact production remains `release-simcore` v0.70.1 at `861100f4771967aa5b8ab8811d06f11702c0d3ff`
- exact production latest/install blob remains `8f332cfceed316d35954e353c2eaca38c2f34d95`
- cumulative simplification checkpoint through P8 is internal-only and has no publication authority before S7
- v0.70.2 Cache Observer Cold-Path Attribution remains parked and must not be repurposed

## Problem statement

The outer runtime shell repeats the same current-runtime decision and stale-drop accounting at ten checkpoints:

```js
if (!runtimeIsCurrent(...)) {
  dropStaleRuntime();
  ...caller-specific return / diagnostic handling...
}
```

The decision itself is identical:

```text
runtime is current -> continue
runtime is stale   -> increment staleRuntimeDrops exactly once and stop the caller at its existing boundary
```

The caller-specific return value and diagnostic patch are meaningful and must remain local. The repeated `runtimeIsCurrent -> dropStaleRuntime` decision body is not.

## Exact current call sites

Exactly ten negative stale-runtime checkpoints are in scope.

### `prepareCoreRequest` · 2

1. immediately after `runtimeSession.loadCoreForChat(...)`
2. after alias migration and before `cs.onSend(...)`

Both currently add the same request diagnostic disposition after the stale drop:

```text
status = UNAVAILABLE
active = false
mode = null
errorStage = runtime-unloaded
return = { active: false }
```

That diagnostic patch and return remain at the caller.

### `processCoreOutput` · 2

3. after runtime session acquisition
4. immediately before `cs.processOutput(...)`

Both currently return the original output `content` on stale runtime. That return remains at the caller.

### `beforeRequestHandler` · 3

5. initial hook-epoch guard
6. after `host.currentIndices()`
7. after `host.getChat(...)`

All three return the original `messages` on stale runtime. The first and later guards continue to use the captured `hookEpoch` exactly as today.

### `outputHandler` · 3

8. initial hook-epoch guard
9. after `host.currentIndices()`
10. after `host.getChat(...)`

All three return the original `content` on stale runtime and continue to use the captured `hookEpoch` exactly as today.

No other `runtimeIsCurrent` use is part of this mini.

## Proposed mechanical delta

Add one private helper immediately adjacent to the existing runtime-current/drop helpers:

```js
function guardCurrentRuntime(epoch = runtimeEpoch) {
  if (runtimeIsCurrent(epoch)) return true;
  dropStaleRuntime();
  return false;
}
```

Replace only the ten negative decision bodies above:

```js
if (!runtimeIsCurrent(epoch)) { dropStaleRuntime(); ... }
```

with:

```js
if (!guardCurrentRuntime(epoch)) { ... }
```

or, for the two existing default-epoch call sites:

```js
if (!guardCurrentRuntime()) { ... }
```

The helper owns only:

```text
current/stale decision
+ one staleRuntimeDrops increment on failure
+ boolean result
```

It does not own caller return values, diagnostic mutations, host/session calls, telemetry, or error labels.

## Explicitly out of scope

The following stay byte/behavior frozen:

```text
positive runtimeIsCurrent checks
`runtimeIsCurrent() && coreKey/coreLocationKey` telemetry checkpoint condition
runtimeDisposed semantics
runtimeEpoch capture/increment semantics
onUnload ordering
hook registration/removal
host.currentIndices/getChat ordering
runtimeSession.loadCoreForChat ordering
cs.onSend ordering
cs.processOutput ordering
checkpointRuntimeTelemetry behavior
request/output diagnostics schema
staleRuntimeDrops diagnostic display
prompt/cache/community semantics
persistent state/schema
provider-cache posture
release system
```

## Ownership before / after

```text
owner before = outer runtime shell
owner after  = outer runtime shell
new module   = none
new export   = none
new require  = none
```

`guardCurrentRuntime` is private local control-flow bookkeeping. No semantic ownership moves.

## Side effects before / after

For each failed checkpoint:

```text
runtimeIsCurrent evaluations = 1
staleRuntimeDrops increments = 1
caller-specific diagnostic patches = unchanged
caller return value = unchanged
```

For each successful checkpoint:

```text
staleRuntimeDrops increments = 0
following operations = unchanged
```

Global side-effect contract:

```text
new storage reads/writes/removes = 0
new host calls = 0
new chat writes = 0
new network/timer calls = 0
new telemetry publishes = 0
new awaits/yields = 0
persistent fields = unchanged
schema/version markers = unchanged
```

## Async and sequencing invariants

The following sequence boundaries must remain exact:

```text
beforeRequestHandler:
initial epoch guard
-> currentIndices await
-> epoch guard
-> getChat await
-> epoch guard
-> prepareCoreRequest

outputHandler:
initial epoch guard
-> currentIndices await
-> epoch guard
-> getChat await
-> epoch guard
-> processCoreOutput

prepareCoreRequest:
session load
-> stale guard
-> prompt inspection/bootstrap/edit/alias work
-> stale guard
-> onSend

processCoreOutput:
session load
-> stale guard
-> resolveOutputIndex
-> stale guard
-> processOutput
```

No guard may move across an await, host call, session call, diagnostic write, or semantic operation.

## Cumulative implementation checkpoint

Implementation becomes cumulative P9:

```text
P0 = exact production v0.70.1
P1 = S1-1
P2 = S2-1
P3 = S2-2
P4 = S2-3
P5 = S3-1
P6 = S3-2
P7 = S3-3
P8 = S3-4
P9 = S4-1 runtime current guard convergence
```

Because the candidate materializer executes one builder file in isolation, the P9 builder must be self-contained. It must reproduce and verify P1 through P8 internally before applying the P8 -> P9 delta. A sibling-builder runtime dependency is forbidden.

## Differential proof contract

The P9 builder must fail closed unless all of the following hold:

```text
P8 -> P9 touches outer runtime shell only
module inventory unchanged
require surface unchanged
public exports unchanged
runtimeCurrent/drop helper ownership remains local
`guardCurrentRuntime` declaration count = 1
negative stale-runtime guard replacement count = exactly 10
caller-specific return expressions unchanged
prepareCoreRequest runtime-unloaded diagnostic patches unchanged
hookEpoch capture and use unchanged
await count/order unchanged
host.currentIndices call count/order unchanged
host.getChat call count/order unchanged
runtimeSession.loadCoreForChat call count/order unchanged
cs.onSend call count/order unchanged
cs.processOutput call count/order unchanged
positive telemetry `runtimeIsCurrent() && ...` condition byte-identical
onUnload runtimeDisposed/runtimeEpoch sequence byte-identical
persistent/schema marker counts unchanged
storage/chat/network/timer side-effect marker counts unchanged
latest.js == install.js
node --check passes
```

## Pure differential harness

A bounded Node harness must compare the old decision primitive and the proposed helper over at least:

```text
current runtime + matching epoch
stale runtime by disposed flag
stale runtime by epoch mismatch
explicit captured epoch
implicit current epoch
```

For every case require:

```text
boolean continuation decision identical
stale drop delta identical
no drop on current runtime
exactly one drop on stale runtime
```

The harness does not simulate caller returns because those remain byte-preserved at each caller.

## PR-dry / request-free qualification

Implementation may use one temporary candidate request solely for `GATE_PR1_DRY`; it must persist no candidate and must be removed after qualification.

After removal, a fresh request-free substantive CI must pass:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
```

The S3-4 builder-packaging failure is a standing regression lesson: any `BASE_BUILDER_MISSING`/sibling dependency is classified FIX and repaired without modifying the release-system materializer.

## Live / release posture

```text
release-simcore mutation = forbidden before S7
real-long-chat broad regression = S7 convergence gate
v0.70.2 cache attribution = parked / preserved
provider cache = UNVERIFIED
```

If this mini reveals an actual runtime anomaly rather than a builder/CI packaging issue, preserve it immediately as WATCH / DEFER / FIX / BLOCKER before proceeding.

## Rollback / hard stop

Stop and classify BLOCK if the transformation changes any of:

```text
staleRuntimeDrops count semantics
hook epoch binding
number/position of runtime-current checkpoints
caller return values
runtime-unloaded diagnostic disposition
await/host/session/output sequencing
telemetry checkpoint gating
persistent state/schema
M2 ownership
prompt/Community semantics
provider-cache inference
```

## Disposition

```text
S4_1 = DESIGN FROZEN
TYPE = DEDUPE / PRIVATE CONTROL-FLOW GUARD
RISK = LOW-MEDIUM WITHIN S4 MEDIUM-RISK PHASE
PARENT = P8 INTERNAL CHECKPOINT
NEXT = merge design to main -> build self-contained cumulative P9 on separate implementation branch
```
