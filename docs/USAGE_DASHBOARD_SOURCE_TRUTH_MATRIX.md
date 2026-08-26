# Local Usage Dashboard — Feature Source / Truth Matrix

Status: **CANONICAL PLANNING/TRUTH INDEX — REPOSITORY ONLY**

Idea: `NV-SOURCE-MATRIX`  
Tracking/design: #414  
Primary backlog inputs: #343, #348

이 문서는 Local Usage Dashboard의 향후 기능과 현재 핵심 truth contract를 한눈에 확인하기 위한 source/truth index다.

이 문서는 runtime 구현이 아니며 release queue도 아니다. 더 구체적인 issue/test/source contract가 존재하면 그 근거가 상세 authority이고, 이 문서는 그 내용을 요약·인덱싱한다.

## Core rules

1. **Source evidence first.** 값은 authoritative source가 실제로 제공하거나, 그 source에서 허용된 계산으로만 만든다.
2. **UNKNOWN is a valid result.** source가 없거나 의미가 불명확하면 `UNKNOWN`, `TBD`, `INVESTIGATE`로 남긴다. 0/default/추정값으로 메우지 않는다.
3. **No silent inference.** model/provider/name/cost/latency/tier/account-scope/date 패턴 등으로 source가 주지 않은 의미를 추론하지 않는다.
4. **Privacy stays bounded.** prompt/response body, messages, auth material, cookies, custom headers, 불필요한 raw IDs/metadata를 새 persisted truth surface로 만들지 않는다.
5. **Extra I/O is explicit.** healthy-path network/CLI/polling을 추가해야 하는 기능은 반드시 표에 드러내고 별도 설계에서 정당화한다.
6. **Identity is separate from enrichment.** request metadata가 UNKNOWN→explicit로 좋아져도 request dedupe identity를 임의로 바꾸지 않는다.
7. **Matrix-before-feature rule.** versioned feature가 `DESIGN READY`가 되려면 해당 matrix 행이 먼저 추가/갱신되어야 한다.

## Readiness meanings

- `PROVEN` — exact repository/upstream evidence가 있고 source/UNKNOWN 경계가 명확하다.
- `PARTIAL` — 일부 source/capture는 증명됐지만 필요한 field/semantic/capture path 일부가 아직 미확정이다.
- `INVESTIGATE` — authoritative source 또는 safe capture path를 먼저 조사해야 한다.
- `BLOCKED` — 선행 조사/안전성 계약 없이는 구현 설계로 올릴 수 없다.

## Matrix schema

| Column | Meaning |
| --- | --- |
| Feature ID | 아이디어 리스트의 stable identifier |
| User surface | 향후 값이 보일 UI/Diagnostics surface |
| Authoritative source | truth를 확정할 수 있는 endpoint/catalog/status/API |
| Exact source fields | 허용된 raw/source field. 미확정은 `TBD` |
| Capture owner | 현재 Engine/Plugin/Manager owner 또는 `TBD` |
| Allowed normalization / derivation | 허용되는 coercion/산술/분류 |
| UNKNOWN rule | UNKNOWN/미지원으로 남겨야 하는 조건 |
| Forbidden inference | 절대 쓰면 안 되는 추론 |
| Privacy / retention | persist 금지 raw field 또는 bounded-retention 조건 |
| Extra I/O | `none / required / TBD` |
| Contract impact | snapshot/recent-request/additive/none/TBD |
| Evidence | 상세 source/issue/test 근거 |
| Readiness | `PROVEN / PARTIAL / INVESTIGATE / BLOCKED` |

---

# Planned feature truth matrix

## Request metadata fidelity

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-SERVICE-TIER-FIDELITY` | Recent Requests, hourly detail, Diagnostics | LLMGateway authenticated `/logs` request rows | `requestedServiceTier`, `usedServiceTier`, `routingMetadata.serviceTierSource` | account-wide `/logs` capture path in Engine; current Plugin tier presentation/normalization in `src/12-service-tier.part.js` | explicit aliases only: flex/flexible→FLEX, priority/fast→PRIORITY, explicit standard/default/auto/on-demand aliases→STANDARD; requested and served remain separate | missing/null/unsupported `usedServiceTier` => served UNKNOWN; missing selection source => UNKNOWN | missing special tier⇒STANDARD; model/provider/price/cost/latency/account tier⇒service tier | do not persist raw routing metadata; retain only safe normalized tier/source fields needed by the feature | none planned; reuse current `/logs` capture | additive recent-request metadata if implemented | #343; `src/12-service-tier.part.js`; existing `/logs` capture | `PROVEN` |
| `V-MODEL-CATEGORY` | Recent Requests, hourly detail, Diagnostics | actually served model + current version-pinned LLMGateway model catalog | served/used model identifier + canonical catalog/provider pricing data required by upstream classifier | served model already reaches request rows; safe catalog access owner `TBD` | normalize provider/region suffix using upstream-compatible semantics; classify Premium/Regular only after catalog membership is proven | missing served model, unavailable catalog, unresolved catalog model => UNKNOWN | model-name substring, provider name, request cost, latency, service tier, account scope, hardcoded Premium list | do not persist catalog dump or unnecessary provider catalog details; only derived category/source | `TBD`; desired healthy path is no new network call | additive recent-request metadata if implemented | #343 | `PARTIAL` |
| `V-HTTP-STATUS` | failed Recent Requests, hourly detail, Diagnostics | final request `errorDetails.statusCode` from LLMGateway `/logs` | exact numeric `errorDetails.statusCode` | account-wide `/logs` capture sanitizer; safe field not yet a shipped public request field | retain exact numeric status only; no synthetic success code | failed request without exact status => UNKNOWN; success/cancelled without explicit status stays no-code | `routingMetadata.routing[].status_code`, provider-attempt status, outcome⇒HTTP 200/4xx/5xx | never persist `responseText`, `cause`, raw `errorDetails`, or raw routing metadata | none planned; reuse current `/logs` capture | additive recent-request metadata if implemented | #343 design amendment | `PARTIAL` |

## DevPass account/read-only parity

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-PREMIUM-METER` | DevPass account/allowance card | authenticated DevPass status captured through current account session | normalized `premiumCreditsUsed`, `premiumWeeklyLimit`, `premiumWeekResetsAt`; compatibility fields include `devPlanPremiumCreditsUsed`, `devPlanPremiumWeekStart` | Engine `runtime-src/bridge-engine/40-sources.part.mjs` `normalizeIndependentDevPassStatus()` / DevPass status loader | used/limit percent only when used and limit are finite; reset display only from explicit reset/window field | missing limit/used/reset field => that component UNKNOWN; no invented reset date | model name/model category⇒Premium allowance usage; plan price⇒limit | status normalizer explicitly excludes auth/session/cookie fields; do not expose raw org/project IDs to Plugin UI | none; reuse current status/account capture | snapshot/additive UI only if implemented | #348; `40-sources.part.mjs` | `PROVEN` |
| `V-RESET-STATUS` | DevPass Reset Pass read-only card | authenticated DevPass status | `resetPasses`, `includedResetPasses`, `includedResetPassesRemaining`, `resetPassPrice`; compatibility plan-tier pass fields where source actually provides them | Engine `40-sources.part.mjs` | display source-backed counts/price only; eligibility text only from explicit source semantics | missing counts/price/eligibility => UNKNOWN/hidden field, never zero by assumption | plan name⇒remaining passes; missing field⇒0; purchase eligibility guessed from price | read-only; no payment/auth material; retain only normalized safe fields | none for currently normalized status fields | snapshot/additive UI only if implemented | #348; `40-sources.part.mjs` | `PROVEN` |
| `V-PAYG-STATUS` | DevPass PAYG/Auto-Reload read-only card | authenticated DevPass status and any future explicit billing-status source | currently normalized: `paygEnabled`, `regularCredits`; auto-reload enabled/threshold/amount exact fields `TBD` | Engine DevPass status normalizer for current fields; auto-reload capture owner `TBD` | show PAYG on/off and regular credit balance only when explicit; auto-reload values only when exact fields are proven | missing regular credits or auto-reload metadata => UNKNOWN; do not convert missing amount/threshold to 0 | balance⇒PAYG enabled; missing auto-reload fields⇒disabled; plan tier⇒threshold/amount | read-only; no payment tokens/billing secrets persisted | current fields none; future auto-reload source `TBD` | snapshot/additive UI if implemented | #348; `40-sources.part.mjs` | `PARTIAL` |
| `V-BILLING-STRIP` | DevPass plan/cycle/renewal strip | authenticated DevPass status | `plan`, `cycle`, `billingCycleStart`, `expiresAt`, `cancelled` | Engine `normalizeIndependentDevPassStatus()` / DevPass status loader | format explicit timestamps; remaining-time calculation allowed only from explicit authoritative end/expiry | no explicit end/expiry => end/renewal countdown UNKNOWN; no explicit cancellation => do not invent cancelled state | cycle start + plan name⇒renewal end; fixed monthly arithmetic⇒expiry | do not expose raw account/auth identifiers; normalized dates/status only | none | snapshot/additive UI if implemented | #348; `40-sources.part.mjs` | `PROVEN` |
| `V-CYCLE-SUMMARY` | DevPass/overview cycle summary | existing activity/analytics data plus authoritative billing-cycle boundary when present | request/token/cache fields from existing activity/analytics rows; cycle boundary from `billingCycleStart`/`expiresAt`; exact aggregation field set to be frozen in feature design | existing Engine activity/analytics loaders + Plugin analytics owner | aggregate request/token/cache/peak-day over the exact available window; call it “billing cycle” only when the actual window matches authoritative cycle semantics | if cycle boundaries cannot be proven against retained source window, label exact `7d/30d/local observed` window instead | 30d⇒billing cycle; monthly plan⇒fixed 30-day window; missing days⇒0 usage | aggregate only sanitized existing rows; no raw request bodies | none expected for 7d/30d; exact historical cycle may require separate proof | UI/analytics only; contract `TBD` | #348; existing activity/analytics runtime | `PARTIAL` |

## Credits insights

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-CREDITS-COST` | Credits analytics/cost cards | sanitized LLMGateway usage/log analytics already captured by Engine | existing source fields include cost-component values such as input/output/cache/storage components and `discountSavings` where supplied; exact public UI field set to be frozen in feature design | Engine CLI/log sanitizer and analytics normalization (`30-cli-runtime.part.mjs` + analytics path) | sum or percentage only across explicitly known components; savings shown only when explicit | absent component/savings => UNKNOWN, not 0; total must not imply missing components are zero | provider/model/price table⇒missing component; total difference⇒savings unless source explicitly defines it | keep sanitized numeric components only; never raw billing/auth/log payload | none expected if current sanitized fields suffice | analytics/UI additive; exact contract `TBD` | #348; `runtime-src/bridge-engine/30-cli-runtime.part.mjs` | `PARTIAL` |
| `V-COST-DRIVER` | compact model/provider cost-driver view | current authoritative analytics rows | existing normalized model/provider request/cost aggregates; exact chosen metrics frozen in feature design | existing Plugin/Engine analytics owners | rank/sort/sum existing authoritative rows only | metric missing for a row => omit/UNKNOWN for that metric; no synthetic zero ranking | model popularity⇒cost; request count×catalog price⇒observed cost | no new raw request/provider payload; use existing bounded analytics data | none | UI-only/additive if using current aggregates | #348; existing analytics source | `PROVEN` |

## Investigation-dependent read-only features

| Feature ID | User surface | Authoritative source | Exact source fields | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-FUNDING-PROVENANCE` | Recent Requests / DevPass funding badge | **not proven on current pinned evidence** — reopen only if an explicit request-level upstream funding decision is documented | `NONE PROVEN`; current `projectId`/`organizationId`/`usedMode` evidence proves account-scope provenance only | no public funding capture owner authorized | **none**; request funding remains UNKNOWN | no explicit request-level plan-vs-PAYG authority => UNKNOWN | account scope, cost, service tier, model category, balance, allowance exhaustion, or `usedMode` alone⇒plan-vs-PAYG funding | raw project/org IDs and `usedMode` remain transient; transaction/payment data excluded | none for current investigation; no new I/O authorized | no contract change authorized | #348; #416; `docs/USAGE_DASHBOARD_FUNDING_AUTHORITY_INVESTIGATION.md`; Engine `35-request-provenance-capture` + `55-request-provenance` | `BLOCKED` |
| `V-BILLING-HISTORY` | billing/invoice read-only view | `TBD` authenticated billing-history/invoice source | `TBD` | `TBD` | none until source/privacy contract is proven | no safe authenticated source => unsupported/UNKNOWN | reconstruct invoices from usage totals/cost estimates | invoice IDs, payment metadata, addresses or other sensitive billing fields require explicit minimization/retention design | likely `required`, but not authorized | `TBD` | #348 + `NV-BILLING-HISTORY-AUTH` prerequisite | `INVESTIGATE` |

## Transactional write candidates

These remain intentionally blocked behind `NV-TRANSACTION-AUTH` and later versioned designs.

| Feature ID | Authority status | Required proof before design-ready | Readiness |
| --- | --- | --- | --- |
| `V-TOPUP-WRITE` | payment write API `TBD` | authenticated authority, idempotency, duplicate-charge prevention, receipt/result verification, retry/rollback semantics | `BLOCKED` |
| `V-RESET-WRITE` | Reset Pass purchase/redeem/refund API `TBD` | eligibility/ordering semantics, idempotency, transaction consistency, refund/result proof | `BLOCKED` |
| `V-AUTORELOAD-WRITE` | Auto-Reload mutation API `TBD` | enable/disable/threshold/amount authority, payment-failure semantics, idempotency and rollback | `BLOCKED` |

---

# Existing shipped truth examples

These are reference examples of the standard this matrix expects. Detailed tests/source remain authoritative.

| Shipped truth | Current authority | UNKNOWN / fidelity rule | Identity / privacy rule | Evidence |
| --- | --- | --- | --- | --- |
| Request account scope provenance | account-wide `/logs`; DevPass exact project authority first; Credits exact selected org + `usedMode=credits`; otherwise UNKNOWN/conflict | no model/provider/cost/token/duration/tier inference | raw project/org IDs are transient and do not become Plugin request identity | P35 Cross-Scope Request Provenance; Engine provenance capture/classifier |
| Request duration fidelity | explicit source request duration | only nonnegative finite explicit duration; `0` valid; missing/invalid/negative => UNKNOWN | duration excluded from dedupe identity; UNKNOWN→explicit enriches same row | Request Duration Fidelity regression / request ledger |
| Cache Read / Write / TTL fidelity | sanitized LLMGateway `/logs` cache telemetry | Read/Write/TTL displayed only when source actually reports them; missing Write/TTL stays UNKNOWN | no price/provider inference; no raw request body persisted | cache observability regressions / request ledger |
| Request outcome taxonomy | explicit normalized source outcome/error evidence | `success/error/cancelled/unknown`; missing evidence stays unknown | outcome metadata does not create duplicate request identity | service-tier/outcome behavior regressions |
| Current service-tier fidelity | current request-row source fields normalized by `src/12-service-tier.part.js` | FLEX/STANDARD/PRIORITY only when explicit recognized value exists; missing/unsupported stays unknown | tier metadata excluded from request identity; no model/provider inference | `src/12-service-tier.part.js`; P5 / behavior service-tier-outcome |

---

# Maintenance workflow

When a new feature idea is proposed:

1. add/update the idea in `docs/USAGE_DASHBOARD_IDEA_LIST.md`;
2. add or update this matrix row;
3. link exact repository/upstream evidence;
4. mark unproven pieces `TBD`, `PARTIAL`, or `INVESTIGATE`;
5. only after the row has enough truth evidence, create/advance the detailed feature issue to `DESIGN READY`;
6. implementation must preserve the row's UNKNOWN/privacy/I-O boundaries unless a new evidence-led design explicitly changes them.

If source semantics later change, update this matrix and the detailed authority issue together. Never silently reinterpret an existing field.

## Current repository baseline at matrix creation

This document was created while main reported:

- Product `3.0.0-alpha.5.80`
- Engine `1.6.22`
- Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- Engine SHA256 `85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69`

`NV-SOURCE-MATRIX` itself changes **documentation only**. It must not change Plugin/Engine/Manager/release artifact bytes or consume a product version.