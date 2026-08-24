# Local Usage Dashboard — Runtime Slimming & Legacy Pruning Backlog

Status: **DEFERRED — execute after the remaining core feature goals are completed and real-device baselines are stable**

Recorded: `2026-08-24`

Current production baseline at record time:

- Product: `3.0.0-alpha.5.70`
- Bridge Engine: `1.6.21`
- Bridge Manager: `1.3.0`
- Snapshot / recent-request contracts: `1 / 1`
- Release branch: `release-usage-dashboard`

## Why this backlog exists

Local Usage Dashboard is no longer storage-heavy, but its runtime and compatibility surface has grown substantially while features, diagnostics, request fidelity, cache observability, managed CLI lifecycle, and scheduling safeguards were added.

Measured 5.70 production artifacts:

- `latest.js`: `285,979` bytes
- `runtime/bridge-engine.mjs`: `131,496` bytes
- `runtime/bridge-manager.cjs`: `40,542` bytes
- `runtime/bootstrap-bridge-manager.sh`: `4,926` bytes
- `runtime/product-manifest.json`: `1,895` bytes
- Core shipped artifact total: `464,838` bytes (about `454 KiB`)

This size is not itself a device-storage problem. Real-device 5.70 evidence also did not identify plugin normalization or rendering as the primary refresh bottleneck; foreground LLMGateway source/CLI execution dominated refresh duration. The maintenance concern is therefore **complexity, retained lifecycle surface, old compatibility paths, and future regression cost**, not byte-count reduction for its own sake.

The managed `@llmgateway/cli` runtime is provisioned separately and may occupy more device storage than the Dashboard artifacts above. Its actual installed footprint must be measured from the real device before making storage claims.

## Entry condition

Do not begin broad pruning while core product behavior is still being actively completed.

Enter this maintenance phase only after:

1. remaining target feature work is substantially complete,
2. those features have real-device evidence,
3. the current production baseline is READY/healthy with no unresolved behavior regression,
4. any new request-source/provenance work is stable enough that compatibility paths can be judged with evidence rather than guesses.

The currently designed Cross-Scope Request Provenance work and other remaining core goals take priority over this backlog.

## Core principle

> **Measure before delete. Preserve behavior before shrinking code.**

A path is not removable merely because it looks old, duplicated, or rarely used. Removal requires repository evidence, executable regression coverage, or real-device evidence sufficient to show that the path is obsolete or safely replaced.

UNKNOWN semantics remain authoritative: missing source data must never be replaced with `0`, guessed values, model-name inference, provider inference, or reconstructed metadata.

## Non-goals

This phase is not primarily about:

- minifying code to win a byte-count contest,
- rewriting working architecture for style,
- combining cleanup with unrelated feature work,
- removing fallbacks only because the happy path currently works,
- changing CLI concurrency, timeout, TTL, stale policy, secondary-refresh semantics, updater behavior, or request fidelity without separate evidence,
- changing the PocketRisu `+` update workflow.

## Audit targets

### 1. Runtime compatibility and fallback paths

Inventory legacy and compatibility branches in Plugin, Engine, and Manager.

For each path record:

- current owner,
- trigger condition,
- whether a regression test exercises it,
- whether real-device evidence has ever exercised it recently,
- replacement path if one exists,
- removal confidence.

Remove only paths proven obsolete or fully superseded.

### 2. Parser and normalizer duplication

Review repeated handling for:

- recent requests,
- request metadata enrichment,
- cache usage,
- service tier,
- duration/provenance,
- organization and usage normalization,
- diagnostics formatting.

Consolidation must preserve source fidelity and request dedupe identity. Parser cleanup must not broaden coercion or infer missing fields.

### 3. Retained state and memory lifecycle

Measure and audit:

- long-lived `Map` / `Set` instances,
- cache entry bounds and pruning,
- in-flight Promise retention,
- Request Ledger retention,
- render caches,
- secondary-refresh queue state,
- diagnostics/performance history,
- closures retaining large response objects.

Prefer bounded retention and explicit lifecycle ownership. Do not replace a bounded strong reference with a more complex mechanism without measured benefit.

### 4. Timers, schedulers, and event lifecycle

Inventory:

- timer refresh scheduling,
- visibility/resume handling,
- interaction defer/grace scheduling,
- panel render scheduling,
- performance/stall probes,
- Manager/Engine lifecycle probes.

Prove that repeated initialization, resume, panel open/close, and runtime adoption do not accumulate duplicate timers, listeners, or scheduled work.

### 5. CPU and render work

Measure before optimization:

- request ledger normalization cost,
- sorting/filtering passes,
- diagnostics text construction,
- widget and panel render duration,
- style/HTML write dedup effectiveness,
- JSON serialization/persistence cost.

Do not optimize code that is not a measured bottleneck. Current real-device evidence indicates source/CLI latency is substantially larger than local ledger/render cost.

### 6. Repository-only historical weight

Separately audit development/release history such as old patch scripts and retired release helpers.

Repository cleanup is not a runtime optimization and must be tracked separately from shipped artifact changes. Preserve incident history and reproducibility where it still provides operational value; archive or retire only redundant tooling with clear replacement evidence.

### 7. Managed CLI footprint

Before claiming device-storage savings, measure the actual installed managed CLI runtime and dependency footprint on PocketRisu/Android.

This measurement is real-device-only. Do not estimate it from package names or GitHub artifact size.

## Execution sequence

### S0 — Measurement-only Runtime Weight Audit

No behavior change.

Produce a baseline covering:

- shipped artifact sizes,
- source-module sizes,
- long-lived state/container inventory,
- cache/queue bounds,
- timer/listener ownership,
- compatibility/fallback inventory,
- parser/normalizer duplication candidates,
- measured local normalization/render/persist timings from diagnostics,
- managed CLI installed size when real-device measurement is appropriate.

Classification for every candidate:

- `KEEP — active contract`
- `KEEP — fallback still required`
- `MEASURE MORE`
- `SAFE REMOVAL CANDIDATE`

S0 is diagnostic/maintenance evidence only. It must not silently turn into a cleanup release.

### S1+ — Small removal/consolidation PRs

After S0, execute cleanup in small bounded PRs. One primary removal or consolidation goal per PR.

Each PR must:

1. name the exact path/state/parser being removed or consolidated,
2. cite the evidence that makes the change safe,
3. add or update the relevant regression,
4. run the full Usage Dashboard regression suite,
5. preserve current source-fidelity/UNKNOWN/privacy contracts,
6. preserve the `+` update path,
7. require real-device verification whenever a shipped runtime artifact changes.

If a cleanup changes the Engine or Plugin runtime artifact, version and publish it through the normal monotonic release flow. Repo-only cleanup must not force a product version bump.

## Protected contracts during slimming

Unless a separate evidence-led release explicitly changes them, preserve:

- Managed CLI launcher authority,
- CLI hard concurrency cap and timeout,
- Credits early-start semantics,
- 24h foreground truth,
- long-window stale/deferred-refresh behavior,
- secondary-refresh bounded queue/concurrency behavior,
- cache TTL and stale maximums,
- circuit/recovery behavior,
- request identity and enrichment semantics,
- Cache Read/Write/TTL fidelity,
- request duration fidelity,
- service-tier/outcome fidelity,
- cross-scope provenance rules once shipped,
- snapshot/recent-request contract compatibility,
- Manager self-update / Engine managed bundle lifecycle,
- PocketRisu `+` automatic update flow.

## Success criteria

The slimming phase is successful when the product becomes easier and safer to maintain **without losing observable behavior**.

Useful outcomes include:

- fewer obsolete runtime branches,
- fewer duplicated parsers/normalizers,
- simpler lifecycle ownership,
- bounded retained state with explicit evidence,
- fewer unnecessary timers/listeners or repeated passes if measured,
- smaller shipped artifacts where reduction follows naturally from safe removal,
- reduced regression and release-maintenance cost,
- no regression in real-device READY/health, request fidelity, updater, CLI, cache, or scheduling behavior.

A smaller file by itself is not success. A simpler, measured, regression-protected runtime is.
