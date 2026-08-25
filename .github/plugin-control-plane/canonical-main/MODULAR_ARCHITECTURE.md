# Canonical Main Modular Architecture

Phase J converts the proven Phase A–I control plane into a modular single-writer architecture without changing release or product authority.

## Runtime flow

```text
read-only observers
→ immutable repository snapshot
→ pure domain derivation
→ bounded incident reconciliation
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
- `surfaces/`: pure Markdown rendering only.
- `modules/`: static audited observer registry; dynamic plugin loading is forbidden.
- `orchestrator/`: bounded side-effect sequencing and the single #305 write path.
- `rehearsal/`: isolated synthetic proof contract/client/cycle modules.

## Automatic split rule

`module-boundaries.json` is the durable architecture budget. `tests/module-architecture-contract.cjs` fails with `MODULE_SPLIT_REQUIRED` when a managed module exceeds its reviewed line budget or crosses a layer responsibility boundary. The normal repair is extraction/splitting before merge, not increasing the budget.

> If a canonical-main module becomes too large or mixes responsibilities, split or extract it as part of the same work before landing the change.

## Stable contracts

Correlation keys, severity, incident reuse, delivery keys, #305 vocabulary, bootstrap coverage, protection truthfulness, Gmail boundaries, and bounded main/release writer authority remain unchanged.

## Permissions

The live operations workflow remains `contents: read`, `actions: read`, `issues: write`. Observers and surfaces receive no ref mutation authority. Product/release writes remain owned by existing bounded writer/guard paths only.
