# SimCore v0.66.0 Release Intent Failure 01 — Versioned Regression Bridges

Date: 2026-08-29
Classification: `FIX · BLOCKER · VALIDATION_FIXTURE · NON_RUNTIME · PRODUCTION_UNCHANGED`
Status: `EVIDENCE RECORDED · REPAIR IN PROGRESS`

Failed release-intent PR:
- PR `#760`
- branch `release/simcore-v0.66.0-intent-01`
- request commit `f0a74f2482da660e6992ad042b9f233c5ad494f2`
- releaseId `simcore-v0.66.0-new-01`

Failed permanent CI:
- workflow `SimCore CI`
- run `33201996055`
- `Verify = FAILURE`
- `Required = FAILURE`

Production authority remained unchanged:
- version `0.65.0`
- `release-simcore` commit `c6659296c68b4322d0ed43f7d8a3339e57f1cbf1`
- production runtime blob `1b38e2b2874f2581edae8f1080edc39558febefa`

## Failure

The PR1 dry candidate qualification materialized the v0.66.0 candidate and reached the permanent `batch-a` regression pack, then stopped at:

```text
PR1_DRY_QUALIFICATION_FAIL
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity: reload continuity gate version 0.66.0
```

The same report showed the surrounding permanent gates passing:

```text
GATE_CI_SELF     PASS
GATE_STATIC      PASS
GATE_ARCH        PASS
GATE_REGRESSION  PASS outside the PR1-dry candidate subqualification
```

The failure is therefore at the release-identity compatibility bridge inside the candidate regression pack, not at the M2-4 runtime architecture/static gate.

## Diagnosis

The permanent registry still routes four release-identity-sensitive suites through v0.65-specific wrappers:

```text
reload-cache-continuity   -> reload-cache-continuity-v06500.test.mjs
operator-release-card     -> operator-release-card-v06500.test.mjs
host-local-telemetry      -> host-local-telemetry-v06500.test.mjs
bounded-telemetry-capsule -> bounded-telemetry-capsule-v06500.test.mjs
```

Each wrapper explicitly branches on metadata version `0.65.0`. A v0.66.0 candidate therefore falls through to an older wrapper/suite whose frozen version gate rejects the new release identity.

This is the same class of omission previously encountered and repaired during the v0.65.0 release. It is not evidence that the candidate changed the frozen reload/cache/telemetry semantics.

The v0.66.0 builder intentionally changes release identity and the operator release card while preserving the underlying reload-cache continuity and bounded capsule behavior. Host-local telemetry must independently verify exact v0.66.0 metadata/runtime/host identity and cross-version rejection.

## Authorized repair scope

This repair is validation-only and must not change runtime candidate bytes or release-system control flow.

1. add `reload-cache-continuity-v06600.test.mjs`:
   - only for exact metadata v0.66.0, normalize metadata to v0.65.0 and delegate to the frozen v0.65 wrapper;
2. add `bounded-telemetry-capsule-v06600.test.mjs`:
   - only for exact metadata v0.66.0, normalize metadata and v0.66 scenario identity to the corresponding v0.65 identity, then delegate to the frozen v0.65 wrapper;
3. add `operator-release-card-v06600.test.mjs`:
   - verify the actual v0.66.0 card identity, M2-4 scenario/guidance, recent-release ledger, collapsed/default UI shape, and no new side-effect surface;
4. add `host-local-telemetry-v06600.test.mjs`:
   - require metadata/runtime/HOST compatibility identity = v0.66.0;
   - verify the M2-4 physical owner wiring relevant to identity continuity;
   - accept exact v0.66.0 host-local capsule and reject v0.65.0 capsule;
5. route the four registry entries through the v0.66 wrappers;
6. run permanent PR CI on this fixture-only repair;
7. close PR #760 without merge and create a fresh append-only `intent-02` only after this repair is merged to main.

## Frozen candidate identity

The repair must not alter the runtime candidate materialization target:

```text
builder sha256   = ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50
candidate blob   = 766c3b758ca26ae72546a38bfa1c053efa666c45
candidate sha256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
```

## Production impact

`NONE`.

No candidate request was merged, no candidate receipt was authorized from this failed PR, and no `release-simcore` mutation occurred.
