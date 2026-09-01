# Repository Agent Skill Zero-Credit Request Trigger Design — 2026-09-01

## Status

**DESIGN READY — IMPLEMENTATION AUTHORIZED**

Tracking: issue #1129

## Problem

The zero-credit local-model output-eval lane is implemented on `main`, but its live execution surface currently depends on `workflow_dispatch`. The connected GitHub control surface available to ChatGPT can create branches/files/PRs and inspect Actions, but it cannot invoke workflow dispatch directly.

The repository therefore needs a second, equally bounded trigger that can be initiated through ordinary Git writes without requiring the user to run commands or consume Copilot/hosted-model credits.

## Goal

Allow ChatGPT to request one exact zero-credit output-eval pair by creating one control file on one dedicated request branch, while preserving every existing cost, provenance, and safety boundary.

The request trigger is an **execution-control surface only**. It does not change Agent Skill validation semantics, does not validate automatic skill discovery, and does not promote any scope.

## Trigger contract

Extend `.github/workflows/agent-skill-zero-credit-eval.yml` with a push trigger restricted to both:

- branch glob: `agent-skill-zero-credit-request/**`
- path glob: `.agent-skill-zero-credit-requests/*.json`

`workflow_dispatch` remains supported.

A push-triggered run is valid only when the pushed commit:

1. has exactly one parent;
2. adds exactly one file;
3. that file is under `.agent-skill-zero-credit-requests/` and ends in `.json`;
4. changes no other path;
5. is on the dedicated request branch namespace;
6. contains a valid bounded request object;
7. names its parent commit as `target_repository_sha`.

The target repository state for evaluation is the request commit's parent, not the request-control commit itself.

## Request schema

```json
{
  "schema_version": 1,
  "skill": "plugin-authority-scan",
  "case_id": "1",
  "target_repository_sha": "<40-hex-parent-sha>"
}
```

Initial allowlisted skills remain exactly:

- `plugin-authority-scan`
- `plugin-impact-scope`

The case id must be a non-empty bounded string and must still exist in the selected skill's source-controlled output eval fixture when the normal prepare step runs.

## Resolver

Add `tools/agent-skill-eval/resolve_zero_credit_request.py`.

For `workflow_dispatch`, it returns the dispatch skill/case and current checked-out repository SHA.

For `push`, it must deterministically verify the request-commit shape above using Git object reads, parse the request JSON from the pushed commit, prove `target_repository_sha == parent(commit)`, and return:

- execution trigger;
- request commit SHA;
- target repository SHA;
- request path;
- skill;
- case id.

It performs no network access and no mutation.

## Checkout/provenance rule

The workflow initially checks out the event/request commit only long enough to resolve the control file. After resolution it checks out `target_repository_sha` detached before context construction, prompt composition, model download, or inference.

A source-controlled request-provenance JSON artifact records both the request commit and evaluated target commit. The target commit is the repository SHA used by the eval matrix/receipts.

This prevents the control file itself from becoming part of the evaluated repository state.

## Cost boundary

The request trigger preserves the zero-credit contract:

- no Copilot CLI;
- no `copilot-requests: write`;
- no GitHub Models;
- no hosted inference API;
- no repository secret or PAT;
- standard `ubuntu-24.04` GitHub-hosted CPU only;
- pinned SHA256-verified llama.cpp/model artifacts only.

The push request itself is just a Git control write. The only inference remains local CPU inference inside the dedicated workflow.

## Ordinary-CI boundary

The dedicated zero-credit workflow may execute inference only on explicit `workflow_dispatch` or the narrowly scoped request-branch/path push.

Normal PR/main Agent Skills CI continues to perform mechanical tests only and must never download the model or execute `llama-cli`.

Update Agent Skills CI path filters so a workflow-only change to `.github/workflows/agent-skill-zero-credit-eval.yml` still runs the mechanical contract tests.

## Trigger-observability boundary

This execution trigger is not Agent Skill trigger selection.

Actual skill discovery/selection remains:

`UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION`

A successful request-triggered output pair may establish `ZERO_CREDIT_OUTPUT_PAIR_EXECUTED`, but it cannot establish Copilot trigger PASS or second-scope promotion.

## Mechanical tests

Add regressions proving at minimum:

- valid single-file request commit resolves;
- extra changed path fails closed;
- non-added request file fails closed;
- wrong request branch fails closed;
- `target_repository_sha` mismatch fails closed;
- unallowlisted skill fails closed;
- malformed/empty case id fails closed;
- dispatch resolution remains supported;
- workflow push trigger is restricted to the request branch/path globs;
- workflow checks out the target SHA before context/inference;
- ordinary Agent Skills CI still contains no local-model download/inference commands;
- zero-credit permissions remain `contents: read` only.

## First acceptance

After implementation merges and main mechanical CI is green:

1. create a dedicated request branch from the then-current `main`;
2. add exactly one request JSON for `plugin-authority-scan`, output case `1`, targeting that branch's parent/main SHA;
3. observe the resulting `Agent Skill Zero-Credit Eval` run;
4. require both local inference modes to exit successfully and pair validation to report `PAIR_VALID`;
5. download/read the bounded artifact and record response/receipt hashes plus run id in issue #1129;
6. do not auto-score a qualitative winner;
7. keep trigger discovery `UNOBSERVABLE_WITH_LOCAL_CONTEXT_INJECTION`.

If model/runtime download or local inference fails, record the failure as execution evidence and diagnose; do not silently switch to Copilot or a hosted API.

## Non-goals

- auto-running model inference on normal PR/main pushes;
- user-run development commands;
- Copilot credit consumption;
- hosted inference fallback;
- automatic qualitative scoring;
- automatic second-scope promotion;
- plugin/product/runtime/release changes.
