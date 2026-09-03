# SimCore v0.70.3 Exact Approval Transaction Blocker

Date: 2026-09-03 KST

Status: **BLOCKER OBSERVED · PRODUCTION UNCHANGED · APPEND-ONLY RECOVERY REQUIRED**

Classification: **BLOCKER · EXACT_APPROVAL_TRANSACTION_SPLIT · ACTIVATION_CONTRACT_MISMATCH · NON_RUNTIME**

## 1. Incident

The first v0.70.3 release transaction used:

```text
intentId = simcore-v0.70.3-intent-12
releaseId = simcore-v0.70.3-new-12
candidateCommit = d37b9b4f03b0dee64d7fbcc1c6be6a62ea189e3f
candidateReleaseBlob = 068df0d6b792b2878c0c745949e0b9d38fc667fa
expectedProductionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

Candidate receipt qualification passed with production mutation `NONE`.

Exact approval PR `#1424` then merged only:

```text
products/simcore/releases/approvals/simcore-v0.70.3-new-12.json
```

Its title was:

```text
release(simcore): exact approve v0.70.3 S7 candidate
```

The active `SimCore Exact Approval Activation` contract requires the merged exact-approval transaction itself to:

1. change exactly two files;
2. contain the matching approval JSON and machine-derived spec JSON;
3. first-touch both immutable paths on that exact merge;
4. use the exact title `SimCore exact release approval: simcore-v0.70.3-new-12`.

Activation run `33759536412` failed in job `100662121066`, step `Resolve exact delegated approval transaction`, at the changed-file-count gate before any Permanent Release dispatch.

The matching spec was later merged separately by PR `#1425`. That separate merge cannot retroactively satisfy the first-touch exact-transaction invariant.

## 2. Legacy-shaped activation restage

A later activation JSON restage was merged as PR `#1429` after recording the stale-base WATCH for older PR `#1426`.

That restage is non-runtime and harmless, but fresh inspection of current main authority established that activation JSON is no longer an active publication trigger. The current workflow watches merged approval paths and resolves the exact approval + spec transaction instead.

Therefore PR `#1429` does not constitute a Permanent Release activation under the current authority model.

## 3. Safety result

```text
Permanent Release dispatch  SKIPPED for malformed new-12 approval transaction
release-simcore mutation    NONE
candidate mutation          NONE
production version          remains v0.70.1
runtime defect              NONE ESTABLISHED
```

The active release guard behaved correctly and prevented a malformed administrative transaction from reaching publication authority.

```text
V07003_EXACT_APPROVAL_TRANSACTION_SHAPE = BLOCKER / FIX
ACTIVATION_GUARD_FAIL_CLOSED            = PASS
PRODUCT_RUNTIME                         = UNCHANGED CANDIDATE AUTHORITY
```

## 4. Recovery rule

The malformed `simcore-v0.70.3-new-12` transaction is durable evidence and must not be rewritten, reused, force-published, or repaired in place.

Recovery is append-only and follows the established v0.68.0 exact-approval recovery pattern:

1. create fresh candidate request `simcore-v0.70.3-intent-13` with release id `simcore-v0.70.3-new-13`;
2. rebuild and reverify the same authorized S7 v0.70.3 runtime target from unchanged production parent `861100f4771967aa5b8ab8811d06f11702c0d3ff`;
3. persist a fresh candidate receipt and machine-derived spec shadow;
4. create one exact-approval PR whose title is exactly `SimCore exact release approval: simcore-v0.70.3-new-13`;
5. that PR must add exactly the matching approval JSON and machine-derived spec JSON together;
6. merge only after permanent SimCore Verify and Required pass;
7. allow only the existing `RS2_4_PERMANENT` authority to publish;
8. verify `release-simcore`, `latest.js == install.js`, and durable `LIVE_PENDING` after publication;
9. keep the S7 real-long-chat `HUMAN_EVIDENCE` gate pending until explicit live evidence is supplied.

## 5. Scope boundary

This recovery authorizes no runtime redesign and no release-system refactor.

The following remain unchanged:

```text
targetVersion = 0.70.3
releaseName = Post-M2 Simplification Convergence
builder = products/simcore/tooling/build-s7-post-m2-simplification-convergence.py
changeClass = RUNTIME_CORRECTION
primaryGoalId = S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE
liveGate = S7_CUMULATIVE_SIMPLIFICATION_REAL_LONG_CHAT / HUMAN_EVIDENCE
publication authority = RS2_4_PERMANENT
```

The current operator instruction to update v0.70.3 authorizes this append-only administrative recovery of the already-authorized runtime target. It does not authorize inference of HUMAN LIVE_PASS.
