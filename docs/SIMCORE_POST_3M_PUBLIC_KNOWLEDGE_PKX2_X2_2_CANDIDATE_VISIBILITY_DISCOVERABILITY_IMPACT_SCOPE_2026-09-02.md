# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-2 Candidate Visibility / Discoverability Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-2 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-2 · SEARCH VISIBILITY · CURRENT DISCOVERABILITY**

## 0. Question

X2-1 can produce an internal search descriptor from an authoritative active-lifetime PK-X1 locator and a current trusted label.

X2-2 answers the next, separate question:

```text
MAY THE EXISTENCE OF THIS PAGE ADDRESS
AND ITS CURRENT TRUSTED LABEL
BE SURFACED TO ORDINARY SEARCH UI NOW?
```

Canonical boundary:

```text
INTERNAL SEARCH CANDIDATE
!=
VISIBLE SEARCH HIT
```

This checkpoint does not implement runtime code, search UI, storage, model calls, network calls, PK generation, release work, or `release-simcore` changes.

## 1. Fresh authority findings

The current design stack already freezes:

```text
PK-X1 pageIdentity
→ durable address continuity only

X2-1 descriptor
→ current locator + current trusted label only

PK-2 validator
→ current article semantic validity

3M-2 Exposure
→ audience exposure is separate from source truth
```

A page locator may survive after current public-reference semantics disappear. A current trusted label may also exist without proving that surfacing a durable PUBLIC_KNOWLEDGE address is currently appropriate.

Therefore:

```text
PAGE IDENTITY EXISTS
+
CURRENT LABEL EXISTS
!=
CURRENT DISCOVERABILITY
```

## 2. Selected first seam

Selected seam:

```text
CURRENT_TARGET_PUBLIC_REFERENCE_DISCOVERABILITY_ADMISSION_V1
```

X2-2 introduces a least-authority, current-activation visibility gate between internal candidate construction and ordinary UI.

The gate consumes an admitted current target-level public discoverability basis. It does not manufacture that basis.

## 3. Why not validate every article before search results

Rejected architecture:

```text
for every lexical candidate
→ generate full PUBLIC_KNOWLEDGE document
→ run PK-2
→ show hit if valid
```

Reasons:

```text
search would become O(candidate count × semantic generation)
search would materialize article content merely to list addresses
matching/ranking would accidentally trigger source semantics
ordinary navigation would gain a hidden model-generation fanout
```

X2-4 still owns full current page revalidation after the user selects a visible hit.

Canonical rule:

```text
DISCOVERABILITY ADMISSION
!=
CURRENT ARTICLE VALIDATION
```

## 4. Discoverability basis ownership

X2-2 does not become a new Exposure, settlement, or world-truth owner.

Conceptual upstream input:

```text
CurrentPublicReferenceDiscoverabilityBasisV1
  discoverabilityAuthorityRef
  targetIdentityRef
  validForLifetimeScopeRef
  currentPublicAddressabilityState
  bindingState
```

This is conceptual vocabulary only.

The basis must be issued by an admitted current authority capable of proving whether the target may presently be addressed on a public-reference navigation surface.

X2-2 may exact-join and apply bounded policy. It may not infer public addressability from history, page existence, label text, article text, or model judgment.

## 5. Settlement is not search-hit authority

X2-2 intentionally does not require that every possible article claim is currently settled before the page address may appear in search.

A search hit means only:

```text
THIS TARGET HAS A CURRENTLY DISCOVERABLE PUBLIC-REFERENCE ADDRESS
```

It does not mean:

```text
all article claims are valid
all claims are settled
current page body exists
current source support is complete
```

Full semantic content remains gated by current PK generation / PK-2 / PX1-3 after selection.

Conversely, old settlement state cannot authorize a hit.

## 6. Required exact joins

A candidate is eligible for discoverability evaluation only when:

```text
X2-1 descriptor targetIdentityRef
== discoverability basis targetIdentityRef

X2-1 current lifetimeScopeRef
== basis validForLifetimeScopeRef
```

The current trusted display label remains owned by X2-1 label authority. The discoverability basis does not replace or rewrite it.

## 7. First policy result

Conceptual result:

```text
CurrentPublicReferenceDiscoverabilityReceiptV1
  status
  pageIdentity
  targetIdentityRef
  lifetimeScopeRef
  discoverabilityAuthorityRef?
  reasonCode
```

No article body, citation, settlement text, hidden assertion, or historical title is copied into the receipt.

First semantic states:

```text
VISIBLE_CURRENT
HOLD_DISCOVERABILITY_UNAVAILABLE
HOLD_DISCOVERABILITY_UNPROVEN
HOLD_DISCOVERABILITY_CONFLICT
DENY_NOT_CURRENTLY_PUBLICLY_DISCOVERABLE
INVALID_DESCRIPTOR_BINDING
INVALID_LIFETIME_BINDING
INVALID_DISCOVERABILITY_AUTHORITY
```

Exact runtime enum spellings remain implementation-authority work.

## 8. Visible-hit rule

Only:

```text
VISIBLE_CURRENT
```

may cross into ordinary search-result presentation.

Any HOLD, DENY, INVALID, stale, missing, or conflicting discoverability state produces no ordinary visible hit.

Canonical rule:

```text
UNKNOWN VISIBILITY
→ FAIL CLOSED
```

## 9. No stale existence fallback

Forbidden fallbacks:

```text
pageIdentity was visible before
old PK page existed
old search result existed
old trusted label existed
old settlement was SETTLED
old host card is still visible
user searched this page earlier
```

None may substitute for a current discoverability admission.

## 10. Exact-ID anti-oracle boundary

The same gate applies to:

```text
EXACT_PAGE_ID
EXACT_TARGET_ID
```

Knowing or guessing an opaque locator must not bypass visibility policy.

Ordinary UI must not expose a locator-existence oracle by distinguishing:

```text
locator does not exist
locator exists but is not currently discoverable
locator exists but discoverability is HOLD
```

where such distinction would reveal protected page-existence metadata.

Internal diagnostics may preserve distinct reason codes. User-facing error wording belongs downstream and must not reveal hidden-result counts or protected existence state.

Runtime timing-side-channel evaluation is future validation work; this design does not claim timing equivalence is already implemented.

## 11. Hidden-result count boundary

Forbidden ordinary UI metadata:

```text
3 hidden results
1 protected match
result omitted because private
matched page exists but unavailable
```

Filtered/HOLD candidates do not contribute user-visible counts that reveal their existence.

## 12. Match and rank remain non-authority

```text
exact label match
prefix match
rank #1
exact pageIdentity query
```

never upgrade discoverability.

X2-3 ranking receives only candidates that remain internal until X2-2 authorizes visibility, or equivalently must apply X2-2 before result presentation. Exact pipeline placement may be frozen in X2-3, but no ranking stage may bypass this gate.

## 13. Candidate C position

X2-2 adds no durable semantic state and no new Candidate C gate.

```text
C1/C2 = inherited from PK-X1
C3-C8 = no new requirement
```

The discoverability receipt is current-activation-only and non-persistent.

## 14. Dormancy

Without an explicit current PK-X2 search job:

```text
discoverability lookups = 0
discoverability receipts = 0
search visibility UI work = 0
background visibility refresh = 0
```

No durable page may wake this path merely because it exists.

## 15. Impact verdict

```text
X2_2_IMPACT_SCOPE = FROZEN
SELECTED_SEAM = CURRENT_TARGET_PUBLIC_REFERENCE_DISCOVERABILITY_ADMISSION_V1
INTERNAL_CANDIDATE != VISIBLE_HIT
CURRENT_LABEL != DISCOVERABILITY_AUTHORITY
FULL_ARTICLE_PREVALIDATION_FOR_SEARCH = REJECTED
OLD_PAGE_EXISTENCE_FALLBACK = FORBIDDEN
EXACT_ID_BYPASS = FORBIDDEN
HIDDEN_RESULT_COUNTS = FORBIDDEN
NEW_CANDIDATE_C_GATES = NONE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

Next transaction: freeze the detailed X2-2 discoverability authority, receipts, fail-closed matrix, and anti-oracle presentation boundary.