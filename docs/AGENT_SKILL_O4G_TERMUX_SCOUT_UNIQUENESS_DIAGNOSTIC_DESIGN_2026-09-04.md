# Agent Skill O4-G Termux Scout Uniqueness Diagnostic Design — 2026-09-04

Status: **DESIGN FROZEN · DIAGNOSTIC ONLY · ZERO MODEL CALLS IN IMPLEMENTATION PR**

Tracking authority: issue #1120, hardening closure comment `5528146537`, O4-G design freeze comment `5528161397`.

## Goal

Observe whether the strict Scout response-generation schema introduced after O4-F prevents the exact duplicate-ref contract failure seen in the frozen Termux retrospective case.

O4-G does not reclassify O4-F, create a new independent assignment case, select a model, or change O5/O6 policy.

## Measurement identity

`o4g-termux-background-autosave-scout-unique-ref-diagnostic-v1`

The existing O4-F case and EvidencePackage are reused directly. Their fixture/evidence/source identities remain unchanged.

## Frozen inputs

O4-G preserves the O4-F model pair, exact registry identities, prompt, role contract, Termux EvidencePackage/source SHA, llama.cpp runtime identity, generation settings, request timeout, and zero-hosted-AI boundary.

The only intentional inference-surface change is response schema selection:

`scout_response_schema_for_evidence_unique_refs()`

The strict schema SHA is frozen into the O4-G matrix before inference.

## Execution

A dedicated request commit under `.agent-skill-o4g-requests/` on `agent-skill-o4g-request/**` must have exactly one parent and exactly one newly added request JSON file. Its `target_repository_sha` must equal its parent. The evaluated target must be an ancestor of current main.

The workflow executes exactly two local CPU calls:

1. Qwen2.5-3B once.
2. Ministral-3-3B once.

Hosted AI calls remain zero. Model credential environment variables must be absent. Terminal invalid or incomplete rows are persisted without retry, repair, or output deduplication.

## Assignment exclusion

The manifest, cell metadata, rows, and summary explicitly preserve:

- `diagnostic_replay_only=true`;
- `assignment_candidate_only=false` where applicable;
- `independent_assignment_case=false`;
- `assignment_eligible=false` for every row;
- `paired_assignment_eligible=false` unconditionally;
- `assignment_basis=DIAGNOSTIC_ONLY` for every row.

Winner, rank, ranking, recommended-model, assignment, and tie-break semantics are forbidden.

## Observation

If both one-shot terminal rows are completed, parse-valid, contract-valid, and have zero invalid refs, the summary may record:

`STRICT_UNIQUENESS_GAP_OBSERVED_CLOSED`

Otherwise it records:

`STRICT_UNIQUENESS_GAP_NOT_CLOSED_OR_INCONCLUSIVE`

Neither observation changes assignment authority.

## Regression gates

Before the diagnostic request is created:

- implementation PR Agent Skills CI must pass;
- SimCore Required must pass;
- exact tested head must merge;
- merged-main Agent Skills and SimCore gates must pass;
- main read-back must confirm the O4-G workflow and strict-schema binding.

Only then may exactly one O4-G request commit be created.

## Non-goals

O4-G does not modify O4-F artifacts or historical schema identities, tune models, retry failed cells, modify plugin/product/release/device bytes, expand validated scopes, alter O5 assignment policy, or unblock O6 automatically.
