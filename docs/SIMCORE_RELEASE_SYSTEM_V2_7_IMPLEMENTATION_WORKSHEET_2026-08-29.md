# SimCore Release System R2.7 Implementation Worksheet

Date: 2026-08-29 KST

Status: **IMPLEMENTATION IN PROGRESS · NON_RUNTIME**

Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_7_EVIDENCE_DERIVED_OPERATIONS_DESIGN.md`

Implementation authorization: `docs/SIMCORE_RELEASE_SYSTEM_V2_7_IMPLEMENTATION_AUTHORIZATION_2026-08-29.md`

Working branch: `impl/simcore-r2-7-evidence-derived-operations`

## Ownership

```text
root/path contract      products/simcore/tooling/root-path.mjs
recovery decision      products/simcore/tooling/release-recovery-decision.mjs
operational proof      products/simcore/tooling/release-operational-proof.mjs
permanent routing      .github/workflows/simcore-release-permanent.yml
recovery routing       existing append-only .github/workflows/simcore-release-state-sync.yml destination
regression             products/simcore/tests/suites/release-system-r2-7.test.mjs
classification         products/simcore/tooling/ci/classify.mjs + permanent self-test
```

## Frozen exclusions

```text
plugins/simcore/latest.js       NO CHANGE
plugins/simcore/install.js      NO CHANGE
release-simcore                 NO CHANGE
production publisher authority  NO CHANGE
repo-main-write authority       NO CHANGE
HUMAN_EVIDENCE authority        NO CHANGE
background polling/retry        NONE
```

## Required implementation results

- one shared root/path contract for new/changed R2.7 owners;
- preserve the v0.67-fixed root-aware behavior of predecessor sync-state/R2.6 tools without broad refactor risk;
- pure recovery classifier with bounded dispositions;
- permanent failure diagnostic that detects stale frozen verifier after Resolve;
- published failures route diagnostically to the existing read-only/append-only recovery authority;
- operational proof validator derives truth from record/receipt evidence;
- no new required job;
- permanent CI classification and regression coverage;
- implementation closure only after exact latest head Verify + Required PASS.

## Validation anomaly ledger

### FIX · RESOLVED · TEST FIXTURE CONTRACT ONLY — R2.7 fixture envelope

First implementation CI:

```text
run        33251523100 (#2705)
GATE_CI_SELF        PASS
GATE_STATIC         PASS
GATE_ARCH           PASS
GATE_REGRESSION     INFRA_ERROR / HARNESS_ERROR
GATE_STATE          PASS
GATE_COORDINATION   PASS
stderr              FIXTURE_SCHEMA_INVALID: fixture envelope
```

Root cause: the new `release-system-r2-7` fixture contained R2.7 semantic data but did not use the harness common fixture envelope (`id`, `suite`, `input`, `expected`, `meta`).

Resolution: conform the fixture to the same common envelope used by the predecessor release-system suite. No production, runtime, authority, or workflow semantic change.

Classification:

```text
R2_7_FIXTURE_ENVELOPE_MISMATCH = FIX / RESOLVED
RUNTIME_MUTATION = NONE
RELEASE_SIMCORE_MUTATION = NONE
```

## Stability-scoped path migration note

The frozen design establishes one root-aware contract. For implementation safety, R2.7 makes `root-path.mjs` canonical for all new/changed R2.7 owners and permanently tests `cwd != root`, absolute-path rejection, and escape rejection. Predecessor `sync-state.mjs` and R2.6 tools already contain the v0.67-fixed equivalent root semantics and are not mechanically rewritten in this transaction solely for code-style deduplication.

Disposition:

```text
FULL_PREDECESSOR_HELPER_MECHANICAL_MIGRATION = DEFER
reason = broad low-value refactor would increase release-system risk
semantic root contract = REQUIRED AND REGRESSION-COVERED
```
