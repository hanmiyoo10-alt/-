# SimCore MCP

Dedicated read-only MCP tooling for SimCore.

Available tools:

- MCP-01: `simcore_status`
- MCP-02: `simcore_verify_production_identity`
- MCP-03: `simcore_check_docs_drift`
- MCP-04: `simcore_release_preflight`
- MCP-05: `simcore_postmerge_health`
- MCP-06: `simcore_candidate_snapshot`
- MCP-07: `simcore_candidate_preflight`

`simcore_status` provides the broad operational snapshot. `simcore_verify_production_identity` is a focused hard-invariant verifier for manifest, release-head, deployed-blob, parity, and userscript-version identity. `simcore_check_docs_drift` verifies that current documentation authority remains synchronized with manifest-owned machine state without judging historical prose. `simcore_release_preflight` composes MCP-02 and MCP-03 with exact target validation-profile checks to provide a conservative read-only advisory preflight. `simcore_postmerge_health` observes whether an exact main commit remains represented by current `main`, has acceptable merged-main workflow evidence, has not been explicitly reverted, and still matches the production baseline declared at that commit. `simcore_candidate_snapshot` resolves a candidate ref to an immutable commit and inspects exact candidate identity, file parity, first-parent diff shape, production-parent context, and frozen validation-profile context. `simcore_candidate_preflight` composes MCP-06 with MCP-04 under a frozen main/release authority envelope and cross-binds the candidate version, release name, profile blob, and production authority.

The release-oriented read tools have deliberately different jobs:

```text
MCP-04 = version preflight
MCP-06 = concrete candidate snapshot
MCP-07 = frozen-authority candidate preflight composition
```

None of these tools authorizes publication.

## What it reads

- `main` head / `product-manifest.json`
- the manifest-declared development-memory document
- the manifest-declared release branch head
- deployed production files declared by the manifest
- exact target validation profiles under `products/simcore/releases/validation-profiles/` (`simcore_release_preflight`, `simcore_candidate_snapshot`, and `simcore_candidate_preflight`)
- exact candidate commits and candidate first-parent comparisons (`simcore_candidate_snapshot` and `simcore_candidate_preflight`)
- exact target commits, target-to-main comparisons, target-time `product-manifest.json`, and bounded main-push workflow runs (`simcore_postmerge_health` only)
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

## MCP-03 documentation drift checks

`simcore_check_docs_drift` returns a deterministic `pass` plus ordered `checks`, hard `violations`, and bounded `errors`.

It verifies:

- manifest `development_memory` availability and readability
- exactly one machine-managed production snapshot block
- production snapshot product/version/release/branch/commit/blob/validation/milestone/phase/checkpoint values against the manifest
- exactly one active `SIMCORE_RELEASE_STATE:*` begin/end pair with matching mode
- release-state production commit and validation status against the manifest
- the established active-human current-state section boundary
- the active human section still contains its authority guide and no duplicate `Production verdict`
- the active human section contains no explicit `v0.x.y` runtime version, 40-hex identity, or exact manifest current-priority literal

Historical ledgers are intentionally outside the active-human identity check, so preserved old version/SHA evidence does not trigger drift. MCP-03 does not auto-repair documentation or infer arbitrary semantic prose freshness.

## MCP-04 release preflight

`simcore_release_preflight(version)` accepts an exact numeric `X.Y.Z` target version and returns deterministic `ready`, ordered `checks`, hard `violations`, bounded `errors`, and component reports.

It composes the existing MCP-02 and MCP-03 verifier functions and additionally verifies:

- the target version is exact and strictly newer than the currently declared production version
- an exact validation profile exists at `products/simcore/releases/validation-profiles/<version>.json`
- profile schema/version/name/contracts are structurally valid
- all R2.10 required contracts are present
- each contract uses an explicit supported validation mode
- inherited authorities name predecessor versions rather than self-reference
- exact-current/changed-contract authorities bind to the target version
- `CURRENT_IDENTITY_INHERIT_BEHAVIOR` declares `authorityIdentity.releaseName`
- optional `rejectVersions` entries are exact, unique, and never reject the target itself

The Python validation-profile projection mirrors the bounded rules currently enforced by SimCore's canonical JavaScript release tooling; it does not replace that release authority.

`ready: true` means only that the read-only authorities inspected by MCP-04 are coherent. It does **not** authorize, stage, materialize, approve, or deploy a release, and it does not decide HUMAN_EVIDENCE.

## MCP-05 post-merge health

`simcore_postmerge_health(commit_sha)` accepts one exact 40-hex commit SHA and returns deterministic `healthy`, ordered `checks`, hard `violations`, bounded `errors`, workflow evidence, explicit-revert evidence, the target-time production baseline, and current MCP-02/MCP-03 component reports.

It verifies:

- the target commit resolves and remains an ancestor of current configured `main`
- the bounded target-to-main successor scan contains no explicit generated revert of the target
- merged-main SimCore CI has an acceptable `push` success
- Canonical Main Documentation Stream has an acceptable `push` success
- an exact-target hard workflow failure cannot be masked by a later successful run
- an exact-target cancelled/skipped run may use the earliest proven successful descendant run
- a queued/in-progress exact run cannot be replaced by older or successor green evidence
- `product-manifest.json` at the exact target commit is readable
- target-time production version/branch/commit/blob still match the current coherent production identity
- current production identity and current documentation drift components both pass

Workflow search is bounded to three pages of 100 runs per workflow. Successor acceptance requires Git compare ancestry proof. The explicit-revert check recognizes standard `This reverts commit <sha>` evidence and exact conventional `Revert "<target subject>"` subjects; it does not claim to detect an unrelated hand-written semantic reversal.

`healthy: true` is a read-only observation for the supplied target commit. It does not merge, rerun workflows, repair documentation, authorize a release, or preserve a historical target as healthy after a later legitimate production release changes the production baseline.

## MCP-06 candidate snapshot

`simcore_candidate_snapshot(ref)` treats `ref` only as a locator, resolves it to an immutable commit SHA, and returns an exact read-only snapshot of the candidate.

It observes:

- resolved candidate commit SHA, subject, and parents
- exact `latest.js` and `install.js` blobs and byte parity
- userscript, runtime, and Host version convergence
- unique current-version release-name headers
- first-parent changed paths against the fixed production-file allowlist
- whether the candidate parent matches the currently observed production head
- validation-profile context read from a reported frozen current-main SHA

Top-level `ok` describes whether required transport/parse authority was available. `canonical_candidate_shape.pass` is a separate structural observation. A readable candidate can therefore return `ok: true` with `canonical_candidate_shape.pass: false`.

Neither value authorizes release.

## MCP-07 candidate preflight

`simcore_candidate_preflight(ref)` is the read-only composition point between MCP-06 and MCP-04.

At the start of one call it freezes:

```text
M = configured main SHA
P = configured release-simcore SHA
```

It then resolves the requested candidate ref to immutable candidate SHA `C`, runs MCP-06 semantics through a read-only adapter pinned to `M/P`, derives the target version only from the candidate's parsed userscript identity, and runs MCP-04 for that derived version through the same pinned authority.

MCP-07 adds ten composition checks:

- `CANDIDATE_SNAPSHOT_OK`
- `CANDIDATE_CANONICAL_SHAPE_PASS`
- `CANDIDATE_TARGET_VERSION_VALID`
- `RELEASE_PREFLIGHT_READY`
- `CANDIDATE_VERSION_MATCHES_PREFLIGHT_TARGET`
- `CANDIDATE_RELEASE_NAME_MATCHES_PROFILE`
- `CANDIDATE_PROFILE_BLOB_MATCHES_PREFLIGHT`
- `SNAPSHOT_MAIN_MATCHES_FROZEN_AUTHORITY`
- `SNAPSHOT_RELEASE_MATCHES_FROZEN_AUTHORITY`
- `PREFLIGHT_RELEASE_MATCHES_FROZEN_AUTHORITY`

The authority-pinning adapter exposes only the bounded read methods required by MCP-04/MCP-06 and does not forward arbitrary attributes or write primitives.

`ready: true` requires no top-level errors and no failed composition check. It means the exact candidate snapshot, canonical candidate shape, target-version preflight, validation profile, and frozen production authority agree. It still does **not** create an approval/spec/receipt, decide HUMAN_EVIDENCE, dispatch a workflow, move a ref, or authorize publication.

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

For MCP-03:

```python
result = await client.call_tool("simcore_check_docs_drift", {})
```

For MCP-04:

```python
result = await client.call_tool(
    "simcore_release_preflight",
    {"version": "0.70.11"},
)
```

Judge the target version against fresh repository authority at execution time. A structurally successful MCP call may correctly return `ready: false` when the supplied target is no longer newer than production or another preflight invariant fails.

For MCP-05:

```python
result = await client.call_tool(
    "simcore_postmerge_health",
    {"commit_sha": "<exact-40-hex-main-commit>"},
)
```

Judge the supplied target against fresh repository authority at execution time. A structurally successful MCP call may correctly return `healthy: false` when a required exact run is still pending, no proven successful descendant has superseded a cancelled run, an explicit revert is present, or production has legitimately advanced beyond that target's baseline.

For MCP-06:

```python
result = await client.call_tool(
    "simcore_candidate_snapshot",
    {"ref": "<candidate-ref-or-commit>"},
)
```

A successful protocol call can intentionally report `canonical_candidate_shape.pass: false`; for example, the already-deployed production head is readable but is not a new direct child of itself.

For MCP-07:

```python
result = await client.call_tool(
    "simcore_candidate_preflight",
    {"ref": "<candidate-ref-or-commit>"},
)
```

Judge the candidate against fresh repository authority at execution time. A successful protocol transport can correctly return `ready: false` when the ref points at current production, a noncanonical candidate, an old target version, or a candidate whose version/name/profile/production bindings do not all agree.

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

MCP-02 uses the release branch declared by `product-manifest.json` as the identity authority it verifies; it does not silently replace an invalid manifest branch with a configured fallback. MCP-03 reads the development-memory path declared by the same manifest and never substitutes a guessed documentation path when that field is invalid. MCP-04 derives its validation-profile path only from a validated exact target version and does not fuzzy-match candidate profiles. MCP-05 reads exact target commit and target-time manifest authority, then queries bounded GitHub Actions and comparison endpoints using GET only. MCP-06 resolves the requested locator once to an immutable candidate SHA before reading candidate production files. MCP-07 freezes configured main/release SHAs before composing MCP-06 and MCP-04 so a single response cannot silently substitute later moving branch heads mid-call.

## Tests

```bash
cd tools/simcore-mcp
python -m unittest discover -s tests -v
```

The status, production-identity, documentation-drift, release-preflight, post-merge-health, candidate-snapshot, and candidate-preflight verifier logic is intentionally independent from the MCP SDK, so authority and fail-close behavior can be tested without starting an MCP transport.

## Safety boundary

All current SimCore MCP tools are read-only. They cannot deploy, edit branches, update manifests or documentation, create or close issues, merge PRs, execute or rerun workflows, materialize release candidates, create release approval/spec/receipt authority, or execute HUMAN_EVIDENCE decisions.
