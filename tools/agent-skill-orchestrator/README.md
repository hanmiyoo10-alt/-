# Agent Skill Orchestrator

This package is being introduced incrementally under the O0–O7 roadmap.

## Current slice: O0-A only

O0-A is inert. It defines typed interchange contracts plus deterministic canonical JSON serialization and SHA-256 helpers. It does **not** execute or download models and it does not route tasks, resolve repository authority, build evidence, schedule roles, judge results, mutate repository content, release software, or claim device truth.

The existing `tools/agent-skill-eval/` lane remains the stable baseline and rollback path.

### Contracts

- `source-ref.schema.json`
- `claim.schema.json`
- `flow-edge.schema.json`
- `boundary.schema.json`
- `blocker.schema.json`
- `conflict-record.schema.json`
- `role-artifact.schema.json`
- `orchestration-receipt.schema.json`

The validator intentionally supports only the closed JSON-Schema subset used by these O0 contracts. Local `$ref` resolution is limited to sibling schema filenames. Opaque source citations use `S#@L#`; when validating a role artifact, callers must supply the set of source references actually present in the bounded evidence package so unknown refs fail closed.
