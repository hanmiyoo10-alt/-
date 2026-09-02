# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D2 Revisioned Page Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-D2 IMPACT SCOPE FROZEN · REVISIONED PAGE CONSUMER · C1+C2+C3+C4 ONLY · C5-C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D2 · REVISIONED_PAGE · IMPACT SCOPE · CANDIDATE C · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-X1 converged a durable PUBLIC_KNOWLEDGE page identity with current-only semantic content. PK-X2 subsequently converged active-lifetime public-reference search over durable page identity without creating semantic history.

The selected next product requirement is now explicit:

```text
same durable PUBLIC_KNOWLEDGE page
+ semantic content may evolve through authorized edits/appends/corrections/restores
+ prior committed revisions must remain addressable inside a bounded revision chain
```

This is the PK-5 future profile `PK-D2 REVISIONED_PAGE`.

This impact scope identifies the narrowest owner seam before any detailed design. It implements no revision store, page edit UI, mutation engine, prompt change, model/network call, DOM/CSS, runtime persistence, release transaction, or `release-simcore` change.

## 1. Fresh authority inputs

Relevant frozen inputs:

```text
PK-X1 / PX1-0..5
→ durable pageIdentity
→ immutable page identity record
→ active conversation lifetime
→ current-view revalidation
→ stale semantic fallback forbidden

PK-X2 / X2-0..5
→ active-lifetime page discovery/search
→ search locates pages, not revision history

PK-5
→ PK-D2 requires C1+C2+C3+C4
→ C6/C7/C8 not implied

Candidate C CC-2
→ same object ID != same revision
→ expected-revision / operation-currentness contract

Candidate C CC-3
→ bounded owner-scoped storage
→ full revision archive is opt-in
→ current support must be re-proven at use

Candidate C CC-5
→ explicit semantic operation taxonomy
→ validate before durable commit
→ no silent stale refresh / generic merge
```

## 2. Selected capability profile

PK-D2 impact profile:

```text
C1 cross-turn survival        = YES
C2 stable derived identity    = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 future context re-entry    = NO
C7 historical survival        = NO
C8 delayed effect targeting   = NO
```

Canonical rule:

```text
PK-D2 OPENS C3+C4
!=
PK-D3 / PK-D4 / C5 / C8 AUTOMATICALLY OPEN
```

## 3. Primary selected seam

Selected architecture seam:

```text
PK-X1 DURABLE PAGE IDENTITY
+
OWNER-SCOPED CURRENT REVISION HEAD
+
BOUNDED IMMUTABLE COMMITTED REVISION SNAPSHOTS
+
EXPECTED-REVISION MUTATION COMMIT
+
CURRENT SUPPORT / EXPOSURE / SETTLEMENT REVALIDATION
```

The page identity owner remains separate from the revision semantic owner.

```text
pageIdentity
= which logical public-reference page?

pageRevision
= which committed semantic state of that page?
```

## 4. Revision archive is explicitly opt-in here

CC-3 defaults mutable durable objects to latest committed state only.

PK-D2 is the concrete consumer that justifies a bounded revision chain because the selected product requirement includes:

```text
inspect a previous committed revision
compare bounded revisions
restore an old eligible revision as a new current revision
```

Therefore PK-D2 may retain immutable committed revision snapshots, subject to explicit count/byte/lifetime caps before runtime authorization.

This does not select universal event sourcing or unbounded history.

## 5. Durable record separation

The existing PX1-2 immutable identity record must not be expanded into a mutable wiki row.

Conceptual separation:

```text
DurablePageIdentityRecord
→ pageIdentity / targetIdentityRef / lifetimeScopeRef
→ immutable identity shell

PublicKnowledgeRevisionHead
→ pageIdentity / currentRevisionRef
→ mutable owner-scoped current head

PublicKnowledgeRevisionRecord
→ one immutable committed semantic revision
```

A physical backend may co-locate these records, but semantic ownership remains separate.

## 6. Minimum revision semantic payload

A revision may persist only already-validated/public semantic material required to reconstruct that committed public-reference state, for example:

```text
revisionRef
pageIdentity
previousRevisionRef or equivalent predecessor marker
validated section/assertion content
settlement states required by the visible revision
bounded visible citation/provenance references required by that revision
minimum current-source/support references required for later support-at-use checks
representation/schema version
```

Not admitted by default:

```text
raw model draft
DENY/HOLD payload
quarantined text
hidden Knowledge
presentation DOM/CSS
host transcript clone
operation token history
arbitrary validation diagnostics
```

## 7. Revision record immutability

Once a revision is committed:

```text
revision R
→ immutable semantic snapshot
```

Future edits create a new revision; they do not rewrite R in place.

Canonical rule:

```text
EDIT CURRENT PAGE
→ NEW REVISION
NOT MUTATE OLD REVISION BY PLACE
```

Physical compaction/migration remains separate and must preserve semantic revision meaning.

## 8. Current head is authoritative only for revision selection

The revision head answers:

```text
which committed revision is current for this page?
```

It does not answer:

```text
is the semantic content currently supported?
is it publicly exposable now?
is settlement still valid now?
```

Current semantic display/use still requires current support / Exposure / settlement / family validation.

## 9. Initial revision admission

An existing PK-X1 pageIdentity does not automatically gain a revision history from old host transcript or stale caches.

First PK-D2 revision creation requires:

```text
pageIdentity exact
+
current target identity exact
+
current lifetime ACTIVE
+
current PUBLIC_KNOWLEDGE semantic document valid
+
current support / Exposure / settlement valid
        ↓
commit initial revision R1-equivalent
```

Forbidden bootstrap sources:

```text
old transcript card
last-known-good cache
old unbound view
search snippet
model reconstruction of what the page probably used to say
```

## 10. First mutation operation set

The first PK-D2 operation vocabulary should be consumer-specific and bounded.

Selected initial classes:

```text
EDIT_ASSERTION
APPEND_ASSERTION
REMOVE_ASSERTION
APPEND_CITATION
REPLACE_CITATION
CORRECTION_UPDATE
RESTORE_AS_NEW_REVISION
```

This list does not authorize runtime actions yet.

Whole-page semantic delete/retire, arbitrary bulk mutation, cross-family mutation, async media replacement, and freeform generic merge remain outside first PK-D2 scope.

## 11. Every accepted semantic change creates a new revision

Default rule:

```text
same pageIdentity
+ owner-defined semantic state changes
→ revision advances
```

A semantic no-op may produce `NO_SEMANTIC_CHANGE` without advancing revision.

Presentation-only changes never advance revision.

## 12. Expected-revision write contract

A write-like operation based on current displayed state must carry or resolve an expected current revision.

Conceptual commit guard:

```text
pageIdentity P
expectedRevision Rn
        ↓
resolve current head
        ↓
head == Rn ? continue : REVISION_MISMATCH
```

No silent refresh to the newer head is allowed.

## 13. Validate before commit

A candidate mutation must be revalidated before becoming durable.

Required conceptual ordering:

```text
exact page + expected revision
→ prove current lifetime / target / operation authority
→ construct candidate page state
→ run current PK semantic validation
→ run current support / Exposure / settlement checks
→ re-check revision currentness
→ commit immutable new revision
→ advance head
→ reconcile current presentation
```

Old revision validity does not grant the new candidate validity.

## 14. Commit consistency

A committed result must not expose mixed state such as:

```text
head = R8
but R8 payload absent

or
new R8 semantic payload
+ stale settlement/citation/support metadata from R7
```

Future backend must provide owner-scoped atomicity/consistency sufficient for:

```text
new revision record admission
+
current head advance
```

Exact storage technology is not frozen.

## 15. Failure before head advance

If candidate creation/validation/revision write fails before an atomic head advance:

```text
old head remains current
new candidate does not become ordinary current semantic state
```

A partially written orphan revision record, if physically possible, must not become discoverable as a committed revision merely because bytes exist.

A future backend should prevent or safely reclaim such residue.

## 16. Revision retrieval

Old revision retrieval must be exact and bounded.

Allowed conceptual key:

```text
pageIdentity + exact revisionRef
```

Forbidden fallback:

```text
similar old text
nearest timestamp
transcript search
semantic reconstruction
```

## 17. C7 remains closed

PK-D2 does not authorize old revision semantics to remain displayable after the supporting authority has been replaced or invalidated in a way that no longer supports that revision.

Therefore old revision inspection requires then-current support/use policy.

```text
old revision exists physically
!=
old revision may be displayed now
```

If a future requirement says:

```text
"show exactly what the page said back then even though current authority changed"
```

that escalates to:

```text
PK-D3 HISTORICAL_PAGE
→ C7
```

## 18. Restore is a fresh mutation, not time travel

`RESTORE_AS_NEW_REVISION` means:

```text
select exact prior revision Rold
→ copy only its eligible semantic candidate shape
→ re-prove current support / Exposure / settlement
→ validate under current schema/policy
→ commit as NEW current revision Rnew
```

Forbidden:

```text
head pointer simply moves backward to Rold
```

unless a later stronger contract proves that safe. The first design preserves monotonic committed revision history.

## 19. Compare does not create semantic authority

A comparison surface may compute differences only between revision contents currently eligible for inspection.

```text
diff rendering
!=
new semantic revision
!=
truth promotion
```

Comparison is presentation/inspection output, not a mutation unless the user starts a new authorized restore/edit operation from it.

## 20. Settlement/correction semantics

PUBLIC_KNOWLEDGE settlement state belongs to revision semantic state when it changes visible meaning.

Example:

```text
R3: ATTRIBUTED_BUT_NOT_SETTLED
R4: CORRECTED_CURRENT_RECORD
```

is a semantic revision when current authority validates that transition.

The old revision does not become canonical history merely because it remains stored.

## 21. Citation semantics

Visible citation/provenance changes are semantic when they change the public-reference support surface.

Therefore:

```text
append / replace / remove citation
→ validate under PK citation/provenance rules
→ new revision when accepted
```

A citation operation may not rewrite assertion truth by omission or silently clear unmaterialized fields.

## 22. Search integration boundary

PK-X2 search continues to locate logical pages, not historical revisions.

Default flow:

```text
search result
→ pageIdentity
→ resolve current head
→ current support/use validation
→ current page
```

Historical revision search/listing is not automatically added to PK-X2.

A future history-navigation surface may list bounded revisions for one exact page, but it must not turn global public-reference search into arbitrary revision-history search without separate design.

## 23. No model-context re-entry

PK-D2 does not change 3M-7 / Candidate C C6 policy.

```text
revision stored
!=
revision automatically injected into future model prompt
```

No revision body, diff, citation bundle, or edit history re-enters model context merely because it persists.

## 24. No derived-to-derived lineage

PK-D2 revisions are generations of the same PUBLIC_KNOWLEDGE page.

They are not C5 derived-parent edges by default.

```text
R7 → R8 predecessor relation
!=
BOARD/NEWS/SOCIAL derived lineage
```

Cross-family attributed propagation remains separate.

## 25. No delayed effects

PK-D2 first scope contains no delayed media/image/materialization result that attaches to an exact revision.

Such behavior would require C8 in addition to current PK-D2 gates.

## 26. Lifetime

Revision history inherits the page's bounded conversation lifetime unless a later child design selects a narrower bound.

At trusted lifetime end:

```text
page identity logically expires
current head/current view become unusable
revision archive becomes ordinary-inaccessible
owner-scoped cleanup/retention policy applies
```

Physical retention does not extend logical lifetime.

## 27. Bounded history requirement

Before runtime authorization, a concrete implementation design must freeze numeric or otherwise mechanically enforceable bounds for at least:

```text
max committed revisions per page
max semantic bytes per revision
max aggregate revision bytes per page
max citation/provenance entries per revision
max diff/compare output size
```

Unbounded revision accumulation is not authorized.

## 28. Dormancy

When no PK-D2 operation/history inspection is active:

```text
no revision scan
no history replay
no head write
no background compaction requirement from semantic owner
no model call
no prompt bytes
no automatic diff
```

Ordinary-turn cost remains zero semantic burden beyond the existing source orchestration gate.

## 29. First blocker set

Future implementation cannot claim PK-D2 readiness until it proves at least:

```text
B1 exact page identity / lifetime authority
B2 owner-scoped revision representation
B3 unique monotonic-or-equivalent revision currentness
B4 atomic new-revision + head-advance consistency
B5 expected-revision stale-write rejection
B6 validate-before-commit
B7 current support / Exposure / settlement revalidation
B8 bounded revision retention
B9 exact old-revision retrieval
B10 restore-as-new revalidation
B11 C7 firewall for unsupported historical content
B12 PK-X2 current-head search integration
B13 ordinary-turn dormancy
B14 feature-off / reload / lifetime-end cleanup behavior
```

## 30. Recommended PK-D2 child sequence

```text
D2-0  Revisioned Page Master Design
D2-1  Revision Record / Current Head Contract
D2-2  Mutation Operation / Commit Safety
D2-3  Revision Read / Compare / Restore Gate
D2-4  Settlement / Citation / Search Integration
D2-5  Lifetime / Bounds / Convergence
```

This impact scope selects D2-0 as the next design transaction.

## 31. Explicit deferred lanes

```text
DEFER · PK-D3 HISTORICAL_PAGE / C7
DEFER · PK-D4 CONTEXTUAL_DURABLE_PAGE / C6
DEFER · CROSS_FAMILY_DERIVED_LINEAGE / C5
DEFER · ASYNC_MEDIA_PER_REVISION / C8
DEFER · GLOBAL REVISION SEARCH
DEFER · WHOLE-PAGE DELETE / RETIRE
DEFER · BULK MULTI-REVISION TRANSACTION
DEFER · AUTOMATIC THREE-WAY MERGE
DEFER · UNBOUNDED EVENT SOURCING
```

## 32. Impact verdict

```text
PK_D2_REQUIREMENT          = CONCRETE
SELECTED_PROFILE           = C1+C2+C3+C4
REVISION_ARCHIVE           = BOUNDED / CONSUMER-OWNED
REVISION_RECORD            = IMMUTABLE AFTER COMMIT
CURRENT_HEAD               = MUTABLE OWNER-SCOPED POINTER
MUTATION_GUARD             = EXPECTED REVISION + CURRENT AUTHORITY
RESTORE                    = NEW REVISION AFTER REVALIDATION
C5                          = CLOSED
C6                          = CLOSED
C7                          = CLOSED
C8                          = CLOSED
RUNTIME_IMPLEMENTATION     = NOT AUTHORIZED
PRODUCTION                 = UNCHANGED
release-simcore            = UNCHANGED
NEXT                        = D2-0 REVISIONED PAGE MASTER DESIGN
```
