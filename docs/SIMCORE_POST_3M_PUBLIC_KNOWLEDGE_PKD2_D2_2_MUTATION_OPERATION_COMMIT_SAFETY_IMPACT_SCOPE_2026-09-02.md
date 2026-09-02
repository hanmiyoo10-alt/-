# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 D2-2 Mutation Operation / Commit Safety Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **D2-2 IMPACT SCOPE COMPLETE · DESIGN-ONLY · OPERATION / CANDIDATE / VALIDATION / COMMIT SEAM SELECTED · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · D2-2 · MUTATION · COMMIT SAFETY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D2-0 selected a linear single-head revision chain with full validated semantic snapshots.
D2-1 froze immutable committed revision records, owner-controlled committed membership, one authoritative mutable current head, bootstrap semantics, orphan residue, and expected-revision safety.

D2-2 must define the first semantic mutation seam without allowing operation inputs to become authority-bearing patches.

Selected seam:

```text
OWNER_AUTHORIZED_OPERATION_REQUEST
→ EXACT CURRENT HEAD / EXPECTED REVISION
→ OWNER-MATERIALIZED COMPLETE NEXT SNAPSHOT
→ CURRENT PK / SUPPORT / EXPOSURE / SETTLEMENT / CITATION VALIDATION
→ SEMANTIC NO-OP CHECK
→ OWNER-ATOMIC COMMIT
```

This document implements no mutation engine, store, UI action, DOM/CSS, prompt change, model call, network call, release transaction, or `release-simcore` change.

## 1. Authority inputs

D2-2 consumes without reopening:

```text
D2-0 Revisioned Page Master
D2-1 Revision Record / Current Head
PK-2 PUBLIC_KNOWLEDGE Document Validator
PK-4 Citation / Provenance Boundary
PK-X1 durable page identity / current-view contracts
Candidate C CC-2 revision / operation stale-safety
current source support / Exposure / settlement authority
```

Canonical separation:

```text
OPERATION INTENT
!= NEXT SEMANTIC STATE
!= VALIDATED CANDIDATE
!= COMMITTED REVISION
```

## 2. First operation vocabulary

Keep the D2-0 first-scope operations:

```text
EDIT_ASSERTION
APPEND_ASSERTION
REMOVE_ASSERTION
APPEND_CITATION
REPLACE_CITATION
CORRECTION_UPDATE
RESTORE_AS_NEW_REVISION  # detailed read/restore semantics remain D2-3
```

D2-2 focuses commit safety for all revision-producing operations and fully details the ordinary edit/append/remove/citation/correction classes.

Not authorized here:

```text
WHOLE_PAGE_DELETE_RETIRE
BULK_MUTATE
AUTO_MERGE
REBASE_HISTORY
SQUASH_HISTORY
CROSS_FAMILY_MUTATE
MEDIA_REPLACE
```

## 3. Operation request is a bounded proposal

Conceptual common request envelope:

```text
pageIdentity
expectedRevision
operationKind
operationPayload
current operation authority / request binding when required
```

The request may identify what the user intends to change, but may not self-declare:

```text
referenceState
settlement state
claimSupportRef truth
citation authority
isValid
isCommitted
safeToRender
current head
```

## 4. Editable vs derived authority

D2-2 selects a least-authority field rule.

Producer/user-editable semantic inputs may propose only fields already producer-owned by PK-2/PK-4, such as bounded assertion content, sectionKind/mode where the specific operation permits them, and citation attachment requests.

The following remain trusted/validator-derived and are never directly editable operation fields:

```text
pageIdentity
targetIdentityRef
sourceAuthorityRef as trusted authority
referenceState
final disposition
settlement result
claimSupportRef authority
trusted citation metadata
citation allowedRoles
validator receipts
committed membership
revisionRef
current head
```

If a semantic edit requires one of these values to change, current authority must re-derive/re-join it during validation.

## 5. Complete next snapshot, not durable patch semantics

Every accepted operation must materialize a complete candidate next-page semantic snapshot from:

```text
exact committed current head snapshot
+
explicit operation intent
```

before validation.

A patch may be an input convenience only.

Canonical rule:

```text
OMITTED FIELD
!= DELETE FIELD
```

No durable semantic state is reconstructed from an ambiguous partial patch log.

## 6. Assertion addressing

D2-2 must address an existing assertion by exact owner-recognized current-revision identity.

For first scope, an exact current assertion ordinal may be used only when bound to:

```text
pageIdentity
+ expectedRevision
+ assertionOrdinal
```

An ordinal alone is not cross-revision identity.

No fuzzy match by text, section position, title, or similarity.

## 7. EDIT_ASSERTION impact

An edit must identify one exact assertion in the expected current revision and propose bounded producer-owned replacement semantic fields.

The owner constructs the complete next snapshot and the edited assertion must pass the full current PK-2 authority/settlement pipeline again.

Editing content does not preserve old validation, referenceState, settlement, or citation attachment eligibility automatically.

## 8. APPEND_ASSERTION impact

An append proposes one bounded new assertion semantic input.

It must receive a new current-revision structural ordinal/identity according to owner policy and pass the full PK validator independently.

Old page validity does not trust the appended assertion.

## 9. REMOVE_ASSERTION impact

Removal must target one exact current assertion under the expected revision.

Deletion by omission is forbidden.

The resulting complete next snapshot must remain structurally valid after explicit removal.

Removing an assertion also removes its renderable citation attachments from the candidate next revision unless independently reattached to a surviving exact assertion through valid PK-4 joins.

## 10. Citation mutation impact

Citation attachment operations affect visible support relationships, not claim truth directly.

`APPEND_CITATION` / `REPLACE_CITATION` may propose only bounded attachment relations such as:

```text
assertionOrdinal
citationRef
role
```

They may not edit trusted citation sourceLabel/recordLabel/claimSupportRef/allowedRoles.

Every changed attachment must re-pass exact claim-support join and role/reference-state compatibility.

Citation mutation failure does not by itself rewrite assertion semantics.

## 11. Correction update impact

`CORRECTION_UPDATE` is not a freeform status toggle.

It may commit only when current trusted settlement/correction authority supports the resulting corrected PUBLIC_KNOWLEDGE state.

Forbidden:

```text
operationKind = CORRECTION_UPDATE
→ force referenceState = CORRECTED_CURRENT_RECORD
```

The corrected state remains validator-derived.

## 12. Validation ordering seam

Selected conceptual order:

```text
1 exact pageIdentity / active lifetime
2 authoritative current head
3 expectedRevision exact compare
4 operation authorization / structural payload validation
5 materialize complete candidate snapshot
6 PK-2 structural + authority validation
7 current source support / Exposure
8 current settlement joins / final reference states
9 current citation/provenance validation where relevant
10 semantic no-op comparison against current committed head
11 re-check authoritative head / expectedRevision
12 owner-atomic committed membership + head advance
13 presentation reconciliation
```

The second head check is mandatory because validation may take time.

## 13. Stale-after-validation firewall

A candidate validated while head was R7 does not remain commit-eligible if head becomes R8 before commit.

```text
validated candidate against R7
+ current head changed to R8
→ REVISION_MISMATCH
→ no commit
```

No silent rebase or automatic reapplication to R8.

## 14. Semantic no-op rule

Selected default:

```text
candidate validated semantic state
== current committed semantic state under owner-defined exact semantic equivalence
→ NO_OP
→ no new committed revision
→ head unchanged
```

This prevents revision spam from repeated identical edits/replacements.

No-op comparison must ignore purely ephemeral presentation numbering/cache state, but it must not ignore semantic citation relationships or validator-derived public-reference status that belong to the committed revision contract.

Exact canonicalization details remain a D2-2 design child concern, not runtime implementation here.

## 15. Failed operation durability

Failed operations do not become revisions.

Do not durably retain ordinary semantic payloads for:

```text
invalid edit drafts
DENY/HOLD candidate text
stale operation candidates
failed citation proposals
failed correction candidates
```

Bounded diagnostics may record non-sensitive reason metadata according to existing policy.

Candidate staging residue remains governed by D2-1 orphan rules.

## 16. No rollback by rewriting an old revision

If commit is not admitted:

```text
old committed head remains authoritative
```

No compensating edit of a committed revision is allowed.

If backend staging occurred, cleanup reclaims only proven uncommitted residue.

## 17. Commit atomicity

D2-2 inherits D2-1 owner-atomic semantics:

```text
OLD: current head remains, candidate not committed
OR
NEW: complete candidate admitted as immutable revision + head points to it
```

No visible intermediate semantic success state.

## 18. Operation retry

A retry is a new current operation evaluation unless a future exact idempotency contract proves same-attempt replay safety.

A stale failed request must not be blindly replayed after head advance.

D2-2 does not open C8 or generic delayed operation attachment.

## 19. Derived-field laundering blockers

BLOCKER examples:

```text
EDIT_ASSERTION directly sets referenceState
CORRECTION_UPDATE directly sets settlement state
citation operation writes claimSupportRef authority
model-provided isCommitted promotes candidate
operation overwrites pageIdentity / targetIdentityRef
validator result copied from prior revision without current revalidation
```

## 20. No-op and audit semantics

A no-op may emit an ephemeral operation result/receipt but is not a revision event.

```text
NO_OP
!= COMMITTED REVISION
```

If product later requires every attempted edit to appear in an audit history, that is a separate operation-log/audit product and must not be smuggled into revision history.

## 21. Candidate C profile

D2-2 does not widen D2-0/D2-1:

```text
C1 = YES
C2 = YES
C3 = YES, design capability
C4 = YES, design capability
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

## 22. Runtime blockers reserved for future implementation

Before implementation may be called ready, future work must freeze/prove at least:

```text
concrete operation schemas and caps
assertion exact addressing representation
semantic-equivalence/no-op algorithm
operation authorization owner
candidate materialization ownership
expected-revision double-check
atomic commit primitive
bounded failure diagnostics
orphan staging cleanup
field-ownership tests
citation mutation revalidation tests
correction authority tests
```

## 23. D2-2 detailed design questions

The detailed design should freeze:

```text
exact operation payload ownership
assertion identity/addressing rules
per-operation candidate transformations
no-op equivalence boundary
failure outcome taxonomy
commit receipt boundary
whether any synchronous operation needs an additional operation token beyond expectedRevision
```

## 24. Scope verdict

```text
SELECT
D2_2_CURRENT_HEAD_TO_COMPLETE_VALIDATED_NEXT_SNAPSHOT_COMMIT_GATE

KEY FIREWALLS
OPERATION INPUT != AUTHORITY
VALIDATED CANDIDATE != COMMITTED REVISION
DERIVED FIELDS ARE RE-DERIVED, NOT EDITED
STALE AFTER VALIDATION = REJECT
SEMANTIC NO-OP = NO REVISION
```

D2-2 may proceed as a design-only detailed contract. Runtime implementation and release remain unauthorized.
