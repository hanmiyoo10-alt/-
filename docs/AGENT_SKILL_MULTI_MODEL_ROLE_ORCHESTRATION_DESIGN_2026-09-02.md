# Agent Skill Multi-Model Role Orchestration Design — 2026-09-02

## Status

DESIGN_ONLY_NOT_IMPLEMENTED

This document records a new orchestration direction for local zero-credit Agent Skill evaluation. It is intentionally separate from the candidate compact-wire v10 work.

## Motivation

Small local models do not need to solve the entire repository-analysis task end-to-end. A faster and more reliable architecture may come from assigning distinct roles to models that are empirically good at those roles, while preserving deterministic provenance and fail-closed validation between handoffs.

The key hypothesis is:

> A role-specialized multi-model pipeline can outperform a single small model on wall-clock usefulness and grounding reliability when each model receives a bounded responsibility and all cross-role handoffs are structured, hashed, and independently validated.

## Non-goals

- Do not ensemble by silently mixing prose from several models.
- Do not use majority vote as a substitute for evidence grounding.
- Do not let a downstream model erase UNKNOWN or CONFLICT emitted upstream without new evidence.
- Do not promote a candidate scope or claim product/runtime/release truth from model agreement alone.
- Do not change `PILOT_VALIDATED_SCOPES`.
- Do not change plugin/product/runtime/release/device bytes as part of this design.
- Do not treat the retired SimCore, Termux, Voyage, or consumed DevPass cases as fresh prospective proof.

## Proposed roles

### 1. Authority / locator scout

Purpose: cheaply identify which supplied source blocks are relevant to authority, scope ownership, and exact candidate evidence.

Output should be a compact list of opaque source references and UNKNOWN/CONFLICT markers only. It must not invent semantic flow or release truth.

Likely model profile: smallest fast model that demonstrates good retrieval/selection behavior.

### 2. Semantic flow mapper

Purpose: infer producer → normalization/state → consumer relationships from already bounded evidence.

Output should be a compact structured graph with source references for every non-UNKNOWN edge.

Likely model profile: model family that benchmarks best at code/repository relationship extraction.

### 3. Preservation / risk critic

Purpose: search specifically for boundaries the mapper may omit: request identity, extra I/O, lifecycle, security/minimization, persistence semantics, external-change fail-closed behavior, release uncertainty, and test coverage gaps.

This role should preferentially produce blockers and UNKNOWN rather than optimistic completion.

Likely model profile: a different model family from the mapper to reduce correlated failure modes.

### 4. Synthesis proposer

Purpose: combine only validated upstream structured artifacts into the narrowest candidate impact map.

The proposer must not receive raw upstream prose; it receives typed records plus source refs and conflict markers.

### 5. Deterministic validator / judge

This is not an LLM role.

The evaluator checks source-ref existence, structured completeness, schema limits, contradictions, required blocker conditions, provenance hashes, and the derived verdict. No model can self-award `SUPPORTED`.

## Handoff contract

Every model stage should write a bounded artifact containing at minimum:

- role id;
- model profile id and exact model digest;
- target repository SHA;
- frozen evidence/context SHA;
- prompt SHA;
- structured response SHA;
- source refs selected by the role;
- UNKNOWN/CONFLICT claims preserved by that role;
- previous-stage artifact SHA when applicable.

A downstream stage may add evidence-backed claims but may not silently delete an upstream UNKNOWN/CONFLICT. Any override must cite new supplied evidence and be visible in the receipt.

## Parallelism

Roles that do not depend on each other should run in parallel. In particular, the semantic mapper and preservation critic can consume the same frozen evidence concurrently after the authority/context stage. Their outputs can then be joined by the synthesis stage.

For GitHub Actions, prefer separate jobs or a matrix over loading several GGUF models into one constrained runner at once. This may improve wall-clock time without multiplying peak RAM on a single runner.

## Model-family strategy

Do not pre-assign permanent models to roles by reputation alone. Benchmark each allowlisted model family on role-specific synthetic and retrospective cases first.

Candidate families may include Qwen, Gemma, Llama, Phi, and Mistral/Ministral-class local GGUF models, subject to exact license/access, pinned artifact, checksum, llama.cpp compatibility, CPU feasibility, and zero-hosted-AI requirements.

A model earns a role only from measured evidence. Different roles may select different winning model families.

## Evaluation strategy

Use two layers:

1. Retrospective role benchmark: previously consumed/retired cases may be used to measure which model is good at which role. These results are diagnostic only.
2. Prospective orchestration proof: after role assignment and orchestration contracts are frozen, use a brand-new unseen held-out case. All participating model profiles, role assignments, generation parameters, and success criteria must be declared before the first model call.

## Success criteria

The orchestration direction is worth implementing only if it demonstrates at least one of the following without weakening grounding:

- lower wall-clock latency through safe parallelism;
- fewer missing material edges/boundaries than the best single-model baseline;
- fewer false DIRECT/SUPPORTED claims;
- better preservation of UNKNOWN/CONFLICT;
- more stable completion within the fixed output budget;
- reproducible per-role provenance that makes failures easier to diagnose.

## Failure rules

Fail closed if:

- model roles disagree on a material claim and the supplied evidence cannot resolve it;
- a source ref is invalid or unavailable;
- an upstream blocker disappears without new evidence;
- a model times out or truncates before producing a valid role artifact;
- role assignment changes after a prospective held-out result is observed.

## Recommended implementation order

1. Finish compact candidate wire v10 first; do not entangle the two changes.
2. Add model-profile registry abstraction without adding new models yet.
3. Add role-specific structured contracts and receipts.
4. Add a multi-job orchestration DAG using existing Qwen profiles as a mechanical pilot.
5. Add one non-Qwen family at a time with pinned license/access notes, GGUF artifact, revision, checksum, and CPU smoke test.
6. Run retrospective role benchmarks to assign models by measured strength.
7. Freeze a brand-new prospective held-out and run the complete multi-model orchestration exactly once.

## Current decision

The project should explore role-specialized multi-model orchestration rather than requiring one small model to perform authority discovery, semantic mapping, preservation analysis, synthesis, and self-judgment in a single completion.

No implementation is authorized by this document alone; it records the architecture and safety/provenance boundaries for a later implementation slice.
