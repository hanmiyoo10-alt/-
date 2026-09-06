# SimCore MCP-01 — `simcore_status` read-only tool

Date: 2026-09-06
Tracking: #1680
Classification: TOOLING · MCP · READ_ONLY · DESIGN_FIRST

## 1. Purpose

MCP-01 introduces a dedicated read-only SimCore MCP server with one initial tool: `simcore_status`.

The tool exists to collapse the repeated authority checks currently performed manually before and after SimCore work. It must report status; it must never mutate SimCore state.

This is a tooling lane, not a plugin runtime release. `release-simcore` remains the production-code authority and MUST NOT be modified by MCP-01.

## 2. Authority model

`simcore_status` MUST read and distinguish the following authorities:

- `main`: design, evidence, roadmap, administrative state, `product-manifest.json`.
- `release-simcore`: deployed plugin code.
- `product-manifest.json`: declared production identity and current validation/priority metadata.
- `plugins/simcore/latest.js` and `plugins/simcore/install.js` on `release-simcore`: deployed-byte parity authority.
- GitHub open issues: active anomaly / repair tracking.

The tool MUST NOT infer that one authority overrides another silently. Drift must be surfaced explicitly.

## 3. First tool contract

Tool name: `simcore_status`

Inputs: none for the normal SimCore repository. Repository identity may be configured by environment for development/testing.

Output MUST be structured JSON with at least:

```json
{
  "ok": true,
  "repository": "hanmiyoo10-alt/-",
  "main": {"sha": "..."},
  "release": {"branch": "release-simcore", "sha": "..."},
  "production": {
    "version": "...",
    "name": "...",
    "manifest_release_commit": "...",
    "manifest_release_blob": "..."
  },
  "parity": {
    "expected_identical": true,
    "latest_blob": "...",
    "install_blob": "...",
    "identical": true
  },
  "validation": {
    "status": "...",
    "priority": "...",
    "milestone": "...",
    "phase": "...",
    "checkpoint": "..."
  },
  "tracking": {
    "fix": [],
    "watch": [],
    "blocker": [],
    "defer": []
  },
  "drift": [],
  "errors": []
}
```

Exact field additions are allowed; removing these semantic groups is not.

## 4. Drift checks

MCP-01 MUST surface, at minimum:

1. manifest `release_commit` != actual `release-simcore` head;
2. manifest `release_blob` != actual production file blob;
3. `latest.js` blob != `install.js` blob when `expected_identical` is true;
4. declared production files cannot be read;
5. malformed or missing manifest fields.

Drift is status, not an automatic write. MCP-01 MUST NOT repair drift.

## 5. Open issue classification

The tool may use GitHub labels when present. Because historical SimCore issues are not guaranteed to be consistently labeled, it MUST also support conservative text classification from issue title/body using explicit tokens such as `FIX`, `WATCH`, `BLOCKER`, and `DEFER`.

Unknown classifications MUST remain unclassified rather than being guessed.

Pull requests returned by GitHub's issues endpoint MUST be excluded from issue tracking output.

## 6. Failure semantics

The server is read-only and fail-visible.

- A partial GitHub read failure MUST NOT fabricate a healthy status.
- `ok` is false when a required authority read fails or a hard parity/drift invariant fails.
- `errors` contains machine-readable source/error entries.
- Successfully read sections remain present even if another section fails.
- Network and API errors MUST be bounded by request timeout.

## 7. Authentication and configuration

Environment:

- `SIMCORE_GITHUB_REPO` default: `hanmiyoo10-alt/-`
- `SIMCORE_GITHUB_TOKEN` optional for the public repository; supported for authenticated/private/rate-limit-safe access.
- `SIMCORE_MAIN_BRANCH` default: `main`
- `SIMCORE_RELEASE_BRANCH` default: `release-simcore`
- `SIMCORE_GITHUB_API` default: `https://api.github.com`

Secrets MUST never be returned in MCP results or logs.

## 8. Implementation boundary

Initial implementation target: `tools/simcore-mcp/`.

Python is preferred because the repository already contains Python tooling and the official MCP Python SDK v2 is current stable. MCP-01 should use the v2 high-level `MCPServer` API rather than the removed v1 `FastMCP` import path.

The GitHub reader should be isolated from the MCP registration layer so status aggregation can be unit-tested without a live network.

Suggested modules:

- `server.py` — MCP registration / stdio entrypoint.
- `status.py` — authority aggregation and drift logic.
- `github_reader.py` — bounded read-only GitHub REST adapter.
- `tests/` — deterministic fixture-based tests.

## 9. Validation contract

Before MCP-01 is considered complete:

- Python syntax/static validation passes.
- unit tests cover healthy parity, latest/install mismatch, release-head drift, malformed manifest, partial API failure, and issue classification.
- an in-memory MCP client can call `simcore_status` and receive structured content.
- no write-capable GitHub method exists in the MCP-01 adapter.
- existing SimCore CI / main health remains green.

## 10. Non-goals

MCP-01 does NOT:

- deploy SimCore;
- mutate `release-simcore`;
- update manifests or docs;
- create/close issues or PRs;
- execute HUMAN_EVIDENCE decisions;
- repair #1657 or #1660;
- add any write-capable MCP operation.

Those capabilities, if ever added, require separate design and review lanes.

## 11. Completion meaning

MCP-01 is complete when a caller can ask the MCP server for one status snapshot and receive the same core authority picture that currently requires several manual GitHub reads, with explicit drift and failure reporting and zero mutation capability.
