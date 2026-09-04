# SimCore v0.70.6 Publication Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **PUBLISHED · LIVE_PENDING · HUMAN REAL-LONG-CHAT REQUIRED**
Classification: **SIMCORE · v0.70.6 · MANUAL EDIT REDUNDANT PRUNE ELISION · RUNTIME FEATURE**

## 1. Published identity

```text
releaseId = simcore-v0.70.6-new-02
intentId = simcore-v0.70.6-intent-02
version = 0.70.6
releaseName = Manual Edit Redundant Prune Elision
releaseMode = NEW_VERSION
primaryGoalId = 07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION
changeClass = RUNTIME_FEATURE
liveScenarioId = 07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_REAL_LONG_CHAT
liveCloseAuthority = HUMAN_EVIDENCE
```

## 2. Predecessor and implementation authority

The predecessor v0.70.5 release was durably closed to `LIVE_PASS` before v0.70.6 implementation began.

Implementation authority and evidence remain:

- `docs/SIMCORE_07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_IMPACT_SCOPE_2026-09-04.md`
- `docs/SIMCORE_07006_IMPLEMENTATION_AUTHORIZATION_2026-09-04.md`
- `docs/SIMCORE_07006_IMPLEMENTATION_EVIDENCE_2026-09-04.md`

Implementation PR #1474 merged only after exact-head SimCore `Verify` and `Required` passed.

The bounded runtime change preserves the Store module while eliding only the redundant inline prune on a proven genuine same-out-key manual-edit overwrite. The rebuilt `backend.set` remains authoritative and awaited, and explicit diagnostic provenance distinguishes skipped prune from a measured zero-duration executed prune.

## 3. Preserved implementation anomalies

Two implementation-stage blockers were observed and preserved before release publication:

1. `docs/SIMCORE_07006_IMPLEMENTATION_REGRESSION_FAILURE_01_ELIGIBILITY_MARKER_CARDINALITY_2026-09-04.md`
2. `docs/SIMCORE_07006_IMPLEMENTATION_REGRESSION_FAILURE_02_SYNTHETIC_COMMIT_WALLTIME_2026-09-04.md`

Both were classified `FIX / BLOCKER / NON_RUNTIME / PRODUCTION EXPOSURE NONE`, repaired without changing production, and followed by clean exact-head CI.

## 4. First candidate transaction failure and append-only recovery

The first pre-merge candidate attempt was intentionally not reused.

```text
failed intent = simcore-v0.70.6-intent-01
failed release id = simcore-v0.70.6-new-01
candidate request PR = #1475
SimCore CI run = 33872161801
failure = PR1_DRY_QUALIFICATION_FAIL
exact assertion = R2.9 active regression source version unsupported: 0.70.6
production exposure = NONE
```

Preserved blocker:

- `docs/SIMCORE_07006_CANDIDATE_QUALIFICATION_FAILURE_01_R2_9_ACTIVE_VERSION_2026-09-04.md`

The issue was a validation-projection identity lag, not a runtime defect. The bounded repair changed only the existing R2.9 validation-contract projection regression so it recognized the already-defined v0.70.6 identity/profile while retaining future-version fail-closed behavior.

Repair evidence:

- `docs/SIMCORE_07006_R2_9_VALIDATION_PROJECTION_REPAIR_EVIDENCE_2026-09-04.md`
- repair PR #1477
- final repair CI = PASS

Recovery was append-only through fresh `intent-02 / new-02` against unchanged production v0.70.5.

## 5. Candidate qualification and immutable materialization

Recovery candidate request:

```text
PR = #1478
request head = 1878a9c5389413382c4ed8ca0427ff70e727266b
request merge = ad03e09976cec0ab8af271b9ffbd89f368773b6d
expectedProductionCommit = 4374bef29e28804750c05115258cc80f055a26f7
```

Candidate request SimCore CI:

```text
run = 33873058633
Verify = PASS
Required = PASS
```

Generic Candidate Materialize:

```text
run = 33873187073
result = SUCCESS
candidateCommit = e2552d7f93456652c94d9df37b0c253f12f2d900
candidateReleaseBlob = 83714d78537906fc9f2060c06c9e4ce349568a19
candidateFetchRef = candidate/simcore/simcore-v0.70.6-intent-02
productionMutation = NONE
```

Durable candidate receipt:

- `products/simcore/releases/candidate-receipts/simcore-v0.70.6-intent-02.json`
- durable main candidate-state commit = `28c7a8276003b432122ac6046266f20946dffad6`

Candidate exactness was directly reobserved before approval:

```text
candidate parent = 4374bef29e28804750c05115258cc80f055a26f7
changed runtime paths = plugins/simcore/latest.js + plugins/simcore/install.js only
latest.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
install.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
latest.js == install.js = VERIFIED
candidate metadata version = 0.70.6
```

## 6. Exact approval

Exact approval package:

- `products/simcore/releases/approvals/simcore-v0.70.6-new-02.json`
- `products/simcore/releases/specs/simcore-v0.70.6-new-02.json`

Approval PR:

```text
PR = #1479
exact title = SimCore exact release approval: simcore-v0.70.6-new-02
approval head = 2433ae9fd955390c94df98d59036baebc7e755c4
approval merge = c99a8f7255b919a3390e14454b0bcecfbfbf665b
changed files = 2
SimCore Verify = PASS
SimCore Required = PASS
```

Exact Approval Activation:

```text
run = 33873645957
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
Approval Activation Required = SUCCESS
```

## 7. Permanent Release

Permanent Release:

```text
run = 33873661720
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

No recovery path was required after the successful `new-02` exact approval.

## 8. Direct production readback

Direct `release-simcore` reobservation after publication:

```text
production commit = e2552d7f93456652c94d9df37b0c253f12f2d900
previous production commit = 4374bef29e28804750c05115258cc80f055a26f7
direct parent relationship = VERIFIED
latest.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
install.js blob = 83714d78537906fc9f2060c06c9e4ce349568a19
latest.js == install.js = VERIFIED
metadata version = 0.70.6
SIMCORE_RUNTIME_VERSION = 0.70.6
HOST_COMPAT_VERSION = 0.70.6
release identity = Manual Edit Redundant Prune Elision
```

## 9. Durable published state

Machine authority:

- `products/simcore/releases/records/simcore-v0.70.6-new-02.json`
- `products/simcore/releases/state-receipts/simcore-v0.70.6-new-02.json`

Observed durable state:

```text
releaseState = LIVE_PENDING
productionTruth = PUBLISHED_IDENTITY_VERIFIED
stateSyncStatus = PASS
validationStatus = PENDING_REAL_LONG_CHAT
lifecycleState = REAL_RELEASE_LIVE_PENDING
releaseAuthority = RS2_4_PERMANENT
openAnomalyIds = []
main state commit = 369b670c0bd6be5c890d990ec22970c2630cf386
```

## 10. Human real-long-chat gate

Publication does not close the release. The remaining authority is HUMAN_EVIDENCE for:

```text
07006_MANUAL_EDIT_REDUNDANT_PRUNE_ELISION_REAL_LONG_CHAT
```

Minimum live expectations:

### Ordinary carryover control

```text
SAME_FAST or current ordinary exact path
snapshot UNCHANGED
no Manual edit retention line
```

### Representation-drift control, when naturally available

```text
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
no Manual edit retention line
```

### Genuine manual edit positive control

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
snapshot UPDATED
Manual edit breakdown present
Manual edit commit present
Manual edit commit prune contribution = 0.0 ms when skip provenance is active
Manual edit retention: INLINE_PRUNE_SKIPPED · reason SAME_OUT_KEY_OVERWRITE
```

The positive control must continue to show one authoritative rebuilt save and preserved edit correctness. Any new anomaly observed in live testing must be preserved immediately and classified `WATCH / DEFER / FIX / BLOCKER` before terminal close.

## 11. Publication disposition

```text
PUBLICATION = PASS
PRODUCTION = v0.70.6
RELEASE = Manual Edit Redundant Prune Elision
LIVE GATE = PENDING HUMAN EVIDENCE
ANOMALIES = NONE OPEN AT PUBLICATION
NEXT = REAL LONG-CHAT VALIDATION ONLY
```
