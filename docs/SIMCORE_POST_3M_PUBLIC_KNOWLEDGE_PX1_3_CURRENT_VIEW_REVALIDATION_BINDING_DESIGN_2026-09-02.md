# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-3 Current View Revalidation Binding Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-3 DESIGN FROZEN · EPHEMERAL CURRENT PAGE-VIEW BINDING · EXACT TARGET / IDENTITY / SOURCE JOINS · CURRENT PK-2 SEMANTICS ONLY · NO STALE SEMANTIC FALLBACK · SNAPSHOT FALLBACK SEPARATE · C1+C2 ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-3 · CURRENT VIEW · REVALIDATION · DURABLE IDENTITY / EPHEMERAL SEMANTICS SEPARATION**

## 0. Purpose

PX1-0 froze a durable PUBLIC_KNOWLEDGE page-identity shell.
PX1-1 froze stable target identity admission from an upstream owner.
PX1-2 froze minimal immutable page identity records and atomic resolve-or-mint.

PX1-3 freezes the exact contract that attaches a durable `pageIdentity` to one current PUBLIC_KNOWLEDGE view without granting the durable identity any authority over page semantics.

Canonical problem:

```text
pageIdentity survives across turns
+
page semantics must remain current-only
        ↓
how do we safely say
"this current validated document is the current view of page P"
without ever saying
"page P existed before, therefore old content may be reused"?
```

This is design-only. It implements no runtime binding object, storage backend, cache, renderer, DOM/CSS, prompt transport, model/network call, release, S7/v0.70.3, or `release-simcore` mutation.

## 1. Authority chain

PX1-3 consumes existing authorities without replacing them:

```text
current PUBLIC_KNOWLEDGE target authority
→ current targetRef + displayLabel

PX1-1 Stable Target Identity Adapter
→ current exact targetIdentityRef admission

PX1-2 Page Identity Owner
→ exact durable pageIdentity locator state

PK-2 PUBLIC_KNOWLEDGE Validator
→ current validated public-reference semantics

3M-6 Support-at-Use Gate
→ current source-authority support

PK-3 Presentation + PK-4 Citation
→ current render-instance presentation/evidence effects
```

Canonical separation:

```text
PAGE IDENTITY AUTHORITY
!=
TARGET SAMENESS AUTHORITY
!=
CURRENT DOCUMENT SEMANTIC AUTHORITY
!=
CURRENT SOURCE SUPPORT AUTHORITY
!=
PRESENTATION EFFECT AUTHORITY
```

## 2. Final architecture decision

Selected architecture:

```text
EPHEMERAL_CURRENT_PUBLIC_REFERENCE_PAGE_VIEW_BINDING
+
EXACT_TARGET_IDENTITY_JOIN
+
EXACT_DURABLE_IDENTITY_JOIN
+
CURRENT_SOURCE_SUPPORT_AT_USE
+
CURRENT_PK2_RENDERABLE_DOCUMENT_ONLY
+
NO_STALE_SEMANTIC_FALLBACK
```

Conceptual flow:

```text
current target context
        ↓
PX1-1 READY_EXACT targetIdentityRef
        ↓
PX1-2 exact identity resolution
        ↓
current PK producer → PK-2 validation
        ↓
3M-6 support-at-use = SUPPORTED_CURRENT
        ↓
PX1-3 exact binding gate
        ↓
BOUND_CURRENT
        ↓
current presentation / citation
```

## 3. The binding is ephemeral

PX1-3 current-view binding exists only for the current activation/request authority.

It is not stored as durable page state.

Canonical rule:

```text
DURABLE IDENTITY
+
EPHEMERAL CURRENT VIEW
```

not:

```text
DURABLE PAGE CONTENT
```

## 4. Binding conceptual output

PX1-3 freezes a semantic envelope, not a runtime serialization:

```text
CurrentPublicReferencePageViewV1
  pageIdentity
  targetIdentityRef
  lifetimeScopeRef
  currentTargetContext
  validatedDocument
  bindingState = BOUND_CURRENT
```

The physical runtime may carry object references rather than copy these structures.

The important contract is that the envelope contains only **current** trusted/validated inputs.

## 5. Explicit non-fields

The current binding does not durably or independently own:

```text
old page body
old displayLabel
old sourceAuthorityRef
old settlement basis
old citation bundle
old renderer tree
last-known-good semantic payload
revision number
historical timestamp
semantic cache payload
```

It also does not introduce a new world-state version.

## 6. Binding-state vocabulary

PX1-3 freezes these conceptual top-level states:

```text
BOUND_CURRENT
UNBOUND_CURRENT
SNAPSHOT_ONLY_CURRENT
```

### `BOUND_CURRENT`

A durable `pageIdentity` is safely attached to a current renderable PK-2 document under current support.

### `UNBOUND_CURRENT`

A durable current-page view cannot be established.
The durable identity may still exist.

### `SNAPSHOT_ONLY_CURRENT`

Current PK-2 semantics may be shown through the pre-existing non-durable snapshot path when explicitly permitted, but no durable `pageIdentity` is attached to that view.

## 7. Reason-code vocabulary

`UNBOUND_CURRENT` / `SNAPSHOT_ONLY_CURRENT` may carry bounded non-semantic reason codes such as:

```text
TARGET_IDENTITY_NOT_READY
TARGET_IDENTITY_UNSUPPORTED
TARGET_IDENTITY_CONFLICT
IDENTITY_STATE_UNAVAILABLE
IDENTITY_STATE_CORRUPT
IDENTITY_KEY_MISMATCH
LIFETIME_SCOPE_MISMATCH
PK_DOCUMENT_NOT_BINDABLE
SOURCE_SUPPORT_UNAVAILABLE
SOURCE_SUPPORT_MISMATCH
UNSUPPORTED_SCOPE
```

No reason requires copying old semantic page content.

Exact runtime enum spelling remains future implementation authority.

## 8. Required target joins

`BOUND_CURRENT` requires exact target agreement across current authorities:

```text
current target context.targetRef
== validatedDocument.targetRef

PX1-1 current targetIdentityRef
== PX1-2 record.targetIdentityRef

current lifetimeScopeRef
== PX1-2 record.lifetimeScopeRef

PX1-2 record.namespace
== PUBLIC_KNOWLEDGE_DOCUMENT
```

No display-label, title, alias, similarity, or history heuristic participates.

## 9. PageIdentity reverse lookup is not target proof

Forbidden:

```text
pageIdentity P existed for target T before
→ therefore current target is T
```

Correct direction:

```text
current target authority
→ PX1-1 targetIdentityRef T
→ PX1-2 exact key resolves pageIdentity P
```

Canonical rule:

```text
CURRENT TARGET PROVES IDENTITY LOOKUP
OLD PAGE ID DOES NOT PROVE CURRENT TARGET
```

## 10. Existing identity does not prove current semantics

When PX1-2 returns `FOUND_EXISTING`:

```text
page continuity is proven
```

only.

It does not prove:

```text
current source support
current exposure
current settlement
current page body
current citations
current display label
```

All current semantic authorities run again.

## 11. Newly minted identity does not freeze the creating document

When PX1-2 returns `MINTED_NEW`, the creating activation had first-mint eligibility.

That means metadata creation was valid at that moment.

It does not make the creating document permanently reusable.

Even in the same activation, PX1-3 requires final current support before binding.

If support becomes unavailable/mismatched after mint but before ordinary presentation:

```text
pageIdentity remains minted
current durable page view = UNBOUND_CURRENT
```

No rollback of identity is implied by semantic presentation failure.

## 12. PK-2 document bindability

PX1-3 ordinary durable current-view binding requires a current PK-2 document with accepted semantic content.

First-scope mapping:

```text
PK-2 VALID
→ bindable candidate

PK-2 VALID_WITH_QUARANTINE
→ bindable candidate using accepted content only

PK-2 VALID_EMPTY
→ UNBOUND_CURRENT / PK_DOCUMENT_NOT_BINDABLE

PK-2 QUARANTINED
→ UNBOUND_CURRENT

PK-2 INVALID
→ UNBOUND_CURRENT

PK-2 UNSUPPORTED_SCOPE
→ UNBOUND_CURRENT
```

No quarantined payload is copied into the binding.

## 13. Why `VALID_EMPTY` does not bind ordinary content

A durable identity may legitimately outlive a moment where no currently accepted public-reference assertion exists.

PX1-3 therefore preserves:

```text
pageIdentity exists
+
no current renderable article body
```

without restoring an old article.

Presentation treatment of an empty durable shell is deferred to PX1-4.

## 14. Source support must be current at use

PK-2 already includes current authority validation during document validation.

PX1-3 still requires the frozen 3M-6 support-at-use predicate at the actual current binding boundary.

Required state:

```text
SUPPORTED_CURRENT
```

Any other support result blocks binding.

Canonical rule:

```text
VALIDATED EARLIER IN THE ACTIVATION
DOES NOT CREATE A RIGHT TO PRESENT
AFTER CURRENT SUPPORT IS LOST
```

## 15. No duplicate source resolver

PX1-3 does not rescan chat/history to rediscover source support.

Required flow:

```text
Lineage / Handoff / Evidence owners
→ current trusted SourceAuthorityContext
→ 3M-6 support predicate
→ PX1-3
```

Forbidden:

```text
PX1-3
→ search old messages
→ guess matching B root
```

## 16. Current source mismatch invalidates the view, not the identity

If a B source is rerolled/edited and current support differs:

```text
old current view
→ no longer current

pageIdentity
→ remains the same durable logical page identity
```

The next eligible activation may generate a new current view under the same pageIdentity if target identity still matches.

## 17. No stale semantic fallback

When binding cannot be established, the following recovery paths are forbidden:

```text
show last-known-good document
show old document with a small stale badge
show old citations
show old title from identity storage
show old settlement state
retain old semantic DOM because new validation failed
reuse old page-body cache keyed by pageIdentity
```

Canonical rule:

```text
NO CURRENT SUPPORT / NO CURRENT VALIDATION
→ NO CURRENT SEMANTIC PAGE BODY
```

## 18. Why a stale badge is not enough

Displaying an old semantic document with `stale` or `outdated` decoration still exposes semantic content that is not currently authorized.

That would activate a historical-survival/revision product contract not present in PK-X1.

Therefore:

```text
STALE-BUT-VISIBLE SEMANTIC PAGE
= NOT AUTHORIZED IN PX1-3
```

Historical page views belong to a future explicit revision/archive design.

## 19. Semantic presentation cleanup contract

If a mounted durable page had `BOUND_CURRENT` content and a later current activation for that same logical page fails binding:

```text
old semantic content must cease to be presented as the current page
```

Allowed future presentation effects:

```text
unmount semantic content
clear/replace semantic subtree
show a bounded non-semantic unavailable state when PX1-4 authorizes it
```

Forbidden:

```text
leave old article mounted because no replacement arrived
```

## 20. Page shell is not semantic content authority

PX1-3 does not decide whether a future presentation host may keep a non-semantic page shell while content is unavailable.

PX1-4 owns that presentation decision.

However any retained shell must not carry stale:

```text
body
citation
settlement badge
old display label presented as current
```

unless current trusted contexts independently supply them.

## 21. PageIdentity is not a semantic cache key

Caches/components may use `pageIdentity` to identify the logical page surface.

They may not use `pageIdentity` alone to decide semantic content reuse.

Canonical unsafe pattern:

```text
cache[pageIdentity] = validatedDocument
```

followed later by:

```text
same pageIdentity
→ return cached document before current validation
```

That is forbidden.

## 22. Cache authority

If a future implementation caches current semantic material for performance, the cache is only an effect optimization.

It must be guarded by the exact current binding authority and may be discarded at any time.

```text
CACHE HIT
!=
CURRENT VIEW AUTHORITY
```

The first PK-X1 design does not require such a cache.

## 23. Current display label

Visible page title remains derived from current trusted `PublicKnowledgeDocumentTargetContext.displayLabel` through presentation.

It is not stored in PX1-2 identity state.

Legal:

```text
same pageIdentity P
Turn A displayLabel = Old Name
Turn B displayLabel = New Name
```

when PX1-1 upstream identity authority says the target is the same.

## 24. Citation freshness

PK-4 citation/provenance is current projection/render material.

Therefore:

```text
same pageIdentity
→ does not preserve citation ordinal / citation marker / citation bundle
```

Every `BOUND_CURRENT` view must obtain citation material from the current validated/public-reference evidence path.

Old citation markers are not durable children of pageIdentity in PK-X1.

## 25. Settlement freshness

A persistent page identity does not preserve settlement state.

Example:

```text
Turn 20
pageIdentity P
claim X = ATTRIBUTED_BUT_NOT_SETTLED

Turn 80
same pageIdentity P
claim X = CORRECTED_CURRENT_RECORD
```

is legal when current PK-1/PK-2 authority supports it.

PX1-3 persists neither state.

## 26. Same identity, different current document

The intended semantic behavior is:

```text
pageIdentity P
        ↓
current activation A → current document A
current activation B → current document B
current activation C → no current document
```

All three may be correct without page revision semantics.

## 27. No revision semantics

PX1-3 does not introduce:

```text
revisionId
revisionOrdinal
previousRevision
latestRevision
restore
compare
history chain
```

Different current projections under one pageIdentity are not called revisions by this contract.

A future `PK-D2 REVISIONED_PAGE` must explicitly open C3/C4/C7 as needed.

## 28. Snapshot fallback policy

PX1-3 preserves non-durable baseline PUBLIC_KNOWLEDGE as a distinct current path.

Conceptual snapshot fallback is permitted only when:

```text
current PK-2 document itself is valid/renderable
+
source support is current
+
product/orchestration policy explicitly permits non-durable fallback
```

The snapshot result carries no durable `pageIdentity` presentation semantics.

## 29. Snapshot fallback for unsupported target identity

If PX1-1 returns:

```text
UNSUPPORTED_TARGET_IDENTITY
```

then:

```text
PK-X1 durable page = unavailable
baseline current snapshot PK = may remain available
```

This is the cleanest expected fallback case.

## 30. Snapshot fallback for transient identity-state unavailability

If current semantics are independently valid but PX1-2 authoritative identity state is temporarily unavailable:

```text
IDENTITY_STATE_UNAVAILABLE
```

an explicitly authorized product policy may degrade to a **non-durable current snapshot**.

Requirements:

```text
no pageIdentity claim
no mint attempt
no cache miss treated as NOT_FOUND
no durable UI continuity promise
```

This is optional fallback behavior, not mandatory.

## 31. Snapshot fallback forbidden on identity conflict/corruption

If identity authority is ambiguous/conflicting or the durable identity store is corrupt:

```text
TARGET_IDENTITY_CONFLICT
IDENTITY_STATE_CORRUPT
IDENTITY_KEY_MISMATCH
```

PX1-3 does not silently downgrade that durable job into an apparently healthy durable-like page.

A separate explicitly requested baseline snapshot job may still be semantically possible, but it is not an automatic recovery for corrupted durable identity state.

## 32. Snapshot fallback cannot rescue semantic invalidity

If:

```text
source support is stale
PK-2 document is invalid
Exposure denies the content
settlement is unknown/incompatible
```

then snapshot fallback is also unavailable for that content.

Canonical rule:

```text
DURABILITY FAILURE MAY DEGRADE TO SNAPSHOT
SEMANTIC AUTHORITY FAILURE MAY NOT
```

## 33. Current activation boundary

The binding is valid only inside the current activation/request authority.

PX1-3 does not define a durable binding receipt.

A future runtime may use an existing request/runtime generation token to reject stale presentation effects, but:

```text
runtime effect generation
!=
semantic page identity
```

PX1-3 does not open C8 merely to render synchronously bounded current content.

## 34. Delayed presentation effects

If a future Presentation Host can apply an effect after the current activation is superseded, the host must use its own stale-effect generation/ownership contract.

It must not infer freshness from `pageIdentity`.

If delayed semantic enrichment is later introduced, C8 must be explicitly reassessed.

## 35. Binding result construction order

Frozen semantic order:

```text
1. current target context exists
2. PX1-1 admission status is READY_EXACT
3. current lifetime scope matches admission
4. PX1-2 exact identity state resolves cleanly
5. identity record namespace matches
6. identity record targetIdentityRef exact-matches PX1-1
7. identity record lifetimeScopeRef exact-matches current lifetime
8. PK-2 current document status is bindable
9. validatedDocument.targetRef exact-matches current targetRef
10. validatedDocument sourceAuthorityRef is current supported scope
11. 3M-6 support-at-use returns SUPPORTED_CURRENT
12. derive BOUND_CURRENT
```

Any failed required step fails closed.

## 36. No natural-language join

PX1-3 never performs:

```text
title similarity
body similarity
same-name heuristic
same-citation heuristic
semantic embedding match
```

Machine authority joins are exact.

## 37. No whole-history scan

PX1-3 inputs are current bounded objects and exact identity lookup results.

Forbidden:

```text
scan prior PK pages to find last pageIdentity
scan transcript for old wiki-looking text
scan NEWS/BOARD/SOCIAL_FEED to refresh page content
```

This preserves 3M-9 bounded work and dormancy.

## 38. Dormancy

If no current durable PUBLIC_KNOWLEDGE page job exists:

```text
PX1-1 stable identity adapter work = 0
PX1-2 identity lookup = 0
PX1-3 current-view binding = 0
old page semantic scan = 0
```

No background page refresh is authorized.

## 39. Failure-class separation

PX1-3 preserves independent failure axes:

```text
TARGET IDENTITY FAILURE
→ cannot prove same canonical target

DURABLE IDENTITY FAILURE
→ cannot safely resolve page locator

SOURCE SUPPORT FAILURE
→ current semantic source not supported

PK VALIDATION FAILURE
→ current public-reference semantics not renderable

PRESENTATION FAILURE
→ current semantics valid but effect failed
```

No class is promoted into another for convenience.

## 40. Identity state corruption

If PX1-2 detects contradictory identity records:

```text
PX1-3 = UNBOUND_CURRENT
reason = IDENTITY_STATE_CORRUPT
```

It does not pick a pageIdentity based on current content similarity.

## 41. Target identity conflict

If PX1-1 has multiple trusted conflicting target identities:

```text
PX1-3 = UNBOUND_CURRENT
reason = TARGET_IDENTITY_CONFLICT
```

The existence of an old matching pageIdentity does not break the tie.

## 42. Source support loss after a previous successful view

Example:

```text
Turn 10
P → BOUND_CURRENT(document A)

B source edited/rerolled

Turn 20
P identity still found
old support ref no longer current
```

Required result:

```text
P → UNBOUND_CURRENT
old document A removed as current semantic view
```

A new document may later bind to P only after new current validation.

## 43. Current semantic quarantine does not delete identity

Example:

```text
Turn 10
pageIdentity P minted legitimately

Turn 30
current public-reference assertions all HOLD
```

Result:

```text
identity P remains
current durable semantic view = UNBOUND_CURRENT
```

No identity deletion follows from temporary semantic unavailability.

## 44. Page identity does not make public existence permanent truth

The fact that pageIdentity exists means only:

```text
a durable PUBLIC_KNOWLEDGE page identity was legitimately minted
for this target/lifetime under the first-mint gate
```

It does not mean:

```text
the target must always have current public-reference content
all old public claims remain public
all old citations remain valid
```

## 45. Privacy / leakage boundary

PX1-3 must never use an existing durable identity as justification to expose content currently denied/held.

Canonical rule:

```text
PAST PUBLIC ELIGIBILITY
DOES NOT OVERRIDE
CURRENT EXPOSURE / SETTLEMENT POLICY
```

## 46. Candidate C capability profile

PX1-3 retains exactly the PK-X1 profile:

```text
C1 cross-turn durable page identity = YES
C2 stable identity                  = YES
C3 item semantic mutation           = NO
C4 append/merge                      = NO
C5 derived-to-derived propagation   = NO
C6 model-context re-entry           = NO
C7 historical semantic survival     = NO
C8 delayed semantic effect target   = NO
```

No additional Candidate C gate is activated by current-view revalidation.

## 47. Consumer boundary to PX1-4

PX1-3 outputs one of:

```text
BOUND_CURRENT current durable page view
UNBOUND_CURRENT bounded status
SNAPSHOT_ONLY_CURRENT current non-durable semantics
```

PX1-4 may decide:

```text
page-shell lifetime
cleanup timing
unavailable-state presentation
current title/chrome behavior
DOM replacement rules
```

PX1-4 may not weaken PX1-3 semantic freshness rules.

## 48. Implementation blockers remain

Future runtime implementation still requires concrete owners for:

```text
current activation boundary
PX1-1 stable identity transport
PX1-2 authoritative atomic identity store
PK-2 sidecar production/transport
3M-6 current support runtime predicate
presentation host stale-effect cleanup
family/item hard caps
```

PX1-3 design completion does not authorize implementation.

## 49. Validation matrix for future runtime

Minimum future evidence must include:

```text
V1 existing page + current valid document → BOUND_CURRENT
V2 newly minted page + same current valid document → BOUND_CURRENT
V3 existing page + current VALID_EMPTY → UNBOUND, no old body
V4 existing page + current source mismatch → UNBOUND, old body cleared
V5 existing page + current exposure HOLD → UNBOUND/partial according to PK-2, no old assertion restore
V6 changed current displayLabel + same targetIdentityRef → same pageIdentity, new label
V7 identity store unavailable + current semantic valid → only explicit snapshot fallback, no pageIdentity
V8 identity corruption → fail closed, no automatic snapshot masquerade
V9 same pageIdentity across turns + changed citations → current citation bundle only
V10 no current PK-X1 job → zero identity/binding/history work
```

These are validation requirements, not evidence claims today.

## 50. Final invariants

PX1-3 freezes:

```text
PAGE IDENTITY SURVIVAL
!=
SEMANTIC CONTENT SURVIVAL

FOUND_EXISTING
!=
CURRENTLY RENDERABLE

MINTED_NEW
!=
PERMANENT SEMANTIC VALIDITY

SAME PAGE ID
!=
SAME BODY
!=
SAME TITLE
!=
SAME CITATIONS
!=
SAME SETTLEMENT STATE

NO CURRENT BINDING
→ NO STALE SEMANTIC FALLBACK

DURABILITY FAILURE
MAY DEGRADE TO EXPLICIT SNAPSHOT
BUT SEMANTIC AUTHORITY FAILURE MAY NOT
```

## 51. Checkpoint result

```text
PX1-0 Durable Page Identity Master        ✅
PX1-1 Stable Target Identity Adapter      ✅
PX1-2 Identity Record / Resolve-Mint      ✅
PX1-3 Current View Revalidation Binding   ✅ DESIGN FROZEN
PX1-4 Lifetime / Cleanup / Presentation   ← NEXT
PX1-5 Convergence / Candidate C Reassess
```

Runtime implementation remains **NOT AUTHORIZED**.