# SimCore Idea Priority / Difficulty Matrix — 2026-08-26

Status: `MASTER IDEA PRIORITIZATION · DESIGN DIFFICULTY + RUNTIME CLASS · TIERED NON-RUNTIME HARVEST AWARE · NO RUNTIME CHANGE`

Purpose: rank the SimCore idea inventory by strategic importance, design difficulty, readiness gate, and expected implementation runtime class so the design queue and later non-runtime harvest can be reasoned about without conflating these axes.

Related authority:
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`

This matrix ranks **design selection**. `Runtime Class = NON_RUNTIME` does not by itself authorize immediate implementation; closed-tier harvest still requires the stricter `SAFE_NON_RUNTIME` gate.

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

Importance is current strategic value and may be re-scored only when material evidence/ownership/dependency changes.

### Difficulty

```text
1 = VERY EASY
2 = EASY
3 = MODERATE
4 = HARD
5 = VERY HARD
```

Difficulty means effort to reach a **complete frozen design**, not implementation LOC.

### Runtime Class

Exactly two top-level implementation classes are used:

```text
RUNTIME
= intended implementation changes or participates in plugin/runtime behavior,
  runtime diagnostics/UI/Host observation, prompt/state/persistence behavior,
  or another execution-path concern that requires versioned runtime treatment

NON_RUNTIME
= intended implementation lives in repository tooling, static analysis,
  indexes/catalogs, test/evidence infrastructure, build/release presentation,
  or other non-plugin execution surfaces
```

Important:

```text
NON_RUNTIME
!= SAFE_NON_RUNTIME_READY
```

A NON_RUNTIME item may still be ineligible for immediate harvest because it changes release workflow authority, repository writer behavior, CI policy, build topology, or another protected operational system.

The final runtime class may be corrected at design freeze if source inspection proves the candidate's actual implementation boundary differs from the inventory expectation.

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

Design selection:

```text
1. gate open
2. higher importance
3. lower difficulty
4. higher downstream leverage
```

Shorthand:

```text
HIGH IMPORTANCE + LOW DIFFICULTY + OPEN GATE
= FIRST
```

Selected idea:

```text
SELECT
→ COMPLETE FULL DESIGN
→ DESIGN FROZEN
→ stop that idea's design work
```

After a currently designable Difficulty tier closes:

```text
RUNTIME
→ PARKED FOR STABILIZATION

NON_RUNTIME
→ evaluate strict SAFE_NON_RUNTIME gate
→ eligible only if all harvest-policy restrictions pass
```

---

# 3. Difficulty 1 — VERY EASY

| ID | Idea | Importance | Runtime Class | Gate | Design state / priority |
|---|---|---:|---|---|---|
| S-02 | Diagnostic Quick Summary | 5 | RUNTIME | FROZEN | PARKED runtime product |
| S-09 | Evidence Index Entry Format | 5 | NON_RUNTIME | FROZEN | SAFE_NON_RUNTIME_READY after tier close |

Tier composition:

```text
RUNTIME     = 1
NON_RUNTIME = 1
TOTAL       = 2
```

Current tier state: `CLOSED`.

---

# 4. Difficulty 2 — EASY

| ID | Idea | Importance | Runtime Class | Gate | Design state / priority |
|---|---|---:|---|---|---|
| S-01 | MINI_WARNING_WIDGET_V1 | 4 | RUNTIME | FROZEN | PARKED runtime product |
| S-03 | Diagnostic Copy Profiles | 3 | RUNTIME | NOW | B2 |
| S-04 | Live Evidence Packet Builder | 5 | RUNTIME | FROZEN | PARKED runtime diagnostic/clipboard |
| S-05 | Reconcile Differential Receipt | 5 | RUNTIME | POST_M2_3 | GATED-HIGH |
| S-06 | Persistence Footprint Watch | 2 | RUNTIME | EVIDENCE | GATED-LOW |
| S-07 | Host Capability Receipt | 3 | RUNTIME | NOW | B2 |
| S-08 | History Frontier Confidence Surface | 2 | RUNTIME | NOW | C |
| S-10 | Authority Drift Check / Scan | 5 | NON_RUNTIME | FROZEN | harvest eligibility after tier close |
| S-11 | Stale PR Hygiene Classifier | 3 | NON_RUNTIME | NOW | B2 |
| S-12 | Natural Evidence Corpus Index | 4 | NON_RUNTIME | FROZEN | harvest eligibility after tier close |

Tier composition:

```text
RUNTIME     = 7
NON_RUNTIME = 3
TOTAL       = 10
```

Current tier state: `OPEN` because the currently designable pool still contains S-03 / S-07 / S-08 / S-11.

Gated S-05/S-06 do not block the current tier-close cycle.

---

# 5. Difficulty 3 — MODERATE

| ID | Idea | Importance | Runtime Class | Gate | Current design priority |
|---|---|---:|---|---|---|
| M-01 | Turn Transaction / Phase Receipt | 4 | RUNTIME | POST_M2_3 | GATED-HIGH |
| M-02 | Ownership-aware Diagnostic Attribution | 3 | RUNTIME | POST_M2_3 | GATED-MEDIUM |
| M-05 | Phase Performance Budget | 3 | RUNTIME | POST_M2_3 | GATED-MEDIUM |
| M-08 | Snapshot Schema Inventory Generator | 4 | NON_RUNTIME | POST_M2_3 | GATED-HIGH |
| M-10 | Live Diagnostic → Fixture Skeleton Generator | 4 | NON_RUNTIME | NOW | B1 |
| M-11 | Architecture Dependency Snapshot Generator | 5 | NON_RUNTIME | NOW | A3 |
| M-13 | Evidence Index Generator | 4 | NON_RUNTIME | NOW | B1 · S-09 dependency satisfied |
| M-14 | Release Evidence Packet | 4 | NON_RUNTIME | DEPENDENCY: R2.1 proof | DEPENDENCY |
| M-15 | Fixture Coverage Matrix by Ownership | 4 | NON_RUNTIME | POST_M2_3 | GATED-HIGH |

Tier composition:

```text
RUNTIME     = 3
NON_RUNTIME = 6
TOTAL       = 9
```

Current designable leaders:

```text
M-11 Architecture Dependency Snapshot Generator
M-10 Live Diagnostic → Fixture Skeleton Generator
M-13 Evidence Index Generator
```

NON_RUNTIME status does not pre-authorize harvest; each frozen item still passes the strict policy independently.

---

# 6. Difficulty 4 — HARD

| ID | Idea | Importance | Runtime Class | Gate | Current design priority |
|---|---|---:|---|---|---|
| M-03 | Genuine Edit Rebuild Performance Study | 5 | RUNTIME | POST_M2_3 | GATED-HIGH |
| M-04 | Store Write Cost / Commit Budget | 3 | RUNTIME | EVIDENCE | GATED-MEDIUM |
| M-06 | State Invariant Snapshot | 4 | RUNTIME | POST_M2_4 | GATED-HIGH |
| M-07 | Commit / Observation Separation Guard | 5 | NON_RUNTIME | POST_M2_4 | GATED-HIGH |
| M-09 | Provider Cache Receipt Integration | 3 | RUNTIME | EXTERNAL | GATED-MEDIUM |
| M-12 | State Writer Static Audit | 5 | NON_RUNTIME | POST_M2_3 | GATED-HIGH |
| M-16 | Differential Architecture Fixtures | 5 | NON_RUNTIME | M2 implementation slice | IMPLEMENTATION-BOUND |
| M-17 | Pure State Seam | 3 | RUNTIME | FUTURE / TD-09 | FUTURE |

Tier composition:

```text
RUNTIME     = 5
NON_RUNTIME = 3
TOTAL       = 8
```

Performance-study/budget candidates are conservatively classed RUNTIME because a useful implementation is expected to participate in runtime measurement/observation unless their later frozen design proves a purely offline boundary.

---

# 7. Difficulty 5 — VERY HARD

| ID | Idea | Importance | Runtime Class | Gate | Current design priority |
|---|---|---:|---|---|---|
| L-01 | Development-source Modular Build | 4 | NON_RUNTIME | FUTURE / POST_M2 | FUTURE |
| L-02 | Performance-aware SnapshotStore Evolution | 3 | RUNTIME | EVIDENCE / FUTURE | FUTURE |

Tier composition:

```text
RUNTIME     = 1
NON_RUNTIME = 1
TOTAL       = 2
```

`L-01` is the canonical example that `NON_RUNTIME` does not mean small or safe to harvest: changing development/build topology is a major protected repository/build-system work item.

---

# 8. Runtime-class master count

Across all 31 size-classified ideas:

```text
RUNTIME     = 17
NON_RUNTIME = 14
----------------
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

This distribution is expected: easy product/diagnostic ideas tend to be runtime surfaces, while the moderate tier contains many developer/evidence/static-analysis tools.

---

# 9. Runtime-class interpretation by family

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

Again:

```text
NON_RUNTIME classification
→ only says plugin/runtime execution is not the intended implementation surface

SAFE_NON_RUNTIME eligibility
→ separately proves the work can be applied immediately under the closed-tier harvest policy
```

---

# 10. Current practical consequence

Difficulty 1 is already closed:

```text
S-09 NON_RUNTIME
→ SAFE_NON_RUNTIME_READY

S-02 RUNTIME
→ PARKED FOR STABILIZATION
```

Difficulty 2 remains open. When its currently designable pool closes, the frozen NON_RUNTIME entries are reviewed for harvest individually:

```text
S-10 Authority Drift Check
S-11 Stale PR Hygiene Classifier
S-12 Natural Evidence Corpus Index
```

Runtime entries remain parked regardless of tier close.

---

# 11. Reclassification rule

Runtime Class may change only when a completed design or implementation inspection establishes a materially different boundary.

Examples:

```text
candidate marked NON_RUNTIME
but implementation requires plugin Host reads
→ reclassify RUNTIME
→ no immediate harvest

candidate marked RUNTIME
but frozen design proves a pure offline analyzer using existing repo artifacts only
→ may reclassify NON_RUNTIME
→ still must pass SAFE_NON_RUNTIME separately
```

Do not reclassify merely to make an item eligible for immediate implementation.

---

# 12. Verdict

```text
SIZE
= scope breadth

IMPORTANCE
= strategic value

DIFFICULTY
= design-completion effort

RUNTIME CLASS
= intended implementation execution boundary

DESIGN GATE
= whether complete design is legitimate now

HARVEST ELIGIBILITY
= separate stricter SAFE_NON_RUNTIME decision after tier close

CURRENT TOTAL
= 17 RUNTIME / 14 NON_RUNTIME
```
