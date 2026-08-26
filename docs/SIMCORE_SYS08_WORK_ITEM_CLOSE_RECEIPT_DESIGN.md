# SYS-08 — Work-Item Close Receipt — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-08
Idea          = Work-Item Close Receipt
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

Direct parent operating contracts:
- `docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`

Related frozen system design:
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`

---

## 1. Problem

SimCore now has an explicit task-close routine and a frozen trigger matrix that selects which `RT-01 ... RT-12` surfaces must be evaluated for a work transaction.

Without a bounded close receipt, however, a later session may still need to reconstruct the close result from several places:

```text
what work actually completed?
which close surfaces were evaluated?
what verification really ran?
did an anomaly appear?
was production changed or verified unchanged?
which living authorities were synchronized?
did a gate open or remain closed?
what became the canonical NEXT?
```

The repository already preserves detailed design, implementation evidence, CI results, live specimens, release receipts, and progress authorities. SYS-08 must not duplicate those artifacts.

SYS-08 therefore defines one compact **work-item close receipt** that records the bounded closure facts and points to the detailed authorities that prove them.

---

## 2. Core invariant

```text
Work-Item Close Receipt
= bounded closure summary + authority pointers
!= detailed evidence
!= transaction ledger
!= current-state authority
!= automatic classifier
```

The receipt answers:

> What did this bounded work item conclude, what close surfaces were actually evaluated, where is the proof, and what is the legitimate next operation at the moment of close?

It does not re-prove the work.

---

## 3. Relationship to SYS-51

SYS-51 selects the close surfaces.
SYS-08 records their actual evaluation.

```text
primary work type
+ event overlays
→ SYS-51 selected RT set
→ perform selected RT evaluations
→ SYS-08 receipt records actual results
```

SYS-08 must not copy the entire trigger matrix into every receipt.

Required trigger-selection identity in the receipt is bounded to:

```text
Primary work type: WT-xx
Observed overlays: EV-xx list or NONE
Selected RT surfaces: RT-xx list
```

If SYS-51 resolves `TRIGGER_SET_BLOCKED`, the receipt may record the blocked work outcome but may not pretend the close routine completed cleanly.

---

## 4. Relationship to SYS-01

SYS-01 tells the operator where each affected living authority is located.

SYS-08 may point to those authority paths, but it must not duplicate their current values merely for convenience.

Example:

```text
Living authority synchronization:
- docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md — UPDATED
- docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md — UPDATED
```

Do not copy the full current queue or production manifest into the receipt when a pointer and bounded result are sufficient.

---

## 5. Relationship to existing evidence / SYS-35

### Existing evidence

Detailed evidence remains authoritative in its natural source:

```text
design proof          → frozen design doc
implementation proof  → implementation evidence / diff / merge
verification proof    → CI/static/focused-test evidence
live proof            → real-chat specimen / reviewed diagnostic
release proof         → release receipt / release-simcore identity
```

SYS-08 records references to those sources.
It does not copy their full contents.

### SYS-35 Repository Transaction Ledger

SYS-08 may include bounded branch/PR/merge references when relevant, but does not create a repository-wide transaction history.

```text
SYS-08
= one work item's close result

SYS-35
= cross-work repository transaction lineage/navigation
```

A central append-only work log is explicitly outside SYS-08 v1.

---

## 6. v1 implementation form

The useful v1 implementation is a **document contract/template**, conceptually:

```text
docs/SIMCORE_WORK_ITEM_CLOSE_RECEIPT_TEMPLATE.md
```

No generator, database, JSON schema, CI hook, GitHub Action, repository writer, or background automation is required for v1.

### Receipt placement rule

Do not create a new standalone file for every small task by default.

Preferred sink order:

```text
1. existing canonical implementation/evidence/closure document
   → include one `Work-Item Close Receipt` section

2. existing bounded task-progress/administrative authority when that is the natural durable artifact
   → include one compact receipt block

3. dedicated close-receipt document
   → only when the substantive task has no natural durable closure artifact
```

Do not retrofit historical frozen documents merely to normalize old work.
Apply the receipt contract prospectively after v1 materialization.

---

## 7. Receipt schema

A v1 receipt contains exactly these top-level sections.

### 7.1 Work identity

```text
Work ID / title
Date
Primary work type (WT-xx)
Bounded objective
Primary design/plan authority
```

Do not encode a second roadmap or issue tracker.

### 7.2 Work outcome

Allowed values:

```text
COMPLETED
BLOCKED
SUPERSEDED
STOPPED
```

`BLOCKED` means the work could not legitimately complete.
`SUPERSEDED` means another bounded transaction/result replaced it before close.
`STOPPED` covers an explicit bounded halt that is neither a successful completion nor an unresolved blocker.

The receipt must include one short reason for any non-`COMPLETED` outcome.

Work outcome is distinct from live/runtime PASS/WATCH/FIX/BLOCKER classification.

### 7.3 Trigger selection

```text
Primary work type: WT-xx
Observed event overlays: EV-xx / NONE
Selected RT surfaces: RT-xx list
Trigger-set state: READY / ESCALATED / BLOCKED
```

Use SYS-51 vocabulary exactly.

### 7.4 Close-surface results

Record only selected RT surfaces.

Each row:

```text
RT ID
Evaluation state: DONE / BLOCKED
Bounded native result
Authority/evidence refs
```

Example:

```text
RT-04 | DONE | production boundary VERIFIED_UNCHANGED | release-simcore latest/install refs
RT-08 | DONE | CI PASS; focused standalone execution NOT CLAIMED | CI + verification-WATCH refs
RT-10 | DONE | PR MERGED; no auto-close action | PR/merge refs
```

Rules:
- preserve surface-native vocabulary when one exists;
- do not invent a universal PASS token for all RTs;
- `DONE` means the evaluation occurred, not that the underlying subject is healthy;
- `BLOCKED` must name the unresolved authority/evidence dependency.

### 7.5 Verification summary

Include only when verification occurred or a verification claim is material.

```text
Executed:
- <specific static/test/CI/live control>

Observed result:
- PASS / FAIL / bounded native result

Not claimed:
- <focused/direct/live proof not actually executed>
```

This section must obey RT-08 verification-claim honesty.

A generic green workflow may not be rewritten as focused semantic proof.

### 7.6 Anomaly / forensic summary

```text
New anomaly: NONE / PRESENT
Disposition: WATCH / DEFER / FIX / BLOCKER / NOT_APPLICABLE
Primary anomaly/evidence ref: <path/ref / NONE>
```

The receipt does not assign severity independently.
It records the reviewed disposition from the authoritative anomaly/evidence workflow.

### 7.7 Production boundary

Allowed receipt states:

```text
CHANGED_AS_AUTHORIZED
VERIFIED_UNCHANGED
NOT_MATERIAL
BLOCKED_UNVERIFIED
```

If material, include bounded identity refs rather than duplicated plugin bodies.

For `VERIFIED_UNCHANGED`, record enough reference to show the check actually occurred when the neutrality claim is important.

### 7.8 Living-authority synchronization

List only affected living authorities:

```text
<path/family> — UPDATED / REVIEWED_NO_CHANGE / BLOCKED
```

Do not list every living document mechanically.
Do not rewrite frozen/historical evidence.

### 7.9 Gate / queue consequence

```text
Gate consequence: UNCHANGED / OPENED / CLOSED / RECLASSIFIED / BLOCKED
Queue consequence: UNCHANGED / UPDATED / NEW_INCREMENTAL_SWEEP / EMPTY / BLOCKED
Refs: <living authority refs>
```

The receipt records the result of RT-02/RT-11 evaluation; it does not decide gates by itself.

### 7.10 Canonical next operation

Exactly one primary next operation:

```text
NEXT: <one bounded legitimate operation>
```

Optional conditional alternatives are allowed only when a named external/live/gate condition controls them.

This field is a **point-in-time receipt** of RT-12.
It does not remain a living NEXT authority forever.

### 7.11 Receipt completeness

Receipt completeness is separate from work outcome.

Allowed values:

```text
CLOSE_RECEIPT_COMPLETE
CLOSE_RECEIPT_BLOCKED
```

A work item with outcome `BLOCKED` may still have `CLOSE_RECEIPT_COMPLETE` when the blocker and all required close evaluations are faithfully recorded.

`CLOSE_RECEIPT_BLOCKED` means the receipt itself cannot be completed because required close facts/authorities are unresolved.

---

## 8. Point-in-time / immutability rule

A completed receipt is historical closure evidence.

```text
receipt NEXT
= next operation at close time
!= permanent current NEXT

receipt production boundary
= observed at close time
!= current production forever
```

Therefore:
- do not rewrite old receipts to current state;
- later work updates current living authorities instead;
- factual clerical corrections must be explicit and preserve the original point-in-time meaning;
- if the work result itself is later superseded, record that in the newer work's authority/receipt rather than silently rewriting history.

This prevents the receipt layer from becoming another living-state synchronization burden.

---

## 9. Boundedness rules

A receipt must remain compact.

Forbidden payloads:

```text
full diagnostic copy
raw chat bodies
full PR diff
full CI logs
full plugin bytes
large fixture contents
copied design sections
generated Evidence Index rows
unbounded historical recap
```

Prefer:

```text
result token
short bounded rationale
path / commit / PR / CI / specimen refs
```

The receipt is navigation and closure evidence, not archival duplication.

---

## 10. Failure model

### CLOSE_RECEIPT_COMPLETE

Use when:
- work outcome is stated;
- SYS-51 trigger selection is resolvable;
- every selected RT surface is recorded as `DONE` or explicitly `BLOCKED`;
- material verification/anomaly/production/gate facts have authoritative references;
- one point-in-time NEXT is recorded.

### CLOSE_RECEIPT_BLOCKED

Use when:
- primary work type cannot be resolved;
- selected RT set is ambiguous;
- a material claimed result lacks authority/evidence and cannot be downgraded honestly;
- current gate/production/transaction identity required for close cannot be resolved without guessing.

Behavior:

```text
do not fabricate missing result
→ preserve blocker
→ repair/resolve authority if bounded
→ otherwise close the work as BLOCKED with receipt blocker explicit
```

---

## 11. Hard boundaries

SYS-08 must never become:

```text
second Evidence Index
second CURRENT_DEVELOPMENT
second product manifest
repository transaction ledger
incident database
CI result database
raw diagnostic archive
GitHub/repository writer
automatic PASS/WATCH/FIX/BLOCKER classifier
automatic gate opener
automatic NEXT authority
background task monitor
```

The receipt records reviewed outputs from existing authorities.
It creates no new semantic authority.

---

## 12. Verification plan for later NR_DOC_ONLY application

When the template is materialized, review at least these controls:

```text
1. one completed design-only task can produce a bounded receipt
2. one branch/PR fixture/tool task records RT-10 refs without becoming SYS-35
3. verification summary distinguishes CI PASS from focused test NOT CLAIMED
4. live anomaly disposition is copied only from reviewed evidence authority
5. production-neutral work can say VERIFIED_UNCHANGED only when RT-04 actually checked it
6. point-in-time NEXT is not advertised as a permanent living authority
7. blocked work can still have CLOSE_RECEIPT_COMPLETE when the blocker is faithfully recorded
8. receipt never embeds raw chat / full CI logs / plugin bytes / full PR diffs
9. historical receipts are not rewritten by later current-state changes
10. no runtime/plugin/release/CI/repo-writer behavior changes
```

No real long-chat validation is required solely for SYS-08.

---

## 13. Unified classification freeze verdict

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
- the useful v1 is a receipt contract/template plus procedural use;
- existing detailed authorities already contain the proof;
- no executable generator is required for the core value;
- no CI/release/repository-writer authority changes are required.

A future deterministic receipt generator would be a separate design revision or new NON_RUNTIME idea and must consume reviewed inputs rather than infer semantic truth.

---

## 14. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-08 here.
Materialization of the receipt template and prospective adoption are separate NR application work after the active system-design sweep closes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
