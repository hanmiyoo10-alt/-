# Local Usage Dashboard — Runtime Slimming S0 Evidence at 5.73

Status: **S0 REPOSITORY MEASUREMENT RELEASE SHIPPED — REAL-DEVICE EVIDENCE PENDING**

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
- physical verification: `PENDING`

## What S0 now measures in production code

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

No estimate based on package name, source size or model metadata is a substitute for actual device evidence.

## No-cleanup guarantee

S0 changes observation only.

5.73 introduces:

- new network calls: `0`;
- new CLI launches: `0`;
- new polling loops: `0`;
- new pruning behavior: `0`;
- new request-source inference: `0`.

It does not remove fallbacks, shrink the Request Ledger bound, alter cache TTL/stale policy, change CLI concurrency/timeouts, change scheduling semantics, or alter UNKNOWN handling.

The release-visible decision line is intentionally:

```text
Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence
```

## Repository evidence available now

Repository/CI evidence proves:

- the audit is isolated in `src/64-runtime-weight-audit.part.js`;
- Basic Diagnostics remains outside the audit path;
- P37 prevents new network/CLI/polling/persistence/render scheduling side effects from the audit module;
- P37 preserves the Engine hash exactly;
- P36 preserves the prior instant Diagnostics mode-switch behavior;
- the module registry contains 28 plugin parts and remains authoritative;
- generic two-pass reconciliation is idempotent;
- the complete test registry is GREEN at `78` tests;
- main-to-production exact-byte promotion is verified.

This is enough to say **S0 measurement infrastructure is shipped safely**.

It is not enough to say any particular runtime path is safe to remove.

## Candidate classification state

At this checkpoint, broad removal classifications remain deliberately conservative.

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

Still requires repository plus, where relevant, actual-device evidence:

- whether repeated PocketRisu initialization/resume accumulates any timer/listener ownership unexpectedly;
- managed CLI installed footprint;
- real-device distribution of local normalize/persist/render costs;
- whether any compatibility path has become truly unreachable in current production;
- actual retained-memory impact beyond bounded container counts.

### SAFE REMOVAL CANDIDATE

**None declared at this S0 checkpoint.**

A candidate must be named path-by-path in a later S1 design with evidence showing replacement/obsolescence and regression coverage.

## Real-device evidence still needed

5.73 physical evidence should eventually capture at least:

- successful `+` update to 5.73;
- Basic/Detailed Diagnostics switching remains responsive;
- `Runtime Weight Audit` is visible in Detailed mode;
- reported values remain plausible/bounded across normal refresh/resume use;
- no obvious repeated timer/listener accumulation across realistic device lifecycle use;
- any device-only measurement requested for an S1 decision, especially managed CLI installed footprint.

UNKNOWN is an acceptable observation where the source does not provide an authoritative value.

## S1 entry rule

Do not start a broad cleanup pass from this file alone.

An S1 change is allowed only when it names one bounded removal or consolidation target and provides:

1. exact path/state/parser ownership;
2. evidence that the current path is obsolete, duplicated or safely replaceable;
3. regression coverage for the preserved behavior;
4. full Usage Dashboard regression;
5. unchanged source-fidelity / UNKNOWN / privacy contracts;
6. real-device verification whenever shipped runtime bytes change.

The next slimming decision should therefore be made from evidence, not code size aesthetics.
