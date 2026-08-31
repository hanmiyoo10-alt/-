# SimCore S4-2 Output Fallback Index Pass-Through Retirement Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · IMPLEMENTATION AFTER MAIN MERGE ONLY**
Classification: **POST-M2 SIMPLIFICATION / S4 / OUTER RUNTIME SHELL / PASS-THROUGH PARAMETER RETIREMENT**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S4_1_RUNTIME_CURRENT_GUARD_CONVERGENCE_CLOSURE_2026-08-31.md`
- exact production remains `release-simcore` v0.70.1 at `861100f4771967aa5b8ab8811d06f11702c0d3ff`
- exact production latest/install blob remains `8f332cfceed316d35954e353c2eaca38c2f34d95`
- cumulative internal checkpoint P9 = S4-1 qualified on main
- v0.70.2 Cache Observer Cold-Path Attribution remains parked and must not be repurposed
- provider cache remains `UNVERIFIED`

No release-simcore publication is authorized before S7 program convergence.

## Problem statement

The outer output hook already owns the current `chat` object. It derives one fallback index from that object and immediately passes both the object and the derived scalar into the only `processCoreOutput` call:

```js
const fallbackOutIndex = chat?.message?.length ?? 0;
return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);
```

The callee signature then accepts the derived value independently:

```js
async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
  let t = perfNow();
  const cs = await runtimeSession.loadCoreForChat(chaIdx, chatIdx, chat);
  ...
  const outIndex = cs.resolveOutputIndex(fallbackOutIndex);
```

Source scan confirms:

```text
processCoreOutput definition = 1
processCoreOutput call = 1
caller already passes chat = YES
fallback scalar derivation = exactly chat?.message?.length ?? 0
independent fallback policy at caller = NONE
```

The pass-through parameter therefore widens the private function boundary without adding policy or information.

## Important ordering constraint

The fallback expression must not move across the first session-load await or into session-load timing.

Current ordering:

```text
outputHandler getChat await
-> stale-runtime guard
-> evaluate chat?.message?.length ?? 0
-> enter processCoreOutput
-> perfNow() starts session-load timing
-> runtimeSession.loadCoreForChat await
-> stale-runtime guard
-> resolveOutputIndex(fallbackOutIndex)
```

A naive inline at `resolveOutputIndex(...)` would evaluate the chat length after `loadCoreForChat` and is therefore not accepted without an unnecessary mutation proof.

## Proposed mechanical delta

Narrow `processCoreOutput` from six explicit arguments plus defaulted perf to five explicit arguments plus defaulted perf.

Before:

```js
async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
  let t = perfNow();
```

After:

```js
async function processCoreOutput(content, chaIdx, chatIdx, chat, perf = null) {
  const fallbackOutIndex = chat?.message?.length ?? 0;
  let t = perfNow();
```

Caller before:

```js
const fallbackOutIndex = chat?.message?.length ?? 0;
return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);
```

Caller after:

```js
return await processCoreOutput(content, chaIdx, chatIdx, chat, perf);
```

This preserves the fallback expression before `perfNow()` and before the first await while retiring one caller local and one pass-through parameter.

## Explicitly out of scope

The following remain byte/behavior frozen:

```text
Session.resolveOutputIndex(fallbackOutIndex = -1) implementation and parameter
pending sendIndex precedence
fallback validity rule
chat?.message?.length ?? 0 expression
runtimeSession.loadCoreForChat call/order
S4-1 guardCurrentRuntime checkpoints
hookEpoch semantics
host.currentIndices/getChat ordering
output diagnostics
cs.processOutput call/order
Deferred Mirror
telemetry checkpoint gating
persistent state/schema
prompt/Community semantics
provider-cache posture
release system
```

The same identifier name inside Session is not dead and is not part of this mini.

## Ownership before / after

```text
owner before = outer runtime shell
owner after = outer runtime shell
new module = none
new helper = none
new export = none
new require = none
```

The fallback derivation remains local to output orchestration. Only its private boundary placement changes.

## Side effects before / after

```text
chat property reads = same expression / same synchronous boundary
host calls = unchanged
session calls = unchanged
chat writes = unchanged
storage writes = unchanged
network/timer calls = unchanged
telemetry publishes = unchanged
staleRuntimeDrops semantics = unchanged
persistent fields = unchanged
```

## Async / performance attribution invariants

Require exact preservation of:

```text
fallback expression occurs before first perfNow() in processCoreOutput
fallback expression occurs before runtimeSession.loadCoreForChat await
sessionLoadMs excludes fallback expression in both old and new shape
number/order of awaits unchanged
number/order of host calls unchanged
number/order of session calls unchanged
number/order of cs.processOutput calls unchanged
```

No await may be added, removed or hidden behind a new helper.

## Cumulative implementation checkpoint

Implementation becomes P10:

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
P10 = S4-2 output fallback index pass-through retirement
```

The P10 builder must remain self-contained under the isolated candidate materializer. It should embed and SHA256-verify the exact qualified P9 builder source, reproduce/verify P0→P9, then apply only the P9→P10 delta.

Sibling-builder runtime dependency remains forbidden.

## Exact differential proof contract

The P10 builder must fail closed unless all of the following hold:

```text
P0→P9 predecessor verification passes
P9→P10 expected reconstruction equals candidate byte-for-byte
module inventory unchanged
require surface unchanged
public exports unchanged
all true SimCore.define module bodies unchanged
outer-shell processCoreOutput definition count = 1
outer-shell processCoreOutput call count = 1
processCoreOutput parameter fallbackOutIndex removed exactly once
outputHandler fallbackOutIndex local removed exactly once
chat?.message?.length ?? 0 remains exactly once in this outer output path
that expression is first statement in processCoreOutput before perfNow()
Session.resolveOutputIndex(fallbackOutIndex = -1) remains byte-identical
cs.resolveOutputIndex receives the same local fallbackOutIndex
S4-1 guardCurrentRuntime declaration/call counts unchanged
staleRuntimeDrops increment site unchanged
runtime-unloaded diagnostics unchanged
host.currentIndices/getChat counts unchanged
runtimeSession.loadCoreForChat count unchanged
cs.processOutput count unchanged
checkpointRuntimeTelemetry behavior unchanged
side-effect/protected marker counts unchanged
latest.js == install.js
node --check passes
```

## Pure differential harness

Use a bounded JavaScript harness comparing old caller derivation and new callee-entry derivation for representative chat shapes:

```text
null chat
{}
{ message: null }
{ message: [] }
{ message: [one] }
{ message: [several] }
```

Require:

```text
fallback value identical
same resolveOutputIndex input when pending state does not override
pending sendIndex precedence remains owned by unchanged Session.resolveOutputIndex
```

No proxy/getter behavior is introduced or relied upon.

## PR-dry / request-free qualification

If a temporary dry candidate request is used, reserve the next internal identity:

```text
intent = simcore-v0.70.3-intent-09
release = simcore-v0.70.3-new-09
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
```

After dry qualification, remove the request and require a fresh request-free substantive CI:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
```

## Alternative candidate disposition

A shared helper for the duplicated `currentIndices -> guard -> getChat -> guard` sequence in request/output hooks was considered.

Disposition:

```text
KEEP_FOR_NOW
```

Reason:

```text
would hide two awaits behind another helper
would move perf attribution writes into a new abstraction
saves visible repetition but increases sequencing indirection
not preferable while a smaller pass-through seam exists
```

## Live / release posture

```text
release-simcore mutation = forbidden before S7
real-long-chat broad regression = S7 convergence gate
v0.70.2 cache attribution = parked / preserved
provider cache = UNVERIFIED
```

If implementation exposes a real runtime anomaly, preserve it immediately as WATCH / DEFER / FIX / BLOCKER before proceeding.

## Rollback / hard stop

Stop and classify BLOCK if any of these change:

```text
fallback value for ordinary chat shapes
pending sendIndex precedence
fallback evaluation across an await
sessionLoadMs attribution boundary
processCoreOutput output semantics
stale-runtime guard placement/count
host/session/output sequencing
persistent state/schema
prompt/Community semantics
provider-cache inference
```

## Disposition

```text
S4_2 = DESIGN FROZEN
TYPE = NARROW / INLINE PASS-THROUGH PARAMETER
RISK = LOW-MEDIUM WITHIN S4
PARENT = P9 INTERNAL CHECKPOINT
NEXT = merge design authority to main -> implement cumulative self-contained P10 on separate branch
```
