# SimCore v0.65.0 Candidate Failure 02 — Bounded Telemetry Version Bridge

Date: 2026-08-28
Status: `FIX · PR1_DRY STATIC GATE · PRODUCTION EXPOSURE NONE · release-simcore v0.64.11 UNCHANGED`

## Failure

PR #722 SimCore CI reached candidate dry qualification after the first reload-continuity bridge repair and reported:

```text
PR1_DRY_QUALIFICATION_FAIL
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: bounded-telemetry-capsule: bounded telemetry control version 0.65.0
```

All surrounding permanent gates reported:

```text
GATE_CI_SELF      PASS
GATE_STATIC       PASS
GATE_ARCH         PASS
GATE_REGRESSION   PASS
GATE_PR1_DRY      FAIL
```

## Diagnosis

`bounded-telemetry-capsule-v06411.test.mjs` intentionally accepts only v0.64.11 (plus a v0.64.10 pre-release control). v0.65.0 freezes the bounded capsule implementation while replacing only the release/operator scenario identity, so the old semantic suite needs a version compatibility bridge exactly like reload continuity.

A narrow search for `version !== '0.64.11'` found four v0.64.11 version-gated suites:

1. host-local telemetry — already has a dedicated v0.65.0 suite;
2. operator release card — already has a dedicated v0.65.0 suite;
3. reload-cache continuity — repaired by `reload-cache-continuity-v06500.test.mjs`;
4. bounded telemetry capsule — this remaining omission.

No other v0.64.11 exact-version gate remains unbridged in the current `batch-a` registry.

## Classification

```text
CLASSIFICATION: FIX
SURFACE: permanent regression harness version bridge
RUNTIME CHANGE: NONE
RELEASE SYSTEM CHANGE: NONE
PRODUCTION EXPOSURE: NONE
```

## Authorized repair

Add `bounded-telemetry-capsule-v06500.test.mjs` that, for an exact v0.65.0 source only:

- normalizes userscript metadata `0.65.0 -> 0.64.11` for the frozen semantic suite;
- normalizes only the operator scenario marker `06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT -> 06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT` because the v0.64.11 suite checks its own historical operator marker;
- delegates all actual bounded-capsule runtime assertions unchanged;
- leaves v0.65.0 identity convergence coverage to the dedicated host-local v0.65.0 suite.

Then route the `bounded-telemetry-capsule` registry entry through the new bridge and rerun PR1 dry/full candidate qualification.
