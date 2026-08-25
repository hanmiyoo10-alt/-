# Local Usage Dashboard — 아이디어 리스트

Status: **CANONICAL IDEA WAREHOUSE — NOT RELEASE AUTHORITY**

Tracking issue: #412

이 문서는 Local Usage Dashboard 관련 아이디어를 장기 보관하고 분류하기 위한 저장소다.

이 문서의 순서는 **다음 버전 순서가 아니다.** 실제 구현 순서는 현재 production/source 확인, 안정화 게이트, 회귀 테스트, 실기 증거, release authority를 통해 별도로 결정한다.

현재의 post-stabilization feature gate도 그대로 유지한다. #343과 #348의 기능 확장은 안정화가 명시적으로 완료되기 전에는 구현하지 않는다.

---

## 1. 분류 규칙

### A. 버전 업데이트 없이 적용 가능

다음 조건을 모두 만족하는 작업:

- shipped Plugin / Engine / Manager product bytes를 바꾸지 않음;
- 사용자에게 보이는 runtime/UI/data semantics를 바꾸지 않음;
- repository-only 문서, 조사, audit, measurement, release-process/tooling 작업임.

예: source authority 조사, compatibility inventory, 실기 측정, 문서 정리, 제품 바이트를 건드리지 않는 release infrastructure 개선.

### B. 버전 업데이트를 해야 적용 가능

다음 중 하나라도 해당하면 이 분류로 이동한다:

- `latest.js` 또는 shipped Plugin source 결과가 바뀜;
- Engine / Manager runtime artifact가 바뀜;
- UI, 데이터 표시, source normalization, request identity/enrichment, scheduler/lifecycle 동작이 바뀜;
- behavior-preserving cleanup이라도 shipped runtime bytes가 바뀜.

분류가 애매하면 **버전 업데이트 필요**로 보수적으로 분류하고, exact artifact impact가 증명된 뒤에만 무버전 작업으로 낮춘다.

---

## 2. 중요도 / 난이도

### 중요도

- **최상** — product truth, 안정성, 핵심 UX 또는 장기 유지보수 비용에 직접 영향
- **높음** — 체감 가치 또는 유지보수 가치가 큼
- **중간** — 유용하지만 현재 핵심 흐름을 막지는 않음
- **낮음** — polish 또는 장기 선택사항

### 난이도

- **낮음** — source/owner가 이미 명확하고 범위가 좁음
- **중간** — 여러 source/module 또는 제한적 실기 검증이 필요
- **높음** — cross-runtime/source semantics, privacy/identity, 장기 lifecycle 검증이 필요
- **매우 높음** — 인증된 transactional write, 결제/환불/자동충전, idempotency/rollback까지 요구

### 배열 규칙

1. 큰 분류는 `버전 업데이트 없이 적용 가능` / `버전 업데이트 필요`로 나눈다.
2. 각 분류 내부는 **난이도 낮음 → 중간 → 높음 → 매우 높음** 순서다.
3. 같은 난이도에서는 **중요도가 높은 아이디어를 먼저** 둔다.
4. 새 아이디어를 추가할 때 기존 ID는 유지하고 위치만 재정렬한다.

### 설계 → 구현 배치 규칙

표시 순서는 난이도 중심이지만, 실제 실행은 **같은 중요도 안의 같은 난이도 그룹**을 하나의 배치 단위로 본다.

1. 같은 중요도 + 같은 난이도에 속한 아이디어를 먼저 모두 개별 설계한다.
2. 각 아이디어가 source authority, UNKNOWN/privacy/identity 규칙, non-goal, regression, physical acceptance까지 갖춘 `DESIGN READY` 상태가 될 때까지 구현하지 않는다.
3. 해당 중요도/난이도 그룹의 대상 아이디어가 모두 `DESIGN READY`가 되면 그룹 전체를 한 번에 **IMPLEMENTATION BATCH READY**로 승격한다.
4. 이후에는 사용자에게 항목마다 다시 승인을 요구하지 않고, ChatGPT가 배치 안의 구현을 연속 진행한다. 실제 기기에서만 확인 가능한 physical acceptance 시점에만 사용자를 호출한다.
5. `한 번에 구현`은 **한 제품 버전에 무조건 합친다**는 뜻이 아니다. 서로 강하게 묶이고 regression/rollback 경계가 안전하면 하나의 bounded release로 묶을 수 있고, 그렇지 않으면 같은 implementation batch 안에서 여러 monotonic release로 연속 처리한다.
6. 기존 원칙 `one release = one primary goal`, full regression, PR/CI, exact production materialization, monotonic deployment, physical acceptance는 그대로 유지한다.
7. 한 항목이 prerequisite/evidence 미충족으로 막히면 그 항목은 fail-closed로 남긴다. 안전하게 독립적인 나머지 항목까지 불필요하게 막지는 않되, prerequisite 관계가 있는 후속 항목은 진행하지 않는다.

즉 실행 모델은 **아이디어 분류 → 같은 중요도/난이도 그룹 전체 설계 → IMPLEMENTATION BATCH READY → 안전한 release 단위로 연속 구현**이다.

---

# 3. 버전 업데이트 없이 적용 가능

## 난이도: 낮음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `NV-SOURCE-MATRIX` | Feature Source / Truth Matrix | 높음 | #343, #348 기반 | 계획된 기능마다 authoritative source field, UNKNOWN 규칙, privacy 금지선, 추가 네트워크 필요 여부를 한 표로 관리한다. 실제 구현 전 source truth 확인 비용을 줄인다. |
| `NV-REPO-HISTORY` | 과거 patch/release helper 분류 및 archive 후보표 | 중간 | Runtime Slimming Backlog §6 | 오래된 patch script / release helper를 `KEEP / ARCHIVE / RETIRE CANDIDATE`로 분류한다. 삭제 자체는 별도 evidence 후 진행한다. |

## 난이도: 중간

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `NV-FUNDING-AUTH` | DevPass funding-source provenance 조사 | 높음 | #348 candidate 8 | DevPass 요청이 plan allowance인지 PAYG overflow credits인지 explicit upstream billing evidence로 구분 가능한지 조사한다. model/cost/tier/account-scope 추론 금지. 조사 결과만 기록하며 product bytes는 변경하지 않는다. |
| `NV-FALLBACK-INVENTORY` | Runtime compatibility / fallback path inventory | 높음 | Runtime Slimming Backlog §1 | Plugin/Engine/Manager의 legacy/fallback branch를 owner, trigger, regression, recent real-device evidence, replacement path, removal confidence로 분류한다. |
| `NV-PARSER-INVENTORY` | Parser / normalizer duplication inventory | 높음 | Runtime Slimming Backlog §2 | recent request, cache, service tier, duration/provenance, organization/usage, diagnostics formatting 중복을 조사한다. cleanup은 하지 않고 후보만 증거화한다. |
| `NV-RELEASE-PR-BOOTSTRAP` | Release PR bootstrap / trusted PR event 단순화 | 높음 | #254 | product bytes를 건드리지 않고 E6 PR bootstrap 403 및 trusted validation event friction을 줄이는 release-infra 개선. exact candidate / full CI / monotonic promotion은 보존한다. |
| `NV-STATE-LIFECYCLE` | Retained state / memory lifecycle inventory | 높음 | Runtime Slimming Backlog §3 | long-lived Map/Set, in-flight Promise, Request Ledger, render cache, secondary queue, diagnostics history, large response closure retention을 계측/분류한다. |
| `NV-CLI-FOOTPRINT` | Managed CLI 실제 설치 용량 측정 | 중간 | Runtime Slimming Backlog §7 | PocketRisu/Android에서 managed `@llmgateway/cli`와 dependency footprint를 실제 측정한다. package 이름만 보고 추정하지 않는다. 실기 측정이 필요한 항목. |
| `NV-LOCAL-COST-MAP` | Local CPU/render/persist 비용 측정표 갱신 | 중간 | Runtime Slimming Backlog §5 | ledger normalize, sort/filter, diagnostics construction, render, DOM/style dedup, JSON persistence 비용을 실기 diagnostics에서 지속 기록한다. 측정 전 최적화 금지. |

## 난이도: 높음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `NV-LIFECYCLE-STRESS` | 반복 init/resume/panel lifecycle 누적 stress audit | 높음 | Runtime Slimming Backlog §4 | 반복 초기화, visibility/resume, panel open/close, runtime adoption에서 timer/listener/scheduled work가 누적되지 않는지 장시간 실기 + regression으로 검증한다. cleanup은 별도 버전 작업으로 분리한다. |
| `NV-TRANSACTION-AUTH` | 결제/Reset Pass/Auto-Reload write API 안전성 조사 | 높음 | #348 lower-priority candidates | top-up, Reset Pass purchase/redeem/refund, auto-reload mutation의 upstream API authority, 인증 범위, idempotency, retry/rollback, duplicate-write 방지 조건을 구현 전에 문서화한다. |
| `NV-BILLING-HISTORY-AUTH` | Billing history / invoice source authority 조사 | 중간 | #348 lower-priority candidates | invoice/billing-history를 안전하게 read-only로 가져올 authoritative authenticated source가 있는지, privacy surface가 무엇인지 조사한다. source가 없으면 UNKNOWN/미지원으로 남긴다. |

---

# 4. 버전 업데이트를 해야 적용 가능

> 기능 확장 항목은 현재 stabilization gate가 닫힐 때까지 구현하지 않는다. 안정화 cleanup 항목은 evidence-led S1 순서에서만 진행한다.

## 난이도: 낮음

| ID | 아이디어 | 중요도 | 트랙 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-SERVICE-TIER-PRESENTATION-OWNER` | Service-tier presentation wrapper ownership 정리 | 높음 | Stabilization follow-up · #393 | module 15에 남겨둔 `requestServiceTierText` provenance presentation wrapper를 native owner로 이동하는 작은 cleanup 후보. 현재 표시 semantics는 그대로 유지. |
| `V-RESET-STATUS` | Reset Pass read-only 상태 카드 | 높음 | Post-stabilization · #348 | included/purchased pass, included remaining, pass price, source-backed eligibility를 읽기 전용으로 표시한다. buy/redeem write는 포함하지 않는다. |
| `V-BILLING-STRIP` | Billing-cycle / renewal strip | 높음 | Post-stabilization · #348 | plan, cycle start, authoritative period end/expiry, renewal/cancellation wording, 남은 시간을 표시한다. authoritative end가 없으면 날짜를 만들지 않는다. |

## 난이도: 중간

| ID | 아이디어 | 중요도 | 트랙 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-HTTP-STATUS` | 요청별 exact HTTP error status | 높음 | Post-stabilization · #343 | 실패 요청에서 source-backed `errorDetails.statusCode`만 `HTTP 429/401/503`처럼 표시한다. route-attempt status를 final status로 쓰지 않고 성공 요청에 200을 추정하지 않는다. |
| `V-SERVICE-TIER-FIDELITY` | Request Service Tier fidelity 확대 | 높음 | Post-stabilization · #343 | requested/served FLEX/STANDARD/PRIORITY와 selection source를 source가 제공할 때만 표시한다. missing `usedServiceTier`는 UNKNOWN. |
| `V-PREMIUM-METER` | DevPass weekly Premium allowance meter | 높음 | Post-stabilization · #348 | weekly Premium used/limit/percent, reset timing, >80% warning, exhausted state, source-proven PAYG-cover state를 표시한다. |
| `V-PAYG-STATUS` | PAYG Overflow + Auto-Reload read-only status | 높음 | Post-stabilization · #348 | overflow on/off, regular credits, spendable balance, auto-reload enabled/threshold/amount를 source가 제공하는 범위에서 읽기 전용으로 표시한다. |
| `V-CYCLE-SUMMARY` | This-cycle summary cards | 중간 | Post-stabilization · #348 | total requests, total tokens, cached share, peak day를 표시한다. authoritative billing-cycle start가 없으면 실제 7d/30d window로 명시한다. |
| `V-COST-DRIVER` | Compact cost-driver view | 중간 | Post-stabilization · #348 | 모델/provider별 cost/request count 상위 항목을 compact bar/donut/summary로 보여준다. 기존 표와 중복되는 UI는 피한다. |
| `V-CREDITS-COST` | Credits cost composition + savings | 중간 | Post-stabilization · #348 | input/output/cached/storage/other cost와 discount savings를 source가 실제 제공하는 항목만 표시한다. 미제공 cost는 0으로 만들지 않는다. |

## 난이도: 높음

| ID | 아이디어 | 중요도 | 트랙 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-MODEL-CATEGORY` | Catalog-proven Premium / Regular model category | 높음 | Post-stabilization · #343 | 실제 served model을 현재 version-pinned LLMGateway catalog로 확인한 경우만 Premium/Regular로 분류한다. catalog 미확인/미등록 모델은 UNKNOWN, 이름/비용/provider 추론 금지. |
| `V-FUNDING-PROVENANCE` | DevPass plan vs PAYG funding-source 표시 | 높음 | Post-stabilization · #348 + `NV-FUNDING-AUTH` 선행 | 조사에서 explicit upstream billing authority가 증명된 경우에만 request row에 실제 funding source를 표시한다. account scope/service tier/model category와 별도 축으로 유지. |
| `V-RUNTIME-FALLBACK-PRUNE` | Evidence-led legacy/fallback pruning | 높음 | Stabilization/slimming · Runtime Slimming Backlog | `NV-FALLBACK-INVENTORY`에서 SAFE REMOVAL CANDIDATE로 증명된 runtime branch만 작은 release 단위로 제거한다. working fallback을 happy-path 이유만으로 삭제하지 않는다. |
| `V-PARSER-CONSOLIDATION` | Evidence-led parser/normalizer consolidation | 높음 | Stabilization/slimming · Runtime Slimming Backlog | `NV-PARSER-INVENTORY` 결과를 바탕으로 한 owner씩 중복 normalization을 합친다. UNKNOWN/source fidelity/dedupe identity를 보존한다. |
| `V-LIFECYCLE-CLEANUP` | Timer/listener/retained-state cleanup | 높음 | Stabilization/slimming · `NV-LIFECYCLE-STRESS` 선행 | 실기/회귀에서 실제 누적 또는 불필요 work가 측정된 항목만 제거/통합한다. measured bottleneck이 아닌 코드는 최적화하지 않는다. |
| `V-BILLING-HISTORY` | Billing history / invoice read-only view | 중간 | Post-stabilization · #348 + `NV-BILLING-HISTORY-AUTH` 선행 | 안전한 authenticated source가 증명될 경우에만 invoice/history를 read-only로 추가한다. privacy surface와 retention을 최소화한다. |

## 난이도: 매우 높음

| ID | 아이디어 | 중요도 | 트랙 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-TOPUP-WRITE` | Credits top-up controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | 실제 결제 write. idempotency, duplicate charge 방지, 실패/재시도/receipt 검증이 먼저 증명되어야 한다. |
| `V-RESET-WRITE` | Reset Pass purchase / redeem / refund controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | 포함 pass 우선 사용, tier-bound purchase, monthly allowance eligibility, refund/transaction consistency까지 다뤄야 하는 고위험 write surface. |
| `V-AUTORELOAD-WRITE` | Auto-Reload mutation controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | threshold/amount/enable-disable mutation. 결제 실패 backoff, prolonged failure disable, PAYG coupling을 source contract대로 보장해야 한다. |

---

# 5. 묶음 설계 관계

아이디어 리스트에서는 평가를 위해 세부 항목을 나눠 두지만, 실제 release 설계에서는 서로 강하게 묶인 항목을 다시 하나의 bounded release로 합칠 수 있다.

### Request Metadata Fidelity — #343

현재 보존된 하나의 feature design 안에 다음 세 축이 있다:

- `V-SERVICE-TIER-FIDELITY`
- `V-MODEL-CATEGORY`
- `V-HTTP-STATUS`

이들은 서로 다른 truth axis이며 절대 혼동하지 않는다:

- Premium model category ≠ PRIORITY service tier
- HTTP final error code ≠ route/provider attempt status
- missing source data ≠ STANDARD / Regular / HTTP 200

### DevPass Account Surface — #348

read-only 우선 후보:

- `V-PREMIUM-METER`
- `V-RESET-STATUS`
- `V-PAYG-STATUS`
- `V-BILLING-STRIP`

실제 release로 묶을지는 구현 직전 fresh source coverage와 regression scope를 보고 결정한다.

---

# 6. 아이디어 승격 규칙

아이디어가 실제 다음 버전 후보가 되려면 최소한 다음을 거친다:

1. current production/source fresh check;
2. source authority 확인;
3. UNKNOWN / privacy / identity 규칙 확정;
4. 변경 범위와 non-goal 명시;
5. 관련 regression 설계;
6. 현재 stabilization/feature gate와 충돌하지 않는지 확인;
7. 별도 issue에 **DESIGN ONLY** 상태로 구체화;
8. 같은 중요도 + 같은 난이도 그룹의 대상 아이디어가 모두 `DESIGN READY`인지 확인;
9. 그룹 전체를 **IMPLEMENTATION BATCH READY**로 승격;
10. 이후 사용자의 추가 항목별 승인 없이 안전한 release 단위로 연속 구현하고, 실기 확인이 필요한 시점에만 사용자를 호출한다.

즉 **아이디어 → 개별 설계 → 그룹 DESIGN READY → IMPLEMENTATION BATCH READY → 안전한 단위의 연속 구현**은 서로 다른 상태다.

---

# 7. 현재 authority 링크

- Request Metadata Fidelity design: #343
- DevPass/Credits parity backlog: #348
- Release PR bootstrap follow-up: #254
- Runtime Slimming & Legacy Pruning: `docs/USAGE_DASHBOARD_RUNTIME_SLIMMING_BACKLOG.md`
- Idea-list tracking: #412

이 문서가 기존 issue의 세부 source evidence를 대체하지 않는다. 기존 issue/design이 더 구체적인 경우 그 issue가 해당 아이디어의 상세 authority다.