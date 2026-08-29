# SimCore v0.67.0 M2-5 Recovery Transition Debt Retirement — Implementation Evidence

Date: 2026-08-29

Status: **IMPLEMENTATION MATERIALIZED ON WORK BRANCH · PRODUCT PR/CI PENDING · PRODUCTION v0.66.0 UNCHANGED**

Work branch:

`runtime/simcore-v0.67.0-m2-5-recovery-retirement`

Frozen design authority:

`docs/SIMCORE_06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_DESIGN_2026-08-29.md`

Implementation activation authority:

`docs/SIMCORE_06700_M2_5_IMPLEMENTATION_ACTIVATION_2026-08-29.md`

Production parent:

```text
version            0.66.0
release            M2-4 Session / Runtime Mirror Boundary Completion
release-simcore    4b6ae1a4c63f6be658c6163168cc46a1adef60aa
latest/install     f0da13d4c47fd98e9065d7dbf253a3296151ee16
validation         LIVE_PASS
checkpoint         M2-4
```

## 1. Scope

This work implements only the frozen M2-5 transition-debt retirement:

```text
remove the zero-runtime-caller physical Recovery compatibility facade
```

It does not include:

```text
PARTIAL_PREVIOUS_TURN_REPLAY repair
COMMUNITY platform-family behavior
manual-edit rebuild latency optimization
B_START closure-expression tuning
provider-cache work
PRE_SIMCORE cache/history work
compatibility broadening
Kernel/State/Turn Pipeline extraction
broad Session receipt relocation
persistent-schema changes
new host/network/timer surfaces
release-system or repository-system redesign
```

## 2. Exact v0.66 source prerequisite

Exact deployed v0.66 source was re-observed before implementation.

The standalone Recovery module is a forwarding facade over:

```text
output-compat
bootstrap-migration
```

It owns no policy, state or I/O.

The exact production audit established:

```text
Recovery physical module       PRESENT
runtime require('./recovery')  0 outside the Recovery definition
runtime recovery.* callers     0
replacement barrel             NONE
```

The builder independently repeats the zero-consumer proof against its actual input before any mutation.

## 3. Deterministic builder

Builder:

`products/simcore/tooling/build-06700-m2-5-recovery-transition-debt-retirement.py`

The builder is intentionally self-contained because generic candidate materialization executes only the requested builder inside the deployed production worktree.

Authorized runtime mutation envelope:

```text
1. release identity 0.66.0 -> 0.67.0
2. current v0.67 release note / operator guidance
3. current internal Contracts registry Recovery row removal
4. exact standalone SimCore.define("recovery", ...) removal
```

No sibling builder, main-only validation script or repository-side helper is required by the builder.

### Builder fail-closed assertions

Before mutation:

```text
source metadata version = 0.66.0
Recovery physical definition count = 1
runtime Recovery consumers = 0
expected forwarding facade shape present
```

After mutation:

```text
metadata version = 0.67.0
SIMCORE_RUNTIME_VERSION = 0.67.0
HOST_COMPAT_VERSION = 0.67.0
Recovery physical definition count = 0
runtime require('./recovery') = 0
runtime SimCore.require('recovery') = 0
module count = parent count - 1
module inventory = exact parent inventory minus Recovery
surviving require graph = byte-equivalent topology minus Recovery node
latest.js == install.js
```

Every surviving physical module body must be byte-identical to the v0.66 parent except:

```text
contracts
  -> exact Recovery contract-row removal only

runtime-telemetry
  -> HOST_COMPAT_VERSION 0.66.0 -> 0.67.0 only
```

The outer release header/operator card is allowed to change only as release identity/guidance metadata.

The builder also rejects growth in the bounded runtime-effect surfaces:

```text
fetch(
XMLHttpRequest
setInterval(
setTimeout(
pluginStorage
Risuai.registerButton(
Risuai.registerSetting(
```

## 4. Architecture contract — version-bound retirement

A simple `physical: planned` or `physical: optional` declaration would weaken production truth because v0.66 still requires the Recovery facade while v0.67 must remove it.

Therefore the architecture checker now supports the narrow transition state:

```json
{
  "physical": "retiring",
  "retire_at_version": "0.67.0"
}
```

Semantics:

```text
source version < 0.67.0
-> retiring module is REQUIRED

source version >= 0.67.0
-> retiring module is FORBIDDEN
```

The source version must be an exact numeric `x.y.z`; malformed retirement metadata fails closed.

This lets one living contract validate both sides of the transition without lying about current production:

```text
release-simcore v0.66.0 -> Recovery PRESENT required
v0.67.0 candidate       -> Recovery ABSENT required
```

No layer rule or dependency rule is weakened.

## 5. Machine Contracts v2 candidate state

`config/simcore-architecture-v2.json` retains current production as:

```text
v0.66.0
LIVE_PASS
M2-4
```

and adds a bounded candidate projection:

```text
v0.67.0
M2-5 Recovery Transition Debt Retirement
implementation_authorized = true
publication = PENDING
live_validation = PENDING
```

Recovery is declared `physical: retiring` at `0.67.0`.

The stale Session allowed dependency on Recovery is removed because exact v0.66 production already has no Session `require('./recovery')` edge.

## 6. Release-sensitive regression bridges

The v0.66 release process previously proved that a new release identity can fail permanent candidate qualification if version-sensitive regression bridges remain pointed at the prior version.

M2-5 therefore adds v0.67 bridges before the first release intent for:

```text
reload-cache-continuity
bounded-telemetry-capsule
host-local-telemetry
operator-release-card
```

The permanent test registry now routes through the v0.67 wrappers.

### Reload/cache bridge

Normalizes only `//@version 0.67.0 -> 0.66.0` and reuses frozen v0.66 behavior.

### Bounded telemetry bridge

Normalizes only release identity and the live-scenario envelope, then reuses frozen v0.66 behavior.

### Host-local bridge

Directly proves:

```text
metadata/runtime/HOST identity = 0.67.0
Recovery physical module absent
Recovery runtime require absent
output-compat present
bootstrap-migration present
output-finalize present
edit-reconcile present
v0.67 Host-local capsule accepted
v0.66 capsule rejected as cross-version
```

### Operator-card bridge

Validates the M2-5 operator card, recent release ledger, same-tab reload guidance, non-authority disclaimer and no-side-effect boundary.

## 7. Frozen behavior contract

The implementation does not modify the physical owners that execute these paths:

```text
ordinary exact carryover
-> SAME_FAST
-> Edit origin NONE
-> snapshot UNCHANGED

prior OUTPUT_MISMATCH + exact Fresh carryover
-> REPRESENTATION_DRIFT_CORRELATED
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED

prior EXACT + genuine visible edit
-> USER_EDIT_CANDIDATE
-> MANUAL_EDIT_REBUILT
-> snapshot UPDATED
```

Also frozen:

```text
Deferred Mirror identity/location/staleness guards
Output Compat compatibility semantics
Bootstrap Migration behavior
Output Finalize transaction ordering
Store housekeeping cadence/failure isolation
Broadcast / Frame / Time / Continuity
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Community / Structure / Reaction
Prompt placement
TAIL_AFTER_CURRENT_USER
History stabilization OBSERVE_ONLY
provider cache UNVERIFIED
persistent Core schema
raw-body non-retention
```

## 8. Current advancement state

```text
DONE  design selected and frozen
DONE  implementation authorization
DONE  dedicated runtime work branch
DONE  self-contained deterministic builder
DONE  Recovery retirement candidate architecture contract
DONE  version-bound retirement drift guard
DONE  v0.67 release-sensitive regression bridges
NEXT  product PR + permanent Architecture Contracts / SimCore Verify / Required
THEN  append-only candidate materialization
THEN  exact approval and permanent publication
THEN  real long-chat ordinary continuity + same-tab reload/bootstrap evidence
THEN  final main durable state synchronization
```

Production remains exactly v0.66.0 until the normal release transaction publishes an approved v0.67 candidate.

Any newly observed anomaly must be preserved and classified `WATCH / DEFER / FIX / BLOCKER` before continuation.
