# Agent Skill Orchestrator

This package is being introduced incrementally under the O0–O7 roadmap.

## Current stage: O1-A deterministic routing

O0 established typed interchange contracts, deterministic canonical JSON serialization/SHA-256 helpers, and metadata registries. O1-A adds an **inert deterministic router** from a normalized typed task request to an execution plan. It still does **not** execute or download models, resolve repository authority, build evidence, judge results, mutate repository content, release software, or claim device truth.

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
- `router.py` currently supports exactly three task kinds:
  - `release_lookup` → deterministic-only, no model roles
  - `source_locator` → fast, Scout only
  - `impact_analysis` → standard, Scout → (Mapper || Critic) → Synthesizer
- Mutation requests, device-truth requests, unknown scopes, and release lookups without registered release-branch authority fail closed.
- Plans deliberately contain no model profile assignment. `model_selection` remains `deferred_to_later_phase`, and O1-A has no verdict authority.

Model-role benchmarking/assignment, authority resolution, evidence packaging, role execution, judging, and mutation remain deferred to later milestones.
