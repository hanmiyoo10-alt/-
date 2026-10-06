# Upstream PR dossier — termux-boot

Feature-ID: `termux-boot`
Area: `main-phone`
PR status: `REPO_INTERNAL_CANDIDATE / NO OFFICIAL UPSTREAM SUBMISSION`
Isolation status: `ISOLATED #3306 r3`
Deployment status: `NOT_DEPLOYED / EXPERIMENT_CLOSE REQUIRED`

## Problem / motivation

M physical reboot에서 Termux:Boot 자체는 실행됐지만 device-only legacy `20-pocketrisu-ssh-tunnel`이 shared service-tree supervisor를 다시 만들었다. 현재 thin-phone topology는 PocketRisu tunnel을 `21` guard/anchor로 전용 복구할 수 있으므로 broad shared-runsvdir bootstrap은 더 이상 필요한 ownership 경계가 아니다.

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
- exact deployed `20` and `21` identities from #3306 live evidence
- #3305 incident evidence
- #3306 Work System / D-013 / D-014 coordination

## Verification evidence

IMPLEMENTATION_PR acceptance:

- exact identity / mode / symlink / drift / missing / duplicate synthetic cases
- reversible apply/restore
- production home pinned to `/data/data/com.termux/files/home`
- inherited HOME cannot redirect production operation
- relocation only under explicit synthetic test mode
- no copy/delete fallback
- no service/global-supervisor/network/Android mutation surface
- repository shell files tracked as ordinary `100644`
- execution tested via explicit `sh`
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
- first canonical candidate #3308 was parked after a valid Codex P2 on inherited production HOME
- r2 pinned production HOME and added direct regression coverage, but L owner blocked its executable Git modes with `SPECIAL_MODE_DENIED`
- r2 lease was released and its holder stale-cleaned; staged r2 residue remains preserved
- r3 uses a fresh isolated lease/manifest/worktree and tracks the two new shell files as ordinary `100644`
- next action after source/CI proof: normal VALIDATION_MERGE, then merged-only EXPERIMENT_CLOSE
