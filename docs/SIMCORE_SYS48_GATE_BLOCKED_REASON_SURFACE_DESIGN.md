# SYS-48 — Gate-Blocked Reason Surface — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-48
Idea          = Gate-Blocked Reason Surface
Size          = SMALL
Importance    = 5 / VERY HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Current gate/selection authorities used to validate the design:
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`

Related frozen system designs:
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS10_STALE_NEXT_ACTION_SCANNER_DESIGN.md`

Future but deliberately non-overlapping candidate:
- SYS-03 Gate Dependency Graph

---

## 1. Problem

SimCore correctly keeps many ideas and work items gated until a real dependency is satisfied. Examples include:

```text
POST_M2_3
POST_M2_4
EVIDENCE
EXTERNAL
dependency: R2.1 genuine release proof
M2 implementation slice
FUTURE / POST_M2
```

Those gate tokens are precise for repository planning, but a later operator/session can still need to reconstruct three practical facts:

```text
Why can I not do this now?
What exact event would make this worth reviewing again?
What should I avoid doing before that event?
```

When those answers are not visible at the point where a gated item is listed, two opposite errors become likely:

```text
PREMATURE PULL-FORWARD
→ high importance score is mistaken for authorization
→ gated work is started before its dependency exists

PERMANENT FORGETTING
→ a legitimate dependency later closes
→ the old gated item is never reconsidered
```

SYS-48 defines a compact explanatory surface for each currently gated item.

It is a projection of already-authoritative gate facts. It does not calculate dependencies, open gates, or choose work priority.

---

## 2. Core invariant

```text
authoritative gated item
→ one current blocking reason
→ one authoritative unlock/review event when known
→ one premature-action guard

SYS-48
!= gate engine
!= dependency graph
!= priority calculator
!= scheduler
!= automatic unlocker
```

The surface answers:

> Why is this item not selectable now, and what explicit event should cause the gate to be reviewed again?

It does not answer:

> Has that event actually happened?

That latter determination remains with the owning checkpoint/evidence/release/external authority and the normal RT-02 / RT-11 close-step process.

---

## 3. Distinction from SYS-03 Gate Dependency Graph

This boundary is constitutional.

```text
SYS-48
= item-centric human explanation
= consumes one already-declared gate relationship
= bounded projection

SYS-03
= dependency-centric model
= represents gate → dependent-item relationships across the system
= may later support systematic unlock propagation/navigation
```

SYS-48 must not infer transitive dependencies.

Example:

```text
M-08 gate = POST_M2_3

SYS-48 may say:
"Blocked because physical M2-3 has not closed. Re-review after the M2-3 checkpoint is authoritatively closed."

SYS-48 may NOT derive:
M2-3 → M-08 → X → Y
```

If the source only says `DEPENDENCY` without naming a sufficient event, SYS-48 reports the unlock event as unresolved rather than inventing a graph edge.

---

## 4. v1 artifact form

The useful v1 application is document-only.

Preferred forms, in order:

```text
1. compact `Blocked reason / Unlock event` columns or blocks inside the living idea/queue authority that already lists the gated item
2. a compact shared living surface such as:
   docs/SIMCORE_GATE_BLOCKED_REASON_SURFACE.md
   only when several active queue authorities need one navigation view
```

Do not create one file per gated item.
Do not create a generator, parser, CI rule, workflow, daemon, or repository writer for v1.

The surface is living/current-state memory and must be synchronized through the existing real-time close-step routine when a gate state changes.

---

## 5. Entry schema

Each gated-item entry contains exactly these fields:

```text
Item ID
Item label
Current gate state
Blocking reason kind
Blocking reason
Gate authority
Unlock / re-review event
Unlock event authority
Premature-action guard
Surface state
```

### 5.1 Item ID / label

Use the existing canonical item ID and short label.

Examples:

```text
M-08 Snapshot Schema Inventory Generator
S-05 Reconcile Differential Receipt
M-14 Release Evidence Packet
SYS-26 Coverage Promotion Readiness Scanner
```

SYS-48 creates no new work-item IDs.

### 5.2 Current gate state

Copy the smallest authoritative gate token without reinterpretation.

Examples:

```text
POST_M2_3
POST_M2_4
EVIDENCE
EXTERNAL
DEPENDENCY: R2.1_GENUINE_RELEASE_PROOF
M2_IMPLEMENTATION_SLICE
FUTURE
```

Do not normalize materially different gates merely for display convenience.

### 5.3 Blocking reason kind

Allowed v1 explanatory kinds:

```text
CHECKPOINT
EVIDENCE
EXTERNAL
RELEASE_PROOF
IMPLEMENTATION_SLICE
FUTURE_POLICY
EXPLICIT_DEPENDENCY
UNRESOLVED
```

This vocabulary is descriptive only. It is not a replacement gate taxonomy and does not change the canonical gate token.

### 5.4 Blocking reason

One sentence maximum.

Requirements:
- describe the currently unsatisfied fact;
- use only facts supported by the gate authority;
- do not include speculative implementation details;
- do not explain the entire history of the idea.

Example:

```text
M-08
Blocking reason:
"Physical M2-3 has not yet closed, so post-M2-3 snapshot-schema work is not selectable."
```

### 5.5 Gate authority

One path or explicit authority family that establishes the gate.

Examples:
- current NR/R queue authority;
- current system-idea inventory;
- checkpoint close authority;
- R2.1 genuine-release proof authority;
- evidence requirement authority.

Do not point to an old design merely because it contains a similar phrase when a living gate authority exists.

### 5.6 Unlock / re-review event

One bounded event that should cause the item to be re-evaluated.

Important wording:

```text
unlock / re-review event
!= automatic unlock
```

Examples:

```text
POST_M2_3
→ "Authoritative physical M2-3 checkpoint closure is recorded."

RELEASE_PROOF
→ "R2.1 genuine runtime release end-to-end proof is recorded."

EVIDENCE
→ "The explicitly required evidence condition named by the item authority becomes satisfied."

EXTERNAL
→ "The required external authoritative receipt becomes available."
```

If the source does not identify a sufficient event without inference:

```text
Unlock / re-review event = UNRESOLVED
Surface state = GATE_REASON_UNRESOLVED
```

Do not guess.

### 5.7 Unlock event authority

The source that can establish that the review event occurred.

This may be the same as the gate authority or a different checkpoint/evidence/release authority.

SYS-48 itself is never the unlock-event authority.

### 5.8 Premature-action guard

One short prohibition that prevents the common wrong action before the gate opens.

Examples:

```text
"Do not start physical implementation before M2-3 closure."
"Do not claim release proof from qualification CI alone."
"Do not manufacture external/provider evidence locally."
"Do not pull FUTURE work forward because the current queue is empty."
```

This field must derive from existing project policy; it cannot invent a new prohibition solely for SYS-48.

---

## 6. Surface-state vocabulary

Exactly four v1 surface states:

```text
GATE_REASON_READY
GATE_REASON_UNRESOLVED
GATE_REASON_STALE
NOT_CURRENTLY_GATED
```

### `GATE_REASON_READY`

Current gate, reason, authority, and re-review event are supportable without guessing.

### `GATE_REASON_UNRESOLVED`

The item is known to be gated, but a sufficient reason or re-review event cannot be resolved from current authority.

Fail closed:

```text
unknown unlock
!= open gate
```

### `GATE_REASON_STALE`

The surface still describes a gate that has been authoritatively closed/replaced, or points to an authority that no longer owns the gate.

This is living-document drift and should be repaired through RT-01/RT-02/RT-11, not treated as proof of a runtime defect.

### `NOT_CURRENTLY_GATED`

The item is no longer in a gated/future state. Remove it from the current blocked-reason surface or mark it as no longer current; do not preserve stale blocking prose as active instruction.

---

## 7. Frozen v1 examples against current SimCore state

These examples validate the design; they are not a separate current-state authority.

### M-08 Snapshot Schema Inventory Generator

```text
Gate                = POST_M2_3
Kind                = CHECKPOINT
Blocking reason     = physical M2-3 has not closed
Re-review event     = authoritative physical M2-3 checkpoint closure recorded
Premature guard     = do not pull M-08 into the current NR design/harvest before that closure
```

### M-14 Release Evidence Packet

```text
Gate                = dependency: R2.1 genuine release proof
Kind                = RELEASE_PROOF
Blocking reason     = steady-state genuine runtime release proof is still pending
Re-review event     = next genuine runtime release produces authoritative R2.1 end-to-end proof
Premature guard     = do not treat permanent-CI qualification as genuine-release proof
```

### M-04 Store Write Cost / Commit Budget

```text
Gate                = EVIDENCE
Kind                = EVIDENCE
Blocking reason     = the required evidence threshold has not been satisfied
Re-review event     = only the explicitly required evidence condition in the item authority becomes satisfied
Premature guard     = do not manufacture evidence merely to open the gate
```

If the exact evidence threshold is not explicitly resolvable from the current item authority at application time, use `GATE_REASON_UNRESOLVED` rather than writing a guessed threshold.

### M-09 Provider Cache Receipt Integration

```text
Gate                = EXTERNAL
Kind                = EXTERNAL
Blocking reason     = required external authoritative provider/cache evidence is unavailable
Re-review event     = required external authoritative receipt becomes available
Premature guard     = do not infer provider/backend facts from local SimCore telemetry
```

### L-01 Development-source Modular Build

```text
Gate                = FUTURE / POST_M2
Kind                = FUTURE_POLICY
Blocking reason     = work is intentionally deferred until the post-M2 future phase
Re-review event     = the repository enters the explicitly authorized post-M2 phase and the item is re-selected
Premature guard     = do not pull future work forward merely because current queues are empty
```

---

## 8. Relationship to existing close-step systems

### RT-02 Current gate + queue recomputation

RT-02 owns recomputation of whether an item is currently gated/open/closed in living queues.

SYS-48 only projects the resulting blocked explanation.

### RT-11 Gate-unlock propagation

RT-11 owns the procedural question:

```text
Did a legitimate dependency just close, and which previously gated items must now be reconsidered?
```

SYS-48 provides a human-readable re-review event that helps that review, but it does not execute the propagation.

### SYS-10 Stale Next-Action Scanner

SYS-10 checks stale advertised current action.
SYS-48 explains why a gated item cannot currently become that action.

They remain separate:

```text
SYS-10
→ "This NEXT is stale/gated."

SYS-48
→ "This item is gated because X; re-review after Y."
```

### SYS-01 Living Authority Map

SYS-01 answers where the gate/selection authority lives.
SYS-48 consumes that authority relationship rather than duplicating it.

---

## 9. Multi-gate items

An item may have more than one descriptive gate phrase, e.g. `FUTURE / POST_M2`.

SYS-48 v1 must not construct boolean dependency expressions.

Frozen rule:

```text
if the owning authority clearly identifies one operative current blocker
→ show that blocker

if several conditions are explicitly conjunctive and no single current blocker is authoritative
→ preserve the bounded composite phrase verbatim
→ do not simplify it

if relationship is ambiguous
→ GATE_REASON_UNRESOLVED
```

Boolean/transitive dependency modeling belongs to SYS-03, not SYS-48.

---

## 10. Freshness / invalidation

Review the blocked-reason surface when any of these occurs:

```text
RT-11 dependency-close event
RT-02 queue/gate recomputation
checkpoint close/open state change
new evidence satisfies or changes a gate
external receipt arrives
R2.1 genuine release proof state changes
a gated item is frozen/implemented/superseded/retired
canonical gate authority changes
```

A stale blocked explanation must not survive a gate close as active current instruction.

---

## 11. Hard boundaries

SYS-48 must never become:

```text
GateManager
Gate Dependency Graph
priority calculator
NEXT selector
automatic gate opener
automatic queue writer
background dependency watcher
release-proof classifier
provider/backend inference engine
evidence fabricator
roadmap authority
runtime/plugin feature
```

It is a living explanatory projection only.

---

## 12. Verification plan for later document application

When the v1 surface is materialized, verify at least:

```text
1. every listed item is actually gated/future in its current authority
2. every canonical gate token is preserved without semantic broadening
3. each blocking reason states only the currently unsatisfied authoritative fact
4. each re-review event is supported by an authority or marked UNRESOLVED
5. no row claims that the event automatically opens the gate
6. no transitive/boolean dependency graph is invented
7. historical/frozen gate text is not treated as current
8. a closed/implemented/frozen item is not left on the current blocked surface
9. provider/cache external gates do not infer backend facts from local telemetry
10. genuine-release-proof gates do not treat qualification CI as proof
11. FUTURE items are not promoted because current queues are empty
12. no plugin/runtime/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-48.

---

## 13. Unified classification freeze verdict

Source/design inspection confirms the provisional classification:

```text
SIZE          = SMALL
IMPORTANCE    = 5
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 value is a living human-readable projection of existing gate facts;
- no calculation or executable inference is needed;
- the gate authorities remain elsewhere;
- no CI/release/repository writer authority changes are required.

---

## 14. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here. Any materialization of blocked-reason rows is a separate bounded NR application transaction after the active system-idea design sweep closes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
