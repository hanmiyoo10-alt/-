# Upstream PR dossier — termux-boot

Feature-ID: `termux-boot`
Area: `main-phone`
PR status: `REPO_INTERNAL_CANDIDATE / NO OFFICIAL UPSTREAM SUBMISSION`
Isolation status: `ISOLATED #3306`
Deployment status: `NOT_DEPLOYED / EXPERIMENT_CLOSE REQUIRED`

## Problem / motivation

M physical reboot에서 Termux:Boot 자체는 실행됐지만 legacy `20-pocketrisu-ssh-tunnel`이 shared service-tree supervisor를 다시 만들었다. 현재 thin-phone topology는 PocketRisu tunnel을 `21` guard/anchor로 전용 복구할 수 있으므로 broad shared-runsvdir bootstrap은 더 이상 필요한 ownership 경계가 아니다.

직접 process-loss 원인은 `UNKNOWN`이며 #3231과의 인과 동일성은 주장하지 않는다.

## Minimal upstream scope

Repository-internal device operation only:

- `README.md`
- `UPSTREAM.md`
- `FAILURES.md`
- `files/retire-legacy-20.sh`
- `tests/test-retire-legacy-20.sh`

PocketRisu server/app source, S runtime, M RDC/Tailscale owner, Android policy, global runit package는 변경하지 않는다.

## Dependencies

- existing deployed `main-ssh-tunnel` guard/anchor owner
- exact `21-pocketrisu-core-supervisor-guard` source/deployed identity
- #3305 incident evidence
- #3306 Work System / D-013 / D-014 coordination

## Verification evidence

IMPLEMENTATION_PR acceptance:

- fixed identity / symlink / drift / missing / duplicate synthetic cases
- reversible apply/restore
- no copy/delete fallback
- no service/global-supervisor/network/Android mutation surface
- `sh -n`
- focused shell contract test
- `python3 products/pocketrisu-helper-mod/ci/validate_docs.py`
- `git diff --check`

Physical M reboot proof is intentionally deferred until merged-main convergence.

## Upstream pitch

Not proposed for official PocketRisu upstream. This is repository-owned M device-operations hardening for a local thin-phone topology and contains device-specific migration identity.

## Review / PR state

- owner: #3306
- parent incident: #3305
- next action after source/CI proof: normal VALIDATION_MERGE, then merged-only EXPERIMENT_CLOSE
