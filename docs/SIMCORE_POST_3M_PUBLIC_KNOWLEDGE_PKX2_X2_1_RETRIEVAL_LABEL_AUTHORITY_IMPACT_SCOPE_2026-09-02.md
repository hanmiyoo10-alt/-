# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-1 Retrieval / Label Authority Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-1 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-1 · RETRIEVAL · CURRENT LABEL AUTHORITY · IMPACT SCOPE**

## 0. Purpose

X2-0 froze `ACTIVE_LIFETIME_PUBLIC_REFERENCE_SEARCH_V1` and reserved X2-1 for the exact retrieval owner, trusted current label join, and ephemeral search descriptor contract.

This checkpoint selects the narrow first seam only. It does not implement storage reads, a label service, search code, ranking, UI, runtime schemas, model calls, network calls, background indexing, release changes, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Fresh authority findings

Existing frozen contracts already establish:

```text
PK-X1 / PX1-2 identity owner
→ owns DurablePublicReferencePageIdentityV1 locator records

DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

and:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

with the trusted current target context, not model output, owning visible title/display-label data.

PX1-1 also freezes:

```text
targetIdentityRef
= opaque stable same-target locator
```

and explicitly forbids deriving identity from `displayLabel`.

Therefore X2-1 must consume two distinct authorities without merging them:

```text
PAGE LOCATOR AUTHORITY
!=
CURRENT HUMAN LABEL AUTHORITY
```

## 2. Selected seam

Frozen selected seam:

```text
ACTIVE_LIFETIME_IDENTITY_ENUMERATION_CURRENT_LABEL_JOIN_V1
```

Conceptual flow:

```text
explicit current PK-X2 search authority
+
trusted ACTIVE lifetimeScopeRef
        ↓
PK-X1 identity owner
        ↓ authoritative bounded complete enumeration
DurablePublicReferencePageIdentityV1[]
        ↓ exact targetIdentityRef join only
admitted upstream current-label authority
        ↓
CurrentTargetSearchLabelBindingV1[]
        ↓
X2 retrieval/label composer
        ↓
CurrentPublicReferenceSearchDescriptorV1[]
        ↓
X2-2 candidate visibility gate
```

## 3. Identity enumeration owner

The only admitted source of already-minted page identities is the PK-X1 authoritative identity owner.

It may be asked to enumerate records under the exact key-domain:

```text
namespace = PUBLIC_KNOWLEDGE_DOCUMENT
lifetimeScopeRef = trusted current ACTIVE PK-X1 lifetimeScopeRef
```

The enumeration operation is read-only.

It may return only PK-X1-owned locator state. It must not fabricate or project semantic page data.

## 4. Enumeration must be authoritative and complete for the bounded request

V1 search must distinguish:

```text
AUTHORITATIVE EMPTY
```

from:

```text
UNAVAILABLE
PARTIAL
TRUNCATED WITHOUT PROOF OF COMPLETENESS
CORRUPT
WRONG SCOPE
```

Canonical rule:

```text
NO RETURNED RECORDS
!=
AUTHORITATIVE NO PAGES
```

For the first X2 profile, a search corpus may proceed only from a bounded enumeration that proves completeness for the exact admitted request domain.

Concrete numeric caps are deferred to X2-3.

If the corpus cannot be completely enumerated within the future admitted cap, V1 holds/fails closed rather than silently searching an arbitrary prefix.

## 5. Enumeration does not return semantics

Forbidden enumeration payloads include:

```text
page title
displayLabel
old label
validated article body
assertion text
citation bundle
settlement state
sourceAuthorityRef
last-known-good semantic page
revision content
renderer state
DOM / HTML
host transcript position
search rank
```

Canonical rule:

```text
IDENTITY ENUMERATION
= ADDRESS ENUMERATION
NOT ARTICLE RETRIEVAL
```

## 6. Current label authority seam

X2-1 does not create a global entity registry or global title registry.

Instead it requires an admitted upstream capability that can issue a **current human-facing label binding** for an already-admitted `targetIdentityRef`.

The semantic owner of that label remains the same upstream/current target authority class that already owns current display-label data for PUBLIC_KNOWLEDGE.

X2 only consumes the label through a least-authority adapter.

Conceptual binding:

```text
CurrentTargetSearchLabelBindingV1
  labelAuthorityRef
  targetIdentityRef
  validForLifetimeScopeRef
  currentTrustedDisplayLabel
  bindingState
```

Exact runtime serialization remains future implementation authority.

## 7. No universal label registry requirement

Different target kinds may have different upstream semantic owners.

X2-1 does not require:

```text
one SimCoreEntityRegistry
one global name database
one cross-conversation alias database
one universal entity resolver
```

It requires only:

```text
for an enumerated targetIdentityRef,
an admitted current label authority can either
  A. return one exact current label binding, or
  B. explicitly report unsupported/unavailable/conflict
```

If no such current label capability exists, X2 does not reconstruct the label from stale derived content.

## 8. Exact join key

The only semantic join between the PK-X1 identity record and the current-label binding is exact `targetIdentityRef` equality.

Required first-scope conditions:

```text
identityRecord.namespace
== PUBLIC_KNOWLEDGE_DOCUMENT

identityRecord.lifetimeScopeRef
== trusted current lifetimeScopeRef

labelBinding.targetIdentityRef
== identityRecord.targetIdentityRef

labelBinding.validForLifetimeScopeRef
== trusted current lifetimeScopeRef

labelBinding.bindingState
== current exact admitted binding
```

Forbidden joins:

```text
same text label
similar text label
same page title
same NEWS headline
same BOARD name
same SOCIAL_FEED handle
same host transcript wording
model semantic similarity
```

## 9. Label does not become identity

Canonical invariants:

```text
currentTrustedDisplayLabel
!= targetIdentityRef
!= pageIdentity
```

Legal rename:

```text
pageIdentity = P
targetIdentityRef = T
old current label = "Old Name"
new current label = "New Name"

→ P and T remain unchanged
→ current search label becomes "New Name"
```

No PK-X1 durable record mutation is required.

## 10. Same label may identify multiple targets

Legal:

```text
Target A currentTrustedDisplayLabel = "Alex"
Target B currentTrustedDisplayLabel = "Alex"

targetIdentityRef(A) != targetIdentityRef(B)
pageIdentity(A)       != pageIdentity(B)
```

X2-1 must not merge, deduplicate, or repair those identities by label text.

Query/ranking behavior for duplicate labels belongs to X2-3.

## 11. No label fallback chain

If the current trusted label binding is missing, held, stale, unsupported, ambiguous, or conflicting, forbidden fallback sources are:

```text
PK-X1 record metadata
old PK title cache
old rendered PUBLIC_KNOWLEDGE card
host transcript
NEWS headline
BOARD nickname/title
SOCIAL_FEED profile/handle
LIVE_REACTION nickname
model-generated title
search query text itself
previous successful search descriptor
```

Canonical rule:

```text
CURRENT LABEL UNAVAILABLE
→ LABEL-SEARCHABILITY UNAVAILABLE
NOT
→ REUSE LAST KNOWN LABEL
```

## 12. Exact-current label cardinality

The first profile requires exactly one admitted current display label for one `targetIdentityRef` at descriptor-build time.

If trusted inputs expose multiple unresolved competing current labels for the same target identity:

```text
HOLD / CONFLICT
```

not:

```text
pick first
pick shortest
pick newest timestamp heuristically
ask model
store both as aliases
```

Alias sets and rename history remain deferred.

## 13. Descriptor ownership

Selected ephemeral descriptor:

```text
CurrentPublicReferenceSearchDescriptorV1
  pageIdentity
  targetIdentityRef
  currentTrustedDisplayLabel
  labelAuthorityRef
```

X2-1 freezes semantic fields only, not runtime serialization.

Descriptor fields are assembled from trusted upstream owners:

```text
pageIdentity             ← PK-X1 identity owner
targetIdentityRef        ← PK-X1 record / PX1-1 admitted identity chain
currentTrustedDisplayLabel ← admitted current label authority
labelAuthorityRef        ← admitted current label authority
```

The X2 composer owns only the bounded assembly relationship. It does not rewrite upstream-owned fields.

## 14. Descriptor is ephemeral and non-canonical

The descriptor is:

```text
EPHEMERAL
CURRENT SEARCH ACTIVATION ONLY
READ-ONLY
NON-SETTLEMENT
NON-WORLD-TRUTH
NON-PAGE-SEMANTIC
NON-PERSISTENT
```

It must not be written back into the PK-X1 identity record.

It must not become a target alias store or semantic search index.

## 15. Record without usable label

An identity record may legally exist while no usable current label binding exists.

For V1:

```text
identity record exists
+
current label unavailable
→ no label-bearing search descriptor
```

An exact opaque-ID locator operation may still resolve the record internally in a later X2-3 query contract, but it may not fabricate a human-facing label or bypass X2-2 visibility policy.

Whether such a locator can produce any visible UI without a current label belongs to X2-2/X2-4.

## 16. Label visibility is not page discoverability

A current trusted display label existing does not itself authorize search-result visibility.

```text
CURRENT LABEL READY
!=
PAGE CURRENTLY DISCOVERABLE
```

X2-2 remains the owner of the candidate-to-visible firewall.

X2-1 outputs descriptors for internal downstream search processing only.

## 17. Label authority does not prove page semantics

Canonical separation:

```text
CURRENT LABEL AUTHORITY
→ what the current target is called for human-facing addressing

PK-X1 IDENTITY AUTHORITY
→ durable page locator

PK-2 / current PK authority
→ whether current page semantic content may be shown
```

Therefore:

```text
label exact match
!= page current
!= assertion settled
!= source current
!= publication authority
```

## 18. Model boundary

Model output cannot provide trusted values for:

```text
pageIdentity
targetIdentityRef
labelAuthorityRef
currentTrustedDisplayLabel
bindingState
lifetimeScopeRef
```

A model-proposed label may be ordinary untrusted semantic text elsewhere, but X2-1 cannot promote it into the trusted search label seam.

Preferred architecture remains out-of-band trusted authority data.

## 19. Network / derived-family boundary

The first X2-1 profile does not call a network service to discover labels and does not inspect derived families for names.

Forbidden search-label authority:

```text
web search result
NEWS
BOARD
SOCIAL_FEED
LIVE_REACTION
PUBLIC_KNOWLEDGE old page body
sibling-family agreement
host transcript frequency
```

An upstream target owner may itself have an implementation-specific storage mechanism later, but X2-1 does not authorize new network discovery or infer ownership from network content.

## 20. Failure classes selected for detailed design

X2-1 detailed design must preserve at least:

```text
RETRIEVAL_READY_COMPLETE
RETRIEVAL_EMPTY_COMPLETE
HOLD_IDENTITY_ENUMERATION_UNAVAILABLE
HOLD_IDENTITY_ENUMERATION_PARTIAL
INVALID_ENUMERATION_SCOPE
INVALID_ENUMERATION_NAMESPACE
INVALID_IDENTITY_RECORD_SET

LABEL_READY_EXACT
UNSUPPORTED_LABEL_CAPABILITY
HOLD_LABEL_UNAVAILABLE
HOLD_LABEL_AMBIGUOUS
HOLD_LABEL_CONFLICT
INVALID_LABEL_SCOPE
INVALID_LABEL_BINDING
INVALID_LABEL_VALUE

DESCRIPTOR_READY
DESCRIPTOR_OMITTED_LABEL_NOT_READY
```

Exact runtime enum spelling remains implementation-authority work.

## 21. Failure is not empty search

Diagnostics must preserve:

```text
identity store unavailable
!= no pages exist

label authority unavailable
!= query had no matches

label conflict
!= no matches
```

X2-3 may only report a legitimate `NO_LEXICAL_MATCH` after X2-1 has supplied an admitted corpus according to the final contract.

## 22. Receipt/data minimization

Any future X2-1 diagnostic receipt should contain bounded control metadata only.

It should not duplicate:

```text
article bodies
assertions
citations
old labels
hidden labels
settlement text
source content
```

Current display labels belong in ephemeral descriptors only as required for search, not in long-lived diagnostic history.

Counts, if retained for diagnostics, remain non-user-facing and cannot become a hidden-result-count UI authority.

## 23. Common owner-write invariant

X2-1 inherits the common integration invariant:

```text
A projected/partial write may update only fields owned by that writer.
Omission of unowned metadata does not mean delete.
```

Because X2-1 is read/compose-only, the preferred first profile performs no persistent writes at all.

It may not repair PK-X1 records or upstream target-label records.

## 24. Dormancy

When no current X2 search job is active:

```text
identity enumeration = 0
current label lookup = 0
descriptor assembly = 0
persistent writes = 0
background refresh = 0
network calls = 0
model calls = 0
```

Durable page identities existing in storage do not activate retrieval.

## 25. Performance boundary

Active work must be bounded over one exact current-lifetime corpus.

X2-1 freezes shape, not numeric limits.

Concrete limits for:

```text
max identity records enumerated
max label bindings resolved
max descriptor count
max display-label length
```

belong to X2-3.

If future caps prevent complete authoritative enumeration, V1 must hold/fail closed rather than silently search a truncated prefix.

## 26. Candidate C reassessment

No new Candidate C gate is selected by X2-1.

```text
C1 cross-turn page identity = inherited from PK-X1
C2 stable derived identity  = inherited from PK-X1
C3 mutation                 = no new requirement
C4 append/merge             = no new requirement
C5 derived lineage          = no new requirement
C6 context re-entry         = no new requirement
C7 semantic survival        = no new requirement
C8 delayed semantic effect  = no new requirement
```

A persistent mutable alias/title index would require a fresh reassessment before authorization.

## 27. Explicit defers

```text
DEFER · X2-2 CANDIDATE VISIBILITY / DISCOVERABILITY GATE
DEFER · X2-3 QUERY NORMALIZATION / MATCHING / RANKING / NUMERIC CAPS
DEFER · X2-4 RESULT SELECTION / NAVIGATION / CURRENT REVALIDATION
DEFER · X2-5 LIFETIME / DORMANCY / CONVERGENCE
DEFER · DURABLE MUTABLE LABEL INDEX
DEFER · ALIAS / RENAME HISTORY
DEFER · HISTORICAL LABEL SEARCH
DEFER · PAGE-BODY FULL-TEXT SEARCH
DEFER · GLOBAL ENTITY REGISTRY
DEFER · NETWORK LABEL DISCOVERY
DEFER · MODEL LABEL RECONSTRUCTION
```

## 28. Impact verdict

```text
X2_1_IMPACT_SCOPE = FROZEN
SELECTED_SEAM = ACTIVE_LIFETIME_IDENTITY_ENUMERATION_CURRENT_LABEL_JOIN_V1
IDENTITY_ENUMERATION_OWNER = PK-X1 AUTHORITATIVE IDENTITY OWNER
ENUMERATION_SCOPE = EXACT ACTIVE LIFETIME + PUBLIC_KNOWLEDGE_DOCUMENT
ENUMERATION_COMPLETENESS = REQUIRED FOR BOUNDED REQUEST
CURRENT_LABEL_OWNER = ADMITTED UPSTREAM CURRENT TARGET/LABEL AUTHORITY
JOIN_KEY = EXACT targetIdentityRef
LABEL_FALLBACK = NONE
PERSISTENT_SEARCH_INDEX = NO
PERSISTENT_WRITES = NO
DESCRIPTOR = EPHEMERAL CURRENT ACTIVATION ONLY
X2_2_VISIBILITY_GATE = STILL REQUIRED
NEW_CANDIDATE_C_GATES = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Final impact rule:

```text
X2-1 MAY JOIN A TRUSTED ADDRESS TO A TRUSTED CURRENT NAME.
IT MAY NOT INVENT EITHER ONE.
```