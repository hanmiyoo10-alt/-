# SimCore v0.70.4 Publication Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **PUBLISHED · LIVE_PENDING · HUMAN REAL-LONG-CHAT REQUIRED**
Classification: **SIMCORE · RELEASE EVIDENCE · RUNTIME FEATURE · OBSERVABILITY-ONLY**

## 1. Release identity

```text
releaseId = simcore-v0.70.4-new-02
version = 0.70.4
releaseName = Manual Edit Rebuild Attribution
releaseMode = NEW_VERSION
primaryGoalId = 07004_MANUAL_EDIT_REBUILD_ATTRIBUTION
changeClass = RUNTIME_FEATURE
liveScenarioId = 07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_REAL_LONG_CHAT
liveCloseAuthority = HUMAN_EVIDENCE
```

The earlier `simcore-v0.70.4-new-01` exact-approval package failure remains preserved separately and was not reused.

## 2. Candidate and approval chain

Fresh recovery candidate:

```text
intentId = simcore-v0.70.4-intent-02
candidateCommit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
candidateReleaseBlob = 7cf830bd6c48f706e97f116f019144bf280e301c
expectedProductionCommit = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
```

Candidate qualification PR `#1449` passed SimCore Verify and Required before merge and materialization.

Fresh exact approval PR `#1450` used the required two-file package:

```text
products/simcore/releases/approvals/simcore-v0.70.4-new-02.json
products/simcore/releases/specs/simcore-v0.70.4-new-02.json
```

Its title was the exact activation contract:

```text
SimCore exact release approval: simcore-v0.70.4-new-02
```

The approval PR passed SimCore Verify and Required and merged as:

```text
c11eda4cf412ad779bed51c354297e0c53f2a7c0
```

## 3. Exact Approval Activation

```text
workflow = SimCore Exact Approval Activation
run = 33826301215
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
Approval Activation Required = SUCCESS
```

This proves the fresh approval package crossed the exact delegated approval boundary and successfully dispatched the permanent controller.

## 4. Permanent Release

```text
workflow = SimCore Permanent Release
run = 33826317331
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

No recovery path was required.

## 5. Production authority readback

Direct `release-simcore` readback after publication:

```text
productionCommit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
previousProductionCommit = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
parent relation = exact direct child
commit message = SimCore v0.70.4 Manual Edit Rebuild Attribution
```

The production commit is the exact immutable candidate commit and its only parent is the previous v0.70.3 production commit.

Direct plugin-file readback:

```text
plugins/simcore/latest.js blob = 7cf830bd6c48f706e97f116f019144bf280e301c
plugins/simcore/install.js blob = 7cf830bd6c48f706e97f116f019144bf280e301c
latest.js == install.js = VERIFIED BY IDENTICAL BLOB
metadata version = 0.70.4
release header = v0.70.4 Manual Edit Rebuild Attribution
```

The immutable candidate builder/regression contract for this exact blob also requires:

```text
SIMCORE_RUNTIME_VERSION = 0.70.4
HOST_COMPAT_VERSION = 0.70.4
operator release card = 0.70.4 / Manual Edit Rebuild Attribution
Current Task Primacy Guard semantics preserved
module inventory/order unchanged
require graph unchanged
persistent schema unchanged
```

The Permanent Release exact verifier passed against the materialized production and candidate before publication.

## 6. Durable main state

Permanent Release declared state on main at:

```text
d0dacd0d1883d0957df61138acdcd59546e7358d
state(simcore): declare simcore-v0.70.4-new-02 live pending
```

Machine authority files:

```text
products/simcore/releases/records/simcore-v0.70.4-new-02.json
products/simcore/releases/state-receipts/simcore-v0.70.4-new-02.json
```

Observed state:

```text
releaseState = LIVE_PENDING
productionTruth = PUBLISHED_IDENTITY_VERIFIED
stateSyncStatus = PASS
validationStatus = PENDING_REAL_LONG_CHAT
lifecycleState = REAL_RELEASE_LIVE_PENDING
releaseAuthority = RS2_4_PERMANENT
openAnomalyIds = []
```

## 7. Live gate now authoritative

Publication is complete, but terminal release closure is not.

Frozen human live gate:

```text
07004_MANUAL_EDIT_REBUILD_ATTRIBUTION_REAL_LONG_CHAT
```

Required minimum matrix from the frozen v0.70.4 design:

1. Normal carryover control
   - `SAME_FAST` or current ordinary exact path
   - no new attribution warning
   - no `Manual edit breakdown` line

2. Representation drift control, where naturally available
   - `REPRESENTATION_DRIFT_CORRELATED`
   - `REPRESENTATION_FAST_RECONCILED`
   - snapshot `UNCHANGED`
   - no material fast-path regression from instrumentation

3. Genuine manual edit positive control
   - `USER_EDIT_CANDIDATE`
   - `MANUAL_EDIT_REBUILT`
   - snapshot `UPDATED`
   - `Manual edit breakdown` present
   - all measured fields bounded and non-negative

One genuine-edit sample is sufficient to validate instrumentation correctness, but it is not enough to choose an optimization target.

Optimization remains HOLD until either the same named subspan dominates at least two independent genuine-edit long-chat samples, or one overwhelmingly dominant sample has deterministic fixture/source proof.

## 8. Disposition

```text
PUBLICATION = PASS
PRODUCTION = v0.70.4
LIVE GATE = PENDING HUMAN EVIDENCE
OPTIMIZATION = HOLD
ANOMALIES = NONE OPEN AT PUBLICATION
NEXT = REAL LONG-CHAT VALIDATION ONLY
```

No runtime or release-system change is introduced by this evidence document.
