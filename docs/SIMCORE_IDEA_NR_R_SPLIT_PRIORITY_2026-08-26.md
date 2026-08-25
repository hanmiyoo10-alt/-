# SimCore Idea Priority — NON_RUNTIME / RUNTIME Split Queues — 2026-08-26

Status: `CANONICAL IDEA SELECTION QUEUES · NR DIFFICULTY-1/2/3 HARVEST COMPLETE · RUNTIME PARKING PRESERVED · NO RUNTIME CHANGE`

Purpose: keep NON_RUNTIME and RUNTIME idea selection independent so repository/tooling harvest work and future runtime stabilization do not compete in one mixed priority queue.

Related authority:
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md` — complete 31-item scoring/classification baseline
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md` — S/M/L classification
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md` — design completion/freeze rule
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md` — NR-lane harvest rule
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md` — completion/implementation history

This document is the current NR/R selection queue authority.

---

## 1. Canonical split

```text
NON_RUNTIME QUEUE (NR)
= repository/tooling/static/evidence/test/build surfaces
= select/design inside NR only
= close currently-designable NR difficulty tiers independently
= SAFE_NON_RUNTIME harvest after tier close + per-item review

RUNTIME QUEUE (R)
= plugin/runtime/Host/state/prompt/runtime diagnostic surfaces
= select/design inside R only
= frozen runtime designs remain PARKED until stabilization
```

The lanes do not compete globally.

Ordering inside each lane:

```text
1. DESIGN GATE OPEN
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

A closed gate always overrides score.

---

# 2. NON_RUNTIME QUEUE — NR

Current total inventory:

```text
NON_RUNTIME = 14
```

| State | ID | Idea | Size | Importance | Difficulty | Gate / disposition |
|---|---|---|---|---:|---:|---|
| IMPLEMENTED | S-09 | Evidence Index Entry Format | SMALL | 5 | 1 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| IMPLEMENTED | S-10 | Authority Drift Check / Scan | SMALL | 5 | 2 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| IMPLEMENTED | M-11 | Architecture Dependency Snapshot Generator | MEDIUM | 5 | 3 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| GATED | M-07 | Commit / Observation Separation Guard | MEDIUM | 5 | 4 | POST_M2_4 |
| GATED | M-12 | State Writer Static Audit | MEDIUM | 5 | 4 | POST_M2_3 |
| GATED | M-16 | Differential Architecture Fixtures | MEDIUM | 5 | 4 | M2 implementation slice |
| IMPLEMENTED | S-12 | Natural Evidence Corpus Index | SMALL | 4 | 2 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| IMPLEMENTED | M-10 | Live Diagnostic → Fixture Skeleton Generator | MEDIUM | 4 | 3 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| IMPLEMENTED | M-13 | Evidence Index Generator | MEDIUM | 4 | 3 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| GATED | M-08 | Snapshot Schema Inventory Generator | MEDIUM | 4 | 3 | POST_M2_3 |
| GATED | M-14 | Release Evidence Packet | MEDIUM | 4 | 3 | dependency: R2.1 genuine release proof |
| GATED | M-15 | Fixture Coverage Matrix by Ownership | MEDIUM | 4 | 3 | POST_M2_3 |
| FUTURE | L-01 | Development-source Modular Build | LARGE | 4 | 5 | FUTURE / POST_M2 |
| IMPLEMENTED | S-11 | Stale PR Hygiene Classifier | SMALL | 3 | 2 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |

## 2.1 NR current selection state

There are currently no undesigned + gate-open NR ideas in the bounded Difficulty-1/2/3 pool.

Completed harvest tiers:

```text
NR Difficulty 1
S-09 → IMPLEMENTED
→ CLOSED / HARVEST COMPLETE

NR Difficulty 2
S-10 → IMPLEMENTED
S-12 → IMPLEMENTED
S-11 → IMPLEMENTED
→ CLOSED / HARVEST COMPLETE

NR Difficulty 3
M-11 → IMPLEMENTED
M-10 → IMPLEMENTED
M-13 → IMPLEMENTED
→ CLOSED / HARVEST COMPLETE
```

Gated Difficulty-3 items remain untouched:

```text
M-08 POST_M2_3
M-14 dependency: R2.1 genuine release proof
M-15 POST_M2_3
```

If one later opens, it begins a new incremental Difficulty-3 design/harvest cycle.

## 2.2 Completed Difficulty-3 harvest

```text
M-11 Architecture Dependency Snapshot Generator
→ scripts/simcore-architecture-check.py --snapshot-out
→ PR #406
→ main 7203b1c7f3292e1a636c01db6833b5fb0c2816bb

M-10 Live Diagnostic → Fixture Skeleton Generator
→ products/simcore/tooling/fixture-skeleton.mjs
→ fixture-source-v1 / fixture-skeleton-v1 schemas
→ PR #407
→ main 873b3df323789d447d0973ce4051cfdbf0eb4d38

M-13 Evidence Index Generator
→ products/simcore/evidence/evidence-index-source-v1.json
→ products/simcore/tooling/evidence-index.mjs
→ generated docs/SIMCORE_EVIDENCE_INDEX.md
→ PR #408
→ main 534cfbea9142988913fae5dbcabb322a892192e0
```

Implementation evidence:

```text
docs/SIMCORE_M11_ARCHITECTURE_SNAPSHOT_IMPLEMENTATION_EVIDENCE_2026-08-26.md
docs/SIMCORE_M10_FIXTURE_SKELETON_IMPLEMENTATION_EVIDENCE_2026-08-26.md
docs/SIMCORE_M13_EVIDENCE_INDEX_GENERATOR_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

Verification WATCH:

```text
docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md
```

All three preserve:

```text
plugin version unchanged
plugins/simcore/latest.js unchanged
plugins/simcore/install.js unchanged
release-simcore unchanged
runtime semantics unchanged
```

## 2.3 NR implementation rule remains active

```text
NR DESIGN FROZEN
!= immediate implementation

currently-designable NR difficulty tier CLOSED
+ strict SAFE_NON_RUNTIME PASS
→ separate bounded implementation
→ static/CI verification as applicable
→ main evidence sync
```

`NON_RUNTIME` alone is never sufficient. Protected build/release/repository-authority work may still be non-harvestable.

## 2.4 Next NR

```text
CURRENT OPEN NR DESIGN = NONE
CURRENT NR HARVEST QUEUE = EMPTY
```

Do not select a gated/future NR merely because the easy/moderate queue is empty.

Next NR work requires one of:

```text
an existing gate legitimately opens
or
user explicitly selects a future/protected NR idea whose gate is now satisfied
```

---

# 3. RUNTIME QUEUE — R

Current total inventory:

```text
RUNTIME = 17
```

Runtime queue remains design-only in the current phase.

| State | ID | Idea | Size | Importance | Difficulty | Gate / disposition |
|---|---|---|---|---:|---:|---|
| FROZEN | S-02 | Diagnostic Quick Summary | SMALL | 5 | 1 | PARKED |
| FROZEN | S-04 | Live Evidence Packet Builder | SMALL | 5 | 2 | PARKED |
| GATED | S-05 | Reconcile Differential Receipt | SMALL | 5 | 2 | POST_M2_3 |
| GATED | M-03 | Genuine Edit Rebuild Performance Study | MEDIUM | 5 | 4 | POST_M2_3 |
| FROZEN | S-01 | MINI_WARNING_WIDGET_V1 | SMALL | 4 | 2 | PARKED |
| GATED | M-01 | Turn Transaction / Phase Receipt | MEDIUM | 4 | 3 | POST_M2_3 |
| GATED | M-06 | State Invariant Snapshot | MEDIUM | 4 | 4 | POST_M2_4 |
| ACTIVE | S-03 | Diagnostic Copy Profiles | SMALL | 3 | 2 | NOW |
| ACTIVE | S-07 | Host Capability Receipt | SMALL | 3 | 2 | NOW |
| GATED | M-02 | Ownership-aware Diagnostic Attribution | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-05 | Phase Performance Budget | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-04 | Store Write Cost / Commit Budget | MEDIUM | 3 | 4 | EVIDENCE |
| GATED | M-09 | Provider Cache Receipt Integration | MEDIUM | 3 | 4 | EXTERNAL |
| FUTURE | M-17 | Pure State Seam | MEDIUM | 3 | 4 | FUTURE / TD-09 |
| FUTURE | L-02 | Performance-aware SnapshotStore Evolution | LARGE | 3 | 5 | EVIDENCE / FUTURE |
| ACTIVE | S-08 | History Frontier Confidence Surface | SMALL | 2 | 2 | NOW |
| GATED | S-06 | Persistence Footprint Watch | SMALL | 2 | 2 | EVIDENCE |

Current active R ordering:

```text
R-1  S-03 Diagnostic Copy Profiles
     importance 3 / difficulty 2

R-2  S-07 Host Capability Receipt
     importance 3 / difficulty 2

R-3  S-08 History Frontier Confidence Surface
     importance 2 / difficulty 2
```

Runtime completion rule remains:

```text
DESIGN COMPLETE
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

No R item becomes harvestable because NR tiers closed.

---

# 4. Current lane verdict

```text
NR IMPLEMENTED
S-09
S-10
S-11
S-12
M-11
M-10
M-13

NR ACTIVE DESIGN
NONE in the current gate-open Difficulty-1/2/3 pool

NR HARVEST QUEUE
EMPTY

R FROZEN / PARKED
S-01
S-02
S-04

R ACTIVE
S-03
S-07
S-08
```

Current next operation if continuing idea design:

```text
NEXT R = S-03 Diagnostic Copy Profiles
```

Production boundary remains:

```text
PLUGIN BYTES       UNCHANGED
PLUGIN VERSION     UNCHANGED
release-simcore    UNCHANGED
RUNTIME SEMANTICS  UNCHANGED
v0.64.7 LIVE GATE  STILL PENDING
```
