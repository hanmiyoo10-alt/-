# Agent Skill Orchestrator

This package is being introduced incrementally under the O0–O7 roadmap.

## Current stage: O0 contracts and registries

O0 remains inert. It defines typed interchange contracts, deterministic canonical JSON serialization/SHA-256 helpers, and metadata registries. It does **not** execute or download models and it does not route tasks, resolve repository authority, build evidence, schedule roles, judge results, mutate repository content, release software, or claim device truth.

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

The validator intentionally supports only the closed JSON-Schema subset used by these O0 contracts. Local `$ref` resolution is limited to sibling schema filenames. Opaque source citations use `S#@L#`; when validating a role artifact, callers must supply the set of source references actually present in the bounded evidence package so unknown refs fail closed.

### O0-B registries

- `models/registry.json` projects only model profiles already allowed by the current zero-credit lane. It records pinned artifact identity/checksum plus license/access provenance. It contains no role-quality score.
- `domains/registry.json` initially projects only the durable Local Usage Dashboard project metadata. Registering a domain explicitly does **not** promote Agent Skill validation scope.
- `roles/metadata.json` defines Scout, Mapper, Critic, and Synthesizer boundaries. Roles cannot self-award verdicts, mutate repository state, consume raw upstream prose, or bind themselves to a model profile in O0.
- `registry.py` validates registry shape/uniqueness and derives a deterministic registry digest. Eligibility is metadata-only; it does not download or execute a model.

Model-role benchmarking and assignment are intentionally deferred to later milestones. O0-B does not claim that one model family is better at a role than another.
