# SimCore R2.7 Durable Operational Status Projection — Implementation Worksheet

Date: 2026-08-29 KST

Status: **IMPLEMENTATION IN PROGRESS · NON_RUNTIME**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_DESIGN.md`

Authorization:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_7_DURABLE_OPERATIONAL_STATUS_PROJECTION_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Working branch:
- `impl/simcore-r2-7-durable-status-projection`

## Ownership

```text
projection semantics  products/simcore/tooling/release-rsystem-status-project.mjs
proof semantics       existing products/simcore/tooling/release-operational-proof.mjs
workflow caller       .github/workflows/simcore-r2-7-status-projection.yml
main writer            existing scripts/repo-main-write.py
regression             products/simcore/tests/suites/release-system-r2-7-status-projection.test.mjs
classification         products/simcore/tooling/ci/classify.mjs
status authority       products/simcore/releases/R_V2_7_EVIDENCE_DERIVED_OPERATIONS_STATUS.json
```

## Frozen exclusions

```text
plugins/simcore/latest.js       NO CHANGE
plugins/simcore/install.js      NO CHANGE
release-simcore                 NO CHANGE
Permanent publisher             NO CHANGE
HUMAN_EVIDENCE                  NO CHANGE
product LIVE_PASS               NO CHANGE
R2.8 approval implementation    NOT IN THIS TRANSACTION
background polling/retry        NONE
```

## Implementation details

The workflow will use the existing operational-proof CLI for every canonical record/receipt pair, ordered by numeric `publisherRunId`, and stop at the first eligible proof while the R2.7 first-use gate remains pending.

This ordering is orchestration only. Eligibility remains owned by the projection owner and is based on:

```text
proofResult = PASS
operationallyProven = true
canonical proof paths
record.verifierCommit descendant-or-equal to implementationAncestor
consumeOnce gate state
```

The workflow file itself is included in the push path filter solely as a one-time bootstrap trigger when this implementation first lands on main. Steady-state triggers remain canonical record/receipt changes.

The gateway-generated status commit is not in the workflow path filter, preventing self-trigger loops.

## Validation ledger

### FIX · RESOLVED · REPO_WRITE_IDENTITY — stale GitHub contents blob SHA

The first attempt to update the R2.7 living status on the implementation branch used a blob SHA observed from the predecessor/main state rather than the exact current branch blob identity. GitHub correctly rejected the contents write with HTTP 409.

Resolution:

```text
re-read exact implementation-branch status blob
→ bind update to branch blob SHA
→ continue without semantic changes
```

Classification:

```text
R2_7_STATUS_PROJECTION_REPO_WRITE_IDENTITY = FIX / RESOLVED
semantic impact = NONE
runtime impact = NONE
release-simcore impact = NONE
```

This is repository write identity hygiene only and does not change the projection design or authority model.

### FIX · RESOLVED · LIFECYCLE_REGRESSION — predecessor test hardcoded activation false

The predecessor `release-system-r2-7` suite encoded the implementation-close snapshot `activationAuthorized = false` as a permanent assertion. A correct documentary first-use projection would therefore make the predecessor regression reject the intended next lifecycle state.

Resolution:

```text
pending state
→ require pending gate + pending proof marker

consumed state
→ require proven status + consumed documentary gate + immutable PASS proof
```

The regression remains fail-closed for incoherent states but no longer mistakes a frozen historical snapshot for a permanent semantic invariant.

Classification:

```text
R2_7_ACTIVATION_REGRESSION_LIFECYCLE_AWARENESS = FIX / RESOLVED
runtime impact = NONE
release-simcore impact = NONE
```

Any new anomaly must be classified immediately as WATCH / DEFER / FIX / BLOCKER before continuing.
