# Repository Common Rule Promotion Review — 2026-09-01

Status: **PROMOTION REVIEW COMPLETE — CANDIDATES IDENTIFIED / CANONICAL COMMON RULES NOT YET MODIFIED**

Scope: repository-wide shared development/process policy. This review synthesizes user-supplied and directly verified external references already recorded for Local Usage Dashboard research. It does not import third-party code or tools and does not change any product/runtime/release authority.

## Source set reviewed

- `virgiliojr94/book-to-skill`
- `hehee9/Multi-GPT`
- user-supplied `large-codebase-analysis` workflow note
- `Nutlope/hallmark`
- `stablyai/orca`
- `tirth8205/code-review-graph`
- `mattpocock/skills`
- `Shubhamsaboo/awesome-llm-apps`
- `iOfficeAI/OfficeCLI`

Existing repository-wide authority reviewed before promotion: `docs/REPOSITORY_COMMON_RULES.md`.

## 1. Recommended new common-rule candidates

These patterns recur across multiple independent sources and are not merely current product facts or tool-specific mechanics.

### Candidate A — Structure-first impact scoping before broad implementation

**Recommended class:** `DEFAULT`

Proposed principle:

> Before a broad, architectural, or high-blast-radius change, establish the relevant structure, ownership boundaries, callers/dependents/tests, and likely impact surface first. Then reread the original source at the affected symbols before making implementation claims.

Evidence convergence:

- `large-codebase-analysis`: inventory, dependency/call/state/ownership graph, targeted reread.
- `code-review-graph`: persistent structural graph, blast-radius analysis, affected tests/dependents.
- `mattpocock/skills`: `to-spec`, codebase design, architecture survey, code review discipline.

Why common: applies to plugins, runtime code, tooling, docs generators, and large repository subsystems without requiring any specific parser/MCP/tool.

Suggested future identifier: **RCR-D07 — Scope impact before broad change**.

### Candidate B — Prefer source-linked compact indexes plus on-demand deep reread

**Recommended class:** `DEFAULT`

Proposed principle:

> Repeatedly used knowledge should be distilled into a compact source-linked index or summary layer, while original source and deep references remain available for targeted reread. Derived summaries reduce repeated broad scanning but never replace owning authority.

Evidence convergence:

- `book-to-skill`: compact `SKILL.md` plus topic/chapter references and incremental fold-in.
- `large-codebase-analysis`: durable index/analysis artifacts plus targeted original-source reread.
- `code-review-graph`: answer-shaped context slices instead of whole-corpus rereads.
- `mattpocock/skills`: small reusable project context/procedure artifacts rather than one giant framework.

Existing `RCR-H02/H03` already protect authority and uncertainty, so the new material is the **preferred context-management strategy**, not a new truth owner.

Suggested future identifier: **RCR-D08 — Distill context, preserve source authority**.

### Candidate C — Isolated independent exploration before merge/selection for complex work

**Recommended class:** `CONDITIONAL`

Proposed principle:

> For genuinely complex, high-risk, or naturally parallelizable work, independent approaches may be explored in isolated branches/worktrees/read-only review lanes. Merge or selection happens only after comparison against explicit criteria and current authority. Parallel agreement is evidence, not source truth.

Evidence convergence:

- `Multi-GPT`: parallel solvers/refiners, then merger/judge.
- `Orca`: isolated worktrees, parallel agents, compare results and merge a selected winner.
- `mattpocock/skills`: parallel standards/spec review axes and specialized review procedures.

Why conditional: ordinary small changes should not pay orchestration overhead.

Suggested future identifier: **RCR-C07 — Isolate parallel exploration; select explicitly**.

### Candidate D — Close the feedback loop before declaring work complete

**Recommended class:** `DEFAULT`

Proposed principle:

> Generated or changed work should be checked through the strongest practical feedback loop available for that artifact: executable tests, static checks, rendered output, diff review, source-backed diagnostics, or required real-device evidence. Creation alone is not completion.

Evidence convergence:

- `mattpocock/skills`: TDD, diagnosing-bugs, code-review feedback loops.
- `Hallmark`: slop-test gates, audit, pre-emit critique, redesign/study validation.
- `OfficeCLI`: render → look → fix loop for editable document artifacts.
- `code-review-graph`: CI/risk/test-gap review surface.
- existing repository practice already uses regression and physical acceptance boundaries.

This would extend `RCR-D06` beyond regression coverage into a general artifact feedback-loop rule without mandating one universal validator.

Suggested future identifier: **RCR-D09 — Creation is incomplete without feedback**.

### Candidate E — Repeated workflows should be small, composable procedures rather than monolithic process owners

**Recommended class:** `DEFAULT`

Proposed principle:

> When a development/review procedure repeats, encode it as a small, composable, inspectable procedure/skill/check where useful. Avoid introducing a monolithic framework that silently takes ownership away from existing project authorities or makes failures hard to isolate.

Evidence convergence:

- `mattpocock/skills`: explicitly small, adaptable, composable skills instead of process-owning frameworks.
- `book-to-skill`: compact skill/index plus modular deep references.
- `Hallmark`: one focused design skill with distinct audit/redesign/study verbs.
- `awesome-llm-apps`: many narrow installable agent skills rather than one compulsory runtime.

This composes with existing `RCR-H02` owner preservation and `RCR-D02` bounded work units.

Suggested future identifier: **RCR-D10 — Prefer composable workflow modules**.

### Candidate F — Keep analysis/audit mode distinct from mutation when uncertainty is still being resolved

**Recommended class:** `CONDITIONAL`

Proposed principle:

> When a tool or workflow has an explicit analysis/audit/research mode, keep that phase read-only until evidence and scope are sufficient for a selected design. Do not let exploratory analysis silently become a writer.

Evidence convergence:

- `book-to-skill`: analyze-only separate from generation/update.
- `Hallmark`: `audit` produces a punch list with no edits; redesign is a separate verb.
- `large-codebase-analysis`: structure/index/graph before implementation claims.
- `Multi-GPT`: independent read-only reasoning stages before selected merged output.

Existing `RCR-D03` and `RCR-C03` partially cover this for diagnosis; this candidate broadens it to non-diagnostic audit/research tooling.

Suggested future identifier: **RCR-C08 — Separate analysis from mutation where supported**.

## 2. Strongly supported but already owned by existing common rules

These do not need duplicate new rules; the supplied references reinforce current common policy.

### Current authority/source truth before adoption

Already owned by `RCR-H01`, `RCR-H02`, `RCR-H03`, and `RCR-H08`.

The external-repo verification exercise itself demonstrated why this matters: same-name and similar projects existed for Orca, code-review-graph, and OfficeCLI, so exact-source verification was necessary before deriving a process rule.

### Evidence before repair and bounded change

Already owned by `RCR-D01`, `RCR-D02`, `RCR-D03`, and `RCR-D04`.

The new sources strengthen these principles but do not justify parallel wording.

### Safe automation while preserving genuine human/device boundaries

Already owned by `RCR-D05` and `RCR-C06`.

External tools demonstrate automation possibilities, but repository/project authority still determines when a human or real device is genuinely required.

## 3. Do not promote to repository-wide common rules

The following are useful references but remain tool/domain/project-specific:

- Hallmark's exact anti-AI-slop gates, theme counts, aesthetic rules, or UI macrostructures.
- Orca's exact worktree, terminal, mobile, SSH, or agent-runtime implementation.
- Multi-GPT's exact Planner/Solver/Refiner/Merger/Judge stage graph.
- code-review-graph's Tree-sitter, MCP, SQLite, benchmark figures, language list, or installation mechanism.
- OfficeCLI's DOCX/XLSX/PPTX command model, rendering implementation, or document-format capabilities.
- awesome-llm-apps examples as product/runtime dependencies.
- any external project's current versions, stars, branches, package names, or release mechanics.

These can inform project/domain designs when relevant, but common rules should capture the durable principle rather than the borrowed mechanism.

## 4. Promotion recommendation

If the canonical common rules are updated, promote the six candidates in this order:

1. **D07 Structure/impact scoping** — strongest cross-project engineering value.
2. **D09 Feedback loop before completion** — strong and broadly applicable.
3. **D08 Source-linked compact context** — useful as repository complexity grows.
4. **D10 Composable workflow modules** — useful for repeated agent/development procedures.
5. **C08 Analysis/mutation separation** — broadly useful where explicit audit modes exist.
6. **C07 Isolated parallel exploration** — useful, but only for work whose complexity justifies it.

Before canonical promotion, run the `REPOSITORY_COMMON_RULES.md` promotion contract against registered project guidelines to check for contradictions and avoid duplicating existing detailed owners.

## 5. Local Usage Dashboard implication

Local Usage Dashboard may consume these principles immediately as design/review guidance because they do not alter product truth or runtime behavior. Formal repository-wide promotion remains a separate common-policy change.
