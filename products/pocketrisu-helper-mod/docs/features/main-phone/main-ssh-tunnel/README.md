# 메인폰 SSH core tunnel

상태: **ACTIVE / SUPERVISOR HARDENING PREPARED**

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

## 제안된 최소 복구 경계

Feature-ID `main-ssh-tunnel` 안에서 core tunnel supervisor만 보강한다.

- `files/pocketrisu-core-supervisor-guard.sh`: `sv status`가 `runsv not running`일 때만 해당 service directory에 전용 `runsv`를 시작한다.
- service의 `down` marker가 있으면 명시적 운영자 정지로 보고 복구하지 않는다.
- SSH health 실패 자체만으로 프로세스를 재시작하지 않는다. 기존 runit/SSH 재시작 의미를 보존한다.
- `files/21-pocketrisu-core-supervisor-guard`: Termux:Boot에서 guard loop를 중복 없이 시작하는 launcher 후보다.
- 서버폰 서비스, 서버 코드, notification relay, reconnect watcher 의미는 변경하지 않는다.

실기기 배포는 PR 검증과 merge 이후 별도 단계에서만 진행한다.
