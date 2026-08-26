# SYS-46 — Canonical Task Card — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-46
Idea          = Canonical Task Card
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 1 / VERY EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Current selection authorities:
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

Related frozen system designs:
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS48_GATE_BLOCKED_REASON_SURFACE_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md`
- `docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md`

Downstream candidate that should consume this design rather than invent a parallel vocabulary:
- SYS-47 User Handoff Card

---

## 1. Problem

SimCore already has strong authorities for ideas, gates, architecture designs, release identity, evidence, verification, and close-step maintenance.

A selected work item can still be represented across several places, however:

```text
idea / checkpoint ID
current selection or queue
frozen design / plan
work type
objective identity
current gate
allowed mutation boundary
explicit non-goals
verification expectations
stop condition
later close receipt
```

Without one bounded internal task contract, a later operator/session can reconstruct the same work differently and create avoidable failure modes:

```text
SCOPE DRIFT
→ a second objective is added because it looks adjacent

AUTHORITY DRIFT
→ historical design text is treated as current authorization

GATE DRIFT
→ importance or readiness is mistaken for permission to implement

TRANSACTION DRIFT
→ design freeze and implementation are silently mixed
→ runtime work and CI/release/repository-system redesign are bundled

MUTATION DRIFT
→ a task that should touch only main docs starts touching runtime/release authority

HANDOFF DRIFT
→ the internal work definition and the user-facing instruction describe different tasks

CLOSE DRIFT
→ the work that is closed is not clearly the work that was selected at the start
```

SYS-46 defines one compact **Canonical Task Card** for a bounded SimCore work transaction.

The card is the internal start contract for identity, objective, scope, authority, gate, mutation boundary, and stop conditions.

It does not replace the authorities that establish those facts.

---

## 2. Core invariant

```text
selected bounded work
+ reviewed current authorities
→ one canonical task identity
→ one bounded objective
→ one primary work type
→ one scope / mutation envelope
→ one current gate/readiness statement
→ one stop / escalation contract

Canonical Task Card
!= task scheduler
!= issue tracker
!= roadmap
!= global NEXT authority
!= gate engine
!= work-bundling judge
!= implementation conformance judge
!= evidence proof
!= close receipt
!= user-facing handoff
!= repository writer
```

The card answers:

> What exact bounded work transaction are we performing, under which authorities, inside which scope, and where must we stop?

It does not answer:

> Did the work succeed?

That belongs to verification/evidence authorities and SYS-08 close receipt.

---

## 3. Transaction-scoped, not one global current-task singleton

SimCore can legitimately have more than one kind of activity in flight at the repository level.

Current examples include:

```text
production live gate pending
+ safe non-runtime design work
```

Therefore SYS-46 must not create one universal `CURRENT_TASK` file that erases parallel but policy-compatible work.

Frozen rule:

```text
one bounded work transaction
→ one canonical card

separate bounded transaction
→ separate card
```

A card is canonical **for its own transaction**, not for the entire repository.

Global current priority / gate / production authorities remain where they already live.

---

## 4. Card creation point

A card is prepared only after the work has been legitimately selected/reviewed and before substantive application or implementation starts.

Conceptual flow:

```text
candidate / observed defect / checkpoint / live gate
→ current authority review
→ gate and selection review
→ SYS-50 bundling preflight when materially relevant
→ Canonical Task Card READY
→ bounded work starts
```

For a design-only transaction, the card contract may be represented by the design/plan artifact itself once the bounded objective and stop boundary are explicit.

For later implementation/application work, the repository must already contain the design/plan/evidence authority required by normal SimCore sequencing before the work begins.

SYS-46 never turns an unselected candidate into authorized work merely by creating a card.

---

## 5. Canonical card schema

A v1 task card contains exactly these ten top-level sections.

### 5.1 Work identity

```text
Work ID
Task title
Source candidate / trigger
Primary objective ID
Primary work type (WT-xx)
Card state
```

Rules:
- reuse an existing canonical idea/checkpoint/release/scenario/work ID when one exists;
- do not mint a competing global numbering system;
- `Primary objective ID` is the reviewed objective identity used to keep one transaction attributable;
- `Primary work type` must use the frozen SYS-51 `WT-01 ... WT-11` vocabulary;
- if one clean primary work type cannot be selected because scope is policy-forbidden mixed work, the card is blocked rather than normalized into a fake combined type.

### 5.2 Bounded objective

Exactly one primary objective statement.

Requirements:
- one or two sentences maximum;
- describe the intended bounded result;
- do not include unrelated cleanup;
- do not use vague wording such as `improve SimCore` or `finish everything`.

Example:

```text
Extract Edit Reconcile ownership into the frozen M2-3 application-service boundary while preserving the named pre-extraction correctness contracts.
```

### 5.3 Authority set

List only authorities needed to define or constrain this task:

```text
Selection / current-state authority
Primary design / plan authority
Gate authority
Production / release authority when material
Evidence / defect authority when the task is repair-driven
Protected-system authority when applicable
```

Rules:
- prefer living current authorities for current state;
- use frozen/historical evidence for point-in-time proof only;
- do not copy entire authority documents into the card;
- unresolved or contradictory required authority makes the card `TASK_CARD_BLOCKED`.

### 5.4 Scope envelope

Two bounded lists:

```text
IN SCOPE
OUT OF SCOPE
```

The card must name enough explicit exclusions to prevent the most plausible adjacent scope expansion.

Examples:

```text
IN SCOPE
- one frozen application-service extraction
- supporting regression updates required by the same objective
- required close/evidence synchronization

OUT OF SCOPE
- release-system redesign
- unrelated runtime correctness repair
- post-M2-3 M2-4 ownership work
```

`OUT OF SCOPE` is not optional when an adjacent forbidden or deferred work family is known.

### 5.5 Gate / selection posture

Record:

```text
Current canonical gate token / selection state
Why this task is selectable now, or why it is blocked
Gate / selection authority ref
```

Rules:
- preserve the source gate token without semantic normalization;
- a high importance score is not a gate-open signal;
- `FROZEN` design does not imply implementation authorization;
- if the task is blocked, the human explanation should consume SYS-48 vocabulary/authority rather than invent a second gate model;
- the card itself never opens or closes a gate.

### 5.6 Mutation boundary

Record two bounded surfaces:

```text
Allowed mutation surfaces
Forbidden mutation surfaces
```

Examples by transaction kind:

```text
DESIGN_ONLY
Allowed  = main design/evidence/admin docs required by the freeze transaction
Forbidden = plugin runtime bytes, release-simcore, release publication, implementation source

RUNTIME_IMPLEMENTATION
Allowed  = dedicated work branch source + supporting verification/evidence within the frozen slice
Forbidden = release-simcore publication until the separate authorized release transaction; unrelated CI/release/repo-system redesign

LIVE_REVIEW
Allowed  = evidence/classification/living-state records
Forbidden = speculative runtime repair in the same observation transaction
```

The card records an already-authoritative boundary; it does not create new repository permissions.

### 5.7 Verification / evidence obligation

Record only the proof classes materially required for the task:

```text
Required verification / evidence
Explicitly not claimed
```

Examples:

```text
Required:
- syntax/static check
- focused deterministic fixture
- permanent CI

Not claimed:
- real long-chat PASS until a real specimen exists
```

or:

```text
Required:
- reviewed live diagnostic + RAW/neighbor evidence named by the live gate

Not claimed:
- provider/backend fact from local telemetry alone
```

This section is an obligation/claim boundary, not proof that verification already ran.

Actual execution evidence remains in its natural evidence/CI/live authority.

### 5.8 Adjacent-system references

When applicable, record bounded references to supporting governance systems rather than copying their rule sets:

```text
SYS-09 change-impact review ref/result
SYS-50 bundling preflight ref/result
SYS-42 implementation-slice ref/result
live-gate handoff ref
other named protected review
```

A task card may say:

```text
Bundling preflight = BUNDLE_CLEAN
```

only when that reviewed result actually exists.

No absence of a SYS-50 result may be rewritten as `BUNDLE_CLEAN`.

### 5.9 Stop / escalation conditions

Every card contains both:

```text
NORMAL STOP CONDITION
ESCALATION / STOP-AND-REPLAN CONDITIONS
```

Normal stop condition defines when this bounded transaction has reached its intended edge.

Common escalation conditions include:

```text
material second objective appears
current gate/authority contradicts the card
scope requires a forbidden mutation surface
SYS-50 yields BUNDLE_SPLIT_REQUIRED or BUNDLE_BLOCKED
implementation requires a design change beyond the frozen slice
new live anomaly requires separate evidence classification before repair
release/repository-system redesign becomes necessary
```

Frozen rule:

```text
material scope expansion
→ stop
→ preserve the observation
→ split/reclassify/re-design as appropriate
→ do not silently widen the card
```

### 5.10 Close / handoff linkage

Record:

```text
Expected close mechanism / receipt authority
User-facing handoff source, when human action is required
```

Rules:
- SYS-08 owns the completed work-item close receipt;
- SYS-47 will later own a user-facing projection of this internal card;
- SYS-19 remains the specialized human live-gate experiment packet;
- the task card does not duplicate those artifacts.

At close, SYS-08 should preserve the same `Work ID`, `Primary objective ID`, and `Primary work type` unless an explicit amendment/supersession explains the difference.

---

## 6. Card-state vocabulary

Exactly five v1 card-definition states:

```text
TASK_CARD_DRAFT
TASK_CARD_READY
TASK_CARD_BLOCKED
TASK_CARD_STALE
TASK_CARD_SUPERSEDED
```

### `TASK_CARD_DRAFT`

The bounded task is still being assembled/reviewed and is not yet safe to use as the work contract.

### `TASK_CARD_READY`

All required identity, authority, gate, scope, mutation, and stop fields resolve consistently and the card faithfully represents an already-legitimate selected transaction.

Important:

```text
TASK_CARD_READY
!= independent implementation authorization
!= gate opener
!= PASS
```

The authority sources, not SYS-46, authorize the work.

### `TASK_CARD_BLOCKED`

Use when the card cannot be made truthful without guessing.

Examples:
- required authority missing/conflicting;
- one primary work type cannot be resolved;
- gate is not actually open/selectable for the intended action;
- mutation boundary is ambiguous;
- the task contains an unresolved forbidden bundle.

### `TASK_CARD_STALE`

Use when a source authority materially changes after the card was prepared and the card has not yet been revalidated.

A stale card must not remain the work contract merely because implementation already started.

### `TASK_CARD_SUPERSEDED`

Use when the task is intentionally replaced, split, or re-framed into a new bounded card.

Do not delete the superseded card if it already served as a durable transaction record.

---

## 7. Amendment / immutability rule

The card is mutable while `TASK_CARD_DRAFT`.

Once it becomes `TASK_CARD_READY` and substantive work begins, material fields must not be silently rewritten.

Fields treated as material:

```text
Work ID
Primary objective ID
Primary work type
bounded objective
primary authority set
IN / OUT scope
current gate posture
allowed / forbidden mutation surfaces
normal stop condition
```

If a bounded clerical or authority-pointer correction is necessary without changing the semantic work:

```text
append Card Amendment
- date/time or transaction point
- changed field
- old value
- new value
- reason
- supporting authority
```

If the change alters the semantic objective, work type, gate, or mutation envelope:

```text
current card → TASK_CARD_STALE or TASK_CARD_SUPERSEDED
new/split card → required
```

This prevents task-card maintenance from becoming a hidden scope-expansion channel.

---

## 8. Constitutional boundaries with related designs

### SYS-50 Work Bundling Conflict Detector

```text
SYS-46
= declares the one reviewed objective/scope/work type used by the transaction

SYS-50
= determines whether the reviewed change-family/role bundle is allowed to coexist
```

SYS-46 may consume a SYS-50 result but never recreates the conflict matrix.

### SYS-51 Close-Step Trigger Matrix

```text
SYS-46
= records one primary WT-xx at task start

SYS-51
= combines that work type with actual event overlays at task close
```

The card does not predict all future event overlays.

### SYS-48 Gate-Blocked Reason Surface

```text
SYS-46
= records the task's current gate/selection posture

SYS-48
= owns the bounded human explanation for why a gated item is blocked and what event causes re-review
```

A blocked card should point to/consume that explanation when applicable.

### SYS-08 Work-Item Close Receipt

```text
SYS-46 = before/during work contract
SYS-08 = after-work close record
```

The close receipt may cite the card; it must not retroactively rewrite it to make the completed work look planned if the scope actually changed.

### SYS-42 Implementation Slice Conformance Checker

SYS-46 may point to the frozen allowed implementation slice, but SYS-42 remains the machine-verifiable checker for actual implementation conformance.

`TASK_CARD_READY` never means `SLICE_CONFORMANT`.

### SYS-19 Live-Gate Handoff Packet

SYS-19 is a specialized user action packet for a current live validation experiment.
SYS-46 is the generic internal transaction contract.

A live-review task may reference SYS-19 without copying the entire experiment into the generic card.

### SYS-47 User Handoff Card

SYS-47 is deliberately downstream.

Frozen consumption rule:

```text
Canonical Task Card
→ safe bounded user-relevant projection
→ User Handoff Card
```

SYS-47 should not invent a second task ID, objective, gate state, or stop condition when SYS-46 already supplies them.

The user-facing projection may omit internal-only fields, but it must not contradict them.

---

## 9. v1 artifact form

The useful v1 application is document-only.

Preferred later artifact:

```text
docs/SIMCORE_CANONICAL_TASK_CARD_TEMPLATE.md
```

The template is a contract, not a database.

Prospective placement order for actual task cards:

```text
1. existing canonical design/plan/implementation-evidence artifact for the bounded transaction
   → add one compact `Canonical Task Card` section

2. dedicated bounded task plan document when no natural durable artifact exists

3. PR/issue body may mirror the card for execution convenience
   → but must not be the only durable SimCore authority when the task requires main design/evidence memory
```

Do not create one standalone file per trivial micro-task by default.
Do not retrofit every historical task merely for formatting consistency.
Apply prospectively after materialization.

No generator, task database, GitHub Project integration, background scheduler, CI gate, branch creator, repository writer, or runtime UI is part of v1.

---

## 10. Example cards used only to validate the design

These examples are illustrative and are not new current-state authorities.

### 10.1 Current-style design-only system idea

```text
Work ID              = SYS-46
Primary objective ID = SYS_46_CANONICAL_TASK_CARD_DESIGN
Primary work type    = WT-01 DESIGN_ONLY
Gate posture         = NOW + current sweep selection
Allowed mutation     = main design/classification/progress docs required by design freeze
Forbidden mutation   = runtime source, release-simcore, application implementation
Normal stop          = DESIGN FROZEN + living design authorities synchronized
```

### 10.2 Future M2-3 implementation

```text
Work ID              = M2-3
Primary objective ID = M2_3_EDIT_RECONCILE_EXTRACTION
Primary work type    = WT-09 ARCHITECTURE_CHECKPOINT
Gate posture         = only after current v0.64.7 live gate is authoritatively closed
Allowed mutation     = dedicated implementation branch inside frozen M2-3 slice + supporting verification/evidence
Forbidden mutation   = release-simcore publication in implementation transaction; unrelated M2-4 work; release-system redesign
Normal stop          = implementation/static/CI checkpoint evidence closed; then separate release sequence as authorized
```

This example does not claim the M2-3 gate is currently open.

### 10.3 Live validation review

```text
Work ID              = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
Primary work type    = WT-08 LIVE_VALIDATION_OR_FORENSIC_REVIEW
Allowed mutation     = evidence/classification/living authority synchronization
Forbidden mutation   = speculative runtime repair in the same evidence-review transaction
Normal stop          = reviewed PASS/WATCH/FIX/BLOCKER classification preserved and current gate/next operation recomputed
```

---

## 11. Failure model

### CARD READY but later authority changes

```text
TASK_CARD_READY
→ authority/gate changes materially
→ TASK_CARD_STALE
→ re-review before continuing
```

Do not assume already-started work can continue against stale authorization.

### Scope expansion appears

```text
new objective / forbidden mutation needed
→ STOP
→ preserve why
→ SYS-50 / design / gate review as applicable
→ split or supersede card
```

### Task closes differently from the card

Do not edit the old card to manufacture consistency.

The close receipt must state the actual outcome and cite any amendment/supersession.

### Card cannot resolve current truth

```text
TASK_CARD_BLOCKED
```

Fail closed rather than guessing work type, gate state, production identity, or allowed mutation surface.

---

## 12. Hard boundaries

SYS-46 must never become:

```text
second CURRENT_DEVELOPMENT
second idea inventory
second gate authority
second roadmap
second issue tracker
second evidence ledger
second repository transaction ledger
automatic task scheduler
automatic branch/PR creator
automatic release trigger
background task monitor
semantic diff classifier
automatic work-bundling judge
automatic implementation-conformance judge
user-facing live experiment authority
runtime/plugin feature
```

It is a bounded internal work contract and navigation surface only.

---

## 13. Verification plan for later NR_DOC_ONLY application

When the v1 template is materialized, verify at least:

```text
1. one WT-01 design-only task can be represented without implying implementation authorization
2. one WT-04 NR executable task preserves local-tool scope and does not imply CI enrollment
3. one WT-06/WT-09 runtime/architecture task preserves work-branch implementation vs release-simcore publication separation
4. one WT-07 release task is distinct from the preceding implementation task
5. one WT-08 live-review task preserves evidence-before-repair separation
6. one gated task becomes TASK_CARD_BLOCKED rather than READY merely because it has high importance
7. one mixed work item that cannot resolve a clean WT is blocked/split rather than normalized
8. IN/OUT scope prevents a plausible adjacent second objective
9. Allowed/Forbidden mutation surfaces preserve runtime vs release/repo-system separation
10. verification obligations distinguish required proof from proof actually executed
11. card identity/objective/WT can be carried into SYS-08 close receipt without redefining close semantics
12. a material mid-task scope change creates amendment/supersession rather than silent rewrite
13. SYS-47 can consume the card without inventing a parallel task/gate vocabulary
14. no plugin/runtime/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-46.

---

## 14. Unified classification freeze verdict

Source/design inspection confirms the provisional classification:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 1
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 is a compact internal task contract/template;
- it consumes already-reviewed authorities rather than calculating truth;
- no executable generator is required for the core value;
- no CI/release/repository-writer or runtime authority changes are needed;
- later SYS-47 can project this stable internal schema into a user-facing handoff without a second task model.

A future desire for automatic card generation, issue/PR enforcement, CI gating, or task scheduling would be separate NON_RUNTIME executable/protected work and is not implicit in SYS-46 v1.

---

## 15. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-46 here.
Materialization of `SIMCORE_CANONICAL_TASK_CARD_TEMPLATE.md` and prospective adoption are a separate bounded `NR_DOC_ONLY` application transaction after the active system-design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
