# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-3 Revision Read / Compare / Restore Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-3 DESIGN FROZEN · EXACT COMMITTED READ · CURRENT INSPECTION GATE · WHOLE-REVISION WITHHOLDING · STRUCTURAL NON-IDENTITY DIFF · COPY-FORWARD RESTORE · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-3 · REVISION READ · COMPARE · RESTORE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 froze the PK-D2 revisioned-page master architecture.
D2-1 froze committed revision ownership and current-head authority.
D2-2 froze mutation operation and commit safety.
The D2-3 impact scope froze the seam between revision metadata, semantic body inspection, comparison, and copy-forward restore.

D2-3 now freezes the detailed read/compare/restore contract.

This document authorizes no runtime implementation, storage schema migration, prompt change, DOM/CSS, model call, network call, or release transaction.

## 1. Canonical separation

```text
COMMITTED REVISION EXISTENCE
!=
CURRENT BODY INSPECTION ELIGIBILITY
!=
CURRENT TRUTH
!=
RESTORE AUTHORITY
```

A revision can remain durably committed while its semantic body is unavailable for current inspection.

## 2. Primary flow

```text
pageIdentity
  ↓
Revision Owner
  ├─ list committed metadata
  └─ exact revisionRef
          ↓
RevisionInspectionGateV1
          ├─ METADATA_ONLY / BODY_WITHHELD
          └─ BODY_INSPECTION_ELIGIBLE
                    ├─ exact read
                    ├─ bounded compare
                    └─ restore-source eligibility
                              ↓
                    current candidate revalidation
                              ↓
                    D2-2 mutation / commit safety
                              ↓
                    new committed revision
```

## 3. Owner boundaries

### Revision Owner

Owns only revision-store facts:

```text
pageIdentity
committed membership
revisionRef
previousRevisionRef
currentRevisionRef
optional restoredFromRevisionRef
record integrity
retention membership
```

### Existing semantic authorities

Own current semantic safety:

```text
lifetime / target identity
current source support
Exposure
settlement
PUBLIC_KNOWLEDGE validation
citation/provenance policy
```

### D2-3

Owns only:

```text
inspection gating
bounded read/list composition
bounded compare derivation
restore-source preparation
```

D2-3 is not a world-truth owner, settlement owner, citation owner, or revision mutation owner.

## 4. Exact operation vocabulary

Frozen design vocabulary:

```text
LIST_REVISIONS
READ_REVISION
COMPARE_REVISIONS
RESTORE_AS_NEW_REVISION
```

The exact runtime API names are not frozen.

## 5. `RevisionInspectionRequestV1`

Conceptual ephemeral request:

```text
RevisionInspectionRequestV1
  schemaVersion = 1
  pageIdentity
  revisionRef
  purpose
```

`purpose` is one of:

```text
READ
COMPARE_LEFT
COMPARE_RIGHT
RESTORE_SOURCE
```

The request is not authority.

It merely identifies the exact intended committed revision.

## 6. No fuzzy revision resolution

Forbidden resolution inputs:

```text
visible title
revision timestamp
revision list row index
transcript location
body snippet
text similarity
model guess
```

The Revision Owner must resolve exact:

```text
pageIdentity + revisionRef
```

## 7. `RevisionInspectionAuthorityContextV1`

D2-3 requires a trusted current inspection context assembled from existing owners.

Conceptual bounded shape:

```text
RevisionInspectionAuthorityContextV1
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
  current support/use authority refs
  current Exposure policy context
  current settlement compatibility context
  current citation/provenance compatibility context
  bounded currentness marker / equivalent owner proof
```

This context is not persisted into the old revision.

It is current-operation authority only.

## 8. Inspection context is not a new truth database

The context may bind or summarize existing current authorities.

It may not:

```text
invent support
infer settlement from old revision count
upgrade old citation prestige
infer same entity from text
reclassify hidden content
```

Canonical rule:

```text
INSPECTION CONTEXT
= CURRENT AUTHORITY JOIN
!= HISTORICAL TRUTH OWNER
```

## 9. `RevisionInspectionReceiptV1`

Conceptual ephemeral receipt:

```text
RevisionInspectionReceiptV1
  pageIdentity
  revisionRef
  disposition
  bounded reason codes
  currentness marker
```

It contains no quarantined/private payload.

It is not durable revision authority.

## 10. Inspection dispositions

Frozen semantic distinctions:

```text
BODY_INSPECTION_ELIGIBLE
BODY_WITHHELD_LIFETIME
BODY_WITHHELD_TARGET_IDENTITY
BODY_WITHHELD_CURRENT_SUPPORT
BODY_WITHHELD_EXPOSURE
BODY_WITHHELD_SETTLEMENT
BODY_WITHHELD_CITATION_SURFACE
BODY_WITHHELD_REWRITE_REQUIRED
REVISION_NOT_COMMITTED
REVISION_RECORD_INVALID
UNSUPPORTED_REVISION_SCOPE
```

Exact runtime enum spelling remains implementation work.

## 11. Read semantics are exact committed semantics

`READ_REVISION` is an inspection of one committed revision.

D2-3 does not rewrite the stored revision into a new current-looking document before showing it.

Canonical rule:

```text
READ R4
→ inspect committed R4 semantic snapshot

READ R4
!=
construct new synthetic R4-current hybrid
```

If the stored visible semantic state cannot safely render as stored under current authority:

```text
BODY_WITHHELD_REWRITE_REQUIRED
```

The body is not silently rewritten.

## 12. Current policy still governs exact read

Exact committed read does not mean unconditional historical read.

The inspection gate asks:

```text
Is this stored visible semantic state safe to render AS-IS under current authority?
```

Only if yes:

```text
BODY_INSPECTION_ELIGIBLE
```

The exact settlement/citation compatibility matrix is refined in D2-4.

## 13. Why current re-check is required

A revision may have been valid when committed but later become unsafe for ordinary current inspection because:

```text
source authority changed
Exposure changed
settlement changed
citation relationship changed
target identity became unavailable
lifetime ended
```

Durable storage cannot override these current gates.

## 14. Whole-revision body atomicity

D2-3 freezes:

```text
WHOLE_COMMITTED_REVISION_BODY_OR_NONE
```

If one retained assertion or visible semantic relationship would need quarantine, omission, or semantic rewrite to render safely now:

```text
whole semantic body withheld
```

Metadata listability may remain separately available.

## 15. No partial old-revision reconstruction

Forbidden:

```text
R4 had assertions A B C
B no longer eligible
→ show A C as "R4"
```

Reason:

```text
A+C
!= committed R4
```

A future historical product may define redacted historical artifacts only through a new contract.

## 16. Metadata list gate

`LIST_REVISIONS` is weaker than body inspection but still requires basic current page identity safety.

At minimum:

```text
exact pageIdentity
active / supported durable lifetime
exact current targetIdentityRef binding or equivalent page identity integrity
revision owner available
bounded retention/list window
```

If page identity itself is invalid/ambiguous/corrupt, revision metadata is not listed.

## 17. Revision list entries

Conceptual owner-side entry:

```text
RevisionListEntryV1
  revisionRef
  isCurrentHead
  previousRevisionRef?
  restoredFromRevisionRef?
```

Ordinary presentation may expose less than this.

`operationKind` is not required in ordinary list presentation because it can communicate historical semantics.

## 18. Presentation labels are non-authoritative

UI may render labels such as:

```text
Current
Earlier revision
Older revision
```

or bounded local numbering when safely derived.

But:

```text
visible label
!= revisionRef
```

A visible row number must never be accepted as a mutation or restore address without exact owner re-resolution.

## 19. Chain traversal

First-scope list order follows authoritative revision-chain relationships, not timestamps.

Canonical direction:

```text
current head
→ previousRevisionRef
→ previousRevisionRef
→ ... bounded by retention/list window
```

No ordering by:

```text
largest revisionRef string
latest timestamp guess
filesystem order
creation response order
```

## 20. Broken-chain behavior

If the retained active chain contains:

```text
cycle
wrong-page predecessor
missing predecessor inside a range the owner claims retained
multiple incompatible predecessors/successors under the linear-chain contract
```

then ordinary list/read does not guess a repair.

Conceptual outcome:

```text
REVISION_RECORD_INVALID / CHAIN_INVALID
```

D2-5 may refine retention-boundary markers.

## 21. Retention boundary is not corruption

A later D2-5 retention policy may intentionally prune older revisions.

Therefore:

```text
predecessor absent because owner marks retention boundary
!= corruption
```

But an unexplained missing record inside the retained chain remains invalid.

## 22. No timestamps required

D2-3 does not require a timestamp field.

If a trusted time owner later supplies displayable commit-time metadata, it remains revision metadata, not ordering authority unless a future contract explicitly says otherwise.

## 23. Compare request

Conceptual ephemeral request:

```text
RevisionCompareRequestV1
  pageIdentity
  leftRevisionRef
  rightRevisionRef
```

Both refs are exact.

Aliases such as `CURRENT` must be resolved to an exact revisionRef before compare begins.

## 24. Current alias pinning

If UI asks:

```text
compare R4 with CURRENT
```

D2-3 requires:

```text
CURRENT → exact R9 at compare start
```

The compare then becomes:

```text
R4 vs R9
```

If head advances to R10 during display, the existing compare result does not silently substitute R10.

A refresh creates a new compare operation.

## 25. Shared current authority for both compare sides

Both revisions must be inspected under one coherent current authority snapshot/epoch or equivalent bounded currentness proof.

Forbidden:

```text
left validated under authority A
right validated later under incompatible authority B
→ combine into one diff as if comparable
```

If the current inspection authority changes materially during comparison construction, the compare must restart or fail closed.

## 26. Compare eligibility

Required:

```text
same pageIdentity
left committed
right committed
both inside active retention/lifetime
left BODY_INSPECTION_ELIGIBLE
right BODY_INSPECTION_ELIGIBLE
bounded resource envelope
```

Otherwise semantic compare is unavailable.

## 27. Compare output is ephemeral

Conceptual result:

```text
RevisionCompareViewV1
  pageIdentity
  leftRevisionRef
  rightRevisionRef
  exactUnchangedRecords[]
  leftOnlyRecords[]
  rightOnlyRecords[]
  bounded summary metadata
```

It is:

```text
EPHEMERAL
NON-PERSISTENT
NON-CANONICAL
NON-MUTATING
NON-MODEL-CONTEXT
```

## 28. No persistent assertion identity

D2-2 froze assertion ordinal as revision-local structural address.

Therefore D2-3 does not infer:

```text
R4 ordinal 7
= same durable assertion identity as
R9 ordinal 7
```

The same number across revisions is not identity proof.

## 29. First compare algorithm

D2-3 selects a conservative exact-record comparison.

A canonical ephemeral compare record consists only of the committed visible semantic fields frozen by the revision schema.

Conceptually this includes the persisted public-reference assertion semantic record and, once D2-4 freezes exact integration, its persisted visible citation relationship surface.

Comparison classifies records by **exact canonical equality**:

```text
exactly equal record in both sides
→ UNCHANGED_EXACT

record only in left
→ LEFT_ONLY

record only in right
→ RIGHT_ONLY
```

## 30. Changed text is remove + add in first scope

If R4 contains:

```text
A = "The team won 3-1."
```

and R5 contains:

```text
B = "The team won 4-1."
```

first D2-3 compare may safely represent:

```text
A = LEFT_ONLY
B = RIGHT_ONLY
```

It need not claim:

```text
A mutated into B
```

because that would require persistent assertion identity or operation-lineage proof not frozen here.

## 31. Duplicate exact records

If identical semantic records appear multiple times, comparison treats them with bounded multiplicity.

It must not collapse duplicates by fuzzy semantics or source label similarity.

The implementation may use deterministic ephemeral canonicalization, but no compare hash becomes semantic identity.

## 32. No word/character diff authority

UI may later decorate exact left/right records with text-level highlighting for readability only if it cannot be mistaken for semantic lineage.

D2-3 does not require or authorize:

```text
word-level mutation provenance
clause identity
semantic edit distance
embedding-based alignment
```

## 33. Compare does not upgrade truth

If one side says a claim and the other does not, that difference proves only a revision difference.

It does not prove:

```text
new side is more true
old side was false
more revisions mean more settlement
```

## 34. Compare bounds

Future runtime must freeze concrete caps in D2-5 for at least:

```text
revisions loaded per compare = exactly 2
max bytes per loaded revision
max assertions per side
max visible citation relations per side
max diff records emitted
max rendered diff bytes
```

Exceeded bounds fail closed or truncate only through an explicitly non-semantic presentation contract.

## 35. Compare-to-operation firewall

A compare result is not an operation payload.

Forbidden:

```text
click highlighted diff fragment
→ persist that fragment directly
```

An edit/restore must start a new current D2-2 operation and re-resolve exact current authority.

## 36. Restore request

Conceptual request:

```text
RevisionRestoreRequestV1
  pageIdentity
  sourceRevisionRef
  expectedRevision
```

`sourceRevisionRef` is the exact old revision selected as the restore seed.

`expectedRevision` is the current head the restore operation is based on.

## 37. Restore prerequisites

Before source materialization:

```text
1 exact pageIdentity
2 active lifetime
3 exact target identity continuity
4 sourceRevisionRef committed / valid / retained
5 source BODY_INSPECTION_ELIGIBLE
6 current head == expectedRevision
```

Failure stops before candidate commit work.

## 38. Why source must be inspectable

D2-3 forbids a hidden restore path where semantic content cannot be shown to the user under current policy but can still be promoted into a new current revision.

Canonical rule:

```text
NOT CURRENTLY INSPECTABLE
→ NOT A RESTORE SOURCE IN PK-D2
```

PK-D3 may later design historical-source behavior separately.

## 39. Restore seed

The old committed revision is not copied wholesale as authority.

D2-3 derives an ephemeral restore seed from source-owned semantic fields.

Conceptually:

```text
PublicKnowledgeRevisionRestoreSeedV1
  pageIdentity
  sourceRevisionRef
  source revision-local structural assertions
    ordinal
    sectionKind
    mode
    content
  bounded visible citation relationship intents as allowed by D2-4
```

The seed is not committed state.

## 40. Fields discarded from restore authority

The restore seed must not treat old validator/owner fields as current authority.

Old fields that require current re-derivation or re-join include:

```text
referenceState
settlement authority result
claimSupportRef
current sourceAuthorityRef
current support/use receipt
trusted target display label
trusted citation authorization
current attribution authority
current head metadata
committed membership
```

The exact D2-4 citation/settlement bridge remains deferred to D2-4.

## 41. Ordinal copy does not create durable assertion identity

The source revision-local ordinals may be copied into the new whole-page candidate to preserve the selected source structure.

But:

```text
R4 ordinal 7 copied into R10 ordinal 7
!= persistent assertion identity across revisions
```

It is structural copy-forward only.

## 42. Current target display data wins

Restore never copies old freeform title/display identity as authority.

PUBLIC_KNOWLEDGE target display data still comes from the current trusted target context.

If target identity continuity is not exact:

```text
restore = unavailable
```

## 43. Restore candidate construction

Safe direction:

```text
exact eligible source revision
→ strip old authority-owned validation fields
→ materialize complete source semantic seed
→ join current target/source/Exposure/settlement/citation authorities
→ build complete new current candidate
```

No patch replay against current head.

## 44. Restore is whole-page replacement from one exact source

Frozen restore footprint:

```text
WHOLE_PAGE_FROM_EXACT_COMMITTED_REVISION
```

This is intentionally different from D2-2 assertion-local edit footprints.

It authorizes one complete replacement candidate derived from one exact source revision.

## 45. No hybrid auto-merge

Forbidden restore behavior:

```text
current R9 has A B C
old R4 has A X
→ automatically produce A X C
```

or:

```text
combine "best" assertions from R4 and R9
```

Restore is not merge.

If product wants selective cherry-pick, that is a new operation contract.

## 46. Current validation order for restore

After seed materialization:

```text
1 current PK structural validation
2 current target identity exact join
3 current source/support-at-use
4 current Exposure
5 current settlement compatibility
6 current citation/provenance validation
7 whole-page restore footprint validation
8 semantic no-op comparison with current head
9 expectedRevision re-check
10 D2-1 atomic commit
```

D2-4 refines steps 5-6 integration.

## 47. No old validation receipt reuse

Forbidden:

```text
R4 was valid when committed
→ therefore restore candidate valid now
```

All current authority must be freshly established or bounded-currentness rechecked.

## 48. Restore may re-derive current owner fields

A new restore-created revision is a current semantic state, not a byte clone.

Therefore validator-owned fields may be re-derived from current trusted authority.

Examples may include:

```text
referenceState
trusted attribution metadata
bounded current support refs
```

This does not edit the old revision.

It creates a new validated revision.

## 49. No silent content loss on restore

Producer-owned semantic source content is atomic for first restore scope.

If a source assertion would need to be dropped, quarantined, or rewritten to pass current policy:

```text
RESTORE_CURRENT_VALIDATION_FAILED
→ no commit
```

D2-3 does not silently restore a subset.

## 50. Citation restore safety

Visible citation/provenance relationships are part of the committed public-reference semantic surface.

If current citation authority cannot validate the required restore citation surface under D2-4 rules:

```text
restore fails / holds
```

D2-3 does not silently remove old citations merely to make the restore succeed.

An explicit citation mutation may be performed separately under D2-2.

## 51. Stored old citation identity is not automatically current identity

PK-4 originally froze current-projection citation identities.

PK-D2 durable citation semantics require the dedicated D2-4 integration contract.

Therefore D2-3 freezes only this invariant:

```text
OLD STORED CITATION RELATIONSHIP
!= CURRENT CITATION AUTHORITY
```

D2-4 must define the exact current rebind/revalidation seam before runtime.

## 52. Stored settlement state is not automatically current authority

Likewise:

```text
R4.referenceState
!= current settlement authority
```

For read, the stored state must be currently safe to render as-is.

For restore, the new candidate receives current validator-derived state.

D2-4 freezes the exact compatibility/rebind matrix.

## 53. Restore no-op

After full current validation, compare the candidate with the current committed head using D2-2 canonical semantic no-op rules.

If identical:

```text
RESTORE_NO_OP
head unchanged
no new revisionRef
```

The fact that the user selected an old source revision is not enough to manufacture a new semantic revision.

## 54. `restoredFromRevisionRef`

On successful semantic restore commit, the new revision may record:

```text
restoredFromRevisionRef = exact sourceRevisionRef
```

It is same-page revision provenance only.

It does not:

```text
make old revision current
prove old truth
open C5 cross-family lineage
open C7 historical survival
```

## 55. Restore head safety

D2-2 double currentness check is mandatory.

```text
preflight:
head == expectedRevision

... inspection / candidate / validation ...

commit edge:
head == expectedRevision
```

If not:

```text
RESTORE_REVISION_MISMATCH
```

No auto rebase.

## 56. Current authority can also stale during restore

A source inspection receipt is not a durable commit receipt.

If current support/Exposure/settlement/citation authority changes between inspection and commit, restore must re-check or rebuild the necessary bounded-currentness proof according to existing owners.

Canonical rule:

```text
INSPECTION PASS
!= FOREVER COMMIT PASS
```

## 57. Ambiguous restore commit outcome

D2-2 `COMMIT_OUTCOME_UNKNOWN` behavior applies unchanged.

If transport loses the commit response:

```text
blind restore retry = forbidden
```

The client/owner must first reconcile authoritative revision membership/head state.

## 58. Read failure does not mutate state

`READ_REVISION` failure must not:

```text
advance head
create revision
repair chain
remove revision
change settlement
change current presentation semantics
```

It returns a bounded unavailable state only.

## 59. Compare failure does not mutate state

Likewise compare failure must not create repair or reconciliation revisions.

A compare is observational only.

## 60. Revision viewer presentation

The UI may display:

```text
revision metadata list
exact eligible revision body
current-head indicator
compare selection
restore affordance where policy permits
```

But presentation is not semantic authority.

## 61. Body unavailable presentation

When metadata is listable but body is withheld, the UI may render a non-semantic state such as:

```text
This revision exists, but its content is not currently available for inspection.
```

It must not expose:

```text
hidden assertion count
DENY/HOLD text
private reason narrative
old cached snippet
old citation titles
```

## 62. No stale overlay

Forbidden:

```text
old body remains mounted
+ "unavailable" overlay
```

When body eligibility fails, semantic body subtree must be absent from the active revision-inspection surface.

## 63. Historical transcript is separate

An old assistant message or host transcript artifact may still contain what was rendered at that historical turn according to existing host-history rules.

D2-3 does not rewrite transcript history.

But:

```text
HISTORICAL TRANSCRIPT ARTIFACT
!= ACTIVE REVISION BODY INSPECTION AUTHORITY
```

The revision viewer may not use transcript content as fallback.

## 64. Cache semantics

A cache may optimize already-authorized reads but cannot create authorization.

```text
cache hit + current gate fail
→ body withheld
```

```text
cache miss
!= revision absent
```

Authoritative Revision Owner state remains required.

## 65. Reload behavior

Reload may clear:

```text
selected revision
compare pair
expanded diff state
scroll state
ephemeral inspection receipts
```

It must not:

```text
auto scan all history
auto open last old body without current gate
auto restore
```

## 66. Feature-off behavior

When PUBLIC_KNOWLEDGE / revision feature is disabled:

```text
revision read/list/compare/restore activity = 0
active revision viewer UI = 0
```

Durable identity/revision retention follows the already frozen lifetime policy, not the transient UI toggle.

## 67. Search boundary

PK-X2 remains page-level search.

D2-3 does not index or search historical revision bodies.

Flow:

```text
search
→ pageIdentity
→ current page
→ explicit page-local revision navigation
```

No query may directly return old revision body snippets in D2-3.

## 68. Current-head fallback remains forbidden

If current head body fails current policy:

```text
current page unavailable
```

D2-3 must not search backwards for:

```text
most recent eligible old revision
```

That would silently promote historical state into current state.

## 69. C7 firewall

D2-3 remains intentionally below PK-D3.

Forbidden requirement:

```text
show R4 exactly because it was historically committed,
even though current authority rejects its semantic body
```

That requirement must activate:

```text
PK-D3 HISTORICAL_PAGE
C7 historical / partial survival
```

## 70. C5 remains closed

`restoredFromRevisionRef` is same-page generation provenance.

It does not mean:

```text
BOARD → PK revision
NEWS → PK revision
SNS → PK revision
```

No cross-family derived lineage is added.

## 71. C6 remains closed

Revision list/read/compare/restore data does not automatically enter future model context.

```text
old revision body
compare output
restore provenance
```

remain outside model context unless a future C6 design explicitly authorizes re-entry.

## 72. C8 remains closed

D2-3 does not attach delayed media/effects to a revision after the operation completes.

Any late async attachment to exact revision identity requires separate C8 design.

## 73. Candidate C profile

Final D2-3 profile:

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

No capability escalation occurs in D2-3.

## 74. Failure classes

Frozen conceptual distinctions:

```text
REVISION_LIST_UNAVAILABLE
REVISION_CHAIN_INVALID
REVISION_NOT_FOUND
REVISION_NOT_COMMITTED
REVISION_RECORD_INVALID
REVISION_BODY_CURRENTLY_UNAVAILABLE
REVISION_BODY_REWRITE_REQUIRED
REVISION_COMPARE_INPUT_UNAVAILABLE
REVISION_COMPARE_AUTHORITY_CHANGED
REVISION_COMPARE_LIMIT_EXCEEDED
RESTORE_SOURCE_UNAVAILABLE
RESTORE_CURRENT_VALIDATION_FAILED
RESTORE_CITATION_REVALIDATION_FAILED
RESTORE_REVISION_MISMATCH
RESTORE_NO_OP
RESTORE_COMMIT_OUTCOME_UNKNOWN
```

Exact runtime enum strings remain implementation work.

## 75. Observability requirements

Future implementation should be able to distinguish without logging semantic secrets:

```text
list request / count bounded
read eligible vs withheld reason class
compare eligible vs unavailable
restore attempted / no-op / mismatch / validation failure / committed
```

No raw denied assertion text or hidden validator input belongs in diagnostics.

## 76. Runtime bounds required before implementation readiness

D2-5 must freeze concrete hard caps for at least:

```text
max retained revisions per page
max listed revisions per request
max revision bytes read
max assertions per revision inspection
max citation relationships per revision
max compare diff records
max compare output bytes
max restore candidate bytes
```

D2-3 design convergence does not imply runtime readiness without these caps.

## 77. Ordinary-turn dormancy

When no explicit page-local revision operation is active:

```text
revision history scan = 0
old revision body read = 0
inspection context build = 0
compare = 0
restore = 0
model call = 0
network call = 0
```

## 78. Security / privacy invariants

D2-3 must never surface:

```text
DENY/HOLD payload
quarantined draft text
hidden Knowledge
private support material
old cached body after current gate failure
validator internal basis refs as user-facing history
```

Revision storage is not a bypass around Exposure.

## 79. Read invariant summary

```text
EXACT COMMITTED RECORD
+
CURRENT INSPECTION AUTHORITY
+
STORED SEMANTIC STATE SAFE TO RENDER AS-IS
→ exact old revision body may render

otherwise
→ metadata-only / unavailable
```

## 80. Compare invariant summary

```text
TWO EXACT COMMITTED REVISIONS
+
BOTH CURRENTLY INSPECTABLE
+
SAME CURRENT AUTHORITY WINDOW
→ bounded exact-record structural diff
```

No persistent assertion identity is inferred.

## 81. Restore invariant summary

```text
EXACT INSPECTABLE OLD REVISION
+
CURRENT HEAD EXPECTATION
→ source-owned semantic seed
→ current authority revalidation
→ D2-2 footprint / no-op / stale safety
→ NEW revision only
```

Never rewind head.

## 82. Why D2-3 does not open historical truth

The store remembers revision bytes.

The product still refuses to render an old semantic body merely because it existed in the past.

Canonical equation:

```text
REVISION RETENTION
+
CURRENT INSPECTION GATE
=
PK-D2

REVISION RETENTION
+
UNCONDITIONAL HISTORICAL BODY SURVIVAL
=
PK-D3 / C7
```

## 83. Design verdict

D2-3 selects:

```text
EXACT_COMMITTED_REVISION_READ
CURRENT_INSPECTION_ELIGIBILITY_GATE
WHOLE_REVISION_BODY_ATOMICITY
BOUNDED_EXACT_RECORD_COMPARE
WHOLE_PAGE_COPY_FORWARD_RESTORE
NO_BACKWARD_HEAD_MOVE
NO_C7_HISTORICAL_SURVIVAL
```

This is sufficient to proceed to the next design checkpoint without runtime implementation.

## 84. Next checkpoint

```text
D2-4 · Settlement / Citation / Search Integration
```

D2-4 must freeze the exact durable revision compatibility/rebind rules for:

```text
stored referenceState vs current settlement
stored visible citations vs current citation authority
claim-support / citation reference durability
PK-X2 current-page search interaction with revisioned pages
```

After D2-4, D2-5 will freeze lifetime/bounds/convergence.

Runtime implementation remains **NOT AUTHORIZED**.
