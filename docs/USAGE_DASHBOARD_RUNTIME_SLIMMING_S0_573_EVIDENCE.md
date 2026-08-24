# Local Usage Dashboard — Runtime Slimming S0 Evidence at 5.73

Status: **S0 PHYSICAL BASELINE VERIFIED — READY FOR EVIDENCE-LED S1 DESIGN**

Recorded: `2026-08-25`

Related backlog: `docs/USAGE_DASHBOARD_RUNTIME_SLIMMING_BACKLOG.md`
Related release closure: `docs/USAGE_DASHBOARD_573_RELEASE_CLOSURE.md`

## Baseline

The S0 measurement-only release is:

- Product: `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`
- Engine: `1.6.22`
- Manager: `1.3.0`
- contracts: `1 / 1`
- main merge: `bb7e51101da55b2877e5cd0ee6350e058a1e2299`
- production release branch: `87b934a0e153c1c7ddd77ab44750154cd195f57b`
- Engine SHA-256: `85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69`
- exact-byte parity: `VERIFIED`
- physical verification: `PASS`

## What S0 measures

5.73 adds a Detailed-Diagnostics-only `Runtime Weight Audit` backed only by already-existing runtime state and counters.

The audit records or exposes bounded evidence for:

- Request Ledger current row count against the existing `2000`-row bound;
- persistent state key count;
- widget render-cache field occupancy and responsive-style key count;
- active timer names and total known timer slots;
- idle-handle count;
- long-task observer active/idle state;
- remote, widget-remote and DOM listener counts;
- refresh / resume / resume-measure in-flight state;
- stale async drop count;
- scheduler queued / merged / executed / interaction-deferred counters;
- Bridge cache entry / cache in-flight / CLI active / CLI queued counters when provided;
- secondary refresh queued/running counters when provided;
- existing local `normalize-ledger`, `persist`, `widget-render`, overall render and panel-render timings;
- persist write count.

This measurement surface does not add a second instrumentation pipeline. It reads existing ownership/counter surfaces when Detailed Diagnostics is built.

## Explicit non-measurements

The following values are intentionally **not inferred**:

- JavaScript heap bytes;
- Android process RSS;
- managed `@llmgateway/cli` installed footprint;
- OS-level CPU usage;
- device-level wakeups or energy draw.

Where no authoritative runtime source exists, the audit reports `UNKNOWN` or leaves the measurement to a later real-device check.

## No-cleanup guarantee

S0 changes observation only.

5.73 introduces:

- new network calls: `0`;
- new CLI launches: `0`;
- new polling loops: `0`;
- new pruning behavior: `0`;
- new request-source inference: `0`.

It does not remove fallbacks, shrink the Request Ledger bound, alter cache TTL/stale policy, change CLI concurrency/timeouts, change scheduling semantics, or alter UNKNOWN handling.

The release-visible decision line remains:

```text
Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence
```

## Repository evidence

Repository/CI evidence proves:

- the audit is isolated in `src/64-runtime-weight-audit.part.js`;
- Basic Diagnostics remains outside the audit path;
- P37 prevents new network/CLI/polling/persistence/render scheduling side effects from the audit module;
- P37 preserves the Engine hash exactly;
- P36 preserves the prior instant Diagnostics mode-switch behavior;
- the complete test registry is GREEN at `78` tests;
- main-to-production exact-byte promotion is verified.

## Real-device evidence — 2026-08-25

PocketRisu/Android physical verification captured 5.73 in READY state after more than 2.5 hours of runtime uptime.

Verified health:

- Product `3.0.0-alpha.5.73`;
- Engine `1.6.22`;
- Manager `1.3.0`;
- READY / Health ok;
- active local errors `0`;
- failures `0`;
- Bridge modules stale `0`;
- updater compatible / sync current;
- Request fidelity exact `98/98` at the diagnostic checkpoint;
- account-wide provenance capture active with no conflicts.

Detailed Diagnostics physically displayed the `Runtime Weight Audit` section with the following observed snapshot:

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

Interpretation at this checkpoint:

- the Request Ledger remains far below its explicit `2000`-row bound;
- no stale async drops were observed;
- no Bridge cache in-flight, CLI queued/active, or secondary-refresh queued/running work remained at capture time;
- local normalize/render costs were tiny in the observed sample while persistence remained measurable but sub-second;
- listener/timer counts are now physically observable and bounded by named ownership slots, but this single snapshot does not by itself prove long-term non-accumulation across all lifecycle patterns;
- no runtime path is reclassified as removable merely from these counts.

A previously observed one-off render spike dominated by `ensure` (`7328ms` of `7345ms`) remains a `MEASURE MORE` candidate rather than a cleanup target because it was isolated, did not coincide with render overlap, and has not yet been reproduced as a stable bottleneck.

## Candidate classification state

### KEEP — active contract

Keep unless a separate evidence-led release changes the contract:

- Request Ledger bound and request identity/enrichment semantics;
- Managed CLI launcher authority;
- CLI concurrency/timeout rules;
- Credits early-start behavior;
- foreground 24h truth and long-window stale/deferred-refresh behavior;
- bounded secondary-refresh queue/concurrency;
- cache TTL/stale maximums;
- circuit/recovery behavior;
- cache read/write/TTL fidelity;
- request duration, service-tier, outcome and cross-scope provenance fidelity;
- Manager self-update / Engine bundle lifecycle;
- PocketRisu `+` update path.

### KEEP — fallback still required

No fallback is reclassified as removable solely because 5.73 can observe lifecycle state. Existing compatibility and recovery paths retain their prior contracts until a focused evidence review proves otherwise.

### MEASURE MORE

- repeated PocketRisu initialization/resume timer/listener ownership across longer lifecycle samples;
- managed CLI installed footprint;
- real-device distribution of local persistence cost;
- isolated long `ensure` render spike;
- whether any compatibility path has become truly unreachable in current production;
- actual retained-memory impact beyond bounded container counts.

### SAFE REMOVAL CANDIDATE

**None declared by S0 alone.**

A candidate must be named path-by-path in a later S1 design with evidence showing replacement/obsolescence and regression coverage.

## S1 entry rule

An S1 change is allowed only when it names one bounded removal or consolidation target and provides:

1. exact path/state/parser ownership;
2. evidence that the current path is obsolete, duplicated or safely replaceable;
3. regression coverage for the preserved behavior;
4. full Usage Dashboard regression;
5. unchanged source-fidelity / UNKNOWN / privacy contracts;
6. real-device verification whenever shipped runtime bytes change.

The next slimming decision should therefore be made from evidence, not code size aesthetics.
