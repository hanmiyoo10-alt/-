# Local Usage Dashboard — External Agent Workflow Patterns Review — 2026-09-01

Status: **REVIEW COMPLETE — PROCESS IDEAS ONLY / NO PRODUCT CHANGE AUTHORIZED**

Scope: `plugins/usage-dashboard/` development and design workflow.

Sources reviewed:

- `https://github.com/virgiliojr94/book-to-skill`
- `https://github.com/hehee9/Multi-GPT`
- user-supplied `large-codebase-analysis` skill note

This review records reusable engineering patterns. It does **not** import code, reserve a product version/P-number, alter runtime bytes, or override the Local Usage Dashboard release authority chain.

## 1. `book-to-skill`: distill structure, not summaries

### Verified source pattern

`book-to-skill` turns books or document collections into an on-demand Agent Skill rather than a monolithic summary. Its output separates a compact `SKILL.md` from topic/chapter references, glossary, patterns, and cheatsheet. It also supports analyze-only, generate-from-analysis, and update/fold-in modes.

The useful engineering pattern for this project is the separation of:

1. raw/source material,
2. structured extraction,
3. reusable compact index,
4. on-demand deep references,
5. incremental fold-in when new material arrives.

It also treats source identity and per-run working directories explicitly so concurrent extraction results are not confused with one another.

### Usage Dashboard applicability

**HIGH — development knowledge management, not product runtime.**

The project is accumulating common plugin invariants, external plugin references, release lessons, idea-list evidence, and diagnosis documents. Re-reading all of those for every design turn is increasingly wasteful and risks context drift.

Adopted principle:

> Convert repeated reference material into a small authoritative index plus on-demand source-specific notes. Preserve original source links/authority; never replace source truth with the distilled layer.

Potential future process artifact (no version reservation):

- `NV-KNOWLEDGE-DISTILLATION`
  - inventory accumulated Usage Dashboard reference docs;
  - extract named invariants, design rules, anti-patterns, source authorities, and applicability;
  - keep a compact index for design selection;
  - retain deep files/source links for targeted reread;
  - support incremental fold-in when new plugin research lands.

Non-goal: copying third-party documentation into the repository. Store synthesized notes and source references only.

## 2. `Multi-GPT`: parallel independent approaches before merge/judge

### Verified source pattern

`Multi-GPT` is an asynchronous local reasoning pipeline:

`Planner -> parallel Solvers -> parallel Refiners -> Loop(Merger -> Refiner -> Judge) -> Organizer`.

Its stages are read-only, independent approaches are compared rather than collapsed immediately, and the Judge may terminate early when the merged result is sufficient. The project explicitly recommends this for complex design/code/architecture tasks rather than ordinary short questions.

### Usage Dashboard applicability

**MEDIUM-HIGH — optional review discipline for high-risk designs.**

The valuable part is not the particular MCP implementation. It is the review topology:

- generate multiple independent design hypotheses;
- refine them separately before seeing the merged answer;
- merge only after independent failure modes have surfaced;
- apply an explicit sufficiency/judge step;
- return a concise decision plus retained evidence.

Potential future process artifact (no product version reservation):

- `NV-PARALLEL-DESIGN-REVIEW`
  - use only for high-risk architecture, ownership migrations, release machinery, source-fidelity changes, or difficult incident diagnosis;
  - keep every review branch read-only until one design is selected;
  - require one final authority reconciliation against current repository source before implementation;
  - do not use parallel-agent consensus as source truth;
  - do not add a new product runtime/background-job owner merely to imitate Multi-GPT.

This complements, but does not replace, the existing one-primary-goal release rule and exact source/repository verification.

## 3. `large-codebase-analysis`: structure first, targeted reread last

### Verified supplied pattern

The supplied large-codebase analysis workflow requires:

1. inventory before implementation reading;
2. noise/generated-asset detection;
3. per-function/class/module local analysis;
4. dependency/call/state/ownership graph construction from summaries;
5. hierarchical summarization;
6. targeted reread of original source before implementation claims;
7. explicit confidence labels (`Verified`, `Likely`, `Speculative`, `Disputed`).

It also recommends durable analysis artifacts such as `index.json`, `asset_index.json`, `analysis/`, `graph.md`, `architecture.md`, and `open_questions.md`, rather than storing architectural understanding only in conversation context.

### Usage Dashboard applicability

**HIGH — immediately useful for analysis/refactor work.**

`plugins/usage-dashboard/` has accumulated modular source parts, runtime/manager code, materializers, release specs, and a large regression registry. Sequentially rereading the whole project is now both expensive and error-prone.

Adopted principle:

> For architecture/refactor/lifecycle/dependency work, establish a structural index and ownership graph first; answer implementation questions by targeted reread of original symbols, not by trusting old summaries.

Potential future process artifact (no version reservation):

- `NV-LARGE-CODEBASE-INDEX`
  - byte-neutral analysis/index generation;
  - parser-based symbol inventory where practical;
  - generated/minified/blob regions excluded from semantic analysis;
  - explicit read/write/caller/callee ownership tables;
  - open questions retained instead of guessed;
  - generated analysis must never become runtime/source authority.

## 4. Combined pattern worth adopting

The three sources fit together cleanly:

```text
external/common material
        |
        v
structured distillation      (book-to-skill pattern)
        |
        v
compact authority/index + on-demand deep notes
        |
        +----> large source change? ----> structural index + ownership graph
        |                                  (large-codebase-analysis pattern)
        |
        +----> high-risk design? --------> independent approaches -> merge -> judge
                                           (Multi-GPT pattern)
        |
        v
fresh repository/source reconciliation
        |
        v
normal Usage Dashboard release workflow
```

The important ownership rule is that none of these derived layers becomes product truth. Current source, production manifest, issue/release authority, and physical evidence remain authoritative.

## 5. Immediate disposition

- **ADOPT NOW as process guidance:** structure-first analysis, targeted reread, source-linked knowledge distillation.
- **USE SELECTIVELY:** independent parallel design review for genuinely complex/high-risk work.
- **DO NOT PORT:** external MCP/background-job runtime into Local Usage Dashboard.
- **DO NOT CHANGE 5.98:** current deployed release/physical acceptance remains independent.
- **NO P-NUMBER / VERSION RESERVED:** all `NV-*` names above are process/audit candidates only.

Future idea-list entries may consume these patterns automatically once a concrete Usage Dashboard need and source authority exist, under the existing automatic designed-idea consumption policy.

## 6. Screenshot-derived additional research candidates

Source: user-supplied screenshot of a curated index titled around GitHub AI tooling. This subsection records only what the screenshot itself names and claims. The repositories/tools below are **NOT YET VERIFIED** by direct source review, so none of them is implementation authority.

The screenshot groups six candidates by intended use:

1. **Hallmark** — captioned as a design-oriented pick for detecting structurally bland/AI-slop-like pages and improving design output.
2. **Orca** — captioned as a way to run agents in parallel.
3. **code-review-graph** — captioned as a way to avoid missing code-change impact scope as a codebase grows.
4. **mattpocock/skills** — captioned as reusable agent work procedures/skills.
5. **awesome-llm-apps** — captioned as examples of RAG/agent applications.
6. **OfficeCLI** — captioned as document-file automation tooling.

### Provisional Usage Dashboard relevance

- **Hallmark — MEDIUM, UI/design review candidate.** Potential value is a systematic anti-slop/structural-diversity review lens for Dashboard UI changes. Do not treat aesthetic heuristics as product truth or as a replacement for mobile physical validation.
- **Orca — MEDIUM, parallel-review candidate.** Potentially overlaps the independent-approach discipline already extracted from Multi-GPT. Verify before adding a new process artifact; avoid duplicate orchestration machinery.
- **code-review-graph — HIGH, change-impact analysis candidate.** This is especially relevant to the growing modular Engine/Manager/Plugin/materializer/test surface and may complement `NV-LARGE-CODEBASE-INDEX` with explicit changed-symbol impact tracing.
- **mattpocock/skills — HIGH, process-skill design candidate.** Potential relevance is converting repeated release/design/review procedures into small reusable skills without replacing repository authority.
- **awesome-llm-apps — LOW-MEDIUM for product runtime, MEDIUM for idea mining.** Use as a pattern/reference catalog only after verifying concrete examples; do not import RAG/agent infrastructure into the Dashboard without a direct need.
- **OfficeCLI — LOW for current runtime, MEDIUM for artifact/document workflow.** Potentially useful for repository documentation/report automation, but unrelated to current Usage Dashboard runtime unless a concrete document workflow appears.

### Disposition

**RESEARCH QUEUE ONLY / NO PRODUCT CHANGE AUTHORIZED.**

Before any candidate can influence a release or process contract:

1. verify the exact repository and current source;
2. identify the concrete pattern rather than relying on the screenshot caption;
3. map ownership and applicability to `plugins/usage-dashboard/`;
4. reject overlapping or host-owned machinery;
5. preserve current source/manifest/issue/physical evidence as the only product authority.

Most promising next verification targets from the screenshot are `code-review-graph` and `mattpocock/skills`, because they appear to complement the already adopted large-codebase indexing and reusable-procedure directions without requiring product-runtime changes.
