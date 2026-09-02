# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-1 Context Selection / Exact Address Impact Scope - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-1 IMPACT SCOPE FROZEN · TRUSTED OPERATION-SCOPED CONTEXT INTENT · NON-RECYCLABLE OPERATION REF · EXACT ACTIVE PAGE ADDRESS · OWNER-RESOLVED CURRENT HEAD · REVISION PINNING · REQUIRED / OPTIONAL FAILURE SPLIT · NO CALLER-SELECTED HISTORICAL REVISION · NO FUZZY / AMBIENT SELECTION · C6 ONLY · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-1 · CONTEXT SELECTION · EXACT ADDRESS · CANDIDATE C C6 · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D4-0 opened the first explicit Candidate C C6 profile:

```text
EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

D4-1 decides how one live model operation acquires an exact contextual durable-page address without turning persistence, search, history, UI state, or model-generated text into context authority.

The selected impact seam is:

```text
TRUSTED LIVE OPERATION
+ OPERATION-SCOPED CONTEXT INTENT
+ EXACT ACTIVE lifetimeScopeRef/pageIdentity
+ PK-D2 OWNER-RESOLVED CURRENT HEAD
→ EPHEMERAL EXACT CONTEXT SELECTION BINDING
```

This document is design-only. It adds no prompt code, no model call, no storage schema, no runtime enum, no UI wiring, no search integration, no release change, and no `release-simcore` mutation.

## 1. Inherited master rules

D4-1 preserves D4-0:

```text
DURABLE PAGE PRESENT
!= MODEL CONTEXT

SEARCH HIT
!= CONTEXT AUTHORITY

MODEL REQUEST
!= CONTEXT RETRIEVAL AUTHORITY

CURRENT HEAD
!= CURRENTLY AUTHORIZED MODEL CONTEXT
```

D4-1 owns only context selection/addressing. Current semantic revalidation remains D4-2. Prompt role/instruction firewall remains D4-3.

## 2. First-profile source remains current head only

D4-1 does not accept arbitrary revision selection for V1.

Frozen direction:

```text
trusted intent selects pageIdentity
→ PK-D2 owner selects current head revisionRef
```

Forbidden direction:

```text
caller provides pageIdentity + arbitrary revisionRef
→ use as ordinary D4 context
```

Historical revision context remains deferred.

## 3. Selection authority classes

D4-1 distinguishes:

```text
PARENT OPERATION AUTHORITY
CONTEXT INTENT AUTHORITY
PAGE IDENTITY AUTHORITY
CURRENT HEAD AUTHORITY
```

None may impersonate another.

## 4. Parent operation authority

A D4 selection exists only for one live parent semantic/model operation.

The parent operation owns the lifecycle in which C6 may occur.

A durable page does not create its own parent operation.

## 5. Conceptual intent shape

The existing D4-0 vocabulary remains:

```text
PublicKnowledgeContextIntentV1
  schemaVersion
  operationRef
  pageIdentity
  requirementMode
```

D4-1 impact freezes the semantic meaning of these fields, not a runtime serialization.

## 6. `operationRef` purpose

`operationRef` binds one D4 context decision to one live parent model/semantic operation.

It is not:

```text
pageIdentity
revisionRef
lifetimeScopeRef
conversation id
turn number
host message id
request timestamp
```

## 7. `operationRef` must be trusted

The value must come from trusted operation lifecycle authority.

Forbidden origins:

```text
model-generated string
page body
user-visible title
DOM attribute
random text parsed from prompt
revision content
```

## 8. Non-recyclable operation identity

Impact requirement:

```text
terminal operationRef X
!= future unrelated live operationRef X
```

If an implementation uses counters/slots, it must include a non-recycled generation or collision-safe opaque component.

Reason:

```text
stale D4 selection binding
+ recycled operationRef
→ accidental context replay into unrelated model call
```

## 9. One-operation lifetime

A D4 selection binding is valid only while its exact parent operation is live.

Terminal conditions include conceptually:

```text
COMPLETED
FAILED
CANCELLED
SUPERSEDED
```

After terminality:

```text
selection binding use = forbidden
```

## 10. Operation cancellation

Cancellation invalidates the ephemeral D4 selection immediately when observable before dispatch.

It does not delete the durable page or revision.

## 11. Operation supersession

If a host/product operation is superseded by a newer operation:

```text
old operationRef
→ no prompt attachment authority
```

No last-selection wins heuristic is allowed.

## 12. Context intent must be explicit

A current trusted operation must explicitly classify that PUBLIC_KNOWLEDGE context is requested.

Acceptable conceptual chain:

```text
current user/product action
→ trusted operation interpretation
→ D4 context intent
```

## 13. Ambient state is not intent

Forbidden activation signals by themselves:

```text
page is currently open
page was viewed last turn
page is most recent
page is highlighted
page title resembles request
page appeared in transcript
page was used previously
model mentions page
```

## 14. User text is not itself exact address authority

Natural-language text may motivate a trusted product/SimCore selection step.

It does not directly become `pageIdentity` merely by string parsing.

## 15. Search remains discovery only

PK-X2 may help a user/product locate a current durable page.

Required boundary:

```text
search result
→ explicit trusted selection
→ exact pageIdentity
→ D4 intent
```

Not:

```text
rank #1 search result
→ automatic D4 context
```

## 16. Search ordinal is never identity

Forbidden exact-address substitutes:

```text
result index
rank position
page title
snippet
search score
```

## 17. Exact page address

The minimum durable address is:

```text
lifetimeScopeRef
+ pageIdentity
```

Both must be validated against trusted durable-page authority.

## 18. Caller may not invent lifetime scope

A stale/caller-supplied lifetime scope string cannot establish ACTIVE authority.

The current trusted lifetime owner must attest the scope.

## 19. Lifetime state requirement

Only:

```text
ACTIVE
```

permits D4 V1 selection.

For:

```text
ENDED
UNKNOWN
```

selection fails closed.

## 20. No cross-lifetime resolution

Forbidden:

```text
current operation lifetime = B
selected page lifetime = A
→ context use
```

Even when title/target labels match.

## 21. Non-recyclable lifetime remains mandatory

PX1-4's non-recycled lifetime identity requirement remains a hard prerequisite for C6.

Physical residue from an ended scope never becomes future prompt memory.

## 22. Page identity must resolve exactly

Selection uses exact durable-page owner resolution.

Forbidden fallback:

```text
fuzzy title lookup
old display label
host card id
DOM route
content fingerprint
first assertion text
```

## 23. Page corruption is not selection ambiguity

If durable page identity state is unavailable, conflicting, or corrupt:

```text
no D4 exact selection
```

Do not choose a candidate by title or newest timestamp.

## 24. Target continuity is not inferred from label

Where page identity remains target-bound, the current trusted target identity must remain compatible.

A changed display label alone does not create a new target.

A matching label alone does not prove the same target.

## 25. V1 page count

Frozen:

```text
MAX SELECTED PAGES PER D4 V1 OPERATION = 1
```

No implicit top-K expansion.

## 26. No related-page expansion

Selecting page P does not authorize:

```text
P's linked pages
same-target pages
similar pages
citation-linked pages
historical ancestors
```

to enter context.

## 27. Revision selection belongs to PK-D2 head owner

D4 intent selects the logical page.

The exact semantic generation is selected by reading PK-D2 current-head authority.

Canonical rule:

```text
CALLER SELECTS PAGE
OWNER RESOLVES CURRENT REVISION
```

## 28. Arbitrary caller revisionRef forbidden

First profile rejects an intent shaped semantically as:

```text
pageIdentity=P
revisionRef=R4
```

when R4 is merely caller chosen.

The current-head owner must establish which revision is eligible for V1 selection.

## 29. Historical navigation does not become D4 current selection

A user currently viewing historical R4 does not imply:

```text
D4 current context = R4
```

History view remains D3 authority.

## 30. Current-head read must be authoritative

No cached head value from:

```text
previous turn
page UI
history list
search result
host transcript
last D4 envelope
```

is sufficient.

## 31. Head-absent semantics remain inherited

D2 head states remain authoritative.

Selection must distinguish at least conceptually:

```text
HEAD_FOUND
HEAD_ABSENT_AUTHORITATIVE
HEAD_UNAVAILABLE
HEAD_INVALID
```

D4 does not reinterpret cache miss as authoritative absence.

## 32. Page with no revision

A durable page with zero committed revisions and authoritative head absence cannot provide D4 semantic context.

The page may validly exist, but:

```text
NO CURRENT SEMANTIC REVISION
→ no D4 context selection binding
```

## 33. Head corruption

If committed history exists but head is missing/invalid, D4 does not select the numerically/latest-looking revision.

Fail closed.

## 34. Exact committed membership remains required

After head resolution, the selected `revisionRef` must resolve to an exact committed immutable revision belonging to the same page.

A staging/uncommitted residue cannot be selected.

## 35. Context selection binding

D4-1 reserves an ephemeral conceptual object:

```text
PublicKnowledgeContextSelectionBindingV1
  schemaVersion
  operationRef
  requirementMode
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef?
  selectedRevisionRef
  contextProfile = EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

The exact runtime schema is deferred.

## 36. Selection binding is ephemeral

Properties:

```text
EPHEMERAL
ONE OPERATION
NON-DURABLE
NON-CANONICAL
NON-SEARCH-AUTHORITY
NON-MUTATION-AUTHORITY
NON-INSTRUCTION-AUTHORITY
```

## 37. Selection binding is an expectation, not a lock

Pinning `selectedRevisionRef = R8` means:

```text
this operation expects R8 to remain current until dispatch admission
```

It does not lock the page against concurrent mutation.

## 38. Selection pin timing

First pin occurs only after:

```text
trusted intent accepted
+ ACTIVE lifetime proven
+ exact pageIdentity resolved
+ authoritative current head read
+ exact committed revision membership proven
```

## 39. No pre-address pin from UI

A UI may display R8 before the D4 operation starts.

That display-time value is not the D4 pin.

D4 re-reads head after intent admission.

## 40. Currentness must be checked again later

D4-1 freezes that the selected revision must be compared with a fresh authoritative head read before final prompt/model dispatch.

Detailed placement composes with D4-2/D4-3.

## 41. Stale selection

If:

```text
selectedRevisionRef = R8
fresh head before dispatch = R9
```

then:

```text
STALE_CONTEXT_SELECTION
→ R8 must not be attached
```

## 42. No implicit rebase

Forbidden:

```text
R8 selected
R9 now current
→ silently substitute R9 inside already-materialized context
```

The operation must restart/re-materialize through the bounded D4 path.

## 43. Fresh restart may remain within the same parent operation only if explicitly supported

D4-1 does not require a new user action for every pre-dispatch stale race.

A future implementation may perform a bounded fresh selection attempt for the same still-live `operationRef` if product policy explicitly permits it.

But the prior R8 binding becomes invalid and cannot be merged with the new binding.

## 44. No unbounded retry loop

Stale-head churn must not produce infinite re-selection.

Numeric retry bounds are deferred to D4-5.

## 45. After dispatch boundary

Once a context envelope was validly attached and the model dispatch occurred:

```text
later head mutation
!= permission to patch in-flight model context
```

This preserves C8 closed.

## 46. Requirement mode

D4-1 freezes two semantic modes:

```text
REQUIRED
OPTIONAL
```

## 47. Requirement mode owner

`requirementMode` is set by trusted parent product/operation semantics.

It is not chosen by:

```text
model output
page body
retrieval adapter
context composer
renderer
```

## 48. REQUIRED meaning

For `REQUIRED`:

```text
D4 selection/admission unavailable
→ context-dependent parent operation must not masquerade as context-informed
```

The parent operation HOLD/failure behavior remains product-specific, but context-free substitution is not allowed unless a new explicit operation is created with different semantics.

## 49. OPTIONAL meaning

For `OPTIONAL`:

```text
D4 selection/admission unavailable
→ parent operation may continue only if it has an independently valid context-free semantic path
```

## 50. Optional fallback must be observable internally

A context-free model request after OPTIONAL failure must be distinguishable from a request that successfully consumed D4 context.

No fabricated `contextUsed=true` equivalent.

## 51. Model cannot downgrade requirement mode

Forbidden:

```text
REQUIRED failed
→ model says proceed without it
→ treat as OPTIONAL
```

## 52. Retrieval failure cannot rewrite requirement mode

Storage/head/lifetime errors do not authorize:

```text
REQUIRED → OPTIONAL
```

## 53. Requirement mode is immutable for one accepted intent

Once the trusted intent for an `operationRef` is accepted, lower-level D4 components may not mutate requirement mode.

A product may cancel/supersede and create a new operation with different semantics.

## 54. Duplicate intent handling

A duplicate request carrying the same live `operationRef` does not automatically create two context selections.

Future implementation must make duplicate handling idempotent or explicitly conflict-safe.

## 55. Conflicting duplicate intent

If the same live `operationRef` is observed with different:

```text
pageIdentity
requirementMode
```

D4 must not pick one heuristically.

Treat as invalid/conflicting operation authority.

## 56. Same operation cannot select two pages sequentially without reset semantics

First profile forbids using one `operationRef` as a bag of page attachments.

To change the selected logical page, trusted parent operation authority must explicitly restart/replace the selection before dispatch or create a superseding operation.

No union of page contexts.

## 57. Selection replacement before materialization

A trusted parent operation may conceptually replace an unconsumed selection before semantic materialization if the product explicitly models that action.

The old selection becomes invalid.

This does not create multi-page context.

## 58. Selection replacement after model dispatch

Forbidden.

A later model call requires a new operation lifecycle/context admission.

## 59. Feature OFF

When D4 is disabled:

```text
new intent admission = 0
page lookup for D4 = 0
head lookup for D4 = 0
selection binding creation = 0
```

Existing D1/D2/D3 durable data remains intact.

## 60. Reload

Reload clears D4 ephemeral intent/selection state.

It must not restore:

```text
last operationRef
last page selection
last revision pin
last requirementMode
```

from UI/transcript heuristics.

## 61. Dormancy

Without an explicit D4 operation:

```text
D4 page resolve = 0
D4 head resolve = 0
D4 revision read = 0
D4 context materialization = 0
```

## 62. Selection failure taxonomy

D4-1 reserves semantically distinct classes such as:

```text
CONTEXT_INTENT_ABSENT
CONTEXT_OPERATION_INVALID
CONTEXT_OPERATION_TERMINAL
CONTEXT_INTENT_CONFLICT
CONTEXT_LIFETIME_ENDED
CONTEXT_LIFETIME_UNKNOWN
CONTEXT_PAGE_UNAVAILABLE
CONTEXT_PAGE_IDENTITY_INVALID
CONTEXT_TARGET_IDENTITY_MISMATCH
CONTEXT_HEAD_ABSENT
CONTEXT_HEAD_UNAVAILABLE
CONTEXT_HEAD_INVALID
CONTEXT_REVISION_UNCOMMITTED
CONTEXT_REVISION_MISSING
CONTEXT_SELECTION_STALE
CONTEXT_FEATURE_DISABLED
```

Exact runtime enum names are deferred.

## 63. Failure reasons are not prompt content

Private selection diagnostics do not become model semantic context.

## 64. User-facing error privacy

A generic failure surface may need to avoid revealing whether a hidden page exists, whether a head was denied, or which protected target mismatched.

Detailed presentation is deferred.

## 65. No C5 activation

D4-1 selects an existing PUBLIC_KNOWLEDGE page for a model operation.

It does not create formal durable derived lineage from that page to model output.

```text
C5 = CLOSED
```

## 66. No C8 activation

Selection and currentness checks are synchronous admission mechanics.

No delayed callback may later attach semantic material to an already-dispatched operation.

```text
C8 = CLOSED
```

## 67. Historical context remains deferred

D3 historical revision visibility does not authorize historical revision C6.

Deferred:

```text
HISTORICAL_REVISION_CONTEXT
HISTORICAL_COMPARE_CONTEXT
REVISION_LIST_CONTEXT
```

## 68. Multi-page context remains deferred

Deferred:

```text
MULTI_PAGE_CONTEXT
TOP_K_CONTEXT
RELATED_PAGE_EXPANSION
```

## 69. Fuzzy retrieval remains deferred

Deferred:

```text
embedding retrieval
semantic similarity memory
fuzzy title context selection
```

## 70. Cross-conversation context remains deferred

First profile remains bounded to the same active lifetime.

No cross-conversation memory/archive re-entry.

## 71. Context projection details remain D4-2

D4-1 does not freeze the final semantic projection schema, assertion completeness rule, citation fields, or byte/token budget.

## 72. Prompt firewall details remain D4-3

D4-1 does not freeze exact role encoding or prompt serialization.

It preserves the requirement that selected page content is data, not instructions.

## 73. Historical/search/mutation integration remains D4-4

D4-1 preserves boundaries but does not complete all integration flows.

## 74. Numeric bounds remain D4-5

Deferred numeric values include:

```text
intent logical bytes
operationRef bytes
pageIdentity bytes if not already inherited
selection attempts
stale retries
selection binding bytes
```

## 75. Candidate C profile after D4-1 impact

No capability change beyond D4-0:

```text
C1 = YES
C2 = YES
C3 = YES
C4 = YES
C5 = NO
C6 = YES
C7 = YES product capability; not a D4 V1 context source
C8 = NO
```

## 76. Impact acceptance matrix

| Case | D4-1 result |
|---|---|
| explicit trusted intent + ACTIVE exact page + current head R8 | pin R8 |
| page viewed previously, no D4 intent | no selection |
| model says "load P" without trusted operation | no selection |
| search rank #1 with no explicit selection | no selection |
| caller supplies historical R4 | reject as V1 context address |
| ACTIVE page with zero revisions | no semantic selection |
| head unavailable | fail closed |
| head corrupt | fail closed |
| R8 selected, head becomes R9 before dispatch | stale; do not attach R8 |
| R8 selected, model already dispatched, head becomes R9 | do not async patch |
| REQUIRED context fails | parent operation may not masquerade as context-informed |
| OPTIONAL context fails + valid context-free path | parent may proceed without D4, explicitly context-free |
| same operationRef reused after terminality | reject |
| same operationRef with conflicting page/mode | reject/conflict |
| lifetime ENDED but physical rows remain | reject |
| feature OFF | zero D4 selection work |

## 77. Impact-selected detailed-design seam

D4-1 detailed design should freeze:

```text
TRUSTED_OPERATION_REF
+
EXACT_ACTIVE_PAGE_SELECTION
+
OWNER_RESOLVED_CURRENT_HEAD_PIN
+
EPHEMERAL_SELECTION_BINDING
+
REQUIRED_OPTIONAL_PARENT_OPERATION_SEMANTICS
+
STALE_SELECTION_INVALIDATION
```

## 78. Runtime implementation gates remain closed

No runtime implementation is authorized by this document.

Future implementation still requires concrete owners/adapters for:

```text
trusted parent operation lifecycle
non-recyclable operationRef
trusted context intent classification
exact lifetime/page resolution
PK-D2 current-head owner
exact committed revision read
D4-2 current semantic revalidation/composer
D4-3 prompt role firewall
bounded metrics and diagnostics
```

## 79. Production boundary

```text
DESIGN SCOPE FROZEN
!= IMPLEMENTED
!= VALIDATED RUNTIME
!= RELEASED
```

`release-simcore` remains untouched.

## 80. Next checkpoint

```text
D4-1 Context Selection / Exact Address Impact Scope ✅
D4-1 Detailed Design                              ← NEXT
D4-2 Current Revalidation / Composer
D4-3 Prompt Role / Instruction Firewall
D4-4 Historical / Search / Mutation Boundary
D4-5 Lifetime / Bounds / Convergence
```
