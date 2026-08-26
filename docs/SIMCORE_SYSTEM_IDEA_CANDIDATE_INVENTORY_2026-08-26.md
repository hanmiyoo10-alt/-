# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `SYSTEM IDEA INVENTORY · UNIFIED CLASSIFICATION · 7 SYSTEM DESIGNS FROZEN · SYSTEM DESIGN SWEEP ACTIVE · NO RUNTIME CHANGE`

Purpose: living inventory for the 52 SimCore system/operations ideas. All rows use the same classification system as every other SimCore idea family.

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Unified axes:

```text
SIZE          = SMALL / MEDIUM / LARGE
IMPORTANCE    = 1..5
DIFFICULTY    = 1..5 (design-completion difficulty)
RUNTIME CLASS = RUNTIME / NON_RUNTIME
DESIGN GATE   = NOW / DEPENDENCY / POST_M2_3 / POST_M2_4 / EVIDENCE / EXTERNAL / FUTURE / FROZEN / ...
APPLY CLASS   = freeze-time DOC_* or NR_* classification
```

## Current inventory

| ID | Candidate | Family | Size | I | D | Class | Gate | Apply |
|---|---|---|---|---:|---:|---|---|---|
| SYS-01 | Living Authority Map | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-02 | Decision / Supersession Graph | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-03 | Gate Dependency Graph | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
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

```text
SYS-19 → docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md
SYS-01 → docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md
SYS-51 → docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md
SYS-08 → docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md
SYS-10 → docs/SIMCORE_SYS10_STALE_NEXT_ACTION_SCANNER_DESIGN.md
SYS-48 → docs/SIMCORE_SYS48_GATE_BLOCKED_REASON_SURFACE_DESIGN.md
SYS-03 → docs/SIMCORE_SYS03_GATE_DEPENDENCY_GRAPH_DESIGN.md
```

## Counts

```text
TOTAL                = 52
FROZEN               = 7
UNFROZEN             = 45
OPEN NOW             = 33
GATED / DEPENDENCY   = 12

NR_DOC_ONLY   = 5
NR_EXECUTABLE = 2
NR_UNASSESSED = 45
```

## Canonical selection

```text
1. DESIGN GATE open
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

Completed current sweep edge:

```text
SYS-19 = I5 D1 / FROZEN / NR_DOC_ONLY
SYS-01 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-51 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-08 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-10 = I5 D2 / FROZEN / NR_EXECUTABLE
SYS-48 = I5 D2 / FROZEN / NR_DOC_ONLY
SYS-03 = I5 D3 / FROZEN / NR_EXECUTABLE
```

Remaining I5 / D3 / NOW:

```text
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

Canonical next:

```text
NEXT = SYS-09 Change-Impact Review Map
```

Reason: SYS-01 says where authority lives, SYS-51 says which close surfaces to evaluate, SYS-03 now maps explicit gate-review dependencies, and SYS-09 can next map changed path/authority families to the review obligations that should feed those close surfaces and later conformance checks.

## Non-duplication boundaries

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
stale NEXT detection → SYS-10
gate-blocked explanation → SYS-48
direct gate review dependency lookup → SYS-03; no gate-state inference/automatic unlock/priority selection
```

Application/implementation remains a separate transaction and is held while the current system design sweep is active.

## Production boundary

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
