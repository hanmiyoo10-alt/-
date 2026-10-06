# Firefox LMKD memory footprint

Feature-ID: `firefox-lmkd-memory-footprint`
Area: `shared`
Status: **ROOT_CAUSE_CONFIRMED / MITIGATION_DESIGN**

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
복원된 PocketRisu-correlated tab1:
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

현재 hydrated long chat 예시:
- 3,754-message chat body 자체 JSON 약 19.7 MB.
- chat hydration은 현재 one-way이며 background dehydrate 경로는 없음.

## 이전 새고 경로와 분리
이 Feature-ID는 다음과 별개:
- `firefox-background-cpu-kill`: continuous audio → excessive CPU kill.
- `firefox-same-process-reconstruction`: Gecko tab PID가 유지된 채 document/runtime 재생성.

## 1차 완화 후보
### A. active-chat background dehydrate — 우선
기존 chat stub/placeholder/hydration 파이프를 재사용한다.

안전 조건:
1. hidden 직후 바로 하지 않고 짧은 debounce.
2. generation 중이면 절대 dehydrate하지 않음.
3. 현재 full chat의 server persist가 성공한 뒤에만 dehydrate.
4. persist 후에도 document가 hidden인지 재확인.
5. 동일 character/chat slot/id인지 재확인.
6. reactive dirty tracker가 destructive edit로 오인하지 않도록 lifecycle suppression 필요.
7. visible 복귀 시 현재 placeholder를 즉시 hydrate.
8. persist 실패 시 메모리 상태를 그대로 유지.

장점:
- 수정 범위가 좁고 기존 lazy-chat 서버 API를 재사용.
- 현재 active long chat 10~20 MB 이상의 JS object graph를 background 동안 해제할 가능성.

### B. inactive bot-preset lazy hydration — 후속 후보
- 예상 payload 절감폭이 더 큼.
- 하지만 preset edit/copy/diff/export/save/patch semantics가 모두 full object를 가정해 범위가 넓음.
- 별도 설계/Feature-ID로 분리 가능.

## 다음 한 단계
active-chat background dehydrate의 dirty-tracking/save/hydration 계약을 코드와 테스트로 검증한 뒤, 독립 source commit으로 구현한다.
