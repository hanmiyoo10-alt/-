# Local Usage Dashboard 5.109 — Source Truth Matrix Addendum

Date: 2026-09-08 KST  
Status: **CANONICAL 5.109 MATRIX ADDENDUM · SOURCE PROVEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1916  
Design: `docs/USAGE_DASHBOARD_5109_DEVPASS_BILLING_HISTORY_DESIGN.md`  
Parent matrix: `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md`

## Proven row

| Feature ID | User surface | Authoritative source | Exact source fields retained | Capture owner | Allowed normalization / derivation | UNKNOWN rule | Forbidden inference | Privacy / retention | Extra I/O | Contract impact | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `V-DEVPASS-BILLING-HISTORY` | DevPass tab · collapsed recent billing history, at most 5 rows | authenticated `GET /dev-plans/invoices` | per retained row only `type`, `date`, `amount`, `currency`, `status` | Engine authenticated lazy source projection; exact implementation owner chosen by fresh readback | preserve server newest-first order; retain first 5 valid rows; validate closed type/status set; valid timestamp; `amount=null -> —`; explicit zero preserved; USD may use `$`; other currency keeps explicit code | request/auth/permission/malformed top-level response => whole surface UNKNOWN; exact `[]` => known empty; malformed rows are dropped and bounded partial/invalid state is diagnosed | existing `hasBillingHistory`; Credits balance; DevPass allowance/cycle deltas; Reset Pass inventory; Request Ledger; spend deltas; transaction-like local IDs; guessed transaction chronology | discard transaction IDs, descriptions, creditAmount, refund metadata, billing PII, payment/card fields, raw full response and auth material before Plugin-visible state; retain at most 5 sanitized rows | one lazy source family; no normal snapshot polling; Engine/UI TTL >=5m; no new credential/package/CLI command family | Product bump expected; Engine bump tentative; contracts stay `1/1` absent incompatible evidence | official upstream `theopenco/llmgateway@10eecf88e5993657b766104ec7ab5b466ebb0603`, `apps/api/src/routes/dev-plans.ts`; #1916 | **SOURCE PROVEN / DESIGN FROZEN / IMPLEMENTATION NOT STARTED** |

## Official upstream semantics pinned for 5.109

The official route:

- is `GET /dev-plans/invoices`;
- queries the authenticated user's DevPass personal organization;
- returns exact empty history when no personal DevPass organization exists;
- queries organization transactions newest-first by `createdAt desc`;
- filters through a closed DevPass billing-history type list;
- removes negative `credit_topup` reversal bookkeeping rows that would otherwise duplicate refund money;
- returns public rows carrying `id`, `type`, `date`, `amount`, `creditAmount`, `currency`, `status`, `description`, and optional refund eligibility.

5.109 deliberately narrows that response before local exposure.

## Type authority

Accepted source types at this pinned upstream revision are:

- `dev_plan_start`
- `dev_plan_renewal`
- `dev_plan_upgrade`
- `dev_plan_downgrade`
- `dev_plan_cancel`
- `dev_plan_resume`
- `dev_plan_end`
- `dev_plan_reset_pass`
- `dev_plan_reset_pass_reward`
- `dev_plan_reset_pass_gift`
- `credit_topup`
- `credit_refund`
- `credit_gift`
- `credit_manual_payment`

Implementation must not silently widen this set. A new upstream type requires explicit review.

## Status authority

Accepted statuses are exactly:

- `pending`
- `completed`
- `failed`

No local success/failure inference from amount, type or date is allowed.

## Row validity

A row is valid only when:

1. it is an object;
2. `type` belongs to the pinned closed set;
3. `date` is an explicitly valid timestamp;
4. `amount` is either null or a finite numeric source string accepted by the existing money parser contract;
5. `currency` is a bounded non-empty source string;
6. `status` belongs to the exact three-value set.

The raw row's ID is never needed for this first slice.

## Partial semantics

- `received=0` from an exact array => `empty`.
- `received>0 && valid=0` => `invalid-history`.
- `0<valid<received` => `partial`.
- `valid=received>0` => `ok`.

The UI may still render valid rows under `partial`, but Diagnostics must make the partial state visible.

## Lifecycle contract

The source stays outside the ordinary snapshot path.

The expected pattern is the existing lazy authenticated-source ownership already used by other post-5.103 features:

```text
DevPass panel need
  -> bounded local route
  -> Engine single-flight cache
  -> authenticated source fetch only on cache miss
  -> immediate projection to sanitized rows
  -> Plugin cache/render
```

Both Engine and Plugin/runtime cache TTLs are at least five minutes. There is no periodic source poller.

## Privacy contract

Never expose or retain merely for 5.109:

- transaction IDs;
- descriptions;
- creditAmount;
- refund eligibility or ineligibility reason;
- billing details;
- payment method/card details;
- raw organization/user IDs;
- invoice download identifiers;
- raw response bodies;
- authentication/session material.

## Candidate identity

Fresh implementation-time readback is mandatory. Current design candidate:

- Product `3.0.0-alpha.5.109`
- Engine `1.6.43` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- P76 tentative

This addendum is evidence and design authority only. It does not authorize implementation or release.