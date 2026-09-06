# SimCore v0.70.10 Publication Evidence

Date: 2026-09-06 KST
Status: **PUBLISHED · LIVE GATE PENDING HUMAN EVIDENCE**
Release: **0.70.10 · Host-Local Telemetry Set Cost Attribution**

## 1. Immutable release identities

```text
Previous production P = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
Candidate source S = b4c142da89ffef1d438ea1c799ef520c7302ca38
Immutable candidate C = ecc55f026315c6482c34d267aba2adb97527cdbc
Candidate / production blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
Release ID = simcore-v0.70.10-new-01
Live scenario = 07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
Live close authority = HUMAN_EVIDENCE
```

## 2. Implementation qualification

```text
Implementation PR = #1638
Final implementation head = 611b31616043dbc7c8c01593e71418627aac404e
Implementation main merge = 8849e50c96c9740c69d85165cd777b2b60f5f2fd
SimCore CI = 33991963663 · Verify SUCCESS · Required SUCCESS
Plugin Control Plane PR observe = 33991963675 · SUCCESS
Implementation evidence PR = #1639
Implementation evidence merge = 358b386738c08f421a82c32b60e32f5d7f2deff4
```

The pre-merge coarse-clock assertion anomaly was recorded separately as:

```text
FIX · V07010 IMPLEMENTATION QUALIFICATION · COARSE-CLOCK TEST EXPECTATION · PRE-MERGE
```

Runtime implementation remained KEEP; only the invalid strictly-positive timing test expectation was corrected to permit legitimate finite `0 ms` samples.

## 3. Candidate intent and materialization

Candidate intent:

```text
intentId = simcore-v0.70.10-intent-01
releaseId = simcore-v0.70.10-new-01
expectedProductionCommit = P
builder = products/simcore/tooling/build-07010-host-local-telemetry-set-cost-attribution.py
verificationSuite = batch-a
allowedRuntimePaths = plugins/simcore/latest.js, plugins/simcore/install.js
changeClass = RUNTIME_FEATURE
```

Candidate request PR #1640 passed Plugin Control Plane and SimCore Verify/Required, then merged as immutable source:

```text
S = b4c142da89ffef1d438ea1c799ef520c7302ca38
```

Generic Candidate Materialize:

```text
run = 34004983995
Materialize Candidate = SUCCESS
Persist Candidate Receipt and Spec Shadow = SUCCESS
candidateDisposition = CREATED
C = ecc55f026315c6482c34d267aba2adb97527cdbc
candidateReleaseBlob = 53f6959039c57f8673c355fcc1c22b573150e4a7
productionMutation = NONE
candidate parent = P exactly
candidate changed paths = latest.js, install.js only
```

Candidate transport ref:

```text
candidate/simcore/simcore-v0.70.10-intent-01
```

The candidate `latest.js` and `install.js` independently read back as version `0.70.10` and the same blob `53f6959039c57f8673c355fcc1c22b573150e4a7`.

Durable machine truth was committed to main as:

```text
b0183af8512c8a08ae9e40b4f211284992dc33b2
state(simcore): record candidate simcore-v0.70.10-intent-01
```

## 4. Exact approval

Exact approval transaction:

```text
approval = products/simcore/releases/approvals/simcore-v0.70.10-new-01.json
spec = products/simcore/releases/specs/simcore-v0.70.10-new-01.json
authorityConfirmation = RS2_4_RELEASE
approval head = 057725f49eedc37924464b5f4ee2ccde892df2c8
```

PR #1641 used the exact required title:

```text
SimCore exact release approval: simcore-v0.70.10-new-01
```

The PR changed exactly the approval and exact spec files and passed:

```text
Plugin Control Plane PR observe = 34005094419 · SUCCESS
SimCore CI = 34005094428 · Verify SUCCESS · Required SUCCESS
```

Exact approval merged to main as:

```text
52821ceb6ae22bc792f0ef1fb10b72c4850beff2
```

## 5. Exact Approval Activation

```text
workflow = SimCore Exact Approval Activation
run = 34005182713
head = 057725f49eedc37924464b5f4ee2ccde892df2c8
conclusion = SUCCESS
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
Approval Activation Required = SUCCESS
```

The adapter dispatched the permanent controller without any manual runtime mutation.

## 6. Permanent Release

```text
workflow = SimCore Permanent Release
run = 34005188161
policy/head = 52821ceb6ae22bc792f0ef1fb10b72c4850beff2
conclusion = SUCCESS
```

Jobs:

```text
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

`Publish Exact Candidate = SUCCESS` is the publication authority for the physical `release-simcore` mutation.

## 7. Independent production readback

After publication, `release-simcore` independently resolved to:

```text
ecc55f026315c6482c34d267aba2adb97527cdbc
```

This is exactly candidate C.

Independent file readback:

```text
plugins/simcore/latest.js
  version = 0.70.10
  blob = 53f6959039c57f8673c355fcc1c22b573150e4a7

plugins/simcore/install.js
  version = 0.70.10
  blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
```

Therefore:

```text
release-simcore == C
latest.js == install.js
production blob == approved candidate blob
```

## 8. Declared main state

Permanent Release committed owner-declared main state as:

```text
9bae8039ec5cc41243b55c57f171b6b8dfb2885c
state(simcore): declare simcore-v0.70.10-new-01 live pending
```

`product-manifest.json` now records:

```text
production_version = 0.70.10
release_name = Host-Local Telemetry Set Cost Attribution
release_commit = ecc55f026315c6482c34d267aba2adb97527cdbc
release_blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
validation_status = PENDING_REAL_LONG_CHAT
current_priority = 07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
```

The release record `products/simcore/releases/records/simcore-v0.70.10-new-01.json` independently records:

```text
publisherRunId = 34005188161
releaseState = LIVE_PENDING
productionTruth = PUBLISHED_IDENTITY_VERIFIED
stateSyncStatus = PASS
liveGate.required = true
liveGate.result = PENDING
openAnomalyIds = []
```

The machine-managed `CURRENT_DEVELOPMENT.md` production/live blocks were also synchronized to v0.70.10 and `REAL_RELEASE_LIVE_PENDING` by the same state declaration transaction.

## 9. Publication disposition

```text
IMPLEMENTATION = QUALIFIED / MERGED
CANDIDATE = PASS / IMMUTABLE
EXACT APPROVAL = PASS
PRODUCTION PUBLICATION = PASS
PRODUCTION READBACK = PASS
MAIN DECLARED STATE = PASS
LIVE REAL LONG-CHAT = PENDING HUMAN EVIDENCE
```

No live PASS is claimed by this document.

## 10. Next gate

The only release gate remaining is the real long-chat scenario:

```text
07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
```

Human evidence should verify the new telemetry cost line in real OUTPUT_COMMIT conditions while also checking behavior, state/identity, performance, and the absence of side-effect regressions. Any anomaly discovered in that live run must be recorded immediately and classified WATCH / DEFER / FIX / BLOCKER before closure.
