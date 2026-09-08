# Local Usage Dashboard 5.106 — Credits Endpoint RPM Limits Design

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1874

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- scope: `plugins/usage-dashboard/`
- production: `release-usage-dashboard@0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c`
- Product `3.0.0-alpha.5.105`
- Engine `1.6.39`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- 5.105 physical authority: #1864 comment `5578153817` (`PASS_PHYSICAL`)
- structured E22 acceptance: #1869 comment `5578155765`
- main at design start: `60a4f4c49a7f8471ddbbd95bce257db37ad66cce`

## 2. Official source authority

Pinned official upstream: `theopenco/llmgateway@db661f93eca2b4a753141cf2ee86cab1b2be248f`.

The authenticated `GET /orgs/{id}/limits` response already consumed by 5.103–5.105 exposes an `endpoints` array of rows with exact `key`, `path`, and `rpm` fields. The official Limits UI renders those rows as per-endpoint **Requests per minute** when `rateLimitsApply` is true, and renders explicit `rpm === 0` as **Unlimited**.

5.106 reuses the exact existing selected Credits org `/limits` capture and does not authorize a new endpoint family or credential owner.

## 3. Product goal

Add a compact read-only endpoint RPM table inside the existing Credits `Gateway Limits · Credits` section.

Preferred mobile shape:

```text
Endpoint RPM · 조직 한도
Chat completions       5,000 /분
Responses              5,000 /분
Embeddings             2,500 /분
Models                  Unlimited
…
```

The table should be collapsed/bounded by default so it does not turn the Credits page into a wall of rows.

These are configured/current organization limits. They are **not** live per-minute usage, remaining quota, concurrency, or headroom.

## 4. Truth contract

1. Only the selected Credits org `/orgs/{id}/limits` response is authoritative.
2. `rateLimitsApply === false` => `미적용`; never synthesize zero RPM.
3. Enterprise => `미적용` because organization gateway rate limits do not apply.
4. Permission/source unavailable or missing `endpoints` => `—`.
5. Each row requires a non-empty bounded `key` and explicit finite non-negative `rpm`.
6. Explicit `rpm === 0` is known `Unlimited`, matching upstream.
7. Duplicate keys or any malformed/negative/non-finite row make the endpoint table UNKNOWN rather than silently producing an incomplete list.
8. Preserve source row order; do not sort by RPM or imply importance.
9. Known endpoint keys may use a bounded local display-label map. Unknown future keys must remain visible using the bounded raw source key.
10. Never infer endpoint RPM from tier multiplier, 429s, request history, throughput, model/provider, or previous observations.
11. Never call the value remaining RPM/headroom because no per-minute consumption source exists.

## 5. Data minimization

Retain only:

```text
endpoints[].key
endpoints[].rpm
```

Do not retain merely for 5.106:

```text
endpoints[].path
raw /limits response
per-minute request counters
raw organization IDs in Diagnostics
auth/session material
account age / lifetime spend
```

## 6. Architecture / I/O

Reuse the existing 5.103+ selected-org limits path:

```text
selected Credits org
-> existing authenticated /orgs/{id}/limits fetch
-> existing org-keyed cache (>= 5 min source TTL)
-> existing /gateway-limits local transport
-> normalized Gateway Limits truth
-> Credits UI + bounded Diagnostics
```

Expected implementation boundary, subject to mandatory implementation-time readback:

- Engine `sanitizeGatewayLimits` admits bounded endpoint `{key,rpm}` rows.
- Gateway Limits normalizer produces exact endpoint-rate state.
- Product UI renders a bounded/collapsible table in the existing Credits section.
- No new local route family if current `/gateway-limits` transport carries the extension.
- No new timer, poller, persistence, credential, or Request Ledger owner.

## 7. Diagnostics

Bounded example:

```text
Gateway endpoint RPM: scope credits · rows 16 · unlimited 1 · source org-limits · state ok
```

Allowed bounded states include `ok`, `not-applicable`, `source-unavailable`, `permission-unavailable`, and `invalid-endpoints`.

Diagnostics must not dump endpoint paths, raw org IDs, or the full table.

## 8. Candidate identity

Subject to implementation-time fresh readback:

- Product `3.0.0-alpha.5.106`
- Engine `1.6.40` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P72` tentative

The Engine bump is tentative because current 5.105 sanitizer intentionally does not retain `endpoints`.

## 9. P72 regression envelope

P72 must prove at minimum:

1. accepted 5.105 physical baseline and monotonic 5.106 candidate;
2. same selected-org `/limits` endpoint only;
3. exact `{key,rpm}` fidelity;
4. `rateLimitsApply=false` and enterprise => not applicable;
5. explicit zero RPM => `Unlimited`;
6. malformed/duplicate/negative/non-finite rows fail closed;
7. unknown future endpoint keys remain visible;
8. endpoint paths are not retained merely for this feature;
9. no inference from tier/request history/429/throughput;
10. no headroom claim without a consumption source;
11. no new polling/timer/credential/persistence owner;
12. 5.105 next-tier, 5.104 utilization, 5.103 exact limits remain unchanged;
13. 5.102/5.101/5.100/5.99 surfaces remain green;
14. Engine bump only if Engine bytes really change;
15. contracts remain `1/1` absent incompatible evidence;
16. full discovered Usage Dashboard registry GREEN;
17. deterministic materialization and second-pass idempotence GREEN.

Do not freeze a total registry-test count integer.

## 10. Physical acceptance

After deployment: normal PocketRisu `+` update, one Credits screenshot showing the endpoint RPM surface, and bounded Diagnostics `Gateway endpoint RPM` line. No artificial traffic, induced 429, or load test is required.

## 11. Out of scope

- live RPM consumption/headroom
- concurrency limits
- 429 prediction or alerting
- endpoint path display
- API-key-specific limits
- DevPass flat endpoint limits
- rate-limit mutation or support actions
