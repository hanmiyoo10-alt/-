# RisuAI Interactive Bot Skill — Common Plugin Applicability Review — 2026-09-01

Status: **REVIEW COMPLETE — COMMON CORE PROMISING / RISUAI ADAPTER REMAINS DOMAIN-SCOPED / NO COMMON SKILL IMPLEMENTATION AUTHORIZED**

Scope: determine which parts of `docs/RISUAI_INTERACTIVE_BOT_DEVELOPMENT_SKILL_DESIGN_2026-09-01.md` are suitable for repository-wide plugin reuse and which must remain RisuAI-specific. This review does not install or activate a skill and does not change any plugin/runtime/release authority.

## 1. Repository basis

Reviewed against:

- `docs/RISUAI_INTERACTIVE_BOT_DEVELOPMENT_SKILL_DESIGN_2026-09-01.md`
- `docs/REPOSITORY_PLUGIN_SKILL_DEVELOPMENT_METHODOLOGY_2026-09-01.md`
- `docs/REPOSITORY_COMMON_RULES.md`
- `.agents/skills/plugin-authority-scan/SKILL.md`

The common skill methodology requires evidence-backed workflows, coherent scope, project-owned mutable truth, progressive disclosure, deterministic validators, baseline evals, and cautious promotion. The existing `plugin-authority-scan` pilot also demonstrates the repository rule that a skill validated for one plugin must not silently claim another scope.

## 2. Verdict

Yes: the RisuAI design contains a strong **common plugin development core**.

No: the whole `risuai-interactive-bot-development` skill should not be promoted as a generic plugin skill.

Preferred architecture:

```text
repository-wide plugin development principles/primitives
                    +
        domain-specific adapter/reference
                    ↓
        scoped project development skill
```

For this case:

```text
common plugin core
        +
RisuAI layer vocabulary / host semantics / gotchas
        ↓
risuai-interactive-bot-development
```

The common layer should own reusable procedure. The RisuAI layer should own RisuAI semantics.

## 3. Strong common-plugin candidates

The following parts are domain-independent enough to reuse across plugins.

### 3.1 Authority-first project scan

Before editing, identify:

- repository/project rules;
- project-local authority files;
- canonical source locations;
- generated/derived outputs;
- build/release/validation boundaries.

This directly aligns with the existing `plugin-authority-scan` model and repository common rules. A common workflow must use these as locators and fresh-read the owning source rather than storing mutable truth in the skill.

### 3.2 Classify the semantic job before choosing the implementation layer

The RisuAI design asks what the requested behavior means before choosing Lua/CBS/Regex/etc. The reusable principle is broader:

> classify the semantic job first, then choose the narrowest owner/effect surface that can perform it.

Across plugins this can prevent unnecessary new workers, APIs, storage owners, hooks, background jobs, UI owners, or release machinery.

### 3.3 Draw state/data/effect flow before multi-layer edits

The RisuAI design explicitly maps paths such as button → state write → display refresh → render.

The common form is:

```text
input/event
-> semantic owner
-> state/data transform
-> persistence boundary if any
-> consumer/presentation
-> validation surface
```

For any change spanning multiple files/modules/processes, this flow should be explicit before mutation. This supports ownership review, stale-data analysis, and blast-radius reasoning.

### 3.4 Canonical source versus derived output discipline

The supplied template's `risu/` rule is domain-specific, but the method is common:

- discover whether generated artifacts exist;
- edit owning source rather than derived output when the project contract says so;
- validate source/artifact parity through the project-owned mechanism;
- never assume one project's folder convention applies to another.

This aligns with repository common rule RCR-C01.

### 3.5 Validators before replacement writers

The RisuAI design deliberately prefers `scan_project.py`, `validate_project.py`, and `validate_cross_layer.py` before designing a universal replacement builder.

This is an excellent common-plugin pattern:

```text
observe/scan
-> validate current contract
-> collect repeated failure evidence
-> only then consider a writer or replacement build system
```

It reduces authority duplication and avoids turning a useful audit helper into a competing build/release owner.

### 3.6 Cross-layer contract validation

The proposed RisuAI validator checks that identifiers and state flows agree across Lua, UI, Regex, CSS, and prompt layers.

The reusable abstraction is:

> whenever one semantic feature is represented in multiple layers, validate the connection points between the layers rather than testing each file in isolation.

Generic examples include:

- producer field ↔ consumer field;
- UI action ↔ handler;
- manifest declaration ↔ runtime owner;
- state writer ↔ state reader;
- schema field ↔ persistence/migration logic;
- generated artifact ↔ canonical source;
- diagnostics identity ↔ displayed identity;
- release tuple ↔ promoted artifact.

A future common validator framework should remain schema/config driven and project-owned. It must not invent one universal set of identifiers.

### 3.7 Project-owned build/release policy

The RisuAI design correctly refuses to turn one template's `do not run build.ps1` rule into universal law.

Common rule:

- local/project authority decides whether build/release is automatic, manual, forbidden in the current phase, or device-gated;
- common skills must not carry a copied manual/automatic rule across projects;
- when authority is missing, preserve `UNKNOWN` rather than selecting a convenient path.

### 3.8 Static validation versus runtime/physical truth boundary

Static checks can prove structure and consistency; they cannot necessarily prove host rendering, event timing, device integration, production identity, or real runtime behavior.

Common skills should explicitly state where repository evidence ends and project-owned runtime/device evidence begins. This aligns with RCR-C06 and the current plugin release workflow style.

## 4. Keep RisuAI-specific

The following should remain inside the RisuAI adapter/reference and must not be promoted as generic plugin rules:

```text
Lua triggerId semantics
CBS syntax and variables
risu-btn / risu-trigger
cv_step conventions
editDisplay / editRequest RisuAI semantics
lorebook/globalnote behavior
RisuAI async alert APIs and :await()
RisuAI CSS/parser prefix gotchas
RisuAI host import/render timing
RisuAI-specific output-tag and lorebook timing caveats
```

These may be reusable across RisuAI projects, but they are not repository-wide plugin truths.

## 5. Do not create a giant generic writer

A generic `plugin-project-development` skill that automatically edits every kind of plugin would be too broad at this stage.

It would risk:

- hiding project-specific ownership;
- creating false confidence across unrelated plugin architectures;
- triggering on too many development tasks;
- accumulating mutable project facts;
- becoming a parallel release/build authority.

The better common layer is a set of small primitives or workflow contracts that domain/project skills compose.

Promising common families, still research candidates rather than implementation authority:

```text
plugin-authority-scan                    # already has a scoped pilot
plugin-impact-scope                      # structure / ownership / blast radius
plugin-cross-layer-contract-check        # project-supplied producer/consumer contracts
plugin-validation-handoff                # static evidence -> runtime/device boundary
```

Names above are working names only; no new common skill is authorized by this review.

## 6. Promotion requirement

The RisuAI template alone is not enough evidence for repository-wide skill promotion.

Before extracting a common implementation from the RisuAI design:

1. identify one reusable primitive rather than the entire writer workflow;
2. test the same primitive against at least two materially different plugin/project architectures;
3. keep project-specific vocabulary/config outside the common core;
4. run with-skill versus baseline/previous-version evals;
5. include negative/near-miss cases so the common skill does not over-trigger;
6. prove that it preserves local authority and `UNKNOWN` behavior;
7. only then consider repository-wide promotion.

This follows the repository skill methodology and the current `plugin-authority-scan` pilot discipline, which explicitly stops on unvalidated scopes rather than improvising authority for another project.

## 7. Recommended extraction order

If common-plugin extraction is later authorized, the lowest-risk order is:

```text
1. authority/layout scan contract
2. source-versus-derived ownership checks
3. cross-layer inventory/reporting
4. project-configured cross-layer consistency validation
5. runtime/device evidence handoff contract
6. only after repeated evidence: any mutation-capable common workflow
```

Do not start with a generic build runner or generic implementation agent.

## 8. Final classification

```text
COMMON PLUGIN APPLICABILITY: HIGH
DIRECT COMMON PROMOTION OF RISUAI SKILL: NO
COMMON METHOD/PRIMITIVE EXTRACTION: YES, AFTER MULTI-PLUGIN VALIDATION
RISUAI DOMAIN ADAPTER: KEEP SEPARATE
PRODUCT/RUNTIME CHANGE: NONE
```

The strongest transferable lesson is not RisuAI syntax. It is the development shape:

> **fresh-read local authority, choose the narrowest semantic owner, make cross-layer state/effect flow explicit, edit canonical source, validate the interfaces between layers, and stop at the boundary where only runtime/device evidence can prove the result.**
