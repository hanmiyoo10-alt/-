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

## Termux / Android

On Termux aarch64 Android, pip may not find compatible prebuilt wheels for Rust-backed dependencies such as `rpds-py` and `pydantic-core`. A validated Python 3.14 path is:

```bash
pkg install python-pip python-rpds-py python-cryptography rust clang make pkg-config -y
python -m pip install maturin
cd tools/simcore-mcp
python -m pip install -e .
```

The Termux-native Rust toolchain allows pip / maturin to build Android wheels when an upstream wheel is unavailable.

Useful verification commands:

```bash
python -c "import pydantic_core; print('PYDANTIC CORE PASS:', pydantic_core.__version__)"
python -c "from mcp.server import MCPServer; from simcore_mcp.server import mcp; print('MCP-01 IMPORT PASS:', type(mcp).__name__)"
```

For an in-memory protocol smoke:

```bash
cat > "$TMPDIR/simcore_mcp_smoke.py" <<'PY'
import anyio
from mcp import Client
from simcore_mcp.server import mcp

async def main():
    async with Client(mcp, raise_exceptions=True) as client:
        result = await client.call_tool("simcore_status", {})
        print("IS_ERROR:", result.is_error)
        print("STRUCTURED:")
        print(result.structured_content)

anyio.run(main)
PY

python "$TMPDIR/simcore_mcp_smoke.py"
```

Termux should use `$TMPDIR` or a writable home path for temporary smoke scripts rather than assuming `/tmp` is writable.

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
