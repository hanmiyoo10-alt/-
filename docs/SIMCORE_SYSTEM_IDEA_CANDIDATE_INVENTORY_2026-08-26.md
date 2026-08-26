# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `SYSTEM IDEA INVENTORY · UNIFIED CLASSIFICATION · 6 SYSTEM DESIGNS FROZEN · SYSTEM DESIGN SWEEP ACTIVE · NO RUNTIME CHANGE`

Purpose: living inventory for the 52 SimCore system/operations ideas. All rows use the same classification system as product/runtime ideas.

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

Existing systems intentionally not duplicated: S-10, S-11, S-12, M-10, M-11, M-13, Real-Time Close-Step, Release System v2/v2.1.

## 1. Unified axes

```text
SIZE          = SMALL / MEDIUM / LARGE
IMPORTANCE    = 1..5
DIFFICULTY    = 1..5 (design-completion difficulty)
RUNTIME CLASS = RUNTIME / NON_RUNTIME
DESIGN GATE   = NOW / DEPENDENCY / POST_M2_3 / POST_M2_4 / EVIDENCE / EXTERNAL / FUTURE / FROZEN / ...
APPLY CLASS   = freeze-time DOC_* or NR_* classification
```

All system ideas remain `NON_RUNTIME` unless a frozen design proves otherwise. Unfrozen rows are `NR_UNASSESSED`.

## 2. Current inventory

| ID | Candidate | Family | Size | I | D | Class | Gate | Apply |
|---|---|---|---|---:|---:|---|---|---|
| SYS-01 | Living Authority Map | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-02 | Decision / Supersession Graph | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-03 | Gate Dependency Graph | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-04 | Status Vocabulary Linter | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-05 | Historical-vs-Living Document Registry | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-06 | Evidence-to-Decision Trace Map | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-07 | Cross-Reference Integrity Auditor | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-08 | Work-Item Close Receipt | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-09 | Change-Impact Review Map | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-10 | Stale Next-Action Scanner | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-11 | Design-to-Implementation Drift Audit | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-12 | Current-State Snapshot Page | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-13 | Verification Proof Matrix | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-14 | Evidence Freshness Ledger | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-15 | WATCH Aging Review | Evidence | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-16 | Anomaly Recurrence Correlator | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-17 | Missing Evidence Slot Analyzer | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-18 | Evidence Provenance Chain Receipt | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-19 | Live-Gate Handoff Packet | Evidence | SMALL | 5 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-20 | Natural Evidence Intake Checklist Generator | Evidence | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-21 | Forensic Classification Consistency Check | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-22 | Test Intent Manifest | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-23 | Negative-Control Registry | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-24 | Fixture Orphan Detector | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-25 | Golden Fixture Mutation Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-26 | Coverage Promotion Readiness Scanner | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-27 | Cross-Version Regression Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-28 | Verification Debt Index | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-29 | Contract-to-Fixture Gap View | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-30 | Release-to-Docs Convergence Receipt | Release | MEDIUM | 5 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-31 | Version-Bump Blast-Radius Check | Release | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-32 | Release Candidate Provenance Viewer | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-33 | Rollback Readiness Checklist | Release | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-34 | Post-Release Convergence Checklist Generator | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-35 | Repository Transaction Ledger | Release | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-36 | Branch/PR Relationship Auditor | Release | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-37 | Release-System Residual Cleanup Registry | Release | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-38 | Architecture Contract Diff Reporter | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-39 | Import-Boundary Trend Report | Architecture | MEDIUM | 3 | 3 | NON_RUNTIME | EVIDENCE | NR_UNASSESSED |
| SYS-40 | Dead Module / Export Scanner | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-41 | Public Test-Seam Inventory | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-42 | Implementation Slice Conformance Checker | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-43 | M2 Checkpoint Close Pack | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-44 | Ownership Migration Ledger | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-45 | State-Surface Change Receipt | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-46 | Canonical Task Card | Workflow | SMALL | 4 | 1 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-47 | User Handoff Card | Workflow | SMALL | 4 | 1 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-48 | Gate-Blocked Reason Surface | Workflow | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-49 | Safe Parallel Work Finder | Workflow | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-50 | Work Bundling Conflict Detector | Workflow | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-51 | Close-Step Trigger Matrix | Workflow | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-52 | Operator Error Specimen Ledger | Workflow | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |

Frozen design authorities:
- SYS-19 → `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md`
- SYS-01 → `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- SYS-51 → `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- SYS-08 → `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- SYS-10 → `docs/SIMCORE_SYS10_STALE_NEXT_ACTION_SCANNER_DESIGN.md`
- SYS-48 → `docs/SIMCORE_SYS48_GATE_BLOCKED_REASON_SURFACE_DESIGN.md`

## 3. Counts

```text
TOTAL                = 52
FROZEN               = 6
UNFROZEN             = 46
OPEN NOW             = 34
GATED / DEPENDENCY   = 12

SIZE
SMALL  = 20
MEDIUM = 32
LARGE  = 0

RUNTIME CLASS
NON_RUNTIME = 52
RUNTIME     = 0

APPLY CLASS
NR_DOC_ONLY   = 5
NR_EXECUTABLE = 1
NR_UNASSESSED = 46
```

Importance/difficulty baseline remains unchanged:

```text
I5 = 23 / I4 = 25 / I3 = 4
D1 = 3 / D2 = 17 / D3 = 32
```

## 4. Canonical selection

```text
1. DESIGN GATE open
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

Completed:

```text
SYS-19 = I5 D1 / FROZEN / NR_DOC_ONLY
SYS-01 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-51 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-08 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-10 = I5 D2 / FROZEN / NR_EXECUTABLE
SYS-48 = I5 D2 / FROZEN / NR_DOC_ONLY
```

Current highest-priority open edge:

```text
I5 / D3 / NOW
SYS-03 Gate Dependency Graph
SYS-09 Change-Impact Review Map
SYS-11 Design-to-Implementation Drift Audit
SYS-13 Verification Proof Matrix
SYS-17 Missing Evidence Slot Analyzer
SYS-21 Forensic Classification Consistency Check
SYS-22 Test Intent Manifest
SYS-31 Version-Bump Blast-Radius Check
SYS-35 Repository Transaction Ledger
SYS-38 Architecture Contract Diff Reporter
SYS-42 Implementation Slice Conformance Checker
SYS-50 Work Bundling Conflict Detector
```

Downstream-leverage next:

```text
NEXT = SYS-03 Gate Dependency Graph
```

Reason: SYS-48 now defines the bounded human explanation of one gate. SYS-03 is the complementary system-wide dependency model needed to make future RT-11 gate-unlock propagation, blocked-reason review, and incremental sweep reopening structurally explicit without changing gate authority.

## 5. Non-duplication boundaries

```text
production identity check → S-10 + sync-state
Evidence Index generated navigation → M-13
natural specimen registry → S-12
PR stale classification → S-11
architecture parsing/contracts → existing architecture checker
release publication → existing permanent release authority
RT semantics → Real-Time Close-Step parent design
close trigger selection → SYS-51
one-work closure summary → SYS-08
stale NEXT detection → SYS-10 only; no priority calculation or auto-repair
gate-blocked explanation → SYS-48; no dependency calculation or automatic unlock
```

A system idea that duplicates one of these authorities must be redesigned before freeze.

## 6. Candidate-to-design rule

```text
candidate
→ bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ confirm unified classification
→ assign freeze-time apply class
→ STOP
```

Application/implementation is a separate transaction and remains held while the current system design sweep is active.

## 7. Production boundary

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
