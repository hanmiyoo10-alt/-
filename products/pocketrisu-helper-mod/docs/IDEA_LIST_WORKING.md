# PocketRisu Helper Mod — 외부 Risu 아이디어 작업 원장

Status: **WORKING IDEA WAREHOUSE — NOT RELEASE AUTHORITY**

이 문서는 `products/pocketrisu-helper-mod`용 외부 Risu 조사/개조 아이디어의 작업 원장이다.

- 외부 포크의 코드를 이 저장소에 섞어 넣는 문서가 아니다.
- 외부 Risu 계열의 변경을 관찰하고, PocketRisu에 가져올 가치가 있는 패턴만 조사·분류한다.
- 실제 구현/배포 순서는 `CURRENT.md`, `ROADMAP.md`, 제품별 feature contract, regression/physical acceptance를 따른다.
- 이 문서에 `저장 완료`라고 기록하는 것은 **실제로 이 파일에 반영된 경우만** 의미한다.
- 최초 내용은 2026-08-26까지 대화에 남아 있던 조사 결과를 복구한 것이다. 복구 항목은 다음 scan에서 source commit과 PocketRisu 현행 상태를 다시 검증한다.

---

## 1. 분류 기준

### Priority

- **P0** — 보안/데이터 무결성/복구 정확성처럼 잘못되면 큰 피해가 생길 수 있어 우선 감사가 필요한 항목.
- **P1** — 다음 설계/구현 배치의 유력 후보. 작은 독립 PR 또는 명확한 correctness 개선을 우선한다.
- **P2** — 가치가 있지만 선행조건, 측정, 운영 경계가 필요한 항목.
- **P3** — 큰 구조 변경 또는 장기 아키텍처 후보. 선행 설계 없이는 구현하지 않는다.

### Status

- **READY_TO_PORT** — PocketRisu용 작은 bounded slice가 명확하고 위험이 낮아 구현 후보로 올릴 수 있음.
- **DESIGN_NEEDED** — 가치가 있으나 ownership/security/compatibility/rollback 설계가 먼저 필요.
- **HOLD** — 지금 독립적으로 구현할 이유가 약하거나 선행 아키텍처가 없음.
- **MERGED_EVIDENCE** — 독립 아이디어를 만들지 않고 기존 항목의 근거로 합침.
- **EXCLUDED_ALREADY_PRESENT** — PocketRisu에 이미 들어가 있어 신규 포팅 후보에서 제외.

### 평가 필드

각 항목은 가능한 범위에서 다음을 유지한다.

`Importance / Difficulty / Size / Evidence / Risk / Dependencies / Priority / Status / System Update`

`System Update`는 Android/OS/runtime/runit/service-manager 같은 시스템 변경이 필요한지 구분한다. 지금 복구된 외부 Risu 후보는 모두 **NO_SYSTEM_UPDATE**다.

---

## 2. 현재 실행 큐

복구 시점의 우선순위를 실제 다음 작업 후보로 압축하면 다음 순서가 기본값이다. 각 항목은 구현 전에 PocketRisu 현행 코드 재감사를 거친다.

1. `EXT-BACKUP-PATH-VALIDATION` — P0, backup restore path boundary 감사/설계.
2. `EXT-GENERATION-TELEMETRY` — P1, 현재 유일한 READY_TO_PORT 후보.
3. `EXT-BACKUP-MATERIALIZATION` — P1, lazy/cold 상태가 backup에서 누락되지 않는지 감사.
4. `EXT-TRANSLATION-PARTIAL-EDIT` — P1, 보이는 번역과 실제 편집 대상 ownership 교정.
5. `EXT-SANITIZER-CSS-BOUNDARY` — P1, sanitizer 이후 raw CSS 재삽입 금지 invariant 정리.

같은 P1의 `EXT-PLUGIN-STORAGE-INSPECTOR`, `EXT-HYPA-QUERY-CACHE`는 위 큐 다음 후보로 유지한다.

---

# 3. P0

## `EXT-BACKUP-PATH-VALIDATION` — Backup restore asset-path 정규화/검증

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `5101294b` (복구 기록의 short SHA; 다음 scan에서 full SHA 재검증)
- **Importance:** HIGH
- **Difficulty:** LOW
- **Size:** XS
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** PocketRisu browser/Node/Tauri restore-path audit, 기존 archive validation
- **Priority / Status:** **P0 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

백업 엔트리 path의 `\\` → `/` 정규화, asset-root 강제, `..`, `.`, absolute/empty segment 거부를 공통 restore boundary로 두는 패턴이다. 변경량은 작지만 잘못 적용하면 path traversal 또는 restore 손상이 가능하므로 P0여도 audit 전 READY_TO_PORT로 올리지 않는다.

**PocketRisu invariant 후보**

- archive entry path는 한 번만 canonicalize한다.
- canonical path가 허용된 asset root 밖으로 나가면 fail-closed.
- `..`, `.`, absolute path, 빈 segment, 플랫폼별 separator 혼합을 회귀 테스트한다.
- browser/Node/Tauri restore가 같은 validation contract를 공유하는지 확인한다.

---

# 4. P1

## `EXT-GENERATION-TELEMETRY` — stale-safe generation telemetry

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `a0bfba7b6721057ff2714d58c81ecf95ba1c69ac`
- **Importance:** MEDIUM
- **Difficulty:** LOW
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** LOW
- **Dependencies:** NONE
- **Priority / Status:** **P1 / READY_TO_PORT**
- **System Update:** NO_SYSTEM_UPDATE

생성 중 elapsed time, output token, tokens/sec를 observer-only 상태로 표시하는 패턴. generation ID로 superseded generation의 늦은 update를 거부하고, streaming tokenization은 약 250ms debounce + deferred dynamic import로 제한한다. tokenizer 실패 시 elapsed-time-only로 degrade할 수 있다.

**Port boundary**

- 요청/저장/generation semantics는 변경하지 않는다.
- telemetry는 ephemeral observer-only state.
- stale generation update는 generation identity로 폐기.
- tokenizer는 hot streaming path에 매 token 동기 실행하지 않는다.
- long-chat/main-thread jank를 측정하고 feature gate로 rollback 가능하게 한다.

---

## `EXT-BACKUP-MATERIALIZATION` — lazy/cold 상태를 완전히 materialize한 뒤 compatibility backup 생성

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commits:** `bc36ad26`, `4552f46e` (short SHA; full SHA 재검증 필요)
- **Importance:** HIGH
- **Difficulty:** MEDIUM
- **Size:** M
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** export hydration audit, authoritative storage identity, legacy-format contract
- **Priority / Status:** **P1 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

현재 메모리에 보이는 lazy shell을 그대로 backup하지 않고 authoritative snapshot과 비교해 누락된 chat/character를 복원하고, cold-stored message/Hypa/script/localLore 등을 detached export snapshot에 materialize한 뒤 compatibility 변환을 수행하는 패턴.

**PocketRisu invariant 후보**

- backup source는 현재 UI의 hydrated subset이 아니라 authoritative storage.
- export용 materialization은 live state를 mutate하지 않는 detached snapshot에서 수행.
- unresolved pointer/reference는 조용히 제거하지 않고 fail-closed 또는 명시적 warning.
- legacy compatibility transform은 materialization 이후 단계에서만 수행.
- 큰 chat에서 memory spike와 export time을 측정한다.

---

## `EXT-TRANSLATION-PARTIAL-EDIT` — translation-aware partial edit ownership

- **Source:** `kwaroran/Risuai`
- **Evidence commit:** `e565563a288ebe4c65b6099a1645ba477d1c84b4`
- **Importance:** MEDIUM
- **Difficulty:** LOW
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** MEDIUM
- **Dependencies:** PocketRisu 현행 동작 재현, LLM translation-cache key 계약, non-cache translator 동작 결정
- **Priority / Status:** **P1 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

번역된 화면을 보고 partial edit할 때 보이는 translation과 실제 수정되는 original message의 ownership이 어긋날 수 있는 correctness 후보. upstream은 controller에 `original | translation` target과 translation context를 명시하는 방향의 evidence를 제공했다.

**PocketRisu safe slice 후보**

- translation cache identity가 확실할 때만 translated partial edit 허용.
- original message 수정과 translation-cache 수정 경로를 명시적으로 분리.
- async translation/cache context는 stale-request guard 적용.
- cache miss, 번역 toggle, 빠른 chat 전환은 fail-closed.
- 기존 original active-swipe/partial-edit 동작 parity 보존.

---

## `EXT-SANITIZER-CSS-BOUNDARY` — sanitizer-scoped CSS transformation invariant

- **Primary source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `796adfc4508d407529115b5504091ef6e163e0c7`
- **Additional evidence:** RisuAI `5cc5bc05` (short SHA)
- **Importance:** HIGH
- **Difficulty:** MEDIUM
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** PocketRisu sanitizer audit, malicious-CSS regression corpus, parsed/allowlisted CSS boundary
- **Priority / Status:** **P1 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

핵심은 색상 변환 기능 자체가 아니라 CSS transformation ownership이다. inline style 변환을 sanitizer attribute hook 내부에 두어 `sanitize 후 raw HTML/CSS 재삽입 금지` 원칙을 강화한다. 전체 `<style>` 문자열을 regex로 일반 변환하는 방식은 위험 evidence로 취급한다.

**PocketRisu invariant 후보**

- inline style transform은 sanitizer hook 내부 allowlist에서만.
- style block transform이 필요하면 AST/parser 기반.
- URL-bearing value는 일반 color/string transform에서 제외.
- feature-off exact parity.
- malicious CSS corpus regression 필수.
- rollback은 feature gate off로 가능해야 한다.

---

## `EXT-PLUGIN-STORAGE-INSPECTOR` — lazy per-key plugin storage inspector, read-only first

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `63ff152385fb5fb8c6b339e977c4a3a0d5ed3f1b`
- **Importance:** MEDIUM
- **Difficulty:** LOW
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** MEDIUM
- **Dependencies:** stable per-key `pluginCustomStorage` API, privileged access, redaction policy, bounded preview size
- **Priority / Status:** **P1 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

키 목록만 먼저 가져오고 사용자가 선택한 value만 lazy-load하여 큰 plugin storage 전체를 브라우저에 hydrate하지 않고 진단하는 패턴. upstream의 create/rename/copy/delete/clear mutation UI는 위험 evidence로 보고 첫 slice에서 제외한다.

**PocketRisu safe slice 후보**

- read-only key metadata + selected-value lazy preview만.
- mutation operation 0개.
- stale selection response 차단.
- preview byte cap 및 secret/redaction 정책.
- panel close/change 시 retained value 해제.

---

## `EXT-HYPA-QUERY-CACHE` — scoped Hypa query embedding cache + in-flight coalescing

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commits:** `59c4eb7a8881e335d12fc49c627436dd689301bc`, `3a192633716f42ffa5a557de08ad99189568b668`
- **Importance:** MEDIUM
- **Difficulty:** LOW
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** authenticated Node Hypa boundary, scope/provider/credential identity, server-phone measurement
- **Priority / Status:** **P1 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

반복·동시 Hypa retrieval query가 동일 embedding 요청을 공유해 provider 호출/지연/RAM을 줄이는 패턴. 후속 evidence는 in-flight coalescing과 cache-clear epoch를 추가해 clear 직전 요청이 나중에 stale cache를 되살리는 race를 막는다.

**PocketRisu invariant 후보**

- key 최소 구성: `scope + provider/model + credential fingerprint + query text`.
- hard entry/byte bounds.
- clear epoch로 stale completion resurrection 방지.
- shared request 실패 fan-out semantics 명시.
- cache-disabled parity.
- 사용자/provider/credential 간 derived data reuse 금지.

---

# 5. P2

## `EXT-HYPA-NODE-ORCHESTRATION` — Node-owned Hypa memory orchestration

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `1d4b0c5c783b3f4ef5738c21a17192c07a6f3cbb`
- **Importance:** HIGH
- **Difficulty:** HIGH
- **Size:** L
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** capability negotiation, session/security review, PocketRisu long-chat benchmark, provider compatibility, server-phone resource budget
- **Priority / Status:** **P2 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

Hypa summary, token budget, memory selection, embedding/vector ranking을 Node 쪽으로 옮겨 브라우저의 초장기 chat CPU/RAM 부담을 낮추는 방향. 인증 session isolation, cancellation/failure parity, credential boundary, 서버폰 부하 때문에 범용 실행기 형태의 직접 포팅은 금지한다.

**첫 설계 slice 후보**

- capability handshake.
- 한정된 pure planning/vector operation만 Node에 위임.
- credential/session ownership은 기존 security boundary 유지.
- cancel/error semantics가 browser path와 동일해야 함.
- long-chat browser/server-phone CPU/RAM/latency 비교 benchmark 후 확대.

---

## `EXT-VECTOR-INDEX-DERIVED-CACHE` — persistent derived vector-index cache

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commits:** `d23a24a6ec747dcf21f671a095da9dedd60c3356`, `3a192633716f42ffa5a557de08ad99189568b668`
- **Importance:** MEDIUM
- **Difficulty:** MEDIUM
- **Size:** M
- **Evidence:** MEDIUM
- **Risk:** MEDIUM
- **Dependencies:** PocketRisu Node vector path, revision/signature identity, cache location/backup policy, disk/rebuild measurements
- **Priority / Status:** **P2 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

Node 재시작 뒤 unchanged embedding/vector index를 매번 재생성하지 않고 재사용하는 derived cache 패턴. evidence에는 atomic temp-write → rename, lazy restore, revision/signature 검증, private permissions, hashed filename, bounded disk LRU와 orderly shutdown pending-write flush가 포함된다.

**PocketRisu invariant 후보**

- cache는 authoritative storage가 아니다. 삭제하면 성능만 떨어져야 한다.
- corruption/truncation은 rebuild로 회복.
- revision/signature mismatch는 restore 금지.
- disk cap/LRU pruning.
- write 도중 restart와 orderly `SIGINT/SIGTERM` pending snapshot flush 테스트.
- backup 대상에 derived cache를 포함할지 기본값을 명시한다.

---

## `EXT-STORAGE-EXPLORER` — read-only storage explorer

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `c19d5bfb5c91ca2a9fed8c1f08475d726ac70e42`
- **Importance:** LOW
- **Difficulty:** LOW
- **Size:** S
- **Evidence:** MEDIUM
- **Risk:** MEDIUM
- **Dependencies:** admin/auth boundary, sensitive-value policy, strict read-only contract
- **Priority / Status:** **P2 / HOLD**
- **System Update:** NO_SYSTEM_UPDATE

WASM/OPFS SQLite를 settings에서 pagination/search/sort로 탐색하는 diagnostics 패턴. migration/corruption/cache debugging에는 유용하지만 chat/plugin DB의 민감한 내용을 노출할 수 있다.

**Hold 조건**

- 일반 settings 기능이 아니라 privileged/admin diagnostics로만 고려.
- 첫 버전은 strict read-only.
- sensitive value redaction/preview cap 필요.
- write/delete/editor 기능은 별도 backup/undo/ownership 설계 없이는 금지.

---

## `EXT-TRAILING-USER-REROLL` — trailing-user reroll

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `ddd77bfe` (short SHA; full SHA 재검증 필요)
- **Importance:** LOW
- **Difficulty:** LOW
- **Size:** XS
- **Evidence:** MEDIUM
- **Risk:** LOW
- **Dependencies:** in-chat branch/timeline ownership
- **Priority / Status:** **P2 / HOLD**
- **System Update:** NO_SYSTEM_UPDATE

Haejeok의 새 timeline model에 강하게 묶인 reroll UX. 현재 PocketRisu에 standalone 기능으로 가져올 이유가 부족하므로 branch/timeline architecture가 결정될 때 다시 평가한다.

---

# 6. P3

## `EXT-INCHAT-BRANCH-TIMELINE` — branch/reroll을 별도 chat 복제 대신 한 chat 내부 timeline으로 소유

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commits:** `798f27d0`, `76062ad1` (short SHA; full SHA 재검증 필요)
- **Importance:** MEDIUM
- **Difficulty:** HIGH
- **Size:** L
- **Evidence:** MEDIUM
- **Risk:** HIGH
- **Dependencies:** message-store ownership, long-chat paging, backup/export, bookmark/search/plugin compatibility
- **Priority / Status:** **P3 / DESIGN_NEEDED**
- **System Update:** NO_SYSTEM_UPDATE

branch/reroll마다 별도 chat session을 복제하는 대신 한 chat 내부 timeline/branch graph로 소유하고 active timeline만 기존 `chat.message` 호환 경로에 노출하는 구조. persistence, generation race, backup semantics, plugin compatibility까지 건드리므로 직접 포팅 금지.

**설계 순서 후보**

- pure timeline data model부터 정의.
- active/inactive suffix ownership과 message identity 규칙.
- inactive branch가 실제 retained-memory를 줄이는지 측정.
- paging/bookmark/search/export/plugin consumer compatibility matrix.
- generation 중 branch 전환 race와 rollback 설계.

### Dependent evidence: linear-run graph collapse

- **Evidence commits:** `9af3c809`, `f182716aad9f616cc132119a951683cfc8bc654c`
- **Classification:** **P3 / DESIGN_NEEDED / MERGED_EVIDENCE**

메시지마다 graph node를 보여주지 않고 분기점은 유지하면서 긴 linear run을 `#12–#40` 같은 summary node로 collapse하는 UI/graph pattern. 독립 포팅 항목이 아니라 `EXT-INCHAT-BRANCH-TIMELINE`의 graph visualization 후속 설계로 합친다.

---

# 7. 제외 / 중복 / 이미 존재

## `EXCLUDED-DARK-ENUM-CHECK`

- **Source:** `nevaeh5379/HaejeokRisuai`
- **Evidence commit:** `04d61ca14434561e420a86ca98fe2ee21c7b0584`
- mobilechat UI 개편과 함께 `prose-invert` dark enum check를 정확한 `=== 'dark'` 비교로 고친 evidence.
- 조사 당시 official PocketRisu `develop`에 이미 같은 정확한 fix가 존재하는 것으로 확인되어 신규 포팅 후보를 만들지 않았다.
- **Status:** EXCLUDED_ALREADY_PRESENT

---

# 8. Source tracking — 복구된 마지막 상태

이 값들은 대화에 남은 마지막 조사 결과를 복구한 것이며 다음 scan 시작 시 원격 HEAD와 다시 대조한다.

| Source | 역할 | 복구된 마지막 cursor / 상태 |
| --- | --- | --- |
| `nevaeh5379/HaejeokRisuai:main` | Active evidence source | 마지막 확인 HEAD `f182716aad9f616cc132119a951683cfc8bc654c` |
| `kwaroran/Risuai:main` | Active evidence source | 마지막 확인 HEAD `e565563a288ebe4c65b6099a1645ba477d1c84b4` |
| `ChatPoongKun/RisuMaou:main` | Discovery-only | 마지막 확인 `16e91456…`, commit date 2026-02-06로 기록되어 hourly Active 승격 보류 |

다른 Active source가 당시 cursor와 동일했다는 보고는 여러 차례 있었지만, 현재 복구 가능한 대화 기록에서 source 이름/cursor 전체를 완전하게 재구성하지 못했으므로 여기서 임의로 만들지 않는다. 다음 discovery/forward scan에서 다시 등록한다.

---

# 9. Historical backfill 상태

`HISTORICAL_BACKFILL_COMPLETE_THROUGH`: **NOT DECLARED**

2026-08-26까지의 조사에서 모든 tracked source의 과거 history가 완전히 검증되었다는 근거가 부족했기 때문에 milestone을 선언하지 않았다. forward traffic이 있는 pass에서는 최신 변경을 우선했다.

다음부터는 forward scan과 별도로 시간이 허용될 때 historical-only source/history를 채우고, 모든 active/historical source에 대해 특정 날짜 이전 history가 검증된 경우에만 milestone을 갱신한다.

---

# 10. 운영 규칙 — 앞으로 자동으로 수행할 것

1. 외부 source의 새 commit을 확인한다.
2. PocketRisu 현재 코드에 이미 존재하는지 먼저 확인한다.
3. 같은 아이디어/같은 ownership 문제면 새 항목을 만들지 않고 기존 항목에 evidence를 합친다.
4. `Importance / Difficulty / Size / Evidence / Risk / Dependencies`를 재평가한다.
5. `P0~P3` 및 `READY_TO_PORT / DESIGN_NEEDED / HOLD`를 갱신한다.
6. 고위험 항목은 실제 구현 전에 acceptance/rollback/security boundary까지 설계한다.
7. 일정량이 쌓이면 수집만 계속하지 않고 다음 3~5개 PR/설계 후보로 자동 압축한다.
8. PocketRisu에 이미 반영되면 `EXCLUDED_ALREADY_PRESENT` 또는 구현 이력으로 이동한다.
9. 이 파일 write가 성공한 뒤에만 사용자에게 `저장 완료`라고 보고한다.
10. 시스템 변경이 필요한 후보가 생기면 앱 코드 후보와 분리하여 `SYSTEM_UPDATE_REQUIRED`로 명시한다.

---

# 11. 복구 누락 방지 메모

이 파일의 최초 버전은 2026-08-26까지 대화에 명시적으로 남은 외부 Risu 조사 결과를 복구한 것이다. 과거 답변에서 `registry`, `durable backlog`, `design draft`, `addendum`에 저장했다고 잘못 보고된 내용 중 실제 파일 위치가 확인되지 않은 것은 이 원장에 재수록했다.

앞으로 별도 임시 design 문서를 만들더라도 **이 파일이 인덱스/원장 역할**을 하며, 새 문서의 path/상태를 여기에서 추적한다.
