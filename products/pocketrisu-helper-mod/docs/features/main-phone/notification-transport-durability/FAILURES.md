# Failure ledger — notification-transport-durability

Feature-ID: `notification-transport-durability`
Stages: `CI | PR_REVIEW | MERGE | DEPLOY | POST_DEPLOY_VERIFY`

## Entries

### 2026-10-22 — POST_DEPLOY_VERIFY / natural selective-supervisor recurrence
- PR / commit: source incidents #3711 / #3709; predecessor #3513.
- stage: `POST_DEPLOY_VERIFY`
- symptom: relay and notify-tunnel service-specific runsv owners repeatedly disappear after successful one-shot recovery.
- failed check/job: natural runtime durability, not CI.
- facts from logs: core guard semantic events show repeated guard restart and dedicated core-runsv restoration while standalone notification supervisors remain missing.
- cause: `CONFIRMED` for selective Termux supervisor-loss domain; initiating Android kill mechanism remains UNKNOWN / consistent with #3231 only.
- feedback/fix: create #3712 guard↔anchor durability ring without shared runsvdir ownership.
- re-validation: pending IMPLEMENTATION_PR focused contract.
- rollback: no repository/runtime change occurred while attributing the incident.

### 2026-10-22 — CI / implementation candidate
- PR / commit: pending.
- stage: `CI`
- symptom: pending.
- failed check/job: NONE YET.
- facts from logs: implementation has not yet entered CI.
- cause: `CONFIRMED` N/A.
- feedback/fix: focused contract must be wired into product validator.
- re-validation: pending.
- rollback: isolated L worktree only.

PR_REVIEW and DEPLOY failures, if any, must be appended here rather than overwritten.


### 2026-10-22 — CI / synthetic anchor recovery fixture mismatch
- PR / commit: local #3712 implementation worktree before commit.
- stage: `CI`
- symptom: focused contract initially failed at `guard did not restore anchor`.
- failed check/job: local `test-notification-transport-durability.sh`.
- facts from logs: anchor restored the guard successfully; the restored guard loop stayed alive and repeatedly entered relay work, but every guard→Boot-launcher `--ensure-anchor` call returned rc=127. Direct launcher invocation through the fixture shell succeeded.
- cause: `CONFIRMED` — the synthetic launcher copy retained the production Android shebang `/data/data/com.termux/files/usr/bin/sh`, which does not exist on the L Linux test host when the guard executes the launcher directly.
- feedback/fix: test fixture only rewrites the synthetic launcher first line to `#!/usr/bin/env sh`; production Android shebang and production invocation remain unchanged. A temporary zombie-PID hypothesis patch was removed because it was not the cause.
- re-validation: focused mutual guard↔anchor recovery contract PASS after fixture correction; full product validator PASS.
- rollback: no repository commit/push/PR or physical-M runtime effect existed during diagnosis.


### 2026-10-22 — PR_REVIEW / P1 zombie pid stale-lock gap
- PR / commit: PR #3713 / reviewed head `67d3ac334a6d4f4e9099b33872c1101839aa2c3e`.
- stage: `PR_REVIEW`
- symptom: Codex found that `kill -0` also succeeds for a zombie guard/anchor PID, while `/proc/$pid/cmdline` may be empty, causing `pid_state` to classify a stale zombie as ambiguous and refuse recovery.
- failed check/job: review barrier, unresolved P1 thread `PRRT_kwDOT2BQls6vBXbv`.
- facts from logs: the finding matches the temporary zombie hypothesis explored during local debugging, but that earlier local failure had a separate confirmed synthetic-shebang cause. Both cases are distinct and must be covered.
- cause: `CONFIRMED` — production `pid_state` lacked explicit zombie classification.
- feedback/fix: read `/proc/$pid/stat` after `kill -0`; classify process state `Z` as dead/stale before cmdline identity. Apply the same fixed rule to guard and anchor pid-state owners.
- re-validation: explicit synthetic zombie guard + zombie anchor fixtures PASS; full focused/product/exact-head re-validation required on the repaired head.
- rollback: pre-P1 guard/launcher/test/failure-ledger copies retained under local `/tmp/3712-*.pre-p1`; no physical-M effect.


### 2026-10-22 — CI / merged-main operator-down fixture race
- PR / commit: PR #3713 / merge `5231ad79c77f61622eb04b92665232089f5968b0`.
- stage: `CI`
- symptom: merged-main PocketRisu helper docs push run failed with `FAIL: ring overrode notify operator down`.
- failed check/job: run `39712291169` / validate job `119606178736`.
- facts from logs: candidate and merge root tree are identical; the final focused fixture captured the runsv count, stopped/cleared the synthetic supervisor, and only then created the service `down` marker. The synthetic guard loop runs at about 50ms, so it can correctly observe an eligible missing-supervisor state in that pre-marker window and restore it before operator intent exists.
- cause: `CONFIRMED` — test ordering race. This is not candidate→merge divergence and does not show that production ignores an already-present `down` marker.
- feedback/fix: test-only repair establishes the `down` marker before inducing supervisor loss, matching the intended operator-down semantics. Production guard/anchor bytes remain unchanged.
- re-validation: postmerge repair PR must pass PocketRisu helper docs, SimCore Verify/Required, and merge-main convergence before #3712 POSTMERGE_CONVERGENCE can complete.
- rollback: revert the test-only repair commit if its replacement CI does not validate the intended contract; no physical-M effect occurred.

### 2026-10-22 — POST_DEPLOY_VERIFY / terminal physical-M live proof
- PR / commit: #3713 primary + #3714 postmerge repair / final main `e559dc09b3c030f31defc74aec6f1d19e7855a2f`.
- stage: `POST_DEPLOY_VERIFY`
- symptom: NONE — terminal acceptance execution.
- failed check/job: NONE.
- facts from logs: exact merged guard + Boot/anchor installed mode 0700; controlled guard/anchor mutual hard loss recovered; relay/notify runsv loss preserved one healthy exact PID1 orphan each without duplicate; soak preserved state; shared runsvdir absent; real S→M Android notification PASS.
- cause: `CONFIRMED` — durability ring satisfies the reviewed selective-supervisor-loss contract.
- feedback/fix: no further mutation for this Feature-ID.
- re-validation: repository final CI + #485 convergence + canonical EXPERIMENT_CLOSE `LIVE_PROVEN / DONE`.
- rollback: retain two-file rollback boundary; do not replay controlled-loss proof without a new admission.

### 2026-10-22 — PR_REVIEW / terminal dossier remained stale after LIVE_PROVEN
- PR / commit: CURRENT synchronization PR #3716.
- stage: `PR_REVIEW`
- symptom: CURRENT declared #3712 LIVE_PROVEN while this feature README/UPSTREAM still described IMPLEMENTATION_PR / NOT_READY / pending postmerge repair.
- failed check/job: review barrier, thread `PRRT_kwDOT2BQls6vCyVD`.
- facts from logs: #3712 itself is CLOSED / DONE with final EXPERIMENT_CLOSE receipt/checkpoint and physical-M live proof, so the stale dossier contradicted durable authority.
- cause: `CONFIRMED` — terminal feature-document convergence had not been synchronized after #3712 closure.
- feedback/fix: synchronize README status/verification/deployment/next action plus UPSTREAM PR/deployment/verification state and record terminal evidence here, in the same documentation-only PR as CURRENT.
- re-validation: PocketRisu product validator + focused contracts + exact changed-path/diff check + fresh PR CI/Required required.
- rollback: documentation-only; revert #3716 repair commit if evidence identity is wrong. No device/runtime effect.
