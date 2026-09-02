# Agent Skill Orchestrator

This package is being introduced incrementally under the O0–O7 roadmap.

## Current stage: O1-A router, authority, bounded evidence

O0 established typed interchange contracts, deterministic canonical JSON serialization/SHA-256 helpers, and metadata registries. O1-A now provides an **inert deterministic control plane** from a normalized typed task request through routing, explicit repository-authority adaptation, and bounded immutable evidence packaging. It still does **not** execute or download models, run role workers, merge a typed bus, judge results, spend a compute budget, mutate repository content, release software, or claim device truth.

The existing `tools/agent-skill-eval/` lane remains the stable baseline and rollback path.

### O0-A contracts

- `source-ref.schema.json`
- `claim.schema.json`
- `flow-edge.schema.json`
- `boundary.schema.json`
- `blocker.schema.json`
- `conflict-record.schema.json`
- `role-artifact.schema.json`
- `orchestration-receipt.schema.json`

The validator intentionally supports only the closed JSON-Schema subset used by these contracts. Local `$ref` resolution is limited to sibling schema filenames. Opaque source citations use `S#@L#`; when validating a role artifact, callers must supply the set of source references actually present in the bounded evidence package so unknown refs fail closed.

### O0-B registries

- `models/registry.json` projects only model profiles already allowed by the current zero-credit lane. It records pinned artifact identity/checksum plus license/access provenance. It contains no role-quality score.
- `domains/registry.json` initially projects only the durable Local Usage Dashboard project metadata. Registering a domain explicitly does **not** promote Agent Skill validation scope.
- `roles/metadata.json` defines Scout, Mapper, Critic, and Synthesizer boundaries. Roles cannot self-award verdicts, mutate repository state, consume raw upstream prose, or bind themselves to a model profile.
- `registry.py` validates registry shape/uniqueness and derives a deterministic registry digest. Eligibility is metadata-only; it does not download or execute a model.

### O1-A typed routing

- `task-request.schema.json` defines the normalized control surface. Free-form `intent` is carried only as request provenance; the router does not parse it to decide topology.
- `execution-plan.schema.json` defines the inert plan contract and binds the request, domain registry, and role registry by canonical SHA-256.
- `router.py` supports exactly three task kinds:
  - `release_lookup` → deterministic-only, no model roles
  - `source_locator` → fast, Scout only
  - `impact_analysis` → standard, Scout → (Mapper || Critic) → Synthesizer
- Mutation requests, device-truth requests, unknown scopes, and release lookups without registered release-branch metadata fail closed.
- Plans deliberately contain no model profile assignment. `model_selection` remains `deferred_to_later_phase`, and O1-A has no verdict authority.

### O1-A authority adaptation

- `authority-observation.schema.json` is the typed input boundary for deterministic repository observations supplied by trusted repository tooling. `authority.py` itself performs no network or model access.
- `authority-snapshot.schema.json` records the exact target repository SHA, domain-registry digest, every declared domain authority ref, and deterministic `OBSERVED` / `MISSING` / `UNKNOWN` state.
- `OBSERVED` requires an exact source SHA. `MISSING` cannot carry one. Omitted observations become `UNKNOWN` rather than guessed defaults.
- UNKNOWN/MISSING authority is preserved as a deterministic blocker. Snapshot status and blockers are derived and revalidated; models cannot promote authority.

### O1-A bounded evidence

- `evidence-source-input.schema.json` defines explicit repository source blocks supplied to the builder.
- `evidence-package.schema.json` binds the execution-plan digest, authority-snapshot digest, domain-registry digest, target repository SHA, bounded source blocks, and preserved authority blockers.
- `evidence.py` admits only paths allowed by registered domain metadata: the primary source root, exact guidelines path, exact manifest/artifact paths, and descendants of registered release-spec directories.
- Absolute, traversing, non-canonical, and out-of-domain paths fail closed.
- Explicit manifest/artifact/release-spec evidence requires the corresponding authority to be `OBSERVED` and its source SHA to match. Primary/guidelines evidence must match the target repository SHA.
- Blocks are deterministically sorted and assigned opaque `S#` IDs; refs reuse the existing `S#@L#` contract. `block_digest` is SHA-256 of the exact UTF-8 content bytes.
- Evidence is bounded to 64 source blocks, 20,000 characters per block, and 120,000 characters total; overlapping blocks for one path are rejected.

O1-B typed bus, deterministic conflict creation, budget accounting, synthetic judging, role execution, model-role benchmarking/assignment, scheduling, runtime adapters, and mutation remain deferred to later milestones.
