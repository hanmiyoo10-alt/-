# SimCore v0.70.8 Publication Evidence

Date: 2026-09-06 KST
Status: **PRODUCTION PUBLISHED · REAL LONG-CHAT PENDING**
Release: **v0.70.8 Repeat-Send Representation Rewind Guard**
Release transaction: `simcore-v0.70.8-new-02`
Primary goal: `07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD`
Tracking runtime repair: `#1544`

## 1. Publication disposition

```text
IMPLEMENTATION = QUALIFIED
EXACT APPROVAL = SUCCESS
PERMANENT RELEASE = SUCCESS
release-simcore = v0.70.8
latest.js == install.js = VERIFIED
DECLARED VALIDATION = PENDING_REAL_LONG_CHAT
R LIFECYCLE = REAL_RELEASE_LIVE_PENDING
HUMAN CLOSE AUTHORITY = REQUIRED
```

This document records publication only. It does not claim `LIVE_PASS`, does not close `#1544`, and does not substitute deterministic regression evidence for the required real long-chat three-lens review.

## 2. Qualified implementation authority

Implementation authorization was merged separately before runtime work.

```text
Implementation authorization PR = #1575
Authorization merge = de57b5423f955a46f216a72b17244be0f04d6a77
```

The dedicated runtime implementation transaction was PR #1576.

```text
Implementation final head = 55de01d2158964b5958dfcf3930926a2d409c8af
Implementation CI = 33976825324
Verify = SUCCESS
Required = SUCCESS
Implementation merge = efb1084d4cc6131480481e4dd74567d7bfcb75d5
```

The implementation preserved the existing same-slot Fresh carryover authority and added only the frozen bounded repeat-send rewind authority, explicit `sendIndex` handoff, diagnostic provenance, exact validation profile, builder closure and direct-owner executable regression.

Two implementation-only fail-closed incidents were preserved before repair:

```text
FAILURE_01 = diagnostic marker cardinality / release-note literal collision
FAILURE_02 = direct-owner test harness return-contract assumption
```

Both were non-runtime harness/builder failures. Runtime semantics were not weakened to satisfy the tests.

## 3. Failed first publication attempt preserved

The first candidate transaction was:

```text
intent = simcore-v0.70.8-intent-01
release = simcore-v0.70.8-new-01
candidate commit = 361abf233a51682c1ac64fb785cfd01719477253
candidate blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
production parent = 434df54760bc997b1bcd9223eeaff428aeee66d3
```

Candidate request PR #1577 and materialization run `33977029122` passed without production mutation.

The first exact approval PR #1578 was malformed for the frozen activation boundary because it contained only the approval path and did not use the exact delegated-approval PR title.

```text
Approval merge = 9a724af849c685520790d8e07ecd23bfe907eae0
Exact Approval Activation run = 33977369697 · FAILURE
Permanent Release dispatch = NOT STARTED
Production mutation = NONE
```

Classification is preserved in:

`docs/SIMCORE_07008_EXACT_APPROVAL_FAILURE_01_TRANSACTION_SHAPE_2026-09-06.md`

```text
BLOCKER · RELEASE_ACTIVATION_TRANSACTION_SHAPE · NON_RUNTIME
PRODUCTION MUTATION = NONE
```

The failed `new-01` identity was not rewritten or repaired in place.

## 4. Fresh recovery candidate transaction

Recovery used a fresh append-only identity:

```text
intent = simcore-v0.70.8-intent-02
release = simcore-v0.70.8-new-02
expected production = 434df54760bc997b1bcd9223eeaff428aeee66d3
```

Candidate request PR #1580:

```text
request head = b68ae6047aa7cbc365f1b8582dc8430ee34d79bb
CI = 33977735165
Verify = SUCCESS
Required = SUCCESS
merge = beccfdb47740b4839732845c8577b379776ad361
```

Generic Candidate Materialize:

```text
run = 33977807189
candidate disposition = CREATED
candidate commit = 01010564649a033e02a0658a167f5f38a6a23632
candidate release blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
candidate fetch ref = candidate/simcore/simcore-v0.70.8-intent-02
production parent = 434df54760bc997b1bcd9223eeaff428aeee66d3
result = PASS
production mutation = NONE
```

Machine-known candidate truth was durably written to main at:

```text
345a2652ef87b1b4c4d4311c0260f7ffe1d5e850
state(simcore): record candidate simcore-v0.70.8-intent-02
```

The durable receipt is:

`products/simcore/releases/candidate-receipts/simcore-v0.70.8-intent-02.json`

The machine-derived spec shadow is:

`products/simcore/releases/spec-shadows/simcore-v0.70.8-new-02.json`

## 5. Exact approval recovery

PR #1581 was constructed to satisfy the actual frozen activation boundary exactly.

Exact title:

```text
SimCore exact release approval: simcore-v0.70.8-new-02
```

Its first-parent merge delta contained exactly two paths:

```text
products/simcore/releases/specs/simcore-v0.70.8-new-02.json
products/simcore/releases/approvals/simcore-v0.70.8-new-02.json
```

The spec was copied exactly from the machine-derived `derivedSpec` in the shadow. The approval bound only the fresh `intent-02` candidate receipt.

```text
spec commit = 34417dda5eb3436acc3f9ebb9df6eb31ff350a5d
approval final head = 80914786d97ebe2b3afb9d008cc8c03c0feaf533
PR CI = 33977974670
Verify = SUCCESS
Required = SUCCESS
approval merge = 28c024497ff6cbdca9fa51c1230e0161ba8e3135
```

## 6. Exact Approval Activation

The activation adapter ran against the exact approved transaction:

```text
SimCore Exact Approval Activation = 33978039892
Resolve exact delegated approval transaction = SUCCESS
Dispatch and observe permanent caller = SUCCESS
Approval Activation Required = SUCCESS
```

This executable boundary proved the recovery transaction satisfied the exact two-file cardinality, one-touch ownership, exact PR title, spec equality and immutable candidate binding requirements.

## 7. Permanent Release

Permanent Release run:

```text
SimCore Permanent Release = 33978046850
Resolve Permanent Authorization = SUCCESS
Candidate Required / Verify = SUCCESS
Candidate Required / Required = SUCCESS
Publish Exact Candidate = SUCCESS
Declare Published State = SUCCESS
Permanent Release Required = SUCCESS
```

The permanent controller's `Publish through permanent controller` step succeeded.

Post-publish state verification also passed:

```text
post-publish SimCore CI = 33978116804
Verify = SUCCESS
Required = SUCCESS
```

## 8. Direct production readback

`release-simcore` now points to:

```text
production commit = 01010564649a033e02a0658a167f5f38a6a23632
message = SimCore v0.70.8 Repeat-Send Representation Rewind Guard
parent = 434df54760bc997b1bcd9223eeaff428aeee66d3
```

Direct production file readback:

```text
plugins/simcore/latest.js blob  = 97fc98c076a1b93026a05697bfa26be87f86d5cc
plugins/simcore/install.js blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
latest.js == install.js         = VERIFIED
```

Direct source identity:

```text
//@version = 0.70.8
SIMCORE_RUNTIME_VERSION = 0.70.8
HOST_COMPAT_VERSION = 0.70.8
```

Therefore release identity is converged across metadata, runtime and Host telemetry compatibility identity.

## 9. Durable main live-pending state

The permanent owner declared the published state at:

```text
main commit = 1d81210f41e1a0170889fd8e041059fa0c6dd73f
message = state(simcore): declare simcore-v0.70.8-new-02 live pending
```

Fresh `docs/CURRENT_DEVELOPMENT.md` machine-managed authority reads:

```text
Version = 0.70.8
Release = Repeat-Send Representation Rewind Guard
Release commit = 01010564649a033e02a0658a167f5f38a6a23632
Release blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
Declared validation status = PENDING_REAL_LONG_CHAT
Release transaction = simcore-v0.70.8-new-02
Current priority = 07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_REAL_LONG_CHAT
R lifecycle = REAL_RELEASE_LIVE_PENDING
```

The machine-managed block is current authority. A separate stale human-authored continuity paragraph remains an administrative documentation-drift item and does not override this machine authority; it must be handled separately from this runtime publication transaction.

## 10. Human live gate now required

The next required action is real long-chat validation under:

`docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`

Minimum Lens 1 controls:

```text
ordinary exact carryover = PASS
clean repeat-send / reroll = PASS
genuine manual edit = PASS
no new snapshot rewrite on healthy controls
no new correctness warning/blocker
```

If a natural target specimen occurs:

```text
prior Representation = OUTPUT_MISMATCH
visible current = exact prior Fresh
operator action = repeat-send / reroll
```

Expected v0.70.8 result:

```text
REPRESENTATION_FAST_RECONCILED
snapshot UNCHANGED
compatibilitySource = fresh-exact-repeat-send-rewind
editOrigin = REPRESENTATION_DRIFT_CORRELATED
```

The deterministic direct-owner fixture remains the primary exact-geometry proof when Host mismatch cannot naturally be reproduced. Natural recurrence must not be fabricated.

Lens 2 must review causal sequences, and Lens 3 must classify every active `raw-lineage-v2` diagnostic element as one of:

```text
PASS / WATCH / DEFER / FIX / BLOCKER / NOT_EXERCISED / NOT_APPLICABLE
```

No blank cells and no silent PASS for unobserved elements.

## 11. Current disposition

```text
V07008_IMPLEMENTATION = QUALIFIED
V07008_PUBLICATION = SUCCESS
V07008_PRODUCTION = 0.70.8
V07008_RELEASE_ID = simcore-v0.70.8-new-02
V07008_VALIDATION = PENDING_REAL_LONG_CHAT
V07008_LIFECYCLE = REAL_RELEASE_LIVE_PENDING
#1544 = NOT YET CLOSED
NEXT AUTHORITY = HUMAN_EVIDENCE
```
