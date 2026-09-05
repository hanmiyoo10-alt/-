# Local Usage Dashboard 5.99 — Final Implementation Freeze

Date: 2026-09-05 KST  
Status: **FINAL DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1487  
Prior implementation freeze: `docs/USAGE_DASHBOARD_599_IMPLEMENTATION_FREEZE_2026-09-05.md`  
Accepted production baseline: #1055 comment `5550769913` (`PASS_PHYSICAL`)

This document is the final controlling 5.99 design. It keeps every safety/source boundary from the prior freeze and adds one late-scope presentation item: the exact current-KST-day server `totalTokens` value. Where this document conflicts with an earlier 5.99 design/freeze, this document controls implementation.

## 1. Fresh authority at final freeze

Immediately before this final amendment:

- repository: `hanmiyoo10-alt/-`;
- main: `b61e499b37ec443751bb7c9cd58ce9e54aa4ee65`;
- production branch: `release-usage-dashboard`;
- production SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`;
- Product: `3.0.0-alpha.5.98`;
- Engine: `1.6.34`;
- Manager: `1.3.6`;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- snapshot / recent-request contracts: `1 / 1`;
- production physical verdict: `PASS_PHYSICAL`.

5.99 remains unimplemented and undeployed. Re-read all mutable authority again immediately before implementation.

## 2. Final primary goal

5.99 enriches only the existing Overview `일간 총 사용량 · 관측` mini card with current-day server usage truth already present in normalized `dailySeries`.

Final complete example:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 17회
DevPass 12회 · Credits 5회
오늘 토큰 · 서버 집계 1,234,567
```

Partial example:

```text
일간 총 사용량 · 관측
$0.1234
오늘 요청 · 서버 집계 —
DevPass 12회 · Credits —
오늘 토큰 · 서버 집계 —
```

Known zero remains exact:

```text
오늘 요청 · 서버 집계 0회
DevPass 0회 · Credits 0회
오늘 토큰 · 서버 집계 0
```

This is still one bounded goal: **current-day server usage snapshot presentation on the existing observed-day card**. No new card, tab, chart, modal, setting, history view, or runtime owner is added.

## 3. Truth boundaries

The existing dollar value remains unchanged and remains local-observed truth. The new request and token values are server daily-bucket truth. The UI must keep the provenance distinction:

- money: `관측`;
- requests: `서버 집계`;
- tokens: `서버 집계`.

Do not imply that the observed dollar window and whole-current-KST-day server bucket have identical temporal coverage.

## 4. Existing source authority only

`plugins/usage-dashboard/src/16-usage-analytics.part.js` already normalizes these daily bucket fields:

```text
dailySeries.range
dailySeries.granularity
dailySeries.buckets[].date
dailySeries.buckets[].requestCount
dailySeries.buckets[].totalTokens
```

`normalizeDailyScalarSeries()` preserves only explicit finite non-negative numeric values; missing/invalid values remain `null`. Explicit zero is known zero.

5.99 must use `totalTokens` directly. It must never reconstruct total tokens from input/output/cached fields, Request Ledger rows, model/provider aggregates, cost, request count, or any other arithmetic/inference.

No new endpoint, CLI invocation, fetch, timer, poller, listener, scheduler, cache, persistence, history database, snapshot schema, or request-identity field is permitted.

## 5. Source selection: same rule, independent metric truth

For each applicable child scope (`devpass`, `credits`), both `requestCount` and `totalTokens` use the existing window priority:

1. `24h`;
2. `7d`;
3. `30d`.

A metric value is usable only when:

- `dailySeries` exists;
- `dailySeries.granularity === "daily"`;
- the bucket date normalizes to the exact current KST date;
- the specific metric (`requestCount` or `totalTokens`) is an explicit finite non-negative number.

Metric selection is independent. Example: requestCount may resolve from 24h while totalTokens resolves from 7d for the same scope/date if the 24h bucket lacks explicit totalTokens. Do not reject a valid request count merely because totalTokens is missing, and do not treat a valid token value as proof of request count.

Never use rolling `totalRequests` or rolling `totalTokens` fields as a substitute for the exact current-day daily bucket.

Current Engine 1.6.34 already requests analytics with `timezone=Asia/Seoul`; no Engine change is required for KST day identity.

## 6. Applicability and composition

Keep the prior conservative applicability rules unchanged:

- `applicable`;
- `not-applicable` only when structurally proven;
- `unknown` when applicability cannot be proven.

### Request composition

Unchanged from the prior freeze:

- every applicable child must have a known current-day `requestCount` before total requests are known;
- proven non-applicable children are excluded;
- applicability UNKNOWN or count UNKNOWN blocks total;
- explicit zero remains zero;
- a known child may still be displayed while the total is UNKNOWN.

### Token composition

Use the same fail-closed rule independently for `totalTokens`:

- every applicable child must have a known current-day `totalTokens` before total tokens are known;
- proven non-applicable children are excluded;
- applicability UNKNOWN or token UNKNOWN blocks total tokens;
- explicit zero remains zero;
- no partial truthful-looking total is permitted.

UI intentionally shows only the combined token total to keep the mini card compact. Per-scope token evidence belongs in Diagnostics, not in extra card lines.

## 7. Final internal truth shape

The module-16 truth owner should expose one bounded current-day truth object containing at least:

```text
dateKey
requests.total
requests.devpass { applicability, value, window, state }
requests.credits { applicability, value, window, state }
tokens.total
tokens.devpass { applicability, value, window, state }
tokens.credits { applicability, value, window, state }
```

Exact implementation names may follow existing conventions. The object remains ephemeral Plugin truth and is not persisted or added to snapshot/recent-request schemas.

## 8. UI ownership and wording

Keep the existing file ownership from the prior freeze:

- module 16: pure source selection/composition;
- module 50: compute truth once for Overview context;
- module 54: render compact lines in the existing card;
- module 40 / module 62: Full/Basic Diagnostics consume the same truth.

Frozen UI wording:

```text
오늘 요청 · 서버 집계 {N회|—}
DevPass {N회|—|미적용} · Credits {N회|—|미적용}
오늘 토큰 · 서버 집계 {exact localized integer|—}
```

Render token count as the exact integer with locale separators (for example `1,234,567`), not an abbreviated `1.23M`, so no precision is hidden. Keep the styling muted/compact and mobile-wrapping. The existing dollar emphasis and 12-item Today grid topology stay unchanged.

## 9. Diagnostics

Extend the existing bounded `Usage ` diagnostic line/family with both request and token truth. Example:

```text
Usage daily server truth: date 2026-09-05 KST · requests total 17 · devpass 12@24h · credits 5@24h · tokens total 1234567 · devpass 1100000@7d · credits 134567@24h · source server-daily · state ok
```

If token truth is incomplete while request truth is complete, keep them independent, e.g. requests may remain known while token total is `—`.

Diagnostics may expose per-scope numeric token evidence and selected window, but must not expose organization/project IDs, auth material, prompts, responses, or raw activity rows.

## 10. Frozen implementation file map

Expected intentional edits remain bounded to:

1. `plugins/usage-dashboard/src/16-usage-analytics.part.js` — current-day request + token truth;
2. `plugins/usage-dashboard/src/40-diagnostics.part.js` — Full Diagnostics;
3. `plugins/usage-dashboard/src/50-dashboard-context.part.js` — derive once;
4. `plugins/usage-dashboard/src/54-dashboard-markup.part.js` — three compact server-truth lines total (request total, request children, token total);
5. `plugins/usage-dashboard/src/62-diagnostics-workspace.part.js` — Basic Diagnostics;
6. `plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs` — keep the reserved P65 filename but extend coverage to the final token amendment;
7. `.github/usage-dashboard/releases/5.99.json` — future release spec;
8. `plugins/usage-dashboard/tools/release_daily_request_count_599.py` — future deterministic materializer; filename may remain for continuity even though final UI also includes token truth.

Explicit non-targets remain unchanged: Engine behavior/artifact bytes, module 17 cycle-summary ownership, Bridge I/O, scheduler, cache, persistence, request identity, snapshot/recent-request contracts.

## 11. Final P65 regression additions

In addition to every requirement in the prior freeze, P65 must lock:

1. exact `오늘 토큰 · 서버 집계` label;
2. source is only exact current-KST-day `dailySeries[].totalTokens`;
3. token selection uses `24h -> 7d -> 30d` independently of requestCount selection;
4. explicit token zero remains `0`;
5. missing/invalid totalTokens remains `—`, never zero;
6. non-daily / missing-date bucket fails closed;
7. one UNKNOWN applicable child blocks combined token total;
8. proven non-applicable child is excluded from token composition;
9. no partial token total from only available children;
10. no derivation from input/output/cached tokens, Request Ledger, rolling totals, request counts, model/provider aggregates, or cost;
11. request truth remains independently visible/known when token truth is UNKNOWN and vice versa;
12. UI shows only total token line, while Diagnostics may expose per-scope token evidence;
13. exact integer formatting preserves precision;
14. no new I/O/runtime/lifecycle/schema owner;
15. Engine `1.6.34` remains exact-byte unchanged;
16. existing P59/P64 and E18/E19/E20/E21 stay GREEN;
17. full discovered Usage Dashboard registry stays GREEN;
18. deterministic materialization parity and second-pass idempotence stay GREEN.

Do not hard-code the future full-registry test count.

## 12. Final candidate release identity

Subject to mandatory fresh implementation-time authority re-read:

- Product: `3.0.0-alpha.5.99`;
- release goal/name: **Daily Server Usage Snapshot (Requests + Tokens)**;
- Engine: `1.6.34` exact-byte unchanged;
- Manager: `1.3.6` semantic unchanged;
- managed CLI: `1.10.0`;
- managed Models: `1.280.0`;
- snapshot contract: `1`;
- recent-request contract: `1`;
- bootstrap: unchanged;
- focused regression: P65.

If any fresh implementation evidence requires Engine behavior change, new I/O, new schema, or widened persistence/identity ownership, stop and redesign instead of silently expanding 5.99.

## 13. Physical acceptance after deployment

User action remains only normal PocketRisu `+` update plus Overview and Basic/Full Diagnostics capture.

Accept when:

- installed tuple matches promoted 5.99;
- `READY · Health ok · active errors 0 · failures 0`;
- existing observed dollar remains normal;
- request total + DevPass/Credits breakdown agrees with Diagnostics when source is complete;
- token total agrees with Diagnostics when source is complete;
- `—` is accepted for incomplete source and exact zero is preserved;
- no duplicate Request Ledger rows, identity churn, or unexpected new I/O appears;
- existing DevPass/Credits/Analytics/Billing/Premium/PAYG/Cycle/Cost Drivers/cache/tier/outcome/HTTP surfaces remain healthy.

Do not generate artificial or chargeable traffic to force a token/request edge case.

## Final verdict

**Local Usage Dashboard 3.0.0-alpha.5.99 is FINAL DESIGN FROZEN as one bounded Daily Server Usage Snapshot release: request total + DevPass/Credits request breakdown + exact current-day total token count, all from existing fail-closed server dailySeries truth, with no Engine behavior change and no new I/O/schema/persistence owner.**
