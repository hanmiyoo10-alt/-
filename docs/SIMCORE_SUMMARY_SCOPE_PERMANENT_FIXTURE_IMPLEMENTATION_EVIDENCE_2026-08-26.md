# SimCore Summary Scope Permanent Fixture — Implementation Evidence — 2026-08-26

Status: `IMPLEMENTED · PERMANENT GOLDEN GATE · EXECUTABLE · NO RUNTIME CHANGE`

Design authority:
- `docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`

Implementation:
- suite: `products/simcore/tests/suites/summary-scope.test.mjs`
- fixture: `products/simcore/tests/fixtures/summary-scope/cases.json`
- registry: `products/simcore/tests/registry.mjs`
- PR: `#425 — SimCore: add summary-scope permanent fixture`
- merged main commit: `b912baf4d84ab95da2c1668da0b4be898d6d5d2f`

## 1. Implemented contract

Stable suite ID:

```text
summary-scope
```

Registry posture:

```text
coverage   = EXECUTABLE
required   = true
goldenGate = true
```

The suite directly loads the production `lifecycle` module through the existing permanent BundleLoader and invokes:

```text
Lifecycle.classifySummaryScope(text, mode)
```

No classifier algorithm is copied into the suite.

For every case the suite asserts the complete bounded tuple:

```text
scope
targetYear
comparisonYear
authority
reason
```

## 2. Implemented initial case matrix

Exactly nine frozen design cases were materialized:

```text
annual-only-single-year
annual-only-full-year-window
cumulative-yoy-explicit-baseline
ambiguous-multiyear-range-none
previous-year-mention-without-yoy-signal
adjacent-year-range-with-compare
nonadjacent-comparison-none
non-c-mode-none
missing-year-none
```

The matrix protects:
- primary `ANNUAL_ONLY` authority;
- explicit full-year-window recognition;
- explicit adjacent previous-year `CUMULATIVE_YOY` baseline authority;
- multi-year fail-closed behavior;
- previous-year mention without YoY signal;
- comparison-vs-multi-year precedence;
- non-adjacent comparison fail-closed behavior;
- C-mode ownership boundary;
- explicit-year requirement.

## 3. Permanent CI proof

PR head:

```text
e937ea53803478c96569c922f454009af3ab5c26
```

SimCore CI run:

```text
32919448279
```

Jobs:

```text
Verify   PASS
Required PASS
```

Path classification:

```text
CI_SELF
HARNESS
```

Proposed verifier gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

Production authority used by CI:

```text
release-simcore commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
production blob        = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
```

The permanent regression gate therefore executed the new `summary-scope` suite against current deployed SimCore v0.64.7 production authority together with the existing `batch-a` registry and passed.

## 4. Evidence maturity boundary

Implementation maturity:

```text
EXECUTABLE
PERMANENT GOLDEN GATE
```

Evidence maturity remains:

```text
CONTRACT_ESTABLISHED
NATURAL_SEMANTIC_CLOSE = VALIDATION_ONLY
```

Do not reinterpret the deterministic fixture PASS as dedicated post-fix natural long-chat semantic closure for every `ANNUAL_ONLY` or `CUMULATIVE_YOY` response.

This suite protects Lifecycle-owned request classification/authority metadata only. It does not judge generated prose or arithmetic quality.

## 5. Safety / authority boundary

This work changed only permanent regression-test assets.

```text
plugin runtime source   = UNCHANGED
plugin version          = UNCHANGED
latest.js/install.js    = UNCHANGED
release-simcore         = UNCHANGED
runtime semantics       = UNCHANGED
fixture schema          = UNCHANGED
harness topology        = UNCHANGED
CI/release authority    = UNCHANGED
```

No new test system was created.

Canonical rule remains:

```text
ONE PERMANENT HARNESS
MANY CONTRACT SUITES
NO SECOND TEST SYSTEM
```

## 6. Portfolio progress

Frozen regression-expansion implementation order was:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure expansion
```

Current progress after this work:

```text
summary-scope       = IMPLEMENTED
narrative-clock     = NEXT
frame               = PENDING
broadcast-closure   = PENDING EXPANSION
```

M2-3-bound `representation-fast` / `genuine-edit` HYBRID-to-EXECUTABLE migration remains separate and gated by the future direct ownership boundary.
