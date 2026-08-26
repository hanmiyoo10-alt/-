# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · S-03 FROZEN · DESIGN FIRST · APPLY LATER · NO RUNTIME CHANGE`

Purpose: reduce context switching by finishing every currently gate-open SimCore idea design before starting additional document-only preparation, SAFE_NON_RUNTIME harvest, or other implementation/application work.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md`

---

## 1. Core operating decision

Current-phase work should minimize repeated switching between design and implementation/application.

Canonical priority:

```text
currently gate-open ideas
→ finish full design one item at a time
→ DESIGN FROZEN
→ perform required apply-class verdict at freeze time
→ DO NOT immediately apply/implement the ancillary slice
→ continue to next gate-open design
→ close the current design sweep
→ only then process eligible apply/harvest queues
```

This is an operating-priority rule, not a change to Runtime Class, difficulty, importance, or gate semantics.

---

## 2. What counts as the current design sweep

The sweep contains only ideas whose design gate is legitimately open now.

Included:

```text
Gate = NOW
or an equivalent dependency/evidence gate already satisfied
```

Excluded from blocking sweep completion:

```text
POST_M2_3
POST_M2_4
EVIDENCE not yet satisfied
EXTERNAL not yet satisfied
FUTURE
implementation-bound dependency not yet satisfied
R2.1 genuine-proof dependency not yet satisfied
```

A gated idea is not falsely marked designed or frozen merely to make the sweep look complete.

When a gate later opens, that item enters a new incremental design sweep.

---

## 3. Per-idea rule during the sweep

For each selected idea:

```text
inspect source/contracts/evidence
→ settle full bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ record classification/applicability verdicts
→ STOP that idea
→ move to next gate-open idea
```

Do not leave several selected ideas half-designed.
Do not begin runtime implementation from a frozen R idea.

---

## 4. Freeze-time classification still happens

The sweep delays application, not classification.

For RUNTIME ideas, freeze-time review must assign:

```text
DOC_APPLICABLE
or
DOC_NOT_REQUIRED
```

For NON_RUNTIME ideas, freeze-time review must assign:

```text
NR_DOC_ONLY
NR_EXECUTABLE
NR_PROTECTED
```

when the design boundary is sufficiently known.

The actual document application / SAFE_NON_RUNTIME implementation waits until the current design sweep closes unless there is an explicit user override for a specific urgent work item.

---

## 5. Current sweep — 2026-08-26

Current gate-open NON_RUNTIME design:

```text
NONE
```

Runtime sweep progress:

```text
S-03 Diagnostic Copy Profiles
→ DESIGN FROZEN
→ DOC_NOT_REQUIRED
→ design authority: docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md

S-07 Host Capability Receipt
→ NEXT

S-08 History Frontier Confidence Surface
→ AFTER S-07
```

Remaining gate-open RUNTIME design:

```text
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

Canonical remaining order:

```text
1. S-07  importance 3 / difficulty 2
2. S-08  importance 2 / difficulty 2
```

Existing frozen R items do not need redesign:

```text
S-01 FROZEN
S-02 FROZEN
S-03 FROZEN
S-04 FROZEN
```

Existing completed NR items do not need redesign or rollback:

```text
S-09
S-10
S-11
S-12
M-10
M-11
M-13
```

---

## 6. Deferred apply queues during this sweep

The R document-only queue remains valid but secondary to the design sweep.

Current known item:

```text
S-04
→ DOC_APPLICABLE
→ repository evidence-review / classification-handoff template
→ HOLD UNTIL CURRENT DESIGN SWEEP CLOSES
```

S-03 is `DOC_NOT_REQUIRED` and adds no apply-queue item.

If S-07 or S-08 freezes as `DOC_APPLICABLE`, append it to the same later apply queue; do not implement the document slice inside its design work item.

Current NR harvest queue is empty.

---

## 7. Sweep-close transition

When S-07 and S-08 are both frozen:

```text
CURRENT DESIGN SWEEP = CLOSED
```

Then process non-runtime application work by its own authority:

```text
R DOC APPLY queue
→ DOC_APPLICABLE items only
→ separate bounded document transactions

NR harvest queue
→ only closed-tier + SAFE_NON_RUNTIME authorized items
→ apply class determines verification depth
```

Runtime core implementation remains parked until stabilization regardless of sweep closure.

---

## 8. Override rule

The user may explicitly select a specific urgent apply/implementation item before sweep close.

That is a deliberate override, not the default operating order.

Absent such an override:

```text
DESIGN SWEEP FIRST
```

remains the current priority.

---

## 9. Production boundary

This policy/status update changes repository planning only.

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
v0.64.7 LIVE GATE    = STILL PENDING
```

---

## 10. Current verdict

```text
CURRENT PHASE PRIORITY
= FINISH ALL CURRENTLY GATE-OPEN DESIGNS FIRST

S-03
= DESIGN FROZEN / DOC_NOT_REQUIRED / RUNTIME PARKED

NEXT DESIGN
= S-07 Host Capability Receipt

THEN
= S-08 History Frontier Confidence Surface

AFTER CURRENT SWEEP CLOSES
= process DOC_APPLICABLE / other eligible non-runtime application queues
```
