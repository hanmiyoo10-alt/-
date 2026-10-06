# Firefox LMKD memory footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Area: `shared`
Status: **IMPLEMENTED_LOCAL / DEPLOY_DIST_READY / LIVE_VERIFY_PENDING**

## 목적
Android 메모리 압박 시 LMKD가 PocketRisu의 Firefox Gecko content process를 회수해 visible reconstruction이 발생하는 경로를 줄인다.

## 2026-10-06 21:06 재현
Lifecycle:
- 기존 document: bootId `a3640315`, navType `navigate`.
- 기존 document가 21:05:45경 hidden.
- 새 document: 21:06:46 KST, bootId `24e6cdf7`, navType `back_forward`.
- 새 timeOrigin 생성.
- `pageshow.persisted=false`: BFCache 복원이 아님.
- Firefox main process는 생존.

Android LMKD:
- 21:06:19부터 cached process 대량 reclaim.
- 반복 사유: `low watermark is breached or filecache is low`.
- 21:06:21.309 Firefox tab35 PID 29372 reclaim:
  - oom_score_adj 905
  - RSS 약 508 MB
  - swap 약 397 MB
- 21:06:22 Firefox tab7 PID 29467과 crashhelper도 같은 reclaim wave에서 종료.
- Firefox main PID 28954는 생존.
- Firefox는 `EngineAction$KillEngineSessionAction`을 기록.
- 복귀 시 새 Gecko tab1 PID 32260 생성 후 약 0.45초 뒤 PocketRisu 새 JS boot.

## 메모리 증거
복원된 PocketRisu-correlated tab:
- 관측 RSS 약 617~722 MB.
- 관측 PSS 약 563~661 MB.
- Android meminfo의 Java/Native heap은 작고, 약 479 MB가 `Unknown / Private Other`로 분류됨.
- Gecko/JS/DOM/content-engine memory가 주체인 형태.

저장/클라이언트 shape:
- full DB JSON 약 137 MB.
- 서버 chat stripping 후 client-shape estimate 약 32.5 MB.
- characters는 chat stripping으로 약 105.5 MB → 약 1.0 MB.
- `botPresets`가 약 23.65 MB로 stripped payload의 가장 큰 항목.
- plugins 약 3.47 MB, modules 약 2.24 MB.
- active preset 하나만 full, inactive presets를 metadata stub으로 두는 가상 계산은 약 32.5 MB → 9.45 MB까지 감소.

hydrated chat 예시:
- 3,754-message chat body JSON 약 19.7 MB.
- 기존 chat hydration은 one-way라 full chat이 background에서도 reactive runtime에 남아 있었음.

## 1차 완화 구현 — active-chat background dehydrate
독립 source branch:
- branch: `feat/firefox-lmkd-memory-footprint`
- commit: `9f6bad3f34eceb2d708cb70ba19fb1a31b0ca330`
- parent: `85bf4cec98ec55b96d1201f0de433f43ad3d884b`

변경 파일:
- `src/ts/storage/chatStorage.ts`
- `src/ts/storage/chatStorage.test.ts`
- `src/lib/ChatScreens/DefaultChatScreen.svelte`

동작:
1. document hidden 후 5초 debounce.
2. 현재 chat이 200 messages 미만이면 no-op.
3. generation 중이면 no-op.
4. 기존 global `flushSaves()`가 성공한 뒤에만 진행.
5. 여전히 hidden이고 동일 character/chat/index인지 재확인.
6. full chat을 기존 `chatToStub → stubToPlaceholder` shape로 교체.
7. lifecycle-only replacement 한 tick은 dirty-tracking suppression.
8. visible 복귀 시 기존 `ensureCurrentChatReady()`로 즉시 rehydrate.
9. persist/flush 실패 시 full chat을 그대로 유지.
10. dehydrate/rehydrate 성공 로그는 content 없이 ID prefix + messageCount만 `memory-guard` source로 기록.

## 검증
- TDD red: 새 helper 부재로 신규 3 tests만 fail, 기존 20 tests PASS.
- 구현 후 `chatStorage.test.ts`: **23/23 PASS**.
- `svelte-check`: **0 errors**, 기존 a11y warnings 4개.
- isolated production build: **PASS**.
- deploy composition targeted test: **23/23 PASS**.
- final composition production build: **PASS**.
- server `/api/health`: **ready**.
- unrelated `generic_mock_bridge.cjs`는 그대로 untracked, 미접촉.

로컬 deploy composition:
- `cf32f901`: Android Firefox sound keep-alive guard.
- `dc7ea758`: same-process lifecycle trace.
- `c702a1c0`: active-chat background dehydrate.
- final deploy HEAD: `c702a1c0424faef245337c7dc08cda554f044862`.

## 아직 완료 아님
- 현재 메인폰 Firefox document는 새 dist를 아직 읽지 않음.
- 실기기 hidden >5초에서 `Background chat dehydrated` 로그 확인 필요.
- dehydrate 전/후 PocketRisu-correlated Gecko tab RSS/PSS 낙폭 확인 필요.
- visible 복귀에서 `Background chat rehydrated` + 채팅 정상 표시/전송/저장 확인 필요.
- 자연 LMKD pressure에서 재발 감소 여부 장기 관찰 필요.

## 후속 후보
### inactive bot-preset lazy hydration
- 예상 payload 절감폭은 더 큼.
- preset edit/copy/diff/export/save semantics가 모두 full object를 가정해 별도 설계가 필요.
- 1차 dehydrate의 실기기 효과가 부족할 때 별도 Feature-ID로 분리한다.

## 이전 새고 경로와 분리
- `firefox-background-cpu-kill`: continuous audio → excessive CPU kill.
- `firefox-same-process-reconstruction`: Gecko tab PID가 유지된 채 document/runtime 재생성.
- 이 feature: LMKD low-watermark/filecache reclaim.

## 다음 한 단계
메인폰 Firefox에서 새 dist를 1회 로드하고, 큰 chat 상태로 10초 이상 background → foreground A/B를 수행해 memory-guard 로그와 Gecko RSS/PSS를 검증한다.
