# Local Usage Dashboard — E14 Governance Alignment Design

Status: **DESIGN READY — maintenance implementation authorized**

Issue: `#635`

## Problem

E14 ancestry-aware candidate materialization is implemented and live-proven by 5.82, but the repository historically overloaded the word `generation` across two different layers:

- the durable release transaction/wake generation accepted by the `release_generation` request field;
- the candidate Git-DAG ancestry baseline implemented by E14.

The durable request parser and generation-proof switch intentionally stop at E13, while the original E14 design used the heading `Generation: E14`. That wording makes a correct architecture look inconsistent.

## Decision — two explicit governance axes

### Axis A — durable transaction generation

Current value: **E13**.

Ownership:
- durable release request field `release_generation`;
- reducer/wake topology;
- machine-emitted generation proof switch;
- durable transaction closure provenance.

The field name `release_generation` is retained for backward compatibility, but its repository meaning is explicitly **durable transaction generation**.

E14 is not accepted as a `release_generation` value unless a future operational consumer genuinely requires a new machine-readable transaction generation.

### Axis B — candidate DAG baseline

Current value: **E14**.

Ownership:
- ancestry-aware candidate commit parent rule;
- candidate parent/trailer verification;
- E11 frozen-main/DAG agreement;
- append-only/fast-forward deterministic candidate history.

E14 is therefore an orthogonal candidate-DAG baseline layered on the proven E13 durable transaction generation. It is not a new reducer generation.

## Live proof mapping

5.82 is the real-release behavioral proof for the E14 candidate-DAG baseline:

- first candidate used the one-parent converged form;
- later candidates used ordered `[previous candidate, frozen main]` two-parent repairs as `main` advanced;
- no ancestry-only source refresh PR analogous to 5.81 #423/#424 was needed;
- exact-SHA validation, E11 merge readiness, expected-head merge, exact-byte promotion, parity, and durable closure all completed.

Because 5.82 correctly used `release_generation: E13`, no `E14_REAL_RELEASE_PROOF` machine marker is required for this baseline.

## Implementation

Keep this maintenance deliberately small:

1. Name the parser's active matcher `DURABLE_TRANSACTION_GENERATION_RE` while preserving exported `GENERATION_RE` as a compatibility alias.
2. Keep accepted request values E9..E13; E14 remains rejected by the durable transaction parser.
3. Update the original E14 design header/status so it says `Candidate DAG baseline: E14` and `Durable transaction generation: E13` instead of `Generation: E14`.
4. Extend the existing E14 registry contract to enforce the two-axis terminology and fail closed if E14 is accidentally added to the durable transaction generation without an explicit future design.

## Non-goals

- no E15 durable transaction generation;
- no new request field;
- no request-state change;
- no new reducer/wake/proof workflow;
- no `E14_REAL_RELEASE_PROOF` machinery;
- no product/runtime/Engine/Manager/bootstrap change;
- no production promotion;
- no change to E14 candidate parent semantics;
- no weakening of exact-SHA validation, E11, expected-head merge, or exact-byte promotion.

## Future promotion rule

Only promote the durable transaction generation beyond E13 when a concrete operational requirement needs machine-readable provenance or new transaction semantics. Naming symmetry alone is insufficient evidence.

The E15 handoff hygiene baseline authorized by #738 is orthogonal to these two axes: it standardizes first-write request metadata and stable PR presentation while keeping `release_generation: E13`, the E14 candidate DAG baseline, and E11 merge readiness unchanged.

## Bottom line

**E13 names the durable transaction generation. E14 names the candidate DAG baseline. E15 may add orthogonal handoff hygiene without manufacturing a new state machine.**
