# SimCore MCP-04 — Release Preflight Implementation Evidence

Date: 2026-09-06
Tracking: #1710
Design PR: #1711
Implementation PR: #1712
Classification: TOOLING · MCP · READ_ONLY

## 1. Verdict

```text
DESIGN                         PASS
IMPLEMENTATION                 PASS
DEDICATED LOCAL TESTS          PASS 19/19
PR-HEAD SIMCORE CI             PASS
MERGED-MAIN SIMCORE CI         PASS
PRODUCTION IMMUTABILITY        PASS
TERMUX MCP PROTOCOL SMOKE      PENDING
OVERALL                        IMPLEMENTED / LIVE MCP VALIDATION PENDING
```

MCP-04 is implemented and merged on `main`, but tracking #1710 intentionally remains open until a real MCP protocol call succeeds on the established Termux environment and its closeout evidence is merged.

## 2. Tool contract

Implemented tool:

```text
simcore_release_preflight(version)
```

The tool is a conservative read-only advisory preflight. It never authorizes or executes a release.

Input:

```text
version: exact numeric X.Y.Z string
```

Top-level output includes:

```text
ready
repository
target
components.production_identity
components.docs_drift
components.validation_profile
checks
violations
errors
```

`ready` fails closed if any inspected authority is malformed, missing, contradictory, stale, unreadable, or not appropriate for the supplied target.

## 3. Implementation files

Implementation PR #1712 changed only these four MCP tooling files:

```text
tools/simcore-mcp/README.md
tools/simcore-mcp/simcore_mcp/release_preflight.py
tools/simcore-mcp/simcore_mcp/server.py
tools/simcore-mcp/tests/test_release_preflight.py
```

No plugin/runtime, manifest, release workflow, HUMAN_EVIDENCE, or production files were changed.

## 4. Composition behavior

The new verifier directly reuses the existing focused verifier functions:

```text
verify_production_identity(reader)
check_docs_drift(reader)
```

It does not duplicate or weaken MCP-02/MCP-03 semantics.

The aggregate top-level checks are deterministic and ordered:

```text
TARGET_VERSION_VALID
PRODUCTION_VERSION_AVAILABLE
TARGET_ADVANCES_PRODUCTION
VALIDATION_PROFILE_AVAILABLE
VALIDATION_PROFILE_SCHEMA_SUPPORTED
VALIDATION_PROFILE_VERSION_MATCH
VALIDATION_PROFILE_NAME_VALID
VALIDATION_PROFILE_CONTRACTS_OBJECT
VALIDATION_PROFILE_REQUIRED_CONTRACTS_PRESENT
VALIDATION_PROFILE_CONTRACTS_VALID
PRODUCTION_IDENTITY_PASS
DOCS_DRIFT_PASS
```

## 5. Validation-profile projection

Exact profile path:

```text
products/simcore/releases/validation-profiles/<version>.json
```

The implementation projects the bounded semantics of the canonical SimCore JavaScript validation-profile tooling without claiming to replace that authority.

Supported modes:

```text
INHERIT_BEHAVIOR
CURRENT_IDENTITY_INHERIT_BEHAVIOR
EXACT_CURRENT_IDENTITY
CHANGED_CONTRACT
```

Required R2.10 contracts:

```text
reload-cache-continuity
operator-release-card
host-local-telemetry
bounded-telemetry-capsule
```

The projection validates schema/version/name/contracts, required-contract presence, authority-version relationships, current-identity metadata requirements, and reject-version constraints.

## 6. Fail-close coverage

Dedicated MCP-04 tests cover:

1. healthy target/profile;
2. malformed target version;
3. target equal to production;
4. target older than production;
5. production-identity component failure;
6. docs-drift component failure;
7. component error propagation;
8. missing validation profile;
9. unsupported schema;
10. profile release-version mismatch;
11. missing required contract;
12. unknown validation mode;
13. inherited self-reference;
14. exact-current authority contradiction;
15. missing authority identity for current-identity inheritance;
16. non-array rejectVersions;
17. duplicate reject version;
18. rejecting the current target;
19. deterministic sorted contract output.

Result:

```text
19/19 PASS
```

Python compile validation also passed before upload.

## 7. Source-integrity check

The uploaded Git blob SHAs for the two newly created implementation files were compared against `git hash-object` on the locally tested copies.

```text
release_preflight.py
  local:  6ec6eea3410357816c64a0afa3864c7dab9a8792
  GitHub: 6ec6eea3410357816c64a0afa3864c7dab9a8792

test_release_preflight.py
  local:  cb845473fde96cc2633a2b088f95718c457f6a17
  GitHub: cb845473fde96cc2633a2b088f95718c457f6a17
```

Therefore the uploaded verifier and dedicated test are byte-identical to the locally validated files.

## 8. Design gate

Design PR #1711:

```text
head: ffb095c1f251276bb9b3dbb9da5405ec5e2ab1fc
PR-head SimCore CI: #8208 PASS
merge: 86a1ff97e4ebb03fd43bbd4f57fc659484b1f7a6
merged-main SimCore CI: #8209 PASS
```

The design merge remained the fresh `main` head through implementation branch creation.

## 9. Implementation gate

Implementation PR #1712:

```text
head: 2b14f3a90797a24b4e0b8869ecbebd4dadbef00c
changed files: 4
PR-head SimCore CI: #8210 PASS
merge: f8ab64e3ba6c3bf7e209aacd05e8483a5a59c90c
merged-main SimCore CI: #8211 PASS
```

The PR-head verifier and Required aggregate both completed successfully. The merged-main verifier and Required aggregate also completed successfully.

## 10. Read-only safety boundary

The tool uses the existing GET-only `GitHubReader` and exposes no write-capable method.

MCP-04 cannot:

```text
create/update/delete GitHub content
materialize candidates
dispatch release workflows
change branches
change product-manifest.json
change release state
change HUMAN_EVIDENCE
change deployed plugin files
```

The server description and README explicitly preserve this boundary.

## 11. Production immutability proof after implementation merge

Immediately after the implementation merged and merged-main SimCore CI passed:

```text
release-simcore head:
  ecc55f026315c6482c34d267aba2adb97527cdbc

plugins/simcore/latest.js:
  userscript version 0.70.10
  blob 53f6959039c57f8673c355fcc1c22b573150e4a7

plugins/simcore/install.js:
  userscript version 0.70.10
  blob 53f6959039c57f8673c355fcc1c22b573150e4a7

latest.js == install.js:
  PASS
```

MCP-04 implementation therefore did not mutate production.

## 12. Preferred first live target

At implementation-evidence time, production remained `0.70.10` and an exact validation profile existed for target `0.70.11`.

Therefore the preferred first real protocol smoke is:

```text
simcore_release_preflight({"version":"0.70.11"})
```

Expected readiness if repository authority is still unchanged at smoke time:

```text
IS_ERROR: False
ready: True
12/12 top-level checks PASS
violations: []
errors: []
```

This expectation is historical evidence, not a frozen future assertion. The live result must be judged against fresh repository authority when it runs.

## 13. Remaining acceptance gate

MCP-04 is not yet COMPLETE.

Remaining:

1. update the Termux clone to fresh `main`;
2. import the new code on the already validated MCP v2 environment;
3. invoke `simcore_release_preflight` through `mcp.Client`;
4. preserve the structured result;
5. merge protocol-smoke closeout evidence;
6. verify merged-main health/no auto-revert;
7. verify production immutability again;
8. close #1710 with reason `completed` only if all gates pass.
