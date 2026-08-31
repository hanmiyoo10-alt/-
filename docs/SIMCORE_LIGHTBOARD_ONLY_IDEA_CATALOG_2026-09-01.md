# SimCore LightBoard-Only Idea Catalog — 2026-09-01

Date: 2026-09-01 KST

Status: **REFERENCE SYNTHESIS · LIGHTBOARD FAMILY ONLY · RESEARCH BACKLOG · NO IMPLEMENTATION AUTHORITY**

## 1. Purpose

This document consolidates only the user-supplied LightBoard / Miniboard-family references into one deduplicated idea catalog.

It intentionally excludes the separately archived `risuai-scripting-skill.zip` and any idea that exists only because of that scripting reference.

The goal is not to summarize files one by one. The goal is to answer:

1. Which ideas repeat across the LightBoard family?
2. Which ideas are unique and unusually valuable?
3. Which ideas fit current SimCore principles without requiring a new architecture layer?
4. Which ideas should remain design assets only?
5. Which upstream mechanisms should be explicitly rejected as SimCore transfer patterns?

This catalog is not a feature specification, release plan, runtime RFC, or authorization to copy third-party implementation.

It does not alter:

- `release-simcore`,
- `plugins/simcore/latest.js`,
- `plugins/simcore/install.js`,
- current runtime behavior,
- persistent schema,
- the active S7 release transaction,
- frozen M2 architecture boundaries.

`main` is the authority for this research catalog only.

---

## 2. Included source set

Nine user-supplied LightBoard-family artifacts are in scope.

| # | Artifact | Main analysis authority | Primary contribution |
| --- | --- | --- | --- |
| 1 | LightBoard Comments 4.0.0 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md` | audience knowledge, context aperture, structured sidecar |
| 2 | LightBoard Core 4.1.1 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md` | owner-scoped context, effect classes, capability manifest |
| 3 | LightBoard Miniboard 4.1.1 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md` | graded exposure, source-local semantic sidecar |
| 4 | LightBoard HunterNet 4.0.0 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_HUNTERNET_4_0_0_2026-08-30.md` | channel reachability, propagation delay, source identity |
| 5 | LightBoard News 4.0.0 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NEWS_4_0_0_2026-08-30.md` | publication maturity, field projection, assertion provenance |
| 6 | LightBoard KakaoTalk V1.3 / 3.0.0 Popover | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_KAKAOTALK_POPOVER_3_0_0_2026-09-01.md` | failure quarantine, shared parse ABI, progressive disclosure |
| 7 | Miniboard Renderer · MomoTalk 1.0.0 | `SIMCORE_REFERENCE_ANALYSIS_MINIBOARD_MOMOTALK_RENDERER_1_0_0_2026-09-01.md` | intent-only renderer, ephemeral UI state, render isolation |
| 8 | LightBoard Status Window 4.0.0 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_STATUS_WINDOW_4_0_0_2026-09-01.md` | derived checkpoint + recent delta, projection non-authority |
| 9 | LightBoard Annotations 4.0.0 | `SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_ANNOTATIONS_4_0_0_2026-09-01.md` | source anchoring, reroll truncation, context re-entry firewall |

Archive authority remains under:

```text
references/simcore-plugin-idea-drop-2026-08-30/
references/simcore-plugin-idea-drop-2026-08-31/
```

The nine artifacts above are the complete source set for this catalog.

---

## 3. Executive synthesis

The LightBoard family repeatedly converges on one architecture shape:

```text
AUTHORITATIVE SOURCE
        ↓
BOUNDED CONTEXT / SOURCE PROJECTION
        ↓
STRUCTURED DERIVATION
        ↓
VALIDATION / SOURCE ANCHOR
        ↓
DERIVED SIDECAR LEDGER
        ↓
PRESENTATION ADAPTER
        ↓
OPTIONAL USER INTERACTION
        ↓
OPTIONAL CONTEXT RE-ENTRY
```

The strongest lesson is not "build more UI."

The strongest lesson is:

> Derived systems become safer when source authority, derivation, persistence, rendering, interaction, and model-context re-entry are separate contracts.

That lesson appears repeatedly across otherwise different modules.

For SimCore, the catalog should therefore be read as four idea families:

```text
A. EPISTEMIC / SOURCE BOUNDARIES
B. LONG-CHAT CONTEXT / DERIVED STATE
C. SIDECAR / PRESENTATION / INTERACTION
D. STATIC OWNERSHIP / CAPABILITY CONTRACTS
```

No generic new subsystem is authorized by this synthesis.

---

# A. Highest-priority research ideas

These are the ideas with the best combination of conceptual value, compatibility with existing SimCore ownership, and relevance to long-chat correctness.

## LB-I01 · Audience Knowledge Boundary

**Sources:** Comments, Miniboard, HunterNet, News

**Classification:** `P1 · PROMISING · HIGH COMMUNITY RELEVANCE`

Core rule:

```text
WORLD / CONTINUITY FACT
!=
FACT THIS SIMULATED AUDIENCE IS ALLOWED TO KNOW
```

A runtime can know a fact for continuity while a Community source remains unable to react to it.

Potential SimCore formulation:

```text
canonical fact
+ exposure evidence
+ current source
→ reaction-eligible fact set
```

Why it matters:

- reduces accidental omniscience,
- separates continuity truth from public/source knowledge,
- makes different Community surfaces genuinely different,
- complements current source/platform classification rather than replacing it.

Promotion condition:

A future design must derive exposure from source-visible evidence rather than adding an unconstrained manual privacy slider.

---

## LB-I02 · Owner-Scoped Context Projection

**Source:** Core

**Classification:** `P1 · PROMISING · HIGH LONG_CHAT RELEVANCE`

Core rule:

```text
full available history
→ current semantic owner
→ minimum owner-relevant projection
```

This is the runtime analogue of ownership-bounded developer read scope.

Potential use:

- reduce completed-task replay,
- reduce unrelated sidecar burden,
- preserve continuity facts while dropping irrelevant frames,
- keep current task/source salient in long chats.

Important boundary:

This does not authorize auxiliary LLM requests or a multi-agent runtime. The transferable idea is context projection only.

---

## LB-I03 · Bounded Context Aperture

**Sources:** Comments, Miniboard, HunterNet, News, Status Window, Annotations

**Classification:** `P1 · PROMISING PRINCIPLE`

Core rule:

```text
stored lifetime
!=
model-context lifetime
!=
render lifetime
```

An artifact can remain user-visible or locally stored without requiring its complete raw payload in every future prompt.

Potential benefit:

- lower stale-context pressure,
- preserve useful history without replaying its entire representation,
- make prompt participation an explicit lifecycle property.

This should remain owner-specific. Do not turn it into a generic "delete old data" policy.

---

## LB-I04 · Derived Checkpoint + Recent Delta

**Source:** Status Window

**Classification:** `P1 · PROMISING · LONG_CHAT RESEARCH`

Core shape:

```text
trusted prior derived checkpoint
+ bounded recent source delta
→ new derived checkpoint
```

This is attractive when a projection can be recomputed incrementally without rereading the full conversation.

Safe SimCore interpretation:

- the checkpoint is derived,
- the source remains authoritative,
- unknown values stay unknown,
- no plausible value may be invented merely to fill a field.

This is especially relevant to future diagnostics/projections, not canonical session truth.

---

## LB-I05 · Source-Anchored Derived Metadata

**Source:** Annotations

**Classification:** `P1 · PROMISING · HIGH EVIDENCE VALUE`

Core rule:

```text
DERIVED METADATA MUST CARRY A SOURCE ANCHOR
```

LightBoard Annotations validates target text/locator against the actual source message before accepting the annotation.

Potential SimCore adaptation:

A derived fact, diagnostic, sidecar item, or projection should retain enough provenance to answer:

```text
which source object?
which source span / identity?
which lineage?
which derivation owner?
```

This is stronger than retaining only a descriptive label.

---

## LB-I06 · Reroll-Aware Derived Lineage Truncation

**Source:** Annotations

**Classification:** `P1 · PROMISING · HIGH REROLL RELEVANCE`

Core rule:

```text
DERIVED LINEAGE MUST NOT OUTLIVE SOURCE LINEAGE
```

If a source point is rerolled/replaced, derived artifacts based on the abandoned future must not remain current simply because they were previously persisted.

Conceptual example:

```text
A → B → C → D
reroll C
A → B → C'

old D-derived sidecars = stale / retired
```

This strongly aligns with SimCore's lineage and stale-runtime discipline.

---

## LB-I07 · Context Re-entry Firewall

**Source:** Annotations

**Classification:** `P1 · PROMISING · HIGH SAFETY VALUE`

Core problem:

```text
source
→ derived annotation
→ reinjected into later model context
→ influences new source
→ new derivation
```

Without explicit provenance, a derived artifact can gradually masquerade as source truth.

Recommended principle:

```text
DERIVED_CONTEXT_REENTRY
= explicit
+ provenance-tagged
+ non-authoritative
+ bounded
```

A future re-entry surface should preserve at minimum:

- source identity,
- derived status,
- freshness/staleness,
- owner,
- trust tier.

---

## LB-I08 · Presentation Failure Quarantine

**Sources:** KakaoTalk, Status Window, Annotations; reinforced by renderer separation elsewhere

**Classification:** `P1 · PROMISING · LOW SEMANTIC RISK`

Core rule:

```text
renderer failure
must not destroy
underlying semantic/source data
```

LightBoard renderers frequently isolate rendering with protected calls and return original content on presentation failure.

Potential SimCore relevance:

- future diagnostic UI,
- structured sidecar UI,
- optional visualization,
- presentation adapters.

This is one of the safest design principles in the entire set because it narrows blast radius rather than widening authority.

---

## LB-I09 · Intent-Only Renderer Boundary

**Source:** MomoTalk

**Classification:** `P1 · PROMISING · LOW-PRIVILEGE UI PRINCIPLE`

Core rule:

```text
renderer displays state
renderer emits user intent
semantic owner validates and performs mutation
```

The renderer should not need canonical mutation authority simply because it owns buttons.

Potential future pattern:

```text
UI action
→ typed intent
→ owning semantic transaction
→ new state/output
```

This is preferable to embedding mutation logic directly in presentation code.

---

# B. Strong design assets

These ideas are worth preserving, but they are either more architecture-sized or less directly tied to current SimCore problems.

## LB-I10 · Semantic Payload / Renderer Decoupling

**Sources:** Core, Comments, Miniboard, HunterNet, News, KakaoTalk, MomoTalk, Status Window, Annotations

**Classification:** `P2 · STRONG RECURRING PATTERN`

Core rule:

```text
semantic object identity
!=
visual rendering
```

This is the most repeated implementation-independent idea across the entire LightBoard family.

Benefits:

- presentation can evolve without changing semantic generation,
- validators can judge data rather than UI markup,
- renderer failure can be quarantined,
- one semantic payload can support multiple renderers.

No new canonical sidecar format is authorized by this principle alone.

---

## LB-I11 · Shared Parse ABI

**Sources:** KakaoTalk, Core and shared LightBoard prelude usage

**Classification:** `P2 · PROMISING`

Core rule:

```text
one semantic envelope
→ one shared parser/query contract
→ multiple consumers
```

Avoid each renderer inventing a subtly different parser for the same payload.

Potential adaptation:

If SimCore gains any future structured display surfaces, parsing/identity rules should be owned once and consumed by renderers rather than copied into each UI.

---

## LB-I12 · Progressive Disclosure / Lazy Optional Enrichment

**Sources:** Core, KakaoTalk; visible in several lazy LightBoard frontends

**Classification:** `P2 · PROMISING UX · RUNTIME IMPLEMENTATION DEFER`

Concept:

```text
core response now
optional expensive detail later/on demand
```

Good uses could include optional explanation, visualization, or deep Community expansion.

Why not near-term runtime work:

Post-turn semantic generation would need explicit lineage, reroll, edit, clock/frame, cost, provider, and persistence semantics.

---

## LB-I13 · Ephemeral UI State Plane

**Source:** MomoTalk

**Classification:** `P2 · PROMISING`

Core rule:

```text
selection / open-panel / hover / local view state
!=
semantic session state
```

Many UI states should remain purely presentation-local.

This avoids turning every interface affordance into prompt burden or persistent schema.

---

## LB-I14 · Per-Render Instance Isolation

**Source:** MomoTalk

**Classification:** `P2 · PROMISING UI ROBUSTNESS`

Concept:

Each rendered instance receives an isolated identity so controls in one historical message do not accidentally operate another instance.

Potential relevance:

Any future long-chat embedded UI should make instance ownership explicit instead of relying on globally reused DOM/control identities.

---

## LB-I15 · Source Projection Envelope

**Sources:** Comments, Miniboard, HunterNet, News

**Classification:** `P2 · PROMISING RESEARCH MODEL`

The four source/community references together suggest a pipeline:

```text
channel reachability
→ audience exposure
→ propagation delay
→ publication maturity
→ source coverage lens
→ source-local assertion
→ provenance / epistemic quarantine
```

Important subideas:

- **Channel Reachability:** can this source receive the information at all?
- **Reaction Propagation:** has enough narrative time passed for reactions?
- **Publication Maturity:** can this source plausibly publish this detail yet?
- **Coverage Lens:** what does this source choose to emphasize?

These concepts should consume existing SimCore time/frame/source authority. They must not create competing clocks or world truth.

---

## LB-I16 · Assertion Provenance + Epistemic Quarantine

**Sources:** News, Miniboard, HunterNet, Comments

**Classification:** `P2 · PROMISING · HIGH CONFIDENCE PRINCIPLE`

Core rule:

```text
SOURCE ASSERTION
!=
WORLD FACT
```

A source-like sidecar may contain:

- report,
- attributed claim,
- rumor,
- opinion,
- joke/trolling,
- advertisement,
- correction.

Generated source content must not silently promote those claims into canonical continuity state.

A structured provenance schema remains deferred until a concrete product need exists.

---

## LB-I17 · Rolling vs Pinned Retention Classes

**Source:** Annotations

**Classification:** `P2 · PROMISING RETENTION PRINCIPLE`

Core distinction:

```text
automatically derived history = bounded rolling retention
explicit user pin/selection   = separately retained
```

Important caveat:

User retention intent increases persistence, not epistemic authority.

```text
PINNED != TRUE
```

---

## LB-I18 · Source-Local Identity Affordance

**Sources:** Comments, HunterNet

**Classification:** `P2 / P3 · WATCH`

Different simulated sources can expose different identity cues:

- anonymous,
- persistent nickname,
- professional role,
- verification,
- locality,
- partial network identity,
- rank/reputation.

This can improve source texture but can also create unnecessary persistent-state growth.

Keep as source-presentation research, not a global identity subsystem.

---

## LB-I19 · Effect-Class Contract

**Source:** Core

**Classification:** `P2 · PROMISING STATIC ARCHITECTURE IDEA`

Question:

```text
what may this owner actually do?
```

Useful conceptual effect classes include:

```text
presentation only
pure semantic transform
persistent-state write
host observation
host write
history mutation
network/provider work
```

The best possible SimCore adaptation would be static architecture/review metadata first, not a new runtime permission engine.

---

## LB-I20 · Declarative Capability Manifest

**Source:** Core

**Classification:** `P2 / P3 · WATCH`

A module declares what context/capabilities it requires instead of reaching into everything implicitly.

Potential maintenance value:

- ownership-scoped reading,
- static drift detection,
- illegal-effect review,
- narrow change-surface selection.

Do not create dynamic runtime module discovery unless a concrete product requirement proves the need.

---

# C. Architecture-sized / deferred ideas

## LB-I21 · Structured Community Sidecar

**Sources:** Comments, Miniboard, HunterNet, News

**Classification:** `P3 · DEFER · LARGE ARCHITECTURE`

Potential shape:

```text
Community semantic object
→ validator
→ renderer
```

Why deferred:

This touches representation, history, reroll/edit, mirror, migration, context participation, and persistent-state authority.

The repeated upstream pattern is evidence that the concept can work, not evidence that SimCore currently needs it.

---

## LB-I22 · Targeted Sidecar Interaction Transaction

**Sources:** Core, Comments, KakaoTalk, MomoTalk, Annotations

**Classification:** `P3 · DEFER`

Good concept:

```text
target one derived object/action
+ preserve unrelated state
```

Safe future SimCore shape:

```text
user intent
+ explicit target identity
+ immutable source evidence
→ owner-controlled new transaction
```

Rejected upstream shape:

```text
silent rewrite of historical canonical assistant content
```

---

## LB-I23 · Lazy / On-Demand Semantic Regeneration

**Sources:** Core and multiple LightBoard frontends

**Classification:** `P3 · DEFER`

This includes per-module reroll or generate-on-click behavior.

It is attractive UX but expensive architecturally because it creates semantic work outside the ordinary turn lifecycle.

Required design questions include:

- turn binding,
- lineage,
- current-task primacy,
- frame/clock semantics,
- provider/cache behavior,
- history visibility,
- reroll/edit reconciliation.

---

## LB-I24 · Protagonist-Decentered Ambient Source Projection

**Source:** News

**Classification:** `P3 · WATCH`

A believable source should sometimes cover ambient world activity rather than orbiting the protagonist.

Risk:

```text
plausible invented ambient event
→ later mistaken for canon
```

Any future form needs explicit derived/non-canonical provenance.

---

# D. Direct-transfer rejects

The following upstream mechanisms should not become SimCore implementation patterns merely because the surrounding concept is useful.

## REJECT-01 · Direct historical chat mutation

Observed in several interactive LightBoard paths.

```text
DO NOT TRANSFER
```

Reason:

It conflicts with lineage, reroll/edit reconciliation, evidence reproducibility, representation identity, and current-turn binding.

---

## REJECT-02 · Derived plausible-state invention

Strong warning from Status Window.

```text
missing authoritative value
→ invent plausible value
```

This is acceptable for some creative UI experiences but not for SimCore canonical/diagnostic state.

Use:

```text
unknown / absent / unverified
```

instead.

---

## REJECT-03 · Generic state subsystem from visual similarity

Status fields, annotation ledgers, Community source data, UI selections, and runtime session state do not share one semantic update law.

Do not infer:

```text
many things called "state"
→ one generic state abstraction
```

The references actually reinforce field/owner-specific reconciliation.

---

## REJECT-04 · Renderer owns canonical mutation

Prefer `LB-I09 Intent-Only Renderer Boundary`.

Presentation code should not gain business-state authority merely to service controls.

---

## REJECT-05 · Magic string action bus as product protocol

Examples in LightBoard use compact string encodings for actions/targets.

Useful inside a closed UI ecosystem, but SimCore should prefer typed/structured target identities if such a surface is ever built.

---

## REJECT-06 · Target-string-only persistent identity

Annotations often identify pinned items primarily by displayed target text.

That can collide when identical text appears in multiple source locations.

Any SimCore-derived record should retain source/lineage identity, not only a label string.

---

## REJECT-07 · Dynamic code/lore loading as ordinary extension contract

LightBoard Core can dynamically discover/load callbacks and shared prelude behavior.

Do not turn SimCore into a dynamic microkernel merely because the reference uses one.

The useful part is declarative ownership/capability metadata, not dynamic execution discovery.

---

## REJECT-08 · Model-based automatic correction/reiteration loop as reliability primitive

Core can validate and issue corrective model requests.

This changes latency, cost, request count, provider/cache behavior, and lineage.

SimCore correctness should remain validator/evidence driven unless a separate future design explicitly authorizes extra model calls.

---

## REJECT-09 · Prompt-required hidden scratch/reasoning format

Some LightBoard prompts explicitly scaffold thought/review phases.

Do not make hidden/private reasoning representation part of a SimCore runtime contract. Specify observable inputs, judgments, and output invariants instead.

---

## REJECT-10 · Manual privacy/exposure control as canonical truth

Miniboard/source references may expose user-controlled privacy-like knobs.

A future SimCore Community exposure boundary should derive from source/narrative evidence where possible, not treat a UI slider as canonical world-publication truth.

---

# E. Practical priority list

If future product evidence asks, "Which LightBoard ideas should we investigate first?", use this order.

## Tier 1 · Best near-term research value

```text
1. LB-I01 Audience Knowledge Boundary
2. LB-I02 Owner-Scoped Context Projection
3. LB-I05 Source-Anchored Derived Metadata
4. LB-I06 Reroll-Aware Derived Lineage Truncation
5. LB-I07 Context Re-entry Firewall
6. LB-I08 Presentation Failure Quarantine
7. LB-I09 Intent-Only Renderer Boundary
8. LB-I04 Derived Checkpoint + Recent Delta
9. LB-I03 Bounded Context Aperture
```

Why these rank highest:

- they reinforce existing ownership/lineage discipline,
- they address long-chat or derived-data correctness,
- several can begin as documentation or narrow contracts,
- they do not inherently require a new architecture layer.

## Tier 2 · Strong design vocabulary

```text
10. LB-I10 Semantic Payload / Renderer Decoupling
11. LB-I16 Assertion Provenance + Epistemic Quarantine
12. LB-I15 Source Projection Envelope
13. LB-I11 Shared Parse ABI
14. LB-I17 Rolling vs Pinned Retention Classes
15. LB-I13 Ephemeral UI State Plane
16. LB-I14 Per-Render Instance Isolation
17. LB-I19 Effect-Class Contract
18. LB-I20 Declarative Capability Manifest
```

These should be used as review/design vocabulary before being treated as features.

## Tier 3 · Architecture-sized backlog

```text
19. LB-I21 Structured Community Sidecar
20. LB-I22 Targeted Sidecar Interaction Transaction
21. LB-I12 Progressive Disclosure / Lazy Optional Enrichment
22. LB-I23 Lazy / On-Demand Semantic Regeneration
23. LB-I18 Source-Local Identity Affordance
24. LB-I24 Protagonist-Decentered Ambient Source Projection
```

These are interesting but should not piggyback on maintenance or simplification releases.

---

# F. Source-to-idea map

## LightBoard Comments 4.0.0

Strongest ideas:

```text
LB-I01 Audience Knowledge Boundary
LB-I03 Bounded Context Aperture
LB-I10 Semantic Payload / Renderer Decoupling
LB-I16 Assertion Provenance / Quarantine
LB-I22 Targeted Interaction Transaction
```

## LightBoard Core 4.1.1

Strongest ideas:

```text
LB-I02 Owner-Scoped Context Projection
LB-I10 Semantic Payload / Renderer Decoupling
LB-I11 Shared Parse ABI substrate
LB-I12 Progressive Disclosure / Lazy Enrichment
LB-I19 Effect-Class Contract
LB-I20 Declarative Capability Manifest
LB-I22 Targeted Sidecar Interaction
LB-I23 On-Demand Semantic Regeneration
```

## LightBoard Miniboard 4.1.1

Strongest ideas:

```text
LB-I01 Audience Knowledge Boundary
LB-I03 Bounded Context Aperture
LB-I10 Semantic Payload / Renderer Decoupling
LB-I16 Epistemic Quarantine
```

## LightBoard HunterNet 4.0.0

Strongest ideas:

```text
LB-I01 Audience Knowledge Boundary
LB-I03 Bounded Context Aperture
LB-I15 Channel Reachability / Propagation
LB-I16 Assertion Provenance / Quarantine
LB-I18 Source-Local Identity Affordance
```

## LightBoard News 4.0.0

Strongest ideas:

```text
LB-I01 Audience Knowledge Boundary
LB-I03 Bounded Context Aperture / field projection
LB-I15 Publication Maturity / Coverage Lens
LB-I16 Assertion Provenance / Quarantine
LB-I24 Ambient Source Projection
```

## LightBoard KakaoTalk Popover

Strongest ideas:

```text
LB-I08 Presentation Failure Quarantine
LB-I10 Semantic Payload / Renderer Decoupling
LB-I11 Shared Parse ABI
LB-I12 Progressive Disclosure
LB-I22 Targeted interaction intent
```

## Miniboard MomoTalk Renderer

Strongest ideas:

```text
LB-I09 Intent-Only Renderer Boundary
LB-I10 Semantic Payload / Renderer Decoupling
LB-I13 Ephemeral UI State Plane
LB-I14 Per-Render Instance Isolation
```

## LightBoard Status Window 4.0.0

Strongest ideas:

```text
LB-I03 Bounded Context Aperture
LB-I04 Derived Checkpoint + Recent Delta
LB-I08 Presentation Failure Quarantine
```

Strong warning:

```text
REJECT-02 Derived plausible-state invention
REJECT-03 Generic state subsystem
```

## LightBoard Annotations 4.0.0

Strongest ideas:

```text
LB-I03 Bounded Context Aperture
LB-I05 Source-Anchored Derived Metadata
LB-I06 Reroll-Aware Derived Lineage Truncation
LB-I07 Context Re-entry Firewall
LB-I08 Presentation Failure Quarantine
LB-I17 Rolling vs Pinned Retention Classes
LB-I22 Targeted Sidecar Interaction
```

---

# G. What the nine files collectively suggest for SimCore

The references do **not** collectively justify a new generic LightBoard-like subsystem.

They do collectively support a stronger set of architecture questions for any future derived feature:

```text
1. What is the authoritative source?
2. What bounded context may this owner read?
3. What may the source/audience know?
4. What exactly is derived versus canonical?
5. What source anchor/provenance does the derivation retain?
6. What happens to the derivation after reroll/edit/reload?
7. How long is it stored?
8. How long does it remain in model context?
9. How is it rendered if presentation fails?
10. Does the renderer emit intent or mutate state directly?
11. Can derived data re-enter future model context?
12. If so, how is non-authoritative provenance preserved?
```

That checklist is the strongest cross-file product of the LightBoard reference set.

A future feature inspired by any one item should answer these questions before implementation.

---

# H. Promotion rule

An item in this catalog may move into real SimCore design only when a concrete product/runtime problem identifies:

```text
PROBLEM
→ SOURCE-GROUNDED LIGHTBOARD IDEA
→ BOUNDED SIMCORE OWNER
→ EXPLICIT INVARIANTS
→ NO NEW ARCHITECTURE LAYER UNLESS PROVEN NECESSARY
→ SEPARATE DESIGN / IMPLEMENTATION TRANSACTION
→ STATIC + CI
→ release-simcore publication
→ real long-chat evidence
```

Reference popularity, visual appeal, or repeated appearance across LightBoard modules is not enough by itself.

---

## 4. Final disposition

```text
LIGHTBOARD-FAMILY ARTIFACTS IN SCOPE = 9
RISUAI SCRIPTING SKILL                = EXCLUDED
DIRECT CODE REUSE AUTHORITY           = NONE
RUNTIME FEATURE AUTHORITY             = NONE

TIER 1 RESEARCH IDEAS                 = 9
TIER 2 DESIGN-ASSET IDEAS             = 9
TIER 3 ARCHITECTURE/BACKLOG IDEAS     = 6
DIRECT-TRANSFER REJECTS               = 10

STRONGEST OVERALL PRINCIPLE:
AUTHORITATIVE SOURCE
→ BOUNDED DERIVATION
→ PROVENANCE-PRESERVING SIDECAR
→ FAILURE-QUARANTINED PRESENTATION
→ OWNER-CONTROLLED INTERACTION
→ EXPLICIT NON-AUTHORITATIVE CONTEXT RE-ENTRY
```
