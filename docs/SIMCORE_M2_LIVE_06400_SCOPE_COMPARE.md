# SimCore v0.64.0 — Annual-only vs Cumulative-YoY Live Scope Comparison

Purpose: preserve direct live evidence comparing two similar-looking year-end summary request families that have different temporal authority. This note complements `SIMCORE_M2_LIVE_06400_INBOX.md` and should later be consolidated into the canonical live-evidence/deferred ledgers.

Runtime: `mt2qjgt5-9oi0sk`
Version: `0.64.0`

## Pair A — ANNUAL_ONLY candidate

Request `@2020` asked for a broad `2030.1.1.~12.31.` activity-performance summary. User intent clarified afterward: achievements should be attributable to the target year; earlier achievements may be context but must not silently become current-year achievements.

Observed diagnostic shape:

```text
Short-C source lock: OFF
Template recurrence: FIRST · family C
Request lineage: CHAIN · root A@2014 · parent C@2018 · depth 3
Source handoff: INELIGIBLE · reason template-recurrence-owned
```

The visible output produced a broad annual summary, but the user reports a recurring quality problem family: target-year achievements can be omitted while prior/earlier achievements can be pulled in.

Working scope contract:

```text
ANNUAL_ONLY
- authority window = target year only
- include achievements/events that occurred or materially changed during target year
- earlier career facts only as clearly labeled context/comparison
- ongoing roles may expose start date as metadata but annual activity/results remain target-year scoped
- year-end cumulative counters may appear only as labeled year-end snapshots
```

## Pair B — CUMULATIVE_YOY direct live sample

Request `@2022` explicitly asked for platform and stock cumulative values at `2030.12.31`, using `2029.12.31` as the baseline and requiring cumulative totals, increases, growth rates, and records.

Observed diagnostic shape:

```text
Short-C source lock: OFF
Template recurrence: REPEATED · family C
Recurrence guidance: ON
Recurrence history match: MATCH · hash 0xfb4299f3 · user @1708 · assistant @1709 · distance 314
Request lineage: CHAIN · root A@2014 · parent C@2020 · depth 4
Source handoff: INELIGIBLE · reason template-recurrence-owned
```

This is a useful positive differentiator from Pair A: the cumulative-YoY input naturally matched an older recurrence template while the annual-only input was `FIRST`. Recurrence matching itself is therefore not automatically a defect; it may be useful for restoring a recurring year-over-year summary format.

Working scope contract:

```text
CUMULATIVE_YOY
- authority = cumulative state as of target year-end
- previous year-end snapshot is an explicit comparison baseline
- output previous total + current total + absolute growth + percentage growth where evidence exists
- earlier values are legitimate only when labeled as baseline/history
```

## DIRECT_EVIDENCE — stale/historical value contamination inside the CUMULATIVE_YOY output

Status: `DIRECT_EVIDENCE / ATTRIBUTION SUSPECTED`

The main COSMIC section reports:

```text
2029 baseline: 3,400만
2030 current: 4,000만
increase: +600만 / +17.6%
```

But a later comment in the same visible output says:

```text
"720만 명이었던 코스믹 앱 평생회원이 올해 4,000만 명 찍은 거면..."
```

These two historical baselines cannot both describe the requested `2029.12.31` baseline. Therefore the visible response contains a real internal historical-value inconsistency.

Possible sources include:

```text
- recurrence-guidance contamination from the matched historical template
- broader chat-history retrieval of an older COSMIC value
- generation-level factual blending unrelated to Recurrence
```

Do not attribute causality to Recurrence yet. However, because the current diagnostic explicitly reports `REPEATED / MATCH @1708`, preserve the correlation and compare the matched historical response if/when available.

## Coverage gap inside otherwise-correct CUMULATIVE_YOY structure

Status: `DIRECT_EVIDENCE / QUALITY COVERAGE`

The request asks that cumulative values, increases, and growth rates be compared for all listed platform metrics. The output gives correct-looking year-over-year arithmetic for headline follower/member counts, but does not provide complete absolute and percentage deltas for every requested metric.

Examples:

```text
YouTube total videos: 4,936 -> 5,820, +884 shown, percentage omitted
Instagram posts: 290 -> 302, +12 shown, percentage omitted
Instagram reels: 243 -> 255, +12 shown, percentage omitted
TikTok total likes: 125억 -> 160억, absolute/percentage delta omitted
Stock 2029 close 1,450,000 -> 2030 close 1,610,000, target-year absolute/percentage delta omitted
Market cap 217조 -> 241.5조, target-year absolute/percentage delta omitted
```

The stock section instead emphasizes listing-date growth (`10,000 -> 1,610,000`, about +16,000%) even though the request also explicitly requires the 2029 year-end baseline comparison. This is not necessarily wrong, but it is incomplete relative to the requested YoY coverage.

## Repeated lineage over-chain

Status: `REPEATED_DIAGNOSTIC_ANOMALY / HARM UNPROVEN / NON-BLOCKING`

Pair A already showed a self-contained annual summary chained to `root A@2014` (Super Bowl performance). Pair B now repeats the same root:

```text
@2020: root A@2014 · depth 3
@2022: root A@2014 · parent C@2020 · depth 4
```

The parent `C@2020` is semantically plausible for the platform follow-up, but retaining the Super Bowl A-turn as the root across independent aggregation scopes is increasingly suspicious. This confirms the over-chain classification is repeatable at the diagnostic level, though no hard source-lock/state corruption has been demonstrated.

Promote to a scoped Lineage/Aggregation design issue if later evidence shows that the stale root affects retrieval, omissions, or incorrect historical carryover.

## Representation / M2-2 regression control

The current request itself is healthy for Representation ownership:

```text
Prior representation: EXACT
Edit reconcile: SAME_FAST · 1 ms
Edit origin: NONE
Output representation: EXACT
Representation ownership: REPRESENTATION · ledger 9 · mirror TRANSPORT_ONLY
Deferred mirror: COMMITTED
Warnings: 0
```

The previously observed `-24` output mismatch is not the prior representation in this diagnostic. The current prior assistant fingerprint is a different exact pair (`4196:4e43b298`). Since hook counters advanced from 8/8 to 11/11 between shared diagnostics and the visible `@2020/@2021` RAW variant also differs from the earlier shared version, some intermediate reroll/variant replacement or other unshared requests occurred. Do not treat `@2022` as the paired follow-up for the old `-24` mismatch.

## WATCH — unshared request latency spike

Status: `SUSPECTED / EVIDENCE INCOMPLETE`

Current request timing is healthy (`prepared 467 ms`, edit 1 ms, storage 431 ms), but cumulative hook telemetry now reports:

```text
Hook activity: request 11 · output 11
max request/output: 9275.0 / 767.0 ms
```

The previous shared diagnostic reported a maximum request time around 1.657 s. Therefore an unshared request between the two diagnostics reached about 9.275 s. The current diagnostic does not retain that request's breakdown, so cause is unknown. Preserve for correlation with reroll/edit/rebuild activity if the missing diagnostic is later available.

## Host-prefix reset follow-up

Status: `RESOLVED_TO_STABLE_NEW_FAMILY / PROVIDER UNVERIFIED`

The prior request showed a system-prefix family reset to `bb4ec352` and local prefix collapse to 0%. This request shows:

```text
Host prefix: STABLE · SAME_FAMILY
336013:57277cd8 -> 336013:57277cd8 · delta 0
family bb4ec352 -> bb4ec352
Cache topology: 11/42 messages · 398,418/453,610 chars · 87.8%
Cache effect: REUSE_WINDOW_STABLE
SimCore contribution: NOT_FIRST_BREAK
```

This strongly supports the interpretation that the earlier event was a one-time host context/prefix rebase followed by stabilization, not persistent M2-2 Representation-induced prefix churn. Provider cache remains unverified.

## Current scope verdict

```text
ANNUAL_ONLY temporal scope                         distinct contract required
CUMULATIVE_YOY temporal scope                      distinct contract required
recurrence differentiates the shown samples        useful signal, not defect by itself
CUMULATIVE_YOY stale baseline inside visible RAW   DIRECT EVIDENCE
complete YoY metric coverage                       INCOMPLETE
lineage A@2014 over-chain                          REPEATED diagnostic anomaly
M2-2 Representation path                          PASS
host-prefix reset                                  stabilized on new family
unshared ~9.275 s request spike                    WATCH / cause unknown
```

## v0.64.1 production response to this evidence

Status: `PATCHED / LIVE REVALIDATION PENDING`

```text
release: Summary Scope Authority
commit: 0cd0b01440e0d8654a84b64362541a9fbfcb03b3
blob: 2d5d0acf4d2da52874aafaa5bbd074a81c7f7b52
major checkpoint: M2-2 unchanged
```

The patch adds deterministic `ANNUAL_ONLY / CUMULATIVE_YOY / NONE` request classification and scope-specific prompt authority. It does not reset or rewrite Lineage, alter Recurrence matching, parse/repair output bodies, or add persistent state. This preserves the existing over-chain and recurrence signals as attribution controls while testing whether explicit temporal authority alone fixes annual-only contamination and YoY baseline/coverage defects.
