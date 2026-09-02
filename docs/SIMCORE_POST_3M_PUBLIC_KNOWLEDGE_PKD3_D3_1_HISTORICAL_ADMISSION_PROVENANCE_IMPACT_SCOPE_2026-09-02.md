# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-1 Historical Admission / Provenance Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-1 IMPACT SCOPE FROZEN · HISTORICAL ADMISSION / PROVENANCE SEAM SELECTED · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-1 · HISTORICAL ADMISSION · PROVENANCE · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 selected `HISTORICAL_REVISION_VIEW_V1` and froze the central distinction:

```text
historical authenticity
!= current truth support
!= current disclosure safety
```

D3-1 scopes the first trusted admission/provenance contract required to answer:

```text
Was this exact semantic snapshot genuinely admitted as committed revision R of page P,
and may PK-D3 rely on that historical-authenticity claim later?
```

This checkpoint does not implement a historical viewer, storage migration, receipt database, hash format, transaction engine, cleanup worker, prompt change, model call, network call, DOM/CSS, release, or `release-simcore` mutation.

## 1. Authority chain

D3-1 consumes at minimum:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_1_REVISION_RECORD_CURRENT_HEAD_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_2_MUTATION_OPERATION_COMMIT_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_5_LIFETIME_BOUNDS_CONVERGENCE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
```

Inherited invariants remain:

```text
candidate bytes != committed revision
committed revision != current head
not current head != orphan
stored revision != historical display authority
historical admission != current truth authority
historical admission != current disclosure permission
old bytes alone != admission proof
```

## 2. Problem statement

D3-0 introduced conceptual:

```text
HistoricalRevisionAdmissionReceiptV1
```

but intentionally deferred the exact operational contract.

Without D3-1, a future implementation could accidentally allow unsafe states such as:

```text
revision committed
→ historical receipt write fails
→ UI still claims historical authenticity
```

or:

```text
old revision bytes found
→ receipt invented during read
```

or:

```text
receipt for page P / revision R
→ replayed against another page/lifetime/revision
```

or:

```text
receipt missing after storage fault
→ body similarity used as reconstruction proof
```

D3-1 exists to close those seams.

## 3. Selected architecture

D3-1 selects:

```text
REVISION_OWNER_AUTHENTICATED_ADMISSION
+
EXACT IMMUTABLE REVISION BINDING
+
NATIVE D3 COMMIT-TIME ADMISSION
+
SEPARATE OWNER-SAFE D2 BACKFILL PATH
+
NO READ-TIME RECEIPT FABRICATION
+
FAIL-CLOSED MISSING / AMBIGUOUS / MISMATCHED ADMISSION
```

The same authority that owns committed revision membership must either own historical admission directly or expose the exact transactional proof consumed by a least-authority historical-admission owner.

There is no independent historical database allowed to decide by itself that arbitrary stored bytes were once committed.

## 4. Historical admission owner

Selected conceptual owner:

```text
PublicKnowledgeHistoricalAdmissionOwner
```

It is logically subordinate to / cryptographically or transactionally anchored in the authoritative PUBLIC_KNOWLEDGE Revision Owner.

It may own:

```text
historical admission membership
receipt issuance/authentication
exact revision-binding validation
admission uniqueness
bounded backfill admission reconstruction
admission cleanup for ended lifetime
```

It may not own:

```text
current truth
settlement
Exposure
current disclosure permission
revision semantic generation
model prose
source facts
citation truth
search relevance
presentation meaning
```

## 5. Native D3 admission is commit-time authority

For a newly committed revision under the D3 historical profile:

```text
final validated semantic revision candidate
+ exact page/lifetime/revision identity
+ authoritative revision-owner commit admission
→ HistoricalRevisionAdmissionReceiptV1 may be created
```

The receipt must be derived from the final immutable revision state being admitted, not from an earlier draft.

Canonical rule:

```text
HISTORICAL ADMISSION IS CREATED AT SEMANTIC COMMIT
NOT AT LATER READ
```

## 6. Native D3 atomic semantic boundary

For a D3-profile revision-producing operation, the semantic success boundary must cover all of:

```text
immutable revision record admitted
+ committed revision membership admitted
+ current head advanced when applicable
+ historical admission membership / receipt admitted
```

A future physical implementation may use one storage transaction, conditional write set, durable journal, or equivalent owner-safe protocol.

The design requirement is externally atomic semantic visibility.

Forbidden:

```text
revision/current-head visible as successfully committed
while the same D3 operation is reported as historically admitted
but no trustworthy historical admission state exists
```

## 7. No silent downgrade on native D3 commit

If a mutation is explicitly processed under the D3 historical profile and the owner cannot atomically establish historical admission:

```text
HOLD / FAIL BEFORE SEMANTIC COMMIT
```

It must not silently perform:

```text
D3 operation requested
→ commit D2-only revision anyway
→ omit historical admission
```

Such downgrade would make product semantics depend on storage failure.

A caller that explicitly requests a D2-only commit profile is a different future operation contract.

## 8. First-revision bootstrap

The same rule applies to first revision bootstrap.

Before:

```text
pageIdentity P
committed revisions = 0
head = NONE
```

D3 bootstrap success must expose one atomic semantic result equivalent to:

```text
R1 immutable committed
membership(R1) committed
head(P) = R1
historicalAdmission(R1) committed
```

Two concurrent D3 bootstrap attempts may not create two historically admitted first revisions.

## 9. Historical receipt conceptual shape

D3-1 retains the D3-0 conceptual fields:

```text
HistoricalRevisionAdmissionReceiptV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  admittedRevisionBindingRef
  admittedPolicyProfile
```

D3-1 interprets `admittedPolicyProfile` as an admission-basis/profile marker, not truth policy.

First conceptual profile classes:

```text
NATIVE_D3_COMMIT_ADMISSION_V1
D2_COMMITTED_MEMBERSHIP_BACKFILL_V1
```

Exact runtime enum/string spellings remain implementation work.

## 10. Exact revision binding

`admittedRevisionBindingRef` must bind the receipt to exactly the immutable semantic revision that authoritative committed membership admitted.

Required properties:

```text
same exact immutable revision → same owner-validated binding relation
another revision → cannot reuse binding
another page → cannot reuse binding
another lifetime → cannot reuse binding
modified semantic payload → binding validation fails
```

D3-1 does not freeze whether the physical mechanism is:

```text
owner-issued immutable record locator
canonical digest
transactional membership identity
content-addressed owner record
other equivalent exact binding
```

## 11. Forbidden historical-binding substitutes

The following are never sufficient by themselves:

```text
revision timestamp
revision ordinal
page title
body text
body hash produced outside the owner
rendered HTML fingerprint
citation count
same source labels
host message id
array position
similar semantic content
model confidence
```

Canonical rule:

```text
LOOKS LIKE THE OLD REVISION
!=
PROVEN TO BE THE ADMITTED REVISION
```

## 12. Admission uniqueness

For an active lifetime, one logical historical-admission relation exists at most once for:

```text
(pageIdentity, lifetimeScopeRef, revisionRef)
```

and must resolve to exactly one admitted revision binding.

If authoritative state indicates distinct conflicting bindings for the same key:

```text
INVALID_HISTORICAL_ADMISSION_CONFLICT
```

No arbitrary winner may be selected.

Physical replicated copies of one logical owner record are not multiple semantic admissions.

## 13. Receipt is immutable

After a historical admission is committed:

```text
receipt fields / logical admission binding are immutable
```

If semantic content changes, a new revision and its own admission are required.

Forbidden:

```text
R4 body changed
→ update R4 historical receipt to follow new body
```

That would erase historical artifact identity.

## 14. Receipt does not certify truth

Receipt semantics remain narrow:

```text
THIS EXACT REVISION WAS ADMITTED AS COMMITTED HISTORY
```

Not:

```text
THIS CLAIM IS TRUE NOW
THIS CLAIM WAS OBJECTIVELY TRUE THEN
CURRENT SETTLEMENT = STORED SETTLEMENT
CURRENT CITATION = STORED CITATION
CURRENT DISCLOSURE = ALLOW
```

D3-2 still owns current disclosure-safety policy.

## 15. Admission result classes

Conceptual D3-1 states include:

```text
ADMISSION_FOUND_VALID
ADMISSION_ABSENT_AUTHORITATIVE
HOLD_ADMISSION_STATE_UNAVAILABLE
HOLD_ADMISSION_SCHEMA_UNSUPPORTED
INVALID_ADMISSION_MISMATCH
INVALID_ADMISSION_CONFLICT
INVALID_ADMISSION_BINDING
```

Exact runtime enum names remain implementation work.

## 16. Authoritative absence

`ADMISSION_ABSENT_AUTHORITATIVE` requires a successful authoritative exact lookup proving no historical admission exists for the exact key.

Forbidden equivalences:

```text
cache miss
storage timeout
partial read
unknown schema
index miss without owner proof
```

```text
!= ADMISSION_ABSENT_AUTHORITATIVE
```

This mirrors PK-X1/PX1-2 and D2-1 fail-closed absence semantics.

## 17. Missing receipt after native commit

If an exact committed D3 revision exists but the historical admission state is unavailable or missing unexpectedly:

```text
current D2 revision semantics remain committed
historical body authority = NO / HOLD
```

Do not roll back current head merely because historical admission representation is later damaged.

Canonical separation:

```text
POST-COMMIT ADMISSION CORRUPTION
!= CURRENT REVISION ROLLBACK AUTHORITY
```

Any repair path must use independent trusted original admission evidence, not revision bytes alone.

## 18. Commit outcome unknown

If a D3 commit response is lost or ambiguous:

```text
DO NOT blindly retry revision creation / receipt creation
```

The caller must re-read authoritative owner state for:

```text
revision committed membership
current head
historical admission membership/binding
```

before deciding whether the operation committed.

A retry must not create duplicate revision or duplicate admission semantics.

## 19. Receipt mismatch

Examples of mismatch:

```text
receipt.pageIdentity != requested page
receipt.revisionRef != requested revision
receipt.lifetimeScopeRef != active lifetime
receipt binding does not validate against exact immutable revision
receipt policy profile unsupported
```

Result:

```text
historical body WITHHELD
```

Do not search another receipt by similarity or select a nearby revision.

## 20. Receipt loss and equivalent owner evidence

D3-0 allowed a receipt or equivalent trustworthy integrity binding.

D3-1 freezes:

```text
physical receipt row missing
+ separate authoritative owner admission evidence exists
→ a future repair/re-materialization path may reconstruct representation

physical receipt row missing
+ only revision bytes/membership remain
→ NO native-D3 receipt fabrication unless an approved backfill profile applies
```

Ordinary historical read does not mutate storage to repair state.

## 21. Existing D2 revisions

A revision committed before D3 admission existed is not automatically historically viewable.

Default:

```text
D2 committed revision
+ no D3 admission binding
→ D2_ONLY_NOT_HISTORICALLY_ADMITTED
```

This is not corruption.

Mixed histories are legal:

```text
R1 D2-only
R2 D2-only
R3 D3-admitted
R4 D3-admitted
```

Historical metadata UI must not imply R1/R2 have body authority if they do not.

## 22. Selected D2 backfill seam

D3-1 opens a narrow **design-only** reconstruction profile for old D2 revisions:

```text
D2_COMMITTED_MEMBERSHIP_BACKFILL_V1
```

It may admit an old revision historically only when authoritative owner evidence can prove all of:

```text
exact pageIdentity
exact lifetimeScopeRef
exact revisionRef
authoritative committed D2 membership
exact immutable committed revision record
binding between that membership and that exact record
no ambiguity / corruption
```

This is stronger than `old bytes exist`.

## 23. Why D2 backfill is semantically legitimate

Historical authenticity asks:

```text
Was this exact semantic artifact genuinely committed as revision R of page P?
```

Authoritative D2 committed membership + exact immutable revision binding can prove that fact even though D3 did not yet exist.

Backfill therefore does not claim:

```text
D3 policy ran in the past
```

It records:

```text
this old D2 revision is now historically admitted on the basis of trustworthy D2 commit evidence
```

Hence the admission profile must distinguish native admission from backfill admission.

## 24. Backfill is never bytes-only

Forbidden:

```text
revision record exists
→ historical receipt minted
```

Also forbidden:

```text
revision number looks contiguous
→ infer committed membership
```

or:

```text
current head descends from R4
→ infer all old revision bytes were authentic
```

Backfill requires direct authoritative membership/binding evidence.

## 25. Backfill does not mutate revision semantics

Successful backfill:

```text
adds historical-admission authority metadata only
```

It does not:

```text
change revisionRef
change revision body
change current head
create a new semantic revision
rewrite settlement/citations
```

Therefore it is not a D2 semantic mutation operation.

## 26. Backfill execution must be bounded

D3-1 does not authorize a background global migration scan.

Allowed future shapes are bounded, for example:

```text
explicit exact revision backfill
bounded exact page-local backfill up to inherited revision cap
explicit administrative migration transaction
```

Forbidden:

```text
ordinary turn
→ scan every stored revision for missing receipts
```

## 27. Backfill ambiguity fails closed

If old D2 evidence is incomplete:

```text
membership unknown
record binding ambiguous
lifetime identity uncertain
revision storage corrupt
multiple candidate records
```

then:

```text
NO historical admission
```

The revision remains D2-only.

## 28. Current historical read sequence after D3-1

Conceptual order remains:

```text
1 exact active page/lifetime
2 exact revisionRef
3 authoritative committed D2/D3 membership
4 exact immutable revision record
5 exact historical admission lookup
6 exact receipt/binding validation
7 current D3 disclosure-safety gate
8 HistoricalRevisionViewV1
```

The historical admission lookup never substitutes for step 3.

Canonical rule:

```text
ADMISSION RECEIPT
!= COMMITTED MEMBERSHIP
```

Both must agree.

## 29. Current head is not authenticity proof

Forbidden:

```text
R4 was once current head
```

as standalone historical admission proof unless authoritative historical commit state proves the exact revision membership/binding.

Likewise current head membership does not imply historical receipt for predecessors.

## 30. Revision chain does not auto-admit predecessors

If R7 is admitted historically:

```text
previousRevisionRef = R6
```

is not sufficient to admit R6.

Each historically viewable revision requires its own exact admission relation.

## 31. No derived-lineage escalation

Receipt relation:

```text
revision R ↔ historical admission proof
```

is owner provenance for the same revision artifact.

It is not Candidate C C5 derived-to-derived lineage.

C5 remains closed.

## 32. No context re-entry

Historical admission metadata is not future prompt memory.

```text
receipt exists
!= model context injection
```

C6 remains closed.

## 33. No delayed effect targeting

A historical receipt does not authorize future asynchronous operations to mutate/attach to the revision.

C8 remains closed.

## 34. Lifetime behavior

Historical admission inherits the page/revision lifetime.

```text
ACTIVE → exact admission may support historical inspection
ENDED  → ordinary historical use invalid immediately
UNKNOWN → fail closed
```

Receipt existence after lifetime END does not revive access.

## 35. Cleanup

On trusted lifetime END, D3-owned historical admission metadata becomes owner-cleanup eligible together with D2 revision material.

Physical deletion failure:

```text
!= admission active
!= historical body usable
```

Cleanup must not delete upstream Evidence/Source authority merely because a revision referenced it.

## 36. Storage corruption is not admission migration

Examples:

```text
committed membership says R4
revision record missing
receipt exists
```

or:

```text
revision exists
receipt says different binding
```

are integrity failures.

Do not call backfill to paper over corruption.

Backfill only applies to valid D2 committed revisions lacking historical admission by product history.

## 37. Presentation leakage boundary

Receipt internals are not ordinary user-visible semantic content.

A renderer may communicate:

```text
historical revision authenticated
historical body unavailable
```

without exposing opaque binding refs, storage diagnostics, private counts, or repair state.

Exact UI is D3-3.

## 38. Search boundary

PK-X2 and D3 history navigation may use historical-admission metadata only as exact eligibility metadata for a selected page/revision.

It must not become:

```text
historical full-text index
historical relevance signal
ranking boost
cross-page history search
```

## 39. Resource bounds

D3-1 adds only bounded admission metadata per committed revision.

Concrete additional receipt/backfill byte caps are deferred to D3-5.

A future runtime must not allow receipt payloads to carry arbitrary model text, source documents, or unbounded provenance bundles.

## 40. Candidate C impact

D3-1 preserves:

```text
C1 = YES
C2 = YES
C3 = YES, inherited PK-D2
C4 = YES, inherited PK-D2
C5 = NO
C6 = NO
C7 = YES, historical admission capability
C8 = NO
```

No additional Candidate C gate opens.

## 41. Failure policy

Historical admission failures affect historical body authority, not automatically current-page validity.

Examples:

```text
receipt unavailable
→ historical body HOLD
→ current D2 head may remain valid

receipt mismatch
→ historical body invalid/withheld
→ integrity alert / repair lane may be needed

old D2 revision not backfillable
→ remains D2-only
```

## 42. Runtime evidence blockers

Before any future implementation can claim D3-1 runtime readiness it must prove at minimum:

```text
revision-owner-authenticated admission
native D3 atomic commit boundary
exact receipt ↔ revision binding
unique admission relation
missing/unavailable distinction
commit-outcome-unknown recovery
no read-time receipt fabrication
D2 backfill uses authoritative membership, not bytes alone
mixed D2-only / D3-admitted history correctness
ended-lifetime invalidation
ordinary-turn dormancy
```

## 43. Explicitly deferred

D3-1 does not freeze:

```text
current historical disclosure policy matrix         → D3-2
historical renderer / current-status companion      → D3-3
historical compare / presentation details           → D3-3
restore/search/navigation integration details       → D3-4
receipt size / retention caps / convergence         → D3-5
physical hash algorithm
physical database schema
repair tool implementation
background migration
cross-conversation archive
```

## 44. Recommended D3-1 detailed checkpoint

Impact scope selects the detailed contract to freeze next:

```text
D3-1 Historical Admission / Provenance Design

- native commit admission transaction
- exact binding and uniqueness
- missing/mismatch/corruption states
- authoritative D2 backfill admission
- mixed-history semantics
- read-time proof sequence
```

## 45. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
PRODUCTION BRANCH = MUST REMAIN UNCHANGED
```
