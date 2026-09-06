# SimCore MCP-02 Protocol Smoke Closeout

Date: 2026-09-06
Tracking: #1691
Classification: TOOLING · MCP · READ_ONLY · LIVE_PROTOCOL_EVIDENCE

## 1. Gate under test

Tool:

`simcore_verify_production_identity()`

This closeout records a real MCP client invocation from the user's Termux checkout after updating to fresh `main`.

The acceptance gate required:

- MCP import / registration succeeds;
- `Client(mcp)` can invoke `simcore_verify_production_identity`;
- `result.is_error` is false;
- structured output is present;
- top-level `pass` is true for a healthy production authority;
- every hard invariant passes;
- `violations` is empty;
- `errors` is empty.

## 2. Termux source refresh

The checkout was updated with:

```text
git switch main
git pull --ff-only
```

The update advanced the local checkout from the earlier MCP-01 state to main containing MCP-02 implementation and evidence.

The implementation import probe returned:

```text
MCP-02 CODE PASS
```

## 3. Real MCP protocol invocation

The live test used the official in-memory MCP client path:

```python
import anyio
from mcp import Client
from simcore_mcp.server import mcp

async def main():
    async with Client(mcp, raise_exceptions=True) as client:
        result = await client.call_tool(
            "simcore_verify_production_identity",
            {}
        )
        print("IS_ERROR:", result.is_error)
        print("STRUCTURED:")
        print(result.structured_content)

anyio.run(main)
```

Observed protocol result:

```text
IS_ERROR: False
```

Observed top-level verifier result:

```text
pass       = True
violations = []
errors     = []
```

## 4. Observed production identity

The structured MCP result reported:

```text
repository             = hanmiyoo10-alt/-
main branch            = main
manifest blob          = dcacef6a88a18456fa7b70211021f36d2332f5b0
release branch         = release-simcore
release head           = ecc55f026315c6482c34d267aba2adb97527cdbc
production version     = 0.70.10
declared release commit= ecc55f026315c6482c34d267aba2adb97527cdbc
declared release blob  = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest blob            = 53f6959039c57f8673c355fcc1c22b573150e4a7
install blob           = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest version         = 0.70.10
install version        = 0.70.10
```

The production authority observed through MCP therefore matched the manifest and release branch exactly at the time of the live invocation.

## 5. Hard-invariant matrix

All twelve ordered checks returned `pass: True`:

1. `MANIFEST_AVAILABLE`
2. `PRODUCTION_VERSION_VALID`
3. `RELEASE_BRANCH_VALID`
4. `RELEASE_COMMIT_VALID`
5. `RELEASE_BLOB_VALID`
6. `LATEST_PATH_VALID`
7. `INSTALL_PATH_VALID`
8. `RELEASE_HEAD_MATCH`
9. `RELEASE_BLOB_MATCH`
10. `PRODUCTION_FILE_PARITY`
11. `LATEST_VERSION_MATCH`
12. `INSTALL_VERSION_MATCH`

Notably:

- release head matched the declared release commit;
- `latest.js` blob matched the declared release blob;
- `latest.js` and `install.js` were identical;
- both userscript versions matched the manifest production version.

## 6. Acceptance verdict

```text
MCP IMPORT / REGISTRATION       = PASS
REAL MCP CLIENT INVOCATION      = PASS
MCP result.is_error             = False
STRUCTURED OUTPUT               = PASS
TOP-LEVEL VERIFIER PASS         = True
HARD INVARIANTS                 = PASS (12/12)
VIOLATIONS                      = []
ERRORS                          = []
PRODUCTION IDENTITY             = CONSISTENT
MCP-02 PROTOCOL SMOKE           = PASS
OVERALL                         = COMPLETE
```

## 7. Safety / scope

This closeout is evidence-only.

The live MCP tool remained read-only and did not mutate:

- `main`;
- `release-simcore`;
- `product-manifest.json`;
- production plugin files;
- issues or pull requests;
- release state or HUMAN_EVIDENCE state.

The only repository mutation associated with this closeout is this documentation synchronization and the tracking issue closeout.

## 8. Closure

MCP-02 has now satisfied the remaining protocol acceptance gate documented in the implementation evidence.

Tracking issue #1691 may be closed as completed after this closeout document passes PR-head CI, merges to `main`, and merged-main health is green (or a successor-main green run proves the merged closeout remains present after a superseding concurrent commit).
