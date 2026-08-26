# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `SYSTEM IDEA INVENTORY · UNIFIED CLASSIFICATION · 23 SYSTEM DESIGNS FROZEN · SYSTEM DESIGN SWEEP ACTIVE · NO RUNTIME CHANGE`

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
| SYS-02 | Decision / Supersession Graph | Authority | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-03 | Gate Dependency Graph | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-04 | Status Vocabulary Linter | Authority | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-05 | Historical-vs-Living Document Registry | Authority | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-06 | Evidence-to-Decision Trace Map | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-07 | Cross-Reference Integrity Auditor | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-08 | Work-Item Close Receipt | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-09 | Change-Impact Review Map | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-10 | Stale Next-Action Scanner | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-11 | Design-to-Implementation Drift Audit | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-12 | Current-State Snapshot Page | Authority | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-13 | Verification Proof Matrix | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-14 | Evidence Freshness Ledger | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-15 | WATCH Aging Review | Evidence | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-16 | Anomaly Recurrence Correlator | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-17 | Missing Evidence Slot Analyzer | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-18 | Evidence Provenance Chain Receipt | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-19 | Live-Gate Handoff Packet | Evidence | SMALL | 5 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-20 | Natural Evidence Intake Checklist Generator | Evidence | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-21 | Forensic Classification Consistency Check | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-22 | Test Intent Manifest | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-23 | Negative-Control Registry | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-24 | Fixture Orphan Detector | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-25 | Golden Fixture Mutation Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-26 | Coverage Promotion Readiness Scanner | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-27 | Cross-Version Regression Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-28 | Verification Debt Index | Regression | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-29 | Contract-to-Fixture Gap View | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-30 | Release-to-Docs Convergence Receipt | Release | MEDIUM | 5 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-31 | Version-Bump Blast-Radius Check | Release | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_PROTECTED |
| SYS-32 | Release Candidate Provenance Viewer | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-33 | Rollback Readiness Checklist | Release | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-34 | Post-Release Convergence Checklist Generator | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-35 | Repository Transaction Ledger | Release | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-36 | Branch/PR Relationship Auditor | Release | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-37 | Release-System Residual Cleanup Registry | Release | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-38 | Architecture Contract Diff Reporter | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-39 | Import-Boundary Trend Report | Architecture | MEDIUM | 3 | 3 | NON_RUNTIME | EVIDENCE | NR_UNASSESSED |
| SYS-40 | Dead Module / Export Scanner | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-41 | Public Test-Seam Inventory | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-42 | Implementation Slice Conformance Checker | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_PROTECTED |
| SYS-43 | M2 Checkpoint Close Pack | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-44 | Ownership Migration Ledger | Architecture | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-45 | State-Surface Change Receipt | Architecture | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-46 | Canonical Task Card | Workflow | SMALL | 4 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-47 | User Handoff Card | Workflow | SMALL | 4 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-48 | Gate-Blocked Reason Surface | Workflow | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-49 | Safe Parallel Work Finder | Workflow | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-50 | Work Bundling Conflict Detector | Workflow | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
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
SYS-09 → docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md
SYS-50 → docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md
SYS-42 → docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md
SYS-11 → docs/SIMCORE_SYS11_DESIGN_TO_IMPLEMENTATION_DRIFT_AUDIT_DESIGN.md
SYS-13 → docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md
SYS-17 → docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md
SYS-22 → docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md
SYS-21 → docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md
SYS-38 → docs/SIMCORE_SYS38_ARCHITECTURE_CONTRACT_DIFF_REPORTER_DESIGN.md
SYS-31 → docs/SIMCORE_SYS31_VERSION_BUMP_BLAST_RADIUS_CHECK_DESIGN.md
SYS-35 → docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md
SYS-46 → docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md
SYS-47 → docs/SIMCORE_SYS47_USER_HANDOFF_CARD_DESIGN.md
SYS-05 → docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md
SYS-04 → docs/SIMCORE_SYS04_STATUS_VOCABULARY_LINTER_DESIGN.md
SYS-02 → docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md
```

## Counts

```text
TOTAL                = 52
FROZEN               = 23
UNFROZEN             = 29
OPEN NOW             = 17
GATED / DEPENDENCY   = 12

NR_DOC_ONLY   = 15
NR_EXECUTABLE = 6
NR_PROTECTED  = 2
NR_UNASSESSED = 29
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
SYS-09 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-50 = I5 D3 / FROZEN / NR_EXECUTABLE
SYS-42 = I5 D3 / FROZEN / NR_PROTECTED
SYS-11 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-13 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-17 = I5 D3 / FROZEN / NR_EXECUTABLE
SYS-22 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-21 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-38 = I5 D3 / FROZEN / NR_EXECUTABLE
SYS-31 = I5 D3 / FROZEN / NR_PROTECTED
SYS-35 = I5 D3 / FROZEN / NR_DOC_ONLY
SYS-46 = I4 D1 / FROZEN / NR_DOC_ONLY
SYS-47 = I4 D1 / FROZEN / NR_DOC_ONLY
SYS-05 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-04 = I4 D2 / FROZEN / NR_EXECUTABLE
SYS-02 = I4 D2 / FROZEN / NR_DOC_ONLY
```

Highest-priority open edge now:

```text
I4 / D2 / NOW
SYS-12 Current-State Snapshot Page
SYS-23 Negative-Control Registry
SYS-28 Verification Debt Index
SYS-33 Rollback Readiness Checklist
SYS-52 Operator Error Specimen Ledger
```

Canonical next:

```text
NEXT = SYS-12 Current-State Snapshot Page
```

Reason: SYS-05 now supplies reviewed lifecycle boundaries, SYS-04 supplies deterministic status-namespace boundaries, and SYS-02 supplies explicit predecessor/successor decision lineage. Among the remaining I4/D2 candidates, SYS-12 can now project a compact current-state view from actual current authorities while excluding historical/superseded instruction without guessing from filenames, age, or status words. This gives the broadest immediate navigation value and provides a clean input surface for later cross-reference and evidence trace work.

## Non-duplication boundaries

```text
production identity check → S-10 + sync-state
Evidence Index generated navigation → M-13
natural specimen registry → S-12
PR stale classification → S-11
architecture parsing/contracts → existing architecture checker
release publication → existing permanent release authority
permanent CI path routing → RS2-3B classifier
RT semantics → Real-Time Close-Step parent design
close trigger selection → SYS-51
one-work closure summary → SYS-08
stale NEXT detection → SYS-10
gate-blocked explanation → SYS-48
direct gate review dependency lookup → SYS-03
change-family → review obligations → SYS-09
work-family/role bundling preflight → SYS-50
machine-verifiable frozen implementation-slice conformance → SYS-42
human semantic design-to-implementation drift review → SYS-11
proof-kind × claim-kind scope/non-equivalence matrix → SYS-13
explicit bounded required-evidence-slot completeness → SYS-17
test surface → intended claims + explicit non-claims → SYS-22
forensic classification ↔ cited evidence/proof/impact consistency → SYS-21; human-reviewed only, no auto severity promotion/demotion, recurrence discovery, gate close, or repo mutation
immutable M-11 snapshots + machine contracts → exact before/after architecture delta → SYS-38; no second parser/checker, no expectedness/conformance judgment, no contract/CI mutation
reviewed release intent + observed production identity + reviewed transaction radius → version/release blast-radius disposition → SYS-31; no version bump, candidate creation, publication, state write, CI/release policy mutation, or LIVE_PASS promotion
curated meaningful repository transaction identities + authority/mutation classes + lineage links → SYS-35; Git/GitHub/release records remain exact natural authorities, no every-commit scrape, current-state authority, repo writer, or release authorization
selected bounded work + reviewed authorities → canonical internal task identity/objective/WT/scope/gate/mutation/stop contract → SYS-46; no scheduler, global NEXT, gate engine, close receipt, proof authority, user handoff, repo writer, or implementation authorization
canonical task/gate facts + user-relevant authoritative facts → compact user-facing action/decision/wait/scope/stop projection → SYS-47; no second task identity, gate engine, live-experiment semantic authority, proof/classifier, close receipt, scheduler, or repo writer
reviewed document/family lifecycle + explicit section exceptions → curated living/historical/frozen/evidence/template role metadata → SYS-05; no current-state value cache, authority map, stale-content scanner, status linter, supersession graph, crawler, doc writer, or runtime/release authority
registered status namespace + registered structured target + SYS-05 lifecycle scope → deterministic vocabulary/namespace/cardinality lint → SYS-04; no semantic status classification, stale-state judgment, global enum, repo-wide prose grep, writer, CI authority, release authority, or runtime behavior
reviewed predecessor decision scope + reviewed successor/retirement decision scope + explicit affected/preserved scope → curated supersession lineage → SYS-02; no newest-file inference, current-state authority, gate dependency, repository transaction graph, evidence trace, generic reference graph, automatic semantic diff, repo writer, release authority, or runtime behavior
```

Application/implementation remains a separate transaction and is held while the current system design sweep is active. SYS-42 and SYS-31 are `NR_PROTECTED`, so their later implementations require dedicated protected transactions rather than ordinary NR harvest. SYS-10, SYS-03, SYS-50, SYS-17, SYS-38, and SYS-04 are `NR_EXECUTABLE`; SYS-35, SYS-46, SYS-47, SYS-05, and SYS-02 are `NR_DOC_ONLY`; all remain application/implementation-HOLD while this design sweep is active.

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