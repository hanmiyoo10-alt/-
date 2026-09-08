# Local Usage Dashboard 5.107 — Source / Truth Matrix Addendum

Date: 2026-09-08 KST  
Feature authority: #1888  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**

| Surface | Authoritative source | Required fields | UNKNOWN / not-applicable rule | New I/O | Privacy / non-goals |
| --- | --- | --- | --- | --- | --- |
| Next-tier unlock limits | selected Credits org `GET /orgs/{id}/limits` | existing valid `nextTier` + `rpmMultiplier`, `dailyCapUsd`, `monthlyCapUsd`, `topUpDailyCapUsd` | any required field invalid/missing => whole unlock block UNKNOWN; max-tier/override/non-regular/enterprise reuse existing not-applicable progression state | none | no account age, lifetime spend, raw org ID, raw response, endpoint paths, hard-coded tier table |
| Existing next-tier qualification paths | same `/limits` source | `tier`, `daysUntilQualify`, `spendUsdUntilQualify`, `daysUntilSpendPathUnlocks` | unchanged from 5.105 | none | do not recompute qualification |
| Endpoint RPM table | same `/limits` source | bounded `endpoints[].key`, `endpoints[].rpm` | unchanged from 5.106 | none | independent from unlock limits; never use as multiplier-derived source |

## Exact source semantics

Pinned official upstream `theopenco/llmgateway@db661f93eca2b4a753141cf2ee86cab1b2be248f` returns current next-tier configuration fields and the official Limits UI renders them as the limits/allowances that next tier would unlock.

The product must therefore label the block `다음 Tier 한도 · 현재 기준`. The qualifier prevents current server configuration from being presented as an immutable future guarantee.

## Fail-closed rules

- four unlock values are an atomic UI truth set;
- explicit finite non-negative zero remains zero;
- no partial set when one field is invalid;
- no reconstruction from current tier or public constants;
- no inference from spend, balance, runway, request history, 429s, endpoint RPM, or historical observations;
- max tier, support override, enterprise, non-regular, permission/source unavailable remain bounded non-ok states.

## Adjacent rows intentionally not activated

- `V-KEY-LIMIT-HEADROOM`: still needs independent source-authority design; not inferred from organization schema defaults.
- `V-DYNAMIC-ROUTE-TRACE`: still needs public source authority; internal routing metadata is not promoted through this feature.
- live endpoint RPM consumption/headroom remains out of scope because 5.106 source contains configured limits, not current per-minute consumption.

## Candidate identity

- Product `3.0.0-alpha.5.107`
- Engine `1.6.41` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- P73 tentative

No implementation or release authority is granted by this addendum alone.
