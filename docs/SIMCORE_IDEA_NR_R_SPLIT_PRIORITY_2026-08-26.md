# SimCore Idea Priority — NON_RUNTIME / RUNTIME Split Queues — 2026-08-26

Status: `CANONICAL IDEA SELECTION QUEUES · NR DIFFICULTY-1/2/3 HARVEST COMPLETE · CURRENT GATE-OPEN R DESIGN SWEEP CLOSED · S-04 DOC_APPLIED · NO RUNTIME CHANGE`

Purpose: keep NON_RUNTIME and RUNTIME idea selection independent so repository/tooling harvest work and future runtime stabilization do not compete in one mixed priority queue.

Related authority:
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_IDEA_PREP_NON_RUNTIME_POLICY.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md`

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

| State | ID | Idea | Size | Importance | Difficulty | Gate / disposition |
|---|---|---|---|---:|---:|---|
| FROZEN | S-02 | Diagnostic Quick Summary | SMALL | 5 | 1 | runtime PARKED · DOC_NOT_REQUIRED |
| FROZEN | S-04 | Live Evidence Packet Builder | SMALL | 5 | 2 | runtime PARKED · DOC_APPLIED · R_PREP complete |
| GATED | S-05 | Reconcile Differential Receipt | SMALL | 5 | 2 | POST_M2_3 |
| GATED | M-03 | Genuine Edit Rebuild Performance Study | MEDIUM | 5 | 4 | POST_M2_3 |
| FROZEN | S-01 | MINI_WARNING_WIDGET_V1 | SMALL | 4 | 2 | runtime PARKED · DOC_NOT_REQUIRED |
| GATED | M-01 | Turn Transaction / Phase Receipt | MEDIUM | 4 | 3 | POST_M2_3 |
| GATED | M-06 | State Invariant Snapshot | MEDIUM | 4 | 4 | POST_M2_4 |
| FROZEN | S-03 | Diagnostic Copy Profiles | SMALL | 3 | 2 | runtime PARKED · DOC_NOT_REQUIRED |
| FROZEN | S-07 | Host Capability Receipt | SMALL | 3 | 2 | runtime PARKED · DOC_NOT_REQUIRED |
| GATED | M-02 | Ownership-aware Diagnostic Attribution | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-05 | Phase Performance Budget | MEDIUM | 3 | 3 | POST_M2_3 |
| GATED | M-04 | Store Write Cost / Commit Budget | MEDIUM | 3 | 4 | EVIDENCE |
| GATED | M-09 | Provider Cache Receipt Integration | MEDIUM | 3 | 4 | EXTERNAL |
| FUTURE | M-17 | Pure State Seam | MEDIUM | 3 | 4 | FUTURE / TD-09 |
| FUTURE | L-02 | Performance-aware SnapshotStore Evolution | LARGE | 3 | 5 | EVIDENCE / FUTURE |
| FROZEN | S-08 | History Frontier Confidence Surface | SMALL | 2 | 2 | runtime PARKED · DOC_NOT_REQUIRED |
| GATED | S-06 | Persistence Footprint Watch | SMALL | 2 | 2 | EVIDENCE |

### 3.1 Current gate-open R design state

```text
S-03 Diagnostic Copy Profiles
→ DESIGN FROZEN / DOC_NOT_REQUIRED

S-07 Host Capability Receipt
→ DESIGN FROZEN / DOC_NOT_REQUIRED

S-08 History Frontier Confidence Surface
→ DESIGN FROZEN / DOC_NOT_REQUIRED
```

Result:

```text
CURRENT GATE-OPEN R DESIGN = NONE
CURRENT DESIGN SWEEP = CLOSED
```

Gated/future R items do not block this bounded sweep. When a legitimate gate opens, that item begins a new incremental design sweep.

### 3.2 Frozen-R prep review

```text
S-01 MINI_WARNING_WIDGET_V1
→ runtime PARKED
→ DOC_NOT_REQUIRED

S-02 Diagnostic Quick Summary
→ runtime PARKED
→ DOC_NOT_REQUIRED

S-03 Diagnostic Copy Profiles
→ runtime PARKED
→ DOC_NOT_REQUIRED

S-07 Host Capability Receipt
→ runtime PARKED
→ DOC_NOT_REQUIRED

S-08 History Frontier Confidence Surface
→ runtime PARKED
→ DOC_NOT_REQUIRED

S-04 Live Evidence Packet Builder
→ runtime PARKED
→ DOC_APPLIED
→ R_PREP_NON_RUNTIME COMPLETE
→ artifact: docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md
→ evidence: docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

### 3.3 R runtime completion rule

```text
DESIGN COMPLETE
→ DESIGN FROZEN
→ freeze-time DOC APPLY verdict
→ RUNTIME CORE PARKED FOR STABILIZATION
→ STOP
```

A completed R_PREP artifact never promotes the runtime core to implemented.

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
S-03
S-04
S-07
S-08

R ACTIVE GATE-OPEN DESIGN
NONE

R DOC APPLY QUEUE
EMPTY

R DOC APPLIED
S-04
```

Current legitimate next operation:

```text
wait for a legitimate NR/R design gate to open
OR
perform separately selected non-runtime permanent-fixture work under its own authority
OR
close the pending v0.64.7 real-long-chat gate before physical M2-3
```

Production boundary remains:

```text
PLUGIN BYTES         UNCHANGED
PLUGIN VERSION       UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      UNCHANGED
RUNTIME SEMANTICS    UNCHANGED
v0.64.7 LIVE GATE    STILL PENDING
```
