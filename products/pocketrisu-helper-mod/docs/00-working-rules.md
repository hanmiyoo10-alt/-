# 작업 규칙

## 명령 표시
모든 실행 명령은 담당 기기를 명확히 구분한다: `📱 메인폰` / `📱 서버폰` / `📱 양쪽`.

양쪽 작업이면 한 블록에 섞지 않고 **메인폰 → 서버폰** 순서로 분리한다.

## 수정 순서
가능하면 `INSPECT_ONLY → 백업 → 수정 → 검증`.

위험하거나 범위 큰 명령은 한 번에 던지지 않는다.

## 진단 분리
메인폰 연결 축(SSH/notify/Firefox/reconnect)과 서버폰 코드 축(server.cjs/DB/runit/bridge/log)을 섞지 않는다.

## 서비스
- runit 유지.
- PM2 신규 도입 금지.
- 적극 복구 `pocketrisu-watchdog`은 reconnect 관찰용으로 사용하지 않는다.
- 서버폰 Android 알림 금지.

## DB
- `sqlite3` CLI 미설치 전제.
- 필요 시 Node + `better-sqlite3`.
- `flushServerDbKeepalive()` no-op 정책을 함부로 되돌리지 않는다.
- hide/pagehide에 `/api/db/flush`를 강제로 붙이지 않는다.

## Git
- 소스 포크와 이 운영 문서 제품은 분리.
- 현재 섞인 개조를 무리하게 PR/commit 단위로 재분리하지 않는다.
- 토큰/snapshot/PID/backup 원본 커밋 금지.
