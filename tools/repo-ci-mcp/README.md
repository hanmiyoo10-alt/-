# Repository Read MCP

Read-only MCP surface for bounded repository result retrieval.

## Tools

```text
repo_ci_summary(workflow?, ref?, run_id?)
canonical_main_status()
```

`repo_ci_summary` retrieves one exact normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` block from GitHub Actions job logs and validates that the rendered run id and commit prefix match GitHub run metadata. A valid compact `FAIL` still returns `ok: true`; `ok` means retrieval and validation succeeded, not that CI passed.

`canonical_main_status` implements the canonical-main `STATUS_SESSION` read plan as one user-visible MCP call. Internally it reads direct `main`, reads issue #485, then re-reads direct `main` as a capture-coherence barrier. Direct `main` remains repository authority and #485 remains a derived operator projection. A mismatch returns `SETTLING_OR_STALE`; main movement, invalid/missing capsule data, or read failure returns `UNKNOWN` rather than green-by-absence.

## Safety boundary

- GitHub reads only
- no issue, PR, release, workflow, product, runtime, ref, branch, or production mutation
- canonical-main composition preserves explicit direct-main and issue-485 source locators
- canonical-main capsule fields are bounded and parsed fail-closed
- CI summary supports nine explicit compact-summary workflow families only
- newest matching CI run only in latest mode; no stale-green fallback
- exact CI run mode fails closed on workflow/ref mismatch
- no arbitrary product-log semantic parsing
- <=100 jobs, <=8 MiB decoded log per job, <=64 lines / <=64 KiB compact CI block
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
