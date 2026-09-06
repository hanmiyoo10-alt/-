# SimCore MCP-06 Candidate Snapshot Implementation Evidence — 2026-09-06

Date: 2026-09-06 KST
Protocol smoke closeout: 2026-09-07 KST
Status: PROTOCOL SMOKE PASS · CLOSEOUT MERGED-MAIN VERIFICATION PENDING
Tracking: #1740
Tool: `simcore_candidate_snapshot(ref)`

## 1. Scope

MCP-06 adds one read-only candidate snapshot tool to the dedicated SimCore MCP package.

The tool resolves a same-repository Git ref into an immutable commit SHA and reports bounded candidate identity, file parity, first-parent diff shape, current production-parent context, canonical candidate structural shape, and validation-profile context frozen to a reported main SHA/blob.

It does not create or move candidate refs, materialize candidates, authorize a release, write release specs or approvals, dispatch workflows, or mutate `release-simcore`.

## 2. Design qualification

Tracking issue:

```text
#1740
```

Design PR:

```text
PR = #1741
head = 338db3bde515ce763c99c0290363ec6542325b5e
merge = 12817df59be4a4230dae9b9a695bbb6f8d5627f2
changed files = 1
```

Design document:

```text
docs/SIMCORE_MCP_06_CANDIDATE_SNAPSHOT_DESIGN_2026-09-06.md
```

Design PR-head SimCore CI:

```text
run number = 8257
Verify = SUCCESS
Required = SUCCESS
```

Design merged-main health:

```text
SimCore CI #8258 = SUCCESS
Canonical Main Documentation Stream #10067 = SUCCESS
```

## 3. Implementation transaction

Implementation branch:

```text
feat/simcore-mcp-06-candidate-snapshot-20260906
```

Implementation PR:

```text
PR = #1742
head = 771c46c14a19ca48d98b2d70ab8799b654859bc1
merge = c008125e9d024daf51e6766096a7bc29278945fc
changed files = 3
```

Exact implementation file set:

```text
tools/simcore-mcp/simcore_mcp/candidate_snapshot.py
tools/simcore-mcp/simcore_mcp/server.py
tools/simcore-mcp/tests/test_candidate_snapshot.py
```

No runtime/plugin file changed. `GitHubReader` did not need modification; MCP-06 reuses existing GET-only primitives.

## 4. Implementation contract

The tool freezes:

```text
requested ref
  -> resolved immutable candidate SHA C
  -> exact latest/install blobs at C
  -> parsed current candidate identity
  -> candidate parent(s)
  -> first-parent changed paths
  -> current release-simcore parent context
  -> canonical candidate structural shape
  -> current main SHA M
  -> exact validation-profile blob at M
```

`ref` is only a locator. The resolved commit SHA is the snapshot authority.

Top-level snapshot success is deliberately separate from structural candidate qualification:

```text
ok
canonical_candidate_shape.pass
```

A readable work/release commit may therefore have `ok=true` while `canonical_candidate_shape.pass=false`. Neither value authorizes publication.

## 5. Deterministic check surface

MCP-06 emits 23 ordered checks:

```text
REF_VALID
REF_RESOLVED
CANDIDATE_COMMIT_AVAILABLE
MAIN_CONTEXT_AVAILABLE
LATEST_AVAILABLE
INSTALL_AVAILABLE
LATEST_INSTALL_PARITY
LATEST_USER_VERSION_VALID
LATEST_RUNTIME_VERSION_VALID
LATEST_HOST_VERSION_VALID
LATEST_IDENTITY_CONVERGED
LATEST_RELEASE_NAME_VALID
INSTALL_USER_VERSION_VALID
INSTALL_RUNTIME_VERSION_VALID
INSTALL_HOST_VERSION_VALID
INSTALL_IDENTITY_CONVERGED
INSTALL_RELEASE_NAME_VALID
LATEST_INSTALL_IDENTITY_MATCH
CANDIDATE_SINGLE_PARENT
CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION
CANDIDATE_CHANGED_PATHS_BOUNDED
VALIDATION_PROFILE_CONTEXT_AVAILABLE
VALIDATION_PROFILE_VERSION_CONTEXT_MATCH
```

The response also exposes deterministic `violations` and bounded `errors`.

## 6. Identity parsing

Both candidate production files are parsed independently for:

```text
//@version
SIMCORE_RUNTIME_VERSION
HOST_COMPAT_VERSION
// v<current-version> <releaseName>:
```

The tool requires bounded current-version header cardinality and reports internal identity convergence as well as latest/install cross-file identity equality. Candidate code is never executed.

## 7. Structural candidate observation

`canonical_candidate_shape.pass` requires:

```text
exactly one candidate parent
candidate parent == current observed release-simcore HEAD
latest available
install available
latest/install identical Git blob SHA
changed paths non-empty and fully inside fixed production allowlist
latest internal identity converged
install internal identity converged
latest/install parsed identity equal
current-version release-name headers uniquely parsed
```

Fixed production allowlist:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

This is structural observation only. Approval/spec/HUMAN_EVIDENCE/readiness are explicitly outside MCP-06.

## 8. Frozen validation-profile context

After parsing candidate version, MCP-06 resolves current main SHA first and then reads exactly:

```text
<main-sha>:products/simcore/releases/validation-profiles/<candidate-version>.json
```

The response includes:

```text
main_sha
profile_path
profile_blob
availability
schemaVersion
releaseVersion
releaseName
```

A missing/mismatched profile remains explicit context and does not cause the tool to invent a healthy profile. Profile semantic readiness remains MCP-04 responsibility.

## 9. Local deterministic validation

Before GitHub upload, the implementation was compiled and the dedicated MCP-06 unit matrix was run.

Result:

```text
compile = PASS
candidate snapshot tests = PASS 23/23
```

Covered cases include healthy canonical candidate, moving ref to immutable SHA, 40-hex input, invalid/unresolvable ref, missing latest/install, parity mismatch, runtime/Host divergence, release-name missing/ambiguous, latest/install identity mismatch, zero/multiple parents, production-parent mismatch, out-of-scope changed path, profile present/missing/version mismatch, compare failure, main context failure, and release context failure.

## 10. Remote source readback

After upload, exact implementation branch source/test/server files were read back from GitHub.

Observed blobs:

```text
candidate_snapshot.py = 80c885cef7138e09b2af0fe121db1f0907ba1a7e
test_candidate_snapshot.py = 32e8015c2c5c6734f67cf4a72a63d6aab90fa4dc
server.py = e5424749d6e07535f71bc2a23b0f3e9760f7a3c9
```

Branch comparison against the design-merged base reported:

```text
ahead = 3
behind = 0
changed files = exactly 3
all changed paths under tools/simcore-mcp/
```

## 11. Hosted implementation qualification

Implementation PR-head SimCore CI:

```text
run number = 8259
run id = 34040081654
Verify = SUCCESS
Required = SUCCESS
```

Implementation merged-main SimCore CI:

```text
run number = 8260
run id = 34040114387
Verify = SUCCESS
Required = SUCCESS
```

Canonical documentation workflow at implementation merge:

```text
run number = 10072
run id = 34040114383
conclusion = SUCCESS
```

Fresh main after those checks remained exactly:

```text
c008125e9d024daf51e6766096a7bc29278945fc
```

No auto-revert was observed.

## 12. Implementation evidence merge qualification

Evidence PR:

```text
PR = #1743
head = 7523463e4e8af643f7f5dc8c534cb7533b5fb1ab
merge = 867770903c8b2da6fed92d7b1fe29d5ec7ca81b6
changed files = 1
```

Evidence PR-head SimCore CI:

```text
run number = 8261
Verify = SUCCESS
Required = SUCCESS
```

Evidence merged-main health:

```text
SimCore CI #8262 = SUCCESS
Canonical Main Documentation Stream #10077 = SUCCESS
```

Production remained unchanged after the evidence merge.

## 13. Production immutability proof

Immediately after MCP-06 implementation/evidence qualification:

```text
release-simcore HEAD = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest.js == install.js = YES
userscript version = 0.70.10
release name = Host-Local Telemetry Set Cost Attribution
```

Therefore MCP-06 implementation and documentation transactions did not mutate production.

## 14. Real-device Termux MCP protocol smoke — PASS

On 2026-09-07 KST, the existing validated Termux MCP environment fast-forwarded its local clone to current `main` and imported the merged MCP-06 code successfully:

```text
MCP-06 CODE PASS
```

The real MCP protocol call used:

```text
tool = simcore_candidate_snapshot
ref = release-simcore
```

Transport result:

```text
IS_ERROR = False
structured output present = YES
ok = True
errors = []
```

The ref resolved to immutable production authority:

```text
requested_ref = release-simcore
resolved SHA = ecc55f026315c6482c34d267aba2adb97527cdbc
immutable = True
subject = SimCore v0.70.10 Host-Local Telemetry Set Cost Attribution
parent = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
parent_count = 1
```

Candidate file snapshot:

```text
latest path = plugins/simcore/latest.js
latest available = True
latest blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
install path = plugins/simcore/install.js
install available = True
install blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest/install parity = True
```

Parsed identity on both files:

```text
userscript_version = 0.70.10
runtime_version = 0.70.10
host_version = 0.70.10
release_name = Host-Local Telemetry Set Cost Attribution
all parser counts = 1
converged = True
latest/install parsed identity match = True
```

First-parent diff snapshot:

```text
base_parent = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
changed_paths = [plugins/simcore/install.js, plugins/simcore/latest.js]
allowlist = [plugins/simcore/install.js, plugins/simcore/latest.js]
changed paths bounded = True
```

Frozen live context reported by MCP-06:

```text
main_sha = 79e7fc66fe9449271552a20a22d57b9e56abd842
release_branch = release-simcore
release_head = ecc55f026315c6482c34d267aba2adb97527cdbc
candidate_parent = 1f3a96b6a5c5aea83ffca7ad6fe242951fb79d17
parent_matches_release_head = False
```

Frozen validation profile context:

```text
main_sha = 79e7fc66fe9449271552a20a22d57b9e56abd842
path = products/simcore/releases/validation-profiles/0.70.10.json
available = True
blob = 6f0f60d5806d116b6e0224bc7a20732bfae4033b
schemaVersion = 1
releaseVersion = 0.70.10
releaseName = Host-Local Telemetry Set Cost Attribution
error = None
```

Check result:

```text
checks total = 23
checks PASS = 22
checks FAIL = 1
violations = [CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION]
errors = []
```

The sole failed structural observation is the expected negative control for this smoke target. `release-simcore` points at the already-deployed production commit, so that commit's parent is the prior production commit and cannot equal its own current branch HEAD.

Therefore the expected result is:

```text
canonical_candidate_shape.pass = False
canonical_candidate_shape.reasons = [CANDIDATE_PARENT_MATCHES_CURRENT_PRODUCTION]
```

This does not represent a protocol or snapshot failure. It demonstrates that MCP-06 distinguishes successful immutable snapshotting from canonical new-candidate shape instead of conflating them.

Protocol-smoke verdict:

```text
MCP transport = PASS
immutable ref resolution = PASS
file availability/parity = PASS
identity parsing/convergence = PASS
bounded changed-path observation = PASS
frozen main/profile context = PASS
expected structural-negative control = PASS
release authorization = NOT PERFORMED
production mutation = NONE
```

## 15. Write-routing anomaly record

Before the safe design/implementation lane was established, an incorrect repository write action created one stray file on `main`:

```text
docs/NEVER
```

It was immediately removed.

Recovery evidence:

```text
accidental creation commit = 642b4dd5900f7071f807a4e363631dbc1b391ddd
recovery commit = 9b94dd1f9ccd52877ad1cd84dc075b386ecd6bae
pre-incident tree = 2e9e9fdee09f1d02ce645896d28f6d21fd9a2e7f
recovery tree = 2e9e9fdee09f1d02ce645896d28f6d21fd9a2e7f
recovery SimCore CI #8256 = SUCCESS
release-simcore impact = NONE
```

Additional writes to nonexistent branches returned 404 and produced no mutation.

During the 2026-09-07 closeout, one further incorrect `create_file` action targeted branch `nonexistent` and path `docs/SHOULD_NOT_CREATE`. GitHub rejected it with 404 `Branch nonexistent not found`; no repository mutation occurred. Fresh `main` and `release-simcore` were re-read before continuing with the correct branch-creation action.

Classification:

```text
TOOLING · FIX · WRITE_ROUTING_ANOMALY · RECOVERED/REJECTED · NO_RUNTIME_IMPACT
```

## 16. Acceptance state before closeout merge

```text
DESIGN                         = PASS
DESIGN PR CI                   = PASS
DESIGN MERGED-MAIN             = PASS
IMPLEMENTATION                 = PASS
LOCAL TESTS                    = PASS 23/23
REMOTE SOURCE READBACK         = PASS
IMPLEMENTATION PR CI           = PASS
IMPLEMENTATION MERGED-MAIN     = PASS
EVIDENCE PR CI                 = PASS
EVIDENCE MERGED-MAIN           = PASS
CANONICAL DOCS                 = PASS
PRODUCTION IMMUTABLE           = PASS
TERMUX MCP PROTOCOL            = PASS
LIVE SNAPSHOT RESULT           = PASS
EXPECTED NEGATIVE SHAPE CHECK  = PASS
CLOSEOUT PR / MERGED-MAIN      = PENDING
OVERALL                         = MCP-06 FUNCTIONALLY COMPLETE · REPOSITORY CLOSEOUT PENDING
```

#1740 remains open only until this protocol evidence is merged, closeout merged-main CI/canonical documentation health are verified, fresh main shows no auto-revert, and production immutability is rechecked.
