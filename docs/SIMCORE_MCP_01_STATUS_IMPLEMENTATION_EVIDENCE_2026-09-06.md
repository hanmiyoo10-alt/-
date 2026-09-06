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

This satisfies repository-health validation for the installed tooling files.

## 6. Production non-mutation proof

After MCP-01 merge:

```text
release-simcore head = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob      = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest == install    = YES
```

The deployed SimCore runtime remains v0.70.10. MCP-01 did not touch production.

## 7. Remaining validation

`MCP SDK in-memory / real-host invocation = NOT_EXERCISED`

Reason:

The execution environment used for this implementation does not have the MCP Python SDK installed, and external package installation from that environment is unavailable. Therefore it would be incorrect to claim a successful protocol-layer invocation.

This is not a code or repository CI failure. The pure status layer is validated and installed; the protocol-layer smoke remains an explicit pending gate.

Required closeout:

1. install `mcp>=2,<3` in an environment with package access;
2. run an in-memory `Client(mcp)` call or connect through an MCP host;
3. call `simcore_status`;
4. confirm structured content and expected live authority values;
5. record evidence on #1680 and close MCP-01 only then.

## 8. Current verdict

```text
DESIGN                = PASS
IMPLEMENTATION        = PASS
LOCAL STATUS TESTS    = PASS (8/8)
PR CI                 = PASS
MERGED MAIN HEALTH    = PASS
PRODUCTION IMMUTABLE  = PASS
MCP PROTOCOL SMOKE    = NOT_EXERCISED
OVERALL                = IMPLEMENTED / LIVE MCP VALIDATION PENDING
```
