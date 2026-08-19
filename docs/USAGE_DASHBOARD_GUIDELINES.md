# Local Usage Dashboard — Development & Operations Guidelines

This document is the durable project memory and operating contract for Local Usage Dashboard.

Canonical repository: `hanmiyoo10-alt/-`

Canonical plugin path: `plugins/usage-dashboard/`

Production release branch: `release-usage-dashboard`

Never infer the current production version from conversation memory. Read the actual repository and release branch first.

## Current production snapshot

<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->
- Product: `3.0.0-alpha.5.53`
- Bridge Engine: `1.6.8`
- Bridge Manager: `1.2.6`
- Release branch: `release-usage-dashboard`
- Source: `plugins/usage-dashboard/runtime/product-manifest.json`
<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->

This block is machine-maintained by `plugins/usage-dashboard/tools/sync_project_guidelines.py` whenever the production manifest changes on `main`.

## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.53 — Cache Provenance Diagnostics`.

Verified from the 5.53 device diagnostic:

- Bridge Engine `1.6.8` and Bridge Manager `1.2.6` are healthy and compatible.
- Cache Read remains available through the independent `provider-usage-v3` observer.
- The observed cache rows had Read values but no Write values; Write provenance remained `unknown`, not fabricated zero or `not-reported`.
- `write unknown-on-cache` and `read/no-write-value` expose that distinction correctly.
- A recovered network/persist incident left cumulative local errors even though Bridge health, modules, failures and current runtime state had recovered.
- Snapshot/data acquisition remains the dominant measured refresh cost; the sample diagnostic showed roughly 21 seconds in `snapshot` while render time stayed small.

Next designed release candidate: `3.0.0-alpha.5.54 — Runtime Recovery Fidelity`.

Primary design goal for 5.54:

- Preserve cumulative error history.
- Separate active runtime errors from recovered historical errors.
- Let Stable Readiness describe current health instead of being permanently blocked by recovered error counts.
- Do not mix snapshot performance optimization into the same release.

Following candidate after a 5.54 device diagnostic: `Snapshot Performance`, beginning with attribution inside the snapshot phase before repair.

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
