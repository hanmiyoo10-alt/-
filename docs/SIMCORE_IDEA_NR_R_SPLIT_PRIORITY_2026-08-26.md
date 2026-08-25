# SimCore Idea Priority — NON_RUNTIME / RUNTIME Split Queues — 2026-08-26

Status: `CANONICAL IDEA SELECTION QUEUES · NR DIFFICULTY-1/2 HARVEST COMPLETE · NR DIFFICULTY-3 DESIGN TIER CLOSED · HARVEST REVIEW PENDING · NO RUNTIME CHANGE`

Purpose: keep NON_RUNTIME and RUNTIME idea selection independent so repository/tooling harvest work and future runtime stabilization do not compete in one mixed queue.

Related authority:
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md` — complete 31-item scoring/classification baseline
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md` — S/M/L classification
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md` — design completion/freeze rule
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md` — NR-lane SAFE_NON_RUNTIME harvest rule
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md` — completion/implementation history

This document is the current NR/R selection queue authority. Older combined matrices remain inventory/scoring baselines.

---

## 1. Canonical split

```text
NON_RUNTIME QUEUE (NR)
= repository/tooling/static/evidence/test/build surfaces
= select/design inside NR only
= close currently-designable NR difficulty tiers independently
= SAFE_NON_RUNTIME harvest only after tier close + per-item review

RUNTIME QUEUE (R)
= plugin/runtime/Host/state/prompt/runtime diagnostic surfaces
= select/design inside R only
= frozen runtime designs remain PARKED until stabilization
```

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
| FROZEN | M-11 | Architecture Dependency Snapshot Generator | MEDIUM | 5 | 3 | NR Difficulty-3 closed · harvest review pending |
| GATED | M-07 | Commit / Observation Separation Guard | MEDIUM | 5 | 4 | POST_M2_4 |
| GATED | M-12 | State Writer Static Audit | MEDIUM | 5 | 4 | POST_M2_3 |
| GATED | M-16 | Differential Architecture Fixtures | MEDIUM | 5 | 4 | M2 implementation slice |
| IMPLEMENTED | S-12 | Natural Evidence Corpus Index | SMALL | 4 | 2 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |
| FROZEN | M-10 | Live Diagnostic → Fixture Skeleton Generator | MEDIUM | 4 | 3 | NR Difficulty-3 closed · harvest review pending |
| FROZEN | M-13 | Evidence Index Generator | MEDIUM | 4 | 3 | DESIGN FROZEN · NR Difficulty-3 closed · harvest review pending |
| GATED | M-08 | Snapshot Schema Inventory Generator | MEDIUM | 4 | 3 | POST_M2_3 |
| GATED | M-14 | Release Evidence Packet | MEDIUM | 4 | 3 | dependency: R2.1 genuine release proof |
| GATED | M-15 | Fixture Coverage Matrix by Ownership | MEDIUM | 4 | 3 | POST_M2_3 |
| FUTURE | L-01 | Development-source Modular Build | LARGE | 4 | 5 | FUTURE / POST_M2 |
| IMPLEMENTED | S-11 | Stale PR Hygiene Classifier | SMALL | 3 | 2 | FROZEN · SAFE_NON_RUNTIME_IMPLEMENTED |

## 2.1 Current NR selection state

There are currently no undesigned + gate-open NR items in the bounded Difficulty-1/2/3 design pool.

The just-completed Difficulty-3 design set is:

```text
M-11 Architecture Dependency Snapshot Generator   FROZEN
M-10 Live Diagnostic → Fixture Skeleton Generator FROZEN
M-13 Evidence Index Generator                     FROZEN
```

The next NR operation is not another design selection. It is:

```text
NR Difficulty-3 SAFE_NON_RUNTIME HARVEST REVIEW
→ review M-11
→ review M-10
→ review M-13
→ authorize only items that pass the strict boundary
```

Gated/future NR items remain untouched until their own gates open.

## 2.2 Frozen M-10 boundary

```text
reviewed live evidence descriptor
→ fixture-skeleton-v1
→ REVIEW_REQUIRED
→ separate suite-owner promotion
→ only then fixture-v1

direct fixture-v1 generation = FORBIDDEN
goldenGate / registry mutation = FORBIDDEN
raw live body retention = FORBIDDEN
semantic inference = FORBIDDEN
```

## 2.3 Frozen M-13 boundary

Design authority:

```text
docs/SIMCORE_EVIDENCE_INDEX_GENERATOR_DESIGN.md
```

Canonical M-13 flow:

```text
review semantic/evidence authorities
→ explicitly maintain evidence-index-source-v1.json
→ validate mechanical invariants
→ resolve fixture execution class from permanent registry
→ deterministic docs/SIMCORE_EVIDENCE_INDEX.md render/check
```

Frozen authority split:

```text
contract/evidence/gate/debt documents
= semantic + evidence authority

evidence-index-source-v1.json
= reviewed index-curation source only

docs/SIMCORE_EVIDENCE_INDEX.md
= generated human navigation view
```

Forbidden:

```text
repo-wide evidence discovery
latest-evidence inference
Owner inference
PASS/WATCH/GAP inference
fixture-exists → PASS inference
automatic semantic reconciliation
auto-commit / auto-PR
CI/release-policy restructuring
```

## 2.4 NR difficulty buckets / harvest state

```text
NR Difficulty 1
- S-09  importance 5  IMPLEMENTED
→ CLOSED / HARVEST COMPLETE

NR Difficulty 2
- S-10  importance 5  IMPLEMENTED
- S-12  importance 4  IMPLEMENTED
- S-11  importance 3  IMPLEMENTED
→ CLOSED / HARVEST COMPLETE

NR Difficulty 3
- M-11  importance 5  FROZEN
- M-10  importance 4  FROZEN
- M-13  importance 4  FROZEN
- M-08  importance 4  POST_M2_3
- M-14  importance 4  DEPENDENCY
- M-15  importance 4  POST_M2_3
→ CURRENTLY DESIGNABLE TIER CLOSED
→ SAFE_NON_RUNTIME HARVEST REVIEW PENDING

NR Difficulty 4
- M-07  importance 5  POST_M2_4
- M-12  importance 5  POST_M2_3
- M-16  importance 5  implementation-bound

NR Difficulty 5
- L-01  importance 4  FUTURE
```

Previously gated NR items that open later form a new incremental cycle; they do not retroactively invalidate an already completed bounded design/harvest tier.

## 2.5 Completed easy NR harvest

```text
S-09
→ Evidence Index materialized
→ PR #394
→ main 31d46cfeded5171c49503fe4cd4a11fe4cc8a573

S-10
→ read-only Authority Drift checker
→ PR #396
→ main b6ed7f52e08d204577b10747837dc36b814717ac

S-11
→ offline Stale PR Hygiene classifier
→ PR #398
→ main d3fba820fd53340948ebcd8248e2458630011c90

S-12
→ Natural Evidence Corpus materialized
→ PR #399
→ main 0b9113f4d619471167b20077da4e522406665e75
```

All preserve:

```text
plugin version unchanged
latest.js/install.js unchanged
release-simcore unchanged
runtime semantics unchanged
```

S-10/S-11 carry a non-blocking verification-coverage WATCH because current permanent CI does not automatically execute arbitrary new standalone tooling `.test.mjs` files. CI-discovery changes remain a separate repo/CI item.

## 2.6 NR implementation rule

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
R-2  S-07 Host Capability Receipt
R-3  S-08 History Frontier Confidence Surface
```

Runtime completion rule:

```text
DESIGN COMPLETE
→ DESIGN FROZEN
→ PARKED FOR STABILIZATION
→ STOP
```

No R item becomes harvestable because an NR tier closed.

---

# 4. Current lane verdict

```text
NR IMPLEMENTED
S-09
S-10
S-11
S-12

NR DIFFICULTY-3 FROZEN / HARVEST REVIEW PENDING
M-11
M-10
M-13

NR ACTIVE DESIGN
NONE in current open Difficulty-1/2/3 pool

R FROZEN / PARKED
S-01
S-02
S-04

R ACTIVE
S-03
S-07
S-08
```

Current next operations:

```text
NEXT NR = Difficulty-3 SAFE_NON_RUNTIME harvest review
NEXT R  = S-03 Diagnostic Copy Profiles
```

Production boundary remains:

```text
PLUGIN BYTES       UNCHANGED
PLUGIN VERSION     UNCHANGED
release-simcore    UNCHANGED
RUNTIME SEMANTICS  UNCHANGED
v0.64.7 LIVE GATE  STILL PENDING
```
