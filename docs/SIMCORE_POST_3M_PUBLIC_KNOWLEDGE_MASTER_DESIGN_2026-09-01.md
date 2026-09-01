# SimCore Post-3.0M PUBLIC_KNOWLEDGE Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **MASTER DESIGN FROZEN · PUBLIC_KNOWLEDGE SETTLEMENT ARCHITECTURE DEFINED · DESIGN-ONLY · RUNTIME NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE FAMILY EXPANSION · PUBLIC_KNOWLEDGE · SETTLEMENT · DOCUMENT PROJECTION**

## 0. Purpose

This document freezes the overall design for the user-selected post-3.0M follow-up family:

```text
PUBLIC_KNOWLEDGE
```

The family represents a bounded in-universe public-reference document such as a collaborative encyclopedia or wiki-like source.

It does not implement runtime code, prompt/output transport, DOM/CSS, persistence, source history, target-host execution, release publication, S7/v0.70.3 changes, or `release-simcore` mutation.

Canonical identity:

```text
PUBLIC_KNOWLEDGE
= PUBLIC-REFERENCE PROJECTION
!= CANONICAL WORLD DATABASE
!= NEWS ARCHIVE
!= SOURCE HISTORY STORE
```

## 1. Primary architectural question

PUBLIC_KNOWLEDGE does not ask merely:

```text
is this information public?
```

It asks:

```text
if the information is publicly eligible,
what epistemic status may it occupy inside a public-reference document?
```

Therefore the family adds a new policy axis:

```text
PUBLIC-REFERENCE SETTLEMENT
```

Canonical separation:

```text
EXPOSURE ELIGIBILITY
!= PUBLICATION MATURITY
!= PUBLIC-REFERENCE SETTLEMENT
!= CANONICAL WORLD TRUTH
```

## 2. Relationship to existing 3.0M families

Existing family responsibilities remain unchanged:

```text
LIVE_REACTION
→ immediate public/social reaction

BOARD
→ bounded thread/post/reply public discussion

NEWS
→ time-sensitive report publication under maturity policy

PUBLIC_KNOWLEDGE
→ bounded public-reference document under settlement policy
```

No family is a truth owner for another family.

Forbidden authority flow:

```text
BOARD output → NEWS truth
NEWS output → PUBLIC_KNOWLEDGE settlement
PUBLIC_KNOWLEDGE output → canonical continuity
```

Independent current projections from the same canonical/current authority remain allowed in future authorized runtimes.

## 3. First safe structural scope

The first frozen scope is:

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
```

with:

```text
mode = C
family = PUBLIC_KNOWLEDGE
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
lifetime = current projection only
persistence = none
automatic future re-entry = none
cross-turn document identity = none
network/media = none
```

Not authorized by this design:

```text
A-root PUBLIC_KNOWLEDGE
INLINE_C ancestry
multi-B settlement
NEWS-derived settlement
BOARD-derived settlement
cross-family consensus settlement
persistent wiki database
revision archive
cross-turn article identity
```

## 4. Source role

The first source-role identity is conceptually:

```text
PUBLIC_COLLABORATIVE_REFERENCE_V1
```

It means:

```text
this surface presents what a bounded public-reference source may say now
```

It does not mean:

```text
this surface contains every true fact
this surface is omniscient
this surface is canon
```

The source role constrains knowledge; it does not create knowledge.

## 5. Authority ownership

PUBLIC_KNOWLEDGE must reuse existing owners.

```text
Lineage / Handoff / Evidence
→ current source support

3M-2 Exposure Policy
→ public/source assertion eligibility

Frame / Time / Continuity and existing canonical owners
→ world/narrative facts already owned elsewhere

PUBLIC_KNOWLEDGE Settlement Policy
→ public-reference placement/status only

3M-3 Validator pattern
→ mechanically derived disposition

3M-4 Presentation Renderer
→ document DOM/CSS only

3M-6 Support Gate
→ stale current projection invalidation

3M-7 Re-entry Firewall
→ no structured source memory

3M-9 Orchestration
→ dormant on source-irrelevant turns; no cross-family truth ownership
```

PUBLIC_KNOWLEDGE must not create:

```text
second world-truth owner
second clock
second source resolver
global audience-memory DB
hidden source-history store
```

## 6. Settlement authority boundary

The main model must never self-certify settlement.

Forbidden producer fields include authoritative forms of:

```text
isSettled
isContested
isCorrected
isRetracted
safeForInfobox
safeForSummary
safeToRender
```

The canonical pattern is:

```text
UNTRUSTED DOCUMENT DRAFT
+
TRUSTED SOURCE AUTHORITY
+
3M-2 EXPOSURE CONTEXT
+
TRUSTED SETTLEMENT CONTEXT
        ↓
PUBLIC_KNOWLEDGE VALIDATOR
        ↓
VALIDATED PUBLIC-REFERENCE DOCUMENT
```

Canonical rule:

```text
MODEL CLAIM
!= VALIDATOR VERDICT
```

## 7. Trusted settlement context

A future authorized runtime requires an explicitly owned trusted input boundary, conceptually:

```text
PublicKnowledgeSettlementContextV1
```

This context may summarize already-owned public/canonical evidence relevant to reference suitability.

It must not become a new world database.

Canonical rule:

```text
SETTLEMENT CONTEXT
= EVIDENCE ABOUT PUBLIC-REFERENCE STATUS

SETTLEMENT CONTEXT
!= SOURCE OF NEW WORLD FACTS
```

If the current system cannot prove settlement evidence:

```text
UNKNOWN_SETTLEMENT
→ HOLD
```

No natural-language guessing is allowed.

## 8. Settlement state vocabulary

The first family freezes these semantic states:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
UNKNOWN_SETTLEMENT
```

These are public-reference states, not canonical truth classes.

### 8.1 SETTLED_PUBLIC_REFERENCE

The claim is eligible for ordinary public-reference presentation.

```text
SETTLED_PUBLIC_REFERENCE
!= CANONICAL_TRUE_BY_DOCUMENT_EXISTENCE
```

### 8.2 ATTRIBUTED_BUT_NOT_SETTLED

A public claim exists and may be represented only with explicit attribution/unsettled semantics.

It must not be flattened into ordinary fact prose.

### 8.3 CONTESTED_PUBLIC_RECORD

Trusted settlement evidence says the public record is materially disputed.

The projection may describe the dispute but must preserve contested status.

### 8.4 CORRECTED_CURRENT_RECORD

The currently supported public-reference statement is a correction of a prior public claim.

V1 may display the corrected current state without requiring a persistent historical revision object.

### 8.5 WITHDRAWN_OR_RETRACTED_RECORD

A prior public claim is withdrawn or retracted.

It may only appear as explicitly historical/retracted material, never as a current settled fact.

### 8.6 UNKNOWN_SETTLEMENT

Trusted settlement evidence is insufficient.

Disposition:

```text
HOLD
```

## 9. Settlement does not replace assertion mode

3M-2 assertion modes remain orthogonal:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

The first safe matrix is conservative.

```text
CONFIRMED_FACT + SETTLED_PUBLIC_REFERENCE
→ eligible ordinary reference claim

CONFIRMED_FACT + CONTESTED_PUBLIC_RECORD
→ contested presentation only

ATTRIBUTED_SOCIAL + ATTRIBUTED_BUT_NOT_SETTLED
→ attributed reference presentation only

INFERENCE_OPINION
→ not ordinary reference fact in V1
```

A future design may add explicitly attributed reception/opinion sections, but generic model inference must not become public-reference fact.

## 10. No settlement laundering

Forbidden settlement upgrades:

```text
many NEWS reports
→ SETTLED

many BOARD posts
→ SETTLED

high reaction count
→ SETTLED

old claim age
→ SETTLED

wiki-looking layout
→ SETTLED

model confidence
→ SETTLED
```

Canonical rule:

```text
REPETITION / POPULARITY / PRESENTATION
!= SETTLEMENT AUTHORITY
```

Derived-to-derived settlement is deferred while Candidate C C5 remains closed.

## 11. Document semantic shape

The first conceptual draft is:

```text
PublicKnowledgeDocumentDraftV1
  family = PUBLIC_KNOWLEDGE
  sourceAuthorityRef
  subject
  title
  summaryClaims[]
  infoboxFacts[]
  sections[]
  categories[]
```

A section conceptually contains:

```text
sectionOrdinal
heading
claims[]
```

Each semantic claim remains independently tied to:

```text
assertion mode
exposure policy
settlement policy
```

Exact transport/schema encoding is not authorized here.

## 12. Subject and title identity

The visible title must not become an untrusted factual headline.

First V1 direction:

```text
title
= neutral subject/topic identity supplied by current source-job authority
```

Forbidden:

```text
model invents sensational title containing unsettled claim
→ title bypasses settlement policy
```

If a title itself contains a semantic proposition beyond neutral subject identity, it must be policy-bearing content and validated accordingly.

## 13. Placement restrictions by settlement state

PUBLIC_KNOWLEDGE is not flat text. Placement carries epistemic force.

### 13.1 Ordinary summary

Allowed by default only for:

```text
SETTLED_PUBLIC_REFERENCE
CORRECTED_CURRENT_RECORD
```

### 13.2 Infobox / fact table

Stricter than ordinary prose.

Allowed by default only for:

```text
SETTLED_PUBLIC_REFERENCE
CORRECTED_CURRENT_RECORD
```

Forbidden by default:

```text
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
UNKNOWN_SETTLEMENT
```

### 13.3 Attributed section/callout

May contain:

```text
ATTRIBUTED_BUT_NOT_SETTLED
```

only if attribution is explicit and validated.

### 13.4 Contested section/callout

May contain:

```text
CONTESTED_PUBLIC_RECORD
```

only with visible contested semantics.

### 13.5 Correction/history callout

May contain:

```text
WITHDRAWN_OR_RETRACTED_RECORD
```

only as meta-history of the public record, not current fact.

## 14. Categories are claims

Category membership can imply factual relationships.

Therefore:

```text
CATEGORY LABEL
!= FREE PRESENTATION DECORATION
```

A category may render only when its membership is supported by validated semantic state.

The first design must not transfer the reference module's unbounded `ALL members/items` enumeration requirement.

Canonical scaling rule:

```text
BOUNDED CATEGORY PROJECTION
NOT EXHAUSTIVE WORLD ENUMERATION
```

## 15. Infobox is not a shortcut around policy

The Namuwiki reference usefully separates infobox presentation, but a SimCore infobox is semantically strong.

Every infobox value must independently satisfy:

```text
source support
+ exposure
+ settlement
```

Forbidden:

```text
claim fails body settlement
→ copied into infobox anyway
```

## 16. Document validation granularity

The first PUBLIC_KNOWLEDGE validator should support claim-level quarantine while protecting structural coherence.

General rule:

```text
invalid claim
→ claim not copied into validated ordinary semantics
```

But some document surfaces are atomic:

```text
summary sentence
infobox row
category membership
contested callout
```

If removing one component changes the meaning materially, the whole local semantic unit must be quarantined rather than partially rendered misleading content.

This is narrower than NEWS story-atomic validation while still preventing epistemic distortion.

## 17. Validated document result

Conceptually:

```text
ValidatedPublicKnowledgeDocumentV1
  subject
  title
  validatedSummary[]
  validatedInfobox[]
  validatedSections[]
  validatedCategories[]
```

Quarantined semantic content must not be copied into ordinary presentation payload.

Diagnostics may receive bounded reason metadata only.

Canonical rule:

```text
QUARANTINED CONTENT
!= HIDDEN UI PAYLOAD
```

## 18. Presentation target

The first presentation adapter is conceptually:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
```

Possible document grammar:

```text
public-reference surface
├ title
├ settlement/source role badge
├ summary
├ optional validated infobox
├ generated table of contents
├ sections
│  ├ ordinary settled prose
│  ├ attributed callout
│  ├ contested callout
│  └ correction/history callout
└ bounded validated categories
```

Presentation state remains non-authoritative.

Examples:

```text
TOC numbering
collapsed/expanded sections
footnote numbering
responsive layout
scroll state
```

must remain presentation-only.

## 19. Source-scoped DOM/CSS

Future renderer direction:

```text
[data-simcore-source-family="public-knowledge"]
```

with source-local classes such as:

```text
sc-public-knowledge
sc-public-knowledge__title
sc-public-knowledge__summary
sc-public-knowledge__infobox
sc-public-knowledge__toc
sc-public-knowledge__section
sc-public-knowledge__callout
sc-public-knowledge__category
```

Global host selectors must not be claimed by this family.

Exact CSS/runtime mount remains unimplemented and unauthorized.

## 20. Renderer must not invent semantics

The renderer may derive presentation-only values such as:

```text
heading numbering
TOC entries
collapse state
layout density
visual icons for validator-owned settlement state
```

It must not invent:

```text
article age
edit count
view count
editor identity
source count
confidence percentage
citation count
```

unless those become separately authorized semantic fields.

## 21. Navigation model

The Namuwiki reference strongly supports navigation as projection replacement.

First safe rule:

```text
NAVIGATION INTENT
→ current source-job authority resolves target
→ generate fresh current projection
→ replace active public-reference view
```

The renderer itself must not mutate canonical world state.

The first design does not require old document retrieval.

Therefore:

```text
same-session/new-request navigation target
may request a fresh projection

old document object
is not automatically revived
```

## 22. Navigation identity

Presentation text must not automatically become stable target identity.

Preferred future contract:

```text
intent type
+ validated/opaque current target ref when available
+ display label
```

If no stable target authority exists, navigation may operate as a fresh current query label only and must not imply cross-turn object identity.

## 23. Search is target selection, not archive retrieval

A wiki-like search control may eventually mean:

```text
WHAT PUBLIC-REFERENCE SUBJECT TO PROJECT NOW
```

It must not silently mean:

```text
search persistent PUBLIC_KNOWLEDGE history
```

Current design keeps:

```text
PUBLIC_KNOWLEDGE HISTORY STORE = NONE
PUBLIC_KNOWLEDGE RETRIEVAL = NONE
```

## 24. Candidate C reassessment

The first design remains snapshot-only.

```text
cross-turn survival = no
stable document identity = no
item mutation = no
append/merge = no
derived-to-derived settlement = no
future context re-entry = no
partial descendant survival = no
async semantic target = no
```

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

Candidate C must be reassessed if future requirements add:

```text
persistent article identity
revision history
edit one section/claim
cross-turn related-document graph
old article retrieval
PUBLIC_KNOWLEDGE → future context re-entry
NEWS/BOARD → PUBLIC_KNOWLEDGE derived lineage
async media attached to exact document version
```

## 25. Invalidation

PUBLIC_KNOWLEDGE inherits 3M-6 support-at-use invalidation.

```text
sourceAuthorityRef matches current trusted authority
→ support current

sourceAuthorityRef missing/mismatched
→ whole current projection invalid
```

Do not partially salvage a stale document in V1.

Separate axes remain separate:

```text
SOURCE INVALIDATION
!= SETTLEMENT QUARANTINE
!= PRESENTATION FAILURE
```

## 26. Corrections without revision history

V1 may represent a current correction when trusted current settlement context says a correction exists.

This does not require:

```text
find old generated article
mutate old generated article
preserve revision chain
```

The current projection simply renders the supported current correction semantics.

Persistent article revision remains a Candidate C follow-up.

## 27. Contested material

The validator must never derive `CONTESTED` by freeform contradiction detection over arbitrary prose and claim that semantic proof is complete.

Canonical caveat:

```text
MACHINE-CHECKABLE CONTESTED DISPOSITION
!= MACHINE-PROVEN NATURAL-LANGUAGE CONTRADICTION
```

Trusted settlement evidence must provide the necessary contested basis.

Unknown conflict state fails closed.

## 28. No derived-family consensus in V1

The family must not scan old LIVE_REACTION / BOARD / NEWS outputs to estimate public consensus.

```text
new history scans = 0
source archive scan = 0
NEWS repetition count = 0
BOARD popularity count = 0
```

This preserves 3M-7 and 3M-9.

## 29. Media boundary

Images, avatars, remote assets, external links, remote fonts, and network enrichment are not part of first semantic correctness.

```text
SEMANTIC DOCUMENT VALIDITY
!= MEDIA MATERIALIZATION SUCCESS
```

If remote/generated media is later attached to a specific persistent document version, Candidate C C8 and external-materialization design must be opened first.

## 30. Context participation

The first family inherits:

```text
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
```

A visible wiki document does not become future model memory merely because the UI remains visible.

```text
VISIBLE DOCUMENT
!= MODEL CONTEXT MEMORY
```

## 31. Performance boundary

First-major performance principles remain binding:

```text
new auxiliary model calls = 0
new network calls = 0
new history scans = 0
new persistent writes = 0
new timers/polling = 0
background workers = 0
```

Future runtime must define bounded hard caps for at least:

```text
max sections
max claims
max infobox rows
max categories
max aggregate semantic chars
max validator receipt entries
```

Do not import unbounded `ALL items/members` enumeration from the reference.

## 32. Source-irrelevant baseline

PUBLIC_KNOWLEDGE must remain dormant when no current authorized source job selects it.

Ordinary A-mode/general chat must not pay PUBLIC_KNOWLEDGE semantic cost merely because a prior document existed.

```text
NO CURRENT PUBLIC_KNOWLEDGE JOB
→ NO DOCUMENT GENERATION
→ NO SETTLEMENT VALIDATION
→ NO DOCUMENT HISTORY SCAN
→ NO DOCUMENT DOM WORK
```

## 33. First-family fail-closed rules

Fail closed when:

```text
source authority unavailable
exposure unknown/denied
settlement context unavailable
settlement state unknown
unsettled content targets ordinary fact surface
contested content loses contested marker
retracted claim targets current fact surface
navigation requires nonexistent persistent identity
```

Fallback must not silently upgrade content to ordinary fact prose.

## 34. BLOCKER / WATCH / DEFER

### BLOCKER

```text
BLOCKER · PUBLIC_KNOWLEDGE_BECOMES_SECOND_WORLD_TRUTH_OWNER
BLOCKER · NEWS_REPETITION_UPGRADES_SETTLEMENT
BLOCKER · DERIVED_FAMILY_OUTPUT_BECOMES_SETTLEMENT_AUTHORITY
BLOCKER · MODEL_SELF_CERTIFIES_SETTLEMENT
BLOCKER · TITLE_OR_INFOBOX_BYPASSES_SETTLEMENT_POLICY
BLOCKER · CONTESTED_CONTENT_RENDERED_AS_ORDINARY_FACT
BLOCKER · RETRACTED_CONTENT_RENDERED_AS_CURRENT_FACT
BLOCKER · PUBLIC_KNOWLEDGE_HISTORY_AUTO_REENTERS_PROMPT
BLOCKER · RENDERER_NAVIGATION_MUTATES_CANONICAL_WORLD_STATE
BLOCKER · UNBOUNDED_EXHAUSTIVE_CATEGORY_ENUMERATION
```

### WATCH

```text
WATCH · SETTLEMENT_BASIS_NOT_MACHINE_PROVEN_FROM_ARBITRARY_PROSE
WATCH · PARTIAL_DOCUMENT_QUARANTINE_CAN_DISTORT_LOCAL_MEANING
WATCH · SOURCE_PERSONA_CAN_BE_MISTAKEN_FOR_TRUTH_AUTHORITY
WATCH · DOCUMENT_NAVIGATION_CAN_CREATE_STABLE_IDENTITY_PRESSURE
WATCH · INFOBOX_PRESENTATION_HAS_HIGH_EPISTEMIC_FORCE
```

### DEFER

```text
DEFER · PERSISTENT_DOCUMENT_IDENTITY
DEFER · DOCUMENT_REVISION_HISTORY
DEFER · CROSS_TURN_DOCUMENT_RETRIEVAL
DEFER · RELATED_RECENT_AUTO_SUGGESTION_GRAPH
DEFER · NEWS_TO_PUBLIC_KNOWLEDGE_DERIVED_LINEAGE
DEFER · CROSS_FAMILY_SETTLEMENT_CONSENSUS
DEFER · EXTERNAL_MEDIA_MATERIALIZATION
DEFER · USER_EDITABLE_PUBLIC_KNOWLEDGE
DEFER · A_ROOT_PUBLIC_KNOWLEDGE
DEFER · INLINE_C_PUBLIC_KNOWLEDGE
DEFER · MULTI_B_PUBLIC_KNOWLEDGE
```

## 35. Product identity summary

The family should feel like:

```text
not a live reaction
not a thread
not a news report

but

a public collaborative reference view
that visibly preserves whether material is
settled, attributed, contested, corrected, or withdrawn
```

The presentation may look authoritative; the architecture must remain epistemically humble.

## 36. Follow-up design checkpoints

The overall PUBLIC_KNOWLEDGE design program may proceed as:

```text
PK-0  Master Design / Settlement Architecture       ← THIS DOCUMENT
PK-1  Settlement Policy and Trusted Evidence Contract
PK-2  Document Semantic Schema + Validator
PK-3  Placement Rules + Contested/Correction Semantics
PK-4  Presentation Renderer + Intent-only Navigation
PK-5  Integration / Performance / Source-Irrelevant Baseline
PK-6  Convergence / Runtime-Validation Protocol
```

All checkpoints remain design-only until separately authorized otherwise.

## 37. First next checkpoint

The next narrow design step should be:

```text
PK-1 · Settlement Policy and Trusted Evidence Contract
```

It must answer precisely:

```text
what trusted evidence is sufficient for each settlement state?
who produces that evidence?
what combinations are ALLOW / HOLD / DENY?
how do correction/retraction/contestation states compose with exposure and assertion mode?
```

Do not design renderer details before this policy is frozen.

## 38. Frozen verdict

```text
PUBLIC_KNOWLEDGE_MASTER_DESIGN = FROZEN
FIRST_SCOPE = DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
SOURCE_ROLE = PUBLIC_COLLABORATIVE_REFERENCE_V1
SETTLEMENT = NEW ORTHOGONAL POLICY AXIS
SETTLEMENT_OWNER = VALIDATOR / TRUSTED SETTLEMENT CONTEXT
CANONICAL_WORLD_TRUTH_OWNER = UNCHANGED
NEWS_REPETITION_SETTLEMENT = FORBIDDEN
PERSISTENCE = NONE
AUTOMATIC_REENTRY = NONE
DOCUMENT_HISTORY = NONE
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
NEXT = PK-1 SETTLEMENT POLICY + TRUSTED EVIDENCE CONTRACT
```
