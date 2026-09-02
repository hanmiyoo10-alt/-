# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-2 Identity Record / Resolve-Mint Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-2 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO STORAGE BACKEND · NO RUNTIME ID MINT · NO RELEASE CHANGE**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-2 · IMPACT SCOPE**

## 0. Purpose

PX1-0 froze a durable PUBLIC_KNOWLEDGE page-identity shell. PX1-1 froze the upstream-owned stable target identity adapter that can produce a trusted collision-safe `targetIdentityRef` without turning PUBLIC_KNOWLEDGE into an entity registry.

PX1-2 answers the next bounded question:

```text
Given an admitted targetIdentityRef,
how is one durable page identity record represented,
resolved exactly,
and first-created atomically
without storing semantic page truth or creating duplicate logical pages?
```

This is design-only. No storage backend, runtime schema, ID generator, transaction engine, cache, prompt transport, DOM/CSS, model call, network call, release, S7/v0.70.3, or `release-simcore` mutation is implemented or authorized.

## 1. Inputs already frozen

PX1-2 consumes and does not replace:

```text
PK-X1 Durable Page Identity Master
PX1-1 Stable Target Identity Adapter
Candidate C CC-1 Durable Object Identity / Namespace
Candidate C CC-3 Store / Lifetime / Retrieval common contract
PK-2 current PUBLIC_KNOWLEDGE validation
3M-6 support-at-use invalidation
repository common partial-write / cache-authority rules
```

Inherited invariants:

```text
pageIdentity != targetIdentityRef
persistence != truth
found-by-ID != supported-for-use
cache miss != proof of non-existence
owner-scoped write != permission to erase unowned metadata
C1+C2 != C3-C8
```

## 2. Candidate seams considered

### A. Persist a full PUBLIC_KNOWLEDGE page record

Would retain title/body/reference state/citations together with page identity.

Rejected for PX1-2 because it silently opens durable semantic content and revision/history questions reserved for PK-D2/PK-D3.

### B. Persist only a minimal immutable identity record

```text
namespace
pageIdentity
lifetimeScopeRef
targetIdentityRef
```

and make current page semantics ephemeral and freshly validated.

Selected.

### C. Reconstruct identity from title/content/history on demand

Rejected. This violates PX1-0/PX1-1 explicit identity rules and turns visible text/history into identity authority.

## 3. Selected seam

```text
IMMUTABLE_OWNER_SCOPED_PAGE_IDENTITY_RECORD
+
AUTHORITATIVE_EXACT_RESOLUTION
+
ATOMIC_RESOLVE_OR_MINT
+
EPHEMERAL_FIRST_MINT_ELIGIBILITY_GATE
```

The identity record is a locator shell only.

## 4. Minimal durable record

Selected conceptual record:

```text
DurablePublicReferencePageIdentityV1
  schemaVersion
  namespace = PUBLIC_KNOWLEDGE_DOCUMENT
  pageIdentity
  lifetimeScopeRef
  targetIdentityRef
```

The record does not own or persist:

```text
displayLabel
page title
section/body text
referenceState
settlementBasisRef
citations
sourceAuthorityRef
last-known-good page body
render state
host transcript position
model output
validation/quarantine content
```

## 5. Immutability decision

After successful first creation, the semantic identity fields are immutable for PX1-2.

```text
same record
→ same namespace
→ same pageIdentity
→ same lifetimeScopeRef
→ same targetIdentityRef
```

Changing target binding is not an update. Alias/rekey/merge/split remains a future migration contract.

No revision counter is introduced because identity-record mutation is not part of PX1-2.

## 6. Uniqueness authority

Primary uniqueness key remains:

```text
(namespace, lifetimeScopeRef, targetIdentityRef)
```

Required invariants:

```text
one uniqueness key
→ at most one active pageIdentity

one pageIdentity
→ exactly one uniqueness key inside its owner domain
```

Two records violating either relation are corruption, not a situation where a reader may choose a preferred winner.

## 7. Authoritative store boundary

PX1-2 requires a future owner-authoritative durable identity state capable of exact resolution and atomic first creation.

It does not select a physical backend.

The semantic owner remains:

```text
PublicKnowledgeDurablePageIdentityOwner
```

Physical sharing with other records does not grant cross-owner mutation authority.

## 8. Exact resolution only

Authorized query shapes:

```text
resolve by (namespace, lifetimeScopeRef, targetIdentityRef)
resolve by exact pageIdentity + expected lifetimeScopeRef
```

Not authorized:

```text
fuzzy title lookup
substring search
semantic similarity
scan all prior PK pages
scan host transcript
rank likely targets
```

Search remains PK-X2.

## 9. Resolve existing and first mint are different operations

PX1-2 separates `RESOLVE_EXISTING` from `RESOLVE_OR_MINT_FIRST`.

An existing page identity may be resolved even when the current semantic page later becomes HOLD/unavailable. But resolving an identity does not authorize rendering stale semantics.

First creation has a stricter gate.

## 10. First-mint eligibility source

A new identity may be created only after the current PUBLIC_KNOWLEDGE path has produced a usable validated current page for the same target.

Eligibility must be mechanically derived from trusted current validation, not supplied by the model or renderer.

Selected conceptual boundary:

```text
EphemeralFirstMintEligibilityReceipt
```

It proves only that this current activation, target, lifetime, and stable target identity have a usable validated PK page and may create identity metadata now. It is not durable semantic evidence and must not contain quarantined claim bodies.

## 11. Receipt lifetime

First-mint eligibility is current-activation-only. A stale receipt cannot mint metadata in a later turn. The exact runtime token/generation representation is not frozen.

## 12. Existing identity does not require re-mint eligibility

If an authoritative exact lookup finds the existing record, `FOUND_EXISTING` may be returned without creating or rewriting identity state. Current page semantics still require ordinary current validation before display/use.

## 13. Atomic first creation

Future implementation must make the semantic operation:

```text
exact lookup by uniqueness key
+
conditional first insert
```

atomic with respect to competing first-creation attempts.

A DB unique constraint, transaction, compare-and-set, or another proven primitive may satisfy the requirement. Backend choice is not frozen.

## 14. Authoritative NOT_FOUND

Only a successful exact authoritative read may establish `NOT_FOUND_AUTHORITATIVE`.

A timeout, exception, partial read, cache miss, decode failure, or unavailable store is not non-existence proof.

## 15. Store read failure

If authoritative identity state cannot answer whether the uniqueness key exists, do not mint. Conceptual result: `HOLD_IDENTITY_STATE_UNAVAILABLE`.

## 16. Cache boundary

Cache may later accelerate exact resolution. It does not become semantic existence authority by default.

```text
CACHE MISS != NOT_FOUND
CACHE HIT != CURRENT PAGE SEMANTICS VALID
```

## 17. Duplicate/corruption behavior

If authoritative state exposes one uniqueness key mapped to multiple active page identities, or one page identity mapped to multiple uniqueness keys, PX1-2 fails closed.

Forbidden recovery: choose newest/oldest, choose by lexical order, title, or content similarity. Reconciliation is a separate migration design.

## 18. No semantic fallback

Identity-store success proves only identity state. It never permits loading a previous article body, reusing old settlement/citations as proof, or skipping current support/PK validation.

## 19. Metadata leakage boundary

A failed draft, fully quarantined document, HOLD-only document, or unsupported PK scope must not create a new durable identity record.

## 20. No listing API

PX1-2 does not authorize listing, counting, recents, title search, or browsing the identity registry. Only exact owner-scoped resolution is in scope.

## 21. Dormancy

When there is no current authorized PUBLIC_KNOWLEDGE / PK-X1 operation, identity-store read/write and background reconciliation remain zero.

## 22. Impacted owners

PUBLIC_KNOWLEDGE / PK-X1 gains only identity record/resolve-mint contracts. PX1-1 supplies READY `targetIdentityRef`. PK-2 remains current semantic disposition owner. Candidate C supplies identity/store principles. Future host/persistence implementation must provide authoritative exact lookup and atomic uniqueness enforcement if runtime is later authorized.

## 23. Explicit non-impact

PX1-2 does not change settlement, Exposure, source support, presentation, page content schema, navigation/search, revision history, item mutation, context re-entry, fanout, production runtime, or `release-simcore`.

## 24. Candidate C profile

```text
C1 = YES by design
C2 = YES by design
C3 = NO
C4 = NO
C5 = NO
C6 = NO
C7 = NO
C8 = NO
```

An atomic first insert is storage correctness, not C3 semantic mutation.

## 25. Future implementation acceptance targets

```text
A1 exact existing key returns same pageIdentity
A2 first eligible key mints one record
A3 concurrent first eligible requests produce one active identity
A4 no first-mint eligibility → no new record
A5 failed/HOLD-only first page → no new record
A6 store unavailable/ambiguous → HOLD, no mint
A7 cache miss cannot trigger mint without authoritative NOT_FOUND
A8 duplicate-key state → INVALID/CORRUPT, no arbitrary winner
A9 same pageIdentity bound to two keys → INVALID/CORRUPT
A10 existing ID can survive later semantic HOLD without stale-body fallback
A11 no current PK-X1 job → zero identity-store work
A12 owner write preserves unowned metadata
```

No acceptance evidence is claimed now.

## 26. BLOCKER / WATCH / DEFER

```text
BLOCKER · CHECK_THEN_MINT_WITHOUT_OWNER_ATOMICITY
BLOCKER · STORE_READ_FAILURE_TREATED_AS_NOT_FOUND
BLOCKER · CACHE_MISS_TREATED_AS_NOT_FOUND
BLOCKER · FIRST_MINT_WITHOUT_CURRENT_VALIDATED_PK_ELIGIBILITY
BLOCKER · DUPLICATE_ACTIVE_IDENTITY_AUTOMATIC_WINNER_SELECTION
BLOCKER · IDENTITY_RECORD_STORES_PAGE_SEMANTIC_BODY
BLOCKER · OLD_PAGE_BODY_USED_AFTER_IDENTITY_RESOLUTION
BLOCKER · PAGE_IDENTITY_REBOUND_TO_DIFFERENT_TARGET
BLOCKER · REGISTRY_LISTING_REQUIRED_FOR_EXACT_RESOLUTION

WATCH · FUTURE_BACKEND_UNIQUENESS_PRIMITIVE
WATCH · EPHEMERAL_FIRST_MINT_RECEIPT_BINDING_SHAPE
WATCH · CONVERSATION_SCOPE_STORE_CLEANUP_HANDOFF_TO_PX1_4

DEFER · PX1-3 CURRENT VIEW REVALIDATION BINDING
DEFER · PX1-4 LIFETIME / CLEANUP / PRESENTATION
DEFER · PK-D2 REVISIONED_PAGE
DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
```

## 27. Selected verdict

```text
PX1_2_IMPACT_SCOPE = FROZEN
SELECTED_RECORD = MINIMAL IMMUTABLE IDENTITY SHELL
SELECTED_READ = AUTHORITATIVE EXACT RESOLUTION
SELECTED_CREATE = ATOMIC RESOLVE-OR-MINT
FIRST_MINT = CURRENT VALIDATED PK ELIGIBILITY REQUIRED
CACHE_AUTHORITY = NONE BY DEFAULT
SEMANTIC_BODY_PERSISTENCE = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
NEXT = PX1-2 DETAILED DESIGN
```
