# Firefox same-process document reconstruction

Feature-ID: `firefox-same-process-reconstruction`
Area: `shared`
Status: **DEPLOYED_DIAGNOSTIC / NATURAL_REPRO_PENDING**

## 목적
Android Firefox에서 Firefox app/main process와 Gecko tab process PID가 모두 유지된 채 PocketRisu JS document/runtime만 새로 만들어지는 별도 새고 경로를 추적한다.

## 2026-10-06 16:49 재현 확정
- Firefox main PID `28954` 유지.
- Gecko tab process set `29146/tab24`, `29372/tab35`, `29467/tab7`가 16:29~16:49 동안 동일하게 유지.
- 16:49 전후 Android event log에 Firefox `am_kill`, `am_proc_died`, `am_proc_start` 없음.
- 16:49:18 Firefox HomeActivity resume.
- 서버에는 16:49:22 무렵 새 `[Session] Session boot registered`.
- 16:49:30 plugin/provider initialization warning 재발.
- 16:49:56 Android Firefox sound keep-alive guard warning 재발.
- `NodeStorage.sessionInitialized`는 runtime static이고 성공 후 false로 되돌리는 production 코드가 없으므로 새 `Session boot registered`는 새 JS runtime/document가 만들어졌음을 뜻함.
- sound keep-alive excessive-CPU kill 경로는 이번 재현에서 관찰되지 않음.

## 서버 재기동과의 관계
별도 사실:
- 서버 PocketRisu service는 약 15:55 KST 재기동됨.
- 16:50 첫 DB mutation에서 `BackgroundPersist generation=2`가 나타난 것은 이 서버 재기동으로 설명 가능.
- 서버 인증 재시도 경로는 401/invalid signature에서 token refresh + retry만 수행하며 `location.reload()`를 호출하지 않음.
- 따라서 15:55 서버 재기동이 16:49 document recreation을 직접 유발했다는 증거는 아직 없음.

## 현재 분류
확정:
- 같은 Firefox process에서 새 JS document/runtime 재생성.
- 이전 `firefox-background-cpu-kill` fix가 막은 excessive-CPU process-kill 경로와 별개.

미확정:
- navigation type: `reload` / `navigate` / `back_forward`.
- BFCache 여부.
- Firefox 자체 restore/discard 정책인지 앱 코드 navigation인지.
- 서버 재기동과의 간접 상관 여부.

## 계측 구현
독립 source branch:
- branch: `feat/firefox-same-process-reconstruction`
- commit: `2ca8dc4a92e8533d983a90f6d2aca63cb4bf8224`
- 변경: `src/ts/log-capture.ts` 한 파일
- 기록: bootId, navType, timeOrigin, wasDiscarded, pageshow/pagehide persisted, visibility, writer session prefix, readyState, history.length.
- localStorage 최근 24 event 보존 + visible 시 최근 12 event mirror.
- 무거운 iframe/page-pressure 계측 없음.

검증:
- `svelte-check`: 0 errors, 기존 a11y warning 4개.
- production build: PASS.

로컬 deploy 조합:
- `deploy/termux-pocketrisu`
- `cf32f901`: Android Firefox sound keep-alive guard
- `dc7ea758`: same-process lifecycle diagnostic
- final deploy HEAD: `dc7ea7583094231c99d67146aaf9b81d2e8f57a0`
- final composition production build: PASS.
- server `/api/health`: ready.
- dist에 CPU guard + lifecycle marker 둘 다 존재.

## 다음 한 단계
메인폰 Firefox가 새 dist를 한 번 로드한 뒤 다음 자연 재현을 기다린다. 재현 시 lifecycle row의 navType/timeOrigin/pageshow/pagehide와 LG-Gram process telemetry를 결합해 document reconstruction 종류를 확정한다.
