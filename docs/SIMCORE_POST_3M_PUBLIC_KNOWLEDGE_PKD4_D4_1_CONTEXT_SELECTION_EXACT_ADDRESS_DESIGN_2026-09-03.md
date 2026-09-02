# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-1 Context Selection / Exact Address Design - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-1 DESIGN FROZEN · TRUSTED LIVE OPERATION INTENT · NON-RECYCLABLE operationRef · EXACT ACTIVE PAGE RESOLUTION · CURRENT-HEAD OWNER PINNING · EPHEMERAL NON-RECYCLABLE selectionBindingRef · REQUIRED / OPTIONAL SEMANTICS · STALE BINDING REPLACEMENT WITHOUT IMPLICIT REBASE · TERMINAL OPERATION INVALIDATION · NO ARBITRARY HISTORICAL REVISION CONTEXT · NO AMBIENT / FUZZY SELECTION · C1+C2+C3+C4+C6+C7 PRODUCT PROFILE · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-1 · CONTEXT SELECTION · EXACT ADDRESS · CANDIDATE C C6 · DETAILED DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D4-0 opens C6 through:

```text
EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
```

D4-1 freezes the exact selection/addressing contract that precedes D4-2 current semantic revalidation and D4-3 prompt attachment.

The detailed design answers:

```text
which live operation asked for context?
which exact logical page was selected?
which active lifetime owns it?
which exact current revision was current at selection time?
what happens if that head changes before dispatch?
what does REQUIRED vs OPTIONAL mean when selection fails?
```

It does not implement any runtime storage, prompt, model dispatch, UI, search adapter, or release change.

## 1. Canonical D4-1 chain

Frozen chain:

```text
LIVE TRUSTED PARENT OPERATION
        ↓
TRUSTED D4 INTENT
        ↓
CURRENT LIFETIME OWNER
        ↓
EXACT DURABLE PAGE OWNER
        ↓
PK-D2 CURRENT HEAD OWNER
        ↓
EXACT COMMITTED REVISION MEMBERSHIP
        ↓
EPHEMERAL SELECTION BINDING
        ↓
D4-2 CURRENT REVALIDATION
```

D4-1 ends before semantic projection.

## 2. Core separation

```text
OPERATION IDENTITY
!= PAGE IDENTITY
!= REVISION IDENTITY
!= SELECTION ATTEMPT IDENTITY
```

D4-1 uses all four without allowing one to substitute for another.

## 3. Parent operation owner

Conceptual owner:

```text
TrustedModelOperationLifecycleOwner
```

The name is descriptive only.

Responsibilities:

```text
mint/attest live operationRef
report LIVE / TERMINAL lifecycle
report cancellation/supersession
prevent operationRef recycling
own parent REQUIRED/OPTIONAL operation semantics
```

## 4. Parent operation lifecycle

Minimum semantic states:

```text
LIVE
TERMINAL
```

A runtime may distinguish terminal reasons such as:

```text
COMPLETED
FAILED
CANCELLED
SUPERSEDED
```

but D4 authority needs only the trusted fact that terminal operations cannot consume new context.

## 5. `operationRef`

`operationRef` is a trusted opaque identifier for exactly one parent semantic/model operation.

Properties:

```text
OPERATION-SCOPED
NON-RECYCLABLE
NOT USER SEMANTICS
NOT PAGE IDENTITY
NOT REVISION IDENTITY
NOT DURABLE PUBLIC_KNOWLEDGE IDENTITY
```

## 6. Non-recycling invariant

Frozen:

```text
terminal operationRef X
must never later identify a different live parent operation
```

If a host uses counters or reusable slots, it must include a non-recycled generation/collision-safe component.

## 7. Why non-recycling matters

Forbidden resurrection pattern:

```text
old binding B1 references operationRef O7
O7 terminal
host later reuses O7 for unrelated operation
old B1 survives in cache
→ accidental old page context attachment
```

Non-recycling makes surviving physical/ephemeral residue inert.

## 8. No semantic TTL as operation authority

D4-1 does not infer operation terminality from:

```text
elapsed seconds
turn count
last access
UI inactivity
model latency
```

Trusted lifecycle owner decides terminality.

Implementation cleanup TTL may reclaim residue after terminality, but cannot define semantic validity.

## 9. Context intent authority

Conceptual owner inherited from D4-0:

```text
PublicKnowledgeContextIntentAuthority
```

It decides whether a live parent operation requests one PUBLIC_KNOWLEDGE context page.

## 10. Intent shape

Frozen conceptual shape:

```text
PublicKnowledgeContextIntentV1
  schemaVersion
  operationRef
  pageIdentity
  requirementMode
```

Serialized field names remain implementation work.

## 11. Why intent does not carry arbitrary revisionRef

D4 V1 means:

```text
current-head context
```

not caller-selected revision context.

Therefore revision selection belongs to the authoritative PK-D2 current-head owner.

## 12. Allowed intent origin

Conceptual direction:

```text
current user/product action
→ trusted operation interpretation
→ exact page selection
→ D4 intent
```

The UX syntax remains outside D4-1.

## 13. Model cannot author intent

Model text such as:

```text
load page P
include related history
use R4
```

is ordinary model output unless a separately trusted product/tool authority converts a current operation into a valid D4 intent.

## 14. Ambient UI state cannot author intent

By itself, none of the following authorizes C6:

```text
current page tab
highlighted page
last opened page
last search result
last historical revision
current DOM route
```

## 15. Natural-language mention is not exact identity

User text may refer to a page by name.

D4-1 does not convert a name directly to `pageIdentity` through fuzzy matching.

A trusted discovery/resolution step must yield exact durable identity first.

## 16. PK-X2 boundary

PK-X2 can support:

```text
query
→ discover current page locator
→ explicit selection
→ exact pageIdentity
```

But:

```text
query result itself
!= D4 intent
```

## 17. One-page invariant

First profile freezes:

```text
selected page count ∈ {0,1}
```

A live operation with no D4 intent has 0.

An accepted D4 intent has exactly 1 logical page.

## 18. No intent array

D4-1 does not authorize:

```text
pageIdentity[]
```

for V1.

Multi-page C6 is a future expansion.

## 19. Requirement mode

Frozen values:

```text
REQUIRED
OPTIONAL
```

These are product/operation semantics, not retrieval preferences.

## 20. Requirement mode owner

The trusted parent operation/intent authority sets `requirementMode`.

Lower-level components may observe but not mutate it.

## 21. REQUIRED semantics

For REQUIRED:

```text
valid D4 context is a semantic prerequisite of this parent operation
```

If selection/admission fails, the parent operation must not produce a request that is represented as if D4 context was successfully used.

## 22. REQUIRED failure boundary

Allowed parent behavior may include:

```text
HOLD
FAIL
ask product layer for a new explicit operation
```

Forbidden:

```text
silently continue context-free under the same semantic promise
```

## 23. OPTIONAL semantics

For OPTIONAL:

```text
D4 context may improve/inform the operation
but an independently valid context-free path may exist
```

## 24. OPTIONAL fallback condition

OPTIONAL failure permits context-free continuation only if the parent product semantics already define that path.

The D4 layer does not invent one.

## 25. OPTIONAL fallback observability

Internal dispatch state must distinguish conceptually:

```text
D4_CONTEXT_ATTACHED
D4_CONTEXT_NOT_ATTACHED
```

No false context-used claim.

## 26. Model cannot downgrade mode

Canonical:

```text
MODEL PREFERENCE
!= REQUIREMENT MODE AUTHORITY
```

A model may not turn REQUIRED into OPTIONAL after a failure.

## 27. Retrieval errors cannot downgrade mode

Head/store/identity failure is not authority to change operation semantics.

## 28. Intent immutability

Once an intent is accepted for a live `operationRef`, lower-level D4 components cannot mutate:

```text
pageIdentity
requirementMode
```

A trusted parent operation may explicitly replace/cancel before dispatch as defined below.

## 29. Current lifetime derivation

The current operation's trusted lifetime scope comes from the existing lifetime owner.

D4-1 does not trust an arbitrary caller-supplied `lifetimeScopeRef` as proof of activity.

## 30. Lifetime states

Inherited:

```text
ACTIVE
ENDED
UNKNOWN
```

Only ACTIVE permits selection.

## 31. Lifetime fail-closed

```text
ENDED   → no selection
UNKNOWN → no selection
```

No physical row existence override.

## 32. Exact page resolution

Frozen resolution direction:

```text
current ACTIVE lifetimeScopeRef
+ intent.pageIdentity
→ exact durable page record
```

## 33. Same-lifetime requirement

The resolved page must belong to the same trusted active lifetime domain as the parent operation.

No cross-lifetime aliasing.

## 34. Non-recyclable lifetime requirement

PX1-4 remains mandatory:

```text
ENDED scopeRef generation
!= future new lifetime scopeRef generation
```

C6 makes this especially security-sensitive because stale rows could otherwise become prompt material.

## 35. Exact page identity authority

Valid resolution comes only from the durable page identity owner.

Forbidden substitutes:

```text
page title
display label
old label
search rank
DOM id
host message number
content hash
```

## 36. Page identity unavailable

Storage/owner unavailability yields no exact page selection.

Do not optimistically infer page from UI state.

## 37. Duplicate/corrupt page identity state

If identity state is corrupt or conflicting:

```text
CONTEXT_PAGE_IDENTITY_INVALID
```

conceptually, with no heuristic winner.

## 38. Target identity continuity

Where the durable page record is target-bound, the trusted stable target identity must remain coherent with the current operation's target authority.

Exact current target continuity is re-proved before D4-2 semantic use.

## 39. Current display label is not address authority

A changed current display label does not invalidate stable target identity by itself.

A matching label does not establish identity by itself.

## 40. Current head owner

PK-D2 remains the sole authority for:

```text
pageIdentity → currentRevisionRef
```

D4 owns no second head pointer.

## 41. Head read timing

The D4 head read happens after:

```text
intent accepted
+ operation LIVE
+ lifetime ACTIVE
+ exact page resolved
```

It is not inherited from previous UI/render/search state.

## 42. Head state distinctions

D4-1 preserves conceptual distinctions:

```text
HEAD_FOUND
HEAD_ABSENT_AUTHORITATIVE
HEAD_UNAVAILABLE
HEAD_INVALID
```

## 43. Page with zero revisions

Valid state:

```text
page exists
committed revisions = 0
head = authoritative NONE
```

Result:

```text
page can exist
but no D4 semantic revision can be selected
```

## 44. Corrupt head state

If committed history exists but authoritative head is missing/invalid:

```text
no D4 selection
```

Do not choose max ordinal/latest timestamp.

## 45. Revision membership

For a found head R:

```text
pageIdentity + R
```

must resolve to an exact committed immutable revision belonging to that page.

## 46. Uncommitted residue

A candidate/staging row cannot become D4 context merely because the head ref string resembles it.

## 47. Selected revision is owner-derived

Frozen:

```text
selectedRevisionRef
= authoritative current head observed during this selection attempt
```

not a caller-provided ordinary context selector.

## 48. Historical caller revision is rejected

A caller-selected R4 that is not current head may still be valid D3 history.

It is not valid `EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1` input.

## 49. Historical view does not change this rule

Even when the user is looking at R4 through D3:

```text
D4 current-head context selection
→ current head owner
```

not the visible historical revision.

## 50. Selection attempt identity

D4-1 adds an ephemeral conceptual identity:

```text
selectionBindingRef
```

It identifies one exact accepted context-selection attempt within one live parent operation.

## 51. `selectionBindingRef` is not durable identity

It is not:

```text
pageIdentity
revisionRef
history identity
storage key with semantic meaning
cross-turn memory key
```

## 52. Why `selectionBindingRef` is needed

Consider:

```text
operationRef = O1
attempt B1 pins R8
R8 becomes stale
same still-live operation performs bounded fresh selection
attempt B2 pins R9
```

Without attempt identity, cached material from B1 could be confused with B2 because both share O1.

## 53. Binding non-recycling

Within the relevant operation lifecycle:

```text
terminal/stale selectionBindingRef B1
must not later designate a different selection attempt
```

The implementation may use opaque random/generation identity.

## 54. Binding scope

`selectionBindingRef` is valid only under its exact `operationRef`.

A binding from O1 cannot be attached to O2.

## 55. Conceptual selection binding

Frozen conceptual shape:

```text
PublicKnowledgeContextSelectionBindingV1
  schemaVersion
  operationRef
  selectionBindingRef
  requirementMode
  contextProfile = EXPLICIT_CURRENT_HEAD_CONTEXT_REENTRY_V1
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef
  selectedRevisionRef
```

Runtime serialization remains deferred.

## 56. Binding properties

```text
EPHEMERAL
EXACTLY-BOUND
ONE PARENT OPERATION
ONE PAGE
ONE SELECTED REVISION
NON-CANONICAL
NON-PERSISTENT BY SEMANTIC CONTRACT
NON-INSTRUCTION-AUTHORITY
NON-MUTATION-AUTHORITY
NON-SEARCH-AUTHORITY
NON-HISTORY-AUTHORITY
```

## 57. Binding does not contain semantic body

D4-1 binding identifies what D4-2 should revalidate/materialize.

It is not itself the context projection.

## 58. Binding creation preconditions

A binding may become selection-ready only after:

```text
operation LIVE
intent accepted
requirementMode trusted
lifetime ACTIVE
exact page resolved
same-lifetime relation proven
current head found
exact committed revision membership proven
```

## 59. D4-1 state model

Conceptual non-durable states:

```text
INTENT_ACCEPTED
PAGE_RESOLVED
HEAD_PINNED
READY_FOR_REVALIDATION
STALE
CONFLICTED
CANCELLED
TERMINAL
FAILED
CONSUMED_FOR_NEXT_STAGE
```

These are design states, not a frozen runtime enum.

## 60. State transitions are monotonic per binding

An individual binding never transitions:

```text
STALE → READY
CANCELLED → READY
TERMINAL → READY
FAILED → READY
```

A fresh attempt requires a fresh `selectionBindingRef`.

## 61. Head pin is an expectation

Pinning R8 means:

```text
this exact attempt expects R8 to remain current through final dispatch currentness checks
```

It does not lock the page.

## 62. Concurrency with page mutation

D2 mutation may legally advance:

```text
R8 → R9
```

while D4 prepares context.

D4 responds by stale detection, not by blocking all page mutation.

## 63. Selection freshness has no guessed TTL

D4-1 does not say:

```text
R8 selected less than 5 seconds ago → fresh
```

Freshness is authoritative head equality, not elapsed time.

## 64. First currentness expectation

At binding creation:

```text
expectedCurrentRevisionRef = selectedRevisionRef
```

conceptually.

## 65. Second currentness check

Before final model dispatch, the system must re-read PK-D2 current head and require:

```text
freshCurrentRevisionRef == selectedRevisionRef
```

D4-2/D4-3 determine exact pipeline placement, but the equality requirement is frozen here.

## 66. Stale result

If equality fails:

```text
binding → STALE
old semantic material → ineligible for attachment
```

## 67. No in-place rebase

Forbidden:

```text
B1 selected R8
head now R9
mutate B1.selectedRevisionRef = R9
keep materialized R8 pieces
```

A new attempt B2 is required.

## 68. Fresh attempt within same live operation

A product may permit a bounded pre-dispatch retry while `operationRef` remains LIVE.

Then:

```text
B1 → STALE
B2 → fresh page/head resolution from owner
```

No data from B1 is authority for B2 except the trusted unchanged intent fields that the parent operation still owns.

## 69. Re-selection must re-read page/lifetime/head

B2 does not merely replace R8 with a cached R9.

It re-runs exact selection prerequisites that can have changed.

## 70. No unbounded stale retry

Repeated head churn cannot create infinite C6 work.

Exact retry count is deferred to D4-5 hard bounds.

## 71. Operation terminality during selection

If the parent operation becomes TERMINAL before binding handoff:

```text
binding → TERMINAL/CANCELLED
no D4-2 materialization authority
```

## 72. Operation terminality during later stages

D4-2/D4-3 must still verify live operation ownership before attachment.

A once-live `operationRef` is not a perpetual capability token.

## 73. Dispatch boundary

After a binding-derived envelope passes final currentness and the model request is actually dispatched:

```text
later page-head change
!= permission to mutate in-flight request
```

## 74. Why no asynchronous patch

Late patching would create delayed semantic attachment behavior and pressure C8.

D4 V1 keeps:

```text
C8 = NO
```

## 75. Binding consumed state

After a binding has successfully advanced to the one-operation context envelope/dispatch path, it cannot be used to authorize another model call.

## 76. One binding, one dispatch lineage

A single binding may support at most one successful D4 context attachment lineage.

Transport retry semantics that do not create a second semantic model operation remain implementation-specific, but must not duplicate semantic consumption.

## 77. No durable binding history

D4-1 does not create a persistent log of:

```text
which pages entered which prompts
selection attempt chronology
stale attempt body
```

Operational observability may record bounded reason/counters separately without becoming PUBLIC_KNOWLEDGE semantics.

## 78. Duplicate exact intent

If the same live `operationRef` receives an exact duplicate intent before dispatch:

```text
same pageIdentity
same requirementMode
```

D4 must not create multi-page/multi-context union.

An implementation may return/reuse the same still-valid unconsumed binding or perform an idempotent equivalent operation.

## 79. Duplicate binding reuse condition

Reusing an existing binding is safe only if:

```text
binding belongs to same operationRef
binding is non-terminal
binding intent matches exactly
binding has not been consumed
current owner state still proves it usable at the required stage
```

Otherwise create a fresh binding or fail.

## 80. Conflicting intent

Same live `operationRef` with changed:

```text
pageIdentity
or requirementMode
```

is not a duplicate.

It is a trusted-operation conflict unless explicit replacement semantics occur.

## 81. Conflict behavior

Forbidden heuristic:

```text
latest packet wins
first packet wins
alphabetically smaller page wins
```

Without explicit replacement authority, fail closed.

## 82. Explicit pre-dispatch replacement

A trusted parent product may model a user changing their selected page before dispatch.

Required semantics:

```text
old intent/binding invalidated
new trusted intent accepted
new bindingRef minted
full exact selection restarted
```

## 83. Replacement is not multi-page context

Old and new selections are not unioned.

Only the surviving selected page may proceed.

## 84. Replacement after dispatch

Changing selection after model dispatch requires a new parent operation/model call.

No in-flight attachment mutation.

## 85. Requirement mode replacement

Changing REQUIRED ↔ OPTIONAL likewise requires explicit trusted operation replacement/supersession semantics.

Lower-level fallback cannot do it.

## 86. OPTIONAL selection failure outcome

Conceptual outcome:

```text
OPTIONAL_CONTEXT_UNAVAILABLE
```

No selection binding progresses to D4-2.

The parent may invoke its independent context-free path.

## 87. REQUIRED selection failure outcome

Conceptual outcome:

```text
REQUIRED_CONTEXT_UNAVAILABLE
```

The parent context-dependent path is blocked.

## 88. Failure reason privacy

These parent-facing semantic outcomes need not expose whether the internal reason was:

```text
hidden page
head denied
storage unavailable
target mismatch
corruption
```

Private diagnostics remain internal.

## 89. Detailed failure taxonomy

D4-1 distinguishes conceptually:

```text
CONTEXT_FEATURE_DISABLED
CONTEXT_INTENT_ABSENT
CONTEXT_OPERATION_UNKNOWN
CONTEXT_OPERATION_TERMINAL
CONTEXT_OPERATION_CONFLICT
CONTEXT_INTENT_INVALID
CONTEXT_LIFETIME_ENDED
CONTEXT_LIFETIME_UNKNOWN
CONTEXT_PAGE_NOT_RESOLVABLE
CONTEXT_PAGE_IDENTITY_CORRUPT
CONTEXT_TARGET_IDENTITY_MISMATCH
CONTEXT_HEAD_ABSENT
CONTEXT_HEAD_UNAVAILABLE
CONTEXT_HEAD_INVALID
CONTEXT_REVISION_MISSING
CONTEXT_REVISION_UNCOMMITTED
CONTEXT_BINDING_STALE
CONTEXT_BINDING_TERMINAL
CONTEXT_BINDING_CONSUMED
```

Exact enum names are runtime work.

## 90. Head absent is not cache miss

Inherited D2 rule:

```text
HEAD_ABSENT_AUTHORITATIVE
!= cache miss
!= read failure
```

D4 does not bootstrap history or mint a revision on context read.

## 91. D4 selection is read-only

D4-1 does not mutate:

```text
page identity
revision record
current head
historical admission
settlement
citation support
```

## 92. No first-revision creation from D4

If page exists with no revision:

```text
D4 context request
!= permission to generate/commit R1
```

Generation/mutation requires separate authority.

## 93. Search hit cannot repair selection

If exact page resolution fails, D4 does not search for a similarly named replacement.

## 94. Target alias/rekey remains deferred

If stable target identity rekey/migration is required, D4-1 does not invent alias rules.

Fail closed under existing target identity authority until a dedicated migration contract exists.

## 95. Feature OFF

When D4 capability is disabled:

```text
intent admission = 0
selection binding creation = 0
page/head reads for D4 = 0
```

Existing durable data remains unchanged.

## 96. Reload behavior

Reload destroys ephemeral:

```text
operationRef lifecycle state owned by old operation
D4 intent instance
selectionBindingRef
selection binding
```

unless the host independently proves the same operation is still live under a supported continuation protocol.

D4 V1 does not assume such continuation.

## 97. Default reload rule

Frozen safe default:

```text
reload
→ old D4 selection not resumed
→ later use requires new trusted operation/intent
```

## 98. No last-selection restoration

Forbidden:

```text
localStorage lastPage
→ recreate D4 selection
```

without current trusted operation authority and exact re-resolution.

## 99. Dormancy

No explicit D4 intent means:

```text
D4 lifetime read       = 0
D4 page resolve        = 0
D4 head read           = 0
D4 revision membership = 0
D4 binding creation    = 0
```

## 100. Ordinary source-irrelevant turn

The presence of many durable pages does not cause selection scanning.

```text
scan all pages = 0
rank pages = 0
load recent pages = 0
```

## 101. D4-2 handoff contract

A successful D4-1 handoff to D4-2 contains only an exact non-semantic selection binding plus trusted operation semantics.

D4-2 must not accept page body from the caller as authoritative material.

## 102. D4-2 must exact-read selected revision

The binding's selectedRevisionRef is an address expectation.

D4-2 obtains exact semantic record from authoritative revision owner/storage path.

## 103. D4-2 revalidation still mandatory

D4-1 success proves:

```text
correct page
correct selected current-head revision at selection time
correct operation/lifetime binding
```

It does not prove:

```text
current source support
current Exposure
current settlement
current citation compatibility
context budget fitness
```

## 104. D4-3 handoff remains future stage

Prompt role/instruction firewall is not owned by D4-1.

D4-1 only guarantees exact selection lineage into later stages.

## 105. Binding must survive only long enough for one operation

No persistent semantic lifetime is attached to `selectionBindingRef`.

It is an ephemeral capability locator bounded by operation lifecycle.

## 106. Binding bytes are not model context

Do not include raw:

```text
operationRef
selectionBindingRef
internal lifetimeScopeRef
backend page row id
```

as ordinary semantic prompt content unless a future explicit diagnostic product requires it.

## 107. No instruction authority

Possessing a valid selection binding authorizes only progression through D4's validation/composer pipeline.

It does not authorize changing system/developer instructions or tool permissions.

## 108. No mutation authority

Possessing a valid selection binding does not authorize:

```text
edit page
restore revision
advance head
append citation
```

D2 mutation gates remain independent.

## 109. No search authority

A binding to page P does not authorize retrieval of:

```text
P-related pages
citation-linked pages
historical revisions
similar pages
```

## 110. No historical authority

A binding carries no D3 historical disclosure capability.

Current-head-only remains the V1 source profile.

## 111. C6 justification

D4-1 is directly part of C6 because the selected durable page/revision is prepared to influence a later model operation.

However C6 is bounded to explicitly admitted current-head context.

## 112. C5 remains closed

No durable parent-child lineage is created between selected page and generated model output.

`selectionBindingRef` is operation plumbing, not derived-object lineage.

## 113. C7 relation

The product line retains C7 historical capability from D3.

D4-1 does not consume historical bodies as context.

## 114. C8 remains closed

`selectionBindingRef` does not authorize a later asynchronous semantic callback.

It is valid only inside the live synchronous/operation-bound admission path.

## 115. Cleanup is not C8

Ephemeral residue reclamation after operation terminality is storage/operation cleanup, not delayed semantic attachment.

## 116. Selection state does not enter future model memory automatically

Even a successful operation does not make:

```text
last selected page
```

automatic next-turn context.

Every later use starts from a new trusted operation intent.

## 117. Acceptance case: normal REQUIRED

```text
O1 LIVE
intent REQUIRED page P
lifetime ACTIVE
P exact resolve
head = R8
R8 committed
→ B1 READY_FOR_REVALIDATION
```

D4-2 may proceed.

## 118. Acceptance case: OPTIONAL no head

```text
O1 LIVE
intent OPTIONAL page P
P exists
head = authoritative NONE
→ no D4 binding to D4-2
→ OPTIONAL_CONTEXT_UNAVAILABLE
→ parent may use independently valid context-free path
```

## 119. Acceptance case: REQUIRED no head

Same facts with REQUIRED:

```text
→ REQUIRED_CONTEXT_UNAVAILABLE
→ context-dependent parent path blocked
```

## 120. Acceptance case: stale race

```text
B1 pins R8
D4-2 prepares current semantics
D2 mutation advances head R9
final currentness read = R9
→ B1 STALE
→ R8 must not dispatch
```

## 121. Acceptance case: bounded retry

If trusted product policy permits retry and O1 remains LIVE:

```text
B1 STALE
→ fresh exact resolve
→ head R9
→ new B2 pins R9
```

No R8 semantic material is carried into B2.

## 122. Acceptance case: terminal during retry

```text
B1 STALE
O1 becomes CANCELLED
→ no B2
```

## 123. Acceptance case: conflicting duplicate

```text
O1 intent page P REQUIRED
then same O1 arrives page Q REQUIRED
without explicit replacement
→ conflict
→ neither heuristic winner selected
```

## 124. Acceptance case: explicit replacement

```text
O1 LIVE
trusted product changes selection P → Q before dispatch
→ invalidate P binding
→ mint new binding for Q
→ exact Q selection
```

No P+Q union.

## 125. Acceptance case: historical viewer

```text
user viewing historical P/R4
current head P/R9
explicit D4 V1 intent selects P
→ selectedRevisionRef = R9
```

R4 does not enter ordinary D4 context.

## 126. Acceptance case: ended lifetime residue

```text
lifetime ENDED
old P/R8 rows physically remain
→ no D4 selection
```

## 127. Acceptance case: search result

```text
PK-X2 returns P at rank 1
no explicit trusted D4 selection
→ no D4 selection
```

## 128. Acceptance case: user explicitly selects discovered P

```text
PK-X2 discovery
→ trusted user/product selection resolves exact P
→ D4 intent
→ ordinary exact selection path
```

## 129. Acceptance case: model self-request

```text
model output says "load P"
no trusted operation conversion
→ no D4 intent
```

## 130. Acceptance case: same label different identities

```text
P1 label = Atlas
P2 label = Atlas
```

A label does not decide which page enters context.

Exact pageIdentity is required.

## 131. Acceptance case: label changed same identity

```text
P stable identity same
display label old → new
```

Selection remains based on P; current label framing is D4-2 current authority work.

## 132. Acceptance case: feature disabled

```text
D4 OFF
→ intent not admitted
→ zero D4 page/head work
```

## 133. Failure precedence principle

D4-1 need not expose a globally ordered public reason hierarchy.

Internal implementation should stop at the earliest authority-safe failure and avoid extra reads that could leak or waste work.

## 134. No existence oracle

A caller should not be able to probe:

```text
"does hidden page P exist?"
```

by comparing detailed public D4 failure strings.

User-facing reasons must remain bounded/private-safe.

## 135. Operational observability

Future implementation may count bounded classes such as:

```text
intent accepted
selection success
selection stale
selection conflict
required failure
optional fallback
```

but counters are not semantic page/history data.

## 136. No content logging requirement

D4-1 does not require logging page bodies, model prompts, or protected revision content for selection observability.

## 137. Numeric bounds deferred

D4-5 must freeze hard caps for:

```text
operationRef logical bytes
selectionBindingRef logical bytes
intent logical bytes
binding logical bytes
pre-dispatch reselection attempts
```

## 138. Implementation prerequisite: operation owner

Before runtime authorization, there must be a trusted operation lifecycle producer able to prove:

```text
operationRef non-recycling
LIVE/TERMINAL state
cancellation/supersession
```

## 139. Implementation prerequisite: exact page owner

Runtime must have an exact bounded durable page resolver scoped by current trusted lifetime.

No fuzzy scan fallback.

## 140. Implementation prerequisite: head owner

Runtime must expose authoritative PK-D2 head read with absence/unavailable/invalid distinctions.

## 141. Implementation prerequisite: committed membership

Runtime must exactly prove current-head target revision membership before D4-2.

## 142. Implementation prerequisite: binding owner

A future D4 selection owner must create/invalidate ephemeral non-recyclable binding refs and prevent consumed/stale binding reuse.

## 143. Implementation prerequisite: terminal teardown

Runtime must clear/invalidate selection state on operation completion/failure/cancellation/supersession.

## 144. Implementation prerequisite: final currentness integration

D4-2/D4-3 must integrate a second authoritative head comparison before dispatch.

## 145. Security invariant summary

```text
NO TRUSTED INTENT
→ NO C6

NO ACTIVE LIFETIME
→ NO C6

NO EXACT PAGE
→ NO C6

NO AUTHORITATIVE CURRENT HEAD
→ NO C6

STALE SELECTED HEAD
→ NO ATTACHMENT

TERMINAL OPERATION
→ NO ATTACHMENT
```

## 146. Candidate C profile

No change from D4-0:

```text
C1 cross-turn survival        = YES
C2 stable page identity       = YES
C3 semantic mutation          = YES
C4 append / merge pressure    = YES
C5 derived-to-derived lineage = NO
C6 model-context re-entry     = YES
C7 historical survival        = YES product capability
C8 delayed effect targeting   = NO
```

## 147. Deferred scope

D4-1 does not authorize:

```text
historical revision context
multi-page context
embedding retrieval
fuzzy page memory
cross-conversation memory
background page refresh
late callback attachment
sticky context across turns
```

## 148. Detailed acceptance matrix

| Scenario | Selection binding | Parent semantics |
|---|---|---|
| live O1 + exact P + ACTIVE + head R8 committed | READY on R8 | continue D4-2 |
| no trusted intent | none | ordinary non-D4 path |
| operation terminal | none / invalidate | no D4 attachment |
| lifetime ENDED | none | REQUIRED fail or OPTIONAL fallback only if independently valid |
| lifetime UNKNOWN | none | same as above |
| P exact identity corrupt | none | fail closed |
| head authoritative absent | none | no semantic context |
| head unavailable | none | fail closed |
| head invalid | none | fail closed |
| head points uncommitted/missing revision | none | fail closed |
| caller asks historical R4 while current is R9 | R4 ignored/rejected as V1 revision selector; owner pins R9 if page intent valid | current-head-only |
| B1 pins R8, head becomes R9 pre-dispatch | B1 STALE | no R8 attachment |
| O1 still live, bounded retry allowed | fresh B2 may pin R9 | restart exact path |
| O1 cancelled after B1 | B1 invalid | no retry/attachment |
| duplicate exact intent | no context union | idempotent/same binding only when still valid |
| conflicting page/mode under same O1 | conflict | no heuristic winner |
| explicit trusted pre-dispatch page replacement | old binding invalid; new binding | one page only |
| head changes after actual dispatch | dispatched context unchanged | no async patch |
| feature OFF | none | zero D4 reads |

## 149. Design closure statement

D4-1 freezes:

```text
TRUSTED LIVE OPERATION
→ EXACT ONE-PAGE INTENT
→ ACTIVE LIFETIME
→ EXACT PAGE IDENTITY
→ OWNER-RESOLVED CURRENT HEAD
→ EXACT COMMITTED REVISION
→ NON-RECYCLABLE EPHEMERAL SELECTION BINDING
→ D4-2
```

with:

```text
REQUIRED / OPTIONAL semantics preserved
stale binding invalidated
reselection creates a new binding
terminal operation invalidates all bindings
no arbitrary historical revision selection
no fuzzy/ambient retrieval
```

## 150. Runtime authority remains closed

```text
D4-1 DESIGN FROZEN
!= RUNTIME IMPLEMENTED
!= MODEL PROMPT CHANGED
!= PRODUCTION DEPLOYED
```

No runtime or `release-simcore` change is authorized.

## 151. Next checkpoint

```text
D4-0 Contextual Durable Page Master       ✅
D4-1 Context Selection / Exact Address    ✅ DESIGN FROZEN
D4-2 Current Revalidation / Composer      ← NEXT
D4-3 Prompt Role / Instruction Firewall
D4-4 Historical / Search / Mutation Boundary
D4-5 Lifetime / Bounds / Convergence
```
