# Repository Agent Skill Live Eval Execution Design — 2026-09-01

Status: **DESIGN READY — IMPLEMENTATION NOT STARTED / LIVE AI EXECUTION SEPARATELY GATED**

Issue: #1125

## 1. Problem

The repository now has two mechanically tested Agent Skills:

- `plugin-authority-scan`
- `plugin-impact-scope`

Both intentionally separate static fixtures/mechanical CI from live model evidence. Their current promotion blocker is the absence of a repository-owned execution surface that can compare the same eval prompt under:

```text
WITH TARGET SKILL
vs
BASELINE WITHOUT TARGET SKILL
```

Static `evals.json` files are test definitions only. They are not execution evidence.

## 2. Current external execution constraint

The retired GitHub Models inference API is not an eligible new execution backend.

Current GitHub Copilot CLI supports non-interactive execution in GitHub Actions using the built-in `GITHUB_TOKEN` when the workflow grants:

```text
contents: read
copilot-requests: write
```

No PAT is required for that path.

This repository is personally owned. A live Copilot request can consume/bill Copilot AI credits to the repository owner. Therefore installation of an eval harness and execution of a live eval are separate transactions.

## 3. Core safety rule

Normal repository activity must never create AI eval spend.

The live workflow is therefore:

```text
workflow_dispatch only
+ explicit credit acknowledgement
+ least-privilege token
+ read-only model tools
+ bounded selected cases
+ artifacts only
```

No `push`, `pull_request`, `schedule`, `issue_comment`, release, or repository event may invoke Copilot.

Mechanical PR/push CI may validate the harness itself, but must perform zero model calls.

## 4. Repository shape

```text
tools/agent-skill-eval/
├── prepare_eval.py
├── validate_receipt.py
└── tests/
    ├── test_prepare_eval.py
    ├── test_validate_receipt.py
    └── test_workflow_contract.py

.github/workflows/agent-skill-live-eval.yml
```

The runner is repository infrastructure, not an Agent Skill and not plugin runtime code.

## 5. First supported skills

Initial execution allowlist:

```text
plugin-authority-scan
plugin-impact-scope
```

This allowlist is an eval-harness safety boundary only. It does not change either skill's `PILOT_VALIDATED_SCOPES` and does not promote SimCore.

Unknown/unallowlisted skills fail closed before model invocation.

## 6. Fixture contract

The target skill must contain:

```text
.agents/skills/<skill>/SKILL.md
.agents/skills/<skill>/evals/evals.json
```

Optional trigger fixtures may be present under the same `evals/` directory.

`prepare_eval.py` reads only source-controlled fixtures and emits a bounded deterministic matrix.

The first implementation must reject:

- malformed JSON;
- missing prompt/case id;
- duplicate case id;
- empty prompt;
- unallowlisted skill;
- excessive case count;
- unrecognized eval kind;
- path traversal or absolute skill names.

## 7. Isolation contract

Every selected output eval case produces exactly two modes from the same repository SHA.

### 7.1 `with_skill`

The checkout remains in canonical repository layout. The target skill is present in `.agents/skills/<skill>/`.

### 7.2 `baseline_without_target_skill`

The repository starts from the same SHA. Before Copilot invocation, only the target skill directory is moved into a harness quarantine directory that is outside all Copilot skill discovery roots.

Other repository skills remain present.

This isolates the target skill rather than comparing against an unrelated empty repository agent environment.

Before each invocation the workflow must mechanically prove:

```text
with_skill:
  target SKILL.md exists in canonical path

baseline_without_target_skill:
  target canonical path absent
  quarantined target copy exists
```

If those proofs fail, the model is not invoked.

## 8. Identical prompt rule

Within one case pair, the exact prompt bytes passed to Copilot must be identical.

The runner computes and records:

```text
prompt_sha256
```

`validate_receipt.py` rejects a pair whose prompt hashes differ.

The prompt itself must not say "use the target skill" unless the fixture is explicitly a direct-invocation eval. Otherwise that would contaminate trigger/relevance evaluation.

## 9. Copilot runtime contract

The first implementation uses GitHub Copilot CLI in programmatic mode.

Requirements:

- install a source-declared npm package version;
- set `COPILOT_AUTO_UPDATE=false` and pass `--no-auto-update`;
- record `copilot --version` because package version alone is not runtime identity;
- pass one explicit model name, never `auto` for comparable pairs;
- use fresh programmatic sessions per case/mode;
- disable custom instructions so unrelated repository instructions do not create uncontrolled comparison drift;
- disable built-in MCP servers;
- disable workspace MCP loading;
- disable repository hooks/extensions in prompt mode;
- disable remote session export/access;
- run with `--no-ask-user`;
- restrict available model tools to read-only file discovery plus skill invocation:

```text
view
glob
grep
skill
```

No shell, write/edit/create/apply_patch, URL/web, MCP, task/subagent, memory, or ask-user tool is available.

The workflow itself may use ordinary shell steps to prepare workspaces and receipts. Those shell steps are deterministic harness code, not model tools.

## 10. Model identity

The dispatch input selects one explicit model from a small repository allowlist.

Initial design allowlist:

```text
claude-haiku-4.5
claude-sonnet-4.6
gpt-5.4
```

This is an eval runner allowlist, not a product-model policy.

The default should favor the lower-cost/lightweight supported model for first evidence runs. The actual chosen value is recorded in every receipt.

## 11. Credit acknowledgement

The workflow dispatch contains a required string input such as:

```text
credit_ack
```

The workflow must compare it to one exact phrase before installing or invoking Copilot:

```text
I_UNDERSTAND_COPILOT_AI_CREDITS_MAY_BE_USED
```

Any other value exits non-zero in the preflight step.

The preflight gate must appear before:

- Node setup used for Copilot;
- npm install of Copilot;
- any command containing `copilot -p`.

This keeps accidental dispatches cheap and fail-closed.

## 12. Bounded execution

First implementation limits a dispatch to:

- one target skill;
- one eval kind;
- one selected case id, or at most two cases when an explicit bounded `all` mode is later reviewed;
- two model invocations per output case (with/baseline).

No retries are automatic after a successful model response.

A transport/auth/model failure is evidence of execution failure, not permission to loop and spend repeatedly.

## 13. Execution receipts

For every mode, emit a JSON receipt containing at least:

```text
schema_version
repository_sha
workflow_run_id
workflow_run_attempt
skill
skill_sha256
fixture_sha256
case_id
eval_kind
mode
prompt_sha256
requested_model
copilot_package_version
copilot_runtime_version
response_sha256
response_path
process_exit_code
executed_at_utc
skill_presence_proof
```

The raw response is stored as a bounded workflow artifact for review. It does not become repository authority.

Do not store the `GITHUB_TOKEN` or authentication headers in artifacts.

## 14. Receipt validator

`validate_receipt.py` performs structural/provenance validation only.

It verifies:

- recognized schema;
- same repository SHA across a pair;
- same skill/fixture/case/model/CLI identity across a pair;
- same prompt hash;
- exactly one `with_skill` and one `baseline_without_target_skill`;
- presence/absence proof matches mode;
- response hashes exist when process exit is zero;
- no receipt claims unsupported automatic qualitative verdicts.

It may output:

```text
PAIR_VALID
PAIR_INVALID
EXECUTION_INCOMPLETE
```

It must not output `SKILL_BETTER`, `PROMOTED`, or equivalent model-quality truth.

## 15. Output eval interpretation

After a successful pair exists, objective assertions may be checked mechanically only when the fixture declares an unambiguous machine-checkable property.

Qualitative dimensions remain review evidence, including:

- correctness beyond exact assertions;
- source discipline;
- unnecessary work/tool usage;
- clarity;
- context/cost tradeoff;
- whether target instructions actually improved behavior.

No generic weighted score is introduced in v1.

## 16. Trigger eval boundary

A trigger fixture is not considered live-validated merely because the response content resembles the skill.

The first implementation may execute trigger prompts, but it can mark target invocation only when machine-readable Copilot session evidence proves that the `skill` tool selected/invoked the target skill.

If that evidence is absent or the CLI output format cannot expose it reliably:

```text
TRIGGER_OBSERVABILITY = UNOBSERVABLE
```

Do not infer invocation from answer quality or vocabulary.

## 17. Workflow artifact handling

Artifacts are execution evidence, not source truth.

Recommended artifact contents:

```text
manifest.json
with_skill/receipt.json
with_skill/response.jsonl
baseline_without_target_skill/receipt.json
baseline_without_target_skill/response.jsonl
pair-validation.json
```

Retention should be bounded.

No artifact is committed automatically to `main`.

## 18. Mechanical CI

Ordinary Agent Skills CI or a companion test job must cover the harness without invoking Copilot.

Required tests include:

1. target allowlist accept/reject;
2. fixture parser reject malformed/duplicate/empty cases;
3. case selection is bounded;
4. prompt pair hashes are identical;
5. with-skill workspace presence proof;
6. baseline target skill is absent from canonical discovery path;
7. other skills remain untouched;
8. receipt provenance mismatch rejection;
9. receipt incomplete execution classification;
10. workflow is `workflow_dispatch` only;
11. permissions are only `contents: read` + `copilot-requests: write`;
12. exact credit-ack preflight precedes Copilot install/run;
13. no repository secret/PAT reference;
14. Copilot auto-update disabled;
15. explicit model allowlist exists;
16. no write/shell/url/MCP/task model tool is exposed;
17. no ordinary CI path invokes Copilot;
18. plugin/product/runtime/release files unchanged.

## 19. Security notes

Copilot CLI is agentic even when used only for evaluation. Therefore v1 intentionally denies mutation-capable model tools.

The checkout is treated as untrusted model-readable input, not as permission to execute repository content.

In particular:

- no shell tool is exposed to the model;
- repository MCP servers/hooks/extensions are not loaded;
- URL access is not exposed;
- no repository write token permission is granted;
- outputs remain artifacts only.

## 20. Cost notes

A merged workflow consumes no Copilot AI credits while dormant.

A live dispatch can consume AI credits. In this personally-owned repository, GitHub documents that `GITHUB_TOKEN` Copilot CLI usage is billed to the repository owner's Copilot seat.

Therefore:

```text
HARNESS MERGE != LIVE EVAL AUTHORIZATION
```

The implementation transaction ends after mechanical CI/main proof. Live invocation requires a separate explicit authorization after the user has been told that credits may be used.

## 21. Non-goals

Do not:

- auto-trigger on PR/push/schedule;
- hide or silently spend AI credits;
- create PATs/secrets;
- use retired GitHub Models;
- allow model writes or shell execution;
- auto-promote a skill;
- auto-expand `PILOT_VALIDATED_SCOPES`;
- claim trigger PASS without invocation observability;
- modify Usage Dashboard/SimCore production artifacts;
- replace the existing Agent Skills mechanical CI.

## 22. Implementation sequence

```text
freeze this design
→ implement deterministic prepare/receipt validators
→ add unit/workflow-contract tests
→ add dormant workflow_dispatch live runner
→ ordinary PR CI: zero model calls
→ merge after mechanical green
→ main mechanical read-back/CI
→ record LIVE_EVAL_READY / LIVE_NOT_EXECUTED
→ only later, with explicit credit authorization, dispatch one bounded pilot eval
```

## 23. Verdict

**Build the isolated live-eval surface now, but keep it dormant. The repository should gain a trustworthy execution path without silently converting routine CI into paid model traffic.**
