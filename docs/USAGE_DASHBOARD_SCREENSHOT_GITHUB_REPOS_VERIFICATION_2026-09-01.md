# Local Usage Dashboard — Screenshot GitHub Repository Verification — 2026-09-01

Status: **VERIFIED REPOSITORY MATCHES / PROCESS & IDEA RESEARCH ONLY / NO PRODUCT CHANGE AUTHORIZED**

Scope: `plugins/usage-dashboard/` development/design research. This document verifies the six GitHub projects named in the user-supplied screenshot. It does not import third-party code, reserve a Product version/P-number, or override current source/release/physical authority.

## Exact repository matches

### 1. Hallmark

Verified repository: `Nutlope/hallmark`

Source-supported purpose:
- design skill for Claude Code, Cursor, and Codex;
- deliberately avoids generic AI-generated UI;
- chooses macrostructure and theme, then runs an anti-slop review gate;
- supports build, audit, redesign, and screenshot/URL study workflows.

Usage Dashboard disposition: **MEDIUM-HIGH design-review reference.**

Potential use:
- review major Dashboard UI changes for structural repetition and generic card-grid defaults;
- use `audit`/design-DNA ideas as a review lens before mobile physical acceptance.

Do not:
- let aesthetic heuristics become source truth;
- replace actual Android/PocketRisu physical validation;
- import Hallmark runtime into the Dashboard product.

### 2. Orca

Verified repository: `stablyai/orca`

Source-supported purpose:
- ADE/orchestrator for running multiple coding agents in parallel;
- agents run side-by-side in isolated git worktrees;
- one prompt can be fanned across several agents and results compared before selecting/merging;
- also includes diff review, GitHub/Linear integration, remote worktrees, and mobile monitoring.

Correction: an earlier search surfaced `araa47/orca`, which is also a real parallel-agent orchestrator but is **not the screenshot/trending-context match**. The screenshot match is `stablyai/orca`.

Usage Dashboard disposition: **MEDIUM process reference.**

Potential use:
- reinforce `NV-PARALLEL-DESIGN-REVIEW` for high-risk architecture/ownership changes;
- isolate competing implementation hypotheses in separate worktrees before selecting one.

Do not:
- add an Orca-like background daemon/orchestrator to Local Usage Dashboard runtime;
- treat multi-agent consensus as source authority.

### 3. code-review-graph

Verified repository: `tirth8205/code-review-graph`

Source-supported purpose:
- local-first code intelligence graph for MCP/CLI;
- parses source with Tree-sitter into a persistent structural graph;
- maps functions/classes/imports/calls/inheritance/tests;
- performs blast-radius analysis so reviews can focus on callers, dependents, and affected tests;
- supports incremental graph updates and CI review workflows.

Correction: `KunalBurangi/code-review-graph-v2` is a separate working prototype with a similar idea, but the screenshot/trending-context match is `tirth8205/code-review-graph`.

Usage Dashboard disposition: **HIGH process/audit reference.**

Potential use:
- strengthen `NV-LARGE-CODEBASE-INDEX` with changed-symbol blast-radius analysis;
- map Plugin/Engine/Manager/materializer/test ownership before high-risk changes;
- identify likely regression tests from actual dependency edges instead of broad rereads.

Caution:
- generated graph output is derived analysis, not repository/source authority;
- impact prediction must still be reconciled with fresh original source before implementation.

### 4. mattpocock/skills

Verified repository: `mattpocock/skills`

Source-supported purpose:
- small, composable agent skills intended for real engineering workflows;
- includes specification, ticketing, implementation, TDD, debugging, architecture, code review, research, handoff, and related reusable disciplines;
- explicitly distinguishes user-invoked orchestration skills from model-invoked reusable discipline.

Usage Dashboard disposition: **HIGH process-skill reference.**

Especially relevant patterns:
- `to-spec` / `to-tickets`: turn resolved design into explicit implementation authority;
- `implement`: implementation tied back to spec plus TDD and code review;
- `diagnosing-bugs`: feedback-loop-first diagnosis before repair;
- `code-review`: separate standards review from spec-fidelity review;
- `wayfinder`: decompose work that exceeds one session into decision/ticket graph;
- shared project vocabulary/domain docs to reduce terminology drift.

Potential future artifact: strengthen the existing `NV-KNOWLEDGE-DISTILLATION` / reusable release-procedure direction rather than blindly copying third-party skills.

### 5. awesome-llm-apps

Verified repository: `Shubhamsaboo/awesome-llm-apps`

Source-supported purpose:
- collection of 100+ open-source AI agents, agent skills, RAG applications, multi-agent teams, and related examples;
- includes runnable templates and skill examples rather than one single runtime architecture.

Usage Dashboard disposition: **MEDIUM idea-mining reference / LOW direct runtime relevance.**

Potential use:
- scan concrete examples for new idea-list candidates;
- mine patterns such as scope-creep detection, dependency review, release monitoring, research-agent organization, or UI-feedback workflows;
- every candidate must be independently source-verified before becoming a Usage Dashboard idea/design authority.

Do not:
- import agent/RAG infrastructure simply because an example exists;
- treat this catalog itself as source truth for Local Usage Dashboard product behavior.

### 6. OfficeCLI

Verified screenshot-context repository: `iOfficeAI/OfficeCLI`

Source-supported purpose:
- Office suite designed for AI agents to read, create, modify, and automate Word, Excel, and PowerPoint files;
- single CLI/binary interface;
- includes document rendering so an agent can follow a render → inspect → fix feedback loop.

Note: `officecli/officecli` also exists as a separate current public OfficeCLI/OfficeDex-related repository, but the screenshot/trending-context match is `iOfficeAI/OfficeCLI`.

Usage Dashboard disposition: **LOW product-runtime relevance / MEDIUM artifact-workflow reference.**

Potential use:
- inspiration for reproducible documentation/report artifact workflows;
- render/inspect/fix as a general artifact-validation principle.

Do not:
- add Office document machinery to Local Usage Dashboard runtime without a concrete product requirement.

## Combined applicability ranking

For Local Usage Dashboard engineering, the current research priority is:

1. `tirth8205/code-review-graph` — strongest direct fit for change-impact/ownership regression analysis.
2. `mattpocock/skills` — strongest fit for turning repeated development discipline into reusable process skills.
3. `Nutlope/hallmark` — useful UI/design-review lens before mobile physical acceptance.
4. `stablyai/orca` — useful parallel-worktree/design-comparison reference for high-risk work.
5. `Shubhamsaboo/awesome-llm-apps` — broad idea-mining catalog; requires per-example verification.
6. `iOfficeAI/OfficeCLI` — artifact automation reference, not current product-runtime authority.

This ranking is about **project applicability**, not repository quality.

## Authority rule

These repositories are external references only.

They may inform future process artifacts or idea-list entries, but before any idea is implemented:

1. fresh-check the external source actually supporting the claimed pattern;
2. fresh-check current `plugins/usage-dashboard/` source and production manifest;
3. assign ownership explicitly;
4. reject host-owned or duplicate runtime machinery;
5. preserve one-primary-goal release scope;
6. add/update regressions;
7. require normal PR/CI/deploy/physical acceptance.

No current Product version, P-number, runtime byte, or release authority is changed by this verification.