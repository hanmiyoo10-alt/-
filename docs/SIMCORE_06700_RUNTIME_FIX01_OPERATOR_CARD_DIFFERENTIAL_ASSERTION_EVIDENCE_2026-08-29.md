# SimCore v0.67.0 Runtime FIX01 — Operator-card differential assertion evidence

Date: 2026-08-29

Status: **FIX MATERIALIZED · PRODUCT CI PENDING · PRODUCTION v0.66.0 UNCHANGED**

Parent failure authority:

`docs/SIMCORE_06700_RELEASE_INTENT_FAILURE_01_RUNTIME_PROBE_GUIDANCE_ASSERTION_2026-08-29.md`

Failed transaction:

```text
intent-01 / new-01
GATE_PR1_DRY FAIL
06700_UNEXPECTED_MODULE_BODY_CHANGE runtime-probe
```

## 1. Root cause

The v0.67 operator release card is intentionally replaced as part of release guidance. The card is physically located inside the `runtime-probe` module.

The first builder incorrectly asserted that every surviving module other than `contracts` and `runtime-telemetry` must remain byte-identical, so it rejected its own authorized operator-card mutation.

No candidate was materialized and no production runtime was changed.

## 2. Repair

New self-contained builder:

`products/simcore/tooling/build-06700-m2-5-recovery-transition-debt-retirement-fix01.py`

The repair does not broadly exempt `runtime-probe` from differential checking.

Instead it freezes the exact allowed shape:

```text
all surviving modules except contracts/runtime-telemetry/runtime-probe
-> byte-identical to v0.66 parent

contracts
-> exact Recovery contract-row removal only

runtime-telemetry
-> exact HOST_COMPAT_VERSION 0.66.0 -> 0.67.0 only

runtime-probe
-> exact deterministic operator-card replacement only
```

The expected `runtime-probe` body is independently derived by applying only `patch_operator_card(original)` and comparing that exact module body with the final candidate.

Any other runtime-probe mutation fails closed as:

`06700_RUNTIME_PROBE_DELTA_NOT_OPERATOR_CARD_ONLY`

## 3. Unchanged M2-5 safety checks

FIX01 retains all original builder guards:

```text
exact v0.66 source precondition
Recovery physical count before = 1
runtime Recovery consumers before = 0
expected forwarding facade shape
identity convergence to 0.67.0
Recovery physical absence after mutation
no Recovery runtime require/SimCore.require residue
module inventory = parent minus Recovery
require graph unchanged outside removed Recovery node
Output Compat / Bootstrap Migration / Output Finalize / Edit Reconcile / Representation remain present
runtime-effect surfaces do not grow
provider cache remains UNVERIFIED
latest.js == install.js
```

## 4. Scope classification

```text
class       FIX
owner       v0.67 candidate builder assertion envelope
runtime     no new functional mutation
release sys unchanged
production  unchanged v0.66.0
```

The failed `intent-01 / new-01` IDs remain consumed and must not be reused.

After this fix passes product CI, the next release attempt must use fresh append-only IDs, beginning with `intent-02 / new-02` if still unused.
