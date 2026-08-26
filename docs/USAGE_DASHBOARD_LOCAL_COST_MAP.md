# Local Usage Dashboard — Local CPU / Render / Persist Cost Map

Status: **IMPLEMENTATION READY — current-production physical refresh pending**

Idea: `NV-LOCAL-COST-MAP`

## Purpose

Keep a source-backed map of local Dashboard work so optimization follows measured bottlenecks rather than code size or intuition. Missing timing authority stays UNKNOWN.

This document separates remote/source execution from local Plugin work. It does not authorize runtime optimization by itself.

## Current production baseline

Implementation started against repository production:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- contracts `1 / 1`

A current 5.81 physical capture is still required before this item is closed.

## Latest available physical timing evidence before 5.81 acceptance

PocketRisu Diagnostics captured `2026-08-26 09:55:21 KST` on Product `3.0.0-alpha.5.80` reported:

| Area | Observed value | Interpretation |
| --- | ---: | --- |
| Refresh data duration | `5013ms` | end-to-end data work for the captured refresh |
| Snapshot phase | `4836ms` | dominant refresh phase |
| Bridge snapshot attribution | `4623ms` | Bridge-side snapshot work |
| Critical organizations→usageScopes | `4617ms` | dominant source critical path |
| Organizations source | `3049ms` | source/CLI dominated |
| Usage scopes source | `1568ms` | source/CLI dominated |
| CLI exec average | `2541ms` | remote/source execution, not local Plugin CPU |
| CLI exec max | `3014ms` | `devpass-capture-24h` |
| Manager probe | `174ms` | local loopback/process control-plane phase; not Plugin render CPU |
| Persist phase | `135ms` | measured Plugin persistence phase for this refresh |
| Widget render phase | `3ms` | refresh-triggered widget render |
| Normalize ledger phase | `0ms` observed | timer resolution result; treat as `< measurement resolution`, not literal zero CPU |
| Settled widget render | `25ms` | panel-open-settled diagnostic render measurement |
| Panel render | `20ms` | panel render measurement |

The same capture reported widget HTML writes/skips `21 / 64`, style writes/skips `8 / 168`, closed-panel skips `70`, and no render spikes >=50ms. These are dedup activity counters, not direct CPU-duration measurements.

## Cost-map schema

| Local work | Current timing authority | 5.80 evidence | 5.81 evidence | Status |
| --- | --- | --- | --- | --- |
| Request-ledger normalization | `Refresh phase duration: normalize-ledger` | `0ms` observed / below timer resolution | PENDING | measured, coarse |
| Request sort/filter | no dedicated independent timer | bundled into ledger/UI paths | PENDING / UNKNOWN unless a current dedicated field exists | UNKNOWN separately |
| Diagnostics construction | no dedicated construction-only timer | not isolated | PENDING / UNKNOWN | UNKNOWN separately |
| Widget render | refresh phase + render diagnostics | `3ms`; settled render `25ms` | PENDING | measured |
| Panel render | render diagnostics | `20ms` | PENDING | measured |
| DOM/style dedup | write/skip counters; no standalone CPU timer | HTML `21/64`, style `8/168`, closed skips `70` | PENDING | effectiveness observable, CPU UNKNOWN |
| JSON/local persistence | refresh `persist` phase | `135ms` | PENDING | measured phase |
| Manager probe | refresh `manager-probe` phase | `174ms` | PENDING | measured, control-plane |
| Source/CLI | Bridge snapshot + CLI timings | seconds-scale, dominant | PENDING | external/source dominant |

## Interpretation rules

1. A displayed `0ms` from integer/coarse timing means **below measurement resolution**, not zero work.
2. Do not infer CPU time from source bytes, row count, write counts, or algorithm shape when a timing field is unavailable.
3. Do not combine source/CLI latency with local Plugin render/normalize cost when choosing a local optimization target.
4. Do not optimize a local path merely because it has more code or more rows.
5. A local optimization candidate requires repeated evidence that its measured cost is material relative to the overall refresh or causes user-visible stalls.
6. UI stall counters are responsiveness evidence, but a stall with `refresh overlap no` and `render overlap no` is not attributable to Dashboard work without stronger evidence.

## Preliminary 5.80 conclusion

The available 5.80 capture supports the existing Runtime Slimming conclusion: foreground source/CLI execution dominated the refresh by orders of magnitude over measured ledger normalization and render work. Persist was measurable (`135ms`) but still small relative to the multi-second source critical path. This is a historical baseline only; 5.81 must be captured before closure.

## No product change

No new timer, profiler, endpoint, polling, telemetry, persistence or UI is added by this item. Existing Diagnostics fields are the authority. Product bytes and versions must remain unchanged by this measurement work.

## Acceptance

`NV-LOCAL-COST-MAP` is complete when:

1. one current 5.81 PocketRisu Diagnostics capture is recorded;
2. available local timings are copied into the 5.81 column without inference;
3. unavailable isolated costs remain UNKNOWN;
4. the conclusion identifies measured bottlenecks only;
5. `USAGE_DASHBOARD_IDEA_LIST.md` is marked IMPLEMENTED;
6. no product artifact changes are made for the measurement itself.
