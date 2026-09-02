# Agent Skill Orchestrator O2-D Sequential Live Workflow Design — 2026-09-02

## Status

FROZEN_BEFORE_IMPLEMENTATION

Branch baseline main: `dad86753042fa7829f8bf79bfdec928ee1068939`.
Prerequisite O2 dependency-alignment merge: `5abed347fac709863a580913996af16d69dfdfb7`.
Acceptance freeze: #1120 comment `5507048794`.

O2-D adds one retrospective sequential live workflow over the already merged O2-A/O2-B/O2-C contracts. It does not create a new semantic contract, new model family, parallel scheduler, product behavior, release behavior, or validated scope.

## Critical provenance separation

O2-A could require the request commit parent to equal its frozen target repository SHA because the Scout workflow/runtime already existed at that target.

O2-D cannot reuse that exact request-parent rule: its new workflow/runtime only exists on the post-O2-D harness main, while the retrospective evidence authority must remain the older frozen O2-A target.

Therefore O2-D separates two immutable identities:

- **harness_repository_sha** — the merged main SHA containing the O2-D workflow/runtime. The request commit must be a direct child of this SHA.
- **evidence_repository_sha** — the frozen retrospective source checkout used to construct the Usage Dashboard evidence package: `7bd212b496111a628d249946d3a98b8c55d001ae`.
- **release_repository_sha** — frozen Usage Dashboard release authority: `82c4f900cf548068d1eada957c982a5d78f1347b`.

The harness SHA proves what code performed orchestration. The evidence/release SHAs prove what repository facts the four roles were allowed to inspect. Neither may be substituted for the other.

## Frozen runtime/model identity

Reuse O2-A exactly:

- llama.cpp release: `b10516`
- llama artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`
- llama artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`
- model repository: `Qwen/Qwen2.5-3B-Instruct-GGUF`
- model revision: `af75b7aaf5bb163ce4c5dab4e6b84d844e96265d`
- model file: `qwen2.5-3b-instruct-q4_k_m.gguf`
- model SHA256: `626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d`
- transport: loopback llama.cpp server
- temperature: `0`
- seed: `42`
- max completion tokens per role: `768`
- hosted AI calls: `0`

One server instance may serve all four calls, but every role has its own prompt, raw response, finish reason, RoleArtifact, and receipt.

## Frozen retrospective evidence

Reuse the O2-A Usage Dashboard retrospective evidence construction against `evidence_repository_sha` and the frozen release checkout. No source widening is permitted in O2-D.

The evidence package remains bounded to the O2-A source set, including:

- `docs/USAGE_DASHBOARD_GUIDELINES.md`
- `plugins/usage-dashboard/runtime/product-manifest.json`

The candidate scope remains exactly `plugin:usage-dashboard`.

## Sequential execution plan

Deterministic role stages are exactly:

1. Scout — depends on none.
2. Mapper — depends on Scout.
3. Critic — depends on Mapper.
4. Synthesizer — depends on Scout, Mapper, and Critic in canonical role order.

The runtime must persist this same plan and validate it against the router-generated plan before the first model call. A disagreement is a pre-inference failure.

## Role execution

### Scout

Reuse O2-A compact-wire v3, Scout RoleArtifact projection, finish classifier, and Scout receipt v1 unchanged.

### Mapper

Input surfaces are only:

- frozen bounded evidence package;
- validated Scout RoleArtifact;
- frozen Mapper compact contract/prompt policy.

Raw Scout response prose must not appear in the Mapper prompt.

A completed Mapper uses the existing O2-C Mapper RoleArtifact builder and semantic-role receipt v2. Its `upstream_artifact_sha256` is exactly the Scout RoleArtifact digest.

### Critic

Input surfaces are only:

- frozen bounded evidence package;
- validated Mapper RoleArtifact;
- frozen Critic compact contract/prompt policy.

Raw Scout or Mapper response prose must not appear in the Critic prompt. Its upstream artifact digest is exactly Mapper.

### Synthesizer

Input surfaces are only:

- frozen bounded evidence package;
- validated RoleArtifacts in canonical order Scout, Mapper, Critic;
- frozen Synthesizer compact selection contract/prompt policy.

It may select existing validated IDs only. It does not author new semantic facts. Mandatory UNKNOWN/CONFLICT/blocker/unresolved-conflict preservation remains evaluator-owned as already frozen in O2-B/O2-C.

## Fail-closed scheduler semantics

Each role is called only after every declared dependency has a validated `COMPLETED` RoleArtifact.

If a role is `EXECUTION_INCOMPLETE` or `INVALID`:

- no RoleArtifact is fabricated;
- dependent later roles are not called;
- skipped roles are recorded as `BLOCKED_DEPENDENCY` with model-call count `0`;
- the final workflow gate fails;
- the evidence artifact is still uploaded.

No retry, fallback model, or alternate prompt is allowed in the first O2-D retrospective run.

## Request contract

Use a new closed request mode, e.g. `o2d_sequential_retrospective_mechanical`, with exactly:

- `schema_version: 1`
- `mode`
- `harness_repository_sha`
- `evidence_repository_sha`
- `release_repository_sha`

The request commit must change exactly one request JSON and must be a direct child of `harness_repository_sha`.

For the first live request, after O2-D merges:

- `harness_repository_sha` = exact merged main containing O2-D;
- `evidence_repository_sha` = `7bd212b496111a628d249946d3a98b8c55d001ae`;
- `release_repository_sha` = `82c4f900cf548068d1eada957c982a5d78f1347b`.

## Artifact bundle

Retain enough immutable material to recompute orchestration provenance:

- request JSON;
- harness/evidence/release SHAs;
- execution plan;
- authority snapshot and bounded evidence package;
- runtime/model identity and runtime version;
- for every role: prompt, prompt SHA, raw response, response SHA, finish reason, execution status, RoleArtifact if completed, RoleArtifact SHA, receipt;
- deterministic summary containing role order, dependencies, total local model calls, total hosted AI calls, final Synthesizer artifact SHA, and overall execution status.

Raw response prose is evidence-only and must never become a downstream model input.

## Acceptance gate

The first O2-D live run passes mechanically only if all of the following hold:

- exactly four local model calls total;
- zero hosted AI calls total;
- all four roles are `COMPLETED` and finish `stop`;
- all four compact responses validate under their already frozen contracts;
- Scout/Mapper/Critic/Synthesizer RoleArtifacts all exist;
- upstream artifact SHA chains exactly match the frozen dependency graph;
- final Synthesizer receipt and RoleArtifact are present;
- execution-plan provenance exactly matches `Scout -> Mapper -> Critic -> Synthesizer` dependency semantics;
- no raw upstream response prose was used downstream;
- no product/plugin runtime/release/device byte changes and no validated-scope change occurred.

A mechanically valid retrospective run is not a new prospective skill-quality proof.

## Regression requirements before live execution

- exact closed request schema and harness/evidence/release separation;
- request-parent must match harness SHA, not evidence SHA;
- router plan equals runtime plan;
- Mapper prompt accepts typed Scout artifact and rejects raw response input;
- Critic prompt accepts typed Mapper artifact and rejects raw response input;
- Synthesizer prompt accepts canonical validated Scout/Mapper/Critic artifacts only;
- dependency failure suppresses all downstream model calls;
- completed four-role synthetic sequence reports exactly four local calls and zero hosted calls;
- per-role receipt versions remain Scout v1 and semantic v2 respectively;
- existing O2-A Scout pilot workflow remains unchanged;
- ordinary Agent Skills CI watches the new workflow but never downloads or starts the model.

Only after exact-head PR CI, exact-head merge, and merged-main Agent Skills/SimCore green may the first O2-D request branch be created.