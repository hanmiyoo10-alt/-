# SimCore Post-3.0M Multi-Family MF-1 Fanout Plan + Family Entry Registry Design — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-1 DESIGN FROZEN · CURRENT-REQUEST FANOUT INTENT / ADMITTED PLAN SPLIT · ATOMIC PLAN ADMISSION · ONE CURRENT AUTHORITY ROOT · INITIAL REGISTRY LIVE_REACTION / BOARD / NEWS ELIGIBLE · SOCIAL_FEED / PUBLIC_KNOWLEDGE ENTRY REVIEW REQUIRED · LEGACY COMMUNITY NON-AUTHORITY · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-1 · FANOUT PLAN · FAMILY ENTRY REGISTRY · CONTROL PLANE · DESIGN**

## 0. Purpose

MF-0 froze the overall sibling-fanout architecture. The MF-1 impact scope froze its admissible control-plane boundary.

MF-1 now freezes the detailed design for:

```text
current fanout intent
        ↓
plan admission
        ↓
admitted immutable current plan
        ↓
family-lane dispatch eligibility
```

and for the registry that answers:

```text
is this family legally allowed to participate
in CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT now?
```

This is design-only. No selector, registry implementation, prompt, model topology, sidecar transport, validator, DOM/CSS, persistence, or release change is authorized.

## 1. Core ownership

The ownership chain is frozen as:

```text
current trusted SimCore / product authority
→ produces candidate fanout intent

MF-1 plan admission
→ validates control-plane shape
→ resolves registry membership
→ routes DORMANT / ACTIVE_SINGLE / ACTIVE_MULTI / UNSUPPORTED

family lanes
→ begin only after admission
```

Forbidden plan owners:

```text
main model
family semantic draft
presentation renderer
visible old source cards
legacy Community text
conversation-history residue
fuzzy retrieval
```

Canonical rule:

```text
FANOUT IS A CONTROL-PLANE DECISION
NOT A CONTENT-GENERATION DECISION
```

## 2. Intent / plan split

MF-1 freezes two distinct conceptual objects.

### 2.1 `CurrentSourceFanoutIntentV1`

A trusted current candidate request before admission.

```text
CurrentSourceFanoutIntentV1
  sourceAuthorityRef
  activationBasis
  activationAuthorityRef
  requestedFamilies[]
  projectionScope
```

### 2.2 `CurrentSourceFanoutPlanV1`

An admitted immutable current plan.

```text
CurrentSourceFanoutPlanV1
  planState
  sourceAuthorityRef
  activationBasis
  admittedFamilies[]
  projectionScope
```

The intent is not ordinary model output.

The admitted plan is not persisted after the current projection.

## 3. Why intent and admitted plan are separate

A candidate intent may be structurally invalid or request a non-eligible family.

Therefore:

```text
INTENT EXISTS
!=
PLAN ADMITTED
```

This prevents downstream family producers from treating an upstream wish as authorization.

## 4. `sourceAuthorityRef`

The intent carries exactly one current trusted `sourceAuthorityRef`.

Admission requires exact equality with the current source authority selected by SimCore.

Forbidden admission behavior:

```text
missing ref
stale ref
historical ref
substring/fuzzy match
multiple refs hidden in one field
family-specific alternate roots
```

Canonical rule:

```text
ONE ADMITTED FANOUT PLAN
= ONE EXACT CURRENT AUTHORITY ROOT
```

## 5. `activationBasis`

Frozen vocabulary:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

MF-1 V1 disposition:

```text
EXPLICIT_CURRENT_REQUEST    = ACTIVE-ADMISSIBLE
AUTHORIZED_PRODUCT_POLICY   = RESERVED / DENY FOR CURRENT V1
```

This keeps future automatic orchestration possible without silently activating it today.

## 6. `activationAuthorityRef`

`activationAuthorityRef` is trusted current-turn evidence that the selected activation basis is authorized.

For V1:

```text
activationBasis = EXPLICIT_CURRENT_REQUEST
```

requires an exact current request authority binding.

It must not contain or preserve the full user prompt in bounded diagnostics.

Canonical rule:

```text
USER ASKED FOR IT NOW
must be proven by current authority,
not inferred from history.
```

## 7. `projectionScope`

The only admitted V1 scope is:

```text
CURRENT_PROJECTION_ONLY
```

Any intent requiring:

```text
history
persistent run identity
cross-turn continuation
background scheduling
retrieval
```

is outside MF-1 and becomes `UNSUPPORTED`.

## 8. Family key vocabulary

Recognized Source Intelligence family keys for registry reasoning are:

```text
LIVE_REACTION
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Recognition does not imply fanout eligibility.

Canonical rule:

```text
RECOGNIZED FAMILY
!=
ELIGIBLE FANOUT FAMILY
```

## 9. Registry entry model

MF-1 freezes the conceptual registry entry:

```text
FanoutFamilyEntryV1
  family
  admissionState
  scopeProfile
  reviewCheckpoint?
```

`scopeProfile` for the current master is conceptually:

```text
CURRENT_ROOT_SIBLING_SNAPSHOT
```

The registry is not a source database and does not hold family semantic content.

## 10. Registry admission states

Frozen vocabulary:

```text
ELIGIBLE
ENTRY_REVIEW_REQUIRED
INELIGIBLE_FOR_CURRENT_SCOPE
```

Meaning:

### `ELIGIBLE`

The family has a frozen compatibility contract for the selected current fanout scope.

### `ENTRY_REVIEW_REQUIRED`

The family exists and may be suitable, but a dedicated compatibility review is still required.

### `INELIGIBLE_FOR_CURRENT_SCOPE`

The family or requested profile requires semantics outside the selected sibling-snapshot scope.

None of these states mean truth, exposure, maturity, or renderer success.

## 11. Initial registry

MF-1 freezes:

```text
LIVE_REACTION
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

BOARD
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

NEWS
  state = ELIGIBLE
  scope = CURRENT_ROOT_SIBLING_SNAPSHOT

SOCIAL_FEED
  state = ENTRY_REVIEW_REQUIRED
  review = MF-5

PUBLIC_KNOWLEDGE
  state = ENTRY_REVIEW_REQUIRED
  review = MF-6
```

Standalone design convergence for SOCIAL_FEED / PUBLIC_KNOWLEDGE is necessary but not sufficient for registry promotion.

## 12. Registry promotion rule

Only a dedicated fanout-entry design may promote a family.

Required proof set:

```text
F1 standalone semantic contract frozen
F2 selected fanout lifetime is current-projection compatible
F3 exact shared-root join defined
F4 sibling outputs are not semantic authority for this family
F5 no required persistence/history/retrieval
F6 bounded family semantic cost
F7 bounded validation/diagnostic cost
F8 independent presentation adapter exists
F9 family-local semantic failure is isolatable
F10 family-local presentation failure is isolatable
F11 whole-plan source invalidation semantics are compatible
F12 Candidate C reassessed
```

All required proofs must pass.

No majority rule or analogy-based promotion exists.

## 13. Registry demotion

MF-1 also freezes that eligibility is scope-specific, not eternal.

A future requirement can make an otherwise eligible family ineligible for a new profile.

Example:

```text
BOARD snapshot fanout = eligible
BOARD persistent cross-turn mutation fanout = not implied eligible
```

Therefore registry entry is interpreted as:

```text
family + scope profile
```

not a universal certification.

## 14. Requested-family set

`requestedFamilies[]` is an explicit current control-plane list.

Admission checks every member.

No member may be:

```text
invented by model
added by renderer
recovered from old UI
implicitly inferred from a family name in narrative text
```

## 15. Duplicate policy

Duplicates are plan defects.

```text
[BOARD, BOARD, NEWS]
→ DENY
```

MF-1 does not silently normalize this to `[BOARD, NEWS]`.

Frozen reason:

```text
PLAN_DENY_DUPLICATE_FAMILY
```

## 16. Unknown family policy

```text
[BOARD, FOO]
→ DENY
```

Frozen reason:

```text
PLAN_DENY_UNKNOWN_FAMILY
```

No fallback to recognized members is allowed.

## 17. Entry-review-required policy

Before MF-5:

```text
[BOARD, SOCIAL_FEED]
→ DENY PLAN
```

Before MF-6:

```text
[NEWS, PUBLIC_KNOWLEDGE]
→ DENY PLAN
```

Frozen reason:

```text
PLAN_DENY_FAMILY_ENTRY_REVIEW_REQUIRED
```

This is an admission failure, not family-local partial failure.

## 18. Ineligible profile policy

If a recognized family is requested under a scope not certified by its registry entry:

```text
PLAN_DENY_FAMILY_INELIGIBLE_FOR_SCOPE
```

Example:

```text
CURRENT_ROOT_SIBLING_SNAPSHOT registry
+
request asks for persistent sibling identity
→ DENY
```

## 19. Multiple authority root policy

Any intent that attempts to represent more than one current source root in one plan is unsupported.

Frozen reason:

```text
PLAN_DENY_MULTI_AUTHORITY_SCOPE
```

Multi-authority composition requires a separate future design.

## 20. Derived-family source policy

Intent cannot use a sibling derived object as another requested family's root.

Frozen reason:

```text
PLAN_DENY_DERIVED_TO_DERIVED_SCOPE
```

Example:

```text
BOARD result
→ NEWS input
```

is MF-7 territory and Candidate C C5 reassessment, not MF-1 sibling fanout.

## 21. Plan routing

MF-1 freezes control-state routing.

### DORMANT

```text
no authorized current source job
→ DORMANT
```

No source-history scan occurs.

### ACTIVE_SINGLE

```text
one admitted eligible family
→ ACTIVE_SINGLE
→ existing single-family path
```

### ACTIVE_MULTI

```text
2+ admitted eligible families
+
one exact current source root
→ ACTIVE_MULTI
```

### UNSUPPORTED

Any invalid or out-of-scope plan request becomes:

```text
UNSUPPORTED + bounded reason code
```

## 22. Multi-family threshold

MF-1 does not treat one family as multi-family orchestration merely because the same envelope type could technically contain one element.

Canonical rule:

```text
1 family = ACTIVE_SINGLE
2+ families = candidate ACTIVE_MULTI
```

This preserves the original 3M single-family path.

## 23. Admission algorithm

Conceptual pure admission order:

```text
1. resolve current source-job presence
2. if none, return DORMANT
3. validate activation basis
4. exact-match sourceAuthorityRef
5. validate projectionScope
6. verify requested family list exists
7. reject duplicate keys
8. reject unknown keys
9. resolve registry entry for each key
10. reject ENTRY_REVIEW_REQUIRED members
11. reject INELIGIBLE members
12. reject multi-authority / derived-propagation scope
13. route one family to ACTIVE_SINGLE
14. route 2+ families to ACTIVE_MULTI
15. freeze admitted current plan
```

Aggregate caps are intentionally deferred to MF-3.

## 24. Atomic admission

Plan admission is atomic.

If any requested member fails admission:

```text
NO FAMILY LANES DISPATCHED
```

Example:

```text
[BOARD, NEWS, SOCIAL_FEED]
```

before MF-5 does not become:

```text
BOARD + NEWS success
SOCIAL_FEED omitted
```

It is an unsupported plan.

## 25. Partial success begins later

MF-0 allows partial family success after admission.

MF-1 preserves the separation:

```text
ATOMIC PLAN ADMISSION
        ↓
independent family execution
        ↓
PARTIAL FAMILY SUCCESS MAY OCCUR
```

Example after valid `[BOARD, NEWS]` admission:

```text
BOARD = VALIDATED
NEWS  = HOLD_MATURITY
```

is legal.

## 26. Plan immutability

Once admitted for the current projection:

```text
sourceAuthorityRef
activationBasis
admittedFamilies
projectionScope
```

are immutable for that execution.

The main model cannot add a family midway.

A renderer failure cannot remove a semantic family from the admitted plan retroactively.

A new current request requires a new admission decision.

## 27. No durable plan identity

MF-1 does not create:

```text
fanoutRunId persisted across turns
stable plan object identity
plan history
plan retrieval
```

Any ephemeral runtime correlation key used later must not become semantic identity by accident.

## 28. Family ordering inside the plan

MF-1 does not assign truth rank based on request order.

For deterministic diagnostics, a future implementation may use a stable registry ordering, but:

```text
DIAGNOSTIC ORDER
!= REQUEST IMPORTANCE
!= TRUTH RANK
!= PRESENTATION ORDER
```

MF-4 owns presentation-stack ordering.

## 29. Admission reason-code vocabulary

Frozen first MF-1 reason codes:

```text
PLAN_DORMANT_NO_CURRENT_SOURCE_JOB
PLAN_ALLOW_ACTIVE_SINGLE
PLAN_ALLOW_ACTIVE_MULTI

PLAN_DENY_INVALID_ACTIVATION_BASIS
PLAN_DENY_ACTIVATION_AUTHORITY_MISSING
PLAN_DENY_SOURCE_AUTHORITY_MISMATCH
PLAN_DENY_INVALID_PROJECTION_SCOPE
PLAN_DENY_EMPTY_REQUESTED_FAMILIES
PLAN_DENY_DUPLICATE_FAMILY
PLAN_DENY_UNKNOWN_FAMILY
PLAN_DENY_FAMILY_ENTRY_REVIEW_REQUIRED
PLAN_DENY_FAMILY_INELIGIBLE_FOR_SCOPE
PLAN_DENY_MULTI_AUTHORITY_SCOPE
PLAN_DENY_DERIVED_TO_DERIVED_SCOPE
```

These reason codes are diagnostics, not presentation prose.

## 30. Admission disposition

Conceptual admission result:

```text
FanoutPlanAdmissionV1
  planState
  reasonCode
  admittedPlan?
```

No quarantined semantic family content exists at this stage because semantic family generation has not begun.

## 31. Bounded admission receipt

Conceptual privacy-safe diagnostic receipt:

```text
FanoutPlanAdmissionReceiptV1
  planState
  reasonCode
  requestedFamilyCount
  admittedFamilyCount
  activationBasis
  projectionScope
```

It must not include:

```text
full user request text
source content
family semantic drafts
quarantined content
DOM / CSS
```

It does not enter ordinary model context.

## 32. Legacy Community / Reaction coexistence

MF-1 explicitly preserves legacy Community compatibility.

Existing owners remain responsible for:

```text
Community block-count contract
[RT N] reaction numbering / normalization
```

But Community output has no authority to produce a fanout intent.

Forbidden:

```text
Community present
→ automatically request BOARD / NEWS / SOCIAL_FEED
```

Canonical rule:

```text
LEGACY COMMUNITY COMPATIBILITY
!=
MULTI-FAMILY PLAN AUTHORITY
```

## 33. Source family labels in user prose

A user mentioning a family-like word in ordinary narrative does not necessarily authorize fanout.

The trusted current control plane must resolve whether the current request semantically contains an explicit source-family request.

MF-1 does not authorize naive string matching such as:

```text
"news"
→ always activate NEWS
```

The producer of `activationAuthorityRef` remains a runtime-readiness blocker outside this design.

## 34. `AUTHORIZED_PRODUCT_POLICY` future path

MF-1 preserves automatic policy fanout as a future capability.

Before activation it must define at least:

```text
policy owner
policy version / current authority
when policy is evaluated
which families it may request
budget rules
user-visible behavior
opt-out / product semantics when relevant
DORMANT preservation
```

Until then:

```text
AUTHORIZED_PRODUCT_POLICY
= recognized but not admitted in V1
```

## 35. Candidate C matrix

MF-1 current design:

```text
C1 cross-turn derived survival       NO
C2 stable derived identity           NO
C3 mutation                          NO
C4 append / merge                    NO
C5 derived-to-derived lineage        NO
C6 future context re-entry           NO
C7 partial historical survival       NO
C8 delayed exact-object effect       NO
```

Therefore Candidate C remains not activated.

## 36. MF-2 handoff

MF-1 hands an admitted plan to MF-2.

MF-2 must decide the exact shared trusted authority bundle and prove family-lane isolation.

MF-1 does not yet freeze:

```text
shared evidence field list
family-specific authority views
authority-bundle transport
family validator dispatch payload
```

## 37. MF-3 handoff

MF-1 leaves concrete aggregate hard caps and detailed failure matrix to MF-3.

MF-1 only requires admission before expensive work and rejects structurally invalid plans first.

## 38. MF-4 handoff

MF-1 does not own stack order or mount layout.

`requestedFamilies[]` does not become presentation order authority.

## 39. MF-5 / MF-6 handoff

MF-1 intentionally does not promote SOCIAL_FEED or PUBLIC_KNOWLEDGE.

```text
SOCIAL_FEED
→ MF-5 entry review

PUBLIC_KNOWLEDGE
→ MF-6 entry review
```

A successful future entry review may amend the registry state from `ENTRY_REVIEW_REQUIRED` to `ELIGIBLE` for the exact selected scope.

## 40. Runtime-readiness blockers preserved

MF-1 does not solve:

```text
ACTIVE_SOURCE_JOB_SELECTION_AUTHORITY
CURRENT_EXPLICIT_REQUEST_ACTIVATION_PRODUCER
STRUCTURED_SIDECAR_PRODUCER_AND_TRANSPORT
PHYSICAL_MULTI_FAMILY_MODEL_CALL_TOPOLOGY
SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY
CONCRETE_FANOUT_HARD_CAPS
NEWS_TRUSTED_MATURITY_CONTEXT_PRODUCER
FANOUT_INSTRUMENTATION / REAL PERFORMANCE EVIDENCE
TARGET_HOST_EXPOSURE MODEL COMPLIANCE
```

## 41. Frozen MF-1 result

```text
MF-1 = DESIGN FROZEN

INTENT = CurrentSourceFanoutIntentV1
ADMITTED PLAN = CurrentSourceFanoutPlanV1
PLAN OWNER = CURRENT TRUSTED CONTROL PLANE
ACTIVE V1 BASIS = EXPLICIT_CURRENT_REQUEST
SCOPE = CURRENT_PROJECTION_ONLY
ONE PLAN = ONE SOURCE AUTHORITY ROOT
ADMISSION = ATOMIC

REGISTRY:
LIVE_REACTION     = ELIGIBLE
BOARD             = ELIGIBLE
NEWS              = ELIGIBLE
SOCIAL_FEED       = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE  = ENTRY_REVIEW_REQUIRED

LEGACY COMMUNITY = COMPATIBLE, NOT PLAN AUTHORITY
CANDIDATE C = NOT ACTIVATED
IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
```

## 42. Next checkpoint

```text
MF-2 · Shared Current Authority Bundle
       + Family-Lane Isolation
```
