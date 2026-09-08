# Local Usage Dashboard 5.105 — Credits Next-Tier Progression Design

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1864  
Source-proof companion: #1865

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- scope: `plugins/usage-dashboard/`
- production: `release-usage-dashboard@e1d1455592449bcad943e3dec6e1eb205136bd92`
- Product `3.0.0-alpha.5.104`
- Engine `1.6.38`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- 5.104 physical authority: #1859 comment `5576975527` (`PASS_PHYSICAL`)
- main at design start: `dd6a1de8a7fdba97434bcda77cbe8e3987f40025`
- fresh search found no 5.105 authority and no P71 Usage Dashboard regression

## 2. Official source proof

5.105 reuses the exact selected-Credits-org authenticated source introduced in 5.103:

```text
GET /orgs/{selectedCreditsOrgId}/limits
```

No new endpoint family is authorized.

Official upstream inspected for this design:

- repository: `theopenco/llmgateway`
- commit: `db661f93eca2b4a753141cf2ee86cab1b2be248f`
- API route: `apps/api/src/routes/organization.ts`
- tier owner: `packages/shared/src/spend-tier.ts`

The response exposes `nextTier: object | null`. The exact object includes:

```text
tier
rpmMultiplier
dailyCapUsd
monthlyCapUsd
topUpDailyCapUsd
ageDaysRequired
spendUsdRequired
daysUntilQualify
spendUsdUntilQualify
minAgeDaysRequired
daysUntilSpendPathUnlocks
```

Upstream `getNextSpendTier()` owns the qualification math. Its frozen semantics are:

- promotion is reached by the account-age path, **or** by the lifetime-spend path once that tier's minimum-age floor is satisfied;
- `daysUntilQualify` is the remaining whole days on the pure age path;
- `spendUsdUntilQualify` is the remaining lifetime usage spend on the spend path;
- `daysUntilSpendPathUnlocks` is the remaining whole days before the spend path is allowed by its minimum-age floor;
- `nextTier === null` at the top automatic tier;
- `nextTier === null` for support-pinned/overridden tiers because pinned tiers do not auto-progress.

Local Usage Dashboard must consume these official remainder fields rather than reconstructing the trust-tier table as live account truth.

## 3. Primary goal

Extend the existing Credits `Gateway Limits · Credits` section with one compact read-only **다음 Tier** block that answers:

> What exact condition remains before this organization can automatically move to the next trust tier?

Regular example:

```text
다음 Tier · Tier 4
나이 경로        30일 남음
사용 경로        $4,988.50 더
사용 경로 연령   충족
```

When spend amount is met but the minimum-age floor is still locked:

```text
사용 경로        금액 충족
사용 경로 연령   3일 남음
```

No countdown timer, prediction, recommendation to spend, tier mutation, support action, top-up action, alert, or notification is included.

## 4. Applicability and state model

### Regular automatic tier with nextTier object

Use the official `nextTier` object only when the selected-org limits source is healthy and the source says the trust-tier ladder applies.

UI may show:

- `다음 Tier · Tier N`
- age-path remainder from `daysUntilQualify`
- spend-path dollar remainder from `spendUsdUntilQualify`
- spend-path age-floor remainder from `daysUntilSpendPathUnlocks`

Explicit zero is known truth:

- `daysUntilQualify === 0` => age path is fulfilled;
- `spendUsdUntilQualify === 0` => spend threshold is fulfilled;
- `daysUntilSpendPathUnlocks === 0` => spend-path minimum-age floor is fulfilled.

Zero must never become UNKNOWN.

### Pinned/overridden tier

When `tierOverridden === true` and `nextTier === null`:

```text
다음 Tier  고정 Tier · 자동 승급 미적용
```

Do not guess a next tier from current tier number or the public ladder.

### Highest automatic tier

For a regular non-overridden organization with a healthy source and `nextTier === null`:

```text
다음 Tier  최고 Tier
```

### Enterprise/non-regular

For enterprise or a source-declared non-regular plan class:

```text
다음 Tier  미적용
```

### UNKNOWN

Permission/source failure or a malformed required nextTier field produces `—`.

UNKNOWN remains UNKNOWN. Do not recover it from public documentation, account name, Credits balance, current spend, runway, requests, model/provider rows, or historical observations.

## 5. Data minimization

5.103 intentionally discarded `accountAgeDays`, `lifetimeSpendUsd`, `nextTier`, and endpoint tables. 5.105 opens only the narrow `nextTier` slice required by this feature.

Retain only the minimum validated progression fields needed for UI/Diagnostics. The design does **not** require retaining merely for 5.105:

- `accountAgeDays`
- `lifetimeSpendUsd`
- per-endpoint RPM table
- raw full `/limits` response
- auth/session material
- raw organization IDs in diagnostics

The source already provides remaining days/spend, so storing account-age/lifetime totals would add privacy surface without adding truth value.

## 6. I/O and ownership

Reuse all 5.103 source behavior unchanged:

- selected Credits org is part of source identity;
- no fallback to another org;
- org-keyed cache;
- one limits request per cache fill;
- source TTL target >= 5 minutes;
- source remains outside the recurring foreground critical path;
- existing account-capture auth seam remains memory-only;
- no new endpoint, CLI call, timer, poller, persistence owner, package fetch, or external service.

Expected implementation ownership, subject to fresh implementation-time readback:

1. existing Engine limits sanitizer accepts the bounded `nextTier` slice;
2. existing limits normalizer validates it and distinguishes `ok / max-tier / tier-overridden / not-applicable / unknown`;
3. existing Credits Gateway Limits UI consumes that normalized truth;
4. existing bounded Diagnostics gains one next-tier line.

No Request Ledger identity/dedupe input changes.

## 7. UI boundary

Keep the existing `Gateway Limits · Credits` card. No new top-level card family or tab.

The existing 5.103 exact money values and 5.104 bars stay authoritative and visually unchanged. The next-tier block should follow them as secondary explanation.

Do not display the future Tier's raw daily/monthly/top-up cap table merely because those values exist in `nextTier`; the primary user question for 5.105 is qualification, not a second limits table.

## 8. Diagnostics

Healthy example:

```text
Gateway next tier: scope credits · current 3 · next 4 · age-left 30d · spend-left 4988.50 · spend-age-left 0d · source org-limits · state ok
```

Max-tier example:

```text
Gateway next tier: scope credits · state max-tier · source org-limits
```

Pinned example:

```text
Gateway next tier: scope credits · state tier-overridden · source org-limits
```

Unknown example:

```text
Gateway next tier: scope credits · state source-unavailable · source org-limits
```

No raw org ID, account age, lifetime-spend total, auth material, or raw source object.

## 9. Candidate release identity

Subject to mandatory implementation-time readback:

- Product `3.0.0-alpha.5.105`
- Engine `1.6.39` tentative, because existing Engine limits sanitizer/normalizer should gain bounded nextTier fields
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P71` tentative; fresh-check required

No contract bump is justified by this design. If implementation discovers an incompatible snapshot/recent-request requirement, stop and amend instead of silently bumping.

## 10. P71 regression freeze

P71 must prove at minimum:

1. 5.104 physical acceptance is the exact baseline;
2. 5.105 is monotonic;
3. official nextTier field/schema source proof remains pinned;
4. zero new upstream endpoint families;
5. selected-org binding/no fallback remains exact;
6. age path and spend+minimum-age path remain distinct;
7. explicit zero remainder stays known/fulfilled;
8. invalid required progression fields => UNKNOWN;
9. `nextTier=null` + `tierOverridden=true` => pinned/not-applicable automatic progression;
10. `nextTier=null` + regular non-overridden healthy source => max tier;
11. enterprise/non-regular => not applicable;
12. no hard-coded trust-tier ladder is used as live account truth;
13. no retention of accountAgeDays/lifetimeSpendUsd merely for 5.105;
14. no inference from Credits balance/current spend/runway/requests/top-up history;
15. no raw org ID in Diagnostics;
16. no new timer/poller/persistence/auth owner;
17. 5.104 utilization bars remain exact and unchanged;
18. 5.103 exact limits/headroom remain exact and unchanged;
19. 5.102 provider-cache, 5.101 no-training, 5.100 lifecycle, 5.99 daily-server truth remain green;
20. request identity/dedupe unchanged;
21. Engine changes only if the bounded sanitizer/normalizer extension is actually required;
22. contracts stay 1/1 absent fresh incompatibility proof;
23. full discovered Usage Dashboard registry GREEN;
24. deterministic materialization and second-pass idempotence GREEN.

Do not freeze a total full-registry test count.

## 11. Physical acceptance

After deployment the user does only:

1. normal PocketRisu `+` update;
2. open Credits tab;
3. capture `Gateway Limits · Credits` including the next-tier block;
4. capture Diagnostics containing `Gateway next tier` if needed for parity.

No artificial traffic, spend, top-up, account-age manipulation, or tier mutation is required.

Accept exact known progression, max-tier, pinned, not-applicable, or fail-closed UNKNOWN as long as UI/Diagnostics/source state agree and the installed tuple/health/regressions are healthy.

## 12. Deferred adjacent features

Keep separate:

- per-endpoint RPM table;
- concurrent-request ceiling presentation;
- API-key-specific headroom;
- DevPass/Chat flat-limit visibility;
- Dynamic Route Trace after public `/logs` authority is proven;
- alerts for approaching spend/rate limits;
- write/tier/top-up actions.

One release retains one primary goal.

## 13. Implementation gate

Before implementation:

1. fresh-read production/main and accepted 5.104 evidence;
2. confirm 5.105/P71 remain free;
3. re-read current 5.104 Product, Engine limits sanitizer/normalizer, local limits transport, Credits UI, Diagnostics, materializer, release spec owners;
4. prove no new upstream I/O is required;
5. preserve 5.103 org-keyed >=5m non-critical source behavior;
6. update focused regression and full registry;
7. amend design instead of silently retaining extra account/private data or adding a second endpoint.
