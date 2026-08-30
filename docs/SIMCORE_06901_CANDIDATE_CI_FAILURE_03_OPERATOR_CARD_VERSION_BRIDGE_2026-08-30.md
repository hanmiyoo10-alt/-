# SimCore v0.69.1 Candidate CI Failure 03 — Operator Card Version Bridge

Date: 2026-08-30 KST
Classification: `FIX · VALIDATION_HARNESS_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: **OBSERVED · REPAIR BOUNDED**

Release request PR: `#892`

```text
SimCore CI run = 33283969494
Verify job     = 99183800840
bounded result = FAIL
reason         = PR1_DRY_QUALIFICATION_FAIL
```

The bounded report again showed permanent static, architecture, and regression gates passing. Exact dry-candidate failure:

```text
SUITE_ASSERTION_FAILED: operator-release-card:
operator release card appeared before v0.64.9
```

## Diagnosis

The permanent registry routes operator-card validation through `operator-release-card-v06900.test.mjs`. That suite has native exact-version handling only for `0.69.0`; a v0.69.1 candidate falls through the historical wrapper chain and is eventually classified as predating the card.

The authorized v0.69.1 builder intentionally updates the top operator-card release identity only:

```text
version 0.69.0 -> 0.69.1
name    M2-6 State Reconcile... -> Refreshless Targeted Update Liveness Repair
```

The existing card panel shape, no-side-effect contract, historical ledger, and previously established M2-6 guidance remain frozen. This is validation release-identity drift, not a runtime UI regression.

## Bounded repair

1. add exact v0.69.1 operator-card wrapper;
2. assert the actual v0.69.1 card version/name natively;
3. preserve collapsed/default UI and no-new-side-effect constraints;
4. use a test-only projection of only the top card release identity to delegate unrelated historical card controls to v0.69;
5. route registry through the v0.69.1 wrapper;
6. modify no runtime candidate bytes.

Any later release-sensitive failure must be preserved separately.

```text
RUNTIME CHANGE        = NONE
RELEASE SYSTEM CHANGE = NONE
RELEASE_SIMCORE WRITE = NONE
PRODUCTION VERSION    = 0.69.0
PRODUCTION COMMIT     = 31b4c5075659a55861731c6fd73f999402321e94
```
