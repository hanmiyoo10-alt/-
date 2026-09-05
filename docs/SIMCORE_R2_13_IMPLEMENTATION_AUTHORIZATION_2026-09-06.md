# SimCore R2.13 Implementation Authorization

Date: 2026-09-06 KST
Status: **IMPLEMENTATION AUTHORIZED · DESIGN REMAINS FROZEN · NON-RUNTIME**
Classification: **RELEASE SYSTEM V2 / OPERATOR AUTHORIZATION**

## Authority

The operator explicitly authorized implementation of the frozen R2.13 design in the active SimCore project conversation on 2026-09-06 KST.

Authorized design:

```text
R2.13 = Exact Dispatch Run-ID Binding
Design = docs/SIMCORE_R2_13_EXACT_DISPATCH_RUN_ID_BINDING_DESIGN_2026-09-06.md
Predecessor R2.12 = KEEP / DO NOT REOPEN
```

## Authorized implementation scope

Exactly the frozen two owners may change:

```text
.github/workflows/canonical-main-doc-promotion.yml
.github/plugin-control-plane/canonical-main/tests/documentation-stream-contract.cjs
```

The implementation must:

```text
- dispatch Plugin Control Plane and SimCore documentation checks through the pinned GitHub workflow-dispatch REST contract
- capture exact workflow_run_id values returned by dispatch
- carry those IDs as step outputs
- re-read each exact run and prove event=workflow_dispatch and head_sha=HEAD_SHA
- watch those exact IDs with fail-closed semantics
- remove same-head run discovery, first-match selection, polling, and sleeps from this path
- preserve MAIN_HEALTH for docs-only SimCore validation
- preserve exact-base / exact-head merge protection
```

## Explicit non-authorization

This authorization does not permit changes to:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
.github/workflows/simcore-ci.yml
.github/workflows/plugin-control-plane-ci.yml
runtime behavior
R2.12 source-routing semantics
v0.70.9 HUMAN_EVIDENCE state
```

No runtime release is part of R2.13.

## Validation requirement

Implementation may merge only after the exact implementation head passes the repository-required hosted validation. After merge, natural canonical documentation promotion evidence must be observed when available and every anomaly must be classified WATCH / DEFER / FIX / BLOCKER before closure.

```text
IMPLEMENTATION_AUTHORITY = GRANTED
DESIGN_MUTATION_AUTHORITY = NOT GRANTED
RUNTIME_MUTATION = FORBIDDEN
RELEASE_SIMCORE_DEPLOYMENT = NOT APPLICABLE
```
