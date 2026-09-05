# Local Usage Dashboard 5.99 — Daily Request Count Breakdown Amendment

Status: **DESIGN AMENDMENT FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1487  
Amendment authority: #1489  
Baseline design: `docs/USAGE_DASHBOARD_599_DAILY_REQUEST_COUNT_DESIGN.md`

## Goal

Keep the already-frozen 5.99 daily server request total and additionally show independently source-backed DevPass and Credits child counts.

Target presentation:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 17회
DevPass 12회 · Credits 5회
```

The existing observed-dollar computation is unchanged.

## Child-scope truth

The two displayed child values are not inferred pieces of the total. Each is independently selected from the exact current-KST-day daily bucket for its own applicable scope:

- DevPass from `analyticsScopes.scopes.devpass` daily server series;
- Credits from `analyticsScopes.scopes.credits` daily server series for the selected Credits organization.

Use the same bounded 7d-first / 30d-fallback daily-series selection already frozen by the base 5.99 design.

For each child:

- explicit finite non-negative `requestCount` => known value;
- explicit `0` => `0회`;
- missing/invalid count or missing current-day bucket => `—`;
- structurally non-applicable scope => `미적용`.

`미적용` is not allowed as a replacement for a failed fetch, missing series, missing bucket, or UNKNOWN source value.

## Combined-total rule

The total remains fail-closed:

- if every applicable child is known for the same KST date, total = exact sum of those known applicable children;
- if any applicable child is UNKNOWN, the total is `—`;
- a non-applicable child is excluded from the total because it is not part of the current account composition;
- never sum only the children that happen to be available.

This preserves partial truth without presenting an undercount as a whole-day total.

Examples:

```text
오늘 요청 · 서버 집계 —
DevPass 12회 · Credits —
```

```text
오늘 요청 · 서버 집계 12회
DevPass 12회 · Credits 미적용
```

## UI boundary

The breakdown is a secondary line inside the same existing Overview mini card. It does not add a new card, tab, chart, filter, setting, modal, badge, or persistence preference.

Preferred compact wording:

```text
DevPass 12회 · Credits 5회
```

Unknown and non-applicable states must stay visible rather than disappearing, so the user can distinguish complete composition from partial source coverage.

## Diagnostics amendment

The existing 5.99 diagnostic line already carries total + child values. Keep that shape and make child state explicit enough to distinguish known, unknown, and non-applicable scopes without exposing identifiers.

Example:

```text
Daily request count: date 2026-09-05 KST · total 17 · devpass 12@7d · credits 5@7d · source server-daily · state ok
```

Partial example:

```text
Daily request count: date 2026-09-05 KST · total — · devpass 12@7d · credits — · source server-daily · state count-unknown
```

Do not expose project IDs, organization IDs, auth material, raw activity rows, prompts, responses, or headers.

## No new runtime authority

This amendment reuses the exact child-scope source truth already required for the combined total.

It adds no:

- endpoint or `/activity` request;
- CLI invocation;
- timer, poller, listener, scheduler, or background refresh;
- persistence/history owner;
- Request Ledger backfill;
- Engine source change;
- request identity/dedupe field.

## P65 amendment

In addition to the base 5.99 requirements, P65 must prove:

1. known DevPass and Credits counts render independently;
2. child counts come only from their own current-KST-day server daily buckets;
3. explicit child zero renders `0회`;
4. missing/invalid child source renders `—`, never zero;
5. structurally non-applicable child renders `미적용` and is distinguishable from UNKNOWN;
6. one UNKNOWN applicable child forces total UNKNOWN while preserving another independently known child visibly;
7. total equals the exact sum only when every applicable child is known for the same date;
8. no available-only partial sum can masquerade as the total;
9. no new I/O/runtime/persistence/identity owner is introduced;
10. existing 5.99 money/source-label semantics remain unchanged.

## Verdict

**Accepted into the 5.99 feature scope.**

This is a direct decomposition of the same daily server request truth, not a separate large feature and not a reason to widen Engine/runtime ownership.