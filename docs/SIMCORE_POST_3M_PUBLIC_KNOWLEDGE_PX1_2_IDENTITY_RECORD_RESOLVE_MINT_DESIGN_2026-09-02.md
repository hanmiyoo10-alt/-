# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-2 Identity Record / Resolve-Mint Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-2 DESIGN FROZEN · MINIMAL IMMUTABLE IDENTITY RECORD · AUTHORITATIVE EXACT RESOLUTION · ATOMIC RESOLVE-OR-MINT · CURRENT-ACTIVATION FIRST-MINT GATE · C1+C2 ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-2 · DURABLE PAGE IDENTITY RECORD · ATOMIC RESOLVE/MINT · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PX1-0 froze the durable PUBLIC_KNOWLEDGE page identity shell. PX1-1 froze the stable-target adapter that can provide a trusted collision-safe `targetIdentityRef` from upstream identity authority.

PX1-2 freezes the storage-facing identity contract that answers:

```text
what exactly is persisted for page identity?
how is an existing identity resolved?
when may a first identity be minted?
how are concurrent first mints serialized?
what counts as authoritative NOT_FOUND?
what happens when state is unavailable or corrupt?
```

This document is design-only. It implements no storage backend, transaction primitive, ID generator, cache, runtime schema, prompt transport, renderer, model call, network call, release, S7/v0.70.3, or `release-simcore` change.

## 1. Authority chain

PX1-2 consumes:

```text
PK-X1 Durable Page Identity Master
PX1-1 Stable Target Identity Adapter
Candidate C CC-1 Durable Object Identity / Namespace
Candidate C CC-3 Store / Lifetime / Retrieval
PK-2 current PUBLIC_KNOWLEDGE validator
3M-6 support-at-use invalidation
repository common cache / owner-write rules
```

Authority separation remains:

```text
upstream target identity owner
→ target sameness

PX1-1 adapter
→ exact stable target identity admission

PK-2 validator
→ current page semantic disposition

PX1-2 identity owner
→ durable page locator state only

PX1-3 future binding
→ current pageIdentity ↔ current validated view relationship
```

Canonical rule:

```text
IDENTITY RECORD AUTHORITY
!=
PAGE SEMANTIC AUTHORITY
```

## 2. Final architecture decision

Selected architecture:

```text
MINIMAL_IMMUTABLE_IDENTITY_RECORD
+
AUTHORITATIVE_EXACT_LOOKUP
+
ATOMIC_RESOLVE_OR_MINT
+
EPHEMERAL_CURRENT_ACTIVATION_MINT_ELIGIBILITY
```

Conceptual flow for an existing page:

```text
PX1-1 READY targetIdentityRef
+
trusted lifetimeScopeRef
        ↓
exact authoritative resolve
        ↓
FOUND_EXISTING pageIdentity
```

Conceptual flow for first creation:

```text
PX1-1 READY targetIdentityRef
+
trusted lifetimeScopeRef
+
current usable PK validation
        ↓
EphemeralFirstMintEligibilityReceipt
        ↓
atomic resolve-or-mint
        ↓
FOUND_EXISTING or MINTED_NEW
```

## 3. Durable identity record

Frozen semantic record:

```text
DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

First namespace:

```text
PUBLIC_KNOWLEDGE_DOCUMENT
```

The physical serialization is not frozen.

## 4. Record field semantics

### `schemaVersion`

Version of the identity-record contract only.

It is not:

```text
page revision
semantic generation
operation generation
world-state version
```

### `namespace`

Owner-admitted derived-object namespace.

For this consumer:

```text
PUBLIC_KNOWLEDGE_DOCUMENT
```

### `pageIdentity`

Opaque owner-issued durable identity for the logical public-reference page within the selected lifetime.

### `lifetimeScopeRef`

Trusted opaque reference to the PK-X1 conversation-scoped lifetime owner.

### `targetIdentityRef`

PX1-1 admitted stable target identity locator.

It is not model-authored and not inferred from visible page text.

## 5. Explicit non-fields

The identity record must not contain:

```text
displayLabel
page title
section headings
assertion text
referenceState
settlementBasisRef
citation bundle
citation markers
current sourceAuthorityRef
old sourceAuthorityRef
validated page body
last-known-good page body
renderer state
DOM/HTML
host message index
model draft
DENY/HOLD content
validation receipt body
first-mint eligibility receipt
```

Reason:

```text
PX1-2 persists addressability only
not semantic article history
```

## 6. Identity record is immutable

After successful first creation, the five semantic record fields are immutable under PX1-2.

Forbidden update:

```text
page P currently binds targetIdentityRef A
→ overwrite record
→ targetIdentityRef B
```

That is not an edit. It is an identity migration/rekey problem and remains deferred.

Likewise `lifetimeScopeRef` cannot be moved to another scope.

## 7. No record revision model

Because PX1-2 identity records are immutable, PX1-2 does not introduce:

```text
revisionId
revisionOrdinal
updatedAt semantic meaning
compare-and-swap semantic generation
record mutation history
restore
```

A physical backend may maintain internal metadata, but consumers cannot use backend timestamps or row versions as page semantics.

## 8. Uniqueness key

Frozen logical uniqueness key:

```text
(namespace, lifetimeScopeRef, targetIdentityRef)
```

Required invariant U1:

```text
one uniqueness key
→ zero or one active identity record
```

Required invariant U2:

```text
one pageIdentity
→ exactly one uniqueness key within the page-identity owner domain
```

Both directions matter.

## 9. Why two-way uniqueness matters

Only enforcing U1 can still permit accidental reuse of the same opaque `pageIdentity` for two different keys.

Only enforcing U2 can still permit duplicate logical pages with two different IDs for one target/lifetime.

Future implementation must prove both relations or an equivalent stronger invariant.

## 10. Identity owner

Semantic owner remains:

```text
PublicKnowledgeDurablePageIdentityOwner
```

Its PX1-2 authority is limited to:

```text
exact resolve by uniqueness key
exact resolve by pageIdentity with expected scope
atomic first resolve-or-mint
uniqueness validation
record-shape validation
corruption classification
```

It does not own current page content, settlement, Exposure, target sameness, or presentation.

## 11. Authoritative identity state

A future implementation must designate one owner-authoritative identity state boundary.

PX1-2 does not freeze the physical backend.

Possible implementations may use transactions, unique indexes, compare-and-set, serialized owner queues, or other proven primitives.

Canonical requirement:

```text
PHYSICAL BACKEND CHOICE
MAY VARY

SEMANTIC ATOMICITY / UNIQUENESS
MAY NOT
```

## 12. Exact resolve by uniqueness key

Conceptual operation:

```text
resolvePageIdentityByTarget(
  namespace,
  lifetimeScopeRef,
  targetIdentityRef
)
```

Bounded outcomes:

```text
FOUND_EXISTING
NOT_FOUND_AUTHORITATIVE
HOLD_IDENTITY_STATE_UNAVAILABLE
INVALID_IDENTITY_STATE_CORRUPT
INVALID_SCOPE_BINDING
```

Exact runtime enum names are not frozen.

## 13. Exact resolve by pageIdentity

Conceptual operation:

```text
resolvePageIdentityById(
  pageIdentity,
  expectedLifetimeScopeRef
)
```

The expected scope is required in V1 so an opaque page handle from another lifetime cannot silently cross domains.

Possible outcomes conceptually:

```text
FOUND_EXISTING
NOT_FOUND_AUTHORITATIVE
HOLD_IDENTITY_STATE_UNAVAILABLE
INVALID_SCOPE_BINDING
INVALID_IDENTITY_STATE_CORRUPT
```

A found identity is only a locator result.

```text
FOUND_EXISTING
!=
CURRENT PK SOURCE JOB AUTHORIZED
!=
CURRENT PAGE CONTENT VALID
```

## 14. No fuzzy fallback

If exact resolution fails, forbidden fallback includes:

```text
find same title
find same displayLabel
find similar body
find nearest old page
scan transcript
scan NEWS/BOARD/SOCIAL_FEED
```

Exact miss remains exact miss.

Search is PK-X2.

## 15. Authoritative NOT_FOUND definition

`NOT_FOUND_AUTHORITATIVE` is legal only when the authoritative owner state successfully completes the exact lookup and proves no matching record exists.

The following are not NOT_FOUND:

```text
cache miss
store timeout
connection failure
decode failure
partial result
permission failure
backend not initialized
unknown schema version
ambiguous duplicate state
```

These must fail closed or classify as corruption/unsupported according to the concrete cause.

## 16. Cache policy

A future cache may optimize exact lookups.

Default semantic policy:

```text
cache = accelerator / hint
not existence authority
```

Therefore:

```text
CACHE MISS
→ authoritative lookup required before first mint
```

A positive cache entry likewise does not validate current page semantics.

A future backend may physically combine cache and authoritative storage only if the owner contract explicitly proves that state authoritative.

## 17. First-mint eligibility

New durable metadata is privacy- and identity-significant. It cannot be minted merely because a stable target ID exists.

Required first-mint basis:

```text
PX1-1 StableTargetIdentityAdmission = READY_EXACT
+
current trusted lifetime scope
+
current PUBLIC_KNOWLEDGE validation produced a usable validated page
```

This basis is transformed mechanically into an ephemeral first-mint receipt.

## 18. EphemeralFirstMintEligibilityReceipt

Conceptual categories:

```text
EphemeralFirstMintEligibilityReceiptV1
  eligibilityState = ELIGIBLE
  namespace
  lifetimeScopeRef
  targetIdentityRef
  currentTargetRef
  currentSourceAuthorityRef
  currentValidationBasisRef
  activationBinding
```

This is conceptual vocabulary, not a frozen runtime serialization.

The receipt must not contain page assertion bodies or quarantined content.

## 19. Receipt authority

The receipt may be produced only by a trusted PX1 admission boundary after observing current successful PK validation plus PX1-1 READY identity admission.

Forbidden producers:

```text
main model
presentation renderer
CSS/DOM
old page card
identity store
NEWS/BOARD/SOCIAL_FEED
user-visible page title
```

Canonical rule:

```text
MODEL SAYS "MINTABLE"
!=
FIRST-MINT AUTHORITY
```

## 20. Receipt is not durable

The receipt is current-activation-only and must not be written into the durable identity record.

It expires with the activation/current projection authority it binds.

Forbidden:

```text
save eligibility receipt
→ reuse on later turn
```

The exact generation/token mechanism is future implementation detail.

## 21. Why current activation binding is required

Without activation binding, an old successful page could authorize new durable metadata after:

```text
source authority changed
settlement changed
target binding changed
scope changed
```

PX1-2 therefore requires a mechanically checkable current-use binding, while leaving the exact physical token to future runtime design.

## 22. First-mint usable page criterion

Inherited from PK-X1:

A first mint may occur only when current PK validation yields a normal usable validated document containing at least one ordinary eligible assertion.

No mint for:

```text
invalid draft
unsupported scope
fully quarantined document
HOLD-only document
empty result caused solely by blocked content
```

Exact empty-page lower-level details may be finalized during implementation readiness, but hidden/quarantined content can never create page-existence metadata.

## 23. Atomic resolve-or-mint

Conceptual owner operation:

```text
resolveOrMintDurablePublicReferencePageIdentity(
  namespace,
  lifetimeScopeRef,
  targetIdentityRef,
  optionalCurrentFirstMintEligibilityReceipt
)
```

Semantic algorithm:

```text
1. validate input scope/namespace/target identity
2. atomically inspect authoritative uniqueness key
3a. if existing valid record → FOUND_EXISTING
3b. if state unavailable/corrupt → HOLD/INVALID, no write
3c. if authoritative NOT_FOUND:
      require valid current first-mint eligibility
      mint opaque pageIdentity
      insert under both uniqueness invariants atomically
      return MINTED_NEW
```

The physical algorithm is not frozen, but its atomic semantic effect is.

## 24. Existing record wins over mint path

If a valid existing record is found, the owner returns it.

A supplied mint receipt does not authorize replacing it or generating a new ID.

```text
EXISTING VALID RECORD
→ reuse exact pageIdentity
→ no semantic rewrite
```

## 25. Missing eligibility after authoritative NOT_FOUND

If no record exists but valid current first-mint eligibility is absent:

```text
NO MINT
```

Conceptual result:

```text
HOLD_FIRST_MINT_NOT_ELIGIBLE
```

Snapshot PUBLIC_KNOWLEDGE may still render according to its ordinary current contract if applicable. Only durability is withheld.

## 26. Store unavailable during resolve-or-mint

If authoritative state cannot prove whether the key exists:

```text
HOLD_IDENTITY_STATE_UNAVAILABLE
```

No optimistic mint.

This remains true even when a valid first-mint eligibility receipt exists.

```text
CURRENT PAGE ELIGIBLE
+
STORE UNKNOWN
→ HOLD DURABILITY
```

not:

```text
→ assume missing
→ mint
```

## 27. Atomicity requirement

The operation must be linearizable enough for the uniqueness guarantee at the owner boundary: competing first-mint attempts for one uniqueness key must converge to one active record.

Forbidden architecture:

```text
caller A read NOT_FOUND
caller B read NOT_FOUND
A generates ID P1
B generates ID P2
A writes
B writes
```

Any backend unable to prevent that race is not implementation-ready for PX1-2.

## 28. Physical primitive neutrality

PX1-2 does not require a specific implementation technology.

Acceptable future proofs might use:

```text
unique composite constraint
transactional insert-if-absent
atomic compare-and-set
single-owner serialized command lane
```

provided failure modes and crash consistency preserve the semantic invariants.

## 29. ID allocation

`pageIdentity` is opaque and owner-issued.

PX1-2 does not freeze UUID/ULID/counter/random/string encoding.

Required properties:

```text
opaque to semantic consumers
not derived from title/body
not derived from targetIdentityRef by reversible semantic encoding
unique under owner contract
```

A generated candidate ID collision must not bind an existing different record to the new key.

## 30. Partial-write/crash boundary

A future implementation must not expose a durable state where one uniqueness direction is committed while the other authoritative constraint is observably inconsistent.

If the physical representation uses multiple records/indexes, transaction/crash semantics must preserve logical atomicity.

Canonical rule:

```text
PARTIAL IDENTITY COMMIT
= IMPLEMENTATION BLOCKER
```

## 31. Duplicate-key corruption

If authoritative reads reveal:

```text
same (namespace, lifetimeScopeRef, targetIdentityRef)
→ P1 and P2 active
```

then:

```text
INVALID_IDENTITY_STATE_CORRUPT
```

No arbitrary winner.

## 32. Reverse collision corruption

If:

```text
pageIdentity P
→ key A
and
pageIdentity P
→ key B
```

then likewise:

```text
INVALID_IDENTITY_STATE_CORRUPT
```

Content similarity, creation time, or title cannot repair this automatically.

## 33. Corruption reconciliation deferred

PX1-2 does not define:

```text
merge duplicate IDs
choose canonical winner
rekey page IDs
split page identities
alias records
```

Those require explicit owner-authorized migration semantics.

## 34. Existing identity survives later semantic unavailability

Once a valid identity exists, later PK activation may yield HOLD/invalid/unavailable current semantics.

Legal state:

```text
pageIdentity exists
+
current page view unavailable
```

PX1-2 does not delete the ID because one current projection failed.

## 35. No last-known-good fallback

The previous rule does not authorize showing old content.

```text
identity exists
+
current validation fails
→ identity may remain
→ current semantic page remains unavailable
```

Never:

```text
→ display old body as current
```

PX1-3 will freeze the current-view binding/revalidation seam.

## 36. Page identity lookup does not authorize source job

A UI or host may later hold an exact `pageIdentity`.

Resolving it can locate `targetIdentityRef` inside the lifetime scope.

But:

```text
PAGE ID RESOLVED
!=
CURRENT PUBLIC_KNOWLEDGE SOURCE JOB AUTHORIZED
```

Current source-job authority remains separate.

## 37. Privacy and page-existence metadata

Durable page identity itself can reveal that a target once had an eligible public-reference page in the lifetime scope.

Therefore PX1-2 authorizes no:

```text
public page-count API
registry browse
recent page list
failed target record
quarantined target placeholder
```

First-mint gating is part of privacy, not only data cleanliness.

## 38. No model-context re-entry

The identity record and lookup result must not automatically enter future model prompts.

```text
C1+C2 durability
!=
C6 context re-entry
```

If a future user action references a page handle, current source-job/target authority may use an exact locator handoff, but that does not authorize old semantics to re-enter context.

## 39. Dormancy

On turns with no current PK-X1 identity operation:

```text
identity store open/read = 0
identity write = 0
cache refresh = 0
background scan = 0
reconciliation = 0
```

A durable registry does not create periodic work.

## 40. Owner-scoped write rule

Future identity writes own only PK-X1 identity state.

If physical persistence shares a host/plugin record, the write must preserve all unowned metadata.

```text
OMITTED UNOWNED FIELD
!=
DELETE FIELD
```

## 41. Schema handling

Known supported schema versions may be read according to an explicit owner migration/compatibility contract.

Unknown incompatible identity-record schema must not be treated as NOT_FOUND.

Conceptual result:

```text
HOLD_IDENTITY_STATE_UNAVAILABLE
or
INVALID_UNSUPPORTED_IDENTITY_SCHEMA
```

according to future implementation policy.

The important invariant is:

```text
UNKNOWN RECORD
!=
NO RECORD
```

## 42. Scope mismatch

If exact pageIdentity lookup finds a record outside the expected current lifetime scope:

```text
INVALID_SCOPE_BINDING
```

It must not silently import/rebind that page identity into the current conversation.

Global/cross-conversation page identity is a separate product contract.

## 43. Target identity mismatch

When resolving by uniqueness key, the key itself already includes `targetIdentityRef`.

When later binding a resolved `pageIdentity` to a current target, PX1-3 must exact-compare the stored `targetIdentityRef` with PX1-1's current READY identity admission.

PX1-2 does not skip that future check merely because lookup succeeded.

## 44. No target rekey

If upstream target identity changes from A to B, PX1-2 does not mutate the old record to B.

```text
A → B
```

may represent alias correction, identity migration, split/merge, or actual different target. A future explicit migration contract must decide.

## 45. Current design transaction WATCH

During the PX1-2 impact transaction, `main` advanced from the PX1-1 merge ancestry through unrelated Agent Skill orchestrator and PocketRisu changes.

Ancestry comparison proved the PX1-1 merge remained the merge base and no PUBLIC_KNOWLEDGE / Candidate C / PX1 identity-storage owner file changed in that advance.

Classification:

```text
WATCH · MAIN_ADVANCED_DURING_PX1_2_TRANSACTION · NON_BLOCKING
```

PX1-2 impact scope was then merged against the newer main before this detailed design branch was created.

## 46. Future implementation result matrix

Conceptual behavior:

```text
existing valid record
→ FOUND_EXISTING

no record + valid mint eligibility + atomic insert success
→ MINTED_NEW

no record + no valid mint eligibility
→ HOLD_FIRST_MINT_NOT_ELIGIBLE

identity state unavailable
→ HOLD_IDENTITY_STATE_UNAVAILABLE

scope mismatch
→ INVALID_SCOPE_BINDING

duplicate/cross-bound identity state
→ INVALID_IDENTITY_STATE_CORRUPT
```

Exact runtime enum spelling remains unfrozen.

## 47. Required future evidence

Future implementation must prove at least:

```text
E1 deterministic exact resolve for same key
E2 same pageIdentity on repeated same-target same-lifetime activation
E3 different targetIdentityRef → distinct logical page identity
E4 same targetIdentityRef + changed displayLabel → same pageIdentity
E5 current successful first page can mint once
E6 failed/quarantined/HOLD-only first page cannot mint
E7 stale first-mint receipt cannot mint later
E8 concurrent first mint converges to one identity
E9 read timeout/cache miss cannot cause optimistic duplicate mint
E10 duplicate state fails closed
E11 reverse pageIdentity collision fails closed
E12 current semantic HOLD does not delete identity or revive old body
E13 unknown schema is not treated as absence
E14 no current PK-X1 job produces zero identity-store work
E15 writes preserve unowned metadata
```

No such runtime evidence is claimed by this document.

## 48. BLOCKER / WATCH / DEFER

```text
BLOCKER · IDENTITY_RECORD_CONTAINS_DURABLE_PAGE_SEMANTICS
BLOCKER · FIRST_MINT_WITHOUT_CURRENT_PK_VALIDATION
BLOCKER · STALE_FIRST_MINT_RECEIPT_REPLAY
BLOCKER · CHECK_THEN_MINT_WITHOUT_ATOMIC_OWNER_GUARANTEE
BLOCKER · AUTHORITATIVE_READ_FAILURE_TREATED_AS_ABSENCE
BLOCKER · CACHE_MISS_TREATED_AS_ABSENCE
BLOCKER · DUPLICATE_IDENTITY_STATE_AUTO_WINNER
BLOCKER · PAGE_IDENTITY_REBOUND_TO_NEW_TARGET
BLOCKER · PARTIAL_IDENTITY_COMMIT_VISIBLE
BLOCKER · UNKNOWN_SCHEMA_TREATED_AS_NOT_FOUND
BLOCKER · PAGE_ID_LOOKUP_AUTHORIZES_CURRENT_SOURCE_JOB
BLOCKER · IDENTITY_RESOLUTION_REVIVES_LAST_KNOWN_GOOD_BODY

WATCH · MAIN_ADVANCED_DURING_PX1_2_TRANSACTION · NON_BLOCKING
WATCH · FUTURE_BACKEND_ATOMICITY_PRIMITIVE
WATCH · FIRST_MINT_ACTIVATION_BINDING_PHYSICAL_TOKEN
WATCH · CONVERSATION_SCOPE_CLEANUP_HANDOFF_TO_PX1_4
WATCH · FUTURE_STORE_SCHEMA_MIGRATION_POLICY

DEFER · PX1-3 CURRENT VIEW REVALIDATION BINDING
DEFER · PX1-4 LIFETIME / CLEANUP / PRESENTATION
DEFER · PK-D2 REVISIONED_PAGE
DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
```

## 49. Candidate C reassessment

PX1-2 still consumes only:

```text
C1 cross-turn survival = YES
C2 stable identity     = YES
```

No new capability is activated:

```text
C3 semantic mutation   = NO
C4 append/merge        = NO
C5 derived lineage     = NO
C6 context re-entry    = NO
C7 historical survival = NO
C8 delayed effects     = NO
```

Atomic identity creation is a correctness property of C1+C2 persistence, not C3 page mutation.

## 50. Frozen verdict

```text
PX1_2_DESIGN                       = FROZEN
IDENTITY_RECORD                    = MINIMAL + IMMUTABLE
NAMESPACE                          = PUBLIC_KNOWLEDGE_DOCUMENT
UNIQUENESS_KEY                     = namespace + lifetimeScopeRef + targetIdentityRef
PAGE_IDENTITY_REVERSE_UNIQUENESS   = REQUIRED
EXACT_RESOLUTION                   = AUTHORITATIVE ONLY
AUTHORITATIVE_NOT_FOUND            = SUCCESSFUL EXACT STORE ABSENCE ONLY
CACHE_MISS                         = NOT ABSENCE PROOF
FIRST_MINT                         = CURRENT USABLE PK PAGE REQUIRED
FIRST_MINT_RECEIPT                 = EPHEMERAL / CURRENT ACTIVATION ONLY
RESOLVE_OR_MINT                    = ATOMIC OWNER OPERATION
DUPLICATE_STATE                    = FAIL CLOSED
DURABLE_PAGE_CONTENT               = NONE
REVISION                           = NONE
CONTEXT_REENTRY                    = NONE
CANDIDATE_C                        = C1 + C2 ONLY
RUNTIME_IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
NEXT                               = PX1-3 CURRENT VIEW REVALIDATION BINDING
```
