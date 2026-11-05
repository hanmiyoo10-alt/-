# CURRENT — 포켓리스 보조 개조

최종 갱신 기준: **2026-10-23**

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

## PocketRisu v1.16.0 Termux update — LIVE_PROVEN

- official PocketRisu `v1.16.0` tag `8b79cbe1274a342765248c36614fc3152a39d1b7`을 검증된 Termux fork 배포선에 통합하고 physical S live에 배포했다.
- fork integration PR `hanmiyoo10-alt/PocketRisu#14`가 merge됐고 deploy merge는 `db3b7684aaf2c58bc1f2705a2f89897b93f8bd1e`이다.
- v1.15.x live-only Firefox 5개 변경은 blind cherry-pick하지 않고 v1.16의 cold-load/plugin-storage/nodeStorage 및 keepalive semantics에 맞춰 재조정했고, 최종 live overlay candidate와 physical S HEAD는 `f32e31690d687d48d087321246199cbfbf68e3f3`이다.
- repository validation에서 server `206` tests PASS, compatibility `144` tests PASS(+6 skipped), focused overlay/cold-load suites PASS, Svelte check 0 errors, production build PASS를 확인했다. raw client의 환경성 실패 집합은 untouched official v1.16과 동일하게 재현되어 integration-specific regression으로 분류하지 않았다.
- cutover 전 rollback/source anchor `fork/backup/pre-v1.16.0-live-20261023 -> f48bd6e6474423c3f7d5fa17b921b325863313ca`와 candidate remote ref를 보존했다.
- rollback/staging root `~/.local/state/pocketrisu-v1160-live-deploy/run-20261023-164036`에 이전 tracked source, service run, intentional untracked bridge 및 staged runtime 증거를 보존했다.
- PocketRisu 서비스를 내린 상태에서 fresh full save backup을 만들었고 live/backup 크기 `8,190,707 KiB`가 일치했다. backup의 `risuai.db`, `logs.db`, `request-logs.db`, `model-jobs.db`는 모두 `quick_check=ok`이다.
- v1.15.2와 v1.16 candidate의 lockfile은 동일했고 기존 Termux native dependency tree를 보존했다. `better_sqlite3.node` SHA-256은 검증값 `f9b4f7c886eb6d0d4b05b4061142cb44c1db7b996b685704f2ecb9161b184572`와 일치한다.
- physical S에서 v1.16 HEAD와 candidate identity가 일치하고 `/api/health=ready`를 확인했다. controlled restart는 PID `20698 -> 28323` 후 다시 health ready로 복귀했다.
- 실제 S→M notification reverse tunnel과 relay를 통해 POST가 HTTP 200 / `{"ok":true}`로 성공했고, M Android notification list에서도 tag `8472`, title `PocketRisu · v1.16 live smoke` 알림 생성을 확인했다.
- 해당 smoke 도중 M의 notification guard + independent anchor + notify-tunnel + reverse SSH가 동시에 소실된 별도 recurrence를 발견했다. 기존 설치된 Boot recovery entry로 transport를 복구했고, 이 recurrence의 initiating cause는 이번 release 완료 근거로 추측하지 않으며 #3231에 별도 기록했다.
- 메인폰 Firefox에서 이미 열려 있던 PocketRisu 탭으로 chat/generation을 수행한 뒤 reload하여 내용 유지 여부를 확인하는 v1.16 restart-save 회귀 smoke를 2026-10-23 사용자가 직접 수행 완료했다. 이 HUMAN_EVIDENCE는 v1.16 release gate 범위이며 #2027 inactive-preset 별도 완료 판정을 대체하지 않는다.
- safe-updater 자동 배포는 계속 비활성이다. 이번 성공은 backup-first manual cutover의 live proof이며 자동 배포 활성화 증거가 아니다.

다음 한 단계:
- v1.16 live를 보존하고 자연 운용을 관찰한다. release integration #3719를 닫은 뒤 별도 중단 작업인 #3717 core exact-orphan reconciliation로 복귀한다. Android/Termux 동시 process-loss는 #3231, inactive-preset UI/persistence는 #2027, 전화/이어폰 sound 문제는 #3269가 계속 소유한다.

## PocketRisu v1.15.2 Termux update — LIVE_PROVEN

- official PocketRisu `v1.15.2`를 검증된 fork 배포선에 통합하고 서버폰 live에 배포했다.
- fork integration PR `hanmiyoo10-alt/PocketRisu#13` merge commit은 `eee9f5afbc2df3349052292b15500c95875265c3`, 서버폰 live overlay HEAD는 `f48bd6e6474423c3f7d5fa17b921b325863313ca`이다.
- 기존 local-only Firefox 4커밋을 v1.15.2에 재조정해 보존했고, 의도적 untracked `generic_mock_bridge.cjs`도 그대로 유지했다.
- inactive-preset lazy-hydration 코드는 배포됐지만, 그 별도 실제 Firefox UI/persistence 완료 판정은 계속 #2027 소유이며 이번 일반 chat/generation smoke로 닫지 않는다.
- cutover 직전 rollback root `~/.local/state/pocketrisu-v1152-live-deploy/run-20261022-093409`에 old tracked source archive, old `dist`, old `node_modules`, service run, untracked bridge, full save backup을 보존했다.
- fresh save backup은 `7,923,699 KiB`이고 `risuai.db`, `logs.db`, `request-logs.db`, `model-jobs.db` 모두 backup/live 양쪽 `quick_check=ok`를 확인했다.
- Termux native `better_sqlite3.node` SHA-256은 검증값 `f9b4f7c886eb6d0d4b05b4061142cb44c1db7b996b685704f2ecb9161b184572`와 일치했고 in-memory SQLite smoke도 PASS했다.
- 첫 v1.15.2 기동은 약 8초 안에 `/api/health=ready`, controlled restart는 PID `2523 -> 2972` 후 약 6초 안에 health ready로 복귀했다.
- 메인폰 relay supervisor #3513은 merge/postmerge/live proof까지 DONE이다.
- relay + notify-tunnel selective-supervisor durability는 #3712에서 guard↔independent-anchor ring으로 확장했고 physical-M LIVE_PROVEN까지 완료했다.
- #3712 최종 main은 `e559dc09b3c030f31defc74aec6f1d19e7855a2f`; shared top-level `runsvdir` 없이 guard/anchor mutual recovery, relay/notify selective-loss recovery, duplicate 방지, 실제 S→M 알림까지 검증했다.
- 실제 S→M notification POST는 HTTP 200이었고 메인폰 Android에서 PocketRisu smoke notification 표시를 확인했다.
- 실제 메인폰 Firefox chat/generation smoke는 2026-10-22 사용자가 직접 PASS를 확인했다.
- safe-updater 자동 배포는 여전히 비활성이다. 이번 성공은 수동 backup-first cutover의 live proof이지 자동 배포 활성화 증거가 아니다.

다음 한 단계:
- v1.15.2 live와 #3712 notification transport durability는 rollback/installation evidence를 보존한 채 자연 운용을 관찰한다. 별도 미완료 축은 #3715 core exact-orphan/runit reconciliation, #3231 Android phantom-process initiating cause/policy, #2027 inactive-preset UI/persistence, #3269 전화/이어폰 sound 문제다.


## notification transport durability — LIVE_PROVEN

- 자연 운용에서 메인폰 relay dedicated runsv/receiver와 notify-tunnel dedicated runsv/reverse SSH가 반복 소실되는 failure domain을 확인했고 #3711/#3709 증거를 #3712가 durable repair owner로 받았다.
- PR #3713의 production guard/anchor 구현 중 Codex가 zombie PID stale-lock P1을 발견했고 repaired head `0b50688000d0fd6ffd7d1b855c6854e2dfb3ddcf`에서 `/proc/$pid/stat`의 `Z`를 stale/dead로 처리하도록 수정했다.
- primary merge `5231ad79c77f61622eb04b92665232089f5968b0` 뒤 merged-main focused test race를 별도 repair PR #3714로 고쳤고 final main은 `e559dc09b3c030f31defc74aec6f1d19e7855a2f`이다.
- 최종 repository 상태는 PocketRisu helper docs / SimCore Verify+Required / Proof Bundle PASS, #485 CLEAR / STABLE / UNKNOWN NONE이다.
- physical-M에 exact merged guard + Boot/anchor를 mode 0700으로 설치했고 controlled guard hard-loss는 anchor가, controlled anchor hard-loss는 guard가 복구했다.
- controlled relay runsv loss와 notify runsv loss에서는 healthy exact PID1 orphan child를 보존하고 duplicate를 만들지 않았으며, guard interval을 넘긴 soak에서도 단일 orphan 상태를 유지했다.
- shared top-level `runsvdir`는 끝까지 absent였고 core/RDC/Tailscale을 보존했으며 실제 S→M notification smoke도 PASS했다.
- #3712는 `IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / DONE`으로 CLOSED다.
- 이 성공은 Android가 Termux child를 죽이는 initiating cause를 제거했다는 뜻이 아니다. 그 원인/정책은 #3231이 계속 소유한다.
- core SSH의 exact PID1 orphan + replacement runsv down/want-up reconciliation은 #3715가 별도 소유한다.

다음 한 단계:
- #3715를 INSPECT_ONLY로 currentize한 뒤 healthy exact core orphan을 죽이지 않는 reconciliation contract가 필요한지 결정한다.


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
- 기존 guard/anchor 기능은 추가 배포 없이 자연 운용을 관찰한다. exact PID1 four-forward orphan과 replacement runsv `down / want up` 상태의 reconciliation은 #3715, Android/whole-Termux initiating process-loss 원인은 #3231에서 분리 추적한다.

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
