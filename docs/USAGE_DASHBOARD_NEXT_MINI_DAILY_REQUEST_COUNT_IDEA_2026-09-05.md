# Local Usage Dashboard — next mini idea: daily request count

Date: 2026-09-05 KST  
Status: **PARKED IDEA · SOURCE FEASIBLE · NO DESIGN/IMPLEMENTATION/RELEASE AUTHORIZATION**

## Fresh authority read-back

- repository: `hanmiyoo10-alt/-`
- observed main: `77532a94fbd16e03ab1ed94f0c4a77abc8763b3a`
- production branch: `release-usage-dashboard`
- production release SHA: `82c4f900cf548068d1eada957c982a5d78f1347b`
- production Product: `3.0.0-alpha.5.98`

This note does not override the existing physical-acceptance gate for 5.98.

## User idea

On the existing `일간 총 사용량 · 관측` mini card, also show how many requests were made for the represented day.

Candidate presentation:

```text
일간 총 사용량 · 관측
$0.1234
요청 17회
```

This is intentionally additive. The current daily amount remains the primary value and existing cards/analytics semantics stay unchanged.

## Source feasibility finding

The current Usage Dashboard source already preserves authoritative daily scalar metadata through `dailySeries` buckets. Each bucket can carry:

- `date`
- `requestCount`
- `inputTokens`
- `cachedTokens`
- `totalTokens`

`requestCount` is normalized as an explicit finite non-negative scalar or `null` when unavailable. The bridge source also derives the daily series from official activity rows; no new endpoint, local request counter, estimate, or paid/artificial traffic is required just to support this idea.

Therefore a truthful request-count display is feasible without inventing data.

## Proposed truth rule for the future mini design

When the future implementation is actually authorized:

1. select the authoritative daily bucket corresponding to the same displayed KST day;
2. display `요청 N회` only when `requestCount` is an explicit finite non-negative source value;
3. if the bucket or request count is unavailable, display `요청 —`;
4. never convert UNKNOWN to `0회`;
5. do not reconstruct the count from Request Ledger retention, local UI events, model rows, token totals, cost, or another inferred metric;
6. do not add another network request, timer, poller, persistence owner, or local history database solely for this UI line.

## Scope constraint

This idea is for the existing daily-observation surface only. It is separate from the already-designed DevPass billing-cycle summary, which also uses daily `requestCount` for a different window and fidelity contract.

The future mini design must freshly verify which scope/day bucket is semantically aligned with the existing `observedDailyTotal` card before binding the displayed count. If the monetary daily total and an available request-count series do not represent the same authority/window, the UI must fail closed rather than imply equivalence.

## Expected implementation shape

Preferred change size:

- one small derived selector/helper for the current KST day's explicit `requestCount`;
- one additive UI line in the existing `일간 총 사용량 · 관측` mini card;
- bounded Diagnostics line or extension identifying the selected date/count/source state;
- focused regression coverage for explicit count, explicit zero, missing count, missing bucket, date mismatch, and no-new-I/O behavior;
- full existing Usage Dashboard regression registry remains GREEN.

No source/runtime/version change is authorized by this note.

## Gate

Do not start the versioned mini-design/implementation transaction until the current production `3.0.0-alpha.5.98` physical PocketRisu acceptance state and release authority are freshly read back according to the normal Usage Dashboard release loop.
