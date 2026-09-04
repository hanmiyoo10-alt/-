# SimCore v0.70.5 Publication Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **PUBLISHED · LIVE_PENDING · HUMAN REAL-LONG-CHAT REQUIRED**
Classification: **SIMCORE · RELEASE EVIDENCE · RUNTIME FEATURE · OBSERVABILITY-ONLY**

## 1. Release identity

```text
releaseId = simcore-v0.70.5-new-02
version = 0.70.5
releaseName = Manual Edit Commit Boundary Attribution
releaseMode = NEW_VERSION
primaryGoalId = 07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION
changeClass = RUNTIME_FEATURE
liveScenarioId = 07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_REAL_LONG_CHAT
liveCloseAuthority = HUMAN_EVIDENCE
```

The earlier `simcore-v0.70.5-new-01` activation attempt is preserved as a burned administrative transaction and was not edited or reused.

Its failure was isolated to the non-canonical approval PR title and is recorded in:

```text
docs/SIMCORE_07005_EXACT_APPROVAL_ACTIVATION_FAILURE_01_TITLE_2026-09-04.md
classification = FIX · BLOCKER · PRODUCTION_EXPOSURE_NONE
```

No runtime bytes reached production from `new-01`.

## 2. Append-only recovery candidate

Fresh recovery request:

```text
intentId = simcore-v0.70.5-intent-02
releaseId = simcore-v0.70.5-new-02
expectedProductionCommit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
```

Candidate request PR `#1467` passed SimCore Verify and Required before merge.

The generic candidate controller then materialized:

```text
candidateCommit = 4374bef29e28804750c05115258cc80f055a26f7
candidateReleaseBlob = c72802234d265337f2558420c84882148e633325
parent = df282f18a0035b03be30af8d0ee2174f58b3bcd3
changed runtime paths = plugins/simcore/latest.js, plugins/simcore/install.js
```

Both candidate runtime paths resolved to the same blob.

The regenerated `new-02` release blob exactly matched the burned `new-01` candidate release blob:

```text
new-01 candidateReleaseBlob = c72802234d265337f2558420c84882148e633325
new-02 candidateReleaseBlob = c72802234d265337f2558420c84882148e633325
byte identity across recovery = VERIFIED
```

This proves the append-only recovery changed release administration only and did not alter the frozen v0.70.5 runtime candidate.

## 3. Durable candidate authority

Machine-owned candidate state was durably committed to main before approval:

```text
products/simcore/releases/candidate-receipts/simcore-v0.70.5-intent-02.json
products/simcore/releases/spec-shadows/simcore-v0.70.5-new-02.json
```

The durable receipt binds:

```text
candidateCommit = 4374bef29e28804750c05115258cc80f055a26f7
candidateReleaseBlob = c72802234d265337f2558420c84882148e633325
expectedProductionCommit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
```

## 4. Exact approval

Fresh exact approval PR `#1468` contained exactly the required two-file first-touch package:

```text
products/simcore/releases/approvals/simcore-v0.70.5-new-02.json
products/simcore/releases/specs/simcore-v0.70.5-new-02.json
```

Its title matched the exact activation contract:

```text
SimCore exact release approval: simcore-v0.70.5-new-02
```

The approval PR passed SimCore Verify and Required and merged as:

```text
63c4edccf6df809d7a751e01a38ade5a79788f54
```

## 5. Exact Approval Activation

```text
workflow = SimCore Exact Approval Activation
run = 33833722270
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
result = SUCCESS
```

This confirms that the canonical approval title and exact package crossed the delegated approval boundary and dispatched the permanent release controller successfully.

## 6. Permanent Release

```text
workflow = SimCore Permanent Release
run = 33833733576
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
workflow result = SUCCESS
```

The exact permanent verifier ran before publication against the immutable production and candidate identities.

No recovery path was taken inside the successful `new-02` permanent publication transaction.

## 7. Production authority readback

Direct `release-simcore` readback after publication:

```text
productionCommit = 4374bef29e28804750c05115258cc80f055a26f7
previousProductionCommit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
parent relation = exact direct child
commit message = SimCore v0.70.5 Manual Edit Commit Boundary Attribution
```

The production commit is exactly the qualified immutable `new-02` candidate commit.

Direct runtime-file readback:

```text
plugins/simcore/latest.js blob = c72802234d265337f2558420c84882148e633325
plugins/simcore/install.js blob = c72802234d265337f2558420c84882148e633325
latest.js == install.js = VERIFIED BY IDENTICAL BLOB
metadata version = 0.70.5
SIMCORE_RUNTIME_VERSION = 0.70.5
HOST_COMPAT_VERSION = 0.70.5
operator release card = 0.70.5 / Manual Edit Commit Boundary Attribution
release header = v0.70.5 Manual Edit Commit Boundary Attribution
```

The published release therefore satisfies the frozen release identity and latest/install identity contracts.

## 8. Published behavior boundary

v0.70.5 remains observability-only.

Published intent:

```text
existing Manual edit breakdown aggregate commit remains authoritative
existing Store metric.serializeMs is projected
existing Store metric.setMs is projected
existing Store metric.pruneMs is projected
Manual edit commit diagnostic is emitted only for genuine MANUAL_EDIT_REBUILT attribution
Store module behavior remains unchanged
persistent schema remains unchanged
ordinary SAME_FAST and representation-fast paths remain branch-only
```

The permanent candidate verifier passed the builder/regression contract that enforces the Store byte-preservation and exact component accounting requirements.

## 9. Durable main state

Permanent Release declared the published state on main at:

```text
e63d882e7cb0b513cbc833eb1008226d4d00d866
state(simcore): declare simcore-v0.70.5-new-02 live pending
```

Machine authority files:

```text
products/simcore/releases/records/simcore-v0.70.5-new-02.json
products/simcore/releases/state-receipts/simcore-v0.70.5-new-02.json
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

## 10. Human live gate now authoritative

Publication is complete, but terminal release closure is not.

Frozen human live gate:

```text
07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_REAL_LONG_CHAT
```

Minimum live matrix from the frozen v0.70.5 design:

### A. Normal control

```text
SAME_FAST or equivalent exact carryover
no Manual edit breakdown line
no Manual edit commit line
no new warning
```

### B. Genuine manual edit positive control

Require:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit breakdown present
Manual edit commit present
serialize/set/prune each numeric or n/a according to the source contract
total consistent with the existing aggregate commit bucket
```

A known measured zero must remain numeric zero. An unavailable component must remain `n/a` and must not be fabricated as zero.

One genuine-edit live sample is sufficient to validate projection correctness.

## 11. Optimization disposition

This release does not authorize a performance repair.

Optimization remains HOLD until a separate evidence review establishes one of:

```text
same commit subphase dominates >= 2 independent genuine-edit long-chat samples
or
one subphase is overwhelmingly dominant in a live sample
AND exact deterministic source/fixture evidence proves that named boundary is the measured owner
```

Any later optimization must use a separate design/review transaction and a fresh monotonic release identity.

## 12. Publication disposition

```text
PUBLICATION = PASS
PRODUCTION = v0.70.5
PRODUCTION COMMIT = 4374bef29e28804750c05115258cc80f055a26f7
PRODUCTION BLOB = c72802234d265337f2558420c84882148e633325
LATEST/INSTALL IDENTITY = PASS
EXACT APPROVAL ACTIVATION = PASS
PERMANENT RELEASE = PASS
LIVE GATE = PENDING HUMAN EVIDENCE
OPTIMIZATION = HOLD
OPEN PRODUCTION ANOMALIES = NONE
NEXT = REAL LONG-CHAT VALIDATION ONLY
```

No runtime or release-system change is introduced by this evidence document.
