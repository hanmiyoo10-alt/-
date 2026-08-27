# Local Usage Dashboard — Transaction Authority Investigation

Status: **IMPLEMENTED — repository/upstream authority investigation; no live mutation performed**

Idea: `NV-TRANSACTION-AUTH`  
Design: #559  
Parent: #348  
Baseline: Product `3.0.0-alpha.5.81` · Engine `1.6.22` · Manager `1.3.0` · contracts `1 / 1`

## Investigation boundary

No real top-up, Reset Pass purchase/redeem/refund, or Auto-Reload mutation was executed.

Evidence came from:

- current Local Usage Dashboard source/truth contracts;
- upstream `theopenco/llmgateway` source/tests pinned at commit `f3df974cfcd4b45eef1434ce612f078435abba35`;
- official LLMGateway DevPass documentation describing PAYG overflow/top-up/Auto-Reload and Reset Pass behavior.

A dashboard description is not enough to authorize a Local Usage Dashboard write owner. Exact route/input/idempotency/recovery/result semantics are evaluated separately.

## Family verdict summary

| Family | Verdict | Local Usage Dashboard consequence |
| --- | --- | --- |
| Credit top-up | `PROVEN_SAFE_AUTHORITY` for the upstream submission/idempotency contract | authority prerequisite is proven; versioned UI/runtime work still waits behind the product feature gate and a separate write-owner design |
| Reset Pass family | `PARTIAL_AUTHORITY` / purchase `UNSAFE_RETRY_MODEL` for a Local Usage Dashboard client | keep `V-RESET-WRITE` BLOCKED |
| Auto-Reload settings | `PARTIAL_AUTHORITY` | keep `V-AUTORELOAD-WRITE` BLOCKED |

## Evidence ledger

| Family | Operation | Endpoint/command | Auth scope | Exact input | Exact result | Idempotency authority | Ambiguous-timeout recovery | Read-after-write / reconcile | Privacy | Extra I/O | Evidence | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Top-up | create DevPass credits top-up | `POST /dev-plans/topup` | authenticated DevPass dashboard session; active DevPass org | JSON `amount`, required client `purchaseId` | success plus charged `totalAmount`; card decline `402`; idempotency conflict `409`; non-succeeded intent `402` | **proven**: upstream tests require `purchaseId`; Stripe key is `dev-plan-topup:<orgId>:<purchaseId>`; replay of same purchaseId forwards the same key; new purchaseId is a distinct charge; webhook transaction fulfillment dedupes by PaymentIntent ID | **safe replay path proven** when the client preserves the same purchaseId; missing purchaseId is rejected before Stripe | route success proves succeeded PaymentIntent; fulfillment is webhook-backed; current evidence does not prove a dedicated public read-by-purchaseId endpoint, so future UI should reconcile by same-key replay plus authoritative status/billing read rather than inventing a second purchase | future client must persist only a random reconciliation purchaseId and minimal status; never payment credentials/cookies/Stripe payloads | write POST + later status/billing read if implemented | upstream `dev-plans-payg.spec.ts`; official PAYG docs | `PROVEN_SAFE_AUTHORITY` |
| Reset Pass | redeem/use | `POST /dev-plans/reset-pass/redeem` | authenticated, verified DevPass user | optional `confirmHighCycleUsage` boolean | success returns source (`included`/`purchased`) and resulting pass counts; invalid states rejected | **server concurrency protection proven**: two concurrent redeems consume exactly one pass; loser receives `400` or `409` | no client operation/idempotency ID is exposed in current request shape; after a lost response, state read-back can help but a replay-specific contract is not proven | authoritative DevPass status/pass counts can show resulting state | no auth/payment material retained | POST + status read | upstream `dev-plans-reset-passes.spec.ts`; Reset Pass docs | `PARTIAL_AUTHORITY` |
| Reset Pass | purchase | `POST /dev-plans/reset-pass/purchase` | authenticated DevPass user with active tier and saved payment method | empty JSON body; server derives tier price | success returns resulting purchased pass count and amount; decline/non-succeeded intent rejected; webhook fulfillment dedupes by PaymentIntent ID | webhook/synchronous fulfillment dedupe is proven **after a PaymentIntent exists**, but current request shape exposes no client purchaseId and current evidence does not prove a stable client replay key for double-submit/lost-response creation | **not proven safe for ambiguous client retry**: a second request could create another logical PaymentIntent unless an upstream route-level dedupe contract not present in the pinned evidence is proven | transaction/pass-count state exists, but no client-stable pre-send operation ID is proven | saved payment method stays server-side; Local Usage Dashboard must never capture it | POST + status/billing read | upstream reset-pass route tests | `UNSAFE_RETRY_MODEL` |
| Reset Pass | refund purchased unused pass | self-refund/billing-history path exists upstream; exact Local Usage Dashboard client route contract not frozen here | authenticated billing session | transaction/refund identity and eligibility are upstream-managed | docs state unused purchased pass may be self-refunded within 7 days; payment method receives refund and pass is removed | refund implementation exists upstream, but Local Usage Dashboard-specific exact request/replay contract was not proven in this investigation | ambiguous retry/reconcile semantics not sufficiently proven for a future Local Usage Dashboard owner | billing history is the natural result surface but `NV-BILLING-HISTORY-AUTH` remains separate | invoice/payment details require separate minimization | write + billing read | upstream Reset Pass docs; `self-refund` source/tests discovered | `PARTIAL_AUTHORITY` |
| Auto-Reload | PAYG/Auto-Reload settings | `PATCH /dev-plans/settings` | authenticated DevPass dashboard session | `devPlanPaygEnabled`; `autoTopUpEnabled`; `autoTopUpThreshold`; `autoTopUpAmount` | success returns normalized state; `/dev-plans/status` exposes enabled/threshold/amount; disabling overflow disables Auto-Reload | repeated PATCH of the same desired state is state-like, but no explicit client idempotency key / revision / ETag / compare-and-swap contract is proven | lost response can be reconciled by GET status, but parallel settings writers/version-conflict semantics are not proven; enabling may later cause monetary actions | `/dev-plans/status` is an authoritative read-back for current settings | never expose saved payment method or payment-failure internals beyond safe normalized status | PATCH + status GET | upstream `dev-plans-payg.spec.ts`; official PAYG docs | `PARTIAL_AUTHORITY` |

## Top-up authority details

The pinned upstream regression proves all of the following:

- unauthenticated requests are rejected;
- an active DevPass plan is required;
- allowed top-up range is bounded (official docs/tests: $10–$5,000);
- `purchaseId` is mandatory;
- the same logical purchase attempt reuses the same org-scoped Stripe idempotency key;
- a new purchaseId creates a new charge identity;
- reusing a key with conflicting details surfaces a distinct `409` idempotency conflict rather than an opaque server error;
- card declines and non-succeeded PaymentIntents do not report success;
- fulfillment metadata identifies the organization and base credit amount;
- webhook transaction handling deduplicates fulfillment on PaymentIntent identity.

This is the only family in this investigation that satisfies the design requirement for a **stable client-generated identity before send plus server-side deduplicated replay**.

### Local Usage Dashboard future constraint

Even with authority proven, a future versioned design must create the logical purchase ID **before send** and preserve the same ID until the result is reconciled. It must never generate a new purchase ID merely because a response was lost.

The result state must distinguish:

- succeeded/reconciled;
- definitively failed;
- unresolved/reconcile required.

No automatic background top-up is authorized.

## Reset Pass findings

### Redeem

The upstream route has strong state/race protection. A concurrency regression sends two redeems together and proves exactly one wins; the other is rejected. Included passes are consumed before purchased passes and state/eligibility guards are source-backed.

That is useful server safety, but it is not the same thing as a durable client operation identity. A future Local Usage Dashboard redeem design still needs an explicit reconcile rule for a lost response.

### Purchase

The purchase route derives the price from the active tier and does not let the request body choose an arbitrary price. Card failure does not grant a pass, and fulfillment is deduplicated by PaymentIntent ID once a PaymentIntent exists.

However the pinned client request shape is an empty JSON body and this investigation did not prove a client-supplied pre-send purchase identifier equivalent to top-up `purchaseId`. Therefore a lost response/double-submit can not be declared duplicate-charge-safe for a new Local Usage Dashboard client.

Result: **keep purchase blocked** until a stable route-level idempotency/replay contract is proven.

### Refund

Official Reset Pass documentation establishes a self-refund policy for an unused purchased pass within 7 days, and upstream self-refund implementation/tests exist. This investigation did not freeze the exact client route/input/replay contract. Billing-history/privacy authority is also tracked separately.

Result: **PARTIAL_AUTHORITY**, not enough for Local Usage Dashboard write design.

## Auto-Reload findings

Pinned upstream tests prove:

- `PATCH /dev-plans/settings` updates PAYG/Auto-Reload state;
- `autoTopUpThreshold` and `autoTopUpAmount` are range validated;
- disabling PAYG overflow disables Auto-Reload;
- `/dev-plans/status` returns the resulting Auto-Reload state.

Official documentation states Auto-Reload charges the saved card when balance falls below threshold and documents payment-failure backoff/automatic disable behavior.

What is **not** yet proven as a stable Local Usage Dashboard client contract:

- revision/ETag/CAS semantics for concurrent settings writers;
- exact ambiguity semantics if a PATCH response is lost while another client edits settings;
- a bounded safe public representation of payment-failure state;
- whether enabling below the current threshold can trigger an immediate charge in every relevant state and how that should be confirmed to the user.

Because this setting can cause future monetary actions, these gaps keep `V-AUTORELOAD-WRITE` blocked.

## Authentication / privacy decision

No future transaction surface may persist or emit:

- session cookies;
- API/auth headers;
- Stripe customer/payment-method objects;
- card/bank information;
- billing addresses;
- raw PaymentIntent/refund payloads;
- raw server transaction rows.

Potentially acceptable future reconciliation state is limited to an allowlisted, non-secret logical operation ID (for example the top-up purchaseId), action kind, desired source-backed amount, and coarse operation status when required.

## No live-write evidence rule

No part of this investigation depended on performing a charge, buying/redeeming/refunding a pass, or changing Auto-Reload settings on the user's account.

Where static/pinned evidence was insufficient, the verdict remained partial/blocked.

## Truth-matrix decisions

- `V-TOPUP-WRITE`: authority prerequisite moves from `TBD` to **PROVEN** for the pinned upstream top-up contract. Product implementation still waits for a separate versioned write-owner design and the feature/stabilization gate.
- `V-RESET-WRITE`: remains **BLOCKED** because the family includes purchase/refund paths without a fully proven pre-send idempotency/reconcile contract for a Local Usage Dashboard client.
- `V-AUTORELOAD-WRITE`: remains **BLOCKED** because concurrency/ambiguity/payment-trigger semantics are only partial.

## Product-impact statement

This investigation changes repository evidence only. It adds no Plugin/Engine/Manager transaction owner, performs no live account mutation, consumes no product version, and must leave shipped artifacts byte-identical.
