# SimCore Post-3.0M Multi-Family MF-1 Fanout Plan + Family Entry Registry Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-1 IMPACT SCOPE FROZEN · FANOUT PLAN AUTHORITY BOUNDARY · FAMILY ENTRY REGISTRY BOUNDARY · INITIAL ELIGIBLE SET PRESERVED · SOCIAL_FEED / PUBLIC_KNOWLEDGE ENTRY REVIEW REQUIRED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-1 · FANOUT PLAN · FAMILY ENTRY REGISTRY · IMPACT SCOPE**

## 0. Purpose

MF-0 froze `CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT` and named MF-1 as the next checkpoint.

MF-1 narrows two control-plane questions:

```text
1. What exact current plan is allowed to request sibling fanout?
2. Which source families are legally admissible members of that plan?
```

This checkpoint is design-only. It does not implement selectors, registry code, runtime schemas, model topology, sidecar transport, validators, presentation mounts, persistence, prompt changes, or release changes.

## 1. Authority preservation

MF-1 must preserve:

```text
RUNTIME MODE != SOURCE FAMILY != FANOUT PLAN != PRESENTATION ADAPTER
```

The main model does not choose fanout.
The renderer does not choose fanout.
History does not choose fanout.
Legacy Community output does not choose fanout.

A fanout plan must be produced by current trusted SimCore/product authority before semantic family generation begins.

## 2. First-safe plan shape

The selected first plan remains one-root sibling fanout:

```text
ONE current sourceAuthorityRef
+
TWO OR MORE requested eligible families
+
ONE current projection window
```

Explicitly outside MF-1 first scope:

```text
multiple authority roots
historical roots
fuzzy source recovery
derived-family output as another family source
persistent plan IDs
cross-turn plan continuation
background fanout
```

## 3. Activation basis

The master allowed conceptual bases:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

MF-1 freezes first-safe admission priority:

```text
EXPLICIT_CURRENT_REQUEST = ADMISSIBLE
AUTHORIZED_PRODUCT_POLICY = RESERVED / NOT ACTIVE IN V1
```

Reason: silent automatic fanout changes cost, UI volume, and source behavior without an explicit current request contract.

`AUTHORIZED_PRODUCT_POLICY` remains a legitimate future capability, not a forbidden concept.

## 4. Requested family list rules

The requested family list is treated as an ordered requested set for admission, not as free model text.

Required rules:

```text
family key must be recognized
family must be fanout-eligible
no duplicate family keys
family count >= 2 for ACTIVE_MULTI
family count == 1 routes to ACTIVE_SINGLE, not fake multi
family count == 0 routes to DORMANT when no source job exists
unsupported member rejects the plan; do not silently drop/substitute it
```

No model-generated family expansion is allowed.

## 5. Registry state vocabulary

MF-1 freezes conceptual registry states:

```text
ELIGIBLE
ENTRY_REVIEW_REQUIRED
INELIGIBLE_FOR_CURRENT_SCOPE
```

These states are orchestration admission states only.

They are not truth, maturity, exposure, presentation, or implementation-readiness states.

## 6. Current registry decision

Current first-safe registry remains:

```text
LIVE_REACTION     = ELIGIBLE
BOARD             = ELIGIBLE
NEWS              = ELIGIBLE
SOCIAL_FEED       = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE  = ENTRY_REVIEW_REQUIRED
```

SOCIAL_FEED and PUBLIC_KNOWLEDGE are now standalone-design converged, but convergence alone does not prove fanout-entry compatibility.

Their dedicated MF-5 / MF-6 entry reviews remain required.

## 7. Entry-review evidence requirements

A family may move from `ENTRY_REVIEW_REQUIRED` to `ELIGIBLE` only if a dedicated design proves all of:

```text
standalone family contract frozen
current-projection fanout lifetime compatible
shared-root exact join is defined
family validation remains independent of sibling derived output
no required persistence/history/retrieval for selected scope
bounded semantic cost
bounded validation diagnostics
presentation adapter independently mountable
family-local semantic failure isolatable
family-local presentation failure isolatable
source invalidation behavior compatible with whole-plan invalidation
Candidate C implications explicitly reassessed
```

No registry promotion by analogy is allowed.

## 8. Same-root exactness

The first multi-family plan must carry exactly one trusted `sourceAuthorityRef`.

Every admitted family lane must bind to that exact root.

Forbidden:

```text
LIVE_REACTION -> source A
BOARD         -> source B
NEWS          -> source C
```

inside one MF-1 plan.

That is multi-authority composition and remains deferred.

## 9. Family order semantics

Requested-family order and presentation order are distinct concerns.

MF-1 admission must normalize to registry identity, while MF-4 remains responsible for final presentation-stack ordering.

Canonical rule:

```text
REQUEST ORDER != TRUTH RANK != PRESENTATION AUTHORITY
```

MF-1 must not use request order to imply semantic priority.

## 10. Duplicate handling

Duplicate families are invalid input to multi-family admission.

Example:

```text
[BOARD, BOARD, NEWS]
```

must not become:

```text
[BOARD, NEWS]
```

silently.

Preferred first-safe disposition:

```text
PLAN_DENY_DUPLICATE_FAMILY
```

Reason: silent deduplication hides upstream plan defects.

## 11. Unsupported family handling

Example:

```text
[BOARD, UNKNOWN_FAMILY]
```

must fail admission before expensive family generation.

No fallback to BOARD-only is allowed unless a separate explicit single-family plan is produced.

Preferred disposition:

```text
PLAN_DENY_UNKNOWN_FAMILY
```

## 12. Entry-review-required handling

Example before MF-5:

```text
[BOARD, SOCIAL_FEED]
```

must not partially execute BOARD and quietly omit SOCIAL_FEED.

Preferred disposition:

```text
PLAN_DENY_FAMILY_ENTRY_REVIEW_REQUIRED
```

Partial success begins only after plan admission, at family semantic/presentation execution. Admission itself is atomic.

## 13. ACTIVE_SINGLE compatibility

MF-1 must not force a multi-family envelope when only one family is requested.

```text
one eligible family
-> existing ACTIVE_SINGLE path
```

The legacy single-family semantics remain unchanged.

## 14. DORMANT compatibility

When no authorized current source job exists:

```text
DORMANT
source semantic burden = 0
```

MF-1 must not scan history or visible source cards to manufacture a plan.

## 15. Legacy Community compatibility

Legacy Community / Reaction remains a compatibility surface, not a fanout family selector.

Preserved:

```text
existing Community block count behavior
existing [RT N] reaction numbering ownership
```

Forbidden:

```text
COMMUNITY block present
-> infer BOARD + SOCIAL_FEED + NEWS fanout
```

Community coexistence may be validated later, but it cannot become orchestration authority.

## 16. Candidate C impact

MF-1 first scope activates none of C1..C8.

The plan is:

```text
current projection only
no durable plan identity
no cross-turn family identity
no mutation
no derived-to-derived propagation
no future context re-entry
no partial historical survival
no delayed effect
```

Candidate C remains conditionally ready and not activated.

## 17. Failure boundary

Plan admission is atomic.

If the plan itself is invalid:

```text
NO FAMILY LANES DISPATCHED
```

After a valid plan is admitted, family-local failure isolation follows MF-0 and later MF-3.

Canonical distinction:

```text
PLAN ADMISSION FAILURE
!=
FAMILY EXECUTION FAILURE
```

## 18. Expected MF-1 detailed outputs

The detailed MF-1 design should freeze:

```text
CurrentSourceFanoutPlanV1 conceptual fields
normalized family-key vocabulary
activation-basis contract
plan-state transition rules
registry entry record shape
registry transition rules
admission reason-code vocabulary
single/multi/dormant routing
same-root exact-join invariants
legacy Community non-authority rule
bounded receipt surface
```

It must not implement any of them.

## 19. Non-goals

MF-1 does not decide:

```text
shared authority bundle details      -> MF-2
aggregate hard caps                  -> MF-3
family failure matrix details        -> MF-3
presentation stack/mount ordering    -> MF-4
SOCIAL_FEED entry promotion          -> MF-5
PUBLIC_KNOWLEDGE entry promotion     -> MF-6
cross-family propagation             -> MF-7
runtime validation protocol          -> MF-8
```

## 20. Impact result

```text
MF-1 IMPACT = BOUNDED
PLAN AUTHORITY = CURRENT TRUSTED CONTROL PLANE ONLY
FIRST ACTIVE BASIS = EXPLICIT_CURRENT_REQUEST
ONE PLAN = ONE CURRENT SOURCE AUTHORITY ROOT
ADMISSION = ATOMIC
INITIAL ELIGIBLE = LIVE_REACTION + BOARD + NEWS
SOCIAL_FEED = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE = ENTRY_REVIEW_REQUIRED
LEGACY COMMUNITY = PRESERVED BUT NOT FANOUT AUTHORITY
CANDIDATE C = NOT ACTIVATED
RUNTIME = UNCHANGED
PRODUCTION = UNCHANGED
```
