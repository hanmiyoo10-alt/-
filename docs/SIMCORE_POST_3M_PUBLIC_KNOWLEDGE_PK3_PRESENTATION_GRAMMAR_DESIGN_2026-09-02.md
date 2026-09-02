# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-3 Presentation Grammar Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-3 DESIGN FROZEN · PUBLIC_REFERENCE_DOCUMENT_V1 · STATUS-PRESERVING PRESENTATION · SOURCE-SCOPED DOM/CSS · ACCESSIBILITY CONTRACT FROZEN · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-3 · PRESENTATION GRAMMAR · DOM/CSS · ACCESSIBILITY · RENDER FAILURE ISOLATION**

## 0. Purpose

PK-0 froze the PUBLIC_KNOWLEDGE family and settlement distinction.
PK-1 froze settlement-context authority.
PK-2 froze the validated document / assertion contract.
PK-3 freezes the first complete presentation grammar for those validated semantics.

Canonical problem:

```text
ValidatedPublicKnowledgeDocumentV1
+
trusted target presentation label
        ↓
status-preserving reference-document read model
        ↓
PUBLIC_REFERENCE_DOCUMENT_V1
        ↓
source-scoped DOM + CSS
```

This is design-only.

It does not implement DOM/CSS, renderer code, host mounting, structured transport, prompt changes, persistence, revision history, citations, metrics, media, search, network calls, model calls, or release changes.

## 1. Authority chain

PK-3 consumes without reopening:

```text
PK-0 PUBLIC_KNOWLEDGE Settlement Master Design
PK-1 Settlement Context Authority
PK-2 Document Sidecar + Validator Contract
PK-3 Presentation Grammar Impact Scope
3M-4 Presentation Renderer Architecture
3M-6 current-projection support invalidation
3M-7 zero automatic structured-source re-entry
3M-9 source-irrelevant dormancy/current-projection cost
```

Canonical separation:

```text
WORLD / CURRENT FACT AUTHORITY
!=
EXPOSURE AUTHORITY
!=
SETTLEMENT BASIS AUTHORITY
!=
REFERENCE VALIDATOR
!=
PRESENTATION RENDERER
```

## 2. First supported presentation slice

Frozen first presentation scope:

```text
mode = C
family = PUBLIC_KNOWLEDGE
semantic input = ValidatedPublicKnowledgeDocumentV1
adapter = PUBLIC_REFERENCE_DOCUMENT_V1
placementIntent = SOURCE_LOCAL_ADJACENT
themePolicy = HOST_INHERIT
interactionPolicy = VIEW_LOCAL_ONLY
lifetime = CURRENT_PROJECTION_ONLY
```

No durable page, platform brand, revision UI, citations, metrics, media, or semantic mutations are introduced.

## 3. Canonical pipeline

```text
ValidatedPublicKnowledgeDocumentV1
        +
PublicKnowledgePresentationTargetV1
        ↓
SourcePresentationPolicyV1
        ↓
PresentationRendererRegistry
        ↓
PUBLIC_REFERENCE_DOCUMENT_V1
        ↓
PublicKnowledgeDocumentPresentationModelV1
        ↓
Source Presentation Host
        ↓
[data-simcore-source-family="public-knowledge"]
```

Only validated assertions may enter ordinary content presentation.

## 4. Trusted target presentation input

PK-2 intentionally does not allow the model to author document identity/title.

Frozen conceptual target view input:

```text
PublicKnowledgePresentationTargetV1
  targetRef
  displayLabel
```

Requirements:

```text
targetRef exact-matches validated document targetRef
displayLabel originates from trusted target context
```

If the target join fails:

```text
NO PUBLIC_REFERENCE_DOCUMENT_V1 MOUNT
```

The renderer does not guess from assertion text, host transcript, prior pages, or targetRef formatting.

## 5. Presentation read model

Frozen conceptual V1 read model:

```text
PublicKnowledgeDocumentPresentationModelV1
  kind = PUBLIC_REFERENCE_DOCUMENT
  renderInstanceKey
  targetRef
  title
  toc?
  sections[]
```

This object is:

```text
EPHEMERAL
READ_ONLY
NONCANONICAL
NONPERSISTENT
```

It is not Source Intelligence semantic state and is never re-entered into future model context by default.

## 6. Title grammar

`title` is the trusted target `displayLabel` only.

Conceptual DOM:

```text
header.sc-pk__header
  h1.sc-pk__title
```

Forbidden title enrichment:

```text
"Official"
"Verified"
"Complete encyclopedia"
"Breaking"
"Definitive"
```

unless separately authorized by future trusted semantics.

No model-authored subtitle exists in V1.

## 7. Fixed section roles

PK-2 section kinds remain unchanged:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

First presentation order is fixed:

```text
1 SUMMARY
2 PUBLIC_HISTORY
3 PUBLIC_RECORD
4 DISPUTES_AND_CORRECTIONS
```

This is presentation order only.

It does not mean:

```text
truth strength order
chronology order
world importance order
source prestige order
```

## 8. Fixed display labels

PK-3 may map fixed section kinds to locale-appropriate labels.

Conceptual English labels:

```text
SUMMARY                  → Summary
PUBLIC_HISTORY           → Public history
PUBLIC_RECORD            → Public record
DISPUTES_AND_CORRECTIONS → Disputes and corrections
```

A localization system may translate those labels.

The model does not supply heading text.

## 9. Section omission

Only sections containing accepted validated assertions are mounted.

Canonical rule:

```text
ABSENT SECTION
!=
NO SUCH WORLD INFORMATION EXISTS
```

The renderer does not create empty semantic sections merely to resemble an encyclopedia template.

## 10. TOC read model

Frozen conceptual V1:

```text
PublicKnowledgeTocViewV1
  entries[]

PublicKnowledgeTocEntryViewV1
  sectionKind
  displayLabel
  anchorKey
```

TOC is built only from mounted sections.

No assertion counts are included.

## 11. TOC grammar

Conceptual DOM:

```text
nav.sc-pk__toc[aria-label="Contents"]
  a.sc-pk__toc-link
```

TOC may provide anchor navigation only.

It may not expose:

```text
hidden sections
quarantine count
assertion count
completeness percentage
revision count
source count
```

## 12. Section read model

Frozen conceptual V1:

```text
PublicKnowledgeSectionPresentationV1
  sectionKind
  displayLabel
  anchorKey
  assertions[]
```

Conceptual DOM:

```text
section.sc-pk__section[data-section-kind="..."]
  h2.sc-pk__section-heading
  div.sc-pk__assertions
```

## 13. Assertion read model

Frozen conceptual V1:

```text
PublicKnowledgeAssertionPresentationV1
  presentationIndex
  ordinal
  sectionKind
  mode
  referenceState
  statusLabel?
  attributionLabel?
  content
```

Fields derive only from validated semantics plus fixed presentation labels.

## 14. Presentation index

`presentationIndex` is a dense view-local position after validation filtering.

It is not semantic identity.

```text
presentationIndex
!= ordinal
!= chronology
!= importance
!= settlement rank
```

It is not written back to the validated document.

## 15. Assertion order

Within each mounted section, first V1 preserves the validated section array's encounter order.

The renderer does not sort by:

```text
referenceState
content text
attribution source
ordinal magnitude as authority
popularity
```

`ordinal` remains preserved identity only.

## 16. Common assertion DOM

Conceptual base grammar:

```text
div.sc-pk__assertion[data-reference-state="..."]
  div.sc-pk__status?        
  div.sc-pk__attribution?   
  p.sc-pk__content
```

The status and attribution rows exist only according to the state rules below.

Content is inserted as escaped/plain text semantics.

Trusted HTML interpolation from model-generated content is forbidden.

## 17. SETTLED_PUBLIC_REFERENCE grammar

Settled content may use ordinary reference-body treatment.

Conceptual presentation:

```text
content
```

A visible `Settled` badge is optional in V1 because the section/ordinary body grammar may carry the default state.

However renderer styling must not imply stronger properties such as:

```text
canonical omniscience
permanence
complete coverage
```

`SETTLED_PUBLIC_REFERENCE` means settlement under the current PUBLIC_KNOWLEDGE contract only.

## 18. ATTRIBUTED_BUT_NOT_SETTLED grammar

Attributed content requires explicit textual status semantics.

Frozen minimum presentation:

```text
statusLabel = "Attributed public record"
```

If trusted `attributionLabel` exists, renderer may also show it.

Conceptual:

```text
[Attributed public record]
Source label: <trusted attributionLabel>
<content>
```

Forbidden transformation:

```text
"A stated X"
→
"X"
```

Presentation does not strip attribution qualifiers from the validated content.

## 19. CONTESTED_PUBLIC_RECORD grammar

Contested content requires prominent textual status:

```text
statusLabel = "Contested public record"
```

Conceptual DOM:

```text
div.sc-pk__assertion[data-reference-state="contested"]
  div.sc-pk__status
  div.sc-pk__attribution?
  p.sc-pk__content
```

The renderer must not visually pick a winning side.

No confidence meter is introduced.

## 20. CORRECTED_CURRENT_RECORD grammar

Corrected content requires textual corrected state in every legal section.

Frozen minimum:

```text
statusLabel = "Corrected current record"
```

In SUMMARY the label may be compact but must remain perceivable.

In DISPUTES_AND_CORRECTIONS it may be visually more explanatory.

Neither form authorizes:

```text
revision number
previous text
change diff
restore action
```

## 21. WITHDRAWN_OR_RETRACTED_RECORD grammar

Withdrawn/retracted content requires explicit textual state:

```text
statusLabel = "Withdrawn or retracted public record"
```

The body remains readable as historical/public-record content.

Forbidden sole treatment:

```text
strike through all content and omit text status
```

Strikethrough may be used only as supplemental decoration if accessibility remains intact.

## 22. Status label source

Status-label text is fixed presentation vocabulary mapped from validator-owned `referenceState`.

The model does not author status wording.

This prevents model variation such as:

```text
"mostly verified"
"probably disputed"
"basically corrected"
```

from mutating the state contract.

## 23. Color / icon policy

Visual distinctions may use:

```text
border
background treatment
icon
font emphasis
spacing
```

but these are supplementary.

Canonical accessibility rule:

```text
COLOR OR ICON ALONE
MUST NOT CARRY REFERENCE STATE
```

Text status remains the minimum for non-settled states.

## 24. Attribution presentation

Trusted `attributionLabel` may appear only when present in validated semantics.

Example:

```text
Attributed public record
Public agency statement
<content>
```

If absent, a generic fixed status label is sufficient.

Renderer must not invent:

```text
Officials
Experts
Press
Major media
Community consensus
```

## 25. No citation presentation in V1

PK-3 does not consume `settlementBasisRef` as user-visible citation data.

Forbidden invented UI:

```text
[1]
[2]
Sources
References
External links
publisher URL
citation tooltip
```

unless a future citation/provenance contract supplies renderable citation semantics.

## 26. No revision UI

PUBLIC_REFERENCE_DOCUMENT_V1 has no:

```text
history tab
last edited time
revision number
compare revisions
undo
restore
editor identity
```

Current corrected status is not equivalent to revision history.

## 27. No metrics chrome

PUBLIC_KNOWLEDGE V1 does not invent:

```text
page views
watchers
edit count
quality score
confidence score
source count
trend rank
likes
bookmarks
```

SOCIAL_FEED metrics remain valid future source-local capabilities elsewhere but do not become PUBLIC_KNOWLEDGE settlement or presentation authority.

## 28. No completeness chrome

Forbidden:

```text
100% complete
all known facts
verified article
0 disputes
3 facts hidden
2 claims quarantined
```

The first document may appear polished and readable but remains:

```text
BOUNDED REFERENCE PROJECTION
```

## 29. Empty document policy

When the validated PUBLIC_KNOWLEDGE projection has no accepted assertions:

```text
FULL REFERENCE DOCUMENT MOUNT = NONE
```

The renderer must not create an empty page whose blank sections imply world absence.

A host may choose a generic projection-local no-content state outside the full document grammar, but it must not expose quarantine counts.

## 30. No receipt recovery

Renderer does not read validation receipts to reconstruct content.

Forbidden:

```text
receipt says ordinal 3 was denied
→ show "hidden fact" placeholder
```

or:

```text
receipt sectionKind exists
→ mount empty section
```

Validated semantic content is the only ordinary content source.

## 31. No raw-draft recovery

Renderer never receives or consults model draft text after validation.

```text
RAW DRAFT
→ PRESENTATION FORBIDDEN
```

This prevents visual recovery of quarantined claims.

## 32. Section-collapse view state

Optional section collapse/expand may be legal as view-local state if implemented accessibly.

It must be:

```text
ephemeral
nonpersistent
nonsemantic
non-model-context
```

Collapsing a section does not change its settlement or source state.

## 33. TOC interaction

TOC anchor navigation is legal view-local interaction.

It does not create:

```text
navigation history authority
page router identity
cross-turn anchor identity
```

## 34. Render instance identity

`renderInstanceKey` may exist for current UI lifecycle management.

It is:

```text
EPHEMERAL UI KEY
```

not:

```text
durable page ID
canonical document ID
Candidate C derived identity
```

## 35. Source-scoped DOM root

Frozen root:

```text
[data-simcore-source-family="public-knowledge"]
```

Recommended top-level DOM:

```text
article.sc-pk
  header.sc-pk__header
  nav.sc-pk__toc?
  div.sc-pk__body
    section.sc-pk__section*
```

## 36. CSS namespace

Frozen first namespace direction:

```text
sc-pk
sc-pk__header
sc-pk__title
sc-pk__toc
sc-pk__toc-list
sc-pk__toc-link
sc-pk__body
sc-pk__section
sc-pk__section-heading
sc-pk__assertions
sc-pk__assertion
sc-pk__status
sc-pk__attribution
sc-pk__content
```

## 37. Global selector prohibition

PUBLIC_KNOWLEDGE CSS must not claim generic host selectors such as:

```text
body
article
section
h1
h2
p
.card
.content
.notice
.badge
```

without the PUBLIC_KNOWLEDGE root scope.

Canonical rule:

```text
SOURCE PRESENTATION STYLE
MUST NOT BECOME HOST GLOBAL STYLE
```

## 38. Theme policy

First adapter uses:

```text
HOST_INHERIT
```

It may use source-local CSS variables/fallbacks when implementation is authorized, but must not force a global theme.

No external CDN theme dependency is required.

## 39. Accessibility heading structure

Recommended hierarchy:

```text
h1 = trusted document title
h2 = mounted fixed section headings
```

Status labels are not headings unless a future structure specifically requires them.

Heading level must not be selected merely for visual size.

## 40. Accessibility TOC

TOC uses a navigation landmark with a readable label.

Links target local mounted section anchors.

If there is only one mounted section, implementation may omit TOC to avoid redundant chrome.

That choice is presentation-local and does not imply semantic difference.

## 41. Accessibility status semantics

Non-settled states must be perceivable in text before or adjacent to their assertion body.

Screen-reader source order should encounter the status before or with the content rather than after an ambiguous fact-like sentence.

## 42. Accessible collapsed sections

If collapse/expand is implemented later under PK-3 authority, controls must expose expanded/collapsed state and remain keyboard operable.

No semantic content may disappear permanently because a view state cannot be restored.

## 43. Plain-text fallback grammar

If rich DOM construction fails but validated semantics remain available, the first safe fallback may render status-preserving plain text.

Conceptual fallback:

```text
<title>

Summary
<settled content>

Disputes and corrections
[Contested public record]
<content>

[Withdrawn or retracted public record]
<content>
```

Mandatory rule:

```text
FALLBACK MUST PRESERVE NON-SETTLED STATUS LABELS
```

## 44. No unsafe flat-text fallback

Forbidden fallback:

```text
<title>
<all accepted assertion strings concatenated without status>
```

because status-bearing content could be laundered into ordinary fact-like prose.

## 45. Renderer failure isolation

Renderer failure does not mutate validated semantics.

```text
PRESENTATION FAILURE
!=
SETTLEMENT FAILURE
!=
SOURCE INVALIDATION
```

Safe outcomes:

```text
status-preserving plain-text fallback
or
no mount
```

## 46. Host mount authority remains unresolved runtime work

PK-3 selects the grammar but does not prove the actual host insertion seam.

Existing blocker remains conceptually:

```text
ACTIVE_SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY_UNPROVEN
```

No guessed selector or hidden-tag workaround is authorized.

## 47. Structured transport remains runtime work

PK-3 assumes a validated semantic sidecar can reach the presentation adapter.

It does not authorize in-band hidden JSON, magic tags, DOM scraping, or transcript reconstruction.

## 48. Media boundary

PUBLIC_REFERENCE_DOCUMENT_V1 is text-first.

No automatic:

```text
infobox image
portrait
logo
map
hero image
thumbnail
```

is part of PK-3.

A later image/media system must separately define semantic authority, optional materialization, failure handling, and Candidate C implications where relevant.

## 49. External links boundary

No arbitrary external link is derived from assertion text.

A future citation/navigation contract may introduce trusted links, but PK-3 V1 does not.

## 50. Security / text insertion

Model-generated accepted content is rendered as text/escaped content.

Forbidden:

```text
innerHTML from model content
trusted HTML interpolation
scriptable markdown passthrough without sanitization contract
```

PK-3 design does not select a markdown parser.

## 51. Long content / visual truncation

A future implementation may apply purely visual bounded truncation only if the full accepted semantic content remains recoverable within the current view without rewriting it.

Truncation must not remove the qualifier that carries attribution/contest/correction/withdrawal meaning.

First safest implementation target remains full accepted plain text within runtime caps.

## 52. Source-irrelevant dormancy

When current orchestration decision is not PUBLIC_KNOWLEDGE ACTIVE:

```text
PUBLIC_KNOWLEDGE presentation build = 0
PUBLIC_KNOWLEDGE DOM mount = 0
PUBLIC_KNOWLEDGE history scan = 0
PUBLIC_KNOWLEDGE persistence = 0
```

Old visible cards do not wake a new source job.

## 53. Current-projection lifetime

```text
CURRENT_PROJECTION_ONLY
NO PAGE STORE
NO AUTOMATIC RE-ENTRY
NO REVISION HISTORY
NO CROSS-TURN VIEW STATE
```

A rendered page is not future model memory.

## 54. Candidate C status

PK-3 does not activate Candidate C.

```text
C1 cross-turn survival       = NO
C2 durable derived identity  = NO
C3 mutation                  = NO
C4 append / revision         = NO
C5 derived lineage           = NO
C6 future re-entry           = NO
C7 partial survival          = NO
C8 delayed side effect       = NO
```

## 55. Candidate C trigger examples remain future work

Examples:

```text
same PUBLIC_KNOWLEDGE page persists next turn
revision history
edit one old assertion
restore prior revision
stable cross-turn internal links
async media attaches to exact old page
NEWS automatically propagates settlement into durable page state
```

These require explicit reassessment.

## 56. Future citation work

PK-3 deliberately leaves room for a later citation/provenance checkpoint.

Such a checkpoint would need to answer at least:

```text
what is a renderable citation identity?
what trusted label/URL/document metadata may be shown?
how does citation support relate to settlementBasisRef?
can multiple sources support one assertion?
what happens when a citation is corrected or withdrawn?
```

PK-3 does not pre-answer these by abusing internal basis refs.

## 57. Future richer document grammar

Potential future capabilities not forbidden forever but inactive now:

```text
trusted infobox fields
citation list
revision history
internal links
media
source comparison
page metrics
search/navigation
```

They require explicit semantic authority rather than renderer invention.

## 58. Main model / renderer ownership

Main model remains Semantic Renderer for natural-language assertion content upstream.

PK-3 Presentation Renderer owns only validated display grammar.

Canonical rule:

```text
MAIN MODEL
= SEMANTIC CONTENT PRODUCER

SIMCORE VALIDATOR
= ELIGIBILITY / REFERENCE STATE

PK-3 PRESENTATION RENDERER
= READ-ONLY VISUAL GRAMMAR
```

## 59. Required future implementation evidence

PK-3 DESIGN PASS does not equal runtime proof.

Before runtime readiness, evidence is still required for:

```text
actual structured transport
actual host mount authority
runtime hard caps
CSS isolation
accessible status behavior
plain-text fallback
renderer failure isolation
source-irrelevant zero presentation work
```

## 60. Design verdict

```text
PK-3 PRESENTATION GRAMMAR
= FROZEN

FIRST ADAPTER
= PUBLIC_REFERENCE_DOCUMENT_V1

TITLE
= TRUSTED TARGET DISPLAY LABEL ONLY

TOC
= PRESENT VALIDATED SECTIONS ONLY

NON-SETTLED STATUS
= TEXTUALLY PRESERVED

CITATIONS / REVISIONS / METRICS / MEDIA
= NOT ACTIVE IN V1

CANDIDATE C
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED
```

## 61. Next checkpoint

After PK-3, the next PUBLIC_KNOWLEDGE design checkpoint should reassess one of the remaining family gaps before convergence.

Recommended next checkpoint:

```text
PK-4 · Citation / Provenance Boundary
```

Purpose:

```text
define whether and how a PUBLIC_KNOWLEDGE assertion may expose trusted source/citation semantics
without equating settlementBasisRef with a user-visible citation
```

If citation is intentionally deferred from the first family, PK-4 may instead formalize that defer and move to family convergence.
