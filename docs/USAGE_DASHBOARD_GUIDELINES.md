# Local Usage Dashboard — Development & Operations Guidelines

This document is the durable project memory and operating contract for Local Usage Dashboard.

Canonical repository: `hanmiyoo10-alt/-`

Canonical plugin path: `plugins/usage-dashboard/`

Production release branch: `release-usage-dashboard`

Never infer the current production version from conversation memory. Read the actual repository and release branch first.

## Current production snapshot

<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->
- Product: `3.0.0-alpha.5.65`
- Bridge Engine: `1.6.18`
- Bridge Manager: `1.2.6`
- Release branch: `release-usage-dashboard`
- Source: `plugins/usage-dashboard/runtime/product-manifest.json`
<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->

This block is machine-maintained by `plugins/usage-dashboard/tools/sync_project_guidelines.py` whenever the production manifest changes on `main`.

## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.64 — Foreground CLI Launcher Attribution`.

Verified 5.64 foreground evidence:

- A comparable foreground sample ended at about 14.570s. Credits took about 6.967s, 24h account capture about 8.575s, and 24h usage about 7.587s.
- All three foreground source operations followed direct `llmgateway` ENOENT into the existing `npx` fallback, so routine npx-launcher use on the device is VERIFIED.
- The portion of each 7–8.6s interval attributable to npm metadata freshness checks remains UNKNOWN. Launcher attribution alone does not prove that npx is the dominant latency source.

Current release implementation: `3.0.0-alpha.5.65 — Npx Cache-First Launcher`.

5.65 release contract:

- Product becomes `3.0.0-alpha.5.65`; Bridge Engine becomes `1.6.18`; Bridge Manager remains `1.2.6`; snapshot/recent-request contracts remain `1/1`.
- Preserve the existing direct `llmgateway` attempt and fall back only when the direct attempt fails with `ENOENT`.
- The default fallback is exactly `npx --yes --prefer-offline @llmgateway/cli@1.9.0 <original args>`. The CLI package remains pinned to `1.9.0`.
- `DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` restores the exact 5.64 fallback, `npx --yes @llmgateway/cli@1.9.0 <original args>`.
- `prefer-offline` changes only npm package-acquisition freshness policy: cached data skips staleness checks, while missing data may still be fetched. It does not change Credits, Usage, DevPass, or dashboard cache semantics.
- Launcher vocabulary remains bounded to `direct`, `npx-fallback`, and `unknown`; fallback reason remains bounded to `direct-enoent` and `none`; npx policy is bounded to `prefer-offline`, `default`, and `not-applicable`.
- CLI operation attribution remains capped at eight records and exposes no executable path, PATH, HOME, npm cache path, package directory, environment, CLI arguments, token, organization ID, payload, header, or arbitrary error.
- Keep all five existing `runCli()` call sites, both existing `runProgram()` call sites, and the single existing `execFileAsync()` source operation. Add no subprocess, `npm install`, `npm cache` command, version probe, network request, endpoint, or source operation.
- No new `runCli()` call site, network endpoint, or CLI source operation is allowed.
- Keep 24h usage and DevPass Activity on the foreground truth path.
- Preserve the hard CLI concurrency cap and keep already-working behavior unchanged unless the release goal requires touching it.
- Diagnostics expose only sanitized family/scope/range for cache decisions and bounded launcher vocabulary for CLI operations.
- Keep UNKNOWN distinct from known zero.
- Preserve CLI concurrency 2, the `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` rollback, 25-second timeout, 4MB buffer, Credits early-start, shared capture, all TTLs, 24h foreground truth, circuit/recovery, organization fallback, Request Ledger, Cache fidelity, updater, and the rule that UNKNOWN stays distinct from known zero.
- Preserve every 5.63 long-window rule: secondary concurrency 1, 32-key bound, same-key/inFlight deduplication, foreground hold, 30-minute stale ceiling, leaf-only 7d/30d deferral, cold-cache blocking, standalone endpoint blocking, and stale provenance.
- Keep the shared `repo-main-write` lock and monotonic candidate/main/release publisher guard.

5.65 device success evidence to collect:

- Stable Readiness remains READY with Engine `1.6.18`, Manager `1.2.6`, and no active local runtime error.
- Foreground operations show `npx-fallback`, the launcher summary shows `policy prefer-offline`, and the sample has zero new launcher errors.
- Compare several similar cold-ish timer snapshots against the 5.64 baseline. One faster sample is insufficient to claim causality.
- If source and snapshot timings repeatedly fall, npm freshness checking was likely material. If they remain near 5.64, conclude that metadata freshness was not the primary bottleneck and keep its exact latency share UNKNOWN.
- 5.65 makes no guaranteed performance claim; it is a bounded cache-policy experiment with an immediate rollback.

## Long-term update roadmap

This roadmap is durable strategic memory for future chats and development sessions. It records where Local Usage Dashboard is trying to go, not a promise that releases must occur in a fixed order or under preassigned version numbers.

**Evidence outranks roadmap order.** The next release must always be chosen from the actual production source and the latest real-device diagnostic evidence. Do not make evidence-free changes merely to advance a roadmap phase, and do not rework behavior that is already healthy.

### Phase A — Performance and scheduling

Goal: make the dashboard refresh materially faster without sacrificing correctness, source fidelity, or device stability.

- Continue from the verified 5.59 scheduling timeline rather than guessing at bottlenecks.
- Reduce avoidable serialized snapshot dependencies and idle CLI-lane time where source dependencies permit safe overlap.
- Preserve the hard CLI concurrency cap, rollback path, timeout, cache/circuit semantics and shared capture behavior unless later evidence specifically justifies changing them.
- Measure snapshot, manager-probe, persistence and render phases independently; optimize only the phase shown to dominate.
- Validate each performance change on the real Android/PocketRisu environment before choosing the next repair.

### Phase B — Data fidelity and DevPass parity

Goal: complete migration of useful DevPass usage information into Local Usage Dashboard using only real source data.

- Preserve exact Request Ledger identity and observed provider/model/service-tier fields.
- Expand Cache Read/Write/TTL observability only when the actual source exposes those fields.
- Keep UNKNOWN distinct from known zero; never infer missing Write/TTL/token values from provider, price, model identity or other heuristics.
- Preserve Credits, DevPass account-cycle and usage semantics while adding parity features.
- Prefer provenance-rich diagnostics so every displayed value can be traced to the source that actually supplied it.

### Phase C — UX and feature parity

Goal: make Local Usage Dashboard sufficient as the primary local usage view after data/runtime behavior is proven stable.

- Complete remaining useful DevPass-widget parity without duplicating or destabilizing already-working features.
- Keep the usage-first mobile layout, navigation persistence and floating-widget interaction stable unless device evidence shows a concrete UX problem.
- Simplify diagnostics presentation when it can be done without removing evidence needed for development and support.
- Continue using partial rendering, DOM deduplication and closed-panel skips to avoid turning UI work into the refresh bottleneck.

### Phase D — Stability, recovery and release engineering

Goal: make updates boring, monotonic and recoverable.

- Keep PocketRisu `+` as the normal update path; routine releases must not require manual Termux edits.
- Preserve Bridge lifecycle, Manager self-update, Runtime Recovery Fidelity and historical-error visibility.
- Maintain the shared `repo-main-write` lock and 5.60 monotonic release guard so stale jobs cannot downgrade production.
- Continue shrinking release authority and accidental cross-product coupling when doing so is evidence-backed and low risk.
- Grow regressions around every production incident so previously fixed failures cannot silently return.

### Phase E — RC and stable readiness

Goal: move from alpha experimentation to a deliberately frozen, supportable release when evidence says the product is ready.

- Define RC entry from measured stability, parity and update reliability rather than calendar time.
- Freeze proven contracts before RC; identify remaining UNKNOWN fields explicitly instead of hiding them.
- Run representative real-device validation across update, resume/visibility, refresh, cache fidelity, recovery and long-lived runtime behavior.
- Enter stable only when remaining issues are understood and no known blocker requires broad architectural churn.

### Roadmap maintenance contract

- Update this roadmap when a phase is materially completed, invalidated by new source evidence, or split into a better long-term direction.
- Keep roadmap edits strategic. Release-specific timings, current bottlenecks and immediate next candidates belong in `Current development memory`.
- A completed roadmap item should be preserved as historical context or clearly marked complete rather than silently deleted when that history explains current architecture.
- `P14 Project Guidelines Memory` must fail if this roadmap section or its evidence-first/UNKNOWN/stable-update principles disappear.
- New chats should read this roadmap together with the current production snapshot and current development memory before proposing the next release.

## 0. Source of truth

Use this priority order:

1. `release-usage-dashboard` production artifacts and manifest.
2. `main` under `plugins/usage-dashboard/`.
3. Real Android / PocketRisu diagnostics.
4. Current tests and release workflows.
5. This document and prior release notes.
6. Hypotheses.

If documentation and production disagree, inspect production first and update the documentation.

## 1. Project scope

The default development target is `plugins/usage-dashboard/`.

PocketRisu host code is not the default target. Inspect it only when evidence points to updater integration, host APIs, upstream data loss, or another host-side cause that the plugin cannot solve.

Do not mix unrelated PocketRisu work or PRs into Local Usage Dashboard releases.

## 2. Stable first

Default cycle:

`Stable production → device diagnostic → isolate one problem → minimal design → patch → regression → version/release → device validation`

Keep already-working behavior unchanged unless the release goal requires touching it. Prefer small, explainable diffs over broad rewrites.

## 3. One release, one primary goal

A mini release should normally have one primary target. Do not casually combine cache, updater, UI, runtime recovery and performance work in the same release.

When another important issue appears, record it as a later candidate rather than expanding the current patch without evidence.

## 4. Evidence before repair

Use:

`Observe → Attribute → Verify → Design → Repair → Measure`

If the cause is not sufficiently isolated, improve diagnostics before changing behavior.

Do not repair a subsystem merely because it is a plausible suspect.

## 5. Evidence language

- **VERIFIED** — directly supported by repository state, tests, production artifacts, or device diagnostics.
- **SUPPORTED HYPOTHESIS** — multiple observations support it, but causality is not fully proven.
- **UNKNOWN** — current telemetry cannot determine it.

Never present UNKNOWN as VERIFIED.

## 6. Data fidelity

Display only values actually provided by a real source.

Do not:

- convert unknown values into zero,
- infer token counts from cost,
- infer missing fields from provider/model identity,
- treat Read as Write,
- split cached total heuristically,
- fabricate 5m/1h TTL values.

Known zero and unknown are different states and must remain distinguishable.

## 7. Cache observability

Keep these concepts separate:

- Gateway replay HIT,
- provider cache Read,
- provider cache Write,
- cached total,
- 5m Write,
- 1h Write.

Gateway HIT = 0 does not imply provider cache use = 0.

If Write metadata is unavailable, Write remains unknown. Preserve existing successful Cache Read behavior when adding further observability.

Where possible diagnostics should distinguish `reported`, `not-reported`, `unknown`, known zero, and known non-zero.

## 8. Diagnostic turn and design turn are separate

When the user shares a real-device diagnostic log, that turn is analysis only.

In the diagnostic turn:

- judge healthy/abnormal state,
- compare with the previous baseline,
- identify regressions,
- summarize VERIFIED information,
- separate hypotheses from UNKNOWN,
- identify useful next observation points.

Do **not** begin the next release, modify code, create a release, or deploy from the diagnostic turn.

End the turn after analysis.

Only after the user asks in a later turn for the next update/design should the next-release design begin.

Required interaction cycle:

`Diagnostic → Analysis → TURN END → User asks for next update → Design → Development`

## 9. Runtime errors and recovery

Historical error records and current runtime health are distinct concepts.

Do not erase error history merely to make the dashboard appear healthy. Prefer explicit state such as cumulative errors, active error, recovered errors, last error and last recovery.

Stable Readiness should describe current actionable health while retaining recovered incident history for diagnostics.

## 10. Performance

Measure before optimizing.

Start from phase attribution such as:

`Refresh → snapshot / manager probe / normalize / persist / render`

If one phase dominates, instrument its internal sub-phases before changing unrelated UI or scheduler behavior.

Diagnostics must not introduce expensive full scans, large raw payload persistence, unnecessary network calls, or high-frequency polling.

## 11. Protected stability

Do not touch unrelated stable paths without evidence. In particular, preserve these when they are healthy:

- updater and `+` update flow,
- Bridge lifecycle,
- Bridge Manager self-update,
- Request Ledger identity,
- Cache Read path,
- DevPass account data,
- Credits data,
- navigation and state persistence,
- widget interaction and mobile layout.

## 12. Release engineering

Normal release sequence:

`check production → inspect evidence → choose one target → branch → minimal patch → relevant regression → full regression → diff review → version update → materialize latest.js → validate manifest/hash consistency → main → release-usage-dashboard → re-read release artifacts → device validation`

Never deploy a failing candidate.

Each version update must also refresh this document's Current production snapshot. Repository automation keeps the machine-maintained version/component block synchronized with the production manifest; release-specific development memory should be updated when the release materially changes the project state.

## 13. Versioning

Before any release, read the actual repository for:

- plugin/product version,
- Bridge Engine version,
- Bridge Manager version,
- product manifest,
- `latest.js`,
- release branch.

Do not bump Bridge Engine when bridge behavior does not change. Do not bump Bridge Manager when manager behavior does not change.

## 14. User interaction and execution

When repository tooling can do the work, ChatGPT should perform source analysis, design, modification, testing, versioning, PR/merge and deployment without making the user manually run development commands.

Ask the user only when a real Android/PocketRisu validation step genuinely requires the device. When device testing is needed, state exactly what to check and what diagnostic/result to send back.

## 15. Update safety

Normal production updates use PocketRisu's `+` update flow.

Do not make routine releases depend on manual Termux edits, file replacement, token copying, or temporary debugging/bootstrap procedures.

## 16. Durable project cycle

Maintain this loop:

`Production → Real-device diagnostic → Diagnostic analysis → one-turn pause → Next-update design → Implementation → Regression → Deployment → Real-device diagnostic`

## Non-negotiable rules

- Do not break working behavior without evidence.
- Do not fabricate unknown data.
- Do not repair before isolating the cause.
- Do not bundle unrelated changes into one mini release.
- Do not deploy failing tests.
- Do not guess the current production version from memory.
- Do not confuse diagnostic labels with underlying semantics.
- Do not confuse recovered historical errors with an active outage.
- Do not sacrifice correctness for performance.
- When the user shares a diagnostic, analyze only; wait for a later user turn before designing or implementing the next release.
