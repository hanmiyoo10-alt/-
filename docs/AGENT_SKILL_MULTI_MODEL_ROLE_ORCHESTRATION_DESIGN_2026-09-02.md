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

## Repository-scale architecture

The repository contains many product, plugin, release, CI, design, and control-plane surfaces. Therefore the orchestration should not be a single fixed chain that always launches every model. It should be a deterministic task router that builds a small DAG for the current task.

The recommended shape is:

```text
USER TASK
   |
   v
DETERMINISTIC TASK ROUTER
   |
   +--> scope/authority resolver
   |
   +--> bounded evidence builder
   |
   v
ROLE DAG
   +--> Scout ---------+
   +--> Mapper --------+--> validated evidence bus --> Synthesizer --> deterministic judge
   +--> Critic --------+
   +--> specialist ----+
```

The router, evidence builder, artifact store, and final judge are deterministic code. Models are workers inside bounded roles, not the control plane.

### A. Deterministic task router

The router should classify the request using repository-owned metadata before any model call. Example dimensions:

- target scope: Usage Dashboard, SimCore, DevPass, another plugin, repository infrastructure, documentation, release state;
- task class: locate evidence, impact analysis, design review, patch planning, regression diagnosis, release verification;
- authority class: current main, release branch, frozen prospective snapshot, generated artifact, device-only truth;
- risk class: read-only analysis versus mutation-capable implementation;
- required role set.

A simple task should not launch five models. The router should choose the minimum valid DAG.

Examples:

- exact release/version lookup: deterministic resolver only;
- narrow source locator question: Scout only plus validator;
- cross-layer impact analysis: Scout → Mapper and Critic in parallel → Synthesizer → judge;
- patch planning after a proven failure: Mapper + Critic + patch planner → judge;
- release/device truth: no model may invent it; hand off to exact release or device evidence lane.

### B. Domain specialists and cognitive roles are separate axes

Do not create one permanent `SimCore model` or `Usage Dashboard model`. Instead represent assignment as two dimensions:

1. domain context package — which bounded repository knowledge and authority rules are supplied;
2. cognitive role — what operation the model is allowed to perform.

For example the same Mapper profile may work on Usage Dashboard and DevPass if both receive different bounded evidence packages. Conversely, a SimCore-specific specialist may be added later only if benchmarks prove that generic roles cannot handle a recurring SimCore contract.

This avoids creating a separate mini-agent stack for every repository feature.

### C. Shared evidence bus

Models should never pass unrestricted prose directly to one another. Every stage writes typed records into a shared evidence bus.

Core record families should be small and reusable:

- `SourceRef`: opaque block/line reference plus source digest;
- `Claim`: status + source refs + role provenance;
- `FlowEdge`: from/to + status + source refs;
- `Boundary`: preservation/risk claim + source refs;
- `Blocker`: unresolved reason + originating role;
- `PatchCandidate`: proposed mutation location, never implementation authority by itself;
- `ConflictRecord`: competing claims and their evidence.

Only records that pass deterministic validation enter the bus. Invalid model output is discarded or marked failed; it is not handed downstream as context.

### D. Models do not talk directly

No worker should see another worker's raw chain-of-thought or free-form answer. A downstream worker receives only:

- validated structured records;
- exact source refs required for its task;
- unresolved blockers/conflicts;
- its own role instruction.

This reduces error propagation, prompt growth, and correlated hallucination.

### E. Three execution lanes

The router should expose three practical paths.

#### Fast lane

For narrow tasks with strong deterministic evidence.

Typical shape:

```text
resolver -> one small role model -> validator
```

Goal: seconds/minimal compute.

#### Standard lane

For most repository analysis.

Typical shape:

```text
resolver -> Scout -> (Mapper || Critic) -> Synthesizer -> validator
```

Mapper and Critic run concurrently when possible.

#### Escalation lane

Used only when the standard lane leaves a material blocker or conflict.

Possible actions:

- call a stronger model only for the unresolved subproblem;
- call a second model family as a specialist critic;
- widen bounded evidence deterministically;
- return UNKNOWN;
- request real-device evidence when repository evidence cannot answer the question.

The system must not automatically escalate every task to the largest model.

### F. Capability registry instead of hard-coded model names

Maintain a repository-owned model capability table derived from benchmarks. Example conceptual fields:

```text
model_profile
model_digest
role
role_score
grounding_error_rate
unknown_preservation_rate
median_latency
peak_memory
completion_rate
license/access status
```

The router selects profiles from measured capability, not model branding.

A future result might legitimately choose:

- Qwen for source/flow extraction;
- Phi for contradiction and preservation criticism;
- Gemma for compact synthesis;

but the assignment is earned by benchmark evidence rather than assumed in advance.

### G. Confidence is evidence-derived, not model self-rating

Workers must not output arbitrary numerical confidence such as `0.91`. Confidence should be derived mechanically from observable conditions such as:

- all cited refs validated;
- required fields resolved;
- contradictory records present or absent;
- independent roles agree with compatible evidence;
- UNKNOWN/CONFLICT preserved;
- output completed within budget;
- source authority level.

Model agreement can be an input signal, but never authority by itself.

### H. Conflict resolution

If Mapper and Critic disagree, do not majority-vote. The deterministic judge should create a `ConflictRecord`.

Resolution order:

1. compare cited evidence and authority;
2. prefer stronger repository authority, not a preferred model;
3. if evidence resolves the disagreement, update the derived record;
4. if not, preserve `CONFLICT` or `UNKNOWN`;
5. optionally send only that conflict to an escalation specialist.

### I. Context and cache strategy

Repository size should be handled by reusable bounded context artifacts rather than repeatedly feeding the whole repository to every model.

Cacheable artifacts may include:

- authority plan;
- file/symbol locator index;
- bounded source windows;
- source-block hashes;
- validated intermediate role outputs.

Cache keys must include target repository SHA and relevant authority refs so stale evidence cannot silently survive repository changes.

### J. Compute budget controller

Each task receives a deterministic budget before execution:

- maximum number of model calls;
- maximum concurrent roles;
- per-role token budget;
- maximum escalation count;
- CPU time / runner class;
- model-size ceiling.

A task that exceeds the budget returns PARTIAL/UNKNOWN with blockers rather than spawning unlimited workers.

### K. Mutation boundary

Multi-model orchestration initially remains analysis-only.

Even after a future implementation role is introduced, models should produce a typed `PatchPlan`; repository mutation remains a separate deterministic transaction with ordinary tests, PR/CI, exact-head merge, and read-back verification.

No collection of model votes is permission to mutate or release.

## Recommended initial team topology

For the first implementation, keep the team deliberately small:

```text
Router/Validator: deterministic Python
Scout:            smallest proven local profile
Mapper:           best measured code/relationship profile
Critic:           best measured independent preservation profile
Synthesizer:      best measured compact structured-output profile
```

Do not add more roles until failure evidence requires them.

The first mechanical pilot can use the existing Qwen profiles for all roles purely to validate orchestration. After that, retrospective benchmarks can introduce one non-Qwen family at a time and replace individual roles only where measured results improve.

## Why this fits a large multifunction repository

This architecture scales by adding bounded domain context and measured role capability rather than adding one giant model prompt for every new repository feature.

When the repository gains a new plugin or infrastructure surface, the preferred change is:

1. register its authority/source locators;
2. define bounded evidence extraction;
3. reuse the existing Scout/Mapper/Critic/Synthesizer contracts;
4. add a specialist role only if repeated benchmark evidence proves a generic-role gap.

Therefore the orchestration grows mostly in repository knowledge and deterministic routing, not in the number of always-running models.

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
4. Add deterministic task router + evidence bus primitives.
5. Add a multi-job orchestration DAG using existing Qwen profiles as a mechanical pilot.
6. Add retrospective role benchmarks and compute-budget telemetry.
7. Add one non-Qwen family at a time with pinned license/access notes, GGUF artifact, revision, checksum, and CPU smoke test.
8. Assign models to roles only after measured role-specific comparison.
9. Freeze a brand-new prospective held-out and run the complete multi-model orchestration exactly once.

## Current decision

The project should explore role-specialized multi-model orchestration rather than requiring one small model to perform authority discovery, semantic mapping, preservation analysis, synthesis, and self-judgment in a single completion.

The preferred repository-scale architecture is a deterministic router and evidence bus controlling a small dynamic DAG of role-specialized local models. Models do not control routing, authority, mutation, or final verdicts.

No implementation is authorized by this document alone; it records the architecture and safety/provenance boundaries for a later implementation slice.