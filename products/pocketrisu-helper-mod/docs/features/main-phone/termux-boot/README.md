# 메인폰 Termux:Boot

상태: **ACTIVE / #3306 IMPLEMENTATION_PR r3 / LIVE RETIREMENT NOT YET APPLIED**

## 목적

메인폰 재부팅 후 PocketRisu 접속 기반을 복구하되, thin-phone 구조에서는 필요한 owner만 좁게 다시 올린다.

## 2026-10-07 reboot persistence incident

#3305 실기기 증거로 다음이 확인됐다.

- Android boot 뒤 Termux:Boot tracer가 실제 실행됐다.
- device-only legacy `20-pocketrisu-ssh-tunnel`은 shared `runsvdir $PREFIX/var/service`를 실제로 다시 만들고 tunnel ready까지 기록했다.
- M에는 service directory 15개가 존재하므로 이 경로는 부팅 시 broad supervisor footprint를 다시 만들 수 있다.
- 이후 RDC guard/anchor는 살아남았지만 PocketRisu/Tailscale 쪽 supervision은 사라졌고 fixed-launcher replay가 필요했다.
- recovered healthy shape에서는 shared top-level `runsvdir=0`인 채 `21-pocketrisu-core-supervisor-guard`가 전용 `pocketrisu-ssh-tunnel` runsv를 복구해 localhost health `200 / ready`를 유지한다.

이번 사건의 직접 kill cause는 아직 `UNKNOWN`이다. #3231의 Android phantom-process trimming failure class와 호환되는 모양이지만 동일 원인으로 단정하지 않는다.

## 선택된 repair

#3306은 legacy Boot entry `20-pocketrisu-ssh-tunnel`만 active Boot set에서 reversible하게 retire한다.

새 bounded owner:

`files/retire-legacy-20.sh --check|--apply|--restore`

고정 계약:

- production home: `/data/data/com.termux/files/home`
- inherited `$HOME`이 production home과 다르면 fail closed
- test relocation은 explicit `POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE=1`에서만 허용
- active target: `$HOME_DIR/.termux/boot/20-pocketrisu-ssh-tunnel`
- fixed archive: `$HOME_DIR/.termux/boot-disabled/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1`
- replacement prerequisite: `$HOME_DIR/.termux/boot/21-pocketrisu-core-supervisor-guard`
- active/replacement exact SHA-256 + mode `0700` required
- archive가 존재하면 active와 같은 exact legacy bytes + mode `0700` required
- symlink, drift, duplicate active+archive, missing replacement, malformed archive root는 fail closed
- apply는 fixed-path `mv`만 수행하고 first migration에서 원본 bytes를 삭제하지 않는다.
- restore는 exact archive에서 exact active path로만 되돌린다.

이 owner는 service target이나 shared runsvdir를 시작/중지하지 않고 Android 설정, phantom policy, network, PocketRisu server, private tunnel target을 만지지 않는다.

## 현재 Boot 축

보존:

- `05-pocketrisu-boot-trace`
- `21-pocketrisu-core-supervisor-guard`
- `30-mcl-m-termux-lifeline-heartbeat`
- `31-mcl-m-rdc-supervisor-guard`
- `32-mcl-m-tailscale-supervisor-guard`

#3306 live apply 이후 retire 예정:

- `20-pocketrisu-ssh-tunnel`

`00-update-local-stack`은 별도 owner다. 이번 incident reboot에서는 existing disable marker 때문에 local-stack runtime이 실행되지 않았고 #3306은 그 owner를 변경하지 않는다.

## IMPLEMENTATION_PR 경계

r2는 새 shell path를 Git mode `100755`로 staged해 reviewed L owner의 `SPECIAL_MODE_DENIED`에 fail-closed됐다. r2 dirty workspace는 증거로 보존하고 재사용하지 않는다.

r3는 두 새 shell 파일을 ordinary tracked mode `100644`로 고정한다. 실행 가능성은 Git executable bit가 아니라 테스트와 later live apply에서 explicit `sh <file>` invocation으로 증명한다.

IMPLEMENTATION_PR에서는 synthetic fixture, production-home pinning regression, shell syntax, PocketRisu docs validator, diff integrity만 검증하고 M device mutation은 하지 않는다.

실기기 retirement와 physical reboot proof는 merge/postmerge convergence 뒤 EXPERIMENT_CLOSE에서만 수행한다. PASS 전에는 reboot persistence를 완료로 간주하지 않는다.

Refs #3305 #3306 #3232 #3231.
