# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-4 Navigation / Current Revalidation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-4 IMPACT SCOPE FROZEN · SEARCH-HIT SELECTION IS NAVIGATION INTENT ONLY · CURRENT TARGET / DISCOVERABILITY / PK REVALIDATION REQUIRED · ONE-SELECTION / ONE-JOB BOUND · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-4 · NAVIGATION · CURRENT REVALIDATION · NO IMPLEMENTATION AUTHORITY**

## 0. Baseline

Repository: `hanmiyoo10-alt/-`

Current design baseline at transaction start:

```text
main = 565c7dbc9ac20fcab41c257faf5befd866b65b00
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

The X2-3 merge `6493235ea90c7a1d93665f2df67780a6b46b01db` remains an ancestor of current main.

Concurrent main advance before this transaction:

```text
54c92f5920ecd662191a1e6338a622e0ecf89414
= Agent Skill O3 parallel scheduler/root provenance
```

It is semantically unrelated to PUBLIC_KNOWLEDGE navigation and is non-blocking.

Transaction hygiene correction:

```text
FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE_REVERTED
```

A one-line placeholder file was accidentally written directly to `main` at `7057749a4c437f78d903b31393df6049652c7f81` and immediately removed at `565c7dbc9ac20fcab41c257faf5befd866b65b00` before any X2-4 design artifact was authored. Final main tree contains no placeholder file. No runtime/release bytes were changed.

## 1. Purpose

X2-0 froze bounded PUBLIC_REFERENCE_SEARCH.
X2-1 froze authoritative current-lifetime locator retrieval and current trusted labels.
X2-2 froze current target/address discoverability before a search candidate may become visible.
X2-3 froze deterministic query semantics, ranking, and hard caps.

X2-4 must freeze what happens after the user selects one visible search hit.

Core question:

```text
VISIBLE SEARCH HIT SELECTED
        ↓
what current authority must run again
before this becomes a current PUBLIC_KNOWLEDGE page view?
```

## 2. Selected impact seam

Selected seam:

```text
VISIBLE_SEARCH_HIT_SELECTION_TO_CURRENT_PK_REVALIDATION_V1
```

Canonical rule:

```text
SEARCH HIT SELECTION
= NAVIGATION INTENT

SEARCH HIT SELECTION
!= CURRENT TARGET PROOF
!= CURRENT DISCOVERABILITY PROOF
!= CURRENT ARTICLE VALIDITY
!= CURRENT SETTLEMENT
!= CURRENT PAGE-VIEW BINDING
```

## 3. Search selection is an untrusted locator proposal

A search-result click may conceptually carry only bounded locator metadata such as:

```text
pageIdentity
targetIdentityRef
lifetimeScopeRef
selectionOrigin = PUBLIC_REFERENCE_SEARCH
```

The selected hit must not carry authority-bearing claims such as:

```text
isStillVisible = true
articleValid = true
settled = true
currentTarget = true
currentLabelStillValid = true
```

The event is user/navigation control-plane input, not semantic truth.

## 4. Search result fields that must not become semantic authority

The following may exist in the old visible card but cannot authorize the new navigation activation:

```text
old currentTrustedDisplayLabel
old labelAuthorityRef
old discoverability receipt
old rank
old match class
old query string
old result count
old truncation state
old UI node
```

Canonical rule:

```text
WAS VISIBLE IN SEARCH
!= VISIBLE / VALID NOW
```

## 5. New current target resolution seam

PX1-3 deliberately froze the safe direction:

```text
current target authority
→ stable target identity
→ durable page lookup
```

and rejected:

```text
old pageIdentity
→ infer current target
```

Therefore X2-4 needs an admitted current navigation-target resolver/adapter owned by the current target authority.

Conceptual output:

```text
CurrentPublicReferenceNavigationTargetBindingV1
  navigationTargetAuthorityRef
  requestedTargetIdentityRef
  currentTargetRef
  currentDisplayLabel
  validForLifetimeScopeRef
  bindingState = CURRENT_EXACT
```

This is design vocabulary only. No runtime schema is implemented.

X2-4 consumes this binding. It does not create canonical target identity.

## 6. Required exact current target chain

Conceptual chain:

```text
selected targetIdentityRef T
        ↓
admitted current target resolver
        ↓
current targetRef R + current label
        ↓
PX1-1(R)
        ↓
READY_EXACT targetIdentityRef T'
        ↓
require T' == selected T
        ↓
PX1-2 exact key lookup
(namespace, current lifetime, T)
        ↓
require resolved pageIdentity == selected pageIdentity
```

No label/title/alias/fuzzy/history heuristic may replace these exact joins.

## 7. Page identity cannot reverse-prove the target

Forbidden:

```text
selected pageIdentity P
→ stored targetIdentityRef T
→ therefore current target is T
```

Correct:

```text
selected T is only a requested locator
+
current target authority resolves current target
+
PX1-1 independently confirms T
+
PX1-2 independently confirms P for T
```

Canonical rule:

```text
OLD / SELECTED PAGE ADDRESS
DOES NOT CREATE CURRENT TARGET AUTHORITY
```

## 8. Search navigation never mints a new page identity

If the selected locator no longer resolves exactly:

```text
NOT_FOUND
MISMATCH
CORRUPT
UNKNOWN
UNAVAILABLE
```

X2-4 may not invoke PX1-2 first mint.

Canonical rule:

```text
SEARCH NAVIGATION
= EXISTING ADDRESS REVALIDATION ONLY
```

Page creation remains a separate ordinary PUBLIC_KNOWLEDGE first-mint path.

This prevents a forged search-selection event from becoming a metadata-creation trigger.

## 9. Current label must be re-resolved

The selected card label is never reused as current authority.

After current target resolution, X2-4 must obtain the current trusted label through the admitted single-target label authority path compatible with X2-1.

If the target was renamed between search and click:

```text
search card: Old Name
navigation activation: New Name
```

then current navigation uses `New Name` only if current authority proves it.

No automatic alias history is created.

## 10. X2-2 discoverability must run again

The old `CurrentPublicReferenceDiscoverabilityReceiptV1` is current-search-activation-only and cannot authorize navigation.

X2-4 must run current discoverability again for the exact current:

```text
targetIdentityRef
labelAuthorityRef
currentTrustedDisplayLabel
lifetimeScopeRef
```

Required result before current search-origin page navigation proceeds:

```text
VISIBLE_CURRENT
```

Canonical rule:

```text
VISIBLE WHEN LISTED
!=
VISIBLE WHEN SELECTED
```

## 11. Discoverability recheck is still not article validation

Even after current discoverability passes:

```text
VISIBLE_CURRENT
!=
CURRENT ARTICLE VALID
```

The user has permission to address/navigate to the target on this surface, not permission to reuse any previous article semantics.

## 12. Current source-job handoff

After exact target/page/discoverability admission, X2-4 hands a bounded navigation request to the existing current source-job authority.

The intended result is:

```text
one current PUBLIC_KNOWLEDGE job
for one current target
```

Search UI must not directly invoke the semantic model/producer or renderer.

Canonical separation:

```text
SEARCH SELECTION
→ NAVIGATION HANDOFF
→ CURRENT SOURCE-JOB AUTHORITY
→ PUBLIC_KNOWLEDGE PIPELINE
```

## 13. Full current page revalidation remains downstream

The selected target must traverse the normal current PUBLIC_KNOWLEDGE path:

```text
current target authority
→ current source authority
→ current Exposure / settlement policy
→ PK semantic producer
→ PK-2 validator
→ 3M-6 support-at-use
→ PX1-3 current-view binding
→ PK-3 / PK-4 presentation + citation
```

No search artifact substitutes for any stage.

## 14. No search-result semantic forwarding

The current PUBLIC_KNOWLEDGE producer/model must not receive old search UI state merely because navigation originated from search.

Forbidden automatic forwarding:

```text
search query
result rank
match class
other search results
hidden-candidate count
old discoverability receipt
old card label
old card DOM
```

The semantic path receives only the newly resolved current target/authority inputs normally admitted by PUBLIC_KNOWLEDGE.

## 15. Search result selection is not Candidate C C6 re-entry

A user click creates a new current navigation/control event.

It does not authorize automatic structured source-history re-entry into model context.

Canonical distinction:

```text
USER-SELECTED LOCATOR CONTROL EVENT
!=
AUTOMATIC PRIOR SEMANTIC PAYLOAD REENTRY
```

Therefore X2-4 does not activate C6.

## 16. Search result is not a semantic parent

The search hit is navigation metadata, not a source-family semantic object.

Therefore:

```text
SEARCH RESULT → PUBLIC_KNOWLEDGE
```

is not a C5 derived-to-derived truth lineage.

The resulting article is grounded in current PUBLIC_KNOWLEDGE authorities, not in the search result.

C5 remains closed.

## 17. One-selection / one-job bound

Frozen first-scope bound:

```text
MAX_SELECTED_RESULTS_PER_NAVIGATION_ACTIVATION = 1
MAX_PUBLIC_KNOWLEDGE_JOBS_FROM_ONE_SELECTION = 1
```

Forbidden:

```text
multi-select open
batch materialization
open top 5
adjacent-result prefetch
hover prevalidation
background article warming
```

This preserves the 3M-9 one-current-source-job discipline.

## 18. Navigation failure classes

Conceptual internal outcomes include:

```text
NAVIGATION_TARGET_READY
HOLD_TARGET_RESOLUTION_UNAVAILABLE
HOLD_TARGET_IDENTITY_UNAVAILABLE
HOLD_DISCOVERABILITY_UNAVAILABLE
DENY_NOT_CURRENTLY_DISCOVERABLE
INVALID_TARGET_IDENTITY_MISMATCH
INVALID_PAGE_IDENTITY_MISMATCH
INVALID_LIFETIME_BINDING
INVALID_IDENTITY_STATE_CORRUPT
INVALID_NAVIGATION_AUTHORITY
```

Exact enum spelling remains future implementation work.

## 19. Anti-oracle presentation boundary

Ordinary UI must not reveal internal protected distinctions simply because the user supplied an exact locator.

If current target/address discoverability cannot be re-proven, ordinary navigation failure should remain generic rather than exposing:

```text
"this page exists but is hidden"
"this exact target still exists but is private"
"this locator was valid before"
```

A future product-specific error UX may distinguish states only after a separate privacy review.

## 20. Current-page unavailable shell

If current target/address discoverability is re-proven but the downstream current PK document is not bindable, PX1-3/PX1-4 semantics remain authoritative.

Possible ordinary outcome:

```text
CURRENT_PAGE_UNAVAILABLE
```

with only currently admitted non-semantic/current-label presentation.

No old body, citation, settlement, or snippet may be restored.

## 21. Snapshot fallback impact decision

First-scope X2-4 allows only the already-frozen PX1-3 style **narrow durability-failure degradation**, and only when all of the following remain current/exact:

```text
current target identity
current target discoverability
current PK semantic validity
current source support
```

If durability alone is temporarily unavailable and a product policy explicitly permits it:

```text
SNAPSHOT_ONLY_CURRENT
```

may be used with no durable pageIdentity continuity claim.

Forbidden snapshot fallback for:

```text
target mismatch
identity corruption
lifetime mismatch
discoverability DENY/HOLD
semantic validation failure
source-support mismatch
```

Canonical rule:

```text
DURABILITY FAILURE MAY DEGRADE
SEMANTIC / VISIBILITY FAILURE MAY NOT
```

## 22. No stale card fallback

When navigation fails downstream, the old search card must not become the page body or article header authority.

Forbidden:

```text
old search card label → current article title
old card → stale article shell
old rank → page metadata
old search snippet → fallback body
```

## 23. No navigation history product in X2-4

X2-4 does not introduce:

```text
persistent route history
breadcrumb history
back-stack authority
deep links
shareable permanent URLs
cross-conversation navigation
recently viewed pages
```

These are separate product/lifetime designs.

## 24. No Candidate C expansion

X2-4 consumes the existing PK-X1 C1+C2 capability profile only.

```text
C1 cross-turn page locator survival = inherited
C2 stable derived page identity      = inherited
C3 semantic mutation                 = NO
C4 append / merge                    = NO
C5 derived semantic lineage          = NO
C6 model-context reentry             = NO
C7 historical semantic survival      = NO
C8 delayed semantic attachment       = NO
```

## 25. Performance / dormancy impact

Source/search-irrelevant turns remain dormant.

No active navigation selection means:

```text
navigation target resolution = 0
selected page lookup = 0
discoverability recheck = 0
PK generation from search = 0
navigation prefetch = 0
background model call = 0
```

One user selection may activate at most one bounded navigation chain.

## 26. Blockers before runtime

Future implementation would require proof of:

```text
CURRENT_NAVIGATION_TARGET_RESOLVER_AUTHORITY
SINGLE_TARGET_CURRENT_LABEL_AUTHORITY
CURRENT_DISCOVERABILITY_RECHECK_AT_NAVIGATION
EXACT_SELECTED_TARGET_TO_PAGE_BINDING
NO_PAGE_MINT_FROM_SEARCH_NAVIGATION
ONE_SELECTION_ONE_JOB_ENFORCEMENT
NO_SEARCH_UI_SEMANTIC_REENTRY
CURRENT_PK_REVALIDATION_AFTER_SELECTION
STALE_SEARCH_CARD_TEARDOWN / NON-AUTHORITY
GENERIC_PROTECTED_NAVIGATION_FAILURE UX
```

None of these are implemented by this design transaction.

## 27. Impact conclusion

Selected X2-4 profile:

```text
SEARCH_SELECTED_LOCATOR_TO_CURRENT_PUBLIC_REFERENCE_VIEW_V1
```

Authority summary:

```text
visible search result
→ user navigation intent only

current target owner
→ current target binding

PX1-1
→ stable target identity confirmation

PX1-2
→ existing durable page identity confirmation

X2-1-compatible label authority
→ current label

X2-2
→ current discoverability

current source-job / PK authorities
→ current article generation + validation

PX1-3
→ current page-view binding
```

X2-4 is safe to proceed as a design-only checkpoint.
