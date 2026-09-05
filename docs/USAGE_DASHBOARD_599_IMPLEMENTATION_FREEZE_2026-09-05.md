# Local Usage Dashboard 5.99 — Implementation Freeze

Date: 2026-09-05 KST  
Status: **IMPLEMENTATION DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1487  
Per-scope amendment: #1489  
Design-freeze transaction: #1492  
Accepted production baseline: #1055 comment `5550769913` (`PASS_PHYSICAL`)

This document is the implementation-ready consolidation of:

- `docs/USAGE_DASHBOARD_599_DAILY_REQUEST_COUNT_DESIGN.md`;
- `docs/USAGE_DASHBOARD_599_DAILY_REQUEST_COUNT_BREAKDOWN_AMENDMENT.md`.

Where this document is more specific, it controls implementation. In particular, it refines the daily-series selection order from the earlier `7d -> 30d` proposal to `24h -> 7d -> 30d` while retaining all fail-closed source-fidelity rules.

## 1. Fresh authority at freeze

Immediately before this design transaction:

- repository: `hanmiyoo10-alt/-`;
- main: `0eb04f1899b16e46f3830c26f88fe7042d0df829`;
- production branch: `release-usage-dashboard`;
- production SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`;
- Product: `3.0.0-alpha.5.98`;
- Engine: `1.6.34`;
- Manager: `1.3.6`;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- snapshot / recent-request contracts: `1 / 1`;
- production physical verdict: `PASS_PHYSICAL`.

Fresh search found no real `.github/usage-dashboard/releases/5.99.json`, no real `plugins/usage-dashboard/tests/p65-*`, and no open 5.99 release PR. Product 5.99 and P65 are therefore available at this freeze, but must be re-read immediately before implementation because branch heads and free regression numbers are mutable authority.

## 2. User-visible goal

Enhance only the existing Overview `일간 총 사용량 · 관측` mini card.

Complete source example:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 17회
DevPass 12회 · Credits 5회
```

Partial source example:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 —
DevPass 12회 · Credits —
```

Explicit zero remains visible:

```text
오늘 요청 · 서버 집계 0회
DevPass 0회 · Credits 0회
```

A structurally proven non-applicable scope may render `미적용`. UNKNOWN, known zero, and non-applicable are different states and must never collapse into each other.

## 3. Critical truth boundary: the dollar and request windows differ

The existing money value remains untouched.

`todayOverviewMetrics(d)` currently derives:

- `devToday` from the locally observed same-KST-day DevPass monthly-counter delta;
- `creditsToday` from the existing locally observed same-KST-day Credits logic;
- `observedDailyTotal` from those observed values.

Therefore `일간 총 사용량 · 관측` is not an authoritative server whole-calendar-day dollar total. 5.99 must not rename or reinterpret it.

The new request values instead come from official server activity daily buckets already normalized as `dailySeries`.

The UI deliberately keeps both provenance words:

- money: `관측`;
- requests: `서버 집계`.

Do not visually imply identical temporal coverage.

## 4. Existing source authority

No new Bridge/Engine source is needed.

`plugins/usage-dashboard/src/16-usage-analytics.part.js` already preserves:

```text
dailySeries.range
dailySeries.granularity
dailySeries.buckets[].date
dailySeries.buckets[].requestCount
```

`normalizeDailyScalarSeries()` preserves an explicit finite non-negative `requestCount`, including exact zero, and converts missing/invalid values to `null`.

The Engine already derives this series from official activity rows. The source path is therefore existing server truth; 5.99 is a pure selection/presentation feature at Plugin level.

## 5. Why merged `all.dailySeries` is not authority

The Engine's aggregate merge retains a merged daily series only when exactly one contributing input owns one. A normal DevPass + Credits aggregate can therefore have `all.dailySeries == null` while the child scopes each contain valid daily evidence.

5.99 must not use `analyticsScopes.scopes.all.dailySeries` as primary authority and must never interpret its absence as zero requests.

The truthful total is composed from independent child scopes.

## 6. Frozen source-selection order: 24h -> 7d -> 30d

For each child scope, inspect existing normalized Analytics windows in this exact order:

1. `24h`;
2. `7d`;
3. `30d`.

A window is usable only when all of these are true:

- its `dailySeries` exists;
- `dailySeries.granularity === "daily"`;
- it contains a bucket whose normalized KST date key exactly equals the current KST date;
- that bucket has an explicit finite non-negative `requestCount`.

The first usable window wins.

### Why 24h-first is safe

This rule does **not** use a rolling `totalRequests24h` value as today's request count.

It uses only a date-labelled bucket inside a source series whose granularity is explicitly `daily`, then requires exact equality with today's KST date. At any instant the current KST day is younger than 24 hours, so a current-day daily bucket present in the already-fetched 24h source is sufficient evidence for that day's current accumulated server count.

Using the current-day bucket also avoids waiting on longer-window refreshes when 7d/30d are intentionally served stale or refreshed secondarily.

If 24h lacks a valid current-day daily bucket, selection fails over to 7d, then 30d. It never falls back to rolling 24h totals, Request Ledger rows, or inferred arithmetic.

## 7. Pure Plugin truth owner

The cross-scope selector belongs in `plugins/usage-dashboard/src/16-usage-analytics.part.js`.

Do **not** put it in `17-cycle-summary.part.js`. Existing P59 explicitly protects module 17 as pure DevPass cycle/source-window truth; cross-scope Credits logic there would violate current ownership.

Planned pure helper family:

```text
dailyRequestDateKey(value)
dailyRequestScopeTruth(scopeAnalytics, dateKey, applicability)
dailyRequestCountTruth(data, now = Date.now())
dailyRequestCountDiagnosticText(truth)
```

Exact names may be adjusted during implementation if current source conventions require it, but ownership and semantics are frozen.

These helpers must:

- read existing normalized state only;
- perform no fetch;
- invoke no CLI;
- create no timer, poller, listener, scheduler, cache or persistence owner;
- mutate no runtime state;
- create no request identity field;
- return bounded source/state metadata only.

## 8. Applicability semantics

Each child has an applicability state independent from source availability:

- `applicable`;
- `not-applicable`;
- `unknown`.

### DevPass

Treat DevPass as applicable when current normalized state explicitly proves an active/non-`none` DevPass account or contains a normalized DevPass usage/analytics scope.

Treat it as non-applicable only when current normalized account truth explicitly proves `plan === "none"` and there is no contradictory active DevPass scope evidence.

If account applicability cannot be proven either way, use `unknown`.

### Credits

Treat Credits as applicable when current normalized state contains an active selected/default Credits organization or a normalized Credits usage/analytics scope.

Do not infer `not-applicable` merely because Credits data is missing; missing organization/scope data can be a source/discovery failure. Without an explicit structural absence signal, Credits applicability is `unknown`.

`미적용` is therefore intentionally rare and conservative. It is never a synonym for missing data.

## 9. Per-scope truth object

Each child result is conceptually bounded to:

```text
applicability: applicable | not-applicable | unknown
count: number | null
window: 24h | 7d | 30d | null
state: ok | not-applicable | applicability-unknown | series-unavailable | granularity-not-daily | today-bucket-missing | count-unknown
```

The exact object remains internal Plugin truth. It is not a snapshot schema addition and must not be persisted.

## 10. Total composition

For the current KST date:

- a known applicable child contributes its exact count;
- a proven non-applicable child is excluded from the composition;
- an applicable child with UNKNOWN count blocks the total;
- a child whose applicability is itself UNKNOWN blocks the total;
- the total is emitted only when all participating applicability/source truth is complete for the same date;
- if no scope is provably applicable, total remains UNKNOWN rather than inventing `0`.

Never calculate a truthful-looking partial total from only the children that happen to be available.

Examples:

```text
DevPass 12, Credits 5 -> total 17
DevPass 12, Credits UNKNOWN -> total UNKNOWN
DevPass 12, Credits proven not-applicable -> total 12
DevPass UNKNOWN applicability, Credits 5 -> total UNKNOWN
DevPass 0, Credits 0 -> total 0
```

## 11. Forbidden backfills

Never reconstruct a daily request count from:

- `Request Ledger` row count;
- request IDs;
- hourly buckets built from the local ledger;
- `totalRequests` / `requests24h` rolling aggregate;
- model/provider aggregate counts;
- token totals;
- cost;
- local UI events;
- local refresh counters;
- persisted local history;
- account billing counters;
- another date's bucket.

No estimate is acceptable when server daily evidence is absent.

## 12. UI ownership and exact presentation

The existing card markup is currently materialized through the normal dashboard source split, with context in `50-dashboard-context.part.js` and markup/style in `54-dashboard-markup.part.js`.

Implementation should compute the truth once in dashboard context:

```text
const dailyRequests = dailyRequestCountTruth(d)
```

and render two secondary lines inside the existing `.mini.accent` card beneath the existing dollar `<b>`.

Frozen wording:

```text
오늘 요청 · 서버 집계 {N회|—}
DevPass {N회|—|미적용} · Credits {N회|—|미적용}
```

No new card, tab, chart, filter, modal, badge, setting or preference.

Add only a narrowly named CSS class in the existing dashboard style owner so both lines are muted, compact, wrap safely on mobile, and do not change the existing dollar emphasis.

The 12-item Today grid topology remains unchanged: the feature enriches one existing item rather than inserting another grid cell.

## 13. Diagnostics ownership

Full Diagnostics should receive one bounded line using the same pure truth object, for example:

```text
Usage daily request count: date 2026-09-05 KST · total 17 · devpass 12@24h · credits 5@7d · state ok · source server-daily
```

Partial example:

```text
Usage daily request count: date 2026-09-05 KST · total — · devpass 12@24h · credits — · state count-unknown · source server-daily
```

Prefix the line with `Usage ` deliberately. The current Diagnostics workspace classifier already routes `Usage ` lines to the existing **Data Fidelity & Request Ledger** section, so 5.99 must not add a new Diagnostics section or classifier owner merely for this feature.

Basic Diagnostics should also include the same compact source-truth line. The helper is pure and reads already-normalized state, so this preserves Basic Diagnostics' no-extra-I/O contract while making future real-device acceptance possible without requiring the user to inspect internals.

Diagnostics must not expose project IDs, organization IDs, auth material, raw activity rows, prompts, responses or request content.

## 14. Frozen implementation file map

Expected intentional source edits:

1. `plugins/usage-dashboard/src/16-usage-analytics.part.js`
   - pure current-day request-count truth and diagnostic formatter;
2. `plugins/usage-dashboard/src/40-diagnostics.part.js`
   - Full Diagnostics consumes the pure formatter;
3. `plugins/usage-dashboard/src/50-dashboard-context.part.js`
   - derive the truth once for Overview rendering;
4. `plugins/usage-dashboard/src/54-dashboard-markup.part.js`
   - two secondary UI lines + bounded style;
5. `plugins/usage-dashboard/src/62-diagnostics-workspace.part.js`
   - Basic Diagnostics source-truth line;
6. `plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs`
   - new focused regression;
7. `.github/usage-dashboard/releases/5.99.json`
   - future release spec;
8. `plugins/usage-dashboard/tools/release_daily_request_count_599.py`
   - future deterministic materializer.

Generated manifests/artifacts may change only through the established materialization path.

Explicitly **not** an implementation target:

- Bridge Engine source/artifact behavior;
- module `17-cycle-summary.part.js`;
- Bridge I/O;
- refresh scheduler;
- cache ownership;
- Request Ledger identity/dedupe;
- persistence/state schema;
- snapshot/recent-request contracts.

## 15. Frozen release tuple

Subject to one final fresh authority check immediately before implementation:

- Product: `3.0.0-alpha.5.99`;
- Engine: `1.6.34` exact-byte unchanged;
- Manager: `1.3.6` semantic version unchanged;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- snapshot contract: `1`;
- recent-request contract: `1`;
- bootstrap: unchanged;
- new regression: tentative P65, currently free.

The Plugin Product bytes change. Manager may receive only the normal embedded Product identity/materialization synchronization without a semantic Manager bump. If fresh implementation evidence disproves that assumption, fail closed and redesign rather than silently widening this freeze.

## 16. P65 required regression matrix

P65 must lock at least:

1. fresh 5.99 tuple and accepted 5.98 physical evidence;
2. existing `todayOverviewMetrics()` observed-dollar computation remains semantically unchanged;
3. exact user-facing `오늘 요청 · 서버 집계` label;
4. independent DevPass and Credits child labels remain visible;
5. source comes only from normalized `dailySeries`;
6. selector order is `24h -> 7d -> 30d`;
7. a 24h window is accepted only through an explicit `daily` current-KST-date bucket, never rolling `totalRequests`;
8. exact current KST date equality is mandatory;
9. explicit zero remains known `0회`;
10. invalid/missing count remains UNKNOWN;
11. non-daily granularity fails closed;
12. missing current-day bucket fails closed;
13. known child truth remains visible when another applicable child is UNKNOWN;
14. one UNKNOWN applicable child forces total UNKNOWN;
15. applicability UNKNOWN blocks the total;
16. proven non-applicable is distinct from UNKNOWN and zero;
17. total equals the exact child sum only when composition is complete;
18. missing merged `all.dailySeries` does not imply zero and does not block valid child composition;
19. Request Ledger/IDs/hourly/local events/rolling totals are forbidden backfills;
20. no new network/CLI/timer/poller/listener/scheduler/cache/persistence/history/identity owner;
21. module 17 remains unchanged as DevPass-only cycle truth and existing P59 remains GREEN;
22. Engine `1.6.34` remains exact-byte unchanged;
23. Manager semantic version remains `1.3.6` unless a fresh fail-closed redesign is required;
24. P64 stays GREEN;
25. E18/E19/E20/E21 stay GREEN;
26. deterministic source materialization parity and second-pass idempotence stay GREEN;
27. full Usage Dashboard registry stays GREEN.

Do not freeze the future registry count as 129; the current accepted baseline is 128 tests, but implementation-time repository state may legitimately add unrelated regressions first. Require GREEN by discovered/registered authority rather than a stale hard-coded total.

## 17. Release evidence authority

If production is still 5.98 when implementation freezes, both accepted-baseline and latest-installed structured evidence roles for 5.99 should resolve to:

- Product `3.0.0-alpha.5.98`;
- release SHA `82c4f900cf548068d1eada957c982a5d78f1347b`;
- issue `1055`;
- physical evidence comment `5550769913`;
- verdict accepted / `PASS_PHYSICAL`.

Re-read rather than copy if production moves first.

## 18. Physical acceptance after future deployment

The user's action remains only:

1. normal PocketRisu `+` update;
2. open Local Usage Dashboard;
3. capture the Overview card and Basic/Full Diagnostics.

Accept the future 5.99 release when:

- installed Product/Engine/Manager/CLI/Models tuple matches the promoted release;
- `READY · Health ok · active errors 0 · failures 0`;
- existing observed dollar value remains normal;
- total and child request lines agree with the new Diagnostics truth when evidence is complete;
- `—` is accepted when source evidence is incomplete;
- explicit zero displays as `0회`;
- no duplicate Request Ledger rows or identity churn occurs;
- no unexpected new network/CLI/refresh work is attributable to the feature;
- existing DevPass, Credits, Analytics, Billing, Premium, PAYG, cycle summary, Cost Drivers, cache, service-tier, outcome and HTTP surfaces remain healthy.

Do not generate artificial or chargeable traffic merely to force a positive request count or an edge case.

## 19. Large-feature boundary

The parallel large-feature design lane from #1488 remains separate. No unnamed large feature is absorbed into 5.99 by this freeze.

The DevPass/Credits breakdown remains inside 5.99 because it decomposes the exact child truth already required to compute the total and introduces no new runtime/source owner.

## Frozen verdict

**Local Usage Dashboard 3.0.0-alpha.5.99 — Daily Server Request Count Breakdown is implementation-ready.**

One bounded Product/UI feature, existing source only, fail-closed composition, no new I/O, no Engine behavior change, no persistence/schema change, and no Request Ledger inference.
