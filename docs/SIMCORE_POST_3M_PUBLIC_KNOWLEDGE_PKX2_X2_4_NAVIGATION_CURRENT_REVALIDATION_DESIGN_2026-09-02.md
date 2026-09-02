# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-X2 X2-4 Navigation / Current Revalidation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **X2-4 DESIGN FROZEN · SEARCH SELECTION = CURRENT NAVIGATION INTENT ONLY · CURRENT TARGET RE-RESOLUTION · FRESH DISCOVERABILITY · EXISTING PAGE EXACT-BIND · FULL CURRENT PK REVALIDATION · ONE-SELECTION / ONE-JOB · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X2 · X2-4 · NAVIGATION · CURRENT REVALIDATION · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

X2-0 froze bounded PUBLIC_REFERENCE_SEARCH.
X2-1 froze complete current-lifetime locator retrieval and exact current trusted labels.
X2-2 froze current target/address discoverability before an internal candidate may become a visible hit.
X2-3 froze deterministic query semantics, ranking, and hard caps.

X2-4 freezes the bridge from one selected visible search hit to one current PUBLIC_KNOWLEDGE page attempt.

Canonical problem:

```text
search hit was visible at listing time
+
user selects it later
        ↓
how do we navigate without trusting stale search UI
or turning pageIdentity into current target / article authority?
```

This is design-only. It implements no navigation event type, runtime resolver, source-job selector change, model call, validator, renderer, storage mutation, URL router, history stack, release, S7/v0.70.3 work, or `release-simcore` mutation.

## 1. Final selected profile

```text
SEARCH_SELECTED_LOCATOR_TO_CURRENT_PUBLIC_REFERENCE_VIEW_V1
```

Canonical end-to-end flow:

```text
VISIBLE SEARCH HIT
        ↓ user selection
untrusted locator proposal
        ↓
current ACTIVE lifetime
        ↓
admitted current navigation-target resolver
        ↓
current targetRef + current target display label
        ↓
PX1-1 stable target identity confirmation
        ↓
PX1-2 existing page identity exact confirmation
        ↓
current single-target label projection
        ↓
fresh X2-2 discoverability admission
        ↓
current source-job authority
        ↓
one PUBLIC_KNOWLEDGE current job
        ↓
current PK semantic production
        ↓
PK-2 validation
        ↓
3M-6 support-at-use
        ↓
PX1-3 current-view binding
        ↓
PK-3 / PK-4 presentation + citation
```

Canonical rule:

```text
SEARCH FINDS THE ADDRESS.
CURRENT AUTHORITIES STILL OPEN THE DOOR.
```

## 2. Search selection intent

Frozen conceptual input:

```text
PublicReferenceSearchSelectionIntentV1
  pageIdentity
  targetIdentityRef
  lifetimeScopeRef
  selectionOrigin = PUBLIC_REFERENCE_SEARCH
```

This is conceptual vocabulary only. No runtime serialization is authorized.

The intent is treated as **untrusted locator/control-plane input** even when produced by the product's own search UI.

It does not contain a trusted `visible=true`, article status, settlement state, or target-binding verdict.

## 3. Selection field bounds

X2-4 inherits X2-3 locator bounds for current navigation input:

```text
pageIdentity UTF-8 bytes      <= 256
targetIdentityRef UTF-8 bytes <= 256
```

Both must be non-empty and structurally admissible for their owner domains.

No normalization, case folding, prefix interpretation, or semantic decoding is applied to these opaque locators.

## 4. Selection cardinality

Frozen first-scope limits:

```text
MAX_SELECTED_RESULTS_PER_NAVIGATION_ACTIVATION = 1
MAX_CURRENT_PK_JOBS_PER_SELECTED_RESULT        = 1
```

Rejected first-scope behavior:

```text
multi-select
open all
open top N
hover article prevalidation
adjacent-result prefetch
background article warming
```

The selection event is one bounded navigation request.

## 5. Old search state is not current authority

The following old card/search fields have **zero authority** in the new navigation activation:

```text
old currentTrustedDisplayLabel
old labelAuthorityRef
old discoverability receipt
old rank
old match class
old query
old visible-result count
old truncation flag
old search activation id
old DOM/card state
```

Canonical rule:

```text
WAS VISIBLE
!=
IS VISIBLE NOW
```

## 6. Old X2-2 receipt is non-reusable

X2-2 already froze its discoverability receipt as:

```text
EPHEMERAL
CURRENT SEARCH ACTIVATION ONLY
NON-PERSISTENT
```

Therefore X2-4 explicitly rejects:

```text
old search hit had VISIBLE_CURRENT
→ reuse old receipt during click/navigation
```

A new navigation activation requires a fresh current discoverability proof.

## 7. Current navigation-target authority

X2-4 needs a current owner capable of resolving a requested stable target locator into the target context used by PUBLIC_KNOWLEDGE **now**.

Frozen conceptual input:

```text
CurrentPublicReferenceNavigationTargetBindingV1
  navigationTargetAuthorityRef
  requestedTargetIdentityRef
  currentTargetRef
  currentTargetDisplayLabel
  validForLifetimeScopeRef
  bindingState
```

Only:

```text
bindingState = CURRENT_EXACT
```

is admitted.

Rejected states include:

```text
historical
stale
fuzzy
ambiguous
inferred
cross-lifetime
unavailable
conflicting
```

This producer/adapter is upstream-owned. X2-4 does not create target identity or target sameness.

## 8. Why pageIdentity cannot resolve the target by itself

PX1-3 froze the safe direction:

```text
current target authority
→ stable target identity
→ durable page lookup
```

Therefore this is forbidden:

```text
selected pageIdentity P
→ old record says target T
→ install T as current target
```

The selected `targetIdentityRef` is also only a requested locator until current authority resolves it.

Canonical rule:

```text
SELECTED ADDRESS
!=
CURRENT TARGET PROOF
```

## 9. Required current target exact join

After current target resolution, PX1-1 runs on the resulting current target context.

Required:

```text
PX1-1 status = READY_EXACT
PX1-1 targetIdentityRef == selection.targetIdentityRef
```

If not exact:

```text
INVALID_STABLE_TARGET_IDENTITY_MISMATCH
```

or an appropriate HOLD/INVALID state.

No title/label/alias comparison may substitute.

## 10. Existing page identity exact confirmation

After stable target identity is confirmed, PX1-2 resolves the current exact identity key:

```text
namespace = PUBLIC_KNOWLEDGE_DOCUMENT
lifetimeScopeRef = current trusted lifetime
 targetIdentityRef = selected/current exact target identity
```

Required result:

```text
FOUND_EXISTING
+
resolved pageIdentity == selection.pageIdentity
```

Search navigation does **not** use `RESOLVE_OR_MINT_FIRST`.

## 11. Search navigation never mints

Frozen rule:

```text
SEARCH NAVIGATION
= EXISTING ADDRESS REVALIDATION
```

If the selected address is:

```text
NOT_FOUND_AUTHORITATIVE
unavailable
corrupt
mismatched
cross-lifetime
```

X2-4 does not mint a replacement page identity.

This prevents a forged locator request from creating durable metadata.

## 12. Current lifetime is authoritative

The selected intent may carry a `lifetimeScopeRef`, but current trusted lifetime authority wins.

Required:

```text
selection.lifetimeScopeRef == current trusted lifetimeScopeRef
current lifetime state == ACTIVE
PX1-2 identity record lifetimeScopeRef == current trusted lifetimeScopeRef
```

Any mismatch fails closed.

An ended or recycled scope cannot be revived through an old search card.

## 13. Current label re-resolution

The label displayed on the selected card is presentation history, not navigation authority.

After current target identity is resolved, X2-4 obtains one current trusted label through the same admitted upstream label ownership model used by X2-1, but without corpus enumeration.

Conceptual result:

```text
CurrentSingleTargetSearchLabelBindingV1
  targetIdentityRef
  currentTrustedDisplayLabel
  labelAuthorityRef
  validForLifetimeScopeRef
  bindingState = CURRENT_EXACT
```

This is design vocabulary only.

## 14. Rename between search and click is allowed

Example:

```text
search time:
  page P → target T → "Old Name"

navigation time:
  page P → target T → "New Name"
```

If current target/label/discoverability authorities all admit `New Name`, navigation proceeds using `New Name`.

The old label does not need to exact-match the new one.

No automatic alias record is created.

Canonical rule:

```text
SAME TARGET / PAGE MAY HAVE A NEW CURRENT LABEL
```

## 15. Fresh X2-2 discoverability admission

X2-4 reruns target/address discoverability using the **new current label binding**.

Required exact joins:

```text
discoverability targetIdentityRef == current exact targetIdentityRef
discoverability admittedLabelAuthorityRef == current labelAuthorityRef
discoverability admittedCurrentDisplayLabel == currentTrustedDisplayLabel
discoverability validForLifetimeScopeRef == current lifetimeScopeRef
```

Required outcome:

```text
VISIBLE_CURRENT
```

All other X2-2 outcomes block search-origin navigation before article materialization.

## 16. Exact locator knowledge never bypasses discoverability

Even if the user supplies the exact current `pageIdentity` and `targetIdentityRef`:

```text
EXACT LOCATOR
!= CURRENT DISCOVERABILITY AUTHORITY
```

The ordinary UI must not turn exact locator input into a current page-existence oracle.

## 17. Navigation admission receipt

Frozen conceptual receipt:

```text
CurrentPublicReferenceNavigationAdmissionV1
  status
  pageIdentity
  targetIdentityRef
  currentTargetRef
  lifetimeScopeRef
  labelAuthorityRef?
  discoverabilityAuthorityRef?
  reasonCode
```

The receipt is:

```text
EPHEMERAL
CURRENT NAVIGATION ACTIVATION ONLY
NON-PERSISTENT
NON-CANONICAL
NON-MODEL-CONTEXT
```

It does not contain article body, old search state, hidden candidate state, settlement payload, or citation text.

## 18. Navigation admission states

Frozen conceptual states:

```text
READY_CURRENT_NAVIGATION

HOLD_NAVIGATION_TARGET_UNAVAILABLE
HOLD_TARGET_IDENTITY_UNAVAILABLE
HOLD_IDENTITY_STATE_UNAVAILABLE
HOLD_CURRENT_LABEL_UNAVAILABLE
HOLD_DISCOVERABILITY_UNAVAILABLE
HOLD_DISCOVERABILITY_UNPROVEN
HOLD_DISCOVERABILITY_CONFLICT

DENY_NOT_CURRENTLY_DISCOVERABLE

INVALID_SELECTION_SHAPE
INVALID_LIFETIME_BINDING
INVALID_NAVIGATION_TARGET_AUTHORITY
INVALID_CURRENT_TARGET_BINDING
INVALID_STABLE_TARGET_IDENTITY_MISMATCH
INVALID_PAGE_IDENTITY_MISMATCH
INVALID_IDENTITY_STATE_CORRUPT
INVALID_CURRENT_LABEL_BINDING
INVALID_DISCOVERABILITY_BINDING
```

Exact runtime names may differ; semantic distinctions must remain.

## 19. Deterministic navigation admission order

Conceptual evaluation order:

```text
1. selection shape / locator bounds invalid
   → INVALID_SELECTION_SHAPE

2. current lifetime not ACTIVE / mismatch
   → INVALID_LIFETIME_BINDING

3. current navigation target resolver missing/unadmitted
   → INVALID_NAVIGATION_TARGET_AUTHORITY

4. current target binding unavailable
   → HOLD_NAVIGATION_TARGET_UNAVAILABLE

5. target binding not CURRENT_EXACT
   → INVALID_CURRENT_TARGET_BINDING

6. PX1-1 unavailable
   → HOLD_TARGET_IDENTITY_UNAVAILABLE

7. PX1-1 identity != selected targetIdentityRef
   → INVALID_STABLE_TARGET_IDENTITY_MISMATCH

8. PX1-2 unavailable
   → HOLD_IDENTITY_STATE_UNAVAILABLE

9. PX1-2 corruption
   → INVALID_IDENTITY_STATE_CORRUPT

10. resolved existing pageIdentity != selected pageIdentity
   → INVALID_PAGE_IDENTITY_MISMATCH

11. current label unavailable
   → HOLD_CURRENT_LABEL_UNAVAILABLE

12. current label binding invalid
   → INVALID_CURRENT_LABEL_BINDING

13. fresh X2-2 non-visible state
   → corresponding DENY/HOLD/INVALID

14. all exact/current
   → READY_CURRENT_NAVIGATION
```

No later stage may promote a failed navigation admission.

## 20. Search UI does not directly materialize articles

`READY_CURRENT_NAVIGATION` authorizes only a handoff to the existing current source-job authority.

Frozen conceptual handoff:

```text
PublicReferenceNavigationHandoffV1
  familyRequest = PUBLIC_KNOWLEDGE
  pageIdentity
  targetIdentityRef
  currentTargetRef
  lifetimeScopeRef
```

This is design vocabulary only.

The search renderer/controller does not directly call the model or PK renderer.

## 21. Source-job authority remains authoritative

The handoff does not itself declare a source job active.

The existing current source-job authority must accept the current request and produce at most one current PUBLIC_KNOWLEDGE job.

Canonical separation:

```text
NAVIGATION REQUEST
!= ACTIVE SOURCE JOB
```

Future runtime must prove this ownership seam.

## 22. One navigation handoff cannot fan out

Frozen:

```text
one selected result
→ at most one PUBLIC_KNOWLEDGE current job
```

Forbidden:

```text
PUBLIC_KNOWLEDGE + NEWS fanout
PUBLIC_KNOWLEDGE + BOARD fanout
prefetch next result
materialize siblings
```

A later multi-family orchestration design would be required.

## 23. Search metadata must not enter semantic generation

The semantic producer/model must not receive automatic search-history baggage.

Forbidden automatic semantic input:

```text
old search query
old result rank
old match class
old result list
old result count
old hidden candidates
old discoverability receipt
old search UI text
old card DOM
```

Current semantic generation receives the normal PUBLIC_KNOWLEDGE current target/source/policy inputs only.

## 24. Why this is not Candidate C C6

A user selection creates a new current interaction/control event carrying bounded locators.

It does not automatically re-enter a previous structured semantic object into model context.

Canonical distinction:

```text
CURRENT USER/CONTROL NAVIGATION INTENT
!=
AUTOMATIC STRUCTURED SOURCE HISTORY REENTRY
```

Therefore C6 remains closed.

## 25. Why this is not Candidate C C5

The search hit is not a semantic truth parent.

It supplies navigation locators only.

The new PUBLIC_KNOWLEDGE article is grounded in current target/source/Exposure/settlement authorities.

Canonical rule:

```text
SEARCH HIT SELECTED
!=
SEARCH HIT BECOMES PUBLIC_KNOWLEDGE SOURCE
```

Therefore C5 remains closed.

## 26. Full current article pipeline after admission

After the current source-job authority admits the handoff, the normal current PUBLIC_KNOWLEDGE pipeline runs.

Conceptually:

```text
current PUBLIC_KNOWLEDGE target
→ current trusted source authority
→ Exposure policy
→ settlement context
→ semantic producer
→ PK-2 validator
→ 3M-6 support-at-use
→ PX1-3 binding
→ PK-3 / PK-4 presentation
```

Search adds no semantic shortcut.

## 27. PK-2 outcome mapping

Search-origin navigation does not alter PK-2 semantics.

First-scope downstream mapping remains:

```text
PK-2 VALID
→ current bindable candidate

PK-2 VALID_WITH_QUARANTINE
→ current bindable candidate using accepted content only

PK-2 VALID_EMPTY
→ no ordinary semantic article body

PK-2 QUARANTINED / INVALID / UNSUPPORTED_SCOPE
→ no ordinary semantic article body
```

Quarantined content never leaks through the search card.

## 28. Current support-at-use remains mandatory

Even after navigation admission and PK-2 validation, current support may change.

Required at actual current binding/presentation boundary:

```text
3M-6 = SUPPORTED_CURRENT
```

If support is missing, unknown, stale, or mismatched, the durable semantic view does not bind.

## 29. Navigation admission is not a substitute for PX1-3

`READY_CURRENT_NAVIGATION` proves:

```text
this currently discoverable selected address may attempt one current PK navigation
```

It does **not** prove:

```text
article valid
source support current
page body non-empty
citation valid
PX1-3 BOUND_CURRENT
```

PX1-3 runs normally downstream.

## 30. Successful current-page outcome

Canonical successful path:

```text
READY_CURRENT_NAVIGATION
+
current PK-2 bindable document
+
SUPPORTED_CURRENT
+
PX1-3 exact binding
        ↓
BOUND_CURRENT
        ↓
current PUBLIC_REFERENCE_DOCUMENT_V1 presentation
```

The rendered title/label is current-authority-derived, not copied from the old search card.

## 31. Current page unavailable outcome

If current address discoverability is re-proven but current PK semantics do not produce a bindable article, PX1-3/PX1-4 remain authoritative.

Possible current presentation state:

```text
CURRENT_PAGE_UNAVAILABLE
```

The shell may use only currently admitted label/presentation metadata.

It must not restore:

```text
old body
old citation
old settlement
old source refs
old search snippet
```

## 32. Protected navigation failure anti-oracle behavior

If fresh current discoverability cannot be admitted, ordinary UI must not reveal protected internal distinctions merely because the user clicked an old card or supplied an exact locator.

Forbidden ordinary messages include:

```text
"page still exists but is private now"
"target exists but is hidden"
"this used to be valid"
```

First-scope ordinary UX should collapse protected failure states into a generic current-unavailable/not-available result.

Internal diagnostics may preserve exact reason codes.

## 33. Search card may remain historical UI but gains no current authority

The product may still display the old search result card in host/UI history according to ordinary host behavior.

That does not make it current.

Canonical distinction:

```text
HISTORICAL UI ARTIFACT
!= CURRENT NAVIGATION ADMISSION
```

X2-4 does not mutate old transcript/search history as part of this design.

## 34. Snapshot-only degradation is narrow

X2-4 permits only the already-frozen PX1-3/PX1-4 narrow durability-failure degradation.

Additional X2-4 guard:

```text
selected pageIdentity must have been successfully exact-bound
in the same current navigation activation
before any snapshot-only degradation is considered
```

This prevents a forged/unverified page address from degrading directly into targetIdentityRef-only navigation.

Required for `SNAPSHOT_ONLY_CURRENT` consideration:

```text
current target identity exact
selected page identity exact-bound earlier in this activation
current label current/exact
current discoverability = VISIBLE_CURRENT
current PK semantics valid
current source support = SUPPORTED_CURRENT
durable current-view attachment alone becomes unavailable later
explicit product policy permits snapshot degradation
```

## 35. Snapshot fallback forbidden cases

No snapshot degradation for:

```text
initial page identity not verifiable
target identity mismatch
page identity mismatch
identity corruption
lifetime mismatch
discoverability DENY/HOLD/INVALID
semantic validation failure
source-support mismatch
navigation target authority failure
```

Canonical rule:

```text
VERIFIED ADDRESS + LATE DURABILITY FAILURE
MAY DEGRADE

UNVERIFIED ADDRESS / VISIBILITY / SEMANTIC FAILURE
MAY NOT
```

## 36. No stale card fallback

When current navigation or current article validation fails, old search fields cannot become semantic fallback.

Forbidden:

```text
old label as current title authority
old result card as page shell authority
old query as article context
old rank as article metadata
old discoverability as current visibility
```

## 37. No deep-link contract

X2-4 does not define a public permanent URL format for `pageIdentity`.

It also does not define:

```text
share links
external deep links
cross-device links
cross-conversation page URLs
browser address-bar semantics
```

Those require a separate routing/lifetime/privacy design.

## 38. No durable navigation history

X2-4 does not introduce:

```text
recently viewed pages
navigation stack store
breadcrumb history
back/forward semantic authority
navigation analytics authority
```

Host-local ephemeral UI navigation behavior may exist independently, but it is not PUBLIC_KNOWLEDGE truth or model context.

## 39. No background prefetch

Search results remain cheap navigation descriptors.

Forbidden first-scope behavior:

```text
hover → PK generation
scroll near result → PK generation
search result render → PK generation
rank top result → PK generation
```

Only explicit current selection may request one current handoff.

## 40. TOCTOU / current-at-commit rule

A navigation activation may span multiple checks.

If the runtime detects that any authority bound by the current navigation admission has become stale/mismatched before ordinary page commit, the operation must abort/re-evaluate rather than present under the old receipt.

Canonical rule:

```text
VALID EARLIER IN NAVIGATION
!= VALID AFTER KNOWN INVALIDATION
```

This complements 3M-6 support-at-use.

The exact invalidation signaling mechanism remains implementation work.

## 41. Receipt persistence is forbidden

Neither `CurrentPublicReferenceNavigationAdmissionV1` nor its intermediate current target/label/discoverability bindings become durable PUBLIC_KNOWLEDGE state.

Forbidden persistence:

```text
lastNavigatedAt
lastNavigationVisible
lastNavigationLabel
lastSearchRank
lastSearchQuery
cached navigation admission
```

This avoids a mutable navigation/search truth index.

## 42. Dormancy

Without an explicit current search-result selection:

```text
navigation target resolution = 0
selected page identity validation = 0
single-target label resolution = 0
discoverability recheck = 0
navigation handoff = 0
PK generation from search = 0
navigation prefetch = 0
```

No old visible search card wakes the navigation path by itself.

## 43. Candidate C reassessment

X2-4 consumes only the already selected PK-X1 durable identity profile:

```text
C1 cross-turn locator survival = inherited
C2 stable page identity        = inherited

C3 semantic mutation           = NO
C4 append / merge              = NO
C5 derived semantic lineage    = NO
C6 model-context reentry       = NO
C7 historical semantic survival= NO
C8 delayed semantic attachment = NO
```

User-mediated selection does not activate C6 or C8.

## 44. Failure containment

A failure in navigation admission must not mutate:

```text
page identity store
current PUBLIC_KNOWLEDGE truth
search corpus
search result history
other source families
host-owned metadata
```

A downstream PK generation/validation failure likewise does not invalidate the durable page identity itself unless a separate identity authority reports identity corruption.

## 45. Future runtime evidence gates

X2-4 runtime readiness requires concrete proof of:

```text
G-X2-4-1 admitted current navigation-target resolver
G-X2-4-2 exact current target → PX1-1 → targetIdentityRef chain
G-X2-4-3 existing page exact confirmation with no mint path
G-X2-4-4 single-target current label authority
G-X2-4-5 fresh X2-2 discoverability at navigation
G-X2-4-6 one selection → one source-job handoff
G-X2-4-7 search metadata excluded from semantic/model input
G-X2-4-8 full current PK-2 + support-at-use + PX1-3 path after selection
G-X2-4-9 protected navigation failure anti-oracle UX
G-X2-4-10 no hover/background prefetch
G-X2-4-11 snapshot degradation only after same-activation exact page bind
G-X2-4-12 no persistent navigation receipt/history
```

None is implementation-authorized by this document.

## 46. Required future validation cases

Future implementation validation must cover at minimum:

```text
1. visible hit selected immediately → current page success
2. label renamed between search and click → current label used
3. discoverability DENY between search and click → no article materialization
4. discoverability HOLD between search and click → generic protected failure
5. target identity changes/mismatches → invalid navigation
6. pageIdentity mismatches selected target → invalid navigation
7. exact forged pageIdentity/targetIdentityRef → no visibility bypass / no mint
8. current PK VALID_EMPTY → current unavailable shell, no stale body
9. current PK INVALID → no stale body
10. support lost after validation → no BOUND_CURRENT
11. late durability-only failure after same-activation exact page bind → snapshot only if explicitly permitted
12. initial identity-store unavailable → no snapshot degrade through search navigation
13. repeated click → independent current revalidation each activation
14. old discoverability receipt replay → rejected
15. old search label replay → ignored as authority
16. no selection → zero navigation work
17. hover/list render → zero PK generation
18. selection causes exactly one PK job
```

## 47. Transaction anomaly record

Before the X2-4 impact branch was created, an accidental one-line placeholder document was written directly to main and immediately reverted.

```text
accidental write:
7057749a4c437f78d903b31393df6049652c7f81

revert/removal:
565c7dbc9ac20fcab41c257faf5befd866b65b00
```

Frozen classification:

```text
FIX · ACCIDENTAL_MAIN_PLACEHOLDER_WRITE_REVERTED
```

The placeholder does not exist in the baseline tree used by X2-4 impact/design PRs. This anomaly grants no implementation authority and does not affect `release-simcore`.

## 48. Concurrent main record

Before X2-4, main also advanced through Agent Skill PR #1320:

```text
54c92f5920ecd662191a1e6338a622e0ecf89414
```

Its files are Agent Skill orchestrator design/tooling/tests, not PUBLIC_KNOWLEDGE navigation authority.

Frozen classification:

```text
WATCH · MAIN_ADVANCED_BEFORE_X2_4_TRANSACTION · NON_BLOCKING
```

## 49. X2 roadmap after this checkpoint

```text
X2-0 Search Master                            ✅
X2-1 Retrieval / Label Authority              ✅
X2-2 Candidate Visibility / Discoverability   ✅
X2-3 Query Semantics / Ranking / Hard Caps    ✅
X2-4 Navigation / Current Revalidation        ✅ DESIGN FROZEN
X2-5 Lifetime / Dormancy / Convergence        ← NEXT
```

## 50. Final frozen invariants

```text
SEARCH SELECTION IS NAVIGATION INTENT ONLY

OLD SEARCH VISIBILITY DOES NOT SURVIVE AS AUTHORITY

PAGE IDENTITY DOES NOT REVERSE-PROVE CURRENT TARGET

CURRENT TARGET MUST BE RE-RESOLVED

PX1-1 MUST RECONFIRM THE SELECTED TARGET IDENTITY

PX1-2 MUST CONFIRM THE EXISTING SELECTED PAGE

SEARCH NAVIGATION NEVER MINTS

CURRENT LABEL IS RE-RESOLVED

X2-2 DISCOVERABILITY RUNS AGAIN

ONE SELECTION CREATES AT MOST ONE CURRENT PK JOB

SEARCH METADATA DOES NOT ENTER SEMANTIC/MODEL CONTEXT

PK-2 + SUPPORT-AT-USE + PX1-3 RUN NORMALLY

NO STALE ARTICLE / CARD FALLBACK

SNAPSHOT DEGRADE REQUIRES SAME-ACTIVATION EXACT PAGE BIND FIRST

NO NAVIGATION HISTORY / DEEP LINK / PREFETCH PRODUCT IN X2-4

NO NEW CANDIDATE C GATE
```

## 51. Status

```text
X2-4 DESIGN = FROZEN
X2-4 RUNTIME IMPLEMENTED = NO
X2-4 RUNTIME READY = NO
REAL VALIDATION = NOT RUN
RELEASE AUTHORIZED = NO
```
