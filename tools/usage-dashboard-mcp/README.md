# Local Usage Dashboard MCP

Dedicated read-only MCP tooling for Local Usage Dashboard.

MCP-UD-01 exposes exactly one tool: `usage_dashboard_status`.

## What it reads

GitHub/release authority:

- `main` head
- `release-usage-dashboard` head
- `plugins/usage-dashboard/runtime/product-manifest.json`
- `plugins/usage-dashboard/latest.js` blob identity on `main` and release

Optional same-device runtime authority:

- `http://127.0.0.1:39117/health`
- authenticated `http://127.0.0.1:39117/snapshot?profile=light`

The MCP output is sanitized. Bridge credentials, GitHub tokens, raw Credits organization IDs, and raw snapshot payloads are never returned.

For full local-runtime validation, run MCP-UD-01 on the same Termux device that hosts the Usage Dashboard bridge. A different device can still read GitHub/release authority, but it cannot reach the other phone's `127.0.0.1:39117`.

## Safety boundary

MCP-UD-01 is read-only. It cannot:

- write or merge GitHub branches/issues/PRs
- mutate `release-usage-dashboard`
- trigger exact-byte promotion
- sync/adopt/restart/update the bridge manager
- mutate plugin/runtime/PocketRisu state
- mark physical acceptance PASS/FAIL

Missing data remains unknown/null. It is never inferred as zero or false.

## Requirements

- Python 3.10+
- MCP Python SDK v2 (`mcp>=2,<3`)

## Install

Desktop/Linux environments with compatible wheels can use:

```bash
cd tools/usage-dashboard-mcp
python -m pip install -e .
```

### Termux / Android

CPython 3.14 on aarch64 Android may not have PyPI wheels for Rust-backed dependencies such as `rpds-py` and `pydantic-core`. A plain `pip install` can therefore fall back to an unsupported temporary rustup target (`aarch64-unknown-linux-android`).

Reuse the validated SimCore MCP Termux dependency path:

```bash
pkg install python-pip python-rpds-py python-cryptography rust clang make pkg-config -y
python -m pip install maturin
python -m pip install -e .
```

For installation directly from the repository commit, install the native Termux prerequisites first, then run the Git URL install. The initial failing `pip install` does not mean the MCP package itself is invalid; dependency installation stops before `mcp`/`anyio` are committed to the environment.

## Run over stdio

```bash
usage-dashboard-mcp
```

or:

```bash
python -m usage_dashboard_mcp.server
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `USAGE_DASHBOARD_MCP_GITHUB_REPO` | `hanmiyoo10-alt/-` | repository |
| `USAGE_DASHBOARD_MCP_MAIN_BRANCH` | `main` | design/materialized authority |
| `USAGE_DASHBOARD_MCP_RELEASE_BRANCH` | `release-usage-dashboard` | production authority |
| `USAGE_DASHBOARD_MCP_GITHUB_API` | `https://api.github.com` | GitHub REST base |
| `USAGE_DASHBOARD_MCP_GITHUB_TOKEN` | unset | optional GitHub auth |
| `USAGE_DASHBOARD_MCP_GITHUB_TIMEOUT_SECONDS` | `8` | bounded GitHub timeout |
| `USAGE_DASHBOARD_MCP_BRIDGE_URL` | `http://127.0.0.1:39117` | same-device bridge |
| `USAGE_DASHBOARD_MCP_BRIDGE_TOKEN_FILE` | unset | optional explicit token-file path |
| `USAGE_DASHBOARD_MCP_BRIDGE_TIMEOUT_SECONDS` | `5` | bounded bridge timeout |

`GITHUB_TOKEN` is accepted as a GitHub-token fallback. Neither token is returned by the tool.

If no explicit bridge token file is configured, the reader checks the existing local ownership paths:

- `~/.config/llmgateway-devpass-bridge/token`
- `~/.config/local-usage-dashboard/token`

The bridge URL is fail-closed to loopback HTTP only, and MCP-UD-01 exposes no arbitrary proxy route.

## Test status logic

```bash
cd tools/usage-dashboard-mcp
python -m unittest discover -s tests -v
```

Status aggregation is independent from the MCP SDK so authority, parity, partial-failure, redaction, and unknown-preservation behavior can be tested without a live MCP transport.

## Validation still requiring Termux

Repository/unit validation does not replace same-device MCP protocol evidence. Before MCP-UD-01 is called fully validated, run the import/in-memory protocol smoke on the actual Termux device and confirm the live localhost bridge summary is sanitized.
