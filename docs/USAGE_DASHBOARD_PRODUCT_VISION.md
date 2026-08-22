# Local Usage Dashboard — Product Vision

This document is the durable product-level memory for Local Usage Dashboard. It exists so a new chat or development session can recover not only the current version and next task, but also why the product exists, what "good" means, and how to recognize completion.

Read this together with `docs/USAGE_DASHBOARD_GUIDELINES.md`, the current production manifest, and the latest real-device diagnostic evidence before proposing a major direction change.

## North Star

**Make Local Usage Dashboard the one trustworthy local place to understand DevPass, Credits, and LLMGateway usage inside PocketRisu.**

The finished product should be fast enough to keep open, exact enough to trust, simple enough to use without understanding the bridge internals, self-updating through PocketRisu `+`, and diagnosable from its own evidence when something goes wrong.

The goal is not to maximize the number of visible metrics. The goal is to let the user understand the real current state quickly and accurately.

A useful shorthand is:

`Real source data → faithful local model → efficient runtime → understandable UI → safe update → supportable product`

## Product principles

### 1. Truth before completeness

- Display only data supplied by a real source.
- UNKNOWN is a valid state and must remain distinct from known zero.
- Never invent Cache Write, TTL, token, cost, usage or account values to make the dashboard look complete.
- Provenance matters: a value should be explainable in terms of the source that supplied it.

### 2. Stable before clever

- Preserve working behavior unless evidence shows a reason to touch it.
- Prefer small, explainable changes over broad rewrites.
- One mini release should normally have one primary goal.
- A performance improvement is not successful if it weakens correctness, recovery, update safety or source fidelity.

### 3. Measure before optimize

- Diagnose first, then design in a later turn.
- Use real-device attribution to identify the dominant phase before changing scheduling, caching, rendering or concurrency.
- Treat VERIFIED, SUPPORTED HYPOTHESIS and UNKNOWN as different evidence levels.
- Optimize the measured bottleneck, not the most interesting subsystem.

### 4. Local-first, low-friction operation

- Normal updates use PocketRisu `+`.
- Routine releases must not require manual Termux edits, token copying, file replacement or one-off bootstrap steps.
- Runtime behavior should remain useful after long-lived use, resume/visibility transitions and recoverable upstream failures.

### 5. Diagnostics are a product capability

- Diagnostics should function as a bounded black-box recorder for runtime, source, cache, scheduling and recovery evidence.
- They must be useful enough that a real-device diagnostic can usually distinguish the next investigation target without invasive manual debugging.
- Diagnostics must not leak secrets, raw credentials, sensitive CLI payloads or unbounded raw data.

### 6. Updates must be boring

- A validated newer release must never be downgraded by a stale publisher.
- Broken candidates must not replace a working production version.
- Main/release state, artifact identity and version monotonicity must stay verifiable.
- Cross-product activity in the repository must not silently corrupt Local Usage Dashboard production.

### 7. Product clarity over metric density

- Overview should answer the common questions quickly.
- Detailed DevPass, Credits, Analytics, Request Ledger and cache evidence should remain available when needed.
- Advanced diagnostics can be dense; the normal user path should not be.
- Existing good mobile behavior, navigation persistence and floating-widget interaction are protected unless real-device evidence shows a concrete problem.

## Definition of done

Local Usage Dashboard is not "done" because a particular version number is reached. RC and stable readiness require evidence across all of the following dimensions.

### Data fidelity complete enough to trust

- Useful DevPass/Credits/LLMGateway fields needed by the product are sourced faithfully.
- Request identity, provider/model/service-tier and cache semantics remain exact where observable.
- Remaining unavailable fields are explicitly UNKNOWN rather than guessed.
- Old useful DevPass-widget behavior is either migrated, deliberately superseded, or explicitly documented as unavailable because no real source exists.

### Runtime performance is no longer a daily usability problem

- Dominant refresh latency is understood with attribution rather than guessed.
- Avoidable duplicate source work and unnecessary serialization have been removed where safe.
- Normal refresh, resume and visibility behavior are responsive enough for representative PocketRisu use without sacrificing correctness.
- UI rendering is not allowed to become a hidden replacement bottleneck after data-path optimization.

### Long-lived runtime behavior is reliable

- Bridge lifecycle and Manager/Engine adoption remain healthy across representative long-running sessions.
- Recoverable incidents preserve history while current readiness reflects current health.
- Cache/circuit/stale behavior remains explainable and regression-covered.
- No known recurring failure requires routine manual shell repair.

### Update and release behavior is trustworthy

- PocketRisu `+` remains the normal update path.
- Failed candidates cannot replace healthy production.
- Stale publishers cannot downgrade production.
- Main and `release-usage-dashboard` artifact identity can be re-verified after release.
- Relevant production incidents have regression coverage.

### UX is sufficient as the primary local usage view

- The user can understand current usage/account state without opening a different DevPass usage tool for normal needs.
- Detail views remain available without overwhelming the common path.
- Mobile layout, state persistence and interaction remain dependable.
- Diagnostics remain strong enough for development/support without dominating ordinary use.

### RC/stable evidence exists

- Alpha experimentation has been intentionally frozen before RC.
- Remaining UNKNOWNs and accepted limitations are documented.
- Representative real-device validation covers update, refresh, resume/visibility, data fidelity, recovery and long-lived use.
- There is no known blocker that requires broad architectural churn before stable.

## Current product position

Current production must always be read from the repository; do not copy a version number from this document into a release decision.

Strategically, the product is still in **alpha**.

- **Performance/scheduling:** active. Recent work has moved from blind latency to measured snapshot/CLI attribution; the next performance repairs should continue from real timeline evidence.
- **Data fidelity/DevPass parity:** partially mature. Request/cache/account semantics are protected, but parity should continue only from actual source capability.
- **UX/feature parity:** useful but not considered finished. Preserve stable mobile/navigation behavior while completing only evidence-backed parity gaps.
- **Stability/release engineering:** materially improved. Runtime recovery, shared main-writer coordination and monotonic release publishing are established foundations, not reasons to stop testing release safety.
- **RC/stable readiness:** not yet declared. Stable comes after measured performance, sufficient parity, update reliability and representative long-lived device evidence converge.

## Strategic decision hierarchy

When roadmap, intuition and evidence disagree, use this order:

1. Actual `release-usage-dashboard` production artifacts and manifest.
2. Current `main` source under `plugins/usage-dashboard/`.
3. Latest representative Android/PocketRisu diagnostic evidence.
4. Regression tests and current release/update machinery.
5. `USAGE_DASHBOARD_GUIDELINES.md` current development memory and long-term roadmap.
6. This product vision for strategic direction.
7. Hypotheses and ideas.

The vision supplies direction, not permission to ignore contradictory production evidence.

## Relationship to the long-term roadmap

The roadmap in `USAGE_DASHBOARD_GUIDELINES.md` remains the working phase plan:

`Performance & scheduling → Data fidelity & DevPass parity → UX & feature parity → Stability/release engineering → RC/stable readiness`

These phases may overlap. They are not a rigid version sequence. A production incident can temporarily move stability work ahead of performance, and new source evidence can change a parity plan.

The North Star and product principles should change rarely. Current development memory should change frequently. The roadmap should change when strategic phases materially advance or new evidence invalidates the old shape.

## Cross-chat recovery contract

A new chat or development session should reconstruct the project in this order before proposing a major update:

1. Read current production from `release-usage-dashboard` and `plugins/usage-dashboard/runtime/product-manifest.json`.
2. Read `docs/USAGE_DASHBOARD_GUIDELINES.md` for operating rules, current development memory and the long-term roadmap.
3. Read this Product Vision for the North Star, product principles, definition of done and current strategic position.
4. Read the latest representative real-device diagnostic evidence when available.
5. Only then choose the next release target using the diagnostic-turn/design-turn separation.

`P14 Project Guidelines Memory` must fail if this product vision disappears or if its North Star, source-truth, UNKNOWN, stable-update, definition-of-done or cross-chat recovery contracts are lost.
