# SimCore Post-3.0M MF-3 Admission / Aggregate Budget + Failure Matrix Design — 2026-09-02

Date: 2026-09-02 KST

Status: **DESIGN FROZEN · TWO-STAGE ADMISSION · ACTIVE_MULTI AGGREGATE BUDGET GATE · CONSERVATIVE STATIC RESERVATION · ATOMIC PRE-EXECUTION REJECTION · BLAST-RADIUS FAILURE MATRIX · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-3 · AGGREGATE BUDGET · FAILURE MATRIX · DESIGN**

## 0. Purpose

MF-0 froze same-current-authority sibling fanout.
MF-1 froze structural fanout-plan admission and a trusted family-entry registry.
MF-2 froze one current shared authority bundle plus least-authority isolated family lanes.

MF-3 now freezes the control-plane contract that decides whether an already legal `ACTIVE_MULTI` plan may begin expensive work under bounded current resource limits, and how failures are contained after execution starts.

Selected seam:

```text
MF1_STRUCTURAL_ADMISSION
+
MF2_CURRENT_AUTHORITY_BINDING
        ↓
STATIC_TRUSTED_FAMILY_BUDGET_PROFILES
+
STATIC_TRUSTED_AGGREGATE_CAPS
        ↓
ATOMIC_ACTIVE_MULTI_EXECUTION_BUDGET_ADMISSION
        ↓
ISOLATED_FAMILY_EXECUTION
        ↓
BLAST_RADIUS_AWARE_AGGREGATION
```

This checkpoint is design-only.

It does not implement concrete numeric caps, model calls, token accounting, schedulers, generators, validators, presentation mounts, DOM/CSS, persistence, history, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Authority chain

MF-3 consumes:

```text
MF-0  Multi-Family Orchestration Master Design
MF-1  Fanout Plan + Family Entry Registry
MF-2  Shared Current Authority Bundle + Family-Lane Isolation
3M-9  Integration / Source-Irrelevant Baseline
3M-10 Runtime Readiness Gates
```

Initial fanout-eligible families remain:

```text
LIVE_REACTION
BOARD
NEWS
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Product identity

MF-3 is an execution-budget admission and failure-containment contract.

It is not:

```text
a new semantic authority owner
a source selector
a truth validator
a family registry replacement
a model scheduler implementation
a dynamic quality optimizer
a source-history store
a retry system
a renderer
```

Canonical rule:

```text
MF-1 SAYS THE FAMILY SET IS LEGAL
MF-2 SAYS THE CURRENT AUTHORITY BINDING IS LEGAL
MF-3 SAYS WHETHER ACTIVE_MULTI MAY SPEND THE BOUNDED EXECUTION BUDGET NOW
```

## 3. Two-stage admission terminology

MF-3 preserves MF-1 rather than redefining it.

### Stage A · structural admission

Owned by MF-1:

```text
CurrentSourceFanoutIntentV1
→ FanoutPlanAdmissionResultV1
→ AdmittedCurrentSourceFanoutPlanV1
```

This proves:

```text
current source job exists
family keys are exact/known
all families are fanout-eligible
requested scope is structurally supported
family set is duplicate-free
family order is canonical
one current sourceAuthorityRef is selected
family set is immutable for the projection
```

### Stage B · execution-budget admission

Owned by MF-3 for `ACTIVE_MULTI`:

```text
AdmittedCurrentSourceFanoutPlanV1
+
MF-2 authority-ready current bundle
+
trusted budget policy snapshot
→ FanoutExecutionBudgetAdmissionResultV1
```

Canonical rule:

```text
STRUCTURAL_ADMISSION_PASS
!=
EXECUTION_BUDGET_ADMISSION_PASS
```

A structurally valid plan can still be rejected before expensive work if its complete family set cannot fit the trusted current aggregate limits.

## 4. Orchestration-state applicability

MF-3 aggregate admission applies as follows:

```text
DORMANT
→ NOT_APPLICABLE

ACTIVE_SINGLE
→ AGGREGATE_GATE_NOT_REQUIRED
→ preserve existing standalone family cap semantics

ACTIVE_MULTI
→ AGGREGATE_GATE_REQUIRED

UNSUPPORTED
→ NOT_APPLICABLE / no execution
```

MF-3 does not use Multi-Family budgeting as a reason to change already-frozen standalone family semantics.

A future runtime implementation may internally reuse one budget engine for single and multi-family paths only if it proves no new rejection, authority, content, or latency semantics are introduced for `ACTIVE_SINGLE`.

Canonical rule:

```text
MULTI-FAMILY BUDGETING
MUST NOT REGRESS STANDALONE FAMILY BEHAVIOR BY DESIGN IMPLICATION
```

## 5. Budget authority ownership

Budget authority belongs to trusted control-plane configuration.

It is not model-owned and not derived from source-family semantic content.

Conceptual trusted inputs:

```text
FanoutFamilyBudgetProfileCatalogV1
FanoutAggregateHardCapsV1
FanoutExecutionTopologyBudgetContextV1?
```

The final optional topology context exists only when a later runtime implementation has selected a physical generation topology whose model-call accounting matters.

These objects are not source truth and do not enter family semantic validation as evidence.

## 6. Family budget profile catalog

MF-3 freezes a conceptual trusted catalog:

```text
FanoutFamilyBudgetProfileCatalogV1
  profiles[]
```

Each profile conceptually contains:

```text
FanoutFamilyBudgetProfileV1
  family
  semanticCharsUpperBound
  semanticItemsUpperBound
  validationReceiptEntriesUpperBound
  presentationNodesUpperBound
  modelInputBudgetUpperBound?
  modelOutputBudgetUpperBound?
  modelCallsContributionUpperBound?
```

Exact numeric values are deferred to runtime-readiness / implementation authority.

The profile must be:

```text
finite
non-negative
bounded
trusted
family-key exact
compatible with the family contract
```

Missing or malformed profile for an admitted multi-family lane is not guessed.

Result:

```text
REJECT_MISSING_OR_INVALID_FAMILY_BUDGET_PROFILE
```

## 7. Why budget profiles are not semantic family metadata

Budget fields describe execution envelopes, not source meaning.

Therefore:

```text
BOARD semantic draft
cannot raise BOARD budget

NEWS reportKind
cannot raise NEWS budget

LIVE_REACTION popularity
cannot raise LIVE_REACTION budget
```

Likewise a family cannot claim a smaller budget merely to pass admission and then exceed it later.

Canonical rule:

```text
SEMANTIC CONTENT
DOES NOT SELF-PRICE ITS EXECUTION AUTHORITY
```

## 8. Aggregate hard-cap contract

MF-3 freezes these independent aggregate cap dimensions:

```text
MAX_FAMILIES_PER_FANOUT
MAX_AGGREGATE_SEMANTIC_CHARS
MAX_AGGREGATE_SEMANTIC_ITEMS
MAX_AGGREGATE_VALIDATION_RECEIPT_ENTRIES
MAX_AGGREGATE_PRESENTATION_NODES
MAX_MODEL_CALLS_PER_FANOUT
MAX_MODEL_INPUT_BUDGET_PER_FANOUT
MAX_MODEL_OUTPUT_BUDGET_PER_FANOUT
```

The first seven named surfaces preserve / refine MF-0's design and add explicit aggregate semantic-item accounting because family schemas are item-bounded as well as char-bounded.

Exact numeric runtime values are intentionally not frozen here.

Before runtime activation, each required cap must receive a concrete finite implementation value and corresponding evidence.

## 9. Orthogonal cap rule

Every required dimension is independently enforced.

Conceptual predicate:

```text
fitsFamilies
AND fitsSemanticChars
AND fitsSemanticItems
AND fitsReceiptEntries
AND fitsPresentationNodes
AND fitsModelCalls
AND fitsModelInput
AND fitsModelOutput
→ budget admission may continue
```

Forbidden:

```text
unused presentation nodes
→ authorize extra model output

unused model calls
→ authorize extra semantic chars

small BOARD
→ permit NEWS above NEWS's own family bound
```

Canonical rule:

```text
CAP DIMENSIONS DO NOT TRADE AUTHORITY
```

## 10. Conservative reservation model

Budget admission occurs before actual family output sizes are known.

Therefore MF-3 uses trusted upper-bound reservation, not optimistic prediction.

Conceptual aggregate:

```text
AggregateReservationV1
  familyCount
  semanticCharsReserved
  semanticItemsReserved
  validationReceiptEntriesReserved
  presentationNodesReserved
  modelCallsReserved?
  modelInputBudgetReserved?
  modelOutputBudgetReserved?
```

Calculation:

```text
aggregate reservation
=
trusted orchestration overhead bounds
+
Σ trusted per-family upper bounds
```

The aggregation function must be deterministic, overflow-safe, finite, and history-free.

## 11. Forbidden budget predictors

MF-3 must not admit a plan based on:

```text
historical average fanout size
previous turn output size
old renderer-card count
model confidence
model promise to be concise
family popularity
user scrolling state
collapsed UI state
sibling semantic consensus
prior unused reservation
```

No source history scan is needed to compute current aggregate admission.

## 12. Budget-policy snapshot

The current execution uses one immutable trusted budget-policy snapshot.

Conceptually:

```text
CurrentFanoutBudgetPolicySnapshotV1
  familyProfileSet
  aggregateCaps
  applicableTopologyBudgetContext?
  lifetime = CURRENT_EXECUTION_ONLY
```

This snapshot is control-plane configuration frozen for the current execution decision.

It is not:

```text
persistent source identity
source provenance
cross-turn history
model context
semantic cache
```

No persistent snapshot ID is required by MF-3.

## 13. Plan / authority / budget binding

Budget admission requires:

```text
MF-1 admitted plan = current
MF-2 shared authority bundle = BUNDLE_READY
plan.sourceAuthorityRef == bundle.sourceAuthorityRef
all admitted families have trusted budget profiles
all relevant aggregate caps are finite and available
```

The budget layer cannot repair a bad authority binding.

Canonical order:

```text
STRUCTURAL PLAN READY
→ SHARED AUTHORITY READY
→ BUDGET GATE
→ EXPENSIVE FAMILY WORK
```

## 14. Pre-execution admission algorithm

MF-3 freezes the conceptual algorithm:

```text
B0. receive current orchestration state
B1. if DORMANT / UNSUPPORTED → NOT_APPLICABLE
B2. if ACTIVE_SINGLE → AGGREGATE_GATE_NOT_REQUIRED
B3. require immutable MF-1 ACTIVE_MULTI admitted plan
B4. require MF-2 BUNDLE_READY and exact plan/bundle binding
B5. validate current budget-policy snapshot shape
B6. lookup exactly one trusted budget profile per admitted family
B7. reject missing/invalid/duplicate budget profiles
B8. compute overflow-safe aggregate upper-bound reservation
B9. check family-count cap
B10. check semantic-char cap
B11. check semantic-item cap
B12. check validation-receipt cap
B13. check presentation-node cap
B14. if topology accounting is active, check model-call cap
B15. if topology accounting is active, check model-input cap
B16. if topology accounting is active, check model-output cap
B17. reject if any required dimension is unknown/unbounded
B18. freeze immutable current execution-budget plan
B19. only then permit expensive family execution
```

No family generation should begin before B18 in the first-safe design.

## 15. Atomic budget admission

MF-3 preserves the complete MF-1 family set.

Given:

```text
admitted = [LIVE_REACTION, BOARD, NEWS]
```

legal budget outcomes are:

```text
all three fit
→ ADMITTED_MULTI_EXECUTION
```

or:

```text
one or more aggregate dimensions do not fit
→ REJECTED_MULTI_EXECUTION
```

Illegal:

```text
NEWS causes cap exceedance
→ silently execute [LIVE_REACTION, BOARD]
```

Canonical rule:

```text
BUDGET REJECTION
DOES NOT REWRITE PRODUCT INTENT
```

If the user later requests a smaller family set, that is a new upstream planning transaction and must pass MF-1 again.

## 16. No implicit degradation profile

MF-3 does not freeze hidden quality tiers such as:

```text
FULL
MEDIUM
TINY
```

that automatically shrink family payloads to force admission.

Such a system could be designed later only if:

```text
each profile is trusted/static
family semantics remain safe
user/product policy authorizes profile selection
selection happens before semantic generation
no family is silently removed
```

Current first-safe behavior is fixed-profile admission or rejection.

## 17. Budget admission result

Conceptual result:

```text
FanoutExecutionBudgetAdmissionResultV1
  disposition
  reasonCode
  executionBudgetPlan?
  receipt
```

Where:

```text
disposition =
  NOT_APPLICABLE
  AGGREGATE_GATE_NOT_REQUIRED
  ADMITTED
  REJECTED
```

`executionBudgetPlan` exists only for `ADMITTED` ACTIVE_MULTI work.

## 18. Immutable execution-budget plan

Conceptual object:

```text
BudgetAdmittedCurrentFanoutExecutionV1
  sourceAuthorityRef
  canonicalFamilies[]
  perFamilyReservations[]
  aggregateReservation
  currentExecutionOnly = true
  noFamilySubstitution = true
```

The object is immutable for the current execution window.

A downstream lane cannot:

```text
raise its reservation
borrow another lane's semantic allowance
append a new family
change sourceAuthorityRef
change aggregate caps
rewrite another family reservation
```

## 19. Budget admission reason codes

MF-3 freezes conceptual reason vocabulary:

```text
NOT_APPLICABLE_DORMANT
NOT_APPLICABLE_UNSUPPORTED
AGGREGATE_GATE_NOT_REQUIRED_ACTIVE_SINGLE

REJECT_INVALID_PLAN_BINDING
REJECT_INVALID_AUTHORITY_BUNDLE
REJECT_MISSING_BUDGET_POLICY
REJECT_MISSING_FAMILY_BUDGET_PROFILE
REJECT_INVALID_FAMILY_BUDGET_PROFILE
REJECT_BUDGET_ARITHMETIC
REJECT_FAMILY_COUNT_CAP
REJECT_SEMANTIC_CHAR_CAP
REJECT_SEMANTIC_ITEM_CAP
REJECT_VALIDATION_RECEIPT_CAP
REJECT_PRESENTATION_NODE_CAP
REJECT_MODEL_CALL_CAP
REJECT_MODEL_INPUT_CAP
REJECT_MODEL_OUTPUT_CAP
REJECT_UNBOUNDED_REQUIRED_DIMENSION
REJECT_UNSUPPORTED_TOPOLOGY_BUDGET

ADMITTED_MULTI_EXECUTION
```

These are control-plane reasons, not semantic truth labels.

## 20. Execution-time family enforcement

Budget admission reserves upper bounds.

Each lane must remain within its own family reservation and its native family schema/caps.

If a lane exceeds a semantic/structural family bound:

```text
FAMILY_BOUND_EXCEEDED
→ affected family semantic result invalid / quarantined
→ no arbitrary semantic truncation
```

Other siblings may continue only if the shared control-plane integrity and aggregate hard-cap enforcement remain trustworthy.

## 21. Why semantic truncation is forbidden by default

Blind truncation can change meaning.

Examples:

```text
NEWS
"Officials denied that X..."
→ truncate suffix
→ misleading headline/body

BOARD
parent remains, qualifying reply disappears
→ distorted thread implication

LIVE_REACTION
qualified inference becomes stronger statement after clipping
```

Therefore:

```text
SEMANTIC BOUND EXCEEDANCE
!= PRESENTATION CLIPPING AUTHORITY
```

A family may define a future semantic-safe shortening transform only under its own explicit contract.

## 22. Presentation reservation vs presentation rendering

MF-3 may budget an upper bound for presentation nodes because MF-0 requires aggregate presentation cost control.

MF-3 does not build DOM.

Conceptual separation:

```text
MF-3
→ reserves/limits presentation complexity envelope

MF-4
→ designs actual SourcePresentationStack / mount/order isolation
```

A renderer cannot use extra DOM nodes to increase semantic authority or family payload size.

## 23. Model topology neutrality

MF-3 keeps semantic family identity independent of physical generation topology.

Possible future topologies:

```text
one bounded model call producing N family drafts
N bounded calls, one per family
another explicitly proven topology
```

The selected runtime topology must provide a trusted bounded model budget context before ACTIVE_MULTI activation.

Canonical rule:

```text
TOPOLOGY CHANGES ACCOUNTING
TOPOLOGY MUST NOT CHANGE FAMILY AUTHORITY / VALIDATION SEMANTICS
```

If a topology cannot fit the frozen aggregate model caps, the execution is rejected rather than silently changing the family set.

## 24. Failure scope model

MF-3 freezes four failure scopes:

```text
P = PLAN_WIDE_PRE_EXECUTION
L = FAMILY_LOCAL_SEMANTIC_POLICY
R = FAMILY_LOCAL_PRESENTATION
I = CONTROL_PLANE_INTEGRITY
```

These scopes describe blast radius, not truth confidence.

## 25. P · Plan-wide pre-execution failures

Examples:

```text
MF-1 plan invalid/unavailable
MF-2 shared authority invalid/unavailable
plan/bundle source ref mismatch
missing trusted budget policy
missing family budget profile
invalid/unbounded profile
family count exceeds cap
aggregate semantic char/item reservation exceeds cap
aggregate receipt/node reservation exceeds cap
model call/input/output reservation exceeds active topology cap
budget arithmetic overflow/non-finite result
```

Result:

```text
WHOLE ACTIVE_MULTI EXECUTION REJECTED
NO EXPENSIVE FAMILY WORK STARTS
```

These are not partial-success cases because no resource-authorized multi-family execution exists yet.

## 26. L · Family-local semantic/policy failures

When plan, authority, and aggregate budget remain sound, examples include:

```text
one family draft schema invalid
one family's own assertion-policy context invalid/missing
one family exceeds its own semantic bound
BOARD dependency closure quarantines entries
NEWS maturity = HOLD
NEWS story atomic validation quarantines a story
LIVE_REACTION yields no eligible assertions under its own policy
```

Result:

```text
AFFECTED FAMILY WITHHELD / QUARANTINED / VALID_EMPTY ONLY WHEN ITS OWN CONTRACT ALLOWS
OTHER SIBLINGS MAY CONTINUE
```

No sibling result becomes evidence for repairing the failed lane.

## 27. R · Family-local presentation failures

Examples:

```text
adapter exception
family mount failure
family presentation model invalid
source-scoped DOM/CSS contract failure
```

Result:

```text
AFFECTED PRESENTATION SURFACE FAILS CLOSED OR USES AN EXPLICITLY SAFE PRESENTATION FALLBACK
OTHER FAMILY SEMANTIC RESULTS REMAIN UNCHANGED
```

Presentation failure cannot rewrite semantic eligibility.

MF-4 owns the exact stack/presentation behavior.

## 28. I · Control-plane integrity failures

Examples:

```text
shared authority bundle mutates after admission
budget plan mutates after admission
lane writes sibling result slot
unadmitted family begins execution
sibling output is injected as authority
runtime accounting exceeds aggregate hard cap despite supposedly valid reservation
budget/accounting telemetry is internally contradictory or untrustworthy
source support is lost during/at use
```

These failures mean the orchestration envelope itself is no longer trustworthy.

First-safe result:

```text
ABORT FURTHER FANOUT WORK
INVALIDATE CURRENT FANOUT AGGREGATE
FAIL CLOSED
```

Already-generated sibling text is not preserved as an independently trusted fanout product merely because it looks plausible.

## 29. Shared support loss remains plan-wide

MF-3 preserves 3M-6 / MF-2 support-at-use.

Before ordinary use/presentation:

```text
current fanout sourceAuthorityRef
↕ exact compare
then-current trusted authority
```

Mismatch after reroll/source replacement:

```text
old budget plan invalid
old authority bundle invalid
old family results invalid
→ fresh planning / authority / budget / projection transaction
```

This is `I` / plan-wide current-fanout invalidation, not a family-local failure.

## 30. Failure matrix

| Condition | Scope | Expensive work begins? | Affected family | Siblings may continue? | Semantic authority effect |
| --- | --- | --- | --- | --- | --- |
| MF-1 structural rejection | P | no | all | no | no fanout execution |
| MF-2 shared-root invalid | P | no | all | no | no trusted current fanout |
| aggregate cap exceeded | P | no | all | no | no budget-authorized execution |
| family budget profile missing | P | no | all | no | no budget-authorized execution |
| one family draft invalid | L | yes | one | yes | lane only withheld |
| NEWS maturity HOLD | L | yes | NEWS | yes | NEWS withheld, siblings unchanged |
| BOARD dependency quarantine | L | yes | BOARD subtree/family result | yes | BOARD-local only |
| family semantic bound exceeded | L | yes | one | yes if accounting integrity intact | lane invalid; no silent truncation |
| adapter/mount failure | R | semantic work may have completed | one presentation | yes | semantic payload unchanged |
| lane writes sibling slot | I | possibly | all current fanout | no further fanout work | current aggregate untrusted |
| aggregate hard cap actually exceeded despite reservation | I | possibly | all current fanout | no further fanout work | budget control untrusted |
| source reroll/support mismatch | I | possibly | all | no | invalidate all old siblings |

## 31. Partial success as legal aggregate state

Once ACTIVE_MULTI budget admission succeeds, family semantic outcomes may diverge.

MF-3 freezes conceptual aggregate semantic outcomes:

```text
ALL_FAMILIES_ELIGIBLE
PARTIAL_FAMILY_ELIGIBILITY
NO_FAMILY_RENDERABLE
FANOUT_INVALIDATED
FANOUT_ABORTED_INTEGRITY_FAILURE
```

Examples:

```text
LIVE_REACTION = ELIGIBLE
BOARD         = ELIGIBLE
NEWS          = HOLD
→ PARTIAL_FAMILY_ELIGIBILITY
```

and:

```text
LIVE_REACTION = HOLD / empty-not-renderable
BOARD         = QUARANTINED
NEWS          = HOLD
→ NO_FAMILY_RENDERABLE
```

This is distinct from pre-execution `REJECTED`.

## 32. `NO_FAMILY_RENDERABLE` is not budget rejection

Canonical distinction:

```text
REJECTED
= system did not authorize expensive ACTIVE_MULTI execution

NO_FAMILY_RENDERABLE
= execution was authorized, but native family policies produced no renderable family result
```

Diagnostics and future UI must not conflate them.

## 33. Family outcome preservation

The aggregate result does not collapse family semantics into one mega-verdict.

Conceptual result:

```text
MultiFamilyExecutionAggregateV1
  sourceAuthorityRef
  budgetAdmissionDisposition
  familyOutcomes[]
  aggregateSemanticOutcome
```

Each family outcome retains its native family status / reason vocabulary.

Canonical rule:

```text
AGGREGATE OUTCOME
SUMMARIZES BLAST RADIUS / AVAILABILITY
IT DOES NOT REWRITE FAMILY SEMANTIC VERDICTS
```

## 34. No resource borrowing in first-safe design

If one family consumes less than its reserved maximum, unused capacity is not automatically transferred.

Forbidden first-safe behavior:

```text
NEWS HOLD early
→ give unused NEWS output allowance to BOARD

BOARD tiny
→ expand LIVE_REACTION beyond its family bound

one family presentation absent
→ add an unrequested family
```

Reason:

```text
reservation predictability
family-local cap integrity
no semantic scope drift
simpler runtime evidence
```

Dynamic borrowing may be reconsidered later as a performance optimization only if family semantics and hard caps remain invariant.

## 35. No family substitution

MF-3 cannot substitute:

```text
NEWS → SOCIAL_FEED
BOARD → LIVE_REACTION
```

because another family appears cheaper.

Family identity is MF-1 product intent, not an optimization variable.

## 36. Bounded budget receipt

Conceptual diagnostic receipt:

```text
FanoutExecutionBudgetReceiptV1
  disposition
  reasonCode
  admittedFamilyCount
  capDimensionsChecked[]
  aggregateReservedSummary
  perFamilyReservationSummary[]
```

After execution, a bounded orchestration receipt may additionally contain:

```text
perFamilyActualSummary[]
perFamilyOutcome[]
aggregateSemanticOutcome
integrityDisposition
```

Allowed summary values are counts/lengths/dispositions only.

Forbidden:

```text
raw source text
family semantic text
quarantined content
hidden model reasoning
full validation payloads
history copies
```

## 37. Receipt boundedness

Receipt size must itself be bounded.

The family count is already bounded, and receipt entries should be constant-count per admitted family plus fixed aggregate fields.

If implementation telemetry requires arbitrary-length event traces, those belong to a separate diagnostic/logging system and must not become the Source Intelligence receipt or model context.

## 38. Actual-vs-reserved evidence

Future runtime validation should record bounded numeric evidence such as:

```text
reserved semantic chars vs actual
reserved semantic items vs actual
reserved receipt entries vs actual
reserved presentation nodes vs actual
reserved model calls vs actual
reserved input/output budget vs actual
```

The proof target is:

```text
actual <= reserved <= hard cap
```

for every enforced dimension.

This instrumentation proves budget behavior only; it does not prove semantic correctness.

## 39. Runtime cap readiness

MF-3 design does not choose numeric caps.

Before runtime activation, implementation authority must freeze:

```text
exact finite hard-cap values
exact per-family budget profile values
selected physical model topology
model budget accounting units
presentation-node counting rule
semantic-char/item counting rule
receipt-entry counting rule
handling of provider/tokenizer variance
```

These values require implementation and target-host evidence.

Canonical rule:

```text
MF-3 DESIGN PASS
!=
RUNTIME CAP PROOF
```

## 40. DORMANT baseline

MF-3 inherits the 3M-9 zero-semantic-burden requirement.

When no current source job exists:

```text
MF-1 = DORMANT
MF-3 = NOT_APPLICABLE_DORMANT
```

No:

```text
family budget catalog scan across all families
aggregate reservation
model budget reservation
history scan
presentation reservation
background retry
network work
```

is triggered.

Only the bounded current control branch needed to determine non-applicability is allowed.

## 41. ACTIVE_SINGLE compatibility

`ACTIVE_SINGLE` remains protected from accidental Multi-Family budget regression.

First design:

```text
ACTIVE_SINGLE
→ existing standalone family bounds / validator caps
→ MF-3 aggregate gate not required
```

A future implementation may unify accounting internally only if tests prove:

```text
same family semantic result
same authority path
same validation rules
no stricter product rejection
no extra source history / model call / persistence
```

## 42. Presentation handoff to MF-4

MF-3 hands MF-4:

```text
one budget-admitted current ACTIVE_MULTI execution
N independent family semantic outcomes
per-family presentation complexity reservations
aggregate presentation-node cap
bounded outcome diagnostics
```

MF-4 must design:

```text
SourcePresentationStackV1
canonical display ordering
mount-slot isolation
family-local presentation failure handling
collapse/expand state boundaries
aggregate presentation-node enforcement
responsive layout without semantic mutation
```

MF-4 must not:

```text
change MF-1 family admission
change MF-3 semantic/model budget
turn display order into truth rank
use presentation failure to modify sibling semantic outcomes
borrow hidden family budget to create new semantic content
```

## 43. Candidate C status

Current MF-3 scope remains:

```text
current execution only
no persistent reservation
no source history
no stable derived identity
no cross-family propagation
no future context re-entry
no partial descendant survival
```

Therefore all Candidate C triggers remain false.

```text
CANDIDATE_C = NOT ACTIVATED
```

## 44. Design acceptance matrix

Future implementation/evaluation should prove at least:

```text
B0  DORMANT performs no aggregate budget work beyond bounded non-applicability check
B1  ACTIVE_SINGLE preserves standalone behavior
B2  ACTIVE_MULTI requires complete trusted per-family budget profiles
B3  admitted family set cannot be silently reduced for budget
B4  every aggregate dimension is independently capped
B5  reservation arithmetic is deterministic / finite / overflow-safe
B6  over-budget plan is rejected before model/expensive family work
B7  one family semantic failure does not consume sibling authority
B8  one family bound exceedance does not trigger semantic truncation
B9  family-local failure leaves siblings eligible when control-plane integrity is sound
B10 presentation failure does not rewrite semantic outcome
B11 shared support loss invalidates the whole current fanout
B12 integrity/accounting failure fails current fanout closed
B13 unused reservation does not expand sibling semantic scope
B14 partial success is represented distinctly from rejection
B15 no-family-renderable is represented distinctly from rejection
B16 actual <= reserved <= hard cap evidence exists for every active runtime dimension
B17 one-call and per-family-call topologies preserve identical semantic admission if both are ever supported
B18 receipts remain bounded and contain no hidden/quarantined semantic text
```

No runtime evidence is claimed here.

## 45. Explicitly deferred

MF-3 does not authorize:

```text
dynamic quality tiers
resource borrowing
automatic family dropping
automatic family substitution
retry loops
background fanout
deadline-based speculative execution
cross-family propagation
persistent fanout queues
persistent budget ledger
source history
context re-entry
network/media execution
concrete runtime cap values
```

## 46. Design-only deltas

```text
runtime code delta                 = 0
release-simcore delta              = 0
persistent storage delta           = 0
prompt/output transport delta      = 0
model-call count delta             = 0
network-call delta                 = 0
DOM/CSS delta                      = 0
history scan delta                 = 0
context re-entry delta             = 0
```

## 47. Frozen result

```text
MF_CHECKPOINT = MF-3
STRUCTURAL_ADMISSION_OWNER = MF-1
SHARED_AUTHORITY_OWNER = MF-2 / existing trusted owners
ACTIVE_MULTI_EXECUTION_BUDGET_OWNER = MF-3 CONTROL PLANE
ACTIVE_SINGLE_AGGREGATE_GATE = NOT REQUIRED IN FIRST DESIGN
BUDGET_PROFILE_AUTHORITY = TRUSTED STATIC CONTROL-PLANE CONFIG
BUDGET_RESERVATION = CONSERVATIVE UPPER BOUND
BUDGET_ADMISSION = ATOMIC
PRE_EXPENSIVE_WORK_REJECTION = REQUIRED
SILENT_FAMILY_DROP = FORBIDDEN
IMPLICIT_DEGRADATION = FORBIDDEN
RESOURCE_BORROWING = FORBIDDEN IN FIRST-SAFE DESIGN
CAP_DIMENSIONS = INDEPENDENT
SEMANTIC_BOUND_EXCEEDANCE = FAMILY-LOCAL INVALID / NO BLIND TRUNCATION
PLAN_PRE_EXECUTION_FAILURE = PLAN-WIDE
FAMILY_SEMANTIC_FAILURE = FAMILY-LOCAL
FAMILY_PRESENTATION_FAILURE = FAMILY-LOCAL
CONTROL_PLANE_INTEGRITY_FAILURE = CURRENT FANOUT FAIL CLOSED
PARTIAL_SUCCESS = LEGAL
NO_FAMILY_RENDERABLE != BUDGET_REJECTED
DORMANT_ZERO_SEMANTIC_BURDEN = PRESERVED
CANDIDATE_C = NOT ACTIVATED
RUNTIME_NUMERIC_CAPS = NOT FROZEN / REQUIRE LATER IMPLEMENTATION EVIDENCE
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

Next checkpoint:

```text
MF-4 · Presentation Stack + Ordering / Mount Isolation
```
