# SimCore S1-1 Candidate PR Failure 01 — Validation Profile Bridge

Date: 2026-08-31 KST
Classification: **FIX · VALIDATION_PROFILE_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **OBSERVED · ROOT CAUSE PROVEN · BOUNDED REPAIR APPLIED ON IMPLEMENTATION BRANCH**

## Observation

Implementation PR:

```text
PR = #1011
head = 1a17b0540fcd2a2381d7f520ac933269ad8fe641
SimCore CI run = 33326983374
Verify job = 99298759580
profile = PR_MAIN
conclusion = FAIL
reason = PR1_DRY_QUALIFICATION_FAIL
```

Exact candidate dry-run failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity:
no exact validation profile for source version 0.70.3
```

Bounded gate result:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
production = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidate persistence = NONE
production mutation = NONE
```

## Root cause

R2.10 validation context requires an exact per-source release profile at:

```text
products/simcore/releases/validation-profiles/<sourceVersion>.json
```

Existing main contained exact profiles for `0.70.0` and `0.70.1` only. The S1-1 builder correctly produced candidate metadata `0.70.3`, so the validation context failed closed before contract execution.

This is not a runtime hash-equivalence failure and not an architecture failure.

## Bounded repair

Add exact profile:

`products/simcore/releases/validation-profiles/0.70.3.json`

Contract posture inherits unchanged behavior from the current/frozen authorities:

```text
reload-cache-continuity
  INHERIT_BEHAVIOR from 0.69.2

operator-release-card
  CURRENT_IDENTITY_INHERIT_BEHAVIOR from 0.69.2

host-local-telemetry
  EXACT_CURRENT_IDENTITY at 0.70.3
  reject prior actual production identity 0.70.1

bounded-telemetry-capsule
  INHERIT_BEHAVIOR from 0.69.2
```

S1-1 does not change any of these four semantic contracts. The profile only binds the new exact runtime identity to already-authoritative validation behavior.

## Frozen boundary

```text
release-simcore = unchanged
runtime builder delta = unchanged
candidate request target = unchanged 0.70.3
v0.70.2 parked identity = unchanged
validation-context code = unchanged
release workflows = unchanged
test fixtures = unchanged
```

## Disposition

```text
S1_1_PR1011_HEAD1 = FAIL_CLOSED
CLASSIFICATION = FIX
ROOT_CAUSE = MISSING_EXACT_VALIDATION_PROFILE
RUNTIME_IMPLEMENTATION = UNCHANGED
REPAIR = ADD 0.70.3 PROFILE ONLY
PRODUCTION = STILL v0.70.1
```
