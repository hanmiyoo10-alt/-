# SimCore LRE-1 Post-Merge Canonical Documentation Promotion Watch — 2026-09-03

Date: 2026-09-03 KST

Status: **WATCH · CANONICAL_DOC_PROMOTION_CONTROL_PLANE_CLASSIFICATION_DRIFT · NON_BLOCKING_FOR_LRE1_DESIGN · REPO-CONTROL-PLANE FIX SEPARATE**

Classification: **SIMCORE · LRE-1 · POST-MERGE OPERATIONAL ANOMALY · REPOSITORY CONTROL PLANE · WATCH**

## 0. Purpose

This document preserves an operational anomaly observed immediately after merging the LRE-1 impact scope.

It does not change SimCore product/runtime design and does not authorize a repository control-plane repair inside the LRE-1 transaction.

## 1. Trigger

LRE-1 impact scope PR:

```text
#1371
docs(simcore): scope LRE-1 production host coupling
```

Merged main SHA:

```text
d71c6c2468ebbf85bc57236b191c36ae6a4fe16c
```

The exact-main SimCore CI push run completed successfully.

A separate downstream workflow failed:

```text
Canonical Main Documentation Promotion
run = 33714225899
job = promote / 100519909837
failure step = Wait for exact candidate checks
```

## 2. Downstream candidate

The documentation-promotion workflow rendered canonical repository documentation and used:

```text
branch = automation/canonical-main-docs
candidate head = 306d9b0bad77ba92035d7c4eb7537bb9becde848
canonical-doc PR = #671
```

It then dispatched:

```text
Plugin Control Plane CI
run = 33714250264

SimCore CI
run = 33714251705
```

The promotion waiter failed because Plugin Control Plane CI failed.

## 3. Exact contract failure

Plugin Control Plane CI job:

```text
contract = 100519971433
```

failed in:

```text
.github/plugin-control-plane/canonical-main/tests/canonical-main-contract.cjs
```

with:

```text
AssertionError:
every direct repo-main-write workflow must be classified
```

Observed actual direct-main-write workflow set:

```text
product-simcore-candidate-materialize.yml
product-simcore-terminal-convergence-r2-8.yml
repo-main-write-coordination-migration.yml
simcore-r2-7-status-projection.yml
simcore-release-command.yml
simcore-release-state-sync.yml
usage-dashboard-project-memory.yml
```

Contract expected set:

```text
product-simcore-candidate-materialize.yml
repo-main-write-coordination-migration.yml
simcore-release-command.yml
simcore-release-permanent.yml
simcore-release-state-sync.yml
usage-dashboard-project-memory.yml
```

The mismatch is therefore a repository control-plane classification drift:

```text
new/current direct-main writers not reflected in expected classification
+
retired/absent simcore-release-permanent.yml still expected
```

## 4. Why this is not an LRE-1 semantic failure

The failing assertion does not inspect:

```text
LRE-1 host coupling semantics
RisuAI editoutput/editdisplay behavior
Source Intelligence design
Exposure policy
SimCore runtime bytes
release-simcore
```

The LRE-1 exact-main SimCore CI itself completed successfully.

Therefore current evidence supports:

```text
LRE1_DESIGN_INTEGRITY = UNAFFECTED
SIMCORE_PRODUCT_CI = PASS
REPOSITORY_DOC_PROMOTION_ADMIN = DEGRADED
```

## 5. Classification

```text
WATCH
· CANONICAL_DOC_PROMOTION_CONTROL_PLANE_CLASSIFICATION_DRIFT
· NON_BLOCKING_FOR_LRE1_DESIGN
```

Reason:

- the anomaly is real and must remain visible;
- it affects repository documentation-promotion administration;
- it does not currently contradict the LRE-1 product/design evidence;
- repairing canonical-main workflow classification belongs to repository control-plane authority, not SimCore feature design;
- SimCore rules forbid mixing product design with repository/release-system restructuring.

## 6. Non-authority

This WATCH does not authorize:

```text
editing canonical-main-contract.cjs
changing direct-main writer classification
changing workflow topology
repairing PR #671
changing SimCore runtime
changing release-simcore
```

A repository-control-plane transaction may repair the classification drift separately.

## 7. Proceed rule

LRE-1 design may continue if:

```text
exact-main SimCore CI remains PASS
release-simcore remains unchanged
this WATCH remains recorded
no evidence appears that the control-plane failure was caused by LRE-1 semantic content
```

Until repository control-plane repair occurs, repeated canonical documentation promotion failures with the same exact classification mismatch should be treated as the same known WATCH rather than as new SimCore product failures.

## 8. Final disposition

```text
ANOMALY = RECORDED
CLASS = WATCH
PRODUCT_BLOCKER = NO
LRE1_DESIGN_BLOCKER = NO
REPO_CONTROL_PLANE_REPAIR = SEPARATE TRANSACTION
PRODUCTION = UNCHANGED
```
