# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-4 Settlement / Citation / Search Integration Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-4 DESIGN FROZEN · CURRENT SETTLEMENT RE-DERIVATION · DURABLE CLAIM-SUPPORT ANCHOR FOR REVISION CITATIONS · NO STABLE CITATION IDENTITY · EXACT STORED-SURFACE REAUTHORIZATION · PAGE-LEVEL PK-X2 ONLY · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-4 · SETTLEMENT · CITATION · SEARCH · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 froze the revisioned-page master architecture.
D2-1 froze immutable committed revisions and authoritative current-head ownership.
D2-2 froze mutation/commit safety.
D2-3 froze revision read, compare, and copy-forward restore.
The D2-4 impact scope froze the integration seam with PK-1 settlement, PK-4 citation/provenance, and PK-X2 search.

D2-4 now freezes the detailed integration contract.

This document authorizes no runtime implementation, storage migration, prompt change, model call, DOM/CSS, network call, release, or `release-simcore` mutation.

## 1. Canonical authority separation

```text
STORED REVISION SEMANTICS
!= CURRENT WORLD / SOURCE SUPPORT
!= CURRENT EXPOSURE
!= CURRENT SETTLEMENT AUTHORITY
!= CURRENT CITATION AUTHORITY
!= SEARCH DISCOVERABILITY
```

A committed revision records what PUBLIC_KNOWLEDGE semantic state was admitted at commit time. It does not carry perpetual authority to show that state later.

## 2. Existing authorities remain owners

### PK-1 settlement

`PublicKnowledgeSettlementContextComposer` remains stateless, current-projection-only, bounded, deterministic, and fail-closed.

Stored revision state cannot mint settlement basis.

### PK-4 citation/provenance

PK-4 remains the citation relationship validator.

Its existing `citationRef` remains:

```text
CURRENT_PROJECTION_ONLY
NOT A PERSISTENT BIBLIOGRAPHIC ID
```

### PK-X2 search

PK-X2 remains active-lifetime, page-address search.

It does not become a revision search engine.

## 3. D2-4 primary pipeline

For current or old committed revision inspection:

```text
exact pageIdentity + exact committed revisionRef
        ↓
D2-1 revision owner integrity
        ↓
current lifetime / target identity
        ↓
current source support / Exposure
        ↓
current PK-1 / PK-2 settlement re-derivation
        ↓
current PK-4 citation reauthorization
        ↓
D2-4 stored-surface compatibility
        ↓
D2-3 BODY_INSPECTION_ELIGIBLE or BODY_WITHHELD
```

No stage may use stored revision metadata to upgrade an upstream authority stage.

## 4. Revision public-reference surface

A committed revision may persist only already-admitted visible PUBLIC_KNOWLEDGE semantics plus the minimum non-renderable support anchors required for later support-at-use.

Conceptual revision-owned surface:

```text
RevisionPublicReferenceSurfaceV1
  assertions[]
    assertionOrdinal
    referenceState
  revisionCitations[]
  citationAttachments[]
  supportAnchors[]   # non-renderable, authority-bounded
```

This is part of one immutable revision snapshot.

## 5. Revision-local citation record

A first-scope persisted citation record is revision-local semantic material, not durable citation identity.

Conceptually:

```text
RevisionCitationRecordV1
  revisionCitationSlot
  supportAnchorRef
  sourceLabel
  recordLabel?
  locatorLabel?
  publishedAtLabel?
```

Optional link/navigation metadata may be retained separately but does not become semantic source identity.

`revisionCitationSlot` is:

```text
unique only inside one revision
non-renderable
not reused as cross-revision identity
not a footnote number
not a citationRef
```

## 6. Revision citation attachment

Conceptually:

```text
RevisionCitationAttachmentV1
  assertionOrdinal
  revisionCitationSlot
  role
```

`role` remains the PK-4 assertion→citation relationship vocabulary.

No persistent assertion identity is created.

## 7. Why old `citationRef` is not persisted as authority

PK-4 froze `citationRef` as current-projection identity.

Therefore D2-4 forbids:

```text
store citationRef C in R4
later current context also contains string C
→ declare same source record
```

String reuse is not provenance continuity.

The revision may retain old `citationRef` only as inert diagnostic/serialization residue if a future physical representation needs it, but ordinary D2-4 authority must not depend on it.

## 8. Need for a durable claim-support anchor

Visible labels are not unique source identity.

Forbidden:

```text
same sourceLabel
+ same recordLabel
→ same source support
```

D2-4 therefore requires an owner-issued non-renderable support locator for citation-bearing durable revisions.

Conceptual name:

```text
RevisionClaimSupportAnchorRef
```

It is a support-at-use anchor, not a bibliographic identity.

## 9. Support-anchor owner

The anchor is issued only by the existing Evidence / Lineage / support authority chain that owns the exact public-record support relation.

D2-4 does not mint it from:

```text
citation labels
URLs
claim text
model output
revisionRef
pageIdentity
search results
```

The anchor owner must guarantee, inside the authorized page lifetime/stale-reference horizon:

```text
non-recycled identity
exact support-object binding
exact target/source scope binding
fail-closed current resolution
```

## 10. Anchor is not truth

Canonical rule:

```text
ANCHOR RESOLVES SAME SUPPORT OBJECT
!= CLAIM IS CURRENTLY TRUE
!= CLAIM IS CURRENTLY SETTLED
!= CITATION IS CURRENTLY DISPLAYABLE
```

Current source support, Exposure, settlement, and PK-4 role authorization still run independently.

## 11. Anchor availability gate

First D2-4 durable citation contract is fail-closed.

If a candidate revision contains visible citation semantics but the admitted support authority cannot provide a durable support anchor satisfying D2-4:

```text
HOLD_UNSUPPORTED_DURABLE_CITATION_BINDING
→ no citation-bearing revision commit
```

The system must not silently persist labels and hope to re-identify the source later.

This is a future runtime-readiness dependency, not an implementation performed here.

## 12. Citationless revisions

PK-4 citations remain supplementary provenance.

A revision with zero visible citations does not require a citation support anchor merely because current citation context contains possible sources.

```text
stored citations = []
→ citation-surface compatibility is vacuously satisfied
```

Underlying current source/settlement support is still required for the assertion body.

## 13. Commit-time settlement surface

At new-revision commit, each retained assertion persists the PK-2 validated `referenceState` admitted under the then-current PK-1 settlement context.

The revision does not persist settlement context as future authority.

Ordinary durable semantic state may persist:

```text
referenceState
```

but not as a future authorizer:

```text
settlementBasisRef authority
composer receipt authority
claimSupportRef currentness
```

## 14. Commit-time citation surface

A citation-bearing revision is materialized only from a validated PK-4 bundle after exact current claim-support and role joins.

Commit transformation:

```text
current validated PK-4 citation
+ current durable support anchor for its claim-support relation
        ↓
revision-local citation record
+ revision-local attachment
```

Current `citationRef` is not promoted to durable identity.

## 15. Link metadata boundary

PK-4 froze `trustedHref` as optional navigation metadata and explicitly separated linkability from citation validity.

D2-4 preserves that separation.

Canonical rule:

```text
CITATION SEMANTIC COMPATIBILITY
!= LINK STILL CLICKABLE
```

An old revision citation may remain semantically inspectable while current host link-safety policy renders it as plain text.

A stale/dead/rejected href alone does not change revision truth or settlement.

## 16. Settlement re-derivation request

For every stored assertion inspected, D2-4 creates only an ephemeral current revalidation input from the stored source-owned semantic fields:

```text
assertionOrdinal
sectionKind
mode
content
```

Stored validator-owned `referenceState` is the value to be checked, not an authority input.

Current PK-1/PK-2 independently derive the current result.

## 17. Settlement compatibility rule

Let:

```text
S_old = stored revision referenceState
S_now = independently derived current referenceState
```

First D2-4 rule:

```text
S_now == S_old
→ settlement semantic surface compatible

S_now != S_old
→ BODY_WITHHELD_REWRITE_REQUIRED
```

Examples:

```text
old SETTLED_PUBLIC_REFERENCE
current CORRECTED_CURRENT_RECORD
→ old body withheld

old ATTRIBUTED_BUT_NOT_SETTLED
current SETTLED_PUBLIC_REFERENCE
→ old body withheld
```

The fact that current state looks "stronger" does not permit silently rewriting historical committed semantics during READ.

## 18. Settlement unavailable / hold

If current settlement authority is unavailable, ambiguous, unsupported, or HOLD for any retained assertion:

```text
whole revision body withheld
```

D2-3 whole-revision atomicity remains authoritative.

No assertion-level partial old revision is rendered.

## 19. Current citation reauthorization

For every stored citation attachment, D2-4 must prove all of:

```text
1. supportAnchorRef resolves CURRENT_EXACT to the same admitted support relation
2. current PK-2 assertion join resolves a current claim-support object for that relation
3. current PK-4 citation context contains an eligible citation on that exact claim-support relation
4. stored role is currently authorized
5. stored visible citation semantic fields exactly match one current-authorized citation presentation record
```

No fuzzy matching is authorized.

## 20. Stored-visible citation semantic equality

The first equality surface includes:

```text
sourceLabel
recordLabel?
locatorLabel?
publishedAtLabel?
attachment role
```

It excludes:

```text
current citationRef
revisionCitationSlot
visible footnote number
DOM ids
CSS state
link clickability
operation diagnostics
```

`trustedHref` is current navigation metadata and is not required to remain byte-identical for semantic citation compatibility.

## 21. Current extra citations do not rewrite old revision

Current PK-4 may authorize additional citations that were not present in an old revision.

That alone does not make the old revision unsafe.

D2-4 asks whether every **stored** visible citation relationship can be reauthorized now.

```text
stored surface
⊆ exact current-authorized semantic citation surface
```

with exact multiplicity for stored records.

Current extra eligible citations are ignored for old-revision READ.

They may enter a future new revision only through an explicit D2-2 citation-producing mutation.

## 22. Missing or changed stored citation

If any stored citation cannot be reauthorized exactly:

```text
old source record no longer resolvable
support anchor invalidated
role no longer authorized
sourceLabel/recordLabel/locator/date semantic display changed
citation support moved to different claim-support relation
```

then:

```text
BODY_WITHHELD_CITATION_SURFACE
```

The body is not rendered with the citation silently removed.

Reason:

```text
revision without its committed citation surface
!= committed revision
```

## 23. No label-based provenance recovery

When an anchor cannot resolve, forbidden fallback includes:

```text
same URL
same sourceLabel
same recordLabel
same hostname
same title
same text
embedding similarity
```

The correct state is fail-closed.

## 24. Inspection compatibility receipt

Conceptual ephemeral result:

```text
RevisionPublicReferenceCompatibilityReceiptV1
  pageIdentity
  revisionRef
  currentnessMarker
  settlementDisposition
  citationDisposition
  overallDisposition
  bounded reasonCodes[]
```

No assertion body, private evidence, or quarantined payload enters the receipt.

## 25. First dispositions

Conceptual states:

```text
PUBLIC_REFERENCE_SURFACE_COMPATIBLE
WITHHELD_SETTLEMENT_CHANGED
WITHHELD_SETTLEMENT_UNAVAILABLE
WITHHELD_CITATION_SUPPORT_INVALIDATED
WITHHELD_CITATION_ROLE_CHANGED
WITHHELD_CITATION_VISIBLE_SURFACE_CHANGED
WITHHELD_CITATION_AUTHORITY_UNAVAILABLE
INVALID_REVISION_PUBLIC_REFERENCE_SURFACE
UNSUPPORTED_DURABLE_CITATION_BINDING
```

Exact runtime enum spelling is not frozen.

## 26. Current head uses the same current authority principle

The fact that a revision is current head proves only latest committed state under the revision owner.

If current settlement/citation compatibility later fails:

```text
current head remains head
current semantic page becomes unavailable
```

Support change alone does not auto-create a revision.

Repair requires an explicit D2 revision-producing operation.

## 27. Explicit repair path

Examples:

```text
settlement changed
→ CORRECTION_UPDATE or other admitted current mutation

citation source changed
→ REPLACE_CITATION
```

The operation constructs a full current candidate and passes D2-2.

Forbidden:

```text
read detects changed settlement
→ silently mutate head
```

## 28. D2-2 citation mutation integration

`APPEND_CITATION` and `REPLACE_CITATION` may address current PK-4 citations using current operation-local `citationRef`.

Before commit:

```text
current citationRef
→ current exact PK-4 validation
→ durable support anchor
→ revision-local citation semantics
```

After commit, current `citationRef` has no durable authority role.

## 29. Citation no-op behavior

If a later current citation context assigns a different current `citationRef` but the validated durable revision citation semantic surface is unchanged:

```text
semantic no-op
→ no new revision solely because citationRef changed
```

This follows D2-2 semantic no-op policy.

## 30. Restore source prerequisite

D2-3 remains authoritative:

```text
NOT CURRENTLY INSPECTABLE
→ NOT A PK-D2 RESTORE SOURCE
```

Therefore D2-4 settlement/citation compatibility must succeed for the selected source revision before restore candidate construction.

## 31. Restore authority stripping

The old revision may seed only source-owned semantic intent.

Restore must not treat as current authority:

```text
old referenceState
old settlement basis/result
old claimSupportRef
old sourceAuthorityRef
old citationRef
old citation role authorization receipt
old support-at-use receipt
```

## 32. Restore citation intent

Because source revision is already inspection-eligible, D2-4 may carry forward its visible citation **intent** into the new candidate as revision-local semantic intent:

```text
assertionOrdinal
stored visible citation semantic tuple
role
supportAnchorRef
```

Current support-anchor resolution and PK-4 validation must rebind that intent to current operation-local citation authority.

No old `citationRef` is reused.

## 33. Restore revalidation result

After current PK-1/PK-2/PK-4 revalidation, the new complete candidate may contain current validator-owned fields and current citation attachment identities.

It then enters:

```text
D2-2 whole-page restore footprint
→ semantic no-op check
→ expectedRevision re-check
→ atomic new-revision commit
```

Restore never edits the source revision.

## 34. Restore surface change

First D2-4 keeps restore conservative.

Because D2-3 source must be inspection-compatible, a restore that requires a materially different settlement/citation semantic surface is not treated as a faithful restore.

```text
source visible semantic surface
!= current validated restore candidate surface
→ RESTORE_RECONCILIATION_REQUIRED
→ no commit
```

A separate edit/correction/citation operation may create the desired updated state explicitly.

## 35. Compare integration

Both compare sides must pass D2-4 under the same coherent current authority epoch used by D2-3.

Only then may comparison include revision public-reference/citation semantic records.

No compare path may display a citation from a withheld side.

## 36. Citation comparison without citation identity

Cross-revision citation equality is semantic-record equality, not durable citation identity.

A compare may classify exact canonical citation semantic tuples and attachments as:

```text
UNCHANGED_EXACT
LEFT_ONLY
RIGHT_ONLY
```

It must not claim:

```text
citation A was edited into citation B
```

unless a future stable-citation-identity contract exists.

## 37. Search remains page-oriented

PK-X2 flow remains:

```text
explicit search job
→ current target-level discoverability
→ visible pageIdentity hit
→ user selection
→ exact page resolution
→ resolve current head NOW
→ current D2 settlement/citation/support revalidation
→ current page or unavailable surface
```

Search never materializes historical revision bodies merely to rank pages.

## 38. Search result does not pin head

If search result list was produced while:

```text
head = R8
```

and the user opens it after:

```text
head = R9
```

ordinary page navigation resolves R9.

The result does not silently pin R8.

## 39. Search discoverability remains weaker than article availability

X2-2 froze target-level discoverability separately from article semantics.

Therefore this state is legal:

```text
page address = VISIBLE_CURRENT
current head body = unavailable under D2-4
```

The UI may navigate to a current-page-unavailable surface.

It may not fall back to an older revision.

## 40. Search does not expose revision metadata

D2-4 does not add to ordinary PK-X2 results:

```text
revision count
current revisionRef
last revision operation
old citation labels
old settlement states
historical snippets
restore buttons
```

Revision navigation remains page-local after explicit page/revision interaction.

## 41. No revision full-text search

Still forbidden:

```text
search all old revision bodies
search citation labels across revision history
search "pages that used to be contested"
rank by revision count
rank by citation count
```

Such requirements need a separate historical/index design and likely a Candidate C/C7 reassessment.

## 42. Whole-revision atomicity preserved

If one assertion's current settlement surface or one stored visible citation relationship fails D2-4 compatibility:

```text
whole revision semantic body withheld
```

D2-4 does not synthesize a partial old revision.

## 43. Presentation behavior

When body is withheld, ordinary UI may show bounded revision metadata/unavailable state already allowed by D2-3.

It must not reveal:

```text
which secret/private assertion failed
hidden citation label
claimSupportRef
supportAnchorRef
settlement basis internals
number of quarantined items
```

## 44. Link rendering remains current presentation policy

For an inspection-eligible revision citation:

```text
current trusted navigation metadata + host link safety PASS
→ may render clickable

otherwise
→ render stored citation text as plain text
```

No guessed URL is generated.

## 45. C7 firewall

Requirement:

```text
show R4 exactly as it was historically
although current settlement or citation authority no longer supports that exact old semantic surface
```

activates:

```text
PK-D3 HISTORICAL_PAGE
+ C7 historical survival design
```

PK-D2 refuses that behavior.

## 46. Stable-citation-identity escalation trigger

Requirement for any of the following reopens design:

```text
same bibliographic/source record identity across revisions
citation-specific history
citation rename/alias continuity
citation search across revisions
persistent source page independent of claims
cross-page citation graph
```

D2-4 does not create that capability accidentally.

## 47. Candidate C status

```text
C1 cross-turn survival        = YES
C2 stable derived identity    = YES
C3 semantic mutation          = YES DESIGN
C4 append / merge pressure    = YES DESIGN
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

A support anchor is bounded support-at-use provenance for the same revision consumer. It is not cross-family derived lineage and does not activate C5.

## 48. Ordinary-turn dormancy

Without an explicit active PUBLIC_KNOWLEDGE revision/search operation:

```text
revision inspection = 0
settlement rebind = 0
citation support-anchor resolution = 0
PK-X2 search = 0
revision mutation = 0
```

No background citation refresh or history sweep is authorized.

## 49. Runtime-readiness blockers added/refined by D2-4

Future implementation cannot claim D2-4 ready until it proves at least:

```text
trusted durable support-anchor producer for citation-bearing revisions
non-recycled support-anchor lifetime semantics
current exact support-anchor resolver
current PK-1 settlement re-derivation for stored assertions
current PK-4 citation reauthorization from exact support relation
stored revision citation semantic canonicalization
whole-revision withholding on incompatibility
PK-X2 current-head resolution at open time
no historical revision search leakage
```

## 50. Concurrent-main watch disposition

The D2-4 transaction began after main advanced from D2-3 through Agent Skill O4-A retrospective benchmark foundation work.

That change did not alter PK-D2, PK-1, PK-4, PK-X2, Candidate C, runtime, or release authority.

```text
WATCH · MAIN_ADVANCED_DURING_D2_4_TRANSACTION · NON_BLOCKING
```

## 51. Rejected alternatives

### Persist old citationRef as durable identity

Rejected because PK-4 explicitly made it current-projection-only.

### Re-identify citation by labels/URL

Rejected because string equality is not provenance identity.

### Drop stale citations and still call result old revision

Rejected by D2-3 whole-revision atomicity.

### Auto-create revision when settlement changes

Rejected because reads/support changes are not mutation authority.

### Search historical revision body automatically

Rejected because PK-X2 is page navigation, not historical archive search.

## 52. D2-4 closure verdict

```text
D2-4 SETTLEMENT / CITATION / SEARCH INTEGRATION = DESIGN COMPLETE

stored settlement = committed semantic state, never future authority
stored citation surface = revision-local semantics
citationRef = current-operation only
support continuity = durable non-renderable support anchor
old READ = current exact surface reauthorization required
COMPARE = both sides current-compatible
RESTORE = current rebind + D2-2 new revision
SEARCH = page-level, current-head-at-open
C5-C8 = CLOSED
```

## 53. Next checkpoint

```text
D2-5 · Lifetime / Bounds / Convergence
```

D2-5 must freeze concrete finite bounds/retention behavior, cleanup interactions, runtime evidence requirements, and final Candidate C convergence without authorizing implementation.
