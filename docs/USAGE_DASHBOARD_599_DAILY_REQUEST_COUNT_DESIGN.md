# Local Usage Dashboard 5.99 — Daily Server Request Count Design

Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1487  
Accepted baseline: 5.98 physical acceptance on #1055 comment `5550769913`

## Fresh baseline

At design freeze:

- production branch: `release-usage-dashboard`
- production release SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`
- Product: `3.0.0-alpha.5.98`
- Engine: `1.6.34`
- Manager: `1.3.6`
- managed CLI: `1.10.0`
- managed Models: `1.280.0`
- contracts: `snapshot 1 / recent-request 1`
- physical verdict: `PASS_PHYSICAL`

Mutable branch heads and free regression numbers must be re-read immediately before implementation.

## Goal

Add one source-honest request-count line to the existing Overview card without changing the existing daily-money meaning.

Target presentation:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 17회
```

Unavailable source:

```text
오늘 요청 · 서버 집계 —
```

## Truth boundary: money and requests are different windows

The existing `observedDailyTotal` is a local KST-day observation delta:

- DevPass `todayUsed` is derived from the current monthly counter minus the first locally observed same-day baseline;
- Credits `todayUsed` uses the existing local same-day balance observation logic;
- `todayOverviewMetrics()` combines those observed values.

It is therefore not an authoritative whole-KST-day server total.

The new request count is instead derived from official `/activity` daily buckets. The UI must keep that distinction visible by retaining `일간 총 사용량 · 관측` for money and labeling the request line `오늘 요청 · 서버 집계`.

Do not present both values as if they share identical temporal coverage.

## Existing source authority

No Engine source extension is required. Existing normalized Analytics windows already preserve bounded daily scalar evidence:

- `dailySeries.range`
- `dailySeries.granularity`
- `dailySeries.buckets[].date`
- `dailySeries.buckets[].requestCount`

`requestCount` is authoritative only when it is an explicit finite non-negative scalar. Explicit `0` is known zero; missing/invalid is UNKNOWN/null.

The daily series comes from official activity rows. No local reconstruction is allowed.

## Do not use merged `all.dailySeries` as the primary source

The Engine's `mergeUsageActivities()` intentionally keeps a merged daily series only when exactly one contributing input owns one. A normal DevPass + Credits `all` scope may therefore have `dailySeries == null` even when both child scopes have valid source series.

5.99 must compose the count from child scopes rather than treating missing merged-all metadata as zero or as proof that no requests occurred.

## Scope composition

Use the current normalized Analytics scopes:

- DevPass: `analyticsScopes.scopes.devpass`
- Credits: `analyticsScopes.scopes.credits`

Only scopes applicable to the current normalized account state participate. A missing applicable scope makes the combined value UNKNOWN; it must not be silently omitted from the sum.

For each applicable scope:

1. inspect already-fetched 7d and 30d Analytics windows;
2. accept only a source series with `granularity === "daily"`;
3. normalize bucket dates to KST date keys;
4. require the exact current KST date bucket;
5. require explicit finite non-negative `requestCount`;
6. preserve explicit zero as `0`.

Series selection should prefer a valid current-day 7d series, then valid current-day 30d fallback. Both are existing Analytics work; this feature adds no fetch.

The final total is `sum(per-scope requestCount)` only when every applicable scope is complete for the same KST date.

Fail closed to UNKNOWN when any applicable scope has:

- no usable Analytics window;
- non-daily granularity;
- no current-KST-day bucket;
- missing/invalid request count.

Do not sum only the available child scopes, because that would create a truthful-looking undercount.

## Forbidden backfills

Never reconstruct or estimate the daily request count from:

- Request Ledger retention;
- recent request IDs;
- hourly rows;
- local UI events;
- model/provider aggregates;
- token totals;
- cost;
- account counters;
- another time window without a matching daily bucket.

Request Ledger is intentionally bounded/local-observed and is not authority for whole-day server request count.

## UI design

Change only the existing Overview `일간 총 사용량 · 관측` mini card.

Keep:

- existing title;
- existing dollar value;
- existing money computation.

Add one secondary line:

- known: `오늘 요청 · 서버 집계 N회`
- unknown: `오늘 요청 · 서버 집계 —`

No new card, tab, chart, filter, modal, badge, setting, or persistence preference.

## Diagnostics

Add one bounded source-truth line such as:

```text
Daily request count: date 2026-09-05 KST · total 123 · devpass 118@7d · credits 5@7d · source server-daily · state ok
```

UNKNOWN should remain bounded, e.g.:

```text
Daily request count: date 2026-09-05 KST · total — · source server-daily · state today-bucket-missing
```

Allowed state vocabulary:

- `ok`
- `scope-unavailable`
- `series-unavailable`
- `granularity-not-daily`
- `today-bucket-missing`
- `count-unknown`

Diagnostics must not expose project IDs, organization IDs, auth material, prompts, responses, headers, or raw source rows.

## No new I/O or lifecycle owner

Forbidden solely for this feature:

- no new endpoint;
- no additional `/activity` request;
- no additional CLI invocation;
- no timer/poller/background refresh;
- no persistence owner;
- no local daily-history database;
- no listener/scheduler;
- no request-identity field or dedupe change.

Reuse the already-normalized Analytics state at render/diagnostic time.

## Candidate identity

Fresh design-time searches found no real Product 5.99 release authority and no real P65 Usage Dashboard regression.

Tentative implementation tuple:

- Product `3.0.0-alpha.5.99`
- Engine `1.6.34` exact-byte unchanged
- Manager `1.3.6` semantic unchanged
- managed CLI `1.10.0`
- managed Models `1.280.0`
- contracts `1/1`
- P65 tentatively reserved

The Plugin UI/product bytes change. Engine behavior need not change because the required daily metadata already exists. Manager may receive the normal embedded Product identity/materialization update without a semantic Manager version bump.

Fresh-check all of the above immediately before implementation.

## Structured release evidence

If production remains the accepted 5.98 release at implementation freeze, both structured evidence roles should resolve to:

- Product `3.0.0-alpha.5.98`
- release SHA `82c4f900cf548068d1eada957c982a5d78f1347b`
- issue `1055`
- physical acceptance comment `5550769913`
- verdict `accepted`

Do not copy these identities if fresh authority has moved.

## Regression plan

P65 must at minimum lock:

1. fresh release tuple and 5.98 accepted baseline;
2. `observedDailyTotal` money computation remains unchanged;
3. UI text is exactly source-qualified as `오늘 요청 · 서버 집계`;
4. request total uses only existing server daily scalar evidence;
5. current KST date equality is mandatory;
6. explicit zero renders `0회`;
7. missing count renders `—`, never zero;
8. missing applicable scope fails closed rather than undercounting;
9. non-daily granularity fails closed;
10. missing current-day bucket fails closed;
11. 7d current-day daily source is preferred; 30d is bounded fallback;
12. DevPass + Credits sum only after every applicable scope is complete for the same date;
13. missing `all.dailySeries` does not create zero or block valid child-scope composition;
14. Request Ledger is never used as whole-day fallback authority;
15. no new I/O/timer/poller/persistence/history/identity owner;
16. Engine `1.6.34` remains byte-identical;
17. Manager semantic behavior remains `1.3.6` unless fresh evidence proves a required bump;
18. P64 plus E18/E19/E20/E21 remain GREEN;
19. full Usage Dashboard registry GREEN;
20. deterministic materialization and release-control invariants remain intact.

## Physical acceptance after deployment

The user action remains only the normal PocketRisu `+` update and UI/Diagnostics capture.

Accept when:

- deployed tuple is the exact promoted release;
- `READY · Health ok · active errors 0 · failures 0`;
- existing daily observed money remains normal;
- known `오늘 요청 · 서버 집계 N회` agrees with the new Diagnostics line;
- UNKNOWN/`—` is accepted when source evidence is incomplete;
- no duplicate request rows or request-identity churn;
- no unexpected extra network/CLI/refresh work attributable to this feature;
- existing DevPass, Credits, Analytics, Billing, Premium, PAYG, cycle summary, Cost Drivers, cache, service-tier, outcome and HTTP surfaces remain healthy.

Do not generate artificial or chargeable traffic just to force a positive count or edge case.

## Non-goals

- no redesign of daily money semantics;
- no calendar-day cost replacement;
- no Request Ledger retention expansion;
- no hourly-history feature;
- no provider/model breakdown on this mini line;
- no billing-cycle semantics change;
- no Engine source-contract expansion;
- no new release-control generation.

## Frozen verdict

**5.99 DESIGN FROZEN — Daily Server Request Count on Observed-Day Card.**

One bounded UI enhancement: preserve the current observed-dollar value and add a clearly source-qualified, fail-closed server daily request count.