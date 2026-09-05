# SimCore v0.70.7 Implementation Regression Failure 03 — R2.9 Operator Release Card Projection

Date: 2026-09-05 KST
Status: **PRESERVED · FIX / BLOCKER · RELEASE VALIDATION PROJECTION · NON-RUNTIME · PRODUCTION UNCHANGED**

## 1. Failure identity

Implementation PR:

- PR `#1530`
- head `25dce7840090256d94e40b61c83518e3376786fe`
- base `3d9ff03c849d1f78f20637599fb19fea5ac77970`
- SimCore CI run `33965896591`

Result:

```text
Verify   = FAILURE
Required = FAILURE
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reasonCode = PERMANENT_REGRESSION_FAIL
```

The proposed permanent verifier command itself completed and produced the bounded report. The final gate enforcement failed because the report conclusion was `FAIL`.

Exact bounded regression stderr:

```text
SUITE_ASSERTION_FAILED: release-system-r2-9-validation-contract-projection: operator-release-card authority 0.70.0 is not explicitly registered
```

## 2. Classification

```text
FIX / BLOCKER / RELEASE VALIDATION PROJECTION / NON_RUNTIME / PRODUCTION UNCHANGED
```

This failure is not emitted by `builder-v07007`. The v0.70.7 builder/regression advanced beyond the two previously preserved source-anchor failures. The failing suite is the release-system validation projection suite.

The trusted predecessor verifier also ran `MAIN_HEALTH` against the same deployed production before the proposed verifier and passed. Therefore current production health is not contradicted by this failure.

No candidate was materialized, no exact approval occurred, and `release-simcore` was not mutated.

## 3. R2.11 boundary

v0.70.7 intentionally relies on the already-closed R2.11 profile-driven validation inventory path. The implementation transaction did **not** manually add `0.70.7` to the historical R2.9 identity census because doing so would defeat the first real successor proof of the R2.11 normal path.

The observed error is especially notable because it names:

```text
operator-release-card authority 0.70.0
```

rather than `0.70.7`.

This indicates that the remaining failure must be investigated as a release-validation projection/authority-resolution issue, not patched by widening the v0.70.7 runtime feature.

## 4. Separation rule

Repository policy forbids mixing a runtime feature change with a release/deployment-system repair in the same implementation transaction.

Therefore:

```text
PR #1530 = v0.70.7 runtime observability implementation only
release-validation repair = separate branch / separate PR if a repair is required
```

The implementation PR must remain blocked until the separate validation transaction is resolved and fresh main authority is established.

## 5. Investigation direction

The bounded investigation must determine:

1. how `release-system-r2-9-validation-contract-projection.test.mjs` derives `operator-release-card authority`;
2. why the proposed post-R2.11 inventory path resolves `0.70.0` as needing explicit registration;
3. whether the suite is still carrying a stale manual identity assumption that R2.11 was intended to retire;
4. whether the new `0.70.7.json` profile legitimately activates a previously dormant projection branch;
5. whether the repair can remain entirely within release validation/test projection with zero runtime, builder, release workflow, schema, or production mutation.

Unknown future versions must continue to fail closed unless admitted by the R2.11 profile-driven authority contract.

## 6. Production exposure

At failure capture, production remains exactly:

```text
version = 0.70.6
release = Manual Edit Redundant Prune Elision
release-simcore = e2552d7f93456652c94d9df37b0c253f12f2d900
blob = 83714d78537906fc9f2060c06c9e4ce349568a19
```

Disposition:

```text
PRODUCTION EXPOSURE = NONE
CANDIDATE MATERIALIZATION = NONE
RELEASE-SIMCORE MUTATION = NONE
V0.70.7 IMPLEMENTATION PR = BLOCKED
NEXT = SEPARATE R2.9 / R2.11 VALIDATION-PROJECTION ROOT-CAUSE TRANSACTION
```
