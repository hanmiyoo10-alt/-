# Termux — Development & Operations Guidelines

This document is the durable project memory and operating contract for the Termux customization plugin route.

Canonical repository: `hanmiyoo10-alt/-`

Canonical plugin path: `plugins/termux/`

Production release branch: `UNKNOWN — not established yet`

Never infer the current production version from conversation memory.
Read the actual repository and production release branch first.

## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference; do not copy the common-rule body into this document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth; those facts remain owned by the project-specific authority/evidence declared here.

## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `UNKNOWN — no production release established yet`
- Release branch: `UNKNOWN — not established yet`
- Source: `UNKNOWN — production manifest not established yet`
<!-- PLUGIN_RELEASE_STATE_END -->

Prefer keeping this block machine-maintained from the production manifest once a production manifest exists.

## Current development memory

Record only durable information needed for the next development session:

- latest verified production baseline
- latest real-device evidence
- current release implementation
- stable runtime/data contracts
- unresolved UNKNOWNs
- next evidence-backed candidates

Do not use this section as a chat transcript.

## Long-term update roadmap

This roadmap is strategic memory, not a fixed release schedule.

**Evidence outranks roadmap order.**

The next release must be chosen from:
- actual production source
- latest production artifacts
- latest real-device diagnostics
- regression evidence

Do not make evidence-free changes merely to advance the roadmap.
Do not rework behavior that is already healthy.

## 0. Source of truth

Use this priority order:

1. Production release artifacts and manifest.
2. `main` source under the canonical plugin path.
3. Real-device / production diagnostics.
4. Current tests and release workflows.
5. This document and prior release notes.
6. Hypotheses.

If documentation and production disagree, inspect production first
and update the documentation.

## 1. Project scope

The default development target is:

`plugins/termux/`

Do not modify unrelated host/application code unless evidence shows that
the problem cannot be solved inside the plugin.

Do not mix unrelated product work into the plugin release.

## 2. Stable first

Repository baseline-preservation behavior is inherited from `RCR-D01`.

Termux keeps this real-device/release loop explicit:

`Stable production
→ real-device diagnostic
→ isolate one problem
→ minimal design
→ patch
→ regression
→ version/release
→ real-device validation`

Keep already-working behavior unchanged unless the release goal requires touching it.

## 3. One release, one primary goal

Generic bounded-work bundling policy is inherited from `RCR-D02`.

For Termux releases, performance, updater, UI, cache, runtime recovery, and data fidelity remain separate release concerns unless current evidence shows they are one coherent target. Record other issues as later candidates rather than silently widening the current release.

## 4. Evidence before repair

The repository-wide evidence-first repair cycle is inherited from `RCR-D03`.

For Termux, if the cause is not sufficiently isolated, improve diagnostics before changing behavior, and do not repair a subsystem merely because it is a plausible suspect.

## 5. Evidence language

- **VERIFIED** — directly supported by repository state, tests, production artifacts, or real-device diagnostics.
- **SUPPORTED HYPOTHESIS** — multiple observations support it, but causality is not fully proven.
- **UNKNOWN** — current telemetry cannot determine it.

Never present UNKNOWN as VERIFIED. Repository-wide uncertainty fidelity is additionally governed by `RCR-H03`.

## 6. Data fidelity

Termux-displayed or diagnostic values must come from a real source. Known zero and unknown are different states and must remain distinguishable.

When adding a derived value, document its source fields, derivation, and fidelity level. Do not infer missing metadata or provenance from model/provider identity when stronger source evidence is available.

## 7. Provenance

Important displayed or diagnostic values should retain identifiable provenance such as source, fidelity, scope, timestamp precision, and capture mode when available.

If provenance cannot be proven, preserve UNKNOWN rather than inventing it.

## 8. Diagnostic turn and design turn are separate

When the user shares a real-device diagnostic log, that turn is analysis only.

In the diagnostic turn:

- judge healthy/abnormal state
- compare with the previous baseline
- identify regressions
- summarize VERIFIED information
- separate hypotheses from UNKNOWN
- identify useful next observation points

Do NOT:

- begin the next release
- modify code
- create a release
- deploy

End the turn after analysis.

Only after the user asks in a later turn for the next update/design should next-release design begin.

Required interaction cycle:

`Diagnostic
→ Analysis
→ TURN END
→ User asks for next update
→ Design
→ Development`

## 9. Runtime errors and recovery

Repository-wide current-health versus historical-incident behavior is inherited from `RCR-C05`.

For Termux, keep useful incident history and distinguish states such as cumulative errors, active errors, recovered errors, last error, and last recovery. Current readiness should describe current actionable health without erasing recovered history.

## 10. Performance

Repository-wide optimization discipline is inherited from `RCR-D04`.

Termux performance work starts from phase attribution such as:

`Refresh
→ source/network
→ normalize
→ persist
→ render`

If one phase dominates, instrument its internal sub-phases before changing unrelated code.

Under `RCR-C03`, diagnostics must remain bounded and must not introduce expensive full scans, unbounded history, large raw payload persistence, unnecessary network calls, or high-frequency polling.

## 11. Protected stability

Repository baseline-preservation behavior from `RCR-D01` also applies to stable project paths.

Preserve healthy behavior such as:

- updater
- automatic update flow
- runtime lifecycle
- state persistence
- request identity
- source fidelity
- navigation
- mobile layout
- recovery behavior

Every new feature must coexist with these existing stable contracts unless current evidence justifies changing one of them.

## 12. Release engineering

Normal release sequence:

`check production
→ inspect evidence
→ choose one target
→ branch
→ minimal patch
→ relevant regression
→ full regression
→ diff review
→ version update
→ build/materialize artifacts
→ validate manifest/hash consistency
→ merge main
→ publish production release branch
→ re-read production artifacts
→ real-device validation`

Existing Git/CI/release gates remain authoritative under `RCR-H07`; a failing Termux candidate cannot proceed to deployment.

Production must move monotonically forward. A stale workflow must never downgrade the production release.

This release sequence does not manufacture a production branch or manifest while those authorities remain UNKNOWN.

## 13. Versioning

Before any release, read the actual repository for:

- product/plugin version
- runtime/engine version
- manager/helper version if applicable
- manifest
- generated artifact
- production branch

Do not infer these from conversation memory, and do not bump a component version when that component's behavior does not change.

When generated distributables exist, `RCR-C01` governs their derived status: modify canonical source and regenerate deterministically rather than treating the generated artifact as the primary development source.

## 14. User interaction and execution

Generic preference for safe repository automation is inherited from `RCR-D05`.

Ask the user only when real-device validation genuinely requires the device, consistent with `RCR-C06`.

When device testing is needed, state exactly:

- what to update
- what to press
- what behavior to check
- what diagnostic/result to send back

## 15. Update safety

`RCR-C04` governs routine release updates when this project has an authoritative normal automatic update path. This guideline does not establish such a path while production/release authority remains UNKNOWN.

Temporary diagnostics must not become the normal release mechanism. Once a normal update path is authoritatively established, routine updates must not depend on manual shell edits, file replacement, token copying, temporary bootstrap commands, or debug-only installation procedures.

## 16. Regression contract

Repository-wide regression behavior is inherited from `RCR-D06`.

Termux regression checks should prefer production-like process behavior, public/runtime interfaces, and deterministic fixtures. Static checks remain appropriate for security boundaries, generated-artifact parity, forbidden behavior, version/manifest consistency, and source ownership rules when those contracts exist.

## 17. Generated artifacts

Generated-artifact policy is inherited from `RCR-C01`.

Where Termux uses generated distributables, keep this project flow explicit:

`canonical source
→ deterministic build
→ generated artifact
→ production`

Keep generated artifacts derived from canonical source. This guideline does not create a generated artifact, manifest, release branch, or production authority where none is currently established.

## 18. Durable project cycle

Maintain this loop:

`Production
→ Real-device diagnostic
→ Diagnostic analysis
→ one-turn pause
→ Next-update design
→ Implementation
→ Regression
→ PR / CI
→ Merge
→ Production deployment
→ Real-device diagnostic`

## Non-negotiable rules

Repository-wide baseline, bounded-goal, evidence-first, uncertainty, optimization, gate, regression, generated-artifact, diagnostic-boundedness, update-path, and health/history behavior is inherited from `RCR-D01`, `RCR-D02`, `RCR-D03`, `RCR-D04`, `RCR-D06`, `RCR-H03`, `RCR-H07`, `RCR-C01`, `RCR-C03`, `RCR-C04`, and `RCR-C05` rather than repeated here.

- Do not fabricate unknown data.
- Do not guess the production version from memory.
- Do not infer provenance from model/provider identity when actual source evidence exists.
- Do not confuse diagnostic labels with underlying semantics.
- Do not confuse recovered historical errors with an active outage.
- When the user shares a diagnostic, analyze only.
- Wait for a later user turn before designing or implementing the next release.
- Keep current production/release authority UNKNOWN until current owning evidence establishes it.
