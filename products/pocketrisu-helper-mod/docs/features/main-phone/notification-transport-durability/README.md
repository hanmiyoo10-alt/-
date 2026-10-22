# 메인폰 notification transport durability

Feature-ID: `notification-transport-durability`
상태: **IMPLEMENTATION_PR CANDIDATE / DEVICE EFFECT NONE**

## 목적

메인폰의 PocketRisu 알림 transport가 shared Termux `runsvdir` 없이 동작하는 현재 구조를 유지하면서, relay 전용 `runsv`와 notify reverse-tunnel 전용 `runsv`가 선택적으로 사라져도 다시 복구 가능하게 만든다.

이 Feature-ID는 #3711 / #3709의 자연 재발을 소유한다. 서버폰 PocketRisu v1.15.2 코드나 #3269 알림 sound/channel 문제를 소유하지 않는다.

## 확정된 장애 경계

2026-10-22 자연 운용에서 다음이 반복 재현됐다.

- `pocketrisu-notify-relay` 전용 runsv + receiver가 사라짐.
- `pocketrisu-notify-tunnel` 전용 runsv + reverse SSH가 사라짐.
- shared top-level `runsvdir`는 계속 없음.
- core SSH path도 손실이 발생하지만 기존 guard↔anchor ring이 guard와 dedicated runsv를 다시 만든 semantic log가 남음.
- 따라서 standalone service-specific supervisor survival gap은 확정이다.
- 현재 recurrence의 직접 Android kill 원인은 `UNKNOWN / CONSISTENT_WITH #3231`이다.

## 소유 경계

이 기능은 **durability ring만** 소유한다.

- relay target semantics는 #3513의 exact installed launcher에 위임한다.
- notify-tunnel은 기존 fixed service/run bytes를 수정하지 않는다.
- private SSH destination/username/address를 repository에 넣지 않는다.
- core SSH guard/anchor, RDC, Tailscale, MCL lifeline을 수정하지 않는다.
- Android phantom-process policy를 수정하지 않는다.
- shared `runsvdir` / `service-daemon`을 만들거나 재시작하지 않는다.

## 구현

### guard

`files/pocketrisu-notification-transport-guard`

고정된 M Termux path만 사용한다.

relay:
- exact `~/.termux/boot/22-pocketrisu-notify-relay-supervisor` regular executable;
- expected SHA-256 `f1015e8dea71226bad9f3de2dda0a2102fa2a6027012ffd15ed45fdb3e227e35`;
- exact launcher `--ensure`에만 위임한다.
- receiver identity/orphan/down/health semantics를 이 guard에서 복제하지 않는다.

notify-tunnel:
- exact service `$PREFIX/var/service/pocketrisu-notify-tunnel`;
- exact regular mode-0700 run file;
- expected run SHA-256 `91351ceddc958c609673ac28ff99a23dfd5a7b9bfc2b21ca7b35f07170ad46f3`;
- fixed reverse-forward semantic `-R 127.0.0.1:39120:127.0.0.1:39120`만 인식한다.
- run/down supervision은 보존한다.
- missing supervisor + reverse SSH 0개만 start eligible이다.
- missing supervisor + exact PID-1 reverse SSH 1개는 orphan으로 보존한다.
- multiple/alternate/non-PID1 ownership은 fail closed 한다.

guard loop는 anchor 존재만 다시 보장하며 target health를 restart trigger로 쓰지 않는다.

### independent anchor

`files/23-pocketrisu-notification-transport-guard`

- Termux:Boot entry + independent fixed anchor owner.
- guard loop이 exact/alive이면 보존.
- guard가 missing이면 guard loop 하나만 다시 시작.
- guard identity가 ambiguous이면 fail closed.
- anchor는 relay/notify target을 직접 만지지 않는다.
- 살아 있는 guard는 `--ensure-anchor`로 anchor hard-loss를 복구한다.

이 구조는 simultaneous guard+anchor loss, whole-Termux process loss, Android package force-stop을 해결한다고 주장하지 않는다.

## 검증

IMPLEMENTATION_PR에서 요구:
- exact 7-path diff;
- 두 shell source syntax PASS;
- focused synthetic contract PASS;
- product `ci/validate_docs.py`가 focused contract를 실제 실행;
- `git diff --check` PASS;
- exact-head Required / canonical review / overlap / currentness before merge;
- physical M runtime effect NONE.

Synthetic contract는 최소:
- relay exact-launcher delegation;
- notify missing eligible restore + idempotence;
- explicit down preserve;
- exact PID-1 orphan preserve;
- duplicate/alternate/identity drift fail closed;
- concurrent/steady target no duplicate runsv;
- guard hard-loss → anchor recovery;
- anchor hard-loss → guard recovery;
- controlled notify runsv loss → guard recovery;
- delegated relay missing fixture → guard invocation;
- shared runsvdir/service-daemon primitive absence.

## 배포 / rollback

아직 repository candidate 단계다.

나중에 merge + postmerge 후에만:
1. M live identity fresh readback;
2. 기존 대상 파일 backup;
3. exact merged guard를 `~/.local/bin/pocketrisu-notification-transport-guard` mode 0700 설치;
4. exact merged Boot launcher를 `~/.termux/boot/23-pocketrisu-notification-transport-guard` mode 0700 설치;
5. guard/anchor mutual hard-loss와 relay/notify runsv hard-loss를 bounded live proof;
6. 실패하면 새 두 파일만 rollback하고 기존 relay/run/SSH/core owners는 그대로 보존.

## 다음 한 단계

#3712 IMPLEMENTATION_PR candidate를 검증하고 non-closing PR로 발행한다. 실제 M 설치/kill stimulus는 merge + postmerge 전에는 금지한다.
