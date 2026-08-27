# Local Usage Dashboard — Source / Truth Matrix Transaction Amendment

Status: **CANONICAL DETAIL AUTHORITY FOR TRANSACTIONAL WRITE ROWS — REPOSITORY ONLY**

Parent matrix: `docs/USAGE_DASHBOARD_SOURCE_TRUTH_MATRIX.md`  
Investigation: `docs/USAGE_DASHBOARD_TRANSACTION_AUTHORITY_INVESTIGATION.md`  
Design: #559  
Pinned upstream evidence: `theopenco/llmgateway@f3df974cfcd4b45eef1434ce612f078435abba35`

The parent matrix explicitly allows a more specific issue/test/source contract to act as detailed authority. This amendment is that detailed authority for the three transactional write rows until the parent matrix is next rewritten/materialized.

| Feature ID | Authority status | Exact proven boundary | UNKNOWN / blocked boundary | Evidence | Readiness |
| --- | --- | --- | --- | --- | --- |
| `V-TOPUP-WRITE` | **PROVEN** upstream write authority | authenticated `POST /dev-plans/topup`; input `amount` + required client `purchaseId`; same purchaseId maps to the same org-scoped Stripe idempotency key; conflicting replay returns `409`; fulfillment dedupes on PaymentIntent identity | Local Usage Dashboard still has no shipped write owner. Future design must persist/reuse one logical purchaseId across ambiguous retries and must not auto-submit from refresh/timers | #559; transaction authority report; upstream `dev-plans-payg.spec.ts`; official PAYG docs | `PROVEN` authority; implementation gated behind separate versioned design/product feature gate |
| `V-RESET-WRITE` | **PARTIAL** | redeem endpoint/race protection, purchase endpoint/tier-derived price, PaymentIntent fulfillment dedupe, refund policy/source exist | no client-stable pre-send purchase identity equivalent to top-up purchaseId is proven for Reset Pass purchase; refund replay/reconcile contract not frozen; family remains unsafe to expose as a Local Usage Dashboard write surface | #559; transaction authority report; upstream `dev-plans-reset-passes.spec.ts`; self-refund source/docs | `BLOCKED` |
| `V-AUTORELOAD-WRITE` | **PARTIAL** | authenticated `PATCH /dev-plans/settings`; explicit PAYG/Auto-Reload fields; range validation; `/dev-plans/status` read-back; disabling PAYG disables Auto-Reload | revision/CAS/ETag/concurrent-writer semantics and complete payment-trigger ambiguity contract are not proven for a Local Usage Dashboard client | #559; transaction authority report; upstream `dev-plans-payg.spec.ts`; official PAYG docs | `BLOCKED` |

## Privacy / retention

No transaction write design may persist or display session cookies, auth headers, Stripe customer/payment-method objects, card/bank data, billing addresses, or raw PaymentIntent/refund payloads.

For top-up, a future safe reconciliation identity may retain only an allowlisted non-secret logical `purchaseId`, action kind, source-backed amount and coarse operation state as required by the later versioned design.

## No-live-write statement

This amendment was produced without executing any real charge, Reset Pass mutation, refund, or Auto-Reload settings change.

It changes repository evidence only and does not alter Plugin / Engine / Manager / contracts / release artifacts.
