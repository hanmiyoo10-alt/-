# SimCore v0.65.0 Candidate Failure 01 — Reload Test Version Bridge

Date: 2026-08-28
Status: `FIX · STATIC GATE · PRODUCTION EXPOSURE NONE · release-simcore v0.64.11 UNCHANGED`

## Failure

Candidate materialization run `33166301764` reached the full `batch-a` candidate regression gate and stopped at:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity: reload continuity gate version 0.65.0
```

The failing permanent suite path was:

```text
products/simcore/tests/suites/reload-cache-continuity-v06411.test.mjs
```

## Diagnosis

The v0.64.11 compatibility wrapper explicitly accepts only metadata version `0.64.11`. For any other version it falls through to the older v0.64.10/legacy chain, whose version gate correctly rejects a v0.65.0 candidate.

This is a test-version bridge omission, not evidence of a runtime reload-continuity semantic regression.

The v0.65.0 release intentionally changes release identity while freezing the reload-cache continuity behavior covered by this suite. Therefore the correct repair is a v0.65.0 compatibility wrapper that normalizes only the userscript metadata version to `0.64.11` for the existing frozen continuity suite. Runtime/Host identity convergence remains independently covered by `host-local-telemetry-v06500.test.mjs` and must not be hidden by this bridge.

## Classification

```text
CLASSIFICATION: FIX
SURFACE: permanent regression harness version bridge
RUNTIME CHANGE: NONE
RELEASE SYSTEM CHANGE: NONE
PRODUCTION EXPOSURE: NONE
```

## Authorized repair

1. add `reload-cache-continuity-v06500.test.mjs`;
2. for exact v0.65.0 source, rewrite only `//@version 0.65.0` to `//@version 0.64.11` before delegating to the frozen v0.64.11 suite;
3. route registry `reload-cache-continuity` through the v0.65.0 wrapper;
4. create a new immutable candidate request (`intent-02`) against the same unchanged production parent;
5. rerun full candidate materialization and `batch-a`.

No change to `release-simcore` is authorized until the repaired candidate gate passes.
