# Agent Skill Orchestrator O2-C Role Execution Envelopes Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

Baseline main: `37f128c8ff80e7bb8c366b04fce5ea88b711050c`.
O2-B merged baseline: `51d7df04a6660a77a341e63dfe2303cc881ed1a2`.

O2-C adds deterministic execution envelopes for Mapper, Critic, and Synthesizer only. It does not add a GitHub Actions model workflow and does not make a model call.

## Invariants

- Existing O2-A Scout compact-wire v3, Scout RoleArtifact behavior, and Scout execution receipt v1 remain byte/semantic compatible.
- O2-B Mapper/Critic/Synthesizer compact contracts remain unchanged.
- Same pinned Qwen2.5-3B GGUF, same llama.cpp release/artifact checksum, same loopback transport, and same generation parameters are used for all O2 roles.
- No model chooses status, confidence, verdict, routing, mutation, release truth, or device truth.
- All downstream inputs are validated typed RoleArtifacts; raw upstream response prose is never an input surface.
- `PILOT_VALIDATED_SCOPES` remains exactly `plugin:usage-dashboard`.
- No product/plugin runtime/release/device bytes change.

## Slice boundary

O2-C implements:

1. Mapper RoleArtifact builder from the frozen Mapper compact wire.
2. Critic RoleArtifact builder from the frozen Critic compact wire.
3. Synthesizer RoleArtifact builder from the frozen Synthesizer compact selection wire.
4. A semantic-role receipt v2 schema for mapper/critic/synthesizer.
5. A pure execution-envelope helper that classifies a supplied finish reason and supplied model response into `COMPLETED`, `EXECUTION_INCOMPLETE`, or `INVALID`.
6. Synthetic regressions for SHA chaining, deterministic projection, malformed/truncated output, and zero-hosted-AI accounting.

O2-C explicitly does not implement:

- model server startup;
- GitHub Actions execution workflow;
- sequential role scheduler;
- parallelism;
- new model families;
- model assignment policy;
- judge changes;
- prospective held-out evidence.

Those are later O2-D/O3 work.

## RoleArtifact projection

### Mapper

Input: validated Scout RoleArtifact plus evidence package and Mapper compact response.

Projection:

- each `o` record becomes a `semantic_owner` claim;
- each `e` record becomes a flow edge;
- status is deterministically `SUPPORTED_LIKELY` from the frozen Mapper contract;
- ids are deterministic `claim-mapper-NNN`;
- `upstream_artifact_sha256` is exactly the Scout artifact digest.

No release/device claim is synthesized.

### Critic

Input: validated Mapper RoleArtifact plus evidence package and Critic compact response.

Projection:

- each `b` record becomes a boundary with deterministic `SUPPORTED_LIKELY`;
- each `q` record becomes a critic-origin blocker whose subject retains the referenced Mapper claim id and challenge text;
- each `u` record becomes a critic-origin blocker;
- Mapper claims/edges are never mutated or relabeled;
- no challenge self-resolves an upstream conflict or UNKNOWN;
- `upstream_artifact_sha256` is exactly the Mapper artifact digest.

### Synthesizer

Input: validated upstream RoleArtifacts plus evidence package and Synthesizer compact selection response.

The existing O2-B selector produces a deterministic selected-id union that always includes mandatory UNKNOWN/CONFLICT records, all blockers, and unresolved conflicts.

O2-C converts the selected validated records into a Synthesizer RoleArtifact without changing semantic value/status/refs:

- selected claims are copied with fresh deterministic `claim-synthesizer-NNN` ids and role `synthesizer`;
- selected flow edges and boundaries preserve from/to/kind/subject/status/refs and set role `synthesizer`;
- blockers preserve `kind`, `subject`, original `origin_role`, and refs;
- conflicts preserve their exact conflict payload; claim-id links may only be included when their referenced claims are also selected and deterministically remapped. If a selected conflict cannot be remapped without inventing a claim, construction fails closed rather than fabricating a link.
- upstream artifact SHA list is canonical role order and exactly matches validated supplied artifacts.

The model never authors a new semantic record in the Synthesizer lane; it only selects compact ids.

## Receipt versioning

`role-execution-receipt.schema.json` v1 stays Scout-only and unchanged.

Add `semantic-role-execution-receipt-v2.schema.json` with:

- `schema_version: 2`;
- role enum `mapper|critic|synthesizer`;
- frozen model/runtime/transport/generation identity;
- evidence, prompt, raw-response, and RoleArtifact digests;
- canonical `upstream_artifact_sha256` array;
- finish reason;
- `model_call_count: 1`;
- `hosted_ai_call_count: 0`.

A non-completed execution must use `role_artifact_sha256: NONE`.

## Finish classification

Reuse the O2-A llama.cpp finish classifier.

- `stop` -> attempt contract validation and RoleArtifact construction;
- truncation/length -> `EXECUTION_INCOMPLETE`, no RoleArtifact;
- stop + malformed/invalid compact wire -> `INVALID`, no RoleArtifact.

Semantic disagreement is not conflated with transport truncation.

## Tests

Required O2-C regressions:

- Scout receipt v1 schema remains exactly Scout-only and historical test behavior remains green;
- v2 receipt is closed and rejects Scout role;
- same response/evidence/upstream inputs yield identical RoleArtifact/receipt digests;
- Mapper status is evaluator-owned `SUPPORTED_LIKELY`;
- Critic challenge/unresolved records become blockers without mutating Mapper records;
- Synthesizer upstream order does not alter selected projection or upstream digest ordering;
- mandatory UNKNOWN/CONFLICT/blocker/unresolved-conflict records survive selection;
- selected conflict remapping fails closed if required claims are absent;
- target/evidence/upstream mismatch fails closed;
- malformed compact JSON with finish=`stop` -> `INVALID`;
- truncation -> `EXECUTION_INCOMPLETE`;
- completed role -> one local model call and zero hosted-AI calls;
- no raw upstream response prose enters prompt/projection/receipt.

## Exit gate

O2-C exits only after Agent Skills CI and SimCore CI pass on the exact PR head, exact-head merge succeeds, merged-main read-back confirms the additive v2 envelope, merged-main Agent Skills/SimCore are green, and the result is recorded in #1120.

Only then may O2-D add a retrospective sequential live workflow using the already frozen Qwen/llama.cpp lane.