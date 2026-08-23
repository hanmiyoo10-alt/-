# Session / single-writer lock

상태: **ACTIVE / INVESTIGATE**

## 목적
여러 기기/탭에서 stale tab이 active writer lock을 잘못 가져가는 문제 방지.

## 확인된 구조
- `NodeStorage.sessionId`: sessionStorage에 저장, 같은 탭 reload/OS restore에서 ID 유지 의도.
- `sessionInitialized`: JS static boolean.
- `initSession()`: auth 이후 `/api/session` POST, `x-session-id` 전달.
- 서버 `/api/session`: auth, client session register, cookie/session token persist.

`Session boot registered`, `freshly-booted session`은 **서버 프로세스 boot 의미가 아니다**.

## 현재 관찰
직접 새고 없이 다른 Firefox 탭에서 복귀 후 session boot처럼 보이는 로그 사례.

가능성:
1. Firefox/Android가 JS runtime을 버렸다가 tab state를 restore.
2. 이전 init이 완료되지 않아 auth에서 재시도.

아직 확정하지 않음.
