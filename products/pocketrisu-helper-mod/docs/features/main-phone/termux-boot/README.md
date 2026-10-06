# 메인폰 Termux:Boot

상태: **REPAIR CANDIDATE / #3306 IMPLEMENTATION_PR / LIVE NOT APPLIED**

## 목적

메인폰 재부팅 후 PocketRisu 접속에 필요한 최소 owner만 복구하고 broad shared Termux service tree를 불필요하게 다시 만들지 않는다.

현재 canonical 방향:

- PocketRisu core tunnel supervision: `21-pocketrisu-core-supervisor-guard`
- M RDC supervision: `31-mcl-m-rdc-supervisor-guard`
- M Tailscale supervision: `32-mcl-m-tailscale-supervisor-guard`
- legacy `20-pocketrisu-ssh-tunnel`: #3306 Boot 퇴역 후보

## 2026-10-07 M reboot incident

물리 M 재부팅에서 Termux:Boot 자체는 실제로 실행됐다.

관찰된 순서:

- Android boot 후 `05-pocketrisu-boot-trace`가 Boot 실행을 기록.
- legacy `20-pocketrisu-ssh-tunnel`이 shared Termux service supervisor를 ready 상태로 만들고 tunnel health ready를 기록.
- `21` PocketRisu guard와 `31` RDC guard가 부팅 직후 시작.
- RDC guard/anchor는 생존했지만 PocketRisu/Tailscale 계층은 몇 분 뒤 소실.
- 서버폰 PocketRisu와 sshd는 계속 정상.
- 기존 fixed `21` / `32` launcher를 다시 실행하자 shared top-level supervisor 없이도 M localhost health가 HTTP 200 / ready로 복구.

이 failure shape는 #3231의 Android phantom-process trimming 사건과 호환되지만 이번 reboot에 대한 직접 ActivityManager kill evidence는 없다. initiating cause는 계속 `UNKNOWN`으로 보존한다.

## Legacy 20 retirement owner

Repository candidate:

```sh
sh files/retire-legacy-20.sh --check
sh files/retire-legacy-20.sh --apply
```

`--check`는 read-only다.

Production `--apply`는 다음 조건을 모두 만족할 때만 legacy `20`을 고정 archive 위치로 이동한다.

- active `20-pocketrisu-ssh-tunnel`이 실기기에서 관찰한 exact SHA-256과 mode 700에 일치.
- active/archive가 symlink 또는 foreign/drift state가 아님.
- replacement `21-pocketrisu-core-supervisor-guard`가 regular executable로 존재.
- archive 위치가 비어 있음.

첫 retirement는 삭제가 아니라 같은 HOME 아래 고정 disabled/archive 위치로의 move다. archive가 exact하게 남아 있고 active가 없으면 반복 apply는 no-op `already_retired`다.

owner는 shared/global supervisor, PocketRisu/Tailscale/RDC 서비스, 네트워크, Android 설정, server-phone PocketRisu, private tunnel target 또는 credential을 수정하지 않는다.

## Validation boundary

IMPLEMENTATION_PR에서는 synthetic fixture만 사용한다.

필수 검증:

- exact active -> check ready
- exact active -> apply retired
- repeated apply -> already_retired
- drift / symlink / missing / archive conflict -> blocked
- replacement missing -> blocked
- shell syntax
- PocketRisu docs validator
- `git diff --check`

실기기 M의 legacy `20` retirement는 merge + postmerge convergence 뒤 `EXPERIMENT_CLOSE`에서만 수행한다.

## Rollback anchor

첫 apply는 active 파일을 삭제하지 않고 fixed archive에 보존한다. 실제 rollback move는 incident 시 fresh authority 아래 별도 bounded operator action으로 수행하며 IMPLEMENTATION_PR owner에 일반 restore command를 추가하지 않는다.

## 다음 한 단계

#3306 candidate를 PR로 검증하고 merge/postmerge convergence가 끝난 뒤에만 M에서 exact legacy `20` retirement를 실행한다. 그 다음 물리 reboot로 `21/31/32` required owner 복구와 shared top-level supervisor 비재생성을 증명한다.
