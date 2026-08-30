# SimCore Reference Analysis - LightBoard News 4.0.0

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject: `🔦라이트보드 📰뉴스 4.0.0`

Archived source authority: `references/simcore-plugin-idea-drop-2026-08-30/`

Artifact SHA-256: `9bef481204e87a3f8856074eea23e0f780ab43aa43b755de9069de8fc4bebe1d`

Related analyses:

- `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md`
- `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md`
- `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md`
- `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_HUNTERNET_4_0_0_2026-08-30.md`

This document analyzes the archived reference as an idea source only. It creates no runtime, release, schema, v0.70.1, or R2.9 authority.

A version-correlated public implementation was also inspected at `enzi221/risumo`, commit `a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f`, path `lb-news/*`. The archived CharX remains the local artifact authority.

---

## 1. Executive finding

News 4.0.0 is the first analyzed LightBoard satellite that is better described as a **publication projection** than a direct audience-reaction board.

It selects reportable topics, applies publication-specific delay/detail constraints, frames those topics through a source lens, permits rumor/error/advertorial states, and bounds what old News data remains in later model context.

Strongest new SimCore research candidates:

1. **Field-Level Context Projection**
2. **Publication Maturity Window**
3. **Source Coverage Lens**
4. **Source Assertion Provenance**
5. **Progress-Gated Follow-up**

Riskier but interesting:

6. **Protagonist-Decentered Background Projection**

News also reinforces Audience Knowledge Boundary, Graded Exposure, Epistemic Sidecar Quarantine, Bounded Context Aperture, semantic/render separation, least-privilege frontend capability, and validation as acceptance authority.

The highest-value lesson is that historical source data need not be either fully present or fully absent. It can be projected down to only the fields needed by the next semantic job.

---

## 2. Artifact and frontend anatomy

The CharX reconstructs as Character Card v3 with `card.json`, `module.risum`, icon asset, and metadata. The card identifies:

```text
name            = 🔦라이트보드 📰뉴스 4.0.0
creator note    = 범용 뉴스 모듈
version         = 4.0.0
moduleNamespace = lb-news
```

The card includes lore entries for semantic rules, structured format, interactions, planning helpers, output normalization, validation, and a main-model epistemic warning.

The version-correlated frontend declares `namespace=lb-news`, `version=4.0.0`, and `lowLevelAccess=false`, while the shared LightBoard backend owns generic orchestration.

Classification: `REINFORCES EXISTING · LEAST_PRIVILEGE_FRONTEND_CAPABILITY`.

---

## 3. Stable semantic payload and validation

News uses a stable `<lb-news>` wrapper containing publication time/name, posts, optional headline-image request data, top ads, and a bottom ad.

The validator decodes the structured body and checks renderer-critical assumptions, including headline-image fields when enabled, exactly two top ads, and required ad fields.

The output normalizer performs only bounded deterministic repair/normalization: it can add a missing closing tag, add an id, derive an optional headline image, and retain the final News node.

Reusable pattern:

```text
model generation
→ bounded deterministic normalization
→ validation of downstream consumer assumptions
→ canonical source-local payload
→ renderer
```

Classification:

```text
REINFORCES EXISTING · STRUCTURE_AS_ACCEPTANCE_AUTHORITY
REINFORCES EXISTING · BOUNDED_DETERMINISTIC_COMPAT_REPAIR
```

---

## 4. Field-Level Context Projection

This is the strongest new finding.

News has two independent context-reduction layers. A process filter bounds old News blocks to a recent tail or removes them entirely when source context is disabled. Separately, the request hook thins fields inside News blocks that are still admitted.

The version-correlated request cleaner removes presentation/request-only data while preserving semantic content:

```text
headlineImage prompt payload   → removed
Top-ad CSS/style fields        → removed
Bottom-ad CSS/style fields     → removed
Article text                   → retained
Ad semantic text               → retained
Publication wrapper/date/name  → retained
```

Previous LightBoard analyses established **which historical objects should remain**. News adds **which fields inside an admitted object deserve future prompt weight**.

Potential SimCore abstraction:

```text
stored historical object
→ owner/job relevance selection
→ retain continuity/source facts
→ drop presentation-only payload
→ drop completed-task scaffolding
→ drop derived fields not needed by current job
→ projected semantic context
```

This aligns strongly with SimCore's existing distinction between visible representation, semantic authority, and future prompt contribution.

Relationship to Core 4.1.1:

```text
Owner-Scoped Context Projection = choose relevant objects/messages
Field-Level Context Projection  = choose relevant fields inside them
```

Classification:

```text
PROMISING · FIELD_LEVEL_CONTEXT_PROJECTION
HIGH LONG_CHAT RELEVANCE
NO IMPLEMENTATION AUTHORITY
```

---

## 5. Publication Maturity Window

News treats source detail as time-dependent.

It forbids reporting beyond current narrative time and distinguishes immediate breaking coverage from later, more detailed follow-up. Its advertising rules expose the same concept: dedicated ads have production latency and should not react to the immediate current scene, while cheaper advertorial-like material can react faster when plausible.

HunterNet added **Reaction Propagation Window**: enough time must pass for information to reach a channel and for users to react.

News adds a separate question:

```text
Has enough time passed for this source to publish this degree of detail and packaging?
```

Useful conceptual timeline:

```text
event
→ observable
→ reaches source
→ first coarse report
→ detail matures
→ follow-up/update
```

No new SimCore clock should be created. Any future adaptation must consume existing Frame/Time/Continuity authority.

Classification: `PROMISING · PUBLICATION_MATURITY_WINDOW`.

---

## 6. Source Coverage Lens

News can apply a subject focus and publication tone/preset while leaving world facts unchanged.

Conceptually:

```text
same eligible world evidence
+ source subject/editorial lens
→ different story selection and framing
```

This separates two source questions:

```text
SOURCE ACCESS        = what can this source receive/know?
SOURCE COVERAGE LENS = what does this source choose to surface/emphasize?
```

Comparable source-derived lenses could explain why a local parent community, Hunter board, live chat, gossip source, and newspaper all select different aspects of the same world event.

Classification:

```text
PROMISING · SOURCE_COVERAGE_LENS
WATCH · DO_NOT_ADD_MANUAL_STYLE_SURFACE_WITHOUT_PRODUCT_NEED
```

---

## 7. Source Assertion Provenance

The News epistemic warning says News content may include ads, unverified rumors, and false/error reporting. The semantic rules also distinguish rumors, official statements, reporter/columnist framing, deleted articles, and ads disguised as articles.

This strengthens the existing rule:

```text
SOURCE_ASSERTION != WORLD_FACT
```

with a new question:

```text
What kind of source assertion is this?
```

Possible conceptual classes, not proposed runtime schema:

```text
DIRECT REPORT
OFFICIAL STATEMENT
ATTRIBUTED CLAIM
RUMOR
OPINION/COLUMN
ADVERTORIAL
CORRECTION/DELETION
```

The value is epistemic. Authoritative-sounding source text should not silently become canon merely because its presentation is credible.

Classification:

```text
PROMISING · SOURCE_ASSERTION_PROVENANCE
REINFORCES EXISTING · EPISTEMIC_SIDECAR_QUARANTINE
DEFER · STRUCTURED_PROVENANCE_SCHEMA
```

---

## 8. Progress-Gated Follow-up

News strongly suppresses repeated previous topics but explicitly permits a related follow-up when the narrative has materially progressed, especially after major breaking news.

This refines replay prevention:

```text
not: never mention prior topic again

but: completed prior frame stays completed
     unless current evidence creates a genuinely new state of that topic
```

That is directly relevant to Current Task Primacy. A future research invariant could require prior-frame reuse to have either explicit current-user continuation authority or source-proven material progression.

The second branch is dangerous if too permissive and is not authorized for current runtime.

Classification:

```text
REINFORCES EXISTING · CURRENT_TASK_PRIMACY
PROMISING RESEARCH · PROGRESS_GATED_FOLLOWUP
```

---

## 9. Protagonist-Decentered Background Projection

When protagonist attention is not maximized, News is instructed to simulate a living background world rather than a publication that only reports the protagonist. If no suitable prominent event exists, it may invent plausible background events within the world/time boundary.

Benefit:

```text
less protagonist gravity
more ambient world motion
less repetition of immediate scene material
stronger source identity
```

Risk:

```text
plausible invented background article
→ later mistaken for established canon
```

A SimCore adaptation would require explicit non-canonical sidecar status, an authoritative world-event owner, or strict derivation from already established background facts.

Classification:

```text
WATCH · PROTAGONIST_DECENTERED_BACKGROUND_PROJECTION
DEFER · INVENTED_BACKGROUND_WORLD_EVENTS
```

---

## 10. Derived presentation sidecar

When image generation is enabled, News derives a headline-image prompt from the first article and keeps the generated image in separate state keyed by News node id. The request cleaner later removes the image-prompt payload from model context.

Conceptually:

```text
canonical semantic object
→ derived presentation request/state
→ renderer
```

This is clean evidence for:

```text
DERIVED PRESENTATION STATE != CANONICAL SEMANTIC STATE
```

Classification: `REINFORCES EXISTING · DERIVED_PRESENTATION_SIDECAR_SEPARATION`.

---

## 11. Two-dimensional context aperture

News combines:

```text
TEMPORAL APERTURE = which News blocks remain
SEMANTIC APERTURE = which fields inside retained blocks remain
```

The version-correlated process filter keeps only a recent News neighborhood when inclusion is enabled. The request cleaner then strips request-only fields from the retained records.

This suggests that future SimCore context policy should not be modeled as one global retention scalar.

Classification:

```text
PROMISING · TWO_DIMENSION_CONTEXT_APERTURE
DEFER · PER_SOURCE_RUNTIME_RETENTION_POLICY
```

---

## 12. Source Projection Envelope

Comments/Miniboard/HunterNet produced an Audience Projection Envelope centered on knowledge, exposure, propagation, reaction, quarantine, and bounded context.

News shows that the abstraction should be broadened for publication-like sources:

```text
SOURCE PROJECTION ENVELOPE

Channel Reachability
→ Knowledge / Evidence Boundary
→ Graded Exposure
→ Propagation / Publication Maturity
→ Source Coverage Lens
→ Source-Local Assertion Generation
→ Assertion Provenance
→ Epistemic Quarantine
→ Field-Level Context Projection
→ Bounded Context Aperture
```

This can describe live comments, anonymous boards, local communities, occupational communities, and news/publication sources without making them semantically identical.

Classification: `PROMISING RESEARCH SYNTHESIS · SOURCE_PROJECTION_ENVELOPE`.

It does not supersede current Community contracts and creates no implementation authority.

---

## 13. Direct-transfer rejects

The following News patterns should not be copied directly into SimCore:

```text
DO NOT TRANSFER · MODEL_SELF_REPORTED_PROBABILITY_AS_AUTHORITY
```

The optional diversity mode asks the model to generate tail alternatives with its own numeric probability claims. Those numbers are not calibrated reliability evidence. Alternative-output testing, if useful, belongs in an external test harness.

```text
DO NOT TRANSFER · EXPOSED_STEP_BY_STEP_REASONING_CONTRACT
```

News includes explicit private-planning scaffolding. SimCore should state observable criteria/invariants instead.

```text
DO NOT TRANSFER · DYNAMIC_RUNTIME_CODE_LOADING
```

Shared runtime code loading from module/lore content conflicts with SimCore's statically inspectable module graph and CI authority.

```text
DO NOT TRANSFER · PRESENTATION_SYNTAX_AS_LONG_TERM_SEMANTIC_CONTEXT
```

Rich CSS/image-prompt fields are presentation mechanics, not durable semantic continuity. News itself demonstrates this by stripping them later.

---

## 14. Comparison with prior references

```text
Comments 4.0.0
  Audience Knowledge Boundary
  Display / Model Context Separation

Core 4.1.1
  Owner-Scoped Context Projection
  Effect-Class Contract

Miniboard 4.1.1
  Graded Audience Exposure
  Epistemic Sidecar Quarantine
  Semantic Payload / Renderer Decoupling

HunterNet 4.0.0
  Channel Reachability
  Reaction Propagation Window
  Source-Local Identity Affordance

News 4.0.0
  Field-Level Context Projection
  Publication Maturity Window
  Source Coverage Lens
  Source Assertion Provenance
  Progress-Gated Follow-up
```

The cumulative conceptual shift is from forum-specific reaction mechanics toward broader source-specific projection mechanics.

---

## 15. Fit against current SimCore

Current SimCore already asks:

```text
What is the current user task?
Which source/platform owns the current projection?
Which continuity facts remain authoritative?
Did a completed prior task frame replay?
```

The reference set adds future questions:

```text
Can this source receive the fact?
Can this source/audience know it?
How exposed is it?
Has enough time passed for this source to report/react at this detail?
Would this source select it for coverage?
What is the provenance of the resulting assertion?
Which old source fields should still influence the next job?
```

Task primacy and source projection should remain separate authorities. Source projection must not revive a completed task merely because old source data remains in history.

---

## 16. Research promotion order

If future product evidence justifies promotion, recommended order:

1. `FIELD_LEVEL_CONTEXT_PROJECTION`
   - most directly relevant to long-chat context weight and replay pressure.
2. `PUBLICATION_MATURITY_WINDOW`
   - clean extension of existing Time/Continuity authority.
3. `SOURCE_COVERAGE_LENS`
   - improves source differentiation without changing world facts.
4. `SOURCE_ASSERTION_PROVENANCE`
   - strong epistemic value; structured metadata can remain deferred.
5. `PROGRESS_GATED_FOLLOWUP`
   - promising but must not weaken completed-frame suppression.
6. `PROTAGONIST_DECENTERED_BACKGROUND_PROJECTION`
   - high simulation upside, highest accidental-canon risk.

None are approved work items by this document.

---

## 17. Documentation anomaly found during analysis

The umbrella source-drop evidence document still described the archive as five artifacts after News 4.0.0 had been added as the sixth artifact through its dedicated intake.

Classification:

```text
FIX · REFERENCE_SOURCE_DROP_INDEX_DRIFT
```

Repair scope is reference documentation only. Archive bytes and runtime/release authority are unchanged.

---

## 18. Final classification

```text
REFERENCE QUALITY                         = HIGH
DIRECT CODE REUSE AUTHORITY               = NONE
SIMCORE FEATURE AUTHORITY                 = NONE

FIELD_LEVEL_CONTEXT_PROJECTION            = PROMISING · HIGHEST VALUE
PUBLICATION_MATURITY_WINDOW                = PROMISING
SOURCE_COVERAGE_LENS                       = PROMISING
SOURCE_ASSERTION_PROVENANCE                = PROMISING CONCEPT / SCHEMA DEFER
PROGRESS_GATED_FOLLOWUP                    = PROMISING RESEARCH / REINFORCES CURRENT TASK PRIMACY
PROTAGONIST_DECENTERED_BACKGROUND          = WATCH / DEFER
SOURCE_PROJECTION_ENVELOPE                 = PROMISING RESEARCH SYNTHESIS
TWO_DIMENSION_CONTEXT_APERTURE             = PROMISING CONCEPT / PER-SOURCE POLICY DEFER
DERIVED_PRESENTATION_SIDECAR               = REINFORCES EXISTING

MODEL_SELF_REPORTED_PROBABILITY            = DO NOT TRANSFER
EXPOSED_STEP_BY_STEP_REASONING             = DO NOT TRANSFER
DYNAMIC_RUNTIME_CODE_LOADING               = DO NOT TRANSFER
PRESENTATION_SYNTAX_LONG_TERM_CONTEXT      = DO NOT TRANSFER

REFERENCE_SOURCE_DROP_INDEX_DRIFT          = FIX
RUNTIME / RELEASE CHANGES                  = NONE
NEXT REFERENCE ANALYSIS TARGET             = RISUAI SCRIPTING SKILL
```
