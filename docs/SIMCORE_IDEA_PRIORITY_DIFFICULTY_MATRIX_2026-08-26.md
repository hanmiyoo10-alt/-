# SimCore Idea Priority / Difficulty Matrix — 2026-08-26

Status: `MASTER IDEA PRIORITIZATION · DESIGN DIFFICULTY + RUNTIME CLASS · CURRENT GATE-OPEN DIFFICULTY-2 POOL CLOSED · NO RUNTIME CHANGE`

Purpose: rank the SimCore idea inventory by strategic importance, design difficulty, readiness gate, and expected implementation runtime class without conflating those axes.

Related authority:
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md` — current selection authority
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

This matrix remains the complete 31-item scoring/classification baseline. Current lane selection is governed by the NR/R split queue.

---

## 1. Axes

### Importance

```text
5 = VERY HIGH
4 = HIGH
3 = MEDIUM
2 = LOW
1 = VERY LOW
```

### Difficulty

```text
1 = VERY EASY
2 = EASY
3 = MODERATE
4 = HARD
5 = VERY HARD
```

Difficulty means effort to reach a complete frozen design, not implementation LOC.

### Runtime Class

```text
RUNTIME
= intended implementation participates in plugin/runtime behavior, diagnostics/UI/Host observation, prompt/state/persistence, or another versioned execution-path concern

NON_RUNTIME
= intended implementation lives in repository tooling, static analysis, indexes/catalogs, test/evidence infrastructure, build/release presentation, or other non-plugin execution surfaces
```

Important:

```text
NON_RUNTIME != SAFE_NON_RUNTIME_READY
```

### Design gate

```text
NOW
DEPENDENCY
POST_M2_3
POST_M2_4
EVIDENCE
EXTERNAL
FUTURE
FROZEN
implementation-bound gate
```

A closed gate always overrides importance/difficulty.

---

## 2. Canonical selection and harvest rules

```text
1. gate open
2. higher importance
3. lower difficulty
4. higher downstream leverage
```

Selected idea:

```text
SELECT
→ COMPLETE FULL DESIGN
→ DESIGN FROZEN
→ freeze-time apply classification
→ stop that idea's design work
```

After a currently designable NR difficulty tier closes:

```text
NON_RUNTIME
→ strict SAFE_NON_RUNTIME review
→ separate bounded implementation if eligible
```

RUNTIME items remain parked until stabilization.

---

# 3. Difficulty 1 — VERY EASY

| ID | Idea | Importance | Runtime Class | Gate / current state |
|---|---|---:|---|---|
| S-02 | Diagnostic Quick Summary | 5 | RUNTIME | FROZEN / runtime PARKED |
| S-09 | Evidence Index Entry Format | 5 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |

```text
RUNTIME 1 / NON_RUNTIME 1 / TOTAL 2
```

Current bounded tier state: `CLOSED`.

---

# 4. Difficulty 2 — EASY

| ID | Idea | Importance | Runtime Class | Gate / current state |
|---|---|---:|---|---|
| S-01 | MINI_WARNING_WIDGET_V1 | 4 | RUNTIME | FROZEN / runtime PARKED |
| S-03 | Diagnostic Copy Profiles | 3 | RUNTIME | FROZEN / runtime PARKED / DOC_NOT_REQUIRED |
| S-04 | Live Evidence Packet Builder | 5 | RUNTIME | FROZEN / runtime PARKED / DOC_APPLICABLE |
| S-05 | Reconcile Differential Receipt | 5 | RUNTIME | POST_M2_3 |
| S-06 | Persistence Footprint Watch | 2 | RUNTIME | EVIDENCE |
| S-07 | Host Capability Receipt | 3 | RUNTIME | FROZEN / runtime PARKED / DOC_NOT_REQUIRED |
| S-08 | History Frontier Confidence Surface | 2 | RUNTIME | FROZEN / runtime PARKED / DOC_NOT_REQUIRED |
| S-10 | Authority Drift Check / Scan | 5 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |
| S-11 | Stale PR Hygiene Classifier | 3 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |
| S-12 | Natural Evidence Corpus Index | 4 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |

```text
RUNTIME 7 / NON_RUNTIME 3 / TOTAL 10
```

Current bounded design state:

```text
CURRENTLY DESIGNABLE D2 POOL = CLOSED

FROZEN in current pool:
S-01
S-02 belongs D1
S-03
S-04
S-07
S-08
S-10
S-11
S-12

GATED OUTSIDE CURRENT D2 CLOSE:
S-05 POST_M2_3
S-06 EVIDENCE
```

The previous open design sweep ended when S-03, S-07 and S-08 froze. Gated S-05/S-06 start later incremental cycles when their gates open.

---

# 5. Difficulty 3 — MODERATE

| ID | Idea | Importance | Runtime Class | Gate / current state |
|---|---|---:|---|---|
| M-01 | Turn Transaction / Phase Receipt | 4 | RUNTIME | POST_M2_3 |
| M-02 | Ownership-aware Diagnostic Attribution | 3 | RUNTIME | POST_M2_3 |
| M-05 | Phase Performance Budget | 3 | RUNTIME | POST_M2_3 |
| M-08 | Snapshot Schema Inventory Generator | 4 | NON_RUNTIME | POST_M2_3 |
| M-10 | Live Diagnostic → Fixture Skeleton Generator | 4 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |
| M-11 | Architecture Dependency Snapshot Generator | 5 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |
| M-13 | Evidence Index Generator | 4 | NON_RUNTIME | FROZEN / SAFE_NON_RUNTIME_IMPLEMENTED |
| M-14 | Release Evidence Packet | 4 | NON_RUNTIME | DEPENDENCY: R2.1 genuine proof |
| M-15 | Fixture Coverage Matrix by Ownership | 4 | NON_RUNTIME | POST_M2_3 |

```text
RUNTIME 3 / NON_RUNTIME 6 / TOTAL 9
```

Completed bounded NR D3 pool:

```text
M-11 → IMPLEMENTED
M-10 → IMPLEMENTED
M-13 → IMPLEMENTED
→ CLOSED / HARVEST COMPLETE
```

Gated D3 items begin later incremental cycles.

---

# 6. Difficulty 4 — HARD

| ID | Idea | Importance | Runtime Class | Gate |
|---|---|---:|---|---|
| M-03 | Genuine Edit Rebuild Performance Study | 5 | RUNTIME | POST_M2_3 |
| M-04 | Store Write Cost / Commit Budget | 3 | RUNTIME | EVIDENCE |
| M-06 | State Invariant Snapshot | 4 | RUNTIME | POST_M2_4 |
| M-07 | Commit / Observation Separation Guard | 5 | NON_RUNTIME | POST_M2_4 |
| M-09 | Provider Cache Receipt Integration | 3 | RUNTIME | EXTERNAL |
| M-12 | State Writer Static Audit | 5 | NON_RUNTIME | POST_M2_3 |
| M-16 | Differential Architecture Fixtures | 5 | NON_RUNTIME | M2 implementation slice |
| M-17 | Pure State Seam | 3 | RUNTIME | FUTURE / TD-09 |

```text
RUNTIME 5 / NON_RUNTIME 3 / TOTAL 8
```

---

# 7. Difficulty 5 — VERY HARD

| ID | Idea | Importance | Runtime Class | Gate |
|---|---|---:|---|---|
| L-01 | Development-source Modular Build | 4 | NON_RUNTIME | FUTURE / POST_M2 |
| L-02 | Performance-aware SnapshotStore Evolution | 3 | RUNTIME | EVIDENCE / FUTURE |

```text
RUNTIME 1 / NON_RUNTIME 1 / TOTAL 2
```

`L-01` remains the canonical example that NON_RUNTIME does not mean small or safe to harvest.

---

# 8. Runtime-class master count

Across all 31 ideas:

```text
RUNTIME     = 17
NON_RUNTIME = 14
TOTAL       = 31
```

By difficulty:

```text
Difficulty 1: RUNTIME 1 / NON_RUNTIME 1
Difficulty 2: RUNTIME 7 / NON_RUNTIME 3
Difficulty 3: RUNTIME 3 / NON_RUNTIME 6
Difficulty 4: RUNTIME 5 / NON_RUNTIME 3
Difficulty 5: RUNTIME 1 / NON_RUNTIME 1
```

---

# 9. Interpretation by family

Typical RUNTIME families:

```text
Product UX rendered by SimCore runtime
Diagnostic/runtime observation receipts
Host capability/history surfaces
Runtime performance instrumentation/budgets
State/persistence runtime evolution
Provider receipt runtime integration
future semantic/runtime seams
```

Typical NON_RUNTIME families:

```text
repo evidence/index materialization
repo safety/static analysis
fixture/test generation infrastructure
architecture dependency/static writer audits
coverage matrices
release evidence presentation
build/source topology work
```

---

# 10. Current practical consequence

```text
CURRENT GATE-OPEN NR DESIGN = NONE
CURRENT NR HARVEST QUEUE = EMPTY

CURRENT GATE-OPEN R DESIGN = NONE
CURRENT DESIGN SWEEP = CLOSED

R DOC APPLY QUEUE
= S-04 repository evidence-review / classification-handoff template
```

Gated/future items remain gated regardless of score.

---

# 11. Reclassification rule

Runtime Class may change only when completed design/source inspection proves a materially different boundary.

Do not reclassify merely to make an item immediately implementable.

---

# 12. Verdict

```text
SIZE = scope breadth
IMPORTANCE = strategic value
DIFFICULTY = design-completion effort
RUNTIME CLASS = intended execution boundary
DESIGN GATE = whether complete design is legitimate now
HARVEST ELIGIBILITY = separate SAFE_NON_RUNTIME decision

CURRENT TOTAL = 17 RUNTIME / 14 NON_RUNTIME
CURRENT GATE-OPEN DESIGN SWEEP = CLOSED
```
