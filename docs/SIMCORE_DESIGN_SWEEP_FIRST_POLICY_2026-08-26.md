# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · DESIGN FIRST · APPLY LATER · NO RUNTIME CHANGE`

Purpose: reduce context switching by finishing every currently gate-open SimCore idea design before starting additional document-only preparation, SAFE_NON_RUNTIME harvest, or other implementation/application work.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

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

The existing full-design requirement remains unchanged.

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

For RUNTIME ideas, freeze-time review must still assign:

```text
DOC_APPLICABLE
or
DOC_NOT_REQUIRED
```

under `SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`.

For NON_RUNTIME ideas, freeze-time review must still assign:

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

Current gate-open RUNTIME design:

```text
S-03 Diagnostic Copy Profiles
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

Canonical current design order remains the R-lane selection order:

```text
1. S-03  importance 3 / difficulty 2
2. S-07  importance 3 / difficulty 2
3. S-08  importance 2 / difficulty 2
```

Existing frozen R items do not need redesign:

```text
S-01 FROZEN
S-02 FROZEN
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

The existing R document-only queue remains valid but is temporarily secondary to the design sweep.

Current known item:

```text
S-04
→ DOC_APPLICABLE
→ repository evidence-review / classification-handoff template
→ HOLD UNTIL CURRENT DESIGN SWEEP CLOSES
```

If S-03, S-07, or S-08 freeze as `DOC_APPLICABLE`, append them to the same later apply queue; do not implement the document slice inside their design work item.

Current NR harvest queue is empty.

---

## 7. Sweep-close transition

When all currently gate-open ideas are frozen:

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

This policy changes repository planning only.

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

NEXT DESIGN
= S-03 Diagnostic Copy Profiles

THEN
= S-07 Host Capability Receipt
→ S-08 History Frontier Confidence Surface

AFTER CURRENT SWEEP CLOSES
= process DOC_APPLICABLE / other eligible non-runtime application queues
```
