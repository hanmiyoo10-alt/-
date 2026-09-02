# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-6 Family Convergence / Expansion Boundary Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-6 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-6 · FAMILY CONVERGENCE · EXPANSION BOUNDARY**

## 0. Purpose

PK-0 through PK-5 now define a complete current-projection PUBLIC_KNOWLEDGE design:

```text
PK-0 settlement semantics
PK-1 settlement context authority
PK-2 bounded document + validator
PK-3 status-preserving presentation
PK-4 user-visible citation provenance
PK-5 snapshot-vs-durable revision boundary
```

PK-6 does not add another source feature. It determines whether the first PUBLIC_KNOWLEDGE family is internally converged, identifies its exact first-implementation boundary, and preserves legitimate future wiki/reference capabilities without silently turning them into V1 requirements.

This is design-only. It does not authorize runtime schemas, persistence, prompt changes, DOM/CSS implementation, retrieval, indexing, media generation, interaction, Candidate C activation, or release changes.

## 1. Primary impact decision

```text
PUBLIC_KNOWLEDGE V1
= CONVERGENCE-READY
= CURRENT_PROJECTION_ONLY
= SNAPSHOT_REFERENCE FAMILY
= NO CANDIDATE C ACTIVATION REQUIRED
```

PK-0..PK-5 provide enough authority separation for a first implementation to produce a bounded public-reference document with settlement state, validation, status-preserving presentation, and bounded user-visible citations.

Canonical rule:

```text
FIRST FAMILY COMPLETE
!= LONG-TERM WIKI PRODUCT COMPLETE
```

## 2. First implementation boundary

The first implementation boundary remains:

```text
mode = C
family = PUBLIC_KNOWLEDGE
source root = direct B root
one current source job
one current projection
fresh regeneration from current authority
```

It may express:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

with bounded citation provenance.

It does not require page persistence, revision history, search, internal links, infoboxes, page metrics, media, editing, or model-context re-entry.

## 3. Authority chain remains separated

Final V1 authority chain:

```text
current SimCore authority
    ↓
current source-job authority
    ↓
Exposure
    ↓
Settlement Context Composer
    ↓
PK document validator
    ↓
validated reference states
    ↓
optional validated citation bundle
    ↓
PUBLIC_REFERENCE_DOCUMENT_V1
```

No stage may collapse these distinctions:

```text
world truth
!= exposure
!= public-record settlement
!= citation existence
!= presentation styling
```

## 4. Repetition and popularity remain non-settlement signals

The convergence contract preserves:

```text
repeated NEWS reports
SOCIAL_FEED likeCount
viewCount
repostCount
replyCount
followerCount
engagementScore
trendRank
viralityScore
```

as potentially meaningful source-world signals in their own families, but never automatic PUBLIC_KNOWLEDGE settlement authority.

Canonical rule:

```text
PUBLIC ATTENTION
!= PUBLIC KNOWLEDGE SETTLEMENT
```

## 5. Citation boundary remains additive

PK-4 citation provenance remains an additive support surface.

```text
citation count
source prestige
URL presence
footnote number
```

must not upgrade settlement or truth.

Citation failure may degrade citation presentation without silently rewriting an already validated assertion's semantic state.

## 6. Candidate C decision

For V1:

```text
C1 survival         = NO
C2 stable identity  = NO
C3 mutation         = NO
C4 append/merge     = NO
C5 derived lineage  = NO
C6 context re-entry = NO
C7 partial survival = NO
C8 delayed effect   = NO
```

PK-5's named durable profiles remain future capability profiles, not implementation requirements.

## 7. Reserved future expansion lanes

PK-6 must explicitly preserve the following as legitimate future product capabilities.

### E1 Durable / revisioned page

Uses PK-5 PK-D1..PK-D4 profiles as requirements demand.

Possible features:

```text
same page across turns
revision history
compare
restore
citation evolution
historical inspection
```

Candidate C gates must be activated minimally and explicitly.

### E2 Search / retrieval

Possible future features:

```text
exact title lookup
bounded page search
historical page retrieval
```

Not implied by durability. Requires a separate retrieval/index authority design.

Forbidden inference:

```text
page persisted
→ full-text wiki search automatically authorized
```

### E3 Internal links / entity-reference graph

Possible future features:

```text
PUBLIC_KNOWLEDGE page A links to page B
related public-reference entities
bounded cross-reference navigation
```

A link is not a truth edge and must not automatically establish derived lineage or settlement.

### E4 Infobox / structured reference fields

Possible future features:

```text
trusted dates
roles
organizations
locations
bounded key-value summaries
```

Every field remains semantic and requires explicit authority. The renderer may not invent a wiki-like infobox from prose.

### E5 Media / attachments

Possible future features:

```text
trusted image
map
diagram
source-world document preview
```

Semantic media requires its own authority/validation contract. Delayed exact-page attachment may activate C8.

### E6 Page metrics

Possible future features include:

```text
pageViewCount
revisionCount
watchCount
referenceCount
```

These are reserved product surfaces, not V1 facts. Snapshot cardinality must not be mislabeled as durable page metrics.

Current exclusion means inactive, not permanently forbidden.

### E7 Edit / history interaction

Possible future actions:

```text
edit
append
remove
restore
compare
inspect revision
```

These are mutation/history capabilities and require PK-5/Candidate C child contracts. UI presence alone does not authorize semantic mutation.

### E8 Cross-family derivation

Possible future product flow:

```text
BOARD public rumor record
→ NEWS reporting object
→ PUBLIC_KNOWLEDGE settlement candidate
```

This must never be automatic truth propagation. Formal derived-from-derived lineage may activate C5 and still requires independent PUBLIC_KNOWLEDGE settlement authority.

## 8. Expansion lanes are independent

Canonical rule:

```text
OPEN E1
!= OPEN E2..E8
```

Examples:

```text
durable page identity
!= search

search
!= context re-entry

revision history
!= cross-family propagation

media
!= page persistence
```

Each future child design opens only the minimum authority and Candidate C gates required by its concrete consumer.

## 9. Source-irrelevant baseline survives convergence

PUBLIC_KNOWLEDGE design completion must not create work on unrelated turns.

On a source-irrelevant turn:

```text
PUBLIC_KNOWLEDGE settlement composition = NONE
PK validation = NONE
citation validation = NONE
PK presentation build = NONE
page retrieval = NONE
history scan = NONE
network = NONE
extra model call = NONE
```

Only bounded source-orchestration eligibility checks may occur under the existing 3M-9 contract.

## 10. Community compatibility remains separate

Legacy Community block counts and `[RT N]` numbering remain owned by existing Community/Reaction contracts.

```text
PUBLIC_KNOWLEDGE family convergence
!= legacy Community counter migration
```

PK-6 neither removes nor redefines those existing compatibility surfaces.

## 11. Presentation does not imply persistence

A document may visually resemble a wiki/reference page while remaining a current projection.

```text
wiki-like DOM
!= durable page

citation markers
!= stored bibliography

TOC
!= search index
```

This distinction must remain visible in future implementation planning.

## 12. First implementation readiness vs runtime readiness

PK-6 may conclude that the PUBLIC_KNOWLEDGE design is internally converged.

It does not mean:

```text
runtime implemented
runtime ready
deployed
real long-chat validation passed
```

The global 3.0M runtime readiness gates remain authoritative.

## 13. Expected PK-6 detailed-design conclusion

The detailed convergence document should be allowed to conclude:

```text
PUBLIC_KNOWLEDGE PK-0..PK-6 = DESIGN CONVERGED
PUBLIC_KNOWLEDGE V1 = SNAPSHOT-COMPLETE
CANDIDATE C FOR V1 = NOT ACTIVATED
NEXT PK CHECKPOINT = NONE
```

Future work after PK-6 should be opened as a named expansion lane such as:

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

rather than inventing PK-7 merely because PK-6 finished.

## 14. Impact classification

```text
runtime code             = NO
storage                  = NO
prompt/output bytes      = NO
DOM/CSS implementation   = NO
network/retrieval        = NO
Candidate C activation   = NO
production branch        = NO
release behavior         = NO
```

## 15. Final impact verdict

```text
PK-6 IMPACT = DESIGN CONVERGENCE ONLY
PUBLIC_KNOWLEDGE V1 = FIRST-IMPLEMENTATION-COMPLETE IN DESIGN
LONG-TERM REFERENCE PRODUCT CAPABILITIES = RESERVED, NOT DISCARDED
PRODUCTION = UNCHANGED
```
