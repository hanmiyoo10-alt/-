# Local Usage Dashboard 5.107 — Credits Next-Tier Unlock Limits Design

Date: 2026-09-08 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Feature authority: #1888

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- scope: `plugins/usage-dashboard/`
- production: `release-usage-dashboard@77cf4524d230a907ab90c89ac7fd25e1f96a48f9`
- Product `3.0.0-alpha.5.106`
- Engine `1.6.40`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- 5.106 physical authority: #1874 comment `5580172362` (`PASS_PHYSICAL`)
- structured E22 acceptance: #1877 comment `5580176074`
- main at design start: `66c187e61bd85a2273e4098abc32e7cf52f5e3eb`

## 2. Official source authority

Pinned official upstream: `theopenco/llmgateway@db661f93eca2b4a753141cf2ee86cab1b2be248f`.

The authenticated selected-org `GET /orgs/{id}/limits` response already consumed by 5.103–5.106 exposes these exact `nextTier` fields:

```text
rpmMultiplier
dailyCapUsd
monthlyCapUsd
topUpDailyCapUsd
```

The official Limits UI presents them as what the current next-tier configuration would unlock: daily spend cap, monthly spend cap, rolling-24h top-up allowance, and rate multiplier.

5.107 authorizes no new upstream endpoint family, credential owner, CLI operation, timer, poller, persistence owner, or selected-org behavior.

## 3. Product goal

Extend the existing 5.105 `다음 Tier` block with a compact read-only sub-block:

```text
다음 Tier 한도 · 현재 기준
일간 spend         <server value>/일
월간 spend         <server value>/월
24h 충전           <server value>/24h
Rate multiplier    <server value>×
```

`현재 기준` is mandatory. The values are the server's current next-tier configuration, not a promise that the platform can never change them before qualification.

The existing qualification-path rows remain unchanged.

## 4. Truth contract

1. Only the selected Credits org `/orgs/{id}/limits` response is authoritative.
2. The unlock sub-block applies only when the existing progression state is `ok` and a valid `nextTier` object exists.
3. Max tier, support-pinned/overridden tier, non-regular plan, enterprise, source-unavailable, and permission-unavailable never produce invented future limits.
4. Each displayed unlock field requires an explicit finite non-negative source value.
5. Explicit zero remains known zero. It is not converted to UNKNOWN and is not reinterpreted as Unlimited unless that particular upstream field explicitly defines such semantics.
6. If any required unlock field is missing, invalid, negative, or non-finite, the entire unlock sub-block fails closed to UNKNOWN rather than mixing partial truth.
7. Never derive next-tier limits from current tier, current multiplier, endpoint RPM rows, public trust-tier tables, request history, spend history, balance, runway, or previous observations.
8. Never hard-code a live trust-tier ladder as account truth.
9. Existing 5.105 qualification-path semantics remain unchanged.
10. Existing 5.106 endpoint RPM semantics remain independent and unchanged.

## 5. Data minimization

Retain only these additional `nextTier` fields for 5.107:

```text
rpmMultiplier
dailyCapUsd
monthlyCapUsd
topUpDailyCapUsd
```

Do not retain merely for this feature:

```text
accountAgeDays
lifetimeSpendUsd
ageDaysRequired
spendUsdRequired
endpoint paths
full tier tables
raw /limits response
raw organization IDs in Diagnostics
auth/session material
```

## 6. Architecture / I/O

Reuse the existing chain exactly:

```text
selected Credits org
-> existing authenticated /orgs/{id}/limits fetch
-> existing org-keyed cache
-> existing /gateway-limits local transport
-> normalized Gateway Limits truth
-> existing Credits next-tier UI + bounded Diagnostics
```

Expected implementation boundary, subject to implementation-time fresh readback:

- Engine sanitizer extends the already-bounded `nextTier` projection by four numeric fields.
- Gateway Limits normalization adds a fail-closed next-tier-limit state without altering 5.103–5.106 fields.
- Product adds one compact nested block under `다음 Tier`.
- No new route, timer, poller, persistence, credential, or Request Ledger owner.

## 7. Diagnostics

Bounded example:

```text
Gateway next-tier limits: scope credits · next 4 · daily 10000 · monthly 100000 · topup24h 20000 · multiplier 20 · source org-limits · state ok
```

Allowed bounded non-ok states include:

```text
max-tier
tier-overridden
not-applicable
source-unavailable
permission-unavailable
invalid-next-tier-limits
```

Diagnostics must not include raw organization IDs, account-age totals, lifetime-spend totals, endpoint paths, or the full upstream object.

## 8. Candidate identity

Subject to mandatory implementation-time fresh readback:

- Product `3.0.0-alpha.5.107`
- Engine `1.6.41` tentative
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P73` tentative

The Engine bump is tentative because the accepted 5.106 sanitizer does not retain these four next-tier unlock fields.

## 9. P73 regression envelope

P73 must prove at minimum:

1. accepted 5.106 physical baseline and monotonic 5.107 candidate;
2. same selected-org `/limits` endpoint only;
3. exact source fidelity for `rpmMultiplier`, `dailyCapUsd`, `monthlyCapUsd`, `topUpDailyCapUsd`;
4. explicit zero remains known zero;
5. any missing/invalid/negative/non-finite required field fails the unlock block closed;
6. max-tier, override, non-regular, enterprise and unavailable states never invent values;
7. no derivation from current tier, public tables, endpoint RPM, request/spend history, balance, runway, or local arithmetic;
8. the `현재 기준` qualifier remains present;
9. 5.105 progression-path fields remain unchanged;
10. 5.106 endpoint RPM remains unchanged;
11. 5.104 utilization and 5.103 exact limits remain unchanged;
12. 5.102/5.101/5.100/5.99 regression surfaces remain green;
13. no new polling/timer/credential/persistence/Request Ledger owner;
14. Engine bump only if Engine bytes actually change;
15. contracts remain `1/1` absent incompatible source evidence;
16. full discovered Usage Dashboard registry GREEN;
17. deterministic materialization and second-pass idempotence GREEN.

Do not freeze a total registry-test count integer.

## 10. Physical acceptance

After deployment: normal PocketRisu `+` update, one Credits screenshot showing `다음 Tier 한도 · 현재 기준`, and bounded Diagnostics `Gateway next-tier limits` line.

No artificial spend, top-up, or traffic is required.

## 11. Out of scope

- future-tier prediction beyond current source values
- hard-coded trust-tier tables
- tier mutation or support actions
- alerts/countdowns
- live endpoint RPM usage/headroom
- account-age or lifetime-spend display
