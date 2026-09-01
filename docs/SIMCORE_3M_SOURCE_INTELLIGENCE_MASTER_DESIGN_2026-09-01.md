# SimCore 3.0M Source Intelligence Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **OVERALL PRODUCT DESIGN FROZEN · 3.0M THEME SELECTED = SOURCE INTELLIGENCE · IMPLEMENTATION NOT AUTHORIZED · ACTIVE S7 / v0.70.3 UNCHANGED**

Classification: **3.0M PRODUCT ARCHITECTURE · SOURCE INTELLIGENCE · MODE C EVOLUTION · LIGHTBOARD / MINIBOARD RESEARCH PROMOTION**

## 0. Purpose

This document is the first overall product design for the future SimCore 3.0M major.

It promotes the prior candidate-map hypothesis into a selected top-level product direction:

```text
3.0M · SOURCE INTELLIGENCE MAJOR
```

The purpose of 3.0M is not to copy LightBoard / MiniBoard, add many unrelated UIs, or create a second social-network simulator.

The purpose is to evolve the current Community capability into a source-aware projection system that can represent multiple public/social information surfaces while preserving SimCore's existing ownership model:

```text
canonical world / event authority
!= source exposure
!= derived social/public projection
!= presentation
!= interaction
!= future context
```

This document freezes the overall product shape, responsibility boundaries, compatibility direction, major checkpoint families, and non-goals.

It does not authorize runtime implementation, does not assign a semver release number, and does not alter the current S7 / v0.70.3 transaction.

## 1. Authority chain

This master design is derived from and must remain compatible with:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_3M_MAJOR_UPDATE_CANDIDATE_MAP_2026-08-31.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_RESEARCH_LIVE_DEFERRAL_AND_NEXT_RESEARCH_DECISION_2026-09-01.md
docs/SIMCORE_MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION_CONTRACT_2026-09-01.md
docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_DEPENDENCY_TRAP_CORPUS_2026-09-01.md
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

Current production and release authority remains elsewhere:

```text
release-simcore = production runtime authority
main            = design / evidence / roadmap authority
```

3.0M does not become current production merely because this master design is frozen.

## 2. Product thesis

Current SimCore already owns the important preconditions for a source-aware system:

- runtime mode and lifecycle;
- Frame / Continuity;
- Evidence / Lineage;
- Source Handoff;
- exposure boundaries;
- output validation;
- runtime coordination;
- renderer guidance.

Current Community, however, is still largely one generalized reaction surface.

3.0M changes the product abstraction from:

```text
COMMUNITY = one social reaction block
```

toward:

```text
SOURCE INTELLIGENCE
= one policy and validation layer
  producing multiple source-family projections
  from bounded existing authority
```

Representative future source families include:

```text
LIVE_REACTION
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
```

These are semantic source families, not new core runtime modes.

## 3. Core-mode decision

3.0M does **not** introduce one core mode per platform or presentation family.

Canonical runtime modes remain:

```text
B_START
B_CONTINUE
B_END
C
```

The new source family is an orthogonal projection axis inside the existing runtime contract.

Canonical rule:

```text
source family != runtime mode
```

Therefore do not create concepts such as:

```text
SNS_MODE
NEWS_MODE
BOARD_MODE
WIKI_MODE
```

as replacements for the existing core-mode model.

The preferred conceptual shape is:

```text
current core mode
+
source projection family
+
source projection policy
+
presentation renderer
```

Mode C is the primary product surface that becomes source-aware first.

Broadcast modes remain authoritative for the broadcast lifecycle and visible broadcast generation.

## 4. B / C relationship

The first 3.0M source path builds on the already understood direct B-root relationship:

```text
B visible broadcast / exposed event
        ↓
exposure boundary
        ↓
C source projection
```

This must not be interpreted as:

```text
all facts SimCore knows
→ all source families know them
```

The Source Intelligence layer must distinguish at least:

```text
canonical/world fact
visible/exposed public fact
attributed social context
visible-cue inference/opinion
private or unknown fact
```

The exact production exposure classifier is separately evidence-gated. The current E6 six-line candidate is research evidence, not automatic 3.0M production authority.

Future source origins may include explicit public disclosures or other source-authorized events, but the first implementation design should remain bounded to the already-studied direct B-root / current-source path unless a later contract explicitly expands it.

## 5. Responsibility split

### 5.1 SimCore

SimCore remains the **state, policy, boundary, validation, and runtime coordination layer**.

For Source Intelligence, SimCore owns:

```text
source-family selection policy
source eligibility / reachability
exposure boundary application
source assertion authority class
source provenance references
bounded source context projection
schema / contract validation
presentation renderer selection
intent validation
context re-entry policy
edit / reroll / source-replacement invalidation rules
bounded diagnostics
```

SimCore must not become the prose writer for every post, article, comment, or thread.

### 5.2 Main model

The main model remains the semantic/natural-language renderer.

For Source Intelligence it may generate, when instructed by SimCore:

```text
comment text
post text
reply text
headline/body text
source-local reactions
attributed rumor/opinion wording
natural-language source payload fields
```

The main model does not independently decide:

```text
whether a hidden fact is public
which source owns canonical truth
whether a rumor becomes fact
whether a source object persists
whether a source object may re-enter future context
which CSS/DOM implementation is authoritative
```

### 5.3 Presentation renderer

3.0M introduces a clearer terminology boundary between two meanings of renderer:

```text
Semantic Renderer     = main model, produces natural-language semantic output
Presentation Renderer = plugin-owned DOM/CSS/UI adapter
```

This terminology clarifies the existing guideline without changing the underlying responsibility split.

The Presentation Renderer may choose source-specific DOM and CSS but has no semantic authority.

## 6. Canonical Source Intelligence pipeline

Overall pipeline:

```text
USER INPUT
   ↓
SIMCORE CURRENT AUTHORITY
   - mode
   - lifecycle
   - Frame / Continuity
   - Evidence / Lineage
   - Source Handoff
   ↓
SOURCE ELIGIBILITY / EXPOSURE
   ↓
SOURCE PROJECTION ENVELOPE
   ↓
BOUNDED SOURCE CONTEXT
   ↓
MAIN MODEL SEMANTIC RENDER
   ↓
STRUCTURED SOURCE SIDECAR PAYLOAD
   ↓
VALIDATION / PROVENANCE CHECK
   ↓
PRESENTATION RENDERER
   - source-specific DOM
   - source-scoped CSS
   ↓
USER-VISIBLE SOURCE SURFACE
   ↓
OPTIONAL NARROW INTENT
   ↓
SIMCORE VALIDATION / RECONCILIATION
```

This pipeline deliberately separates semantic correctness from presentation.

## 7. Source Projection Envelope

3.0M requires one small common semantic envelope across source families.

The master design freezes the **conceptual fields**, not an implementation schema version.

Minimum conceptual envelope:

```text
SourceProjectionEnvelope
  family
  sourceAuthorityRef
  exposureScope
  reachability
  publicationMaturity
  assertions[]
  contextReentryPolicy
  presentationIntent
```

### `family`

Defines the source semantic family, not CSS theme.

### `sourceAuthorityRef`

References existing authority where possible. Do not invent a second canonical world identity system.

### `exposureScope`

States what information class is eligible for this source projection.

### `reachability`

Represents whether the source/channel can plausibly receive or publish the information.

### `publicationMaturity`

Allows future distinction between immediate reaction, attributed rumor, published report, and settled public-reference projection.

### `assertions[]`

Contains bounded derived source assertions. Assertions remain non-canonical unless an existing canonical owner independently establishes them.

### `contextReentryPolicy`

Explicitly states whether any derived source material can be consumed by future model requests.

Default-safe value is effectively no ordinary re-entry.

### `presentationIntent`

Tells the plugin which presentation family to render without giving presentation bytes semantic authority.

## 8. Three authority classes

Every 3.0M source object must preserve the distinction between:

### A. Canonical authority

Existing world/event/session owners.

Examples:

```text
Frame
Continuity
Evidence
Lineage
Source Handoff
Broadcast Lifecycle
```

### B. Derived semantic source projection

Examples:

```text
viewer reaction
forum post
SNS post
news assertion
public-reference summary
```

This layer may carry provenance but does not become world truth merely because it exists.

### C. Presentation-only state

Examples:

```text
expanded/collapsed card
scroll position
selected tab
source-specific color/token
avatar fallback
layout density
popover state
```

Presentation-only state must not become canonical semantic state.

## 9. Initial source-family taxonomy

The overall product taxonomy is frozen at five families for design purposes.

### 9.1 LIVE_REACTION

Closest compatibility target to current `<COMMUNITY>`.

Properties:

```text
high immediacy
short reaction horizon
strong current-source dependence
low publication maturity
high sensitivity to exposure correctness
```

Examples:

```text
live chat
broadcast comments
fast reaction feed
```

### 9.2 BOARD

Thread/post-oriented public or semi-public discussion.

Properties:

```text
post + reply structure
slower reaction horizon
source-local identity useful
attributed rumor/opinion more persistent than live chat
```

### 9.3 SOCIAL_FEED

Profile/post/reply/repost style projection.

Properties:

```text
source-local author identity
feed representation
reply/repost relationships
channel-specific reachability
```

### 9.4 NEWS

Publication-oriented source.

Properties:

```text
higher publication maturity
headline/body/source attribution
strong assertion provenance requirements
less reaction-like than Community
```

### 9.5 PUBLIC_KNOWLEDGE

Public-reference/document projection.

Properties:

```text
settled or attributed public information
navigation/projection replacement behavior
not an omniscient world database
strict public-knowledge boundary
```

Examples may eventually include wiki-like reference surfaces.

## 10. First-family implementation principle

The safest first implementation family is **LIVE_REACTION compatibility**, because current Community already supplies a real production consumer.

Therefore the first runtime checkpoint should not begin by introducing SNS, News, and Board simultaneously.

Preferred migration shape:

```text
existing <COMMUNITY>
→ compatibility adapter
→ SourceProjectionEnvelope(family = LIVE_REACTION)
→ existing or equivalent presentation
```

Initial success means the new Source Intelligence architecture can represent the current Community semantics without changing visible behavior or authority.

Only after that compatibility proof should a second family create genuinely new presentation and schema behavior.

## 11. `<COMMUNITY>` compatibility

3.0M must not require an immediate breaking prompt/output migration.

Compatibility rule:

```text
legacy <COMMUNITY> remains accepted during migration
```

A compatibility adapter may treat current Community output as the first `LIVE_REACTION` semantic payload.

Later source-aware output contracts may add structured source fields behind explicit feature gates, but the current Community contract remains the fallback until a separate migration design closes compatibility.

This prevents 3.0M from coupling architecture migration to a simultaneous prompt-format rewrite.

## 12. Exposure / knowledge boundary

Source Intelligence must never infer public knowledge solely from canonical continuity.

Canonical rule:

```text
SIMCORE KNOWS FACT
!=
SOURCE MAY ASSERT FACT
```

The minimum semantic classes required by the master design are:

```text
PUBLIC / EXPOSED FACT
ATTRIBUTED SOCIAL CONTEXT
VISIBLE-CUE INFERENCE / OPINION
PRIVATE / UNEXPOSED
UNKNOWN
```

Required behavior:

```text
PUBLIC / EXPOSED
→ source assertion may be eligible according to family/reachability

ATTRIBUTED SOCIAL CONTEXT
→ may recur only as attributed social context, rumor, opinion, or reaction

VISIBLE-CUE INFERENCE
→ may be expressed as inference/opinion, not private-state confirmation

PRIVATE / UNEXPOSED
→ no public/source fact assertion

UNKNOWN
→ do not upgrade to known public fact
```

The exact implementation contract remains gated by the separate Exposure research result.

## 13. Provenance and Candidate C activation rule

3.0M needs provenance, but must not create a generic second lineage platform in advance.

Initial rule:

```text
reuse existing Evidence / Lineage / Source Handoff references where sufficient
```

Candidate C, Derived Provenance and Reroll Lineage, becomes a required dedicated design only when a concrete Source Intelligence object proves it needs metadata not already expressible through existing authorities.

Activation examples:

```text
persisted source assertion must survive multiple turns
source replacement must invalidate a derived descendant
source-local reply chain requires stable source identity
source object is allowed controlled future-context re-entry
```

Until then:

```text
NO generic provenance ledger
NO unbounded source identity registry
NO duplicate world-event identity owner
```

## 14. Edit / reroll / source-replacement rule

Derived source content must not survive after its supporting source authority disappears.

General invariant:

```text
source authority invalidated
→ unsupported derived source projection invalidated or rebuilt
```

The exact invalidation mechanism may vary by checkpoint, but presentation must never mask stale semantic lineage.

Reroll is not merely a visual refresh. If the authoritative source result changes, unsupported descendants must be treated as stale.

## 15. Context re-entry firewall

Derived source surfaces are presentation/sidecar results by default, not ordinary future model context.

Default rule:

```text
derived source payload
→ NO ordinary automatic context re-entry
```

A later source family may request bounded re-entry only through a dedicated owner-bounded contract proving:

```text
which fields re-enter
why they are needed
who owns them
how stale data is invalidated
how token/context growth remains bounded
```

This is one of the primary defenses against long-chat source-history accumulation.

## 16. Context Projection relationship

The previous Context Projection research proved an important negative result:

```text
structurally removable prefix
!=
semantically safe to remove
```

Therefore 3.0M does not authorize blanket history/root-prefix cuts.

Preferred 3.0M context strategy:

```text
owner-bounded / field-bounded projection
+
explicit semantic dependency proof
+
full-context fallback on uncertainty
```

Context Projection is a supporting foundation, not permission for aggressive deletion.

The first Source Intelligence implementation may use current full-context behavior if necessary. Correctness is more important than immediate token reduction.

## 17. Structured semantic sidecar

The long-term Source Intelligence output is a structured semantic sidecar, not raw HTML and not a presentation string treated as state.

Conceptual flow:

```text
main-model source semantics
→ normalize
→ validate
→ semantic sidecar
→ presentation renderer
```

A source-specific validator should own exact structural policy once a family schema exists.

Prompt prose is not sufficient authority for schema integrity.

## 18. Presentation architecture

3.0M explicitly allows source-specific presentation rendering after semantic validation.

Preferred architecture:

```text
validated semantic payload
→ renderer registry
→ family renderer
→ family-scoped DOM
→ family-scoped CSS
```

Illustrative registry:

```text
LIVE_REACTION → live reaction renderer
BOARD         → thread renderer
SOCIAL_FEED   → feed renderer
NEWS          → article renderer
PUBLIC_KNOWLEDGE → document/reference renderer
```

The renderer may change DOM structure, not merely CSS skin.

## 19. CSS / DOM rules

Source-specific presentation is a 3.0M product feature, but CSS/DOM remains non-semantic.

Required rules:

```text
source-scoped namespace
no broad global CSS mutation
no raw generated text concatenated as trusted HTML
escaped / validated presentation materialization
renderer failure quarantined from semantic state
feature OFF closes generator + validator + renderer path
presentation identity != canonical source identity
```

CSS must never determine whether an assertion is public, rumor, private, canonical, or inferred.

Semantic state selects presentation. Presentation does not create semantic state.

## 20. Renderer failure behavior

Renderer failure must not destroy source semantics or canonical state.

Required fallback principle:

```text
presentation render failure
→ preserve validated semantic payload
→ use bounded fallback / legacy Community presentation when available
→ do not mutate world/source authority to make rendering succeed
```

This allows presentation to become ambitious without making CSS/DOM a correctness dependency.

## 21. Interaction architecture

User interaction with source UIs is initially intent-only.

Allowed conceptual intents may include:

```text
open thread
switch source view
expand replies
request source-local continuation
request bounded reroll of derived source content
```

The Presentation Renderer emits an intent.

SimCore decides whether that intent is semantically valid and what effect it may have.

Do not let button/action strings become canonical semantic state.

## 22. Persistence strategy

3.0M does not begin with a generic persistent social database.

Initial preference:

```text
zero new persistent schema where possible
```

The first LIVE_REACTION compatibility checkpoint should be ephemeral or derived from current authority.

Persistent source state may be introduced only when a concrete family proves a product requirement that cannot be met safely through current owners and bounded derived state.

Any persistent addition requires a dedicated schema/ownership design.

## 23. Auxiliary model calls

Auxiliary semantic compute is not part of the first Source Intelligence foundation.

Initial rule:

```text
3.0M CORE FOUNDATION
→ zero new auxiliary model calls
```

Reason:

- preserve main-model/runtime attribution;
- avoid latency/cost fanout while semantic boundaries are still being proven;
- avoid stale-result/cancellation complexity;
- keep 3.0M from becoming a generic second-agent framework.

Auxiliary model dispatch remains a later optional capability after Source Intelligence semantics, provenance, invalidation, and validation are stable.

## 24. Media / network materialization

Media generation/fetching and external network enrichment are downstream features.

Initial foundation rule:

```text
semantic validity
!=
media/network success
```

No source assertion may become valid merely because an external media request succeeds.

No core source family should depend on network/media materialization for correctness.

## 25. Source history bound

Source Intelligence must not create unbounded source history accumulation.

Required design principle:

```text
bounded active source horizon
+
explicit authority for persistence
+
explicit context re-entry policy
```

The exact retention window is a later family design question.

A large source archive may exist for UI/history purposes only if it does not silently become model context or canonical world truth.

## 26. Main-model isolation invariant

The 3.0M major must preserve:

```text
source sidecar exists
!=
main model consumes all source history
```

Ordinary roleplay/current-task generation remains primary.

When source surfaces are irrelevant, Source Intelligence must become near-zero semantic burden and must not degrade ordinary chat quality.

## 27. Major checkpoint architecture

The master design freezes checkpoint **families**, not exact release numbers or commit boundaries.

### 3M-0 · Master Contract / Impact Scope

This document.

Outputs:

```text
major identity
role boundaries
source taxonomy
compatibility strategy
non-goals
checkpoint families
```

### 3M-1 · Source Projection Envelope + Legacy Community Compatibility

Goal:

```text
represent current Community as LIVE_REACTION through the new envelope
without visible behavior or authority regression
```

Preferred constraints:

```text
no new persistent schema
no new model call
no new source family UI required
legacy fallback preserved
```

### 3M-2 · Source Assertion / Exposure Boundary

Goal:

```text
make source assertion eligibility explicit and machine-checkable enough for the first family
```

Implementation of new exposure semantics is evidence-gated by the separate Exposure research lane.

### 3M-3 · Structured Sidecar + Validation

Goal:

```text
introduce bounded semantic payload structure and validator ownership
```

This is the point at which Candidate C provenance requirements must be reassessed against a concrete object.

### 3M-4 · Presentation Renderer Architecture

Goal:

```text
separate validated semantics from family-specific DOM/CSS
```

First visible renderer target should remain LIVE_REACTION compatibility or a narrowly gated enhanced live-reaction surface.

### 3M-5 · First New Generalized Family

Preferred design candidates:

```text
BOARD
or
SOCIAL_FEED
```

Selection must be evidence/design driven. Do not implement both in one checkpoint by default.

### 3M-6 · Provenance / Invalidation Expansion if demanded

Only if concrete source objects require it:

```text
source-local identity
edit/reroll invalidation
source replacement
bounded descendant truncation
```

Do not create this checkpoint merely because the number exists.

### 3M-7 · Context Re-entry / Source-History Boundaries

Goal:

```text
prove bounded history and future-context behavior for mature source families
```

Blanket root-prefix deletion remains forbidden without semantic proof.

### 3M-8 · Publication-Maturity Families

Candidates:

```text
NEWS
PUBLIC_KNOWLEDGE
```

Requires stronger provenance/publication contracts than reaction-oriented families.

### 3M-9 · Integration / Performance / Source-Irrelevant Baseline

Goal:

```text
prove ordinary chat remains healthy
prove source work is bounded
prove no context/state accumulation
```

### 3M-10 · Major Convergence / Real Long-Chat Close

Goal:

```text
broad real-chat validation
cross-family semantic correctness
renderer isolation
reroll/edit correctness
performance acceptance
major administrative close
```

The exact final checkpoint numbering may be refined in a dedicated checkpoint plan, but the dependency direction above is frozen.

## 28. First new family selection criteria

After LIVE_REACTION compatibility, the first genuinely new family must score well on:

```text
clear current product value
reuse of current authority
zero or minimal persistence
simple exposure boundary
bounded source history
renderer differentiation value
easy negative fixtures
low auxiliary-compute requirement
```

This favors BOARD or SOCIAL_FEED before NEWS/PUBLIC_KNOWLEDGE.

NEWS and PUBLIC_KNOWLEDGE require stronger publication/provenance maturity and should not be first simply because they look visually distinct.

## 29. Validation architecture

3.0M must be validated at three separate layers.

### A. Static / contract validation

Examples:

```text
source-family enum/registry integrity
schema validation
feature-gate closure
CSS namespace isolation
legacy Community compatibility
renderer fallback
no new forbidden persistence
no source-history unbounded container
latest.js == install.js for runtime releases
```

### B. Semantic fixtures

Required fixture classes include:

```text
visible broadcast fact allowed
Knowledge-only hidden fact denied
attributed rumor remains attributed
visible cue inference not private confirmation
unknown fact not upgraded
source family cannot promote itself to canonical truth
source replacement invalidates stale derived object
presentation failure preserves semantics
context re-entry denied by default
```

### C. Real long-chat validation

Required scenario families include:

```text
source irrelevant ordinary chat baseline
B → C live reaction
long chat with repeated source usage
reroll / edit / source replacement
same exposed event projected into different source families
renderer switch without semantic mutation
legacy Community fallback
source UI failure quarantine
bounded memory/context behavior
```

## 30. Cross-family same-event proof

A signature 3.0M validation scenario should prove that the same public event can appear differently across source families without changing its underlying authority.

Conceptual example:

```text
one exposed event
  ↓
LIVE_REACTION
  immediate short comments
  ↓
BOARD
  thread/post discussion
  ↓
SOCIAL_FEED
  profile/feed/reply projection
  ↓
NEWS
  publication-style assertion
```

The presentation and wording may differ.

The event's canonical truth and exposure basis must remain stable and source-independent.

## 31. Performance budget principles

Before implementation, every checkpoint must state expected new costs for:

```text
request scans
history scans
prompt chars/tokens
source payload size
validator work
DOM/render work
persistent storage
network/model calls
```

Initial major preference:

```text
one existing main-model generation
bounded local validation
bounded local rendering
zero new background worker
zero new polling loop
zero new auxiliary model fanout
```

Performance optimization must not weaken source/exposure correctness.

## 32. S7 / v0.70.3 boundary

The current product lane remains S7 / v0.70.3 Post-M2 Simplification Convergence.

3.0M design work may continue on main as design/evidence only.

3.0M runtime implementation must not be mixed into the S7 implementation/release transaction.

The practical v0.70.3 real-long-chat window may separately collect Exposure target-host B0/E6 evidence, but that evidence remains an independent research authority.

Canonical separation:

```text
S7 live validation
!=
Exposure preflight evidence
!=
3.0M implementation authorization
```

## 33. Release-system boundary

3.0M is a product runtime program.

Do not combine it with a future R3 release-system redesign.

```text
3.0M Source Intelligence
!=
R3 release-system program
```

The existing permanent release path remains the only publication authority until separately changed by a release-system program.

## 34. Explicit non-goals

3.0M foundation does not authorize:

```text
generic LightBoard subsystem
third-party runtime copy/import
generic social-network simulator
one runtime mode per source family
unbounded social/source database
historical-chat rewrite as source state management
LLM-maintained duplicate canonical ledger
private thought promoted to public truth
derived source projection promoted to world truth
raw model HTML as trusted UI
CSS as semantic authority
global DOM/style mutation
background autonomous world generation
new auxiliary model fanout in the foundation
media/network dependency for semantic validity
blanket context-prefix deletion
new generic provenance platform without a concrete consumer
R3 release-system work
S7 scope expansion
```

## 35. WATCH / DEFER / BLOCKER map

### WATCH

```text
WATCH · SOURCE_FAMILY_SCOPE_EXPLOSION
WATCH · PRESENTATION_COMPLEXITY_MASKING_SEMANTIC_GAPS
WATCH · SOURCE_HISTORY_CONTEXT_ACCUMULATION
WATCH · SOURCE_LOCAL_IDENTITY_DUPLICATING_EXISTING_LINEAGE
WATCH · CSS_NAMESPACE_LEAKAGE
WATCH · LEGACY_COMMUNITY_COMPATIBILITY_DRIFT
```

### DEFER

```text
DEFER · EXPOSURE_TARGET_HOST_PREFLIGHT_TO_V0703_REAL_LONG_CHAT_WINDOW
DEFER · AUXILIARY_SEMANTIC_MODEL_DISPATCH
DEFER · MEDIA_NETWORK_MATERIALIZATION
DEFER · AMBIENT_AUTONOMOUS_WORLD_PROJECTION
DEFER · GENERIC_PERSISTENT_SOURCE_DATABASE
DEFER · NEWS_PUBLIC_KNOWLEDGE_IMPLEMENTATION_UNTIL_FOUNDATION_PROVEN
```

### BLOCKER for implementation if unresolved

```text
BLOCKER · NO_CLEAR_CANONICAL_VS_DERIVED_AUTHORITY_BOUNDARY
BLOCKER · SOURCE_ASSERTION_CAN_PROMOTE_PRIVATE_UNKNOWN_FACT_TO_PUBLIC_TRUTH
BLOCKER · SOURCE_HISTORY_REENTERS_CONTEXT_UNBOUNDED
BLOCKER · NEW_SOURCE_IDENTITY_COMPETES_WITH_EXISTING_LINEAGE_AUTHORITY
BLOCKER · SOURCE_RENDERER_REQUIRES_SEMANTIC_MUTATION_TO_DISPLAY
```

These blockers do not block this design document. They are implementation-entry blockers.

## 36. Implementation-entry gate

No 3.0M runtime branch should begin until all of the following are true:

```text
S7 / v0.70.3 release transaction is separately closed or otherwise no longer sharing implementation scope
3M-1 concrete design exists
legacy Community compatibility contract is explicit
read/write/effect surfaces are bounded
persistent-schema delta is NONE or separately authorized
source assertion/exposure dependencies are identified
static validation plan exists
real-long-chat plan exists
release-system changes are excluded
```

Exposure evidence does not have to authorize every future family before 3M-1 compatibility design, but any checkpoint that changes actual exposure semantics must satisfy its evidence gate before implementation.

## 37. Design authority decision

This document promotes the previous 3.0M candidate map as follows:

```text
PREVIOUS
TOP CANDIDATE = SOURCE INTELLIGENCE
3.0M SCOPE = NOT FROZEN

NOW
3.0M PRODUCT THEME = SOURCE INTELLIGENCE MAJOR · FROZEN
OVERALL ARCHITECTURE = FROZEN
CORE MODE MODEL = PRESERVE B_START / B_CONTINUE / B_END / C
MODE C EVOLUTION = SOURCE-AWARE PROJECTION
FIRST COMPATIBILITY FAMILY = LIVE_REACTION
FIRST NEW FAMILY = BOARD OR SOCIAL_FEED · NOT YET SELECTED
IMPLEMENTATION = NOT AUTHORIZED
SEMVER RELEASE IDENTITY = NOT ASSIGNED
```

The old candidate map remains historical evidence for how this direction was selected.

## 38. Next design transaction

The next legitimate 3.0M design transaction is:

```text
3M-1 · SOURCE PROJECTION ENVELOPE + LEGACY COMMUNITY COMPATIBILITY DESIGN
```

That design should:

```text
re-read current production Community generation/validation ownership
identify exact existing Source Handoff / Evidence references available
freeze the smallest ephemeral SourceProjectionEnvelope
map current <COMMUNITY> into LIVE_REACTION without semantic change
prove no new persistence / network / model call
freeze static compatibility fixtures
freeze real-chat compatibility evidence
```

Do not jump directly to BOARD/SNS CSS implementation before 3M-1 closes the semantic compatibility boundary.

## 39. Final state

```text
3M_MAJOR_IDENTITY                         = SOURCE_INTELLIGENCE
3M_OVERALL_PRODUCT_DESIGN                 = FROZEN
3M_IMPLEMENTATION                         = NOT_AUTHORIZED
3M_RUNTIME_MODE_EXPANSION                 = NONE
MODE_C_SOURCE_AWARE_EVOLUTION             = AUTHORIZED_FOR_DESIGN
FIRST_COMPATIBILITY_FAMILY                = LIVE_REACTION
FIRST_NEW_SOURCE_FAMILY                   = UNSELECTED · BOARD_OR_SOCIAL_FEED_CANDIDATE
SOURCE_PROJECTION_ENVELOPE                = CONCEPTUAL_SHAPE_FROZEN
LEGACY_COMMUNITY_COMPATIBILITY            = REQUIRED
EXPOSURE_EXACT_POLICY                     = EVIDENCE_GATED
GENERIC_PROVENANCE_PLATFORM               = NOT_AUTHORIZED
PERSISTENT_SOURCE_DATABASE                = NOT_AUTHORIZED
AUXILIARY_MODEL_FANOUT                    = DEFERRED
PRESENTATION_RENDERER_SPLIT               = OVERALL_DESIGN_FROZEN
SOURCE_SPECIFIC_DOM_CSS                    = AUTHORIZED_AS_DOWNSTREAM_PRESENTATION_DESIGN
S7 / v0.70.3                              = UNCHANGED
release-simcore                           = UNCHANGED
NEXT                                      = 3M-1 SOURCE PROJECTION ENVELOPE + LEGACY COMMUNITY COMPATIBILITY DESIGN
```
