# <PLUGIN_NAME> — Development & Operations Guidelines

This document is the durable project memory and operating contract for <PLUGIN_NAME>.

Canonical repository: `<OWNER/REPO>`

Canonical plugin path: `<PLUGIN_PATH>/`

Production release branch: `<RELEASE_BRANCH>`

Read current repository and project authority before making production/release/runtime claims.


## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference. Do not copy the common-rule body into this project document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth. Those facts remain owned by the project-specific authority chain defined below and by its current repository evidence.


## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `<CURRENT_VERSION>`
- Release branch: `<RELEASE_BRANCH>`
- Source: `<MANIFEST_PATH>`
<!-- PLUGIN_RELEASE_STATE_END -->

Prefer keeping this block machine-maintained from the production manifest when the project contract supports that workflow.


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

Record project-specific long-term goals, dependency order, and evidence-backed exit conditions here. Repository-wide evidence/authority behavior is inherited from `docs/REPOSITORY_COMMON_RULES.md` and should not be restated.


## 0. Source of truth

Define this project's exact authority order here. Example shape:

1. Production release artifacts and manifest.
2. `main` source under the canonical plugin path.
3. Real-device / production diagnostics.
4. Current tests and release workflows.
5. This document and prior release notes.
6. Hypotheses.

Replace or specialize this order when the project's owning contract requires a different authority chain.


## 1. Project scope

The default development target is:

`<PLUGIN_PATH>/`

Record project-specific host/application boundaries, shared dependencies, and any evidence-backed exceptions here.


## 2. Stable first

Apply repository default `RCR-D01` by reference.

Record only project-specific preserved surfaces, rollback boundaries, known-good baselines, or exceptions that materially specialize that default.


## 3. One release, one primary goal

Apply repository default `RCR-D02` by reference.

Record only project-specific bundling constraints or coherent multi-component release cases that need stronger specialization.


## 4. Evidence before repair

Apply repository default `RCR-D03` by reference.

Record only project-specific observation sources, attribution boundaries, or diagnostics required before mutation.


## 5. Evidence language

Apply repository uncertainty/evidence rules, including `RCR-H03` and scoped-status rule `RCR-H04`, by reference.

Define only additional project-specific evidence labels or stronger meanings needed by this project.


## 6. Data fidelity

Apply repository evidence-fidelity and anti-fabrication rules by reference.

Record only project-specific source fields, derivations, fidelity classes, UNKNOWN/known-zero distinctions, or prohibited transformations that are not already repository-wide policy.


## 7. Provenance

Record the project-specific provenance contract for important values, for example:

- source
- fidelity
- scope
- timestamp precision
- capture mode

Keep any additional project-specific provenance rules here without restating generic repository uncertainty policy.


## 8. Diagnostic turn and design turn are separate

When this project's workflow requires device or production diagnostics to be analyzed before the next design/implementation turn, define that interaction boundary here.

Example cycle:

`Diagnostic
→ Analysis
→ TURN END
→ User asks for next update
→ Design
→ Development`

Specify exactly which diagnostic inputs trigger this pause and which later instruction authorizes the next design stage.


## 9. Runtime errors and recovery

Define this project's runtime/recovery semantics here.

Where applicable, distinguish current actionable health from historical/recovered incidents and define the exact project-owned fields that represent those states.


## 10. Performance

Apply repository default `RCR-D04` by reference.

Record this project's measurable phase breakdown and project-specific performance guardrails, for example:

`Refresh
→ source/network
→ normalize
→ persist
→ render`

Keep only phase names, instrumentation limits, and safety constraints that are specific to this project's runtime.


## 11. Protected stability

Apply repository baseline-preservation behavior by reference.

List only the project-specific healthy paths or contracts that must normally remain untouched unless evidence requires change, for example updater, runtime lifecycle, state persistence, request identity, source fidelity, navigation, or recovery behavior.


## 12. Release engineering

Define this project's normal release sequence here. Example shape:

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

Keep the exact project-owned branch, artifact, manifest, deployment, rollback, and validation mechanics here.

Existing Git/CI/release gates remain authoritative under repository rule `RCR-H07`.


## 13. Versioning

Before any release, define which current project artifacts must be read, such as:

- product/plugin version
- runtime/engine version
- manager/helper version if applicable
- manifest
- generated artifact
- production branch

Record project-specific component-bump rules and version coupling here.


## 14. User interaction and execution

Apply repository default `RCR-D05` by reference for repository-tooling work.

Record only project-specific user/device handoff requirements that cannot be completed through repository tooling. When device testing is required, define exactly what must be updated, exercised, observed, and returned as evidence.


## 15. Update safety

Define the project's normal supported update path here.

Record project-specific prohibitions on manual shell edits, file replacement, token copying, temporary bootstrap commands, debug-only installation procedures, or other non-normal update routes when they matter to this product.

Temporary diagnostics may be documented separately when necessary, but must not silently become the normal release path.


## 16. Regression contract

Apply repository default `RCR-D06` by reference.

Record only project-specific regression suites, public/runtime boundaries, deterministic fixtures, static security checks, artifact-parity checks, or other validators that establish durable project behavior.


## 17. Generated artifacts

When this project uses generated distributables, apply repository conditional `RCR-C01` by reference.

Record only the project-specific canonical source, deterministic build/materialization command, generated artifact path, parity validator, and promotion/release owner.


## 18. Durable project cycle

Define the project's real operating loop here. Example shape:

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

Specialize this sequence when the project's lifecycle or validation model requires a different durable loop.


## Project-specific non-negotiable rules

List only non-negotiable rules that are genuinely project-specific or stricter specializations of repository policy.

Do not duplicate repository-wide common rules here merely for emphasis. If no additional project-specific non-negotiable rule exists, keep this section empty or remove it in the generated project guideline.
