# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-4 Citation / Provenance Boundary Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-4 IMPACT SCOPE FROZEN · USER-VISIBLE CITATION PROVENANCE SEAM SELECTED · SETTLEMENT BASIS REMAINS INTERNAL · CURRENT-PROJECTION ONLY · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-4 · CITATION · PROVENANCE · FOOTNOTE · SOURCE SUPPORT · IMPACT SCOPE**

## 0. Purpose

PK-3 froze the first status-preserving PUBLIC_KNOWLEDGE presentation grammar and intentionally prohibited invented `[1]`, `Sources`, `References`, URLs, and citation tooltips.

PK-4 selects the design seam for adding user-visible citation provenance without collapsing it into settlement authority, internal validation references, repository evidence provenance, or cross-turn source history.

This transaction is design-only.

It does not implement citation producers, runtime schemas, prompt transport, DOM/CSS, external links, network fetches, retrieval, persistence, history, model calls, Candidate C, or production changes.

## 1. Canonical problem

A PUBLIC_KNOWLEDGE assertion may be valid and settled under PK-2 while PK-3 still has no user-visible answer to:

```text
What public record or source supports this statement?
What source is being attributed?
What record documents the contest?
What record documents the correction?
What record documents the withdrawal?
```

The wrong shortcut would be:

```text
settlementBasisRef
→ print as [1]
```

That is forbidden.

Canonical separation:

```text
SETTLEMENT BASIS REF
= internal trusted validation join material

USER-VISIBLE CITATION
= separately authorized renderable public-source provenance
```

## 2. Selected impact seam

PK-4 selects:

```text
CURRENT_PROJECTION_PUBLIC_KNOWLEDGE_CITATION_PROVENANCE_V1
```

Conceptual flow:

```text
trusted current public-source evidence / lineage material
        ↓
PublicKnowledgeCitationContextV1
        ↓ exact joins only
citation attachment validation
        ↓
ValidatedPublicKnowledgeCitationBundleV1
        ↓
PK-3-compatible citation presentation
```

The citation layer supplements an already validated PK-2 assertion.

It does not create or upgrade that assertion's reference state.

## 3. Authority ownership

Frozen ownership direction:

```text
Frame / Continuity / Time
→ current world/time semantics where already owned

Evidence / Lineage / Handoff
→ exact source/evidence identity and source-backed public-record relation

PK-1 Settlement Context Composer
→ settlement basis context

PK-2 PUBLIC_KNOWLEDGE Validator
→ assertion referenceState / eligibility

PK-4 Citation Context / Validator
→ whether a current trusted public-source reference may be exposed as a citation

PK-3 Presentation Renderer
→ display numbering, footnote placement, source list formatting
```

Canonical rule:

```text
CITATION AUTHORITY
!=
SETTLEMENT AUTHORITY
!=
WORLD TRUTH AUTHORITY
!=
PRESENTATION AUTHORITY
```

## 4. SYS-18 is not PK-4 runtime/source citation authority

Repository SYS-18 Evidence Provenance Chain Receipt preserves decision-time provenance for SimCore engineering/governance decisions.

PK-4 PUBLIC_KNOWLEDGE citation provenance is user-visible source-world/public-record semantics.

Therefore:

```text
SYS-18 PROVENANCE RECEIPT
!=
PUBLIC_KNOWLEDGE CITATION
```

PK-4 may reuse the architectural principle that provenance relations must be explicit rather than guessed from proximity, but it does not reuse SYS-18 receipt IDs, repository paths, CI identities, decision refs, or governance evidence as public-world citations.

## 5. Citation is optional support, not an eligibility prerequisite in V1

First PK-4 scope does not retroactively change PK-2 assertion eligibility.

```text
PK-2 assertion eligible
+ no renderable PK-4 citation
→ assertion remains eligible
→ citation omitted
```

Reason:

PK-2 already has the exact authority required for settlement/reference validation. PK-4 adds a user-visible provenance surface, not a new mandatory truth gate.

A later product contract may require citations for selected presentation modes, but that is not assumed here.

## 6. Citation failure isolation

Frozen rule:

```text
CITATION ATTACHMENT FAILURE
!=
ASSERTION INVALIDATION
```

Examples:

```text
unknown citationRef
citation role mismatch
citation display metadata unavailable
```

→ citation attachment is omitted/quarantined
→ validated PK-2 assertion remains unchanged

unless the underlying PK-2 authority independently becomes invalid.

## 7. First citation roles

Selected first role vocabulary:

```text
SUPPORTS_PUBLIC_RECORD
ATTRIBUTES_STATEMENT
DOCUMENTS_CONTEST
DOCUMENTS_CORRECTION
DOCUMENTS_WITHDRAWAL
```

These roles describe why the public source is relevant to the rendered reference assertion.

They do not state universal truth.

## 8. Role non-equivalence

```text
SUPPORTS_PUBLIC_RECORD
!= canonical proof of truth

ATTRIBUTES_STATEMENT
!= attributed statement is true

DOCUMENTS_CONTEST
!= contesting side is correct

DOCUMENTS_CORRECTION
!= complete revision history exists

DOCUMENTS_WITHDRAWAL
!= withdrawn claim is current truth
```

## 9. Citation cardinality

One assertion may cite:

```text
0..N trusted current citations
```

One citation source may support multiple assertions in the same current projection.

However:

```text
MORE CITATIONS
!= STRONGER SETTLEMENT
!= HIGHER CONFIDENCE
!= MAJORITY VOTE
```

No citation-count confidence score is introduced.

## 10. First trusted citation source shape direction

PK-4 should consume a trusted bounded citation context rather than model-authored source realism.

Selected conceptual source metadata classes:

```text
sourceLabel
recordLabel?
locatorLabel?
trustedPublishedAt?
trustedHref?
```

All are optional except the minimum safe source label required by the final PK-4 contract.

No field may be invented by the renderer.

## 11. No freeform model-authored source identity

Forbidden authority pattern:

```text
model writes:
"According to Reuters"
"official statement"
"government database"
"academic paper"

→ therefore citation authority
```

Source identity must originate from trusted current citation context.

Natural-language assertion text may mention a source, but that mention does not create a PK-4 citation object.

## 12. Citation numbers are presentation-only

User-visible markers such as:

```text
[1]
[2]
[3]
```

may be generated only from already validated citation attachments.

They are:

```text
CURRENT RENDER PRESENTATION INDICES
```

not:

```text
semantic citation identity
durable source ID
settlement basis ID
cross-turn citation ID
```

Filtering/deduplication may change visible numbering without changing source semantics.

## 13. settlementBasisRef remains hidden

PK-4 freezes:

```text
settlementBasisRef
→ never rendered directly
→ never formatted as footnote number
→ never treated as URL/source identity
```

A citation may be backed by some of the same upstream evidence that also informed a settlement basis, but the two references remain independently typed and joined.

## 14. Citation / reference-state compatibility direction

Conceptual compatibility:

```text
SETTLED_PUBLIC_REFERENCE
→ SUPPORTS_PUBLIC_RECORD

ATTRIBUTED_BUT_NOT_SETTLED
→ ATTRIBUTES_STATEMENT

CONTESTED_PUBLIC_RECORD
→ DOCUMENTS_CONTEST

CORRECTED_CURRENT_RECORD
→ SUPPORTS_PUBLIC_RECORD and/or DOCUMENTS_CORRECTION

WITHDRAWN_OR_RETRACTED_RECORD
→ DOCUMENTS_WITHDRAWAL
```

Unspecified combinations fail closed at citation-attachment level.

They do not rewrite PK-2 `referenceState`.

## 15. Correction / withdrawal source semantics

A correction citation should identify the current public record that documents the correction relation.

It does not require or imply:

```text
full old revision storage
page diff
revision number
restore target
```

A withdrawal citation should identify the public record documenting withdrawal/retraction.

It does not turn withdrawn content into a current settled claim.

## 16. No automatic cross-family citation propagation

Forbidden in V1:

```text
NEWS story exists
→ automatically becomes PK citation

SOCIAL_FEED post exists
→ automatically becomes PK citation

BOARD post exists
→ automatically becomes PK citation
```

Even when the same event/source is involved, a trusted current PK-4 citation context must authorize the citation.

Automatic derived-source propagation would require a separate C5 / lineage reassessment.

## 17. No history search / citation recovery

PK-4 may not search:

```text
prior NEWS cards
prior SOCIAL_FEED cards
prior BOARD cards
host transcript
old PK pages
same sourceLabel strings
similar assertion text
```

to synthesize citations.

Current bounded trusted context only.

## 18. Network boundary

First PK-4 design does not require network retrieval.

```text
trustedHref present
→ may become future renderable navigation metadata

trustedHref absent
→ text citation remains possible
```

The plugin does not fetch, scrape, verify, or preview a URL merely because it exists.

Link navigation policy is presentation/host work and remains separate from source truth.

## 19. Simulated-world citations remain possible

PUBLIC_KNOWLEDGE may represent fictional/simulated public records that have no real internet URL.

Therefore V1 must not require URLs.

A valid citation may be text-only, for example:

```text
Central Records Office — Public notice
National League — Match report
City Council — Published minutes
```

when those labels are trusted source-world semantics.

## 20. Citation provenance exposure rule

The citation itself is a public-source semantic object.

Therefore citation display metadata must not leak private/unexposed information.

A source can support internal settlement reasoning without every internal source detail being renderable.

Canonical rule:

```text
INTERNAL SOURCE SUPPORT
!= USER-VISIBLE SOURCE METADATA
```

## 21. Citation bundle must not contain quarantined assertion text

Citation validation/receipts may identify assertion ordinals and citation refs/reason classes, but must not republish denied/held assertion text.

The PK-2 privacy invariant continues unchanged.

## 22. Presentation integration direction

PK-4 is expected to extend PK-3 with bounded optional surfaces such as:

```text
inline footnote markers
reference list
trusted source label
trusted record label
trusted locator label
optional trusted date
optional trusted link metadata
```

No hover summary or generated source abstract is required in first scope.

## 23. No renderer-generated bibliography realism

Renderer must not invent:

```text
author
publisher
publication date
URL
DOI
page number
archive URL
accessed date
source credibility badge
```

when absent from validated citation semantics.

## 24. Citation deduplication is presentation-local

If the same validated citation ref is attached to multiple assertions, presentation may assign one visible footnote entry and reuse its number.

This is allowed only when citation semantic identity is already exact.

Renderer may not deduplicate by:

```text
similar title
same sourceLabel text
same hostname
same natural-language content
```

because those are fuzzy identity guesses.

## 25. No citation-derived settlement upgrade

Frozen invariant:

```text
10 citations
100 citations
1,000 citations

→ no automatic settlement upgrade
```

Settlement remains PK-1/PK-2 authority.

This also preserves the earlier rule that NEWS repetition and SOCIAL_FEED popularity cannot create PUBLIC_KNOWLEDGE settlement.

## 26. Current-projection lifetime

```text
CitationStore = NONE
CitationHistory = NONE
CrossTurnCitationIdentity = NONE
AutomaticCitationReentry = NONE
```

A citation shown now is not durable source history by default.

## 27. Candidate C reassessment

PK-4 current-projection citation support alone does not activate Candidate C.

```text
C1 cross-turn survival       = NO
C2 durable citation identity = NO
C3 mutation                  = NO
C4 append/revision           = NO
C5 derived propagation       = NO
C6 future re-entry           = NO
C7 partial durable survival  = NO
C8 delayed effect            = NO
```

Triggers for reassessment include:

```text
same citation object survives to later page
citation URL metadata updates asynchronously on old page
NEWS object automatically becomes durable PK source
revision history preserves old citation sets
citation source replacement while page survives
```

## 28. Runtime implementation exclusions

PK-4 impact scope does not authorize:

```text
citation parser
citation database
source fetcher
URL validator
web scraper
browser preview
prompt schema changes
hidden tags
DOM/CSS
runtime enum insertion
persistent IDs
Candidate C
release change
```

## 29. Expected PK-4 detailed design questions

The detailed contract should freeze at least:

```text
PublicKnowledgeCitationContextV1 exact shape
citationRef identity
citation role compatibility
assertion citation attachment shape
validated citation bundle
citation failure/quarantine rules
presentation footnote numbering
deduplication rules
trustedHref treatment
references section grammar
accessibility
bounded receipt
```

## 30. Impact conclusion

```text
PK-4 IMPACT SCOPE = SELECTED

User-visible citation provenance is a separate current-projection semantic layer.
It supplements PK-2 assertions.
It does not reuse settlementBasisRef as citation identity.
It does not use SYS-18 engineering provenance as source-world citation authority.
It does not upgrade settlement.
It does not activate Candidate C.
```

Next:

```text
PK-4 detailed Citation / Provenance Boundary Design
```
