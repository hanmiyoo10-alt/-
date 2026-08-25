# SimCore Idea Priority — NON_RUNTIME / RUNTIME Split Queues — 2026-08-26

Status: `CANONICAL IDEA SELECTION QUEUES · NR DIFFICULTY-1/2/3 HARVEST COMPLETE · RUNTIME CORE PARKED · R_PREP_NON_RUNTIME ENABLED · NO RUNTIME CHANGE`

Purpose: keep NON_RUNTIME and RUNTIME idea selection independent so repository/tooling harvest work and future runtime stabilization do not compete in one mixed priority queue.

Related authority:
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md` — complete 31-item scoring/classification baseline
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md` — S/M/L classification
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md` — design completion/freeze rule
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md` — NR-lane harvest rule
- `docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md` — frozen-R repo-memory prep rule
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
= frozen runtime core remains PARKED until stabilization
= after design freeze, optional separable repo-memory preparation may use R_PREP_NON_RUNTIME
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

### 2.1 Completed harvest tiers

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

Gated NR remains:

```text
M-08 POST_M2_3
M-14 R2.1 genuine release proof dependency
M-15 POST_M2_3
M-07 POST_M2_4
M-12 POST_M2_3
M-16 M2 implementation slice
L-01 FUTURE / POST_M2
```

If one later opens, it begins a new incremental design/harvest cycle.

### 2.2 Current NR selection state

```text
CURRENT OPEN NR DESIGN = NONE
CURRENT NR HARVEST QUEUE = EMPTY
```

Do not select a gated/future NR merely because the current queue is empty.

---

# 3. RUNTIME QUEUE — R

Current total inventory:

```text
RUNTIME = 17
```

The R lane remains runtime-design-first. Runtime core implementation is still parked, but frozen R items may now have separable repo-memory preparation under `R_PREP_NON_RUNTIME`.

| State | ID | Idea | Size | Importance | Difficulty | Gate / disposition |
|---|---|---|---|---:|---:|---|
| FROZEN | S-02 | Diagnostic Quick Summary | SMALL | 5 | 1 | runtime PARKED · R_PREP currently not required |
| FROZEN | S-04 | Live Evidence Packet Builder | SMALL | 5 | 2 | runtime PARKED · R_PREP candidate YES |
| GATED | S-05 | Reconcile Differential Receipt | SMALL | 5 | 2 | POST_M2_3 |
| GATED | M-03 | Genuine Edit Rebuild Performance Study | MEDIUM | 5 | 4 | POST_M2_3 |
| FROZEN | S-01 | MINI_WARNING_WIDGET_V1 | SMALL | 4 | 2 | runtime PARKED · R_PREP currently not required |
| GATED | M-01 | Turn Transaction / Phase Receipt | MEDIUM | 4 | 3 | POST_M2_3 |
| GATED | M-06 | State Invariant Snapshot | MEDIUM | 4 | 4 | POST_M2_4 |
| ACTIVE | S-03 | Diagnostic Copy Profiles | SMALL | 3 | 2 | NOW · design first |
| ACTIVE | S-07 | Host Capability Receipt | SMALL | 3 | 2 | NOW · design first |
| GATED | M-02 | Ownership-aware Diagnostic Attribution | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-05 | Phase Performance Budget | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-04 | Store Write Cost / Commit Budget | MEDIUM | 3 | 4 | EVIDENCE |
| GATED | M-09 | Provider Cache Receipt Integration | MEDIUM | 3 | 4 | EXTERNAL |
| FUTURE | M-17 | Pure State Seam | MEDIUM | 3 | 4 | FUTURE / TD-09 |
| FUTURE | L-02 | Performance-aware SnapshotStore Evolution | LARGE | 3 | 5 | EVIDENCE / FUTURE |
| ACTIVE | S-08 | History Frontier Confidence Surface | SMALL | 2 | 2 | NOW · design first |
| GATED | S-06 | Persistence Footprint Watch | SMALL | 2 | 2 | EVIDENCE |

### 3.1 Current active R design ordering

```text
R-1  S-03 Diagnostic Copy Profiles
     importance 3 / difficulty 2

R-2  S-07 Host Capability Receipt
     importance 3 / difficulty 2

R-3  S-08 History Frontier Confidence Surface
     importance 2 / difficulty 2
```

Active/undesigned R items cannot receive prep implementation before design freeze.

### 3.2 Frozen-R prep review

Policy authority:

```text
docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md
```

Current review:

```text
S-01 MINI_WARNING_WIDGET_V1
→ frozen runtime core remains PARKED
→ additional R_PREP artifact: NONE REQUIRED

S-02 Diagnostic Quick Summary
→ frozen runtime core remains PARKED
→ additional R_PREP artifact: NONE REQUIRED

S-04 Live Evidence Packet Builder
→ frozen runtime core remains PARKED
→ R_PREP candidate: repository evidence-review / classification-handoff template
→ eligible for a separate next work item
```

Reason for S-04 eligibility:

```text
runtime packet = transfer object only
final classification/preservation = repository authority
```

Therefore a manual repo-side review template can be useful now without implementing packet construction, clipboard behavior, diagnostic projection, or runtime UI.

### 3.3 R runtime completion rule

```text
DESIGN COMPLETE
→ DESIGN FROZEN
→ RUNTIME CORE PARKED FOR STABILIZATION
```

Optional after freeze:

```text
useful separable repo-memory preparation
+ strict R_PREP_NON_RUNTIME PASS
→ separate bounded prep work item
→ parent runtime core still PARKED
```

No R item becomes runtime-harvestable because NR tiers closed or because an R_PREP artifact completed.

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
NONE

NR HARVEST QUEUE
EMPTY

R FROZEN / CORE PARKED
S-01
S-02
S-04

R_PREP CURRENT CANDIDATE
S-04 repository evidence-review / classification-handoff template

R ACTIVE DESIGN
S-03
S-07
S-08
```

Current next operations if continuing:

```text
R_PREP path
→ S-04 repo evidence-review / classification-handoff template

R design path
→ S-03 Diagnostic Copy Profiles
```

Production boundary remains:

```text
PLUGIN BYTES       UNCHANGED
PLUGIN VERSION     UNCHANGED
release-simcore    UNCHANGED
RUNTIME SEMANTICS  UNCHANGED
v0.64.7 LIVE GATE  STILL PENDING
```
