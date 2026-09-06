# Repository Common Rules

> Canonical repository-wide shared policy entrypoint.
>
> This document defines common **behavioral and governance rules**. It does not own mutable production facts, release identity, runtime state, deployment status, or project-specific implementation semantics.

## 1. Purpose

This repository contains projects with different lifecycles, production authorities, release systems, runtime contracts, and validation surfaces. The common-rules layer exists to provide one small shared constitution without flattening those differences into a second source of truth.

The intended shape is:

```text
repository-wide common invariants
→ domain/shared contracts
→ project-specific guidelines
→ project implementation and operational authorities
```

This document is an entrypoint and shared policy owner. Detailed domain and project contracts remain authoritative inside their own scope.

### Non-goals

This document does **not**:

- define one global production/release authority for every project;
- duplicate current versions, release SHAs, deployment states, device states, or other mutable project facts;
- replace project guidelines, manifests, release contracts, CI, Git, or runtime authorities;
- convert repository registration/bootstrap metadata into production authority;
- standardize project-only runtime modes, cache semantics, updater behavior, UI behavior, or exact release procedures;
- authorize CI bypass, main-write bypass, release bypass, or production mutation;
- implement automated contradiction detection or enforcement by itself.

## 2. Two precedence axes must stay separate

A common source of rule drift is mixing the question **“what is true?”** with **“what behavior is allowed or preferred?”**. Resolve them on separate axes.

### 2.1 Truth / authority precedence

Truth questions include current production version, deployed artifact, release identity, runtime state, current validation state, and whether a declared artifact actually exists.

Use this procedure:

1. Identify the affected repository/project scope.
2. Read the current authority locator for that scope, using `docs/REPO_PROJECT_CATALOG.md` and the owning repository/project contract.
3. Follow the authority chain declared by that scope and read the current exact evidence it names.
4. Treat conversation memory, stale summaries, roadmaps, labels, and convenience views as context only; they do not replace the current owning authority.
5. If two authoritative-looking sources disagree and the owning contract does not resolve the disagreement, preserve `UNKNOWN` or `CONFLICT` and repair the authority/documentation divergence before making a stronger claim.

There is deliberately **no single repository-wide exact ordering** of production artifacts, manifests, source, device evidence, and project documentation. Each project may define a more precise authority order. This common layer preserves that ownership rather than overriding it.

### 2.2 Policy / rule precedence

Policy questions include what work is allowed, what safety boundary applies, and what default development behavior should be used.

Use this order:

1. repository-wide `HARD_INVARIANT` rules in this document;
2. applicable domain/shared contracts, such as canonical-main Work System, control-plane, main-write, security, or release coordination contracts;
3. the affected project's own guideline/operating contract;
4. repository-wide `DEFAULT` and applicable `CONDITIONAL` rules in this document;
5. local convenience, style, or workflow preferences.

A project may specialize a `DEFAULT` or `CONDITIONAL` rule inside its valid scope. It must not silently weaken a `HARD_INVARIANT`.

If an existing project contract appears to conflict with a `HARD_INVARIANT`, do not automatically declare either side valid. Treat that as a governance conflict, re-read the underlying evidence, and resolve the documentation/policy divergence explicitly.

## 3. Rule classes

Every repository-wide rule belongs to one of these classes:

### `HARD_INVARIANT`

A cross-project safety, evidence, authority, or integrity rule. Ordinary project guidance cannot silently weaken it.

### `DEFAULT`

The preferred repository-wide development/operations behavior. A project may specialize it when its own contract or evidence justifies a different implementation.

### `CONDITIONAL`

Applies only when the relevant capability or lifecycle exists, such as generated artifacts, real-device validation, check-only/writable memory, diagnostics, or an automatic update path.

### `PROJECT_ONLY`

A rule or fact deliberately not promoted into the shared layer. It remains owned by the project or domain that defines it.

## 4. Repository-wide hard invariants

### RCR-H01 — Read current authority before acting

**Class:** `HARD_INVARIANT`

Repository/project work must begin from current repository and owning-authority evidence. Conversation memory is context only and is never sufficient authority for current production, release, runtime, or repository state.

### RCR-H02 — Preserve owning authority; do not manufacture truth

**Class:** `HARD_INVARIANT`

Repository registration, bootstrap metadata, control-plane descriptors, status views, documentation, or coordination systems must not create a new production/release/runtime authority merely because an authority is missing or inconvenient.

Central/shared systems should store locators, classification, coordination state, or derived views where appropriate. They must not silently create a competing mutable truth database for project-owned state.

### RCR-H03 — Preserve uncertainty and evidence fidelity

**Class:** `HARD_INVARIANT`

`UNKNOWN` remains `UNKNOWN` until evidence resolves it. Do not fabricate missing values, provenance, status, existence, causality, validation success, or production state.

Where the distinction matters, known zero and unknown are different states. Derived values must retain enough provenance to distinguish observation from inference.

### RCR-H04 — Status labels are scoped claims, not whole-system proof

**Class:** `HARD_INVARIANT`

Words and labels such as `PASS`, `READY`, `REPAIRED`, `SAME`, `COMMITTED`, or a zero-warning count prove only the scope their underlying check actually validates.

Before using such a label to make a broader conclusion, inspect the evidence, scope, and neighboring state that support it. A locally correct check may coexist with an unresolved product- or system-level gap.

### RCR-H05 — Do not game validation

**Class:** `HARD_INVARIANT`

Never create placeholder artifacts, invented state, fake metadata, weakened checks, or synthetic authority merely to make bootstrap, registration, CI, status, or validation appear green.

If expected evidence is legitimately absent, report the real missing/unknown state and fix the contract only through an explicit reviewed change.

### RCR-H06 — Keep secrets and private sensitive material out of Git

**Class:** `HARD_INVARIANT`

Do not commit secrets, credentials, API keys, authentication/session material, tokens, private device material, or raw payloads/logs containing sensitive private data.

Projects may keep sanitized, bounded diagnostics when their contract permits them. Sanitization must not be confused with permission to store the original sensitive material.

### RCR-H07 — Existing Git/CI/release/production gates remain authoritative

**Class:** `HARD_INVARIANT`

Documentation, coordination issues, control-plane views, assistants, or convenience tooling do not authorize bypassing existing Git, CI, main-write, release, security, or production gates.

A failing candidate must not be deployed. Where a project has a monotonic production/release contract, stale automation must not downgrade or overwrite newer authoritative production state.

### RCR-H08 — Unresolved conflicts fail closed to explicit uncertainty

**Class:** `HARD_INVARIANT`

When an authority, policy, ownership, or evidence conflict cannot be resolved from current owning contracts, do not choose the convenient interpretation and do not bypass the conflict. Record `UNKNOWN` or `CONFLICT`, stop the affected unsafe action, and repair the owning contract or documentation.

## 5. Repository-wide defaults

### RCR-D01 — Preserve working baselines; repair only proven gaps

**Class:** `DEFAULT`

Start from the currently verified baseline. Healthy behavior is an asset. Do not redesign, rewrite, optimize, or broaden a working area merely because a change is nearby. Preserve working behavior unless the explicit goal or current evidence proves that area must change.

Use this default state transition:

```text
WORKING + VERIFIED
→ PRESERVE

UNKNOWN
→ OBSERVE / ATTRIBUTE / VERIFY

BROKEN OR MISSING
→ TARGETED REPAIR AT THE NARROWEST CORRECT OWNER/BOUNDARY

REPAIR VERIFIED
→ PROMOTE THE REPAIRED RESULT INTO THE NEW PRESERVED BASELINE
```

When a repair is required, change the narrowest correct owner/effect surface, keep unaffected working behavior stable, and verify both the intended fix and preservation of neighboring healthy behavior. Broad rewrites, opportunistic cleanup, or unrelated optimization require independent justification; they must not hitchhike on a bounded repair.

### RCR-D02 — One primary goal per bounded work unit

**Class:** `DEFAULT`

A release, work packet, or bounded change should normally have one primary goal. Do not silently absorb unrelated work. A larger unit is acceptable when it has one coherent architectural goal and its scope is explicit.

### RCR-D03 — Evidence before repair

**Class:** `DEFAULT`

Prefer:

```text
Observe → Attribute → Verify → Design → Repair → Measure
```

If causality is not sufficiently isolated, improve observation/diagnostics before changing unrelated behavior.

### RCR-D04 — Measure before optimizing

**Class:** `DEFAULT`

Optimize measured bottlenecks rather than plausible suspects. Correctness, safety, and fidelity must not be traded away merely for a nicer performance metric.

### RCR-D05 — Prefer safe automation over unnecessary user-manual repository work

**Class:** `DEFAULT`

When existing repository tooling can safely perform source analysis, edits, validation, PR/CI work, merge, or other authorized repository operations, prefer using that tooling instead of requiring the user to manually reproduce repository commands.

Manual/device steps remain appropriate when the needed evidence genuinely exists only on the user's device or outside repository tooling.

### RCR-D06 — Add regression coverage for durable contracts when practical

**Class:** `DEFAULT`

A production incident or newly established durable contract should gain an appropriate regression check when practical. Tests should validate public/operational behavior or durable boundaries rather than merely duplicating implementation details.

### RCR-D07 — Scope impact before broad change

**Class:** `DEFAULT`

Before a broad, architectural, or high-blast-radius change, establish the relevant structure, ownership boundaries, callers/dependents/tests, and likely impact surface first. Then re-read the original source at the affected symbols before making implementation claims or selecting a repair.

A structural index, dependency graph, impact report, or other derived view may reduce repeated broad scanning, but it does not replace current owning source or authority.

### RCR-D08 — Distill context, preserve source authority

**Class:** `DEFAULT`

Repeatedly used knowledge should be distilled into a compact, source-linked index or summary layer when that materially reduces repeated broad scanning. Original source and deeper references must remain available for targeted re-read.

Derived summaries, indexes, graphs, skills, or memory aids are context-management tools. They do not become a competing source of mutable project truth and must not silently override current owning authority.

### RCR-D09 — Creation is incomplete without feedback

**Class:** `DEFAULT`

Generated or changed work should be checked through the strongest practical feedback loop available for that artifact before it is declared complete. Appropriate feedback may include executable tests, static checks, diff review, rendered-output inspection, source-backed diagnostics, or required real-device evidence.

The exact validator remains project- or artifact-owned; this rule does not require one universal check. Creation, generation, or compilation alone is not completion when a stronger practical verification surface exists.

### RCR-D10 — Prefer composable workflow modules

**Class:** `DEFAULT`

When a development, analysis, review, or release procedure repeats, prefer small, composable, inspectable procedures, skills, checks, or tools where they improve consistency. Avoid introducing a monolithic process framework that silently takes authority away from existing project owners or makes failures difficult to isolate.

Reusable workflow modules should compose with existing Git, CI, release, security, and project contracts rather than replace them.

### RCR-D11 — Choose the narrowest capable semantic owner/effect surface

**Class:** `DEFAULT`

Before selecting an implementation mechanism, classify the semantic job and prefer the narrowest existing owner/effect surface that can perform it correctly. Do not introduce broader state ownership, privileged hooks, workers, storage owners, APIs, background jobs, UI owners, or release machinery when a smaller existing surface can satisfy the requirement.

Project-specific architecture decides what the candidate surfaces are. This rule governs selection discipline without replacing project ownership.

### RCR-D12 — Map state/data/effect flow before multi-layer mutation

**Class:** `DEFAULT`

When one change spans multiple modules, layers, processes, or persistence boundaries, explicitly map the semantic flow before mutation. A useful generic shape is:

```text
input/event
→ semantic owner
→ state/data transform
→ persistence boundary if any
→ consumer/presentation
→ validation surface
```

The map may be textual, tabular, or diagrammatic. It is an analysis artifact and must not become a second source of truth.

### RCR-D13 — Validate contracts across boundaries, not files in isolation

**Class:** `DEFAULT`

When one semantic feature is represented across multiple layers, validation should check the connection points between those layers rather than treating each file or module as independently sufficient.

Examples include producer field ↔ consumer field, UI action ↔ handler, state writer ↔ state reader, schema field ↔ persistence/migration logic, manifest declaration ↔ runtime owner, diagnostics identity ↔ displayed identity, canonical source ↔ generated artifact, and release tuple ↔ promoted artifact.

Project-owned tests and contracts decide the concrete assertions. The common layer does not invent one universal schema.

### RCR-D14 — Prefer compact agent execution surfaces

**Class:** `DEFAULT`

When automated repository work requires local command execution, prefer short commands that invoke existing repository-native scripts, tests, package CLIs, CI, or other durable harnesses. Avoid embedding large generated programs, multiple source/test files, or mini build systems inside one shell/tool invocation when the same validation can be materialized or delegated without weakening evidence.

Small one-off inline snippets remain appropriate when they are bounded and easier to inspect than a durable file. Compactness must never remove required validation, bypass authority/gates, or hide meaningful failure evidence.

The exact guardrail and routing procedure are owned by `.agents/skills/agent-execution-compactness/SKILL.md` and may evolve without changing project authority.

## 6. Conditional common rules

### RCR-C01 — Generated artifacts remain derived

**Class:** `CONDITIONAL`

When a project uses generated distributables:

```text
canonical source → deterministic build → generated artifact → production
```

The generated artifact is not the primary development source and should not be hand-edited as the normal implementation path. Validation should detect divergence where practical.

### RCR-C02 — Read-only/check-only to writable is an explicit migration

**Class:** `CONDITIONAL`

When a project or shared profile is currently read-only/check-only, a transition to writable behavior requires an explicit reviewed migration with proven authority, bounded outputs/write scope, suitable gating, and evidence that the new writer does not duplicate or bypass the existing owning authority.

The existence of a memory file, descriptor, status view, or bootstrap registration is not permission to mutate production.

### RCR-C03 — Diagnostics should remain observational and bounded

**Class:** `CONDITIONAL`

When diagnostic instrumentation exists, it should avoid materially changing the behavior being measured and should keep telemetry bounded. Avoid unnecessary full scans, unbounded history, large raw sensitive payload retention, needless network calls, and high-frequency polling unless a project-specific reviewed contract explicitly requires them.

When a project explicitly separates diagnostic-analysis turns from later design/implementation turns, honor that interaction boundary.

### RCR-C04 — Use the project's normal update path for routine releases

**Class:** `CONDITIONAL`

When a project defines an authoritative automatic/normal update path, routine production releases should use that path rather than depending on debug-only installation, manual file replacement, token copying, or temporary bootstrap procedures.

Temporary diagnostics do not automatically become the normal release mechanism.

### RCR-C05 — Keep current health distinct from historical incidents

**Class:** `CONDITIONAL`

When a project records runtime errors or incidents, current actionable health and historical/recovered events are separate concepts. Do not erase useful history merely to make the current status appear healthy, and do not treat a recovered historical event as proof of a current outage.

### RCR-C06 — Real-device evidence stays project-scoped

**Class:** `CONDITIONAL`

When authoritative validation genuinely requires a real device or external runtime, repository work may stop at that evidence boundary. The project contract owns the exact device steps and success criteria; the common layer does not invent them.

### RCR-C07 — Isolate parallel exploration; select explicitly

**Class:** `CONDITIONAL`

For genuinely complex, high-risk, or naturally parallelizable work, independent approaches may be explored in isolated branches, worktrees, read-only review lanes, or equivalent bounded environments. Selection or merge should happen only after the alternatives are compared against explicit criteria and current owning authority.

Parallel agreement, voting, or repeated model output is supporting evidence only; it does not manufacture source truth. Small or straightforward work should not pay parallel-orchestration overhead without a concrete benefit.

### RCR-C08 — Separate analysis from mutation where supported

**Class:** `CONDITIONAL`

When a tool or workflow exposes an explicit analysis, audit, research, diagnosis, or review phase, keep that phase read-only while uncertainty and scope are still being resolved. Mutation should begin only after evidence is sufficient for a selected design and the owning workflow authorizes writes.

An exploratory index, audit report, diagnosis, or candidate comparison must not silently become a writer merely because the tooling can also modify files.

### RCR-C09 — Prefer validators before introducing replacement/shared writers

**Class:** `CONDITIONAL`

When proposing a new shared writer, builder, migration owner, publisher, or replacement mechanism for an existing workflow, prefer first establishing a read-only scanner or validator that proves the current contract, repeated failure mode, and missing enforcement gap.

Where practical, use:

```text
observe/scan
→ validate current contract
→ collect repeated evidence
→ define exact gap
→ introduce a writer/replacement owner only if still justified
```

This does not prohibit ordinary project-local source edits or already-authorized writers. It applies when creating or replacing an authority-bearing mechanism.

### RCR-C10 — Incomplete/projected views do not own deletion-by-omission

**Class:** `CONDITIONAL`

When a writer, compatibility surface, projection, lazy/externalized view, or partial snapshot is not proven complete and authoritative for the affected state, omitted fields or keys mean unspecified, not delete. Destructive clear or replacement requires explicit destructive intent or an owning contract that proves the incoming representation is complete and authoritative for that replacement scope.

Do not let externalization, lazy hydration, projection, compatibility adaptation, or partial reads silently widen omission semantics into deletion authority. Projects retain ownership of completeness proofs, field/write ownership, merge behavior, and explicit clear/replace APIs.

### RCR-C11 – Late effects require current operation authority

**Class:** `CONDITIONAL`

When operations can overlap, be superseded, or complete after their target or lifecycle state has advanced, an operation must not apply a late mutation merely because it started earlier, completed successfully, failed, or still observes the same value. Before an effect can overwrite, roll back, restore, repopulate, retarget, or otherwise reverse or replace shared or authoritative state, the operation must still satisfy the owning contract's current operation/target authority for that effect.

Projects retain ownership of the proof mechanism and revocation semantics. Depending on the system, valid mechanisms may include serialization, an operation token/generation, epoch or revision checks, compare-and-swap/preconditions, stable captured target identity, or another owner-defined currentness guard. This rule does not require a token system when operations cannot race or when late effects are explicitly safe under the owning contract, such as properly defined idempotent, commutative, or append-only effects. Temporal recency alone does not manufacture semantic authority.

## 7. Deliberately project-only rules

The following categories remain `PROJECT_ONLY` unless separately promoted after a cross-project review:

- current product/plugin/runtime version numbers;
- exact production or release branch names;
- exact manifest, artifact, updater, or deployment paths;
- project runtime modes and lifecycle semantics;
- cache/provider semantics unique to one product;
- exact concurrency limits, timeouts, TTLs, buffer sizes, thresholds, or retry timings;
- project-specific rollback switches and environment variables;
- UI layout/navigation/widget behavior;
- project-specific protected subsystem lists;
- device-specific button presses, installation steps, or validation sequences;
- current roadmap priorities, active incidents, or release-specific implementation state.

These details belong to the owning project guideline, manifest, release contract, status authority, or runtime source.

## 8. Conflict-resolution contract

When common and project text appear to conflict:

1. **Classify the disagreement.** Is it a truth/fact conflict or a policy/rule conflict?
2. **Identify the owning scope.** Use the repository catalog/registry and the relevant project/domain contract.
3. **Re-read current authority.** Do not resolve the conflict from conversation history or copied stale text.
4. **For truth conflicts, follow the owning authority chain.** If it does not resolve the conflict, preserve `UNKNOWN`/`CONFLICT`.
5. **For policy conflicts, compare rule classes and scope.** A project-specific rule may specialize a `DEFAULT` or applicable `CONDITIONAL`; it cannot silently weaken a `HARD_INVARIANT`.
6. **If two hard requirements conflict, stop the affected unsafe action.** Do not invent precedence. Resolve the governance conflict through an explicit reviewed change.
7. **Fix the divergence at its owner.** Do not create a second manually maintained truth merely to make documents agree.

Conflict resolution must preserve valid project specialization rather than treating every textual difference as a violation.

## 9. Promotion contract for future common rules

A rule discovered in one project may be promoted into this common layer only when it passes all of the following checks:

1. **General value:** it repeats across multiple scopes or is a clearly cross-project safety/authority/integrity principle.
2. **No mutable truth:** it does not copy current versions, SHAs, deployment states, device state, or other project-owned mutable facts.
3. **No project constants:** exact runtime modes, paths, timing values, branch names, UI semantics, and other product-specific constants remain project-owned.
4. **Classified scope:** the candidate is explicitly assigned `HARD_INVARIANT`, `DEFAULT`, `CONDITIONAL`, or rejected as `PROJECT_ONLY`.
5. **Conflict review:** current registered project guidelines are checked for contradiction before promotion.
6. **Owner preservation:** the promoted wording references or composes with existing detailed owners instead of replacing them unnecessarily.
7. **Provenance:** the source project/rule and reason for promotion remain auditable in repository history or the canonical-main design/audit surfaces.

A rule that fails these checks stays project-specific. Commonization is not a goal by itself.

## 10. Detailed authority references

Use these existing surfaces instead of copying their mutable contents into this document:

- repository common principles: `README.md`;
- reusable project-guideline skeleton: `.github/plugin-control-plane/canonical-main/guidelines-template.md`;
- canonical-main work coordination: `.github/plugin-control-plane/canonical-main/work-system/README.md`;
- project/control-plane authority model: `docs/REPOSITORY_PLUGIN_CONTROL_PLANE_DESIGN.md`;
- current registered project/authority/guideline locators: `docs/REPO_PROJECT_CATALOG.md`;
- each project's guideline and authority files referenced by that catalog.

Repository, Git, CI, release, and project authorities remain above coordination memory and chat context.

## 11. Change contract

Changes to this document should:

1. re-read current repository authority and registered project guidelines first;
2. preserve the truth/policy separation above;
3. state the class of every newly promoted rule;
4. check that no new `HARD_INVARIANT` silently invalidates a current project contract;
5. avoid copying mutable project state;
6. keep project-specific specialization explicit;
7. use normal repository review/CI authority.

Changing this document alone does not grant new runtime, production, release, main-write, or enforcement authority.