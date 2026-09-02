# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-D4 D4-2 Current Revalidation / Composer Impact Scope - 2026-09-03

Date: 2026-09-03 KST

Status: **D4-2 IMPACT SCOPE FROZEN · EXACT SELECTED REVISION RE-READ · CURRENT SUPPORT-AT-USE · CURRENT EXPOSURE · CURRENT SETTLEMENT / CITATION COMPATIBILITY · EXACT SEMANTIC SURFACE OR HOLD · WHOLE-PAGE CONTEXT UNIT · STATUS-PRESERVING DETERMINISTIC PROJECTION · CURRENT TRUSTED LABEL · NO SILENT REWRITE · NO PARTIAL QUARANTINE IN PROMPT · NO SUMMARY / DOM SCRAPE · EPHEMERAL ONE-OPERATION MATERIALIZATION · C6 ONLY · C5/C8 CLOSED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-D4 · D4-2 · CURRENT REVALIDATION · CONTEXT COMPOSER · CANDIDATE C C6 · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

D4-1 freezes an exact operation-scoped selection binding:

```text
operationRef
+ selectionBindingRef
+ ACTIVE lifetimeScopeRef
+ exact pageIdentity
+ exact selectedRevisionRef = current head observed at selection time
```

D4-2 decides whether that exact selected revision is still semantically admissible **now** as model reference data, and if so, how to materialize a deterministic bounded semantic projection without inventing, rewriting, summarizing, or silently dropping PUBLIC_KNOWLEDGE semantics.

Selected seam:

```text
D4-1 EXACT SELECTION BINDING
        ↓
EXACT REVISION OWNER READ
        ↓
CURRENT TARGET / SUPPORT-AT-USE / EXPOSURE / SETTLEMENT / CITATION REVALIDATION
        ↓
EXACT CURRENT-COMPATIBLE SEMANTIC SURFACE
        ↓
WHOLE-PAGE STATUS-PRESERVING CONTEXT PROJECTION
        ↓
D4-3 PROMPT ROLE / INSTRUCTION FIREWALL
```

This document is design-only. It adds no runtime prompt, model call, storage schema, validator implementation, network fetch, renderer change, or release change.

## 1. D4-2 does not reopen selection

D4-2 consumes one valid D4-1 selection binding.

It does not independently choose:

```text
another page
another revision
historical revision
related page
search result
```

If the binding is stale/terminal/conflicted, D4-2 does not repair selection in place.

## 2. Binding is an address expectation, not semantic payload

`PublicKnowledgeContextSelectionBindingV1` proves where D4-2 must read.

It does not carry authoritative page body semantics.

Canonical rule:

```text
SELECTION BINDING
!= REVISION BODY
!= CURRENT VALIDATION
!= CONTEXT PROJECTION
```

## 3. Exact selected revision re-read

D4-2 must obtain the exact immutable committed revision from the authoritative PK-D2 revision path using:

```text
pageIdentity
+ selectedRevisionRef
```

No caller-provided body is trusted as the selected revision.

## 4. No UI/transcript/body cache substitution

Forbidden semantic sources:

```text
current DOM
last rendered page
host transcript card
localStorage page snapshot
search snippet
history compare output
model memory
client-side cached body
```

## 5. Re-prove live operation

Before semantic materialization, D4-2 must re-prove that the exact `operationRef` remains LIVE under trusted operation lifecycle authority.

A binding created while LIVE is not perpetual authority.

## 6. Re-prove binding usability

D4-2 must reject a binding that is conceptually:

```text
STALE
CONFLICTED
CANCELLED
TERMINAL
FAILED
CONSUMED
```

Only a still-eligible exact binding may proceed.

## 7. Re-prove ACTIVE lifetime

The exact lifetime remains:

```text
ACTIVE
```

at use time.

`ENDED` or `UNKNOWN` invalidates D4 semantic materialization even if physical rows remain.

## 8. Re-prove page/target continuity

The exact durable page must still belong to the selected active lifetime and retain compatible trusted target identity.

No label/title heuristic may repair a mismatch.

## 9. Re-prove committed membership

The exact selected revision must still be an authoritative committed immutable revision of the same page.

Physical bytes alone are insufficient.

## 10. Current-head check during D4-2

D4-2 may perform an intermediate authoritative current-head equality check:

```text
currentHead == selectedRevisionRef
```

Failure invalidates this materialization attempt.

This intermediate check does not replace D4-0/D4-1's mandatory final dispatch-edge currentness check.

## 11. Why current semantic revalidation is required

A current head proves only:

```text
latest committed revision under PK-D2
```

It does not prove:

```text
source still supports it
Exposure still permits it
settlement state is unchanged
citation support still reauthorizes it
```

## 12. Current support-at-use chain

D4-2 reuses existing current PUBLIC_KNOWLEDGE authority, conceptually:

```text
selected revision semantic intent
+ current target authority
+ current source/support authority
+ 3M-6 support-at-use
+ current Exposure
+ PK-1 settlement context
+ PK-2 validation
+ PK-4 citation/provenance authorization where applicable
→ current compatibility decision
```

D4 owns none of those truth authorities.

## 13. Stored validator fields are check targets, not authority inputs

Stored values such as:

```text
referenceState
revision-local citation semantics
```

are the committed semantic surface that current authority must reauthorize.

They do not themselves mint current support.

## 14. Source-owned semantic revalidation input

For each retained assertion, the current semantic revalidation input is derived only from allowed source-owned revision semantics, conceptually including:

```text
sectionKind
mode
content
revision-local structure/order
```

Stored current-authority receipts are not reused as authority.

## 15. Settlement compatibility

For every retained assertion:

```text
S_stored = committed referenceState
S_now    = independently derived current referenceState
```

D4-2 first-profile rule:

```text
S_now == S_stored
→ settlement-compatible

S_now != S_stored
→ CONTEXT_REWRITE_REQUIRED / HOLD
```

## 16. Stronger current state still counts as change

Example:

```text
stored ATTRIBUTED_BUT_NOT_SETTLED
current SETTLED_PUBLIC_REFERENCE
```

D4 does not silently upgrade the prompt version.

The current head remains the committed semantic object until an authorized mutation creates a new revision.

## 17. Weaker/current correction state also counts as change

Examples:

```text
stored SETTLED_PUBLIC_REFERENCE
current CORRECTED_CURRENT_RECORD

stored SETTLED_PUBLIC_REFERENCE
current WITHDRAWN_OR_RETRACTED_RECORD
```

Result:

```text
no D4 projection from this revision
```

Repair is a D2 mutation/reconciliation concern.

## 18. No prompt-time semantic modernization

Forbidden:

```text
read R8
current validator derives changed state
→ rewrite R8 fields in context only
→ dispatch modified pseudo-R8
```

That would create semantic state that is neither committed R8 nor a committed new revision.

## 19. Exposure/support failure

If any required current support/Exposure join is unavailable, denied, stale, mismatched, or ambiguous:

```text
no D4 semantic projection
```

No old support receipt fallback.

## 20. Citation compatibility inherits D2-4 principles

For every stored citation relationship needed by the revision semantics, D4-2 requires exact current reauthorization of the same visible semantic relationship through current support authority.

No label/URL/fuzzy provenance recovery.

## 21. Current citationRef remains operation-local

A current PK-4 `citationRef` may differ from the old operation-local ref used when the revision was committed.

D4-2 compares semantic/provenance compatibility, not transient citationRef string equality.

## 22. Visible citation semantic surface

Compatibility may include the already-frozen visible semantic tuple such as:

```text
sourceLabel
recordLabel?
locatorLabel?
publishedAtLabel?
attachment role
```

where present and semantically required.

## 23. Current extra citations do not rewrite the revision

If current authority offers additional eligible citations beyond those committed in the selected revision:

```text
stored citations all reauthorized
+ current extra citations
→ selected revision may remain compatible
```

The extra citations are not automatically added to D4 context.

Adding them to durable page semantics requires a D2 mutation.

## 24. Missing/changed stored citation blocks the whole context unit

If one committed citation relationship can no longer be reauthorized exactly:

```text
no D4 semantic projection
```

Do not silently remove the citation from prompt context.

## 25. Link clickability remains separate

D4 semantic citation compatibility does not require old href bytes to remain identical.

A URL is not automatically dereferenced by D4.

## 26. Whole-page semantic unit

D4-2 freezes first-profile completeness:

```text
SELECTED CURRENT-HEAD REVISION
= ONE ATOMIC CONTEXT SEMANTIC UNIT
```

Either the full admitted semantic revision can be represented, or D4 context is unavailable.

## 27. No PK-2 partial-quarantine projection into D4 V1

PK-2 may support bounded assertion-level quarantine for ordinary fresh current projection behavior.

D4-2 does not use that mechanism to fabricate a partial version of a committed revision.

Example:

```text
R8 = A + B + C
A current-valid
B current-HOLD
C current-valid
```

Forbidden:

```text
D4 context = A + C
```

because:

```text
A + C != committed R8
```

## 28. No silent assertion dropping for budget

If future hard bounds cannot preserve the complete semantic unit:

```text
HOLD_CONTEXT_BOUNDS
```

not:

```text
first N assertions only
```

Numeric bounds remain D4-5.

## 29. No model-generated summary fallback

Forbidden:

```text
page too large
→ ask model to summarize
→ inject summary instead
```

That creates new uncommitted semantics and recursive model influence.

## 30. No heuristic compression of semantic state

Forbidden budget shortcuts:

```text
drop referenceState
drop contest/correction markers
drop attribution
drop required citations
merge similar assertions
rewrite quoted material
```

## 31. Context admission dispositions

D4-2 freezes internal semantic classes equivalent to:

```text
CONTEXT_ADMITTED
CONTEXT_HELD
CONTEXT_DENIED
```

Exact runtime enum spelling remains deferred.

## 32. ADMITTED meaning

`CONTEXT_ADMITTED` requires all D4-2 authority/compatibility checks to pass and deterministic complete projection materialization to succeed within inherited/future bounds.

## 33. HELD meaning

HOLD covers cases such as:

```text
required authority unavailable
settlement changed
citation compatibility unresolved
current-head race
projection cannot preserve semantic completeness
```

where D4 cannot safely produce the selected semantic unit.

## 34. DENIED meaning

DENY covers trusted current authority explicitly prohibiting semantic use.

D4-2 need not expose the internal distinction publicly.

## 35. Admission reason privacy

Private reasons do not enter model semantic context and need not be exposed to the user in exact form.

No D4 existence/protection oracle.

## 36. REQUIRED / OPTIONAL propagation

D4-2 preserves D4-1 `requirementMode` unchanged.

For REQUIRED:

```text
no admitted projection
→ context-dependent parent path remains blocked
```

For OPTIONAL:

```text
no admitted projection
→ parent may use only its independently valid context-free path
```

## 37. Composer consumes admitted semantics only

Conceptual owner:

```text
PublicKnowledgeContextComposer
```

It may run only after current semantic admission has succeeded for the exact selected revision.

## 38. Composer cannot decide truth

The composer does not own:

```text
support
Exposure
settlement
citation authorization
page currentness
history disclosure
```

It deterministically encodes already-admitted semantics.

## 39. Projection kind

D4-2 reserves:

```text
PublicKnowledgeContextProjectionV1
```

as an ephemeral semantic read model for one operation.

## 40. Projection semantic fields

First-profile projection may contain only bounded semantic material required to preserve the current PUBLIC_KNOWLEDGE meaning, conceptually:

```text
family = PUBLIC_KNOWLEDGE
currentDisplayLabel?
sections[]
  sectionKind
  assertions[]
    mode
    content
    referenceState
    attribution?          // when semantically present/required
    citations[]?         // visible semantic citation records/roles when present/required
```

Exact serialization remains detailed-design work.

## 41. Current trusted display label

The projection uses current trusted display-label authority.

An old stored/revision title is not current label authority.

## 42. Current label change does not rewrite assertion semantics

If stable target identity is unchanged and current trusted label changes:

```text
projection label = current trusted label
revision semantic assertions = exact compatible committed semantics
```

This is permitted because label authority is external/current and page identity is stable.

## 43. Projection preserves assertion order

The composer preserves deterministic section/assertion order from the selected revision semantic structure.

It does not reorder by relevance, settlement strength, or citation count.

## 44. Revision-local ordinal need not become prompt semantics

Array order may preserve structure without exposing internal revision-local ordinals as user/model-visible semantic facts.

D4-2 does not promote ordinal to stable assertion identity.

## 45. Status-preserving requirement

The projection must preserve distinctions among:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
```

No flattening into unqualified facts.

## 46. Attribution-preserving requirement

Where an assertion is attributed rather than settled, enough attribution structure must survive so the model cannot reasonably mistake:

```text
source/record says X
```

for:

```text
X is established current fact
```

## 47. Quotation-preserving requirement

Quoted text remains identifiable as quoted/reference material.

D4-3 will freeze role/instruction serialization, but D4-2 must not erase semantic quotation boundaries.

## 48. Citation semantics are bounded reference data

When citation semantics are required to preserve meaning, the projection may include visible labels/locator/date/role semantics.

It excludes internal support machinery.

## 49. Excluded internal authority fields

Not ordinary semantic projection:

```text
operationRef
selectionBindingRef
lifetimeScopeRef
backend row ids
supportAnchorRef internals
claimSupportRef
sourceAuthorityRef internals
settlement basis receipts
validator diagnostics
historical admission receipts
cleanup receipts
```

Addressing metadata may remain in the outer ephemeral envelope but is not page semantic text.

## 50. No raw source object injection

D4-2 does not copy complete source records, hidden evidence objects, lineage graphs, or validator contexts into the model projection.

## 51. No renderer/DOM scrape

The composer uses structured semantic records only.

Forbidden:

```text
HTML
DOM
CSS
screen text
rendered footnote numbers as authority
host transcript scrape
```

## 52. Footnote numbering remains presentation-local

If citation semantic records enter D4 projection, rendered footnote numbers such as `[1]` are not durable/provenance identity and need not be preserved.

## 53. Projection is deterministic

Given the same:

```text
exact selected revision
same current trusted label
same admitted visible citation semantics
same frozen projection profile
```

the composer must produce semantically equivalent deterministic output.

## 54. No relevance reranking inside one page

The composer does not decide which assertions are most relevant and drop/reorder others.

First profile is whole-page semantics.

## 55. No hidden prompt optimization authority

A token optimizer cannot silently alter semantic contents to make a projection fit.

It may only apply encoding transformations proven semantically lossless under the frozen profile.

## 56. Projection bounds are hard admission boundaries

Exact numeric byte/token limits remain D4-5.

D4-2 freezes the policy:

```text
cannot fit complete projection
→ HOLD
```

## 57. Projection is ephemeral

`PublicKnowledgeContextProjectionV1` is:

```text
EPHEMERAL
ONE OPERATION
NON-CANONICAL
NON-PERSISTENT BY SEMANTIC CONTRACT
```

## 58. Projection is not a new revision

Materializing D4 context does not:

```text
create revision
advance head
edit page
append citation
write settlement state
```

## 59. Projection is not model memory

After the parent operation ends, the projection has no authority for later turns.

A later use requires a new D4 intent/selection/revalidation.

## 60. Outer envelope remains separate

D4-2 may hand D4-3 an ephemeral object equivalent to:

```text
PublicKnowledgeContextReentryEnvelopeV1
  operationRef
  selectionBindingRef
  requirementMode
  contextProfile
  lifetimeScopeRef
  pageIdentity
  targetIdentityRef
  selectedRevisionRef
  semanticProjection
  roleClass = REFERENCE_DATA
```

Exact runtime schema remains unauthorized.

## 61. Envelope metadata does not become semantic page prose

The prompt serializer must not accidentally present internal IDs as user/reference assertions merely because they travel in the same envelope.

D4-3 owns final role/serialization firewall.

## 62. Operation lifecycle remains checked

D4-2 output is attachable only while the exact parent operation remains LIVE and binding remains unconsumed/nonterminal.

## 63. Intermediate current-head equality

Before handing a materialized projection to D4-3, D4-2 should require the selected revision still equals current head.

This reduces stale material travel.

## 64. Final dispatch-edge check still mandatory

Even if D4-2 checked currentness milliseconds earlier:

```text
D4-3 / dispatch edge must re-check
```

because page mutation may occur between composer and dispatch.

## 65. Current admission can become stale too

If an observable current authority changes after D4-2 admission but before dispatch, final admission/currentness logic must fail closed where the authority contract exposes that change.

D4-2 output is not a durable validation license.

## 66. No guessed freshness TTL

Do not declare a projection valid for N seconds as a substitute for authoritative support-at-use.

## 67. No in-place projection rebase

If selected head changes:

```text
old projection cannot be edited from R8 → R9
```

A fresh D4-1 binding and D4-2 materialization are required under bounded retry policy.

## 68. No cross-revision merge

Do not combine:

```text
old projection R8 semantics
+ new head R9 changes
```

into an uncommitted prompt document.

## 69. Historical revision context remains closed

D3 historical authenticity/disclosure may make R4 viewable.

That does not make R4 eligible for D4 V1 current semantic context.

## 70. Search remains selection-only upstream

PK-X2 can help select exact page identity before D4-1.

D4-2 does not invoke search to supplement or repair context.

## 71. Mutation remains separate downstream authority

If current revalidation reveals that R8 needs semantic repair:

```text
D4-2 HOLD / reconciliation required
```

It does not call D2 mutation automatically.

## 72. No auto-revision on revalidation failure

Forbidden:

```text
D4 request detects settlement/citation drift
→ silently commit corrected R9
→ use R9
```

A revision-producing operation requires separate explicit mutation authority.

## 73. No derived-to-derived lineage

The context projection is an ephemeral read model, not a durable child derived object.

```text
C5 = CLOSED
```

## 74. No delayed semantic effect

D4-2 has no callback token allowing future semantic attachment after dispatch.

```text
C8 = CLOSED
```

## 75. D4-2 failure taxonomy

Conceptually distinct internal classes may include:

```text
CONTEXT_BINDING_INVALID
CONTEXT_OPERATION_TERMINAL
CONTEXT_LIFETIME_INVALID
CONTEXT_PAGE_TARGET_MISMATCH
CONTEXT_REVISION_READ_FAILED
CONTEXT_REVISION_MEMBERSHIP_INVALID
CONTEXT_HEAD_STALE
CONTEXT_SUPPORT_UNAVAILABLE
CONTEXT_EXPOSURE_DENIED
CONTEXT_SETTLEMENT_CHANGED
CONTEXT_SETTLEMENT_UNAVAILABLE
CONTEXT_CITATION_SUPPORT_INVALIDATED
CONTEXT_CITATION_SURFACE_CHANGED
CONTEXT_CITATION_AUTHORITY_UNAVAILABLE
CONTEXT_PROJECTION_INCOMPLETE
CONTEXT_PROJECTION_OVER_BOUNDS
```

Exact runtime enum names remain deferred.

## 76. Failure reasons are not semantic projection

Internal reason codes/private evidence are excluded from model reference data by default.

## 77. Fail-closed precedence

Implementation should stop at an authority-safe failure boundary rather than performing unnecessary later reads that may leak hidden state or consume work.

## 78. Dormancy

Without a valid D4-1 binding:

```text
D4-2 revision read = 0
D4-2 support revalidation = 0
D4-2 projection work = 0
```

## 79. Feature OFF

When D4 is disabled:

```text
D4-2 exact revision read = 0
D4-2 support/settlement/citation revalidation = 0
D4-2 context composition = 0
```

Existing page/revision state remains intact.

## 80. No background refresh

D4-2 does not monitor durable pages for semantic drift in the background.

Revalidation occurs only for an explicit live D4 operation.

## 81. Operational observability

Future implementation may record bounded counters/dispositions without logging protected page body or prompt content.

Observability metadata is not PUBLIC_KNOWLEDGE semantics.

## 82. Impact acceptance matrix

| Scenario | D4-2 result |
|---|---|
| valid binding R8 + all current support compatible | admit complete deterministic R8 projection |
| operation became terminal | no projection |
| lifetime ENDED/UNKNOWN | no projection |
| exact revision missing/uncommitted | no projection |
| current target identity mismatch | no projection |
| one assertion current support HOLD | whole projection unavailable |
| one assertion current Exposure DENY | whole projection unavailable |
| stored SETTLED, current CORRECTED | rewrite required; no projection |
| stored ATTRIBUTED, current SETTLED | rewrite required; no projection |
| one stored citation no longer reauthorized | whole projection unavailable |
| current adds extra citation while stored citations remain valid | old committed semantic unit may remain compatible; do not auto-add extra citation |
| current trusted display label changed, stable target same | use current trusted label |
| page too large for future complete bound | HOLD, no truncation |
| renderer DOM available but structured revision read fails | no DOM fallback |
| head changes during composition | stale; discard projection |
| head changes after final model dispatch | do not patch in-flight request |
| D4 feature OFF | zero D4-2 work |

## 83. Impact-selected detailed seam

D4-2 detailed design should freeze:

```text
EXACT SELECTED REVISION READ
+
CURRENT PUBLIC_REFERENCE COMPATIBILITY RECEIPT
+
WHOLE-REVISION ADMISSION
+
DETERMINISTIC STATUS-PRESERVING CONTEXT PROJECTION
+
EPHEMERAL D4-3 HANDOFF
```

## 84. Numeric bounds remain D4-5

D4-2 does not freeze exact values for:

```text
projection logical bytes
projection tokens
section count beyond inherited semantic caps
citation projection bytes
composer work units
```

It freezes only that bounds are hard and semantic truncation is forbidden.

## 85. Runtime implementation gates remain closed

Future implementation requires concrete trusted adapters for:

```text
D4-1 binding owner
operation lifecycle
lifetime/page/revision owner
current target identity authority
3M-6 support-at-use
Exposure
PK-1 settlement context
PK-2 validation
PK-4 citation compatibility
current trusted label
D4 context admission
D4 deterministic composer
```

## 86. Production boundary

```text
D4-2 IMPACT SCOPE FROZEN
!= IMPLEMENTED
!= PROMPT ENABLED
!= RELEASED
```

`release-simcore` remains untouched.

## 87. Next checkpoint

```text
D4-0 Contextual Durable Page Master       ✅
D4-1 Context Selection / Exact Address    ✅
D4-2 Current Revalidation Impact Scope    ✅
D4-2 Detailed Composer Design             ← NEXT
D4-3 Prompt Role / Instruction Firewall
D4-4 Historical / Search / Mutation Boundary
D4-5 Lifetime / Bounds / Convergence
```
