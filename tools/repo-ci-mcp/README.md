# Repository Read MCP

Read-only MCP surface for bounded repository result retrieval.

## Tools

```text
repo_ci_summary(workflow?, ref?, run_id?)
repo_ci_overview(workflows, ref?)
repo_ci_exact_sha(sha, workflow?, event?, ref?, before_sha?)
repo_notebook_read(path, ref?, start_cell=0, max_cells=20, include_outputs=false)
repo_branch_protection(branch="main")
canonical_main_status()
```

`repo_ci_summary` retrieves one exact normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` block from GitHub Actions job logs and validates that the rendered run id and commit prefix match GitHub run metadata. A valid compact `FAIL` still returns `ok: true`; `ok` means retrieval and validation succeeded, not that CI passed.

### Generic execution receipt projection for CI summaries

`repo_ci_mcp.execution_receipt` is a pure translator from an already-produced `repo_ci_summary()` object into facts accepted by the repository-wide `REPOSITORY_EXECUTION_RECEIPT` projector. It does not call GitHub, enumerate runs/jobs, parse raw logs, choose workflows, or mutate repository state.

```text
GitHub Actions
→ GitHubReader
→ repo_ci_summary()
→ execution_receipt.project_ci_summary_facts()
→ execution-receipt.cjs
→ REPOSITORY_EXECUTION_RECEIPT
```

The adapter preserves the selected run ID, exact `head_sha`, and source job identity through source/artifact locators. Only `PASS` with `summary.complete=true` and internally consistent completed-run metadata can become generic `PASS`. Incomplete `PASS` and `NOOP` remain non-PASS; `FAIL` remains `FAIL`; `INFRA_ERROR` and `CANCELLED` are `BLOCKED`; `UNKNOWN` stays `UNKNOWN`; malformed or contradictory evidence cannot be promoted to green. `ok=false` Repository Read MCP error codes remain bounded reason codes and are classified fail-closed.

The raw compact-summary text is deliberately omitted from the normal GPT-facing facts. Run/job locators remain available for targeted drill-down. This projection is derived evidence only and does not replace GitHub Required, protected-branch, release, production, or project-specific authority.

`repo_ci_overview` accepts an explicit ordered list of 2–5 supported workflow families and projects their existing `repo_ci_summary` results into one bounded first-pass response. It preserves each workflow's CI result, completeness, run identity, source locator, and bounded errors without embedding every full compact-summary text block. `ok` means all requested summaries were retrieved and validated. Mixed `FAIL`, `INFRA_ERROR`, `CANCELLED`, `UNKNOWN`, incomplete summaries, or retrieval failures remain visible through `attention_required`, `attention_workflows`, and deterministic result counts. There is deliberately no aggregate green `PASS` label. Use `repo_ci_summary` for one workflow or targeted drill-down.

The overview uses the existing latest-per-workflow ref semantics. It is not an atomic exact-current-main snapshot across independently triggered workflow families and does not substitute older green runs.

`repo_ci_exact_sha` inventories GitHub Actions runs at one full commit SHA with the repository-wide `head_sha` filter and no event restriction. Optional workflow absence classification is fail-closed: `RAN`, `EXPECTED_NO_RUN_PATH_FILTER`, `TRIGGER_NOT_APPLICABLE`, `BLOCKED_CAPABILITY`, `MISSING_UNEXPECTED`, or `UNKNOWN`. Strong no-run reasons require exact workflow source plus applicable event/ref evidence; path-filter reasons additionally require an exact `before_sha` transition and complete changed-path evidence. Unsupported trigger syntax, ambiguous transition identity, transport failure, or configured bounds preserve `UNKNOWN` rather than guessing.

`repo_notebook_read` resolves the requested Git ref to one exact commit and reads one repository-relative `.ipynb` at that immutable identity. It returns a bounded cell window with markdown/code/raw source and safe notebook metadata. Saved outputs are off by default; optional output projection keeps bounded textual forms while omitting binary/image, HTML, JavaScript, and attachment payloads. This is fresh-on-call GitHub state, not a view of unsaved Colab or uncommitted remote-working-tree edits.

`repo_branch_protection` reads the requested branch summary first, then requests full GitHub branch-protection detail only when the summary says the branch is protected. A protected branch whose detail endpoint returns HTTP 403 remains `PARTIAL / DETAIL_READ_BLOCKED_PERMISSION` with its protected summary preserved; it is never reported as unprotected. `UNPROTECTED / NOT_CONFIGURED` is reserved for an explicit live branch summary with `protected=false`. Other transport or malformed-detail failures remain `UNKNOWN`. Returned detail is bounded and counts restriction principals rather than serializing user/team/app identities.

`canonical_main_status` implements the canonical-main `STATUS_SESSION` read plan as one user-visible MCP call. Internally it reads direct `main`, reads issue #485, then re-reads direct `main` as a capture-coherence barrier. Direct `main` remains repository authority and #485 remains a derived operator projection. A mismatch returns `SETTLING_OR_STALE`; main movement, invalid/missing capsule data, or read failure returns `UNKNOWN` rather than green-by-absence.

The same captured #485 body also contributes a bounded triage index for `Active P0/P1 incidents` and `Attention queue (P2)`. The index returns only severity, state, incident issue number, reason code, known/count/truncation metadata, and explicit triage parse reason codes when the section is missing, unknown, or malformed. It does not fetch incident bodies automatically. Detailed evidence remains a targeted incident-issue drill-down, so routine non-clear orientation does not require a second visible #485 read.

## Safety boundary

- GitHub reads only
- branch-protection detail is summary-first and preserves permission-blocked partial evidence without requesting or exposing token material
- notebook paths are repository-relative `.ipynb` only and refs are pinned to an exact commit before content retrieval
- notebook source is <=1 MiB; each read returns 1–50 cells with bounded source/output text
- notebook saved outputs are source-only by default; binary/image, HTML, JavaScript, and attachment payloads are omitted
- no issue, PR, release, workflow, product, runtime, ref, branch, or production mutation
- canonical-main composition preserves explicit direct-main and issue-485 source locators
- canonical-main capsule fields are bounded and parsed fail-closed
- canonical-main triage projection reuses the already-fetched #485 body and adds no repository read
- canonical-main incident rows are bounded to 8 rendered rows per section while preserving total count and truncation state
- missing/unknown/malformed triage sections remain explicit unknowns rather than empty-by-absence
- CI summary supports ten explicit compact-summary workflow families only
- CI overview requires an explicit 2–5 workflow list; no all-ten default scan
- CI overview omits bundled full summary text and preserves targeted `repo_ci_summary` drill-down
- newest matching CI run only in latest mode; no stale-green fallback
- exact CI run mode fails closed on workflow/ref mismatch
- no arbitrary product-log semantic parsing
- <=100 jobs, <=8 MiB decoded log per job, <=64 lines / <=64 KiB compact CI block per component summary
- cross-origin redirects strip `Authorization`

## Supported CI workflow keys

- `simcore`
- `plugin-control-plane`
- `usage-dashboard`
- `canonical-main-proof-bundle`
- `agent-skills`
- `termux-response-watch`
- `termux-background-gpt`
- `termux-large-doc-prototype`
- `termux-taskbridge`
- `repository-read-mcp`

Exact workflow path and exact workflow display name are also accepted.

## Environment

```text
REPO_CI_GITHUB_REPO=hanmiyoo10-alt/-
REPO_CI_GITHUB_API=https://api.github.com
REPO_CI_GITHUB_TOKEN=...
REPO_CI_GITHUB_TIMEOUT_SECONDS=20
```

`GITHUB_TOKEN` is an optional token fallback. Public-repository reads may work without a token but are more rate-limited.

## Install

```bash
cd tools/repo-ci-mcp
python -m pip install -e .
```

Termux may require the same native-package prerequisites as the repository's other MCP Python SDK v2 packages before installing `mcp>=2,<3`.

## Run

```bash
repo-ci-mcp
```

The default MCP transport is stdio through `MCPServer`.
