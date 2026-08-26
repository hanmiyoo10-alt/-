# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · CURRENT GATE-OPEN DESIGN SWEEP CLOSED · APPLY QUEUES MAY RESUME · NO RUNTIME CHANGE`

Purpose: reduce context switching by finishing every currently gate-open SimCore idea design before starting additional document-only preparation, SAFE_NON_RUNTIME harvest, or other implementation/application work.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md`
- `docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md`
- `docs/SIMCORE_HISTORY_FRONTIER_CONFIDENCE_SURFACE_DESIGN.md`

---

## 1. Core operating decision

Canonical priority:

```text
currently gate-open ideas
→ finish full design one item at a time
→ DESIGN FROZEN
→ perform required apply-class verdict at freeze time
→ continue to next gate-open design
→ close the current design sweep
→ only then process eligible apply/harvest queues
```

This is an operating-priority rule, not a change to Runtime Class, difficulty, importance, or gate semantics.

---

## 2. What counts as a design sweep

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

## 3. Per-idea rule

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

## 4. Freeze-time classification

For RUNTIME ideas:

```text
DOC_APPLICABLE
or
DOC_NOT_REQUIRED
```

For NON_RUNTIME ideas:

```text
NR_DOC_ONLY
NR_EXECUTABLE
NR_PROTECTED
```

Actual application/implementation remains a separate transaction.

---

## 5. Current sweep result — 2026-08-26

Current gate-open NON_RUNTIME design:

```text
NONE
```

The bounded gate-open RUNTIME sweep completed:

```text
S-03 Diagnostic Copy Profiles
→ DESIGN FROZEN
→ DOC_NOT_REQUIRED
→ docs/SIMCORE_DIAGNOSTIC_COPY_PROFILES_DESIGN.md

S-07 Host Capability Receipt
→ DESIGN FROZEN
→ DOC_NOT_REQUIRED
→ docs/SIMCORE_HOST_CAPABILITY_RECEIPT_DESIGN.md

S-08 History Frontier Confidence Surface
→ DESIGN FROZEN
→ DOC_NOT_REQUIRED
→ docs/SIMCORE_HISTORY_FRONTIER_CONFIDENCE_SURFACE_DESIGN.md
```

Result:

```text
CURRENT GATE-OPEN DESIGN = NONE
CURRENT DESIGN SWEEP = CLOSED
```

Gated/future ideas remain correctly gated and do not invalidate this closure.

---

## 6. Apply queues after sweep closure

The design-sweep hold is now released.

Current R document-only queue:

```text
S-04 Live Evidence Packet Builder
→ DOC_APPLICABLE
→ repository evidence-review / classification-handoff template
→ eligible for separate R_PREP_NON_RUNTIME work
```

S-03/S-07/S-08 are `DOC_NOT_REQUIRED` and add no prep items.

Current NR harvest queue:

```text
EMPTY
```

Runtime core implementation remains parked until stabilization regardless of sweep closure.

---

## 7. Next incremental sweep trigger

A new design sweep starts only when a legitimate gate opens, e.g.:

```text
v0.64.7 live gate close + M2 progression
→ POST_M2_3 ideas may become designable

R2.1 genuine release proof
→ dependent NR design may become designable

new direct evidence
→ EVIDENCE-gated idea may become designable

external authoritative receipt
→ EXTERNAL-gated idea may become designable
```

Do not pull gated/future items forward solely because the current sweep is closed.

---

## 8. Production boundary

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
v0.64.7 LIVE GATE    = STILL PENDING
```

---

## 9. Current verdict

```text
DESIGN SWEEP FIRST
= SATISFIED FOR CURRENT GATE-OPEN POOL

S-03 = FROZEN / DOC_NOT_REQUIRED
S-07 = FROZEN / DOC_NOT_REQUIRED
S-08 = FROZEN / DOC_NOT_REQUIRED

CURRENT GATE-OPEN DESIGN = NONE
CURRENT DESIGN SWEEP = CLOSED

NEXT ELIGIBLE NON-RUNTIME APPLICATION
= S-04 R_PREP_NON_RUNTIME
```
