# SimCore v0.70.8 Canonical Documentation Promotion Shadow Source Authority Failure

Date: 2026-09-06
Status: FIX · NON-RUNTIME · CURRENT LIVE GATE NON-BLOCKING

## Classification

```text
FIX · RECURRING_CANONICAL_DOC_PROMOTION_SIMCORE_RELEASE_CHANNEL_BOUNDARY_MISMATCH · NON_RUNTIME
OWNER = REPOSITORY / CANONICAL DOCUMENTATION CONTROL PLANE
PRODUCTION EXPOSURE = NONE OBSERVED
PRODUCTION MUTATION = NONE
CURRENT v0.70.8 HUMAN LIVE GATE BLOCKER = NO
IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS RECORD
```

## Executive finding

The v0.70.8 canonical-main documentation promotion failed because its SimCore `CANDIDATE_SHADOW` child validation treated the generated documentation branch's historical main-side `plugins/simcore/latest.js` / `install.js` copy as a runtime candidate.

That generated branch carried SimCore `0.63.2`, while deployed runtime byte authority belongs to `release-simcore` and the actual v0.70.8 production source is `0.70.8`.

The exact failing regression assertion was:

```text
FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
```

The assertion is truthful for the historical main-side 0.63.2 source selected by the docs candidate job, but it is not evidence against the v0.70.8 release candidate or deployed v0.70.8 production bytes.

This is the same authority-boundary family already observed during the v0.70.7 cycle. Recurrence during v0.70.8 promotes the disposition from `FIX-ELIGIBLE` to `FIX` for a future separate repository/control-plane transaction.

## v0.70.8 release authority remains valid

Successful runtime publication authority:

```text
release = SimCore v0.70.8 Repeat-Send Representation Rewind Guard
release transaction = simcore-v0.70.8-new-02
production commit = 01010564649a033e02a0658a167f5f38a6a23632
production parent = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
Exact Approval Activation = 33978039892 · SUCCESS
Permanent Release = 33978046850 · SUCCESS
validation = PENDING_REAL_LONG_CHAT
lifecycle = REAL_RELEASE_LIVE_PENDING
live gate = 07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_REAL_LONG_CHAT
```

Publication evidence was separately merged through PR #1582.

This record does not modify or supersede that runtime authority.

## Parent canonical documentation promotion failure

Parent workflow:

```text
run = 33978048988
job = promote
job id = 101338131931
result = FAILURE
```

Relevant steps:

```text
Render stable durable documentation = SUCCESS
Publish generated branch or hand off PR creation = SUCCESS
Dispatch exact documentation candidate checks = SUCCESS
Wait for exact candidate checks = FAILURE
Exact-base / exact-head merge = SKIPPED
```

The generated documentation candidate was:

```text
branch = automation/canonical-main-docs
head = afc37d42ee6566e6121e364822afe8d15bca7089
existing generated docs PR = #671
```

Generated documentation changes were limited to canonical repository documentation surfaces, including:

```text
docs/REPO_CHANGELOG.md
docs/REPO_ARCHITECTURE_SNAPSHOT.md
```

The parent workflow then dispatched two child validations.

## Child validation split

Plugin Control Plane child:

```text
run = 33978063742
result = SUCCESS
```

SimCore child:

```text
run = 33978064897
profile = CANDIDATE_SHADOW
candidate commit = afc37d42ee6566e6121e364822afe8d15bca7089
candidate fetch ref = refs/heads/automation/canonical-main-docs
Verify job = 101338177552 · FAILURE
Required job = 101338215641 · FAILURE
result = FAILURE
```

The parent promotion failed closed because the exact SimCore child did not pass. The generated docs candidate was therefore not merged by that promotion transaction.

## Exact bounded SimCore CI report

The child bounded report concluded:

```text
profile = CANDIDATE_SHADOW
conclusion = INFRA_ERROR
verifierCommit = afc37d42ee6566e6121e364822afe8d15bca7089
productionCommit = 434df54760bc997b1bcd9223eeaff428aeee66d3
candidateCommit = afc37d42ee6566e6121e364822afe8d15bca7089
scopeLabels = FULL_BASELINE
```

Reason codes:

```text
ARCH_CONTRACT_FAIL
HARNESS_ERROR
LEGACY_COMPAT_SEMANTIC_FAIL
```

Gate projection:

```text
GATE_STATIC = PASS
GATE_ARCH = FAIL · ARCH_CONTRACT_FAIL
GATE_REGRESSION = INFRA_ERROR · HARNESS_ERROR
GATE_STATE = PASS
GATE_COORDINATION = PASS
GATE_LEGACY_COMPAT = FAIL · LEGACY_COMPAT_SEMANTIC_FAIL
```

The exact regression stderr was:

```text
FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
```

This exact assertion is the previously missing diagnostic detail that this record durably preserves.

## Candidate source selection proof

The child `CANDIDATE_SHADOW` job materialized its runtime source from the candidate commit itself:

```text
git show "$CANDIDATE:plugins/simcore/latest.js" > .simcore-ci/candidate-latest.js
git show "$CANDIDATE:plugins/simcore/install.js" > .simcore-ci/candidate-install.js
```

with:

```text
CANDIDATE = afc37d42ee6566e6121e364822afe8d15bca7089
FETCH_REF = refs/heads/automation/canonical-main-docs
```

The selected source under test was therefore:

```text
.simcore-ci/candidate-latest.js
.simcore-ci/candidate-install.js
```

This means the docs promotion validation did not validate the v0.70.8 immutable release candidate. It validated whatever SimCore plugin bytes happened to live on the generated main-derived documentation branch.

## Direct source identity proof

Direct readback of `plugins/simcore/latest.js` at the generated documentation candidate commit `afc37d42ee6566e6121e364822afe8d15bca7089` shows:

```text
//@version 0.63.2
release-channel split main-side historical copy
REPRESENTATION_FAST_RECONCILED matches = 0
```

Direct readback of actual v0.70.8 production commit `01010564649a033e02a0658a167f5f38a6a23632` shows:

```text
//@version 0.70.8
release = Repeat-Send Representation Rewind Guard
REPRESENTATION_FAST_RECONCILED present
```

The v0.70.8 header explicitly states that the proven repeat-send rewind routes through `REPRESENTATION_FAST_RECONCILED` with snapshot `UNCHANGED`.

Therefore the frozen-surface assertion discriminates the two source identities exactly as expected:

```text
canonical docs shadow source 0.63.2 -> marker missing -> FAIL
actual v0.70.8 runtime source      -> marker present
```

## Timing nuance

The failed child SimCore run began while the successful v0.70.8 Permanent Release was still converging.

At that moment its independently materialized production authority was still:

```text
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
```

which was v0.70.7 production.

This does not change the root finding. The invalid role assignment is the generated documentation branch being supplied as a SimCore runtime `CANDIDATE_SHADOW`, despite main not being runtime byte authority.

Later the ordinary release transaction moved `release-simcore` to v0.70.8 and completed successfully.

## Recurrence from v0.70.7

A prior v0.70.7 evidence branch preserved the same family:

```text
branch = docs/simcore-v07007-canonical-doc-promotion-boundary-watch-20260905
commit = 7eca7e3a5975f96257e6090ca59c0fd7504a5aae
document = docs/SIMCORE_07007_POST_PUBLISH_CANONICAL_DOC_PROMOTION_BOUNDARY_MISMATCH_2026-09-05.md
prior disposition = FIX-ELIGIBLE · NON-RUNTIME · LIVE GATE NON-BLOCKING
```

That evidence also identified:

```text
canonical docs branch plugin source = 0.63.2
child profile = CANDIDATE_SHADOW
FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
```

The v0.70.8 recurrence establishes that this is not a one-release transient or one-shot timing race.

## Authority interpretation

The intended authority split is:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed SimCore runtime byte authority
```

The canonical-doc promotion path currently crosses those authorities incorrectly when it supplies a main-derived docs candidate as though it were a current SimCore runtime candidate.

The CI is correctly fail-closed once given that source. The defect is upstream source-role selection, not the frozen-surface assertion itself.

Therefore the repair must not weaken:

```text
frozen-surface checks
architecture checks
state checks
legacy compatibility checks
latest.js == install.js enforcement
genuine runtime candidate fail-closed behavior
```

## Runtime impact assessment

```text
v0.70.8 release candidate correctness impact = NONE OBSERVED
v0.70.8 production byte mutation from docs promotion = NONE
release-simcore rollback = NONE
latest/install divergence = NONE OBSERVED
current HUMAN live gate blocker = NO
```

The failed docs promotion is a repository/control-plane concern and must remain isolated from the v0.70.8 runtime LIVE_PENDING transaction.

## Repair direction, explicitly separate

A future dedicated repository/control-plane transaction should make canonical documentation promotion release-channel-aware.

Bounded acceptable directions remain:

1. For docs-only canonical promotion, validate the actual changed repository/documentation scope without projecting unchanged `plugins/simcore/*` from main as a runtime candidate.
2. If current runtime validation is required, resolve SimCore runtime bytes from `release-simcore`, while independently validating the generated documentation candidate's actual changed scope.
3. Introduce an explicit release-channel-aware validation route/profile whose source authority contract cannot confuse main with runtime byte authority.

The repair should also include a regression that proves a generated docs branch carrying the intentionally historical main-side plugin copy cannot be selected as current runtime candidate bytes.

This evidence record does not authorize or implement that repair.

## Disposition

```text
v0.70.8 runtime publication = KEEP
v0.70.8 HUMAN real-long-chat validation = CONTINUE
canonical docs promotion recurrence = FIX
implementation = DEFER TO SEPARATE CONTROL-PLANE TRANSACTION
production exposure = NONE OBSERVED
```

No runtime file, release workflow, approval record, release state, product manifest, or `release-simcore` byte is changed by this evidence transaction.
