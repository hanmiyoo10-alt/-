# Agent Skill Orchestrator O4-E Scout Authority/Ref Schema Validation — 2026-09-03

## Status

`IMPLEMENTATION_READY / DIAGNOSTIC_ONLY`

## Fresh authority

- implementation base: `main@3b57b9dd6ea536db248576e97fe2fe342d303786`
- O4-D historical diagnostic replay remains immutable
- O4-D predecessor summary canonical SHA256: `24474cca92045afc8590dd828927b0ab62f7db657b4671603d9d3aa496960171`
- evidence-aware Scout generation schema implementation is already merged on `main` via PR #1364

The earlier `feat/agent-skill-orchestrator-o4e-authority-schema-validation-20260903` staging branch and the later r2 generator branch are staging evidence only. O4-E implementation is restaged from fresh current `main` so unrelated later main advances are preserved.

## Problem proven by O4-D

O4-D closed the first observed generation-schema gap (`k=s` source-selection value), but Qwen exposed a second grammar/validator gap: a `k=a` authority record could select references belonging to different supplied authority classes while presenting one authority-class value.

The merged evidence-aware schema now derives authority branches from the supplied `EvidencePackage`: each authority-class branch fixes `v` to one supplied class and restricts `r` to references whose supplied `authority_class` matches that class. This repair needs a new live measurement identity. O4-D must not be rerun or rewritten.

## O4-E measurement identity

- matrix id: `o4e-scout-authority-schema-validation-v1`
- branch family: `agent-skill-o4e-request/**`
- historical case/evidence/prompt/model/runtime/generation/scoring remain the same as the frozen O4-C/O4-D diagnostic case
- response-schema canonical SHA256 must be derived from the exact supplied `EvidencePackage` and bound into the O4-E manifest before any inference
- O4-E records the O4-D predecessor summary SHA above as explicit provenance

## Frozen invariants

1. O4-C and O4-D artifacts/results are immutable and are not reclassified.
2. O4-E reuses the same historical case, so it is diagnostic-only and is not an independent capability sample for O5.
3. Qwen executes at most once and Ministral executes at most once for the O4-E measurement identity.
4. Hosted-AI/model-API calls remain exactly zero; execution uses the pinned local CPU lane.
5. Terminal `INVALID` / incomplete model evidence is preserved rather than retried, fabricated, or silently discarded.
6. The response schema is evidence-aware generation hardening only. The historical static Scout schema remains unchanged.
7. No winner, rank, permanent role assignment, O5 entry, model recommendation, or production binding may be derived automatically from O4-E.
8. No plugin/product/runtime/release/device bytes or `PILOT_VALIDATED_SCOPES` change.
9. O4-E request resolution remains fail-closed: exactly one newly added request JSON file, exact branch family, exact target-parent binding, and no unrelated changed paths.
10. Ordinary Agent Skills CI performs only mechanical schema/workflow/regression validation; it does not download or invoke models.

## Implementation slice

Add only the O4-E diagnostic harness derived from the already-proven O4-D structure:

- `tools/agent-skill-orchestrator/benchmarks/resolve_o4e_request.py`
- `tools/agent-skill-orchestrator/benchmarks/run_o4e_scout_cell.py`
- `tools/agent-skill-orchestrator/benchmarks/run_o4e_scout_schema_validation.py`
- `tools/agent-skill-orchestrator/tests/test_o4e_scout_schema_validation.py`
- `.github/workflows/agent-skill-orchestrator-o4e-scout-schema-validation.yml`
- Agent Skills CI path coverage for the new workflow

The O4-E cell/matrix must use `scout_response_schema_for_evidence(evidence)` while O4-C/O4-D historical runners remain on the static schema builder.

## Pre-implementation generator evidence

A temporary staging-only generator produced the bounded O4-E payload and ran focused regressions before this clean materialization:

- generator run: `33744672206`
- O4-E harness regressions: `7/7 PASS`
- evidence-aware Scout schema regressions: `8/8 PASS`
- total focused regressions: `15/15 PASS`
- exported artifact: `o4e-generated-payload-33744672206`, id `9889119437`
- GitHub artifact ZIP SHA256: `3c3dcf3df5b2ec0d080274d5253183f76162cf4dc24e35a4098b6a7cd5a0eabd`
- inner payload tar SHA256: `b8c662771ffe1a5e5e486a6ae0df387c226014d791dff9a84e0741ed2c00a172`
- exported payload contains exactly six final files and no temporary generator/control or bytecode files

This staging evidence does not replace PR/full CI. It only proves the generated implementation slice passed its focused mechanical checks before being materialized on fresh `main`.

## Acceptance / exit gate

O4-E implementation may merge only after:

1. focused O4-E + evidence-aware schema regressions pass;
2. full Agent Skills CI passes;
3. SimCore required regression remains green;
4. exact tested head is merged;
5. merged-main read-back confirms the intended six implementation files plus this design record and no temporary staging surface;
6. one new O4-E request is frozen against the exact merged-main parent and the one-shot workflow executes;
7. artifact/provenance read-back is recorded before interpreting the diagnostic result.

A live `HARDENING_VALIDATED` result would validate this generation hardening only. It would still not authorize O5. Any new observed schema/validator gap is recorded as diagnosis and receives a new measurement identity rather than rerunning O4-E.
