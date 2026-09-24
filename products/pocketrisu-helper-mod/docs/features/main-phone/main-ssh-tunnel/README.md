# 메인폰 SSH core tunnel

상태: **ACTIVE / GUARD-ANCHOR HARDENING IMPLEMENTATION_PR**

## 목적
메인폰 Firefox의 localhost 접속을 서버폰 PocketRisu/bridge 서비스로 전달.

## 담당
📱 메인폰

## 원칙
메인 localhost health 실패를 바로 서버 코드 문제로 결론내리지 않는다.

진단 순서:
1. SSH runit service
2. tunnel log
3. 서버 sshd 도달성
4. 서버 PocketRisu service
5. Node event-loop/코드

`No route to host`, `Connection refused`, forwarded target refusal을 서로 구분한다.

실제 LAN IP/Termux user는 이 제품 문서에 기록하지 않는다.

## 2026-09-12 supervisor incident

실제 장애에서 서버폰 PocketRisu와 sshd는 정상이고 메인폰에서 서버 SSH 포트 도달성도 정상인데, 메인폰 중앙 `runsvdir`가 사라진 뒤 core tunnel supervisor도 없어져 localhost `6001`이 끊기는 상태를 확인했다.

확정 범위:
- 서버 코드 문제 아님.
- 서버 sshd 문제 아님.
- 기본 메인폰→서버폰 네트워크 문제 아님.
- 중앙 `runsvdir` 사망 원인은 아직 `UNKNOWN`.
- passive reconnect watcher는 감지만 하며 적극 복구 주체가 아니다.
- broad `pocketrisu-watchdog`은 비활성 상태를 유지한다.

## 최소 복구 경계

Feature-ID `main-ssh-tunnel` 안에서 core tunnel supervisor와 그 fixed guard owner만 보강한다.

- `files/pocketrisu-core-supervisor-guard.sh`: 정확히 인식된 missing-supervisor 상태에서만 해당 service directory에 전용 `runsv`를 시작한다.
- service의 `down` marker가 있으면 명시적 운영자 정지로 보고 복구하지 않는다.
- 모호한 supervisor/PID identity는 fail closed 한다.
- SSH/PocketRisu health, RDC, Tailscale, Wi-Fi/cellular 상태는 복구 trigger가 아니다.
- `files/21-pocketrisu-core-supervisor-guard`: Termux:Boot launcher이자 guard와 독립된 fixed anchor owner다.
- anchor는 guard loop만 복구하고, guard loop는 anchor 존재만 다시 보장한다. target tunnel 복구 의미는 기존 guard만 소유한다.
- 서버폰 서비스, 서버 코드, notification relay, reconnect watcher 의미는 변경하지 않는다.

## 2026-09-24 guard-owner recurrence

자연 실장애에서 서버폰 PocketRisu는 HTTP 200 / `ready`, M Tailscale과 RDC도 살아 있었지만 M의 core tunnel supervisor와 guard loop가 함께 사라진 상태를 다시 확인했다. guard state에는 stale PID/lock 흔적이 남아 있었다.

기존 guard `--once`로 core supervisor만 복구하고 기존 Boot launcher로 guard loop를 다시 올리자 localhost health가 HTTP 200 / `ready`로 회복됐다. 이 증거는 guard-owner durability gap을 확정하지만 guard가 사라진 최초 원인은 여전히 `UNKNOWN`이다.

#2786 follow-up은 이 gap에만 대응한다. 독립 anchor가 guard hard-loss를 복구하고, 살아남은 guard가 anchor hard-loss를 복구하는 bounded two-member ring을 추가한다. whole-Termux process loss, Android force-stop, 네트워크 장애는 이 owner 범위가 아니다.

## Merge / deployment state

- base hardening PR #2060 merged to `main` as `d9e93115f943138ad7c675fcc675e4a0460714b9`.
- 2026-09-24 natural evidence confirms the #2060 guard + Boot launcher are installed on M and can still perform bounded manual recovery.
- follow-up #2786 is currently `IMPLEMENTATION_PR`: guard↔anchor durability source and synthetic regression are prepared only.
- the #2786 guard-anchor bytes are **not merged or deployed** on M yet.
- no global `runsvdir`/service-daemon restart, health-triggered tunnel restart, network toggle, or server restart is part of this follow-up.

다음 한 단계:
- #2786 exact candidate를 non-closing PR로 게시하고 `VALIDATION_MERGE`로 넘긴다. 실제 M 설치/guard-owner loss proof는 merge + postmerge 이후 별도 live acceptance에서만 수행한다.
