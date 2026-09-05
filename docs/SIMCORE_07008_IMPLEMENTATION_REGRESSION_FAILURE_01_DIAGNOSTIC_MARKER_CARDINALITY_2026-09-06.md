# SimCore v0.70.8 Implementation Regression Failure 01 — Diagnostic Marker Cardinality

Date: 2026-09-06 KST
Status: **PRESERVED · FIX / BLOCKER · IMPLEMENTATION BUILDER MARKER CARDINALITY · NON-RUNTIME · PRODUCTION UNCHANGED**

## 1. Failure identity

Implementation PR:

- PR `#1576`
- head `8ac9eb738b409c4827ab6d2eaa24ff61bae1f279`
- base `de57b5423f955a46f216a72b17244be0f04d6a77`
- SimCore CI run `33976428027`
- Verify job `101333824142`

Bounded gate result:

```text
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reasonCode = PERMANENT_REGRESSION_FAIL
```

Exact stderr:

```text
SUITE_ASSERTION_FAILED: builder-v07008: v0.70.8 builder exit:
07008_BUILD_BLOCK rewind diagnostic provenance cardinality unexpected
: expected=0 actual=1
```

The trusted predecessor MAIN_HEALTH verifier passed against production v0.70.7 before the proposed verifier ran.

## 2. Classification

```text
FIX / BLOCKER / IMPLEMENTATION BUILDER MARKER CARDINALITY / NON_RUNTIME / PRODUCTION UNCHANGED
```

No candidate was materialized, no exact approval occurred, and `release-simcore` was not mutated.

## 3. Root cause

The v0.70.8 builder intentionally requires exactly one runtime compatibility-source marker:

```text
fresh-exact-repeat-send-rewind
```

The transformed source currently contains that literal twice:

1. once in the new release-note prose;
2. once in the actual runtime diagnostic `compatibilitySource` string.

The post-transform builder guard correctly refuses ambiguous cardinality, but the additional occurrence is documentation prose rather than a second runtime owner.

Therefore this failure does not establish a runtime behavior defect. It is a builder-marker false positive caused by release-note prose duplicating the protected exact runtime marker.

## 4. Authorized bounded repair

Do not weaken exact cardinality to `>= 1` and do not remove the runtime marker guard.

Repair only the release-note prose so it no longer contains the exact runtime literal. For example, describe it as a dedicated bounded repeat-send rewind provenance marker while keeping the actual runtime string unchanged.

Expected post-repair invariant:

```text
runtime compatibilitySource literal fresh-exact-repeat-send-rewind = exactly 1
release-note prose exact runtime literal = 0
builder fail-closed cardinality assertion = unchanged
```

No edit is authorized to repeat-send geometry, representation classification, storage semantics, R2.11, release workflows, validation profile semantics, or production.

## 5. Production boundary

At failure capture:

```text
production version = 0.70.7
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
```

Disposition:

```text
PRODUCTION EXPOSURE = NONE
CANDIDATE MATERIALIZATION = NONE
RELEASE-SIMCORE MUTATION = NONE
NEXT = REWORD RELEASE-NOTE PROSE ONLY, PRESERVE EXACT RUNTIME MARKER GUARD, RERUN CI
```
