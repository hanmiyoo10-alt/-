# SimCore Idea Priority / Difficulty Matrix — 2026-08-26

Status: `MASTER IDEA PRIORITIZATION · S-09 FROZEN/PARKED · DESIGN-SELECTION ORDER · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Purpose: add strategic importance and design difficulty to the size-classified SimCore idea inventory so the current idea/design phase can select high-value, low-difficulty ideas first without ignoring readiness gates.

Related authority:
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_SPACE_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`

This matrix ranks **design selection during the current idea phase**. It does not authorize implementation. Frozen designs remain parked until the later stabilization / implementation phase.

---

## 1. Scales

### Importance

```text
5 = VERY HIGH
    strong leverage on correctness, evidence discipline, everyday debugging, or future stabilization

4 = HIGH
    clear recurring value or strong support for later implementation/release work

3 = MEDIUM
    useful improvement, but not central to the present SimCore path

2 = LOW
    situational value; mainly useful when a particular symptom/evidence appears

1 = VERY LOW
    speculative convenience with little current leverage
```

Importance is **current strategic importance**, not permanent product value. It may be re-scored when new production evidence changes priorities.

### Difficulty

```text
1 = VERY EASY
    one bounded contract/surface; little cross-owner reasoning

2 = EASY
    narrow design with a few existing facts/contracts to reconcile

3 = MODERATE
    multiple owners or tooling/evidence surfaces must be reconciled

4 = HARD
    broad cross-owner, performance, static-analysis, migration, or external-boundary reasoning

5 = VERY HARD
    foundational build/storage architecture or multi-stage future work
```

Difficulty is the difficulty of reaching a **complete frozen design**, not estimated implementation LOC.

### Design gate

```text
NOW
= enough current truth exists to select and fully freeze the design now

DEPENDENCY
= another small frozen contract should come first

POST_M2_3
= actual physical Edit Reconcile / application flow must exist first

POST_M2_4
= Session/Runtime Mirror/finalization ownership must settle first

EVIDENCE
= natural production evidence must justify the design

EXTERNAL
= trustworthy Host/provider receipt or external capability must exist

FUTURE
= explicitly future/post-M2 experiment

FROZEN
= design is complete and parked; remove it from the active design queue
```

---

## 2. Canonical selection rule

Current idea/design work uses this order:

```text
1. DESIGN GATE must be open
2. higher IMPORTANCE first
3. lower DIFFICULTY first
4. when tied, prefer the idea with greater leverage on later designs / repo memory
```

Canonical shorthand:

```text
HIGH IMPORTANCE + LOW DIFFICULTY + NOW
= FIRST
```

This is intentionally not a blind arithmetic score. A `5 / 1` idea behind `POST_M2_3` does not leapfrog a `4 / 2` idea that can be completed now.

Every selected idea still follows:

```text
SELECT
→ COMPLETE FULL DESIGN
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

A frozen item leaves the active queue. It is not repeatedly re-selected merely because its importance remains high.

---

# 3. SMALL ideas

| ID | Idea | Importance | Difficulty | Gate | Current design priority |
|---|---|---:|---:|---|---|
| S-01 | MINI_WARNING_WIDGET_V1 | 4 | 2 | NOW | A2 |
| S-02 | Diagnostic Quick Summary | 5 | 1 | NOW | A1 |
| S-03 | Diagnostic Copy Profiles | 3 | 2 | NOW | B2 |
| S-04 | Live Evidence Packet Builder | 5 | 2 | NOW | A1 |
| S-05 | Reconcile Differential Receipt | 5 | 2 | POST_M2_3 | GATED-HIGH |
| S-06 | Persistence Footprint Watch | 2 | 2 | EVIDENCE | GATED-LOW |
| S-07 | Host Capability Receipt | 3 | 2 | NOW | B2 |
| S-08 | History Frontier Confidence Surface | 2 | 2 | NOW | C |
| S-09 | Evidence Index Entry Format | 5 | 1 | FROZEN | PARKED |
| S-10 | Authority Drift Check / Scan | 5 | 2 | NOW | A1 |
| S-11 | Stale PR Hygiene Classifier | 3 | 2 | NOW | B2 |
| S-12 | Natural Evidence Corpus Index | 4 | 2 | NOW | A2 |

### SMALL interpretation

Completed/parked:

```text
S-09 Evidence Index Entry Format
5 / 1 / DESIGN FROZEN
→ docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md
→ implementation deferred
```

The strongest active current cluster is now:

```text
A1
S-02 Diagnostic Quick Summary          5 / 1 / NOW
S-04 Live Evidence Packet Builder      5 / 2 / NOW
S-10 Authority Drift Check             5 / 2 / NOW
```

Then:

```text
A2
S-01 MINI_WARNING_WIDGET_V1            4 / 2 / NOW
S-12 Natural Evidence Corpus Index     4 / 2 / NOW
```

`S-05 Reconcile Differential Receipt` is strategically very important but must remain parked until post-M2-3 source exists. Its high importance does not override the gate.

---

# 4. MEDIUM ideas

| ID | Idea | Importance | Difficulty | Gate | Current design priority |
|---|---|---:|---:|---|---|
| M-01 | Turn Transaction / Phase Receipt | 4 | 3 | POST_M2_3 | GATED-HIGH |
| M-02 | Ownership-aware Diagnostic Attribution | 3 | 3 | POST_M2_3 | GATED-MEDIUM |
| M-03 | Genuine Edit Rebuild Performance Study | 5 | 4 | POST_M2_3 | GATED-HIGH |
| M-04 | Store Write Cost / Commit Budget | 3 | 4 | EVIDENCE | GATED-MEDIUM |
| M-05 | Phase Performance Budget | 3 | 3 | POST_M2_3 | GATED-MEDIUM |
| M-06 | State Invariant Snapshot | 4 | 4 | POST_M2_4 | GATED-HIGH |
| M-07 | Commit / Observation Separation Guard | 5 | 4 | POST_M2_4 | GATED-HIGH |
| M-08 | Snapshot Schema Inventory Generator | 4 | 3 | POST_M2_3 | GATED-HIGH |
| M-09 | Provider Cache Receipt Integration | 3 | 4 | EXTERNAL | GATED-MEDIUM |
| M-10 | Live Diagnostic → Fixture Skeleton Generator | 4 | 3 | NOW | B1 |
| M-11 | Architecture Dependency Snapshot Generator | 5 | 3 | NOW | A3 |
| M-12 | State Writer Static Audit | 5 | 4 | POST_M2_3 | GATED-HIGH |
| M-13 | Evidence Index Generator | 4 | 3 | NOW | B1 |
| M-14 | Release Evidence Packet | 4 | 3 | DEPENDENCY: R2.1 proof | DEPENDENCY |
| M-15 | Fixture Coverage Matrix by Ownership | 4 | 3 | POST_M2_3 | GATED-HIGH |
| M-16 | Differential Architecture Fixtures | 5 | 4 | M2 implementation slice | IMPLEMENTATION-BOUND |
| M-17 | Pure State Seam | 3 | 4 | FUTURE / TD-09 | FUTURE |

### MEDIUM interpretation

The strongest medium idea that can actually be frozen now is:

```text
M-11 Architecture Dependency Snapshot Generator
Importance 5
Difficulty 3
Gate NOW
```

S-09 is now frozen, so the design dependency for `M-13 Evidence Index Generator` is satisfied:

```text
S-09 FORMAT FROZEN
→ M-13 DESIGN GATE = NOW
```

M-13 still does not authorize implementation and remains lower than the current easy/high-importance SMALL queue.

`M-03`, `M-07`, `M-12`, and `M-16` have very high strategic importance, but their gates are intentionally closed today.

---

# 5. LARGE ideas

| ID | Idea | Importance | Difficulty | Gate | Current design priority |
|---|---|---:|---:|---|---|
| L-01 | Development-source Modular Build | 4 | 5 | FUTURE / POST_M2 | FUTURE |
| L-02 | Performance-aware SnapshotStore Evolution | 3 | 5 | EVIDENCE / FUTURE | FUTURE |

Neither LARGE idea belongs in the current design queue.

The classification exists so the ideas are not lost, not so that broad future architecture crowds out smaller high-leverage work.

---

# 6. Priority bands

Use the following bands for design selection:

```text
A1
= Importance 5 + Difficulty 1–2 + Gate NOW
= preferred first design pool

A2
= Importance 4 + Difficulty 1–2 + Gate NOW
= preferred second pool

A3
= Importance 5 + Difficulty 3 + Gate NOW
= high-value medium work after easy wins

B1/B2
= useful NOW candidates with lower importance or moderate difficulty

GATED-HIGH
= strategically important, but selecting it now would violate design-freeze rigor

DEPENDENCY
= another frozen design/evidence milestone must come first

FROZEN/PARKED
= design complete; remove from active idea queue until stabilization/implementation selection

EVIDENCE / EXTERNAL / FUTURE
= do not promote without trigger
```

---

# 7. Recommended current design queue

Default queue under the user's preferred rule `easy + important first`, after S-09 design freeze:

```text
1. S-02 Diagnostic Quick Summary
   Importance 5 / Difficulty 1 / NOW

2. S-10 Authority Drift Check
   Importance 5 / Difficulty 2 / NOW

3. S-04 Live Evidence Packet Builder
   Importance 5 / Difficulty 2 / NOW

4. S-12 Natural Evidence Corpus Index
   Importance 4 / Difficulty 2 / NOW

5. S-01 MINI_WARNING_WIDGET_V1
   Importance 4 / Difficulty 2 / NOW

6. M-11 Architecture Dependency Snapshot Generator
   Importance 5 / Difficulty 3 / NOW

7. M-10 Live Diagnostic → Fixture Skeleton Generator
   Importance 4 / Difficulty 3 / NOW

8. M-13 Evidence Index Generator
   Importance 4 / Difficulty 3 / NOW
   prerequisite S-09 = FROZEN

9. S-03 Diagnostic Copy Profiles
   Importance 3 / Difficulty 2 / NOW

10. S-11 Stale PR Hygiene Classifier
    Importance 3 / Difficulty 2 / NOW

11. S-07 Host Capability Receipt
    Importance 3 / Difficulty 2 / NOW

12. S-08 History Frontier Confidence Surface
    Importance 2 / Difficulty 2 / NOW
```

### S-09 completion effect

S-09 was selected first and reached:

```text
DESIGN FROZEN
PARKED FOR STABILIZATION
IMPLEMENTATION = NONE
```

Its frozen contract now removes the design dependency that previously blocked M-13. This is exactly the intended use of the queue: finish one design completely, park it, then allow downstream design gates to open without leaking into implementation.

---

# 8. Important distinction: design priority vs later implementation priority

The scores above optimize the **current design-completion phase**.

They must not be copied blindly into the future implementation phase.

When stabilization/implementation begins:

```text
re-read production evidence
→ re-score importance if needed
→ re-score implementation difficulty
→ respect dependency/live-release gates
→ select one frozen design
→ implement through normal SimCore workflow
```

Example:

```text
S-02 may be a 5/1 design today,
but a correctness regression discovered during stabilization could make S-05 or M-07 the higher implementation priority later.
```

Therefore:

```text
CURRENT MATRIX
= DESIGN SELECTION AUTHORITY

FUTURE IMPLEMENTATION ORDER
= RE-EVALUATE AT STABILIZATION START
```

---

# 9. Re-scoring rule

Update a score only when one of these changes materially:

```text
new real-long-chat evidence
new repeated user/operator pain
M2-3 or M2-4 changes the physical ownership surface
external provider/Host evidence becomes available
another frozen idea removes a dependency
an idea is shown to duplicate an existing authority
```

Do not churn scores merely because time passed.

---

# 10. Verdict

```text
IDEA SIZE
= scope classification

IMPORTANCE
= current strategic value

DIFFICULTY
= effort to reach complete frozen design

DESIGN GATE
= whether enough truth exists now

DEFAULT SELECTION POLICY
= HIGH IMPORTANCE + LOW DIFFICULTY + OPEN GATE FIRST

COMPLETED DESIGN
= S-09 Evidence Index Entry Format
  DESIGN FROZEN / PARKED

CURRENT FIRST ACTIVE POOL
= S-02 / S-10 / S-04

NEWLY UNBLOCKED DEPENDENCY
= M-13 Evidence Index Generator design

IMPLEMENTATION NOW
= NONE

AFTER EACH SELECTED IDEA
= DESIGN FROZEN → PARKED → STOP
```
