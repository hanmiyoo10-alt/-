# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `SYSTEM IDEA INVENTORY · UNIFIED CLASSIFICATION · 38 SYSTEM DESIGNS FROZEN · SYSTEM DESIGN SWEEP ACTIVE · NO RUNTIME CHANGE`

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
| SYS-06 | Evidence-to-Decision Trace Map | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-07 | Cross-Reference Integrity Auditor | Authority | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-08 | Work-Item Close Receipt | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-09 | Change-Impact Review Map | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-10 | Stale Next-Action Scanner | Authority | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-11 | Design-to-Implementation Drift Audit | Authority | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-12 | Current-State Snapshot Page | Authority | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-13 | Verification Proof Matrix | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-14 | Evidence Freshness Ledger | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-15 | WATCH Aging Review | Evidence | SMALL | 3 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-16 | Anomaly Recurrence Correlator | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-17 | Missing Evidence Slot Analyzer | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-18 | Evidence Provenance Chain Receipt | Evidence | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-19 | Live-Gate Handoff Packet | Evidence | SMALL | 5 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-20 | Natural Evidence Intake Checklist Generator | Evidence | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED |
| SYS-21 | Forensic Classification Consistency Check | Evidence | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-22 | Test Intent Manifest | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-23 | Negative-Control Registry | Regression | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-24 | Fixture Orphan Detector | Regression | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_PROTECTED |
| SYS-25 | Golden Fixture Mutation Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-26 | Coverage Promotion Readiness Scanner | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-27 | Cross-Version Regression Receipt | Regression | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-28 | Verification Debt Index | Regression | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-29 | Contract-to-Fixture Gap View | Regression | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED |
| SYS-30 | Release-to-Docs Convergence Receipt | Release | MEDIUM | 5 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-31 | Version-Bump Blast-Radius Check | Release | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_PROTECTED |
| SYS-32 | Release Candidate Provenance Viewer | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-33 | Rollback Readiness Checklist | Release | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-34 | Post-Release Convergence Checklist Generator | Release | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED |
| SYS-35 | Repository Transaction Ledger | Release | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-36 | Branch/PR Relationship Auditor | Release | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_PROTECTED |
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
| SYS-49 | Safe Parallel Work Finder | Workflow | MEDIUM | 4 | 3 | NON_RUNTIME | FROZEN | NR_PROTECTED |
| SYS-50 | Work Bundling Conflict Detector | Workflow | MEDIUM | 5 | 3 | NON_RUNTIME | FROZEN | NR_EXECUTABLE |
| SYS-51 | Close-Step Trigger Matrix | Workflow | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |
| SYS-52 | Operator Error Specimen Ledger | Workflow | SMALL | 4 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY |

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
SYS-12 → docs/SIMCORE_SYS12_CURRENT_STATE_SNAPSHOT_PAGE_DESIGN.md
SYS-28 → docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md
SYS-23 → docs/SIMCORE_SYS23_NEGATIVE_CONTROL_REGISTRY_DESIGN.md
SYS-33 → docs/SIMCORE_SYS33_ROLLBACK_READINESS_CHECKLIST_DESIGN.md
SYS-24 → docs/SIMCORE_SYS24_FIXTURE_ORPHAN_DETECTOR_DESIGN.md
SYS-52 → docs/SIMCORE_SYS52_OPERATOR_ERROR_SPECIMEN_LEDGER_DESIGN.md
SYS-06 → docs/SIMCORE_SYS06_EVIDENCE_TO_DECISION_TRACE_MAP_DESIGN.md
SYS-18 → docs/SIMCORE_SYS18_EVIDENCE_PROVENANCE_CHAIN_RECEIPT_DESIGN.md
SYS-14 → docs/SIMCORE_SYS14_EVIDENCE_FRESHNESS_LEDGER_DESIGN.md
SYS-07 → docs/SIMCORE_SYS07_CROSS_REFERENCE_INTEGRITY_AUDITOR_DESIGN.md
SYS-36 → docs/SIMCORE_SYS36_BRANCH_PR_RELATIONSHIP_AUDITOR_DESIGN.md
SYS-49 → docs/SIMCORE_SYS49_SAFE_PARALLEL_WORK_FINDER_DESIGN.md
SYS-16 → docs/SIMCORE_SYS16_ANOMALY_RECURRENCE_CORRELATOR_DESIGN.md
SYS-25 → docs/SIMCORE_SYS25_GOLDEN_FIXTURE_MUTATION_RECEIPT_DESIGN.md
SYS-15 → docs/SIMCORE_SYS15_WATCH_AGING_REVIEW_DESIGN.md
```

## Counts

```text
TOTAL                = 52
FROZEN               = 38
UNFROZEN             = 14
OPEN NOW             = 2
GATED / DEPENDENCY   = 12

NR_DOC_ONLY   = 26
NR_EXECUTABLE = 7
NR_PROTECTED  = 5
NR_UNASSESSED = 14
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
SYS-12 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-28 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-23 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-33 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-24 = I4 D2 / FROZEN / NR_PROTECTED
SYS-52 = I4 D2 / FROZEN / NR_DOC_ONLY
SYS-06 = I4 D3 / FROZEN / NR_DOC_ONLY
SYS-18 = I4 D3 / FROZEN / NR_DOC_ONLY
SYS-14 = I4 D3 / FROZEN / NR_DOC_ONLY
SYS-07 = I4 D3 / FROZEN / NR_EXECUTABLE
SYS-36 = I4 D3 / FROZEN / NR_PROTECTED
SYS-49 = I4 D3 / FROZEN / NR_PROTECTED
SYS-16 = I4 D3 / FROZEN / NR_DOC_ONLY
SYS-25 = I4 D3 / FROZEN / NR_DOC_ONLY
SYS-15 = I3 D2 / FROZEN / NR_DOC_ONLY
```

Selection drift note:

```text
SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24
= FIX / DOC_DRIFT / NON_RUNTIME / NON_BLOCKING
= preserved in docs/SIMCORE_SYSTEM_IDEA_SELECTION_DRIFT_FIX_SYS24_2026-08-26.md
= closed by freezing SYS-24 before SYS-52 and resynchronizing the living edge
```

The I4/D3/NOW edge is fully frozen. SYS-15 is now the first frozen member of the I3/D2/NOW edge.

Highest-priority open edge now:

```text
I3 / D2 / NOW
SYS-20 Natural Evidence Intake Checklist Generator
SYS-37 Release-System Residual Cleanup Registry
```

Canonical next:

```text
NEXT = SYS-20 Natural Evidence Intake Checklist Generator
```

Reason: SYS-15 now freezes event-driven WATCH aging without age-based severity or dismissal. SYS-20 is the strongest remaining direct evidence-lifecycle consumer because current v0.64.7 real-long-chat validation is still pending and every new natural specimen should arrive with enough identity, reroll/control, recurrence-discriminator, proof-scope and follow-up metadata to feed S-12, SYS-16, SYS-15, SYS-21 and SYS-28 without later reconstruction from chat memory. SYS-37 remains explicitly listed as the peer I3/D2/NOW item so it cannot be silently skipped. After SYS-20, recompute the remaining NOW edge rather than assuming fixed ordering.

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
reviewed current authorities + lifecycle boundaries + supersession lineage → compact current-only source-referenced projection → SYS-12; no source-of-truth ownership, historical ledger, roadmap authority, gate engine, evidence classifier, stale scanner, repo writer, release authority, or runtime behavior
explicit verification obligation/WATCH + current proof state + due posture + source-owned blocking posture → curated verification-debt index → SYS-28; no requirement invention, proof-fit redefinition, evidence discovery, gate/severity promotion, global quality score, CI scanner, repo writer, release authority, or runtime behavior
reviewed bounded precondition + forbidden semantic outcome + owner authority + enforcement/evidence refs → curated negative-control registry → SYS-23; no test runner, Boolean inverse generation, absence-as-proof, automatic fixture creation, fuzzing, gate/severity authority, repo writer, release authority, or runtime behavior
current production identity + reviewed release intent + exact eligible rollback source/authority + evidence/admin-recovery plan → rollback-readiness disposition → SYS-33; no rollback execution, source auto-selection, ref rewind/force, release authorization, candidate verification replacement, publication, state writer, LIVE_PASS promotion, or R2.1 proof closure
registry-owned permanent-suite graph + bounded suite/fixture namespaces → exact missing/unregistered/duplicate/out-of-scope membership findings → SYS-24; no repo-wide test discovery, fixture/schema execution, semantic coverage judgment, fixture/registry mutation, auto-cleanup, CI authority, release authority, or runtime behavior
reviewed operator/tooling deviation + actual mutation facts + containment + WATCH/DEFER/FIX/BLOCKER + evidence refs → curated process-regression specimen → SYS-52; no blame/actor scoring, auto ingestion, recurrence engine, repo mutation, gate authority, product-defect replacement, release authority, or runtime behavior
exact evidence identity + bounded decision identity + reviewed role/scope + source-backed basis → curated evidence→decision lineage → SYS-06; no evidence discovery, proof-strength inference, decision/gate engine, severity classification, slot/debt calculation, supersession, generic backlink graph, repo writer, release authority, or runtime behavior
bounded decision-time source/derivative/proof identities + SYS-06 trace edges + explicit non-basis/unresolved links → immutable provenance receipt → SYS-18; no evidence discovery, causality invention, proof/freshness judgment, gate/decision authority, historical backfill with later evidence, repo writer, release authority, or runtime behavior
exact historical evidence + exact current reuse claim + reviewed current context/change events → claim-scoped freshness disposition → SYS-14; no evidence invalidation, age-only expiry, proof-fit broadening, slot/debt/blocker creation, gate/decision authority, automatic diff/crawler, repo writer, release authority, or runtime behavior
registered structured reference field + explicit reference class + exact target + reviewed lifecycle/supersession/provenance/freshness metadata when required → deterministic cross-reference integrity findings → SYS-07; no arbitrary-prose crawler, semantic authority inference, freshness/supersession invention, network verification, auto-link repair, repo writer, CI/release authority, or runtime behavior
explicit audit mode + exact PR/ref/SHA observations + explicit expected-base/head contract when required + fixed-SHA relationship facts + capture-coherence check → deterministic branch/PR relationship findings → SYS-36; no stale/hygiene decision, merge/close/delete/rebase/write authority, release authorization, safe-parallel judgment, every-PR crawler, or runtime behavior
2+ independently legitimate tasks + reviewed semantic read/write/dependency profiles + current SYS-36 facts when material + frozen guards → pairwise/group parallel-safety disposition → SYS-49; no task selection, priority/gate change, scheduler, lock, branch/PR mutation, merge/replay, repo writer, release authorization, anomaly classification, or CI authority
reviewed anomaly/process family contract + exact source-backed specimens + independence classes + required discriminators + healthy/contrary controls → curated same-family recurrence / cross-family correlation posture → SYS-16; no auto family clustering, root-cause inference, severity promotion, WATCH/FIX/BLOCKER mutation, runtime telemetry collection, background monitoring, repo writer, release authority, or runtime behavior
reviewed permanent golden-fixture mutation + exact before/after identities + semantic mutation basis + case/test-intent/negative-control impact + exact verification refs → immutable mutation receipt → SYS-25; no fixture writer, expected-value auto-acceptance, test-intent broadening, registry/harness authority, coverage-completeness claim, LIVE_PASS promotion, repo writer, release authority, or runtime behavior
source-owned WATCH + reviewed recurrence/mitigation/supersession/current-relevance facts + explicit next-review trigger + optional elapsed-time context → WATCH aging posture → SYS-15; no age-based severity/dismissal, recurrence recomputation, source classification mutation, automatic historicalization/delete, gate decision, repo writer, release authority, or runtime behavior
```

Application/implementation remains a separate transaction and is held while the current system design sweep is active. SYS-42, SYS-31, SYS-24, SYS-36, and SYS-49 are `NR_PROTECTED`, so their later implementations require dedicated protected transactions rather than ordinary NR harvest. SYS-10, SYS-03, SYS-50, SYS-17, SYS-38, SYS-04, and SYS-07 are `NR_EXECUTABLE`; SYS-35, SYS-46, SYS-47, SYS-05, SYS-02, SYS-12, SYS-28, SYS-23, SYS-33, SYS-52, SYS-06, SYS-18, SYS-14, SYS-16, SYS-25, and SYS-15 are `NR_DOC_ONLY`; all remain application/implementation-HOLD while this design sweep is active.

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
