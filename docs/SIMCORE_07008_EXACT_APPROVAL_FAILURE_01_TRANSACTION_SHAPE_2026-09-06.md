# SimCore v0.70.8 Exact Approval Failure 01 — Transaction Shape

Date: 2026-09-06 KST
Status: **BLOCKER RECORDED · FAILED CLOSED · PRODUCTION UNCHANGED · FRESH TRANSACTION REQUIRED**
Release attempt: `simcore-v0.70.8-new-01`
Tracking runtime repair: `#1544`

## Classification

```text
BLOCKER · RELEASE_ACTIVATION_TRANSACTION_SHAPE · NON_RUNTIME
PRODUCTION MUTATION = NONE
RUNTIME CORRECTNESS IMPACT = NONE OBSERVED
```

## Evidence

The first exact-approval PR was #1578.

```text
approval head = 87961286eb3fb8fdc16c5d24f1513473cdf4d480
merge commit = 9a724af849c685520790d8e07ecd23bfe907eae0
SimCore CI = 33977296911 · Verify PASS · Required PASS
Exact Approval Activation = 33977369697 · FAILURE
Dispatch Permanent Caller = FAILURE
Permanent Release dispatch = NOT STARTED
```

The activation workflow checked out the exact merge and failed in `Resolve exact delegated approval transaction` before any permanent caller dispatch.

The frozen activation boundary requires the approval merge first-parent delta to contain exactly two paths:

```text
products/simcore/releases/approvals/<releaseId>.json
products/simcore/releases/specs/<releaseId>.json
```

and later requires the exact PR title:

```text
SimCore exact release approval: <releaseId>
```

PR #1578 contained only the approval path and used title `release(simcore): exact approve v0.70.8`.

The first executable failure occurred at the changed-path cardinality assertion:

```text
test "${#CHANGED[@]}" -eq 2
```

Therefore no approval resolution, permanent dispatch, or production mutation occurred.

## Production readback

Immediately after the failed activation:

```text
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
version = 0.70.7
release = Output Snapshot Set Cost Attribution
```

The qualified v0.70.8 candidate remains immutable:

```text
candidate commit = 361abf233a51682c1ac64fb785cfd01719477253
candidate blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
```

## Why `new-01` is not repaired in place

The activation boundary also requires both approval and spec paths to have exactly one first-parent touch and for that touch to be the current approval merge.

Because the `simcore-v0.70.8-new-01` approval path is already durable on main at merge `9a724af8...`, adding its spec later would not recreate the required atomic one-touch transaction.

The failed transaction is preserved and not rewritten.

## Recovery disposition

Use a fresh append-only release identity:

```text
intent = simcore-v0.70.8-intent-02
release = simcore-v0.70.8-new-02
expected production = 434df54760bc997b1bcd9223eeaff428aeee66d3
```

Recovery must:

1. create a fresh candidate request and receipt/spec-shadow under `intent-02 / new-02`,
2. verify candidate identity and production parent again,
3. create one exact-approval PR containing both machine-derived spec and approval,
4. use exact title `SimCore exact release approval: simcore-v0.70.8-new-02`,
5. require SimCore CI PASS,
6. allow Exact Approval Activation to dispatch Permanent Release only after its boundary passes,
7. verify production directly after publication.

No release-system code or workflow redesign is authorized by this incident.
