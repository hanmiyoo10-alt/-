# SimCore MCP-07 Candidate Preflight Implementation Evidence — 2026-09-07

Date: 2026-09-07 KST
Status: IMPLEMENTATION QUALIFIED · TERMUX PROTOCOL SMOKE PENDING
Tracking: #1749
Tool: `simcore_candidate_preflight(ref)`

## 1. Scope

MCP-07 adds one read-only candidate-preflight composition tool to the dedicated SimCore MCP package.

It composes the already-qualified MCP-06 candidate snapshot with MCP-04 release preflight under one frozen configured-main/configured-release authority envelope. The candidate target version is derived only from the parsed candidate userscript identity.

The tool does not materialize candidates, create release specs/approvals/receipts, dispatch or rerun workflows, decide HUMAN_EVIDENCE, move refs, mutate `main`, mutate `release-simcore`, or publish a release.

## 2. Design qualification

Tracking issue:

```text
#1749
```

Design document:

```text
docs/SIMCORE_MCP_07_CANDIDATE_PREFLIGHT_DESIGN_2026-09-07.md
```

Design PR:

```text
PR = #1750
head = ddfaf57101c43a3d24d8977edda8a54014ef13e9
merge = 9bbfac113b3939ce9e51bad772288653d514b0a2
changed files = 1
```

Design hosted qualification:

```text
PR-head SimCore CI #8271 = Verify SUCCESS / Required SUCCESS
merged-main SimCore CI #8272 = Verify SUCCESS / Required SUCCESS
Canonical Main Documentation Stream #10116 = SUCCESS
```

Fresh main after design qualification remained the exact design merge before implementation began.

## 3. Implementation transaction

Implementation branch:

```text
feat/simcore-mcp-07-candidate-preflight-20260907
```

Implementation PR:

```text
PR = #1751
head = 171687257d344a3f1c888ab5d32b430e46b88769
merge = 77457bebd2c0f686e9e10fcfec8a0fb144823add
changed files = 4
```

Exact implementation file set:

```text
tools/simcore-mcp/simcore_mcp/candidate_preflight.py
tools/simcore-mcp/tests/test_candidate_preflight.py
tools/simcore-mcp/simcore_mcp/server.py
tools/simcore-mcp/README.md
```

No plugin/runtime file, product manifest, release workflow, release-state authority, or production branch file changed.

## 4. Frozen authority composition

At the start of one MCP-07 call, the tool resolves and freezes:

```text
M = configured main SHA
P = configured release-simcore SHA
```

The requested candidate ref remains only a locator and MCP-06 semantics resolve it to immutable candidate SHA `C`.

A private read-only `_PinnedReader` then pins component reads:

```text
main branch reads -> M
release-simcore branch reads -> P
immutable SHA/ref reads -> delegated unchanged
```

The adapter exposes only these bounded read surfaces needed by MCP-04/MCP-06:

```text
get_branch_sha
get_file
get_json_file
get_commit
compare_commits
```

It intentionally does not forward arbitrary attributes or GitHub write primitives.

## 5. Target derivation and preflight

MCP-07 accepts no separate version parameter.

The target version is derived only from:

```text
candidate_snapshot.identity.latest.userscript_version
```

It must be an exact numeric `X.Y.Z` value. Missing or malformed candidate identity fails closed and MCP-04 is not executed with a guessed version.

When the candidate version is valid, MCP-04 `release_preflight` runs through the same frozen reader.

## 6. Deterministic composition checks

MCP-07 adds ten ordered hard checks:

```text
CANDIDATE_SNAPSHOT_OK
CANDIDATE_CANONICAL_SHAPE_PASS
CANDIDATE_TARGET_VERSION_VALID
RELEASE_PREFLIGHT_READY
CANDIDATE_VERSION_MATCHES_PREFLIGHT_TARGET
CANDIDATE_RELEASE_NAME_MATCHES_PROFILE
CANDIDATE_PROFILE_BLOB_MATCHES_PREFLIGHT
SNAPSHOT_MAIN_MATCHES_FROZEN_AUTHORITY
SNAPSHOT_RELEASE_MATCHES_FROZEN_AUTHORITY
PREFLIGHT_RELEASE_MATCHES_FROZEN_AUTHORITY
```

Top-level:

```text
ready = no errors and no hard violations
```

`ready: true` remains advisory only and is not publication authority.

## 7. Error propagation

Bounded component errors remain visible in their original component reports and are copied to top-level MCP-07 errors with component-prefixed sources:

```text
candidate_snapshot:<source>
release_preflight:<source>
```

Required main/release authority freeze failures stop component execution rather than silently substituting later branch heads.

## 8. Local deterministic validation

Before repository upload:

```text
compile = PASS
MCP-07 dedicated tests = PASS 18/18
```

The matrix covers:

```text
healthy direct-child composition
requested ref vs immutable candidate SHA authority
main/release pinning after underlying head movement
snapshot error fail-close
canonical shape negative
invalid candidate version / preflight not executed
nonadvancing target via MCP-04
other MCP-04 negative result
candidate/profile release-name mismatch
candidate/preflight profile-blob mismatch
snapshot frozen-main mismatch
snapshot frozen-release mismatch
preflight production-release mismatch
component error propagation
no write primitives exposed by pinned adapter
both components receive pinned readers
main authority freeze failure
release authority freeze failure
```

## 9. Remote source readback

Observed merged implementation blobs include:

```text
candidate_preflight.py = 25d66f8f920d2d9770e38a5bb8b2cc242cd3b3b4
test_candidate_preflight.py = 74d22c66ce58b345c4b0a2beb57ececf8106d014
server.py = d0bdb7dce5a5657c6e31f4a765727dc4e5d83e67
README.md = 5383b6ac3de40c408e720a3d3e734e6450ddab88
```

The implementation branch comparison against its fresh-main base reported:

```text
ahead = 4
behind = 0
changed files = exactly 4
all changed paths = tools/simcore-mcp/**
```

## 10. Hosted implementation qualification

Implementation PR-head:

```text
SimCore CI #8273
run id = 34044305648
Verify = SUCCESS
Required = SUCCESS
```

Implementation merged-main:

```text
SimCore CI #8274
run id = 34044365805
Verify = SUCCESS
Required = SUCCESS
```

Canonical documentation workflow at implementation merge:

```text
Canonical Main Documentation Stream #10122
run id = 34044365832
conclusion = SUCCESS
```

Fresh main after these checks remained exactly:

```text
77457bebd2c0f686e9e10fcfec8a0fb144823add
```

No auto-revert was observed.

## 11. Production immutability proof

After implementation qualification:

```text
release-simcore HEAD = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest.js == install.js = YES
userscript version = 0.70.10
release name = Host-Local Telemetry Set Cost Attribution
```

Therefore MCP-07 design and implementation did not mutate production.

## 12. Setup write-routing incidents

Before the safe design branch was established, two `create_file` calls were incorrectly attempted against a branch that did not yet exist.

Both calls returned GitHub HTTP 404 and created no file, commit, or branch mutation.

Classification preserved on #1749:

```text
TOOLING · FIX · WRITE_ROUTING_ANOMALY · NO_MUTATION · REPEATED
```

The control was corrected by explicitly loading and invoking `create_branch`, confirming branch creation, and only then performing file writes.

No production impact occurred.

## 13. Acceptance state

```text
DESIGN                     = PASS
DESIGN PR CI               = PASS
DESIGN MERGED-MAIN         = PASS
IMPLEMENTATION             = PASS
LOCAL TESTS                = PASS 18/18
REMOTE SOURCE READBACK     = PASS
IMPLEMENTATION PR CI       = PASS
IMPLEMENTATION MERGED-MAIN = PASS
CANONICAL DOCS             = PASS
PRODUCTION IMMUTABLE       = PASS
TERMUX MCP PROTOCOL        = PENDING
OVERALL                     = IMPLEMENTATION QUALIFIED / MCP-07 NOT YET COMPLETE
```

#1749 must remain open until a real MCP protocol call is exercised from the validated Termux environment and the resulting candidate-preflight evidence is preserved.