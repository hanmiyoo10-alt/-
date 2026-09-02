# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-1 Historical Admission / Provenance Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D3-1 DESIGN FROZEN · REVISION-OWNER-AUTHENTICATED HISTORICAL ADMISSION · NATIVE D3 COMMIT-TIME ATOMICITY · EXACT IMMUTABLE REVISION BINDING · BOUNDED D2 BACKFILL · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-1 · HISTORICAL ADMISSION · PROVENANCE · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 froze `HISTORICAL_REVISION_VIEW_V1` and introduced the trusted historical-admission boundary.

D3-1 freezes the concrete owner/provenance contract for that boundary.

The central claim D3-1 must make mechanically trustworthy is:

```text
THIS EXACT IMMUTABLE SEMANTIC REVISION
WAS AUTHENTICALLY COMMITTED
AS REVISION R OF PAGE P IN LIFETIME L
```

D3-1 does not claim that the revision is current truth, currently settled, currently source-supported, or currently discloseable.

This document implements no runtime admission store, migration worker, transaction engine, hash function, prompt change, model call, network call, renderer, release, or `release-simcore` mutation.

## 1. Authority chain

D3-1 consumes:

```text
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_0_HISTORICAL_PAGE_MASTER_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD3_D3_1_HISTORICAL_ADMISSION_PROVENANCE_IMPACT_SCOPE_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_1_REVISION_RECORD_CURRENT_HEAD_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_2_MUTATION_OPERATION_COMMIT_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_3_REVISION_READ_COMPARE_RESTORE_DESIGN_2026-09-02
SIMCORE_POST_3M_PUBLIC_KNOWLEDGE_PKD2_D2_5_LIFETIME_BOUNDS_CONVERGENCE_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC2_REVISION_GENERATION_OPERATION_SAFETY_DESIGN_2026-09-02
SIMCORE_POST_3M_CANDIDATE_C_CC3_SOURCE_HISTORY_STORE_LIFETIME_RETRIEVAL_DESIGN_2026-09-02
```

Inherited rules:

```text
candidate != committed revision
committed membership != current head
receipt != committed membership
stored bytes != admission proof
admission != current truth
admission != current disclosure permission
historical display != restore authority
```

## 2. Capability profile

D3-1 preserves the PK-D3 first profile:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES, inherited PK-D2
C4 append / merge pressure    = YES, inherited PK-D2
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES, DESIGN ONLY
C8 delayed effect targeting   = NO
```

No additional Candidate C capability is opened by historical admission metadata.

## 3. Selected owner architecture

D3-1 selects conceptual:

```text
PublicKnowledgeRevisionOwner
        │
        ├─ immutable revision records
        ├─ authoritative committed membership
        ├─ current head
        └─ commit-profile expectation
             │
             ▼
PublicKnowledgeHistoricalAdmissionOwner
        ├─ historical admission membership
        ├─ authenticated admission receipts
        ├─ exact revision-binding validation
        ├─ admission uniqueness
        └─ bounded D2 backfill admission
```

The historical owner may be physically co-located with the Revision Owner.

The logical rule is more important:

```text
HISTORICAL ADMISSION AUTHORITY
MUST BE ROOTED IN AUTHORITATIVE REVISION COMMIT AUTHORITY
```

A detached consumer-owned receipt database cannot independently certify historical authenticity.

## 4. Revision commit expectation metadata

D3-1 introduces a small owner-controlled commit expectation because receipt absence must be distinguishable from legitimate legacy D2-only history.

Conceptual:

```text
RevisionCommitHistoricalExpectationV1
  D2_ONLY_NO_NATIVE_ADMISSION
  D3_NATIVE_ADMISSION_REQUIRED
```

This is authoritative commit-membership metadata, not revision semantic body.

It is not model writable and not ordinary user-visible content.

## 5. Why expectation metadata is required

Without an authoritative expectation:

```text
R4 has no receipt
```

would be ambiguous between:

```text
A. legitimate D2-only revision committed before D3
B. D3-native revision whose historical admission state was lost/corrupted
```

D3-1 forbids guessing.

Canonical rule:

```text
EXPECTED D3 ADMISSION + ADMISSION MISSING
= INTEGRITY FAILURE

D2-ONLY EXPECTATION + ADMISSION MISSING
= LEGITIMATE NON-HISTORICAL REVISION
```

## 6. Historical admission record

Conceptual trusted read boundary remains:

```text
HistoricalRevisionAdmissionReceiptV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  admittedRevisionBindingRef
  admittedPolicyProfile
```

The receipt is an authenticated read projection of one logical historical-admission membership relation.

A physical implementation need not store a standalone serialized receipt if equivalent authoritative admission state can deterministically materialize this boundary.

## 7. Admission policy profiles

First design profiles:

```text
NATIVE_D3_COMMIT_ADMISSION_V1
D2_COMMITTED_MEMBERSHIP_BACKFILL_V1
```

They answer:

```text
ON WHAT AUTHENTICITY BASIS WAS THIS REVISION ADMITTED FOR HISTORICAL INSPECTION?
```

They do not answer:

```text
was claim true?
may body be shown now?
```

## 8. Native D3 commit input

A native D3 historical admission is built only from the final exact revision state that would otherwise commit under PK-D2.

Conceptual inputs to the owner transaction:

```text
pageIdentity
lifetimeScopeRef
revisionRef
expectedRevision / bootstrap expectation
final validated immutable semantic revision record
D3_NATIVE_ADMISSION_REQUIRED expectation
```

Not valid inputs:

```text
model draft
pre-validation candidate
rendered HTML
host transcript text
cached previous page body
```

## 9. Native D3 commit pipeline

Frozen conceptual ordering:

```text
1 authorize revision-producing operation
2 exact page/lifetime resolve
3 exact current head / expectedRevision check
4 build complete candidate
5 current PK-D2 validation / support / settlement / citation gates
6 D2-2 operation-footprint / no-op gates
7 re-check current head / expectedRevision
8 allocate/reserve exact revision identity under owner rules
9 derive exact historical revision binding from final immutable record
10 prepare historical admission membership
11 atomically admit revision membership + commit expectation + head advance + historical admission
12 expose committed result
13 presentation reconciliation
```

Physical implementation details remain open.

## 10. Semantic atomicity

For a native D3 operation, success is all-or-nothing at the semantic authority boundary.

Success means equivalent to:

```text
revision R immutable record = committed
committed membership(R) = yes
commitExpectation(R) = D3_NATIVE_ADMISSION_REQUIRED
historicalAdmission(R) = exact valid admission
head(P) = R   // when R is the new head
```

A caller must not observe a successful D3 semantic commit where one required authoritative component was never admitted.

## 11. Physical transaction implementations remain open

Allowed future mechanisms include:

```text
single database transaction
conditional multi-record transaction
durable owner journal + recovery protocol
serialized owner queue
transactional append + atomic pointer update
```

Required externally visible property:

```text
NO SUCCESSFULLY COMMITTED NATIVE D3 REVISION
WITHOUT ITS REQUIRED HISTORICAL ADMISSION AUTHORITY
```

## 12. No silent native downgrade

If native historical admission cannot be guaranteed before commit:

```text
HOLD_NATIVE_D3_ADMISSION_UNAVAILABLE
→ no new semantic revision
→ head unchanged
```

Forbidden:

```text
D3 requested
admission storage unavailable
→ commit D2-only revision anyway
```

Explicit future D2-only operations remain a separate product profile.

## 13. First bootstrap

For a page with no revision history:

```text
page P exists
committed revisions = 0
head = NONE
```

native D3 bootstrap success is conceptually atomic:

```text
R1 committed
membership(R1) committed
expectation(R1) = D3_NATIVE_ADMISSION_REQUIRED
admission(R1) committed
head(P) = R1
```

Two concurrent bootstrap attempts cannot both win.

## 14. Ordinary head advance

For:

```text
head = R7
expectedRevision = R7
candidate = R8
```

native success requires:

```text
R8 committed
expectation(R8) = D3_NATIVE_ADMISSION_REQUIRED
admission(R8) exact and valid
head = R8
```

If head changed before commit:

```text
REVISION_MISMATCH
→ no R8 committed membership
→ no authoritative R8 admission
```

Staging residue is not history.

## 15. No-op behavior

D2-2 semantic no-op remains authoritative.

If validated next semantics equal current committed semantics:

```text
NO_OP
→ no new revision
→ no new historical admission
```

Historical admission metadata alone is not a reason to mint a semantic revision.

A legacy D2 revision that needs historical backfill uses the separate backfill operation, not a semantic no-op revision.

## 16. Admission candidate is not authority

A future implementation may stage:

```text
HistoricalAdmissionCandidateV1
```

before atomic commit.

Staged bytes:

```text
!= historical admission
!= revision history
!= read authority
```

They may be garbage-collected when provably unable to win.

## 17. Exact binding domain

`admittedRevisionBindingRef` binds:

```text
pageIdentity
lifetimeScopeRef
revisionRef
exact immutable semantic revision record
```

It must be impossible for one valid logical binding to authenticate a different semantic revision state.

## 18. Logical rather than backend-byte binding

D2-5 already requires deterministic logical record encoding for resource measurement.

If a future D3 implementation chooses digest-based binding, it should bind a canonical logical revision representation rather than mutable backend framing such as:

```text
database page bytes
compression artifacts
replication envelope
encryption ciphertext layout
index storage
```

D3-1 does not freeze a hash algorithm or exact serialization.

## 19. Required domain separation

If digest-like mechanisms are used, the binding domain must prevent cross-object replay.

Conceptually include/commit to:

```text
historical-admission schema/domain
page identity
lifetime identity
revision identity
exact revision logical record
```

A digest of body text alone is insufficient.

## 20. Forbidden binding mechanisms

Never use alone:

```text
revision ordinal
timestamp
title
body string
rendered HTML
citation labels
source labels
host message index
array position
model-generated fingerprint
semantic similarity
```

## 21. Logical uniqueness

Within one active lifetime:

```text
(pageIdentity, lifetimeScopeRef, revisionRef)
→ at most one logical historical admission
```

and that admission resolves to exactly one immutable revision binding.

Repeated idempotent request for the same exact already-admitted relation returns existing admission.

It does not create another logical receipt.

## 22. Conflicting admissions

If authoritative state contains:

```text
same page/lifetime/revision
→ binding A
→ binding B
```

or incompatible admission profiles claiming distinct semantic bindings:

```text
INVALID_HISTORICAL_ADMISSION_CONFLICT
```

Historical body is withheld.

No latest-wins, timestamp-wins, or similarity reconciliation is allowed.

## 23. Native admission cannot be backfilled again

If a revision already has a valid `NATIVE_D3_COMMIT_ADMISSION_V1` admission:

```text
D2 backfill request
→ FOUND_EXISTING_ADMISSION
```

No second logical backfill admission is added.

## 24. Receipt immutability

Committed historical admission state is immutable.

Forbidden:

```text
edit receipt to point from R4-body-A to R4-body-B
change pageIdentity on receipt
change admission profile after the fact
reuse receipt under another lifetime
```

If revision semantics change, a new revision is required.

## 25. Admission authenticity is not truth authority

The historical admission owner may prove only:

```text
artifact admission authenticity
```

It may not evaluate:

```text
current source support
current Exposure
current settlement
current disclosure permission
current citation authorization
```

D3-2 remains the current disclosure authority.

## 26. Historical read proof sequence

D3-1 freezes exact authenticity ordering:

```text
1 active page/lifetime exact resolve
2 exact revisionRef
3 authoritative committed membership
4 exact immutable revision record
5 commitExpectation read
6 exact historical admission lookup
7 receipt schema/profile validation
8 page/lifetime/revision tuple validation
9 exact admittedRevisionBindingRef validation
10 hand authentic artifact to D3-2 disclosure gate
```

Steps 3 and 6 are separate.

## 27. Receipt alone is insufficient

Forbidden:

```text
receipt exists
→ assume revision committed
```

A receipt with no authoritative matching committed membership is invalid/corrupt state.

```text
ADMISSION RECEIPT
!= COMMITTED MEMBERSHIP
```

## 28. Membership alone is insufficient for native D3 history

For `D3_NATIVE_ADMISSION_REQUIRED`:

```text
membership exists
+ revision exists
+ admission missing
→ historical authenticity unavailable/corrupt
```

Do not downgrade the revision to legacy D2-only merely because the admission component disappeared.

## 29. Legacy D2-only state

A revision whose authoritative expectation is:

```text
D2_ONLY_NO_NATIVE_ADMISSION
```

and which has no historical admission is a valid state.

Conceptual historical capability:

```text
D2_ONLY_NOT_HISTORICALLY_ADMITTED
```

The revision may remain valid current/revision history under PK-D2.

It simply lacks D3 body inspection authority.

## 30. Mixed history

Legal first-scope example:

```text
R1 D2-only
R2 D2-only
R3 D3 native admitted
R4 D3 native admitted
```

or after explicit safe backfill:

```text
R1 D2 backfill admitted
R2 D2-only
R3 D3 native admitted
R4 D3 native admitted
```

Historical body eligibility is per exact revision.

One admitted revision does not auto-admit neighbors.

## 31. D2 backfill purpose

D3-1 freezes:

```text
D2_COMMITTED_MEMBERSHIP_BACKFILL_V1
```

for revisions that genuinely predate native D3 admission but whose authoritative D2 commit evidence can still prove exact historical authenticity.

Backfill is not corruption repair for broken D3-native admission.

## 32. Backfill required evidence

An old D2 revision may be backfilled only when all are exact and authoritative:

```text
pageIdentity
lifetimeScopeRef
revisionRef
commitExpectation = D2_ONLY_NO_NATIVE_ADMISSION
committed D2 membership
immutable committed revision record
membership ↔ record exact binding
supported schema interpretation
no conflicting admission
active lifetime
```

If any element is unknown:

```text
HOLD_BACKFILL_PROOF_INCOMPLETE
```

## 33. Backfill does not need current truth support

Historical authenticity asks whether the revision was actually committed, not whether it is current truth.

Therefore backfill does **not** require old revision content to pass current:

```text
source support
settlement
ordinary current-page Exposure
citation reauthorization
```

Those would collapse D3 back toward D2.

## 34. Backfill does not grant current disclosure

Backfill success also does not imply body visibility.

```text
backfill admission SUCCESS
→ historical authenticity axis PASS
→ D3-2 current disclosure gate still required
```

This preserves the D3 three-axis model.

## 35. Backfill is metadata admission, not semantic mutation

Backfill does not alter:

```text
revision body
revisionRef
previousRevisionRef
current head
settlement/citation fields
revision ordering
```

It adds only trusted historical-admission metadata for an already valid committed artifact.

Therefore backfill does not create another semantic revision.

## 36. No ordinary-read backfill side effect

Historical read paths do not silently write a backfill receipt just because a legacy D2 revision is selected.

Forbidden:

```text
user opens R2 history
→ read sees no admission
→ automatically mints backfill admission
```

Backfill requires an explicit trusted migration/admission operation.

This prevents read-time state mutation and metadata/disclosure oracles.

## 37. Backfill bounded scope

Future supported shapes may include:

```text
one exact revision
one exact page's bounded revision set up to inherited cap
explicit administrative migration transaction
```

Forbidden:

```text
background scan of all histories
ordinary-turn global backfill
fuzzy discovery of old revisions
```

## 38. Backfill idempotency

For exact valid existing admission:

```text
backfill requested again
→ FOUND_EXISTING_ADMISSION
→ no duplicate admission
```

For exact valid D2-only revision without admission:

```text
backfill proof passes
→ one admission atomically created
```

## 39. Backfill commit atomicity

Backfill does not mutate semantic revision state, but its own admission metadata write must still be atomic with respect to uniqueness.

Two concurrent backfill attempts for the same revision may not create conflicting admissions.

Conceptual result:

```text
one wins / both observe same admitted relation
```

not two semantic admission identities.

## 40. Backfill corruption guard

Do not use backfill when:

```text
revision expected native D3 admission but admission missing
revision record binding inconsistent
committed membership corrupt
revisionRef ambiguous
lifetime binding inconsistent
```

Those states require integrity repair, not migration.

## 41. Missing physical receipt projection

A physical serialized receipt may be a projection/cache of authoritative admission state.

If:

```text
logical authoritative admission exists
physical receipt projection missing
```

then a future representation repair may re-materialize the receipt from the authoritative admission relation.

This does not create new historical semantics.

## 42. Missing authoritative admission relation

If:

```text
commitExpectation = D3_NATIVE_ADMISSION_REQUIRED
but authoritative historical admission relation cannot be proven
```

then ordinary read must return HOLD/INVALID historical state.

Revision bytes alone cannot reconstruct native admission.

A future repair mechanism requires independent trusted original transaction evidence.

## 43. Post-commit corruption isolation

Suppose R8 was successfully used as current head, then historical admission metadata is later damaged.

D3-1 freezes:

```text
R8 current/revision semantics remain governed by PK-D2 authority
historical inspection of R8 = withheld/invalid
```

Forbidden:

```text
historical receipt lost
→ automatically roll head back to R7
```

## 44. Current head does not repair history

Neither:

```text
head = R8
```

nor:

```text
R9.previousRevisionRef = R8
```

is enough to recreate a missing native historical admission.

Chain topology is not historical admission proof.

## 45. Commit outcome unknown

If the caller loses the commit response:

```text
COMMIT_OUTCOME_UNKNOWN
```

it must re-read authoritative owner state.

Required inspection:

```text
committed membership for reserved revisionRef
commit expectation
historical admission
current head
```

Possible interpretation:

```text
all expected authoritative state committed
→ operation succeeded

none committed
→ operation did not commit; retry rules may apply

partial contradictory authoritative state
→ integrity HOLD; do not blind retry
```

## 46. Blind retry forbidden

A caller must not respond to unknown outcome by independently retrying:

```text
revision insert
receipt insert
head advance
```

because the first operation may have succeeded and only its response was lost.

Owner idempotency/expectedRevision rules must govern any retry.

## 47. Admission absence states

D3-1 distinguishes:

```text
ADMISSION_ABSENT_AUTHORITATIVE
HOLD_ADMISSION_STATE_UNAVAILABLE
HOLD_ADMISSION_SCHEMA_UNSUPPORTED
```

Only the first is proven absence.

Cache miss/timeouts do not become absence.

## 48. Admission validity states

Conceptual outcomes include:

```text
ADMISSION_FOUND_VALID
INVALID_ADMISSION_PAGE_MISMATCH
INVALID_ADMISSION_LIFETIME_MISMATCH
INVALID_ADMISSION_REVISION_MISMATCH
INVALID_ADMISSION_BINDING
INVALID_ADMISSION_CONFLICT
INVALID_ADMISSION_EXPECTATION_MISMATCH
```

Exact runtime enums remain implementation work.

## 49. Expectation mismatch

Examples:

```text
D3_NATIVE_ADMISSION_REQUIRED + backfill-profile receipt
D2_ONLY_NO_NATIVE_ADMISSION + receipt claiming native D3 original commit
```

without independent authoritative proof are integrity mismatches.

Admission profile must describe provenance truthfully.

## 50. No profile laundering

A backfilled D2 revision must never be presented internally as if D3 historical admission ran at original commit time.

Canonical provenance:

```text
NATIVE D3 = admission co-committed with revision
BACKFILL D2 = historical authenticity reconstructed later from authoritative D2 commit evidence
```

Both can authorize historical authenticity after validation, but their provenance is distinct.

## 51. Historical admission does not alter old settlement/citation semantics

Receipt creation/backfill must not rewrite the stored revision's:

```text
referenceState
settlement representation
citation records
citation roles
support-anchor relations
```

Those remain part of the exact historical artifact.

## 52. Historical citations are not admission proof

A matching citation surface cannot substitute for admission binding.

```text
same citations
!= same committed revision
```

Likewise support anchors prove support relations, not revision admission authenticity.

## 53. Historical admission does not create stable citation identity

D2-4/D3-0 citation boundaries remain.

Receipt binding the revision as a whole does not create cross-revision stable bibliography identity.

## 54. D3-2 handoff

After D3-1 establishes:

```text
ADMISSION_FOUND_VALID
```

it hands the exact historical artifact to D3-2's current historical disclosure policy.

It does not precompute or cache disclosure ALLOW permanently.

Current disclosure must be re-evaluated at use.

## 55. Disclosure denial does not revoke admission

If D3-2 later says:

```text
DENY_HISTORICAL_DISCLOSURE
```

then:

```text
historical admission authenticity remains intact
historical body is withheld
```

Do not mutate/delete admission merely because disclosure policy changed.

## 56. Truth changes do not revoke admission

If current world/source support changes:

```text
R4 now false/corrected/outdated
```

historical admission remains the proof that R4 was committed.

That is the C7 capability PK-D3 intentionally adds.

## 57. Admission revocation is not ordinary policy

D3-1 does not define a user-facing `revoke historical admission` operation.

If an admission was created corruptly or fraudulently, that is integrity-repair/admin territory.

Current disclosure withholding is the ordinary safety control, not rewriting history authenticity metadata.

## 58. Lifetime binding

Admission is scoped by exact:

```text
lifetimeScopeRef
```

Same page/revision-looking data in another lifetime cannot reuse the admission.

After lifetime END:

```text
ordinary historical admission use = invalid immediately
```

Physical storage persistence is irrelevant to access validity.

## 59. Lifetime cleanup

Trusted END may make D3-owned data cleanup eligible:

```text
historical admission membership
receipt/projection records
backfill admission metadata
uncommitted admission staging residue
```

Cleanup does not delete upstream Evidence/Source authority stores merely because they were referenced by a revision.

## 60. Cleanup cannot repair admission state

Forbidden:

```text
missing receipt → manufacture one before delete
conflicting bindings → keep newest one
legacy D2 revision → auto-backfill during cleanup
```

Cleanup and integrity repair remain separate owners.

## 61. Ordinary-turn dormancy

When no explicit historical operation/mutation requiring D3 admission is active:

```text
historical admission lookup = 0 required
historical admission write = 0
backfill scan = 0
revision history scan = 0
model call = 0
network call = 0
```

Native D3 admission work occurs only during an authorized revision commit.

## 62. Search boundary

PK-X2 remains page-level current search.

Historical admission metadata is not:

```text
search index
ranking signal
full-text corpus
cross-page historical discovery source
```

D3-4 owns history navigation integration.

## 63. Model boundary

The model cannot output:

```text
historicallyAdmitted: true
admittedRevisionBindingRef: ...
admissionPolicy: ...
```

with authority.

If such text appears in model output, it is untrusted prose/data and does not become admission state.

## 64. Renderer boundary

Renderer receives historical admission status only through validated historical-view sidecar state.

DOM presence, old visible cards, or cached historical HTML cannot establish admission authenticity.

## 65. Security boundary

Opaque receipt/binding identifiers are not access-control secrets.

Knowing:

```text
pageIdentity
revisionRef
receipt-like token
```

does not bypass:

```text
active lifetime checks
exact owner validation
D3-2 current disclosure policy
```

## 66. Metadata leakage

Historical-admission existence itself can reveal that a revision was committed.

Therefore ordinary UI must not expose raw admission internals or hidden receipt counts as an oracle.

D3-3 will freeze presentation detail.

## 67. Resource bounds

D3-1 requires admission metadata to be finite and schema-bounded.

It must not contain:

```text
full source documents
model transcripts
unbounded support bundles
rendered HTML
arbitrary notes
```

Concrete receipt/ref/operation caps are deferred to D3-5.

## 68. Acceptance cases

### Case A — native D3 commit success

```text
R7 current
→ valid mutation
→ R8 + membership + D3 expectation + admission + head advance
→ all authoritative state exact
→ historical authenticity available
```

### Case B — admission unavailable before native commit

```text
candidate R8 valid
historical owner unavailable
→ HOLD
→ R8 not committed
→ head remains R7
```

### Case C — native admission later missing

```text
R8 committed
expectation = D3_NATIVE_ADMISSION_REQUIRED
admission unavailable/corrupt
→ current PK-D2 semantics may remain
→ historical body withheld
→ no automatic rollback
```

### Case D — legacy D2 revision

```text
R3 committed
expectation = D2_ONLY_NO_NATIVE_ADMISSION
no admission
→ valid D2 history
→ historical body unavailable
```

### Case E — exact safe D2 backfill

```text
R3 D2-only
exact authoritative membership + exact immutable record proven
→ backfill admission created
→ revision/head unchanged
→ historical authenticity available
→ disclosure gate still required
```

### Case F — bytes-only old revision

```text
R3 bytes exist
membership unknown
→ no backfill
```

### Case G — replayed receipt

```text
receipt from P1/R4/L1
used for P2/R4/L1 or P1/R4/L2
→ INVALID
```

### Case H — conflicting binding

```text
same P/L/R
binding A and binding B
→ INVALID_HISTORICAL_ADMISSION_CONFLICT
→ no body
```

### Case I — commit response lost

```text
caller uncertain
→ reread authoritative owner tuple
→ never blind retry
```

### Case J — current disclosure denial

```text
admission authentic
D3-2 disclosure DENY
→ body withheld
→ admission remains authentic
```

## 69. Candidate C reassessment

D3-1 does not add beyond the D3-0 profile:

```text
C1 YES
C2 YES
C3 YES
C4 YES
C5 NO
C6 NO
C7 YES
C8 NO
```

Historical admission is the proof mechanism for C7 historical artifact survival, not a generic lineage/reentry/effect system.

## 70. Runtime prerequisites

Future D3-1 implementation must prove at minimum:

```text
trusted Revision Owner
trusted Historical Admission Owner / equivalent co-located authority
commitExpectation metadata integrity
native semantic atomicity
exact revision binding
idempotent uniqueness
absence vs unavailable distinction
post-commit corruption isolation
commit-outcome-unknown recovery
safe bounded D2 backfill
no read-time receipt fabrication
no bytes-only backfill
mixed history correctness
lifetime invalidation
ordinary-turn dormancy
```

## 71. Explicitly deferred

D3-1 does not freeze:

```text
historical disclosure privacy/withdrawal matrix   → D3-2
historical renderer/current-status companion      → D3-3
historical compare presentation                   → D3-3
restore/search/navigation integration             → D3-4
receipt/binding byte caps                         → D3-5
cross-conversation archive
stable citation identity
historical full-text search
historical prompt re-entry
late asynchronous revision attachment
physical hash algorithm
physical database tables
repair tool implementation
```

## 72. D3 sequence after this checkpoint

```text
PK-D3 Impact Scope                         ✅
D3-0 Historical Page Master               ✅
D3-1 Historical Admission / Provenance    ✅ DESIGN FROZEN BY THIS DOCUMENT

D3-2 Historical Disclosure / Withdrawal   NEXT
D3-3 Historical Presentation / Compare
D3-4 Restore / Search / Navigation
D3-5 Lifetime / Bounds / Convergence
```

## 73. Transaction classification

```text
DESIGN-ONLY
DOCS-ONLY
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
PRODUCTION BRANCH = MUST REMAIN UNCHANGED
```
