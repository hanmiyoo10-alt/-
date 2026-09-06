# Repository CI MCP

Read-only MCP surface for Repository CI Compact Summary v1.

The first tool is:

```text
repo_ci_summary(workflow?, ref?, run_id?)
```

It retrieves one exact normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` block from GitHub Actions job logs and validates that the rendered run id and commit prefix match GitHub run metadata. A valid compact `FAIL` still returns `ok: true`; `ok` means retrieval and validation succeeded, not that CI passed.

## Safety boundary

- GitHub reads only
- nine explicit compact-summary workflow families only
- newest matching run only in latest mode; no stale-green fallback
- exact run mode fails closed on workflow/ref mismatch
- no arbitrary product-log semantic parsing
- <=100 jobs, <=8 MiB decoded log per job, <=64 lines / <=64 KiB compact block
- cross-origin redirects strip `Authorization`
- no issue, PR, release, workflow, product, runtime, or production mutation

## Supported workflow keys

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
