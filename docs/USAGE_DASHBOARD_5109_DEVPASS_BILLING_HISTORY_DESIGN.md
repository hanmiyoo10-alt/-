# Local Usage Dashboard 5.109 — DevPass Recent Billing History Design

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1916  
Repository scope: `plugins/usage-dashboard/`

## 1. Fresh baseline

At design freeze:

- production: `release-usage-dashboard@05862999df0521c73b6890fbc561c01be3f9f36e`
- Product `3.0.0-alpha.5.108`
- Engine `1.6.42`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- accepted 5.108 physical authority: #1899
- main at design start: `d600983caf63df6ea2a27a7dd7b1dc91e62cbdd6`
- no existing Product 5.109 authority found
- no `p76-*` Usage Dashboard regression found

This document is design authority only. It does not authorize implementation or release by itself.

## 2. Official upstream source

Pinned official upstream: `theopenco/llmgateway@10eecf88e5993657b766104ec7ab5b466ebb0603`.

Authoritative endpoint:

`GET /dev-plans/invoices`

The route is explicitly read-only and returns DevPass billing history. Upstream orders the backing transaction query by `createdAt desc`, filters it through the closed DevPass history type set, removes negative `credit_topup` reversal bookkeeping rows, and returns an `invoices[]` array.

Public row fields include:

- `id`
- `type`
- `date`
- `amount`
- `creditAmount`
- `currency`
- `status: pending | completed | failed`
- `description`
- optional refund eligibility metadata

The official source therefore proves a stronger read-only billing-history authority than the existing Local Usage Dashboard `hasBillingHistory` boolean.

## 3. Primary goal

Replace the boolean-only billing-history experience with one bounded recent-history surface in the existing DevPass tab.

Default mobile presentation:

```text
결제 내역 · DevPass
최근 5건 · 3개
▶ 펼치기
```

Expanded example:

```text
9. 8. 14:20   PAYG 충전       $10.00   완료
9. 3. 20:39   DevPass 시작    $79.00   완료
8. 30. 11:10  환불            $10.00   완료
```

Placement: near `Billing Cycle`. No new top-level tab.

## 4. Bounded retained row

5.109 retains at most the first five server-ordered valid rows.

Only the following fields may cross the Engine capture boundary into Plugin-visible state:

```text
type
date
amount
currency
status
```

Everything else from the upstream row is outside 5.109 authority.

### Field rules

- `type` must belong to the documented upstream DevPass billing-history type set.
- `date` must parse as a valid timestamp.
- `amount === null` remains unknown for that row and renders `—`; it is never converted to zero.
- explicit numeric zero remains known zero.
- `currency` remains source-backed. USD may render with `$`; non-USD values retain the explicit currency code.
- `status` must be exactly `pending`, `completed`, or `failed`.
- `credit_refund` is presented as a refund. The positive stored amount must not be mislabeled as spend.
- the server ordering is authority. Do not reorder from transaction IDs or locally observed times.

## 5. Type presentation

Use a closed presentation map over the official type set. Suggested bounded labels:

- `dev_plan_start` → `DevPass 시작`
- `dev_plan_renewal` → `DevPass 갱신`
- `dev_plan_upgrade` → `DevPass 업그레이드`
- `dev_plan_downgrade` → `DevPass 다운그레이드`
- `dev_plan_cancel` → `DevPass 취소`
- `dev_plan_resume` → `DevPass 재개`
- `dev_plan_end` → `DevPass 종료`
- `dev_plan_reset_pass` → `Reset Pass`
- `dev_plan_reset_pass_reward` → `Reset Pass 보상`
- `dev_plan_reset_pass_gift` → `Reset Pass 지급`
- `credit_topup` → `PAYG 충전`
- `credit_refund` → `환불`
- `credit_gift` → `크레딧 지급`
- `credit_manual_payment` → `크레딧 추가`

If upstream adds a new type later, implementation must fail that row closed until the closed set is deliberately updated. Do not silently map arbitrary strings to a generic financial label.

## 6. Empty / UNKNOWN / partial states

Exact `invoices: []` is known empty history.

Known empty UI:

```text
결제 내역 · 없음
```

Source unavailable UI:

```text
결제 내역 · —
```

Rules:

1. `GET /dev-plans/invoices` is the only row authority.
2. The existing `hasBillingHistory` boolean may remain as an independent coarse account flag, but it must never synthesize rows.
3. Missing/malformed response, auth/permission failure, request failure, or non-array `invoices` => whole surface UNKNOWN.
4. Malformed individual rows are dropped and counted.
5. Some valid and some invalid rows => `partial` state.
6. Received rows > 0 but valid rows = 0 => `invalid-history`, not known empty.
7. No reconstruction from balances, cycle totals, Reset Pass inventory, Request Ledger, spend deltas, or local observation.

## 7. Privacy boundary

Discard before Plugin-visible state, persistence and Diagnostics:

- transaction/invoice `id`
- `description`
- `creditAmount`
- refund eligibility/reason
- related transaction identifiers
- invoice download/PDF identity
- payment/card information
- billing email/company/address/tax ID/notes
- raw user/org IDs
- raw full endpoint response
- auth/session material

The source may return these fields, but 5.109 does not need them.

## 8. I/O and lifecycle

Billing history must remain outside the normal 30s/60s snapshot critical path.

Required architecture:

- Engine owns authenticated `/dev-plans/invoices` access.
- Plugin reads one bounded local route, tentatively `/devpass-billing-history`.
- Fetch occurs only when the DevPass surface needs the data.
- Engine TTL >= 5 minutes.
- Plugin/runtime UI TTL >= 5 minutes.
- Single-flight on concurrent callers.
- No new periodic timer, poller or background refresh.
- No new credential owner or package.
- On cache miss, implementation may reuse the already-proven authenticated capture-session owner. If the current `orgs list --json` authenticated session seam is the narrowest safe owner, reusing that existing CLI command family on lazy cache miss is allowed; introducing a new CLI command family is not.
- Fresh implementation-time source readback must choose the exact owner. The design does not freeze symbol names.
- A source failure fails closed. Stale rows may be shown only if an existing explicit stale contract carries a visible stale state; otherwise prior rows must not masquerade as current truth.

## 9. UI interaction

The DevPass tab is already long on mobile, so the history block is collapsed by default.

Header states:

```text
결제 내역 · 최근 5건 · 3개
결제 내역 · 없음
결제 내역 · —
```

Expanded rows expose only:

- local-formatted source timestamp
- bounded type label
- amount/currency or `—`
- status label

No row click opens an invoice, refund flow, payment page, external URL or write action in 5.109.

## 10. Diagnostics

Bounded line example:

```text
DevPass billing history: rows 3/3 · newest 2026-09-08T05:20:00Z · source devpass-invoices · state ok
```

Allowed states:

- `ok`
- `empty`
- `source-unavailable`
- `permission-unavailable`
- `invalid-history`
- `partial`

Diagnostics may include only bounded row counts, newest timestamp, source name and state. No transaction IDs, descriptions, amounts list, refund metadata or billing PII.

## 11. Candidate identity

Subject to mandatory implementation-time fresh readback:

- Product `3.0.0-alpha.5.109`
- Engine `1.6.43` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P76` tentative

The Engine bump is tentative because an authenticated source projection/cache/local route is expected to change Engine bytes.

## 12. P76 focused regression contract

P76 must prove at minimum:

1. accepted 5.108 baseline and monotonic 5.109 candidate;
2. `/dev-plans/invoices` only as row authority;
3. newest-first server order preserved;
4. maximum five retained rows;
5. only `type/date/amount/currency/status` cross Engine→Plugin;
6. IDs/descriptions/creditAmount/refund metadata/billing PII excluded;
7. empty array is known empty;
8. source failure is UNKNOWN;
9. null amount is `—`; explicit zero is known zero;
10. malformed rows cannot fabricate history;
11. partial sanitization is diagnosed;
12. no history reconstruction from existing counters or Request Ledger;
13. no refund/download/cancel/write control;
14. lazy load + >=5 minute Engine/UI TTL + single-flight;
15. no new periodic polling, credential owner, package or CLI command family;
16. 5.108 API-key organization limit and 5.107/5.106/5.105 surfaces remain green;
17. full discovered Usage Dashboard registry green;
18. deterministic materialization and second-pass idempotence green;
19. contracts remain `1/1` absent incompatible evidence.

## 13. Physical acceptance

After a monotonic 5.109 deployment the only required user action is the normal PocketRisu `+` update and real-device verification.

Capture:

1. DevPass tab with the billing-history block expanded;
2. bounded Diagnostics line `DevPass billing history`.

No purchase, refund, card action, API-key action or artificial traffic is required. Existing natural history is sufficient. An exact empty account may validate the empty state, but does not exercise positive row rendering.

## 14. Explicit non-goals

5.109 does not include:

- invoice PDF download
- refund eligibility UI
- refund execution
- subscription cancellation/resume
- payment method display/change
- billing address/tax details
- full unbounded history
- Credits-organization transaction history
- transaction search/filter/export
- spend aggregation derived from history rows

Those require separate authority and release boundaries.