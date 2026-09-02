# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-0 Revisioned Page Master Design - 2026-09-02

Date: 2026-09-02 KST

Status: **D2-0 MASTER DESIGN FROZEN · PK-D2 REVISIONED_PAGE · LINEAR SINGLE-HEAD REVISION CHAIN · FULL VALIDATED SNAPSHOT PER REVISION · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-0 · REVISIONED_PAGE · CANDIDATE C C3/C4 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-X1 established durable page identity while keeping semantic content current-only. PK-X2 established bounded active-lifetime page search without creating semantic history. The PK-D2 impact scope selected the next concrete capability:

```text
same durable PUBLIC_KNOWLEDGE page
+ owner-authorized semantic updates
+ bounded addressable committed revisions
```

D2-0 freezes the master architecture for that capability.

This document implements no store, mutation engine, UI action, DOM/CSS, model call, network call, runtime ID, release transaction, or `release-simcore` mutation.

## 1. Final capability profile

```text
C1 cross-turn survival        = YES
C2 stable derived identity    = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

Canonical rule:

```text
PK-D2 OPENS REVISIONED SEMANTIC STATE
WITHOUT OPENING HISTORICAL TRUTH, RE-ENTRY, CROSS-FAMILY LINEAGE, OR ASYNC ATTACHMENT
```

## 2. Primary architecture

Selected architecture:

```text
PK-X1 durable pageIdentity
        |
        v
Revision Owner
  + immutable committed revision snapshots
  + one mutable current-head reference
  + expected-revision mutation gate
        |
        v
current support / Exposure / settlement revalidation
        |
        v
current presentation
```

The page identity shell remains independent from revision semantics.

## 3. Three persistent semantic roles

PK-D2 requires three conceptual roles.

### A. Durable page identity shell

Inherited from PK-X1:

```text
pageIdentity
lifetimeScopeRef
targetIdentityRef
namespace
```

It remains identity-only and immutable after mint.

### B. Revision head

Conceptually:

```text
pageIdentity
currentRevisionRef
```

It answers only which committed revision is the current durable head.

### C. Immutable revision record

One committed semantic state of the same logical page.

A physical backend may co-locate these roles, but it may not collapse their authority meanings.

## 4. Linear single-head chain

D2-0 selects:

```text
LINEAR_SINGLE_HEAD_REVISION_CHAIN
```

Every successful semantic mutation of one page advances from exactly one current head to exactly one new head.

No first-scope branching:

```text
R4 -> R5a
   -> R5b
```

No branch merge, multi-head page, conflict tree, or CRDT semantics are authorized.

A stale competing mutation fails rather than creating a branch.

## 5. Revision reference

Each committed revision has an exact page-local `revisionRef` or equivalent owner-scoped revision marker.

Requirements:

```text
unique within one page lifetime
not reused inside the stale-reference horizon
comparable for exact currentness
bound to one pageIdentity
```

It need not be globally unique or globally monotonic.

The physical representation may later be an integer, opaque ordered marker, or another mechanism satisfying CC-2.

## 6. Revision identity is not page identity

```text
pageIdentity
= same logical page

revisionRef
= one committed semantic state of that page
```

Canonical rule:

```text
SAME pageIdentity
!=
SAME revisionRef
```

A revision reference may never be used as a substitute target identity.

## 7. Full validated snapshot per revision

D2-0 selects a conservative semantic representation:

```text
FULL_VALIDATED_PAGE_SNAPSHOT_PER_COMMITTED_REVISION
```

The first semantic contract does not depend on replaying deltas from revision zero.

Reason:

```text
full snapshot
→ bounded exact reconstruction
→ omission does not ambiguously mean deletion
→ validator output is explicit
→ compare can be derived without semantic replay
```

Delta/event-log storage may be a future physical optimization only if it reconstructs the same bounded semantic revision contract exactly.

## 8. Revision record minimum shape

Conceptual fields may include only the minimum consumer-owned subset such as:

```text
schemaVersion
pageIdentity
revisionRef
previousRevisionRef
operationKind
validated document semantic snapshot
bounded accepted settlement state
bounded visible citation/provenance references
minimum support references required for later support-at-use checks
optional restoredFromRevisionRef when the operation is RESTORE_AS_NEW_REVISION
```

No generic universal Candidate C schema is created.

## 9. Forbidden durable revision content

Not stored by default:

```text
raw model draft
DENY/HOLD assertion payload
quarantined text
hidden Knowledge
private validator inputs
presentation DOM/CSS
host transcript copy
search query history
model chain-of-thought
arbitrary operation logs
```

Only already-admitted public semantic state may become a revision snapshot.

## 10. Revision immutability

After commit:

```text
revision R
→ immutable semantic record
```

A later edit creates a new revision.

Forbidden:

```text
edit R5 bytes in place
and continue calling it R5
```

Representation migration/compaction is separate and may not change the semantic meaning of an existing revision reference.

## 11. Head mutability

Only the revision owner may advance the current head.

```text
head = Rn
accepted mutation
→ head = Rn+1-equivalent
```

Presentation, search, model output, host transcript, or cache state may not advance the head.

## 12. Head does not prove truth/current support

A current head pointer proves only:

```text
this is the latest committed durable revision under the revision owner
```

It does not prove:

```text
source still current
Exposure still ALLOW
settlement still valid
citations still current
page still displayable
```

Every ordinary current use must still pass current support/use policy.

## 13. Bootstrap from PK-D1 to PK-D2

An existing PK-X1 `pageIdentity` can become revision-capable without changing its identity.

However no old transcript/cache content is imported automatically.

Required first-admission flow:

```text
exact pageIdentity
+ active lifetime
+ exact current target identity
+ freshly validated current PUBLIC_KNOWLEDGE document
+ current support / Exposure / settlement
        ↓
commit initial revision R1-equivalent
        ↓
install current head
```

If no current eligible document exists, revision history is not bootstrapped.

## 14. No automatic revision on read

Reading/searching/revalidating a page does not itself create a revision.

```text
page opened
page searched
page current support rechecked
feature re-enabled
reload occurred
```

must not silently advance revision history.

Revision creation requires an explicit revision-producing owner operation.

## 15. Initial operation vocabulary

D2-0 freezes the first consumer-specific operation classes:

```text
EDIT_ASSERTION
APPEND_ASSERTION
REMOVE_ASSERTION
APPEND_CITATION
REPLACE_CITATION
CORRECTION_UPDATE
RESTORE_AS_NEW_REVISION
```

These are design vocabulary only.

Not first-scope operations:

```text
WHOLE_PAGE_DELETE_RETIRE
BULK_MUTATE
CROSS_FAMILY_MUTATE
AUTO_MERGE
REBASE_HISTORY
SQUASH_HISTORY
MEDIA_REPLACE
```

## 16. UI intent is not mutation authority

Future flow must remain:

```text
UI/user intent
→ current PK-D2 operation request
→ exact page + expected revision
→ authorization / candidate generation
→ current semantic validation
→ durable commit
→ presentation reconciliation
```

Forbidden:

```text
button click
→ patch persisted page directly
```

## 17. Expected-revision default

Every state-derived PK-D2 mutation defaults to an exact expected revision precondition.

```text
pageIdentity P
expectedRevision R7
```

At commit:

```text
current head == R7
→ candidate may commit

current head != R7
→ REVISION_MISMATCH
→ reject stale mutation
```

No silent expected-revision refresh is authorized.

## 18. Conditional operation token

D2-0 does not require a separate operation token for every synchronous mutation.

CC-2 remains authoritative:

```text
expected-revision / serialized lane proves stale safety
→ separate token may be unnecessary

late overlapping/superseding attempt can still mutate
→ current operation authority token or equivalent guard required
```

This does not open C8.

## 19. Validate before commit

Frozen safe ordering:

```text
1 exact pageIdentity
2 exact current revision
3 active lifetime / target identity / operation authorization
4 construct complete candidate next-page snapshot
5 validate candidate under then-current PK schema
6 validate current source support / Exposure / settlement
7 validate citations/provenance required by candidate
8 re-check expected revision/currentness
9 commit immutable revision record
10 advance current head with consumer-visible atomicity
11 reconcile current presentation
```

The new candidate never inherits validation simply because the previous revision was valid.

## 20. Full-candidate construction

Even when user intent is a partial edit, the durable commit target is a complete validated next revision snapshot.

A patch may be used as an operation input, but:

```text
omitted field
!=
clear/delete field
```

The owner must materialize the candidate semantic state under explicit field ownership before validation and commit.

## 21. Assertion edit

`EDIT_ASSERTION` preserves `pageIdentity` and creates a new revision when accepted.

Editable semantic fields must be defined by a later D2 child contract.

Trusted authority refs, pageIdentity, targetIdentityRef, validator-derived eligibility, and backend metadata are not freely editable fields.

## 22. Assertion append

`APPEND_ASSERTION` adds one bounded validated public-reference assertion to the next revision.

The appended assertion must independently satisfy current PUBLIC_KNOWLEDGE policies.

Append does not mean:

```text
old page valid
→ new assertion trusted
```

## 23. Assertion removal

`REMOVE_ASSERTION` removes an exact assertion from the new current snapshot.

The old committed revision remains immutable while retained.

Removal is semantic mutation and therefore creates a new revision.

No omission-based deletion is allowed.

## 24. Citation append / replace

Citation changes that alter the visible public-reference support surface are semantic changes.

They require current PK citation/provenance validation before commit.

Citation mutation does not automatically alter the truth of the underlying claim, and assertion mutation does not automatically manufacture citation support.

## 25. Correction update

`CORRECTION_UPDATE` is an explicit revision-producing operation used when current settlement/correction authority validates a changed public-reference state.

Example:

```text
Rn: ATTRIBUTED_BUT_NOT_SETTLED
Rn+1: CORRECTED_CURRENT_RECORD
```

The transition must come from current trusted authority, not from the model self-declaring a correction.

## 26. Restore is copy-forward revalidation

`RESTORE_AS_NEW_REVISION` does not rewind the head pointer.

First contract:

```text
current head = R9
select exact old revision R4
        ↓
retrieve R4
        ↓
prove R4 content currently eligible for use
        ↓
revalidate under current PK schema / support / Exposure / settlement
        ↓
commit NEW revision R10-equivalent
        ↓
head = R10-equivalent
```

Optional bounded metadata may record:

```text
restoredFromRevisionRef = R4
```

This is same-page revision provenance, not C5 cross-family lineage.

## 27. No backward-head restore

Forbidden first behavior:

```text
head R9
→ set head directly to old R4
```

A monotonic committed history is easier to audit and makes stale-operation semantics explicit.

A future product may design another model only through a separate contract.

## 28. Old revision retrieval

Old revisions are addressed exactly:

```text
pageIdentity + revisionRef
```

No fuzzy reconstruction from:

```text
timestamp
old title
text similarity
transcript position
search snippet
```

is allowed.

## 29. C7 firewall

PK-D2 stores prior revisions but does not grant them unconditional historical-display authority.

Before showing old revision semantic content:

```text
revision record exact
+ page lifetime eligible
+ revision support/use policy satisfied now
```

If current authority no longer supports that old semantic content:

```text
old revision body withheld
```

The mere fact that bytes remain stored does not authorize display.

## 30. PK-D3 escalation trigger

Requirement:

```text
show what the page said in old revision R
EVEN THOUGH current authority changed and no longer supports R as current semantic material
```

is not PK-D2.

It activates:

```text
PK-D3 HISTORICAL_PAGE
+ C7 historical/partial survival design
```

This firewall prevents revision storage from silently becoming historical-truth authority.

## 31. Revision comparison

Comparison is a derived inspection/presentation operation.

It may compare two exact revisions only when both revision contents are currently eligible for inspection.

```text
diff output
!= semantic revision
!= mutation authority
!= canonical truth upgrade
```

A restore/edit initiated from comparison starts a new current operation.

## 32. Search integration

PK-X2 remains page-oriented.

Default search path:

```text
query
→ PK-X2 result
→ pageIdentity
→ current head
→ current support/use revalidation
→ current page
```

Global search does not return historical revision bodies by default.

Revision listing/inspection is page-local and bounded.

## 33. Search result does not pin revision

Unless a future explicit navigation action targets a revision, an ordinary PK-X2 result refers to the logical page, not the revision that happened to be current when the result list was computed.

At open/use time the current head must be resolved again.

This avoids stale search-result revision pinning.

## 34. Current head support failure

If the current head exists but current semantic support fails:

```text
page identity remains
revision history may remain physically retained
current semantic page becomes unavailable
```

Support failure alone does not create a new revision.

Old revision fallback remains forbidden.

## 35. Repairing an invalid current head

A future current page may become usable again only through an explicit revision-producing operation that constructs and validates a new current semantic state under current authority.

Forbidden:

```text
current head unsupported
→ silently choose most recent older revision that still looks usable
```

## 36. Logically atomic commit

From the semantic consumer viewpoint, admission of a new revision and advancement of the current head must be atomic.

Required outcome:

```text
old head remains current
OR
new revision exists as committed + new head points to it
```

Forbidden observable state:

```text
head points to missing/uncommitted revision
```

Physical backend technology is not frozen.

## 37. Orphan write residue

If a backend writes candidate revision bytes before a conditional head advance and then loses the race, those bytes are not a committed revision merely because they exist.

They must be inert/unlistable by ordinary revision history and safely reclaimable under owner policy.

## 38. Revision list

A page-local revision list may expose only committed revision entries inside the active lifetime and retention window.

It must not list:

```text
orphan candidate writes
failed mutations
quarantined candidates
DENY/HOLD drafts
operation tokens
```

Human-facing timestamps are not required by D2-0 unless a trusted time owner later supplies them.

## 39. Revision metadata is not semantic truth

Metadata such as:

```text
revisionRef
operationKind
previousRevisionRef
restoredFromRevisionRef
```

proves revision-store relationships only.

It does not prove the underlying public-reference assertions are currently true or supported.

## 40. Lifetime

PK-D2 inherits the PK-X1 active conversation lifetime unless a later child freezes a narrower history horizon.

```text
ACTIVE lifetime
→ exact revision operations may proceed subject to policy

ENDED lifetime
→ current head/revisions are ordinary-inaccessible
→ cleanup/retention policy applies

UNKNOWN lifetime
→ fail closed for durable revision operations
```

Physical bytes retained after logical expiry do not extend semantic lifetime.

## 41. Feature off

Temporary feature off while lifetime remains active means:

```text
current PK surface removed
revision mutation = 0
revision lookup/listing = 0
search work = 0
background revision refresh = 0
```

Durable records may remain dormant according to their active lifetime.

Re-enable does not auto-create a revision.

## 42. Reload

Reload clears ephemeral current-view/presentation state.

It does not create, merge, restore, or replay revisions.

A later authorized operation must resolve page/current head and revalidate through normal authority.

## 43. Retention is bounded

PK-D2 requires a mechanically bounded revision archive.

Runtime implementation remains blocked until later D2 design freezes enforceable bounds for at least:

```text
revision count per page
semantic bytes per revision
aggregate bytes per page
citation/provenance entries per revision
revision list window
diff output size
```

No default `forever` history.

## 44. No generic event sourcing

D2-0 does not select a universal event log or replay-from-zero architecture.

The semantic source of a revision is the committed validated full snapshot.

Operation metadata is not required to reconstruct semantic state.

## 45. No automatic context re-entry

```text
stored revision
revision list
revision diff
restore history
```

produce zero model-context authority by themselves.

C6 remains closed.

## 46. No cross-family lineage

A revision predecessor edge within the same page is not C5.

No first-scope rule allows:

```text
BOARD object
→ formal parent of revision
NEWS story
→ formal parent of revision
SOCIAL post
→ formal parent of revision
```

Ordinary trusted source support remains separate.

## 47. No delayed media

No first-scope image/media generation attaches to an exact revision later.

Such behavior would require C8 current-target/current-operation safety and remains deferred.

## 48. Failure vocabulary

D2-0 freezes conceptual failure classes:

```text
REVISION_NOT_INITIALIZED
REVISION_NOT_FOUND
REVISION_MISMATCH
REVISION_RECORD_CORRUPT
REVISION_HEAD_CORRUPT
REVISION_COMMIT_CONFLICT
CANDIDATE_INVALID
CURRENT_SUPPORT_UNAVAILABLE
CURRENT_SUPPORT_MISMATCH
EXPOSURE_DENY_OR_HOLD
SETTLEMENT_NOT_ELIGIBLE
CITATION_NOT_ELIGIBLE
HISTORICAL_SUPPORT_NOT_AUTHORIZED
LIFETIME_NOT_ACTIVE
REVISION_LIMIT_REACHED
```

These are distinct from generic presentation failure.

## 49. No implicit repair

When revision/head integrity fails, no layer may silently:

```text
skip to nearby revision
rewrite revisionRef
choose newest timestamp
rebuild history from transcript
copy current page under new history
merge two branches by text similarity
```

Repair/migration requires explicit owner authority.

## 50. Dormancy / cost

When no PK-D2 operation or revision inspection is active:

```text
revision scan = 0
revision write = 0
revision diff = 0
history replay = 0
background refresh = 0
model call = 0
network call = 0
prompt re-entry bytes = 0
```

Cost must be bounded to the active page/revision window, not conversation age.

## 51. Runtime evidence gate

Before any future runtime authorization, evidence must prove at minimum:

```text
exact page/lifetime identity
revision uniqueness/currentness
atomic committed-revision + head advance behavior
stale expected-revision rejection
candidate revalidation before commit
DENY/HOLD content never persisted as revision
bounded history enforcement
exact old-revision retrieval
restore-as-new revalidation
C7 firewall
PK-X2 current-head resolution
feature-off/reload/lifetime-end behavior
ordinary-turn dormancy
```

D2-0 itself supplies none of that runtime evidence.

## 52. Recommended child sequence

```text
D2-0 Revisioned Page Master Design                 <- THIS DOCUMENT
D2-1 Revision Record / Current Head Contract       <- NEXT
D2-2 Mutation Operation / Commit Safety
D2-3 Revision Read / Compare / Restore Gate
D2-4 Settlement / Citation / Search Integration
D2-5 Lifetime / Bounds / Convergence
```

## 53. Explicit deferred lanes

```text
DEFER PK-D3 HISTORICAL_PAGE / C7
DEFER PK-D4 CONTEXTUAL_DURABLE_PAGE / C6
DEFER CROSS_FAMILY DERIVED LINEAGE / C5
DEFER ASYNC MEDIA PER REVISION / C8
DEFER GLOBAL REVISION SEARCH
DEFER WHOLE-PAGE DELETE / RETIRE
DEFER BRANCHING REVISION TREES
DEFER AUTOMATIC THREE-WAY MERGE
DEFER UNBOUNDED EVENT SOURCING
DEFER CROSS-CONVERSATION PAGE HISTORY
```

## 54. Frozen invariants

```text
D2-I1  page identity and semantic revision remain separate
D2-I2  one page has one current revision head
D2-I3  committed revisions are immutable
D2-I4  first semantic representation is a full validated snapshot per revision
D2-I5  read/search/revalidation does not create revisions
D2-I6  state-derived writes use expected-revision safety by default
D2-I7  candidate semantics are validated before durable commit
D2-I8  head advance and committed revision visibility are logically atomic
D2-I9  restore creates a new revision after current revalidation
D2-I10 old revision storage does not grant historical support authority
D2-I11 C7 is required before unsupported old semantic content may survive as historical display
D2-I12 PK-X2 remains page-search, not global revision-history search
D2-I13 C6 remains closed
D2-I14 C5 remains closed
D2-I15 C8 remains closed
D2-I16 revision archive is bounded and conversation-lifetime scoped
D2-I17 revision persistence never upgrades canonical truth
D2-I18 dormant turns perform no PK-D2 history work
```

## 55. D2-0 verdict

```text
PK_D2_REQUIREMENT              = ACTIVE DESIGN LANE
D2_0_MASTER_DESIGN             = FROZEN
CAPABILITY_PROFILE             = C1+C2+C3+C4
REVISION_TOPOLOGY              = LINEAR_SINGLE_HEAD
REVISION_SEMANTIC_FORMAT       = FULL_VALIDATED_SNAPSHOT
COMMITTED_REVISION_MUTABILITY  = IMMUTABLE
CURRENT_HEAD                   = OWNER-MUTABLE
STALE_WRITE_POLICY             = EXPECTED_REVISION_FAIL_CLOSED
RESTORE_POLICY                 = RESTORE_AS_NEW_REVISION
PK_D3_C7                       = CLOSED
PK_D4_C6                       = CLOSED
C5                             = CLOSED
C8                             = CLOSED
RUNTIME_IMPLEMENTATION         = NOT AUTHORIZED
REAL_VALIDATION                = NOT RUN
PRODUCTION                     = UNCHANGED
release-simcore                = UNCHANGED
NEXT                           = D2-1 REVISION RECORD / CURRENT HEAD CONTRACT
```
