# SimCore Release System v2 — RS2-1 Durable Tests Implementation Evidence

Date: 2026-08-23
Status: **IMPLEMENTING · NON-RUNTIME**
Phase: `RS2-1 — Durable Tests`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1D_BASELINE_EQUIVALENCE_PROOF.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1E_PROMOTION_CLOSE_GATE.md`

## Scope lock

This work item implements **RS2-1 only**.

Allowed:

```text
products/simcore/tooling/check.mjs
products/simcore/tests/**
products/simcore/fixtures/**
products/simcore/contracts/**
RS2-1 implementation evidence / close state
an RS2-1-only read-only validation workflow if needed for implementation proof
```

Forbidden in this work item:

```text
plugins/simcore/latest.js mutation
plugins/simcore/install.js mutation
release-simcore mutation
product-manifest.json mutation
RS2-2 state-sync implementation
RS2-3 permanent-CI implementation
RS2-4 permanent-release implementation
runtime semantic change
legacy release-path deletion
```

## Frozen production baseline

The close proof is pinned to corrected production:

```text
branch              release-simcore
commit              47969d24771f6cc188df6e32150fc6fde519182d
latest blob         34da01aa131f760b92d65d961a7843e9cc0d37d6
install blob        34da01aa131f760b92d65d961a7843e9cc0d37d6
version             0.64.6
release             Post-B_END C Clock Handoff Authority
```

The currently stale `product-manifest.json` is known infrastructure evidence for RS2-2 and is explicitly **not** repaired by RS2-1.

## Target close claims

RS2-1 is allowed to close only at:

```text
DURABLE_TESTS_AVAILABLE         YES
PARTIAL_REPLACEMENT_AUTHORIZED  YES
FULL_REPLACEMENT_AUTHORIZED     NO
RS2_1_CLOSED                    YES
```

Expected transitional controls at close:

```text
Representation Fresh fast       HYBRID_TRANSITIONAL
Genuine Edit                     HYBRID_TRANSITIONAL
B_END terminal/closure           HYBRID_TRANSITIONAL
```

Expected direct permanent executable suites:

```text
COMMUNITY multiline reaction unit validation
Diagnostic Copy Resilience
```

## Evidence-before-repair notes

No runtime defect is being repaired in this work item. Any mismatch between the permanent harness and the pinned production/legacy evidence is a harness/equivalence finding first. It must not be repaired by changing production source in this branch.

## Validation record

Pending implementation and read-only CI execution.
