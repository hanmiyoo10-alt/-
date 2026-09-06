# SimCore MCP-06 Candidate Snapshot Design — 2026-09-06

Date: 2026-09-06 KST
Status: DESIGN PROPOSED · READ_ONLY · NO_RUNTIME_MUTATION
Tracking: #1740
Tool: `simcore_candidate_snapshot(ref)`

## 1. Purpose

MCP-06 freezes a same-repository Git ref into one immutable commit SHA and reports the exact SimCore candidate identity represented by that commit.

The tool is observational only. It does not create, move, approve, publish, or authorize any candidate.

Core model:

```text
requested ref
  -> resolved commit SHA C
  -> exact candidate plugin blobs at C
  -> parsed candidate identity at C
  -> first-parent diff shape
  -> canonical-candidate-shape observation
  -> exact validation-profile context from frozen main SHA M
```

Authority rule:

```text
ref = locator only
resolved commit SHA C = snapshot authority
```

## 2. Why this is separate from MCP-04

`simcore_release_preflight(version)` asks whether the current production/docs/profile state is internally suitable for a target version.

`simcore_candidate_snapshot(ref)` asks what exact candidate bytes and identities a concrete ref resolves to.

A work commit may be snapshot-readable while not being a canonical release candidate.

Therefore:

```text
snapshot success != release readiness
canonical_candidate_shape == true != release authorization
```

MCP-07 may later combine MCP-04 and MCP-06.

## 3. Existing release-system authority preserved

The permanent release-system contract remains authoritative:

```text
candidate commit SHA C is authority
candidate ref is transport only
canonical candidate has exact production parent P
candidate latest/install are identical
candidate bytes, version, name and declared release blob must bind exactly
```

MCP-06 consumes these concepts but does not replace permanent release validation.

## 4. Input contract

Input:

```text
ref: non-empty bounded Git ref or commit locator
```

Examples:

```text
main
release-simcore
feature/some-work
40-hex commit SHA
```

The resolver must use GitHub commit resolution and return the immutable resolved 40-hex SHA.

Invalid, missing, or unresolvable refs fail closed and are visible in `errors`.

## 5. Exact files inspected at resolved candidate C

Fixed production paths:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

No candidate-controlled path configuration is accepted.

For each path report:

```text
path
blob SHA
available
```

The candidate source text is used only for bounded metadata parsing.

Candidate code is never executed.

## 6. Candidate identity parsing

Parse independently from both `latest.js` and `install.js`:

```text
//@version <version>
const SIMCORE_RUNTIME_VERSION = '<version>'
const HOST_COMPAT_VERSION = '<version>'
current-version release-name header
```

Current release-name header convention:

```text
// v<version> <releaseName>:
```

Historical release headers are allowed. The parser selects the exact header for the parsed current version and fails on zero or multiple exact-current matches.

## 7. File parity observation

Report:

```text
latest_blob
install_blob
identical
```

If either file is unavailable, parity cannot pass.

If both files exist but blobs differ:

```text
CANDIDATE_FILE_PARITY_MISMATCH
```

## 8. Identity convergence observation

The snapshot checks that both files agree on:

```text
userscript version
runtime version
Host compatibility version
release name
```

Within each file:

```text
userscript == runtime == Host
```

Across both files:

```text
latest identity == install identity
```

Failure is snapshot drift, not permission to rewrite anything.

## 9. Commit and parent observation

For resolved commit C report:

```text
sha
subject
parents[]
parent_count
```

Canonical candidate shape requires exactly one parent.

The first/only parent is `P_candidate`.

## 10. Changed-path observation

When exactly one parent exists, compare:

```text
P_candidate ... C
```

Report the exact changed path list.

Fixed production allowlist:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

Canonical shape requires all changed paths to be within this allowlist.

The normal canonical materialized candidate is expected to change the two production paths together. The tool records the actual list rather than inventing symmetry.

## 11. Current production-parent context

At call time, independently resolve current:

```text
release-simcore HEAD = P_current
```

Report:

```text
candidate_parent
current_release_head
matches_current_release_head
```

This is an observation only.

`matches_current_release_head == true` is required for `canonical_candidate_shape == true` in MCP-06 because the canonical NEW_VERSION/SAME_VERSION candidate contract is direct-child of observed production at preparation time.

Rollback/readiness semantics remain outside MCP-06.

## 12. Canonical candidate shape

Return a dedicated object:

```text
canonical_candidate_shape.pass
canonical_candidate_shape.reasons[]
```

It passes only when all are true:

1. resolved candidate has exactly one parent;
2. candidate parent equals current observed `release-simcore` head;
3. candidate latest exists;
4. candidate install exists;
5. latest/install Git blob SHAs are identical;
6. changed paths are fully bounded to the fixed production allowlist;
7. latest identity is internally converged;
8. install identity is internally converged;
9. latest/install identities agree;
10. exact-current release-name header is uniquely parsed.

This is structural candidate shape only.

It does not inspect approval, release spec, HUMAN_EVIDENCE, or publication eligibility.

## 13. Validation-profile context

After candidate version is parsed, freeze current main first:

```text
M = current main SHA
```

Then read exactly:

```text
M:products/simcore/releases/validation-profiles/<candidate-version>.json
```

Report:

```text
main_sha = M
profile_path
profile_blob
available
schemaVersion
releaseVersion
releaseName
```

This prevents a response from silently mixing a candidate snapshot with a later-moving main profile.

The profile is context only. MCP-04 remains the deeper profile semantic validator.

Missing profile is visible but does not make the candidate commit unreadable as a snapshot.

## 14. Proposed top-level output

```text
ok
repository
requested_ref
resolved
candidate
files
identity
diff
production_context
canonical_candidate_shape
validation_profile_context
checks
violations
errors
```

`ok` means the requested ref was resolved and the bounded snapshot could be constructed without read/parse errors.

It does not mean release-ready.

## 15. Check codes

Minimum deterministic checks:

```text
REF_VALID
REF_RESOLVED
CANDIDATE_COMMIT_AVAILABLE
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
MAIN_CONTEXT_AVAILABLE
VALIDATION_PROFILE_CONTEXT_AVAILABLE
VALIDATION_PROFILE_VERSION_CONTEXT_MATCH
```

Profile-context checks are informational snapshot checks; downstream readiness logic must not treat MCP-06 alone as release authorization.

## 16. Error and violation semantics

`errors` are inability to read/resolve/parse required snapshot authority.

`violations` are deterministic observed mismatches after data is available.

Examples:

```text
REF_UNRESOLVABLE
CANDIDATE_LATEST_UNAVAILABLE
CANDIDATE_INSTALL_UNAVAILABLE
CANDIDATE_FILE_PARITY_MISMATCH
CANDIDATE_IDENTITY_DIVERGENCE
CANDIDATE_PARENT_MISMATCH
CANDIDATE_CHANGED_PATH_OUT_OF_SCOPE
VALIDATION_PROFILE_CONTEXT_MISSING
```

No healthy value may be fabricated after a failed read.

## 17. GitHubReader extensions

MCP-06 may reuse existing GET-only primitives and add only bounded read helpers if needed.

Expected reusable primitives:

```text
get_commit(ref_or_sha)
get_file(path, resolved_sha)
get_branch_sha(main/release)
compare_commits(parent, candidate)
get_json_file(profile_path, frozen_main_sha)
```

No GitHub write method belongs in the MCP package.

## 18. Security boundary

Candidate-controlled code is data only.

MCP-06 must never:

```text
execute candidate Python/JavaScript/shell
run package hooks from candidate
source workflow YAML from candidate
accept candidate-provided production paths
accept candidate-provided commands
```

## 19. Deterministic unit-test matrix

At minimum test:

1. healthy canonical candidate snapshot;
2. branch/ref resolves to immutable SHA;
3. 40-hex SHA input;
4. unresolvable ref;
5. latest missing;
6. install missing;
7. blob parity mismatch;
8. userscript/runtime/Host divergence;
9. release-name missing;
10. release-name ambiguous;
11. latest/install identity mismatch;
12. zero-parent commit;
13. multi-parent commit;
14. parent differs from current release head;
15. out-of-scope changed path;
16. profile context present and version-matched;
17. profile context missing but snapshot remains explicit;
18. malformed profile context;
19. GitHub read failure is visible and fail-closed.

## 20. Delivery and acceptance

Required lifecycle:

```text
design PR
-> PR-head SimCore CI
-> merge
-> merged-main SimCore CI / canonical docs
-> implementation PR
-> deterministic tests
-> PR-head SimCore CI
-> merge
-> merged-main health
-> production immutability proof
-> implementation evidence
-> Termux MCP protocol smoke
-> closeout evidence
-> #1740 completed
```

No `release-simcore` mutation is part of MCP-06.

## 21. Pre-implementation tooling incident classification

Before this design branch was safely established, an incorrect GitHub write action created `docs/NEVER` directly on `main`.

It was immediately deleted.

Recovery facts:

```text
accidental creation commit = 642b4dd5900f7071f807a4e363631dbc1b391ddd
recovery commit = 9b94dd1f9ccd52877ad1cd84dc075b386ecd6bae
recovery tree = 2e9e9fdee09f1d02ce645896d28f6d21fd9a2e7f
pre-incident tree = 2e9e9fdee09f1d02ce645896d28f6d21fd9a2e7f
SimCore CI #8256 = SUCCESS
release-simcore impact = NONE
```

Additional writes directed at nonexistent branches returned HTTP 404 and produced no repository mutation.

Classification:

```text
TOOLING · FIX · WRITE_ROUTING_ANOMALY · RECOVERED · NO_RUNTIME_IMPACT
```

This incident does not widen MCP-06 functional scope.
