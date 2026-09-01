# Agent Skill Multi-Model Orchestration Milestone Roadmap — 2026-09-02

## Status

DESIGN_ONLY_NOT_IMPLEMENTED

This roadmap operationalizes the architecture and implementation blueprint for role-specialized local multi-model orchestration. It defines phase entry conditions, implementation scope, required tests, exit gates, rollback rules, and evidence that must be recorded before the next phase may begin.

Compact-wire v10 remains a prerequisite. Existing single-model Agent Skill evaluation remains the regression baseline and rollback path throughout O0–O7.

## Global invariants

These rules apply to every milestone:

- deterministic code owns scope routing, authority, evidence construction, model eligibility, budgets, conflict handling, mutation permission, and final verdicts;
- model outputs are advisory typed artifacts, never repository authority;
- no model may erase UNKNOWN or CONFLICT without new validated evidence;
- no majority vote is accepted as evidence;
- no role may receive another role's raw free-form prose;
- every handoff must be schema-valid, hash-linked, and source-ref validated;
- existing `tools/agent-skill-eval/` remains intact as the stable single-model baseline;
- no product/plugin/runtime/release/device bytes are changed by O0–O6;
- `PILOT_VALIDATED_SCOPES` is unchanged unless a later explicit promotion process separately proves a new scope;
- retired/consumed held-outs remain retrospective benchmark evidence only;
- a new prospective held-out is frozen before any O6 model output is observed;
- zero-hosted-AI execution must be preserved for all local model lanes.

## O0 — contracts, registries, domain abstraction

Entry: compact-wire v10 merged and validated; O0 contains no role execution.

Implement: typed schemas, canonical serialization, model eligibility registry, domain registry, role metadata, digest helpers, README.

Tests: schema round trips, invalid refs, deterministic digests, missing checksum/license/access rejection, missing domain authority metadata rejection, full existing Agent Skill regression, zero model calls.

Exit: deterministic identical-input digests, additive-only main read-back, current single-model lane unchanged.

Rollback: delete/disable the new inert orchestrator package; do not migrate `tools/agent-skill-eval/`.

## O1 — deterministic router, authority, evidence bus

Entry: O0 merged/main green and schema versions frozen.

Implement: task normalization, deterministic lane/scope routing, authority adapter, bounded evidence builder, typed bus, deterministic conflict creation, budget object, synthetic judge.

Tests: UNKNOWN preservation, SHA-sensitive evidence packages, invalid refs blocked from bus, upstream UNKNOWN/CONFLICT cannot disappear, no majority resolution, budget exhaustion blockers, model-authored verdict ignored.

Exit: full synthetic task-to-verdict execution with zero model calls and reproducible receipts.

Rollback: disable orchestrator entrypoint and retain inert O0 records.

## O2 — single-model multi-role mechanical pilot

Entry: O1 stable, Scout/Mapper/Critic/Synthesizer contracts frozen, token budgets frozen, no new model family.

Implement: llama.cpp runtime adapter, per-role prompt/contract composition, per-role receipts, sequential role DAG, timeout/truncation classification, raw-output isolation.

Tests: role forbidden fields, blockers cannot be self-resolved, Critic may preserve UNKNOWN/CONFLICT, Synthesizer sees validated records only, malformed output isolated, truncation=`EXECUTION_INCOMPLETE`, receipt SHA chain exact.

Pilot evidence: retrospective/diagnostic only; not independent quality proof.

Exit: all four role artifacts validate, failed worker contained, judge consumes bus only, no mutation authority, zero-hosted-AI receipt explicit.

Rollback: disable role runtime and return to O1.

## O3 — parallel Mapper/Critic scheduling

Entry: O2 stable, sequential receipts established, budget profiles versioned.

Implement: Scout dependency first when needed; Mapper/Critic separate jobs over identical evidence SHA; Synthesizer waits for valid/failed dependency states; root timing/provenance.

Tests: identical evidence SHA, ordering-independent merge semantics, one worker failure does not poison sibling, retry metadata explicit, Synthesizer dependency gate, wall-clock vs CPU telemetry, runner memory policy.

Exit: grounding no worse than O2 and concurrency shows measurable wall-clock or operational benefit.

Rollback: sequential O2 scheduler with unchanged contracts.

## O4 — retrospective multi-family role benchmark

Entry: O3 stable; benchmark schema/scoring frozen; consumed cases labeled retrospective only.

Implement one family at a time with exact revision, GGUF, SHA256, license/access, llama.cpp smoke, CPU telemetry.

Measure by role:

- Scout: source precision/recall, invalid refs, authority overclaim;
- Mapper: edge recovery, false edges, grounding;
- Critic: boundary recovery, false blockers, UNKNOWN/CONFLICT preservation, optimism;
- Synthesizer: record preservation, compact completion, blocker/conflict preservation, forbidden new claims;
- cross-cutting: latency, memory, completion, parse validity, tokens.

Tests: immutable benchmark inputs, deterministic scoring, failed/incomplete runs included, checksum mismatches rejected pre-inference.

Exit: measured capability table only, no permanent role assignment yet.

Rollback: make a model ineligible while preserving benchmark evidence.

## O5 — deterministic role assignment and budget policy

Entry: O4 has comparable valid evidence; assignment algorithm and tie-breaks frozen before prospective selection.

Implement: role assignment from measured quality plus runtime constraints. Quality thresholds precede latency. Mapper/Critic family diversity may be preferred only when benchmark quality remains above threshold and diversity measurably helps.

Tests: deterministic assignment, ineligible model never selected, threshold failure returns no assignment/UNKNOWN, assignment changes only with benchmark/policy version, assignment receipt records score/policy inputs.

Exit: freeze role/model assignments, generation parameters, compute budget, escalation policy, success criteria, prospective-proof protocol.

Rollback: static assignment from last known-good O4 benchmark snapshot.

## O6 — brand-new prospective orchestration proof

Entry before any model output: unseen scope/case selected; source snapshot, bounded context, assertions, O5 assignments, generation parameters, judge rules all frozen and recorded.

Execution: exactly one independent orchestration run. Pre-inference envelope/infrastructure corrections are allowed only if semantic fixture, assignments, contracts, and assertions remain unchanged and are separately recorded. Once meaningful model output exists, the case is consumed.

Evidence: root/per-role receipts, model digests, evidence SHA, artifact SHA chain, conflict/blockers, deterministic verdict, telemetry, frozen single-model comparison.

Success: improve at least one material dimension without weakening grounding—edge/boundary recovery, false-claim reduction, UNKNOWN/CONFLICT preservation, completion reliability, wall-clock, or failure localization.

Exit: only genuine prospective success permits O7. Failure becomes diagnostic and the held-out is retired.

Rollback: keep orchestration analysis-only and use stable single-model validated operations.

## O7 — validated analysis to PatchPlan bridge

Entry: O6 prospective success and no unresolved provenance/safety gap.

Implement typed `PatchPlan` only: target regions, intended invariant-preserving change, tests, blockers, rollback notes, evidence refs. It has no repository write authority.

Tests: cross-scope refs require explicit authority, UNKNOWN/CONFLICT propagate, invalid refs rejected, no write API reachable, existing branch/PR/CI/release lane remains sole mutation authority.

Exit: validated PatchPlan can feed the existing deterministic development transaction without direct mutation/release authority.

Rollback: disable PatchPlan export and retain analysis-only orchestration.

## Cross-phase repository transaction

Every implementation milestone follows:

1. verify latest main/baseline;
2. record acceptance criteria before implementation;
3. narrow branch;
4. current milestone only;
5. milestone tests + full Agent Skill regression;
6. PR;
7. required CI green;
8. exact tested-head merge;
9. main read-back;
10. rerun validated single-model regression when eval/runtime can be affected;
11. central evidence record;
12. only then start next milestone.

Do not batch O0+O1+O2 into one PR.

## Recommended PR slicing

- O0-A schemas/canonical serialization;
- O0-B model/domain registries;
- O1-A router/authority/evidence;
- O1-B bus/judge/budget;
- O2-A runtime adapter + Scout;
- O2-B Mapper/Critic/Synthesizer contracts;
- O3 scheduling/workflow parallelism;
- O4 one PR per new model family plus benchmark aggregation;
- O5 assignment policy;
- O6 fixture/freeze PR before first run, then evidence-only result record;
- O7 PatchPlan schema/validator before integration bridge.

## User-visible policy

This program must not increase manual development work for the user. ChatGPT/system owns source inspection, implementation, tests, PR/CI, merge/materialization, release preparation, and receipt inspection. User involvement is reserved for claims that require real device/runtime evidence unavailable from repository authority.

## Current decision

This is a staged design roadmap only. Implementation does not begin until compact-wire v10 is complete and O0 entry conditions are re-verified against current main.
