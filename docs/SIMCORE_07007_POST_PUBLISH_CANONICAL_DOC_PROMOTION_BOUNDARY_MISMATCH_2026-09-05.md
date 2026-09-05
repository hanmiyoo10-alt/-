# SimCore v0.70.7 Post-Publish Canonical Documentation Promotion Boundary Mismatch

Date: 2026-09-05
Status: FIX-ELIGIBLE · NON-RUNTIME · CURRENT LIVE GATE NON-BLOCKING

## Classification

```text
FIX-ELIGIBLE · CANONICAL_DOC_PROMOTION_SIMCORE_RELEASE_CHANNEL_BOUNDARY_MISMATCH · NON_RUNTIME
PRODUCTION EXPOSURE = NONE OBSERVED
CURRENT v0.70.7 HUMAN LIVE GATE BLOCKER = NO
IMPLEMENTATION AUTHORIZATION = NOT GRANTED BY THIS RECORD
```

## Context

SimCore v0.70.7 `Output Snapshot Set Cost Attribution` was successfully published through the release authority transaction for `simcore-v0.70.7-new-02`.

Production authority after publication:

```text
release-simcore HEAD = 434df54760bc997b1bcd9223eeaff428aeee66d3
previous production = e2552d7f93456652c94d9df37b0c253f12f2d900
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
release state = LIVE_PENDING
production truth = PUBLISHED_IDENTITY_VERIFIED
live scenario = 07007_OUTPUT_SNAPSHOT_SET_COST_ATTRIBUTION_REAL_LONG_CHAT
```

The publication transaction itself is not implicated by this record.

## Observed anomaly

After publication, Canonical Main Documentation Promotion run `33967880886` generated a documentation candidate and invoked SimCore candidate validation against it.

The first observed generated candidate was:

```text
automation/canonical-main-docs = 3c3f79282f204a0bdea77d7a7a155fb12e236d3e
child SimCore CI = 33967911030
profile = CANDIDATE_SHADOW
result = INFRA_ERROR
```

The exact bounded report included:

```text
ARCH_CONTRACT_FAIL
HARNESS_ERROR
STATE_CHECK_BLOCKED
LEGACY_COMPAT_SEMANTIC_FAIL
```

The most direct regression diagnostic was:

```text
FROZEN_SURFACE_MISSING: REPRESENTATION_FAST_RECONCILED
```

The same generated documentation branch later advanced to:

```text
automation/canonical-main-docs = 7e9396b976d5a7239bbe3f6f321d02f773469161
```

A fresh SimCore CI run against that current head also failed:

```text
run = 33968290349
workflow = SimCore CI
head = 7e9396b976d5a7239bbe3f6f321d02f773469161
result = failure
```

Therefore this is not classified as a one-shot race on the original generated candidate.

## Release-channel boundary finding

Direct readback of `plugins/simcore/latest.js` from `automation/canonical-main-docs` shows the main-side release-channel-split copy at version `0.63.2`.

That copy explicitly points update delivery to `release-simcore`, while the actual deployed runtime authority is currently v0.70.7 on `release-simcore`.

This creates a validation-boundary mismatch when a canonical documentation candidate derived from main is dispatched as `CANDIDATE_SHADOW` and its main-side SimCore plugin bytes are treated as though they were a current runtime candidate.

In other words, two individually valid authority rules collide:

```text
main = design / evidence / roadmap / administration authority
release-simcore = deployed SimCore runtime byte authority
```

but the documentation promotion candidate validation path currently projects the main-side historical release-channel copy into a runtime-candidate validation role.

## Why this does not block v0.70.7 live validation

The observed failure occurs on the canonical documentation promotion candidate, not on the release candidate or production branch.

The v0.70.7 publication chain already established:

```text
Exact Approval Activation = 33967824612 · SUCCESS
Permanent Release = 33967837633 · SUCCESS
release-simcore HEAD = 434df54760bc997b1bcd9223eeaff428aeee66d3
release state = LIVE_PENDING
production truth = PUBLISHED_IDENTITY_VERIFIED
state sync = PASS
```

No production rollback, byte divergence, or runtime correctness regression was observed from the documentation promotion failure.

Therefore:

```text
BLOCKER TO CURRENT v0.70.7 HUMAN LIVE GATE = NO
```

## Repair direction, not authorization

A future bounded control-plane repair should make canonical docs candidate validation respect the release-channel split instead of pretending the main-side historical plugin copy is the deployed runtime candidate.

Acceptable design directions include one of the following, subject to a separate design/impact review:

1. Docs-only canonical promotion validates repository/documentation surfaces without projecting `plugins/simcore/*` as a runtime candidate when those paths are unchanged.
2. If SimCore runtime validation is required for a docs promotion, resolve runtime bytes from `release-simcore` as the production authority while validating only the candidate's actual changed scope.
3. Establish an explicit release-channel-aware validation profile for canonical documentation candidates.

The repair must preserve fail-closed behavior for genuine SimCore runtime candidates and must not weaken frozen-surface, architecture, state, legacy-compat, or `latest.js == install.js` checks.

This record does not authorize implementation and must not be mixed into the v0.70.7 runtime LIVE_PENDING transaction.

## Disposition

```text
v0.70.7 runtime publication = KEEP
v0.70.7 human real-long-chat validation = CONTINUE
canonical docs promotion boundary mismatch = FIX-ELIGIBLE / DEFER TO SEPARATE CONTROL-PLANE TRANSACTION
production exposure = NONE OBSERVED
```

The anomaly is preserved before advancing the human live gate, in accordance with SimCore's repository evidence rule.
