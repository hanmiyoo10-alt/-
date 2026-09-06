# Repository Read MCP

Read-only MCP surface for bounded repository result retrieval.

## Tools

```text
repo_ci_summary(workflow?, ref?, run_id?)
repo_ci_overview(workflows, ref?)
canonical_main_status()
```

`repo_ci_summary` retrieves one exact normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` block from GitHub Actions job logs and validates that the rendered run id and commit prefix match GitHub run metadata. A valid compact `FAIL` still returns `ok: true`; `ok` means retrieval and validation succeeded, not that CI passed.

`repo_ci_overview` accepts an explicit ordered list of 2–5 supported workflow families and projects their existing `repo_ci_summary` results into one bounded first-pass response. It preserves each workflow's CI result, completeness, run identity, source locator, and bounded errors without embedding every full compact-summary text block. `ok` means all requested summaries were retrieved and validated. Mixed `FAIL`, `INFRA_ERROR`, `CANCELLED`, `UNKNOWN`, incomplete summaries, or retrieval failures remain visible through `attention_required`, `attention_workflows`, and deterministic result counts. There is deliberately no aggregate green `PASS` label. Use `repo_ci_summary` for one workflow or targeted drill-down.

The overview uses the existing latest-per-workflow ref semantics. It is not an atomic exact-current-main snapshot across independently triggered workflow families and does not substitute older green runs.

`canonical_main_status` implements the canonical-main `STATUS_SESSION` read plan as one user-visible MCP call. Internally it reads direct `main`, reads issue #485, then re-reads direct `main` as a capture-coherence barrier. Direct `main` remains repository authority and #485 remains a derived operator projection. A mismatch returns `SETTLING_OR_STALE`; main movement, invalid/missing capsule data, or read failure returns `UNKNOWN` rather than green-by-absence.

The same captured #485 body also contributes a bounded triage index for `Active P0/P1 incidents` and `Attention queue (P2)`. The index returns only severity, state, incident issue number, reason code, known/count/truncation metadata, and explicit triage parse reason codes when the section is missing, unknown, or malformed. It does not fetch incident bodies automatically. Detailed evidence remains a targeted incident-issue drill-down, so routine non-clear orientation does not require a second visible #485 read.

## Safety boundary

- GitHub reads only
- no issue, PR, release, workflow, product, runtime, ref, branch, or production mutation
- canonical-main composition preserves explicit direct-main and issue-485 source locators
- canonical-main capsule fields are bounded and parsed fail-closed
- canonical-main triage projection reuses the already-fetched #485 body and adds no repository read
- canonical-main incident rows are bounded to 8 rendered rows per section while preserving total count and truncation state
- missing/unknown/malformed triage sections remain explicit unknowns rather than empty-by-absence
- CI summary supports nine explicit compact-summary workflow families only
- CI overview requires an explicit 2–5 workflow list; no all-nine default scan
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
