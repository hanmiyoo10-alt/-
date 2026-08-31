# Repository Common Rule Promotion Review — RisuAI Skill Extraction — 2026-09-01

Status: **PROMOTION CANDIDATES CONFIRMED — COMMON RULES NOT YET MODIFIED**

Scope: review the common-plugin lessons extracted from `docs/RISUAI_INTERACTIVE_BOT_DEVELOPMENT_SKILL_DESIGN_2026-09-01.md` and `docs/RISUAI_INTERACTIVE_BOT_SKILL_COMMON_PLUGIN_APPLICABILITY_2026-09-01.md`, compare them against the current `docs/REPOSITORY_COMMON_RULES.md`, and identify only genuinely new repository-wide rule candidates.

This document does not itself modify `docs/REPOSITORY_COMMON_RULES.md`, install a skill, or change any plugin/runtime/release authority.

## 1. Sources re-read

Current common rule owner:

- `docs/REPOSITORY_COMMON_RULES.md`

RisuAI skill-derived inputs:

- `docs/RISUAI_INTERACTIVE_BOT_DEVELOPMENT_SKILL_DESIGN_2026-09-01.md`
- `docs/RISUAI_INTERACTIVE_BOT_SKILL_COMMON_PLUGIN_APPLICABILITY_2026-09-01.md`
- `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`

Registered project guidelines checked for contradiction:

- `docs/DEVPASS_GUIDELINES.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- `docs/USAGE_DASHBOARD_GUIDELINES.md`
- `docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md`
- `docs/POCKETRISU_HELPER_MOD_GUIDELINES.md`

All registered project guidelines inherit repository `DEFAULT` and applicable `CONDITIONAL` rules by reference while preserving project-specific mutable truth and specialization. No direct contradiction was found with the four candidates below.

## 2. Existing rules that already cover several RisuAI-derived lessons

Do not add duplicate common rules for these:

- authority-first current-source reading -> RCR-H01/H02/H03/H08;
- canonical source vs generated output -> RCR-C01;
- evidence before repair / analysis before mutation -> RCR-D03 + RCR-C08;
- strongest practical feedback loop -> RCR-D09;
- composable workflow modules -> RCR-D10;
- broad-change impact scoping -> RCR-D07;
- project-owned update/release path -> RCR-H07 + RCR-C04;
- runtime/device-only proof boundary -> RCR-C06.

The RisuAI material reinforces these existing rules but does not justify duplicating them.

## 3. New promotion candidates

### Candidate RCR-D11 — Choose the narrowest capable semantic owner/effect surface

**Recommended class:** `DEFAULT`

Before selecting an implementation mechanism, classify the semantic job and prefer the narrowest existing owner/effect surface that can perform it correctly. Do not introduce broader state ownership, privileged hooks, workers, storage owners, APIs, background jobs, UI owners, or release machinery when a smaller existing surface can satisfy the requirement.

Project-specific architecture decides what the candidate surfaces are. The common rule only governs selection discipline.

Why this is not already covered:

- RCR-D07 scopes impact before broad change, but does not explicitly require least-power architectural selection.
- RCR-D01 asks for small diffs, but a small diff can still choose an unnecessarily broad authority surface.

Cross-project support observed:

- RisuAI skill design: choose CBS/regex/Lua/lorebook/plugin authority according to the semantic job;
- SimCore guidance: preserve clear responsibility boundaries between coordination/state and renderer work;
- Usage Dashboard guidance: do not modify host/application code unless evidence shows the plugin cannot solve the problem internally;
- check-only project guidelines: do not create new publishers/writers merely because an authority is absent.

### Candidate RCR-D12 — Map state/data/effect flow before multi-layer mutation

**Recommended class:** `DEFAULT`

When one change spans multiple modules, layers, processes, or persistence boundaries, explicitly map the semantic flow before mutation. A useful generic shape is:

```text
input/event
-> semantic owner
-> state/data transform
-> persistence boundary if any
-> consumer/presentation
-> validation surface
```

The map may be textual, tabular, or diagrammatic. It is an analysis artifact, not a second source of truth.

Why this is not already covered:

- RCR-D07 maps structure/impact, but not the actual state/effect path that connects the changed owners.
- RCR-D09 requires feedback, but does not require the intended cross-layer flow to be explicit before implementation.

Cross-project value:

- clarifies ownership before state/schema changes;
- exposes stale-data and write-order risks;
- makes persistence/reload boundaries visible;
- prevents scattered edits that share no semantic owner.

### Candidate RCR-D13 — Validate contracts across boundaries, not files in isolation

**Recommended class:** `DEFAULT`

When one semantic feature is represented across multiple layers, validation should check the connection points between those layers rather than treating each file/module as independently sufficient.

Generic examples:

- producer field <-> consumer field;
- UI action <-> handler;
- state writer <-> state reader;
- schema field <-> persistence/migration logic;
- manifest declaration <-> runtime owner;
- diagnostics identity <-> displayed identity;
- canonical source <-> generated artifact;
- release tuple <-> promoted artifact.

Project-owned tests/contracts decide the concrete assertions. The common layer does not invent one universal schema.

Why this is not already covered:

- RCR-D06 encourages regression coverage, and RCR-D09 requires feedback, but neither explicitly says that integration edges are first-class validation targets.

### Candidate RCR-C09 — Prefer validators before introducing replacement/shared writers

**Recommended class:** `CONDITIONAL`

When proposing a new shared writer, builder, migration owner, publisher, or replacement mechanism for an existing workflow, prefer first establishing a read-only scanner/validator that proves the current contract, repeated failure mode, and missing enforcement gap.

Recommended sequence where practical:

```text
observe/scan
-> validate current contract
-> collect repeated evidence
-> define exact gap
-> only then introduce a writer/replacement owner if still justified
```

This does not prohibit ordinary project-local source edits or already-authorized writers. It applies when creating or replacing an authority-bearing mechanism.

Why this is not already covered:

- RCR-C02 governs an explicit read-only/check-only -> writable migration;
- RCR-C08 separates analysis from mutation;
- RCR-D03 requires evidence before repair;
- but none directly states the validator-first preference before creating a new shared/replacement writer or build owner.

This candidate should remain `CONDITIONAL` so simple/local implementation work does not acquire unnecessary process overhead.

## 4. RisuAI-specific items that remain project/domain scoped

Do not promote as repository common rules:

- CBS syntax and variables;
- `risu-btn`, `risu-trigger`, `cv_step`;
- RisuAI Lua callback/async semantics;
- `editDisplay` / `editRequest` behavior;
- lorebook/globalnote timing and semantics;
- RisuAI CSS/parser quirks;
- exact RisuAI source folder/build conventions.

These belong in a RisuAI adapter/reference layer.

## 5. Recommended promotion order

If actual common-rule promotion is authorized, recommended order:

1. `RCR-D11` — narrowest capable semantic owner/effect surface;
2. `RCR-D12` — explicit state/data/effect flow before multi-layer mutation;
3. `RCR-D13` — cross-boundary contract validation;
4. `RCR-C09` — validator-first before replacement/shared writers.

The first three are general development defaults. `RCR-C09` is intentionally narrower because it governs authority-bearing shared/replacement tooling.

## 6. Verdict

```text
PROMOTE CANDIDATES: 4
DUPLICATE/ALREADY COVERED: authority-first, generated-artifact discipline,
analysis-vs-mutation, feedback loop, composability, update path, device boundary
PROJECT_ONLY: RisuAI syntax/host semantics
COMMON RULE FILE CHANGED: NO
```

Recommended next action after explicit authorization: re-read current `main`, append the four rules to `docs/REPOSITORY_COMMON_RULES.md`, run normal repository PR/CI gates, and merge exact-head only if the registered project-guideline conflict review remains clean.
