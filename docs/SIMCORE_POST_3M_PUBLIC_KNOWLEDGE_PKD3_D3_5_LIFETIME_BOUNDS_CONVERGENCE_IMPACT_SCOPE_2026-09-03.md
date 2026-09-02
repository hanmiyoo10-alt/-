# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D3 D3-5 Lifetime / Bounds / Convergence Impact Scope - 2026-09-03

Date: 2026-09-03 KST

Status: **D3-5 IMPACT SCOPE SELECTED · FINAL PK-D3 LIFETIME/RESOURCE CLOSURE · D2-5 BOUNDS INHERITED · D3 ADMISSION/PRESENTATION BUDGETS REQUIRED · C1+C2+C3+C4+C7 ONLY · C5/C6/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D3 · D3-5 · LIFETIME · BOUNDS · CONVERGENCE · CANDIDATE C C7 · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D3-0 through D3-4 now define the first historical-page family:

```text
D3-0  Historical Page Master
D3-1  Historical Admission / Provenance
D3-2  Historical Disclosure / Withdrawal
D3-3  Historical Presentation / Compare
D3-4  Restore / Search / Navigation
```

D3-5 must not introduce another history feature.

Its job is to close the remaining resource/lifetime seams and decide whether PK-D3 can be marked design-converged without opening hidden Candidate C capabilities.

This impact transaction authorizes no runtime storage, schema, renderer, route, cleanup worker, prompt/context change, model call, network call, release, or `release-simcore` mutation.

## 1. Fresh authority state

Fresh repository read before this transaction found:

```text
main
= 3d0f04fbf2a15d78ae0b7cebe81a9a5cab13c2c1
= D3-4 detailed merge

release-simcore
= unchanged production authority
```

D3-4 therefore already exists as design authority and must not be duplicated.

D3-5 is the next unresolved PK-D3 checkpoint.

## 2. Selected closure seam

D3-5 impact selects:

```text
D2_5_ACTIVE_LIFETIME_BOUNDS
+
BOUNDED_D3_HISTORICAL_ADMISSION_METADATA
+
BOUNDED_EPHEMERAL_HISTORY_PRESENTATION
+
IMMEDIATE_LOGICAL_LIFETIME_INVALIDATION
+
OWNER_SCOPED_PHYSICAL_RECLAMATION
+
FINAL_CANDIDATE_C_REASSESSMENT
```

## 3. Canonical separation

```text
HISTORICAL SURVIVAL
!= UNBOUNDED RETENTION

HISTORICAL SURVIVAL
!= CROSS-CONVERSATION ARCHIVE

HISTORICAL ADMISSION
!= CURRENT DISCLOSURE

CURRENT DISCLOSURE
!= CURRENT TRUTH

PRESENTATION BUDGET
!= STORAGE RETENTION POLICY

LIFETIME END
!= PHYSICAL DELETE SUCCESS

C7
!= C6 MEMORY
!= C8 DELAYED EFFECT TARGETING
```

## 4. D2-5 remains the semantic-history resource owner

D3-5 must not create a second revision-retention profile.

The first historical-page profile inherits D2-5 unchanged, including:

```text
MAX_COMMITTED_REVISIONS_PER_PAGE             = 64
MAX_REVISION_RECORD_LOGICAL_BYTES            = 65,536
MAX_RETAINED_REVISION_LOGICAL_BYTES_PER_PAGE = 4,194,304
MAX_SECTIONS_PER_REVISION                    = 16
MAX_ASSERTIONS_PER_REVISION                  = 128
MAX_CITATION_RECORDS_PER_REVISION            = 64
MAX_CITATION_ATTACHMENTS_PER_REVISION        = 128
MAX_REVISION_LIST_ENTRIES                    = 64
MAX_RESTORE_SOURCE_LOGICAL_BYTES             = 65,536
MAX_COMPARE_DIFF_ENTRIES                     = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES             = 131,072
```

No D3 operation may enlarge these limits merely because old revisions can now be historically disclosed.

## 5. No rolling eviction remains authoritative

While lifetime is ACTIVE:

```text
committed revision
+ required historical admission
```

must not be deleted merely to make room for a newer history-producing operation.

Canonical behavior remains:

```text
capacity exhausted
→ HOLD new operation
→ current head unchanged
→ existing committed history unchanged
```

D3 must not turn D2-5 backpressure into archive compaction semantics.

## 6. D3-specific admission metadata requires a finite budget

D3-1 introduced authenticated historical-admission state:

```text
HistoricalRevisionAdmissionReceiptV1
  schemaVersion
  pageIdentity
  revisionRef
  lifetimeScopeRef
  admittedRevisionBindingRef
  admittedPolicyProfile
```

D3-0 explicitly rejected an unbounded receipt side log.

D3-5 detailed design must freeze:

```text
finite logical bytes per historical admission
finite aggregate historical admission bytes per page/lifetime
one logical admission maximum per committed revision tuple
```

The budget must cover both native D3 admissions and explicit D2 backfill admissions.

## 7. Admission budget cannot become semantic truncation

If a historical admission cannot fit its bound:

```text
native D3 revision-producing operation
→ HOLD before semantic commit
```

because D3-1 forbids silent downgrade to a D2-only commit when native D3 admission is required.

For explicit D2 backfill:

```text
admission budget unavailable
→ HOLD backfill
→ semantic revision/current head unchanged
```

Forbidden:

```text
truncate binding ref
truncate page/revision/lifetime identity
strip admission profile
store unauthenticated compact hint
```

## 8. Presentation budgets are semantic read-model budgets

D3-3 deferred finite caps for:

```text
historical presentation metadata
current-status companion payload
compare presentation accounting
```

D3-5 selects bounded logical read-model accounting, not DOM/CSS byte accounting.

Physical HTML size, framework bookkeeping, accessibility DOM duplication, and CSS bundle size are implementation/performance concerns and must not become semantic authority.

## 9. Historical body remains bounded by revision record

D3 historical body is not a second stored body.

Exact historical semantic content comes from one retained immutable D2 revision already bounded by:

```text
MAX_REVISION_RECORD_LOGICAL_BYTES = 65,536
```

D3-5 must not duplicate the body into another durable historical payload.

## 10. Current-status companion stays separately bounded and ephemeral

The D3-3 page-level current-status companion:

```text
!= historical body
!= current page body
!= durable revision
!= durable history metadata
```

It must receive a finite logical payload cap and remain operation-local/ephemeral.

A companion overflow must remove/withhold the companion rather than truncate it into an authority-changing statement.

Historical body eligibility remains independently governed by D3-1/D3-2.

## 11. Compare remains bounded by D2-5 plus D3 presentation metadata

D3-3 semantic compare continues to obey:

```text
MAX_COMPARE_DIFF_ENTRIES = 768
MAX_COMPARE_OUTPUT_LOGICAL_BYTES = 131,072
```

D3-5 may add a separate finite metadata/chrome accounting budget, but must not enlarge the semantic diff budget.

No partial semantic diff may be presented as complete.

## 12. History-list work remains page-local and bounded

D3-4 selected exact page-local navigation only.

Therefore D3-5 closes with:

```text
one exact pageIdentity
→ at most 64 retained revision memberships
→ metadata disclosure filter
→ bounded history navigation presentation
```

No global historical index, cross-page scan, historical full-text search, or cursor/pagination profile is introduced.

## 13. Lifetime state remains external trusted authority

First D3 profile inherits:

```text
ACTIVE
ENDED
UNKNOWN
```

from the trusted conversation-scoped lifetime owner.

D3-5 must preserve:

```text
ACTIVE
→ explicit historical operations may proceed subject to all other gates

ENDED
→ ordinary historical read/list/compare/restore-source use invalid immediately

UNKNOWN
→ fail closed
```

No TTL, turn count, last-access time, route age, or visible timestamp may infer lifetime state.

## 14. C7 is bounded by lifetime, not perpetual archive

Candidate C C7 means the semantic historical artifact may remain historically inspectable after current truth/source authority has changed, when:

```text
same active page/lifetime
+ exact committed revision
+ D3-1 authenticity PASS
+ fresh D3-2 disclosure ALLOW
```

It does not mean:

```text
survive lifetime END as an ordinary usable page
survive into a new conversation
ignore withdrawal/privacy disclosure
be globally searchable
be injected into model context
accept delayed semantic mutation
```

## 15. Lifetime END ordering

D3-5 selects the same logical-first pattern as PX1-4 and D2-5:

```text
1 trusted lifetime becomes ENDED
2 reject new D3 list/read/compare/navigation/restore-source operations
3 clear ephemeral historical view/compare/companion/restore-preflight state
4 D3-owned admission state becomes cleanup eligible
5 D2-owned revision/head state remains under D2 cleanup ownership
6 physical owner cleanup may execute
```

Logical invalidation does not wait for storage deletion.

## 16. Cleanup ownership must remain separated

D3 cleanup may own only D3 historical-admission material/projections.

D2 cleanup remains owner of:

```text
current head
committed revision records
revision membership/index data
D2 support-anchor mappings
D2 staging residue
```

D3 must not delete unrelated source/evidence stores merely because a historical revision referenced them.

## 17. Cleanup asymmetry must fail closed

Possible lifetime-end residue states must remain safe:

```text
D3 admission survives but D2 revision is gone
→ receipt alone proves nothing
→ no historical body

D2 revision survives but D3 required admission is gone
→ D2 bytes alone do not recreate native D3 authenticity
→ no historical body

both physically survive after END
→ lifetime ENDED still makes ordinary use invalid
```

No residue combination may resurrect history.

## 18. Active-lifetime committed admission is protected

While ACTIVE, a valid committed historical admission is part of the exact history-authenticity relation and must not be rolling-evicted independently of its revision.

Allowed active cleanup is limited to provable non-authoritative residue such as:

```text
abandoned staging candidate
re-materializable non-authoritative projection/cache
```

Cleanup may not infer semantic repair.

## 19. Feature OFF remains vertical dormancy

Feature OFF while lifetime ACTIVE means:

```text
historical list/read/compare/navigation = 0
historical presentation mount = 0
current-status companion = 0
historical restore seed materialization = 0
background scan/index/model/network work = 0
```

Durable D2 revision and D3 admission state may remain intact until trusted lifetime END.

Feature OFF does not revoke the lifetime itself and does not rewrite history.

## 20. Reload remains ephemeral teardown

Reload may clear:

```text
selected revision
history list presentation
historical body presentation
compare pair/result
current-status companion
navigation binding
restore preflight/handoff
```

It must not:

```text
scan all history
auto-remount cached protected body
auto-backfill admission
auto-restore
auto-inject history into model context
```

## 21. Candidate C final audit questions

D3-5 detailed design must answer each explicitly.

### C1

Does exact durable page/revision state survive across turns inside the active lifetime?

Expected: **YES**.

### C2

Does stable page/revision addressing exist without title/ordinal/fuzzy inference?

Expected: **YES**.

### C3

Can the same durable page receive a new semantic current revision through admitted D2 operations?

Expected: **YES**, inherited PK-D2.

### C4

Does revisioned-page mutation retain append/merge pressure already admitted by PK-D2 without opening generic merge/cherry-pick history semantics?

Expected: **YES**, inherited PK-D2 only.

### C5

Does D3 create cross-family derived-to-derived semantic lineage?

Expected: **NO**.

### C6

Does historical body/list/compare/restore source become ambient future-turn model memory?

Expected: **NO**.

### C7

Can an authentic old revision remain historically displayable despite current truth/source replacement, subject to fresh current disclosure?

Expected: **YES**.

### C8

Can a late callback/task mutate or attach semantics merely by holding pageIdentity/revisionRef/receipt/route?

Expected: **NO**.

## 22. C5 pressure boundaries

These do not activate C5:

```text
previousRevisionRef
restoredFromRevisionRef
historical admission binding
D3-3 exact compare pairing
current-status companion
```

They are same-page provenance or ephemeral presentation relationships.

D3-5 must keep them from becoming a generic derived-object lineage graph.

## 23. C6 pressure boundaries

These do not activate C6 when kept operation-local:

```text
historical body shown to user
historical compare result
explicit restore semantic seed inside one current mutation operation
```

Forbidden ambient behavior:

```text
viewed history → next prompt automatically contains history
compare result → model memory
last historical page → background context cache
```

## 24. C8 pressure boundaries

These are locators/proofs, not delayed-effect bearer tokens:

```text
pageIdentity
revisionRef
admittedRevisionBindingRef
copied route
restore handoff
```

A delayed or retried operation must reacquire the full current authority chain.

No background restore/index refresh/media attachment is selected.

## 25. Convergence criterion

PK-D3 may be marked DESIGN CONVERGED only if D3-5 proves all of:

```text
finite retained semantic history
finite D3 admission metadata
finite presentation/read-model metadata
bounded page-local work
logical lifetime invalidation before deletion
owner-scoped cleanup
feature-off/reload dormancy
no stale body resurrection
no global historical search
no cross-conversation archive
no C5/C6/C8 expansion
```

## 26. Convergence does not equal implementation readiness

If design converges, the closure statement must still preserve:

```text
DESIGN CONVERGED
!= IMPLEMENTATION READY
!= RUNTIME ENABLED
!= PRODUCTION DEPLOYED
```

Runtime blockers remain evidence obligations.

## 27. Runtime blockers expected to remain

At least:

```text
executable canonical logical byte encoding
physical durable revision/admission backend
native D3 atomic admission transaction
trusted admission binding implementation
current disclosure composer/provider
safe historical renderer and stale-subtree teardown
exact route/action binding
owner-scoped lifetime cleanup
restore handoff integration
bounded observability
feature-off/reload integration
concurrency/integrity tests
```

No blocker is resolved merely by writing this design.

## 28. Non-goals

D3-5 does not add:

```text
cross-conversation archive
historical global search
historical full-text index
rolling history eviction
history squash/renumbering
stable assertion identity
stable citation identity
selective assertion restore/cherry-pick
derived lineage graph
prompt-memory history
background refresh
late callback mutation
```

## 29. Detailed-design targets

The D3-5 detailed transaction should freeze:

```text
1 exact D3 admission logical byte caps
2 exact historical presentation metadata caps
3 exact current-status companion cap
4 exact history-list presentation budget
5 compare final bounded accounting
6 restore handoff envelope accounting
7 lifetime-end cleanup matrix
8 corruption/residue fail-closed matrix
9 complete D3-0..D3-4 acceptance audit
10 final Candidate C capability verdict
11 PK-D3 DESIGN CONVERGED / NOT CONVERGED verdict
```

## 30. Impact verdict

```text
D3-5 IMPACT = SELECTED

selected profile direction:
ACTIVE_LIFETIME_BOUNDED_PAGE_LOCAL_HISTORICAL_PAGE_V1

semantic history bounds:
INHERIT D2-5 UNCHANGED

D3-specific metadata/presentation:
REQUIRE FINITE HARD CAPS

CANDIDATE C EXPECTED:
C1+C2+C3+C4+C7 ONLY

RUNTIME IMPLEMENTATION:
NOT AUTHORIZED
```
