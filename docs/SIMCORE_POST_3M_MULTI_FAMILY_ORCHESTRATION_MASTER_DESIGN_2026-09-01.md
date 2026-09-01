# SimCore Post-3.0M Multi-Family Orchestration Master Design - 2026-09-01

Date: 2026-09-01 KST

Status: **MASTER DESIGN FROZEN · CURRENT-AUTHORITY SIBLING FANOUT · INITIAL FAMILIES LIVE_REACTION / BOARD / NEWS · CROSS-FAMILY PROPAGATION DEFERRED · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · RUNTIME / PRODUCER / TRANSPORT / MOUNT NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE INTELLIGENCE · MULTI-FAMILY ORCHESTRATION · MASTER DESIGN · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

This document freezes the overall architecture for the post-3.0M Multi-Family Orchestration follow-up.

The product question is:

```text
How can one current authoritative event/source
be projected into several Source Intelligence families
within one current response window
without allowing those derived projections to become
truth authority for one another?
```

The selected first scope is:

```text
CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT
```

This is a design-only checkpoint.

It does not implement source-job selection, model generation topology, sidecar transport, validator code, presentation mounting, DOM/CSS, persistence, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Authority chain

This design consumes the frozen Source Intelligence contracts from:

```text
3M-2   Assertion / Exposure Boundary
3M-3   Structured Sidecar / Validation
3M-4   Presentation Renderer Architecture
3M-5   BOARD Source Family
3M-6   Current Projection Support Invalidation
3M-7   Context Re-entry / Source History
3M-8   NEWS Publication Maturity
3M-9   Integration / Performance / Source-Irrelevant Baseline
3M-10  Major Convergence / Real-Validation Protocol
```

It also consumes the post-3M family designs as compatibility inputs:

```text
SOCIAL_FEED master design
PUBLIC_KNOWLEDGE settlement master design
```

Those later family designs do not automatically become fanout-eligible.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

Multi-Family Orchestration is a control-plane capability.

It is not:

```text
a new core mode
a new truth class
a source family
a source database
a cross-family knowledge graph
a persistent scheduler
a renderer skin
```

Canonical rule:

```text
RUNTIME MODE
!=
SOURCE FAMILY
!=
MULTI-FAMILY ORCHESTRATION
!=
PRESENTATION ADAPTER
```

Mode A/B/C semantics remain unchanged.

Source families remain orthogonal projections under the existing runtime architecture.

## 3. First architectural split

The first design separates two superficially similar behaviors.

### 3.1 Sibling fanout

```text
trusted current authority E
  ├→ LIVE_REACTION(E)
  ├→ BOARD(E)
  └→ NEWS(E)
```

Every family derives independently from the same trusted current authority package.

### 3.2 Cross-family propagation

```text
BOARD derived object
→ NEWS derived object
```

or:

```text
SOCIAL_FEED derived object
→ PUBLIC_KNOWLEDGE settlement
```

These are different because the second derived object now depends on the first derived object as provenance.

Frozen rule:

```text
SIBLING FANOUT
!=
DERIVED-TO-DERIVED PROPAGATION
```

The first scope authorizes only the former at design level.

Cross-family propagation remains deferred and would trigger Candidate C C5 reassessment.

## 4. First-safe scope

The first orchestration scope is intentionally narrow:

```text
ONE current trusted source authority root
TWO OR MORE requested sibling families
CURRENT PROJECTION ONLY
READ-ONLY
NON-PERSISTENT
NO AUTOMATIC CONTEXT RE-ENTRY
NO HISTORICAL SOURCE RETRIEVAL
NO DERIVED-TO-DERIVED SOURCE AUTHORITY
NO USER MUTATION
NO REQUIRED NETWORK / MEDIA
```

The first fanout family set is:

```text
LIVE_REACTION
BOARD
NEWS
```

This trio is selected because each already has a converged standalone semantic policy, bounded snapshot lifetime, validation boundary, and presentation contract.

## 5. Control-plane states

3M-9 froze:

```text
DORMANT
ACTIVE
UNSUPPORTED
```

The Multi-Family follow-up refines the conceptual state without invalidating the old single-family path:

```text
DORMANT
ACTIVE_SINGLE
ACTIVE_MULTI
UNSUPPORTED
```

### `DORMANT`

No current authorized source job exists.

### `ACTIVE_SINGLE`

Exactly one current family is authorized.

This preserves the original 3M-9 behavior.

### `ACTIVE_MULTI`

Two or more fanout-eligible families are explicitly authorized for the same current source authority root.

### `UNSUPPORTED`

The current request asks for a family combination, source shape, or orchestration scope outside the frozen contracts.

`UNSUPPORTED` must not guess a replacement family set.

## 6. Upstream plan ownership

Multi-Family Orchestration must consume an already-authorized current plan.

It must not infer fanout from:

```text
old source cards
old Community text
history residue
family names appearing in unrelated prose
source UI still visible on screen
fuzzy retrieval
model preference
```

Conceptual plan:

```text
CurrentSourceFanoutPlanV1
  sourceAuthorityRef
  activationBasis
  requestedFamilies[]
```

Possible conceptual activation bases:

```text
EXPLICIT_CURRENT_REQUEST
AUTHORIZED_PRODUCT_POLICY
```

The first-safe product behavior should prefer `EXPLICIT_CURRENT_REQUEST`.

Automatic product-policy fanout may be designed later, but it must remain a current-authority decision and must not become a hidden background feature.

Canonical rules:

```text
MAIN MODEL DOES NOT CHOOSE THE FANOUT PLAN
PRESENTATION RENDERER DOES NOT CHOOSE THE FANOUT PLAN
HISTORY DOES NOT CHOOSE THE FANOUT PLAN
```

## 7. Fanout-eligible family registry

A family being designed is not enough to make it legal in multi-family execution.

Conceptual registry:

```text
FanoutEligibleFamilyRegistryV1

LIVE_REACTION = ELIGIBLE
BOARD         = ELIGIBLE
NEWS          = ELIGIBLE

SOCIAL_FEED        = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE   = ENTRY_REVIEW_REQUIRED
```

Future fanout-entry review must prove at least:

```text
1. standalone semantic contract is frozen
2. current-projection lifetime is supported for the selected fanout scope
3. no required persistence/history/retrieval exists
4. family validation is independent of sibling derived output
5. presentation adapter contract exists
6. family cost can be bounded
7. family failure can be isolated
8. source-authority exact join can use the shared current root safely
```

Canonical rule:

```text
FAMILY EXISTS
!=
FAMILY IS FANOUT-ELIGIBLE
```

## 8. Shared current authority bundle

Sibling lanes may share an immutable trusted current authority package.

Conceptual package:

```text
SharedCurrentSourceAuthorityBundleV1
  sourceAuthorityRef
  source evidence / lineage context
  exposure basis inputs
  current frame/time context when required
  source reachability inputs when required
```

This object is conceptual only and is not a persistent schema authorization.

The important semantic distinction is:

```text
SHARED TRUSTED CURRENT AUTHORITY
= ALLOWED

SHARED DERIVED FAMILY OUTPUT AS TRUTH PROOF
= FORBIDDEN
```

## 9. Independent family lanes

Every requested family executes as an independent semantic lane.

Conceptual graph:

```text
CurrentSourceFanoutPlan
        ↓
plan admission
        ↓
SharedCurrentSourceAuthorityBundle
        ├──────────────────────────────┐
        │                              │
        ↓                              ↓
LIVE_REACTION lane                 BOARD lane
  exposure + validator          exposure + board rules
        ↓                              ↓
validated sibling A               validated sibling B

        └───────────────┬──────────────┘
                        │
                        ↓
                    NEWS lane
             exposure + maturity + story rules
                        ↓
                validated sibling C
```

The visual convergence in the diagram does not mean NEWS consumes the other two outputs.

Each lane consumes the shared trusted current authority independently.

Forbidden:

```text
LIVE_REACTION text → BOARD evidence
BOARD payload       → NEWS truth proof
NEWS story          → LIVE_REACTION canonical fact
sibling consensus   → canon upgrade
```

## 10. Generation topology is not semantic authority

Future implementation may choose different physical generation topologies:

```text
one model call producing several bounded family drafts
one bounded model call per family
another proven equivalent topology
```

The master design does not choose among them.

Canonical rule:

```text
PHYSICAL PRODUCER TOPOLOGY
MUST NOT CHANGE
SOURCE AUTHORITY OR VALIDATION SEMANTICS
```

The main model may generate semantic drafts only for families already admitted by the orchestration plan.

It cannot add another family on its own.

## 11. Plan admission

Multi-family work must be admitted before expensive family work starts.

Conceptual order:

```text
1. verify current source job exists
2. verify one current trusted authority root
3. normalize requested family list
4. reject duplicates
5. verify all families are fanout-eligible
6. verify family count against fanout cap
7. verify aggregate semantic budget can be admitted
8. reject scopes requiring forbidden history/persistence/propagation
9. freeze immutable current plan for this projection
10. dispatch independent sibling lanes
```

No silent family substitution is allowed.

## 12. Budget model

DORMANT behavior remains exactly governed by 3M-9:

```text
source semantic burden = 0
```

For `ACTIVE_MULTI`, conceptual cost is:

```text
fanout cost
≈ Σ bounded current sibling-family cost
+ small bounded orchestration overhead
```

It must not scale with:

```text
all prior source history
all previous fanout runs
all registered families
all old renderer cards
```

Future runtime-readiness must freeze concrete values for:

```text
MAX_FAMILIES_PER_FANOUT
MAX_AGGREGATE_SEMANTIC_CHARS
MAX_AGGREGATE_VALIDATION_RECEIPT_ENTRIES
MAX_AGGREGATE_PRESENTATION_NODES
MAX_MODEL_CALLS_PER_FANOUT
MAX_MODEL_INPUT / OUTPUT BUDGET PER FANOUT
```

The initial family set naturally supports a conservative conceptual ceiling of three sibling families.

Exact runtime numbers are not frozen here.

## 13. Failure model

The orchestration layer distinguishes three scopes of failure.

### 13.1 Plan-wide failure

Examples:

```text
shared source authority missing
shared source authority stale or mismatched
invalid fanout plan
unsupported multi-authority shape
aggregate budget impossible
```

Result:

```text
WHOLE FANOUT PLAN INVALID
```

### 13.2 Family-local semantic failure

Examples:

```text
NEWS maturity = HOLD
BOARD dependency closure quarantines one branch
one family draft schema is invalid
one family scope is unsupported after lane validation
```

Result:

```text
affected family withheld / quarantined
other siblings remain independently eligible
```

### 13.3 Family-local presentation failure

Examples:

```text
BOARD adapter failure
NEWS mount failure
LIVE_REACTION CSS isolation failure
```

Result:

```text
that presentation surface fails closed or degrades safely
other sibling semantics remain valid
```

Presentation failure never changes sibling truth eligibility.

## 14. Partial success is a first-class legal outcome

A fanout plan does not promise identical family outcomes.

Example:

```text
current event E is immediately exposed

LIVE_REACTION = ELIGIBLE
BOARD         = ELIGIBLE
NEWS          = HOLD_DETAIL_AHEAD_OF_MATURITY
```

This is valid.

The families have different semantic policies.

Canonical rule:

```text
SIBLING POLICY DIFFERENCE
!=
ORCHESTRATION INCONSISTENCY
```

The UI must not disguise a withheld family as a successful empty family unless the family contract explicitly permits that representation.

## 15. Multi-family result model

The ordinary semantic output should remain a collection of independent validated family results, not one merged mega-schema.

Conceptual result:

```text
MultiFamilyProjectionResultV1
  planState
  sourceAuthorityRef
  familyResults[]
```

Each `familyResult` conceptually contains:

```text
family
outcome
validatedSemanticPayload? 
presentationIntent?
```

The family payload retains its native schema.

Canonical rule:

```text
COMMON ORCHESTRATION ENVELOPE
!=
COMMON SEMANTIC FAMILY SCHEMA
```

## 16. Bounded diagnostics

Conceptual diagnostic receipt:

```text
MultiFamilyOrchestrationReceiptV1
  planDisposition
  requestedFamilyCount
  admittedFamilyCount
  sourceSupportDisposition
  familyReceipts[]
```

Each family receipt may contain bounded metadata such as:

```text
family ordinal
family
outcome
reason code
validated item count
quarantined item count
bounded char/item counts
```

It must not duplicate quarantined source text or hidden semantic payloads.

Diagnostics are not ordinary presentation data and do not enter model context by default.

## 17. Support-at-use and invalidation

All sibling projections in the first scope share the same current `sourceAuthorityRef`.

Before ordinary presentation/use, the shared current authority must still match the trusted current source authority.

If it does not:

```text
invalidate all siblings from that fanout plan
```

No sibling may survive merely because its text still looks plausible.

Canonical rule:

```text
SHARED SOURCE SUPPORT LOST
→ WHOLE CURRENT FANOUT INVALID
```

This does not activate Candidate C because the first design performs no partial historical salvage.

## 18. Reroll / edit boundary

Current-projection sibling fanout remains compatible with whole-plan invalidation.

If the source root is rerolled or otherwise replaced:

```text
old sibling set invalid
→ new current authority
→ new fanout plan / fresh sibling projections
```

Not included:

```text
reroll BOARD only while preserving old LIVE_REACTION and NEWS
edit one sibling and preserve its old siblings as descendants
keep one stale sibling after source replacement
```

Those requirements create partial-generation identity / provenance pressure and require Candidate C C3/C7 reassessment.

## 19. Context and history policy

Multi-family fanout inherits 3M-7:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC CONTEXT RE-ENTRY
NO HIDDEN RETRIEVAL
```

Having several visible source surfaces does not grant them future model-context lifetime.

Canonical rule:

```text
VISIBLE FANOUT STACK
!=
FUTURE MODEL MEMORY
```

Cross-turn fanout history would activate Candidate C C1/C6 pressure and is a separate follow-up.

## 20. Presentation stack

Multi-family presentation is a collection of independent source-family surfaces.

Conceptual container:

```text
SourcePresentationStackV1
  ├ LIVE_REACTION_STREAM_V1
  ├ BOARD_THREAD_V1
  └ NEWS_ARTICLE_V1
```

The stack owns presentation-only concerns:

```text
family surface order
mount slots
collapse / expand state
family-local visibility
responsive arrangement
```

It does not own semantic truth.

The first deterministic family order is:

```text
LIVE_REACTION
BOARD
NEWS
```

This expresses a stable UI grammar, not a truth or confidence ranking.

Canonical rule:

```text
DISPLAY ORDER
!=
TRUTH RANK
```

## 21. CSS / DOM isolation

Every family preserves its own renderer grammar and namespace.

Multi-family orchestration must not introduce a giant shared source DOM that flattens family semantics.

Conceptual outer scope:

```text
[data-simcore-source-stack="multi-family"]
```

Inside it, each family keeps its own root such as:

```text
[data-simcore-source-family="live-reaction"]
[data-simcore-source-family="board"]
[data-simcore-source-family="news"]
```

Stack layout CSS may position family roots but may not reach inside and redefine family semantic structure globally.

Family renderer failure must remain isolatable.

## 22. Main-model / SimCore role split

Role boundaries remain unchanged.

### Main model

May produce bounded semantic draft content only for already-admitted families.

It does not own:

```text
fanout activation
family selection
source authority
final exposure disposition
NEWS maturity disposition
family validity
presentation order
CSS / DOM authority
```

### SimCore

Owns or coordinates the rule surface for:

```text
current fanout plan admission
fanout-eligible family registry
trusted source-authority package
family validator dispatch
aggregate budget
family outcome isolation
support-at-use
presentation stack ordering
bounded diagnostics
```

This preserves the existing philosophy that the model writes content while SimCore owns the structural and authority boundaries.

## 23. Candidate C status

Sibling multi-family fanout does not activate Candidate C by itself.

Frozen first-scope status:

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item mutation                     = no
C4 append / merge / revision         = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 partial descendant survival       = no
C8 delayed semantic side effect      = no
```

Candidate C becomes mandatory if later design asks for:

```text
BOARD output becoming NEWS source input
SOCIAL_FEED output becoming PUBLIC_KNOWLEDGE input
one sibling persisting while source authority changes
one sibling rerolled independently with stable lineage
cross-turn fanout archive/retrieval
fanout-derived source content entering future context
async media attaching to exact old sibling objects
```

## 24. Explicitly deferred architecture

The master design does not authorize:

```text
cross-family derived-to-derived propagation
multi-authority composition
cross-turn fanout history
persistent fanout run IDs
stable sibling object IDs across turns
automatic background fanout
automatic trending fanout
user mutation of sibling surfaces
network/media dependency
cross-family truth voting
cross-family confidence aggregation
```

Each may be a valid future product, but each changes the authority or lifetime model materially.

## 25. SOCIAL_FEED entry boundary

SOCIAL_FEED already has a post-3M standalone design, but its fanout eligibility remains separate.

A dedicated entry review should verify:

```text
snapshot-local actor identity remains sufficient
PUBLIC_FEED_ONLY reachability is compatible with the shared current root
POST / REPLY / REPOST / QUOTE graph validation remains family-local
no persistent account/post identity is required
no media/network requirement is introduced
current-projection cost is bounded
SOCIAL_TIMELINE_V1 can mount independently
```

Only after that review may SOCIAL_FEED become a fanout registry member.

## 26. PUBLIC_KNOWLEDGE entry boundary

PUBLIC_KNOWLEDGE has stronger settlement semantics and therefore needs its own fanout-entry review.

The review must prove that same-current-authority sibling projection does not accidentally turn NEWS or social sibling output into settlement evidence.

Canonical rule:

```text
SAME EVENT HAS NEWS / BOARD / SOCIAL SIBLINGS
!=
PUBLIC KNOWLEDGE SETTLEMENT EVIDENCE
```

If PUBLIC_KNOWLEDGE intentionally consumes prior derived-family objects, that is not sibling fanout anymore and Candidate C C5 must be reassessed.

## 27. Acceptance / validation design requirements

A future implementation-ready validation protocol should include at least:

```text
M0  ordinary chat stays DORMANT
M1  single-family path unchanged
M2  LIVE_REACTION + BOARD same-root fanout
M3  LIVE_REACTION + NEWS same-root fanout
M4  BOARD + NEWS same-root fanout
M5  all three initial siblings
M6  valid partial outcome where NEWS is HOLD
M7  family-local validator failure does not poison siblings
M8  presentation failure isolation
M9  shared authority mismatch invalidates entire fanout
M10 source reroll invalidates old sibling set
M11 unrelated next turn returns to DORMANT
M12 repeated fanout has no hidden history accumulation
M13 no sibling output is accepted as another sibling's truth authority
M14 aggregate budget cap rejects before expensive execution
M15 legacy Community coexistence does not duplicate authority
```

These are design requirements only. No runtime validation is claimed here.

## 28. Follow-up checkpoint ladder

Recommended design sequence after this master design:

```text
MF-0  Multi-Family Master Design
      ← this document

MF-1  Fanout Plan + Family Entry Registry

MF-2  Shared Current Authority Bundle
      + Family-Lane Isolation

MF-3  Admission / Aggregate Budget
      + Failure Matrix

MF-4  Presentation Stack
      + Ordering / Mount Isolation

MF-5  SOCIAL_FEED Fanout Entry Review

MF-6  PUBLIC_KNOWLEDGE Fanout Entry Review

MF-7  Cross-Family Propagation Reassessment
      + Candidate C C5 checkpoint

MF-8  Multi-Family Convergence
      + Runtime Validation Protocol
```

All checkpoints remain design-only unless a separate implementation authorization is explicitly granted.

## 29. Blockers for future runtime implementation

The following must remain explicit future blockers rather than implied solved problems:

```text
ACTIVE_SOURCE_JOB_SELECTION_AUTHORITY
STRUCTURED_SIDECAR_PRODUCER_AND_TRANSPORT
PHYSICAL_MULTI_FAMILY_MODEL_CALL_TOPOLOGY
SOURCE_PRESENTATION_HOST_MOUNT_AUTHORITY
CONCRETE_FAMILY_AND_AGGREGATE_HARD_CAPS
NEWS_TRUSTED_MATURITY_CONTEXT_PRODUCER
FANOUT_INSTRUMENTATION_AND_REAL_PERFORMANCE_EVIDENCE
TARGET_HOST_EXPOSURE_MODEL_COMPLIANCE
```

This document creates no implementation authority for any blocker.

## 30. Frozen master result

```text
PRODUCT = MULTI_FAMILY_ORCHESTRATION
SELECTED_SCOPE = CURRENT_AUTHORITY_SIBLING_MULTI_FAMILY_FANOUT
CONTROL_STATE = DORMANT | ACTIVE_SINGLE | ACTIVE_MULTI | UNSUPPORTED
INITIAL_FANOUT_FAMILIES = LIVE_REACTION + BOARD + NEWS
SOCIAL_FEED = ENTRY_REVIEW_REQUIRED
PUBLIC_KNOWLEDGE = ENTRY_REVIEW_REQUIRED
SHARED_CURRENT_AUTHORITY = ALLOWED
SHARED_DERIVED_TRUTH_AUTHORITY = FORBIDDEN
PARTIAL_FAMILY_SUCCESS = ALLOWED
CROSS_FAMILY_PROPAGATION = DEFERRED
MULTI_AUTHORITY_COMPOSITION = DEFERRED
CROSS_TURN_FANOUT_HISTORY = DEFERRED
CANDIDATE_C = NOT_ACTIVATED
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```
