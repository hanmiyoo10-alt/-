# Local Usage Dashboard 5.103 — Credits Gateway Limits & Headroom Design

Date: 2026-09-07 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1829  
Discovery authority: #1494 (`V-GATEWAY-LIMITS-HEADROOM`)

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- product scope: `plugins/usage-dashboard/`
- production branch: `release-usage-dashboard`
- production SHA: `d0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77`
- Product: `3.0.0-alpha.5.102`
- Engine: `1.6.37`
- Manager: `1.3.6`
- CLI: `1.10.0`
- Models: `1.280.0`
- contracts: snapshot `1` / recent-request `1`
- 5.102 physical authority: #1803 comment `5565569980` (`PASS_PHYSICAL`)
- 5.102 main convergence repair: #1815 merge `0c9040290ff8636a82a1bae980b8c1e1fdecfb76`
- main at design start: `0c9040290ff8636a82a1bae980b8c1e1fdecfb76`

Fresh search found no existing 5.103 Product authority and no `p69-*` regression. Both are mutable and must be re-read at implementation start.

## 2. Candidate selection

### Dynamic Route Trace remains on hold

Official upstream proves dynamic-route requests store route name/version/evaluation path inside internal log `routingMetadata.dynamicRoute`. However the current public `/logs` response schema inspected for this design does not expose that `dynamicRoute` object. Internal DB evidence is not enough authority for Local Usage Dashboard.

Therefore `V-DYNAMIC-ROUTE-TRACE` remains `needs-source-authority`; 5.103 must not reconstruct or privately scrape the missing metadata.

### Gateway Limits is source-proven

Official upstream authenticated `GET /orgs/{id}/limits` exposes a structured source for current organization rate/spend limits. The response includes, among other fields:

- `enterprise`
- `planClass`
- `rateLimitsApply`
- `tierOverridden`
- `capsApply`
- `tier.tier`
- `tier.rpmMultiplier`
- `tier.dailyCapUsd`
- `tier.monthlyCapUsd`
- `usage.dailySpentUsd`
- `usage.monthlySpentUsd`
- `topUp { capUsd, windowHours, usedUsd, remainingUsd } | null`

The route is membership-gated, and financial limits are denied to developer-role members. Permission failure is therefore a legitimate source state, not a reason to infer limits from other account data.

This endpoint is the only new upstream source authorized by 5.103.

## 3. Primary goal

Expose a bounded read-only **Gateway Limits · Credits** section for the currently selected Credits/default organization.

The section shows only:

1. trust-tier / enterprise exemption state;
2. rate-tier multiplier when applicable;
3. daily spend used/cap plus exact arithmetic headroom when spend caps apply;
4. monthly spend used/cap plus exact arithmetic headroom when spend caps apply;
5. rolling top-up remaining/cap when the endpoint supplies a top-up allowance.

No next-tier progression, endpoint RPM table, account-age history, write action, or top-up action is included.

## 4. Scope authority

The limits source is bound to the **currently selected Credits/default organization**.

Hard rules:

- cache identity includes the selected org ID;
- a result for org A may never be displayed after the user selects org B;
- no fallback to the first/default/other Credits org when the selected org cannot be queried;
- selected org unavailable => UNKNOWN;
- 403 => permission unavailable / UNKNOWN;
- 404 => source unavailable / UNKNOWN;
- network/auth/source failure => UNKNOWN;
- raw org IDs are never rendered in UI or copied into bounded Diagnostics.

This release does not add a DevPass limits view. Upstream itself treats regular trust-tier progression separately from Dev/Chat flat limits, so mixing those semantics into one first release would be misleading.

## 5. Source truth and state model

### Enterprise

Exact `enterprise: true` means the source explicitly says the organization has no per-organization Gateway rate limits or spend caps.

UI:

```text
Enterprise · 조직 단위 Gateway rate/spend cap 없음
```

Do not render `$0`, `0×`, Tier 0, or synthetic infinity values.

### Trust tier

For `planClass === "regular"` with a valid finite non-negative integer `tier.tier`:

```text
Trust tier  Tier N
```

For non-regular plan classes:

```text
Trust tier  미적용
```

Do not infer regular/trust-tier status from organization names or local billing state.

### Rate multiplier

Display `tier.rpmMultiplier` only when the source shape is valid and `rateLimitsApply === true`.

When `rateLimitsApply === false`, render `미적용`; never render `0×`.

The 5.103 UI does not expose the full endpoint RPM table.

### Spend caps

When `capsApply === false`:

```text
일간 spend · UTC  미적용
월간 spend        미적용
```

When `capsApply === true`, each metric requires explicit finite non-negative source `used` and `cap` values.

Exact remaining headroom may be derived only by:

```text
max(0, cap - used)
```

This is deterministic arithmetic over two explicit source values, not an estimate. If either input is unavailable or invalid, the corresponding metric is `—`.

Daily spend is explicitly labeled **UTC** because upstream states the daily cap resets at UTC midnight. It must not be presented as the same day window as Local Usage Dashboard's KST daily observations/server-day features.

### Rolling top-up allowance

When `topUp === null`, the source says the org is exempt / the rolling allowance is not applicable. Render `미적용`, never zero.

When non-null, display only exact source `remainingUsd` and `capUsd` after finite non-negative validation. Do not reconstruct `remainingUsd` from used/cap when the official endpoint already supplies it.

## 6. Non-inference contract

Never infer Gateway limits from:

- Credits balance;
- local runway;
- observed today spend;
- 24h Activity;
- daily-server usage;
- Request Ledger rows;
- cache HIT/MISS or provider cache telemetry;
- provider/model/category/lifecycle rows;
- service tier;
- request outcome/status;
- organization name;
- DevPass plan or billing fields.

UNKNOWN remains UNKNOWN.

## 7. Data minimization and privacy

The upstream `/limits` response contains additional useful-looking fields. They are intentionally **not retained merely for 5.103**:

- `accountAgeDays`
- `lifetimeSpendUsd`
- `nextTier`
- per-endpoint RPM `endpoints`
- raw full source object

The sanitized limits state keeps only the minimum fields required by section 3 plus bounded source/error state.

Authentication/session headers remain memory-only and never enter capture files, Plugin state, logs, or Diagnostics.

Bounded Diagnostics omits raw org IDs and billing identifiers.

## 8. Bounded I/O architecture

5.103 is intentionally different from 5.101/5.102: it authorizes **one new upstream endpoint family**.

Authorized upstream I/O:

```text
GET /orgs/{selectedCreditsOrgId}/limits
```

No other new upstream request is authorized.

### Scheduling contract

- exactly one selected-org request per cache fill;
- never fan out limits requests across every organization;
- org-keyed cache;
- TTL target is **at least 5 minutes**;
- this source must not be inserted into the recurring 15s/60s foreground critical path;
- prefer lazy/background fetch tied to the Credits surface or an equivalent non-critical path;
- switching orgs may trigger one cache fill for the new selected org;
- stale data must be visibly/source-state bounded; no silent cross-org reuse;
- failures must not cause retry storms;
- no new timer family or persistence owner.

### Authentication seam

Reuse the existing authenticated account-capture credential seam. The current capture tap already performs official read-only requests while keeping auth memory-only. 5.103 may extend that seam with an opt-in selected-org limits fetch, but must not broaden credential persistence or send auth to non-LLMGateway origins.

Implementation may expose a local bridge endpoint or equivalent lazy loader for the Credits panel; the exact symbol/path is not design authority. The behavior and I/O boundaries above are.

## 9. UI design

Location: existing **Credits tab** only. No new top-level navigation item.

Regular example:

```text
Gateway Limits · Credits
Trust tier              Tier 2
Rate multiplier         2×
일간 spend · UTC         $12.34 / $50.00 · 남음 $37.66
월간 spend               $123.45 / $500.00 · 남음 $376.55
24h 충전 여유            $75.00 / $100.00
```

Known not-applicable state uses `미적용`; unavailable/invalid source uses `—`.

Enterprise example:

```text
Gateway Limits · Credits
Enterprise · 조직 단위 Gateway rate/spend cap 없음
```

The section must remain compact enough not to displace existing Credits usage/account truth.

## 10. Diagnostics

Known example:

```text
Gateway limits: scope credits · plan regular · tier 2 · rate on · caps on · daily 12.34/50 · monthly 123.45/500 · topup 75/100 remaining · source org-limits · state ok
```

Permission example:

```text
Gateway limits: scope credits · source org-limits · state permission-unavailable
```

Unknown example:

```text
Gateway limits: scope credits · source org-limits · state source-unavailable
```

No raw organization ID, account age, lifetime spend, next-tier object, endpoint table, auth/session data, or source response body.

## 11. Candidate release identity

Subject to mandatory implementation-time fresh readback:

- Product `3.0.0-alpha.5.103`
- Engine `1.6.38` tentative because Engine gains a bounded authenticated limits source + sanitizer/normalizer/cache owner
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P69` tentative; fresh-check required

No contract bump is justified by this design because the limits view can remain a Product/bridge supplementary source outside request/snapshot contract identity. If implementation proves otherwise, stop and amend rather than silently bumping.

## 12. P69 regression freeze

P69 must lock at least:

1. accepted 5.102 physical baseline and monotonic 5.103 candidate;
2. official `/orgs/{id}/limits` schema and membership/permission authority;
3. exact selected Credits org binding;
4. no fallback to another org;
5. one new upstream endpoint family only;
6. org-keyed cache and >=5 minute target TTL/non-critical-path policy;
7. enterprise => known no-limits state, never synthetic zero;
8. non-regular plan => trust-tier ladder not applicable;
9. `rateLimitsApply=false` => `미적용`;
10. `capsApply=false` => spend cap `미적용`;
11. explicit daily/monthly used+cap => only deterministic headroom arithmetic;
12. invalid/missing metric evidence => `—`;
13. `topUp=null` => exempt/not-applicable;
14. non-null topUp uses exact source remaining/cap;
15. daily label includes UTC;
16. accountAge/lifetimeSpend/nextTier/endpoints are not retained merely for 5.103;
17. no inference from balance/runway/usage/request/cache/model/provider state;
18. no raw org ID in Diagnostics;
19. 5.102 Provider Cache Policy preserved;
20. 5.101 No-AI-Training preserved;
21. 5.100 lifecycle/category preserved;
22. 5.99 daily-server fail-closed composition preserved;
23. request identity/dedupe unchanged;
24. contracts remain `1/1` absent fresh incompatibility evidence;
25. full discovered Usage Dashboard registry GREEN;
26. deterministic materialization and second-pass idempotence GREEN.

Do not hard-code a future full-registry test count.

## 13. Physical acceptance

After deployment the user performs only:

1. normal PocketRisu `+` update;
2. one Credits-tab capture showing the Gateway Limits section;
3. Basic/Full Diagnostics capture containing the bounded Gateway limits line.

No artificial request, spend, top-up, or setting mutation is required.

Accept explicit values, known `미적용`, or fail-closed `—` as long as UI and Diagnostics agree with the source state and the installed tuple/READY/Health/regressions are healthy.

## 14. Deferred adjacent features

Keep separate release candidates:

- next-tier qualification/progress using `nextTier` + account-age/lifetime-spend source;
- full per-endpoint RPM table;
- DevPass/Chat flat-limit visibility;
- API-key-specific headroom;
- Dynamic Route Trace after public source exposure is proven.

One release retains one primary goal.

## 15. Implementation gate

Before implementation starts:

1. fresh-read production/main and 5.102 physical authority;
2. confirm no real 5.103 authority appeared independently;
3. confirm P69 remains free or allocate a fresh replacement;
4. re-read current account-capture tap, cache scheduler, selected Credits-org flow, Credits UI and Diagnostics owner;
5. prove the chosen implementation keeps limits off the foreground critical path and prevents cross-org cache reuse;
6. materialize the complete `V-GATEWAY-LIMITS-HEADROOM` source-truth row in canonical matrix authority or an explicitly equivalent version-specific child.

If implementation requires more than one new upstream endpoint family, recurring foreground polling, raw full-response persistence, or synthetic UNKNOWN recovery, stop and amend the design.