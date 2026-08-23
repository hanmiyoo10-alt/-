# PocketRisu 응답 알림

상태: **DONE 계열 / ACTIVE**

## 목적
PocketRisu 응답 완료 시 메인폰 Android notification.

## 원칙
- 서버폰 notification 금지.
- 서버 이벤트 → 메인 relay → Android notification.
- 서버 코드와 메인 notify tunnel/relay를 분리 진단.

과거 관련 코드 축에는 `server/node/server.cjs`, `src/ts/process/index.svelte.ts`가 포함됨.

후속: 전화/이어폰/Discord의 무한 sound 문제는 별도 모듈에서 수정.
