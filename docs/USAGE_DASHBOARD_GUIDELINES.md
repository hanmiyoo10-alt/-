# Local Usage Dashboard — Development & Operations Guidelines

This document is the durable project memory and operating contract for Local Usage Dashboard.

Canonical repository: `hanmiyoo10-alt/-`

Canonical plugin path: `plugins/usage-dashboard/`

Production release branch: `release-usage-dashboard`

Never infer the current production version from conversation memory. Read the actual repository and release branch first.

## Current production snapshot

<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->
- Product: `3.0.0-alpha.5.59`
- Bridge Engine: `1.6.13`
- Bridge Manager: `1.2.6`
- Release branch: `release-usage-dashboard`
- Source: `plugins/usage-dashboard/runtime/product-manifest.json`
<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->

This block is machine-maintained by `plugins/usage-dashboard/tools/sync_project_guidelines.py` whenever the production manifest changes on `main`.

## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.58 — Shared 24h Capture Coalescing`.

Verified from the 5.58 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.12` and Bridge Manager `1.2.6` were healthy with no local runtime errors or failures.
- Organization discovery remained on `capture-primary · fallback 0 · shared account capture yes`.
- Shared 24h reuse was active: `bootstrap 24h · activity shared yes · dedicated 24h fallback 0`.
- The sampled Bridge snapshot was about 13.28s, down from about 17.87s in 5.57; timer refresh was about 14.40s total.
- `analyticsScopes` was about 5.92s, down from about 11.84s in 5.57, and the previously observed CLI queue wait disappeared.
- The Bridge ran 3 CLI operations with `limit 2 · peak active 2 · queued 0`; average execution was about 6.33s and the slowest sanitized operation was `devpass-capture-24h` at about 7.31s.
- The sampled critical path still looked serialized: organization/bootstrap work about 7.35s followed by post-root usage/analytics work about 5.92s, totaling about 13.27s.
- The sampled visibility refresh was about 25.07s versus timer refresh about 14.40s; 5.58 telemetry could not attribute the exact cause.
- Snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.

Current release implementation: `3.0.0-alpha.5.59 — Snapshot Scheduling Attribution`.

5.59 release contract:

- Bridge Engine becomes `1.6.13`; Bridge Manager remains `1.2.6`.
- Measurement only: do not change snapshot ordering, CLI concurrency, CLI timeout, cache TTLs, stale/circuit behavior, capture reuse, fallback behavior, payload semantics, or updater flow.
- Keep bounded CLI concurrency default/hard maximum at `2`; `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Keep 5.58 shared 24h capture coalescing unchanged, including the dedicated 24h fallback only when shared activity is absent.
- Preserve the 5.57 organization fallback: if account capture fails or lacks usable rows, fall back to the prior plain `orgs list --json` path; if capture and the plain fallback both contain no usable organization rows, `No organizations found in CLI output` remains an error.
- Record relative start/end/duration for snapshot tasks inside the existing per-snapshot AsyncLocalStorage attribution context.
- Record at most 8 CLI operation timeline entries using only sanitized family labels plus relative offsets, queue wait, and execution time.
- Never retain raw CLI arguments, organization/project IDs, tokens, headers, capture file paths, or command output in scheduling telemetry.
- Add `Bridge snapshot timeline` and `Bridge CLI operations` diagnostics without adding CLI/network work.
- Preserve Runtime Recovery Fidelity, parser `provider-usage-v3`, and UNKNOWN semantics for missing Cache Write/TTL.

Next step after the 5.59 real-device diagnostic: use the measured task/CLI timeline to choose between snapshot-root overlap and one specific range/Credits scheduling repair. Do not choose 5.60 before that evidence.

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
