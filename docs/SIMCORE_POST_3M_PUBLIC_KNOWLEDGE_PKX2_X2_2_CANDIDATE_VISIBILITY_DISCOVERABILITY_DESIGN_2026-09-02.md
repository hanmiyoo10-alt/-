# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-2 Candidate Visibility / Discoverability Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-2 DESIGN FROZEN · CURRENT TARGET-LEVEL PUBLIC-REFERENCE DISCOVERABILITY · FAIL-CLOSED VISIBLE-HIT ADMISSION · ANTI-ORACLE BOUNDARY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-2 · DISCOVERABILITY · SEARCH VISIBILITY · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 froze PUBLIC_REFERENCE_SEARCH as bounded navigation over already-minted PK-X1 page identities.
X2-1 froze authoritative active-lifetime locator retrieval and exact current-label composition.

X2-2 freezes the boundary between:

```text
INTERNAL SEARCH CANDIDATE
and
ORDINARY VISIBLE SEARCH HIT
```

The problem is security-sensitive because durable page identity may survive after current article semantics disappear.

This is design-only. It implements no runtime adapter, exposure classifier, visibility service, UI, storage, search matcher, ranker, model call, network call, release, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Final architecture decision

Selected profile:

```text
CURRENT_TARGET_PUBLIC_REFERENCE_DISCOVERABILITY_ADMISSION_V1
```

Conceptual flow:

```text
X2-1 DESCRIPTOR_READY
+
trusted ACTIVE lifetime
+
trusted current public-reference discoverability basis
        ↓
X2-2 exact-binding / policy gate
        ↓
CurrentPublicReferenceDiscoverabilityReceiptV1
        ↓
VISIBLE_CURRENT only
        ↓
ordinary visible search hit
```

All other states remain internal/non-visible.

Canonical rule:

```text
MATCHED ADDRESS
!=
VISIBLE ADDRESS
```

## 2. Four authority axes remain separate

X2-2 preserves four independent questions:

```text
A. target identity
   → which target is this?

B. current label
   → what trusted human-facing label addresses it now?

C. current public-reference discoverability
   → may the address + current label be surfaced on search UI now?

D. current article semantics
   → what content may be rendered after navigation?
```

These are not interchangeable.

```text
A != B != C != D
```

Settlement is a fifth claim-level/public-record axis and remains separate from all four.

## 3. Discoverability is target-level, not article-level

A search hit communicates only:

```text
this target has an address that is currently safe to surface
on the PUBLIC_REFERENCE_SEARCH navigation surface
```

It does not communicate:

```text
article body is currently valid
all article claims are settled
all article sections are non-empty
current citations exist
current source support is sufficient for a page render
```

Those stronger claims remain downstream.

Therefore X2-2 does not run full PK-2 validation for every candidate.

## 4. Why full candidate article prevalidation is rejected

Rejected:

```text
N matched candidates
→ N PUBLIC_KNOWLEDGE semantic generations
→ N PK-2 validations
→ search-result list
```

This would create hidden semantic fanout and make search cost scale with model/source generation.

It would also make a navigation listing operation a covert article-materialization trigger.

Frozen rule:

```text
SEARCH LISTING MAY PROVE ADDRESS DISCOVERABILITY
WITHOUT MATERIALIZING ARTICLE BODY
```

X2-4 still requires full current page revalidation after selection.

## 5. Discoverability basis is upstream-owned

X2-2 does not invent a public/private verdict from locator existence or label text.

Conceptual trusted input:

```text
CurrentPublicReferenceDiscoverabilityBasisV1
  discoverabilityAuthorityRef
  targetIdentityRef
  validForLifetimeScopeRef
  admittedLabelAuthorityRef
  admittedCurrentDisplayLabel
  publicAddressabilityState
  bindingState
```

This is conceptual vocabulary only; no runtime serialization is authorized.

The basis is issued by an admitted current authority capable of proving target-level public-reference addressability for the exact current label.

X2-2 consumes the basis. It does not own target publicity.

## 6. Relationship to 3M-2 Exposure

3M-2 froze the general semantic principle:

```text
SUPPORTED FACT
!=
AUDIENCE-EXPOSED FACT
```

and fail-closed exposure policy behavior.

X2-2 reuses that separation principle, but it does **not** claim that the first 3M-2 LIVE_REACTION policy table directly authorizes PK-X2 discoverability.

Reason:

```text
3M-2 first slice = LIVE_REACTION assertion exposure
X2-2 need = PUBLIC_KNOWLEDGE target/address visibility
```

Therefore a future runtime needs an admitted target-level discoverability producer/adapter. Until that producer is proven, X2-2 runtime readiness is NO.

## 7. Label-specific visibility binding

Target-level publicity in the abstract is insufficient if the exact current label itself is not safe to surface.

Example:

```text
target T is publicly known
but current trusted label = newly private alias
```

X2-2 must not expose the private alias merely because T is public.

Therefore the discoverability basis must bind the exact X2-1 label authority and label value:

```text
basis.targetIdentityRef
== descriptor.targetIdentityRef

basis.admittedLabelAuthorityRef
== descriptor.labelAuthorityRef

basis.admittedCurrentDisplayLabel
== descriptor.currentTrustedDisplayLabel

basis.validForLifetimeScopeRef
== current trusted lifetimeScopeRef
```

No normalized/fuzzy label comparison is an authority join.

## 8. Public addressability states

Frozen conceptual input states:

```text
PUBLICLY_DISCOVERABLE_CURRENT
NOT_PUBLICLY_DISCOVERABLE_CURRENT
UNKNOWN_CURRENT_DISCOVERABILITY
UNAVAILABLE_CURRENT_DISCOVERABILITY
CONFLICTING_CURRENT_DISCOVERABILITY
```

The exact runtime enum names remain implementation work.

Only the first state can support a visible hit.

## 9. Binding state

The discoverability basis must also be current and exact.

Conceptual admitted binding state:

```text
CURRENT_EXACT
```

Rejected states include:

```text
historical
stale
fuzzy
inferred
cross-lifetime
ambiguous
```

A historically public target is not automatically currently discoverable.

## 10. Receipt schema

Frozen conceptual receipt:

```text
CurrentPublicReferenceDiscoverabilityReceiptV1
  status
  pageIdentity
  targetIdentityRef
  lifetimeScopeRef
  discoverabilityAuthorityRef?
  reasonCode
```

The receipt deliberately does not persist or copy:

```text
article body
old/current citation text
settlement state
source authority payload
hidden assertion text
old title
old rendered snippet
model output
```

The receipt authorizes a descriptor, not article semantics.

## 11. Receipt lifetime

The receipt is:

```text
EPHEMERAL
CURRENT SEARCH ACTIVATION ONLY
NON-PERSISTENT
NON-CANONICAL
NON-MODEL-CONTEXT
```

It may be used by later stages of the same bounded search activation.

It may not authorize another turn, reload, future query, or future label value.

Canonical rule:

```text
DISCOVERABLE ONCE
!=
DISCOVERABLE FOREVER
```

## 12. Frozen receipt states

```text
VISIBLE_CURRENT
DENY_NOT_CURRENTLY_PUBLICLY_DISCOVERABLE
HOLD_DISCOVERABILITY_UNAVAILABLE
HOLD_DISCOVERABILITY_UNPROVEN
HOLD_DISCOVERABILITY_CONFLICT
INVALID_DESCRIPTOR_BINDING
INVALID_LABEL_VISIBILITY_BINDING
INVALID_LIFETIME_BINDING
INVALID_DISCOVERABILITY_AUTHORITY
```

Exact implementation spelling may differ, but semantic distinctions must remain.

## 13. Deterministic admission table

Evaluate conceptually in this order:

```text
1. current search/lifetime scope invalid
   → INVALID_LIFETIME_BINDING

2. descriptor does not exact-bind admitted locator/target
   → INVALID_DESCRIPTOR_BINDING

3. label authority/value does not exact-match discoverability basis
   → INVALID_LABEL_VISIBILITY_BINDING

4. discoverability authority missing/unadmitted
   → INVALID_DISCOVERABILITY_AUTHORITY

5. basis unavailable
   → HOLD_DISCOVERABILITY_UNAVAILABLE

6. basis conflicting/ambiguous
   → HOLD_DISCOVERABILITY_CONFLICT

7. basis unknown/unproven
   → HOLD_DISCOVERABILITY_UNPROVEN

8. basis explicitly not currently publicly discoverable
   → DENY_NOT_CURRENTLY_PUBLICLY_DISCOVERABLE

9. basis current/exact and PUBLICLY_DISCOVERABLE_CURRENT
   → VISIBLE_CURRENT
```

No later search stage may promote a non-visible state.

## 14. Settlement is not a substitute

Forbidden authorization:

```text
old/current claim settlement = SETTLED
→ therefore search hit visible
```

Settlement concerns public-record standing of claims.
X2-2 concerns current visibility of a target/address/label on a navigation surface.

Legal possibility:

```text
target/address currently discoverable
+
future selected article contains only contested/corrected material
```

The target can still be a valid navigation address while the article preserves those states after full validation.

## 15. Page creation history is not a substitute

PK-X1 first mint required a usable current PUBLIC_KNOWLEDGE page at mint time.

That historical fact does not grant current search visibility.

Frozen rule:

```text
WAS ELIGIBLE TO MINT
!=
IS DISCOVERABLE NOW
```

## 16. Current trusted label alone is not a substitute

X2-1 may know a current human-facing label while X2-2 still denies or holds address visibility.

```text
LABEL_READY_EXACT
!=
VISIBLE_CURRENT
```

This prevents current naming authority from accidentally becoming publication authority.

## 17. Exact-ID searches do not bypass X2-2

The gate applies equally to:

```text
EXACT_PAGE_ID
EXACT_TARGET_ID
EXACT_CURRENT_LABEL
PREFIX/TOKEN LABEL MATCH
CURRENT CORPUS LIST
```

An exact opaque locator is only a stronger match key. It is not stronger visibility authority.

Canonical rule:

```text
KNOWING THE DOOR NUMBER
DOES NOT GRANT PERMISSION TO CONFIRM THE DOOR EXISTS
```

## 18. Anti-oracle equivalence class

Ordinary user-facing behavior must not make protected page existence trivially enumerable.

The following internal states belong to one protected ordinary-UI equivalence class unless a later product contract proves a safer distinction:

```text
no matching locator
matching locator but DENY discoverability
matching locator but HOLD discoverability
matching locator but invalid visibility binding
```

The UI may present a generic no-visible-result/not-available outcome.

Internal diagnostics must retain the real reason.

The UI must not say:

```text
page exists but is private
one hidden result
protected page found
correct ID but unavailable
```

## 19. Corpus failure vs candidate filtering

X2-1 corpus authority failure and X2-2 per-candidate visibility filtering are different.

```text
locator/label corpus incomplete or unavailable
→ SEARCH INPUT NOT AUTHORITATIVE
→ operation-level unavailable/hold

complete search input
+ individual candidate non-visible
→ candidate omitted from ordinary result set
```

This preserves X2-1's rule that partial corpus cannot masquerade as authoritative no-match while still preventing X2-2 from leaking why an individual candidate was filtered.

## 20. Global discoverability-service outage

If the admitted discoverability authority is globally unavailable for the current search activation, the operation may surface a generic search-unavailable state rather than pretend the complete visible corpus is empty.

This must not include candidate counts or candidate-specific existence hints.

Per-candidate transient failure that cannot be safely distinguished remains omitted/fail-closed.

Exact UI wording belongs to X2-3/X2-5 presentation contracts.

## 21. Hidden counts are forbidden

Ordinary UI must not expose:

```text
hidden result count
held result count
denied result count
protected match count
filtered result count derived from non-visible candidates
```

Pagination totals and result counts must be computed from the **visible result set**, not from internal matched-candidate cardinality.

This prevents cardinality from becoming an existence side channel.

## 22. Ranking must not bypass discoverability

Ranking is navigation metadata only.

A ranker may not convert:

```text
HOLD → visible
DENY → visible
INVALID → visible
```

Preferred first logical ordering for the next checkpoint:

```text
bounded matching
→ internal candidates
→ X2-2 visibility gate
→ visible candidates
→ deterministic ranking/pagination over visible candidates
```

X2-3 owns the exact comparator and caps.

## 23. Search result payload boundary

After `VISIBLE_CURRENT`, the ordinary result may consume only bounded navigation-safe data from the X2-1 descriptor plus downstream match metadata.

Initial safe core:

```text
currentTrustedDisplayLabel
opaque internal navigation handle
bounded match class / UI affordance
```

It must not surface as article preview:

```text
old body
current body before X2-4 revalidation
old citations
old settlement badges
hidden assertion snippets
pageIdentity as semantic article text
targetIdentityRef as semantic article text
```

## 24. Search result selection remains weaker than page validity

A visible hit selected by the user means:

```text
NAVIGATE TO THIS CURRENTLY DISCOVERABLE ADDRESS
```

It still does not mean:

```text
current page body is valid
```

X2-4 must re-enter normal current PUBLIC_KNOWLEDGE authority and require PX1-3 current-view revalidation before current semantic content is displayed.

## 25. Stale hit behavior

A hit can become stale between result computation and selection.

Therefore X2-2 receipt cannot permanently bless the page.

X2-4 must not rely on an old receipt if its activation/current-authority horizon has ended.

If selected-page revalidation fails:

```text
old body not restored
old snippet not restored
old settlement not restored
```

## 26. No model or derived-family visibility authority

Forbidden discoverability sources:

```text
model says target is public
NEWS frequently names target
BOARD users discuss target
SOCIAL_FEED account is popular
LIVE_REACTION audience mentions target
old PUBLIC_KNOWLEDGE page was rendered
```

These may exist as derived context but do not substitute for the admitted current discoverability authority.

## 27. No persistent visibility cache

X2-2 V1 does not persist:

```text
isDiscoverable
lastVisibleAt
visibility history
private/public transition history
last successful receipt
```

Such a cache would become a mutable publication-state index and require fresh authority/Candidate C analysis.

## 28. Candidate C position

No new Candidate C gate is consumed.

```text
C1 cross-turn identity survival = inherited from PK-X1
C2 stable identity              = inherited from PK-X1
C3 mutation                     = no new requirement
C4 append/merge                 = no new requirement
C5 derived lineage              = no new requirement
C6 context re-entry             = no new requirement
C7 historical semantic survival = no new requirement
C8 delayed semantic effects     = no new requirement
```

The visibility receipt is current-only.

## 29. Dormancy

Without explicit current PK-X2 search authority:

```text
discoverability authority reads = 0
visibility receipts = 0
hidden-result filtering = 0
search-result presentation updates = 0
background visibility polling = 0
```

A durable page identity never activates this path by itself.

## 30. Performance boundary

X2-2 may evaluate only the bounded internal candidate set produced under X2-3 caps.

It must not trigger:

```text
model calls
network calls
full page semantic generation
history scans
cross-conversation scans
background refresh
```

If a future discoverability authority requires expensive remote calls, that is a new runtime/performance design problem and is not silently admitted here.

## 31. Runtime-readiness evidence required later

Before implementation can claim X2-2 ready, future work must prove at least:

```text
admitted current target-level discoverability producer exists
exact target identity binding works
exact current label visibility binding works
receipt expires with current activation
DENY/HOLD never reaches ordinary result UI
exact-ID queries cannot bypass the gate
hidden-result counts are not surfaced
visible-result pagination uses visible cardinality
stale receipt cannot authorize selected page content
ordinary non-search turns remain dormant
```

Timing/latency existence side channels require target-host runtime evaluation. This design freezes the semantic boundary but does not claim constant-time implementation.

## 32. Explicit defers

```text
DEFER · PERSISTENT VISIBILITY INDEX
DEFER · VISIBILITY HISTORY / AUDIT UI
DEFER · CROSS-CONVERSATION DISCOVERABILITY
DEFER · GLOBAL DIRECTORY SEARCH
DEFER · TIMING-SIDE-CHANNEL MITIGATION MECHANISM
DEFER · ARTICLE SNIPPET PREVIEW
DEFER · HISTORICAL PAGE DISCOVERY
DEFER · SEARCH RESULT AS SETTLEMENT AUTHORITY
```

## 33. X2-2 frozen verdict

```text
X2_2_DESIGN = FROZEN
PROFILE = CURRENT_TARGET_PUBLIC_REFERENCE_DISCOVERABILITY_ADMISSION_V1
INTERNAL_CANDIDATE != VISIBLE_HIT
VISIBLE_HIT_REQUIRES_CURRENT_EXACT_DISCOVERABILITY = YES
EXACT_CURRENT_LABEL_MUST_BE COVERED = YES
FULL_ARTICLE_PREVALIDATION_FOR_LISTING = NO
SETTLEMENT_AS_VISIBILITY_AUTHORITY = NO
OLD_PAGE_EXISTENCE_AS_VISIBILITY_AUTHORITY = NO
EXACT_ID_BYPASS = NO
HIDDEN_RESULT_COUNTS = NO
PERSISTENT_VISIBILITY_CACHE = NO
NEW_CANDIDATE_C_GATES = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Next checkpoint:

```text
X2-3 · Query Semantics / Ranking / Hard Caps
```

Final rule:

```text
X2-1 MAY FIND A CANDIDATE ADDRESS.
X2-2 DECIDES WHETHER ORDINARY UI MAY ACKNOWLEDGE THAT ADDRESS NOW.
X2-4 STILL DECIDES WHETHER CURRENT ARTICLE CONTENT CAN BE SHOWN AFTER SELECTION.
```