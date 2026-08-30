# SimCore S2-3 Runtime Utility Dead Export Surface Retirement Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 RELEASE/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S2 API + COMPATIBILITY SEAM SLIMMING / PURE RUNTIME UTILITY EXPORT NARROWING**

## 1. Program authority

Governed by:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_2_SESSION_DEAD_REEXPORT_SURFACE_RETIREMENT_DESIGN_2026-08-31.md`

Current construction posture:

```text
production = v0.70.1
release-simcore = unchanged through S1-S6
v0.70.2 Cache Observer Cold-Path Attribution = PARKED / PRESERVED
v0.70.3 = cumulative simplification target
broad real-long-chat = S7 only
```

S2-3 is cumulative after S1-1, S2-1 and S2-2. It is not a runtime release.

## 2. Residual S2 rescan

S2-2 required a residual API/compatibility seam rescan before S2 closure.

The remaining Session export surface after cumulative S2-1/S2-2 is all live:

```text
CoreRulesetSession       -> outer runtime constructs it
latestUserIndex          -> request path caller
latestUserText           -> request path caller
inspectPromptMessages    -> request prompt-probe caller
fingerprintText          -> edit/init/mirror observation callers
```

Therefore Session has no further eligible export retirement in S2.

The rescan then inspected pure runtime utility modules whose helpers are internally live but whose public module properties may no longer have external callers.

## 3. Exact dead-export candidates

### runtime-cache

Current export surface:

```js
module.exports = {
  promptChangeReason,
  buildRuntimePromptCacheProbe,
  runtimeLineTier,
  runtimeIdentity,
  createRuntimePromptCacheTracker
};
```

Production-source occurrence/caller review establishes:

```text
promptChangeReason
  definition + internal calls + export
  external module-property caller = 0

buildRuntimePromptCacheProbe
  definition + internal tracker/sketch calls + export
  external module-property caller = 0

runtimeLineTier
  definition + internal runtimeIdentity call + export
  external module-property caller = 0

runtimeIdentity
  definition + internal tracker call + export
  external runtime-cache property caller = 0

createRuntimePromptCacheTracker
  external callers EXIST
  -> KEEP
```

The v0.64.11 bounded-handoff adapter also wraps `cacheRules.createRuntimePromptCacheTracker`; it does not consume the four dead helper properties.

### runtime-topology

Current export surface:

```js
module.exports = {
  exactHash,
  messageSignature,
  leadingSystemCount,
  breakAttribution,
  createRequestTopologyTracker
};
```

Production-source caller review establishes:

```text
exactHash
  definition + internal topology hashing calls + export
  external module-property caller = 0

leadingSystemCount
  definition + internal topology tracker call + export
  external module-property caller = 0

messageSignature
  external callers EXIST in outer edit/reconcile/compact-observer paths
  -> KEEP

breakAttribution
  external caller EXISTS in bounded telemetry handoff adapter
  -> KEEP

createRequestTopologyTracker
  external outer runtime caller EXISTS
  -> KEEP
```

Repository search also found no executable caller evidence requiring `leadingSystemCount` or `exactHash` as public properties. Historical/source references in docs or builders are not runtime callers.

## 4. Proposed mechanical delta

Remove only these six names from the two module export objects:

```text
runtime-cache:
  promptChangeReason
  buildRuntimePromptCacheProbe
  runtimeLineTier
  runtimeIdentity

runtime-topology:
  exactHash
  leadingSystemCount
```

Do **not** remove, rename, inline, or edit the underlying function definitions or any internal call.

Final public surfaces for these two modules become:

```text
runtime-cache:
  createRuntimePromptCacheTracker

runtime-topology:
  messageSignature
  breakAttribution
  createRequestTopologyTracker
```

## 5. Ownership before / after

Before:

```text
runtime-cache owns cache probe/identity helper implementation
+ exports four helper details with no external consumer

runtime-topology owns topology hashing/counting helper implementation
+ exports two helper details with no external consumer
```

After:

```text
same semantic owners
same functions
same internal calls
smaller public module surface
```

No owner moves. No call sequence changes.

## 6. Frozen boundaries

Byte/behavior equivalent across S2-3 for:

```text
all six underlying function bodies
all internal calls to those functions
runtime-cache tracker behavior
runtime-topology tracker behavior
bounded handoff wrappers
messageSignature / breakAttribution public behavior
cache identity/probe values
host-prefix attribution
telemetry capture/adoption semantics
claimHostLocalOnce call order/count
persistent telemetry schema / TTL / size
provider cache UNVERIFIED policy
Prompt/Community/State/Representation semantics
reload/reroll/edit/recovery semantics
all awaits/timers/storage/network/chat writes
persistent state/schema
module require graph
```

This transaction does not optimize cache behavior or cold Host-local telemetry. It only narrows unused exports.

## 7. Static / differential proof contract

The cumulative builder must be self-contained and stage-bound:

```text
P0 = exact v0.70.1 production
P1 = P0 + S1-1
P2 = P1 + S2-1
P3 = P2 + S2-2
P4 = P3 + S2-3
```

Verify:

```text
P0→P1 = frozen S1 equivalence
P1→P2 = frozen S2-1 retirement invariants
P2→P3 = frozen S2-2 retirement invariants
P3→P4 = S2-3 ownership only
```

S2-3-specific fail-closed requirements:
- runtime-cache and runtime-topology require surfaces unchanged `P3→P4`;
- module inventory unchanged;
- every module except runtime-cache/runtime-topology byte-identical `P3→P4`;
- the six target helper function bodies remain byte-identical;
- all internal call markers remain present;
- six target export names are absent from module export objects;
- live public exports remain present;
- bounded handoff adapter references to tracker/messageSignature/breakAttribution remain present;
- side-effect/async/persistent markers unchanged;
- latest/install cumulative output byte-identical.

A temporary PR-only dry request may be used only to exercise `GATE_PR1_DRY`; it must persist no candidate and be deleted before merge. The request-free final head must pass exact-head CI before merge.

## 8. Hard stops

Stop and preserve evidence if:

```text
legacy compatibility asserts any of the six names as required public API
an executable external caller appears
removal changes module initialization
removal requires changing a helper body or internal call
telemetry adoption/reload/state semantics become involved
architecture/require edges change
```

If one target is proven live by validation, KEEP that target rather than restoring unrelated compatibility surface.

## 9. S2 closure expectation

S2-3 is intended as the final residual pure-utility export narrowing pass.

After S2-3 qualification, perform one bounded export rescan. If remaining surfaces are live, ambiguous, telemetry-state-sensitive, semantic, or low-value:

```text
S2 = DONE
→ record S2 closure evidence
→ proceed to S3 diagnostics/telemetry bookkeeping simplification
```

Do not invent another S2 mini merely to continue cleanup.

## 10. Final disposition

```text
S2_3_DESIGN = FROZEN
DELTA = REMOVE SIX DEAD EXPORT PROPERTIES ONLY
UNDERLYING FUNCTIONS = KEEP
SEMANTIC OWNER MOVEMENT = NONE
STATE / RELOAD / TELEMETRY ADOPTION CHANGE = NONE
PRE_S7_DEPLOYMENT = NONE
PRE_S7_BROAD_LIVE = NONE
release-simcore = v0.70.1 unchanged
```
