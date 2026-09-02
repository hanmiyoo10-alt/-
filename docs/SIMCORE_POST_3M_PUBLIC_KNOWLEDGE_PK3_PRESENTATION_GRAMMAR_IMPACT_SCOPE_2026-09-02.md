# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-3 Presentation Grammar Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-3 IMPACT SCOPE FROZEN · PUBLIC_REFERENCE_DOCUMENT_V1 PRESENTATION SEAM SELECTED · STATUS-PRESERVING UI REQUIRED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-3 · PRESENTATION · DOM/CSS · ACCESSIBILITY · IMPACT SCOPE**

## 0. Purpose

PK-0 froze the PUBLIC_KNOWLEDGE settlement family.
PK-1 froze current-projection settlement-context authority.
PK-2 froze the validated public-reference document and assertion-level validator contract.

PK-3 now scopes the first presentation seam for that validated document.

Canonical question:

```text
How may a bounded validated PUBLIC_KNOWLEDGE projection
look like a readable public-reference document
without laundering reference state,
inventing completeness,
or creating new source facts?
```

This is design-only.

It does not implement DOM/CSS, host mounting, runtime adapters, prompt transport, persistence, navigation, revision history, citations, metrics, media, network calls, model calls, or release changes.

## 1. Selected seam

Frozen first adapter direction:

```text
ValidatedPublicKnowledgeDocumentV1
+
trusted presentation target label material
        ↓
PUBLIC_REFERENCE_DOCUMENT_V1
        ↓
status-preserving presentation read model
        ↓
Source Presentation Host
        ↓
PUBLIC_KNOWLEDGE-scoped DOM + CSS
```

The renderer consumes only validated semantic content and trusted display-label material bound to the same `targetRef`.

Raw draft content, quarantine payload, raw settlement basis refs, and validation receipts are not content sources for the renderer.

## 2. Authority boundary

Presentation may:

```text
select layout
render trusted target displayLabel
map fixed sectionKind values to localized display headings
build a TOC from sections that actually exist in the validated document
create presentation-only dense indices
add non-semantic punctuation and icons
apply status-preserving visual treatment
manage view-local expansion/focus/scroll state
```

Presentation may not:

```text
change referenceState
change assertion mode
change sectionKind
rewrite claim certainty
move contested/withdrawn content into fact-like placement
invent citations or footnotes
invent revision numbers
invent page views or popularity
invent source prestige
invent completeness
recover quarantined content
persist page identity
```

Canonical rule:

```text
PRESENTATION MAY REFORMAT
PRESENTATION MUST NOT REAUTHOR PUBLIC-REFERENCE SEMANTICS
```

## 3. First adapter identity

Frozen first adapter key:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
```

Recommended first presentation policy:

```text
family = PUBLIC_KNOWLEDGE
adapterKey = PUBLIC_REFERENCE_DOCUMENT_V1
placementIntent = SOURCE_LOCAL_ADJACENT
themePolicy = HOST_INHERIT
interactionPolicy = VIEW_LOCAL_ONLY
```

No brand-specific wiki clone is selected.

`PUBLIC_REFERENCE_DOCUMENT_V1` is a generic reference-document grammar.

## 4. Trusted title seam

PK-2 intentionally excludes a model-authored freeform document title.

PK-3 therefore needs only trusted presentation target label material derived from the already-authoritative target context.

Conceptual view input:

```text
PublicKnowledgePresentationTargetV1
  targetRef
  displayLabel
```

Rules:

```text
presentation targetRef must exact-match validated document targetRef
renderer cannot rewrite displayLabel into a stronger identity claim
missing trusted displayLabel does not authorize a guessed title
```

This object is presentation material, not a new identity store.

## 5. Section grammar impact

PK-2 section roles remain authoritative:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

PK-3 may map them to readable/localized heading labels.

It may not create semantic freeform headings that imply new topic structure.

First fixed visual section order:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

Only sections with validated assertions are represented.

Section absence must not be rendered as evidence that the world has no such information.

## 6. TOC impact

A table of contents is presentation-derived and may list only present validated sections.

Safe TOC material:

```text
fixed section display label
view-local anchor
```

Forbidden TOC material:

```text
hidden assertion count
quarantine count
completeness percentage
revision metadata
source-count metadata
world-level absence claims
```

No hidden section may appear merely because the draft or receipt knew it existed.

## 7. Reference-state visual contract

PK-2 validator-derived states must remain visible in ordinary presentation where necessary:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

The renderer must not reduce all five states to identical prose styling.

First impact direction:

```text
SETTLED
→ may use ordinary reference-body treatment

ATTRIBUTED
→ mandatory textual attribution/status treatment

CONTESTED
→ mandatory textual contested treatment

CORRECTED
→ mandatory textual corrected-current treatment

WITHDRAWN
→ mandatory textual withdrawn/retracted treatment
```

Color, border, icon, font weight, or strikethrough alone is insufficient.

## 8. Status laundering blockers

Forbidden examples:

```text
CONTESTED content rendered as plain fact with only a tiny colored dot
WITHDRAWN content rendered in ordinary fact body after removing its status
ATTRIBUTED content rewritten from "A stated X" into "X"
CORRECTED content displayed as if no correction standing exists
```

Canonical rule:

```text
REFERENCE STATE IS SEMANTIC CONTENT FOR PRESENTATION PURPOSES
NOT OPTIONAL DECORATION
```

## 9. Attribution label impact

PK-2 may carry a trusted `attributionLabel?` for eligible attributed/status-bearing records.

PK-3 may render it.

If no trusted attribution label exists, presentation may use a generic fixed status phrase such as:

```text
Attributed public record
Contested public record
Withdrawn public record
```

It must not fabricate named sources such as:

```text
Officials
Experts
Major outlets
The public
```

## 10. Corrected record impact

`CORRECTED_CURRENT_RECORD` may appear in SUMMARY, PUBLIC_RECORD, or DISPUTES_AND_CORRECTIONS according to PK-2.

Its visual treatment may vary in prominence by section, but its corrected state may not disappear.

PK-3 does not imply:

```text
revision number
old revision storage
diff availability
undo availability
```

## 11. Withdrawn record impact

WITHDRAWN content represents the public record of a withdrawn/retracted claim, not a current settled fact.

The renderer must preserve readable content plus explicit withdrawn/retracted status.

Entire-content strikethrough is not sufficient as the sole status carrier and may harm accessibility/readability.

## 12. Contested record impact

CONTESTED content must remain explicitly contested.

Presentation may not select a winning side or infer confidence.

No popularity metrics, source counts, reaction counts, or visual prominence can resolve contest standing.

## 13. Assertion ordering impact

PK-2 `ordinal` is semantic structural identity but carries no chronology, importance, or settlement meaning.

Therefore PK-3 must not claim that a smaller ordinal is older, more important, or more authoritative.

First adapter should preserve validated section assertion encounter order and may derive a dense presentation-only index.

Canonical separation:

```text
assertion ordinal
!= presentation index
!= chronology
!= importance rank
```

## 14. Presentation-only indices

Conceptual local field:

```text
presentationIndex
```

It may be dense after quarantine filtering.

It must never be written back into validated semantic data or used for:

```text
source authority
settlement identity
cross-turn lookup
revision identity
reroll identity
```

## 15. DOM/CSS ownership

First root scope direction:

```text
[data-simcore-source-family="public-knowledge"]
```

Recommended family namespace:

```text
sc-pk
sc-pk__header
sc-pk__title
sc-pk__toc
sc-pk__section
sc-pk__section-heading
sc-pk__assertion
sc-pk__status
sc-pk__attribution
sc-pk__content
sc-pk__empty
```

Forbidden unscoped selectors include generic ownership of:

```text
body
article
section
.card
.content
.notice
.badge
```

Host styles may be inherited; PUBLIC_KNOWLEDGE CSS must not bleed globally.

## 16. Accessibility impact

Status must remain machine- and human-readable without color perception.

Requirements direction:

```text
semantic heading structure
nav landmark for TOC when present
textual status labels
logical source order
keyboard-safe view-local interactions
no color-only state distinction
no icon-only correction/withdrawal distinction
```

Decorative icons must not become the only carrier of semantic status.

## 17. Interaction boundary

First adapter remains:

```text
VIEW_LOCAL_ONLY
```

Potentially legal view-local behavior:

```text
TOC anchor navigation
section collapse/expand if accessibility-safe
focus/highlight
scroll state
```

Not authorized:

```text
edit
revision history
restore
undo
discussion tab
citation editor
page reroll
assertion reroll
vote
like
bookmark persistence
```

## 18. No citation invention

`settlementBasisRef` is validation join material, not a presentation citation.

Therefore PK-3 V1 has no authority to fabricate:

```text
[1]
[2]
footnotes
source URLs
reference list
publisher cards
```

A future citation/provenance contract is separate work.

## 19. No encyclopedia-completeness chrome

Because PUBLIC_KNOWLEDGE V1 is a bounded reference projection, presentation must not imply:

```text
complete article
all known facts
100% coverage
no disputes exist
no history exists
```

Forbidden ordinary UI examples:

```text
"Complete article"
"All verified facts"
"0 disputes"
"3 hidden assertions"
"80% complete"
```

## 20. Empty-state direction

If no validated assertions remain, the first ordinary full document should not mount a convincing empty encyclopedia page that implies world absence.

Preferred first behavior:

```text
NO FULL DOCUMENT MOUNT
```

or a narrowly projection-scoped neutral placeholder that does not reveal quarantine counts or imply global absence.

## 21. Renderer failure isolation

PK-2 semantics remain authoritative if PK-3 rendering fails.

Safe degradation direction:

```text
status-preserving plain text fallback
OR
no presentation mount
```

Forbidden degradation:

```text
flatten all accepted assertions into unlabeled text
```

because that could erase ATTRIBUTED / CONTESTED / CORRECTED / WITHDRAWN state.

## 22. Media boundary

PK-3 V1 remains text-first.

No automatic:

```text
hero image
portrait
logo
thumbnail
map
infobox image
```

is introduced.

Future media requires its own semantic/materialization authority.

## 23. Performance / dormancy

PUBLIC_KNOWLEDGE presentation exists only for the current active PUBLIC_KNOWLEDGE projection.

On source-irrelevant turns:

```text
PUBLIC_KNOWLEDGE DOM work = 0
PUBLIC_KNOWLEDGE presentation build = 0
PUBLIC_KNOWLEDGE history scan = 0
```

Visible old host UI must not wake a new source job.

## 24. Candidate C

PK-3 does not activate Candidate C.

No cross-turn page identity, revision identity, interaction mutation, future context re-entry, or delayed attachment is introduced.

## 25. Implementation blockers preserved

PK-3 design does not prove:

```text
active Source Presentation Host mount authority
structured sidecar transport
trusted target-label delivery path
runtime hard caps
actual DOM/CSS implementation
real accessibility behavior
```

Those remain future runtime-authority work.

## 26. Impact verdict

```text
PK-3 PRESENTATION IMPACT SCOPE
= DESIGNABLE WITHOUT RUNTIME

FIRST ADAPTER
= PUBLIC_REFERENCE_DOCUMENT_V1

STATUS-PRESERVING PRESENTATION
= REQUIRED

CITATION / REVISION / METRICS / MEDIA
= NOT AUTHORIZED BY PK-3 V1

CANDIDATE C
= NOT ACTIVATED
```

Next transaction after this impact scope:

```text
PK-3 Detailed Presentation Grammar Design
```
