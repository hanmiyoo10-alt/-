# Local Usage Dashboard — PAYG Overflow + Auto-Reload Read-Only Status Design

Status: **DESIGN READY — implementation not started; versioned implementation remains gated**

Idea: `V-PAYG-STATUS`  
Parent: #348  
Truth matrix: `V-PAYG-STATUS` is `PROVEN`

## Fresh baseline

Design-time release authority:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- deployment branch `release-usage-dashboard`

Queued versioned designs may ship first. Exact implementation versions must be re-resolved from fresh repository authority immediately before source changes.

## Fresh source finding

This feature is not greenfield.

Current 5.81 already exposes a DevPass `Reset Pass · PAYG` read-only surface with PAYG overflow state and Regular Credits, and P5 locks those labels. The current capture tap also already allowlists all five upstream status fields needed for the expanded read-only surface:

- `devPlanPaygEnabled`
- `regularCredits`
- `autoTopUpEnabled`
- `autoTopUpThreshold`
- `autoTopUpAmount`

The remaining gaps are:

1. Engine `40-sources.part.mjs` does not yet promote the three Auto-Reload fields into normalized DevPass status;
2. current PAYG boolean normalization uses compatibility coercion that can collapse a missing value to `false`;
3. Plugin `devpassAccount.paygEnabled` also collapses non-true/missing values to `false`;
4. the DevPass read-only surface does not show Auto-Reload state/threshold/amount or explicit spendability semantics.

## Upstream authority

Pinned LLMGateway DevPass usage consumes authenticated `/dev-plans/status` and passes the following fields into its PAYG surface:

- `devPlanPaygEnabled`
- `regularCredits`
- `autoTopUpEnabled`
- `autoTopUpThreshold`
- `autoTopUpAmount`

Pinned `dev-plans-payg.spec.ts` proves the status endpoint returns PAYG opt-in and regular balance, returns all three Auto-Reload fields after configuration, and disables Auto-Reload when PAYG overflow is disabled.

This design uses that read authority only. It does not authorize any mutation.

## Primary goal

Extend the existing DevPass `Reset Pass · PAYG` read-only surface into a truth-preserving PAYG Overflow + Auto-Reload status view without adding any payment/write control.

## Engine fidelity design

### Explicit tri-state booleans

For PAYG and Auto-Reload state, use explicit boolean fidelity:

- source `true` -> `true`
- source `false` -> `false`
- missing/null/non-boolean -> `null` / UNKNOWN

Do not use `Boolean(value)` for these public truth fields.

Canonical/compatibility input aliases may remain, but a string like `"false"` must not become true merely because it is non-empty. Prefer exact booleans from the authenticated status payload.

### Numeric fields

Promote these existing captured values through `normalizeIndependentDevPassStatus()`:

- `regularCredits`
- `autoTopUpThreshold`
- `autoTopUpAmount`

Accept only finite numeric/coercible source values. Missing/invalid stays UNKNOWN. Do not substitute upstream UI defaults when the source omits threshold or amount.

### No capture expansion

The capture sanitizer already allowlists all five required fields. Do not widen the sanitizer or retain payment method, Stripe, card, customer, invoice, auth, cookie, session or unrelated billing metadata.

## Plugin normalization

`devpassAccount` should preserve:

- `paygEnabled: true | false | null`
- `regularCredits: number | null`
- `autoTopUpEnabled: true | false | null`
- `autoTopUpThreshold: number | null`
- `autoTopUpAmount: number | null`

Missing booleans are not OFF. Missing numeric values are not zero.

## Spendability derivation

A bounded **account-level** spendability label is allowed from the exact read-only status fields:

- PAYG `true` + regular credits `> 0` -> overflow balance available
- PAYG `true` + explicit regular credits `== 0` -> overflow enabled, balance empty
- PAYG `false` + explicit balance `> 0` -> credits held, overflow off
- PAYG UNKNOWN or balance UNKNOWN -> spendability UNKNOWN

This is an account setting/balance interpretation only.

Forbidden wording:

- “this request was paid by PAYG”
- “PAYG is currently covering request X”
- any request-level plan-vs-PAYG funding attribution

`NV-FUNDING-AUTH` proved that request-level funding authority is NOT_PROVEN.

## Auto-Reload presentation

Show read-only fields only when source-backed:

- `Auto-Reload`: ON / OFF / `—`
- `Threshold`: explicit value or `—`
- `Reload amount`: explicit value or `—`

When Auto-Reload is OFF, explicit threshold/amount may still be shown as stored settings, but they must not be described as active trigger values.

When Auto-Reload is UNKNOWN, do not infer OFF from missing threshold/amount.

Do not infer default threshold or amount from current upstream constants.

## UI scope

Keep and expand the existing DevPass `Reset Pass · PAYG` box rather than adding a duplicate panel.

Suggested compact rows:

- `PAYG overflow` — ON / OFF / `—`
- `Regular Credits` — explicit balance / `—`
- `Overflow balance` — 사용 가능 / 잔액 없음 / 보유 중·overflow off / `—`
- `Auto-Reload` — ON / OFF / `—`
- `Reload threshold` — explicit / `—`
- `Reload amount` — explicit / `—`

No toggle, input, top-up button, payment-method status, or mutation affordance.

## Diagnostics

Add one bounded line such as:

`PAYG status: overflow on · credits $12.34 · spendable yes · auto-reload on · threshold $10 · amount $25`

UNKNOWN values remain `—`/unknown.

Diagnostics must not expose org/project/payment identifiers or payment method details.

## Version / contract policy

Because Engine normalized status semantics change and new safe status fields become visible to Plugin, an independent implementation requires a monotonic Product + Engine version update.

At implementation time:

- Product: next fresh monotonic product version;
- Engine: next fresh monotonic Engine version;
- Manager: keep then-current Manager unless unrelated authority changes it;
- snapshot/recent-request contracts: keep `1 / 1` unless fresh compatibility evidence requires otherwise;
- Managed CLI: no version change planned.

## No new I/O

Reuse the existing DevPass account/status capture only.

Forbidden additions:

- no second status request;
- no `/dev-plans/payment-method` request;
- no new CLI launch;
- no new timer/poller/background refresh;
- no new persistence cycle;
- no transaction endpoint;
- no `/logs` work for this feature.

## Transaction boundary

This is read-only despite upstream write APIs existing.

Do not add:

- PAYG enable/disable;
- top-up;
- Auto-Reload enable/disable;
- threshold/amount mutation;
- payment-method management.

`NV-TRANSACTION-AUTH` / #559 remains the prerequisite evidence for any future mutation release; this design does not reopen or weaken those safety boundaries.

## Regression plan

At implementation time add the next available dedicated regression and lock at least:

1. fresh release tuple;
2. capture allowlist remains bounded to the five safe status fields already present;
3. PAYG true/false preserved explicitly;
4. missing PAYG stays UNKNOWN, never OFF;
5. Auto-Reload true/false preserved explicitly;
6. missing Auto-Reload stays UNKNOWN, never OFF;
7. explicit regular credits `0` remains a known zero;
8. missing regular credits stays UNKNOWN;
9. threshold/amount explicit finite values preserved;
10. missing threshold/amount never become current default constants;
11. spendability derives only from explicit PAYG + explicit balance;
12. request-level funding provenance is never inferred;
13. existing Reset Pass fields remain unchanged;
14. existing P5 DevPass parity remains GREEN;
15. no payment method/Stripe/card/customer metadata enters Plugin state/Diagnostics;
16. no new HTTP/CLI/timer/persistence owner;
17. deterministic Engine build + manifest SHA;
18. full registry GREEN.

## Non-goals

- no request-level PAYG funding provenance;
- no Premium allowance work;
- no billing strip work;
- no top-up/payment controls;
- no Auto-Reload mutation;
- no payment method visibility;
- no spend forecasting;
- no notifications;
- no retry/payment failure UI;
- no changing upstream PAYG behavior.

## Physical acceptance after future deployment

On PocketRisu verify:

- fresh deployed tuple / READY / Health ok / active errors 0 / failures 0;
- existing Reset Pass values remain correct;
- PAYG ON/OFF matches source-backed account status;
- missing PAYG would display UNKNOWN rather than OFF;
- Regular Credits matches Diagnostics, including explicit zero;
- account-level overflow balance label follows explicit PAYG + balance only;
- Auto-Reload ON/OFF, threshold and amount appear only when source provides them;
- no top-up/toggle/input/payment mutation controls appear;
- no request-level funding claim appears;
- no extra CLI/network/refresh work attributable to this feature.

If natural account status lacks any optional value, UNKNOWN is a valid acceptance result. Do not change billing settings or spend money solely to manufacture a test case.

## Tool-operation note

During this design turn an accidental non-product sentinel file under `tmp/` was created on `main` and immediately deleted. Net repository tree does not retain it. No Plugin/Engine/Manager/release artifact path was modified by that mistake.
