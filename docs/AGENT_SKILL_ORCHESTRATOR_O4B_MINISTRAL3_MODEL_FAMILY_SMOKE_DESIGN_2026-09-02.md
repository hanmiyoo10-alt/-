# Agent Skill Orchestrator O4-B Ministral 3 Model Family Smoke Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · ONE NEW FAMILY ONLY · PRE-REGISTRY SMOKE REQUIRED · ZERO HOSTED AI · NO BENCHMARK MATRIX CALLS · NO ROLE ASSIGNMENT**

Tracking authority: issue #1120, O4-B acceptance freeze comment `5509534926`.

## 1. Purpose

O4-B admits exactly one new local model family candidate into the orchestrator only after artifact identity, public unauthenticated access, license metadata, checksum, and pinned llama.cpp CPU compatibility are demonstrated by a bounded one-shot smoke workflow.

O4-B does not run the O4 retrospective benchmark matrix. It does not compare model quality, select a role winner, modify O3/O2 execution, or touch product/plugin/release/device bytes.

## 2. Selected first family

Selected family: **Mistral / Ministral 3**.

Frozen candidate profile identity:

- candidate profile id: `ministral-3-3b-instruct-2512-q4_k_m`
- local model id: `ministral-3-3b-instruct-2512-q4_k_m-local`
- family: `ministral-3`
- repository: `mistralai/Ministral-3-3B-Instruct-2512-GGUF`
- artifact revision: `fc774f009f0c62a186f48e870fd6295b36f63779`
- file: `Ministral-3-3B-Instruct-2512-Q4_K_M.gguf`
- size: `2147023008` bytes
- SHA256: `9ed150d4367e68df0ac8e1540f6ddc65b42d0ee26378329d1ecbca60f93fc5f8`
- license id: `apache-2.0`
- license status target: `verified_metadata`
- access class target: `public_unauthenticated_https`
- execution surface: `LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS`

The artifact revision is intentionally the commit that added the GGUF file rather than mutable repository `main`. Later README-only repository commits do not change the frozen model bytes.

## 3. Why this family is first

Ministral 3 is chosen before the other considered families because:

- Mistral publishes an official vendor GGUF repository;
- the official repository publishes a 3B Q4_K_M quant close to the existing Qwen 3B comparison scale;
- the official repository exposes llama.cpp usage directly;
- Apache-2.0 metadata is straightforward to freeze;
- Gemma and Llama candidates introduce model-access terms/gating friction for an unattended GitHub-hosted smoke lane;
- Phi-4-mini does not provide the same official-vendor GGUF provenance and would require a third-party conversion for this lane.

This is a provenance/access choice, not a model-quality ranking.

## 4. Frozen runtime

O4-B reuses the already attested local runtime rather than introducing another runtime variable:

- llama.cpp release: `b10516`
- source digest: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`
- artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`
- artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`
- CPU threads: `4`
- GPU layers: `0`
- temperature: `0`
- seed: `42`

The smoke may use a smaller bounded completion budget than O3 role execution because it tests compatibility, not task quality.

## 5. Two-phase branch rule

O4-B uses one branch but two distinct phases.

### Phase A — pre-registry smoke

Allowed changes before smoke PASS:

- this design document;
- an inert candidate manifest carrying the frozen artifact identity;
- a dedicated one-shot smoke workflow;
- focused tests that prove the workflow has no credential/model-registry shortcut.

Forbidden before smoke PASS:

- adding the Ministral profile to `tools/agent-skill-orchestrator/models/registry.json`;
- adding it to any production/zero-credit allowlist;
- using it in O4 benchmark cells;
- assigning it to a role.

### Phase B — registry enablement after smoke PASS

Only after the Phase A smoke artifact is independently read back as PASS may the same branch add exactly one enabled Ministral profile to the orchestrator model registry plus focused registry tests.

The smoke evidence must identify the exact Phase A commit used for the run. Phase B must not rewrite the frozen artifact identity after observing model output.

## 6. Smoke workflow

The dedicated workflow is repository-control-plane only and must be manually dispatchable and/or narrowly branch-triggered. It must:

1. checkout the exact event commit;
2. load the candidate manifest and fail closed on unexpected fields/identity;
3. download pinned llama.cpp `b10516` and verify its frozen SHA256;
4. download the Ministral GGUF from the frozen Hugging Face revision using `curl` without `HF_TOKEN`, Authorization headers, repository secrets, or model credentials;
5. verify exact model byte size and SHA256;
6. launch `llama-server` CPU-only with 4 threads and 0 GPU layers;
7. submit exactly one bounded deterministic OpenAI-compatible chat-completions request;
8. require HTTP success, non-empty assistant content, and `finish_reason=stop`;
9. record `local_model_call_count=1` and `hosted_ai_call_count=0`;
10. write a closed smoke receipt and upload only bounded evidence.

The smoke prompt must test basic structured instruction-following/transport compatibility without containing benchmark expected answers or retrospective case truth.

## 7. Access evidence

The strongest access evidence is the workflow itself: the frozen GGUF must download successfully on a fresh GitHub-hosted runner with no Hugging Face token or model credential configured.

A successful browser/model-card view alone is insufficient to set `public_unauthenticated_https` in the registry.

## 8. Smoke receipt

The receipt records at minimum:

- schema version and status;
- repository/workflow commit SHA;
- candidate profile id;
- repository, revision, file, expected size and SHA256;
- measured downloaded size and measured SHA256;
- license id/status/source;
- access class and proof mode;
- llama release/source/artifact identities and runtime version;
- generation/runtime parameters;
- HTTP status, finish reason, non-empty-content boolean;
- local model call count;
- hosted AI call count;
- prompt and response SHA256;
- receipt SHA256.

PASS is mechanically derived only when every frozen invariant is satisfied.

## 9. Failure handling

The first smoke is one-shot evidence for this frozen artifact.

If it fails or is incomplete:

- do not enable the registry profile;
- do not change quant/revision/runtime after seeing the output and call that the same smoke;
- record the failure in #1120;
- diagnose the failed layer;
- any changed artifact/runtime identity requires a separately versioned design/acceptance update before a new smoke.

## 10. Registry enablement

After smoke PASS, add exactly one profile:

```text
ministral-3-3b-instruct-2512-q4_k_m
```

The registry entry must preserve the frozen repository/revision/file/SHA/license/access/execution-surface identity. `enabled=true` is allowed only because the smoke proves the access and runtime claims.

O4-B does not modify `standard-cpu-v1`; O4 role benchmarking will bind runtime/model identity explicitly in later work.

## 11. Tests

Focused tests must prove:

- candidate manifest is closed and exact;
- exactly one new family is represented;
- frozen SHA/revision/file/size are unchanged;
- smoke workflow contains no `HF_TOKEN`, Authorization header, Copilot/OpenAI/hosted-AI invocation, or benchmark matrix execution;
- smoke uses pinned llama.cpp SHA and CPU-only settings;
- smoke requires checksum, byte size, non-empty response, and `finish_reason=stop`;
- smoke records one local call and zero hosted calls;
- pre-smoke branch leaves the model registry byte-identical to base;
- post-smoke registry entry is eligible only when license/access metadata match the proven values;
- existing Qwen profiles remain byte-for-byte semantically unchanged.

Full Agent Skills CI and repository required CI remain mandatory for the registry-enablement head.

## 12. Exit

O4-B passes only after:

1. Phase A exact tested head has a successful one-shot smoke artifact;
2. artifact download/size/SHA/runtime/call-count/finish evidence is independently read back;
3. smoke evidence is recorded in #1120;
4. Phase B adds exactly one Ministral profile with focused/full regression green;
5. exact tested Phase B head merges;
6. merged-main Agent Skills/SimCore regression passes;
7. main read-back confirms the profile and no unrelated runtime/product/plugin/release change.

After O4-B exit, O4-C may prepare retrospective role-isolated benchmark fixtures/cells for Qwen and the newly admitted Ministral family. O4-B itself produces no capability winner or role assignment.
