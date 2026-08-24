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

## 6. Expected durable result

After recovery:

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
