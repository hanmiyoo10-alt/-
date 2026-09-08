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

Default cycle:

`Stable production
→ real-device diagnostic
→ isolate one problem
→ minimal design
→ patch
→ regression
→ version/release
→ real-device validation`

Keep already-working behavior unchanged unless the release goal requires touching it.

Prefer small, explainable diffs over broad rewrites.

## 3. One release, one primary goal

Each release should normally have one primary target.

Do not casually combine unrelated work such as:

- performance
- updater
- UI
- cache
- runtime recovery
- data fidelity

When another important issue appears, record it as a later candidate
instead of expanding the current release without evidence.

A large release is acceptable when it has one coherent architectural goal.

## 4. Evidence before repair

Use:

`Observe → Attribute → Verify → Design → Repair → Measure`

If the cause is not sufficiently isolated, improve diagnostics before
changing behavior.

Do not repair a subsystem merely because it is a plausible suspect.

## 5. Evidence language

Use these meanings consistently:

**VERIFIED**
Directly supported by repository state, tests, production artifacts,
or real-device diagnostics.

**SUPPORTED HYPOTHESIS**
Multiple observations support it, but causality is not fully proven.

**UNKNOWN**
Current telemetry cannot determine it.

Never present UNKNOWN as VERIFIED.

## 6. Data fidelity

Display only values actually provided by a real source.

Do not:

- convert unknown values into zero
- invent missing metadata
- derive unsupported values from price
- infer fields from model/provider identity
- silently substitute estimates for source data
- relabel aggregate data as exact per-request data

Known zero and unknown are different states and must remain distinguishable.

When adding a derived value, clearly document:
- source fields
- derivation
- fidelity level

## 7. Provenance

Every important displayed value should have an identifiable source.

Prefer normalized metadata such as:

- source
- fidelity
- scope
- timestamp precision
- capture mode

Never guess a scope or provenance from a model name when the source
can provide stronger evidence.

If provenance cannot be proven, preserve UNKNOWN.

## 8. Diagnostic turn and design turn are separate

When the user shares a real-device diagnostic log,
that turn is analysis only.

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

Only after the user asks in a later turn for the next update/design
should next-release design begin.

Required interaction cycle:

`Diagnostic
→ Analysis
→ TURN END
→ User asks for next update
→ Design
→ Development`

## 9. Runtime errors and recovery

Historical error records and current runtime health are different concepts.

Do not erase historical errors merely to make the product appear healthy.

Prefer explicit states such as:

- cumulative errors
- active errors
- recovered errors
- last error
- last recovery

Current readiness should describe current actionable health while
retaining useful incident history.

## 10. Performance

Measure before optimizing.

Start from phase attribution such as:

`Refresh
→ source/network
→ normalize
→ persist
→ render`

If one phase dominates, instrument its internal sub-phases before
changing unrelated code.

Diagnostics must not introduce:

- expensive full scans
- unbounded history
- large raw payload persistence
- unnecessary network calls
- high-frequency polling

## 11. Protected stability

Do not touch unrelated stable paths without evidence.

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

Every new feature must coexist with existing stable contracts.

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

Never deploy a failing candidate.

Production must move monotonically forward.
A stale workflow must never downgrade the production release.

## 13. Versioning

Before any release, read the actual repository for:

- product/plugin version
- runtime/engine version
- manager/helper version if applicable
- manifest
- generated artifact
- production branch

Do not infer these from conversation memory.

Do not bump a component version when that component's behavior does not change.

Generated artifacts are not the primary development source.
Modify canonical source and regenerate deterministically.

## 14. User interaction and execution

When repository tooling can perform the work,
ChatGPT should perform:

- source analysis
- design
- code modification
- tests
- version updates
- PR creation
- CI inspection
- merge
- deployment

Do not make the user manually run development commands when the work can
be performed through repository tooling.

Ask the user only when real-device validation genuinely requires the device.

When device testing is needed, state exactly:

- what to update
- what to press
- what behavior to check
- what diagnostic/result to send back

## 15. Update safety

Routine production releases must use the product's normal automatic update path.

Do not make normal updates depend on:

- manual shell edits
- file replacement
- token copying
- temporary bootstrap commands
- debug-only installation procedures

Temporary diagnostics are allowed only when necessary and must not become
the normal release process.

## 16. Regression contract

Every production incident or newly introduced contract should gain
a regression test when practical.

Tests should prefer:

- production-like process behavior
- public/runtime interfaces
- deterministic fixtures

Avoid brittle source slicing, VM execution of copied function bodies,
or tests that merely duplicate implementation details.

Static tests are appropriate for:

- security boundaries
- generated-artifact parity
- forbidden behavior
- version/manifest consistency
- source ownership rules

## 17. Generated artifacts

Where a plugin uses generated distributables:

`canonical source
→ deterministic build
→ generated artifact
→ production`

Do not hand-edit the generated artifact as the primary implementation.

CI should detect when the generated artifact does not match its canonical source.

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

- Do not break working behavior without evidence.
- Do not fabricate unknown data.
- Do not repair before isolating the cause.
- Do not bundle unrelated changes without a coherent release goal.
- Do not deploy failing tests.
- Do not guess the production version from memory.
- Do not confuse diagnostic labels with underlying semantics.
- Do not confuse recovered historical errors with an active outage.
- Do not sacrifice correctness for performance.
- Do not infer provenance from model/provider identity when actual source evidence exists.
- Keep generated artifacts derived from canonical source.
- When the user shares a diagnostic, analyze only.
- Wait for a later user turn before designing or implementing the next release.
