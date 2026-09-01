# Agent Skill Multi-Model Orchestration Implementation Blueprint — 2026-09-02

## Status

DESIGN_ONLY_NOT_IMPLEMENTED

This document translates `AGENT_SKILL_MULTI_MODEL_ROLE_ORCHESTRATION_DESIGN_2026-09-02.md` into a repository-level implementation blueprint. It does not authorize runtime, product, release, scope-promotion, or device changes.

The compact candidate wire v10 remains an independent prerequisite and should be completed before orchestration implementation begins.

## 1. Architectural objective

Build a local zero-hosted-AI repository intelligence runtime in which deterministic code owns:

- task routing;
- authority resolution;
- bounded evidence construction;
- model eligibility and role selection;
- artifact validation;
- conflict handling;
- compute budgets;
- mutation permissions;
- final verdict derivation.

Local models are bounded workers. They do not own authority, routing, release truth, mutation, or final verdicts.

## 2. Proposed repository layout

Prefer a new orchestration package adjacent to the existing Agent Skill evaluation tooling rather than embedding role logic into product plugins.

```text
tools/
  agent-skill-eval/
    ... existing single-model / zero-credit harness ...

  agent-skill-orchestrator/
    README.md
    __init__.py

    router.py
    authority.py
    evidence.py
    scheduler.py
    judge.py
    budget.py
    cache.py
    receipts.py

    schemas/
      task-request.schema.json
      source-ref.schema.json
      claim.schema.json
      flow-edge.schema.json
      boundary.schema.json
      blocker.schema.json
      conflict-record.schema.json
      patch-candidate.schema.json
      role-artifact.schema.json
      orchestration-receipt.schema.json

    roles/
      scout.py
      mapper.py
      critic.py
      synthesizer.py
      patch_planner.py        # disabled initially

    role-contracts/
      scout.json
      mapper.json
      critic.json
      synthesizer.json

    models/
      registry.json
      eligibility.py
      benchmark_scores.json

    domains/
      registry.json
      usage-dashboard.json
      simcore.json
      devpass.json
      termux-large-doc-editor.json
      voyage-token-check.json

    runtime/
      llama_cpp.py
      local_server.py
      generation.py

    benchmarks/
      role_cases.json
      score_role_output.py
      aggregate_role_scores.py

    tests/
      test_router.py
      test_authority.py
      test_evidence.py
      test_role_contracts.py
      test_evidence_bus.py
      test_conflicts.py
      test_budget.py
      test_cache.py
      test_receipts.py
      test_model_registry.py
      test_scheduler.py
```

Do not move the current stable `tools/agent-skill-eval/` implementation into this package at first. The new orchestrator should consume proven primitives through narrow adapters and preserve the current single-model lane as a regression baseline.

## 3. Control plane components

### 3.1 `router.py`

Input: normalized task request.

Output: deterministic `ExecutionPlan`.

Responsibilities:

- resolve task class;
- resolve target scope;
- choose authority class;
- select execution lane: deterministic-only, fast, standard, or escalation;
- select required roles;
- define dependency DAG;
- assign initial compute budget;
- forbid unsupported mutation/release/device claims.

The router should not use an LLM in the first implementation.

Conceptual output:

```json
{
  "scope": "plugin:usage-dashboard",
  "task_class": "impact_analysis",
  "lane": "standard",
  "roles": ["scout", "mapper", "critic", "synthesizer"],
  "parallel_groups": [["mapper", "critic"]],
  "authority_profile": "usage-dashboard-current",
  "budget_profile": "standard-cpu"
}
```

### 3.2 `authority.py`

Owns repository truth selection before model calls.

It should resolve:

- target repository SHA;
- release branch/tag when applicable;
- frozen prospective source snapshot when applicable;
- generated artifact authority;
- device-only truth markers;
- UNKNOWN when no source authority exists.

Models cannot replace this result.

### 3.3 `evidence.py`

Builds bounded immutable evidence packages.

Each block receives:

- opaque `S#` id;
- repository path;
- exact source SHA;
- line range;
- content digest;
- authority class.

The evidence builder should support compact line references such as `S4@L18` once compact-wire v10 is proven.

### 3.4 `scheduler.py`

Executes the role DAG.

Rules:

- only launch dependencies whose upstream artifacts are valid;
- run Mapper and Critic concurrently when they share the same validated evidence package;
- never pass raw free-form output between roles;
- reject downstream execution when upstream required artifacts are invalid;
- invoke escalation only for unresolved material blockers/conflicts.

### 3.5 `judge.py`

Final deterministic authority for analysis verdicts.

Derive one of:

- `SUPPORTED`;
- `PARTIAL`;
- `UNKNOWN`;
- `CONFLICT`;
- `EXECUTION_INCOMPLETE`;
- `INVALID`.

The judge must not consume model self-confidence or model-authored final verdict as authority.

## 4. Evidence bus

The evidence bus is not a chat transcript. It is a set of validated typed records.

Recommended records:

### `SourceRef`

```json
{
  "ref": "S4@L18",
  "source_sha": "...",
  "block_digest": "..."
}
```

### `Claim`

```json
{
  "id": "claim-17",
  "kind": "preservation",
  "status": "SUPPORTED_LIKELY",
  "value": "request identity unchanged",
  "refs": ["S4@L18"],
  "role": "critic",
  "role_artifact_sha": "..."
}
```

### `FlowEdge`

```json
{
  "from": "producer",
  "to": "consumer",
  "status": "SUPPORTED_LIKELY",
  "refs": ["S2@L11", "S5@L8"]
}
```

### `Blocker`

```json
{
  "kind": "missing_evidence",
  "subject": "release impact",
  "origin_role": "critic"
}
```

### `ConflictRecord`

```json
{
  "subject": "disk persistence",
  "left_claim": "claim-21",
  "right_claim": "claim-33",
  "resolution": "UNRESOLVED"
}
```

Only validated records enter the bus.

## 5. Role contracts

### Scout

Allowed operations:

- select relevant source refs;
- identify authority candidates already supplied;
- return UNKNOWN/CONFLICT markers.

Forbidden:

- semantic flow invention;
- release truth invention;
- patch planning.

### Mapper

Allowed operations:

- propose semantic owners;
- propose producer/state/consumer edges;
- cite supplied refs.

Forbidden:

- silently resolving critic blockers;
- declaring release/device truth.

### Critic

Allowed operations:

- search for missing boundaries;
- challenge Mapper claims;
- emit blockers;
- preserve UNKNOWN/CONFLICT;
- identify test/security/lifecycle/I/O gaps.

The Critic should be rewarded for justified incompleteness, not optimism.

### Synthesizer

Input only:

- validated evidence-bus records;
- unresolved blockers/conflicts;
- compact source refs when needed.

It must not see raw upstream model prose.

Output:

- narrowest impact map;
- no self-authored final verdict authority.

## 6. Model registry

`models/registry.json` should contain artifact and execution eligibility only.

Example fields:

```json
{
  "profile_id": "qwen25-3b-q5-k-m",
  "family": "qwen",
  "artifact_url": "...",
  "revision": "...",
  "sha256": "...",
  "license_status": "verified",
  "llama_cpp_compatible": true,
  "cpu_smoke": true,
  "max_context": 8192,
  "enabled": true
}
```

Role quality does not belong in this static registry.

`models/benchmark_scores.json` should separately contain measured role performance.

Model assignment must be derived from benchmark data plus runtime constraints, never brand reputation alone.

## 7. Domain packages

A domain package supplies repository knowledge without creating a domain-specific model.

Conceptual fields:

```json
{
  "scope": "plugin:usage-dashboard",
  "authority_profile": "usage-dashboard-current",
  "owning_paths": ["plugins/usage-dashboard/"],
  "release_branch": "release-usage-dashboard",
  "context_profile": "usage-dashboard",
  "device_truth_required_for": ["live_acceptance"]
}
```

Adding a new plugin should usually require a new domain package, not a new permanent model role.

## 8. Runtime adapters

The orchestrator should not embed model-family-specific logic in roles.

Define one runtime interface:

```text
run_role(
  model_profile,
  role_contract,
  evidence_package,
  upstream_records,
  generation_profile
) -> RawRoleExecution
```

`runtime/llama_cpp.py` handles llama.cpp details.

All role code operates on normalized request/response envelopes.

This permits Qwen, Gemma, Phi, Llama, or Mistral-family GGUFs to compete for the same role without rewriting role logic.

## 9. Compute budget controller

`budget.py` owns resource limits.

Suggested initial profiles:

### fast-cpu

- 1 model call;
- no escalation;
- smallest eligible model;
- short output contract.

### standard-cpu

- Scout;
- Mapper and Critic in parallel;
- Synthesizer only after valid upstream records;
- at most 4 role calls;
- at most 1 escalation.

### diagnostic-cpu

- retrospective only;
- multiple model families allowed;
- detailed telemetry;
- never treated as prospective proof automatically.

If the budget is exhausted, the result becomes `PARTIAL`/`UNKNOWN` with explicit blockers.

## 10. Cache design

Cache keys must include all authority-affecting inputs.

Minimum key dimensions:

```text
repository_sha
authority_profile
scope
context_profile
evidence_builder_version
role_contract_version
model_profile + model_digest
upstream_artifact_sha
```

Safe initial cache targets:

- authority resolution;
- bounded evidence packages;
- validated role artifacts on identical immutable inputs.

Never reuse cache across repository SHA changes unless the cache layer can prove all source inputs are unchanged.

## 11. Receipt tree

Every orchestration run should create one root receipt and one receipt per role.

Example:

```text
orchestration-receipt.json
roles/
  scout/receipt.json
  mapper/receipt.json
  critic/receipt.json
  synthesizer/receipt.json
artifacts/
  evidence.json
  bus.json
  conflicts.json
  final-verdict.json
```

Root receipt should contain:

- target repository SHA;
- authority profile;
- evidence digest;
- execution plan digest;
- role/model assignments;
- generation parameters;
- every role artifact SHA;
- wall-clock latency per role;
- CPU/model download/runtime metadata;
- final deterministic verdict;
- escalation history.

## 12. GitHub Actions shape

Do not load several models into one runner simultaneously.

Preferred standard lane:

```text
resolve
  |
  v
build-evidence
  |
  v
scout
  |
  +------ mapper -------+
  |                     |
  +------ critic -------+
                        |
                        v
                     synthesize
                        |
                        v
                       judge
```

Mapper and Critic should be separate jobs or reusable workflow calls with artifacts as handoffs.

A future model-role benchmark should use a matrix:

```text
role x model_profile x retrospective_case
```

and aggregate scores only after all receipts validate.

## 13. Failure containment

A failed worker must not poison the entire evidence bus.

Examples:

- Scout invalid output -> stop dependent semantic roles if required evidence selection is unavailable.
- Mapper timeout -> Critic artifact may remain valid, but final verdict cannot become SUPPORTED if Mapper is required.
- Critic invalid source ref -> discard invalid Critic record; do not hand it to Synthesizer.
- Synthesizer truncation -> preserve validated upstream records and return EXECUTION_INCOMPLETE.
- model download/checksum failure -> infrastructure failure, not semantic failure.

Retain partial valid evidence for diagnostics, but never promote incomplete execution to success.

## 14. Conflict policy

Conflict is a first-class artifact, not an error to hide.

When roles disagree:

1. validate both claims independently;
2. compare repository authority of cited refs;
3. mechanically resolve only when authority/evidence is decisive;
4. otherwise emit `CONFLICT`;
5. optionally route that one conflict to an escalation specialist;
6. if still unresolved, stop with `CONFLICT` or `PARTIAL`.

No majority vote.

## 15. Mutation bridge

Initial orchestration is analysis-only.

Future implementation path:

```text
validated analysis
    -> PatchPlan
    -> deterministic mutation transaction
    -> tests
    -> PR
    -> CI
    -> exact-head merge
    -> main read-back
    -> release pipeline
    -> device acceptance when required
```

`PatchPlan` is advice, not authority.

The existing repository development/release workflow remains the authority for mutation and deployment.

## 16. Observability

Track telemetry per role and per model:

- prompt bytes/tokens;
- completion bytes/tokens;
- finish reason;
- parse validity;
- source-ref validity;
- UNKNOWN preservation;
- blocker precision;
- semantic benchmark score;
- latency;
- peak memory when available;
- cache hit/miss;
- escalation rate.

This allows role assignment to improve based on measured behavior.

## 17. Benchmark program

Retired/consumed cases such as SimCore, Termux, Voyage, and DevPass may be reused for retrospective role benchmarks.

They must never be relabeled as new independent prospective proof.

Benchmark dimensions should be role-specific:

- Scout: source selection precision/recall;
- Mapper: material semantic edge recovery and false-edge rate;
- Critic: missed-boundary recovery, false blocker rate, UNKNOWN preservation;
- Synthesizer: compact completeness and preservation of validated upstream records.

The benchmark output updates role scores, not product truth.

## 18. Minimal viable implementation phases

### Phase O0 — interfaces only

- add schemas;
- add model registry abstraction;
- add domain package abstraction;
- no multi-model execution.

### Phase O1 — deterministic router and evidence bus

- router;
- authority adapter;
- evidence builder adapter;
- typed bus;
- validator;
- all synthetic tests.

### Phase O2 — single-model multi-role mechanical pilot

Use existing proven Qwen profiles for every role.

Goal: validate orchestration mechanics, not model diversity.

### Phase O3 — parallel Mapper/Critic

Split jobs and prove artifact handoff/provenance.

Measure wall-clock and resource behavior.

### Phase O4 — retrospective role benchmark

Introduce multiple allowlisted model families one at a time.

No prospective claims yet.

### Phase O5 — role assignment from measured scores

Freeze winning role/model assignments and budget policy.

### Phase O6 — new prospective held-out

Select a brand-new unseen scope/case after all assignments and success criteria are frozen.

Run the complete orchestration exactly once for independent evidence.

### Phase O7 — analysis-to-PatchPlan bridge

Only after O6 succeeds without weakening grounding.

Still no automatic repository mutation.

## 19. Acceptance gates

Do not progress to the next phase unless the previous phase proves:

- all receipts deterministic and hash-linked;
- invalid refs fail closed;
- UNKNOWN/CONFLICT cannot disappear silently;
- current single-model validated lane remains green;
- no product/runtime/release/scope bytes changed unintentionally;
- zero-hosted-AI property preserved;
- compute budget enforced;
- truncation remains distinguishable from semantic failure.

## 20. First implementation slice recommendation

After compact-wire v10 is complete, the safest first orchestration code slice is O0 only:

1. `schemas/` typed records;
2. `models/registry.json` abstraction over the existing Qwen profiles;
3. `domains/registry.json` with Usage Dashboard as the first validated domain adapter;
4. deterministic schema/registry tests;
5. no new model downloads;
6. no role execution;
7. no scope promotion.

This produces infrastructure with nearly zero semantic blast radius.

## 21. Long-term shape

The repository should converge toward:

```text
Repository Authority
       |
       v
Deterministic Router
       |
       v
Bounded Evidence
       |
       v
Role-specialized local models
       |
       v
Validated Evidence Bus
       |
       v
Deterministic Judge
       |
       +--> answer / analysis
       +--> PatchPlan
       +--> UNKNOWN / CONFLICT / device evidence request
```

The system scales primarily by adding domain knowledge, source locators, and measured model capabilities. It should not scale by continuously adding always-running agents or ever-larger prompts.

## Current decision

Keep the orchestration design analysis-only and additive. Finish compact-wire v10 first. Then implement O0 as the smallest mechanical slice while preserving the current validated single-model lane as the baseline and rollback path.
