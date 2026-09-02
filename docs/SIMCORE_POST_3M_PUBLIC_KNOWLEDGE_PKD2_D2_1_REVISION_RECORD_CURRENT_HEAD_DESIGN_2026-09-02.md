# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-1 Revision Record / Current Head Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-1 DESIGN FROZEN · IMMUTABLE COMMITTED REVISION RECORD · AUTHORITATIVE SINGLE CURRENT HEAD · OWNER COMMIT MEMBERSHIP · ATOMIC BOOTSTRAP / HEAD ADVANCE · ORPHAN RESIDUE FAIL-CLOSED · C1+C2+C3+C4 ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-1 · REVISION RECORD · CURRENT HEAD · CANDIDATE C C3/C4 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 selected `LINEAR_SINGLE_HEAD_REVISION_CHAIN` with one immutable full validated snapshot per committed revision. D2-1 freezes the ownership and state model required to represent that chain safely.

It answers:

```text
what makes a revision committed?
what does the current head own?
what is a valid pre-bootstrap page?
how is the first revision admitted?
how does a normal head advance remain atomic?
what is an orphan candidate write?
why is "not current head" not equivalent to orphan?
how are missing head targets / duplicate revision identities / broken chains classified?
what must still be revalidated after resolving the current head?
```

This document implements no storage backend, mutation engine, UI action, DOM/CSS, prompt change, model call, network call, runtime schema migration, release transaction, or `release-simcore` mutation.

## 1. Authority chain

D2-1 consumes:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_0_REVISIONED_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_1_REVISION_RECORD_CURRENT_HEAD_IMPACT_SCOPE_2026-09-02
PK-X1 Durable Page Identity family
PK-X2 Public Reference Search family
Candidate C CC-2 Revision / Generation / Operation Safety
Candidate C CC-3 Source History Store / Lifetime / Retrieval
3M-6 Current Projection Support Invalidation
PUBLIC_KNOWLEDGE validation / Exposure / settlement / citation authority
```

Inherited rules remain:

```text
page identity != semantic revision
same pageIdentity != same revisionRef
revision storage != canonical truth
head pointer != current support proof
candidate bytes != committed revision
cache state != durable authority
presentation state != semantic authority
```

## 2. Capability profile

D2-1 does not widen D2-0.

```text
C1 cross-turn survival        = YES
C2 stable derived identity    = YES
C3 semantic mutation          = YES, DESIGN CONTRACT ONLY
C4 append / merge pressure    = YES, DESIGN CONTRACT ONLY
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

Canonical rule:

```text
D2-1 DURABLE REVISION STATE DESIGN
!=
RUNTIME MUTATION AUTHORITY
```

## 3. Primary architecture

Selected architecture:

```text
PK-X1 Page Identity Shell
        |
        v
PK-D2 Revision Owner
  ├─ Committed Revision Membership Authority
  ├─ Immutable Committed Revision Records
  └─ One Authoritative Mutable Current Head
        |
        v
Current Support / Exposure / Settlement / Citation Revalidation
        |
        v
Current Presentation
```

No global revision registry is created.

## 4. Four distinct semantic states

D2-1 separates four concepts that must never collapse.

### A. Page identity

```text
which logical PUBLIC_KNOWLEDGE page?
```

### B. Revision candidate

```text
which proposed next semantic state is being evaluated?
```

### C. Committed revision

```text
which immutable semantic states have been admitted by the revision owner?
```

### D. Current head

```text
which committed revision is the current durable head of that page?
```

Canonical firewall:

```text
PAGE EXISTS
!=
REVISION CANDIDATE EXISTS

CANDIDATE EXISTS
!=
REVISION COMMITTED

REVISION COMMITTED
!=
REVISION IS CURRENT HEAD

REVISION IS CURRENT HEAD
!=
REVISION IS CURRENTLY DISPLAYABLE
```

## 5. Revision owner

PK-D2 has one bounded semantic revision owner for each page namespace/lifetime domain.

The owner alone decides:

```text
revisionRef allocation / reservation
candidate admission
committed membership
current head
expected-revision commit comparison
linear predecessor relation
revision representation version policy
orphan reclamation policy
```

Physical storage may be shared later, but semantic ownership is not shared.

## 6. Candidate and committed record are different authority classes

D2-1 freezes a conceptual separation:

```text
RevisionCandidate
→ ephemeral / pre-commit

CommittedRevisionRecord
→ durable owner-admitted semantic state
```

A candidate may already contain a fully validated semantic snapshot before commit, but it still lacks durable revision authority until owner admission succeeds.

Canonical rule:

```text
VALIDATED CANDIDATE
!=
COMMITTED REVISION
```

## 7. No self-declared commit flag

A model draft, candidate payload, or stored blob may not gain authority by containing fields such as:

```text
isCommitted = true
committed = true
isCurrent = true
head = true
safeToRestore = true
```

Committed status belongs to the revision owner's durable admission boundary, not to self-asserted payload text.

## 8. Committed membership is independent from current head

D2-1 freezes explicit owner-level committed membership or an equivalent atomic storage property.

This means the owner can distinguish:

```text
committed old revision
committed current revision
uncommitted/orphan candidate
```

without inferring status from the head pointer alone.

Canonical rule:

```text
NOT CURRENT HEAD
!=
ORPHAN
```

This rule is critical because valid R1/R2/... historical committed revisions are normally not the current head.

## 9. No orphan detection by head omission

Forbidden cleanup heuristic:

```text
revisionRef not equal to currentHead
→ delete as orphan
```

That would destroy legitimate committed history.

Orphan detection must use owner-controlled commit/admission metadata or another proven transactional property.

## 10. Revision reference authority

`revisionRef` is allocated or reserved only by the PK-D2 revision owner.

Requirements:

```text
exactly one pageIdentity binding
unique inside the page lifetime / stale-reference horizon
not reused for another semantic state inside that horizon
exactly comparable for expected-revision safety
not inferred from title/body/timestamp/search rank
```

D2-1 does not freeze integer, UUID, opaque token, or physical key syntax.

## 11. RevisionRef is not commit authority

Possessing a syntactically valid `revisionRef` does not prove the record is committed.

```text
revisionRef allocated
+ candidate bytes stored
!=
committed revision
```

The committed-membership authority must still admit the record.

## 12. Revision page binding

Every committed revision is bound to exactly one `pageIdentity`.

Forbidden:

```text
same committed revisionRef
→ page P1
→ page P2
```

If detected:

```text
INVALID_REVISION_PAGE_BINDING
```

No alias/title/target similarity may repair this implicitly.

## 13. Previous revision binding

Bootstrap revision:

```text
previousRevisionRef = NONE / bootstrap sentinel under owner contract
```

Every later committed linear revision:

```text
previousRevisionRef = exact head observed and successfully compared at commit
```

This relation records same-page revision continuity only.

```text
PREVIOUS REVISION RELATION
!=
C5 DERIVED SOURCE LINEAGE
```

## 14. Full validated snapshot remains the semantic unit

D2-1 preserves D2-0:

```text
FULL_VALIDATED_PAGE_SNAPSHOT_PER_COMMITTED_REVISION
```

A partial edit request may be input, but the committed revision is a complete owner-materialized semantic state.

This keeps:

```text
omitted field != deletion
```

and avoids semantic dependence on replaying all prior patches.

## 15. Conceptual committed revision shape

A future concrete serialized representation may need the bounded owner-owned subset:

```text
recordSchemaVersion
pageIdentity
revisionRef
previousRevisionRef
operationKind
validatedPublicKnowledgeSnapshot
acceptedSettlementState needed by PK-D2
visibleCitation / provenance references
minimum support references needed by current-use policy
optional restoredFromRevisionRef
```

This is a conceptual ownership shape, not a frozen JSON schema.

## 16. Revision record forbidden content

Do not persist by default:

```text
raw model draft
DENY assertion payload
HOLD assertion payload
quarantined text
hidden Knowledge
private validator inputs
chain-of-thought
DOM/CSS
host transcript clone
search query history
operation token diary
arbitrary diagnostics dump
```

A revision record contains already-admitted public semantic state only.

## 17. Committed revision immutability

Once owner-admitted:

```text
(pageIdentity P, revisionRef R)
→ immutable semantic meaning
```

A later semantic change creates another revision.

Forbidden:

```text
edit bytes behind R7
while continuing to call them R7
```

Representation migration may rewrite physical encoding only if semantic identity/meaning is preserved exactly or the old representation is explicitly rejected.

## 18. Current head role

The authoritative current head answers one question only:

```text
which committed revision is current for page P?
```

Conceptually:

```text
pageIdentity
currentRevisionRef
headRepresentationVersion when needed
```

The head is not a duplicate page body store.

## 19. Head must not duplicate semantic authority

Forbidden architecture:

```text
RevisionRecord R7 says body A
Head record caches body B
UI treats head body B as authoritative
```

Semantic content comes from the exact committed revision resolved by the head.

The head owns only current-revision selection/currentness metadata.

## 20. Authoritative head read states

D2-1 freezes conceptual results:

```text
HEAD_FOUND
HEAD_ABSENT_AUTHORITATIVE
HEAD_UNAVAILABLE
HEAD_INVALID
```

Interpretation:

```text
HEAD_FOUND
→ exact currentRevisionRef available

HEAD_ABSENT_AUTHORITATIVE
→ authoritative owner successfully proved no head exists

HEAD_UNAVAILABLE
→ owner state could not be established

HEAD_INVALID
→ representation/integrity failure
```

## 21. Cache miss is not head absence

```text
CACHE MISS
!=
HEAD_ABSENT_AUTHORITATIVE
```

A bootstrap operation may proceed only from authoritative absence plus all bootstrap eligibility gates.

Timeout, decode failure, unsupported schema, partial read, or cache miss may not be converted to no-head.

## 22. Valid pre-bootstrap state

An active PK-X1 page may legitimately be:

```text
pageIdentity = VALID
committed revision count = 0
head = HEAD_ABSENT_AUTHORITATIVE
```

This means the page identity exists but PK-D2 history has not been bootstrapped.

It is not corruption.

## 23. Missing head after committed history exists

For an active revisioned page:

```text
committed revision membership non-empty
+ authoritative head absent
```

is not the normal pre-bootstrap state.

Selected classification:

```text
INVALID_REVISION_HEAD_MISSING
```

D2-1 does not infer a replacement head from maximum revisionRef, newest timestamp, last rendered revision, or chain traversal.

## 24. Head targeting missing/uncommitted revision

If:

```text
head(P) = R7
but R7 is missing, corrupt, unsupported, or not owner-committed
```

selected classification:

```text
INVALID_REVISION_HEAD_TARGET
```

No fallback to R6 or another old revision.

## 25. Head target wrong page

If:

```text
head(P1) = R7
R7 committed record binds to P2
```

selected classification:

```text
INVALID_REVISION_PAGE_BINDING
```

The current page becomes unavailable until an explicit authorized repair/migration contract exists.

## 26. Bootstrap eligibility

First revision admission requires all of:

```text
exact active pageIdentity
exact current target identity
HEAD_ABSENT_AUTHORITATIVE
no committed revision history for this page
fresh current PUBLIC_KNOWLEDGE semantic candidate
current PK validation
current source support
current Exposure
current settlement
current citation/provenance validation as required
```

No old transcript/cache body is imported automatically.

## 27. Bootstrap candidate

Before durable admission, the first semantic snapshot remains a candidate.

It may not be listed as R1, restored, compared, searched as a revision, or rendered as durable historical state merely because validation succeeded.

## 28. Bootstrap atomic outcome

From the consumer viewpoint, successful bootstrap must expose one indivisible semantic result:

```text
BEFORE
page P exists
committed revisions = 0
head = NONE

AFTER
R1-equivalent is committed
head(P) = R1-equivalent
```

Allowed failure result:

```text
old pre-bootstrap state remains authoritative
candidate may leave reclaimable uncommitted residue physically
```

Forbidden observable success:

```text
head points to a revision that ordinary committed resolution cannot reconstruct
```

## 29. Bootstrap race

Two simultaneous first-bootstrap attempts for the same page may not create two committed first successors.

Conceptually:

```text
A observes HEAD_ABSENT_AUTHORITATIVE
B observes HEAD_ABSENT_AUTHORITATIVE

A commits first revision + head
B commit compare fails
```

B must not silently become a branch or overwrite A.

## 30. Normal head advance

For an existing page:

```text
head(P) = Rn
operation expectedRevision = Rn
validated candidate = Next
```

Safe owner commit:

```text
re-check authoritative head == Rn
admit Rnext as immutable committed revision
advance head(P) to Rnext
```

The result must preserve single-head linear semantics.

## 31. Expected revision is the default write precondition

D2-1 consumes CC-2.

```text
currentHead == expectedRevision
→ commit may continue

currentHead != expectedRevision
→ REVISION_MISMATCH
→ no semantic commit
```

No silent rebase, automatic expectedRevision refresh, or three-way merge.

## 32. Commit membership and head advance must be owner-atomic

The semantic consumer must observe either:

```text
OLD
head = Rn
Rnext not committed
```

or:

```text
NEW
Rnext committed
head = Rnext
```

D2-1 does not mandate one physical database transaction primitive.

Possible future implementations may use a transaction, conditional insert + head CAS, serialized owner lane, or another mechanism that proves the same semantic result.

## 33. Candidate-first physical writes are permitted only as inert staging

A backend may physically write candidate bytes before the owner commit boundary when necessary.

Until admission succeeds, those bytes are:

```text
UNCOMMITTED_CANDIDATE_RESIDUE
```

They are not ordinary revision history.

## 34. Orphan residue definition

An orphan/uncommitted residue is physical candidate material that failed to become owner-admitted committed revision state.

Examples:

```text
lost expected-revision race
validation/commit failure after staging bytes
head CAS failure
backend interrupted before semantic admission
```

It does not become historical revision merely by surviving on disk.

## 35. Orphan residue capabilities are zero

An orphan residue may not be:

```text
current head
ordinary revision-list item
comparison input
restore input
PK-X2 result
model context
presentation body
citation authority
source authority
```

It may only be diagnosed/reclaimed by the bounded storage owner.

## 36. Orphan cleanup cannot use "not head" as its test

Because committed historical revisions are normally not head, cleanup requires explicit uncommitted/admission ownership.

Canonical rule:

```text
NOT HEAD
!=
SAFE TO PURGE
```

## 37. RevisionRef reuse after failed candidate

Safe default:

```text
allocated/reserved revisionRef from failed candidate
→ do not recycle inside stale-reference horizon
```

A future implementation may recycle only if it proves no stale observer, callback, index, diagnostic link, or retry can address the abandoned candidate.

Convenience is not proof.

## 38. Duplicate committed revision identity

If the same page/revisionRef resolves to incompatible committed semantic records:

```text
INVALID_REVISION_IDENTITY_COLLISION
```

Forbidden winner selection:

```text
newest timestamp
largest record
first returned row
cache winner
lexicographic maximum
```

## 39. Linear predecessor integrity

For every non-bootstrap committed revision:

```text
previousRevisionRef
```

must resolve to an exact committed revision on the same page and represent the prior admitted head transition.

A broken/missing/wrong-page predecessor makes ordinary chain traversal fail closed.

## 40. Multiple committed successors are corruption in first scope

D2-0 does not authorize branches.

If two incompatible committed revisions both claim the same predecessor as their successful head-advance parent in one active chain:

```text
INVALID_MULTI_SUCCESSOR_STATE
```

Do not reinterpret the data as a branch graph.

## 41. Head cannot move backward for restore

`RESTORE_AS_NEW_REVISION` remains:

```text
old exact committed revision
→ current revalidation
→ new committed revision
→ head advances forward
```

Forbidden:

```text
head R9
→ set head directly to R4
```

## 42. Direct revision mutation is forbidden

Operations may create a new current revision, but they do not rewrite existing committed records.

No first-scope:

```text
edit historical revision in place
delete one historical semantic revision
squash revision chain
rebase revision ancestry
rewrite previousRevisionRef
```

Retention cleanup is separate and cannot silently become semantic history rewrite.

## 43. Current head is not truth authority

A successfully resolved head proves only:

```text
latest committed durable revision under PK-D2 owner
```

It does not prove:

```text
source support current
Exposure current
settlement current
citation current
page current-display eligibility
```

## 44. Current read path

Ordinary current page resolution remains:

```text
exact pageIdentity
→ authoritative head read
→ exact committed revision read
→ representation/schema validation
→ active page lifetime
→ exact target identity
→ current support-at-use
→ current Exposure / settlement / citation policy
→ current presentation
```

Every step may fail closed independently.

## 45. Support failure does not create a revision

If current head R7 remains committed but source/Exposure/settlement support becomes unusable:

```text
head stays R7
revision history may remain retained
current semantic surface becomes unavailable
```

No automatic R8 is created merely to record support failure.

## 46. No old-revision fallback on support failure

Forbidden:

```text
head R7 unsupported
→ search R6/R5/R4 for one that looks usable
→ display that as current
```

A repaired current semantic page requires an explicit future revision-producing operation under current authority.

## 47. Historical display remains outside D2-1

Bytes for old committed revisions may remain, but PK-D2 still requires then-current eligibility before exposing their semantic bodies.

Requirement to display old unsupported content as historical fact/inspection activates:

```text
PK-D3 HISTORICAL_PAGE
+ C7
```

D2-1 does not open that gate.

## 48. Revision metadata does not upgrade semantic authority

Fields such as:

```text
revisionRef
previousRevisionRef
operationKind
restoredFromRevisionRef
currentHead status
```

prove only revision-store relationships.

They do not prove the public assertions are currently true.

## 49. Search integration boundary

PK-X2 may find `pageIdentity`.

Then:

```text
pageIdentity
→ authoritative head resolve at use time
→ committed current revision
→ current use gates
```

Search result snippets/rank/cache do not own revision currentness.

Global historical revision search remains deferred.

## 50. Presentation boundary

The UI may display revision labels, compare controls, or current content only under later authorized presentation contracts.

It may not mutate:

```text
committed membership
head pointer
revisionRef binding
previousRevisionRef
```

DOM state cannot repair storage corruption.

## 51. Reload boundary

Reload may clear ephemeral operation/presentation state.

It does not automatically:

```text
create revision
advance head
scan all revision stores
restore orphan candidate
infer head from last rendered card
```

Durable revision state is resolved only for an explicit relevant page/revision job.

## 52. Feature-off boundary

When PK-D2 feature behavior is inactive:

```text
new revision write = 0
head mutation = 0
background history scan = 0
background orphan scan = 0
```

Durable records may remain within the page lifetime/retention contract, but feature-off is not mutation or purge authority.

## 53. Lifetime

D2-1 inherits the conversation-scoped page lifetime from PK-X1 pending D2-5 final bounded history decisions.

```text
ACTIVE
→ exact revision operations may proceed subject to all gates

ENDED
→ ordinary semantic revision access unavailable
→ bounded cleanup/retention rules apply

UNKNOWN
→ durable revision operations fail closed
```

## 54. Revision retention remains bounded but numbers are deferred

D2-1 does not choose the final numeric limits.

D2-5 must freeze limits for:

```text
max committed revisions per page
max bytes per revision
max total revision bytes per page
max revision list window
max orphan residue retention horizon
```

No `FOREVER` default.

## 55. Schema/version safety

Persisted head/revision representations require explicit representation-version validation when implemented.

Conceptual outcomes:

```text
SUPPORTED_VERSION
MIGRATABLE_VERSION
UNSUPPORTED_VERSION
CORRUPT_RECORD
```

Unsupported/corrupt state does not fall back to UI/cache/transcript inference.

## 56. Migration authority

A migration may change physical representation only while preserving or explicitly retiring:

```text
pageIdentity binding
revisionRef identity
committed membership
current head meaning
predecessor relation
semantic snapshot meaning
```

Migration never upgrades truth/support authority.

## 57. Head representation failure

If authoritative head storage is unreadable, partial, unsupported, or corrupt:

```text
HEAD_UNAVAILABLE / HEAD_INVALID
→ current durable page unavailable
```

Forbidden reconstruction from:

```text
highest numeric revision
newest timestamp
last search result
last DOM state
last assistant transcript card
```

## 58. Repair is not part of ordinary read

D2-1 does not define automatic repair of:

```text
missing head
missing head target
duplicate revisionRef
wrong-page binding
multi-successor state
broken predecessor
```

Future repair/migration must be a separate owner-authorized contract with explicit safety evidence.

## 59. Ordinary-turn dormancy

When no PK-D2 page/revision operation is requested:

```text
revision lookup = 0
head lookup = 0
revision write = 0
revision list = 0
orphan scan = 0
repair scan = 0
```

There is no background revision janitor or history daemon in the semantic contract.

## 60. Main-advance watch during D2-1 impact transaction

During the D2-1 impact transaction, repository `main` advanced beyond the D2-0 merge SHA through an Agent Skill orchestrator parallel-pilot lane.

Comparison showed D2-0 remained the exact ancestor and the concurrent files did not overlap SimCore PUBLIC_KNOWLEDGE revision/head authority.

Classification:

```text
WATCH · MAIN_ADVANCED_DURING_D2_1_TRANSACTION · NON_BLOCKING
```

This watch does not alter D2-1 semantics.

## 61. Runtime implementation evidence gate

Before any future runtime claim, implementation must prove at minimum:

```text
page with no history is distinguishable from head failure
HEAD_ABSENT is authoritative, not cache-derived
candidate vs committed membership cannot be confused
not-head historical revisions survive correctly
atomic bootstrap under race
atomic expected-revision head advance under race
head never resolves to uncommitted/missing target
duplicate revisionRef fails closed
wrong-page binding fails closed
multi-successor corruption fails closed
broken predecessor fails closed
unsupported schema fails closed
current support/use is revalidated after head resolution
orphan cleanup cannot delete legitimate historical revisions
ordinary-turn dormancy remains zero-work
feature-off/reload do not synthesize revisions
```

Until then:

```text
D2-1 RUNTIME READY = NO
```

## 62. Explicit deferred lanes

```text
DEFER · D2-2 MUTATION OPERATION / COMMIT SAFETY
DEFER · D2-3 REVISION READ / COMPARE / RESTORE
DEFER · D2-4 SETTLEMENT / CITATION / SEARCH INTEGRATION
DEFER · D2-5 LIFETIME / BOUNDS / CONVERGENCE
DEFER · PK-D3 HISTORICAL_PAGE / C7
DEFER · PK-D4 CONTEXTUAL_DURABLE_PAGE / C6
DEFER · C5 CROSS-FAMILY DERIVED LINEAGE
DEFER · C8 DELAYED EFFECT TARGETING
DEFER · BRANCHING / MULTI-HEAD / CRDT
DEFER · HISTORY SQUASH / REBASE
DEFER · GENERIC REPAIR ENGINE
DEFER · RUNTIME IMPLEMENTATION
DEFER · RELEASE
```

## 63. D2-1 final contract

```text
REVISION RECORD
= IMMUTABLE OWNER-COMMITTED FULL VALIDATED SEMANTIC SNAPSHOT

CURRENT HEAD
= ONE AUTHORITATIVE MUTABLE REVISION LOCATOR PER ACTIVE REVISIONED PAGE

COMMITTED MEMBERSHIP
= OWNER AUTHORITY INDEPENDENT FROM HEAD POSITION

NOT CURRENT HEAD
!= ORPHAN

PAGE IDENTITY WITH ZERO REVISIONS
= VALID PRE-BOOTSTRAP STATE

COMMITTED HISTORY WITH NO HEAD
= INVALID_REVISION_HEAD_MISSING

HEAD TO MISSING / UNCOMMITTED RECORD
= INVALID_REVISION_HEAD_TARGET

BOOTSTRAP / HEAD ADVANCE
= OWNER-ATOMIC SEMANTIC OUTCOME

CURRENT HEAD FOUND
!= CURRENT SEMANTIC USE ALLOWED
```

## 64. Current status

```text
D2-0 REVISIONED PAGE MASTER          = DESIGN FROZEN
D2-1 REVISION RECORD / CURRENT HEAD  = DESIGN FROZEN
D2-2 MUTATION / COMMIT SAFETY        = NEXT DESIGN CHECKPOINT

RUNTIME IMPLEMENTATION               = NOT AUTHORIZED
RELEASE                              = NOT AUTHORIZED
PRODUCTION                           = UNCHANGED BY THIS DESIGN
```
