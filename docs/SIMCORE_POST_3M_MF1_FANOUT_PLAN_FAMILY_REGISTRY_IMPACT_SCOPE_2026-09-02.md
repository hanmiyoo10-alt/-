# SimCore Post-3.0M MF-1 Fanout Plan + Family Entry Registry Impact Scope - 2026-09-02

Date: 2026-09-02 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-1 · FANOUT PLAN · FAMILY REGISTRY · IMPACT SCOPE**

## 0. Purpose

MF-0 froze Multi-Family Orchestration as a control-plane capability for same-current-authority sibling fanout.

MF-1 answers the next narrower question:

```text
How is a current multi-family request represented,
which authority is allowed to authorize it,
and how does SimCore decide whether the requested family set
is legal before any expensive family generation begins?
```

This checkpoint is read-only architecture work expressed as documentation.

It does not implement source-job selection, model generation topology, structured sidecar transport, family validators, renderer mounting, DOM/CSS, persistence, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Inputs already frozen by MF-0

MF-0 established:

```text
CONTROL STATES
DORMANT
ACTIVE_SINGLE
ACTIVE_MULTI
UNSUPPORTED

INITIAL FANOUT-ELIGIBLE FAMILIES
LIVE_REACTION
BOARD
NEWS

ENTRY REVIEW REQUIRED
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

It also established that:

```text
MAIN MODEL DOES NOT CHOOSE THE FANOUT PLAN
PRESENTATION RENDERER DOES NOT CHOOSE THE FANOUT PLAN
HISTORY DOES NOT CHOOSE THE FANOUT PLAN
```

MF-1 must preserve those boundaries.

## 2. Selected impact seam

The selected first seam is:

```text
CURRENT_SOURCE_FANOUT_PLAN_ADMISSION_AND_STATIC_FAMILY_REGISTRY
```

MF-1 does not own the upstream producer that decides whether the current product/request wants one or several families.

Instead it defines the bounded interface that such an upstream current-authority selector must satisfy before family work is admitted.

## 3. Ownership split

### 3.1 Upstream current source-job authority

Owns whether the current request has a source job at all and which family or family set is being requested under current authority.

This producer remains a future runtime-readiness blocker from 3M-10/MF-0.

MF-1 must not invent it by scanning history, model output, visible UI, or lexical family names.

### 3.2 MF-1 plan admission

Owns structural legality of the proposed current fanout plan:

```text
current source job exists?
one current authority root?
family list structurally valid?
all family keys known?
all requested families fanout-eligible?
family count legal at design level?
forbidden persistence/history/propagation requested?
```

MF-1 does not decide claim truth, exposure eligibility, NEWS maturity, BOARD dependency closure, or renderer success.

### 3.3 Family registry

Owns the control-plane admission status of known Source Intelligence family keys for multi-family sibling fanout.

It does not own each family's semantic contract.

## 4. Critical representation split

The current product request and the admitted immutable plan must be distinct conceptual objects.

Frozen impact rule:

```text
REQUESTED FANOUT INTENT
!=
ADMITTED FANOUT PLAN
```

Reason:

A request may contain an unknown family, an entry-review-required family, duplicate keys, multiple source authorities, or another unsupported scope.

Those invalid requests must never become executable plans merely because they can be parsed.

## 5. Candidate input and output seam

Conceptual input:

```text
CurrentSourceFanoutIntentV1
  sourceAuthorityRef
  activationBasis
  requestedFamilies[]
```

This is an admission candidate only.

Conceptual MF-1 output:

```text
FanoutPlanAdmissionResultV1
  state
  reasonCode
  admittedPlan?
```

Where `admittedPlan`, when present, is immutable for the current projection window.

These names are design vocabulary only and do not authorize persistent schemas.

## 6. Family-key policy

First-safe family keys are exact canonical identifiers:

```text
LIVE_REACTION
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

MF-1 must not fuzzy-match or silently alias arbitrary model/user text into a family key.

Examples that must not be silently guessed:

```text
"social"
"sns"
"article"
"forum-ish"
"news maybe"
```

Any human-language interpretation belongs upstream in current request/product policy handling, not in the registry.

Canonical rule:

```text
FAMILY REGISTRY
IS NOT
A NATURAL-LANGUAGE CLASSIFIER
```

## 7. Duplicate-family behavior

MF-0 said duplicates are rejected before execution.

MF-1 preserves that rule.

```text
[BOARD, BOARD]
→ INVALID_DUPLICATE_FAMILY
```

The plan must not silently deduplicate because doing so would hide malformed or conflicting upstream planning behavior.

## 8. Unknown and non-eligible family behavior

Unknown family:

```text
[BOARD, UNKNOWN_X]
→ UNSUPPORTED_UNKNOWN_FAMILY
```

Known but entry-review-required family:

```text
[BOARD, SOCIAL_FEED]
→ UNSUPPORTED_FAMILY_ENTRY_REVIEW_REQUIRED
```

The legal BOARD sibling must not be silently executed after the other family is dropped.

Canonical rule:

```text
PLAN ADMISSION IS ATOMIC
```

Partial success begins only after a valid fanout plan has been admitted and independent family lanes have started.

## 9. Family-count interpretation

MF-1 distinguishes plan cardinality after structural validation:

```text
0 admitted families
→ invalid source plan if a source job was explicitly requested

1 admitted family
→ ACTIVE_SINGLE

2+ admitted families
→ ACTIVE_MULTI
```

If no current source job exists at all, the outer orchestration state remains `DORMANT` under 3M-9/MF-0.

MF-1 must not synthesize a default family for an empty requested family list.

## 10. Ordering semantics

Requested family order is not truth, priority, confidence, or authority.

MF-1 should normalize the admitted family set into a deterministic canonical control-plane order.

For the first eligible registry:

```text
LIVE_REACTION
BOARD
NEWS
```

This order is consistent with the initial presentation-stack grammar but does not itself authorize presentation order policy, which remains MF-4 territory.

Canonical rule:

```text
CANONICAL FAMILY ORDER
!=
TRUTH RANK
!=
USER PRIORITY
```

If later product requirements need explicit user presentation priority, that must be represented separately from family identity.

## 11. Activation basis impact

MF-0 identified conceptual activation bases:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

MF-1 first-safe design should admit only activation bases already supplied by trusted current-authority planning.

The registry must not promote:

```text
history residue
visible old source cards
model preference
family-name lexical matches
```

into activation authority.

A future automatic product-policy fanout design remains possible but is not created here.

## 12. One-current-authority invariant

The first multi-family scope requires all requested siblings to use one current trusted source authority root.

Therefore MF-1 must reject candidate intents that imply multiple independent roots.

```text
BOARD(root=A)
NEWS(root=B)
→ UNSUPPORTED_MULTI_AUTHORITY_FANOUT
```

Multi-authority composition remains explicitly deferred by MF-0.

## 13. Forbidden-scope admission checks

Before family generation, MF-1 must fail closed when the requested plan requires any currently deferred architecture, including:

```text
cross-family derived-to-derived propagation
cross-turn fanout history
persistent fanout run identity
stable sibling object identity across turns
user mutation of sibling surfaces
multi-authority composition
required network/media dependency
hidden historical retrieval
```

Such a request is not a smaller legal plan with extra fields ignored.

It is an unsupported plan.

## 14. Registry semantics

The first conceptual registry states are:

```text
ELIGIBLE
ENTRY_REVIEW_REQUIRED
DISABLED
UNKNOWN
```

`UNKNOWN` is a lookup result rather than a stored registry row.

Initial design snapshot:

```text
LIVE_REACTION      = ELIGIBLE
BOARD              = ELIGIBLE
NEWS               = ELIGIBLE
SOCIAL_FEED        = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE   = ENTRY_REVIEW_REQUIRED
```

`DISABLED` is reserved for a known family whose fanout admission has been intentionally suspended by a later design/release decision.

No current family is frozen as `DISABLED` in MF-1.

## 15. Registry authority and mutability

The fanout registry is control-plane configuration, not generated content.

It must not be mutable by:

```text
main-model output
source sidecar content
renderer state
user-generated BOARD/SOCIAL content
old transcript content
```

First-safe design treats the registry as static/bounded for a runtime build or equivalent trusted control-plane version.

No persistent user-editable registry store is authorized here.

## 16. Entry-review gate remains external to ordinary admission

MF-1 admission may read the current eligibility state.

It must not perform a full family-entry architectural review on the fly.

For example:

```text
SOCIAL_FEED = ENTRY_REVIEW_REQUIRED
```

means ordinary fanout admission rejects it until MF-5 explicitly upgrades it.

Canonical rule:

```text
RUNTIME ADMISSION
DOES NOT
SELF-PROMOTE FAMILY ELIGIBILITY
```

## 17. No semantic policy duplication

MF-1 must not reimplement:

```text
Exposure policy
BOARD post/reply closure
NEWS maturity policy
story-atomic validation
source support-at-use
Presentation Renderer validation
```

MF-1 only decides whether a family lane is legal to dispatch under the current plan.

Once admitted, family-native validators remain authoritative.

## 18. No generation-topology decision

MF-1 does not decide whether future implementation uses:

```text
one model call for all admitted family drafts
one model call per admitted family
another proven bounded topology
```

Its only producer-facing guarantee is that generation must be limited to the already-admitted family set.

## 19. Diagnostics boundary

MF-1 may later expose bounded admission metadata such as:

```text
plan state
reason code
requested family count
canonical admitted family count
activation basis enum
```

It must not duplicate source text, hidden assertions, quarantined family payload, or historical source content into admission diagnostics.

## 20. Non-impact boundaries

MF-1 must not change:

```text
Mode A / B / C semantics
legacy <COMMUNITY> behavior
single-family family schemas
Exposure semantics
NEWS maturity semantics
Candidate C status
context re-entry policy
Presentation adapters
host DOM/CSS
persistent Core state
release-simcore
```

## 21. Candidate C status

MF-1 does not activate Candidate C.

It introduces no derived object lifetime beyond the current projection and no derived-to-derived provenance.

```text
C1..C8 = unchanged / not activated
```

## 22. Failure taxonomy selected for MF-1 design

The following reason-code families should be frozen in the detailed MF-1 design:

```text
NO_CURRENT_SOURCE_JOB
INVALID_EMPTY_FAMILY_SET
INVALID_DUPLICATE_FAMILY
UNSUPPORTED_UNKNOWN_FAMILY
UNSUPPORTED_FAMILY_ENTRY_REVIEW_REQUIRED
UNSUPPORTED_FAMILY_DISABLED
UNSUPPORTED_MULTI_AUTHORITY_FANOUT
UNSUPPORTED_DEFERRED_SCOPE
ADMITTED_SINGLE
ADMITTED_MULTI
```

The detailed design may refine names but must preserve the distinctions.

## 23. Selected MF-1 design seam

The next detailed design document should freeze:

```text
1. CurrentSourceFanoutIntentV1 conceptual contract
2. FanoutEligibleFamilyRegistryV1 conceptual contract
3. deterministic family-key normalization rules
4. atomic plan-admission algorithm
5. immutable AdmittedCurrentSourceFanoutPlanV1
6. control-state derivation for single vs multi
7. bounded admission receipt/reason codes
8. entry-review promotion boundary
9. non-impact and implementation blockers
```

## 24. Runtime blockers intentionally left open

MF-1 design must not pretend the following are solved:

```text
ACTIVE_SOURCE_JOB_SELECTION_AUTHORITY
PHYSICAL_REQUEST_TO_PLAN_PRODUCER
CONCRETE_RUNTIME_FANOUT_CAPS
STRUCTURED_SIDECAR_PRODUCER_AND_TRANSPORT
PHYSICAL_MULTI_FAMILY_MODEL_CALL_TOPOLOGY
SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY
REAL PERFORMANCE / LONG-CHAT EVIDENCE
TARGET_HOST EXPOSURE COMPLIANCE
```

## 25. Frozen impact result

```text
CHECKPOINT = MF-1 IMPACT SCOPE
SELECTED_SEAM = CURRENT_SOURCE_FANOUT_PLAN_ADMISSION_AND_STATIC_FAMILY_REGISTRY
REQUEST_INTENT != ADMITTED_PLAN
PLAN_ADMISSION = ATOMIC
FAMILY_KEY_MATCHING = EXACT_CANONICAL_ONLY
DUPLICATES = REJECT
UNKNOWN FAMILY = REJECT WHOLE PLAN
ENTRY_REVIEW_REQUIRED FAMILY = REJECT WHOLE PLAN
ONE ELIGIBLE FAMILY = ACTIVE_SINGLE
TWO_OR_MORE ELIGIBLE FAMILIES = ACTIVE_MULTI
FAMILY REGISTRY = TRUSTED CONTROL-PLANE CONFIGURATION
FAMILY REGISTRY != NATURAL-LANGUAGE CLASSIFIER
FAMILY REGISTRY != SEMANTIC VALIDATOR
CANDIDATE_C = NOT ACTIVATED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```