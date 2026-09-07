# Local Usage Dashboard 5.104 — Gateway Limits Utilization Visualization

Date: 2026-09-07 KST  
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED**  
Primary feature authority: #1859

## 1. Fresh accepted baseline

- repository: `hanmiyoo10-alt/-`
- product scope: `plugins/usage-dashboard/`
- production branch: `release-usage-dashboard`
- production SHA: `7fc4e31ab28d726cc355915a57f0be566dab2b25`
- Product `3.0.0-alpha.5.103`
- Engine `1.6.38`
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `snapshot 1 / recent-request 1`
- 5.103 physical authority: #1829 comment `5570738555` (`PASS_PHYSICAL`)
- main at design start: `ba3b4b4f55761f3a509c79c2e57dcea6b584a536`

Fresh search found no existing 5.104 Product authority and no `p70-*` Usage Dashboard regression.

## 2. Why this follows 5.103

5.103 already owns the exact selected-Credits-org Gateway Limits source and preserves normalized values for:

- daily spend `{ used, cap, remaining }`;
- monthly spend `{ used, cap, remaining }`;
- rolling top-up `{ cap, windowHours, used, remaining }`.

Current 5.103 source inspection confirms these values are already normalized from explicit `/orgs/{id}/limits` fields and displayed as exact amounts. 5.104 therefore adds **no new source authority** and must not widen the existing authenticated source boundary.

The exact amounts remain the canonical truth. Utilization graphics are supplementary presentation only.

## 3. Primary goal

Add source-faithful utilization bars inside the existing `Gateway Limits · Credits` section:

```text
일간 spend · UTC
$0.02 / $5000.00 · 남음 $4999.98
[used utilization bar]

월간 spend
$11.49 / $50000.00 · 남음 $49988.51
[used utilization bar]

24h 충전 여유
$10000.00 / $10000.00
[remaining allowance bar]
```

No new top-level tab, no new limits card family, and no replacement of exact numeric amounts.

## 4. Derived-value contract

### Daily / monthly spend

A bar may be rendered only when:

- state is applicable/known;
- `used` is explicit finite non-negative;
- `cap` is explicit finite and strictly positive.

Ratio:

```text
clamp(used / cap, 0, 1)
```

The bar represents **used proportion**.

The exact amount text remains authoritative. The bar must never fabricate a minimum visible fill for tiny non-zero usage.

### Rolling top-up

A bar may be rendered only when:

- top-up state is applicable/known;
- `remaining` is explicit finite non-negative;
- `cap` is explicit finite and strictly positive.

Ratio:

```text
clamp(remaining / cap, 0, 1)
```

The bar represents **remaining allowance**, matching the existing `충전 여유` user-facing meaning.

Do not reconstruct `remaining` from `cap - used` when the 5.103 source already supplies `remaining`.

## 5. UNKNOWN / not-applicable truth

The following must not render a synthetic zero-filled bar:

- source unavailable;
- permission unavailable;
- selected org unavailable;
- invalid/missing metric;
- cap <= 0;
- enterprise no-limit state;
- rate/caps/top-up known not-applicable states.

Use the existing 5.103 amount/state text unchanged. Visualization absence means **not visualizable from current truth**, not `0%`.

## 6. No threshold semantics

5.104 does **not** introduce `safe`, `warning`, `approaching`, `critical`, or similar thresholds.

The API-key product's separate 80% approaching-limit behavior is not authority for organization Gateway Limits. 5.104 must not copy that threshold across unrelated source semantics.

No alerting, notification, automation, color-state severity, or prediction is included.

## 7. Time-window honesty

The daily spend bar inherits the exact 5.103 meaning: **server UTC-day spend cap utilization**.

It must remain labeled `일간 spend · UTC` and must not be visually merged with the KST-day `오늘 요청 · 서버 집계` or local-observed daily money surfaces.

Monthly and rolling-top-up windows retain their existing upstream semantics. 5.104 adds no reset-time inference.

## 8. Accessibility

Each rendered bar must expose an assistive textual value derived from the same ratio and source amounts. The exact UI implementation may use progress semantics/ARIA, but must satisfy:

- machine-readable min `0`, max `100`;
- current value derived from the same ratio used for visual width;
- textual label identifies daily used, monthly used, or rolling top-up remaining;
- no inaccessible color-only meaning.

Visible percent text is optional; if omitted, the exact source amounts remain visible beside the bar.

## 9. Architecture / release identity

Expected minimal ownership after fresh implementation readback:

- existing Gateway Limits truth/helper owner in Product context;
- existing Credits/Gateway Limits markup owner;
- CSS only as needed for the bar;
- Diagnostics unchanged unless a tiny presentation-health marker is proven necessary.

No Engine source/data change is authorized by this design.

Tentative candidate:

- Product `3.0.0-alpha.5.104`
- Engine `1.6.38` **exact-byte unchanged**
- Manager `1.3.6`
- CLI `1.10.0`
- Models `1.280.0`
- contracts `1/1`
- focused regression `P70` tentative / fresh-check required

If implementation-time source readback shows Engine modification is needed, implementation must stop and amend this design instead of silently bumping Engine.

## 10. I/O / privacy boundary

5.104 authorizes:

- **zero** new upstream endpoints;
- zero new localhost routes;
- zero new CLI operations;
- zero new timers/pollers/background jobs;
- zero new persistence fields;
- zero new credentials/auth seams.

5.103 selected-org binding, org-keyed cache, no-fallback rule, auth memory-only rule, and raw-org-ID redaction remain unchanged.

No additional account age, lifetime spend, next-tier, endpoint RPM, key metadata, or raw `/limits` payload retention is authorized.

## 11. P70 regression freeze

P70 must lock at least:

1. accepted 5.103 physical baseline and monotonic 5.104 candidate;
2. exact 5.103 Gateway Limits amount/source semantics unchanged;
3. daily/monthly bar requires explicit `used` + positive `cap`;
4. top-up bar requires explicit `remaining` + positive `cap`;
5. daily/monthly uses `used/cap`; top-up uses `remaining/cap`;
6. ratios clamp to visual range without changing exact source amounts;
7. missing/invalid/cap<=0 never becomes synthetic 0%;
8. enterprise/not-applicable/UNKNOWN stays truthful;
9. daily remains explicitly UTC-boundary truth;
10. no severity/approaching threshold inference;
11. no fabricated minimum bar width for tiny non-zero values;
12. accessibility value and visual ratio share one owner;
13. zero new I/O/poller/timer/persistence/auth owners;
14. Engine 1.6.38 exact-byte identity preserved;
15. 5.103 P69 and earlier P68/P67/P66/P65 behavior preserved;
16. full discovered Usage Dashboard registry GREEN;
17. deterministic materialization and second-pass idempotence GREEN.

Do not freeze a total registry test-count integer.

## 12. Physical acceptance

After deployment, user action remains only:

```text
+
-> Credits tab
-> capture Gateway Limits section
```

Accept when:

- installed tuple matches promoted 5.104;
- READY / Health ok / active errors 0 / failures 0;
- exact 5.103 amount/source text remains correct;
- daily/monthly bars visually represent used proportion;
- top-up bar visually represents remaining allowance;
- UNKNOWN/not-applicable states do not masquerade as empty 0% usage;
- no regression is visible in existing Credits/DevPass/Overview surfaces.

No artificial spend, top-up, or traffic is required.

## 13. Non-goals

- no next-tier progress;
- no account-age or lifetime-spend display;
- no endpoint RPM table;
- no API-key headroom;
- no warning thresholds/alerts;
- no reset countdown;
- no limit editor/top-up action;
- no new Gateway source;
- no Dynamic Route Trace.
