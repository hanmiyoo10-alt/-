# Local Usage Dashboard — This-Cycle Summary Design

Status: **DESIGN READY — implementation not started; versioned implementation remains gated**

Idea: `V-CYCLE-SUMMARY`  
Parent: #348  
Truth matrix: `V-CYCLE-SUMMARY` is `PROVEN`

## Fresh baseline

Design-time release authority:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- deployment branch `release-usage-dashboard`

Other versioned designs are already queued. Exact implementation versions must be re-resolved from fresh repository authority immediately before source changes.

## Fresh source finding

Current 5.81 already has the ingredients for a truthful summary, but not in one usable fidelity path:

1. authenticated DevPass status provides the authoritative billing boundary fields `billingCycleStart` / `expiresAt`;
2. the existing DevPass capture already requests `/activity` for `24h`, `7d`, and `30d` using timezone `Asia/Seoul`;
3. the capture sanitizer already retains safe daily scalar fields including `date`, `requestCount`, `inputTokens`, `cachedTokens`, `totalTokens`, and `cost`, plus the response `granularity`;
4. pinned upstream `/activity` defines those daily fields as first-class activity schema fields and distinguishes `daily` / `hourly` granularity;
5. current Engine `normalizeUsageActivity()` folds activity buckets into aggregate totals/model-provider summaries and does not preserve a bounded public daily scalar series.

Therefore the feature does **not** need a new endpoint. The required Engine change is to preserve just enough existing daily scalar evidence to decide whether a billing-cycle-qualified summary is truthful.

## Primary goal

Add a compact DevPass summary surface showing:

- total requests;
- total tokens;
- cached input share;
- peak request day;
- the exact window/fidelity label used.

The feature must prefer truth over the words “this cycle”. If the current source window cannot prove the billing-cycle interval exactly enough, it must show an explicitly labelled `최근 30일` or `최근 7일` summary instead.

## Scope

This is a **DevPass billing-cycle surface**.

Do not mix Credits organization activity into the billing-cycle summary. Credits has a separate account/balance model and no authority to inherit the DevPass billing boundary.

The existing all/devpass/credits Analytics scopes remain unchanged.

## Source authority

### Billing boundary

Use only normalized authenticated DevPass status:

- `billingCycleStart`
- `expiresAt`

Do not create a cycle boundary from plan name, monthly cadence, calendar month, first observed request, or `30d` arithmetic.

### Activity buckets

Reuse only the existing authenticated DevPass `/activity` capture.

Safe bucket fields for this feature:

- `date`
- `requestCount`
- `inputTokens`
- `cachedTokens`
- `totalTokens`

Metadata:

- `granularity`
- range identity (`7d` / `30d`)

No model breakdown is required for this feature.

## Engine design

### Bounded daily scalar series

Extend the normalized DevPass long-window activity result with a bounded daily series such as:

```text
dailyBuckets: [
  {
    date,
    requestCount,
    inputTokens,
    cachedTokens,
    totalTokens
  }
]
dailyGranularity: "daily" | "unknown"
```

Rules:

- only official sanitized `/activity` bucket rows may populate this series;
- preserve explicit finite zero values as known zero;
- missing/invalid individual metric fields stay `null`/UNKNOWN, not zero;
- do not include `modelBreakdown`, api-key breakdown, user breakdown, project/org IDs, prompts, response content, auth material, or headers;
- keep the series bounded to the source long-window response; never grow it as a local history database;
- existing aggregate totals/providers/models remain unchanged.

This is additive metadata on the existing snapshot path.

## Window qualification

### `billing-cycle-exact`

The UI may use the label **`이번 사이클`** only when all of the following are true:

1. `billingCycleStart` is an explicit valid timestamp;
2. the selected activity source is DevPass `30d` and reports `daily` granularity;
3. the billing start converted to `Asia/Seoul` aligns exactly to a daily bucket boundary (00:00:00.000 KST);
4. the 30d source window fully covers that start boundary; do not use a partially covered oldest bucket;
5. the current time is not before the start;
6. if an explicit `expiresAt` says the period has already ended, do not present the active summary as “this cycle” without a separately proven current boundary;
7. every metric used by a derived component is explicit for the selected buckets.

If any condition fails, the feature must not use a billing-cycle label.

### `window-30d`

Fallback preference when an exact cycle cannot be proven:

- use the existing DevPass `30d` activity window;
- label it **`최근 30일`**;
- show only components whose source metrics are explicit.

### `window-7d`

If 30d is unavailable but 7d is available:

- label **`최근 7일`**;
- use the same component-level UNKNOWN rules.

### unavailable

If neither usable long window exists, show `—` / unavailable; do not reconstruct a window from local Request Ledger retention.

## Metric definitions

### Total requests

`sum(requestCount)` over selected explicit buckets.

If any selected bucket lacks an authoritative request count, the total is UNKNOWN for this feature.

### Total tokens

`sum(totalTokens)` over selected explicit buckets.

Do not reconstruct missing total tokens from model catalog, cost, or request count.

### Cached input share

Label explicitly as **`Cached input share`**, not request cache HIT rate.

Allowed formula:

```text
sum(cachedTokens) / sum(inputTokens) * 100
```

Only when:

- every selected bucket has explicit finite `cachedTokens` and `inputTokens`;
- summed input tokens are greater than zero.

If denominator is zero, display `—`, not `0%`.

Do not mix provider-cache token share with gateway request replay HIT rate.

### Peak request day

Choose the selected bucket with maximum explicit `requestCount`.

- display KST bucket date + request count;
- if total requests are zero, peak day is `—`;
- ties use the earliest source bucket date for deterministic rendering;
- do not use cost/model/token volume to choose the peak unless a future separately designed metric says so.

## UI design

Primary placement: DevPass tab, close to the existing account/allowance surfaces.

Compact card title is fidelity-dependent:

- `이번 사이클` when `billing-cycle-exact`;
- `최근 30일` when `window-30d`;
- `최근 7일` when `window-7d`.

Rows/minis:

- `요청`
- `토큰`
- `Cached input share`
- `Peak day`

A small source note should identify `DevPass /activity · daily · KST` and the current fidelity mode.

Do not add another analytics tab or duplicate the existing 7d/30d provider/model tables.

## Diagnostics

Add one bounded line, for example:

```text
Cycle summary: mode billing-cycle-exact · window 2026-08-01→now KST · requests 123 · tokens 456789 · cached input 42.1% · peak 2026-08-12/31
```

Fallback example:

```text
Cycle summary: mode window-30d · cycle qualification partial-start · requests ...
```

Diagnostics should make the fail-closed reason visible with a bounded enum, e.g.:

- `ok`
- `boundary-missing`
- `boundary-not-kst-day`
- `coverage-insufficient`
- `granularity-not-daily`
- `period-ended`
- `metric-incomplete`
- `window-unavailable`

Do not print raw project/org identifiers.

## No new I/O

This design intentionally reuses existing work.

Forbidden:

- no second `/activity` request;
- no new custom `from/to` request solely for this card;
- no new `/logs` request;
- no CLI invocation beyond the current analytics captures;
- no new timer/poller/background refresh;
- no extra persistence cycle;
- no local historical database.

## Version / contracts

An independent implementation changes Engine normalized snapshot metadata and Plugin UI, so it requires the next fresh monotonic:

- Product version;
- Engine version.

Expected unchanged unless fresh evidence proves otherwise:

- Manager, currently `1.3.0`;
- snapshot contract `1`;
- recent-request contract `1`;
- Managed CLI version.

The additive daily scalar metadata must remain backwards-compatible with snapshot v1 consumers.

## Regression plan

At implementation time add the next available regression and lock at least:

1. fresh release tuple;
2. deterministic Engine build and manifest SHA;
3. daily series populated only from official sanitized activity buckets;
4. explicit zero bucket values remain zero;
5. missing bucket metric remains UNKNOWN, not zero;
6. model/api-key/user breakdown excluded from the new public series;
7. no project/org/auth/body/header leakage;
8. cycle label requires explicit `billingCycleStart`;
9. cycle label requires daily granularity;
10. cycle label requires exact KST day-boundary alignment;
11. partial oldest-window coverage rejects cycle qualification;
12. expired/ended period rejects active cycle qualification;
13. 30d fallback labelled exactly as 30d, not billing cycle;
14. 7d fallback labelled exactly as 7d;
15. total requests sums explicit selected buckets only;
16. total tokens sums explicit selected buckets only;
17. cached input share uses cached/input tokens only and denominator >0;
18. cached input share is never called request HIT rate;
19. peak day uses request count and deterministic tie rule;
20. zero-request window has no fake peak day;
21. Credits activity is not merged into DevPass cycle summary;
22. no additional HTTP/CLI/timer/persist owner;
23. existing analytics, Request Ledger, Reset Pass/PAYG, Premium allowance and diagnostics regressions remain GREEN;
24. full registry GREEN.

## Physical acceptance after future deployment

On PocketRisu verify:

- fresh deployed tuple / READY / Health ok / active errors 0 / failures 0;
- card title matches the diagnostics fidelity mode (`이번 사이클`, `최근 30일`, or `최근 7일`);
- total requests/tokens match Diagnostics;
- cached input share is shown only when source coverage exists;
- peak day/date is plausible and matches Diagnostics;
- no Credits activity appears in the DevPass cycle card;
- no extra CLI/network/refresh work is attributable to the card;
- existing Analytics, DevPass account, Premium, Reset Pass/PAYG, Recent Requests and floating widget remain correct.

A fallback window or UNKNOWN component is a valid acceptance result when the cycle boundary cannot be represented exactly. Do not generate traffic, change billing settings, or spend money solely to force an exact-cycle case.

## Non-goals

- no calendar-month summary;
- no synthetic fixed 30-day billing cycle;
- no Credits billing-cycle summary;
- no request-level PAYG funding classification;
- no model/provider cost-driver UI;
- no Credits cost composition;
- no billing history/invoice view;
- no billing or payment writes;
- no new notification system;
- no attempt to backfill data older than the existing source windows.

## Gate

This design being `DESIGN READY` does not override the existing stabilization/physical-acceptance gate. Versioned implementation starts only after the current production acceptance state and release authority are freshly confirmed.