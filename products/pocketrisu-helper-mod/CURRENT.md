# CURRENT — 포켓리스 보조 개조

최종 갱신 기준: **2026-08-23**

새 채팅이나 작업 재개 시 가장 먼저 읽는 현재 상태 체크포인트.

## 안정적으로 사용 중

- 메인폰 SSH core tunnel.
- 메인폰 notification relay.
- 서버폰 PocketRisu runit 서비스.
- DB/save `/api/patch` 성능 최적화 및 persistence 검증.
- pluginCustomStorage depth-3 incremental hash + selective clone.
- reconnect watcher 구축 및 실전 `DOWN → UP` 복구 알림 성공.
- 서버폰 Android 알림 금지.

## 현재 P0 — 전화/이어폰 알림 무한소리

상태: **TODO**

관찰:
- 전화 수신 시 알림 소리 반복.
- 이어폰 상태에서도 반복.
- Discord 상황에서도 유사 사례.

우선 범위:
1. 전화
2. 이어폰

다음 한 단계:
- 📱 메인폰 notification relay의 실제 `termux-notification` 옵션과 호출 중복 조건을 INSPECT_ONLY로 확인.

## 조사 중 — 초장기챗 새고 health 정체

상태: **INVESTIGATE**

확정:
- reconnect watcher가 실제 health failure를 기록.
- 서버 PocketRisu 프로세스는 같은 PID로 계속 실행 중.
- 해당 시각 SSH core tunnel 단절 로그 없음.
- `/api/health` 자체는 초경량.
- `/api/session`의 `save/__sessions`는 약 7.1KB / 87 entries로 10초대 정체를 설명하기 어려움.

다음:
- 새고 시 호출되는 큰 DB load/read/encode 경로 조사.

## 조사 중 — Firefox 탭 복귀 / 논리 session boot

관찰:
- 직접 새고하지 않고 다른 탭에서 복귀했는데 `Session boot registered` 계열이 다시 보일 수 있음.
- 서버 프로세스 재시작은 아님.
- 초기 화면이 눈에 띄게 보이지 않았음.
- `sessionId`는 sessionStorage에 유지.
- `sessionInitialized`는 JS static.

다음:
- `sessionInitialized` 전체 참조와 session init 실패 재시도 가능성 구분.

## 다음 큰 기능 — 안전 자동 updater

원칙:
`fetch → backup → compatibility check → safe apply → syntax/build/health/service verify → failure rollback → main-phone notify`

naive periodic `git pull` 금지.

## 금지/주의

- PM2 도입 금지.
- 적극 복구 `pocketrisu-watchdog`을 reconnect watcher 대신 켜지 않음.
- `flushServerDbKeepalive()` no-op 정책을 함부로 되돌리지 않음.
- hide/pagehide full DB flush 강제 금지.
- 토큰, DB, snapshot, PID, 로그 원본, backup 원본 Git 커밋 금지.
