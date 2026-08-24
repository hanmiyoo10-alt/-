# SimCore Release System v2 — First Real Post-Publish State Recovery

Date: 2026-08-25
Status: **RECOVERED · REAL_RELEASE_LIVE_PENDING · R FEEDBACK CLOSED · DOCUMENTATION CLOSURE COMPLETE · NON-RUNTIME**
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

Production authority is:

```text
release-simcore commit: a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob: 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
version: 0.64.7
release: Cross-Reload Cache Observer Continuity
latest.js == install.js: YES
previous production: 47969d24771f6cc188df6e32150fc6fde519182d
```

The recovery sequence never republished or rewrote `release-simcore`.

## 2. Failure evidence

The original post-publish controller successfully reconstructed and verified the published identity and generated the bounded LIVE_PENDING payload:

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
= FIXED / R_FEEDBACK / STATE_SYNC / NON_RUNTIME / PRODUCTION_ALREADY_PUBLISHED
```

## 3. Frozen correction

Two bounded corrections were authorized in one R infrastructure work item because they address the same observed failure class:

1. Future permanent release post-publish state jobs have `actions: write` in addition to `contents: write`.
2. Existing `SimCore release state sync` has a permanent admin-recovery lane for an already-published permanent transaction.

The recovery lane consumes the immutable publication artifact from the original permanent publisher run. It does not synthesize a replacement release transaction.

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

Before any main mutation, recovery proves:

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

The recovery gateway then requires:

```text
SimCore CI
profile = MAIN_HEALTH
job = Required
```

and reobserves durable main truth after the gated write.

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
= FIXED / R_FEEDBACK / CI_TRUST_BOUNDARY / ADMIN_STATE / NON_RUNTIME
```

This was not a runtime defect and not a publication defect. It was a recovery bootstrap cycle:

```text
production already advanced
→ main administrative identity stale
→ trusted predecessor MAIN_HEALTH rejects stale identity
→ recovery infrastructure PR cannot reach proposed verifier
```

The correction did not bypass trusted CI. The already-installed canonical durable-memory sync authority synchronized only the production identity first, then recovery infrastructure was rebuilt from synchronized main.

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

After bootstrap, durable main truth became:

```text
production_version = 0.64.7
release_name = Cross-Reload Cache Observer Continuity
release_commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release_blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
validation_status = PENDING_REAL_LONG_CHAT
```

This bootstrap intentionally did **not** create the permanent RS2-4 release record. It only removed the stale production/admin contradiction so trusted permanent CI could evaluate the actual recovery infrastructure.

The original PR #251 remained bound to its original pull-request base identity even after synchronize, so it was closed without merge and superseded rather than bypassing the trusted predecessor boundary.

## 8. Rebased recovery infrastructure qualification

A clean recovery branch was rebuilt directly from synchronized current main:

```text
PR: #255
branch: fix/simcore-r-post-publish-state-recovery-v2
base: a53aca79f41e7f75c351e8c486565912a012dcea
final head: 56621c9e0903bda3be577bf4ba8f4af5ea6778c7
merge commit: b3ab656dfc140e483d74ff50ee6a5e9a2d507d0c
final CI run: 32752377529
Verify job: 97512080635 SUCCESS
Required job: 97512191418 SUCCESS
```

The first rebased run proved the bootstrap cycle was resolved but exposed a brittle CI self-test boundary locator.

The self-test used a substring boundary that could stop at an unrelated workflow input `required:` key even though the actual post-publish job correctly contained:

```yaml
permissions:
  contents: write
  actions: write
```

Classification:

```text
POST_PUBLISH_PERMISSION_SELF_TEST_BOUNDARY_FALSE_NEGATIVE
= FIXED / HARNESS / CI_SELF / NON_RUNTIME
```

Correction:

```text
locate `post-publish-state` from an anchored job boundary
locate the final `required` job with lastIndexOf
validate the permissions block with whitespace-tolerant regex
```

No permission rule was weakened. The final permanent CI run passed both trusted predecessor and proposed verifier lanes.

## 9. Permanent regression ownership

The permanent CI self-test now owns the recovery surface explicitly:

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
= FIXED / HARNESS / WORK_BRANCH_ONLY / PRE_CI / NON_RUNTIME
```

It never reached main, production, or `release-simcore`.

## 10. One-shot durable recovery execution

Recovery request:

```text
PR: #256
branch: state/simcore-06407-post-publish-recovery
changed files: 1
request file: products/simcore/releases/recoveries/simcore-v0.64.7-new-01.json
request head: 330311aa092c19d26cc8949c048d29ddf9205777
merge commit: ecde1f12a349be142476bd746d97a28e0c30b8d1
PR CI run: 32752517599
Verify job: 97512522011 SUCCESS
Required job: 97512633594 SUCCESS
```

The merged request triggered the installed permanent-recovery lane:

```text
state-sync run: 32752594335
Recover Permanent Published State job: 97512771303 SUCCESS
Resolve immutable recovery request: SUCCESS
Download immutable publication handoff: SUCCESS
Verify immutable publication handoff: SUCCESS
Materialize exact observed production: SUCCESS
Rebuild bounded LIVE_PENDING administrative payload: SUCCESS
Commit and gate recovered main state: SUCCESS
Reobserve durable main truth: SUCCESS
```

Durable main write:

```text
main commit: 5320e6dbf4e5a722058c79ddb9be49517a48de37
commit message: state(simcore): recover simcore-v0.64.7-new-01 live pending
writer: github-actions[bot]
release-simcore mutation during recovery: NONE
```

## 11. Recovered durable state

The recovered release record is authoritative for the first real R release lifecycle:

```text
releaseId = simcore-v0.64.7-new-01
version = 0.64.7
productionCommit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
productionBlob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
releaseState = LIVE_PENDING
productionTruth = PUBLISHED_IDENTITY_VERIFIED
stateSyncStatus = PASS
liveGate.required = true
liveGate.scenarioId = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
liveGate.result = PENDING
openAnomalyIds = []
```

The product manifest agrees on production identity and correctly remains:

```text
validation_status = PENDING_REAL_LONG_CHAT
```

The R machine lifecycle therefore advances from:

```text
REAL_RELEASE_READY
→ REAL_RELEASE_LIVE_PENDING
```

It does **not** advance to:

```text
REAL_RELEASE_LIVE_PASS
AUTHORITY_CUTOVER
LEGACY_RETIREMENT
RS2_4_CLOSED
```

until real long-chat evidence passes.

## 12. R feedback closure classification

All infrastructure findings exposed by this real release are now preserved and converted into durable behavior or permanent checks:

```text
POST_PUBLISH_MAIN_GATE_ACTIONS_PERMISSION_GAP = FIXED
POST_PUBLISH_RECOVERY_TRUSTED_CI_BOOTSTRAP_CYCLE = FIXED
POST_PUBLISH_PERMISSION_SELF_TEST_BOUNDARY_FALSE_NEGATIVE = FIXED
RECOVERY_WORKFLOW_SOURCE_METADATA_INTERPOLATION_TYPO = FIXED
```

No open recovery blocker remains.

The remaining gate is product/live evidence, not recovery infrastructure:

```text
NEXT = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

## 13. Completion boundary

Operational recovery is closed only when its durable evidence and machine state are synchronized on `main`.

For this release, the recovery operation and documentation are considered complete at `REAL_RELEASE_LIVE_PENDING` after:

```text
recovery infrastructure merged
permanent CI green
one-shot recovery request merged
recovery run green
durable main state reobserved
recovery evidence finalized
RS2-4E machine status synchronized
current priority moved to real long-chat validation
one-shot admin transition retired after synchronization
```

Real long-chat `LIVE_PASS` remains a separate human-evidence gate and must not be claimed by this recovery closure.

## 14. Durable priority synchronization and final cleanup

The documentation/machine-state closure PR first installed the bounded one-shot transition and passed permanent CI:

```text
closure PR: #257
closure merge: 13befdabace0027ca8918943c690e24a9182f4e2
SimCore CI run: 32753581445
Verify job: 97515905732 SUCCESS
Required job: 97515992131 SUCCESS
transition id: 06407-real-release-live-pending-priority
```

The transition was then executed only through the canonical durable-memory transport:

```text
command PR: #258
command title: SimCore durable memory sync command
command disposition: CLOSED WITHOUT MERGE
state-sync run: 32753769277
sync job: 97516497658 SUCCESS
generated main commit: 4d7256e23acb9ad8e13859c6925673b89c01b723
writer: github-actions[bot]
```

Observed durable state after the write:

```text
product-manifest.production_version = 0.64.7
product-manifest.release_commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
product-manifest.release_blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
product-manifest.validation_status = PENDING_REAL_LONG_CHAT
product-manifest.current_priority = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
release-simcore mutation = NONE
```

The one-shot `products/simcore/state-sync/active-admin-transition.json` is retired by the final cleanup work after its successful application. It must not remain as latent write authority.

The documentation/admin closure for this recovery is therefore **COMPLETE at the `REAL_RELEASE_LIVE_PENDING` boundary** once the cleanup PR containing this record and the transition deletion is merged and reobserved on `main`.

This statement does not close the whole first real release. The following remain pending by design:

```text
real long-chat LIVE_PASS
firstRealReleaseProof = true
PERMANENT_RELEASE_AUTHORITY_ACTIVE
authority cutover
legacy release authority retirement
RS2_4_CLOSED
```
