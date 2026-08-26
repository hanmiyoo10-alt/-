# SimCore Design Sweep First Policy — 2026-08-26

Status: `CANONICAL CURRENT-PHASE OPERATING PRIORITY · SYSTEM-IDEA INCREMENTAL DESIGN SWEEP ACTIVE · SYS-19 FROZEN · APPLY QUEUES HELD · NO RUNTIME CHANGE`

Purpose: reduce context switching by finishing every currently selected gate-open SimCore idea design before starting additional document-only preparation, SAFE_NON_RUNTIME harvest, or other implementation/application work.

Related authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md`

---

## 1. Core operating decision

Canonical priority:

```text
currently gate-open selected idea pool
→ finish full design one item at a time
→ DESIGN FROZEN
→ perform required apply-class verdict at freeze time
→ continue to next gate-open design
→ close that bounded design sweep
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
Do not implement an idea in the same transaction as its design freeze.

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

## 5. Previously completed bounded sweep

The earlier original 31-idea gate-open sweep remains closed:

```text
S-03 Diagnostic Copy Profiles
→ DESIGN FROZEN / DOC_NOT_REQUIRED

S-07 Host Capability Receipt
→ DESIGN FROZEN / DOC_NOT_REQUIRED

S-08 History Frontier Confidence Surface
→ DESIGN FROZEN / DOC_NOT_REQUIRED
```

Previously eligible apply work was also consumed:

```text
S-04 Live Evidence Packet Builder
→ DOC_APPLIED
→ R_PREP_NON_RUNTIME COMPLETE

original NR Difficulty 1/2/3 bounded harvest queues
→ COMPLETE / EMPTY

four-item permanent fixture expansion
→ COMPLETE
```

Those closures remain valid.

---

## 6. Current system-idea incremental sweep

A new system/operations candidate pool was added under the unified SimCore idea classification.
This legitimately opens a new design sweep without reopening gated runtime architecture work.

First selected item:

```text
SYS-19 Live-Gate Handoff Packet
Size          = SMALL
Importance    = 5
Difficulty    = 1
Runtime Class = NON_RUNTIME
Design        = FROZEN
Apply Class   = NR_DOC_ONLY
Design doc    = docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md
```

Current system candidate state:

```text
TOTAL SYSTEM IDEAS = 52
FROZEN              = 1
OPEN NOW            = 39
GATED/DEPENDENCY    = 12
```

Current highest-priority open edge:

```text
I5 / D2 / NOW
SYS-01 Living Authority Map
SYS-08 Work-Item Close Receipt
SYS-10 Stale Next-Action Scanner
SYS-48 Gate-Blocked Reason Surface
SYS-51 Close-Step Trigger Matrix
```

Downstream-leverage selection:

```text
NEXT = SYS-01 Living Authority Map
```

---

## 7. Apply/harvest hold during this sweep

SYS-19 is `NR_DOC_ONLY`, so a later useful application can materialize the living current-gate handoff document.

However:

```text
SYS-19 APPLICATION
= HOLD FOR CURRENT SYSTEM DESIGN SWEEP
```

Do not materialize SYS-19 in the same transaction as its freeze.
Do not interrupt the current one-by-one design sweep merely because an early frozen NR item is easy to apply.

The same rule applies to later frozen SYS items: classify at freeze, then hold application until the selected bounded system design sweep is explicitly closed or the user deliberately changes operating priority.

---

## 8. Gate interaction

The system-idea sweep does not alter production/runtime gates.

Current production gate remains:

```text
v0.64.7
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
PENDING_REAL_LONG_CHAT
M2-2
```

If the user supplies live evidence while the system-idea sweep is active, live evidence classification takes operational precedence, and the close-step routine must update all resulting gates/queues before design work resumes.

POST_M2_3/POST_M2_4/EVIDENCE/EXTERNAL system ideas remain gated regardless of score.

---

## 9. Production boundary

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
ORIGINAL GATE-OPEN IDEA SWEEP
= CLOSED

SYSTEM-IDEA INCREMENTAL SWEEP
= ACTIVE

SYS-19
= DESIGN FROZEN / NR_DOC_ONLY / APPLICATION HELD

CURRENT NEXT DESIGN
= SYS-01 Living Authority Map

CURRENT SYSTEM APPLY/HARVEST
= HOLD UNTIL SWEEP CLOSE OR EXPLICIT PRIORITY CHANGE
```
