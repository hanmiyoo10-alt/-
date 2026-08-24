# SimCore Release System v2 — First Real Post-Publish State Recovery

Date: 2026-08-25
Status: **FIX ACTIVE · R FEEDBACK · NON-RUNTIME · PRODUCTION ALREADY PUBLISHED**
Release: `simcore-v0.64.7-new-01`

## 1. Production truth

The second permanent release transaction published SimCore v0.64.7 successfully before its administrative state write failed.

```text
permanent release run: 32749519307
Resolve Permanent Authorization: SUCCESS
Candidate Required / Verify: SUCCESS
Candidate Required / Required: SUCCESS
Publish Exact Candidate: SUCCESS
Declare Published State: FAILURE
```

Production authority is already:

```text
release-simcore commit: a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob: 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
version: 0.64.7
release: Cross-Reload Cache Observer Continuity
latest.js == install.js: YES
previous production: 47969d24771f6cc188df6e32150fc6fde519182d
```

No recovery step may republish or rewrite `release-simcore`.

## 2. Failure evidence

The post-publish controller successfully reconstructed and verified the published identity and generated the bounded LIVE_PENDING payload:

```text
releaseAuthority = RS2_4_PERMANENT
productionMutation = ALREADY_PUBLISHED_UPSTREAM
mainMutation = LOCAL_PAYLOAD_PENDING_GATEWAY
declaration = DECLARED_LIVE_PENDING
stateSync = CHECK_CLEAN
lifecycleState = LIVE_PENDING
disposition = POST_PUBLISH_PAYLOAD_READY
```

The bounded payload was exactly:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/releases/records/simcore-v0.64.7-new-01.json
```

The failure occurred only when `scripts/repo-main-write.py` attempted to dispatch `SimCore CI`:

```text
MAIN_WRITE_GATE_DISPATCH_FAILED
HTTP 403: Resource not accessible by integration
```

Root cause:

```text
SimCore Permanent Release / post-publish-state job
permissions:
  contents: write
  actions: read
```

The project-owned main gateway requires Actions write permission to dispatch the bounded `MAIN_HEALTH / Required` validation run.

Classification:

```text
POST_PUBLISH_MAIN_GATE_ACTIONS_PERMISSION_GAP
= FIX / R_FEEDBACK / STATE_SYNC / NON_RUNTIME / PRODUCTION_ALREADY_PUBLISHED / BLOCKING_ADMIN_SYNC
```

## 3. Frozen correction

Two bounded corrections are authorized in one R infrastructure work item because they address the same observed failure class:

1. Future permanent release post-publish state jobs must have `actions: write` in addition to `contents: write`.
2. Existing `SimCore release state sync` gains a permanent admin-recovery lane for an already-published permanent transaction.

The recovery lane must consume the immutable publication artifact from the original permanent publisher run. It must not synthesize a replacement release transaction.

Recovery input is a one-shot repository record under:

```text
products/simcore/releases/recoveries/*.json
```

The record binds:

```text
releaseId
publisherRunId
productionCommit
productionBlob
authorityConfirmation = RS2_4_POST_PUBLISH_RECOVERY
failureCode
```

## 4. Recovery invariants

Before any main mutation, recovery must prove:

```text
request PR merged to main
request PR changes exactly one recovery JSON path
request releaseId matches the immutable release spec
request production commit/blob match the immutable release spec
prior publication artifact exists for publisherRunId
artifact releaseId/commit/blob/publisherRunId match the request
current release-simcore still equals the published commit
current latest.js == install.js
current latest/install blob equals the published blob
post-publish-state accepts the observed production identity
changed persistent paths are within the permanent four-path allowlist
```

The recovery gateway must then require:

```text
SimCore CI
profile = MAIN_HEALTH
job = Required
```

and reobserve durable main truth after the gated write.

## 5. Forbidden recovery behavior

Recovery must never:

```text
write release-simcore
invoke release-publish.mjs
run CANDIDATE_REQUIRED as a substitute publication
change the immutable release spec
change the candidate commit
use force push
accept a different production commit/blob
recover an older release over a newer production declaration
```

## 6. First infrastructure PR feedback

Recovery infrastructure PR:

```text
PR #251
branch: fix/simcore-r-post-publish-state-recovery
initial head: a158ecc773fb3866b27fa076dfa96507dc886267
initial SimCore CI run: 32751057850
```

The first CI attempt failed in the **trusted predecessor lane before proposed recovery code execution**.

The predecessor `MAIN_HEALTH` verifier was run from main commit `bb7e51101da55b2877e5cd0ee6350e058a1e2299` against already-published production `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`. At that moment main still declared v0.64.6, so the predecessor state gate could not establish current production identity.

Classification:

```text
POST_PUBLISH_RECOVERY_TRUSTED_CI_BOOTSTRAP_CYCLE
= FIX / R_FEEDBACK / CI_TRUST_BOUNDARY / ADMIN_STATE / NON_RUNTIME
```

This is not a runtime defect and not a publication defect. It is a recovery bootstrap cycle:

```text
production already advanced
→ main administrative identity stale
→ trusted predecessor MAIN_HEALTH rejects stale identity
→ recovery infrastructure PR cannot reach proposed verifier
```

The correction must not bypass trusted CI. Use the already-installed canonical durable-memory sync authority to synchronize only the production identity first, then rerun the recovery infrastructure PR normally.

## 7. Canonical durable-memory bootstrap

Existing repository precedent uses an unmerged transport PR titled exactly:

```text
SimCore durable memory sync command
```

The same project-owned path was used for v0.64.7:

```text
command PR: #252
command branch: command/simcore-06407-durable-memory-bootstrap
command payload: products/simcore/releases/commands/rs2-4e-06407-post-publish-bootstrap.json
merge disposition: CLOSED WITHOUT MERGE
state-sync run: 32751352655
state-sync result: SUCCESS
durable main commit: abd8a60653b9bb176ce034920ccf5dbaa4c85cfc
release-simcore mutation: NONE
```

After bootstrap, durable main truth is:

```text
production_version = 0.64.7
release_name = Cross-Reload Cache Observer Continuity
release_commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release_blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
validation_status = PENDING_REAL_LONG_CHAT
```

This bootstrap intentionally does **not** create the permanent RS2-4 release record. It only removes the stale production/admin contradiction so trusted permanent CI can evaluate the actual recovery infrastructure.

The original PR #251 remained bound to its original pull-request base identity even after synchronize, so it was closed without merge and superseded rather than bypassing the trusted predecessor boundary.

## 8. Rebased recovery infrastructure qualification

A clean recovery branch was rebuilt directly from synchronized current main:

```text
PR: #255
branch: fix/simcore-r-post-publish-state-recovery-v2
base: a53aca79f41e7f75c351e8c486565912a012dcea
initial head: c86f157267633e048f368737231a6385c8c5542d
initial CI run: 32751957566
```

That run proved the bootstrap cycle was resolved:

```text
trusted predecessor MAIN_HEALTH: PASS
GATE_STATIC: PASS
GATE_ARCH: PASS
GATE_REGRESSION: PASS
GATE_STATE: PASS
GATE_COORDINATION: PASS
stateCheck: PASS
```

The only proposed-verifier failure was `GATE_CI_SELF` from a brittle self-test boundary locator. The self-test used the first occurrence of the substring `  required:` as the end of the post-publish job. Workflow input fields contain indented `required:` keys earlier in the file, so the slice was empty even though the actual job correctly contained:

```yaml
permissions:
  contents: write
  actions: write
```

Classification:

```text
POST_PUBLISH_PERMISSION_SELF_TEST_BOUNDARY_FALSE_NEGATIVE
= FIX / HARNESS / CI_SELF / NON_RUNTIME
```

Correction:

```text
locate `post-publish-state` from an anchored job boundary
locate the final `required` job with lastIndexOf
validate the permissions block with whitespace-tolerant regex
```

No permission rule was weakened. The test still requires both `contents: write` and `actions: write` specifically inside the post-publish state job.

## 9. Permanent regression ownership

The permanent CI self-test owns the recovery surface explicitly:

```text
normal durable-memory writer bot identity = github-actions[bot]
permanent recovery writer bot identity = github-actions[bot]
recovery PR must be a merged single recovery JSON path
recovery authority marker = RS2_4_POST_PUBLISH_RECOVERY
recovery consumes prior permanent publication artifact by publisherRunId
recovery uses post-publish-state.mjs
recovery requires MAIN_HEALTH / Required
recovery targets PENDING_REAL_LONG_CHAT / LIVE_PENDING
recovery workflow must not invoke release-publish.mjs
recovery workflow must not contain force publication paths
future permanent post-publish state job must have actions: write
```

An initial work-branch-only copied workflow interpolation typo was detected before CI and corrected before merge review:

```text
RECOVERY_WORKFLOW_SOURCE_METADATA_INTERPOLATION_TYPO
= FIX / HARNESS / WORK_BRANCH_ONLY / PRE_CI / NON_RUNTIME
```

It never reached main, production, or `release-simcore`.

## 10. Expected durable recovery result

After the permanent recovery request completes:

```text
product-manifest.production_version = 0.64.7
product-manifest.release_commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
product-manifest.release_blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
product-manifest.validation_status = PENDING_REAL_LONG_CHAT
release record state = LIVE_PENDING
state sync = PASS
release-simcore mutation during recovery = NONE
```

Real long-chat `LIVE_PASS` remains a separate human-evidence gate and must not be claimed by recovery.
