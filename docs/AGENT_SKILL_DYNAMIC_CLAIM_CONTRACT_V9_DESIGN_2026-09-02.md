# Agent Skill Zero-Credit Eval — Candidate Grounded Report v9 Implementation Note

Status: **RECONCILED WITH CURRENT MAIN DESIGN BEFORE ANY DEVPASS MODEL OUTPUT**

Date: 2026-09-02

Original implementation baseline: `3869b454daa6ddc04d72317e22e063784e086f0b`
Current design authority after concurrent main advance: `docs/REPOSITORY_PLUGIN_IMPACT_SCOPE_CANDIDATE_GROUNDED_REPORT_CONTRACT_DESIGN_2026-09-02.md` on main `813ad6c906267c32eba123eec941f9297721af24`.

## Reconciliation

An initial branch-only v9 draft proposed pre-registered case-specific C#/F# semantic claims. Before any DevPass model output was produced, current main added the repository design that explicitly forbids hidden expected owner/path/edge answers in a new candidate contract. The pre-registered C#/F# approach is therefore withdrawn and must not be used for the prospective DevPass proof.

The implementation follows the repository design seam:

`CANDIDATE_GROUNDED_REPORT_VALIDATION_GATE`

## Compatibility boundary

`impact-scope-grounded-flow-v8` remains unchanged for the validated Usage Dashboard `service-tier-fidelity` case. Candidate v9 is additive and evaluation-only. It does not expand `PILOT_VALIDATED_SCOPES`, normal invocation authority, product/runtime/release authority, or deployment behavior.

## Candidate v9 model-visible contract

The candidate model proposes generic semantic content rather than selecting hidden expected answers. The output contains the canonical generic categories:

- scope;
- authority;
- semantic owners;
- flow edges;
- request-identity preservation;
- no-extra-I/O preservation;
- other preservation boundaries;
- tests/contracts/validation;
- generated/release boundary;
- narrowest supported impact boundary.

Every affirmative non-`UNKNOWN` claim carries only bounded source references:

- opaque `sourceBlockId` (`S#` assigned from the supplied context bundle);
- short verbatim `sourceAnchor` occurring in that exact supplied block.

No case-specific expected owner names, expected flow endpoints, expected source paths, expected semantic claim IDs, blocker text, or final verdict are injected into the v9 response contract.

## Deterministic evaluator authority

The evaluator checks only bounded mechanical properties:

- source block ID exists;
- anchor occurs verbatim in that supplied block;
- status is valid;
- required generic report categories are represented;
- non-UNKNOWN claims are grounded;
- unresolved required generic categories produce blockers;
- final impact verdict follows mechanically.

It does **not** infer that an anchor semantically proves a model-proposed owner/edge. Semantic correctness remains post-run qualitative held-out scoring authority.

Generic derived blockers are limited to category classes such as:

`authority`, `semantic_owners`, `flow`, `request_identity`, `no_extra_io`, `tests_contracts`, `generated_release`, `narrowest_boundary`, `conflict`.

Verdict:

- any grounded conflict -> `CONFLICT`;
- unresolved authority or no useful grounded flow -> `UNKNOWN`;
- useful grounding with unresolved required categories -> `PARTIAL`;
- all required generic categories mechanically grounded and no blockers -> `SUPPORTED`.

`SUPPORTED` is only mechanical report completeness. It is not semantic correctness and never promotes the candidate scope.

## Prospective DevPass proof

DevPass remains the first unseen prospective case. The task, hidden qualitative assertions, and exact source snapshot were frozen before any model output:

- candidate scope: `plugin:devpass`;
- frozen source snapshot: `3869b454daa6ddc04d72317e22e063784e086f0b`;
- bounded source surfaces: catalog, control-plane registry, DevPass README, DevPass guidelines;
- issue #1120 freeze record created before model execution.

The DevPass source profile is model-visible evidence, but the v9 structured contract does not pre-encode the expected semantic answer extracted from those sources.

Termux, Voyage, and the prior SimCore held-out remain retired diagnostic/training evidence and cannot be reused as independent proof.

Before DevPass execution:

1. implementation PR CI must pass;
2. merged-main Agent Skills + SimCore Required must pass;
3. existing Usage Dashboard v8 zero-credit regression must remain green.

The first successful DevPass v9 execution is one-shot independent evidence. If mechanical with-skill verdict is not `SUPPORTED`, or later qualitative hidden assertions fail, freeze evidence and diagnose only; do not tune and reuse the same held-out as independent proof.
