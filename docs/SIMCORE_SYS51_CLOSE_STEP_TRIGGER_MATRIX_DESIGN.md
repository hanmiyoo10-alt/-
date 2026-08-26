# SYS-51 — Close-Step Trigger Matrix — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-51
Idea          = Close-Step Trigger Matrix
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
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

Direct parent operating contract:
- `docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`

Related frozen system design:
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`

---

## 1. Problem

The active close-step routine defines twelve maintenance surfaces (`RT-01` … `RT-12`) and already says to evaluate only affected surfaces.

Without a bounded trigger matrix, however, two opposite operator errors remain possible:

```text
OVER-RUN
→ every task mechanically checks every RT surface
→ needless repo reads/rewrites
→ repeated noise
→ temptation to create background automation

UNDER-RUN
→ a task is considered complete after its local result
→ relevant evidence/gate/authority/fixture/transaction maintenance is forgotten
→ living state drifts
```

SYS-51 defines a deterministic **selection guide** for deciding which existing RT surfaces must be evaluated for a given work transaction.

It does not execute the surfaces, change their semantics, or create a new task runner.

---

## 2. Core invariant

```text
work classification
+ observed event overlays
→ close-step surfaces to evaluate

trigger matrix
!= close-step executor
!= semantic classifier
!= repository writer
```

The matrix answers:

> Given what kind of SimCore work just occurred, and what facts occurred during it, which existing RT surfaces are required or conditionally relevant before the task can close?

It does **not** answer the substantive result inside those surfaces.

Examples:

```text
RUNTIME_IMPLEMENTATION
→ RT-04 must evaluate production boundary neutrality/change
→ RT-08 must evaluate verification claims if verification occurred
→ RT-10 only if branch/PR transaction occurred

LIVE_VALIDATION_REVIEW
→ RT-06/RT-07 evaluate when qualifying specimen/anomaly exists
→ RT-02/RT-11 evaluate only if the reviewed result changes a gate/dependency
```

---

## 3. Relationship to existing RT authority

The authoritative definition of each RT surface remains:

`docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`

SYS-51 may reference only the existing RT IDs and their frozen meanings.

If an RT definition changes later:

```text
update RT authority first
→ review SYS-51 matrix
→ update matrix only if trigger relation changed
```

SYS-51 cannot silently redefine an RT surface merely to simplify a matrix row.

---

## 4. v1 artifact form

The useful v1 implementation is one living repository document, conceptually:

```text
docs/SIMCORE_CLOSE_STEP_TRIGGER_MATRIX.md
```

No executable runner, workflow, GitHub Action, scheduler, parser, or repository writer is required for v1.

The matrix is used procedurally by the assistant/operator at task close.

This makes v1 deliberately cheap to evolve while the operating discipline is still being exercised in real work.

---

## 5. Matrix vocabulary

Each work-type row uses exactly three trigger states:

```text
R = REQUIRED BY WORK TYPE
C = CONDITIONAL / EVENT-OVERLAY CONTROLLED
— = NOT TRIGGERED BY WORK TYPE ALONE
```

Meaning:

### `R`

The surface must be evaluated for every substantive transaction of that work type.

Evaluation may legitimately conclude `NO UPDATE REQUIRED`.

### `C`

The surface is evaluated only when one of the frozen event overlays in section 7 occurs.

### `—`

The work type alone does not justify evaluating the surface.
An event overlay may still activate it.

Important:

```text
R means evaluate
!= mutate
!= create an artifact
```

A required evaluation may produce no repository change.

---

## 6. Frozen v1 work types

The matrix classifies the **primary transaction**, not every file extension touched.

Exactly these v1 work types are recognized:

```text
WT-01 DESIGN_ONLY
WT-02 DOC_POLICY_OR_LIVING_MEMORY
WT-03 NON_RUNTIME_DOC_APPLY
WT-04 NON_RUNTIME_EXECUTABLE_TOOLING
WT-05 PERMANENT_FIXTURE_OR_TEST_EXPANSION
WT-06 RUNTIME_IMPLEMENTATION
WT-07 RELEASE_PUBLICATION_OR_ROLLBACK
WT-08 LIVE_VALIDATION_OR_FORENSIC_REVIEW
WT-09 ARCHITECTURE_CHECKPOINT
WT-10 CI_RELEASE_REPO_SYSTEM_CHANGE
WT-11 ANOMALY_ONLY_REVIEW
```

### WT-01 DESIGN_ONLY

Frozen design/research work with no implementation/application.

### WT-02 DOC_POLICY_OR_LIVING_MEMORY

Policy/current-state/administrative memory changes that are themselves the bounded task.

### WT-03 NON_RUNTIME_DOC_APPLY

Application of a frozen `NR_DOC_ONLY` idea or equivalent bounded repository artifact.

### WT-04 NON_RUNTIME_EXECUTABLE_TOOLING

Repository-local read/analyze/generate tool implementation that does not change CI/release/repo-writer authority.

### WT-05 PERMANENT_FIXTURE_OR_TEST_EXPANSION

Existing permanent harness suite/fixture/registry changes with no runtime source change.

### WT-06 RUNTIME_IMPLEMENTATION

Plugin/runtime behavior implementation before publication.

### WT-07 RELEASE_PUBLICATION_OR_ROLLBACK

Explicit authorized publication, release-state convergence, or rollback transaction.

### WT-08 LIVE_VALIDATION_OR_FORENSIC_REVIEW

Review of real long-chat/runtime evidence for a declared validation target.

### WT-09 ARCHITECTURE_CHECKPOINT

Physical ownership extraction/migration checkpoint and its architecture verification/close evidence.

### WT-10 CI_RELEASE_REPO_SYSTEM_CHANGE

Protected changes to CI discovery, release machinery, repository writer/branch authority, build topology, or permanent harness authority.

### WT-11 ANOMALY_ONLY_REVIEW

A bounded forensic review of an already-observed anomaly where no implementation is performed in the same transaction.

If a task materially contains two work types that policy forbids bundling, do not choose a combined row. Split the task.

---

## 7. Event overlays

Work-type rows are only the base layer. The following events activate additional surfaces regardless of row.

### EV-01 LIVE_EVIDENCE_PRESENT

Trigger:
- real production/chat diagnostic or RAW evidence is reviewed.

Activate as applicable:

```text
RT-06 Natural-evidence corpus intake
RT-07 Immediate anomaly capture + disposition propagation
RT-08 Verification-claim honesty only if a verification claim is made from the evidence
```

RT-06 requires S-12 qualification; live evidence existing does not automatically make it a corpus specimen.

### EV-02 ANOMALY_OBSERVED_OR_RECLASSIFIED

Activate:

```text
RT-07
RT-02 if gate/queue impact exists
RT-01 if living disposition/status changes
RT-12 always at final close
```

Do not auto-promote anomaly severity.

### EV-03 VERIFICATION_OCCURRED

Activate:

```text
RT-08
```

Examples:
- static check;
- permanent suite;
- focused tool test;
- CI workflow;
- controlled fixture run.

The surface must record what actually executed rather than treating generic green CI as universal proof.

### EV-04 PRODUCTION_BOUNDARY_MATERIAL

Trigger when the task:
- changes runtime/release bytes;
- claims runtime/release neutrality in a context where that claim matters;
- changes current production declarations;
- depends on exact deployed identity.

Activate:

```text
RT-04
```

### EV-05 CURRENT_AUTHORITY_RELATION_CHANGED_OR_MATERIALLY_REFERENCED

Activate:

```text
RT-03 when S-10/sync-state scope is relevant
RT-01 for affected living authority documents
```

SYS-01 Living Authority Map is navigation metadata for finding relevant authority; it is not the checker.

### EV-06 EVIDENCE_POSTURE_CHANGED

Trigger:
- qualifying evidence added;
- evidence maturity/status changes;
- fixture/live evidence relationship changes.

Activate:

```text
RT-05
```

### EV-07 FIXTURE_OR_COVERAGE_CHANGED

Activate:

```text
RT-09
RT-05 if Evidence Index projection is affected
RT-08 because verification claims must be bounded
```

### EV-08 BRANCH_PR_TRANSACTION_OCCURRED

Activate:

```text
RT-10
```

Do not auto-close/delete branches or PRs.

### EV-09 GATE_OR_DEPENDENCY_CHANGED

Activate:

```text
RT-02
RT-11 if a previously closed gate may now be legitimately open
RT-01 for affected living queue/priority documents
RT-12
```

### EV-10 RELEASE_OPERATOR_OR_PUBLICATION_STATE_CHANGED

Activate:

```text
RT-03
RT-04
RT-01
RT-02 if current operational gate/queue changed
RT-12
```

This does not authorize publication itself.

---

## 8. Frozen base trigger matrix

`R` = required by work type. `C` = evaluate only when an event overlay applies. `—` = not selected by type alone.

| Work type | RT01 | RT02 | RT03 | RT04 | RT05 | RT06 | RT07 | RT08 | RT09 | RT10 | RT11 | RT12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WT-01 DESIGN_ONLY | R | R | C | C | C | C | C | — | — | — | R | R |
| WT-02 DOC_POLICY_OR_LIVING_MEMORY | R | R | C | C | C | C | C | — | — | C | R | R |
| WT-03 NON_RUNTIME_DOC_APPLY | R | R | C | C | C | C | C | C | C | C | R | R |
| WT-04 NON_RUNTIME_EXECUTABLE_TOOLING | R | R | C | R | C | C | C | R | C | C | R | R |
| WT-05 PERMANENT_FIXTURE_OR_TEST_EXPANSION | R | R | C | R | C | — | C | R | R | C | R | R |
| WT-06 RUNTIME_IMPLEMENTATION | R | R | C | R | C | C | C | R | C | C | R | R |
| WT-07 RELEASE_PUBLICATION_OR_ROLLBACK | R | R | R | R | C | C | C | R | C | R | R | R |
| WT-08 LIVE_VALIDATION_OR_FORENSIC_REVIEW | R | R | C | R | C | R | R | R | C | — | R | R |
| WT-09 ARCHITECTURE_CHECKPOINT | R | R | C | R | C | C | C | R | C | C | R | R |
| WT-10 CI_RELEASE_REPO_SYSTEM_CHANGE | R | R | C | R | C | — | C | R | C | R | R | R |
| WT-11 ANOMALY_ONLY_REVIEW | R | R | C | C | C | C | R | R | — | — | R | R |

### Why RT-01 / RT-02 / RT-11 / RT-12 are broadly required

For substantive SimCore work:

```text
RT-01
→ current living memory must not be left contradictory when touched

RT-02
→ a completed/frozen/failed task may alter legitimate queues even without runtime changes

RT-11
→ every bounded substantive task must ask whether it satisfied an explicit dependency and thereby opened something

RT-12
→ every bounded substantive task ends with one canonical next operation
```

`RT-11 = R` means **evaluate unlock possibility**, not assert that something unlocked.

### Why RT-04 is required for tooling/fixture/runtime/architecture/protected work

Those work classes commonly make a meaningful claim that production bytes were either changed intentionally or remained unchanged.

Therefore production-boundary neutrality/change must be checked, not merely assumed.

### Why RT-08 is not required for pure design/docs

A design-only transaction may have source inspection but does not necessarily make an execution-verification claim.

If tests/static checks are actually run, EV-03 activates RT-08.

---

## 9. Multi-event resolution

Triggers are additive.

```text
base row selected
+ every observed event overlay
→ union of RT surfaces
```

Do not let one `—` suppress another event that explicitly activates the surface.

Example:

```text
WT-01 DESIGN_ONLY
+ EV-08 BRANCH_PR_TRANSACTION_OCCURRED
→ RT-10 becomes active even though base row says —
```

No priority ordering between activated RT surfaces changes the canonical close order defined by the parent RT design.

---

## 10. Canonical close order remains unchanged

SYS-51 chooses **what** to evaluate. The parent RT design still owns **when** to evaluate it.

Frozen order remains:

```text
1. verification result / live evidence classification
2. anomaly capture if applicable
3. production-boundary check if material
4. authority-drift check if relevant
5. evidence / natural-corpus / fixture projections if triggered
6. gate + queue recomputation
7. living-document consistency repair
8. transaction-hygiene check when branch/PR work occurred
9. canonical next-operation recomputation
10. stop
```

SYS-51 must not create a competing execution order.

---

## 11. Failure / ambiguity behavior

### TRIGGER_SET_READY

Use when:
- one primary work type resolves;
- event overlays can be identified without guessing.

### TRIGGER_SET_BLOCKED

Use when:
- the task cannot be classified without combining policy-forbidden work types;
- an event fact needed to decide a protected surface is unknown;
- work scope expanded beyond the originally selected bounded transaction.

Response:

```text
stop close classification
→ split/reclassify the work transaction
→ do not silently choose the lighter row
```

### TRIGGER_SET_ESCALATED

Use when an event overlay legitimately adds a surface not selected by the base row.

This is normal and not an anomaly.

---

## 12. Relationship to future system ideas

### SYS-08 Work-Item Close Receipt

SYS-51 should become its trigger-selection input conceptually:

```text
work type + overlays
→ selected RT surfaces
→ actual close results
→ SYS-08 receipt
```

SYS-08 must record actual evaluated surfaces, not copy the full matrix into every receipt.

### SYS-09 Change-Impact Review Map

```text
SYS-09
= changed path/family → what authorities/contracts need review

SYS-51
= transaction/event class → what close surfaces need evaluation
```

They are complementary, not duplicates.

### SYS-10 Stale Next-Action Scanner

SYS-10 may later benefit from RT-01/02/12 outputs but does not become part of SYS-51 v1.

### SYS-50 Work Bundling Conflict Detector

SYS-50 may later detect policy-forbidden mixed work before SYS-51 selection.
SYS-51 itself only fail-closes when a clean primary work type cannot be selected.

---

## 13. Hard boundaries

SYS-51 must never become:

```text
background task runner
GitHub Action
CI dispatcher
release dispatcher
automatic repo writer
automatic LIVE_PASS classifier
automatic anomaly severity classifier
second RT semantic authority
second gate/queue authority
second production identity checker
permission to combine otherwise forbidden work types
```

It is a living procedural matrix only.

---

## 14. Verification plan for later document application

When `SIMCORE_CLOSE_STEP_TRIGGER_MATRIX.md` is materialized, manually verify at least:

```text
1. all RT-01..RT-12 IDs exist in the parent frozen RT design
2. matrix does not redefine any RT behavior
3. runtime/release work always reaches RT-04
4. verification-bearing work reaches RT-08
5. fixture work reaches RT-09
6. branch/PR occurrence can activate RT-10 from any row
7. gate/dependency changes activate RT-11
8. live anomaly evidence reaches RT-07
9. pure design does not require verification claims when no verification ran
10. event overlays can only add surfaces, never suppress required ones
11. no row authorizes automatic mutation/publication/classification
12. no plugin/runtime/release/CI/repository-writer change is introduced
```

No real long-chat validation is required solely for SYS-51.

---

## 15. Unified classification freeze verdict

Design inspection confirms the provisional classification:

```text
SIZE          = SMALL
IMPORTANCE    = 5
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 artifact is a reviewed living decision table;
- no executable runner is necessary to obtain the benefit;
- existing RT tools/authorities remain the actual action implementations;
- no CI/release/repository writer authority changes are required.

If future experience proves matrix selection itself is costly enough to automate, that automation must be proposed separately and reclassified according to its actual authority boundary.

---

## 16. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here. Materialization of `docs/SIMCORE_CLOSE_STEP_TRIGGER_MATRIX.md` is a separate NR application transaction after the active system-idea design sweep closes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
