# SimCore v0.70.1 Candidate Request Failure 01: Change-Class Enum

Date: 2026-08-30 KST
Status: **FIXED IN REQUEST BRANCH · NON_RUNTIME · PRODUCTION UNCHANGED**
Classification: **FIX · CANDIDATE_REQUEST_CHANGE_CLASS_ENUM · NON_RUNTIME · PRODUCTION_UNCHANGED**

## Failed transaction

PR: `#949 release(simcore): request v0.70.1 candidate`

Failed head:
`5eaf7733d5dfc26abe3ee403dcc19b16818d57ef`

SimCore CI:
- run `33296556716`
- Verify job `99217117074` = FAILURE
- Required job `99217157709` = FAILURE

Bounded verifier report:

```text
GATE_CI_SELF   = PASS
GATE_PR1_DRY   = FAIL
GATE_STATIC    = PASS
GATE_ARCH      = PASS
GATE_REGRESSION = PASS
reasonCode = PR1_DRY_QUALIFICATION_FAIL
first exact failure = CANDIDATE_REQUEST_CHANGE_CLASS_INVALID
```

The proposed permanent verifier completed its static, architecture, and regression gates successfully. The failure was isolated to candidate-request vocabulary validation.

## Root cause

The request used:

```json
"changeClass": "RUNTIME_OBSERVABILITY"
```

That value is not part of the canonical release-spec enum.

Canonical schema authority:
`products/simcore/releases/release-schema-v1.json`

Allowed active runtime values are:

```text
RUNTIME_FEATURE
RUNTIME_CORRECTION
```

The v0.70.1 release is a NEW_VERSION that adds bounded observability/attribution behavior without repairing an established runtime correctness defect. Therefore its canonical release class is:

```text
RUNTIME_FEATURE
```

## Repair

Only the unmerged candidate request is corrected:

```text
RUNTIME_OBSERVABILITY -> RUNTIME_FEATURE
```

No builder, runtime source, test semantics, release schema, R2.x control plane, or production branch is changed by this repair.

The same immutable intent remains:

```text
intentId = simcore-v0.70.1-intent-01
releaseId = simcore-v0.70.1-new-01
expectedProductionCommit = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
```

## Production safety

At failure time and throughout the repair:

```text
release-simcore version = 0.70.0
release-simcore commit  = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
production blob         = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
latest.js == install.js = YES
candidate materialized  = NO
production mutation     = NONE
```

## Disposition

```text
FIX · CANDIDATE_REQUEST_CHANGE_CLASS_ENUM · NON_RUNTIME · PRODUCTION_UNCHANGED
```

Requalify the corrected request through the same permanent PR gate. Do not alter the release-system enum or runtime implementation to accommodate the invalid vocabulary.
