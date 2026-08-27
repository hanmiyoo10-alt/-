# Local Usage Dashboard — DevPass Weekly Premium Allowance Meter Design

Status: **DESIGN READY — implementation not started**

Idea: `V-PREMIUM-METER`  
Parent: #348  
Classification: product version required · importance high · difficulty medium

## Fresh baseline

Current release authority at design time:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- release branch `release-usage-dashboard`

Other versioned designs are queued but not implemented, so exact future product version must be re-resolved immediately before implementation.

## Current shipped state

This idea is **not** a greenfield meter.

The shipped Plugin already builds a `Premium 주간` bucket from the DevPass status snapshot using:

- `premiumCreditsUsed`
- `premiumWeeklyLimit`
- `premiumWeekResetsAt`

The floating widget already shows Premium remaining/progress and, in detailed mode, a reset countdown and Reset Pass count.

Therefore the remaining parity gap is a **truth-labelled DevPass account surface**, not another copy of the floating widget.

## Authoritative source

The existing authenticated DevPass status capture is sufficient.

Engine `normalizeIndependentDevPassStatus()` already accepts explicit numeric aliases for:

- `premiumCreditsUsed`
- `premiumWeeklyLimit`

and an explicit timestamp for:

- `premiumWeekResetsAt`

No new endpoint, CLI invocation, capture tap, poller, timer or persistence path is required.

The canonical source/truth matrix already marks `V-PREMIUM-METER` as `PROVEN`.

## Primary goal

Add one read-only **Weekly Premium Allowance** card to the DevPass tab that makes the existing source-backed weekly allowance legible without changing its source contract.

The card may show only facts directly present in the normalized DevPass status, plus arithmetic derived solely from explicit used/limit/end values.

## A. Fidelity rules

### Used

- explicit finite non-negative `premiumCreditsUsed` => display;
- missing/invalid/negative => UNKNOWN.

### Limit

- explicit finite positive `premiumWeeklyLimit` => display;
- missing/invalid/non-positive => UNKNOWN for ratio/remaining calculations.

Do not infer a weekly limit from DevPass plan name, plan price, model catalog or Reset Pass price.

### Remaining

Derive only when used and limit are both valid:

`remaining = max(0, limit - used)`

If either input is UNKNOWN, remaining is UNKNOWN.

This clamping is presentation arithmetic only; it must not rewrite the raw source value.

### Percent

Derive only when used is valid and limit is valid/positive:

`percentUsed = used / limit * 100`

UI progress may clamp visual width to 0–100%, but Diagnostics should retain the actual derived percentage so over-limit observations are not silently erased.

### Reset

- render reset date/countdown only from explicit valid `premiumWeekResetsAt`;
- missing/invalid => UNKNOWN;
- never calculate reset as `week start + 7 days`;
- never derive reset from current weekday, locale or billing-cycle dates.

## B. Status semantics

Status is derived only from valid used/limit arithmetic:

- `< 80%` => normal;
- `>= 80% && < 100%` => warning;
- `>= 100%` => exhausted.

These are **local presentation thresholds**, not upstream billing states. UI wording must make that clear and must not claim provider refusal, account suspension or payment behavior.

The 80% threshold is a visual warning only and must not trigger notifications, polling, background work or mutations.

## C. PAYG / funding boundary

Do **not** show `PAYG covering`, `overflow active for this request`, `charged from credits`, or equivalent request-funding claims.

`NV-FUNDING-AUTH` concluded request-level DevPass allowance-vs-PAYG funding is `NOT_PROVEN`; `V-FUNDING-PROVENANCE` remains BLOCKED.

The existing account-level PAYG on/off state may remain visible in its existing account surface, but it is independent from this weekly allowance card.

A depleted Premium allowance plus PAYG enabled must **not** be combined into a claim that subsequent Premium-model requests are funded by PAYG.

## D. Reset Pass boundary

The Premium meter may show a small read-only Reset Pass count only if the value already exists in the current normalized weekly bucket/account state.

It must not:

- infer purchase eligibility;
- add buy/redeem/refund controls;
- claim a pass is currently usable based only on plan name or price;
- alter existing Reset Pass · PAYG parity UI.

`V-RESET-WRITE` remains a separate blocked transactional feature.

## E. UI placement

Add the card inside the **DevPass tab**, near the existing DevPass account / Reset Pass surfaces.

Suggested compact fields:

- `사용` — explicit Premium weekly used;
- `한도` — explicit weekly limit;
- `남음` — derived only from known used+limit;
- `%` — derived only from known used+limit;
- `리셋` — explicit reset timestamp/countdown;
- optional status chip: `주의` / `소진` under the threshold rules above.

UNKNOWN components show `—` rather than zero.

The existing floating widget remains unchanged unless implementation needs a tiny shared formatter extraction. Do not redesign the widget in this release.

## F. Diagnostics

Add one bounded line, for example:

`Premium allowance: used 12.5 · limit 50 · remaining 37.5 · 25.0% · reset <explicit|—> · state normal`

Rules:

- values come from the same normalized source as the card;
- UNKNOWN stays `—` / `unknown`;
- no org/project/payment identifiers;
- no plan-based inferred limit;
- no funding-source claim.

## Version / contract impact

This is expected to be **Plugin/product-only** when implemented because the necessary Engine source fields already exist and are already normalized.

Expected component policy:

- Product: next monotonic version at implementation time;
- Engine: keep the then-current Engine version unless implementation evidence proves an Engine fidelity fix is necessary;
- Manager: `1.3.0` unless independently changed beforehand;
- snapshot/recent-request contracts: remain `1 / 1` unless fresh implementation evidence proves incompatibility.

Never force a remembered product version because #572/#575/#577 or another release may ship first.

## No new I/O

Forbidden additions:

- no new HTTP endpoint;
- no new CLI invocation;
- no new `/logs` work;
- no timer/poller/background refresh;
- no new persistence cycle;
- no model-catalog query;
- no payment/write API.

## Regression plan

At implementation time add the next available dedicated regression and lock at least:

1. fresh product/Engine/Manager/contracts tuple;
2. explicit used/limit/reset values reach the Premium card;
3. missing/invalid used => UNKNOWN, not zero;
4. missing/invalid/non-positive limit => ratio/remaining UNKNOWN;
5. remaining derives only from known used+limit;
6. percentage derives only from known used+positive limit;
7. visual progress clamp does not rewrite actual diagnostics percentage;
8. warning threshold begins at 80%;
9. exhausted begins at 100%;
10. reset renders only from explicit reset source;
11. no synthetic seven-day reset arithmetic;
12. no plan/price/model inference for usage or limit;
13. no request funding/PAYG-overflow claim;
14. existing Reset Pass/PAYG UI stays intact;
15. existing floating Premium widget remains behaviorally unchanged;
16. no extra network/CLI/timer/persist owner;
17. P5 DevPass parity, lifecycle, Request Ledger and full registry remain GREEN.

## Non-goals

- no Premium-vs-Regular request model classification;
- no request-level funding provenance;
- no PAYG/Auto-Reload expansion;
- no Reset Pass mutation;
- no billing-cycle strip;
- no service-tier or HTTP-status work;
- no notification/alert system;
- no changes to Premium allowance accounting semantics.

## Physical acceptance after future deployment

On PocketRisu verify:

- fresh deployed tuple / READY / Health ok / active errors 0 / failures 0;
- DevPass tab shows the Premium allowance card on mobile;
- used/limit values match source-backed Diagnostics;
- percentage and remaining match those explicit values;
- reset timestamp/countdown appears only when source provides it;
- missing components display `—`, never invented zero;
- warning/exhausted state follows only the numeric threshold;
- no PAYG funding claim appears;
- existing floating Premium widget and Reset Pass/PAYG surface remain correct;
- no extra CLI/network/refresh behavior attributable to the card.

If the current account does not expose one of used/limit/reset, that component is expected to remain UNKNOWN; do not manufacture test data or purchase anything solely to exercise the UI.
