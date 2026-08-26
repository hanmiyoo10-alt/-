# SimCore Runtime Idea — Document-Only Applicability Classification — 2026-08-26

Status: `CANONICAL RUNTIME SUBCLASSIFICATION · DOC-ONLY APPLY AXIS · S-04 DOC_APPLIED · CURRENT DESIGN SWEEP CLOSED · NO RUNTIME CHANGE`

Purpose: classify RUNTIME ideas by whether a useful repository-document / durable-memory slice can be applied before plugin/runtime implementation.

Related authority:
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- `docs/SIMCORE_HISTORY_FRONTIER_CONFIDENCE_SURFACE_DESIGN.md`
- `docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md`
- `docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md`

This document does not change an idea's core Runtime Class. Every item listed here remains `RUNTIME` unless the main classification authority is separately changed for a substantive reason.

---

## 1. Canonical two-axis model

```text
CORE CLASS
= RUNTIME

DOC APPLY CLASS
= whether a separable non-executable repository-memory slice can be applied now
```

Canonical rule:

```text
RUNTIME idea
+ DOC_APPLICABLE / DOC_APPLIED
!= NON_RUNTIME idea
```

The runtime core remains parked until stabilization.

---

## 2. DOC APPLY status vocabulary

```text
DOC_APPLICABLE
= parent R design is FROZEN
= a useful separable document / durable-memory artifact exists
= the artifact passes R_PREP_NON_RUNTIME boundaries
= document-only application may proceed in a separate bounded work item

DOC_APPLIED
= the document-only preparation was actually applied and verified
= parent runtime core remains PARKED

DOC_NOT_REQUIRED
= parent R design is FROZEN
= the frozen design already contains sufficient durable memory
= another standalone document would duplicate information rather than reduce implementation risk

DOC_UNASSESSED
= parent R design is not yet FROZEN, or its gate is not yet open enough for a defensible document-only assessment
= do not guess whether a prep artifact will be useful
```

Do not use `DOC_APPLICABLE` merely because an idea happens to have a design document. The question is whether another independently useful repository artifact can be applied before runtime implementation.

---

## 3. Eligibility reminder

A `DOC_APPLICABLE` slice must remain strictly within the existing `R_PREP_NON_RUNTIME` policy.

Allowed examples:

```text
manual evidence-review template
classification-handoff template
operator checklist
non-executable field dictionary
manual intake form
static rollout checklist
cross-reference map
bounded durable-memory structure
```

Forbidden:

```text
plugin source
DOM/UI code
runtime formatter
Host reads/writes
state/schema consumed by runtime
runtime diagnostic behavior
Node/Python tooling
workflow/CI changes
release automation
version bump
release-simcore
```

If executable or reusable tooling is needed, stop and treat it as runtime implementation or a separately designed NON_RUNTIME idea.

---

## 4. Current R inventory classification

| ID | Idea | Importance | Difficulty | Core state | Doc Apply Class | Current doc-only disposition |
|---|---|---:|---:|---|---|---|
| S-02 | Diagnostic Quick Summary | 5 | 1 | FROZEN / runtime PARKED | DOC_NOT_REQUIRED | frozen design already contains sufficient field/binding/verification memory |
| S-04 | Live Evidence Packet Builder | 5 | 2 | FROZEN / runtime PARKED | DOC_APPLIED | `SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md` applied under R_PREP_NON_RUNTIME; runtime builder still parked |
| S-05 | Reconcile Differential Receipt | 5 | 2 | GATED POST_M2_3 | DOC_UNASSESSED | assess after design freeze |
| M-03 | Genuine Edit Rebuild Performance Study | 5 | 4 | GATED POST_M2_3 | DOC_UNASSESSED | assess after design freeze |
| S-01 | MINI_WARNING_WIDGET_V1 | 4 | 2 | FROZEN / runtime PARKED | DOC_NOT_REQUIRED | frozen design already contains sufficient durable-memory contract |
| M-01 | Turn Transaction / Phase Receipt | 4 | 3 | GATED POST_M2_3 | DOC_UNASSESSED | assess after design freeze |
| M-06 | State Invariant Snapshot | 4 | 4 | GATED POST_M2_4 | DOC_UNASSESSED | assess after design freeze |
| S-03 | Diagnostic Copy Profiles | 3 | 2 | FROZEN / runtime PARKED | DOC_NOT_REQUIRED | frozen profile/field/pair/transport design already supplies the needed durable-memory contract |
| S-07 | Host Capability Receipt | 3 | 2 | FROZEN / runtime PARKED | DOC_NOT_REQUIRED | frozen capability IDs/state/source/anti-probe contract already supplies durable memory; pre-runtime baseline would risk fabricated current facts |
| M-02 | Ownership-aware Diagnostic Attribution | 3 | 3 | GATED POST_M2_3 | DOC_UNASSESSED | assess after design freeze |
| M-05 | Phase Performance Budget | 3 | 3 | GATED POST_M2_3 | DOC_UNASSESSED | assess after design freeze |
| M-04 | Store Write Cost / Commit Budget | 3 | 4 | GATED EVIDENCE | DOC_UNASSESSED | assess after design freeze |
| M-09 | Provider Cache Receipt Integration | 3 | 4 | GATED EXTERNAL | DOC_UNASSESSED | assess after design freeze |
| M-17 | Pure State Seam | 3 | 4 | FUTURE / TD-09 | DOC_UNASSESSED | assess after future design freeze |
| L-02 | Performance-aware SnapshotStore Evolution | 3 | 5 | FUTURE / EVIDENCE | DOC_UNASSESSED | assess after future design freeze |
| S-08 | History Frontier Confidence Surface | 2 | 2 | FROZEN / runtime PARKED | DOC_NOT_REQUIRED | frontier claim contract + frozen S-08 design already contain claim-layer/evidence-strength/provenance ceilings; a current baseline would fabricate runtime facts |
| S-06 | Persistence Footprint Watch | 2 | 2 | GATED EVIDENCE | DOC_UNASSESSED | assess after design freeze |

Current counts:

```text
RUNTIME total       = 17
DOC_APPLICABLE      = 0
DOC_APPLIED         = 1
DOC_NOT_REQUIRED    = 5
DOC_UNASSESSED      = 11
```

---

## 5. Current document-only queue

The previously held S-04 document-only slice has been applied and verified.

```text
DOC APPLY QUEUE
= EMPTY

DOC_APPLIED
S-04 Live Evidence Packet Builder
→ docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md
→ evidence: docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

S-03, S-07, and S-08 add no document-only queue items. Their frozen designs already contain the independently useful durable-memory contracts; additional matrices/checklists would duplicate frozen semantics rather than prepare independent non-runtime work.

S-08 specifically must not create a pre-runtime per-host confidence baseline because that would manufacture current Host/history facts from design.

---

## 6. Mandatory freeze-time review

Every R idea that reaches `DESIGN FROZEN` must receive a same-work-item document-applicability verdict before stopping:

```text
R design complete
→ DESIGN FROZEN
→ runtime core PARKED
→ DOC APPLY review

if useful separable repo-memory artifact exists:
   DOC_APPLICABLE
else:
   DOC_NOT_REQUIRED
→ STOP
```

The actual doc-only application remains a later separate bounded transaction. Do not mix runtime idea design and prep implementation in one work item.

---

## 7. Status transition rules

```text
DOC_UNASSESSED
→ DESIGN FROZEN
→ DOC_APPLICABLE
   OR DOC_NOT_REQUIRED

DOC_APPLICABLE
→ separate R_PREP work item completed
→ DOC_APPLIED

DOC_APPLIED
→ runtime core still PARKED
```

If later design/evidence proves an applied document obsolete, preserve its history and update/supersede under normal repository-memory rules rather than pretending the runtime implementation had already happened.

---

## 8. Selection rule

The R lane has two parallel non-competing operations:

```text
R DESIGN QUEUE
→ currently empty for gate-open ideas
→ wait for a legitimate gate/dependency/evidence trigger

R DOC APPLY QUEUE
→ currently empty
→ future entries require DESIGN FROZEN + DOC_APPLICABLE
```

Current state:

```text
CURRENT GATE-OPEN R DESIGN
= NONE

CURRENT R DOC APPLY
= NONE

S-04 R_PREP_NON_RUNTIME
= COMPLETE / DOC_APPLIED
```

---

## 9. Production boundary

This classification changes repository administration only.

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
v0.64.7 LIVE GATE    = STILL PENDING
```
