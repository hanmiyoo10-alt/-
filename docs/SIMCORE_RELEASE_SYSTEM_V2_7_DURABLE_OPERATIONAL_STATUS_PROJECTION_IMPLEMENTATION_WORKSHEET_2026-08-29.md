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

### FIX · RESOLVED · CI_SELF_CLASSIFICATION — active projection workflow mistaken for legacy

First implementation PR CI:

```text
PR            #851
head          28f2b9582f563486e1de81bb07fc55bc0036c7d5
SimCore CI     33258343151
Verify job     99115856783
trusted lane   PASS
GATE_STATIC    PASS
GATE_ARCH      PASS
GATE_STATE     PASS
GATE_COORDINATION PASS
GATE_CI_SELF   FAIL
```

The self-test enumerates every `simcore-*.yml` workflow and requires each to be either a known current/permanent workflow or present in the legacy migration map. The new active R2.7 projection workflow was correctly classified by `classify.mjs`, but had not yet been added to the self-test's current-workflow exemption set.

Resolution: preserve the legacy map unchanged and add only `simcore-r2-7-status-projection.yml` to the self-test's current/permanent workflow set.

Classification:

```text
R2_7_STATUS_PROJECTION_ACTIVE_WORKFLOW_SELFTEST_CLASSIFICATION = FIX / RESOLVED
new authority = NONE
runtime impact = NONE
release-simcore impact = NONE
```

### FIX · RESOLVED · FIXTURE_CONTRACT — new suite fixture envelope incomplete

The same first CI reported:

```text
GATE_REGRESSION = INFRA_ERROR / HARNESS_ERROR
stderr = FIXTURE_SCHEMA_INVALID: fixture envelope
```

Root cause: the first version of the new fixture omitted the common harness `schemaVersion` and standard regression metadata shape.

Resolution: conform the fixture to the same `schemaVersion / id / suite / input / expected / meta` envelope used by permanent release-system suites.

Classification:

```text
R2_7_STATUS_PROJECTION_FIXTURE_ENVELOPE = FIX / RESOLVED
semantic impact = NONE
runtime impact = NONE
release-simcore impact = NONE
```

### BLOCKER · RESOLVED BEFORE QUALIFICATION · EDIT_HYGIENE — partial-read self-test overwrite

While correcting the self-test classification, a bounded line-range read was momentarily treated as if it represented the complete `self-test.mjs` file and a shortened replacement commit was created on the work branch.

This was detected immediately before any successful qualification, merge, main mutation, or deployment step.

Resolution:

```text
re-read canonical main self-test in complete line ranges
→ restore the complete original file
→ apply exactly one semantic delta:
   add simcore-r2-7-status-projection.yml to the current/permanent workflow exemption set
→ rerun permanent CI from the corrected branch head
```

Classification:

```text
R2_7_SELF_TEST_PARTIAL_READ_OVERWRITE = BLOCKER / RESOLVED_BEFORE_QUALIFICATION
production impact = NONE
main impact = NONE
runtime impact = NONE
release-simcore impact = NONE
```

No qualification evidence produced before this correction is eligible for implementation closure.

### FIX · RESOLVED · TEST_BOUNDARY_FALSE_POSITIVE — authority name mistaken for authority primitive

Second corrected-head CI:

```text
head            dbaf64e46f56c0d6e3abeaa43ff624bb5617794c
SimCore CI       33258625622
Verify job       99116700224
trusted lane     PASS
GATE_CI_SELF     PASS
GATE_STATIC      PASS
GATE_ARCH        PASS
GATE_STATE       PASS
GATE_COORDINATION PASS
GATE_REGRESSION  FAIL
stderr           projection owner gained forbidden authority: repo-main-write.py
```

The new regression incorrectly treated any occurrence of the string `repo-main-write.py` inside the pure projection owner as write authority. The owner does not invoke the gateway. It reads the living status and verifies that the preserved main authority name remains exactly `repo-main-write.py`, which is itself a required safety check.

Resolution:

```text
forbid executable authority primitives:
  scripts/repo-main-write.py invocation
  python gateway spawn
  git push
  workflow dispatch
  polling/network mutation

allow and require documentary verification:
  preservedAuthorities.mainGateway == repo-main-write.py
```

Classification:

```text
R2_7_STATUS_PROJECTION_AUTHORITY_NAME_FALSE_POSITIVE = FIX / RESOLVED
projection authority = unchanged / documentary only
runtime impact = NONE
release-simcore impact = NONE
```

Any new anomaly must be classified immediately as WATCH / DEFER / FIX / BLOCKER before continuing.
