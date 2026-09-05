# Repository Architecture Snapshot

> Generated durable snapshot of canonical-main control-plane configuration. Live operational health remains on #305.

## Canonical integration

- Branch: `main`
- Native branch protection: `NOT_ENFORCED`
- Required status-check enforcement: `off`
- Required target: `simcore-ci.yml / Required`
- Shared main writer: `scripts/repo-main-write.py`

## Operator model

- Public states: `CLEAR / ATTENTION / INCIDENT / UNKNOWN`
- Event adapters complete: `true`
- Convergence budget: `300s`
- Flap threshold: `3`

## Notification bridge

- Channel(s): `email`
- Delivery bridge: `chatgpt-github-gmail-condition-watch`
- Bridge state: `ACTIVE_PROVEN`

## Documentation stream

- Live issue: #440 `[repo-docs:main]`
- Event classes: `DECISION`, `CHANGE`, `INCIDENT`, `RECOVERY`, `AUTHORITY`, `PROJECT`
- Durable promotion: branch/PR + explicit CI dispatch; exact-head merge only when base main is unchanged.
- Generated commits are filtered with `[repo-docs-generated]` to prevent recursive documentation.

## Registered projects/products (6)

- Source: `.github/plugin-control-plane/registry.json`
- Detailed durable view: `docs/REPO_PROJECT_CATALOG.md`

## Main-writer inventory

- `simcore-release-state-sync.yml` — `active`
- `simcore-r2-7-status-projection.yml` — `active`
- `product-simcore-terminal-convergence-r2-8.yml` — `active`
- `product-simcore-candidate-materialize.yml` — `active`
- `usage-dashboard-project-memory.yml` — `active`
- `simcore-release-command.yml` — `legacy-dormant`
- `repo-main-write-coordination-migration.yml` — `one-shot-migration`
