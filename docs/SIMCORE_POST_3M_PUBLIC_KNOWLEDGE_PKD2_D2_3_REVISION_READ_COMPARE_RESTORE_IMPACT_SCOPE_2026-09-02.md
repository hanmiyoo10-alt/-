# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-3 Revision Read / Compare / Restore Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-3 IMPACT SCOPE COMPLETE · REVISION METADATA / BODY INSPECTION SPLIT · CURRENT-ELIGIBILITY GATE · BOUNDED COMPARE · COPY-FORWARD RESTORE · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-3 · REVISION READ · COMPARE · RESTORE · IMPACT SCOPE**

## 0. Purpose

D2-0 froze linear single-head revisioned PUBLIC_KNOWLEDGE with full validated snapshots.
D2-1 froze immutable committed revision records, authoritative committed membership, current head ownership, and atomic bootstrap/head advance.
D2-2 froze mutation operation ownership, explicit operation footprints, complete next-snapshot validation, no-op suppression, and expected-revision safety.

D2-3 must now define how an already committed old revision may be listed, inspected, compared, and used as a restore source without silently activating C7 historical semantic survival.

This transaction is design-only.

It does not implement revision storage, revision APIs, diff code, restore code, UI, DOM/CSS, persistence migrations, prompt re-entry, network calls, model calls, or release changes.

## 1. Canonical problem

PK-D2 deliberately stores old committed semantic snapshots.

That does not mean every stored old body may be rendered forever.

Canonical separation:

```text
REVISION EXISTS
!=
REVISION BODY MAY BE SHOWN NOW
!=
REVISION BODY IS CURRENT TRUTH
!=
REVISION MAY BE RESTORED NOW
```

D2-3 must preserve this separation mechanically.

## 2. Authority ownership

D2-3 consumes existing owners without becoming a new truth owner.

```text
Revision Owner
→ committed membership, exact revision address, chain relationship, current head

PK-X1 Lifetime / Target Identity
→ active durable page scope

Evidence / Lineage / Handoff + 3M-6 support-at-use
→ current source support

3M-2 Exposure
→ current public eligibility

PK-1 / PK-2
→ current settlement and public-reference validation

PK-4
→ current visible citation/provenance validation

D2-3
→ bounded revision inspection / compare / restore-source gating only
```

D2-3 may not manufacture current support for an old revision merely because it was once committed.

## 3. First-scope operations

D2-3 covers four page-local operations:

```text
LIST_REVISIONS
READ_REVISION
COMPARE_REVISIONS
RESTORE_AS_NEW_REVISION
```

All targets are exact and page-local.

Not first scope:

```text
GLOBAL_REVISION_SEARCH
HISTORICAL_FULL_TEXT_SEARCH
BRANCH_VIEW
MERGE_VIEW
TIME_TRAVEL_HEAD
PERMANENT_HISTORICAL_DISPLAY
REVISION_EXPORT_ARCHIVE
```

## 4. Exact revision addressing

Revision inspection must use:

```text
pageIdentity + revisionRef
```

No lookup by:

```text
timestamp
old title
visible revision number
text similarity
host transcript position
search snippet
```

Visible revision labels remain presentation metadata, not authoritative addresses.

## 5. Revision metadata surface versus body surface

D2-3 freezes two distinct read surfaces.

### A. Revision metadata surface

May expose bounded owner-verified revision-store facts such as:

```text
revision exists
committed membership
current-head relation
predecessor relation
bounded restore-origin relation when authorized
```

It contains no old assertion body.

### B. Revision semantic body surface

Contains the retained validated PUBLIC_KNOWLEDGE semantic snapshot and its accepted visible citation/provenance surface.

It requires a stronger current inspection gate.

Canonical rule:

```text
METADATA LISTABILITY
DOES NOT IMPLY
BODY INSPECTION ELIGIBILITY
```

## 6. Revision list first scope

A page-local revision list may include only:

```text
committed revisions
same exact pageIdentity
active lifetime
inside bounded retention/list window
```

It must exclude:

```text
uncommitted candidates
orphan residue
failed operations
quarantined drafts
DENY/HOLD payload
operation tokens
```

D2-5 will freeze concrete list/window caps.

## 7. Metadata minimization

Revision-list metadata must remain non-semantic by default.

Ordinary list presentation need not expose raw internal references.

Fields such as `operationKind` may be retained internally by the revision owner, but D2-3 must not require ordinary presentation to reveal them when doing so would communicate historical semantics beyond the current inspection gate.

Canonical direction:

```text
REVISION LIST
= NAVIGATION METADATA
!= HISTORICAL SUMMARY
```

## 8. Body inspection gate

An old committed revision body may be inspected only after all required current gates pass.

Conceptual order:

```text
1 exact pageIdentity
2 active lifetime
3 exact committed revisionRef
4 revision schema / record integrity
5 exact target identity continuity
6 current source/support-at-use eligibility
7 current Exposure eligibility
8 current settlement compatibility
9 current citation/provenance compatibility for visible citation surface
10 body inspection eligible
```

Failure does not delete the committed revision.

It withholds semantic body inspection.

## 9. Whole-revision inspection atomicity

First D2-3 scope selects conservative whole-revision inspection.

```text
ALL retained visible semantic assertions needed for the revision body
must remain currently inspection-eligible
```

If any retained assertion would now require DENY/HOLD/quarantine or unsupported semantic rewriting:

```text
revision metadata may remain listable
revision body = WITHHELD
```

D2-3 does not present a silently partial reconstruction of an old revision.

Reason:

```text
PARTIAL OLD REVISION
!= THE COMMITTED OLD REVISION
```

A future historical product may design a different grammar only through explicit escalation.

## 10. No historical fallback

If old revision R4 is no longer inspection-eligible:

Forbidden:

```text
show R4 anyway + stale badge
show only the assertions that still pass
show cached R4 body
show transcript copy of R4 as current revision inspection
```

Permitted bounded state:

```text
revision exists
body currently unavailable under policy
```

This preserves the C7 firewall.

## 11. C7 remains closed

Requirement:

```text
show exactly what R4 said even though current authority no longer supports R4 semantics
```

is not D2-3.

It activates:

```text
PK-D3 HISTORICAL_PAGE
+ Candidate C C7
```

D2-3 may not smuggle C7 in through a revision viewer.

## 12. Current head inspection

The current head is not exempt from current support/use checks.

```text
HEAD_FOUND
!= BODY ELIGIBLE
```

If current-head support fails, current page/body becomes unavailable according to existing PX1 / PK-D2 policy.

No older revision is auto-selected as fallback.

## 13. Compare preconditions

`COMPARE_REVISIONS` requires:

```text
same exact pageIdentity
revision A committed
revision B committed
active lifetime
revision A body inspection eligible now
revision B body inspection eligible now
bounded compare request
```

If either body is withheld:

```text
semantic compare = unavailable
```

Metadata-only relationship display may still be possible separately.

## 14. Compare is derived inspection

Comparison output is:

```text
EPHEMERAL
DERIVED
NON-CANONICAL
NON-MUTATING
NON-PERSISTENT BY DEFAULT
```

It is not:

```text
new revision
truth upgrade
settlement authority
citation authority
mutation authority
restore authorization by itself
```

## 15. Conservative semantic diff

First scope must not infer a durable assertion identity across arbitrary revisions.

D2-2 froze assertion ordinal as revision-local structural addressing.

Therefore D2-3 must not claim:

```text
ordinal 3 in R2
= same semantic assertion as ordinal 3 in R9
```

unless a future explicit identity contract exists.

Safe first direction:

```text
compare complete validated snapshots structurally
report exact semantic records / fields present in A only, B only, or exactly equal
use revision-local coordinates only as display/navigation aids
```

A changed natural-language assertion may conservatively appear as removal + addition rather than an invented persistent assertion identity.

## 16. No fuzzy semantic matching

Forbidden compare inference:

```text
text looks similar
embedding is close
same topic
same ordinal number
same section placement
→ therefore same assertion evolved
```

String/semantic similarity is presentation assistance at most and is not authoritative revision lineage.

## 17. Compare output bounds

Future implementation must mechanically cap at least:

```text
revision body bytes loaded per side
assertions inspected per side
citation entries inspected per side
diff entries emitted
diff text bytes rendered
```

Exact numbers are deferred to D2-5.

## 18. Restore is not rewind

Frozen restore model remains:

```text
current head = R9
select exact committed old revision R4
        ↓
D2-3 source inspection / restore eligibility
        ↓
materialize complete candidate from R4 semantic snapshot
        ↓
revalidate under CURRENT authority / schema / Exposure / settlement / citation rules
        ↓
D2-2 footprint + no-op + expected-revision gates
        ↓
commit NEW revision R10-equivalent
        ↓
head = R10-equivalent
```

Forbidden:

```text
head R9 → head R4
```

## 19. Restore source exactness

Restore source must be:

```text
same pageIdentity
exact committed revisionRef
inside active lifetime / retained revision window
record integrity valid
```

No restore source recovery from:

```text
old transcript
cache
search snippet
rendered diff text
timestamp guess
title match
```

## 20. Restore source body must be inspection-eligible

D2-3 selects the conservative rule:

```text
SOURCE REVISION BODY NOT CURRENTLY INSPECTION-ELIGIBLE
→ RESTORE NOT AUTHORIZED
```

This avoids a hidden path where a user cannot inspect old semantic content but can nevertheless cause it to become current again.

## 21. Restore candidate revalidation

Inspection eligibility is necessary but not sufficient for restore commit.

The copied source snapshot must be revalidated as a **new current candidate**.

Validator-derived fields are re-derived from current trusted authority.

The source revision cannot carry forward authority merely because it once had:

```text
referenceState
settlement result
citation acceptance
source support
```

Canonical rule:

```text
OLD VALIDATION RECEIPT
!= CURRENT RESTORE AUTHORITY
```

## 22. Restore content atomicity

First scope forbids silent partial restore.

If any source assertion body needed for the selected old snapshot no longer passes current semantic/public eligibility:

```text
RESTORE = REJECT
```

not:

```text
restore only surviving assertions
```

This preserves user intent and avoids an undeclared whole-page reconciliation.

## 23. Restore citation atomicity

Because PK-D2 revisions persist visible citation/provenance semantics, a restore candidate must not silently drop or substitute old visible citation relationships merely to make the operation succeed.

If required current citation/provenance revalidation cannot reproduce an acceptable current citation surface for the restored semantic snapshot:

```text
RESTORE = HOLD / REJECT
```

A separate explicit citation mutation may be performed through D2-2.

## 24. Restore may re-derive authority-owned fields

Current validator-owned fields may legitimately differ from the source revision when current trusted authority requires it.

Examples:

```text
referenceState
trusted attribution metadata
bounded current support identities
```

Such re-derivation does not mean the old revision was edited in place.

The new committed revision records the newly validated current semantic state.

## 25. Restore operation footprint

D2-3 freezes the restore-specific footprint as:

```text
WHOLE_PAGE_FROM_EXACT_COMMITTED_REVISION
```

This authorizes replacement of the current page semantic snapshot with the complete currently revalidated semantic snapshot derived from one exact old committed revision.

It does **not** authorize:

```text
arbitrary merge of old + current assertions
cherry-pick multiple revisions
auto resolve conflicts
cross-page copy
cross-family copy
```

## 26. Restore expected revision

Restore remains a D2-2 mutation and therefore requires:

```text
expectedRevision = current head at operation start
```

It is checked before expensive restore processing and again immediately before commit.

If the head changes:

```text
REVISION_MISMATCH
→ reject
```

No silent rebase of the restore request.

## 27. Restore semantic no-op

If the currently validated restore candidate is semantically identical to the current committed head under D2-2 no-op comparison:

```text
RESTORE_NO_OP
→ no new revision
→ head unchanged
```

`restoredFromRevisionRef` metadata alone must not force a new semantic revision when the semantic state did not change.

## 28. `restoredFromRevisionRef`

A successful restore-created revision may record bounded same-page provenance:

```text
restoredFromRevisionRef = R4
```

This proves only:

```text
new revision candidate was derived from exact same-page committed revision R4
```

It does not prove R4 remains current truth and does not activate C5 cross-family lineage.

## 29. Compare-to-restore boundary

A compare view may offer a future UI affordance to begin restore, but:

```text
COMPARE RESULT
!= RESTORE INPUT AUTHORITY
```

Restore must re-resolve the exact source revision from the Revision Owner and execute the full restore gate anew.

No restore from rendered diff fragments.

## 30. Read-to-edit boundary

Likewise, opening old revision R4 does not authorize editing R4 in place.

Any edit must create a new operation against the current head.

Forbidden:

```text
open R4
→ modify stored R4 bytes
```

Permitted direction:

```text
open eligible R4
→ use explicit restore / new-current operation
→ create new revision
```

## 31. Search interaction

PK-X2 remains page-oriented.

D2-3 does not add global historical search.

Ordinary flow remains:

```text
query
→ pageIdentity
→ current head
→ current support/use
```

Revision listing/inspection begins only after exact page navigation.

## 32. Reload / cache boundary

Reload may discard current revision viewer / diff UI state.

Caches may not authorize old bodies.

```text
cached old revision body
+ current inspection gate unavailable
→ body withheld
```

No cache entry may substitute for authoritative committed membership or current semantic eligibility.

## 33. Failure classes

Conceptual D2-3 distinctions include:

```text
REVISION_NOT_FOUND
REVISION_NOT_COMMITTED
REVISION_RECORD_INVALID
REVISION_BODY_CURRENTLY_UNAVAILABLE
REVISION_COMPARE_INPUT_UNAVAILABLE
REVISION_COMPARE_LIMIT_EXCEEDED
RESTORE_SOURCE_UNAVAILABLE
RESTORE_CURRENT_VALIDATION_FAILED
RESTORE_REVISION_MISMATCH
RESTORE_NO_OP
```

Exact runtime enum names remain implementation work.

## 34. No persistent compare artifacts

Diff output, selection state, expanded sections, scroll position, and compare layout are:

```text
EPHEMERAL
NON-CANONICAL
NON-MODEL-CONTEXT
```

D2-3 does not create a diff database.

## 35. Candidate C reassessment

D2-3 remains inside the already selected PK-D2 profile:

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

The presence of revision storage and revision inspection does not itself activate C7 because semantic body inspection remains conditioned on current eligibility.

## 36. C7 escalation trigger

D2-3 must reopen Candidate C / PK-D3 before authorizing any requirement equivalent to:

```text
old revision semantic body remains viewable
EVEN WHEN current support / Exposure / settlement no longer authorizes it as current semantic material
```

That is the exact historical-survival boundary.

## 37. Runtime evidence blockers

Future implementation cannot claim D2-3 ready until it proves at least:

```text
exact committed revision addressing
metadata/body separation
current inspection eligibility
whole-revision body withholding
bounded revision listing
bounded compare
no fuzzy assertion identity inference
copy-forward restore
full current revalidation
restore expected-revision double check
restore no-op suppression
no stale cache fallback
no C7 historical leak
ordinary-turn dormancy
```

## 38. Ordinary-turn dormancy

When no revision list/read/compare/restore request is active:

```text
revision list scan = 0
old revision body read = 0
compare work = 0
restore work = 0
model call = 0
network call = 0
```

D2-3 must not introduce background historical scanning.

## 39. Impact-scope verdict

Selected seam:

```text
COMMITTED REVISION OWNER
  ├─ bounded metadata list
  └─ exact old revision
          ↓
CURRENT REVISION INSPECTION GATE
          ├─ body withheld
          └─ body eligible
                  ├─ bounded ephemeral compare
                  └─ restore source
                         ↓
CURRENT REVALIDATION
                         ↓
D2-2 MUTATION / COMMIT SAFETY
                         ↓
NEW REVISION ONLY
```

This preserves:

```text
REVISION STORAGE
WITHOUT
UNCONDITIONAL HISTORICAL SEMANTIC SURVIVAL
```

## 40. Next checkpoint

After this impact scope is accepted, the detailed D2-3 design should freeze:

```text
RevisionInspectionGateV1
revision list / body read dispositions
safe compare representation
restore candidate / footprint / atomicity
C7 escalation firewall
```

No runtime implementation is authorized by this document.
