# SimCore MCP

Dedicated read-only MCP tooling for SimCore.

Available tools:

- MCP-01: `simcore_status`
- MCP-02: `simcore_verify_production_identity`

`simcore_status` provides the broad operational snapshot. `simcore_verify_production_identity` is a focused hard-invariant verifier for manifest, release-head, deployed-blob, parity, and userscript-version identity.

## What it reads

- `main` head / `product-manifest.json`
- the manifest-declared release branch head
- deployed production files declared by the manifest
- open GitHub issues for explicit FIX / WATCH / BLOCKER / DEFER tracking (`simcore_status` only)

It does not contain GitHub write methods.

## MCP-02 production identity checks

`simcore_verify_production_identity` returns a deterministic `pass` plus ordered `checks`, hard `violations`, and bounded `errors`.

It verifies:

- manifest availability and required identity fields
- manifest release commit vs actual release head
- manifest release blob vs actual latest-file blob
- latest/install blob parity when identical files are required
- exact `//@version` metadata in latest/install vs manifest production version

Missing, ambiguous, or unreadable authority fails closed. MCP-02 does not inspect runtime behavior, decide HUMAN_EVIDENCE, or deploy anything.

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
python -c "from mcp.server import MCPServer; from simcore_mcp.server import mcp; print('MCP SERVER IMPORT PASS:', type(mcp).__name__)"
```

For an in-memory protocol smoke of MCP-01:

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

For MCP-02, use the same client pattern with:

```python
result = await client.call_tool("simcore_verify_production_identity", {})
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

`MCPServer.run()` uses stdio by default.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SIMCORE_GITHUB_REPO` | `hanmiyoo10-alt/-` | repository |
| `SIMCORE_MAIN_BRANCH` | `main` | design/admin authority |
| `SIMCORE_RELEASE_BRANCH` | `release-simcore` | configured release fallback/status authority |
| `SIMCORE_GITHUB_API` | `https://api.github.com` | GitHub REST base |
| `SIMCORE_GITHUB_TOKEN` | unset | optional authentication |
| `SIMCORE_GITHUB_TIMEOUT_SECONDS` | `8` | bounded request timeout |

`GITHUB_TOKEN` is accepted as a fallback token. Tokens are never returned by MCP tools.

MCP-02 uses the release branch declared by `product-manifest.json` as the identity authority it verifies; it does not silently replace an invalid manifest branch with a configured fallback.

## Tests

```bash
cd tools/simcore-mcp
python -m unittest discover -s tests -v
```

The status and identity verifier logic is intentionally independent from the MCP SDK, so authority and fail-close behavior can be tested without starting an MCP transport.

## Safety boundary

All current SimCore MCP tools are read-only. They cannot deploy, edit branches, update manifests, create or close issues, merge PRs, execute workflows, or execute HUMAN_EVIDENCE decisions.
