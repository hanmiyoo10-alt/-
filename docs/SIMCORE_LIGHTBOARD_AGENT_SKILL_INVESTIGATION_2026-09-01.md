# SimCore Investigation — upstream `lightboard` agent skill

Date: 2026-09-01 KST

Status: **REFERENCE / TOOLING INVESTIGATION ONLY · NO RUNTIME AUTHORITY**

Investigated command:

```text
npx skills add enzi221/risumo -s lightboard
```

## 1. Finding

The command is structurally valid for the open `skills` CLI ecosystem.

`enzi221/risumo` contains a skill at:

```text
skills/lightboard/SKILL.md
```

with frontmatter:

```text
name: lightboard
description: How to develop Lightboard modules for Risuai. Also includes Miniboard renderer development process.
```

Therefore `-s lightboard` selects an **AI-agent development skill**, not a RisuAI LightBoard runtime module and not a SimCore plugin dependency.

The skill is best understood as an upstream-maintained procedural/reference pack for developing and reviewing LightBoard and Miniboard modules.

## 2. Upstream identity inspected

Repository:

```text
enzi221/risumo
```

Inspected `main` head:

```text
a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f
```

Commit message:

```text
mini 411
```

The LightBoard skill files inspected at that identity include:

```text
skills/lightboard/SKILL.md
skills/lightboard/references/000-cbs.md
skills/lightboard/references/000-lightboard.md
skills/lightboard/references/000-lua.md
skills/lightboard/references/000-miniboard-renderer.md
skills/lightboard/references/000-prelude.md
skills/lightboard/references/001-button-handlers.md
skills/lightboard/references/001-cbs-cond.md
skills/lightboard/references/001-interactions.md
```

## 3. What installing the skill provides

The top-level `SKILL.md` provides procedural instructions for an AI coding agent. It covers:

- RisuAI module concepts,
- toggle syntax,
- lorebooks,
- Lua trigger scripts,
- regex edit phases,
- CSS isolation rules,
- HTML/security restrictions,
- LightBoard module development routing,
- Miniboard renderer development routing,
- packaging with `risupack`,
- a strong instruction to read task-specific references rather than assume familiar Lua/CBS semantics.

The referenced development guide explicitly documents LightBoard as an auxiliary-LLM framework with:

```text
frontend manifest
→ bounded request/context construction
→ structured output
→ optional validation/post-processing
→ LBDATA sidecar
→ renderer
→ reroll / interaction paths
```

The Miniboard renderer guide documents the renderer contract separately and explicitly states that a renderer is not a full LightBoard module.

## 4. Relationship to the user-supplied LightBoard artifacts

This skill does **not** replace the archived user-supplied `.charx` / `.risum` artifacts.

The roles are different:

```text
archived artifacts
= concrete behavior/source evidence for specific released modules

upstream lightboard skill
= procedural development/reference documentation maintained alongside upstream source
```

This makes the skill useful as a cross-check for the existing reference analyses.

Examples already corroborated by the skill/reference pack include:

- LightBoard is an auxiliary-model framework rather than merely a visual board;
- frontend manifests declare context/effect needs;
- `sideEffect=false` is the default and body mutation is advanced/privileged;
- generated data and visible presentation are separated through LBDATA/rendering;
- per-frontend reroll and interaction exist;
- Miniboard custom renderers consume an already-decoded semantic payload;
- JavaScript/external-link rendering is disallowed in the documented module guidance;
- module-owned CSS should be namespace-prefixed and isolated.

These align with ideas already preserved in the LightBoard-only idea catalog, especially owner-scoped context projection, effect boundaries, semantic/render separation, and intent-oriented presentation.

## 5. Additional value over artifact-only reverse engineering

The strongest extra value is **contract intent**.

Artifact inspection tells us what one module happens to do. The skill explains what upstream considers the supported development contract and recommended practice.

That makes it useful for distinguishing:

```text
framework contract
vs
module-specific implementation choice
vs
accidental implementation detail
```

For future LightBoard reference analysis, this can reduce overfitting to one `.charx` implementation.

## 6. Important boundaries

### 6.1 Not a SimCore runtime dependency

Do not install or vendor this skill into `release-simcore` or treat its instructions as runtime authority.

### 6.2 Not implementation authorization

The skill and public source are third-party reference material. Their availability does not authorize copying implementation into SimCore.

### 6.3 Upstream `main` is mutable

The shorthand command resolves an upstream repository and may install the current contents available at installation time. For reproducible evidence, SimCore research should record an exact upstream commit identity instead of relying only on floating `main`.

### 6.4 Agent-instruction effect

Installing an agent skill changes the procedural instructions available to that coding agent. That is useful for LightBoard development, but it is a tooling/instruction change, not a passive document read.

For SimCore research, reading/pinning the source is lower risk than making it a standing SimCore development dependency unless a separate tooling decision explicitly authorizes that.

### 6.5 CLI telemetry

The `skills` CLI documentation states that anonymous install telemetry is enabled by default and documents an opt-out environment variable. This is a CLI/tooling consideration only and has no SimCore runtime impact.

## 7. Recommended SimCore handling

Classification:

```text
PROMISING · UPSTREAM DEVELOPMENT REFERENCE
NOT_RUNTIME_DEPENDENCY
NOT_PRODUCT_FEATURE
NOT_IMPLEMENTATION_AUTHORITY
```

Recommended use:

1. keep the existing user-supplied artifact archive as concrete evidence authority;
2. use the upstream LightBoard skill as a maintained contract/reference cross-check;
3. when citing it in future research, pin the inspected upstream commit SHA;
4. do not add the skill to `release-simcore`;
5. do not silently make it a mandatory SimCore agent dependency;
6. if a future decision wants it installed for a dedicated LightBoard-analysis workspace, treat that as a separate tooling transaction.

## 8. Current conclusion

The command is legitimate and useful, but its value is narrower and cleaner than it first appears:

> It installs an AI-agent knowledge pack for **developing LightBoard modules**, rather than installing LightBoard itself.

For this project, the best immediate use is as a **pinned upstream reference source** that can validate and sharpen the ideas already extracted from the user-supplied LightBoard files.

No SimCore runtime/release change is authorized by this investigation.
