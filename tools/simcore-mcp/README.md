# SimCore MCP

Dedicated read-only MCP tooling for SimCore.

MCP-01 exposes one tool: `simcore_status`.

## What it reads

- `main` head
- `release-simcore` head
- `product-manifest.json`
- deployed `plugins/simcore/latest.js` and `install.js` blobs
- open GitHub issues for explicit FIX / WATCH / BLOCKER / DEFER tracking

It does not contain GitHub write methods.

## Requirements

- Python 3.10+
- MCP Python SDK v2 (`mcp>=2,<3`)

## Install

```bash
cd tools/simcore-mcp
python -m pip install -e .
```

For development, the official SDK CLI extra is useful:

```bash
python -m pip install "mcp[cli]>=2,<3"
```

## Run over stdio

```bash
simcore-mcp
```

or:

```bash
python -m simcore_mcp.server
```

`MCPServer.run()` uses stdio by default, which is the intended MCP-01 transport.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SIMCORE_GITHUB_REPO` | `hanmiyoo10-alt/-` | repository |
| `SIMCORE_MAIN_BRANCH` | `main` | design/admin authority |
| `SIMCORE_RELEASE_BRANCH` | `release-simcore` | deployed-code authority |
| `SIMCORE_GITHUB_API` | `https://api.github.com` | GitHub REST base |
| `SIMCORE_GITHUB_TOKEN` | unset | optional authentication |
| `SIMCORE_GITHUB_TIMEOUT_SECONDS` | `8` | bounded request timeout |

`GITHUB_TOKEN` is accepted as a fallback token. Tokens are never returned by the MCP tool.

## Test status logic

```bash
cd tools/simcore-mcp
python -m unittest discover -s tests -v
```

The status aggregator is intentionally independent from the MCP SDK, so authority and drift behavior can be tested without starting an MCP transport.

## Safety boundary

MCP-01 is read-only. It cannot deploy, edit branches, update manifests, create or close issues, merge PRs, or execute HUMAN_EVIDENCE decisions.
