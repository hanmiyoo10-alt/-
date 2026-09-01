# Repository Agent Skill Zero-Credit Output Eval — Design

Date: 2026-09-01
Status: DESIGN READY
Tracking issue: #1129

## Goal

Add a repository-owned Agent Skill output-evaluation lane that performs inference locally on a standard GitHub-hosted Ubuntu runner and consumes zero GitHub Copilot AI credits and zero external hosted-model API credits.

This lane is complementary to the dormant Copilot live-eval lane from #1125/#1127. It does not replace Copilot trigger/discovery validation.

## Hard boundaries

The zero-credit lane MUST NOT:

- invoke `copilot` or request `copilot-requests: write`;
- call GitHub Models or any hosted inference API;
- require PATs, model API keys, or repository secrets;
- infer Agent Skill trigger/discovery success from local context injection;
- mutate plugin/product/runtime/release state;
- auto-promote a skill or emit a qualitative winner as mechanical truth.

The lane MAY download pinned public runtime/model artifacts, but must verify exact SHA256 before executing/loading them.

## Initial runtime identity

### llama.cpp

- repository: `ggml-org/llama.cpp`
- release: `b10516`
- attested source digest: `b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9`
- artifact: `llama-b10516-bin-ubuntu-x64.tar.gz`
- artifact SHA256: `f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35`

## Initial model identity

- repository: `Qwen/Qwen2.5-1.5B-Instruct-GGUF`
- revision: `a615a81362316d7b9f5a7a9c4313adfdf9b54588`
- file: `qwen2.5-1.5b-instruct-q4_k_m.gguf`
- file SHA256: `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`
- license: Apache-2.0

These values are evaluation-infrastructure pins only. They are not Local Usage Dashboard product authority.

## Pair contract

For one selected existing output eval case:

1. Normalize the existing source-controlled fixture.
2. Build one bounded source-evidence bundle.
3. Use the exact same user task and evidence bundle in both modes.
4. `with_skill` additionally receives the exact target `SKILL.md` text.
5. `baseline_without_target_skill` receives no target skill text.
6. Run both modes with identical local model/runtime/generation parameters.
7. Record response hash, process exit, model/runtime hashes, repository SHA, source-bundle hash, user-task hash and exact generation parameters.
8. Mechanically validate pair provenance only.
9. Leave qualitative review separate.

The full composed prompt hashes are expected to differ because only `with_skill` contains target skill guidance. Pair identity is therefore based on the shared user-task hash and shared evidence-bundle hash rather than full-prompt equality.

## Evidence-bundle contract

`tools/agent-skill-eval/build_local_context.py` owns deterministic evidence preparation.

A source-controlled profile declares bounded inputs as `ref:path` plus extraction rules. Supported extraction should remain small:

- full file only under an explicit byte limit;
- bounded line windows around literal needles;
- exact JSON object extraction when a stable key is source-backed.

Every emitted source block records:

- requested ref;
- resolved commit SHA;
- path;
- source blob/content SHA256;
- extraction rule;
- extracted text SHA256.

Missing refs/paths/needles fail closed. Unknown values are not synthesized.

The same emitted context file is consumed by both pair modes.

## Initial context profiles

### `plugin-authority-scan` output case `1`

Include bounded current evidence for:

- `main:docs/REPO_PROJECT_CATALOG.md` around `plugin:usage-dashboard`;
- `main:.github/plugin-control-plane/registry.json` around `plugin:usage-dashboard`;
- `main:docs/USAGE_DASHBOARD_GUIDELINES.md` around release authority and `release-usage-dashboard`;
- `release-usage-dashboard:plugins/usage-dashboard/manifest.json` as a bounded full file.

This provides enough evidence for a local model to distinguish repository registration/ownership from the current release manifest without conversation memory.

### `plugin-impact-scope` output case `narrow-negative`

No repository evidence beyond the user task is required for the first smoke comparison. The skill boundary itself is the experimental variable.

## Local prompt contract

Both modes receive the same minimal evaluation system frame:

- answer only the supplied task;
- use only the supplied evidence for mutable repository facts;
- preserve UNKNOWN when evidence is insufficient;
- do not mutate repository state;
- do not claim tool calls were performed.

`with_skill` then receives a clearly delimited `TARGET SKILL GUIDANCE` section containing exact `SKILL.md` bytes.

The baseline gets an empty target-guidance section.

## Local inference contract

Use `llama-cli` with a bounded deterministic configuration:

- CPU only;
- single-turn conversation;
- model chat template from the GGUF;
- temperature `0`;
- fixed seed;
- bounded context size;
- bounded generated token count;
- no network during inference after artifacts are present.

Record `llama-cli --version` output and runtime artifact SHA256.

## Receipt contract

Use a separate local receipt schema rather than overloading Copilot-specific fields.

Required identity includes:

- repository SHA;
- skill and skill tree SHA256;
- eval fixture SHA256 and case id;
- shared user-task SHA256;
- shared evidence-bundle SHA256;
- mode;
- local model repository/revision/file/SHA256;
- llama.cpp release/source/artifact/SHA256/runtime version;
- generation parameters;
- full composed prompt SHA256;
- response SHA256;
- process exit code;
- workflow run identity/time.

Pair validation requires all shared identity fields and generation parameters to match while requiring different modes. It must not require full composed prompt hashes to match.

## Trigger boundary

Local context injection does not exercise Copilot/ChatGPT Agent Skill discovery.

All trigger claims from this lane remain:

`UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION`

No local-output result can promote SimCore or any second scope by itself.

## Workflow

Add `.github/workflows/agent-skill-zero-credit-eval.yml`.

Initial event policy:

- `workflow_dispatch` for real local inference;
- no scheduled execution;
- ordinary PR/push Agent Skills CI runs only mechanical contract tests and never downloads the model/runtime.

Permissions: `contents: read` only.

The live local workflow may fetch `release-usage-dashboard` read-only for context generation, but must not persist credentials and must not push.

## Mechanical CI gates

Extend `tools/agent-skill-eval/tests/` and Agent Skills CI to prove:

1. zero-credit workflow has no Copilot permission/call;
2. workflow has no secret/PAT/API-key dependency;
3. runtime/model URLs are pinned and SHA256 verified before use;
4. workflow uses standard `ubuntu-24.04` runner, not a larger runner;
5. local context builder is bounded and fail-closed;
6. pair receipts require same user-task/evidence identities;
7. full prompt hashes may differ only because target skill guidance differs;
8. trigger result is always unobservable in this lane;
9. ordinary Agent Skills CI performs no local-model download/inference;
10. existing `plugin-authority-scan` and `plugin-impact-scope` regressions remain green.

## Execution / cost interpretation

For this public repository, standard GitHub-hosted runner usage is free under GitHub Actions billing rules. That is separate from AI-credit accounting. The zero-credit claim here specifically means no Copilot AI credits and no external hosted-model API credits are consumed.

A future repository visibility or runner-class change must re-evaluate compute billing independently.

## Completion

Implementation is `ZERO_CREDIT_LANE_READY` when merged and mechanically green.

A real local pair becomes `ZERO_CREDIT_OUTPUT_PAIR_EXECUTED` only after an actual workflow run produces a valid pair receipt.

Qualitative review is a separate `ZERO_CREDIT_OUTPUT_REVIEWED` step.

Trigger status remains `UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION`.
