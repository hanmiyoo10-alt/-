# SimCore Idea Priority — NON_RUNTIME / RUNTIME Split Queues — 2026-08-26

Status: `CANONICAL IDEA SELECTION QUEUES · NR/R SPLIT · IMPORTANCE + DIFFICULTY + GATE · NO RUNTIME CHANGE`

Purpose: separate SimCore idea selection into two independent queues so NON_RUNTIME harvest candidates and RUNTIME stabilization candidates no longer compete in one mixed priority table.

Related authority:
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md` — complete 31-item classification baseline
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md` — S/M/L scope classification
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md` — design completion/freeze rule
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md` — SAFE_NON_RUNTIME harvest rule
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md` — completion/implementation history

This document is the **current selection queue authority**. The older combined matrix remains the complete classification baseline and historical scoring source.

---

## 1. Canonical split

```text
NON_RUNTIME QUEUE (NR)
= repository/tooling/static/evidence/test/build surfaces
= design inside NR only
= after applicable design tier closes, SAFE_NON_RUNTIME harvest may run

RUNTIME QUEUE (R)
= plugin/runtime/Host/state/prompt/runtime diagnostic surfaces
= design inside R only
= frozen runtime designs remain PARKED until stabilization/implementation phase
```

The two queues do not compete for one global position.

```text
NR priority #1
!= globally ahead of R priority #1

R priority #1
!= reason to interrupt an active NR harvest/design cycle
```

Selection happens within the currently chosen lane.

---

## 2. Ordering rule inside each lane

Both lanes use the same ordering rule:

```text
1. DESIGN GATE OPEN
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

Importance:

```text
5 VERY HIGH
4 HIGH
3 MEDIUM
2 LOW
1 VERY LOW
```

Difficulty means effort to reach a complete frozen design:

```text
1 VERY EASY
2 EASY
3 MODERATE
4 HARD
5 VERY HARD
```

A closed gate always wins over score.

Do not lower importance or difficulty merely to move an item forward.

---

# 3. NON_RUNTIME QUEUE — NR

Current total:

```text
NON_RUNTIME = 14
```

## 3.1 NR master table

| NR Rank Class | ID | Idea | Size | Importance | Difficulty | Gate | Current state |
|---|---|---|---|---:|---:|---|---|
| COMPLETE | S-09 | Evidence Index Entry Format | SMALL | 5 | 1 | FROZEN | `SAFE_NON_RUNTIME_IMPLEMENTED` |
| FROZEN | S-10 | Authority Drift Check / Scan | SMALL | 5 | 2 | FROZEN | wait Difficulty-2 NR harvest gate |
| FROZEN | M-11 | Architecture Dependency Snapshot Generator | MEDIUM | 5 | 3 | FROZEN | wait Difficulty-3 NR harvest gate |
| GATED | M-07 | Commit / Observation Separation Guard | MEDIUM | 5 | 4 | POST_M2_4 | not designable now |
| GATED | M-12 | State Writer Static Audit | MEDIUM | 5 | 4 | POST_M2_3 | not designable now |
| GATED | M-16 | Differential Architecture Fixtures | MEDIUM | 5 | 4 | M2 implementation slice | implementation-bound |
| FROZEN | S-12 | Natural Evidence Corpus Index | SMALL | 4 | 2 | FROZEN | wait Difficulty-2 NR harvest gate |
| ACTIVE | M-10 | Live Diagnostic → Fixture Skeleton Generator | MEDIUM | 4 | 3 | NOW | designable |
| ACTIVE | M-13 | Evidence Index Generator | MEDIUM | 4 | 3 | NOW | designable · S-09 dependency satisfied |
| GATED | M-08 | Snapshot Schema Inventory Generator | MEDIUM | 4 | 3 | POST_M2_3 | not designable now |
| GATED | M-14 | Release Evidence Packet | MEDIUM | 4 | 3 | DEPENDENCY: R2.1 proof | dependency closed |
| GATED | M-15 | Fixture Coverage Matrix by Ownership | MEDIUM | 4 | 3 | POST_M2_3 | not designable now |
| FUTURE | L-01 | Development-source Modular Build | LARGE | 4 | 5 | FUTURE / POST_M2 | protected build-topology work |
| ACTIVE | S-11 | Stale PR Hygiene Classifier | SMALL | 3 | 2 | NOW | designable |

## 3.2 NR currently designable ordering

Completed/frozen items are not reselected. Among **undesigned + gate-open** NR ideas:

```text
NR-1  M-10 Live Diagnostic → Fixture Skeleton Generator
      importance 4 / difficulty 3

NR-2  M-13 Evidence Index Generator
      importance 4 / difficulty 3

NR-3  S-11 Stale PR Hygiene Classifier
      importance 3 / difficulty 2
```

Tie-break between M-10 and M-13:

```text
M-10 first
= converts live evidence into bounded permanent-test starting material
= higher immediate regression leverage

M-13 second
= S-09 format dependency is already satisfied
= automation leverage is high but existing manual index is already usable
```

Difficulty alone does not move S-11 above an Importance-4 idea because current canonical order is importance first, then difficulty.

## 3.3 NR difficulty buckets

```text
Difficulty 1
- S-09  importance 5  IMPLEMENTED

Difficulty 2
- S-10  importance 5  FROZEN
- S-12  importance 4  FROZEN
- S-11  importance 3  NOW

Difficulty 3
- M-11  importance 5  FROZEN
- M-10  importance 4  NOW
- M-13  importance 4  NOW
- M-08  importance 4  POST_M2_3
- M-14  importance 4  DEPENDENCY
- M-15  importance 4  POST_M2_3

Difficulty 4
- M-07  importance 5  POST_M2_4
- M-12  importance 5  POST_M2_3
- M-16  importance 5  implementation-bound

Difficulty 5
- L-01  importance 4  FUTURE
```

## 3.4 NR implementation rule

```text
NR design frozen
!= immediate implementation
```

Immediate application requires:

```text
applicable currently-designable difficulty tier CLOSED
→ item is NON_RUNTIME
→ strict SAFE_NON_RUNTIME review PASS
→ separate bounded implementation transaction
→ static/CI verification as applicable
→ main evidence sync
```

Examples:

```text
S-09
→ SAFE_NON_RUNTIME PASS
→ implemented without plugin version change

L-01
→ NON_RUNTIME but build topology protected
→ NOT SAFE_NON_RUNTIME
→ future dedicated work only
```

---

# 4. RUNTIME QUEUE — R

Current total:

```text
RUNTIME = 17
```

Runtime queue is **design-only during the current idea phase**.

```text
DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ no harvest
```

## 4.1 R master table

| R Rank Class | ID | Idea | Size | Importance | Difficulty | Gate | Current state |
|---|---|---|---|---:|---:|---|---|
| FROZEN | S-02 | Diagnostic Quick Summary | SMALL | 5 | 1 | FROZEN | PARKED |
| FROZEN | S-04 | Live Evidence Packet Builder | SMALL | 5 | 2 | FROZEN | PARKED |
| GATED | S-05 | Reconcile Differential Receipt | SMALL | 5 | 2 | POST_M2_3 | not designable now |
| GATED | M-03 | Genuine Edit Rebuild Performance Study | MEDIUM | 5 | 4 | POST_M2_3 | not designable now |
| FROZEN | S-01 | MINI_WARNING_WIDGET_V1 | SMALL | 4 | 2 | FROZEN | PARKED |
| GATED | M-01 | Turn Transaction / Phase Receipt | MEDIUM | 4 | 3 | POST_M2_3 | not designable now |
| GATED | M-06 | State Invariant Snapshot | MEDIUM | 4 | 4 | POST_M2_4 | not designable now |
| ACTIVE | S-03 | Diagnostic Copy Profiles | SMALL | 3 | 2 | NOW | designable |
| ACTIVE | S-07 | Host Capability Receipt | SMALL | 3 | 2 | NOW | designable |
| GATED | M-02 | Ownership-aware Diagnostic Attribution | MEDIUM | 3 | 3 | POST_M2_3 | not designable now |
| GATED | M-05 | Phase Performance Budget | MEDIUM | 3 | 3 | POST_M2_3 | not designable now |
| GATED | M-04 | Store Write Cost / Commit Budget | MEDIUM | 3 | 4 | EVIDENCE | evidence-triggered |
| GATED | M-09 | Provider Cache Receipt Integration | MEDIUM | 3 | 4 | EXTERNAL | provider/gateway evidence required |
| FUTURE | M-17 | Pure State Seam | MEDIUM | 3 | 4 | FUTURE / TD-09 | future only |
| FUTURE | L-02 | Performance-aware SnapshotStore Evolution | LARGE | 3 | 5 | EVIDENCE / FUTURE | future only |
| ACTIVE | S-08 | History Frontier Confidence Surface | SMALL | 2 | 2 | NOW | designable |
| GATED | S-06 | Persistence Footprint Watch | SMALL | 2 | 2 | EVIDENCE | evidence-triggered |

## 4.2 R currently designable ordering

Completed/frozen items are parked and not reselected. Among **undesigned + gate-open** R ideas:

```text
R-1  S-03 Diagnostic Copy Profiles
     importance 3 / difficulty 2

R-2  S-07 Host Capability Receipt
     importance 3 / difficulty 2

R-3  S-08 History Frontier Confidence Surface
     importance 2 / difficulty 2
```

Tie-break S-03 vs S-07:

```text
S-03 first
= pure projection/filtering over an already mature diagnostic surface
= narrower ownership risk

S-07 second
= Host-boundary observation requires more careful capability semantics
```

## 4.3 R difficulty buckets

```text
Difficulty 1
- S-02  importance 5  FROZEN/PARKED

Difficulty 2
- S-04  importance 5  FROZEN/PARKED
- S-05  importance 5  POST_M2_3
- S-01  importance 4  FROZEN/PARKED
- S-03  importance 3  NOW
- S-07  importance 3  NOW
- S-08  importance 2  NOW
- S-06  importance 2  EVIDENCE

Difficulty 3
- M-01  importance 4  POST_M2_3
- M-02  importance 3  POST_M2_3
- M-05  importance 3  POST_M2_3

Difficulty 4
- M-03  importance 5  POST_M2_3
- M-06  importance 4  POST_M2_4
- M-04  importance 3  EVIDENCE
- M-09  importance 3  EXTERNAL
- M-17  importance 3  FUTURE

Difficulty 5
- L-02  importance 3  EVIDENCE/FUTURE
```

## 4.4 R implementation rule

During the current phase:

```text
R design complete
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

No runtime idea becomes harvest-eligible because its difficulty tier closes.

When the user explicitly starts stabilization/implementation:

```text
review all frozen R designs
→ rescore implementation priority against current production evidence
→ choose exactly one
→ normal SimCore runtime workflow
```

Normal runtime workflow remains:

```text
main design/evidence authority
→ work branch implementation
→ static/CI validation
→ release-simcore publication
→ real long-chat validation
→ main docs/long-term-memory sync
```

---

# 5. Size remains orthogonal

The NR/R split does not replace SMALL/MEDIUM/LARGE.

```text
SIZE
= breadth of scope

NR / R
= execution boundary

IMPORTANCE
= value

DIFFICULTY
= effort to complete design

GATE
= whether design is legitimate now
```

Examples:

```text
S-11
SMALL + NON_RUNTIME + Difficulty 2

M-11
MEDIUM + NON_RUNTIME + Difficulty 3

S-02
SMALL + RUNTIME + Difficulty 1

L-02
LARGE + RUNTIME + Difficulty 5
```

---

# 6. Current lane status

Current completed/frozen work:

```text
NR
S-09  FROZEN + IMPLEMENTED
S-10  FROZEN
S-12  FROZEN
M-11  FROZEN

R
S-01  FROZEN / PARKED
S-02  FROZEN / PARKED
S-04  FROZEN / PARKED
```

Current top undesigned candidates:

```text
NR lane
1. M-10
2. M-13
3. S-11

R lane
1. S-03
2. S-07
3. S-08
```

The next idea should be chosen from the lane the user wants to advance, not from a single mixed global queue.

---

# 7. Verdict

```text
OLD VIEW
31 ideas
→ one mixed priority table
→ Runtime Class column

NEW CANONICAL VIEW
NR queue
→ Importance + Difficulty + Gate
→ closed-tier SAFE_NON_RUNTIME harvest

R queue
→ Importance + Difficulty + Gate
→ design freeze + stabilization parking
```

This split is organizational only.

```text
PLUGIN BYTES       UNCHANGED
PLUGIN VERSION     UNCHANGED
release-simcore    UNCHANGED
RUNTIME SEMANTICS  UNCHANGED
```
