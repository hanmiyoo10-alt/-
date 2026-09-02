# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-4 Citation / Provenance Boundary Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-4 DESIGN FROZEN · USER-VISIBLE CITATION PROVENANCE CONTRACT FROZEN · EXACT CLAIM-SUPPORT JOIN · PRESENTATION FOOTNOTE IDENTITY NONCANONICAL · CURRENT-PROJECTION ONLY · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-4 · CITATION · PROVENANCE · FOOTNOTE · REFERENCES · SOURCE SUPPORT**

## 0. Purpose

PK-0 froze PUBLIC_KNOWLEDGE settlement semantics.
PK-1 froze settlement-context authority.
PK-2 froze the validated document/assertion contract.
PK-3 froze status-preserving presentation and intentionally left citations disabled.

PK-4 freezes the first user-visible citation/provenance contract that can add bounded `[1]`-style support markers and a references surface without turning citation count, source prestige, URLs, or internal settlement references into truth authority.

This is design-only.

It does not implement producer code, runtime schemas, prompt transport, parsers, DOM/CSS, URL fetches, browsers, source retrieval, persistence, cross-turn citation identity, revision history, Candidate C, or release changes.

## 1. Canonical separation

```text
WORLD / CURRENT FACT AUTHORITY
!=
EXPOSURE AUTHORITY
!=
SETTLEMENT BASIS AUTHORITY
!=
PK-2 REFERENCE STATE AUTHORITY
!=
PK-4 USER-VISIBLE CITATION AUTHORITY
!=
PK-3 PRESENTATION NUMBERING
```

Canonical rule:

```text
CITATION EXISTS
!= CLAIM IS TRUE
!= CLAIM IS SETTLED
```

## 2. First supported scope

```text
mode = C
family = PUBLIC_KNOWLEDGE
source root = direct B root
semantic document = ValidatedPublicKnowledgeDocumentV1
citation lifetime = CURRENT_PROJECTION_ONLY
citation navigation = OPTIONAL / HOST-POLICY-BOUNDED
network retrieval = NONE
```

No A-root, INLINE_C, multi-B consensus, durable source registry, historical bibliography, revision-bound citation set, or cross-family automatic source propagation is authorized.

## 3. Canonical pipeline

```text
PK-2 validated assertion
        +
PK-2 private current claim-support join context
        +
trusted PublicKnowledgeCitationContextV1
        +
untrusted citation attachment draft
        ↓
PK-4 citation validator
        ↓
ValidatedPublicKnowledgeCitationBundleV1
        ↓
PK-3 PUBLIC_REFERENCE_DOCUMENT_V1 extension
        ↓
render-local [1] [2] markers + references list
```

PK-4 never revalidates natural-language truth by itself.

## 4. Why a claim-support join is required

A citation cannot be attached safely merely because its label looks relevant.

Forbidden inference:

```text
assertion contains "election"
+
source label contains "Election Commission"
→ attach citation
```

or:

```text
citation title resembles assertion text
→ therefore same claim
```

Canonical rule:

```text
STRING SIMILARITY
!= PROVENANCE
```

PK-4 therefore requires an exact trusted claim-support join.

## 5. `claimSupportRef`

Frozen conceptual internal reference:

```text
claimSupportRef
```

It identifies the bounded trusted public-record support object that both:

```text
PK-2 settlement/reference validation
```

and:

```text
PK-4 citation provenance
```

may refer to independently.

Important:

```text
claimSupportRef
!= settlementBasisRef
!= citationRef
!= assertion ordinal
!= page targetRef
```

It is internal join material, not ordinary presentation data.

## 6. PK-2 private citation join context

PK-4 requires a non-renderable current-projection bridge from the completed PK-2 validation.

Frozen conceptual shape:

```text
PublicKnowledgeCitationJoinContextV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  sourceAuthorityRef
  entries[]

entry:
  assertionOrdinal
  claimSupportRef
  referenceState
```

This bridge is produced from already trusted PK-2 validation joins.

It is:

```text
EPHEMERAL
NON-RENDERABLE
NONPERSISTENT
CURRENT-PROJECTION ONLY
```

It contains no assertion text.

## 7. Why the join context is not a new truth owner

The join context copies/binds already established trusted identities.

It does not:

```text
classify claims
infer equivalence
upgrade settlement
choose sources
rewrite assertions
```

Canonical rule:

```text
JOIN CONTEXT
= BOUNDED IDENTITY BRIDGE
!= SEMANTIC JUDGE
```

## 8. Trusted citation context

Frozen conceptual V1:

```text
PublicKnowledgeCitationContextV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  sourceAuthorityRef
  citations[]
```

Each entry:

```text
TrustedPublicKnowledgeCitationV1
  citationRef
  claimSupportRef
  allowedRoles[]
  sourceLabel
  recordLabel?
  locatorLabel?
  publishedAtLabel?
  trustedHref?
```

This context is trusted current authority input.

## 9. `citationRef`

`citationRef` is current-projection citation semantic identity.

Requirements:

```text
unique inside current citation context
exact-match only
bounded string / opaque identity
```

It is not:

```text
visible footnote number
URL
source name
settlement basis
persistent bibliographic ID
```

## 10. Citation display metadata

### `sourceLabel`

Minimum trusted user-visible source identity label.

Examples:

```text
Central Records Office
City Council
National League
Public Safety Agency
```

### `recordLabel`

Optional trusted public record/document label.

Examples:

```text
Public notice
Council minutes
Match report
Correction notice
Retraction statement
```

### `locatorLabel`

Optional bounded locator inside a source record.

Examples:

```text
Section 3
Item 12
Appendix B
```

It is not required to be a real-world page number.

### `publishedAtLabel`

Optional trusted display-ready date/time label supplied by time/source authority.

Renderer does not invent it.

### `trustedHref`

Optional trusted navigation metadata.

It is not required for citation validity.

## 11. URL independence

A citation without a URL can be fully valid.

```text
FICTIONAL / SIMULATED PUBLIC RECORD
+ trusted sourceLabel
+ trusted claimSupportRef
→ valid citation possible
```

PUBLIC_KNOWLEDGE is not restricted to internet documents.

## 12. No URL fetch in V1

Even when `trustedHref` exists:

```text
PK-4 VALIDATION
!= fetch URL
!= scrape URL
!= preview URL
!= confirm remote content
```

The trusted context owns that the href is renderable navigation metadata.

A future implementation must still apply host link-safety policy before making it interactive.

If host link policy rejects or cannot safely expose the href:

```text
render citation as text
```

not:

```text
drop citation semantic identity
```

## 13. Citation role vocabulary

Frozen V1 roles:

```text
SUPPORTS_PUBLIC_RECORD
ATTRIBUTES_STATEMENT
DOCUMENTS_CONTEST
DOCUMENTS_CORRECTION
DOCUMENTS_WITHDRAWAL
```

The role is an assertion→citation relationship, not a property of the citation record alone.

## 14. Untrusted citation attachment draft

Frozen conceptual V1:

```text
PublicKnowledgeCitationAttachmentDraftV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  sourceAuthorityRef
  attachments[]
```

Attachment:

```text
PublicKnowledgeCitationAttachmentEntryDraftV1
  assertionOrdinal
  citationRef
  role
```

These fields are untrusted proposals.

The producer cannot declare:

```text
isValid
isPrimarySource
isAuthoritative
provesClaim
confidence
sourcePrestige
settlementStrength
```

## 15. Attachment structural rules

Each draft attachment must have:

```text
valid assertionOrdinal
non-empty citationRef
supported role
```

Duplicate exact tuple:

```text
(assertionOrdinal, citationRef, role)
```

is structurally redundant and rejected/deduplicated according to future runtime naming, but never counted as extra support.

## 16. Assertion join

`assertionOrdinal` must exact-match an assertion in:

```text
ValidatedPublicKnowledgeDocumentV1
```

and in:

```text
PublicKnowledgeCitationJoinContextV1
```

No citation may attach to:

```text
quarantined assertion
absent assertion
old assertion from prior page
ordinal recovered from receipt
```

## 17. Claim-support exact join

For a proposed `citationRef`:

```text
citationContext.citationRef
→ claimSupportRef A

PK-2 join context assertionOrdinal
→ claimSupportRef A
```

must exact-match.

If:

```text
A != B
```

then:

```text
INVALID_CITATION_CLAIM_SUPPORT_JOIN
→ citation attachment quarantined
```

The assertion itself remains valid.

## 18. Citation role authorization

The proposed role must appear in the trusted citation record's `allowedRoles[]`.

```text
MODEL PROPOSES ROLE
+
TRUSTED CONTEXT AUTHORIZES ROLE
→ role may continue
```

Otherwise attachment is quarantined.

The model cannot turn a source that merely attributes a statement into a correction notice by choosing `DOCUMENTS_CORRECTION`.

## 19. Reference-state / citation-role compatibility

Frozen V1 ordinary matrix:

```text
SETTLED_PUBLIC_REFERENCE
  SUPPORTS_PUBLIC_RECORD   ✅

ATTRIBUTED_BUT_NOT_SETTLED
  ATTRIBUTES_STATEMENT     ✅

CONTESTED_PUBLIC_RECORD
  DOCUMENTS_CONTEST        ✅

CORRECTED_CURRENT_RECORD
  SUPPORTS_PUBLIC_RECORD   ✅
  DOCUMENTS_CORRECTION     ✅

WITHDRAWN_OR_RETRACTED_RECORD
  DOCUMENTS_WITHDRAWAL     ✅
```

All other pairs fail closed in V1.

## 20. Why corrected may have two citation roles

A corrected current record may legitimately cite:

```text
one source supporting the current corrected public record
+
one source documenting the correction relation
```

Those are different provenance semantics.

Neither creates revision history by itself.

## 21. Citation attachment disposition

Frozen conceptual outcomes:

```text
CITATION_ELIGIBLE
QUARANTINED_CITATION_UNKNOWN_REF
QUARANTINED_CITATION_CLAIM_MISMATCH
QUARANTINED_CITATION_ROLE_UNAUTHORIZED
QUARANTINED_CITATION_STATE_ROLE_MISMATCH
INVALID_CITATION_CONTEXT
UNSUPPORTED_CITATION_SCOPE
```

Exact runtime enum strings remain implementation work.

## 22. Citation failure does not quarantine assertion

Canonical invariant:

```text
PK-4 CITATION FAILURE
→ citation omitted / quarantined
→ PK-2 assertion unchanged
```

PK-4 is supplementary provenance presentation.

If the underlying source/settlement support itself becomes stale, that is handled by the existing authority/support-at-use path, not disguised as a citation-only failure.

## 23. Whole citation-context failure

Examples:

```text
wrong family
wrong schema version
targetRef mismatch
sourceAuthorityRef mismatch
stale support-at-use
```

Conceptual result:

```text
citation bundle = none
PK-2 document remains independently governed
```

No citation UI mounts.

## 24. Validated citation bundle

Frozen conceptual shape:

```text
ValidatedPublicKnowledgeCitationBundleV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  sourceAuthorityRef
  citations[]
  attachments[]
```

Validated citation:

```text
ValidatedPublicKnowledgeCitationV1
  citationRef
  sourceLabel
  recordLabel?
  locatorLabel?
  publishedAtLabel?
  trustedHref?
```

Validated attachment:

```text
ValidatedPublicKnowledgeCitationAttachmentV1
  assertionOrdinal
  citationRef
  role
```

`claimSupportRef` does not need to enter ordinary renderable citation data.

## 25. Validated citation bundle contains no settlement refs

Ordinary renderable bundle must not expose:

```text
settlementBasisRef
claimSupportRef
PK-1 basis internals
sourceAuthorityRef narrative
private evidence text
```

`sourceAuthorityRef` may remain envelope-level support identity if required by existing architecture, but it is not rendered as a citation.

## 26. Citation bundle pruning

Only citations referenced by at least one accepted validated attachment need remain in the renderable bundle.

An unused trusted citation record is not displayed simply because it exists in context.

Canonical rule:

```text
CITATION CONTEXT
!= BIBLIOGRAPHY DUMP
```

## 27. Multiple citations on one assertion

One assertion may have multiple eligible citation attachments.

Example:

```text
assertion ordinal 3
→ citation A SUPPORTS_PUBLIC_RECORD
→ citation B SUPPORTS_PUBLIC_RECORD
```

This may display multiple footnote markers.

However:

```text
citation count
!= confidence
!= consensus
!= settlement strength
```

## 28. Same citation reused across assertions

The same `citationRef` may support multiple assertions when the trusted context/claim-support joins authorize each attachment.

It remains one citation semantic record in the bundle.

No duplicate bibliography item is required merely because it is referenced twice.

## 29. No fuzzy citation deduplication

Presentation may deduplicate only by exact validated `citationRef`.

Forbidden dedupe keys:

```text
same sourceLabel
same recordLabel
same hostname
same URL text after heuristic cleanup
similar citation text
```

Those may represent distinct source records.

## 30. Footnote numbering

PK-3 extension may assign visible numbers:

```text
[1] [2] [3]
```

using exact validated citation identity.

Frozen first numbering direction:

```text
scan mounted assertions in PK-3 presentation order
scan each assertion's validated attachments in stable bundle order
first encounter of citationRef assigns next dense number
repeated citationRef reuses same number
```

This numbering is:

```text
RENDER-LOCAL
EPHEMERAL
NONSEMANTIC
```

## 31. Visible citation number is not `citationRef`

Example:

```text
citationRef = cite:public-record:abc123
visible marker = [2]
```

Next render may legally produce:

```text
visible marker = [1]
```

if other citation attachments were filtered/omitted.

No source identity changed.

## 32. Inline marker grammar

Conceptual extension:

```text
p.sc-pk__content
  text
  sup.sc-pk__citation-marker
    [1]
```

Markers attach after the whole atomic assertion content in V1.

PK-4 does not implement clause-level citation placement inside one assertion.

If finer placement is needed, producer must emit finer assertions in a future contract.

## 33. Why no clause-level citation in V1

PK-2 assertions are atomic validation units.

Attempting to place citations after individual clauses would require:

```text
span offsets
clause identity
post-generation text alignment
rewrite-sensitive anchors
```

which are not frozen.

Canonical first rule:

```text
ONE ATOMIC ASSERTION
→ CITATION SET APPLIES TO WHOLE ASSERTION
```

## 34. References list grammar

When at least one citation is visible, PK-3 may append a fixed presentation section:

```text
References
```

This is a presentation-owned document region, not a PK-2 semantic sectionKind.

It must not be inserted into the semantic section array.

## 35. Citation display line

Conceptual citation line:

```text
[1] <sourceLabel> — <recordLabel?> · <locatorLabel?> · <publishedAtLabel?>
```

Exact punctuation/localization belongs presentation.

No missing field is invented.

Examples:

```text
[1] City Council — Published minutes · Item 12
[2] Central Records Office — Correction notice
[3] National League — Match report · 2026-09-01
```

## 36. Link treatment

If `trustedHref` survives host link-safety policy, the citation source/record may be rendered as a link.

If it does not:

```text
render plain text citation
```

The UI must not fabricate a link from source names, search URLs, or guessed domains.

## 37. Link target does not become source truth authority

```text
CLICKABLE LINK
!= VERIFIED REMOTE CONTENT
```

PK-4 does not own remote freshness, availability, or fetch validation.

A stale/dead URL may be a presentation/navigation issue unless trusted source authority itself is invalidated separately.

## 38. Attribution citation semantics

For:

```text
ATTRIBUTED_BUT_NOT_SETTLED
```

`ATTRIBUTES_STATEMENT` citation means:

```text
this public record supports that the attribution/public statement exists
```

not:

```text
the attributed proposition is true
```

PK-3 status label remains mandatory.

## 39. Contested citation semantics

`DOCUMENTS_CONTEST` means the source supports current public contest/dispute standing.

It does not mean:

```text
source side wins
citation is neutral
claim is false
```

PK-3 continues to render `Contested public record` explicitly.

## 40. Correction citation semantics

`DOCUMENTS_CORRECTION` means the source supports the correction/supersession public-record relation.

It does not expose:

```text
old content
revision diff
revision number
restore action
```

unless future revision semantics explicitly authorize them.

## 41. Withdrawal citation semantics

`DOCUMENTS_WITHDRAWAL` supports that the public record was withdrawn/retracted.

It must not be presented as support for the withdrawn proposition itself.

The assertion remains visibly:

```text
Withdrawn or retracted public record
```

## 42. No citation laundering through source prestige

Forbidden UI/logic:

```text
source is official-looking
→ stronger status

source has verified badge
→ stronger status

source has many followers
→ stronger status

source is repeated many times
→ stronger status
```

PK-4 has no source-prestige score.

## 43. SOCIAL_FEED metrics remain orthogonal

The reserved SOCIAL_FEED future metrics:

```text
likeCount
reactionCount
repostCount
quoteCount
replyCount
viewCount
impressionCount
bookmarkCount
followerCount
followingCount
engagementScore
trendRank
viralityScore
```

may later be valid source-local simulation state.

They never substitute for PK-4 citation identity or PK settlement.

## 44. Citation receipt

Frozen conceptual bounded diagnostic receipt:

```text
PublicKnowledgeCitationValidationReceiptV1
  schemaVersion = 1
  family = PUBLIC_KNOWLEDGE
  targetRef
  status
  entries[]
```

Entry:

```text
assertionOrdinal
citationRef
role
citationDisposition
reasonCode
```

No assertion content is copied.

## 45. Receipt privacy rule

Forbidden receipt fields:

```text
assertionContent
contentExcerpt
privateSourceText
hiddenCitationNarrative
settlementBasisNarrative
claimSupportNarrative
```

Receipt explains decision class, not hidden content.

## 46. Ordinary UI does not expose citation quarantine

Forbidden ordinary UI:

```text
2 citations hidden
citation failed validation
source mismatch
1 private source omitted
```

No references section is preferable to leaking validator internals.

## 47. Empty citation bundle

If no citation attachment survives:

```text
PK-2 / PK-3 document still renders normally
References region = omitted
```

No empty `References` heading is required.

## 48. Accessibility

When footnote anchors are interactive, implementation should preserve:

```text
keyboard navigation
readable accessible label such as "Reference 1"
unique local anchor targets
focus visibility
```

The visible number alone must not be the only accessible meaning when richer context is needed.

References remain readable as plain text if anchor interaction is unavailable.

## 49. No citation tooltip authority

First V1 does not generate hover abstracts, source summaries, or quoted snippets.

```text
citation hover summary
= DEFER
```

because that introduces a second natural-language content surface requiring its own validation.

## 50. No quoted source text in V1 citation object

Citation metadata does not include freeform quoted source content.

Reason:

```text
source quote
= new semantic payload
= exposure / fidelity / truncation / copyright-like presentation questions
```

Textual source excerpts require a later explicit contract.

## 51. No citation browsing/search

PK-4 does not add:

```text
search source
open source database
browse old citations
related sources
recommended reading
```

The references region is bounded to the current validated projection.

## 52. No cross-family automatic propagation

Still forbidden:

```text
NEWS article object
→ PK citation automatically

SOCIAL_FEED post object
→ PK citation automatically

BOARD entry
→ PK citation automatically
```

A future explicit source-lineage bridge may consume Candidate C C5 or another provenance consumer contract.

## 53. Same underlying event, independent projection

A real/source-world record may independently support:

```text
NEWS projection
SOCIAL_FEED projection
PUBLIC_KNOWLEDGE citation
```

when current trusted authority supplies the corresponding independent contexts.

But:

```text
NEWS UI object
!= PK citation truth authority
```

## 54. Support-at-use

Immediately before citation bundle publication:

```text
sourceAuthorityRef
PK-2 validated document support
citation context support
```

must remain current according to existing support-at-use rules.

If the citation context support becomes stale:

```text
citation bundle invalidates
```

without retroactively inventing new assertion semantics.

If PK-2 support itself becomes stale:

```text
whole PK projection invalidates
```

under existing rules.

## 55. Current-projection lifetime

```text
CitationStore = NONE
CitationHistory = NONE
CitationIndex = NONE
CrossTurnCitationIdentity = NONE
AutomaticCitationReentry = NONE
```

A rendered `[1]` has no meaning outside that current render instance.

## 56. Candidate C

PK-4 does not activate Candidate C.

```text
C1 cross-turn survival       = NO
C2 durable citation identity = NO
C3 citation mutation         = NO
C4 append/revision           = NO
C5 derived-source propagation= NO
C6 future re-entry           = NO
C7 partial durable survival  = NO
C8 delayed effect            = NO
```

## 57. Candidate C activation triggers

Examples:

```text
same bibliography survives to next turn
old page receives a new citation later
citation set changes while page identity persists
NEWS source object becomes a durable PK citation object
async URL metadata attaches to exact old citation
revision history stores old/new citation sets
```

Any such requirement triggers reassessment before implementation.

## 58. Renderer failure isolation

If citation rendering fails:

```text
citation markers/references may disappear
PK-3 status-preserving assertion body remains
PK-2 semantic state remains unchanged
```

Renderer must never replace missing citation UI with guessed source text.

## 59. Plain-text fallback

A safe citation-capable fallback may render:

```text
<assertion content> [1]

References
[1] City Council — Published minutes · Item 12
```

when validated citation data exists.

If citation presentation cannot preserve exact identity safely, fallback may omit citations entirely while preserving the PK-3 assertion/status output.

## 60. No bibliography completeness claim

References list is bounded to citations attached to currently visible assertions.

It does not mean:

```text
all relevant sources
complete bibliography
all evidence
all sources consulted
```

## 61. Runtime caps required before implementation

Concrete limits must be frozen for at least:

```text
max citations in context
max attachments per assertion
max total attachments
max sourceLabel chars
max recordLabel chars
max locatorLabel chars
max publishedAtLabel chars
max href chars
max receipt entries
```

PK-4 design does not invent those numeric caps.

## 62. Implementation blockers

PK-4 is not runtime-ready until at least:

```text
current PK-2 claimSupportRef production path is proven
citation context producer authority is proven
structured citation transport is authorized
host link-safety policy is defined if href navigation is enabled
runtime hard caps are frozen
PK-3 host presentation mount authority exists
```

## 63. Design-only implementation sketch prohibition

This document may define conceptual objects, but does not authorize:

```text
TypeScript interfaces in production
persistent tables
prompt tags
hidden JSON in assistant output
new network calls
source scraping
URL resolution
DOM mounts
release changes
```

## 64. Validation examples

### A. Settled + valid support citation

```text
assertion 0
referenceState = SETTLED_PUBLIC_REFERENCE
claimSupportRef = claim:A

citation c1
claimSupportRef = claim:A
allowedRoles = [SUPPORTS_PUBLIC_RECORD]

attachment
0 → c1 / SUPPORTS_PUBLIC_RECORD

→ CITATION_ELIGIBLE
```

### B. Valid source, wrong claim

```text
assertion 0 claimSupportRef = claim:A
citation c2 claimSupportRef = claim:B

→ citation attachment quarantined
→ assertion remains visible
```

### C. Contested with ordinary support role

```text
referenceState = CONTESTED_PUBLIC_RECORD
role = SUPPORTS_PUBLIC_RECORD

→ state/role mismatch
→ citation omitted
```

### D. Withdrawn record with withdrawal source

```text
referenceState = WITHDRAWN_OR_RETRACTED_RECORD
role = DOCUMENTS_WITHDRAWAL

→ eligible
→ withdrawn status remains mandatory
```

### E. Citation has no URL

```text
sourceLabel = City Council
recordLabel = Published minutes
trustedHref = absent

→ valid text citation
```

### F. Ten citations

```text
10 eligible SUPPORTS_PUBLIC_RECORD citations

→ 10 provenance attachments
→ no settlement/confidence upgrade
```

## 65. Relationship to SYS-18

SYS-18 remains an engineering/governance point-in-time evidence provenance receipt.

PK-4 remains a source-world/public-reference user-visible citation contract.

Shared principle:

```text
PROVENANCE RELATIONS MUST BE EXPLICIT
```

Non-equivalence:

```text
SYS-18 repo evidence node
!= PK-4 source citation
```

No repository evidence IDs are rendered into PUBLIC_KNOWLEDGE merely because both systems use provenance terminology.

## 66. Frozen conclusion

```text
PK-4 DESIGN = FROZEN

Citation identity is exact and current-projection local.
Citation-to-assertion provenance uses claimSupportRef exact join.
settlementBasisRef remains internal and non-rendered.
Citation role never upgrades PK-2 reference state.
Citation failure does not invalidate an otherwise valid assertion.
URLs are optional and never fetched by PK-4.
Render-local [N] numbering is noncanonical.
References list is bounded, not complete bibliography.
Cross-turn citation state and automatic cross-family propagation remain absent.
Candidate C remains not activated.
```

## 67. Next checkpoint

Recommended next PUBLIC_KNOWLEDGE design checkpoint:

```text
PK-5 · Revision / Durable Page Boundary Reassessment
```

Purpose:

```text
reassess whether PUBLIC_KNOWLEDGE should remain snapshot-only
or whether page persistence / revisions / source replacement
now justify activating selected Candidate C consumers
```

Alternative if durable page semantics are intentionally deferred:

```text
PK-5 · Family Convergence / Snapshot V1 Close
```

The next checkpoint must remain design-only unless runtime implementation is separately authorized.
