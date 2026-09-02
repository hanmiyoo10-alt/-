# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-6 Family Convergence / Expansion Boundary Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-6 DESIGN FROZEN · PUBLIC_KNOWLEDGE V1 DESIGN CONVERGED · SNAPSHOT-COMPLETE · FUTURE EXPANSION REGISTRY FROZEN · CANDIDATE C NOT ACTIVATED FOR V1 · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-6 · FAMILY CONVERGENCE · EXPANSION BOUNDARY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-0 through PK-5 have frozen the complete first PUBLIC_KNOWLEDGE design surface:

```text
PK-0  Settlement Master Design
PK-1  Settlement Context Authority
PK-2  Document Sidecar + Validator
PK-3  Presentation Grammar
PK-4  Citation / Provenance Boundary
PK-5  Revision / Durable Page Boundary
```

PK-6 performs final family convergence.

It answers four questions:

1. Is PUBLIC_KNOWLEDGE V1 semantically complete as a current-projection source family?
2. Does V1 require Candidate C, persistence, retrieval, mutation, or history?
3. Which future wiki/reference capabilities remain first-class product vision rather than being accidentally discarded?
4. Is another automatic `PK-7` checkpoint justified?

Final answer:

```text
PUBLIC_KNOWLEDGE V1 DESIGN = CONVERGED
PUBLIC_KNOWLEDGE V1 = CURRENT-PROJECTION SNAPSHOT FAMILY
CANDIDATE C FOR V1 = NOT ACTIVATED
NEXT PK CHECKPOINT = NONE
```

Future work must open a specifically named expansion lane when a concrete product requirement exists.

This document is design-only. It does not implement runtime code, storage, IDs, revision history, prompt transport, rendering, search, indexing, media, interaction, networking, model calls, Candidate C capabilities, or release changes.

## 1. Family identity

PUBLIC_KNOWLEDGE remains an orthogonal Source Intelligence family under Mode C.

```text
mode = C
family = PUBLIC_KNOWLEDGE
```

It is not a new core mode.

```text
PUBLIC_KNOWLEDGE
!= KNOWLEDGE_MODE
!= WIKI_MODE
!= CANONICAL_WORLD_TRUTH_MODE
```

Its purpose is to project what can be represented as public reference material from current trusted authority.

## 2. Final V1 scope

Frozen first scope:

```text
source root = direct B root
source authority = current trusted source-job authority
projection lifetime = CURRENT_PROJECTION_ONLY
page lifetime = CURRENT_PROJECTION_ONLY
retrieval = NONE
revision history = NONE
mutation = NONE
context re-entry = NONE
network fetch = NONE
background refresh = NONE
```

A fresh projection may be regenerated from current authority whenever PUBLIC_KNOWLEDGE is activated.

## 3. Canonical V1 pipeline

```text
current user request
        ↓
current SimCore authority
        ↓
current source-job authority
        ↓
Exposure eligibility
        ↓
PublicKnowledgeSettlementContextComposer
        ↓
PublicKnowledgeDocumentDraftV1
        ↓
PK validator
        ↓
ValidatedPublicKnowledgeDocumentV1
        ↓
optional PK-4 citation validation
        ↓
ValidatedPublicKnowledgeCitationBundleV1
        ↓
PUBLIC_REFERENCE_DOCUMENT_V1
        ↓
status-preserving public-reference UI
```

Every stage remains bounded to the current source job/current projection.

## 4. Final authority separation

The converged family preserves these non-equivalences:

```text
WORLD / CURRENT FACT AUTHORITY
!= EXPOSURE AUTHORITY
!= PUBLIC-RECORD SETTLEMENT AUTHORITY
!= REFERENCE-STATE AUTHORITY
!= USER-VISIBLE CITATION AUTHORITY
!= PRESENTATION AUTHORITY
```

Canonical safety rules:

```text
TRUE IN WORLD
!= SETTLED PUBLIC KNOWLEDGE

PUBLICLY EXPOSED
!= SETTLED PUBLIC KNOWLEDGE

NEWS REPORTED
!= SETTLED PUBLIC KNOWLEDGE

CITATION EXISTS
!= CLAIM IS TRUE

POPULAR / VIRAL
!= SETTLED PUBLIC KNOWLEDGE
```

No later expansion may collapse these layers merely for convenience.

## 5. Final reference states

V1 can represent:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

These are public-reference semantic states, not confidence scores and not world-truth enums.

They are validator-derived and must remain visible when presentation requires it.

## 6. Settlement basis and final state remain distinct

PK-1 settlement basis classes remain inputs to validation, not renderer-facing truth labels.

```text
ESTABLISHED_PUBLIC_RECORD_BASIS
ATTRIBUTED_PUBLIC_RECORD_BASIS
CONTESTED_PUBLIC_RECORD_BASIS
CORRECTED_PUBLIC_RECORD_BASIS
WITHDRAWN_PUBLIC_RECORD_BASIS
```

Canonical rule:

```text
SETTLEMENT BASIS
!= FINAL REFERENCE STATE
```

The validator continues to own final disposition.

## 7. Bounded document semantics

PUBLIC_KNOWLEDGE V1 is a bounded reference projection, not a complete encyclopedia entry.

Frozen section roles remain:

```text
SUMMARY
PUBLIC_HISTORY
PUBLIC_RECORD
DISPUTES_AND_CORRECTIONS
```

Assertion-level quarantine is preserved.

One unsupported assertion does not automatically invalidate all independent validated assertions, but surviving content must never be presented as proof that the page is globally complete.

Canonical rule:

```text
VALID PARTIAL PROJECTION
!= COMPLETE KNOWLEDGE BASE
```

## 8. Presentation status preservation

`PUBLIC_REFERENCE_DOCUMENT_V1` must preserve reference semantics.

At minimum:

```text
SETTLED
→ ordinary reference-body treatment permitted

ATTRIBUTED
→ explicit attributed-record treatment

CONTESTED
→ explicit contested-record treatment

CORRECTED
→ explicit corrected-current-record treatment

WITHDRAWN
→ explicit withdrawn/retracted-record treatment
```

Color-only, icon-only, or decoration-only treatment is insufficient for non-settled states.

Renderer failure must degrade to a status-preserving text form rather than flattening all assertions into ordinary factual prose.

## 9. Citation convergence

PK-4 user-visible citation provenance remains optional and bounded.

Frozen identity separation:

```text
settlementBasisRef
!= claimSupportRef
!= citationRef
!= render-local [N]
```

A citation attaches only through trusted exact claim-support joins.

```text
STRING SIMILARITY
!= PROVENANCE
```

Footnote numbering remains presentation-local.

Citation count, prestige, URL presence, and marker position do not upgrade settlement.

## 10. Citation failure isolation

Citation validation/presentation is additive.

A citation attachment may be quarantined or omitted without allowing the renderer to invent a replacement citation.

Citation failure does not automatically rewrite an already validated assertion's reference state.

However, a future product requirement that makes citations mandatory for a particular class of assertion must open a new explicit policy design rather than silently changing PK-4 semantics.

## 11. NEWS boundary remains intact

PUBLIC_KNOWLEDGE is not just mature NEWS styling.

```text
NEWS REPORT EXISTS
!= PUBLIC KNOWLEDGE SETTLED
```

Repeated reports, multiple outlets, elapsed time, or story maturity are insufficient on their own to establish PUBLIC_KNOWLEDGE settlement.

NEWS remains a report/publication family. PUBLIC_KNOWLEDGE remains a public-reference settlement family.

## 12. SOCIAL_FEED attention boundary remains intact

SOCIAL_FEED future metrics may include:

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

Those values may become legitimate source-world dynamics when their own authority exists.

They never automatically settle a PUBLIC_KNOWLEDGE claim.

Canonical rule:

```text
SOCIAL ATTENTION
!= PUBLIC REFERENCE SETTLEMENT
```

This permits a world in which something is highly viral yet still contested, attributed-only, corrected, or withdrawn in PUBLIC_KNOWLEDGE.

## 13. Legacy Community compatibility

PUBLIC_KNOWLEDGE convergence does not migrate or remove legacy Community compatibility.

Existing ownership remains separate for surfaces such as:

```text
Community block count
[RT N] reaction numbering
legacy <COMMUNITY> compatibility
```

Canonical rule:

```text
SOURCE INTELLIGENCE FAMILY EXPANSION
!= LEGACY COMMUNITY COUNTER REPLACEMENT
```

## 14. Source-irrelevant dormancy

3M-9 remains authoritative.

PUBLIC_KNOWLEDGE design completion does not mean the family runs on every turn.

When there is no current PUBLIC_KNOWLEDGE source job:

```text
settlement composition = NONE
PK draft generation = NONE
PK validation = NONE
citation validation = NONE
PK presentation build = NONE
page retrieval = NONE
history scan = NONE
persistent read/write = NONE
network = NONE
extra model call = NONE
```

A bounded current source-orchestration decision may still exist under the common 3M contract.

## 15. Candidate C final V1 decision

PUBLIC_KNOWLEDGE V1 does not activate Candidate C.

```text
C1 cross-turn survival       = NO
C2 stable derived identity   = NO
C3 item/page mutation        = NO
C4 append/merge              = NO
C5 derived lineage           = NO
C6 context re-entry          = NO
C7 partial historical survival = NO
C8 delayed effect targeting  = NO
```

This is a product-scope decision, not a statement that durability is undesirable.

## 16. PK-5 durable profiles remain reserved

Frozen future profiles remain:

```text
PK-D0 SNAPSHOT_REFERENCE
PK-D1 DURABLE_PAGE_IDENTITY
PK-D2 REVISIONED_PAGE
PK-D3 HISTORICAL_PAGE
PK-D4 CONTEXTUAL_DURABLE_PAGE
```

They are legitimate future PUBLIC_KNOWLEDGE capability profiles.

They do not become active because PK-6 converged.

Canonical rule:

```text
DESIGNED FUTURE CAPABILITY
!= ACTIVE RUNTIME CAPABILITY
```

## 17. Expansion registry

PK-6 freezes named expansion lanes so long-term product capability is preserved without contaminating V1.

### PK-X1 `DURABLE_PUBLIC_REFERENCE_PAGE`

Potential requirements:

```text
same logical page across turns
stable page identity
revision history
historical revision view
compare
restore
citation evolution
```

Consumes PK-5 Candidate C profiles minimally.

### PK-X2 `PUBLIC_REFERENCE_SEARCH`

Potential requirements:

```text
exact page lookup
bounded title search
bounded corpus retrieval
historical revision retrieval
```

Requires a dedicated retrieval/index authority contract.

Persistence alone does not authorize search.

### PK-X3 `PUBLIC_REFERENCE_ENTITY_LINKS`

Potential requirements:

```text
page-to-page links
related entity links
bounded reference navigation
```

A link means navigation/reference relation only unless another authority explicitly defines a stronger relation.

```text
LINK EXISTS
!= CLAIM TRUE
!= DERIVED LINEAGE
```

### PK-X4 `PUBLIC_REFERENCE_INFOBOX`

Potential structured fields:

```text
trusted dates
roles
affiliations
organizations
locations
public identifiers
bounded key-value reference facts
```

Each field must be individually supported/validated.

Renderer extraction from prose is not sufficient authority.

### PK-X5 `PUBLIC_REFERENCE_MEDIA`

Potential media:

```text
trusted image
map
diagram
public-record scan/preview
source-world media attachment
```

Semantic media requires explicit validation.

Delayed exact-page/revision attachment may activate C8.

### PK-X6 `PUBLIC_REFERENCE_METRICS`

Reserved future page/reference metrics may include:

```text
pageViewCount
revisionCount
watchCount
referenceCount
```

These are not V1 facts and must not be inferred from snapshot cardinality.

Canonical rule:

```text
INACTIVE IN V1
!= PERMANENTLY FORBIDDEN
```

### PK-X7 `PUBLIC_REFERENCE_INTERACTION`

Potential actions:

```text
edit
append
remove
restore
compare
inspect revision
```

Mutation/history UI requires explicit product authority and PK-5/Candidate C child contracts.

A visible button does not authorize semantic mutation.

### PK-X8 `CROSS_FAMILY_PUBLICATION_LINEAGE`

Potential formal flow:

```text
BOARD object
→ NEWS object
→ PUBLIC_KNOWLEDGE object
```

This is a derived-lineage feature, not a truth conveyor belt.

Even when C5 lineage exists:

```text
UPSTREAM DERIVED OBJECT EXISTS
!= PUBLIC_KNOWLEDGE SETTLED
```

PUBLIC_KNOWLEDGE must independently satisfy its settlement contract.

## 18. Expansion lanes are independent

No expansion lane opens the others automatically.

Examples:

```text
DURABLE PAGE
!= SEARCH

SEARCH
!= CONTEXT RE-ENTRY

INFOBOX
!= MEDIA

REVISION HISTORY
!= CROSS-FAMILY LINEAGE

PAGE METRICS
!= SETTLEMENT AUTHORITY
```

Every future design must identify the concrete consumer and minimum authority surface.

## 19. Restore semantics remain revalidation-first

If PK-X1 later opens revision/restore functionality, PK-5 remains authoritative:

```text
historical revision selected
→ restore intent
→ construct proposed new revision
→ current authority / Exposure / Settlement / Citation revalidation
→ commit a new revision only if accepted
```

```text
RESTORE
!= OLD AUTHORITY RESURRECTION
```

## 20. Historical view is not current validation

A future historical page may show what was represented at an earlier revision.

It must distinguish:

```text
HISTORICAL REVISION SNAPSHOT
!= CURRENT VALIDATED REVISION
```

Historical support metadata cannot masquerade as current support.

## 21. Search does not imply truth discovery

If PK-X2 is later opened, retrieval may locate candidate pages/records.

Retrieval must not become settlement authority.

```text
SEARCH RESULT FOUND
!= CLAIM SETTLED
```

Retrieved content must still satisfy support-at-use and the active PUBLIC_KNOWLEDGE policy before current projection use.

## 22. Internal links do not create world graphs by implication

A future internal-link surface may produce a navigation graph.

That graph must not be confused with:

```text
canonical entity graph
derived lineage graph
causal graph
truth graph
```

without an explicit child design.

## 23. Infobox is semantic, not decoration

A wiki-like infobox may look like UI furniture but each populated value is a semantic claim.

Therefore future implementation must not derive arbitrary fields merely because a value appears somewhere in prose.

```text
PRESENTATION SLOT EXISTS
!= VALUE AUTHORITY EXISTS
```

## 24. Metrics are product capability, not proof

Future PK-X6 metrics are explicitly preserved because a living reference system may legitimately expose page activity.

They must remain separate from epistemic state.

```text
pageViewCount = 1,000,000
!= SETTLED

revisionCount = 42
!= HIGHER CONFIDENCE

watchCount = 10,000
!= CANONICAL IMPORTANCE
```

This mirrors the SOCIAL_FEED rule that engagement dynamics do not establish truth.

## 25. Media degradation rule

Future optional presentation media must not become required for semantic validity unless a specific child contract says the media itself carries the assertion.

For decorative/optional media:

```text
media failure
→ text/reference projection survives
```

For semantic media, a dedicated validation policy must decide whether omission or quarantine is required.

## 26. No generic permanent wiki database authorization

PK-6 convergence does not authorize:

```text
persist every rendered PK page
create page IDs automatically
index all pages
scan all old pages each turn
inject wiki history into prompts
background-refresh all reference pages
```

Future durability is capability-gated under PK-5/Candidate C.

## 27. No automatic page creation

Even if PK-X1 is later opened:

```text
PUBLIC_KNOWLEDGE SNAPSHOT RENDERED
!= DURABLE PAGE CREATED
```

A future durable-page lifecycle must define explicit creation authority.

## 28. One current family projection remains first-major rule

PUBLIC_KNOWLEDGE participates in the common Source Intelligence orchestration model.

The first major rule remains:

```text
one current source job
→ one family
→ one current projection
```

Same event may be independently projected into NEWS, SOCIAL_FEED, BOARD, LIVE_REACTION, or PUBLIC_KNOWLEDGE, but no family becomes truth authority for another merely because it rendered first.

## 29. Cross-family same-event signature

A future validation scenario may use one event E:

```text
E → LIVE_REACTION
E → BOARD
E → SOCIAL_FEED
E → NEWS
E → PUBLIC_KNOWLEDGE
```

Each family may render different semantics appropriate to its source grammar.

All must bind to current trusted authority independently.

Forbidden shortcuts:

```text
SOCIAL_FEED viral post
→ PUBLIC_KNOWLEDGE settled automatically

NEWS article
→ PUBLIC_KNOWLEDGE truth automatically

PUBLIC_KNOWLEDGE page
→ canonical world truth upgrade
```

## 30. V1 implementation planning boundary

If runtime implementation is later explicitly authorized, PK-6 recommends treating PUBLIC_KNOWLEDGE V1 as the smallest coherent implementation target:

```text
current source-job selection
→ settlement context production
→ bounded document draft
→ validator
→ status-preserving presentation
→ optional bounded citation attachment
```

This recommendation does not itself authorize implementation.

Global 3.0M runtime readiness gates remain authoritative.

## 31. Runtime readiness remains separate

PK-6 convergence means:

```text
PUBLIC_KNOWLEDGE DESIGN INTERNALLY CONVERGED
```

It does not mean:

```text
runtime implemented
runtime ready
deployed
real long-chat validated
host mount proven
transport proven
hard caps frozen in runtime
```

Those remain separate future implementation/validation concerns.

## 32. Concrete implementation-time limits still required

A future implementation must freeze concrete bounded caps before activation, such as appropriate limits for:

```text
assertions per document
characters per assertion
citation attachments per assertion
citations per document
aggregate document characters
receipt entries
```

PK-6 does not invent numerical caps in design-only mode.

## 33. Failure classification remains separated

Future implementation must keep distinct:

```text
SOURCE INVALIDATION
POLICY QUARANTINE
CITATION ATTACHMENT FAILURE
PRESENTATION FAILURE
```

No layer may misreport one category as another.

Examples:

```text
renderer crashed
!= assertion false

citation link unavailable
!= settlement revoked

settlement HOLD
!= renderer failure
```

## 34. Security/privacy boundary

Validation receipts and internal refs remain non-renderable unless a dedicated presentation contract says otherwise.

The UI must not expose hidden/quarantined assertion text, settlement basis refs, private claim-support refs, or rejected citation metadata.

```text
QUARANTINE COUNT
!= LICENSE TO HINT AT HIDDEN CONTENT
```

## 35. Final family checklist

```text
PK-0 Settlement semantics                  FROZEN
PK-1 Settlement context authority          FROZEN
PK-2 Document + validator                  FROZEN
PK-3 Presentation grammar                  FROZEN
PK-4 Citation provenance                   FROZEN
PK-5 Durable/revision boundary             FROZEN
PK-6 Family convergence                    FROZEN
```

Required family invariants:

```text
current authority binding              YES
Exposure separation                    YES
settlement separation                  YES
validator-owned final state            YES
status-preserving presentation         YES
bounded citation provenance            YES
snapshot-only V1                       YES
source-irrelevant dormancy             YES
Candidate C required for V1            NO
future durable capability discarded    NO
future search capability discarded     NO
future links/infobox/media discarded   NO
future metrics/interaction discarded   NO
```

## 36. Convergence decision

```text
PUBLIC_KNOWLEDGE PK-0..PK-6
= DESIGN CONVERGED

PUBLIC_KNOWLEDGE V1
= SNAPSHOT-COMPLETE
= IMPLEMENTATION-BOUNDARY DEFINED
= NOT IMPLEMENTED
= NOT DEPLOYED

CANDIDATE C FOR V1
= NOT ACTIVATED
```

## 37. No automatic PK-7

PK-6 is the final checkpoint of this PUBLIC_KNOWLEDGE first-family design track.

```text
NEXT PK CHECKPOINT = NONE
```

Do not create PK-7 merely to continue numbering.

A future requirement must open one of the named expansion tracks or another explicitly scoped design axis.

## 38. Named next-design options after convergence

Valid follow-up design examples include:

```text
DURABLE_PUBLIC_REFERENCE_PAGE
PUBLIC_REFERENCE_SEARCH
PUBLIC_REFERENCE_ENTITY_LINKS
PUBLIC_REFERENCE_INFOBOX
PUBLIC_REFERENCE_MEDIA
PUBLIC_REFERENCE_METRICS
PUBLIC_REFERENCE_INTERACTION
CROSS_FAMILY_PUBLICATION_LINEAGE
```

Each is separate from PK-0..PK-6 V1 convergence.

## 39. Production boundary

This entire PK-6 transaction is documentation/design authority only.

```text
release-simcore modification = NONE
runtime file modification     = NONE
prompt modification           = NONE
storage modification          = NONE
release behavior change       = NONE
```

## 40. Final statement

```text
PUBLIC_KNOWLEDGE V1 DESIGN PROGRAM = CONVERGED ✅

FIRST IMPLEMENTATION SHAPE
= BOUNDED CURRENT-PROJECTION PUBLIC REFERENCE

LONG-TERM PRODUCT VISION
= PRESERVED THROUGH NAMED EXPANSION LANES

RUNTIME IMPLEMENTATION AUTHORITY
= NOT GRANTED

PRODUCTION
= UNCHANGED
```
