# Agent Skill Orchestrator O4-D Scout Schema-Hardening Validation Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · ZERO MODEL CALLS · DIAGNOSTIC REPLAY ONLY · NO FAMILY WINNER · NO O5 ASSIGNMENT**

Tracking authority: issue #1120.

Design baseline: `main=69d2bda9397bb8fd0d600c7ebd62670afb1fec7c`.

## 1. Purpose

O4-D answers one bounded question created by the completed O4-C evidence and the merged Scout generation-schema hardening:

> Does the hardened structured-generation schema prevent the exact `k=s` semantic-prose contract failure in real local Scout execution strongly enough to produce contract-valid, semantically scorable rows?

O4-D is not a new family-selection benchmark. The hardening was designed after observing O4-C outputs, so replaying the same retrospective case after that intervention is diagnostic evidence only. It may prove or disprove the hardening in live local inference, but it must not be used to claim a Qwen-vs-Ministral winner or permanent role assignment.

If O4-D yields contract-valid rows, the next capability-comparison slice must use a separately frozen retrospective case that was not used to design this hardening.

## 2. Frozen historical boundary

O4-C remains immutable.

- original O4-C case: `o4c-scout-service-tier-fidelity-v1`;
- EvidencePackage SHA256: `06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97`;
- fixture SHA256: `196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f`;
- prompt SHA256: `8973db5c8ebf8c54a6dff2aee38769efab2c76999821084cdb4f5d240833a876`;
- Qwen result SHA256: `eb7e87bad1dbccc899e18672a9fea528b52b920cf4a82bc4db637014b07fbc08` (`INVALID`);
- Ministral completed recovery result SHA256: `195f66b52261d14d7cee81018e0888808a0fbc6233d29a3435fa9f607a2513b5` (`INVALID`);
- first Ministral timeout evidence remains separately retained;
- historical O4-C aggregate and recovery artifacts are not edited or reclassified.

O4-D intentionally reuses the same retrospective case/evidence/prompt bytes so the measured changed input is the structured-generation schema. Its rows are a new execution sequence and are never merged into the historical O4-C aggregate.

Because the O4-A aggregate identity treats `(role, model_profile_id, case_id, case_version)` as a cell identity, O4-C and O4-D rows for this same case must not be combined into one capability aggregate. O4-D is a diagnostic replay, not an additional independent capability sample.

## 3. Hardened generation input that must be bound before inference

The O4-A result schema already binds fixture, prompt, model, runtime, and scoring-policy identity, but it does not contain a structured-generation-schema digest.

O4-D must therefore create a separate deterministic execution-input manifest before any model call. The manifest records at minimum:

- matrix id: `o4d-scout-schema-hardening-validation-v1`;
- target repository SHA;
- O4-C case id / fixture SHA / evidence SHA;
- Scout role contract id;
- prompt SHA256;
- canonical `scout_response_schema()` SHA256;
- current `roles/scout.py` source blob identity or exact target repository SHA basis;
- current Scout contract source identity;
- exact generation parameters;
- exact llama.cpp runtime identity;
- exact two model profiles and artifact SHA256 values;
- request timeout seconds;
- local model call ceiling = 2;
- hosted AI call ceiling = 0;
- historical O4-C result references;
- no winner/assignment fields.

The response-schema digest is computed with the repository canonical JSON SHA256 helper from the exact checked-out target commit before inference.

No O4-A scoring rule or existing result schema is changed for this diagnostic replay.

## 4. Exact two-cell matrix

Exactly two cells, once each, same retrospective case, prompt, generation parameters, runtime build, and structured-generation schema:

1. `qwen2.5-3b-instruct-q4_k_m`
2. `ministral-3-3b-instruct-2512-q4_k_m`

No 1.5B cell, no third family, no retry, no temperature/seed search, no alternate prompt, no model-specific schema, and no silent hosted fallback.

Each cell uses request timeout `1800` seconds. This timeout is a diagnostic execution ceiling already justified by the completed O4-C Ministral recovery; it does not change production Scout timeout or generation parameters.

## 5. Terminal-evidence semantics

O4-C originally stopped the matrix when the first cell returned a valid terminal benchmark row with process exit code 3 (`INVALID`). O4-D must not repeat that orchestration mistake.

Each cell is independent.

- `COMPLETED`, `INVALID`, and `EXECUTION_INCOMPLETE` benchmark results are terminal observed evidence and must be persisted.
- a terminal non-COMPLETED row must not prevent the second model cell from executing exactly once;
- runner/infrastructure failure before a canonical result/score is emitted fails closed;
- no automatic retry or rerun is allowed;
- every cell still records `model_call_count=1`, `hosted_ai_call_count=0` when a request was made.

The matrix aggregates after both terminal rows exist. If a runner error prevents a canonical row, the workflow fails and retains bounded evidence; it does not synthesize a missing result.

## 6. Diagnostic verdict

The O4-D summary may contain only a hardening-validation verdict, never a model ranking.

- `HARDENING_VALIDATED` — both rows are `COMPLETED`, `parse_valid=true`, and `contract_valid=true`;
- `HARDENING_NOT_VALIDATED` — both canonical rows exist but at least one is not contract-valid/completed;
- `EXECUTION_INCOMPLETE` — the matrix cannot produce both canonical terminal rows due to runner/infrastructure failure.

Semantic precision/recall metrics are retained exactly from the existing O4 scorer when a row is contract-valid. Undefined metrics remain null. No weighted composite score is added.

Even if one model scores better, O4-D must not emit `winner`, `rank`, `recommended_model`, `assignment`, or tie-break semantics.

## 7. Request-commit trigger

The connected GitHub surface cannot invoke `workflow_dispatch` directly, so O4-D uses a source-controlled request branch trigger, following the already-proven zero-credit request pattern.

Workflow push trigger is restricted to:

- branch glob: `agent-skill-o4d-request/**`;
- path glob: `.agent-skill-o4d-requests/*.json`.

A valid request push must:

1. have exactly one parent;
2. add exactly one JSON file under `.agent-skill-o4d-requests/`;
3. change no other path;
4. occur on the dedicated branch namespace;
5. contain exactly the allowed request object;
6. set `target_repository_sha` to the request commit parent.

Request object:

```json
{
  "schema_version": 1,
  "matrix_id": "o4d-scout-schema-hardening-validation-v1",
  "target_repository_sha": "<40-hex-parent-main-sha>"
}
```

The workflow checks out the request commit only to resolve provenance, then checks out `target_repository_sha` detached before matrix preparation, model download, or inference. The request-control commit itself is not part of evaluated repository state.

The request branch is not merged into `main`.

## 8. Cost and security boundary

O4-D remains zero hosted-AI-credit execution:

- permissions: `contents: read` only;
- standard GitHub-hosted Ubuntu CPU runner;
- no Copilot CLI or Copilot request permission;
- no GitHub Models;
- no hosted inference API;
- no HF token or repository secret requirement;
- model/runtime downloads are public HTTPS and SHA256 verified;
- llama.cpp stays pinned to release `b10516`, source digest `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`, artifact SHA256 `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`;
- local model call ceiling: exactly 2;
- hosted AI calls: exactly 0.

If downloads or local inference fail, retain the failure. Do not switch execution surfaces.

## 9. Minimal implementation

Additive targets only:

```text
.github/workflows/agent-skill-orchestrator-o4d-scout-schema-validation.yml

tools/agent-skill-orchestrator/benchmarks/
  resolve_o4d_request.py
  run_o4d_scout_cell.py
  run_o4d_scout_schema_validation.py

tools/agent-skill-orchestrator/tests/
  test_o4d_scout_schema_validation.py
```

Existing O4-C case/evidence/runner/results are read-only inputs. Do not modify them merely to make O4-D pass.

Do not change:

- `roles/scout.py` in O4-D implementation;
- `role-contracts/scout.json`;
- prompt construction;
- model registry;
- production Scout binding;
- O4-A score/result schemas;
- O4-C workflow/result artifacts;
- plugin/product/release/device state.

## 10. Mechanical regressions before model calls

Tests must prove at minimum:

- request resolver accepts exactly one valid request-control commit and resolves its parent target;
- wrong branch, extra path, modified/deleted request, malformed object, wrong matrix id, and target-parent mismatch fail closed;
- matrix manifest canonical digest is stable;
- manifest binds canonical `scout_response_schema()` SHA256;
- manifest binds the unchanged O4-C fixture/evidence/prompt identities;
- model matrix is exactly Qwen 3B + Ministral 3B;
- timeout is exactly 1800 seconds;
- cell runner uses the current hardened `scout_response_schema()` and existing scorer;
- terminal `INVALID`/`EXECUTION_INCOMPLETE` result does not imply runner failure;
- matrix aggregation accepts two terminal canonical rows without requiring both to be COMPLETED;
- hardening verdict is deterministic;
- winner/ranking/assignment fields are forbidden;
- permissions remain `contents: read` and workflow trigger is restricted to request branch/path;
- ordinary Agent Skills CI contains no O4-D model inference;
- no O4-C case/evidence bytes are changed.

Agent Skills CI and SimCore Required CI must be green on exact PR head and merged main before the request branch is created.

## 11. Execution sequence

1. merge this design and additive O4-D harness from an exact tested head;
2. verify merged-main Agent Skills CI + SimCore Required GREEN;
3. create one request branch from that exact main SHA;
4. add exactly one O4-D request JSON targeting the branch parent;
5. observe exactly one O4-D workflow run;
6. independently download/read the evidence artifact;
7. verify request/target/schema/prompt/model/runtime/result/score/call-accounting digests;
8. record the measured rows and hardening verdict in issue #1120;
9. do not rerun either model regardless of result;
10. if `HARDENING_VALIDATED`, next design freezes a new retrospective case not used to design the schema hardening before any further family-comparison calls.

## 12. Non-goals

O4-D does not:

- repair or rewrite O4-C evidence;
- establish a Qwen or Ministral winner;
- assign any model to Scout;
- create O5 thresholds;
- tune prompts, temperatures, seeds, or per-model schemas;
- add a third model family;
- change production runtime behavior;
- expand plugin validated scopes;
- promote SimCore;
- touch Local Usage Dashboard product/release bytes.

## 13. Exit

O4-D implementation exits before inference only when design-before-code is preserved, additive harness tests pass, exact-head Agent Skills + SimCore CI are green, merged-main regressions are green, and no model call has occurred.

The measured O4-D slice exits only after exactly one request-triggered two-cell run is independently verified and recorded. A successful hardening verdict permits a separate O4-E unbiased retrospective-case design; it does not permit O5 assignment by itself.
