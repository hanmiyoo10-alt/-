# Local Usage Dashboard — AI Agent Runtime Audit Standard

This document is a durable development and review contract for `plugins/usage-dashboard/`.

It is derived from the user-provided **AI Agent Runtime Audit Prompt (JavaScript / TypeScript)** imported on 2026-08-26. The source prompt prioritizes real runtime failure risks over formatting or style findings: OOM, retained references, freezes, race conditions, crashes, event-loop blocking, and resource lifecycle failures.

Read this document together with `docs/USAGE_DASHBOARD_GUIDELINES.md` before proposing or finalizing JavaScript/TypeScript runtime changes.

## 1. Scope and trigger

Apply this audit whenever a Local Usage Dashboard change materially touches JavaScript or TypeScript runtime behavior, including:

- browser/dashboard modules and rendering/state code;
- Bridge Engine or Bridge Manager runtime code;
- request capture, cache, scheduler, retry, polling, timer, event, observer, or subscription paths;
- async orchestration, concurrency, deduplication, stale-response protection, persistence, or recovery;
- performance-sensitive parsing, serialization, aggregation, sorting, filtering, or large-payload handling;
- lifecycle-sensitive initialization, teardown, abort, cleanup, process, socket, or listener ownership.

Pure documentation-only changes do not require a runtime audit. A test-only change needs the audit only when it changes runtime harness behavior or introduces long-lived resources.

## 2. Environment inference comes first

Before judging a finding, infer the actual execution environment and state the inference when it matters:

- Browser/dashboard UI
- Node.js
- Deno
- Bun
- Web Worker
- framework-managed runtime

For this repository, do not assume one environment for every file. Browser-facing dashboard code and Node.js Bridge/Manager/tooling have different event-loop, API, lifecycle, and memory behavior.

If an environment conclusion is uncertain, mark it as an inference rather than presenting it as verified fact.

## 3. Audit priority

Style is not the target. Audit in this order of importance:

1. Memory pressure / heap overflow risk
2. Memory leak / retained-reference risk
3. CPU hotspot / main-thread or event-loop blocking
4. Async safety / race-condition risk
5. Error-handling robustness
6. Resource lifecycle / starvation / freeze risk

Do not report semicolon, Prettier, ESLint-style, naming preference, import order, or formatting issues unless they are directly tied to a credible runtime failure.

## 4. Memory pressure / heap overflow risk

Inspect for:

- large arrays or objects created repeatedly;
- repeated spread or `Object.assign` copying on large structures;
- deep clone patterns;
- repeated `JSON.parse` / `JSON.stringify` of large payloads;
- unbounded caches;
- long-lived `Map` / `Set` growth;
- raw response or diagnostic payload retention;
- structures whose lifetime prevents timely reclamation.

For every credible finding, evaluate:

- steady-state heap growth;
- peak-memory amplification;
- long-session OOM potential;
- whether the risk is bounded by an existing cap, TTL, eviction rule, or lifecycle boundary.

Preferred repairs when evidence supports them include streaming, pagination, chunking, lazy evaluation, tighter bounds, and weak references where ownership semantics genuinely fit.

## 5. Memory leak / retained-reference risk

Prioritize references that remain reachable from a GC root. A circular reference by itself is not a leak.

Inspect:

- `setInterval` and long-lived `setTimeout` ownership;
- `EventEmitter` listeners;
- browser event listeners;
- WebSocket lifecycle;
- Observer / Subscription lifecycle;
- missing `AbortController` / abort propagation where cancellation exists;
- promises retained beyond useful lifetime;
- closures capturing large state;
- singleton or module-global caches;
- global arrays/maps/sets that only grow;
- process or child-process handles that can outlive the owning operation.

Every owned resource should have an identifiable end condition or a deliberate process-lifetime justification.

## 6. CPU hotspot / main-thread blocking

Inspect for:

- nested loops and accidental `O(n²)` or worse work;
- repeated sort/filter/reduce passes over the same large collection;
- synchronous crypto or compression in latency-sensitive paths;
- expensive regular expressions;
- large synchronous JSON parsing or serialization;
- repeated normalization or aggregation that can be cached or incrementally maintained.

Classify the relevant complexity when possible: `O(1)`, `O(log n)`, `O(n)`, `O(n²)`, `O(n³)+`.

For browser code, judge UI-freeze risk. For Node.js runtime code, judge event-loop starvation and delayed timers/I/O. Worker/chunk/incremental approaches are appropriate only when they improve the proven bottleneck without breaking source fidelity or lifecycle safety.

## 7. Async safety / race conditions

Inspect for:

- missing `await` or unhandled promise rejection paths;
- concurrent writes to shared state;
- stale response overwrite;
- duplicate request execution;
- retry amplification or retry storms;
- polling overlap or polling leaks;
- uncontrolled recursion;
- race-prone initialization or teardown;
- missing deduplication or in-flight ownership;
- cancellation that does not reach the actual work;
- completion handlers that can run after the owner has been replaced or disposed.

Preserve existing Local Usage Dashboard concurrency caps, deduplication, foreground truth paths, rollback behavior, and UNKNOWN semantics unless the release goal and evidence explicitly justify changing them.

## 8. Error-handling robustness

Inspect for:

- missing `try/catch` where a failure would otherwise crash or escape unexpectedly;
- missing `.catch()` / rejection ownership;
- missing `finally` where cleanup must happen on every path;
- missing timeout handling;
- missing abort handling;
- silent failure that hides an actionable runtime fault;
- fallback behavior that accidentally duplicates work or changes authority;
- failure paths that leave listeners, timers, locks, child processes, temp files, or in-flight state behind.

Judge separately:

- crash possibility;
- silent-failure possibility;
- resource-leak possibility;
- stale-state or recovery corruption possibility.

Do not erase or reinterpret historical errors merely to make current health look green.

## 9. Event-loop starvation / freeze risk

Inspect for long synchronous sections, large loops, synchronous I/O, large parsing/serialization, or CPU-heavy work that can delay:

- browser rendering and input;
- timers;
- snapshot completion;
- Bridge request handling;
- recovery or health checks;
- other queued async work.

Possible repairs include bounded chunk processing, incremental work, worker execution, `queueMicrotask`, or `requestIdleCallback` where the actual runtime and priority semantics make them appropriate. Do not add scheduling complexity without evidence.

## 10. Local Usage Dashboard project-specific application

The generic audit above is mandatory, but findings must also respect this project's established contracts:

- **Evidence before repair.** A plausible risk is not automatically a production bug. Mark static-analysis inference as inference and seek runtime evidence when needed.
- **UNKNOWN stays UNKNOWN.** Never turn missing runtime/data evidence into zero, success, or an invented value.
- **Stable paths stay stable.** Do not rewrite healthy updater, Bridge lifecycle, Request Ledger, Cache Read, DevPass/Credits, navigation, or mobile UI merely because a generic alternative looks cleaner.
- **One release, one primary goal.** If the audit discovers an unrelated Medium/Low issue, record it for later rather than broadening the current release. For unrelated Critical/High risk, stop release progression and record the blocker with evidence.
- **No diagnostic self-harm.** Diagnostics must not introduce unbounded history, raw payload persistence, expensive full scans, unnecessary network calls, or high-frequency polling.
- **Lifecycle ownership must be explicit.** Timers, listeners, child processes, sockets, observers, subscriptions, abort controllers, caches, locks, and in-flight registries must have a clear owner and termination/boundary rule.
- **Regression follows incidents.** When a real runtime defect is fixed, add or update a regression that reproduces the failure class when practical.
- **No style-only churn.** Do not spend a release on formatting or lint preference under the label of runtime safety.

## 11. Release/PR gate

Before a JavaScript/TypeScript runtime-affecting PR is considered ready:

1. Review the changed runtime paths using Sections 4–9.
2. Record all credible findings with the required schema below.
3. Mark uncertain conclusions as inference and assign Confidence.
4. Resolve Critical/High findings before release, unless repository evidence demonstrates the finding is a false positive.
5. For repaired runtime bugs, add or update the narrowest useful regression.
6. Run the relevant focused tests and then the full Usage Dashboard regression registry.
7. Confirm shipped Plugin/Engine/Manager/bootstrap bytes and version changes are exactly the ones intended by the release design.

A GREEN test suite does not by itself prove absence of a runtime lifecycle defect; the static audit complements, rather than replaces, execution-based regression and real-device validation.

## 12. Required finding output schema

Use this exact field set for each finding:

- **Severity:** Critical / High / Medium / Low
- **Location:** file / function / line when available
- **Category:** audit category
- **Issue:** concise failure description
- **Technical Cause:** why the runtime structure can fail
- **Potential Runtime Impact:** OOM / leak / freeze / race / crash / starvation / degraded latency / other concrete impact
- **Estimated Frequency:** Always / Under Load / Rare
- **Confidence:** High / Medium / Low
- **Recommended Fix:** minimal evidence-aligned repair
- **Patch Example:** bounded example when useful; omit speculative broad rewrites
- **Estimated Improvement:** expected stability/performance improvement, stated as estimate when not measured

Do not manufacture line precision when only a function/module-level location is known.

## 13. Required final audit summary

Every completed audit report must end with:

1. Critical issue count
2. Memory leak risk score `0–10`
3. CPU bottleneck risk score `0–10`
4. Long-running stability score `0–10`
5. Expected failure likelihood score `0–10`
6. Priority fix TOP 5

Scores are assessment summaries, not measured telemetry. State that they are static-analysis estimates unless runtime measurements exist.

## 14. Static-analysis truth boundary

This standard is primarily for static review. Do not claim a leak, OOM, freeze, or race was observed in production unless execution evidence exists.

Use the project evidence vocabulary:

- **VERIFIED** — repository state, test execution, production artifact, or real-device diagnostics directly support the statement.
- **SUPPORTED HYPOTHESIS** — multiple observations support the explanation, but causality is not fully proven.
- **UNKNOWN** — current evidence cannot determine the claim.

A static code pattern can justify a finding and a Confidence rating, but it does not automatically make the runtime impact VERIFIED.

## 15. Cross-chat recovery contract

Future Local Usage Dashboard development sessions should read this document whenever the proposed work changes JavaScript/TypeScript runtime behavior.

The durable review order is:

`Production truth → current source → real-device evidence → release/design scope → runtime audit → implementation → focused regression → full regression → PR/CI → release verification → real-device validation`

This audit standard must never override contradictory production evidence, source-fidelity rules, or the project's existing release authority model.
