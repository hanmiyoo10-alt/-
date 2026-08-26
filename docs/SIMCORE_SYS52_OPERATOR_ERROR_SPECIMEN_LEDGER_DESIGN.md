# SYS-52 — Operator Error Specimen Ledger — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · REVIEWED OPERATOR/TOOLING ERROR SPECIMEN MEMORY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-52
Idea          = Operator Error Specimen Ledger
Size          = SMALL
Importance    = 4 / HIGH
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

Direct operating context:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/SIMCORE_SYSTEM_IDEA_SELECTION_DRIFT_FIX_SYS24_2026-08-26.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- future `SYS-16 Anomaly Recurrence Correlator`

Existing authorities SYS-52 must not replace:
- Git/GitHub/branch/PR/commit identities as exact repository facts;
- SYS-35 as curated meaningful repository-transaction lineage;
- `SIMCORE_DEFERRED_LEDGER.md` / `SIMCORE_ANOMALY_WATCH.md` as runtime/live validation anomaly memory;
- release-system evidence documents as release-infrastructure incident evidence;
- SYS-21 as human evidence/classification consistency review;
- SYS-46 as canonical bounded task contract;
- SYS-50 as preventive work-bundling conflict preflight;
- future SYS-16 as recurrence/correlation analysis;
- product/runtime FIX/BLOCKER authority when an operator mistake actually affects deployed behavior.

---

## 1. Problem

SimCore already preserves product anomalies, live diagnostics, release evidence, PR/commit identity, and current task/gate state.

A different class of evidence has also appeared naturally during repository work:

```text
attempted write before the intended work branch existed
→ 404
→ repository mutation NONE

wrong tool/surface selection
→ temporary noop.tmp created on main
→ immediately deleted
→ runtime/release-simcore impact NONE

system-idea selection pointer drift
→ SYS-24 remained I4/D2/NOW in the inventory table
→ selection block incorrectly omitted it
→ corrected before continuing
→ runtime/release impact NONE
```

These are not SimCore product defects.

They are also not useless noise.

They reveal failure modes in the human/tool/repository operating process that can recur during future long-running work:

```text
wrong precondition order
wrong mutation surface
wrong tool choice
silent selection-pointer drift
scope or authority confusion
proof/claim overstatement
close-order mistakes
```

If these incidents remain only inside one work document or chat history, later operators may repeat the same mistake without seeing the prior specimen.

SYS-52 defines a compact, durable, process-oriented specimen ledger for those errors.

---

## 2. Core invariant

```text
observed operator/tooling process deviation
+ exact bounded context
+ actual mutation / non-mutation facts
+ immediate containment
+ reviewed WATCH / DEFER / FIX / BLOCKER disposition
+ durable evidence refs
→ operator error specimen

operator error specimen
!= product defect by default
!= actor reliability score
!= blame record
!= automatic severity promotion
!= repository transaction authority
!= runtime/live evidence
```

Canonical identity:

```text
SYS-52
= durable process-regression specimen memory

NOT
= human performance tracker
= assistant scorecard
= tool telemetry scraper
= incident auto-classifier
= repo writer
= rollback engine
= gate engine
```

---

## 3. Why v1 is `NR_DOC_ONLY`

The useful v1 implementation is a curated repository ledger.

Preferred future materialization:

```text
docs/SIMCORE_OPERATOR_ERROR_SPECIMEN_LEDGER.md
```

The ledger stores reviewed compact rows and links to the actual evidence.

No executable system is required to provide the main value.

SYS-52 v1 explicitly does not require:

```text
GitHub audit-log scraping
chat-log scraping
shell-history capture
automatic tool-call capture
LLM blame attribution
actor scoring
recurrence scoring
CI wiring
GitHub Actions
repository mutation
runtime instrumentation
```

Therefore:

```text
Apply Class = NR_DOC_ONLY
```

If a future tool automatically discovers or classifies operator mistakes, that tool is a separate design/implementation decision and must receive its own NR apply classification.

---

## 4. Inclusion threshold

Not every typo or harmless chat correction deserves a durable specimen.

A SYS-52 row is appropriate when at least one reviewed condition is true:

```text
OE-01 an unintended repository mutation occurred
OE-02 a repository mutation was attempted against the wrong/unready surface and was blocked
OE-03 a current/selection pointer drift could have misrouted later work
OE-04 a branch/authority/scope misunderstanding created real mutation risk
OE-05 an evidence/proof claim was durably overstated and required correction
OE-06 a close/order/transaction mistake required explicit containment or repair
OE-07 the same operating failure has reusable prevention value even when mutation = NONE
```

Normally exclude:

```text
ordinary conversational typo with no durable consequence
formatting preference correction
transient thought that never became a repository/tool action
known expected tool rejection with no process lesson
product/runtime anomaly already correctly owned by runtime/live evidence systems
```

The inclusion threshold is semantic and reviewed.

SYS-52 does not automatically ingest every failed tool call.

---

## 5. Immediate capture rule

SimCore already requires suspicious real-world anomalies to be preserved before unrelated work continues.

SYS-52 applies the same discipline to operator/tooling process deviations.

Frozen flow:

```text
operator/tooling deviation observed
→ stop any unsafe continuation
→ preserve exact repository/tool facts
→ determine actual mutation scope
→ classify WATCH / DEFER / FIX / BLOCKER
→ contain or repair the immediate problem when required
→ record durable evidence reference
→ only then resume unrelated work
```

Important:

```text
first specimen is preserved immediately
recurrence is NOT required for capture
recurrence may affect future priority, not historical existence
```

A corrected specimen is not deleted.

Its resolution state is updated while the original event remains visible.

---

## 6. Disposition vocabulary

SYS-52 reuses the standing SimCore anomaly-disposition vocabulary:

```text
WATCH
DEFER
FIX
BLOCKER
```

### WATCH

A real process deviation or near-miss worth preserving, but no current corrective work is required.

Example shape:

```text
odd tool behavior observed
mutation = NONE
cause unresolved
safe to proceed
```

### DEFER

A real cleanup/process improvement is known, but it is intentionally not part of the current bounded work and does not block it.

### FIX

A concrete operating/document/repository mistake occurred and must be corrected before that local transaction is considered clean.

This may still be non-blocking for unrelated runtime work after containment.

### BLOCKER

The process deviation creates an unresolved authoritative stop condition for the active task/release/architecture transaction.

Examples can include:

```text
unknown production mutation
release-simcore identity no longer trustworthy
wrong branch/ref publication possibility unresolved
required evidence lost or contradictory
unsafe writer authority still active
```

SYS-52 records the disposition.

It does not invent BLOCKER authority when the owning gate/policy does not support it.

---

## 7. Resolution state is separate from disposition

A historical `FIX` must not disappear after repair.

Therefore each specimen records current resolution separately.

Frozen resolution vocabulary:

```text
OPEN
CONTAINED
CORRECTED
ACCEPTED_DEFERRED
CLOSED_WITH_EVIDENCE
```

Examples:

```text
FIX + CORRECTED
= mistake occurred and was repaired

DEFER + ACCEPTED_DEFERRED
= real cleanup remains intentionally parked

BLOCKER + OPEN
= active stop condition remains unresolved

WATCH + CLOSED_WITH_EVIDENCE
= preserved observation needs no current action
```

Disposition answers:

> what treatment did the event require?

Resolution answers:

> where is that event now?

Do not collapse the two axes.

---

## 8. Frozen error-family vocabulary

A specimen may use one primary reviewed family:

```text
PRECONDITION_ORDER_ERROR
WRONG_MUTATION_SURFACE
TOOL_SELECTION_ERROR
SELECTION_POINTER_DRIFT
SCOPE_BUNDLE_DRIFT
AUTHORITY_CONFUSION
EVIDENCE_CLAIM_ERROR
CLOSE_ORDER_ERROR
OTHER_REVIEWED
```

These families are indexing aids only.

They do not determine disposition automatically.

### PRECONDITION_ORDER_ERROR

An operation was attempted before its required branch/file/authority/precondition existed.

### WRONG_MUTATION_SURFACE

A write landed or was directed at a surface outside the intended transaction boundary.

### TOOL_SELECTION_ERROR

The selected operation/tool primitive did not match the intended bounded action and created a failed or unintended side effect.

### SELECTION_POINTER_DRIFT

A living NEXT/selection/current-work pointer contradicted the underlying classification/authority data.

### SCOPE_BUNDLE_DRIFT

The work began to mix a second objective, protected system change, or otherwise forbidden bundle.

This family records a specimen after the deviation exists; SYS-50 remains the preventive preflight.

### AUTHORITY_CONFUSION

The process treated the wrong branch/document/system as authority for a fact or mutation.

### EVIDENCE_CLAIM_ERROR

A durable claim exceeded the proof actually available and needed correction.

### CLOSE_ORDER_ERROR

A required close/sync/evidence step was skipped, performed out of order, or prematurely declared complete.

### OTHER_REVIEWED

Use only when the incident is genuinely outside the frozen families and the row explains why.

---

## 9. Canonical specimen row

A v1 specimen stores:

```text
Specimen ID
Date / observed-at
Work ID / objective ID when known
Primary error family
Disposition: WATCH / DEFER / FIX / BLOCKER
Resolution state
Execution source
Intended action
Observed deviation
Precondition / trigger context
Actual mutation summary
Exact mutated refs/paths when any
Runtime impact
release-simcore impact
Authority impact
Detection source
Immediate containment
Corrective action / deferred action
Durable evidence refs
Repository transaction refs when relevant
Recurrence key when reviewed
Notes / explicit non-claims
```

Recommended execution-source vocabulary:

```text
HUMAN_OPERATOR
DELEGATED_ASSISTANT
TOOL
AUTOMATION
MIXED
UNKNOWN
```

Execution source is descriptive only.

No per-source success rate, score, rank, or reliability profile is allowed.

---

## 10. Mutation facts are mandatory when repository work is involved

A process error can be severe even when mutation was blocked, and harmless-looking even after a real write occurred.

Therefore the row must distinguish:

```text
attempted mutation
actual mutation
contained mutation
runtime mutation
release-simcore mutation
```

Minimum repository mutation vocabulary:

```text
MUTATION_NONE
WORK_BRANCH_ONLY
MAIN_DOC_ADMIN_ONLY
MAIN_NONRUNTIME_EXECUTABLE
RELEASE_CONTROL_SURFACE
RELEASE_SIMCORE_RUNTIME
UNKNOWN_REVIEW_REQUIRED
```

This vocabulary describes where mutation actually landed.

It is not itself a severity scale.

Examples:

```text
404 before branch creation
→ MUTATION_NONE

accidental noop.tmp on main, then deleted
→ MAIN_DOC_ADMIN_ONLY
→ runtime impact NONE
→ release-simcore impact NONE

selection pointer typo in living docs
→ MAIN_DOC_ADMIN_ONLY
→ runtime impact NONE
```

If mutation cannot be established:

```text
UNKNOWN_REVIEW_REQUIRED
```

and the owning authority decides whether that uncertainty blocks continued work.

---

## 11. Evidence requirements

A specimen is not freehand folklore.

At least one durable evidence reference is required when available:

```text
commit SHA / compare
PR / issue / review thread
GitHub/tool failure record summarized in a durable evidence doc
release evidence doc
selection-drift correction doc
current/deferred ledger entry
workflow run / job receipt
```

If the original raw tool response cannot itself live in the repository, the durable evidence document records the bounded facts necessary to audit the event.

Do not preserve credentials, secrets, private tokens, or unnecessary raw command/environment material.

---

## 12. Initial known specimen set

SYS-52 is justified by already-preserved real events.

The future v1 ledger should seed at least these reviewed specimens.

### OE-R2-1 — work-branch precondition missing

Source authority:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md
```

Observed fact:

```text
R2_1_OPERATOR_POLICY_PREWRITE_BRANCH_MISSING
= FIX / TOOLING / PREWRITE / NON_RUNTIME
attempted write returned 404 before intended work branch existed
repository mutation = NONE
```

Suggested family:

```text
PRECONDITION_ORDER_ERROR
```

Resolution:

```text
CORRECTED
```

### OE-R2-2 — accidental main noop marker

Source authority:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md
```

Observed fact:

```text
R2_1_OPERATOR_POLICY_ACCIDENTAL_MAIN_NOOP_MARKER
= FIX / TOOLING / MAIN_ADMIN_ONLY / NO_RUNTIME_IMPACT
noop.tmp briefly created on main
immediately deleted in the next main commit
release-simcore impact = NONE
```

Suggested family:

```text
TOOL_SELECTION_ERROR
or WRONG_MUTATION_SURFACE
```

The future ledger must pick one reviewed primary family and may mention the secondary interpretation in notes.

Resolution:

```text
CORRECTED
```

### OE-SYS-24 — selection edge omission

Source authority:

```text
docs/SIMCORE_SYSTEM_IDEA_SELECTION_DRIFT_FIX_SYS24_2026-08-26.md
```

Observed fact:

```text
SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24
= FIX / DOC_DRIFT / NON_RUNTIME / NON_BLOCKING
inventory row remained I4/D2/NOW
selection block omitted SYS-24
```

Suggested family:

```text
SELECTION_POINTER_DRIFT
```

Resolution:

```text
CORRECTED
```

These seeds are examples of process-regression memory.

They do not imply the future ledger is limited to documentation-only mistakes.

---

## 13. Relationship to `SIMCORE_DEFERRED_LEDGER.md`

The current Deferred / Error Ledger is broad additive memory for runtime/live validation anomalies, deferred checks, and some process-regression notes.

SYS-52 creates a narrower operator/tooling specimen index.

Frozen division:

```text
SIMCORE_DEFERRED_LEDGER
= current additive validation/deferred/watch memory

SYS-52 future ledger
= compact operator/tooling process-regression specimens
```

When a process error is relevant to current continuity, Deferred may retain a short pointer.

The detailed reusable operator specimen belongs to SYS-52 once applied.

Do not delete historical evidence from Deferred merely to deduplicate presentation.

---

## 14. Relationship to SYS-35 Repository Transaction Ledger

SYS-35 answers:

```text
which meaningful repository transactions occurred and how are they related?
```

SYS-52 answers:

```text
which reviewed operator/tooling deviations occurred, what did they actually mutate, and how were they contained?
```

A transaction may be perfectly healthy and still appear in SYS-35 only.

An operator error may have:

```text
mutation = NONE
```

and therefore have no meaningful repository transaction to index.

When an error did create/repair repository transactions, SYS-52 links to SYS-35/Git identities rather than duplicating exact transaction authority.

---

## 15. Relationship to SYS-46 / SYS-50 / SYS-08

### SYS-46 Canonical Task Card

SYS-46 freezes the intended bounded work before execution.

SYS-52 records a specimen when execution materially departs from that intended boundary.

```text
intended task contract
→ SYS-46

observed process deviation
→ SYS-52
```

SYS-52 never authorizes a task amendment.

### SYS-50 Work Bundling Conflict Detector

SYS-50 is preventive:

```text
planned bundle
→ conflict disposition
```

SYS-52 is historical/reviewed:

```text
actual scope-bundle deviation
→ preserved specimen
```

A SYS-52 `SCOPE_BUNDLE_DRIFT` row does not mean SYS-50 failed unless evidence actually establishes that relationship.

### SYS-08 Work-Item Close Receipt

A close receipt may link unresolved or corrected operator specimens relevant to that work item.

SYS-52 does not close the work item itself.

---

## 16. Relationship to SYS-21 and product anomalies

SYS-21 asks whether forensic classification is consistent with cited evidence/proof/impact.

SYS-52 does not replace that review.

If an operator mistake causes an actual runtime defect:

```text
operator/process specimen
→ SYS-52

runtime symptom / product classification / live impact
→ owning runtime/live evidence systems
```

The two records may cross-link.

Do not reduce a deployed product defect to merely “operator error” and thereby bypass product FIX/BLOCKER handling.

Likewise, do not label a harmless operator near-miss as a product defect when runtime/release evidence says impact NONE.

---

## 17. Relationship to future SYS-16 recurrence correlator

SYS-52 may record a reviewed optional:

```text
recurrenceKey
```

Example:

```text
BRANCH_PRECONDITION_ORDER
WRONG_MAIN_MUTATION_SURFACE
LIVING_SELECTION_POINTER_DRIFT
```

SYS-52 itself does not count, cluster, correlate, or escalate recurrence.

Future SYS-16 owns recurrence/correlation semantics if frozen.

Therefore:

```text
same recurrenceKey appears twice
!= automatic FIX
!= automatic BLOCKER
```

---

## 18. No blame or actor scoring

The ledger exists to improve the operating system, not rank people or agents.

Forbidden v1 fields/outputs:

```text
operator accuracy score
assistant reliability score
mistakes per person
leaderboard
blame percentage
punitive ranking
personality inference
competence inference
```

A specimen should focus on:

```text
conditions
intended action
actual deviation
mutation facts
containment
prevention value
```

not personal judgment.

---

## 19. No automatic severity from mutation surface

Examples:

```text
MAIN_DOC_ADMIN_ONLY
!= automatically harmless

MUTATION_NONE
!= automatically WATCH

RELEASE_CONTROL_SURFACE
!= automatically BLOCKER
```

A no-mutation precondition error can reveal a serious unsafe workflow.

A tiny main doc mutation can misroute future work.

A protected-surface touch may be fully contained before authority changes.

Disposition must come from reviewed context and owning authority.

---

## 20. No auto-remediation

SYS-52 never performs:

```text
git reset
branch deletion
file deletion
PR close
workflow cancellation
release rollback
state rewrite
pointer rewrite
fixture cleanup
```

The specimen records what happened and points to the bounded corrective transaction.

Actual repair remains owned by the applicable work/repository/release authority.

---

## 21. v1 row example

```text
Specimen ID: OE-SYS-24
Date: 2026-08-26
Work: system-idea design sweep
Family: SELECTION_POINTER_DRIFT
Disposition: FIX
Resolution: CORRECTED
Execution source: DELEGATED_ASSISTANT
Intended action: select highest-priority remaining I4/D2/NOW idea
Observed deviation: living selection block omitted SYS-24 although classification row remained I4/D2/NOW
Mutation: MAIN_DOC_ADMIN_ONLY
Runtime impact: NONE
release-simcore impact: NONE
Detection: direct inventory-row versus selection-block comparison
Containment: stop SYS-52 progression; preserve drift evidence; restore ordering
Correction: freeze SYS-24 first and resynchronize living pointers
Evidence: docs/SIMCORE_SYSTEM_IDEA_SELECTION_DRIFT_FIX_SYS24_2026-08-26.md
Recurrence key: LIVING_SELECTION_POINTER_DRIFT
Non-claim: no runtime/product defect established
```

The future ledger may use a Markdown table plus detail blocks, provided no semantic field is lost.

---

## 22. Update lifecycle

Normal specimen lifecycle:

```text
OBSERVED
→ CAPTURED
→ DISPOSITION REVIEWED
→ CONTAINED / CORRECTED / ACCEPTED_DEFERRED
→ CLOSED_WITH_EVIDENCE when appropriate
```

The historical event remains immutable in meaning.

Later evidence may append:

```text
better root cause
new recurrence link
stronger/weaker impact evidence
corrective transaction identity
```

but must not silently rewrite the fact that the event occurred.

If an earlier attribution is disproven, preserve the old attribution as superseded and record the correction.

---

## 23. Review triggers

Review or add SYS-52 specimens when:

```text
an unintended branch/path mutation is detected
an operation targets the wrong authority surface
a write fails because a required work precondition was skipped
current/NEXT selection drift is discovered
an unrelated protected change begins entering a product task
an evidence claim is retracted because proof was insufficient
a close/sync step is discovered missing after completion was claimed
an old operator/tooling mistake naturally recurs
```

Do not force artificial failures merely to populate the ledger.

---

## 24. Relationship to current v0.64.7 gate

SYS-52 is non-runtime process memory.

Current production remains:

```text
v0.64.7 Cross-Reload Cache Observer Continuity
validation = PENDING_REAL_LONG_CHAT
scenario = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

SYS-52 does not close, alter, or bypass that gate.

The physical architecture sequence remains:

```text
close v0.64.7 real-long-chat gate
→ classify PASS / WATCH / FIX / BLOCKER
→ only then physical M2-3 implementation
```

System-design work may continue in parallel because it is a separate non-runtime design sweep.

---

## 25. Application boundary

This transaction freezes design only.

Not performed here:

```text
create docs/SIMCORE_OPERATOR_ERROR_SPECIMEN_LEDGER.md
migrate existing specimens into a new living ledger
add tooling
change CI
change workflows
change repository writers
change release-simcore
change plugin bytes
change runtime version
```

Future application is a separate bounded `NR_DOC_ONLY` transaction after the active design-sweep hold opens or priority explicitly changes.

---

## 26. Acceptance criteria

SYS-52 design is frozen when all are true:

```text
[x] specimen inclusion threshold defined
[x] WATCH / DEFER / FIX / BLOCKER preserved
[x] resolution state separated from disposition
[x] operator/tooling error families defined
[x] mutation facts explicitly represented
[x] durable evidence requirement defined
[x] existing real specimens identified
[x] Deferred Ledger boundary defined
[x] SYS-35 boundary defined
[x] SYS-46/SYS-50/SYS-08 boundaries defined
[x] SYS-21/product-anomaly boundary defined
[x] future SYS-16 recurrence boundary defined
[x] actor scoring/blame prohibited
[x] auto severity prohibited
[x] auto remediation prohibited
[x] application form classified NR_DOC_ONLY
[x] runtime/release authority unchanged
```

Open design questions:

```text
0
```

---

## 27. Frozen verdict

```text
SYS-52 OPERATOR ERROR SPECIMEN LEDGER
= DESIGN FROZEN
= NON_RUNTIME
= NR_DOC_ONLY
= REVIEWED PROCESS-REGRESSION MEMORY
= WATCH / DEFER / FIX / BLOCKER PRESERVED
= RESOLUTION STATE SEPARATE
= MUTATION FACTS REQUIRED
= NO BLAME / NO ACTOR SCORING
= NO AUTO CLASSIFICATION
= NO RECURRENCE ENGINE
= NO REPO WRITER
= NO RUNTIME CHANGE
= APPLICATION HOLD
```

Canonical rule:

> Preserve the operating mistake as evidence of a process condition, not as a judgment about the operator.

> Record what was intended, what actually happened, what was mutated, how it was contained, and which authority owns any remaining action.
