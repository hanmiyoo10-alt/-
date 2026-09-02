# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-5 Lifetime / Bounds / Convergence Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D3-5 DESIGN FROZEN · PK-D3 HISTORICAL_PAGE V1 DESIGN CONVERGED · ACTIVE-LIFETIME BOUNDED PAGE-LOCAL HISTORY · D2-5 SEMANTIC CAPS INHERITED · FINITE D3 ADMISSION/PRESENTATION BUDGETS · NO ROLLING EVICTION · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-5 · LIFETIME · BOUNDS · RETENTION · PRESENTATION BUDGET · CONVERGENCE · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-D3 now has a complete design sequence:

```text
D3-0  Historical Page Master
D3-1  Historical Admission / Provenance
D3-2  Historical Disclosure / Withdrawal
D3-3  Historical Presentation / Compare
D3-4  Restore / Search / Navigation
D3-5  Lifetime / Bounds / Convergence
```

D3-5 closes the remaining finite-resource and lifetime seams and performs the final Candidate C audit.

It does not add another historical product feature.

This document authorizes no runtime storage implementation, migration, transaction engine, route, renderer, DOM/CSS, cleanup worker, model/prompt change, network call, release, or `release-simcore` mutation.

## 1. Final PK-D3 profile

The selected first historical-page profile is:

```text
ACTIVE_LIFETIME_BOUNDED_PAGE_LOCAL_HISTORICAL_PAGE_V1
```

It means:

```text
one durable PUBLIC_KNOWLEDGE pageIdentity
+ one trusted active conversation lifetime
+ bounded immutable committed PK-D2 revisions
+ exact D3 historical admission authenticity
+ fresh current historical disclosure policy
+ explicit page-local navigation
+ explicit exact historical compare
+ explicit current restore handoff
```

It does not mean unlimited archive, historical search corpus, or model memory.

## 2. Final Candidate C profile

PK-D3 converges on:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES, inherited PK-D2
C4 append / merge pressure    = YES, inherited PK-D2
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = NO
C7 historical survival        = YES
C8 delayed effect targeting   = NO
```

No generic Candidate C ledger/store is activated.

## 3. Canonical semantic closure

```text
CURRENT PAGE
!= HISTORICAL PAGE

HISTORICAL AUTHENTICITY
!= CURRENT DISCLOSURE

CURRENT DISCLOSURE
!= CURRENT TRUTH SUPPORT

HISTORICAL SURVIVAL
!= PERPETUAL RETENTION

RESTORE SOURCE
!= CURRENT CANDIDATE AUTHORITY

HISTORY ADDRESS
!= MUTATION AUTHORITY

C7
!= C6
!= C8
```

## 4. Authority chain

D3-5 preserves the full ordering:

```text
trusted lifetime/page identity
→ exact retained revision membership
→ D3-1 historical admission authenticity
→ D3-2 fresh current disclosure disposition
→ operation-specific D3-3/D3-4 presentation/navigation/restore rules
→ bounded read model or current D2 mutation handoff
```

No downstream layer may manufacture missing upstream authority.

## 5. D2-5 semantic-history bounds remain authoritative

D3-5 inherits these exact limits unchanged:

```text
MAX_COMMITTED_REVISIONS_PER_PAGE             = 64
MAX_REVISION_RECORD_LOGICAL_BYTES            = 65,536
MAX_RETAINED_REVISION_LOGICAL_BYTES_PER_PAGE = 4,194,304

MAX_SECTIONS_PER_REVISION                    = 16
MAX_ASSERTIONS_PER_REVISION                  = 128
MAX_CITATION_RECORDS_PER_REVISION            = 64
MAX_CITATION_ATTACHMENTS_PER_REVISION        = 128

MAX_REVISION_REF_UTF8_BYTES                  = 128
MAX_REVISION_SUPPORT_ANCHOR_REF_UTF8_BYTES   = 256

MAX_REVISION_LIST_ENTRIES                    = 64

MAX_MUTATION_REQUEST_LOGICAL_BYTES           = 65,536
MAX_RESTORE_SOURCE_LOGICAL_BYTES             = 65,536

MAX_COMPARE_DIFF_ENTRIES                     = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES             = 131,072
```

D3 historical eligibility creates no larger revision/history retention profile.

## 6. No rolling eviction remains frozen

While lifetime is ACTIVE:

```text
valid committed D2 revision
+ valid required D3 admission
```

is protected from ordinary rolling retention eviction.

If a new operation cannot fit all required semantic/admission caps:

```text
HOLD new operation
→ head unchanged
→ existing revisions unchanged
→ existing admissions unchanged
```

Canonical rule:

```text
CAP EXHAUSTION
= BACKPRESSURE
!= HISTORY REWRITE
```

## 7. D3-specific hard caps

D3-5 freezes these additional V1 logical budgets:

```text
MAX_HISTORICAL_ADMISSION_RECORD_LOGICAL_BYTES       = 4,096
MAX_HISTORICAL_ADMISSION_LOGICAL_BYTES_PER_PAGE     = 262,144

MAX_HISTORICAL_PRESENTATION_METADATA_LOGICAL_BYTES  = 8,192
MAX_CURRENT_STATUS_COMPANION_LOGICAL_BYTES           = 4,096
MAX_HISTORICAL_LIST_PRESENTATION_LOGICAL_BYTES      = 65,536
MAX_COMPARE_PRESENTATION_METADATA_LOGICAL_BYTES     = 16,384

MAX_HISTORICAL_NAVIGATION_INTENT_LOGICAL_BYTES      = 4,096
MAX_HISTORICAL_RESTORE_HANDOFF_ENVELOPE_LOGICAL_BYTES = 4,096
```

The restore semantic seed remains separately bounded by:

```text
MAX_RESTORE_SOURCE_LOGICAL_BYTES = 65,536
```

The compare semantic diff remains separately bounded by:

```text
MAX_COMPARE_DIFF_ENTRIES         = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES = 131,072
```

## 8. Why D3 admission gets a separate budget

Historical admission is authoritative D3 metadata, not the historical body itself.

D3-1 conceptual boundary:

```text
HistoricalRevisionAdmissionReceiptV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  admittedRevisionBindingRef
  admittedPolicyProfile
```

D3-0 explicitly prohibited an unbounded admission side log.

D3-5 therefore freezes a separate logical accounting domain rather than pretending D3 metadata is free.

## 9. `D3HistoricalAdmissionLogicalEncodingV1`

Future runtime cap enforcement must define an executable deterministic logical encoding satisfying:

```text
same logical admission → same byte sequence
object field order deterministic
array order deterministic where arrays exist
exact validated Unicode values
no insignificant whitespace
backend-only framing excluded
```

All authoritative D3-owned logical fields required to validate the admission relation must be accounted exactly once.

Physical database/index/replication/encryption bytes may differ, but cannot be used as semantic-cap authority.

## 10. Per-admission cap

Each authoritative logical historical admission must satisfy:

```text
logicalHistoricalAdmissionBytes <= 4,096
```

Overflow:

```text
HOLD_HISTORICAL_ADMISSION_RECORD_LIMIT_EXCEEDED
```

Forbidden overflow handling:

```text
truncate pageIdentity
truncate revisionRef
truncate lifetimeScopeRef
truncate admittedRevisionBindingRef
replace exact ref with fuzzy/display label
drop admittedPolicyProfile
```

## 11. Aggregate admission cap

For one active page/lifetime:

```text
sum(logicalHistoricalAdmissionBytes) <= 262,144
```

Because PK-D2 V1 permits at most 64 committed revisions and D3 permits at most one logical admission per exact revision tuple:

```text
64 × 4,096 = 262,144
```

The aggregate cap therefore covers the full maximal V1 admitted history without requiring rolling admission eviction.

## 12. Admission cardinality bound

Within one exact active page/lifetime:

```text
historical admission memberships <= committed revision memberships <= 64
```

One revision tuple may have at most one logical admission.

If authoritative admission state exceeds the bounded relation or contains duplicates/conflicts:

```text
INVALID_HISTORICAL_ADMISSION_COUNT_CORRUPTION
```

Ordinary PK-D3 history operations fail closed until explicit integrity repair authority exists.

Do not return an arbitrary first 64 and pretend completeness.

## 13. Native D3 commit budget admission

For a native D3 revision-producing operation, prospective checks must include both:

```text
D2 candidate semantic revision budgets
+
D3 required historical admission budgets
```

before semantic success is exposed.

If D3 admission cannot fit:

```text
HOLD
→ no semantic revision commit
→ no current-head advance
```

D3-1 silent downgrade remains forbidden.

## 14. D2 backfill budget admission

Explicit D2 committed-membership backfill creates no semantic revision.

Before admission write:

```text
exact existing committed revision
+ valid D2-only expectation
+ exact authenticity proof
+ projected D3 admission budget
```

must pass.

If D3 budget fails:

```text
HOLD backfill
→ old revision unchanged
→ current head unchanged
```

## 15. Admission metadata does not consume D2 semantic bytes

D2 revision semantic accounting and D3 admission accounting remain distinct logical budgets.

A physical implementation may co-locate both records, but must not:

```text
hide D3 admission bytes outside all budgets
or
double-count one logical field as semantic history twice
```

Every authoritative logical field belongs to one explicit budget domain or an explicitly documented shared accounting rule.

## 16. Historical body is not duplicated

D3 does not persist another body copy.

Historical body derives from one exact retained immutable D2 revision.

Therefore:

```text
historical body semantic bytes
<= existing D2 revision logical record cap
```

No historical renderer/cache copy becomes a second durable semantic artifact.

## 17. Historical presentation metadata budget

`HISTORICAL_PUBLIC_REFERENCE_VIEW_V1` may create an ephemeral metadata read model containing only currently authorized presentation information such as:

```text
view kind = historical
bounded trusted page/revision labels
historical status
allowed metadata fields
bounded action descriptors
unavailable-shell state where applicable
```

This metadata read model must satisfy:

```text
logicalHistoricalPresentationMetadataBytes <= 8,192
```

Overflow:

```text
HOLD_HISTORICAL_PRESENTATION_METADATA_LIMIT_EXCEEDED
```

No protected content may be truncated into a misleading partial historical surface.

## 18. Presentation metadata encoding

Future implementation must freeze an executable:

```text
D3HistoricalPresentationLogicalEncodingV1
```

for semantic read-model accounting.

It measures validated logical values, not:

```text
CSS bytes
framework component bytes
virtual DOM bookkeeping
browser layout objects
localization bundle size
host transcript framing
```

Those require independent implementation/performance controls.

## 19. Body and metadata are separately bounded

Historical view boundedness is the conjunction:

```text
exact retained revision passes D2 cap
AND
historical metadata <= 8,192
AND
optional companion <= 4,096
```

D3-5 does not create one large persistent combined historical-page blob.

## 20. Current-status companion cap

D3-3 page-level companion remains ephemeral and current-derived.

It must satisfy:

```text
logicalCurrentStatusCompanionBytes <= 4,096
```

It may express only bounded page-level currentness states already frozen by D3-3.

It must not smuggle:

```text
current page body
assertion-level lineage
hidden current validator reasons
historical body excerpt
protected source detail
```

## 21. Companion overflow behavior

If the companion would exceed its cap:

```text
HOLD_CURRENT_STATUS_COMPANION_LIMIT_EXCEEDED
→ omit/withhold companion
```

A separately valid historical body may remain available if D3-1/D3-2 allow it.

Forbidden:

```text
truncate companion prose
→ accidentally change currentness meaning
```

## 22. History-list presentation cap

D3-4 page-local history list remains bounded by:

```text
entries <= 64
logicalHistoricalListPresentationBytes <= 65,536
```

The byte cap applies after D3-2 metadata disclosure filtering and to the logical safe list read model.

If the complete authorized list would exceed the cap:

```text
HOLD_HISTORICAL_LIST_PRESENTATION_LIMIT_EXCEEDED
```

V1 does not display an arbitrary prefix as if it were complete.

## 23. Hidden revisions and list completeness

D3-2 metadata DENY may remove a revision from ordinary visible navigation.

The UI must not reveal protected existence through:

```text
visible gap counts
"3 hidden revisions" messages
raw total count
disabled hidden rows
route probes
```

The history-list byte cap does not authorize leakage of the pre-filter count.

## 24. Navigation intent cap

Ephemeral:

```text
HistoricalPageNavigationIntentV1
```

must satisfy:

```text
logicalHistoricalNavigationIntentBytes <= 4,096
```

This bounds page/revision operation addresses and operation kind without treating a URL/browser route as authority.

Overflow fails before owner resolution.

## 25. Route remains transport, not authority

A copied route may contain presentation/transport encodings of exact locators, but:

```text
route bytes
!= authenticated lifetime
!= page identity proof
!= revision membership proof
!= historical disclosure
```

D3-5 cap compliance cannot turn a route into a bearer authorization token.

## 26. Restore handoff envelope cap

D3-4 conceptual:

```text
HistoricalRevisionRestoreHandoffV1
  schemaVersion
  pageIdentity
  sourceRevisionRef
  expectedRevision
  lifetimeScopeRef
  sourceAdmissionBindingRef
  sourceSemanticSeed
```

D3-5 splits accounting:

```text
non-seed handoff envelope <= 4,096 logical bytes
sourceSemanticSeed         <= 65,536 logical bytes
```

The seed cap is inherited from D2-5 restore-source admission.

## 27. Restore handoff is not durable history

The restore handoff remains:

```text
EPHEMERAL
SINGLE OPERATION
NON-PERSISTENT
NON-CANONICAL
NON-COMMIT-AUTHORITY
```

It is destroyed/invalidated after operation completion, cancellation, incompatible reload/lifetime change, or failed freshness checks.

It does not receive a retention policy.

## 28. Compare final bounded accounting

D3-3 compare remains bounded in three independent dimensions:

```text
semantic diff entries       <= 768
semantic diff logical bytes <= 131,072
compare presentation metadata <= 16,384 logical bytes
```

At most one page-level current-status companion may additionally appear and remains bounded by:

```text
4,096 logical bytes
```

All limits must pass.

## 29. Compare presentation metadata domain

The 16,384-byte compare metadata budget may include only bounded safe fields such as:

```text
historical compare view kind
left/right revision presentation metadata
bounded page label when authorized
section/diff presentation descriptors
bounded navigation/action descriptors
```

The actual diff semantic payload remains under the D2-5 131,072-byte cap and is not double-counted as metadata.

## 30. Compare overflow remains all-or-nothing semantically

If any required compare bound fails:

```text
COMPARE_UNAVAILABLE / HOLD
```

Forbidden:

```text
show first N diff entries
truncate only right side
collapse hidden overflow into "more changes"
claim comparison complete
```

A future explicit partial-compare profile would require separate completeness semantics.

## 31. Logical byte caps are not truth heuristics

Resource pressure may never change semantic identity or authority rules.

Forbidden cap workarounds:

```text
fuzzy revision matching
hash presentation title and use as revision identity
semantic summarization of historical body to fit
remove withdrawn/correction citation roles to fit
merge similar revisions
squash old history
truncate protected admission binding
```

## 32. Lifetime authority

PK-D3 inherits trusted external lifetime states:

```text
ACTIVE
ENDED
UNKNOWN
```

No D3 component owns or guesses lifetime truth.

## 33. ACTIVE lifetime

When lifetime is ACTIVE and feature enabled, explicit historical operations may proceed only through their full authority chains.

No operation activates merely because durable history exists.

Ordinary/source-irrelevant turns perform zero required history work.

## 34. UNKNOWN lifetime

When lifetime is UNKNOWN:

```text
historical list = unavailable
historical exact body = unavailable
historical compare = unavailable
restore-source admission = unavailable
```

No timeout/cache miss may be interpreted as ACTIVE.

UNKNOWN does not itself authorize physical cleanup because END has not been proven.

## 35. ENDED lifetime

Trusted END immediately makes ordinary PK-D3 use invalid.

Canonical ordering:

```text
1 trusted lifetime state becomes ENDED
2 reject new list/read/compare/navigation/restore-source operations
3 clear ephemeral historical semantic presentation
4 clear companion/route action/restore preflight state
5 D3-owned admission state becomes owner-cleanup eligible
6 D2-owned revision/head state remains separately cleanup eligible under D2 owner
7 physical cleanup may occur
```

Logical invalidation does not wait for deletion.

## 36. Non-recyclable lifetime identity remains mandatory

PX1-4 invariant remains:

```text
ENDED lifetimeScopeRef generation
must never later identify a new logical conversation lifetime
```

Otherwise physical residue could resurrect old D2/D3 history under a future conversation.

## 37. No semantic TTL

D3-5 does not add:

```text
30-minute history expiration
100-turn expiration
last-viewed expiration
"not opened today" expiration
```

Only trusted lifetime END semantically ends ordinary D3 history use.

Backend TTL may be used solely as physical reclamation machinery after logical invalidation if compatible with owner rules.

## 38. Feature OFF

Feature OFF while lifetime remains ACTIVE is vertical dormancy:

```text
historical list/read/compare/navigation = 0
historical presentation mount = 0
current-status companion build = 0
restore seed materialization = 0
admission backfill = 0
background history scan/index = 0
background model/network work = 0
```

Durable D2 revisions and valid D3 admissions may remain.

Feature OFF does not end lifetime and does not delete history merely to hide the feature.

## 39. Feature re-enable

Re-enable does not auto-open previous history.

Required:

```text
new explicit history intent
→ fresh active lifetime/page resolution
→ fresh exact revision/admission/disclosure
```

No stale historical DOM or cached disclosure result is remounted as authority.

## 40. Reload

Reload clears ephemeral history state, including where present:

```text
selected history row
historical body presentation
compare pair/result
current-status companion
navigation action binding
restore preflight/handoff
```

Reload does not end the trusted lifetime and does not delete durable history.

## 41. No reload reconstruction scan

Forbidden:

```text
reload
→ scan all durable pages/revisions
→ reconstruct last historical view
```

Explicit later action must reacquire authority.

Cached body/compare data is not self-authorizing.

## 42. Cleanup ownership

D3 owner may reclaim only D3-owned historical-admission material/projections.

D2 owner remains responsible for:

```text
current-head record
committed revision records
revision membership/index data
D2 revision support-anchor mappings
D2 staging residue
```

Source/evidence authority stores are not deleted merely because historical revisions referenced them.

## 43. D3 owner-scoped cleanup operation

A future conceptual operation may be equivalent to:

```text
reclaimHistoricalAdmissionsForScope(lifetimeScopeRef)
```

or an exact page-scoped suboperation.

Requirements:

```text
exact owner scope
idempotent
bounded by exact lifetime/page records
no semantic reconstruction
no historical global search
preserve unrelated metadata
```

Exact runtime API remains implementation work.

## 44. Cleanup result is operational only

A future cleanup receipt may contain bounded operational fields such as:

```text
cleanupStatus
recordsAffectedCount
reasonCode
```

It must not retain:

```text
historical body
hidden title
citation text
settlement payload
withdrawn text
admission binding secrets
```

Cleanup receipt is not historical archive.

## 45. Active-lifetime committed admission protection

While ACTIVE, valid committed D3 admissions are not ordinary retention-eviction candidates.

Allowed active cleanup is limited to state proven non-authoritative, for example:

```text
abandoned admission candidate
re-materializable non-authoritative receipt projection/cache
```

Canonical separation:

```text
STAGING/PROJECTION GC
!= COMMITTED HISTORICAL ADMISSION EVICTION
```

## 46. Cleanup does not repair corruption

Forbidden repair-by-cleanup:

```text
conflicting admissions → keep newest
missing admission → regenerate from revision bytes
more than 64 admissions → delete oldest until valid
revision missing → retarget admission to predecessor
binding mismatch → rewrite binding
```

Integrity repair is a separate authority class.

## 47. Residue matrix: admission survives, revision deleted

After lifetime END, physical cleanup may be asymmetric.

If:

```text
D3 admission row survives
D2 revision/membership is gone
```

then:

```text
receipt alone != committed membership
→ no historical body
```

D3-1 already requires both.

## 48. Residue matrix: revision survives, admission deleted

If:

```text
D2 revision row survives
required D3 admission is gone
```

then:

```text
revision bytes alone != native D3 historical authenticity
→ no historical body
```

D2 current/revision semantics may already be invalid anyway because lifetime is ENDED.

## 49. Residue matrix: both survive after END

If both physical D2 and D3 rows remain after trusted END:

```text
lifetime ENDED
→ ordinary resolve/read/list/compare/restore still invalid
```

Physical cleanup failure cannot resurrect semantic usability.

## 50. Residue matrix: cleanup failure

```text
PHYSICAL_CLEANUP_FAILED
!= lifetime ACTIVE
!= history usable
!= permission to retry from ordinary turns
```

Operational owner retry may exist, but D3-5 selects no per-turn cleanup scan.

## 51. Conversation deletion

Trusted conversation deletion is treated as lifetime END plus cleanup eligibility.

D3 does not preserve a hidden historical archive copy for potential restore after conversation deletion.

Cross-conversation/export/archive semantics require a separate future profile.

## 52. No global cleanup scan

Ordinary turns require:

```text
scan expired lifetimes = 0
scan all pages = 0
scan all admissions = 0
reconcile all history = 0
refresh historical disclosure = 0
```

Cleanup is lifecycle/event-owner work, not source-intelligence background work.

## 53. C1 final audit

Question:

```text
Can durable page/revision identity and retained state survive across later turns in the same active lifetime?
```

Answer:

```text
YES
```

C1 remains open.

## 54. C2 final audit

Question:

```text
Are page/revision addresses stable without title/ordinal/host-index/fuzzy inference?
```

Answer:

```text
YES
```

Exact pageIdentity + revisionRef owner resolution preserves C2.

## 55. C3 final audit

Question:

```text
Can the same durable page receive a new semantic current revision?
```

Answer:

```text
YES, through PK-D2 admitted mutation operations
```

Historical views do not mutate old revisions.

Restore creates a new revision or no-op.

## 56. C4 final audit

Question:

```text
Does the revisioned-page architecture retain append/merge pressure already admitted by PK-D2?
```

Answer:

```text
YES, inherited PK-D2 profile only
```

D3 does not add:

```text
history cherry-pick
three-way merge
partial restore
cross-page merge
```

## 57. C5 final audit

Question:

```text
Does any D3 semantic authority derive from another derived-family object as a durable lineage parent?
```

Answer:

```text
NO
```

These do not open C5:

```text
previousRevisionRef
restoredFromRevisionRef
historical admission binding
exact compare pairing
current-status companion
```

They are same-page provenance/authenticity or ephemeral presentation relationships, not a generic derived-object lineage graph.

C5 remains CLOSED.

## 58. C6 final audit

Question:

```text
Does historical content automatically enter future model context/prompt memory?
```

Answer:

```text
NO
```

Forbidden ambient re-entry:

```text
viewed historical body
history list
compare diff
last opened revision
historical citations
current-status companion
```

An explicit restore operation may consume one bounded operation-local semantic seed inside its current mutation path.

That is not ambient future-turn history memory and does not authorize generic C6.

C6 remains CLOSED.

## 59. C7 final audit

Question:

```text
Can an exact authentic old revision remain historically displayable even after current truth/source authority has been replaced?
```

Answer:

```text
YES
```

Required boundary:

```text
same ACTIVE page/lifetime
+ exact retained committed revision
+ D3-1 authenticity PASS
+ fresh D3-2 disclosure ALLOW
→ historical body may be shown as history
```

Current truth/support need not endorse the old semantic state.

This is the intentional PK-D3 capability expansion.

## 60. C7 does not imply unconditional visibility

C7 survival remains constrained by independent current disclosure.

Therefore:

```text
old revision authentic
+ D3-2 body DENY/HOLD
→ historical body unavailable
```

Withdrawal/privacy/legal/current-disclosure policy may still block historical display.

C7 is not a bypass around D3-2.

## 61. C7 does not imply cross-lifetime archive

Trusted lifetime END terminates ordinary historical usability.

Therefore:

```text
C7 YES
!= cross-conversation archive YES
```

A future archive/export profile must separately define identity, retention, disclosure, and cleanup.

## 62. C8 final audit

Question:

```text
Can a late asynchronous semantic effect mutate/attach to a revision merely by carrying pageIdentity/revisionRef/receipt/route?
```

Answer:

```text
NO
```

A new semantic operation requires fresh current admission/authority.

C8 remains CLOSED.

## 63. Cleanup is not C8

Owner cleanup may physically occur after the lifetime-end event.

This does not activate C8 because:

```text
cleanup = storage lifecycle reclamation after authority already ended
```

not:

```text
delayed semantic result attaches to revision and changes its meaning
```

No delayed semantic callback is authorized.

## 64. Compare is not C5 or C7 mutation

Historical compare is ephemeral exact structural presentation.

It does not create:

```text
new revision
new durable diff object
assertion lineage
semantic parent-child relation
```

C7 permits the input historical bodies to survive current support replacement; compare itself does not become durable history.

## 65. Restore does not convert history into current truth

Historical restore pipeline remains:

```text
exact body-disclosable historical revision
→ bounded semantic seed
→ strip old truth/support authority
→ fresh current support/Exposure/settlement/citation validation
→ D2 commit safety
→ NEW revision or no commit
```

The historical source never becomes current merely because it is authentic.

## 66. Search remains current-only

PK-X2 remains:

```text
query
→ current discoverable pageIdentity
→ current page navigation
```

PK-D3 remains explicit page-local history after page selection.

D3-5 adds no:

```text
historical full-text search
revision embeddings
archive relevance ranking
historical snippets in PK-X2 hits
```

## 67. Historical list does not become search corpus

A bounded list of exact revision metadata is navigation data for one page, not an index.

Repeated list access does not create search descriptors, ranking signals, or persistent query corpus state.

## 68. Admission backfill remains explicit

D3-1 backfill does not become automatic cleanup/convergence behavior.

D3-5 does not authorize:

```text
scan all D2 revisions and backfill at startup
backfill on history read
backfill on search hit
backfill during cleanup
```

Migration remains explicit trusted bounded work.

## 69. Presentation cache rules

A renderer may use implementation caches only if cache entries are non-authoritative and never bypass:

```text
ACTIVE lifetime
D3-1 authenticity
fresh D3-2 disclosure
operation-specific presentation rules
```

A cached historical body may not remain mounted after authority changes.

## 70. Stale semantic subtree teardown

On:

```text
lifetime END/UNKNOWN
feature OFF
D3-2 transition to DENY/HOLD
route target mismatch
reload requiring fresh authority
```

protected historical body/diff subtrees must be removed from visible and accessibility semantic surfaces.

Overlay-only concealment remains forbidden.

## 71. Current-status companion cache rules

Companion is current-derived and independently freshness-bound.

If current companion authority is lost:

```text
remove companion
```

not:

```text
reuse stale companion because historical body is still valid
```

Historical and current axes stay separate.

## 72. Reason privacy under bounds failure

Ordinary UI may collapse internal limit failures into bounded generic unavailable states.

It must not reveal:

```text
hidden revision count
protected metadata byte size
hidden citation/assertion counts
admission binding lengths
privacy/legal reason category
```

Resource failures must not become side-channel oracles.

## 73. Failure taxonomy

D3-5 preserves/introduces distinct conceptual internal classes:

```text
HOLD_HISTORICAL_ADMISSION_RECORD_LIMIT_EXCEEDED
HOLD_HISTORICAL_ADMISSION_PAGE_LIMIT_EXCEEDED
INVALID_HISTORICAL_ADMISSION_COUNT_CORRUPTION

HOLD_HISTORICAL_PRESENTATION_METADATA_LIMIT_EXCEEDED
HOLD_CURRENT_STATUS_COMPANION_LIMIT_EXCEEDED
HOLD_HISTORICAL_LIST_PRESENTATION_LIMIT_EXCEEDED
HOLD_COMPARE_PRESENTATION_METADATA_LIMIT_EXCEEDED
HOLD_HISTORICAL_NAVIGATION_INTENT_LIMIT_EXCEEDED
HOLD_HISTORICAL_RESTORE_HANDOFF_ENVELOPE_LIMIT_EXCEEDED

HOLD_COMPARE_LIMIT_EXCEEDED
HOLD_REVISION_COUNT_LIMIT_REACHED
HOLD_PAGE_HISTORY_BYTES_LIMIT_EXCEEDED

LIFETIME_ENDED
LIFETIME_UNKNOWN
FEATURE_DISABLED
PHYSICAL_CLEANUP_FAILED
HISTORICAL_ADMISSION_CORRUPT
HISTORICAL_DISCLOSURE_WITHHELD
```

Recovery must not collapse these classes in authority-expanding ways.

## 74. Acceptance matrix: resource caps

### B1 max valid history

```text
64 committed revisions
64 valid admissions
all per-record caps valid
aggregate D2 <= 4 MiB
aggregate D3 admission <= 256 KiB
```

Expected:

```text
read/list/compare may proceed subject to other gates
new revision-producing operation cannot commit 65th revision
```

### B2 one admission > 4 KiB

Expected:

```text
native D3 commit/backfill HOLD
no truncation
```

### B3 aggregate admission budget overflow

Expected:

```text
HOLD before authoritative admission write
no rolling eviction
```

### B4 historical metadata > 8 KiB

Expected:

```text
historical semantic presentation unavailable/HOLD
no arbitrary metadata truncation presented as complete
```

### B5 companion > 4 KiB

Expected:

```text
companion omitted/withheld
historical body may remain if independently allowed
```

### B6 list > 64 KiB

Expected:

```text
list unavailable/HOLD
no arbitrary prefix presented as complete
```

### B7 compare semantic diff exceeds D2 cap

Expected:

```text
no semantic compare
```

### B8 compare metadata exceeds 16 KiB

Expected:

```text
compare presentation unavailable/HOLD
semantic diff not leaked through partial surface
```

### B9 restore seed <= 64 KiB but envelope > 4 KiB

Expected:

```text
restore handoff HOLD
no locator/binding truncation
```

## 75. Acceptance matrix: lifetime

### L1 ACTIVE + feature enabled

Expected:

```text
explicit D3 operations may evaluate
```

### L2 ACTIVE + feature OFF

Expected:

```text
durable history may remain
all D3 presentation/read/write side effects dormant
```

### L3 reload during ACTIVE

Expected:

```text
ephemeral state cleared
no automatic scan/remount
```

### L4 lifetime UNKNOWN

Expected:

```text
history unavailable
no guessed ACTIVE
no cleanup inference
```

### L5 trusted END

Expected:

```text
ordinary history invalid immediately
presentation torn down
cleanup eligible
```

### L6 physical cleanup fails

Expected:

```text
lifetime remains ENDED
residue inert
no ordinary retry scan
```

### L7 old scopeRef recycled by host

Expected:

```text
contract violation
must not be allowed to resurrect old page/revision/admission state
```

## 76. Acceptance matrix: C7 boundaries

### C7-A old content no longer current-truth supported

```text
R4 authentic
current source replacement invalidates R4 as current truth
D3-2 historical body ALLOW
```

Expected:

```text
R4 may render only with explicit historical chrome
```

### C7-B old content withdrawn from historical disclosure

```text
R4 authentic
D3-2 body DENY
```

Expected:

```text
no historical body
```

### C7-C current page unavailable

Expected:

```text
history does not auto-replace current page
explicit history operation may separately evaluate
```

### C7-D lifetime ended

Expected:

```text
no ordinary historical access despite old rows
```

## 77. Acceptance matrix: no C5/C6/C8 drift

### G1 compare exact pairing

Expected:

```text
ephemeral exact presentation only
no assertion lineage object
```

### G2 historical view then normal next turn

Expected:

```text
historical body does not automatically enter model prompt/context
```

### G3 explicit restore

Expected:

```text
bounded operation-local seed only
fresh current validation
```

### G4 delayed callback carrying revisionRef

Expected:

```text
no semantic attachment/mutation authority
```

### G5 cleanup task after END

Expected:

```text
storage reclamation only
not C8 semantic effect
```

## 78. Dormancy invariant

When no explicit D3 operation is active:

```text
history list reads            = 0 required
historical body reads         = 0 required
historical disclosure compose = 0 required
historical compare            = 0
historical search scan        = 0
historical index update       = 0
restore seed materialization  = 0
background model call         = 0
background network call       = 0
```

## 79. No cross-conversation archive

PK-D3 V1 promises history only inside the trusted active lifetime domain.

It does not promise:

```text
permanent wiki archive
exported history package
shareable historical permalink across conversations
organization-wide revision corpus
```

Those require a new lifetime/identity/disclosure profile.

## 80. No active rolling admission eviction

D3 admission metadata follows the same philosophical rule as D2 committed revisions:

```text
while ACTIVE, required committed historical authenticity state is stable
```

A future archive profile may select eviction/compaction, but must define what exact revision links and authenticity mean after eviction.

## 81. No squash/renumber

D3-5 does not authorize:

```text
R1..R64
→ delete R1..R32
→ renumber R33 as R1
```

Revision identity remains exact and non-reused under D2 owner rules.

## 82. No semantic summaries as retention substitutes

Forbidden:

```text
history full
→ replace old exact revision with AI summary
```

That would create a different derived object and threaten C5/C7 semantics.

PK-D3 V1 preserves exact retained revisions or holds new writes.

## 83. No assertion/citation stable identity added

D3-5 bounds do not create stable assertion or citation IDs.

Compare remains exact multiset presentation; current-status companion remains page-level; restore remains whole-page source footprint.

## 84. No historical media expansion

D3-5 does not add persistent historical media attachment semantics.

If historical PUBLIC_KNOWLEDGE media is later added, its identity/lifetime/disclosure/resource caps require an explicit expansion.

## 85. Observability budget direction

Future runtime may emit bounded operational metrics/events for:

```text
limit outcome class
operation kind
bounded counts
cleanup result
```

It must not log protected historical body/citations/admission secrets by default.

Exact telemetry schema/caps remain implementation authority.

## 86. Runtime proof obligations

No implementation-readiness claim is valid before executable evidence proves at least:

```text
D2 logical byte encoding and all inherited caps
D3 historical-admission logical byte encoding
4 KiB admission record cap
256 KiB page admission aggregate cap
8 KiB historical metadata cap
4 KiB current-status companion cap
64 KiB history-list presentation cap
16 KiB compare metadata cap
4 KiB navigation intent cap
4 KiB restore handoff envelope cap
native D3 atomic admission semantics
no silent D2 downgrade
backfill uniqueness/idempotency
fresh D3-2 disclosure on every historical use
stale semantic subtree teardown
feature-off/reload dormancy
owner-scoped lifetime-end cleanup
residue fail-closed behavior
no rolling eviction
no global historical search
no C5/C6/C8 drift
```

## 87. Runtime blockers remain open

Design convergence does not resolve:

```text
physical durable backend
transaction mechanism
canonical executable encodings
trusted binding/hash/authentication mechanism
lifetime lifecycle integration
host route/mount authority
renderer implementation
current disclosure provider/composer
restore handoff wiring
cleanup implementation
observability implementation
concurrency/integrity tests
```

## 88. Production invariance requirement

This D3-5 transaction is documentation/design authority only.

Required closure:

```text
main receives docs
release-simcore unchanged
no runtime diff
no release
```

## 89. Complete D3-0..D3-4 consistency audit

### D3-0 master

Consistent:

```text
history is explicit, not stale fallback
C7 opens only for historical inspection
D2 caps inherited
admission budget now finite
```

### D3-1 admission/provenance

Consistent:

```text
receipt authenticity != truth
native admission atomicity preserved
backfill explicit
receipt/binding now finitely budgeted
```

### D3-2 disclosure/withdrawal

Consistent:

```text
fresh current disclosure remains required
C7 cannot bypass DENY/HOLD
reason privacy preserved
```

### D3-3 presentation/compare

Consistent:

```text
historical chrome distinct
companion page-level only
compare exact and disclosure-monotone
presentation/read-model caps now finite
```

### D3-4 restore/search/navigation

Consistent:

```text
page-local exact navigation only
PK-X2 remains current-only search
restore is fresh current mutation
navigation/handoff envelopes now bounded
```

No hidden contradiction requiring C5, C6, or C8 was found.

## 90. Final capability closure

```text
same active PUBLIC_KNOWLEDGE page
→ exact bounded revision history
→ exact bounded historical admission
→ fresh historical disclosure
→ explicit historical presentation/navigation/compare

current truth changes
→ authentic old revision may remain historical if disclosure allows

restore requested
→ old revision supplies bounded seed only
→ fresh current authority
→ NEW revision or no commit

lifetime ends
→ history authority ends immediately
→ physical residue cannot revive it
```

## 91. PK-D3 design convergence verdict

```text
PK_D3_HISTORICAL_PAGE_V1_DESIGN = CONVERGED
```

Final profile:

```text
ACTIVE_LIFETIME_BOUNDED_PAGE_LOCAL_HISTORICAL_PAGE_V1
```

Final Candidate C capability set:

```text
C1 + C2 + C3 + C4 + C7 ONLY
```

Closed:

```text
C5 + C6 + C8
```

## 92. Convergence is not runtime authorization

```text
DESIGN CONVERGED
!= IMPLEMENTATION READY
!= RUNTIME ENABLED
!= PRODUCTION DEPLOYED
```

No runtime implementation is authorized by D3-5.

## 93. No further PK-D3 design checkpoint required

D3-0 through D3-5 now close the selected first PK-D3 historical-page profile.

A future change that needs any of the following must open a new explicit expansion rather than silently extending D3 V1:

```text
cross-conversation archive
historical global search
rolling eviction/compaction
persistent compare objects
stable assertion identity
stable citation identity
partial/cherry-pick restore
historical media identity
ambient prompt re-entry
background/delayed semantic effects
```

## 94. Final closure statement

```text
PK-D3 HISTORICAL_PAGE V1
= DESIGN CONVERGED
= ACTIVE-LIFETIME BOUNDED
= PAGE-LOCAL
= EXACT-REVISION
= FRESH-DISCLOSURE
= C7 ENABLED
= C5/C6/C8 CLOSED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED
```
