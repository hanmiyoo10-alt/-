# SimCore MCP-02 Production Identity Verifier Design

Date: 2026-09-06
Tracking: #1691
Classification: TOOLING · MCP · READ_ONLY · DESIGN_FIRST

## 1. Goal

Add a second read-only SimCore MCP tool:

`simcore_verify_production_identity()`

MCP-02 is a focused hard-invariant verifier. Unlike `simcore_status()`, it does not aggregate issue tracking or general operational context. It answers one question only:

> Does the declared SimCore production identity agree with the actual deployed release authority?

The result is designed to be directly reusable by later release-preflight tooling.

## 2. Authority

MCP-02 reads only:

- `product-manifest.json` from `main`;
- the actual head of the manifest-declared release branch;
- the manifest-declared production files on that release branch.

Authority split remains unchanged:

- `main` = design/evidence/admin and product-manifest authority;
- `release-simcore` (or manifest-declared release branch) = deployed plugin-code authority.

No source may be mutated.

## 3. Inputs

No normal tool arguments.

Repository/branch configuration continues to come from the existing `GitHubReader` environment configuration.

## 4. Output contract

Top-level fields:

- `pass`: boolean; true only when there are zero read errors and every required invariant passes;
- `repository`;
- `main`: branch and manifest blob identity;
- `release`: branch and actual head SHA;
- `declared`: manifest production version, release commit, release blob, production paths, expected parity;
- `observed`: actual latest/install blobs and parsed userscript versions;
- `checks`: ordered per-invariant results;
- `violations`: failed hard invariant records;
- `errors`: bounded read/parse failures.

Each `checks` item contains:

- `code`;
- `pass`;
- `expected`;
- `actual`;
- `source`.

Each violation repeats the failed check with severity `hard`.

## 5. Required hard invariants

MCP-02 verifies at least these invariants:

1. `MANIFEST_AVAILABLE`
   - `product-manifest.json` must be readable and valid JSON.

2. `PRODUCTION_VERSION_VALID`
   - manifest `production_version` must be a non-empty string.

3. `RELEASE_BRANCH_VALID`
   - manifest `release_branch` must be a non-empty string.

4. `RELEASE_COMMIT_VALID`
   - manifest `release_commit` must be a non-empty string.

5. `RELEASE_HEAD_MATCH`
   - manifest `release_commit` must equal actual release-branch head.

6. `RELEASE_BLOB_VALID`
   - manifest `release_blob` must be a non-empty string.

7. `LATEST_PATH_VALID`
   - manifest production latest path must be a non-empty string.

8. `INSTALL_PATH_VALID`
   - manifest production install path must be a non-empty string.

9. `RELEASE_BLOB_MATCH`
   - manifest `release_blob` must equal actual latest-file blob.

10. `PRODUCTION_FILE_PARITY`
    - when `expected_identical` is true, latest/install blobs must be equal.

11. `LATEST_VERSION_MATCH`
    - latest userscript `//@version` must parse exactly and equal manifest `production_version`.

12. `INSTALL_VERSION_MATCH`
    - install userscript `//@version` must parse exactly and equal manifest `production_version`.

A missing prerequisite produces a failed check and/or bounded error; it must never silently become PASS.

## 6. Version parsing

Only the userscript metadata line is authority for this MCP invariant:

`//@version <value>`

Parsing is anchored per line and bounded. MCP-02 does not scan runtime semantics, execute plugin code, or infer a version from release names/comments.

A missing or ambiguous metadata line fails closed.

## 7. Read-failure semantics

GitHub/API failures are represented in `errors`.

`pass` is false whenever `errors` is non-empty.

MCP-02 must preserve already-observed good facts even if a later read fails, but it must not fabricate missing authority values.

## 8. Non-goals

MCP-02 does not:

- inspect FIX/WATCH/BLOCKER issues;
- decide HUMAN_EVIDENCE or live validation status;
- deploy or publish SimCore;
- update manifests;
- mutate branches/files/issues/PRs;
- execute release workflows;
- validate behavioral equivalence;
- replace repository CI.

## 9. Implementation shape

Recommended files:

- new `simcore_mcp/production_identity.py` containing pure verifier logic;
- register `simcore_verify_production_identity` in `server.py`;
- new `tests/test_production_identity.py` with a focused fake reader;
- update README tool inventory and usage.

The existing MCP-01 `simcore_status()` behavior should remain unchanged.

## 10. Deterministic tests

Minimum test matrix:

1. healthy identity => PASS;
2. release-head mismatch => `RELEASE_HEAD_MATCH` violation;
3. manifest release-blob mismatch => `RELEASE_BLOB_MATCH` violation;
4. latest/install parity mismatch => `PRODUCTION_FILE_PARITY` violation;
5. latest metadata version mismatch => `LATEST_VERSION_MATCH` violation;
6. install metadata version mismatch => `INSTALL_VERSION_MATCH` violation;
7. missing/invalid manifest => fail closed;
8. missing production path => fail closed;
9. production-file read failure remains visible and cannot PASS.

## 11. Acceptance

MCP-02 is complete only when:

1. design is recorded on `main`;
2. implementation lands on a separate tooling branch;
3. deterministic tests pass;
4. PR-head SimCore CI passes;
5. implementation merges to `main`;
6. merged-main SimCore CI passes with no auto-revert;
7. `release-simcore` remains unchanged;
8. MCP protocol smoke invokes `simcore_verify_production_identity` and returns a structured result.

MCP-02 remains read-only throughout.