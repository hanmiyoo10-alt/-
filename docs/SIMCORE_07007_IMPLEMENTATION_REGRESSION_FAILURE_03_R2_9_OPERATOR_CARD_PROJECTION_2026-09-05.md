# SimCore v0.70.7 Implementation Regression Failure 03 — R2.9 Operator Release Card Projection

Date: 2026-09-05 KST
Status: **PRESERVED · FIX / BLOCKER · RELEASE VALIDATION PROFILE · NON-RUNTIME · PRODUCTION UNCHANGED**

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
FIX / BLOCKER / RELEASE VALIDATION PROFILE / NON_RUNTIME / PRODUCTION UNCHANGED
```

This failure is not emitted by `builder-v07007`. The v0.70.7 builder/regression advanced beyond the two previously preserved source-anchor failures. The failing suite is the release-system validation projection suite, but the root cause is the new v0.70.7 profile supplied by this implementation transaction.

The trusted predecessor verifier also ran `MAIN_HEALTH` against the same deployed production before the proposed verifier and passed. Therefore current production health is not contradicted by this failure.

No candidate was materialized, no exact approval occurred, and `release-simcore` was not mutated.

## 3. Root cause resolved

Direct profile comparison established the exact mismatch.

Known-good deployed predecessor profile `0.70.6.json` declares:

```json
"operator-release-card": {
  "mode": "CURRENT_IDENTITY_INHERIT_BEHAVIOR",
  "authorityVersion": "0.69.2",
  "authorityIdentity": {
    "releaseName": "MamsHolic Exact Brand Alias Repair"
  }
}
```

The new v0.70.7 profile incorrectly declared:

```json
"operator-release-card": {
  "mode": "CURRENT_IDENTITY_INHERIT_BEHAVIOR",
  "authorityVersion": "0.70.0",
  "authorityIdentity": {
    "releaseName": "Current Task Primacy Guard"
  }
}
```

R2.9's explicit behavior-authority registry correctly contains only the frozen inherited operator-card behavior authority `0.69.2`. Therefore the verifier correctly failed closed when the new profile asked it to execute nonexistent explicit behavior authority `0.70.0`.

The error text naming `0.70.0` was therefore exact evidence of the malformed v0.70.7 profile, not evidence of a stale R2.9 manual identity census or an R2.11 inventory defect.

## 4. R2.11 boundary

v0.70.7 intentionally relies on the already-closed R2.11 profile-driven validation inventory path. The implementation transaction did **not** manually add `0.70.7` to the historical R2.9 identity census, and this remains correct.

The failure proves that R2.11 successfully discovered the new `0.70.7.json` profile and routed it into active projected-contract validation. The profile's invalid inherited behavior authority was then rejected by the existing explicit R2.9 authority registry.

Therefore:

```text
R2.11 PROFILE DISCOVERY = WORKING
R2.9 EXPLICIT AUTHORITY FAIL-CLOSED = WORKING
V0.70.7 PROFILE CONTENT = INCORRECT
```

No release-system code change is justified by this failure.

## 5. Separation rule and repair boundary

Repository policy forbids mixing a runtime feature change with a release/deployment-system repair in the same implementation transaction.

No release/deployment-system repair is required here. The only authorized correction is the version-specific `0.70.7.json` validation profile already owned by PR `#1530`.

Safe repair:

1. keep `CURRENT_IDENTITY_INHERIT_BEHAVIOR` unchanged;
2. restore `operator-release-card.authorityVersion` to `0.69.2`;
3. restore `authorityIdentity.releaseName` to `MamsHolic Exact Brand Alias Repair`;
4. preserve v0.70.7 Host-local exact-current authority and predecessor rejection;
5. make zero changes to R2.9 suite code, R2.11 inventory code, workflows, schemas, runtime storage semantics, builder semantics, or production;
6. rerun permanent CI from a fresh exact head.

This is a validation-profile correction within the v0.70.7 implementation transaction, not a release-system restructuring transaction.

## 6. Production exposure

At failure capture and root-cause resolution, production remains exactly:

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
V0.70.7 IMPLEMENTATION PR = BLOCKED UNTIL FRESH CI PASS
NEXT = CORRECT ONLY 0.70.7 OPERATOR-CARD INHERITED AUTHORITY AND RERUN CI
```
