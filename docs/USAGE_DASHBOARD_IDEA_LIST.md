# Local Usage Dashboard — 아이디어 리스트

Status: **CANONICAL IDEA WAREHOUSE — NOT RELEASE AUTHORITY**

Tracking issue: #412

이 문서는 Local Usage Dashboard 관련 아이디어를 장기 보관하고 분류하기 위한 저장소다.

이 문서의 순서는 **다음 버전 순서가 아니다.** 실제 구현 순서는 현재 production/source 확인, 활성 release/stabilization gate, 회귀 테스트, 실기 증거, release authority를 통해 별도로 결정한다.

현재 checkpoint에서 S1 stabilization-to-feature gate는 **5.81 physical PASS 후 CLOSED**다. 현재 배포 baseline은 Product `3.0.0-alpha.5.82` / Engine `1.6.23` / Manager `1.3.0` / snapshot·recent-request `1/1`이며, 이 문서는 그 상태를 반영해 warehouse의 stale 항목을 정리한다. 이 checkpoint 자체가 다음 release를 자동 승인하지는 않는다.

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
| `NV-SOURCE-MATRIX` | Feature Source / Truth Matrix | 높음 | **IMPLEMENTED** · #414 · `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md` | 계획된 기능마다 authoritative source field, UNKNOWN 규칙, privacy 금지선, 추가 네트워크 필요 여부를 한 표로 관리한다. 실제 구현 전 source truth 확인 비용을 줄인다. |
| `NV-REPO-HISTORY` | 과거 patch/release helper 분류 및 archive 후보표 | 중간 | **IMPLEMENTED** · #415 · `docs/USAGE_DASHBOARD_REPO_HISTORY_INVENTORY.md` | 오래된 patch script / release helper를 `KEEP / ARCHIVE / RETIRE CANDIDATE`로 분류한다. 삭제 자체는 별도 evidence 후 진행한다. |

## 난이도: 중간

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `NV-FUNDING-AUTH` | DevPass funding-source provenance 조사 | 높음 | **IMPLEMENTED — NOT_PROVEN** · #416 · `docs/USAGE_DASHBOARD_FUNDING_AUTHORITY_INVESTIGATION.md` | current pinned evidence에서 request별 plan allowance vs PAYG authority가 증명되지 않았다. funding은 UNKNOWN 유지, `V-FUNDING-PROVENANCE`는 BLOCKED. |
| `NV-FALLBACK-INVENTORY` | Runtime compatibility / fallback path inventory | 높음 | **IMPLEMENTED** · #417 · `docs/USAGE_DASHBOARD_RUNTIME_FALLBACK_INVENTORY.md` | Plugin/Engine/Manager fallback을 계약 단위로 분류했다. 현재 SAFE REMOVAL CANDIDATE는 0개이며 후속 prune은 fresh SAFE evidence만 소비한다. |
| `NV-PARSER-INVENTORY` | Parser / normalizer duplication inventory | 높음 | **IMPLEMENTED** · #418 · `docs/USAGE_DASHBOARD_PARSER_NORMALIZER_INVENTORY.md` | cross-layer trust/privacy/identity 방어를 intentional layering으로 분리했다. 현재 즉시 SAFE consolidation 후보는 0개, org/status cluster는 MEASURE_MORE. |
| `NV-RELEASE-PR-BOOTSTRAP` | Release PR bootstrap / trusted PR event 단순화 | 높음 | **IMPLEMENTED / RESOLVED_BY_E7_E13** · #254 · `docs/USAGE_DASHBOARD_PR_BOOTSTRAP_CURRENT_CONTRACT.md` | E6-era 403/close-reopen friction은 E7/E13과 5.80 실릴리즈로 해소됨을 확정하고 current deterministic PR handoff를 canonical contract로 고정했다. |
| `NV-STATE-LIFECYCLE` | Retained state / memory lifecycle inventory | 높음 | **IMPLEMENTED** · #419 · `docs/USAGE_DASHBOARD_STATE_LIFECYCLE_INVENTORY.md` | retained state의 owner/bound/release를 분류했다. SAFE cleanup 0개, 반복 init/resume/panel 누적 증거는 `NV-LIFECYCLE-STRESS`로 넘긴다. |
| `NV-CLI-FOOTPRINT` | Managed CLI 실제 설치 용량 측정 | 중간 | Runtime Slimming Backlog §7 | PocketRisu/Android에서 managed `@llmgateway/cli`와 dependency footprint를 실제 측정한다. package 이름만 보고 추정하지 않는다. 실기 측정이 필요한 항목. |
| `NV-LOCAL-COST-MAP` | Local CPU/render/persist 비용 측정표 갱신 | 중간 | Runtime Slimming Backlog §5 | ledger normalize, sort/filter, diagnostics construction, render, DOM/style dedup, JSON persistence 비용을 실기 diagnostics에서 지속 기록한다. 측정 전 최적화 금지. |

## 난이도: 높음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `NV-LIFECYCLE-STRESS` | 반복 init/resume/panel lifecycle 누적 stress audit | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #558 | 반복 초기화, visibility/resume, panel open/close, runtime adoption에서 timer/listener/scheduled work가 누적되지 않는지 장시간 실기 + regression으로 검증한다. cleanup은 별도 버전 작업으로 분리한다. |
| `NV-TRANSACTION-AUTH` | 결제/Reset Pass/Auto-Reload write API 안전성 조사 | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #559 | top-up, Reset Pass purchase/redeem/refund, auto-reload mutation의 upstream API authority, 인증 범위, idempotency, retry/rollback, duplicate-write 방지 조건을 조사한다. 조사 자체는 live 금전/account mutation을 하지 않는다. |
| `NV-MEMORY-INTEGRITY-QUALITY` | Long-term Memory Integrity / Coverage / Quality Audit | 높음 | **CAPTURED / CONSOLIDATED** · #653 · `docs/USAGE_DASHBOARD_LONG_TERM_MEMORY_IDEA_FAMILY.md` | 장기기억 duplicate/orphan/reference/chronology, retrieval regression, long-chat continuity, quality/self-audit를 repository/test evidence로 검증한다. 발견된 runtime 수리는 별도 versioned memory owner로 분리한다. |
| `NV-BILLING-HISTORY-AUTH` | Billing history / invoice source authority 조사 | 중간 | #348 lower-priority candidates | invoice/billing-history를 안전하게 read-only로 가져올 authoritative authenticated source가 있는지, privacy surface가 무엇인지 조사한다. source가 없으면 UNKNOWN/미지원으로 남긴다. |

---

# 4. 버전 업데이트를 해야 적용 가능

> S1 stabilization-to-feature gate는 5.81 physical PASS 후 **CLOSED**다. 기능 확장 항목은 이제 fresh production/source, source authority, batch 상태, regression/PR/CI/release gate를 만족하면 진행할 수 있다. 이 warehouse의 상태만으로 구현 권한이 생기지는 않는다.

## 난이도: 낮음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-SERVICE-TIER-PRESENTATION-OWNER` | Service-tier presentation wrapper ownership 정리 | 높음 | **IMPLEMENTED / PHYSICAL PASS 5.81** · #420 · P45 | module 12가 final scope+tier presentation을 직접 소유하도록 정리했고 module 15의 runtime reassignment hop을 제거했다. 표시 semantics는 유지됐다. |
| `V-RESET-STATUS` | Reset Pass read-only 상태 카드 | 높음 | **IMPLEMENTED / READ-ONLY PARITY SHIPPED** · P5 · #572 reconciliation | 현재 DevPass `Reset Pass · PAYG` surface가 총 사용 가능, 구매/보유 패스, 기본 패스 남음, 가격, PAYG/regular-credit read-only parity를 이미 제공한다. unproven eligibility와 buy/redeem/refund write는 별도다. |
| `V-BILLING-STRIP` | Billing-cycle / renewal strip | 높음 | **IMPLEMENTED / DEPLOYED 5.82** · #572 · P47 | plan/cycle/start/end/cancelled를 source-backed truth로 표시하고, 남은 기간은 explicit end에서만 계산한다. missing cycle/cancelled는 UNKNOWN으로 보존한다. |
| `V-RELEASE-NOTES-GUIDANCE` | In-plugin 업데이트 내역 + 진단 가이드 | 중간 | **DESIGN READY / IMPLEMENTATION READY** · #643 · `docs/USAGE_DASHBOARD_583_IN_PLUGIN_RELEASE_NOTES_DIAGNOSTIC_GUIDANCE_DESIGN.md` | Settings에서 현재 설치 release의 업데이트 하이라이트와 다음 진단 관찰 포인트, 정적 진단 제출 가이드 복사를 제공한다. runtime GitHub fetch/auto-popup/seen-state persistence는 추가하지 않는다. |

## 난이도: 중간

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-HTTP-STATUS` | 요청별 exact HTTP error status | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #575 | 실패 요청에서 source-backed `errorDetails.statusCode`만 `HTTP 429/401/503`처럼 표시한다. route-attempt status를 final status로 쓰지 않고 성공 요청에 200을 추정하지 않는다. |
| `V-SERVICE-TIER-FIDELITY` | Request Service Tier fidelity 확대 | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #577 | requested/served FLEX/STANDARD/PRIORITY와 selection source를 source가 제공할 때만 표시한다. missing `usedServiceTier`는 UNKNOWN. |
| `V-PREMIUM-METER` | DevPass weekly Premium allowance meter | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #581 | weekly Premium used/limit/remaining/percent, reset timing, >=80% warning, exhausted state를 source-backed 값으로 표시한다. allowance depletion + PAYG enabled를 request funding claim으로 연결하지 않는다. |
| `V-PAYG-STATUS` | PAYG Overflow + Auto-Reload read-only status | 높음 | **DESIGN READY · IMPLEMENTATION BATCH READY** · #585 | overflow on/off, regular credits, account-level spendability, auto-reload enabled/threshold/amount를 source가 제공하는 범위에서 읽기 전용으로 표시한다. request-level funding source는 추론하지 않는다. |
| `V-USAGE-PERIOD-COMPARISON` | Period-over-period usage / cost comparison | 높음 | **CAPTURED / NEEDS SOURCE AUTHORITY** · `docs/usage-dashboard-upstream-scans/2026-09-06.md` | 이전 기간/주/월/custom range와 현재 range를 같은 source-backed metric으로 비교한다. 비교 가능한 두 window source가 증명되지 않으면 UNKNOWN/미지원으로 남기고 missing bucket을 0으로 만들지 않는다. |
| `V-MEMORY-SESSION-CONTINUITY` | Session Checkpoint / Resume / Unresolved Threads | 높음 | Long-term Memory family · #653 | 중단 세션의 checkpoint/resume packet, unresolved thread, open question, bounded bootstrap context를 제공한다. canonical truth/retrieval owner를 대체하지 않는다. |
| `V-MEMORY-OBSERVABILITY` | Memory Search / Diff / Health / Retrieval Diagnostics | 높음 | Long-term Memory family · #653 | last-seen delta, diff/search UI, health capsule, retrieval diagnostics/trace를 제공한다. 관찰 결과만으로 memory truth를 자동 변경하지 않는다. |
| `V-CYCLE-SUMMARY` | This-cycle summary cards | 중간 | **DESIGN READY** · #587 | total requests, total tokens, cached input share, peak day를 표시한다. exact billing-cycle qualification이 안 되면 실제 30d/7d window로 fail-closed한다. |
| `V-COST-DRIVER` | Compact cost-driver view | 중간 | Post-stabilization · #348 | 모델/provider별 cost/request count 상위 항목을 compact bar/donut/summary로 보여준다. 기존 표와 중복되는 UI는 피한다. |
| `V-CREDITS-COST` | Credits cost composition + savings | 중간 | Post-stabilization · #348 | input/output/cached/storage/other cost와 discount savings를 source가 실제 제공하는 항목만 표시한다. 미제공 cost는 0으로 만들지 않는다. |

## 난이도: 높음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-MEMORY-CORE-TAXONOMY` | Layered Memory Core & Taxonomy | 최상 | Long-term Memory foundation · #653 | layered memory와 episodic/semantic/procedural/decision/entity/topic/timeline/dependency 분류를 소유한다. evidence/privacy/retention 정책은 별도 owner다. |
| `V-MEMORY-POLICY-SCOPE` | Preference / Constraint / Scope Memory | 최상 | Long-term Memory foundation · #653 | preference와 hard constraint를 분리하고 repo/plugin/feature/release/session scope isolation을 명시한다. 반복 선호를 자동 hard invariant로 승격하지 않는다. |
| `V-MEMORY-TRUTH-RECONCILIATION` | Provenance / UNKNOWN / Supersession / Conflict Reconciliation | 최상 | Long-term Memory foundation · #653 | provenance, assumption, UNKNOWN, evidence grade, stale/supersession/conflict를 authority ordering으로 reconcile한다. 최신 timestamp만으로 truth를 덮지 않는다. |
| `V-MEMORY-PRIVACY-TRUST` | Privacy / Trust / Persistence Boundaries | 최상 | Long-term Memory foundation · #653 | poisoning guard, quarantine, secret/PII 차단, privacy scope, local-only/repo-safe persistence를 소유한다. untrusted text는 canonical memory가 아니다. |
| `V-MEMORY-LIFECYCLE-COMPACTION` | Promotion / Compaction / Forgetting / History Lifecycle | 최상 | Long-term Memory foundation · #653 | duplicate merge, compaction, promotion/demotion, forgetting, pin, tombstone, revision history를 bounded lifecycle로 관리한다. |
| `V-MEMORY-RETRIEVAL-CONTEXT` | Exact Retrieval / Routing / Context Budget | 최상 | Long-term Memory foundation · #653 | intent routing, bounded context budget, deterministic scoring, exact-identity-first retrieval, bounded related-memory expansion을 소유한다. |
| `V-MODEL-CATEGORY` | Catalog-proven Premium / Regular model category | 높음 | Post-stabilization · #343 | 실제 served model을 현재 version-pinned LLMGateway catalog로 확인한 경우만 Premium/Regular로 분류한다. catalog 미확인/미등록 모델은 UNKNOWN, 이름/비용/provider 추론 금지. |
| `V-ZDR-STATUS` | Enterprise Zero Data Retention read-only status | 높음 | **CAPTURED / NEEDS SOURCE AUTHORITY** · `docs/usage-dashboard-upstream-scans/2026-09-06.md` | current account의 ZDR 정책 상태를 authoritative source가 직접 제공할 때만 최소화된 read-only 상태로 표시한다. No-AI-Training, cache 결과, provider 선택, payload 부재로 ZDR을 추론하지 않는다. |
| `V-FUNDING-PROVENANCE` | DevPass plan vs PAYG funding-source 표시 | 높음 | **BLOCKED — authority NOT_PROVEN** · #348 + #416 | `NV-FUNDING-AUTH`에서 request-level plan-vs-PAYG authority가 증명되지 않았다. 새 pinned upstream evidence가 생기기 전까지 UNKNOWN 유지, 구현 금지. |
| `V-RUNTIME-FALLBACK-PRUNE` | Evidence-led legacy/fallback pruning | 높음 | Stabilization/slimming · Runtime Slimming Backlog | `NV-FALLBACK-INVENTORY`에서 SAFE REMOVAL CANDIDATE로 증명된 runtime branch만 작은 release 단위로 제거한다. working fallback을 happy-path 이유만으로 삭제하지 않는다. |
| `V-PARSER-CONSOLIDATION` | Evidence-led parser/normalizer consolidation | 높음 | Stabilization/slimming · Runtime Slimming Backlog | `NV-PARSER-INVENTORY` 결과를 바탕으로 한 owner씩 중복 normalization을 합친다. UNKNOWN/source fidelity/dedupe identity를 보존한다. |
| `V-LIFECYCLE-CLEANUP` | Timer/listener/retained-state cleanup | 높음 | Stabilization/slimming · `NV-LIFECYCLE-STRESS` 선행 | 실기/회귀에서 실제 누적 또는 불필요 work가 측정된 항목만 제거/통합한다. measured bottleneck이 아닌 코드는 최적화하지 않는다. |
| `V-MEMORY-HUMAN-AUTOMATION` | Human Review / Suggestions / Evidence Reactivation | 높음 | Long-term Memory family · #653 | human review, suggested remember/forget, decision revisit, evidence-arrival reactivation, memory-to-idea/work routing을 제공한다. memory confidence는 구현 권한이 아니다. |
| `V-MEMORY-RELEASE-DIAGNOSTIC` | Release / Physical / Diagnostic / Baseline Memory Integration | 높음 | Long-term Memory family · #653 | release snapshot, physical evidence, failure-repair/failed-attempt/playbook, update notes, feedback, diagnostic/behavior/performance baseline을 memory와 연결한다. deployment와 physical acceptance는 계속 분리한다. |
| `V-BILLING-HISTORY` | Billing history / invoice read-only view | 중간 | Post-stabilization · #348 + `NV-BILLING-HISTORY-AUTH` 선행 | 안전한 authenticated source가 증명될 경우에만 invoice/history를 read-only로 추가한다. privacy surface와 retention을 최소화한다. |
| `V-MEMORY-CROSS-REPO-INDEX` | Cross-repo Canonical Knowledge Index | 중간 | Long-term Memory family · #653 | 여러 repo/workspace의 canonical knowledge를 검색 가능하게 연결하되 각 repo authority/permission/privacy를 보존하고 second truth database를 만들지 않는다. |

## 난이도: 매우 높음

| ID | 아이디어 | 중요도 | 상태 / 근거 | 요약 |
| --- | --- | --- | --- | --- |
| `V-MEMORY-SNAPSHOT-ROLLBACK` | Known-good Snapshot / Replay / Safe Memory Rollback | 최상 | Long-term Memory late track · #653 | known-good memory snapshot, historical replay, rollback을 소유한다. exact identity, conflict handling, validation, idempotency가 증명되기 전에는 활성화하지 않는다. |
| `V-MEMORY-PORTABILITY-SYNC` | Import/Export / Offline-first / Cross-device Sync | 높음 | Long-term Memory late track · #653 | schema migration, import/export, offline reconciliation, cross-device sync, sync receipt/incident/circuit-breaker를 소유한다. concurrent revision/privacy/conflict 계약이 선행되어야 한다. |
| `V-TOPUP-WRITE` | Credits top-up controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | 실제 결제 write. idempotency, duplicate charge 방지, 실패/재시도/receipt 검증이 먼저 증명되어야 한다. |
| `V-RESET-WRITE` | Reset Pass purchase / redeem / refund controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | 포함 pass 우선 사용, tier-bound purchase, monthly allowance eligibility, refund/transaction consistency까지 다뤄야 하는 고위험 write surface. |
| `V-AUTORELOAD-WRITE` | Auto-Reload mutation controls | 중간 | Long-term · #348 + `NV-TRANSACTION-AUTH` 선행 | threshold/amount/enable-disable mutation. 결제 실패 backoff, prolonged failure disable, PAYG coupling을 source contract대로 보장해야 한다. |

---

# 5. 묶음 설계 관계

아이디어 리스트에서는 평가를 위해 세부 항목을 나눠 두지만, 실제 release 설계에서는 서로 강하게 묶인 항목을 다시 하나의 bounded release로 합칠 수 있다.

### Current version-required medium/high batch

다음 네 항목은 모두 개별 `DESIGN READY`이며 그룹은 **IMPLEMENTATION BATCH READY**다:

- `V-HTTP-STATUS` — #575
- `V-SERVICE-TIER-FIDELITY` — #577
- `V-PREMIUM-METER` — #581
- `V-PAYG-STATUS` — #585

이 batch-ready 상태는 항목별 재승인을 줄이기 위한 execution grouping이다. 실제 어느 기능이 어느 monotonic release의 primary goal이 되는지는 fresh release authority와 regression boundary에서 결정한다.

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

이미 shipped/read-only parity가 있는 항목:

- `V-RESET-STATUS`
- `V-BILLING-STRIP`

남은 design-ready read-only 확장:

- `V-PREMIUM-METER`
- `V-PAYG-STATUS`

request-level plan allowance vs PAYG funding source는 #416에서 NOT_PROVEN이므로 위 account surfaces와 결합해 추론하지 않는다.

### In-plugin Release Notes / Diagnostic Guidance — #643

`V-RELEASE-NOTES-GUIDANCE`는 현재 설치 release의 정적 업데이트 내역과 다음 physical/diagnostic observation hints를 Settings에 제공하는 별도 low-difficulty owner다. release-spec `highlights` / `diagnosticHints`가 authoring truth이며 runtime GitHub/history fetch나 별도 changelog database를 만들지 않는다.

### Long-Term Memory Canonical Family — #653

90개 atomic brainstorm은 정식 warehouse ID로 각각 승격하지 않고 14개 canonical owner로 overlap 제거해 압축한다. 정확한 M-01..M-90 mapping과 owner boundary는 `docs/USAGE_DASHBOARD_LONG_TERM_MEMORY_IDEA_FAMILY.md`가 보존한다.

Foundation design batch — **최상 / 높음**:

- `V-MEMORY-CORE-TAXONOMY`
- `V-MEMORY-POLICY-SCOPE`
- `V-MEMORY-TRUTH-RECONCILIATION`
- `V-MEMORY-PRIVACY-TRUST`
- `V-MEMORY-LIFECYCLE-COMPACTION`
- `V-MEMORY-RETRIEVAL-CONTEXT`

이 6개는 서로의 source/privacy/identity/retention/context 계약을 제한하므로 하나만 먼저 구현하지 않는다. **6개 모두 개별 DESIGN READY가 된 뒤** foundation implementation batch 승격 여부를 판단한다.

후속 grouping:

- 높음 / 중간: `V-MEMORY-SESSION-CONTINUITY`, `V-MEMORY-OBSERVABILITY`
- 높음 / 높음: `V-MEMORY-HUMAN-AUTOMATION`, `V-MEMORY-RELEASE-DIAGNOSTIC`
- no-version / 높음 / 높음: `NV-MEMORY-INTEGRITY-QUALITY` — 제품 release와 섞지 않음
- late: `V-MEMORY-SNAPSHOT-ROLLBACK`, `V-MEMORY-PORTABILITY-SYNC`
- independent later: `V-MEMORY-CROSS-REPO-INDEX`

Repository MEM-01/#463은 원칙 참고용 precedent이며 Local Usage Dashboard runtime memory authority가 아니다.

---

# 6. 아이디어 승격 규칙

아이디어가 실제 다음 버전 후보가 되려면 최소한 다음을 거친다:

1. current production/source fresh check;
2. source authority 확인;
3. UNKNOWN / privacy / identity 규칙 확정;
4. 변경 범위와 non-goal 명시;
5. 관련 regression 설계;
6. 현재 active release/stabilization gate와 충돌하지 않는지 확인;
7. 별도 issue에 **DESIGN ONLY** 상태로 구체화;
8. 같은 중요도 + 같은 난이도 그룹의 대상 아이디어가 모두 `DESIGN READY`인지 확인;
9. 그룹 전체를 **IMPLEMENTATION BATCH READY**로 승격;
10. 이후 사용자의 추가 항목별 승인 없이 안전한 release 단위로 연속 구현하고, 실기 확인이 필요한 시점에만 사용자를 호출한다.

즉 **아이디어 → 개별 설계 → 그룹 DESIGN READY → IMPLEMENTATION BATCH READY → 안전한 단위의 연속 구현**은 서로 다른 상태다.

---

# 7. 현재 authority 링크

- Feature Source / Truth Matrix: `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md`
- Funding Authority Investigation: `docs/USAGE_DASHBOARD_FUNDING_AUTHORITY_INVESTIGATION.md`
- Runtime Fallback Inventory: `docs/USAGE_DASHBOARD_RUNTIME_FALLBACK_INVENTORY.md`
- Parser / Normalizer Inventory: `docs/USAGE_DASHBOARD_PARSER_NORMALIZER_INVENTORY.md`
- Current Release PR Bootstrap Contract: `docs/USAGE_DASHBOARD_PR_BOOTSTRAP_CURRENT_CONTRACT.md`
- State Lifecycle Inventory: `docs/USAGE_DASHBOARD_STATE_LIFECYCLE_INVENTORY.md`
- Repository History / Tool Inventory: `docs/USAGE_DASHBOARD_REPO_HISTORY_INVENTORY.md`
- Long-Term Memory Canonical Idea Family: `docs/USAGE_DASHBOARD_LONG_TERM_MEMORY_IDEA_FAMILY.md` / #653
- Service-tier presentation ownership: #420
- Billing Cycle Truth Strip: #572
- Exact HTTP status design: #575
- Service-tier fidelity design: #577
- Premium meter design: #581
- PAYG/Auto-Reload status design: #585
- Cycle summary design: #587
- In-plugin release notes / diagnostic guidance: #643 · `docs/USAGE_DASHBOARD_583_IN_PLUGIN_RELEASE_NOTES_DIAGNOSTIC_GUIDANCE_DESIGN.md`
- Request Metadata Fidelity design: #343
- DevPass/Credits parity backlog: #348
- Release PR bootstrap historical authority: #254
- Runtime Slimming & Legacy Pruning: `docs/USAGE_DASHBOARD_RUNTIME_SLIMMING_BACKLOG.md`
- Idea-list tracking: #412

이 문서가 기존 issue의 세부 source evidence를 대체하지 않는다. 기존 issue/design이 더 구체적인 경우 그 issue가 해당 아이디어의 상세 authority다.
