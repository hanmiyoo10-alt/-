# Agent Skill Orchestrator O4-H Voyage Scout Assignment Evidence Design — 2026-09-04

Date: 2026-09-04 KST

Status: **DESIGN FROZEN · RETROSPECTIVE ASSIGNMENT-EVIDENCE CANDIDATE · STRICT UNIQUE-REF SCHEMA · ZERO MODEL CALLS DURING IMPLEMENTATION/CI**

Tracking authority: issue #1120.

Implementation baseline: `main@6c8c47a434920f5ca2a65b95557b74b8e252e037`.

Frozen historical source snapshot: `3908f71122f267375ee5eccb3fa3ca85564c634e`.

Source held-out identity: `voyage-token-check-visible-refresh-heldout`.

## 1. Purpose

O4-H is the first of two Scout retrospective cases preselected before any O4-H/O4-I output. Its only purpose is to add a distinct comparable Scout benchmark case that frozen O5 policy may later consume. It does not itself select a model, assign a role, change O5 thresholds, enter O6, promote a plugin scope, or mutate product/runtime/release/device state.

The original Voyage held-out has already been consumed. O4-H therefore reuses it only as retrospective benchmark evidence and marks the source case `PROSPECTIVE_HELD_OUT_CONSUMED`; it is not independent generalization proof.

## 2. Frozen locator and source authority

The existing local-context profile

`tools/agent-skill-eval/local-context-profiles.json` → `plugin-impact-scope` → `voyage-token-check-visible-refresh-heldout`

is a **locator only**. It identifies seven frozen source documents plus exact needle/radius windows at `3908f711...`. Prior model answers, scores, receipts, or held-out verdicts are forbidden as expected-label inputs.

O4-H input construction must:

1. read the frozen profile before inference;
2. require every Voyage profile ref to equal `3908f711...`;
3. read exact repository bytes from that commit;
4. find every required needle and fail closed if any needle is absent;
5. convert needle windows into merged, non-overlapping contiguous raw source ranges;
6. pass those raw blocks through the canonical O1 `route_task()` → `resolve_authority()` → `build_evidence_package()` path;
7. derive fixture source refs and authority labels only from that canonical EvidencePackage.

No hand-authored alternate EvidencePackage authority path is permitted.

## 3. Canonical Voyage authority snapshot

O4-H0 registered Voyage domain metadata without production/release claims. For this frozen retrospective snapshot only:

- scope: `plugin:voyage-token-check`;
- task kind: `impact_analysis`;
- `declared_by=docs/REPO_PROJECT_CATALOG.md` is `OBSERVED` at `3908f711...`;
- `evidence=voyage-token-check/DESIGN_STATUS.md` is `OBSERVED` at `3908f711...`;
- guidelines and `voyage-token-check/**` primary sources bind to the same frozen target SHA through existing evidence-builder semantics;
- no release branch/manifest/artifact/version/current production source authority exists or is inferred.

UNKNOWN production fields remain UNKNOWN.

## 4. Frozen fixture rule

Case id: `o4h-voyage-visible-refresh-scout-v1`.

Role: `scout`.

Role contract: `scout-compact-wire-v3`.

Scoring policy: `o4a-retrospective-role-benchmark-v1` with the repository-owned scoring-policy digest.

For every canonical EvidencePackage source, in canonical order, the fixture contains exactly:

- one `source_ref` expected label for that exact compact source ref;
- one `authority` expected label binding that source's exact `authority_class` to that one ref.

`known_source_refs` equals the complete canonical EvidencePackage ref set. Scout upstream-artifact digests remain empty. The case/evidence/fixture digests are computed before inference and validated by repository contracts.

This deterministic rule is chosen before model output and is not adjusted after scores are observed.

## 5. Model/runtime/generation identity

Exactly two enabled public zero-credit CPU profiles are frozen:

- `qwen2.5-3b-instruct-q4_k_m`;
- `ministral-3-3b-instruct-2512-q4_k_m`.

The llama.cpp runtime remains release `b10516` with the already-pinned archive digest. Existing Scout generation settings and O5 runtime budget remain unchanged.

The response schema is built with:

`scout_response_schema_for_evidence_unique_refs()`

and is bound by digest before inference. Schema mode is `STRICT_UNIQUE_REF_ARRAY_ENUM`.

Each family gets exactly one local model request. Hosted AI credentials/calls are forbidden. There is no semantic retry, repair, deduplication, fallback, tuning, or result-conditioned rerun. The separately designed PocketRisu structured-output replay policy is a different product track and does not alter this one-shot benchmark contract.

## 6. Assignment-evidence eligibility boundary

O4-H matrix metadata is:

- `retrospective_only=true`;
- `diagnostic_replay_only=false`;
- `assignment_candidate_only=true`;
- `independent_assignment_case=true` in the O5 distinct-case sense relative to O4-F/O4-I case identity, while still explicitly retrospective rather than prospective generalization proof.

A paired terminal row may be marked `assignment_eligible=true / ELIGIBLE_RETROSPECTIVE` only when both frozen model cells are:

- `COMPLETED`;
- parse-valid;
- contract-valid;
- `invalid_ref_count=0`;
- exactly one local call each and zero hosted AI calls.

Otherwise each terminal row remains `HISTORICAL_TERMINAL_ONLY`. O4-H does not apply O5 metric thresholds and never emits winner/rank/recommended-model/assignment fields. Frozen O5 alone may later consume eligible rows and apply its pre-existing thresholds.

## 7. One-shot execution authority

Implementation and ordinary CI execute zero model calls.

Only after:

1. exact PR head Agent Skills + SimCore + Control Plane gates are GREEN;
2. exact tested head is merged;
3. merged-main Agent Skills + SimCore are GREEN;
4. O4-H files are read back from main;

may one branch under `agent-skill-o4h-request/**` add exactly one JSON request under `.agent-skill-o4h-requests/`.

The request commit must have exactly one parent and exactly one newly added request file, and `target_repository_sha` must equal that parent. The frozen Voyage source SHA must equal `3908f711...`.

Regardless of terminal model outcome, no model rerun/tuning/repair or case substitution is allowed. O4-I remains the already-preselected next Scout case.

## 8. Workflow boundaries

The O4-H workflow must:

- checkout the exact request commit;
- resolve and validate the one-shot request provenance;
- checkout the exact evaluated parent target;
- require the target to be an ancestor of current `main`;
- fail if model credential environment variables are present;
- fetch and verify frozen Voyage source bytes before inference;
- construct and freeze case/evidence/prompt/schema/matrix before inference;
- download and verify the pinned llama.cpp runtime and each pinned public model;
- execute exactly two sequential local Scout cells;
- aggregate terminal rows without winner semantics;
- upload one bounded evidence artifact even on terminal failure where files exist.

Workflow permissions remain `contents: read` only.

## 9. Required regression

Before any O4-H model call, tests must prove:

- exact source/profile/case/model identities;
- deterministic needle-window merge and fail-closed missing-needle behavior;
- only the Voyage held-out profile is accepted;
- generated EvidencePackage passes canonical authority/evidence validation;
- generated fixture binds all canonical refs and exact authority classes, source kind is `PROSPECTIVE_HELD_OUT_CONSUMED`, and digests recompute;
- response schema uses strict unique-ref enumeration;
- matrix forbids winner/assignment semantics and binds call ceilings/identities;
- aggregation preserves invalid/incomplete terminal rows and never fabricates eligibility;
- request resolver rejects wrong namespaces, multiple-parent/multi-file request commits, source drift, and target/parent mismatch;
- workflow contains the zero-credential, frozen-source, one-call-per-family, no-retry, and artifact boundaries;
- prior Agent Skills, O4-F/O4-G, Usage Dashboard domain, Termux domain, and SimCore Required regressions remain GREEN.

## 10. Non-goals

O4-H does not modify Voyage product files, establish a production release, infer unknown values, create traffic, perform real-device validation, change `PILOT_VALIDATED_SCOPES`, promote Voyage, change model registry/generation/O5 policy, repair O4-F/O4-G history, or enter O6.

## 11. Exit

O4-H implementation exits after exact tested-head merge and merged-main verification. Execution exits after one terminal two-family attempt is preserved and recorded in #1120. Then O4-I proceeds as already frozen, regardless of O4-H score.
