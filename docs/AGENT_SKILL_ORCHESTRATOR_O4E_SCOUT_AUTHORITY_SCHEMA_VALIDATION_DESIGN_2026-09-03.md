# Agent Skill Orchestrator O4-E Scout Authority Schema Validation Design — 2026-09-03

## Status

**DESIGN READY — IMPLEMENTATION AUTHORIZED**

Tracking: issue #1120

Predecessors:

- O4-C historical Scout service-tier-fidelity benchmark;
- source-selection generation-schema hardening, PR #1362;
- O4-D diagnostic replay, run `33656712799`, evidence comment `5513450905`;
- evidence-aware authority/ref generation-schema hardening, PR #1364, merge `8320ddc44ed133e58d060bacdc434b48da50a87b`, closure comment `5513589640`.

## Purpose

O4-E is a **diagnostic replay** that validates the second observed Scout generation-schema hardening: authority records must only select refs whose supplied `authority_class` matches the authority value.

It intentionally reuses the exact historical O4-C/O4-D retrospective case so that the only intended execution-input change is the structured-generation schema. Because the case was used to diagnose and design the hardening, O4-E is not an independent capability sample and must never be pooled with O4-C/O4-D for ranking or O5 assignment.

## Frozen inputs

Reuse without modification:

- case `o4c-scout-service-tier-fidelity-v1`;
- EvidencePackage SHA `06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97`;
- fixture SHA `196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f`;
- prompt bytes produced by existing `build_scout_prompt()`;
- Qwen profile `qwen2.5-3b-instruct-q4_k_m`;
- Ministral profile `ministral-3-3b-instruct-2512-q4_k_m`;
- llama.cpp release/source/artifact identity already pinned by O4-D;
- Scout generation settings (`temperature=0`, seed 42, `n_predict=768`, `ctx_size=16384`, four CPU threads, zero GPU layers);
- O4-A scoring policy and expected labels.

The historical/static `scout_response_schema()` is not used for O4-E generation and is not modified.

## Intended changed input

O4-E must construct:

```python
scout_response_schema_for_evidence(evidence_package)
```

from the exact frozen EvidencePackage and bind its canonical SHA256 in the matrix manifest **before any model inference**.

That SHA is an execution-input identity. The workflow must copy the exact schema JSON into the uploaded artifact so an independent reader can recompute it.

## Execution contract

Run exactly two independent local Scout cells in this order:

1. Qwen2.5 3B — exactly one model request;
2. Ministral 3B — exactly one model request.

Each cell:

- uses the same prompt/case/evidence/runtime/generation inputs;
- uses the O4-E evidence-aware schema;
- receives a benchmark-only HTTP request timeout of 1800 seconds;
- records model-call count 1 and hosted-AI count 0;
- writes canonical result, score, receipt, raw response, and server log evidence;
- treats `COMPLETED` and `INVALID` as terminal evidence and returns successfully to orchestration so the second cell is never skipped because the first model is invalid;
- fails closed only on infrastructure/runner failure that prevents a canonical terminal row.

No retry is allowed for a terminal `INVALID` row.

## Trigger contract

Use a bounded one-shot request-commit trigger, analogous to O4-D but with a new identity:

- branch namespace: `agent-skill-o4e-request/**`;
- request path: `.agent-skill-o4e-requests/*.json`;
- request commit has exactly one parent;
- adds exactly one request JSON and changes no other path;
- `target_repository_sha` equals the request commit parent;
- target must be an ancestor of current `main`;
- workflow permissions remain `contents: read`;
- credentials for Hugging Face/model APIs must be absent;
- inference uses public unauthenticated downloads and local GitHub-hosted CPU only.

The request-control commit itself is not part of the evaluated repository state.

## Matrix identity

Use a new matrix identity, e.g.

`o4e-scout-authority-schema-validation-v1`.

The matrix manifest binds at minimum:

- source case/fixture/evidence identity;
- target repository SHA;
- role contract id;
- prompt SHA256;
- **evidence-aware response-schema SHA256**;
- runtime identity;
- generation parameters;
- exact ordered model profile list;
- timeout 1800 seconds;
- local-model call ceiling 2;
- hosted-AI call ceiling 0;
- explicit `diagnostic_replay=true` and a pointer to O4-D as predecessor evidence.

Winner/ranking/assignment/tie-break fields are forbidden.

## Aggregation

Aggregate both canonical terminal rows deterministically.

The O4-E diagnostic hardening verdict is:

- `HARDENING_VALIDATED` only when **both** rows have `parse_valid=true` and `contract_valid=true`;
- otherwise `HARDENING_NOT_VALIDATED`.

This verdict means only whether the second schema gap was closed for this repeated historical diagnostic case. It is not a model recommendation.

Aggregate must preserve:

- execution status;
- parse/contract validity;
- result/score hashes;
- semantic metrics where a row is scorable;
- telemetry;
- response-schema SHA;
- exact local/hosted call accounting.

## Mechanical regressions

Add/extend tests proving:

1. O4-E response schema is produced by `scout_response_schema_for_evidence()`;
2. matrix binds its canonical schema SHA before inference;
3. frozen case/evidence/prompt/model/runtime/generation identities remain unchanged;
4. Qwen mixed `domain_primary` + `manifest` ref selection is not representable by the O4-E schema;
5. terminal `INVALID` does not prevent aggregation of the second cell;
6. infrastructure error remains fail-closed;
7. summary has no winner/rank/assignment semantics;
8. request resolver rejects extra paths, wrong branch, malformed request, non-parent target, and request-file modification;
9. workflow is restricted to the O4-E request namespace/path and has `contents: read` only;
10. ordinary Agent Skills CI contains no model inference;
11. O4-C/O4-D historical runners and artifacts remain unchanged.

## CI / merge gates

Implementation PR performs zero model calls.

Before merge require exact-head:

- Agent Skills CI green;
- SimCore Verify + Required green.

Merge only the tested head SHA.

Before live O4-E request require the same gates green again on merged main.

## Acceptance and next boundary

After a single O4-E two-cell run:

- independently download and hash the artifact ZIP;
- recompute matrix/schema/result/score/receipt/summary digests;
- record exact run/artifact/hash/call accounting in issue #1120;
- do not rerun to improve a model result.

If both rows are contract-valid, the second schema hardening is validated for this diagnostic replay. **Do not enter O5 yet.** Before model assignment, freeze and execute at least one separate Scout retrospective/held-out case that was not used to design either schema hardening.

If either row remains invalid, preserve that evidence and diagnose the next validator-only constraint without tuning/retrying this measurement identity.
