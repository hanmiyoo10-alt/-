# Local Usage Dashboard 5.73 — Physical Verification Closure

Status: **PHYSICAL PASS**

Recorded: `2026-08-25`

This document records the actual-device closure for `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`. Repository/CI/deployment history remains in `docs/USAGE_DASHBOARD_573_RELEASE_CLOSURE.md`; S0 evidence and slimming classification remain in `docs/USAGE_DASHBOARD_RUNTIME_SLIMMING_S0_573_EVIDENCE.md`.

## Verified runtime

- Product: `3.0.0-alpha.5.73`
- Engine: `1.6.22`
- Manager: `1.3.0`
- Snapshot / recent-request contracts: `1 / 1`
- READY / Health ok
- active local errors: `0`
- refresh failures: `0`
- updater: compatible / sync current
- Bridge modules stale at acceptance: `0`

The device had been running the plugin for more than 2.5 hours when the S0 Detailed Diagnostics evidence was captured.

## Detailed Runtime Weight Audit — physical evidence

The `Runtime Weight Audit` section was visibly present in Detailed Diagnostics and reported:

```text
Runtime Weight Audit: measurement-only · network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0
Retained state: Request Ledger 105/2000 · state keys 49 · widget cache fields 4/4 · responsive style keys 6
Lifecycle ownership: timers 4/8 [refresh,reset-sync,ui-stall-probe,resume-measure] · idle handles 0/2 · long-task observer idle
Listener ownership: remote 5 · widget remote 5 · DOM 5
In-flight ownership: refresh idle · resume idle · resume measure pending · stale async drops 0
Scheduler counters: queued 58 · merged 1 · executed 58 · interaction deferred 0
Bridge retained work: cache entries 25 · cache in-flight 0 · CLI active 0 · CLI queued 0 · secondary queued 0 · running 0
Local cost: normalize-ledger 0ms · persist 125ms · widget-render phase 0ms · last render 0ms · panel 12ms · persist writes 65
Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence
```

## Interpretation

- The audit surface is physically visible and populated from runtime counters.
- Request Ledger retention is bounded and well below its 2000-row cap in this sample.
- No stale async drops were observed.
- No Bridge cache in-flight work, CLI queued/active work, or secondary queued/running work remained at capture time.
- Local normalization/render costs were tiny in this sample; persistence was measurable but sub-second.
- The visible named timer/listener ownership counts are suitable for later lifecycle comparison, but one snapshot does not prove that every lifecycle sequence is accumulation-free.
- Heap bytes, Android RSS, OS-level CPU and managed CLI installed footprint remain UNKNOWN unless separately measured on-device.
- No runtime path is authorized for removal from this physical snapshot alone.

A prior isolated render spike dominated by `ensure` (`7328ms` of `7345ms`) remains `MEASURE MORE`; it is not classified as a cleanup target without reproduction and ownership evidence.

## Final 5.73 verdict

```text
repository / CI: PASS
production deployment: PASS
exact-byte parity: PASS
actual-device READY/health: PASS
Detailed Runtime Weight Audit visibility: PASS
bounded S0 metrics: PASS
new runtime errors/failures: NONE OBSERVED
5.73 S0 physical verification: PASS
```

5.73 is closed as the measurement baseline. The next slimming step must remain evidence-led: one bounded S1 removal or consolidation target per design/release, with full regression and physical verification whenever shipped runtime bytes change.
