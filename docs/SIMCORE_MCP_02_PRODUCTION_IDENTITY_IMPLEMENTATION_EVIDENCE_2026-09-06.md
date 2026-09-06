# SimCore MCP-02 Production Identity Verifier Implementation Evidence

Date: 2026-09-06
Tracking: #1691
Design PR: #1696
Implementation PR: #1697
Classification: TOOLING · MCP · READ_ONLY

## 1. Delivered tool

MCP-02 adds one focused read-only MCP tool:

`simcore_verify_production_identity()`

Installed tooling files changed by the implementation:

- `tools/simcore-mcp/simcore_mcp/production_identity.py` (new)
- `tools/simcore-mcp/tests/test_production_identity.py` (new)
- `tools/simcore-mcp/simcore_mcp/server.py`
- `tools/simcore-mcp/README.md`

No SimCore plugin runtime file changed.

## 2. Safety boundary

MCP-02 reuses the existing read-only `GitHubReader`. The GitHub adapter contains GET-only reads and no write operation.

MCP-02 cannot:

- mutate branches or files;
- change `product-manifest.json`;
- mutate issues or pull requests;
- execute workflows;
- deploy or publish SimCore;
- mutate `release-simcore`;
- transition HUMAN_EVIDENCE or live-validation state.

MCP-01 `simcore_status()` remains registered and unchanged in behavior.

## 3. Hard-invariant contract

The verifier returns:

- deterministic top-level `pass`;
- repository and main/release authority facts;
- declared manifest identity;
- observed production blobs and userscript versions;
- ordered `checks`;
- hard `violations`;
- bounded `errors`.

Implemented checks:

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

The release branch used for identity verification is the manifest-declared release branch. An invalid manifest branch does not silently fall back to another release branch.

Userscript-version parsing accepts exactly one anchored metadata line:

`//@version <value>`

Missing or ambiguous version metadata fails closed and is surfaced in `errors` plus the corresponding failed hard check.

## 4. Deterministic validation

Before repository upload:

```text
python -m compileall -q simcore_mcp tests
PASS
```

Focused MCP-02 test matrix:

```text
10 tests / 10 PASS
```

Covered cases:

1. healthy production identity;
2. release-head mismatch;
3. manifest release-blob mismatch;
4. latest/install parity mismatch;
5. latest metadata-version mismatch;
6. install metadata-version mismatch;
7. unavailable/invalid manifest fail-close;
8. missing production path fail-close;
9. production-file read failure remains visible;
10. duplicate/ambiguous `//@version` fail-close.

## 5. Design evidence

Design PR #1696 head:

`a005bca50562d059a75718c2483c889fae158b9a`

- PR-head SimCore CI #8176: PASS.
- design merge commit: `9f875d409b4c718cd329e09ae9fb76343f4b4619`.

The immediate merged-main SimCore CI #8177 was cancelled because `main` advanced concurrently. This was classified as a superseded run, not a design failure.

Successor fresh main `b4ff5ea10516bf9361ffeb3ab4d8753d86a51702` contains `9f875d409b...` as a parent and ran SimCore CI #8178: PASS. The design was not auto-reverted.

## 6. Implementation evidence

Implementation branch:

`feat/simcore-mcp-02-production-identity-20260906`

Implementation PR #1697 exact head:

`eacf36a7a19f53be8d54866b547b8d87f42a7d1b`

Pre-PR compare against fresh main showed:

- behind: 0
- changed files: exactly 4 tooling files listed in section 1
- plugin/runtime files: 0

PR-head SimCore CI #8179: PASS.

Implementation merged as:

`abf2430817668e9e20aa21edf154b4136ae57226`

Merged-main SimCore CI #8180: PASS.

A concurrent repository-management sequence then created and removed a temporary MCP implementation marker. Fresh main became:

`5f470f60abb0fd5721dc3ad8812d2ab641ed9036`

Its tree SHA is the same implementation tree as `abf243...`:

`c8d76f7b4b0d80b28eac12a1f13e72e4a10a4894`

Therefore the marker cleanup did not change the installed MCP-02 code tree. SimCore CI #8182 on that fresh main: PASS.

## 7. Production non-mutation proof

After MCP-02 implementation and successor-main validation:

```text
release-simcore head = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob      = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest == install    = YES
latest //@version    = 0.70.10
install //@version   = 0.70.10
```

Production remains SimCore v0.70.10. MCP-02 did not mutate deployment authority.

## 8. Remaining acceptance gate

`MCP protocol invocation of simcore_verify_production_identity = NOT_EXERCISED`

The implementation is installed and repository-validated, but MCP-02 is not complete until a real MCP client calls the new tool and receives structured output.

Required closeout:

1. update the already-working Termux MCP checkout to fresh `main`;
2. invoke `simcore_verify_production_identity` through `Client(mcp)`;
3. confirm `IS_ERROR: False`;
4. confirm a structured result with deterministic `pass`, checks, violations, and errors;
5. if current production authority is healthy, confirm `pass: True`, `violations: []`, and `errors: []`;
6. preserve the live output on #1691 and close MCP-02 only after this gate.

## 9. Current verdict

```text
DESIGN                       = PASS
IMPLEMENTATION               = PASS
LOCAL MCP-02 TESTS           = PASS (10/10)
PR CI                        = PASS (#8179)
MERGED MAIN HEALTH           = PASS (#8180)
SUCCESSOR MAIN HEALTH        = PASS (#8182)
PRODUCTION IMMUTABLE         = PASS
MCP-02 PROTOCOL SMOKE        = NOT_EXERCISED
OVERALL                      = IMPLEMENTED / PROTOCOL SMOKE PENDING
```
