# CURRENT — 포켓리스 보조 개조

최종 갱신 기준: **2026-10-06**

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


## main-ssh-tunnel supervisor hardening — LIVE_PROVEN

- 2026-09-12 중앙 Termux `runsvdir` 소실 뒤 core tunnel supervisor가 사라져 연결이 끊기는 실장애를 확인했다.
- 서버폰 PocketRisu/sshd와 메인→서버 SSH 도달성은 정상이라 메인폰 service-supervision 축으로 격리했다.
- 중앙 `runsvdir` 사망 원인은 계속 `UNKNOWN`이다.
- base core-only supervisor guard + Termux:Boot launcher는 PR #2060으로 merge됐다: `d9e93115f943138ad7c675fcc675e4a0460714b9`.
- guard-owner durability follow-up #2786은 PR #2878로 merge됐다: `0a25b7691bf5d768aced94403b32ebdb50f12cc3`.
- 2026-09-25 exact merged guard + independent anchor launcher를 M에 backup-first로 배포했고 deployed hashes가 merged/current source와 일치함을 확인했다.
- controlled guard hard loss는 anchor가 복구했고, controlled anchor hard loss는 guard가 복구했다.
- 최종 guard/anchor는 정확히 1개씩 수렴했고 `pocketrisu-ssh-tunnel` supervision과 localhost health는 유지됐다.
- shared top-level `runsvdir`는 여전히 없으며, guard-anchor 성공을 그 root-cause 해결로 확대 해석하지 않는다.
- network toggle/reset, reboot, whole-Termux loss, broad service-tree restart, server PocketRisu/sshd mutation 없이 live proof를 완료했다.

다음 한 단계:
- 이 Feature-ID는 추가 배포 없이 자연 운용을 관찰한다. shared `runsvdir` 원인/whole-Termux 복구는 별도 incident/control-plane owner에서 계속 추적한다.

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

## 정식 upstream 기여 — DB/save staged series 진행 중

- Stage A: official `PocketRisu/PocketRisu#67` OPEN. 현재 mergeable이며 review/check 결과 대기.
- Stage B: local draft `hanmiyoo10-alt/PocketRisu#5` — clean 1-commit hash-cache stage.
- Stage C: local draft `#6` — clean 1-commit selective-clone stage.
- Stage D: local draft `#7` — clean 1-commit pluginCustomStorage direct-child stage.
- Stage E: local draft `#8` — clean 1-commit depth-3 stage.
- B~E는 의도적으로 draft이며 앞 단계가 공식에서 결정되기 전에는 promotion/merge하지 않는다.
- 매 공식 결과 후 최신 `develop`을 다시 읽고, 이미 구현된 단계나 구조 충돌 단계는 건너뛴다.

다음 한 단계:
- official PR #67의 maintainer review/check 결과를 기다린다. 결과가 나오면 최신 `develop`에서 Stage B 중복/충돌을 다시 검사한 뒤에만 다음 정식 PR을 준비한다.

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

## Firefox 새고 — 두 메커니즘 분리 추적

### 1) background excessive-CPU process kill — MECHANISM_FIX_PASS
- Android ActivityManager가 PocketRisu와 연결된 Firefox Gecko tab process를 `excessive cpu` 이유로 kill하는 경로를 실기기에서 확인했다.
- 원인은 Android Firefox의 `keepSessionAlive: sound` continuous MP3 loop로 좁혀졌고, Android Firefox에서만 sound loop를 시작하지 않는 fix를 적용했다.
- 독립 feature commit: `4f693cba1c993b42407b1b73a9ae407f4e102b97`.
- reload 후 AAudio player release, replacement player 없음, >5분 background A/B에서 excessive-CPU kill 0건.
- 이 fix는 한 메커니즘을 해결하며 모든 새고의 전역 해결책은 아니다.

### 2) same-process document reconstruction — DEPLOYED_DIAGNOSTIC
- 2026-10-06 16:49 visible reconstruction은 Firefox main/tab PID set이 그대로 유지된 상태에서 발생했다.
- incident 시각 Firefox process kill/start 이벤트는 없었지만 PocketRisu `Session boot registered`와 client initialization이 다시 발생했다.
- `NodeStorage.sessionInitialized`는 runtime static이고 production reset path가 없으므로 새 JS document/runtime 생성은 확정.
- navigation type과 BFCache 여부는 아직 UNKNOWN.
- 독립 diagnostic commit: `2ca8dc4a92e8533d983a90f6d2aca63cb4bf8224`.
- 현재 deploy composition HEAD: `dc7ea7583094231c99d67146aaf9b81d2e8f57a0`.
- lifecycle trace는 bootId/navType/timeOrigin/wasDiscarded/pageshow/pagehide/visibility/writer-session prefix를 기록한다.

### 서버 재기동 별도 사실
- 서버 PocketRisu는 약 15:55 KST 한 차례 재기동되어 현재 generation reset을 설명한다.
- 16:49 same-process reconstruction과의 인과관계는 아직 UNKNOWN이며 인증 retry 코드 자체는 reload를 호출하지 않는다.

다음 한 단계:
- 메인폰 Firefox가 lifecycle trace 포함 새 dist를 한 번 로드한 뒤 자연 재현을 기다린다. 다음 재현에서 LG-Gram PID/kill telemetry와 lifecycle navType/timeOrigin을 결합해 두 번째 메커니즘을 분류한다.

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
