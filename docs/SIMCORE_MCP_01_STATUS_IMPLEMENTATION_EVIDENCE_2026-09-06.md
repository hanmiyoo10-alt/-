# SimCore MCP-01 `simcore_status` Implementation Evidence

Date: 2026-09-06
Tracking: #1680
Design PR: #1681
Implementation PR: #1682
Classification: TOOLING · MCP · READ_ONLY

## 1. Installed implementation

Main merge commit:

`be45188260cee1bf9033a80ede9dca22c56fb832`

Installed path:

`tools/simcore-mcp/`

MCP-01 currently contains:

- `simcore_mcp/github_reader.py`
- `simcore_mcp/status.py`
- `simcore_mcp/server.py`
- `tests/test_status.py`
- `pyproject.toml`
- `README.md`

The only MCP tool registered by MCP-01 is:

`simcore_status`

## 2. Safety boundary

The GitHub adapter is read-only and issues HTTP `GET` requests only.

MCP-01 contains no operation for:

- branch mutation;
- file mutation;
- issue or pull-request mutation;
- release invocation;
- `release-simcore` mutation;
- production deployment;
- HUMAN_EVIDENCE state transition.

The tooling lane is intentionally separate from plugin runtime fixes and release work.

## 3. Status contract implemented

The status tool aggregates:

- actual `main` head;
- actual `release-simcore` head;
- declared production identity from `product-manifest.json`;
- `latest.js` / `install.js` deployed blob parity;
- validation status, current priority, milestone, phase, checkpoint;
- open issue classification for explicit `FIX`, `WATCH`, `BLOCKER`, and `DEFER` signals;
- hard drift list;
- partial GitHub read errors.

Implemented hard drift checks include:

- manifest release commit vs actual release branch head;
- manifest release blob vs actual `latest.js` blob;
- `latest.js` vs `install.js` mismatch when identical production files are required;
- missing / malformed manifest authority.

## 4. Local deterministic validation

Executed before repository upload:

```text
python -m compileall -q simcore_mcp tests
PASS

python -m unittest discover -s tests -v
8 tests / 8 PASS
```

Covered cases:

1. healthy snapshot;
2. latest/install mismatch;
3. release-head drift;
4. release-blob drift;
5. manifest read failure;
6. partial issue API failure;
7. issue classification by label/body;
8. missing production path.

## 5. Repository CI evidence

Design PR #1681:

- SimCore CI run #8157: PASS.

Implementation PR #1682, exact head `930d089be96e5967ea734f2852281afccc081359`:

- SimCore CI run #8159: PASS.
- Plugin Control Plane PR observe: PASS.

Merged main `be45188260cee1bf9033a80ede9dca22c56fb832`:

- SimCore CI run #8160: PASS.

Implementation-evidence merge `b045229b69664a34a898b52ccc00b315f5c42759`:

- SimCore CI run #8164: PASS.
- main remained on the evidence merge after post-merge health; no automatic revert was observed.

This satisfies repository-health validation for the installed tooling files and the evidence lane.

## 6. Production non-mutation proof

After MCP-01 merge:

```text
release-simcore head = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob      = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest == install    = YES
```

The deployed SimCore runtime remains v0.70.10. MCP-01 did not touch production.

## 7. Termux live protocol smoke

A real Termux aarch64 Android environment was used for the MCP SDK and protocol-layer closeout.

Observed environment:

```text
Python 3.14.6
pip 26.2.1
rustc 1.98.1
cargo 1.98.1
clang 21.1.8
mcp 2.1.1
pydantic-core 2.46.5
```

### 7.1 Termux dependency compatibility

Plain `python -m pip install -e .` initially fell back to source builds for Rust-backed dependencies because Android wheels were unavailable for the active CPython / ABI target.

Observed first failures:

- `rpds-py` source build attempted a temporary rustup bootstrap and failed for `aarch64-unknown-linux-android`;
- after using Termux-native `python-rpds-py`, the next source-build gate was `pydantic-core`.

The validated Termux path was:

```bash
pkg install python-pip python-rpds-py python-cryptography rust clang make pkg-config -y
python -m pip install maturin
python -m pip install -e .
```

Termux-native Rust then built Android wheels successfully for:

- `maturin 1.15.0`;
- `pydantic-core 2.46.5`.

Import checks passed:

```text
PYDANTIC CORE PASS: 2.46.5
MCP-01 IMPORT PASS: MCPServer
```

Tracking for this compatibility finding: #1687.

### 7.2 In-memory MCP protocol invocation

The official SDK in-memory client path was exercised against the installed MCP server:

```python
import anyio
from mcp import Client
from simcore_mcp.server import mcp

async def main():
    async with Client(mcp, raise_exceptions=True) as client:
        result = await client.call_tool("simcore_status", {})
        print(result.is_error)
        print(result.structured_content)

anyio.run(main)
```

Observed result:

```text
IS_ERROR: False
```

`structured_content` returned all intended top-level groups:

- `ok`
- `repository`
- `main`
- `release`
- `production`
- `parity`
- `validation`
- `tracking`
- `drift`
- `errors`

The live snapshot reported:

```text
ok                 = True
repository         = hanmiyoo10-alt/-
main               = b045229b69664a34a898b52ccc00b315f5c42759
release-simcore    = ecc55f026315c6482c34d267aba2adb97527cdbc
production         = 0.70.10 · Host-Local Telemetry Set Cost Attribution
latest blob        = 53f6959039c57f8673c355fcc1c22b573150e4a7
install blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
parity identical   = True
validation         = PENDING_REAL_LONG_CHAT
drift              = []
errors             = []
```

This proves the MCP protocol layer, registered tool dispatch, GitHub read path, structured response contract, production identity read, parity calculation, tracking aggregation, and healthy no-drift result on a real package-installed host.

## 8. Current verdict

```text
DESIGN                = PASS
IMPLEMENTATION        = PASS
LOCAL STATUS TESTS    = PASS (8/8)
PR CI                 = PASS
MERGED MAIN HEALTH    = PASS
PRODUCTION IMMUTABLE  = PASS
TERMUX SDK INSTALL    = PASS
MCP SERVER IMPORT     = PASS
MCP PROTOCOL SMOKE    = PASS
LIVE STATUS RESULT    = PASS (ok=True, drift=[], errors=[])
OVERALL                = MCP-01 ACCEPTANCE COMPLETE
```
