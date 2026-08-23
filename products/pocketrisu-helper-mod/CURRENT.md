# CURRENT — 포켓리스 보조 개조

최종 갱신 기준: **2026-08-23**

새 채팅이나 작업 재개 시 가장 먼저 읽는 현재 상태 체크포인트.

## 운영 루틴 — ACTIVE

- `ROUTINE.md` 기준으로 작업 시작/종료.
- **기능 하나 = 폴더 하나 = PR 후보 하나 = 배포 단위 하나**.
- 모든 기능 폴더에 `README.md + UPSTREAM.md + FAILURES.md`.
- PR/CI/review/deploy 실패는 기능별 실패 장부에 남기고 다음 수정 피드백으로 사용.
- 개인 포크 PR은 green + 기능 경계 통과 후에만 자동 merge 후보.
- 서버폰 실제 자동 배포는 `safe-updater`가 검증되기 전까지 `DEPLOY_READY`에서 멈춤.

## 안정적으로 사용 중

- 메인폰 SSH core tunnel.
- 메인폰 notification relay.
- 서버폰 PocketRisu runit 서비스.
- DB/save `/api/patch` 성능 최적화 및 persistence 검증.
- pluginCustomStorage depth-3 incremental hash + selective clone.
- reconnect watcher 구축 및 실전 `DOWN → UP` 복구 알림 성공.
- 서버폰 Android 알림 금지.

## 레거시 upstream rebuild 준비 — DONE

과거 Git history에서 기능이 섞여 정식 PR 분리가 어려웠던 5개 기능을 **옛 커밋 수술이 아니라 최신 upstream 재구성 방식**으로 정리 완료.

`PR_READY_REBUILD + REBUILD_PLAN_ISOLATED`:
- `restore-last-active-chat`
- `response-notification`
- `plugin-targeted-reload`
- `session-write-lock`
- `db-save-optimization`

각 기능 `UPSTREAM.md`에 최소 upstream scope, 의존성, 제외 범위, 검증 근거, rebuild 테스트/순서를 기록했고, 각자 독립 PR로 문서화했다.

첫 dossier CI에서 canonical marker 누락으로 실패한 사실도 각 기능 `FAILURES.md`에 `FAILURE -> FIXED`로 남겼고 후속 `PocketRisu helper docs` 검증은 모두 성공했다.

의미:
- 앞으로 정식 upstream PR을 만들 때 섞인 옛 branch를 억지로 분해하지 않는다.
- 최신 official upstream에서 해당 Feature-ID만 새 branch로 재구성한다.
- DB/save optimization은 한 번에 제출하지 않고 dossier의 staged PR series를 따른다.
- plugin persistence ordering이 별도 코드 변경을 요구하면 `plugin-update-persistence-order`라는 별도 Feature-ID로 분리한다.

다음 한 단계:
- 실제 정식 upstream PR을 원할 때 원하는 Feature-ID 하나를 고르고 그 기능 `UPSTREAM.md` recipe로 최신 upstream에서 rebuild를 시작한다.

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

추가 목표:
- green으로 merge된 **Feature-ID 단위** 변경만 pull-based로 배포.
- 배포 실패는 해당 기능 `FAILURES.md`에 기록.
- 성공 후 post-deploy verify.
- naive periodic `git pull` 금지.

## 금지/주의

- PM2 도입 금지.
- 적극 복구 `pocketrisu-watchdog`을 reconnect watcher 대신 켜지 않음.
- `flushServerDbKeepalive()` no-op 정책을 함부로 되돌리지 않음.
- hide/pagehide full DB flush 강제 금지.
- 토큰, DB, snapshot, PID, 로그 원본, backup 원본 Git 커밋 금지.
