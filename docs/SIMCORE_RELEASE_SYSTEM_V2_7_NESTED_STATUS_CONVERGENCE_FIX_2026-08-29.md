# SimCore R2.7 Nested Status Convergence Fix

Date: 2026-08-29 KST

Classification: **FIX · DOCUMENTARY_CONVERGENCE · NON_RUNTIME**

## Observation

R2.7 durable status projection operationally succeeded on the first eligible genuine release proof:

```text
implementation merge     064764b34e6c995ec15f2f84869147ad9c1e4588
bootstrap workflow       SimCore R2.7 Durable Status Projection
bootstrap run            33259213469
bootstrap job            99118144989
eligible release         simcore-v0.68.0-new-02
publisher run            33255998343
proof verifier           88b932f8ecfc89df4be53a4a92d61cfa11d9e0e3
status landing commit    36e825a34ceb7f744343cd0756ea1f201b8e3170
result                    PASS
```

The top-level living authority correctly converged to:

```text
status                  OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE
activationAuthorized    true
activationGate          CONSUMED_BY_FIRST_GENUINE_R2_7_RELEASE
operationallyProven     true
```

However the nested implementation component retained the predecessor snapshot:

```text
implementation.durableProjection.status
= IMPLEMENTED_PERMANENT_CI_QUALIFIED_ACTIVATION_PENDING
```

That nested value is stale after successful first-use consumption.

## Classification

```text
R2_7_DURABLE_PROJECTION_NESTED_STATUS_STALE = FIX / DOCUMENTARY_CONVERGENCE
runtime impact = NONE
release-simcore impact = NONE
production publisher impact = NONE
HUMAN_EVIDENCE impact = NONE
```

This is not a runtime defect and does not invalidate the canonical v0.68 operational proof. The safety wall, consume-once gate, and main gateway all behaved correctly.

## Frozen repair

The same pure projection owner must project the nested component lifecycle alongside the top-level lifecycle:

```text
PROJECT
→ projected.status = OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE
→ projected.implementation.durableProjection.status = OPERATIONALLY_PROVEN_FIRST_USE_COMPLETE
```

The coherent consumed-gate predicate must require the nested component to be complete as well.

The already-landed living status will receive the same one-time documentary convergence in this fix transaction, with no other status semantics changed.

## Exclusions

```text
plugins/simcore/latest.js       NO CHANGE
plugins/simcore/install.js      NO CHANGE
release-simcore                 NO CHANGE
Permanent publisher             NO CHANGE
repo-main-write authority       NO CHANGE
HUMAN_EVIDENCE                  NO CHANGE
R2.8                            OUT OF SCOPE
```

## Validation requirement

- regression must prove nested status projects to complete,
- consumed gate must fail closed if nested status remains pending,
- permanent SimCore CI must PASS,
- release-simcore commit must remain `6b31a5265f67daf5a90222d6c08bb85f3abde538`,
- latest/install blobs must remain identical at `5094755266444de311ec9cc8ffc7a4dd658e65b1`.
