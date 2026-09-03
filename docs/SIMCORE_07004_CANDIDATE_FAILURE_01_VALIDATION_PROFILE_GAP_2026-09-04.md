# SimCore v0.70.4 Candidate Failure 01 — Validation Profile Gap — 2026-09-04

Date: 2026-09-04 KST
Classification: **FIX · RELEASE_VALIDATION_PROFILE_GAP_V07004 · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **PRESERVED · VALIDATION-ONLY REPAIR REQUIRED**

## 1. Failed transaction

Candidate request PR:

```text
PR = #1445
head = cc6612ec62c8d881d4bde05953163dace40351a1
intent = simcore-v0.70.4-intent-01
release = simcore-v0.70.4-new-01
```

CI:

```text
run = 33792095744
Verify job = 100770876825
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
reason = PR1_DRY_QUALIFICATION_FAIL
```

Exact candidate-regression failure:

```text
SUITE_ASSERTION_FAILED: reload-cache-continuity: no exact validation profile for source version 0.70.4
```

## 2. Attribution

The v0.70.4 builder materialized source far enough for candidate regression to inspect the source metadata version. The active R2.9/R2.10 validation path binds each source under test to an exact declarative profile named by that source version.

Current profile inventory at failure time:

```text
0.70.0.json
0.70.1.json
0.70.3.json
```

Therefore v0.70.4 failed closed before its projected release contracts could execute.

This is not evidence of a runtime implementation defect.

## 3. Production disposition

Production authority remains unchanged:

```text
branch = release-simcore
commit = 4c618563f43b8a3ff0eeb18eeff5536bb287369b
version = 0.70.3
```

No candidate was published and no `release-simcore` mutation occurred.

## 4. Repair boundary

Selected repair is validation-only:

1. add exact declarative profile `products/simcore/releases/validation-profiles/0.70.4.json`;
2. preserve inherited validation behavior for unchanged contracts;
3. bind Host-local telemetry to exact current identity 0.70.4 and explicitly reject predecessor 0.70.3;
4. extend the permanent validation-projection regression so a projected 0.70.4 source loads the exact profile and passes all active contracts;
5. add builder-v07004 discovery assertion.

Forbidden in this repair:

```text
runtime mutation
builder semantic mutation
release-simcore mutation
release-system architecture refactor
profile fallback / latest alias
weakening exact source-profile binding
```

## 5. Verdict

```text
V07004_RUNTIME_IMPLEMENTATION = STILL PASS
CANDIDATE_REQUEST = FAIL-CLOSED
ROOT CAUSE = MISSING EXACT 0.70.4 VALIDATION PROFILE
REPAIR CLASS = NON_RUNTIME VALIDATION EXTENSION
PRODUCTION = UNCHANGED
```
