# SimCore MCP-07 Candidate Preflight Design — 2026-09-07

Date: 2026-09-07 KST
Status: DESIGN PROPOSED · READ_ONLY · NO_RUNTIME_MUTATION
Tracking: #1749
Tool: `simcore_candidate_preflight(ref)`

## 1. Purpose

MCP-07 composes the existing version-oriented release preflight (MCP-04) with the concrete candidate snapshot (MCP-06) and adds deterministic cross-component binding.

The tool answers one bounded operational question:

```text
Given requested candidate ref Rq,
what immutable candidate commit C does it resolve to,
and is C structurally canonical and coherent with current production/docs/profile preflight
under one frozen authority envelope?
```

This is advisory only.

```text
candidate_preflight.ready == true
!= release approval
!= HUMAN_EVIDENCE
!= publication authorization
```

## 2. Why MCP-07 exists

MCP-04 accepts a target version but does not inspect candidate bytes.

MCP-06 resolves candidate bytes and structure but deliberately does not evaluate full target-version preflight semantics.

MCP-06 design explicitly reserved MCP-07 as the later composition point for MCP-04 and MCP-06.

Therefore MCP-07 is the smallest useful composition layer:

```text
MCP-06 candidate snapshot
+ derived target version
+ MCP-04 release preflight
+ exact cross-binding
= read-only candidate preflight
```

## 3. Authority envelope

The composed call must not silently mix observations from moving branch heads.

At call start freeze:

```text
M = current main SHA
P = current release-simcore SHA
```

Then resolve the requested candidate locator:

```text
Rq -> immutable candidate SHA C
```

All reads that MCP-04/MCP-06 conceptually perform against `main` or current production must be pinned to M/P for the duration of the composed call.

The response must expose:

```text
authority.main_sha = M
authority.release_sha = P
authority.candidate_sha = C
```

`ref` remains a locator only; C is candidate authority.

## 4. Pinning model

MCP-07 should reuse MCP-04 and MCP-06 verifier functions instead of maintaining independent duplicate semantics.

A bounded read-only authority-pinning adapter may wrap the existing `GitHubReader` for the composed call.

Required behavior:

```text
get_branch_sha(main) -> M
get_branch_sha(release-simcore) -> P
get_file(path, main) -> get_file(path, M)
get_json_file(path, main) -> get_json_file(path, M)
get_file(path, release-simcore) -> get_file(path, P)
get_json_file(path, release-simcore) -> get_json_file(path, P)
other immutable SHA/ref reads -> delegated unchanged
```

The adapter must remain GET-only and must not expose writes.

It must preserve the public configured branch names (`main_branch`, `release_branch`) so component source labels remain readable while the actual reads are pinned.

## 5. Candidate snapshot component

Run MCP-06 semantics through the pinned reader:

```text
snapshot = candidate_snapshot(pinned_reader, ref)
```

Required observations include:

```text
resolved candidate SHA
latest/install blobs
candidate identity
candidate parent
changed paths
canonical_candidate_shape
validation-profile context
```

Candidate code is data only and must never execute.

## 6. Derived target version

MCP-07 accepts no independent version argument.

Derive the target version only from the successfully parsed candidate identity:

```text
V = snapshot.identity.latest.userscript_version
```

Require exact `X.Y.Z` format.

If V is missing/ambiguous/invalid, fail closed. Do not guess from branch names, commit subjects, validation profiles, or requested refs.

## 7. Release-preflight component

When V is valid, run MCP-04 semantics through the same pinned reader:

```text
preflight = release_preflight(pinned_reader, V)
```

This preserves MCP-04 checks for:

```text
production identity
documentation drift
target advancement
validation-profile structure
required contract coverage
supported modes
authority-version semantics
```

If V is invalid, return an explicit unavailable/preflight-not-executed component rather than inventing a target.

## 8. Cross-component bindings

MCP-07 must add its own deterministic checks after both components are available.

Minimum bindings:

### 8.1 Snapshot execution

```text
CANDIDATE_SNAPSHOT_OK
expected = true
actual = snapshot.ok
```

### 8.2 Canonical candidate shape

```text
CANDIDATE_CANONICAL_SHAPE_PASS
expected = true
actual = snapshot.canonical_candidate_shape.pass
```

### 8.3 Candidate target version

```text
CANDIDATE_TARGET_VERSION_VALID
expected = exact X.Y.Z
actual = V
```

### 8.4 Release preflight

```text
RELEASE_PREFLIGHT_READY
expected = true
actual = preflight.ready
```

### 8.5 Candidate/preflight version bind

```text
CANDIDATE_VERSION_MATCHES_PREFLIGHT_TARGET
expected = V
actual = preflight.target.version
```

### 8.6 Candidate/profile release-name bind

Candidate release name must equal the semantically validated MCP-04 profile release name:

```text
CANDIDATE_RELEASE_NAME_MATCHES_PROFILE
```

Source candidate name:

```text
snapshot.identity.latest.release_name
```

Source profile name:

```text
preflight.components.validation_profile.release_name
```

### 8.7 Candidate/profile blob bind

The profile context observed by MCP-06 at frozen M must equal the profile blob semantically validated by MCP-04:

```text
CANDIDATE_PROFILE_BLOB_MATCHES_PREFLIGHT
```

Expected/actual:

```text
snapshot.validation_profile_context.blob
preflight.components.validation_profile.blob
```

### 8.8 Frozen main bind

```text
SNAPSHOT_MAIN_MATCHES_FROZEN_AUTHORITY
expected = M
actual = snapshot.production_context.main_sha
```

### 8.9 Frozen production bind

```text
SNAPSHOT_RELEASE_MATCHES_FROZEN_AUTHORITY
expected = P
actual = snapshot.production_context.release_head
```

### 8.10 Preflight production bind

MCP-04 production identity must observe P:

```text
PREFLIGHT_RELEASE_MATCHES_FROZEN_AUTHORITY
expected = P
actual = preflight.components.production_identity.release.sha
```

## 9. Top-level ready semantics

MCP-07 returns:

```text
ready = no errors and no hard violations
```

A healthy result therefore requires all of the following simultaneously:

```text
candidate snapshot readable
candidate canonical shape true
candidate version exact
MCP-04 release preflight ready
candidate/preflight version binding exact
candidate release name == profile release name
candidate profile blob == preflight profile blob
snapshot main/release context == frozen M/P
preflight release identity == frozen P
```

This is a stronger read-only advisory than MCP-04 or MCP-06 alone.

It still does not authorize publication.

## 10. Output contract

Top-level:

```text
ready
repository
requested_ref
authority
target
components
checks
violations
errors
```

Suggested shape:

```text
{
  "ready": true,
  "repository": "...",
  "requested_ref": "candidate/...",
  "authority": {
    "main_sha": "...",
    "release_sha": "...",
    "candidate_sha": "..."
  },
  "target": {
    "version": "0.70.11",
    "release_name": "..."
  },
  "components": {
    "candidate_snapshot": {...},
    "release_preflight": {...}
  },
  "checks": [...],
  "violations": [...],
  "errors": [...]
}
```

## 11. Error semantics

`errors` mean required authority could not be frozen/read/parsed.

Examples:

```text
main head unavailable
release head unavailable
candidate ref unresolvable
candidate version unavailable
component read failure
```

No later success may erase an earlier authority-read error.

Component errors must remain visible and be copied with a component prefix.

## 12. Violation semantics

Every failed MCP-07 check is a hard advisory violation.

Suggested violation shape matches MCP-04:

```text
code
pass = false
expected
actual
source
severity = hard
```

Component violations remain in their component reports; MCP-07 top-level checks summarize only composition invariants rather than duplicating every component check.

## 13. Race and concurrency rule

The entire purpose of the authority envelope is to avoid a response assembled from different moments.

If `main` or `release-simcore` moves after M/P are frozen, the current call still evaluates against M/P.

A later MCP-07 invocation may legitimately return different authority.

MCP-07 must not retry in a way that silently replaces one pinned authority envelope mid-call.

## 14. Read-only safety boundary

The tool must never:

```text
create candidate refs
move refs
create/update issues
create/update PRs
create approvals/specs/receipts
run/re-run workflows
materialize candidates
execute builders
execute candidate code
mutate main
mutate release-simcore
make HUMAN_EVIDENCE decisions
publish a release
```

## 15. Relationship to permanent release authority

MCP-07 is an operator read primitive only.

Permanent release workflows remain authoritative for:

```text
candidate materialization
receipt/spec/approval validation
publication authorization
release-simcore mutation
LIVE_PENDING transitions
HUMAN_EVIDENCE lifecycle
```

Canonical principle retained:

```text
AUTOMATE EARLY REJECTION
NOT LATER AUTHORITY
```

## 16. Deterministic test matrix

Minimum tests:

1. healthy direct-child candidate -> ready true;
2. candidate ref resolves to immutable SHA;
3. main/release reads are pinned even if underlying reader heads move after freeze;
4. candidate snapshot error -> ready false;
5. canonical candidate shape false -> ready false;
6. invalid/missing candidate version -> fail closed and preflight not executed;
7. candidate version not newer than production -> ready false via MCP-04;
8. release preflight component false -> ready false;
9. candidate release-name/profile mismatch -> ready false;
10. candidate profile-blob/preflight-profile mismatch -> ready false;
11. snapshot frozen-main mismatch -> ready false;
12. snapshot frozen-release mismatch -> ready false;
13. preflight release identity differs from frozen release -> ready false;
14. component errors are copied to top-level errors;
15. requested ref remains locator while resolved SHA is authority;
16. no GitHub write primitive is required or invoked.

## 17. Server surface

Expose exactly one new MCP tool:

```python
@mcp.tool()
def simcore_candidate_preflight(ref: str) -> dict[str, Any]:
    return candidate_preflight(GitHubReader(), ref)
```

No existing MCP public signature changes are required.

## 18. Documentation

README should add MCP-06 and MCP-07 to the available tool list and document the distinction:

```text
MCP-04 = version preflight
MCP-06 = candidate snapshot
MCP-07 = frozen-authority candidate preflight composition
```

Termux smoke should exercise MCP-07 through the real in-memory MCP protocol client.

## 19. Delivery lifecycle

Required order:

```text
tracking issue #1749
-> design branch from fresh main
-> design doc only
-> design PR
-> PR-head SimCore CI
-> merge with expected head SHA
-> merged-main SimCore CI / canonical docs
-> fresh main / no auto-revert
-> implementation branch from fresh main
-> deterministic local tests
-> exact changed-file verification
-> implementation PR
-> PR-head SimCore CI
-> merge with expected head SHA
-> merged-main health / canonical docs
-> production immutability proof
-> implementation evidence
-> Termux real MCP protocol smoke
-> closeout evidence
-> #1749 completed
```

No production/runtime change belongs in MCP-07.
