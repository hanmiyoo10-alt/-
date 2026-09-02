# SimCore Post-3.0M MF-3 Admission / Aggregate Budget + Failure Matrix Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · TWO-STAGE ADMISSION · PRE-EXPENSIVE-WORK BUDGET GATE · FAILURE-BLAST-RADIUS MATRIX · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-3 · IMPACT SCOPE**

## 0. Purpose

MF-0 froze same-current-authority sibling fanout and required aggregate fanout budgeting.
MF-1 froze structural fanout-plan admission and an immutable admitted family set.
MF-2 froze one current shared authority bundle plus isolated family lanes.

MF-3 asks:

```text
After a fanout plan is structurally legal and bound to one current authority,
may the system spend bounded generation / validation / presentation resources
on the entire admitted family set now,
and how should failures be contained once execution begins?
```

This checkpoint is design-only.

It does not implement runtime caps, model calls, token accounting, scheduler logic, validators, renderer mounting, DOM/CSS, persistence, history, context re-entry, network/media, long-chat execution, release publication, or `release-simcore` mutation.

## 1. Authority chain reviewed

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

## 2. Impact finding A — MF-1 admission and MF-3 budget admission are different gates

MF-1's admitted plan means:

```text
family identities are known
all entries are fanout-eligible
scope is structurally supported
one current authority root is selected
family set is immutable for this projection
```

It does not prove that current aggregate resource limits permit expensive execution.

MF-0 already required family-count and aggregate-budget checks before expensive work.

The clean reconciliation is two-stage admission:

```text
CurrentSourceFanoutIntentV1
        ↓
MF-1 structural admission
        ↓
AdmittedCurrentSourceFanoutPlanV1
        ↓
MF-2 current authority binding / minimal views
        ↓
MF-3 execution-budget admission
        ↓
BudgetAdmittedCurrentFanoutExecutionV1
        ↓
expensive semantic / validation / presentation work
```

Canonical impact rule:

```text
STRUCTURALLY ADMITTED
!= RESOURCE-ADMITTED FOR EXECUTION
```

MF-3 must not reinterpret or mutate MF-1's family set.

## 3. Impact finding B — budget rejection must be atomic and pre-expensive-work

If the exact admitted family set cannot fit the current frozen fanout limits, MF-3 must reject the execution package before expensive lane generation starts.

Forbidden behavior:

```text
requested/admitted = [LIVE_REACTION, BOARD, NEWS]
budget insufficient
→ silently drop NEWS
→ run [LIVE_REACTION, BOARD]
```

Also forbidden:

```text
budget insufficient
→ ask the main model to produce shorter content and hope it fits
```

unless a later trusted policy explicitly defines a bounded degraded profile before admission.

First-safe MF-3 rule:

```text
EXACT ADMITTED FAMILY SET FITS
→ EXECUTION_BUDGET_ADMITTED

EXACT ADMITTED FAMILY SET DOES NOT FIT
→ WHOLE EXECUTION REJECTED BEFORE EXPENSIVE WORK
```

MF-1 atomic plan admission remains intact.

## 4. Impact finding C — budget authority must be trusted control-plane configuration

The main model cannot estimate or declare its own allowed cost.

Budget profiles / caps must come from trusted control-plane configuration associated with fanout-eligible family contracts.

A future conceptual profile may include bounded maxima such as:

```text
family
maxSemanticChars
maxSemanticItems
maxValidationReceiptEntries
maxPresentationNodes
maxModelInputBudget
maxModelOutputBudget
maxModelCallsContribution
```

Exact runtime numbers are not frozen in MF-3 design unless separately authorized by runtime-readiness work.

Canonical rule:

```text
MODEL MAY PRODUCE WITHIN A BUDGET
MODEL DOES NOT AUTHORIZE THE BUDGET
```

## 5. Impact finding D — aggregate admission uses upper bounds, not optimistic averages

Pre-expensive-work admission must be safe before actual output sizes are known.

Therefore the gate should reason from trusted conservative envelopes:

```text
aggregateReservedBudget
= orchestrationOverheadBound
+ Σ admitted family profile bounds
```

not:

```text
historical average response length
model's promise to be concise
prior fanout observed cost
UI collapse state
```

The admission decision must not require scanning source history or previous fanout runs.

## 6. Impact finding E — budget dimensions remain orthogonal

MF-0 named multiple future hard-cap surfaces:

```text
MAX_FAMILIES_PER_FANOUT
MAX_AGGREGATE_SEMANTIC_CHARS
MAX_AGGREGATE_VALIDATION_RECEIPT_ENTRIES
MAX_AGGREGATE_PRESENTATION_NODES
MAX_MODEL_CALLS_PER_FANOUT
MAX_MODEL_INPUT_BUDGET_PER_FANOUT
MAX_MODEL_OUTPUT_BUDGET_PER_FANOUT
```

MF-3 should treat these as independent gates.

A plan is budget-admitted only if every required dimension fits.

Canonical rule:

```text
ONE DIMENSION FITTING
DOES NOT COMPENSATE FOR ANOTHER DIMENSION EXCEEDING ITS CAP
```

For example, unused presentation-node budget cannot authorize extra model-output budget.

## 7. Impact finding F — exact runtime numeric caps remain a runtime-readiness responsibility

MF-3 can freeze:

```text
which dimensions exist
who owns them
how they aggregate
when admission occurs
what happens on exceedance
how runtime observations prove them
```

without claiming safe numeric values before an implementation topology exists.

This preserves MF-0 / 3M-10:

```text
DESIGN BUDGET CONTRACT
!= PROVEN RUNTIME CAP VALUES
```

A later implementation transaction must freeze concrete values before activation.

## 8. Impact finding G — physical model topology must not alter semantic admission

MF-2 permits one physical model call for multiple drafts or one call per family.

Therefore model-call budgeting must use an explicitly selected implementation topology later, while semantic family admission remains invariant.

Conceptually:

```text
semantic plan = [LIVE_REACTION, BOARD, NEWS]
```

must mean the same family authority / validation semantics under either topology.

A topology that cannot fit the hard caps must not silently change the family set.

## 9. Impact finding H — failure blast radius needs four distinct scopes

The master design already distinguishes plan-wide semantic authority failure, family-local semantic failure, and family-local presentation failure.

MF-3 adds budget/runtime-control failure and should freeze four operational scopes:

### P · Plan-wide pre-execution failure

Examples:

```text
invalid MF-1 plan binding
invalid MF-2 shared authority bundle
missing trusted budget profile for an admitted family
aggregate family-count cap exceeded
aggregate reserved semantic/output/presentation budget exceeded
budget arithmetic invalid / unbounded
unsupported execution topology for the declared cap contract
```

Result:

```text
NO EXPENSIVE FAMILY EXECUTION
WHOLE EXECUTION PACKAGE REJECTED
```

### L · Family-local semantic/policy failure

Examples:

```text
one family draft invalid
one family policy context missing
NEWS maturity HOLD
BOARD dependency quarantine
family semantic payload exceeds its own enforced bound
```

Result:

```text
AFFECTED LANE WITHHELD / QUARANTINED
OTHER RESERVED SIBLINGS MAY CONTINUE
```

### R · Family-local presentation failure

Examples:

```text
one adapter fails
one mount fails
one renderer violates its presentation contract
```

Result:

```text
AFFECTED PRESENTATION FAILS CLOSED
OTHER SIBLING SEMANTICS / PRESENTATIONS REMAIN INDEPENDENT
```

### I · Control-plane integrity failure after execution starts

Examples:

```text
shared authority mutated
lane writes sibling result slot
runtime exceeds aggregate hard cap despite valid reservation
unadmitted family begins execution
budget enforcement metadata cannot be trusted
```

These indicate orchestration integrity loss rather than ordinary family policy difference.

First-safe handling should fail closed for further fanout work and mark the current fanout invalid/aborted according to the exact later implementation contract.

## 10. Impact finding I — family-local cap violation must not become silent truncation

If a lane exceeds a semantic or structural bound, MF-3 should not permit arbitrary suffix truncation that might change meaning.

Examples:

```text
NEWS headline/body cut mid-claim
BOARD replies cut while retaining misleading parent context
LIVE_REACTION assertion text truncated into a stronger statement
```

First-safe rule:

```text
BOUND VIOLATION
→ FAMILY-LOCAL INVALID / QUARANTINED
```

unless that family already owns an explicit semantic-safe truncation rule.

Presentation-only clipping/collapse is separate and cannot alter validated semantics.

## 11. Impact finding J — aggregate partial success needs a first-class result state

Once the execution budget was admitted atomically, family outcomes may legitimately diverge.

Examples:

```text
LIVE_REACTION = VALID
BOARD         = VALID_WITH_QUARANTINE
NEWS          = HOLD
```

This should become a legal aggregate result such as:

```text
PARTIAL_SUCCESS
```

not an orchestration failure.

The aggregate result must preserve every family outcome separately rather than merging them into one semantic verdict.

## 12. Impact finding K — zero renderable families is distinct from pre-execution rejection

A fully budget-admitted run may end with no renderable family because all lanes independently HOLD / quarantine / produce no eligible payload under their own contracts.

That is semantically different from:

```text
budget gate rejected before execution
```

MF-3 should preserve this distinction in diagnostics and result state.

## 13. Impact finding L — orchestration receipts must be bounded and non-semantic

A bounded receipt may include:

```text
budgetAdmissionDisposition
budgetReasonCode
admittedFamilyCount
reservedAggregateBudget summary
perFamilyBudgetDisposition[]
perFamilyOutcome[]
aggregateOutcome
```

It must not include:

```text
raw source body
quarantined claim content
full family semantic payloads
model hidden reasoning
history copies
```

The receipt does not enter future model context by default.

## 14. Impact finding M — unused sibling budget is not semantic authority and should not trigger family substitution

If NEWS ends in HOLD after execution, its unused presentation capacity does not authorize:

```text
more BOARD posts
another unrequested family
larger LIVE_REACTION payload
```

First-safe design uses fixed bounded family reservations for the admitted set.

Dynamic resource borrowing may be considered later only if it cannot alter semantic scope or family identity and is separately proven.

## 15. Impact finding N — DORMANT remains zero source-semantic burden

MF-3 must not create a global per-turn budgeting scan.

If MF-1 is DORMANT:

```text
MF-3 = NOT_APPLICABLE
```

No family budget catalog scan, model-budget reservation, presentation-node reservation, history scan, or background task should run beyond the bounded branch determining that no source execution exists.

## 16. Candidate C status

MF-3 remains:

```text
CURRENT_PROJECTION_ONLY
NO PERSISTENCE
NO HISTORY
NO DERIVED-TO-DERIVED PROPAGATION
NO CONTEXT RE-ENTRY
NO PARTIAL DESCENDANT SURVIVAL
```

Budget receipts and reservations are not persistent source identities.

Therefore:

```text
CANDIDATE_C = NOT ACTIVATED
```

## 17. Selected MF-3 design seam

Freeze MF-3 around:

```text
MF1_STRUCTURAL_PLAN
+
MF2_CURRENT_AUTHORITY_BINDING
        ↓
TRUSTED_STATIC_FAMILY_BUDGET_PROFILES
+
TRUSTED_AGGREGATE_HARD_CAPS
        ↓
ATOMIC_PRE_EXECUTION_BUDGET_ADMISSION
        ↓
BUDGET_ADMITTED_CURRENT_FANOUT_EXECUTION
        ↓
ISOLATED FAMILY EXECUTION
        ↓
BLAST_RADIUS_AWARE_FAILURE_AGGREGATION
```

Canonical invariants:

```text
MF-1 family set remains immutable
budget admission is atomic
budget gate precedes expensive lane work
no silent family dropping/substitution
aggregate dimensions are independently capped
family-local failures stay local when control-plane integrity remains sound
shared-root/control-plane integrity failures remain plan-wide
presentation failure does not change semantic authority
receipts are bounded and non-semantic
DORMANT remains zero source-semantic burden
```

## 18. Design-only target deltas

MF-3 design must leave:

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

## 19. Next design output

The MF-3 design document should freeze:

```text
1. two-stage admission terminology
2. trusted budget profile ownership
3. aggregate cap dimensions
4. conservative reservation arithmetic
5. pre-execution admission algorithm
6. execution budget result / receipt shape
7. complete failure matrix and blast radius
8. family-local bound enforcement
9. partial-success aggregate states
10. topology-neutral requirements
11. support-at-use interaction
12. MF-4 presentation-stack handoff
```

No runtime implementation authority is implied.
