# SimCore Release System v2 — RS2-4 A/B/C Shadow Implementation Evidence

Date: 2026-08-24
Status: **IMPLEMENTATION IN PROGRESS · SHADOW ONLY · NON-RUNTIME**
Sequencing authority: `docs/SIMCORE_RS2_3_P4_DEFER_RS2_4_SHADOW_ENTRY_PROPOSAL.md`

## Entry truth

```text
RS2-1                              CLOSED
RS2-2                              CLOSED
RS2-3                              PROMOTION_READY
requiredCiActive                   false
requiredCiEnforcementVerified      false
rs2_3Closed                        false
rs2_4EntryAuthorized               false
release-simcore                    47969d24771f6cc188df6e32150fc6fde519182d
runtime mutation                   NONE
production publication authority   NONE
```

This implementation does not claim P4 complete and does not close RS2-3.

## Implemented shadow assets

```text
products/simcore/releases/release-schema-v1.json
products/simcore/tooling/release-shadow.mjs
products/simcore/tests/release-shadow.test.mjs
.github/workflows/simcore-release.yml
```

Permanent CI integration changes:

```text
products/simcore/tooling/ci/classify.mjs
products/simcore/tooling/ci/self-test.mjs
products/simcore/tooling/check.mjs
.github/workflows/simcore-ci.yml
```

## Authority boundary

The new release workflow is deliberately non-authoritative:

```text
permissions: contents: read
trigger: workflow_dispatch only
releaseAuthority = SHADOW_ONLY
productionMutation = NONE
publicationDisposition = WOULD_PUBLISH | WOULD_NOOP | BLOCKED
```

There is no `push(main)` release trigger and no release-simcore write primitive in the shadow workflow.

## CANDIDATE_REQUIRED handoff

Prior permanent CI state intentionally rejected every `CANDIDATE_REQUIRED` execution with:

```text
CANDIDATE_REQUIRED_RESERVED_FOR_RS2_4
```

The shadow implementation opens this interface only when:

```text
profile == CANDIDATE_REQUIRED
AND github.event_name == workflow_call
```

The workflow passes bounded authority marker:

```text
RS2_4_SHADOW
```

Manual workflow_dispatch still does not expose CANDIDATE_REQUIRED as an option and explicitly rejects such a profile if injected.

## Shadow planner checks

Before returning `WOULD_PUBLISH` the planner requires:

```text
release spec schema semantics valid
releaseId filename/mode/version relation valid
current release-simcore == expectedProductionCommit
candidate is exactly one-parent child of expected production
candidate latest/install Git blobs identical
candidate blob == candidateReleaseBlob
candidate diff changes only latest.js/install.js
candidate source version == spec version
release mode/version relation valid
NOOP_IDENTICAL blob relation valid when applicable
ROLLBACK approved-safe identity binding valid when applicable
CANDIDATE_REQUIRED conclusion == PASS
```

The planner never mutates a ref.

## Deterministic test matrix

`products/simcore/tests/release-shadow.test.mjs` creates an isolated temporary Git repository and covers:

```text
valid NEW_VERSION                         -> WOULD_PUBLISH
CANDIDATE_REQUIRED failure               -> CANDIDATE_REQUIRED_FAILED
production parent moved                  -> PRODUCTION_PARENT_MOVED
unexpected candidate path                -> CANDIDATE_PATH_SCOPE_INVALID
latest/install mismatch                  -> CANDIDATE_LATEST_INSTALL_MISMATCH
candidate not direct child               -> CANDIDATE_PARENT_INVALID
valid NOOP_IDENTICAL                     -> WOULD_NOOP
```

The permanent CI self-test executes this matrix for release-system PR changes.

## PFFL findings

### Finding 1 — temporary Git repository was not bound as planner cwd

First latest-main PR run:

```text
PR       #208
run      32723154375
Verify   97418675473  FAILURE
Required              FAILURE
reason   CI_SELF_TEST_FAIL
```

The permanent trusted-lane baseline passed. `GATE_STATIC`, `GATE_ARCH`, and `GATE_REGRESSION` also passed. The only failing proposed gate was `GATE_CI_SELF`.

Root cause:

`release-shadow.test.mjs` correctly created candidate commits in an isolated temporary Git repository, but `release-shadow.mjs` executes `git` in the process current working directory. The test did not switch the process cwd to the temporary repository before calling `evaluateShadow`, so the candidate SHA was looked up in the checked-out project repository and was correctly reported as absent.

Classification:

```text
RS2_4_SHADOW_TEST_REPO_CWD_NOT_BOUND
= FIX / HARNESS / DIRECT_EVIDENCE / NON_RUNTIME
```

Impact:

```text
production code regression        NO
permanent product gates weakened  NO
release-simcore mutation          NONE
runtime mutation                  NONE
```

Repair:

```text
bind the deterministic test process to its temporary Git repository
restore the original cwd in finally
re-run the whole permanent CI, not only the failed local assertion
```

### Earlier repository-infrastructure finding

The previously recorded separate finding remains:

```text
PROTECTED_MAIN_WORKFLOW_TEMPLATE_TRANSCRIPTION_ERROR
= FIX / CI_WORKFLOW / NON_RUNTIME
```

## Forbidden activation state

This work item must not set:

```text
requiredCiActive = true
requiredCiEnforcementVerified = true
rs2_3Closed = true
rs2_4EntryAuthorized = true
```

It must not mutate:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
```

## Next proof

```text
1. repair test cwd binding
2. permanent PR CI on repaired implementation head
3. shadow workflow contract review
4. bounded live GitHub shadow execution using a synthetic temporary candidate ref
5. prove release-simcore unchanged
6. merge only shadow/non-authoritative assets to main
```
