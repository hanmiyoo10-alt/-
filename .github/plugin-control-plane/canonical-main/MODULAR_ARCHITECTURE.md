# Canonical Main Modular Architecture

Phase J converts the proven Phase A–I control plane into a modular single-writer architecture without changing release or product authority.

## Runtime flow

```text
static capability registry
→ read-only observers
→ immutable repository snapshot
→ pure domain derivation
→ bounded incident reconciliation + consistency repair
→ pure surface rendering
→ one orchestrator
→ one #305 body PATCH
```

`orchestrator/refresh.cjs` is the only live owner of the `[repo-ops:main]` body. Compatibility entrypoints remain temporarily available but delegate to the orchestrator and do not implement independent GitHub clients or partial body writers.

## Module boundaries

- `core/`: pure schemas/reducers; no environment or network access.
- `infra/`: bounded GitHub/Actions/issue/file access.
- `observers/`: read-only evidence collection through injected infrastructure.
- `domains/`: side-effect-free repository rules and derivations.
- `surfaces/`: pure Markdown rendering only, including bounded incident transition history.
- `modules/`: static audited observer registry. Each observer declares its phase and bounded capabilities; dynamic plugin loading is forbidden.
- `orchestrator/`: bounded side-effect sequencing and the single #305 write path.
- `rehearsal/`: isolated synthetic proof contract/client/cycle modules.

## Automatic split and dependency rule

`module-boundaries.json` is the durable architecture budget. `tests/module-architecture-contract.cjs` rejects oversized modules, dependency cycles, forbidden managed-layer imports, and excessive fan-in/fan-out. Failures stay under the `MODULE_SPLIT_REQUIRED` contract with stable subcodes.

> If a canonical-main module becomes too large, cyclic, over-coupled, or mixes responsibilities, split or extract it as part of the same work before landing the change. Do not raise limits as the default repair.

## Incident durability

Incident issue labels and GitHub open/closed state remain the lifecycle truth used by the operator model. The orchestrator automatically repairs a stale body `State` field to that lifecycle truth. Normal OPEN/RECOVERED updates retain a bounded transition history and bounded prior event IDs, so recovery does not erase the failure footprint and repeated observations do not create unbounded issue bodies.

## Automatic steady state

Normal operation requires no user action. The operations workflow is driven by selected main events and an hourly self-healing schedule; `workflow_dispatch` is retained only as a break-glass diagnostic path and is not required for correctness, freshness, recovery, notification handoff, or #305 convergence. Workflow-run observation is restricted to `main`, while latest-wins concurrency remains enabled.

The durable policy is `operations.automationMode=event-plus-hourly-self-heal` and `operations.manualActionRequired=false`.

## Stable contracts

Correlation keys, severity, incident reuse, delivery keys, #305 vocabulary, bootstrap coverage, protection truthfulness, Gmail boundaries, and bounded main/release writer authority remain unchanged.

## Permissions

The live operations workflow remains `contents: read`, `actions: read`, `issues: write`. Observers and surfaces receive no ref mutation authority. Product/release writes remain owned by existing bounded writer/guard paths only.
