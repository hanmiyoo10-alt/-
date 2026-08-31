# SimCore S3-1 Runtime Telemetry Claim Selection Probe Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · INTERNAL CHECKPOINT ONLY · NO PRE-S7 PUBLICATION/LIVE AUTHORITY**
Classification: **POST-M2 SIMPLIFICATION / S3 DIAGNOSTICS + TELEMETRY BOOKKEEPING / PURE PROBE CONSTRUCTION DEDUPE**

## 1. Program authority

Governed by:
- `docs/SIMCORE_PRE_MAJOR_SIMPLIFICATION_ROUTINE_2026-08-31.md`
- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S2_API_COMPATIBILITY_SEAM_SLIMMING_CLOSURE_2026-08-31.md`

Current posture:

```text
production = v0.70.1
release-simcore = unchanged through S1-S6
S1 = DONE internal checkpoint
S2 = DONE internal checkpoint
v0.70.2 Cache Observer Cold-Path Attribution = PARKED / PRESERVED
v0.70.3 = cumulative simplification target
broad real-long-chat = S7 only
```

S3-1 is the first S3 mini. It is not a runtime release by itself.

## 2. Source-grounded problem statement

Exact production owner:

```text
module = runtime-telemetry
function = validate(claimed, locationKey, now, hostClaim)
state = lastClaimProbe
```

`validate()` resolves the accepted handoff transport in the fixed order:

```text
MEMORY
-> first SESSION candidate
-> second SESSION candidate
-> HOST_LOCAL
-> NONE
```

Each of those five terminal selection branches reconstructs the same bookkeeping object shape:

```text
lastClaimProbe = Object.freeze({
  ...(lastClaimProbe || {}),
  memoryValidation,
  sessionValidation,
  hostValidation,
  selected,
  selectedRoot,
});
```

Only the five field values differ by branch.

This is repeated probe/status construction owned entirely by observability bookkeeping. It is directly within the frozen S3 target class:

```text
repeated status/disposition construction
one-shot adoption bookkeeping
```

## 3. Existing branch semantics

The exact current value mapping must remain unchanged.

### MEMORY accepted

```text
memoryValidation  = exact
sessionValidation = standby if session entry exists else empty
hostValidation    = standby if hostClaim exists else empty
selected          = memory
selectedRoot      = NONE
```

### first SESSION accepted

```text
memoryValidation  = validationClass(memory)
sessionValidation = exact
hostValidation    = standby if hostClaim exists else empty
selected          = session
selectedRoot      = firstEntry.root
```

### second SESSION accepted

```text
memoryValidation  = validationClass(memory)
sessionValidation = exact
hostValidation    = standby if hostClaim exists else empty
selected          = session
selectedRoot      = secondEntry.root
```

### HOST_LOCAL accepted

```text
memoryValidation  = validationClass(memory)
sessionValidation = validationClass(secondEntry ? secondValidation : firstValidation)
hostValidation    = exact
selected          = host-local
selectedRoot      = NONE
```

### no transport accepted

```text
memoryValidation  = validationClass(memory)
sessionValidation = validationClass(secondEntry ? secondValidation : firstValidation)
hostValidation    = hostClaim ? validationClass(hostValidation) : empty
selected          = NONE
selectedRoot      = NONE
```

## 4. Proposed mechanical delta

Introduce one private local helper inside `runtime-telemetry`:

```text
recordClaimSelection(memoryValidation, sessionValidation, hostValidation, selected, selectedRoot)
```

Canonical behavior:

```text
assign lastClaimProbe exactly once through:
Object.freeze({
  ...(lastClaimProbe || {}),
  memoryValidation,
  sessionValidation,
  hostValidation,
  selected,
  selectedRoot,
})

return lastClaimProbe
```

Replace only the five repeated direct assignments inside `validate()` with calls supplying the exact same current branch values.

No validation computation is moved into the helper. The helper is a pure bookkeeping sink for already-resolved values.

## 5. Ownership before / after

Before:

```text
runtime-telemetry.validate
  owns transport validation/selection policy
  + repeats probe-object assembly in five branches
```

After:

```text
runtime-telemetry.validate
  owns exactly the same transport validation/selection policy

runtime-telemetry.recordClaimSelection (private)
  owns only repeated lastClaimProbe field assembly
```

No semantic owner moves between modules or layers.

## 6. Frozen boundaries

Byte/behavior equivalent across S3-1 for:

```text
claim() initial lastClaimProbe construction
validateCapsule
validationClass
sessionReason
hostReason
transport precedence MEMORY -> SESSION1 -> SESSION2 -> HOST_LOCAL -> NONE
all validate() return payloads
all fallbackFrom values
all sessionRoot values
updateHostProbe behavior
hostLocal augmentation of an existing lastClaimProbe
claimHostLocalOnce body and call count/order
getHostLocalTelemetryStoreOnce body and call count/order
publish / publishWithHostLocal
Host-local mailbox key and consume semantics
sessionStorage transport
capsule schema 1
HOST_COMPAT_VERSION
MAX_AGE_MS
MAX_SESSION_CHARS
MAX_SERIALIZED_CHARS
telemetry durability authority
provider cache UNVERIFIED policy
runtime-cache / runtime-topology / cache-candidate semantics
Prompt / Community / State / Representation semantics
reload / reroll / manual-edit / recovery behavior
all awaits, timers, storage/network/chat-write sites
persistent state/schema
module require graph
```

The cold Host-local latency lane is explicitly not optimized here.

## 7. Cumulative construction contract

The self-contained cumulative builder must materialize explicit stages:

```text
P0 = exact v0.70.1 production
P1 = P0 + S1-1 runtime-cache FNV convergence
P2 = P1 + S2-1 dead Prompt render seam retirement
P3 = P2 + S2-2 dead Session re-export retirement
P4 = P3 + S2-3 runtime utility dead export retirement
P5 = P4 + S3-1 claim-selection probe convergence
```

Stage ownership:

```text
P0 -> P1 = frozen S1-1 invariants
P1 -> P2 = frozen S2-1 invariants
P2 -> P3 = frozen S2-2 invariants
P3 -> P4 = frozen S2-3 invariants
P4 -> P5 = S3-1 only
```

No earlier cumulative delta may be attributed to S3-1.

## 8. S3-1 differential proof contract

Fail closed unless all are true across `P4 -> P5`:

```text
module inventory unchanged
require graph unchanged
every module except runtime-telemetry byte-identical
runtime-telemetry validate transport branch order unchanged
validate() return expressions byte-identical except direct assignment -> helper-call substitution
recordClaimSelection is private and not exported
claim() initial probe shape unchanged
updateHostProbe body unchanged
claimHostLocalOnce body byte-identical
getHostLocalTelemetryStoreOnce body byte-identical
publish/publishWithHostLocal bodies byte-identical
capsule constants byte-identical
all five branch value tuples exactly preserved
number of lastClaimProbe semantic commits remains five terminal selection sites
await/timer/storage/network/chat-write marker counts unchanged
persistent/schema markers unchanged
latest.js == install.js
```

Add a bounded pure differential harness for the five selection tuples:

```text
old direct Object.freeze assembly
vs
new recordClaimSelection assembly
```

For representative prior probe shapes, both must deep-equal and remain frozen.

## 9. Validation-system posture

The cumulative builder must be self-contained in the PR-dry sandbox. It must not depend on repository-local helper files absent from candidate materialization.

Because direct `products/simcore/tooling/build-*.py` files are now classified `CI_SELF + HARNESS`, the final request-free checkpoint must exercise substantive gates rather than collapse to doc-only NOOP.

Temporary PR-dry intent, if used:

```text
exists only to exercise GATE_PR1_DRY
persists no candidate
creates no release authority
must be deleted before merge
follow with request-free exact-head substantive CI
```

## 10. Hard stops

Stop and preserve evidence if:

```text
any branch value mapping changes
transport selection precedence changes
fallbackFrom/sessionRoot changes
helper requires async behavior or I/O
claimHostLocalOnce or mailbox semantics become involved
updateHostProbe call/order changes
capsule compatibility/durability rules change
new module/export/require edge is needed
runtime latency optimization is attempted
```

Any such finding is outside S3-1 and must not be smuggled under simplification.

## 11. Live posture

```text
PRE_S7_DEPLOYMENT = NONE
PRE_S7_BROAD_REAL_LONG_CHAT = NONE
```

S3-1 receives static/CI/differential internal qualification only. Real long-chat regression for the cumulative runtime remains S7 authority.

## 12. Final disposition

```text
S3_1_DESIGN = FROZEN
DELTA = DEDUPE FIVE CLAIM-SELECTION PROBE ASSEMBLIES INTO ONE PRIVATE HELPER
TRANSPORT / VALIDATION SEMANTICS = UNCHANGED
HOST_LOCAL BEHAVIOR = FROZEN
PROVIDER CACHE = UNVERIFIED
release-simcore = v0.70.1 unchanged
NEXT = IMPLEMENT S3-1 AS CUMULATIVE INTERNAL CHECKPOINT
```
