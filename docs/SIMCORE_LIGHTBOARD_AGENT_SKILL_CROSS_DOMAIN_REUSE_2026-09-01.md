# SimCore Reference Note — Cross-domain practices from the upstream LightBoard agent skill

Date: 2026-09-01 KST

Status: **REFERENCE / TOOLING PRACTICE EXTRACTION ONLY · NO RUNTIME AUTHORITY**

Source investigation:

`docs/SIMCORE_LIGHTBOARD_AGENT_SKILL_INVESTIGATION_2026-09-01.md`

Upstream source inspected:

`enzi221/risumo@a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f`

Scope: identify practices from `skills/lightboard` that are useful beyond LightBoard/RisuAI. This document does not make the upstream skill a SimCore dependency and does not authorize runtime changes.

## 1. Strongly reusable practices

### A. Axiom of Doubt / contract-first reading

Upstream rule: do not assume familiar-looking Lua/CBS/framework semantics; read the task-specific contract/reference first.

Generalized form:

`familiar syntax != familiar semantics`

Usefulness:
- unfamiliar plugin APIs,
- SDK/version migrations,
- framework-specific DSLs,
- code review of third-party integrations,
- repository work where local conventions override generic knowledge.

SimCore fit: **HIGH**. This reinforces source-proven reading and ownership-scoped inspection.

### B. Progressive-disclosure reference routing

The top-level skill is deliberately small and routes the agent to narrower references only when the task requires them: Lua, CBS, full LightBoard, Miniboard renderer, interactions, etc.

Generalized form:

`small router/index -> task-specific reference -> exact implementation surface`

Usefulness:
- large monorepos,
- plugin suites,
- SDK documentation packs,
- code-generation agents,
- maintenance work where loading every document increases confusion.

SimCore fit: **HIGH**. This strongly matches ownership-scoped reading and can be reused in future developer-reference packs.

### C. Explicit execution-phase model

The skill distinguishes input, request, output, and display edits by execution timing and persistence behavior.

Generalized form:

`phase name + when it runs + whether it mutates canonical data + whether it re-runs`

Usefulness:
- hooks/middleware,
- browser extensions,
- rendering pipelines,
- event-driven plugins,
- request/response transforms,
- debugging duplicated or stale effects.

SimCore fit: **HIGH** as architecture/documentation vocabulary. It should not imply a new runtime phase engine.

### D. Namespace isolation

The skill requires module-specific class prefixes and discourages reliance on host/internal CSS classes.

Generalized form:

`own namespace + do not couple presentation to undocumented host internals`

Usefulness:
- embeddable widgets,
- browser extensions,
- plugin UI,
- multi-tenant component systems,
- CSS/DOM integrations.

SimCore fit: **MEDIUM/HIGH** for any future presentation surface.

### E. Least-power UI surface

The skill explicitly works within restricted HTML/CSS controls and uses narrow host-mediated actions instead of arbitrary JavaScript.

Generalized form:

`use the least-power mechanism that can express the interaction`

Usefulness:
- secure plugin environments,
- sandboxed UI,
- extension systems,
- capability-oriented APIs.

SimCore fit: **HIGH PRINCIPLE**, especially alongside intent-only renderer boundaries.

### F. Contract-shaped deliverables

The Miniboard renderer guide states exactly what the deliverable is, what files are required, what inputs the renderer receives, what it returns, and what it must not contain.

Generalized form:

`inputs + outputs + forbidden effects + packaging shape + failure behavior`

Usefulness:
- code-generation tasks,
- plugin SDKs,
- internal tooling,
- handoffs between semantic and presentation owners.

SimCore fit: **HIGH** for design docs, implementation briefs, and scoped agents.

### G. Semantic/presentation separation

The skill documents structured data production separately from rendering and styling.

Generalized form:

`semantic payload != renderer != host UI state`

Usefulness:
- dashboards,
- generated reports,
- structured LLM outputs,
- plugin frontends,
- testable UI adapters.

SimCore fit: **HIGH**, already reinforced by the LightBoard reference catalog.

### H. Fail-closed rendering contract

The Miniboard renderer contract requires a non-empty HTML result and permits throwing when rendering cannot continue, rather than silently fabricating malformed output.

Generalized form:

`invalid renderer state -> explicit failure -> preserve upstream semantic data`

Usefulness:
- serializers,
- view adapters,
- export systems,
- structured-output renderers.

SimCore fit: **HIGH** as presentation-failure quarantine.

## 2. Useful but domain-specific practices

These are valuable, but should not be generalized blindly:

- toggle syntax and lorebook naming conventions,
- RisuAI Lua APIs,
- CBS templating,
- `risu-btn` action strings,
- LightBoard `manifest.lb`,
- LBDATA placement,
- `risupack` CharX packaging,
- RisuAI-specific CSS selector restrictions.

They are reference material for RisuAI/LightBoard work, not general SimCore contracts.

## 3. Recommended reuse outside LightBoard

The highest-value reusable bundle is:

```text
Axiom of Doubt
+ Progressive-disclosure reference routing
+ Explicit phase/effect documentation
+ Namespace isolation
+ Least-power capability choice
+ Contract-shaped deliverables
+ Semantic/presentation separation
+ Fail-closed presentation behavior
```

This bundle is useful for other plugin ecosystems even when their APIs, languages, and packaging are completely different.

## 4. SimCore boundary

Classification:

```text
PROMISING · DEVELOPER_PRACTICE_REFERENCE
NO_RUNTIME_DEPENDENCY
NO_GENERIC_RUNTIME_SUBSYSTEM
NO_IMPLEMENTATION_AUTHORITY
```

If adopted, prefer documentation/checklist/agent-routing improvements first. Do not turn these practices into a new runtime architecture layer without a separate source-proven product need.
