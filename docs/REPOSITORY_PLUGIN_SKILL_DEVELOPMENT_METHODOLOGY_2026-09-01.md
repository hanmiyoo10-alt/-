# Repository Plugin Skill Development Methodology — 2026-09-01

Status: **RESEARCH COMPLETE — METHODOLOGY EXTRACTED / NO SKILL IMPLEMENTATION AUTHORIZED**

Scope: repository-wide methodology for designing reusable agent skills that may help multiple plugins/products in `hanmiyoo10-alt/-`. This document does not create a new runtime authority, install a skill, change a plugin version, or authorize repository mutation outside existing project/Git/CI/release contracts.

## 1. Source set

Primary external sources reviewed directly:

- `agentskills/agentskills`
  - Agent Skills specification
  - skill-creation best practices
  - skill output evaluation guidance
  - description/trigger optimization guidance
  - scripts-in-skills guidance
- `anthropics/skills` → `skills/skill-creator/`
- `mattpocock/skills`
  - engineering skill catalog
  - `diagnosing-bugs`
  - `to-spec`
  - `implement`
  - `code-review`
  - `research`
- `virgiliojr94/book-to-skill`
- `Nutlope/hallmark`

Repository policy composed with this review:

- `docs/REPOSITORY_COMMON_RULES.md`
  - RCR-D07 structure/impact scoping
  - RCR-D08 source-linked compact context
  - RCR-D09 feedback before completion
  - RCR-D10 composable workflow modules
  - RCR-C07 isolated parallel exploration
  - RCR-C08 analysis/mutation separation

## 2. Core conclusion

A useful skill is not merely a long prompt or a frozen copy of project documentation.

The recurring model across the sources is:

> **Capture a repeated successful workflow as a small executable contract, keep its core instructions lean, load deep context only when needed, extract deterministic repeated work into scripts, and prove that the skill improves real tasks through evaluations before promoting it broadly.**

A repository skill is a helper layer. It must never become a competing owner for mutable project truth.

## 3. Skill development lifecycle

### Phase 0 — Evidence gate: prove there is a workflow worth capturing

Do not invent a skill from generic model knowledge merely because a topic sounds reusable.

A skill candidate should begin from at least one of:

- a real task completed successfully with repeated steps;
- a production incident and its proven diagnostic/repair loop;
- project runbooks, ADRs, API/spec contracts, issue history, code-review corrections, or release evidence;
- a repeated manual process that agents keep rediscovering;
- multiple plugins independently solving the same class of problem.

High-value source material includes corrections made during real execution. A correction is often more valuable than generic advice because it identifies a non-obvious failure mode.

**Repository adaptation:** before extracting a common skill, identify the owning project authority and separate durable procedure from current mutable facts such as versions, SHAs, branch state, deployment status, and device state.

### Phase 1 — Define one coherent job

Treat skill scope like a module/function boundary.

A skill should answer:

1. What class of user/developer problem does it solve?
2. What evidence or inputs must exist before it can start?
3. What output or state transition does it produce?
4. What is explicitly out of scope?
5. Which existing authority remains the source of truth?

Prefer one coherent unit that composes with other skills over one giant framework that owns research, design, implementation, release, and validation all at once.

Useful split examples from the reviewed sources include:

- research → spec → tickets → implementation → review;
- diagnosis separate from repair;
- audit separate from redesign/mutation;
- knowledge extraction separate from final skill generation;
- standards review separate from spec-fidelity review.

### Phase 2 — Choose invocation and mutation class

Before writing `SKILL.md`, classify the skill:

#### A. Read-only/model-reachable candidate

Appropriate for bounded research, impact scoping, diagnostic triage, source verification, or audit where the skill cannot silently mutate project state.

#### B. Explicit/user-invoked writer

Preferred repository default for skills that modify source, publish specs/issues, commit changes, create releases, deploy, or otherwise cross a meaningful write boundary.

#### C. Router/composer

A small skill that decides which narrower skill or workflow fits the task. It should route, not duplicate the full instructions of every child skill.

This classification is a repository adaptation of the user-invoked/model-invoked separation observed in `mattpocock/skills`, combined with RCR-C08. It is not a claim that the external sources require all writers to be user-invoked.

### Phase 3 — Write the trigger contract first

The `description` is not decoration. In the Agent Skills specification it is the primary discovery/trigger surface.

A good description should say:

- what the skill does;
- when it should be used;
- the user intents/contexts that imply it is relevant;
- enough boundary detail to avoid adjacent false triggers.

Prefer intent language over implementation language.

Example shape:

```yaml
---
name: plugin-diagnostic-triage
description: >
  Analyze a plugin's production or real-device diagnostic against the current
  repository authority and verified baseline. Use when a user shares runtime
  diagnostics, health output, release evidence, or asks whether a plugin is
  healthy or regressed. Do not implement repairs in this skill.
---
```

#### Trigger evaluation contract

Before calling a trigger mature, test realistic queries that include:

- direct invocations;
- indirect/casual phrasing;
- terse and context-heavy prompts;
- multi-step requests where the skill is only one part;
- near-miss negative cases using overlapping vocabulary but requiring a different skill.

For important common skills, use repeated runs because trigger behavior is nondeterministic. Keep a train set for iteration and a held-out validation set to avoid description overfitting.

### Phase 4 — Use progressive disclosure

Portable Agent Skills use this shape:

```text
skill-name/
├── SKILL.md       # required: metadata + core procedure
├── scripts/       # optional deterministic/repeated logic
├── references/    # optional deep documentation
├── assets/        # optional templates/resources
└── evals/         # repository convention for test prompts/assertions
```

The official specification recommends keeping the main `SKILL.md` compact (roughly under 500 lines / 5,000 tokens) and loading deeper resources only when needed.

Repository guidance:

- Put **always-needed gotchas, safety rails, entry conditions, and core workflow** in `SKILL.md`.
- Put **large domain references, provider/framework variants, detailed schemas, historical examples** in `references/`.
- Put **deterministic repeated operations and validators** in `scripts/`.
- Put **templates or non-instruction resources** in `assets/`.
- Tell the agent **when** to read each reference; never say only “see references”.
- Avoid deep reference chains. The core skill should point directly to the next useful file.

This follows the same structural idea seen in `book-to-skill`: compact front-loaded skill/index plus on-demand chapter/reference material rather than repeatedly dumping the whole corpus into context.

### Phase 5 — Encode procedure, not one answer

Prefer a reusable method over task-instance output.

Strong skill instructions commonly include:

- an explicit entry condition;
- a small ordered procedure;
- defaults rather than a menu of equal options;
- concrete gotchas that correct likely model mistakes;
- an output template where output shape matters;
- a checklist for multi-step work;
- a validation loop;
- a completion criterion;
- a stop/fail-closed condition when required evidence is unavailable.

Calibrate strictness to fragility:

- flexible/reversible work may describe intent and reasoning;
- destructive, release, migration, authority, or security-sensitive work should be more prescriptive and gated.

Explain *why* a rule exists where that helps the agent generalize. Avoid filling the skill with generic knowledge the model already handles well.

### Phase 6 — Build the feedback loop into the skill

The strongest recurring lesson across the reviewed skills is that creation is not completion.

Examples:

- `diagnosing-bugs` treats a tight red-capable feedback loop as the core of diagnosis;
- `implement` composes TDD and code review rather than ending after code generation;
- Hallmark uses explicit audit/self-critique and rendering/state checks;
- Agent Skills best practices recommend validation loops and plan-validate-execute for fragile workflows.

A repository skill should define the strongest practical validation available for its artifact:

```text
perform work
→ validate against owning source/contract
→ repair validation failures
→ repeat until pass or explicit blocked/unknown state
```

For plugin work, possible validators include tests, static checks, diff review, manifest/hash parity, source-backed diagnostics, and real-device evidence. The owning project decides which are authoritative.

### Phase 7 — Extract repeated deterministic logic into scripts

Do not make the model reinvent the same parser, validator, formatter, graph builder, or deterministic transform on every invocation.

Bundle a script when execution traces repeatedly show the same mechanical logic being recreated.

Agent-friendly script rules from the official guidance:

- pin tool/dependency versions where reproducibility matters;
- avoid interactive prompts;
- support concise `--help`;
- accept inputs through flags/stdin/environment rather than TTY questions;
- emit machine-readable data where practical;
- separate data on stdout from diagnostics on stderr;
- fail with actionable error messages;
- reject ambiguous input rather than guessing;
- prefer idempotency because agents retry;
- support dry-run/preview for destructive or stateful work;
- use safe defaults and explicit confirmation flags where risk warrants them;
- keep output bounded/paginatable so tool truncation does not hide critical evidence.

Repository addition: scripts must not embed current production versions, credentials, or private device data as hidden constants. Resolve mutable authority from the owning repository source when required.

### Phase 8 — Evaluate output quality against a baseline

A skill is not proven because one demo looked good.

Start with 2–3 realistic test prompts. Expand only after the first feedback cycle.

Each eval should contain:

- realistic prompt;
- human-readable expected result;
- optional input files;
- later, objective assertions where appropriate.

Run each case in isolated context using:

```text
with skill
vs
without skill
```

For an existing skill improvement, compare against the previous version instead of no skill.

Evaluate three independent dimensions:

1. **Objective assertions** — facts that can be mechanically checked.
2. **Human/qualitative review** — qualities that do not reduce cleanly to assertions.
3. **Cost** — tokens, duration, tool calls, or other material execution overhead.

A skill should earn its context and orchestration cost. If the baseline already performs the task correctly and efficiently, delete or shrink the skill rather than preserving it for prestige.

Execution traces are first-class evidence. They reveal ambiguous instructions, wasted branches, repeated helper-code generation, and unnecessary steps even when final output happens to pass.

### Phase 9 — Iterate by generalizing, not patching examples

Use failures, human feedback, and execution traces to revise the skill.

Good iteration:

- add a gotcha after a repeated real correction;
- clarify a vague step that caused inconsistent paths;
- remove instructions that waste time without improving results;
- move repeated deterministic work into a script;
- split an over-broad skill into coherent child skills;
- improve trigger description around a general intent category.

Bad iteration:

- adding exact wording from one failed eval until that eval passes;
- growing an enormous rule list without checking whether quality improves;
- encoding one plugin's current version/branch/runtime facts into a common skill;
- hiding a failed source lookup by inventing a fallback value.

### Phase 10 — Pilot before repository-wide promotion

A common plugin skill should normally prove itself in one owning scope before broad promotion.

Suggested lifecycle:

```text
observed repeated workflow
→ candidate skill
→ one-plugin pilot
→ output evals + trigger evals
→ corrections / simplification
→ second-scope compatibility review
→ common-skill promotion decision
```

Repository-wide promotion should require:

- useful behavior in more than one project or a clearly cross-project engineering need;
- no ownership of mutable plugin truth;
- no hidden bypass of project/Git/CI/release gates;
- clean project specialization points;
- a regression/eval set that demonstrates value;
- a clear deprecation/update path if the workflow changes.

## 4. Suggested skill quality gates

Before calling a reusable skill stable, check:

### Authority gate

- [ ] Reads current owning authority when truth is mutable.
- [ ] Does not copy mutable versions/SHAs/deployment state as permanent truth.
- [ ] Preserves UNKNOWN/CONFLICT rather than guessing.

### Scope gate

- [ ] One coherent job.
- [ ] Explicit out-of-scope boundary.
- [ ] Does not silently take over another project's owner.

### Trigger gate

- [ ] Description says what + when.
- [ ] Positive trigger cases pass.
- [ ] Near-miss negative cases do not over-trigger.
- [ ] Held-out trigger validation exists for important shared skills.

### Context gate

- [ ] Core `SKILL.md` is lean.
- [ ] Deep content is progressively disclosed.
- [ ] References have explicit load conditions.

### Execution gate

- [ ] Fragile steps are prescriptive enough.
- [ ] Repeated deterministic logic is scripted where useful.
- [ ] Scripts are non-interactive, bounded, and agent-readable.

### Feedback gate

- [ ] Realistic evals exist.
- [ ] With-skill is compared with a baseline/previous version.
- [ ] Objective assertions have concrete evidence.
- [ ] Subjective outputs receive human/artifact review where appropriate.
- [ ] Cost/latency/token overhead is considered.

### Safety/write gate

- [ ] Analysis/audit does not silently mutate.
- [ ] Writer skills respect repository write/CI/release gates.
- [ ] Destructive operations have explicit preview/confirmation boundaries where applicable.
- [ ] Secrets/private payloads are not persisted into skill fixtures or outputs.

## 5. Skill archetypes worth considering for this repository

These are **candidate families, not implementation approvals**.

### `plugin-authority-scan`

Read-only. Resolve project scope from the repository catalog/guideline and return the current authority chain and exact evidence locations. Never invent missing production state.

Potential benefit: reduces repeated authority discovery across every plugin chat.

### `plugin-impact-scope`

Read-only. For broad changes, identify ownership, callers/dependents, tests, release/materializer surfaces, and likely blast radius before design.

Potential benefit: direct operationalization of RCR-D07 for growing plugin codebases.

### `plugin-diagnostic-triage`

Read-only/model-reachable candidate. Compare a supplied production/device diagnostic against current repository authority and the latest verified baseline; classify VERIFIED / supported hypothesis / UNKNOWN; stop before repair.

Potential benefit: reusable across Usage Dashboard, SimCore, Termux, Voyage, and future plugins with diagnostics.

### `plugin-research-to-design-note`

Read-only. Research a question using primary repository/upstream sources and write a cited design/research note. Similar to the source discipline in `mattpocock/skills` research.

Potential benefit: turns external/plugin research into durable source-linked repository evidence.

### `plugin-release-design`

Explicit/user-invoked writer candidate. Convert verified evidence into a bounded design issue/document with problem, scope, non-goals, ownership, source contract, regression plan, release tuple assumptions, and physical acceptance criteria.

Potential benefit: captures the repeated “fresh authority → frozen design” pattern without implementing the release.

### `plugin-implementation-runner`

Explicit/user-invoked writer candidate. Execute an already-authorized/frozen design; run relevant tests continuously, full regression at the end, and invoke review before commit/PR.

Potential benefit: composable implementation stage rather than one mega release skill.

### `plugin-release-verifier`

Read-only until an existing release workflow authorizes mutation. Verify build/materialization parity, manifest/hash/component identity, monotonicity, CI status, and production branch evidence.

Potential benefit: catches release-identity and byte-parity mistakes across plugins.

### `plugin-physical-handoff`

Read-only. At a genuine device boundary, generate the minimal exact user test instructions and acceptance evidence required by the owning project contract.

Potential benefit: preserves the repository principle that users perform only irreducible physical validation rather than development commands.

### `plugin-knowledge-distiller`

Read-only. Convert a set of source-linked external plugin/project findings into a compact pattern index, anti-patterns, candidate ideas, and references without promoting them to authority.

Potential benefit: operationalizes the current research/idea-collection workflow while preserving RCR-D08.

### `plugin-ui-audit`

Read-only first. Inspect an existing plugin UI against its own design tokens, accessibility, responsiveness, interaction states, and selected design heuristics; produce a ranked punch list without editing. Any redesign is a separate writer phase.

Potential benefit: borrows Hallmark's audit/mutation split without importing its exact aesthetic rules as repository law.

## 6. What should not become a common skill

Do not commonize:

- one plugin's current release version, branch, manifest hash, runtime constants, or device state;
- exact SimCore modes or Usage Dashboard cache/provider semantics;
- a giant “do everything for every plugin” release agent;
- copied external project prompts that replace our authority model;
- generic advice the base model already performs well without help;
- domain procedures that have not been proven through real tasks;
- hidden scripts that mutate production without the owning workflow's gates.

## 7. Source-derived design patterns worth preserving

### From `mattpocock/skills`

- Small skills can compose: `implement` delegates testing/review responsibilities instead of duplicating them.
- Some skills should be explicit/user-invoked, while safe reusable helpers can be model-reachable.
- Diagnosis benefits from a named completion criterion and tight feedback loop.
- Review quality improves when independent axes (standards vs spec fidelity) remain separate instead of being blended into one score.
- Research should prefer primary sources and produce durable cited repository output.

### From `book-to-skill`

- Extract structure rather than summaries.
- Keep the core index compact and load deeper topic files on demand.
- Separate analyze-only from generation and support fold-in/update as an explicit mode.
- Validate the exact source input before deriving a reusable artifact.

### From Hallmark

- One skill may have a small number of explicit verbs when those verbs share one coherent domain.
- Audit/read-only mode should not silently become redesign/mutation.
- Existing project boundaries must be scanned before edits.
- Pre-emit critique/validation can be part of the skill contract.
- Large skills benefit from focused `references/` files loaded by explicit condition.

### From Agent Skills / Anthropic skill-creator

- Start from real expertise and real tasks.
- Keep skills lean and progressively disclosed.
- Evaluate with realistic prompts and a baseline.
- Test trigger precision separately from output quality.
- Use scripts for deterministic repeated work.
- Improve skills from failed assertions, human feedback, and execution traces.
- Generalize improvements rather than overfitting examples.

## 8. Recommended repository adoption order

If the repository begins implementing shared skills, the lowest-risk first pilots are:

1. **`plugin-authority-scan`** — read-only, high reuse, directly reinforces current authority policy.
2. **`plugin-diagnostic-triage`** — read-only and already mirrors proven project workflows.
3. **`plugin-impact-scope`** — read-only, useful before broad changes.
4. **`plugin-research-to-design-note`** — read-only writer only to bounded docs/research surfaces.
5. **`plugin-release-design`** — explicit bounded writer after the read-only foundations prove useful.

Do **not** start with a mega `plugin-release-agent`. Composition should be proven first.

## 9. Next research/implementation boundary

This document authorizes no skill installation or runtime integration.

A future implementation turn should:

1. fresh-check repository skill-host/support options;
2. choose exactly one pilot skill;
3. define its owner, path, trigger class, mutation class, and eval set;
4. implement the smallest viable `SKILL.md` plus only necessary references/scripts;
5. run trigger and output evals against a baseline;
6. pilot in one plugin before proposing repository-wide activation.

The preferred first pilot is `plugin-authority-scan` unless newer repository evidence identifies a higher-value repeated workflow.
