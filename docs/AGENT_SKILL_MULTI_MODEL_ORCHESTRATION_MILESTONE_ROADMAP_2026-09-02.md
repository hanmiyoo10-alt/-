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

## Milestone O0 — contracts, registries, and domain abstraction

### Entry conditions

O0 may begin only when:

- compact candidate wire v10 is merged and its existing validated single-model regression remains green;
- the O0 file layout and schemas are reviewed as design-only artifacts;
- no role execution code is included in the O0 implementation branch.

### Implementation scope

Add only the non-executing primitives:

- `tools/agent-skill-orchestrator/schemas/` typed records;
- model eligibility registry abstraction;
- domain registry abstraction;
- role contract metadata without runtime execution;
- deterministic serializers, validators, and digest helpers;
- README documenting analysis-only scope.

Required initial record families:

- `SourceRef`;
- `Claim`;
- `FlowEdge`;
- `Boundary`;
- `Blocker`;
- `ConflictRecord`;
- `RoleArtifact`;
- `OrchestrationReceipt`.

### Required tests

At minimum:

- JSON/schema round-trip tests;
- unknown fields rejected where fail-closed behavior is required;
- malformed/foreign source refs rejected;
- deterministic canonical serialization and digest tests;
- model registry rejects missing checksum/license/access eligibility metadata;
- domain registry rejects missing scope/authority/context ownership metadata;
- existing Agent Skill eval tests remain green;
- no model download or inference occurs in O0 tests.

### Exit gate

O0 is complete only if:

- registry/schema tests are deterministic on repeated runs;
- exact same input produces identical artifact digests;
- no product/runtime/release/scope bytes changed;
- current Usage Dashboard validated single-model lane remains unchanged;
- repository read-back confirms the new package is additive only.

### Rollback rule

Delete the new orchestrator package and leave `tools/agent-skill-eval/` untouched. No migration is allowed in O0.

---

## Milestone O1 — deterministic router, authority adapter, evidence bus

### Entry conditions

- O0 merged and main CI green;
- O0 receipt/record schemas are frozen at a named version;
- domain registry contains at least the validated Usage Dashboard adapter.

### Implementation scope

Implement deterministic-only control-plane logic:

- task normalization;
- scope/task-class routing;
- authority adapter over existing repository-owned evidence primitives;
- bounded evidence package construction;
- typed evidence bus;
- deterministic conflict creation;
- budget object creation;
- deterministic final judge over synthetic artifacts.

No local LLM invocation yet.

### Required tests

- router chooses deterministic-only/fast/standard/escalation lanes from synthetic requests;
- authority UNKNOWN remains UNKNOWN when repository evidence is absent;
- evidence package SHA changes when any authority-affecting input changes;
- invalid refs never enter the evidence bus;
- downstream records cannot silently delete upstream UNKNOWN/CONFLICT;
- conflicts are preserved rather than majority-resolved;
- budget exhaustion returns an explicit blocker;
- deterministic judge cannot accept model-authored `SUPPORTED` as authority;
- current single-model lane still passes unchanged.

### Exit gate

O1 is complete only if a full synthetic orchestration can run from normalized task to deterministic verdict with zero model calls and reproducible receipts.

### Rollback rule

Disable the orchestrator entrypoint. O0 schemas/registries may remain because they are inert.

---

## Milestone O2 — single-model multi-role mechanical pilot

### Entry conditions

- O1 merged and main CI green;
- role contracts for Scout, Mapper, Critic, and Synthesizer are versioned;
- output budgets are fixed before any pilot run;
- no new model family is introduced in this phase.

### Implementation scope

Use an existing proven Qwen profile for all roles to validate orchestration mechanics only.

Implement:

- normalized runtime adapter into existing llama.cpp zero-credit infrastructure;
- per-role prompt/contract composition;
- per-role artifact and receipt generation;
- sequential role DAG first;
- role-specific timeout/truncation classification;
- strict separation between raw model output and validated evidence-bus records.

### Required tests

Synthetic/mechanical tests must prove:

- Scout output cannot contain forbidden semantic flow fields;
- Mapper cannot self-resolve Critic blockers;
- Critic may emit UNKNOWN/CONFLICT without penalty from the validator;
- Synthesizer only receives validated typed upstream records;
- malformed role output is isolated and never forwarded;
- truncation produces `EXECUTION_INCOMPLETE`, not semantic FAIL;
- role receipts link upstream artifact SHA exactly;
- same immutable request and deterministic generation settings reproduce the same receipt graph where model determinism permits.

### Pilot acceptance evidence

Use retrospective/diagnostic cases only. The goal is not independent model quality proof.

Success means the role graph and handoff system work mechanically. It does not mean the orchestration is better than the single-model baseline yet.

### Exit gate

- all four role artifacts can be produced and validated;
- invalid one-role output is contained;
- final judge consumes only validated bus records;
- no role can mutate repository state;
- zero-hosted-AI receipt remains explicit.

### Rollback rule

Disable role runtime execution and return to O1 deterministic-only mode.

---

## Milestone O3 — parallel Mapper/Critic scheduling

### Entry conditions

- O2 merged and stable;
- sequential role receipts are reproducible enough for regression;
- compute budget profiles are versioned.

### Implementation scope

Introduce concurrency only where dependencies permit:

- Scout completes first when needed;
- Mapper and Critic run in separate jobs/workflow calls over the same frozen evidence package;
- Synthesizer waits for both validated artifacts or explicit failure state;
- root receipt records independent timing and artifact provenance.

Do not load multiple GGUF models into the same constrained runner simultaneously unless a later resource benchmark proves it safe.

### Required tests

- parallel jobs consume identical evidence SHA;
- ordering differences do not change deterministic merge semantics;
- one worker timeout does not corrupt the other worker artifact;
- cancellation/retry metadata is explicit;
- Synthesizer cannot start before required dependency state is known;
- wall-clock telemetry is recorded separately from summed CPU time;
- peak memory remains within runner policy.

### Exit gate

O3 is complete only if parallel execution is no less grounded than O2 and shows either measurable wall-clock benefit or a clear operational reason to retain concurrency.

### Rollback rule

Switch scheduler back to sequential O2 DAG without changing role contracts.

---

## Milestone O4 — retrospective multi-family role benchmark

### Entry conditions

- O3 stable;
- benchmark schema and scoring rules frozen before adding non-Qwen results;
- consumed/retired cases are explicitly labeled retrospective only.

### Implementation scope

Add one model family at a time with:

- exact model/revision identity;
- pinned GGUF artifact;
- SHA256 checksum;
- license/access status;
- llama.cpp compatibility smoke test;
- CPU memory/time telemetry.

Candidate families may include Gemma, Phi, Llama, and Mistral/Ministral-class models only after artifact provenance is validated.

Benchmark each model by role rather than end-to-end brand ranking.

### Role metrics

Scout:

- source selection precision/recall;
- invalid-ref rate;
- authority overclaim rate.

Mapper:

- material edge recovery;
- false-edge rate;
- source grounding rate.

Critic:

- missed-boundary recovery;
- false-blocker rate;
- UNKNOWN/CONFLICT preservation;
- optimistic-overclaim rate.

Synthesizer:

- validated-record preservation;
- compactness/completion rate;
- blocker/conflict preservation;
- forbidden new-claim rate.

Cross-cutting:

- latency;
- peak memory;
- completion rate;
- parse validity;
- token use.

### Required tests

- benchmark inputs immutable and hash-addressed;
- role scoring deterministic from stored artifacts;
- benchmark aggregation never alters product truth or scope validation;
- failed/incomplete runs are not silently excluded from model scores;
- model artifacts with mismatched checksums are rejected before inference.

### Exit gate

O4 ends with a measured capability table, not permanent role assignment.

### Rollback rule

Remove a model from eligibility while preserving benchmark evidence and checksums for auditability.

---

## Milestone O5 — measured role assignment and budget policy

### Entry conditions

- O4 contains at least two model families with comparable valid role evidence where practical;
- assignment algorithm and tie-break rules are frozen before a prospective case is chosen.

### Implementation scope

Implement deterministic role assignment from benchmark data plus runtime constraints.

Inputs may include:

- role score;
- grounding error rate;
- UNKNOWN preservation;
- completion rate;
- latency;
- peak memory;
- license/access eligibility;
- per-task budget ceiling.

No model selects itself or another model.

### Assignment rules

- quality thresholds precede latency optimization;
- a faster model cannot win if it violates grounding thresholds;
- Critic should prefer a different family from Mapper when benchmark quality remains above threshold and diversity measurably reduces correlated failures;
- ties resolve by deterministic documented rule;
- task-specific constraints may force a fallback profile.

### Required tests

- same benchmark registry and budget produce same assignment;
- ineligible model never selected;
- threshold failure results in no assignment/UNKNOWN rather than unsafe fallback;
- role assignment changes only when benchmark or policy version changes;
- assignment receipt records exact score/policy inputs.

### Exit gate

Freeze:

- model/role assignments;
- generation parameters;
- compute budget;
- escalation policy;
- success criteria;
- prospective-proof protocol.

After this freeze, O6 prospective case selection may begin.

### Rollback rule

Return to explicit static role assignment from the last known-good O4 benchmark snapshot.

---

## Milestone O6 — brand-new prospective orchestration proof

### Entry conditions

Before any model sees the case:

- choose a genuinely unseen scope/case;
- freeze source snapshot SHA;
- freeze bounded evidence/context profile;
- freeze success assertions;
- freeze role/model assignments from O5;
- freeze generation parameters and token budgets;
- freeze judge rules;
- record all of the above in repository evidence.

### Execution rule

Run the full orchestration exactly once for independent evidence.

Infrastructure failures before inference may be corrected only if the frozen semantic fixture, role assignments, prompts/contracts, and success assertions are unchanged; such corrections must be separately recorded. Once meaningful model output is observed, the case is consumed as independent evidence.

### Required evidence

- root orchestration receipt;
- all per-role receipts;
- exact model digests;
- source/evidence SHA;
- role artifact SHA chain;
- conflict/blocker records;
- deterministic final verdict;
- wall-clock and compute telemetry;
- comparison to best frozen single-model baseline.

### Success criteria

The orchestration must improve at least one material dimension without weakening grounding, for example:

- recover more material semantic edges/boundaries;
- reduce false SUPPORTED/DIRECT claims;
- preserve UNKNOWN/CONFLICT more reliably;
- complete within budget more reliably;
- reduce wall-clock through parallelism;
- provide substantially better failure localization.

A quality gain that comes from hidden answer injection, altered assertions, or post-result role reassignment does not count.

### Exit gate

Only a genuine prospective success permits movement to O7. A fail becomes diagnostic evidence; the case is retired and cannot be tuned then rerun as a fresh independent PASS.

### Rollback rule

Keep the orchestrator analysis-only and continue using the stable single-model lane for validated operations.

---

## Milestone O7 — validated analysis to PatchPlan bridge

### Entry conditions

- O6 prospective success recorded;
- no unresolved safety/provenance gaps in analysis orchestration;
- mutation remains explicitly disabled until this milestone begins.

### Implementation scope

Add a typed `PatchPlan` stage only.

PatchPlan may contain:

- target files/regions;
- intended invariant-preserving changes;
- required tests;
- known blockers;
- rollback notes;
- evidence refs.

PatchPlan must not directly write repository files.

### Required tests

- PatchPlan cannot reference files outside resolved scope without explicit cross-scope authority;
- UNKNOWN/CONFLICT propagates into plan blockers;
- PatchPlan with invalid refs is rejected;
- no repository write API is reachable from PatchPlan generation;
- existing branch/PR/CI/release pipeline remains the only mutation authority.

### Exit gate

O7 is complete only when a validated PatchPlan can be handed into the existing deterministic development transaction without giving the orchestration system direct mutation or release authority.

### Rollback rule

Disable PatchPlan export and retain analysis-only orchestration.

---

## Cross-phase release discipline

Every implementation milestone O0–O7 should follow the same repository transaction:

1. verify latest main and relevant baseline;
2. record design/acceptance criteria before implementation;
3. create a narrow branch;
4. implement only the current milestone;
5. run milestone-local tests plus full existing Agent Skill regression;
6. open PR;
7. require Agent Skills CI and relevant repository CI green;
8. merge exact tested head;
9. read back main materialization;
10. rerun the validated single-model regression when the milestone can affect eval/runtime behavior;
11. record receipts/results in the central evidence issue;
12. only then begin the next milestone.

Do not batch O0+O1+O2 into one PR. The point of the roadmap is to preserve independent rollback boundaries.

## Recommended PR slicing

Prefer at least one PR per milestone, and split further when risk is high:

- O0-A schemas + canonical serialization;
- O0-B model/domain registries;
- O1-A router/authority/evidence;
- O1-B bus/judge/budget;
- O2-A runtime adapter + Scout;
- O2-B Mapper/Critic/Synthesizer role contracts;
- O3 scheduling/workflow parallelism;
- O4 one PR per new model family plus benchmark aggregation;
- O5 deterministic assignment policy;
- O6 fixture/freeze PR before the first run, then evidence-only result recording;
- O7 PatchPlan schema/validator before any integration bridge.

## User-visible interaction policy

This program should not increase the amount of manual development work required from the user.

The system and ChatGPT should continue to own:

- source inspection;
- implementation;
- tests;
- PR/CI;
- merge/materialization;
- release preparation;
- artifact/receipt inspection.

The user should be called only when a claim requires actual device/runtime observation that repository evidence cannot provide.

## Current decision

The orchestration program is approved only as a staged design roadmap. No implementation begins until compact-wire v10 is completed and the O0 entry conditions are re-verified against current main.
