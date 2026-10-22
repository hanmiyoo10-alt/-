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
