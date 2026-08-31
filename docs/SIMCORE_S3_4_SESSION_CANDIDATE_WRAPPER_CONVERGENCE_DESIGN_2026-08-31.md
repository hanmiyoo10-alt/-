# SimCore S3-4 Session Candidate Wrapper Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · IMPLEMENTATION NOT YET AUTHORIZED UNTIL MAIN MERGE**
Classification: **POST-M2 SIMPLIFICATION / S3 / PURE TELEMETRY CANDIDATE WRAPPER DEDUPE**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- S3-1, S3-2 and S3-3 design/implementation evidence already merged on main
- exact production remains `release-simcore` v0.70.1 at `861100f4771967aa5b8ab8811d06f11702c0d3ff`
- cumulative simplification checkpoint through P7 is internal-only and has no publication authority before S7

## Problem statement

`runtime-telemetry.resolveSessionCandidates(root, windowLike)` constructs the same frozen two-field candidate wrapper repeatedly:

```js
Object.freeze({ label: 'WINDOW', storage: windowSurface.storage })
Object.freeze({ label: 'GLOBAL_THIS', storage: globalSurface.storage })
```

The wrapper is materialized five times across `SAME_OBJECT`, `DISTINCT_OBJECTS`, and `SINGLE_CANDIDATE` branches. The branch policy is meaningful, but wrapper construction is not.

## Exact mechanical delta

Add one private helper adjacent to the existing session-surface helper:

```js
function sessionStorageCandidate(label, storage) {
  return Object.freeze({ label, storage });
}
```

Replace only the five direct frozen `{ label, storage }` constructions in `resolveSessionCandidates()` with calls to that helper.

No other expression, branch or result object changes.

## Ownership before / after

```text
owner before = runtime-telemetry
owner after  = runtime-telemetry
new module   = none
new export   = none
new require  = none
```

The helper is private bookkeeping local to the existing owner.

## Frozen semantic invariants

The following are byte/behavior frozen:

```text
inspectSessionSurface call count = 2
inspectSessionSurface order = WINDOW then GLOBAL_THIS
windowUsable/globalUsable predicates
storage object identity comparison
relation values and branch order
SAME_OBJECT selects WINDOW only
DISTINCT_OBJECTS selects WINDOW first, GLOBAL_THIS second
SINGLE_CANDIDATE preserves whichever surface is usable
NONE preserves null first/second
lastSurfaceProbe assignment and timing
surface object shape and property order
resolveSessionCandidates return shape
sessionStorage access/capability semantics from S3-3
session candidate consume semantics from S3-2
claim-selection semantics from S3-1
Host-local mailbox/acquisition/claim behavior
capsule schema, TTL and size rules
telemetry durability authority
provider cache = UNVERIFIED
```

## Side effects / async / persistent state

Before and after:

```text
new storage reads/writes/removes = 0
new host calls = 0
new network/timer/chat I/O = 0
new awaits/yields = 0
persistent fields = unchanged
schema/version markers = unchanged
```

## Differential proof contract

The cumulative builder must derive P8 from P7 and fail closed unless:

```text
P7 -> P8 touches runtime-telemetry only
module inventory unchanged
require surface unchanged
sessionStorageCandidate is private and called exactly five times plus declaration
resolveSessionCandidates direct delta equals the frozen five substitutions only
inspectSessionSurface byte-identical
surfaceDiagnostics byte-identical
serializeCapsule byte-identical
publishPrepared/publish/publishWithHostLocal byte-identical
takeSessionCandidate/claim/validate byte-identical
getHostLocalTelemetryStoreOnce/claimHostLocalOnce byte-identical
side-effect marker counts unchanged
latest.js == install.js
node --check passes
```

A pure Node differential harness must compare old direct wrapper construction and the helper for both WINDOW/GLOBAL_THIS labels and representative storage objects, requiring deep equality, identical property order, exact storage reference identity and frozen output.

## PR-dry / request-free qualification

Implementation uses one temporary candidate request only for `GATE_PR1_DRY` and must persist no candidate. After qualification the request is removed and a fresh request-free substantive CI must pass:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
```

## Live/release posture

```text
release-simcore mutation = forbidden before S7
real-long-chat regression = broad S7 gate
v0.70.2 cache attribution = parked / preserved
```

## Rollback / hard stop

Stop and classify BLOCK if the transformation alters candidate order, relation selection, storage identity, session access/consume behavior, Host-local behavior, async/I/O, persistent state, module graph, or requires semantic inference.

## Disposition

```text
S3_4 = DESIGN FROZEN
TYPE = DEDUPE / PRIVATE BOOKKEEPING HELPER
RISK = LOW
NEXT = merge design to main -> build cumulative P8 on separate implementation branch
```
