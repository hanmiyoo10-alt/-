# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X1 Durable Page Identity Master Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-X1 MASTER DESIGN FROZEN · DURABLE PAGE IDENTITY SHELL · C1+C2 CONSUMER PROFILE · CURRENT SEMANTICS REVALIDATED PER ACTIVATION · NO REVISION / MUTATION / REENTRY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · DURABLE_PUBLIC_REFERENCE_PAGE · CANDIDATE C · MASTER DESIGN**

## 0. Purpose

PK-6 converged PUBLIC_KNOWLEDGE V1 as a current-projection snapshot family and reserved `PK-X1 DURABLE_PUBLIC_REFERENCE_PAGE` as the first durable expansion lane.

The PK-X1 impact scope selected the narrow first seam:

```text
DURABLE_PUBLIC_REFERENCE_PAGE_IDENTITY_SHELL_V1
```

This master design freezes that seam.

The product goal is:

```text
same logical public-reference page
→ same addressable page identity later in the same bounded conversation scope
```

without allowing:

```text
old page text
old settlement state
old citations
old source support
```

to become durable truth authority.

This is design-only. No storage backend, runtime ID generator, parser, prompt transport, DOM/CSS, mutation engine, revision ledger, search index, model call, network call, or release change is implemented or authorized.

## 1. Authority chain

PK-X1 consumes, and does not replace:

```text
PK-0 settlement master
PK-1 settlement context authority
PK-2 document sidecar / validator
PK-3 presentation grammar
PK-4 citation / provenance boundary
PK-5 revision / durable page boundary
PK-6 family convergence
Candidate C durable-derived-object master design
```

Existing owners remain separate:

```text
Frame / Continuity / Time
→ canonical/current world semantics

Evidence / Lineage / Handoff
→ current exact support

3M-2 Exposure
→ public assertion eligibility

PK-1 Settlement Context
→ current public-record standing basis

PK-2 Validator
→ final current public-reference disposition

PK-3 / PK-4
→ presentation and optional citation provenance

PK-X1 Identity Owner
→ durable logical page identity only
```

Canonical rule:

```text
DURABLE IDENTITY OWNER
!=
WORLD TRUTH OWNER
!=
SETTLEMENT OWNER
!=
PAGE CONTENT OWNER
```

## 2. Candidate C profile

PK-X1 is the first PUBLIC_KNOWLEDGE expansion that intentionally consumes Candidate C capabilities.

Frozen design profile:

```text
C1 cross-turn derived-object survival = YES
C2 stable derived identity            = YES
C3 mutation                           = NO
C4 append / merge                     = NO
C5 derived lineage                    = NO
C6 context re-entry                   = NO
C7 historical partial survival        = NO
C8 delayed semantic effect            = NO
```

This means:

```text
PK-X1 DESIGN CONSUMES C1+C2
```

but:

```text
PK-X1 RUNTIME CAPABILITY = NOT AUTHORIZED
```

Opening C1+C2 does not implicitly open C3-C8.

## 3. Two-lifetime architecture

PK-X1 freezes two deliberately different lifetimes.

### 3.1 Durable logical identity lifetime

A small identity shell may survive across turns inside one bounded conversation scope.

### 3.2 Semantic page-view lifetime

Validated PUBLIC_KNOWLEDGE content remains current-projection-only.

Canonical relationship:

```text
DurablePublicReferencePageIdentityV1
        ↓ addressability only
Current PUBLIC_KNOWLEDGE projection
        ↓ freshly validated every activation
PUBLIC_REFERENCE_DOCUMENT_V1
```

Therefore:

```text
IDENTITY SURVIVAL
!=
CONTENT SURVIVAL
```

## 4. First durable object

Conceptual identity record:

```text
DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

Frozen semantic meaning:

### `schemaVersion`

Identity-record contract version only.

It is not a page revision number.

### `namespace`

First namespace:

```text
PUBLIC_KNOWLEDGE_DOCUMENT
```

### `pageIdentity`

Opaque durable derived identifier within the selected lifetime scope.

### `lifetimeScopeRef`

Opaque trusted reference to the bounded conversation/session scope that owns this identity.

### `targetIdentityRef`

Opaque trusted durable identity of the underlying page target, owned by an upstream target/canonical identity authority.

The identity record contains no assertion body, settlement state, citation body, title string, source-family history, or model context payload.

## 5. Explicit non-fields

The first durable identity record must not persist:

```text
page title text
section text
assertion content
referenceState
settlementBasisRef
citation bundle
citation markers
current sourceAuthorityRef
old sourceAuthorityRef
NEWS/BOARD/SOCIAL_FEED outputs
rendered HTML
renderInstanceKey
host message index
model response text
```

Reason:

```text
PK-X1 = durable identity
not durable semantic article history
```

## 6. Identity is explicit, never inferred

A page identity must not be derived from:

```text
displayLabel
title
targetRef string
content fingerprint
citation fingerprint
host transcript position
first successful source root
renderer key
```

Canonical rule:

```text
DURABLE PAGE IDENTITY MUST BE EXPLICITLY MINTED BY ITS OWNER
```

A content hash may prove equality for another bounded purpose, but cannot become page identity.

## 7. Three identities remain distinct

PK-X1 freezes a strict separation:

```text
targetRef
!=
targetIdentityRef
!=
pageIdentity
```

### `targetRef`

Current-projection exact-join reference used by existing PUBLIC_KNOWLEDGE validation.

### `targetIdentityRef`

Trusted upstream stable target identity usable across turns in the selected lifetime scope.

### `pageIdentity`

Derived PUBLIC_KNOWLEDGE page identity.

The page identity owner cannot create `targetIdentityRef` merely because it needs one.

## 8. Durable target requirement

PK-X1 durability is supported only when an upstream owner can provide a stable exact target identity.

Conceptual precondition:

```text
current target authority
→ exact trusted targetIdentityRef
```

If unavailable:

```text
snapshot PUBLIC_KNOWLEDGE may still work
but
PK-X1 durable identity = UNSUPPORTED / HOLD
```

This prevents the page registry from becoming a second entity resolver.

## 9. No title-based target recovery

Forbidden recovery path:

```text
no stable target identity
→ compare page title text
→ reuse old page identity
```

Likewise forbidden:

```text
same display label
→ assume same target
```

Two targets may share visible labels.

One target may change visible labels while remaining the same target.

## 10. Identity owner

Selected conceptual owner:

```text
PublicKnowledgeDurablePageIdentityOwner
```

located in the bounded Candidate C derived-object layer for the PUBLIC_KNOWLEDGE consumer.

Its authority is only:

```text
exact resolve
atomic resolve-or-mint
lifetime-scope validation
uniqueness enforcement
owner-scoped expiry cleanup
```

It does not generate page semantics.

## 11. Identity key

Conceptual uniqueness key:

```text
(namespace, lifetimeScopeRef, targetIdentityRef)
```

Frozen invariant:

```text
one uniqueness key
→ at most one ACTIVE pageIdentity
```

This prevents duplicate logical pages within the same bounded scope.

## 12. Atomic resolve-or-mint

A future implementation must provide owner-level atomicity for first creation.

Conceptual operation:

```text
resolveOrMintDurablePublicReferencePageIdentity(
  lifetimeScopeRef,
  trustedTargetIdentityRef,
  firstCommitEligibility
)
```

Possible results:

```text
FOUND_EXISTING
MINTED_NEW
HOLD_UNSUPPORTED_TARGET_IDENTITY
HOLD_IDENTITY_STATE_UNAVAILABLE
INVALID_SCOPE_BINDING
INVALID_DUPLICATE_IDENTITY_STATE
```

Exact runtime enums are not frozen.

## 13. No duplicate race

Two concurrent first-creation attempts for the same uniqueness key must not produce two active identities.

Canonical requirement:

```text
CHECK THEN MINT WITHOUT OWNER ATOMICITY
= NOT ACCEPTABLE
```

If the future persistence layer cannot enforce one active identity per key, PK-X1 is not implementation-ready.

## 14. First-commit eligibility gate

PK-X1 does not mint a durable page identity merely because a target was named.

First identity creation requires a current successful PUBLIC_KNOWLEDGE semantic projection.

Conceptual gate:

```text
trusted target identity available
+
current source support valid
+
current Exposure / settlement / PK validation produces a usable validated page projection
        ↓
page identity may be minted
```

This avoids durable metadata for targets that never had an eligible public-reference projection.

## 15. What counts as usable first projection

The first commit gate is satisfied when the current PK validator produces a normal validated document state with at least one ordinary eligible assertion.

A draft that is:

```text
invalid
unsupported
fully quarantined
HOLD-only
```

must not mint a durable page identity.

Exact empty-document policy remains a lower-level implementation contract, but no hidden/quarantined content may create page-existence metadata.

## 16. Existing identity may outlive later page unavailability

After a valid page identity has been minted, a later activation may fail current semantic validation.

Legal state:

```text
pageIdentity exists
+
current validated page view unavailable
```

The system must not delete or rewrite the durable identity merely because one later view is unavailable.

## 17. No stale content fallback

If current PUBLIC_KNOWLEDGE validation fails:

```text
DO NOT load previous article text as current
DO NOT reuse previous referenceState
DO NOT reuse previous citation bundle as proof
DO NOT silently display last-known-good semantic body
```

Canonical rule:

```text
LAST KNOWN GOOD
!=
CURRENT VALID
```

## 18. Current view binding

A current successful activation may conceptually create an ephemeral binding:

```text
CurrentPublicReferencePageViewBindingV1
  pageIdentity
  currentTargetRef
  currentSourceAuthorityRef
  currentValidatedDocument
  currentCitationBundle?
```

This object is current-projection state, not the durable identity record.

It expires with the current projection according to existing Source Intelligence semantics.

## 19. Same identity, different current content

The same `pageIdentity` may later render a different validated current projection because world/public-record authority changed.

This is expected.

```text
SAME PAGE IDENTITY
!=
SAME PAGE CONTENT
```

In PK-X1 this change is not a persisted revision.

## 20. No revision number

PK-X1 does not introduce:

```text
revisionOrdinal
revisionId
currentRevisionPointer
revisionCause
revision history
restore
compare
```

A fresh current view under the same page identity is ephemeral.

PK-D2 remains the minimum profile for actual revision semantics.

## 21. Source authority is not identity authority

A page identity is target-centric.

Do not include the first source authority in the page uniqueness key.

Reason:

```text
same logical public-reference target
may be supported by a different current source authority later
```

Current source authority remains mandatory at current use, but it does not define page identity.

## 22. Why C7 stays off

The durable identity shell is not a semantic descendant preserved from an old source projection.

It is bound to a trusted stable target identity.

Therefore source replacement can leave the page identity shell intact without claiming old semantic descendants remain valid.

C7 becomes relevant only if historical page/revision semantics survive old supporting authority.

## 23. Why C5 stays off

The page identity record is not derived from BOARD/NEWS/SOCIAL_FEED objects.

No derived family output becomes a parent of the durable page.

Cross-family propagation remains a separate design lane.

## 24. Why C6 stays off

Persistence/addressability does not imply prompt memory.

```text
pageIdentity persists
!=
page semantics re-enter model context
```

No identity shell, old page body, citation bundle, or page history may automatically enter future prompts.

## 25. Why C3/C4 stay off

PK-X1 does not support user/system semantic page mutation.

No:

```text
edit
append
remove
reroll one assertion
append citation
restore
```

is authorized.

A newly generated current page view is not an edit to a stored semantic page because no stored semantic page body exists in PK-X1.

## 26. Lifetime scope

First lifetime policy:

```text
CONVERSATION_SCOPED_PUBLIC_REFERENCE_IDENTITY
```

The lifetime scope must come from a trusted host/SimCore scope owner.

The model cannot invent it.

A page identity does not survive beyond that scope in PK-X1.

## 27. New conversation means new identity domain

The same canonical target in a different conversation/session scope may receive a different page identity.

This is legal.

```text
SAME TARGET ACROSS GLOBAL PRODUCT
!=
GLOBAL PAGE IDENTITY IN PK-X1
```

Global/cross-conversation reference identity is a different product contract.

## 28. Scope expiry

When the selected lifetime scope ends:

```text
owner-scoped page identities expire
```

Expiry is lifecycle cleanup, not user semantic deletion.

PK-X1 does not require user-visible delete semantics or tombstone history.

## 29. Identity-state read failure

If the future durable identity store cannot answer whether a uniqueness key already exists:

```text
DO NOT mint optimistically
```

Result should fail closed, conceptually:

```text
HOLD_IDENTITY_STATE_UNAVAILABLE
```

Otherwise transient read failure could create duplicate identities.

## 30. No cache authority

A cache may accelerate exact identity resolution but cannot establish non-existence or semantic authority unless the owning durable identity contract explicitly defines it as authoritative storage.

Canonical rule:

```text
CACHE MISS
!=
PROOF NO PAGE EXISTS
```

This preserves the common storage lesson already adopted by Candidate C.

## 31. Owner-scoped writes

Future writes must mutate only fields owned by the PK-X1 identity record.

They may not rebuild or replace host/plugin records in ways that erase unrelated metadata.

Canonical rule:

```text
DURABLE PAGE IDENTITY WRITE
→ preserve unowned metadata
```

## 32. Exact retrieval only

PK-X1 authorizes only exact identity resolution.

Legal lookup shapes:

```text
pageIdentity exact lookup
or
(namespace, lifetimeScopeRef, targetIdentityRef) exact resolve
```

Forbidden:

```text
fuzzy title search
substring search
semantic similarity
scan all prior pages
scan host transcript
rank likely matches
```

Search remains PK-X2.

## 33. `pageIdentity` as activation input

A UI may later send an intent containing exact `pageIdentity`.

The identity owner may resolve it to the already-bound trusted `targetIdentityRef`.

But that resolution is only a locator handoff.

The current source-job/target authority must still authorize a current PUBLIC_KNOWLEDGE activation.

Canonical rule:

```text
PAGE ID LOOKUP
!=
SOURCE JOB AUTHORIZATION
```

## 34. No registry-driven page resurrection

A durable page identity registry must not proactively awaken old pages.

Forbidden:

```text
page exists in registry
→ automatically generate/update page every turn
```

The family stays dormant unless a current authorized source job requires it.

## 35. Dormancy cost

On source-irrelevant turns:

```text
PK-X1 identity lookup = 0
PK-X1 write = 0
PK semantic generation = 0
PK validation = 0
```

No background reconciliation or page refresh is allowed.

## 36. Presentation boundary

`PUBLIC_REFERENCE_DOCUMENT_V1` may receive a stable page handle for current UI addressability.

Presentation may show a stable page-local navigation affordance, but it must not expose opaque identifiers as semantic claims.

The durable ID never changes settlement styling or assertion authority.

## 37. Old host transcript cards

Host transcript may retain older visible PUBLIC_KNOWLEDGE cards.

PK-X1 does not rewrite them.

Their existence is independent of current durable page semantics.

```text
OLD CARD
!=
CURRENT PAGE BODY
```

If a future UI needs explicit stale/historical labeling of old cards, that is a separate presentation/history design.

## 38. Privacy / metadata leakage

A durable page identity can itself reveal that a target once had a public-reference projection.

Therefore:

- first mint requires a successful current validated page;
- no public listing/count API is part of PK-X1;
- exact identity lookup only;
- unsupported/private targets do not receive durable shell metadata merely from a failed draft.

This keeps page-existence metadata bounded.

## 39. Target identity drift

If upstream authority changes the durable target identity relation, PK-X1 does not guess how to migrate the page.

Forbidden:

```text
old target identity A
new target identity B
same label
→ silently rebind pageIdentity
```

This requires a future explicit target alias/rekey migration contract.

## 40. Display label changes

If trusted upstream target identity remains the same while the display label changes:

```text
same targetIdentityRef
→ same pageIdentity
```

The next current validated page may display the new trusted label.

This demonstrates why visible title is not identity.

## 41. Duplicate identity corruption

If authoritative state ever yields two active page identities for one uniqueness key:

```text
DO NOT choose one arbitrarily
DO NOT merge by content similarity
```

Classify as identity-state corruption/blocker and fail closed until owner-authorized reconciliation exists.

## 42. Identity migration is deferred

PK-X1 does not define:

```text
merge page identities
split page identity
rekey target identity
alias two identities
move identity across conversation scopes
```

These are future explicit lifecycle/migration contracts.

## 43. Acceptance matrix for future implementation

A future implementation must prove at minimum:

```text
A1 same trusted target, same lifetime → same pageIdentity
A2 different trusted target, same display label → different pageIdentity
A3 same trusted target, changed display label → same pageIdentity
A4 no stable target identity → snapshot allowed, durable mint denied/held
A5 failed/fully quarantined first page → no durable mint
A6 later semantic HOLD → identity remains, stale page body not used
A7 source authority changes but same target/current support valid → same identity + fresh current view
A8 identity store read ambiguity → fail closed, no duplicate mint
A9 concurrent first mint attempts → one active identity
A10 new conversation scope → separate identity domain
A11 no current PK job → zero PK-X1 identity work
A12 pageIdentity lookup alone → does not authorize source job
A13 durable identity data never enters model context automatically
A14 expiry cleanup touches only owner-scoped identity state
```

No acceptance evidence is claimed by this design.

## 44. BLOCKER / WATCH / DEFER

```text
BLOCKER · PAGE_IDENTITY_FROM_TITLE_CONTENT_OR_TRANSCRIPT_POSITION
BLOCKER · TARGET_IDENTITY_INVENTED_BY_PKX1_OWNER
BLOCKER · DUPLICATE_ACTIVE_PAGE_IDENTITIES_FOR_ONE_UNIQUENESS_KEY
BLOCKER · IDENTITY_STORE_READ_FAILURE_CAUSES_OPTIMISTIC_MINT
BLOCKER · OLD_PAGE_BODY_USED_AS_CURRENT_FALLBACK
BLOCKER · DURABLE_IDENTITY_CHANGES_SETTLEMENT_AUTHORITY
BLOCKER · PERSISTENCE_IMPLIES_C6_REENTRY
BLOCKER · FUZZY_SEARCH_REQUIRED_FOR_IDENTITY_RESOLUTION
BLOCKER · BACKGROUND_REFRESH_FROM_DURABLE_REGISTRY
BLOCKER · OWNER_WRITE_ERASES_UNOWNED_METADATA

WATCH · HOST_CONVERSATION_SCOPE_MAPPING_FOR_LIFETIME
WATCH · UPSTREAM_STABLE_TARGET_IDENTITY_COVERAGE
WATCH · OLD_VISIBLE_TRANSCRIPT_CARD_MAY_BE_CONFUSED_WITH_CURRENT_PAGE
WATCH · CONCURRENT_MINT_ATOMICITY_BACKEND_REQUIREMENT

DEFER · PK-D2 REVISIONED_PAGE
DEFER · PK-D3 HISTORICAL_PAGE
DEFER · PK-D4 CONTEXTUAL_DURABLE_PAGE
DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · STABLE_CITATION_IDENTITY
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
DEFER · PK-X3 ENTITY LINKS
DEFER · PK-X4 INFOBOX
DEFER · PK-X5 MEDIA
DEFER · PK-X6 METRICS
DEFER · PK-X7 INTERACTION
```

## 45. PK-X1 child design sequence

If the user continues this expansion lane, the recommended design-only checkpoints are:

```text
PX1-0 Durable Page Identity Master
      = this document

PX1-1 Stable Target Identity Adapter
      exact targetIdentityRef authority
      unsupported-target behavior

PX1-2 Identity Record + Resolve/Mint Contract
      uniqueness
      atomicity
      failure states

PX1-3 Current View Revalidation Binding
      pageIdentity ↔ current target/source authority
      no stale semantic fallback

PX1-4 Lifetime / Cleanup / Host Presentation Boundary
      conversation scope
      expiry
      old visible-card distinction

PX1-5 Convergence / Candidate C Reassessment
      confirm C1+C2 only
      decide whether a real consumer now requires PK-D2
```

No checkpoint authorizes runtime implementation without a separate user decision.

## 46. Frozen verdict

```text
PK_X1_MASTER_DESIGN                = FROZEN
EXPANSION                          = DURABLE_PUBLIC_REFERENCE_PAGE
FIRST CAPABILITY                   = DURABLE IDENTITY SHELL
IDENTITY_NAMESPACE                 = PUBLIC_KNOWLEDGE_DOCUMENT
UNIQUENESS_KEY                     = namespace + lifetimeScopeRef + targetIdentityRef
FIRST_MINT_GATE                    = SUCCESSFUL CURRENT VALIDATED PK PAGE
DURABLE_CONTENT                    = NONE
CURRENT_CONTENT                    = REGENERATE / REVALIDATE PER ACTIVATION
LIFETIME                           = CONVERSATION SCOPED
CANDIDATE_C_C1                     = REQUIRED BY DESIGN
CANDIDATE_C_C2                     = REQUIRED BY DESIGN
CANDIDATE_C_C3_TO_C8               = NOT SELECTED
REVISION_HISTORY                   = NONE
SEARCH                             = NONE
CONTEXT_REENTRY                    = NONE
RUNTIME_IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
NEXT                               = PX1-1 STABLE TARGET IDENTITY ADAPTER
```
