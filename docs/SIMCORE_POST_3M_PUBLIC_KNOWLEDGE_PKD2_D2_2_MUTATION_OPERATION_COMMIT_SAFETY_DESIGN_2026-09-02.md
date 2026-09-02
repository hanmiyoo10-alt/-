# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-2 Mutation Operation / Commit Safety Design — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-2 DESIGN FROZEN · COMPLETE NEXT SNAPSHOT · EXPLICIT OPERATION FOOTPRINT · DOUBLE EXPECTED-REVISION CHECK · SEMANTIC NO-OP = NO REVISION · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-2 · MUTATION OPERATION · COMMIT SAFETY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 selected linear single-head revisioned PUBLIC_KNOWLEDGE with full validated snapshots.
D2-1 froze revision-owner committed membership, immutable committed records, one authoritative current head, bootstrap, orphan residue, and expected-revision safety.

D2-2 freezes the first mutation operation contract.

Canonical pipeline:

```text
CURRENT OPERATION INTENT
→ EXACT PAGE + EXPECTED REVISION
→ OWNER-MATERIALIZED COMPLETE NEXT SNAPSHOT
→ FULL CURRENT AUTHORITY REVALIDATION
→ OPERATION-FOOTPRINT CHECK
→ SEMANTIC NO-OP CHECK
→ FINAL EXPECTED-REVISION RECHECK
→ OWNER-ATOMIC COMMIT
```

This document implements no mutation engine, store, UI action, DOM/CSS, prompt change, model call, network call, runtime schema, release transaction, or `release-simcore` mutation.

## 1. Authority chain

D2-2 consumes without reopening:

```text
D2-0 Revisioned Page Master
D2-1 Revision Record / Current Head
PK-2 Document Sidecar + Validator
PK-4 Citation / Provenance Boundary
PK-X1 durable page identity / current-view rules
Candidate C CC-2 revision / generation / operation stale safety
current source support / Exposure / settlement / citation authority
```

Canonical separation:

```text
USER / UI INTENT
!= OPERATION AUTHORITY
!= OPERATION REQUEST
!= CANDIDATE NEXT SNAPSHOT
!= VALIDATED CANDIDATE
!= COMMITTED REVISION
```

## 2. Capability profile

D2-2 does not widen D2-0/D2-1.

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

Runtime mutation remains unauthorized.

## 3. Current operation authority

A mutation may start only from a current owner-authorized operation request for one exact page.

Conceptual trusted context:

```text
PkD2CurrentOperationAuthorityContextV1
  pageIdentity
  allowedOperationKinds[]
  currentRequestBinding
  lifetimeScopeRef
```

Exact physical identity is future implementation work.

The context does not grant permission to edit trusted authority fields.

## 4. Common operation request envelope

Conceptual request:

```text
PkD2MutationOperationRequestV1
  schemaVersion
  pageIdentity
  expectedRevision
  operationKind
  operationPayload
```

Every state-derived operation requires an exact `expectedRevision`.

An operation request is ephemeral input and is not a revision record.

## 5. First operation kinds

Frozen ordinary D2-2 operations:

```text
EDIT_ASSERTION
APPEND_ASSERTION
REMOVE_ASSERTION
APPEND_CITATION
REPLACE_CITATION
CORRECTION_UPDATE
```

`RESTORE_AS_NEW_REVISION` inherits this commit gate after D2-3 defines its read/restore input contract.

Not first scope:

```text
WHOLE_PAGE_DELETE_RETIRE
BULK_MUTATE
AUTO_MERGE
REBASE_HISTORY
SQUASH_HISTORY
CROSS_FAMILY_MUTATE
MEDIA_REPLACE
```

## 6. Operation input does not own derived authority

Operation payloads may propose producer-owned semantic values only.

Never directly operation-editable:

```text
pageIdentity
targetIdentityRef
trusted sourceAuthorityRef
referenceState
final disposition
settlement result
claimSupportRef authority
trusted citation source metadata
trusted citation allowedRoles
validator receipt
revisionRef
committed membership
current head
```

Canonical rule:

```text
DERIVED / TRUSTED FIELD NEEDS TO CHANGE
→ RE-DERIVE OR RE-JOIN FROM CURRENT AUTHORITY
→ NEVER TRUST OPERATION PAYLOAD AS AUTHORITY
```

## 7. Internal join refs are not user editing controls

Fields such as `settlementBasisRef` or `claimSupportRef` are internal join material.

A human-facing mutation request does not directly select or overwrite them as trusted values.

A bounded candidate producer may propose current join refs for validator use, but those proposals remain untrusted until exact current joins succeed.

## 8. Complete next snapshot

Every operation begins from the exact committed snapshot addressed by:

```text
pageIdentity + expectedRevision
```

The owner materializes a complete candidate next semantic snapshot before durable admission.

Partial patch input is permitted only as an operation convenience.

```text
OMITTED FIELD
!= DELETE
```

No committed semantic state depends on replaying an ambiguous patch log.

## 9. Source of candidate base state

The base state is the exact owner-committed revision record.

Forbidden candidate bases:

```text
rendered DOM
host transcript card
presentation cache
search snippet
last model draft
last-known-good UI object
```

## 10. Assertion address

An existing assertion is addressed first-scope by the tuple:

```text
pageIdentity
+ expectedRevision
+ assertionOrdinal
```

`assertionOrdinal` alone is not durable cross-revision identity.

No fuzzy lookup by text, section position, title, or similarity.

## 11. Ordinal preservation

For ordinary single-operation mutation:

```text
unchanged assertion
→ preserve ordinal

EDIT_ASSERTION target
→ preserve target ordinal

REMOVE_ASSERTION target
→ remove ordinal; survivors are not renumbered

APPEND_ASSERTION
→ owner allocates one ordinal unique in the candidate revision
```

No presentation compaction may rewrite semantic ordinals.

The exact numeric allocation algorithm is not frozen.

## 12. EDIT_ASSERTION payload

Conceptual bounded payload:

```text
targetAssertionOrdinal
replacement:
  content?       # explicit set
  mode?          # explicit set
  sectionKind?   # explicit set
```

At least one replacement field must be explicitly present.

Absent replacement fields preserve the current committed producer-owned value.

The operation does not directly set `referenceState`, attribution authority, settlement outcome, or citation validity.

## 13. EDIT_ASSERTION candidate rule

After applying the explicit replacement to the target assertion, the complete candidate must pass current PK validation.

Old validation does not carry forward.

```text
R7 assertion was SETTLED
+ edit content
!= edited assertion is SETTLED
```

Current Exposure / settlement / support must re-establish the result.

## 14. APPEND_ASSERTION payload

Conceptual bounded payload:

```text
sectionKind
mode
content
```

No authoritative ordinal, referenceState, settlement status, or support identity is user-supplied.

The candidate producer may attach the current untrusted join proposal required by PK-2, and the validator must exact-join it.

## 15. APPEND_ASSERTION admission

The appended assertion must independently become eligible under current PK rules.

If the new assertion is quarantined or invalid:

```text
APPEND OPERATION REJECTED
```

Forbidden behavior:

```text
new assertion quarantined
→ silently commit old page as a new revision
```

## 16. REMOVE_ASSERTION payload

Conceptual payload:

```text
targetAssertionOrdinal
```

The exact target must exist in the expected revision.

Deletion by omission is forbidden.

## 17. REMOVE_ASSERTION citation effect

Removing one assertion removes its attachments from the candidate revision.

Citation records that become unused may be pruned from the renderable citation bundle according to PK-4 exact citation identity.

This bounded cascade is inside the REMOVE footprint.

It must not remove citations attached to unrelated surviving assertions.

## 18. APPEND_CITATION payload

Conceptual payload:

```text
targetAssertionOrdinal
citationRef
role
```

The tuple is an untrusted attachment proposal.

It must exact-match current PK-4 claim-support and role authorization.

The operation cannot edit the trusted citation record itself.

## 19. REPLACE_CITATION payload

Conceptual payload:

```text
targetAssertionOrdinal
existingCitationRef
existingRole
replacementCitationRef
replacementRole
```

The old attachment tuple must exist exactly in the expected revision.

The replacement must pass current PK-4 joins independently.

No fuzzy replacement by source label, URL, footnote number, or similar record title.

## 20. Citation-only mutation is revision-worthy

A validated citation relationship is part of the committed public-reference support surface.

Therefore an actual citation attachment change may create a revision even when assertion text is unchanged.

```text
ASSERTION TEXT SAME
!= REVISION SEMANTICS SAME
```

## 21. CORRECTION_UPDATE payload

Conceptual first payload:

```text
targetAssertionOrdinal
replacement:
  content?
  mode?
  sectionKind?
```

The operation kind expresses correction intent only.

It does not directly set:

```text
referenceState = CORRECTED_CURRENT_RECORD
settlement = CORRECTED
```

## 22. Correction authority

A correction commit requires current trusted correction/settlement authority to support the resulting corrected state.

If current correction authority is absent, ambiguous, stale, or incompatible:

```text
CORRECTION_UPDATE
→ HOLD / REJECT
→ no revision
```

The model or operation name cannot manufacture correction authority.

## 23. Operation footprint

D2-2 freezes explicit semantic mutation footprints.

The footprint is the maximum committed semantic difference authorized by one operation.

Canonical rule:

```text
VALIDATION PRODUCES DIFFERENCE OUTSIDE AUTHORIZED FOOTPRINT
→ REJECT OPERATION
→ DO NOT SILENTLY BUNDLE EXTRA MUTATIONS
```

## 24. EDIT_ASSERTION footprint

Allowed differences:

```text
target assertion producer-owned fields explicitly changed
target assertion validator-derived referenceState / attribution resulting from current validation
target assertion citation relationships only when current validation requires invalid old attachments to be removed under explicit D2-2 policy
```

First conservative rule: unrelated assertions and unrelated citation relationships must remain semantically equal after current validation.

If they cannot:

```text
HOLD_RECONCILIATION_REQUIRED
```

## 25. APPEND_ASSERTION footprint

Allowed differences:

```text
one new validated assertion
its derived current reference state / attribution
its eligible citation relations if supplied through an authorized combined candidate path
citation bundle inclusion required only by that new assertion
```

Unrelated existing assertions must not change.

## 26. REMOVE_ASSERTION footprint

Allowed differences:

```text
exact target assertion removed
its citation attachments removed
citation records used by no surviving attachment pruned
```

No survivor renumbering or unrelated semantic rewrite.

## 27. APPEND_CITATION footprint

Allowed differences:

```text
one eligible attachment relation added
one trusted citation record becomes visible if newly referenced
render-local footnote numbering may change ephemerally
```

Assertion content/mode/section/referenceState do not change from this operation alone.

## 28. REPLACE_CITATION footprint

Allowed differences:

```text
one exact existing attachment removed
one exact eligible replacement attachment added
citation record set pruned/extended only as implied by those relations
```

No assertion semantic rewrite.

## 29. CORRECTION_UPDATE footprint

Allowed differences are bounded to the exact target assertion and support relations required to express the current corrected state:

```text
target content/mode/section explicit replacements
target validator-derived corrected/current status
target attribution where current trusted authority requires it
target citation relationships required by current correction validation
```

Unrelated assertions remain unchanged.

## 30. Why PK-2 partial quarantine cannot become implicit mutation

PK-2 may construct a bounded partial current document after assertion-level quarantine.

PK-D2 mutation persistence has a stronger requirement:

```text
USER REQUESTED MUTATION FOOTPRINT
must bound
DURABLE SEMANTIC CHANGE
```

Example forbidden path:

```text
user edits assertion 2
assertion 7 now fails current authority
validator drops assertion 7
→ commit revision missing assertion 7
```

This would persist an unrequested removal.

D2-2 therefore rejects when out-of-footprint current changes are required.

## 31. Repair boundary

An ordinary single-item mutation may repair a current head only when all semantic changes needed for a valid next revision fit inside that operation's footprint.

If multiple unrelated assertions require correction/removal:

```text
ordinary D2-2 single operation
→ HOLD_RECONCILIATION_REQUIRED
```

A future explicit reconciliation/bulk repair contract is separate and not authorized here.

## 32. Validation order

Frozen order:

```text
1 resolve exact active page identity
2 read authoritative current head
3 compare current head == expectedRevision
4 resolve exact committed expected revision
5 validate current operation authority / kind
6 validate operation payload structure and exact target existence
7 materialize complete candidate next snapshot
8 run PK-2 structural validation
9 exact current target / source support-at-use validation
10 run current Exposure / settlement validation
11 run current PK-4 citation validation where applicable
12 verify explicitly mutated target achieved eligible intended result
13 compare validated candidate to operation footprint
14 semantic no-op comparison
15 re-read authoritative head
16 compare head == expectedRevision again
17 owner-atomic commit of immutable revision + head advance
18 presentation reconciliation
```

## 33. Double expected-revision check

D2-2 requires both:

```text
PRE-VALIDATION CHECK
and
PRE-COMMIT CHECK
```

because current validation may take time.

Candidate validity does not freeze head currentness.

## 34. Stale-after-validation outcome

```text
candidate validated against R7
head becomes R8 before commit
→ REVISION_MISMATCH
→ candidate not committed
```

Forbidden:

```text
silently update expectedRevision to R8
silently replay patch onto R8
auto-merge R7 candidate with R8
```

## 35. Target must survive validation for edit/append/correction

If the explicitly edited/appended/corrected assertion fails validation:

```text
OPERATION REJECTED
```

The operation may not disappear its own target through quarantine and then claim a successful partial revision.

## 36. Semantic no-op

After full validation and footprint verification, compare the candidate semantic revision content against the exact current committed revision.

Selected rule:

```text
SEMANTICALLY EXACT EQUIVALENT
→ NO_OP
→ no new revisionRef committed
→ head unchanged
```

## 37. No-op equivalence includes semantic citation state

Owner-defined canonical semantic equivalence includes all committed PUBLIC_KNOWLEDGE semantic meaning, including at least:

```text
section/assertion ordering owned by schema
assertion ordinal
sectionKind
mode
content
validator-derived referenceState
trusted attributionLabel when present
validated citation records that belong to committed revision semantics
validated assertion↔citation attachment roles
```

It excludes revision-wrapper and presentation-only metadata.

## 38. No-op equivalence excludes

Do not treat changes only in these as semantic revision changes:

```text
revisionRef
previousRevisionRef
operationKind
restoredFromRevisionRef
ephemeral operation receipt
render-local footnote number
DOM/CSS
expand/collapse state
cache identity
nonsemantic diagnostics
```

## 39. No fuzzy no-op normalization

Forbidden semantic equivalence shortcuts:

```text
case-insensitive text equality
aggressive whitespace rewriting
semantic embedding similarity
same sourceLabel despite different citationRef
same URL heuristic
model judgment: "basically the same"
```

First contract requires schema-defined exact canonical representation.

## 40. Duplicate append is not automatically no-op

Appending another assertion with identical natural-language content is still a semantic change unless a future exact duplicate-policy contract rejects it.

D2-2 does not deduplicate assertions by text similarity.

An exact duplicate citation attachment that validates into an unchanged bundle may resolve to `NO_OP`.

## 41. No-op result

Conceptual outcome:

```text
NO_OP
  pageIdentity
  currentRevisionRef
  operationKind
```

No new revision exists.

A bounded ephemeral receipt may be returned, but no-op attempts are not inserted into revision history.

## 42. Attempt log is not revision history

If a future product needs:

```text
show every attempted edit, including no-op/failed attempts
```

that is a separate audit/operation-log product.

It must not be smuggled into committed semantic revision history.

## 43. Failure taxonomy

Conceptual D2-2 outcomes include:

```text
COMMITTED
NO_OP
REJECT_OPERATION_UNAUTHORIZED
INVALID_OPERATION_PAYLOAD
ASSERTION_TARGET_NOT_FOUND
CITATION_TARGET_NOT_FOUND
REVISION_MISMATCH
HOLD_CURRENT_AUTHORITY_UNAVAILABLE
REJECT_TARGET_VALIDATION_FAILED
REJECT_CITATION_VALIDATION_FAILED
REJECT_CORRECTION_AUTHORITY_FAILED
HOLD_RECONCILIATION_REQUIRED
INVALID_REVISION_OWNER_STATE
COMMIT_OUTCOME_UNKNOWN
```

Exact runtime enum strings remain implementation work.

## 44. Failed candidate content durability

Do not persist ordinary semantic payload for failed operations by default:

```text
raw invalid edit
DENY/HOLD text
failed append content
failed correction content
failed citation proposal labels
```

Bounded non-sensitive diagnostics may record reason metadata.

Physical staged bytes remain uncommitted orphan residue under D2-1.

## 45. Commit failure rollback semantics

A failed semantic admission does not rewrite an old revision.

```text
commit not admitted
→ old committed head remains authoritative
```

No compensating mutation of Rn is allowed.

Cleanup may reclaim only proven uncommitted staging residue.

## 46. Presentation failure after commit

Presentation is downstream of semantic commit.

If:

```text
revision committed + head advanced
presentation reconciliation fails
```

then:

```text
semantic commit remains committed
presentation reports failure / retries presentation safely
```

Forbidden:

```text
UI mount failed
→ rewrite revision store backward
```

## 47. Ambiguous commit response

If the caller cannot determine whether the owner commit succeeded:

```text
COMMIT_OUTCOME_UNKNOWN
```

Do not blindly retry the mutation against the same expected revision.

Recovery must re-read authoritative revision-owner state first.

## 48. Ambiguous outcome recovery

A future implementation may reserve a non-reused candidate revisionRef for the current synchronous attempt.

Recovery may ask the authoritative owner whether that exact reserved ref became committed and how it binds.

Because revision refs are owner-unique/non-reused inside the stale horizon, this can distinguish committed admission from inert candidate residue without using UI state.

If outcome still cannot be proven:

```text
fail closed
```

## 49. No automatic retry after head advance

If authoritative recovery shows another head is now current and the candidate did not commit:

```text
old operation request
→ stale
```

The caller must start a new current evaluation from the new head.

No silent patch replay.

## 50. Separate operation token reassessment

First synchronous D2-2 does not require a generic durable operation token when:

```text
expectedRevision double-check
+
owner-unique candidate revision reservation when needed
+
owner-atomic commit
```

prove stale safety.

If a late async callback can still mutate after the request lane is gone, that becomes a C8 / operation-authority-token trigger and must be designed separately.

## 51. Mutation receipt

A bounded ephemeral result may conceptually contain:

```text
pageIdentity
operationKind
expectedRevision
outcome
resultingRevisionRef?  # only on proven commit
currentRevisionRef?    # on no-op/current resolution when safe
reasonCode?
```

It contains no raw rejected/quarantined content.

The receipt is not mutation authority and does not enter future model context automatically.

## 52. Commit receipt does not make revision current forever

Even a successful receipt proves only the outcome of that commit attempt.

A later operation may advance the head.

```text
receipt says R8 committed
!= R8 is current now forever
```

Current use always resolves authoritative head/current support again.

## 53. Citation role laundering blocker

Forbidden:

```text
REPLACE_CITATION
→ operation changes role to DOCUMENTS_CORRECTION
→ no trusted allowedRoles check
```

Every changed citation relationship re-runs PK-4 authorization.

## 54. Reference-state laundering blocker

Forbidden:

```text
EDIT_ASSERTION payload referenceState = SETTLED_PUBLIC_REFERENCE
```

or:

```text
CORRECTION_UPDATE
→ status becomes corrected because operation name says so
```

All reference states remain validator-derived.

## 55. Target identity firewall

No mutation operation may rebind a revision to a different:

```text
pageIdentity
targetIdentityRef
lifetimeScopeRef
```

Changing logical target is not an edit of the same page.

## 56. Search / transcript firewall

A mutation target cannot be selected solely from:

```text
search snippet revision text
visible footnote number
host transcript card
old page title
text similarity
```

Search may resolve a logical page under PK-X2, after which current head and exact target assertion/citation must be re-resolved under D2-2.

## 57. Current unsupported head

If the current head cannot be used under current authority, D2-2 does not automatically fall back to an older revision.

An operation may repair the page only if it constructs a fully eligible next revision with all durable differences inside its authorized footprint.

Otherwise:

```text
HOLD_RECONCILIATION_REQUIRED
```

## 58. No hidden multi-operation transaction

One request may not quietly perform:

```text
EDIT assertion A
+ REMOVE assertion B
+ REPLACE citation C
```

unless a future explicit compound/bulk operation contract authorizes that footprint.

First D2-2 is one bounded operation per revision-producing intent.

## 59. Dormancy

When no current PK-D2 mutation operation is active:

```text
mutation candidate construction = 0
revision write = 0
head compare for mutation = 0
operation retry worker = 0
background reconciliation = 0
```

Durable revision capability does not create an always-on editor.

## 60. Implementation evidence blockers

Future runtime work must prove at least:

```text
concrete operation schemas/caps
exact operation authorization source
exact assertion addressing
unchanged-ordinal behavior
candidate materialization from committed head only
derived-field write rejection
full current revalidation
operation-footprint enforcement
semantic no-op canonicalization
pre/post validation expectedRevision checks
atomic committed-membership + head advance
ambiguous outcome recovery
orphan staging isolation
presentation failure isolation
failure payload nonpersistence
```

## 61. Blockers

Future implementation BLOCKER examples:

```text
MODEL_OR_UI_DIRECTLY_EDITS_REFERENCE_STATE
MUTATION_TRUSTS_OLD_VALIDATION
PK2_QUARANTINE_CAUSES_UNREQUESTED_DURABLE_MUTATION
STALE_VALIDATED_CANDIDATE_COMMITS_AFTER_HEAD_ADVANCE
NO_OP_CREATES_REVISION_SPAM
CITATION_OPERATION_EDITS_TRUSTED_CITATION_METADATA
CORRECTION_OPERATION_SELF_DECLARES_CORRECTED_STATUS
FAILED_CANDIDATE_ENTERED_REVISION_HISTORY
PRESENTATION_FAILURE_ROLLED_BACK_COMMITTED_HISTORY
AMBIGUOUS_COMMIT_BLINDLY_RETRIED
```

## 62. Candidate C status

```text
C1 = SELECTED BY PK-D2
C2 = SELECTED BY PK-D2
C3 = SELECTED BY PK-D2 DESIGN
C4 = SELECTED BY PK-D2 DESIGN
C5 = CLOSED
C6 = CLOSED
C7 = CLOSED
C8 = CLOSED
```

No operation here authorizes historical display, context re-entry, cross-family mutation lineage, or delayed attachment.

## 63. D2-3 handoff

D2-2 freezes the common mutation/commit gate.

Next checkpoint:

```text
D2-3 REVISION READ / COMPARE / RESTORE
```

D2-3 must define:

```text
old revision exact read eligibility
bounded revision listing
compare eligibility / diff semantics
RESTORE_AS_NEW_REVISION source selection
how restore candidate enters the D2-2 commit gate
C7 firewall
```

## 64. Final contract

```text
PK-D2 D2-2
= ONE CURRENT AUTHORIZED OPERATION
+ EXACT EXPECTED REVISION
+ COMPLETE OWNER-MATERIALIZED NEXT SNAPSHOT
+ FULL CURRENT REVALIDATION
+ EXPLICIT OPERATION FOOTPRINT
+ SEMANTIC NO-OP SUPPRESSION
+ FINAL EXPECTED-REVISION CHECK
+ OWNER-ATOMIC COMMIT

DESIGN = FROZEN
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
RELEASE = NOT AUTHORIZED
```
