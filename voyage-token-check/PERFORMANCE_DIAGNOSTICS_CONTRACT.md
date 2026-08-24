# Voyage Token Check — Performance & Diagnostics Contract

## Product goal

Voyage Token Check must remain a **lightweight plugin**.

The plugin exists to make Voyage status/usage easier to inspect, not to add a permanent background workload to RisuAI. Performance is therefore a product requirement, not a later optimization task.

Primary rule:

> Idle should be almost free. Work should happen only when the user or real Voyage activity gives the plugin a reason to work.

## 1. In-plugin diagnostics UI

The full dashboard should expose a `진단 로그` action with two levels:

```text
진단 로그
├─ 요약
└─ 상세
```

Diagnostics are a support/performance tool. They must not become a second telemetry system or a source of background overhead.

### Summary view

The summary view is the default diagnostic surface and should be cheap enough to remain available during normal use.

It may show compact normalized fields such as:

- plugin version;
- active provider(s) and availability;
- current source / fidelity / scope;
- last successful refresh time;
- last refresh duration;
- refresh status: idle / running / success / degraded / failed;
- count of plugin-visible Voyage observations considered during the latest refresh;
- count of usable Voyage observations from the latest refresh;
- module health summary;
- mini-widget enabled/disabled state;
- current activity state when known;
- latest normalized error category, if any;
- freshness/stale state of the current trustworthy snapshot.

The summary view should be built from counters/timestamps/state already produced by normal module work. Opening the summary should not trigger a deep scan merely to populate diagnostics.

### Detail view

The detail view is for targeted troubleshooting and performance investigation.

It may show a bounded recent sequence of structured diagnostic events such as:

```text
refresh.start
provider.observe.start
provider.observe.end      duration=...
normalize.end             duration=...
snapshot.commit
render.end                duration=...
refresh.end               duration=... outcome=success
```

Useful event fields may include:

- timestamp;
- module / phase;
- operation category;
- duration when measured;
- success / degraded / failed outcome;
- normalized counts;
- source / fidelity category;
- normalized error category;
- whether cached/stale state was retained.

The detail view must remain **bounded**. Do not keep an unbounded session history.

Exact event capacity is **UNKNOWN until real-device measurement**. Choose the smallest capacity that still makes performance regressions diagnosable.

## 2. Diagnostics security boundary

Neither summary nor detail diagnostics may expose or retain:

- Voyage API keys;
- Authorization headers;
- access/refresh/session tokens;
- browser cookies or sessions;
- raw request bodies;
- raw response bodies by default;
- full fetch-log payloads;
- copied account/project secrets;
- sensitive user content merely because it passed through a request.

Diagnostics should report **shape, category, count, timing, and outcome**, not sensitive payload content.

Example:

```text
GOOD: voyage response recognized, usage field present, 34 ms
BAD:  full raw Voyage response/body dumped into diagnostics
```

## 3. Lightweight-by-default diagnostics

Diagnostics themselves must be designed not to create the problem they are measuring.

### Normal mode

In normal operation:

- maintain only low-cost counters, timestamps, state categories, and a minimal bounded event buffer;
- do not stringify/store raw network payloads for diagnostics;
- do not duplicate provider parsing just for the diagnostic screen;
- do not perform extra network requests solely to populate diagnostics;
- do not continuously calculate expensive aggregates that are invisible to the user.

### Detailed investigation mode

If later evidence shows that deeper tracing is necessary, it should be explicitly user-triggered and temporary.

Preferred lifecycle:

```text
normal lightweight metrics
→ user opens/enables detailed investigation
→ bounded extra timing/detail capture
→ user closes/stops investigation or bounded window ends
→ return to normal lightweight metrics
```

Detailed diagnostics must not silently remain in a high-overhead mode forever.

## 4. Performance architecture rules

### Idle behavior

When the plugin dashboard is closed, the floating widget is disabled/hidden, and no relevant Voyage activity needs observation:

- no permanent high-frequency polling;
- no repeated dashboard rendering;
- no repeated model-catalog processing;
- no repeated diagnostics formatting;
- no unbounded timers;
- no background history compaction work.

The target is near-zero avoidable plugin work while idle.

### Refresh behavior

Reuse the shared `RefreshCoordinator`.

- one refresh coordinator, not one loop per feature;
- deduplicate concurrent refresh requests;
- dashboard open may trigger one bounded refresh;
- visible/live state may use bounded visible-only refresh when justified;
- stop active refresh work when no visible/relevant surface requires it;
- do not poll faster merely because the diagnostic page is open unless a temporary measurement mode explicitly needs it.

### Data handling

- normalize once, then share normalized state;
- discard raw Risu fetch-log material after the minimum necessary parsing;
- avoid copying large payloads between modules;
- keep diagnostic/event buffers bounded;
- keep cached normalized state minimal;
- do not maintain exact cumulative history until lifecycle/deduplication semantics are VERIFIED.

### UI/rendering

- the dashboard should render from `SnapshotStore`, not re-parse provider data;
- unused models remain collapsed by default and should not require expensive repeated layout work while hidden;
- diagnostic detail formatting should be lazy/on-demand;
- the floating widget remains status-only and must not run independent token accounting/render loops;
- avoid animation or visual effects that create continuous work without improving the core product goal.

## 5. Performance measurement phases

When measuring performance, attribute time to meaningful phases rather than only reporting one total number.

Conceptual phases:

```text
refresh requested
→ source acquisition / fetch-log snapshot access
→ Voyage observation filtering
→ response parsing
→ normalization
→ snapshot commit
→ model activity classification
→ visible UI render
→ refresh complete
```

Measure only phases that materially help isolate regressions.

Do not instrument every tiny function if the instrumentation itself creates noise or cost.

## 6. Performance summary signals

The diagnostic summary should eventually make common performance problems obvious at a glance.

Examples of useful signals:

- `마지막 갱신: 82 ms`;
- `소스 관측: 20 entries → Voyage 2 → usable 2`;
- `모듈 상태: 7 정상 / 1 비활성`;
- `상세 추적: 꺼짐`;
- `백그라운드 갱신: 없음`;
- `현재 상태: idle`.

Exact labels may change with the real UI, but the principle is stable: the summary should tell whether the plugin is healthy and whether a refresh is unexpectedly expensive without requiring a raw log dump.

## 7. Performance budget policy

Exact numeric budgets for CPU time, memory, refresh interval, dashboard-open latency, and event-buffer size are **UNKNOWN until real-device baseline measurement**.

Do not invent fixed budgets before measuring the user's real Risu environment.

Instead:

1. establish a real-device baseline;
2. measure dominant phases;
3. set practical budgets from evidence;
4. treat material regressions against that baseline as release blockers unless justified;
5. optimize the dominant phase first rather than micro-optimizing unrelated code.

A future release that adds a feature should not materially increase idle work, refresh frequency, retained memory, or dashboard-open latency without evidence that the cost is necessary and acceptable.

## 8. Module ownership

`DiagnosticsModule` owns diagnostic presentation and the bounded diagnostic event contract.

It must not own provider parsing or duplicate performance-critical logic.

Suggested ownership:

- provider timings/counts → provider modules publish normalized health/measurement events;
- refresh lifecycle timing → `RefreshCoordinator`;
- snapshot commit/freshness → `SnapshotStore`;
- render timing where useful → owning UI module;
- diagnostic aggregation/presentation → `DiagnosticsModule`.

This preserves module isolation and prevents diagnostics from becoming a cross-cutting dependency that every module must call directly.

## 9. Failure behavior

Diagnostics are non-critical product functionality.

If detailed diagnostics fail:

- normal Voyage usage observation should continue;
- dashboard should continue where possible;
- mini widget should continue where possible;
- no provider should fail solely because diagnostic recording failed.

If a performance/diagnostic buffer is full, drop/overwrite the oldest bounded diagnostic event rather than growing memory without limit.

## 10. UX design decision

**DESIGN DECISION:** the dashboard includes `진단 로그` with `요약` and `상세` views.

**DESIGN DECISION:** Voyage Token Check targets a lightweight runtime profile.

**DESIGN DECISION:** summary diagnostics use low-cost state already generated by normal operation; detailed diagnostics are bounded and on-demand.

**DESIGN DECISION:** idle work, duplicate polling, raw-payload retention, unbounded history, and diagnostics-driven background processing are prohibited by default.

## Current evidence status

- VERIFIED: the project already centralizes refresh and normalized snapshot state at the design level.
- VERIFIED: the current design already avoids permanent high-frequency polling and raw credential retention.
- DESIGN DECISION: add two-level in-plugin diagnostics (`요약` / `상세`).
- DESIGN DECISION: lightweight runtime behavior is a primary product requirement.
- UNKNOWN: actual real-device refresh duration, memory cost, render cost, ideal live-refresh interval, and the smallest useful diagnostic event capacity.

## Next evidence gate

Stage 0 real-device validation should gather the smallest safe performance baseline needed to answer:

- how long one normal Voyage-observation refresh takes;
- which phase dominates;
- whether plugin-visible fetch-log inspection is cheap enough for visible-only live refresh;
- whether the plugin creates any noticeable idle work;
- how much diagnostic detail is needed to explain slow paths without retaining raw payloads;
- whether dashboard opening/rendering remains subjectively immediate on the target device.

This measurement remains diagnostic evidence. It does not justify changing production behavior in the same diagnostic-analysis turn under `PROJECT_MEMORY.md`.
