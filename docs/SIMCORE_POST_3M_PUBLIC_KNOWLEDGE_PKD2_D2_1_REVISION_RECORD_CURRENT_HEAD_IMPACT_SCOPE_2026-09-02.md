# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-1 Revision Record / Current Head Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-1 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-1 · REVISION RECORD · CURRENT HEAD · IMPACT SCOPE**

## 0. Purpose

D2-0 selected a linear single-head revision chain with immutable full validated snapshots. D2-1 freezes the narrow persistence/ownership seam needed to represent that design safely without opening runtime implementation.

This document changes no runtime code, storage backend, prompt, renderer, host UI, model call, network behavior, release transaction, or `release-simcore` state.

## 1. Authority consumed

D2-1 consumes only the already-frozen design authorities:

```text
PK-X1 durable page identity
PK-D2 D2-0 revisioned page master
Candidate C CC-2 revision/currentness safety
Candidate C CC-3 bounded durable store
3M-6 support-at-use invalidation
PUBLIC_KNOWLEDGE validation / Exposure / settlement / citation authority
```

## 2. Capability profile remains unchanged

```text
C1 cross-turn survival        = YES
C2 stable derived identity    = YES
C3 semantic mutation          = YES, design contract only
C4 append / merge pressure    = YES, design contract only
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

D2-1 does not widen Candidate C beyond D2-0.

## 3. Selected seam

```text
PAGE_IDENTITY_SHELL
+
IMMUTABLE_COMMITTED_REVISION_RECORDS
+
ONE_MUTABLE_CURRENT_HEAD_RECORD
+
OWNER_ATOMIC_HEAD_ADVANCE
+
ORPHAN_RESIDUE_NOT_COMMITTED
```

## 4. Three state classes must not collapse

### A. Page identity shell

Identifies the durable logical page only.

### B. Revision record

Represents one immutable committed semantic state of that page.

### C. Current head

Names which committed revision is current for that page.

Canonical firewall:

```text
PAGE EXISTS
!=
REVISION HISTORY EXISTS

REVISION BYTES EXIST
!=
REVISION IS COMMITTED

REVISION IS COMMITTED
!=
REVISION IS CURRENT HEAD

CURRENT HEAD EXISTS
!=
CURRENT SEMANTIC USE IS ALLOWED
```

## 5. Page with no revision history is a valid pre-bootstrap state

An existing PK-X1 page may legitimately have:

```text
pageIdentity = FOUND
currentHead = NONE
committedRevisions = NONE
```

This means:

```text
DURABLE PAGE IDENTITY EXISTS
BUT
PK-D2 REVISION HISTORY HAS NOT BEEN BOOTSTRAPPED
```

It is not corruption by itself.

## 6. Head without target revision is corruption

The following is never a normal state:

```text
currentHead = R7
R7 committed revision record = MISSING / INVALID
```

Selected classification:

```text
INVALID_REVISION_HEAD_TARGET
```

No fallback to R6, latest timestamp, nearest revisionRef, or text-similar revision is allowed.

## 7. Revision target without head may be orphan residue or incomplete state

Bytes for a revision may physically exist without being current. D2-1 distinguishes:

```text
committed historical revision
vs
candidate/orphan write residue
```

Physical existence alone cannot decide which class applies.

The revision owner must possess an explicit committed-state boundary or equivalent atomic protocol.

## 8. First revision bootstrap

R1-equivalent may be created only from a freshly eligible current PUBLIC_KNOWLEDGE document under D2-0.

Required logical result:

```text
BEFORE
pageIdentity P
head = NONE

AFTER SUCCESS
committed revision R1 exists
head(P) = R1
```

Forbidden observable success state:

```text
head(P) = R1
but R1 is absent/uncommitted
```

## 9. Bootstrap race

Two concurrent first-bootstrap attempts must not produce two active first heads.

Conceptual safe result:

```text
P has no head
A proposes R1a
B proposes R1b

exactly one owner commit wins
other attempt fails currentness/bootstrap precondition
```

No branch creation is authorized.

## 10. Normal head advance

For an existing head:

```text
head(P) = Rn
operation expectedRevision = Rn
candidate next revision = Rnext
```

A successful owner commit must produce the consumer-visible state:

```text
Rnext = committed immutable revision
head(P) = Rnext
```

and preserve Rn as an immutable retained prior revision when inside retention bounds.

## 11. Expected revision is mandatory safe default

A write derived from current state must compare against the current head immediately before commit.

```text
expectedRevision != currentHead
→ REVISION_MISMATCH
→ no semantic commit
```

No silent expectedRevision refresh, branch creation, or auto-merge.

## 12. Head writer ownership

Only the bounded PK-D2 revision owner may change current head.

Forbidden head writers:

```text
Presentation Renderer
DOM state
PK-X2 search index
model draft
host transcript
cache
revision comparison UI
```

## 13. Revision record ownership

Only the PK-D2 revision owner may admit a revision as a committed record.

A model-produced candidate, UI patch, or validation draft does not become durable merely because it has a `revisionRef`-looking field.

## 14. Revision reference allocation

The owner allocates a page-local exact `revisionRef` or equivalent marker satisfying D2-0/CC-2.

Requirements:

```text
bound to exactly one pageIdentity
unique inside that page lifetime / stale-reference horizon
not inferred from timestamp/title/content hash alone
not reused for a later semantic state
```

D2-1 does not freeze integer vs opaque representation.

## 15. Previous revision relationship

For every non-bootstrap linear revision:

```text
revision Rn+1
previousRevisionRef = exact prior head Rn
```

This relationship records same-page revision continuity only.

It is not C5 derived-to-derived source lineage and does not grant semantic support.

## 16. Revision record semantic payload

D2-1 keeps D2-0's full-snapshot decision.

A committed record conceptually owns only the bounded fields required for exact reconstruction and current-use revalidation, such as:

```text
schemaVersion
pageIdentity
revisionRef
previousRevisionRef
operationKind
validated page semantic snapshot
accepted settlement state needed by the consumer
visible citation/provenance references
minimum support reference material required by current-use policy
optional restoredFromRevisionRef
```

Exact serialized schema remains deferred.

## 17. Forbidden record payload

Do not persist by default:

```text
raw model draft
DENY/HOLD content
quarantined assertion text
hidden Knowledge
private validator inputs
chain-of-thought
DOM/CSS
host transcript clone
search query history
operation-token diary
arbitrary diagnostics dump
```

## 18. Immutable committed revision

After admission:

```text
(pageIdentity P, revisionRef R)
→ semantic meaning immutable
```

A semantic change must create a new revisionRef.

Physical migration/compaction may not silently alter the semantic meaning addressed by R.

## 19. Current head record shape

Conceptually the head owns only the minimum locator/currentness data, for example:

```text
pageIdentity
currentRevisionRef
headSchemaVersion / owner generation when required for representation safety
```

The head must not duplicate the full page body as an independent semantic authority.

## 20. No head cache as authority

A cache may accelerate head lookup, but:

```text
CACHE HIT
!= authoritative head proof

CACHE MISS
!= no head exists
```

First bootstrap or mutation cannot be authorized from cache absence alone.

## 21. Atomic semantic outcome

D2-1 requires one owner-scoped commit boundary whose observable result is either:

```text
OLD STATE
head = Rn
new candidate not committed
```

or:

```text
NEW STATE
Rnext committed
head = Rnext
```

Forbidden observable state:

```text
head points to candidate that is not committed/validly reconstructable
```

Physical database transaction technology is not selected.

## 22. Candidate-first physical writes

A future backend may need to materialize candidate bytes before head CAS/commit.

If that attempt loses or fails:

```text
candidate bytes
→ ORPHAN / UNCOMMITTED RESIDUE
→ not ordinary history
→ not searchable
→ not comparable/restorable
→ not current
→ safely reclaimable under owner cleanup policy
```

## 23. Orphan residue cannot steal a revision identity

An uncommitted candidate must not later be mistaken for a committed revision merely because its bytes remain.

The owner must ensure committed-state identity is unambiguous.

If a revisionRef was allocated to a losing candidate, later reuse is allowed only if the owner proves no stale observer/callback can address the old candidate. Safe default: do not recycle it inside the stale-reference horizon.

## 24. Corrupt duplicate revisionRef

If one page resolves the same revisionRef to incompatible committed semantic records:

```text
INVALID_REVISION_IDENTITY_COLLISION
```

Do not choose newest timestamp, largest payload, first record, or cache winner.

## 25. Wrong-page revision target

If:

```text
head(P1) = R
but committed R is bound to P2
```

classification is corruption:

```text
INVALID_REVISION_PAGE_BINDING
```

No retargeting or alias inference.

## 26. Broken previous link

For non-bootstrap revision Rn:

```text
previousRevisionRef points outside same page
or to impossible/noncommitted predecessor
```

ordinary revision-chain traversal must fail closed.

D2-1 does not auto-repair the chain.

Current head semantic use still additionally requires current support/use revalidation.

## 27. Linear-chain consistency

Because branching is not authorized, one committed revision may have at most one later committed successor that was admitted as the head advance from it under the first-scope owner protocol.

If two incompatible successors are both claimed committed from the same predecessor in the active chain:

```text
INVALID_MULTI_SUCCESSOR_STATE
```

This is not silently converted into a branch.

## 28. Commit ordering metadata does not create truth

`revisionRef`, previous links, operation kind, commit ordering, or head status prove only revision-store relationships.

They do not prove current public truth, Exposure, settlement, or source support.

## 29. Read-path currentness

Ordinary current page read remains:

```text
exact pageIdentity
→ authoritative current head
→ exact committed revision
→ validate representation
→ active lifetime / target identity
→ current support-at-use
→ current Exposure / settlement / citation policy as required
→ current page surface
```

Head lookup is not the last authority gate.

## 30. Historical revision read remains gated

D2-1 does not open PK-D3.

An old committed revision may be inspected only when D2-0's current eligibility rule permits its semantic content.

Stored bytes do not create historical-display authority.

## 31. Restore input boundary

`RESTORE_AS_NEW_REVISION` may select an exact committed old revision only.

It may not restore:

```text
orphan candidate
failed mutation draft
quarantined candidate
corrupt revision
revision from another page
```

Restore still creates a new revision and does not move head backward.

## 32. Search boundary

PK-X2 may resolve logical page identity but does not own head mutation or revision admission.

Default page open after search always resolves authoritative head again.

Global historical revision indexing remains outside D2-1.

## 33. Logical delete boundary

D2-1 does not yet authorize whole-page delete/retire, revision delete, history rewrite, squash, or branch pruning.

Retention cleanup may physically reclaim uncommitted/orphan residue without creating semantic delete authority.

## 34. Revision retention boundary

D2-1 defines exact ownership, not final numeric retention limits.

D2-5 must later freeze bounded limits for:

```text
revisions per page
bytes per revision
bytes per page
revision-list window
orphan retention horizon
```

No unbounded forever-history default.

## 35. Representation version boundary

A revision record that survives across runtime versions requires a representation/schema version strategy.

Unsupported/corrupt representation must fail closed for semantic use.

Migration may not change pageIdentity/revisionRef semantic meaning or upgrade source/truth authority.

## 36. Current-head representation failure

If head storage cannot be authoritatively read, decoded, or version-validated:

```text
HOLD_REVISION_HEAD_UNAVAILABLE
```

Do not infer head from:

```text
highest revision number
newest timestamp
last search result
last rendered revision
last transcript card
```

## 37. No reverse recovery from presentation

DOM or host UI showing R7 does not prove current head is R7.

Presentation may be stale and is downstream of semantic authority.

## 38. No automatic bootstrap

Feature enable, page search, page open, reload, or discovery of pageIdentity does not automatically create R1.

Bootstrap requires an explicit D2 revision-producing admission using a freshly validated current document.

## 39. Dormancy

On ordinary turns with no PK-D2 operation/read job:

```text
revision-store lookup = 0
head lookup = 0
revision write = 0
history scan = 0
repair scan = 0
```

D2-1 does not create a background revision daemon.

## 40. Runtime blockers preserved

Future implementation remains blocked on proving at least:

```text
authoritative head-store owner
committed-vs-orphan representation
atomic bootstrap/head advance
revisionRef uniqueness/non-reuse
head target integrity
page binding integrity
linear predecessor integrity
stale expected-revision rejection
schema/version failure behavior
current support-at-use after retrieval
bounded orphan cleanup
ordinary-turn dormancy
```

## 41. Explicitly deferred

```text
DEFER · D2-2 MUTATION OPERATION / COMMIT SAFETY DETAILS
DEFER · D2-3 REVISION READ / COMPARE / RESTORE DETAILS
DEFER · D2-4 SETTLEMENT / CITATION / SEARCH INTEGRATION
DEFER · D2-5 LIFETIME / BOUNDS / CONVERGENCE
DEFER · PK-D3 HISTORICAL_PAGE / C7
DEFER · PK-D4 CONTEXTUAL_DURABLE_PAGE / C6
DEFER · C5 CROSS-FAMILY DERIVED LINEAGE
DEFER · C8 DELAYED EFFECT ATTACHMENT
DEFER · BRANCHING / MULTI-HEAD / CRDT REVISION MODEL
DEFER · RUNTIME IMPLEMENTATION
DEFER · RELEASE
```

## 42. Impact verdict

```text
D2-1 IMPACT
= owner-scoped durable revision metadata design only

RUNTIME DIFF
= NONE

PRODUCTION DIFF
= NONE

RELEASE-SIMCORE
= UNCHANGED BY THIS TRANSACTION
```
