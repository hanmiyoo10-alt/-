# SimCore Post-3.0M IM-6 Integration / Failure Isolation / Performance / Real-Validation Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **IM-6 READ-ONLY IMPACT SCOPE · CURRENT-INTENT OWNER-LOCAL ORCHESTRATION SEAM SELECTED · DESIGN-ONLY · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · INTERACTION / MATERIALIZATION · IM-6 · READ-ONLY IMPACT SCOPE**

## 0. Purpose

IM-6 is the convergence checkpoint for the Interaction / Materialization workstream.

This impact scope selects the narrow integration seam to be designed next. It does not implement any interaction or materialization runtime.

The seam must integrate:

```text
IM-1  interaction intent + stale-event safety
IM-2  durable BOARD_POST targeting
IM-3  interactive BOARD append semantics
IM-4  interactive SOCIAL_FEED create / relation semantics
IM-5  delayed optional materialization / C8 operation ownership
```

without creating one global mutable interaction engine.

## 1. Authority chain

This impact scope consumes without reopening:

```text
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_IM1_SOURCE_INTERACTION_INTENT_STALE_EVENT_SAFETY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM2_BOARD_APPEND_REPLY_MINIMUM_DURABLE_TARGET_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM3_INTERACTIVE_BOARD_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM4_INTERACTIVE_SOCIAL_FEED_MUTATION_SEMANTICS_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_INTERACTION_IM5_EXTERNAL_MATERIALIZATION_ASYNC_OPERATION_OWNERSHIP_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC9_INTEGRATION_COST_DORMANCY_DESIGN_2026-09-02.md
docs/SIMCORE_POST_3M_CANDIDATE_C_CC10_CONVERGENCE_RUNTIME_VALIDATION_PROTOCOL_2026-09-02.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/REPOSITORY_COMMON_RULES.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Current concrete consumers

The workstream currently has three concrete effect owners.

```text
BOARD mutation
→ per-parent BOARD_POST_REPLY_APPEND_LANE

SOCIAL_FEED mutation
→ one INTERACTIVE_SOCIAL_FEED_CREATE_LANE

optional external materialization
→ one owner-defined attachment slot + current MaterializationOperationToken
```

These lanes have different concurrency semantics and must not be flattened into one global lock or one global revision counter.

## 3. Candidate seams considered

### A. One global `INTERACTION_ENGINE`

Rejected.

Problems:

```text
unrelated BOARD/SOCIAL/media actions contend globally
one failure can accidentally trigger broad rollback
lane-specific currentness semantics are obscured
ordinary-chat dormancy becomes harder to prove
```

### B. Family-local runtime engines with no shared control seam

Rejected as the convergence contract.

Problems:

```text
stale intent rejection becomes duplicated
failure-class boundaries drift
ordinary-turn dormancy cannot be proven once in one place
real-validation evidence becomes inconsistent across families
```

### C. Current-intent owner-local effect orchestration

Selected.

Conceptually:

```text
CURRENT AUTHORIZED INTENT / EFFECT REQUEST
        ↓
bounded plane + family/action classification
        ↓
owner-local lane dispatch
        ├─ BOARD_APPEND lane
        ├─ SOCIAL_CREATE lane
        └─ MATERIALIZATION_SLOT lane
        ↓
owner-specific currentness / validation / commit
        ↓
owner-specific presentation reconciliation
```

This shares only control-plane rules. It does not share semantic mutation state.

## 4. Selected impact seam

Canonical seam name:

```text
CURRENT_INTENT_OWNER_LOCAL_EFFECT_ORCHESTRATION
```

Frozen purpose:

```text
one current authorized intent
→ activate only the minimum owner lane required
→ perform no historical discovery to decide activation
→ preserve owner-local concurrency/currentness rules
→ isolate failures by semantic/effect layer
```

## 5. Dormancy requirement

When no current authorized interaction or materialization request exists:

```text
interaction/materialization semantic work = 0
```

Specifically:

```text
old durable target lookup        = 0
old interactive overlay scan     = 0
mutation lane work               = 0
attachment slot lookup           = 0
provider/network/model work      = 0
background enrichment            = 0
background retry                 = 0
source-derived context re-entry  = 0
```

A bounded local control/event gate may exist.

Historical source cards or durable objects do not activate work.

## 6. Failure classes that IM-6 must keep separate

IM-6 must freeze at least these failure classes.

```text
F0 VIEW / PRESENTATION FAILURE
F1 INTENT / STALE-EVENT REJECTION
F2 DURABLE TARGET / SUPPORT FAILURE
F3 SEMANTIC MUTATION VALIDATION OR COMMIT FAILURE
F4 MATERIALIZATION PROVIDER / RESULT FAILURE
F5 MATERIALIZATION CURRENTNESS FAILURE
F6 HOST MOUNT / PRESENTATION RECONCILIATION FAILURE
```

No class may borrow authority from another.

Examples:

```text
provider success != attachment authority
presentation failure != semantic rollback authority
stale UI event != retarget authority
found durable ID != supported-for-use
```

## 7. Semantic commit and presentation failure

The final design must explicitly preserve:

```text
SEMANTIC COMMIT SUCCEEDED
+
PRESENTATION UPDATE FAILED
→ semantic commit remains committed
```

unless a fresh explicitly authorized semantic revert operation exists.

A DOM/render/mount failure must never silently roll back a current semantic mutation.

## 8. Materialization independence

The final design must preserve:

```text
SOURCE MUTATION
!=
AUTOMATIC MEDIA REQUEST
```

Creating a SOCIAL_ITEM or BOARD_REPLY does not automatically start external materialization.

Materialization starts only from a current authorized materialization request.

Likewise:

```text
MEDIA ATTACHMENT
!=
SOURCE SEMANTIC REVISION
```

for the selected optional decorative materialization class.

## 9. No global lock

The final design must preserve lane-local concurrency:

```text
BOARD replies
→ serialize only final append to one parent

SOCIAL item creates
→ serialize only final create ordering in one interactive feed

materialization
→ supersede only within one owner-defined target/slot lane
```

Unrelated target operations should not block each other merely because they belong to Interaction / Materialization.

## 10. Current-runtime lifetime boundary

Current concrete interactive durable objects and optional materialization remain bounded to the current runtime / conversation-owned interactive lifetime.

The final design must not silently introduce:

```text
reload persistence
cross-conversation restoration
background store migration
media database
semantic archive
automatic context re-entry
```

Runtime teardown must revoke ephemeral presentation controls and delayed-effect apply authority.

## 11. Hard-cap requirement before runtime readiness

IM-6 may freeze design boundedness without numeric values, but future runtime readiness must be blocked until concrete caps exist for at least:

```text
user payload chars
retained interactive BOARD objects
retained interactive SOCIAL_ITEM objects
interactive overlay items
concurrent / in-flight materialization operations
materialization input chars
provider output bytes / dimensions
bounded receipts / diagnostics
```

No implementation may claim performance readiness with unbounded owner collections.

## 12. Diagnostics boundary

Future instrumentation may record bounded metadata such as:

```text
intent accepted/rejected counts by reason code
stale-event drop counts
mutation commit/failure counts
exact durable lookups
provider operations launched/superseded/completed/dropped
presentation reconciliation failures
current active lane counts
```

It must not require storing:

```text
user reply/post text
hidden source text
raw materialization prompt
provider secrets
quarantined semantics
```

## 13. Real-validation families

The final IM-6 protocol must include deterministic and host/long-chat scenarios covering:

```text
ordinary-chat dormancy after heavy source use
BOARD reply concurrency and parent revision races
SOCIAL create / target-revision races
internal retry versus two distinct user actions
late media success after supersession
late media failure after newer success
media result after target revision/support/retirement change
semantic commit followed by presentation failure
provider failure with text-only semantic survival
runtime replacement / reload while async result is in flight
mixed BOARD + SOCIAL + media interleaving
no automatic model/context/network work when not explicitly requested
```

## 14. Known runtime blockers remain external to design convergence

IM-6 must not pretend these are solved:

```text
exact production host presentation mount identity
then-current source sidecar/transport/runtime producer authority
actual durable-object runtime allocator/store
actual interaction event plumbing
actual external provider policy/client
concrete runtime caps
instrumentation / evidence collection
```

LRE-1's display identity gap remains a runtime-enabling blocker.

## 15. Evidence tiers

IM-6 should reuse the established separation:

```text
D0 · DESIGN BOUNDEDNESS
I1 · IMPLEMENTATION CONFORMANCE
H2 · HOST / LONG-CHAT EVIDENCE
```

Current checkpoint can only produce D0 design evidence.

It must not claim I1 or H2.

## 16. Expected IM-6 convergence outcome

If the detailed design confirms this impact scope, the Interaction / Materialization design program may say:

```text
IM-0..IM-6 DESIGN PROGRAM = CONVERGED
```

while still saying:

```text
INTERACTION / MATERIALIZATION RUNTIME IMPLEMENTED = NO
RUNTIME READY = NO
DEPLOYED = NO
REAL HOST PASS = NOT RUN
```

## 17. Impact verdict

```text
SELECTED SEAM
= CURRENT_INTENT_OWNER_LOCAL_EFFECT_ORCHESTRATION

GLOBAL INTERACTION MUTATION ENGINE
= REJECTED

GLOBAL OPERATION LOCK
= REJECTED

AUTOMATIC MEDIA AFTER SOURCE MUTATION
= REJECTED

ORDINARY CHAT HISTORICAL DURABLE SCAN
= REJECTED

PRESENTATION FAILURE ROLLS BACK SEMANTICS
= REJECTED

D0 DESIGN CONVERGENCE
= DESIGNABLE

RUNTIME AUTHORITY
= NOT GRANTED
```
