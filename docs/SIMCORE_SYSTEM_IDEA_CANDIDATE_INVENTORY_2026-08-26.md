# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `SYSTEM IDEA INVENTORY · UNIFIED IDEA CLASSIFICATION · SYS-19 + SYS-01 DESIGN FROZEN · REMAINING CANDIDATES ACTIVE · NO RUNTIME CHANGE`

Purpose: collect non-duplicative system/operations ideas under the same SimCore idea classification used by product/runtime ideas. Candidate rows remain selectable until frozen; a selected row becomes an accepted idea when its bounded design reaches `DESIGN FROZEN`.

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

Existing systems intentionally not duplicated here:
- S-10 Authority Drift Check / Scan
- S-11 Stale PR Hygiene Classifier
- S-12 Natural Evidence Corpus Index
- M-10 Live Diagnostic → Fixture Skeleton Generator
- M-11 Architecture Dependency Snapshot Generator
- M-13 Evidence Index Generator
- `SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`
- `SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`
- Release System v2 / v2.1 existing publication authority

## 0. Unified classification rule

System ideas do **not** use a separate `Type / Timing` taxonomy.

Every row uses the same SimCore idea axes:

```text
SIZE          = SMALL / MEDIUM / LARGE
IMPORTANCE    = 1..5
DIFFICULTY    = 1..5 (design-completion difficulty)
RUNTIME CLASS = RUNTIME / NON_RUNTIME
DESIGN GATE   = NOW / DEPENDENCY / POST_M2_3 / POST_M2_4 / EVIDENCE / EXTERNAL / FUTURE / FROZEN / ...
APPLY CLASS   = freeze-time R DOC_* or NR_* classification
```

All 52 system ideas were provisionally `NON_RUNTIME` at intake because their intended useful surfaces are repository memory, tooling, verification, release/repo operations, architecture analysis, or operator workflow rather than plugin execution.

Frozen rows replace provisional classifications with their design-confirmed verdict.
Unfrozen NON_RUNTIME candidates remain:

```text
APPLY CLASS = NR_UNASSESSED
```

Descriptive words such as document, tool, checker, ledger, or protected authority concern may appear in descriptions, but they are not substitute classification systems.

## A. Repository memory / authority-system candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-01 | Living Authority Map | SMALL | 5 | 2 | NON_RUNTIME | FROZEN | NR_DOC_ONLY | state-family → authority navigation map; design: `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md` |
| SYS-02 | Decision / Supersession Graph | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | record supersession without rewriting history |
| SYS-03 | Gate Dependency Graph | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | explicit gate-to-unlock dependency graph |
| SYS-04 | Status Vocabulary Linter | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | detect unsupported/contradictory status tokens |
| SYS-05 | Historical-vs-Living Document Registry | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | classify document authority/lifecycle role |
| SYS-06 | Evidence-to-Decision Trace Map | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | trace evidence into decisions and closures |
| SYS-07 | Cross-Reference Integrity Auditor | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | verify document/section/fixture/ID references |
| SYS-08 | Work-Item Close Receipt | SMALL | 5 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | bounded result/verification/sync/next receipt |
| SYS-09 | Change-Impact Review Map | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | map changed path families to required reviews |
| SYS-10 | Stale Next-Action Scanner | SMALL | 5 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | detect completed work still advertised as NEXT |
| SYS-11 | Design-to-Implementation Drift Audit | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | compare frozen design boundaries with implementation diff |
| SYS-12 | Current-State Snapshot Page | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | compact current-state navigation surface |

## B. Evidence / forensic-system candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-13 | Verification Proof Matrix | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | separate workflow/gate/focused/live proof classes |
| SYS-14 | Evidence Freshness Ledger | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | classify current/historical/superseded/revalidation evidence |
| SYS-15 | WATCH Aging Review | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | surface old WATCH items for review without severity promotion |
| SYS-16 | Anomaly Recurrence Correlator | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | correlate reviewed anomaly/corpus metadata |
| SYS-17 | Missing Evidence Slot Analyzer | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | identify genuinely open required evidence slots |
| SYS-18 | Evidence Provenance Chain Receipt | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | specimen-to-decision provenance chain |
| SYS-19 | Live-Gate Handoff Packet | SMALL | 5 | 1 | NON_RUNTIME | FROZEN | NR_DOC_ONLY | exact user handoff checklist for current live gate; design: `docs/SIMCORE_SYS19_LIVE_GATE_HANDOFF_PACKET_DESIGN.md` |
| SYS-20 | Natural Evidence Intake Checklist Generator | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | generate blank bounded S-12 intake checklist |
| SYS-21 | Forensic Classification Consistency Check | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | detect contradictory WATCH/DEFER/FIX/BLOCKER dispositions |

## C. Regression / verification-system candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-22 | Test Intent Manifest | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | record what each permanent suite proves and does not prove |
| SYS-23 | Negative-Control Registry | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | catalog critical fail-closed/negative controls |
| SYS-24 | Fixture Orphan Detector | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | find orphan fixtures and unresolved registry rows |
| SYS-25 | Golden Fixture Mutation Receipt | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | summarize semantic fixture changes and reason |
| SYS-26 | Coverage Promotion Readiness Scanner | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | check hybrid-to-executable readiness after ownership extraction |
| SYS-27 | Cross-Version Regression Receipt | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED | compare permanent-suite outcomes across production releases |
| SYS-28 | Verification Debt Index | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | unify verification-coverage WATCH navigation |
| SYS-29 | Contract-to-Fixture Gap View | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | ownership-aware contract coverage view |

## D. Release / repository-transaction candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-30 | Release-to-Docs Convergence Receipt | MEDIUM | 5 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED | verify publication and living-doc convergence |
| SYS-31 | Version-Bump Blast-Radius Check | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | detect unrelated system changes bundled with version bump |
| SYS-32 | Release Candidate Provenance Viewer | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED | navigate work-to-candidate-to-approval-to-release lineage |
| SYS-33 | Rollback Readiness Checklist | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | predefine rollback evidence and identity checks |
| SYS-34 | Post-Release Convergence Checklist Generator | MEDIUM | 4 | 3 | NON_RUNTIME | DEPENDENCY: next genuine release proof | NR_UNASSESSED | generate release-close checklist from actual receipt |
| SYS-35 | Repository Transaction Ledger | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | record branch/PR/CI/merge/evidence lineage |
| SYS-36 | Branch/PR Relationship Auditor | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | identify ambiguous/duplicate transaction lineage |
| SYS-37 | Release-System Residual Cleanup Registry | SMALL | 3 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | track non-blocking release-system cleanup debt |

## E. Architecture / development-system candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-38 | Architecture Contract Diff Reporter | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | compare module/dependency graph snapshots |
| SYS-39 | Import-Boundary Trend Report | MEDIUM | 3 | 3 | NON_RUNTIME | EVIDENCE | NR_UNASSESSED | describe architecture dependency trend over checkpoints |
| SYS-40 | Dead Module / Export Scanner | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | find unused modules/exports after extraction |
| SYS-41 | Public Test-Seam Inventory | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | list direct execution seams and migration candidates |
| SYS-42 | Implementation Slice Conformance Checker | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | compare diff to frozen allowed/forbidden surfaces |
| SYS-43 | M2 Checkpoint Close Pack | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | bundle architecture/fixtures/debt/live controls/next gate |
| SYS-44 | Ownership Migration Ledger | MEDIUM | 5 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | track before/after ownership and transitional calls |
| SYS-45 | State-Surface Change Receipt | MEDIUM | 4 | 3 | NON_RUNTIME | POST_M2_3 | NR_UNASSESSED | summarize state/schema/read/write changes |

## F. Operator / workflow ergonomics candidates

| ID | Candidate | Size | Importance | Difficulty | Runtime Class | Design Gate | Apply Class | Core value |
|---|---|---|---:|---:|---|---|---|---|
| SYS-46 | Canonical Task Card | SMALL | 4 | 1 | NON_RUNTIME | NOW | NR_UNASSESSED | per-work goal/forbidden scope/branch/verification/close triggers |
| SYS-47 | User Handoff Card | SMALL | 4 | 1 | NON_RUNTIME | NOW | NR_UNASSESSED | one physical user action plus exact evidence to return |
| SYS-48 | Gate-Blocked Reason Surface | SMALL | 5 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | show one blocking reason and unlock event per gated idea |
| SYS-49 | Safe Parallel Work Finder | MEDIUM | 4 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | identify independent safe work while a live gate is pending |
| SYS-50 | Work Bundling Conflict Detector | MEDIUM | 5 | 3 | NON_RUNTIME | NOW | NR_UNASSESSED | flag forbidden mixes of feature/system/authority work |
| SYS-51 | Close-Step Trigger Matrix | SMALL | 5 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | map work types to required RT close surfaces |
| SYS-52 | Operator Error Specimen Ledger | SMALL | 4 | 2 | NON_RUNTIME | NOW | NR_UNASSESSED | separate operator/tooling errors from runtime anomalies |

## 1. Inventory counts under the unified axes

```text
TOTAL SYSTEM IDEAS = 52
FROZEN             = 2
UNFROZEN CANDIDATE = 50

SIZE
SMALL  = 20
MEDIUM = 32
LARGE  = 0

RUNTIME CLASS
NON_RUNTIME = 52
RUNTIME     = 0

DESIGN GATE
FROZEN                                   = 2
NOW                                      = 38
POST_M2_3                                = 7
DEPENDENCY: next genuine release proof  = 4
EVIDENCE                                 = 1

APPLY CLASS
NR_DOC_ONLY   = 2
NR_UNASSESSED = 50
```

Importance and Difficulty distributions are unchanged by freeze:

```text
IMPORTANCE
I5 = 23
I4 = 25
I3 = 4

DIFFICULTY
D1 = 3
D2 = 17
D3 = 32
```

## 2. Canonical selection rule

Use the same selection order as every other SimCore idea pool:

```text
1. DESIGN GATE open
2. IMPORTANCE higher
3. DIFFICULTY lower
4. downstream leverage higher
```

Completed selections:

```text
SYS-19 Live-Gate Handoff Packet
= I5 / D1 / FROZEN / NR_DOC_ONLY

SYS-01 Living Authority Map
= I5 / D2 / FROZEN / NR_DOC_ONLY
```

Current highest-priority open edge:

```text
I5 / D2 / NOW
SYS-08 Work-Item Close Receipt
SYS-10 Stale Next-Action Scanner
SYS-48 Gate-Blocked Reason Surface
SYS-51 Close-Step Trigger Matrix
```

Downstream-leverage next recommendation:

```text
NEXT = SYS-51 Close-Step Trigger Matrix
```

Reason: SYS-01 now defines where affected living authority relationships live; SYS-51 can next define which RT close-step surfaces must run for each work type, which then gives SYS-08 a stable basis for a close receipt and gives SYS-10 a bounded context for stale-next-action review.

## 3. Non-duplication / authority boundaries

These ideas must not silently become second versions of existing authorities.

```text
Authority state checking
→ reuse/extend around S-10 + sync-state semantics; no second production identity checker

Evidence generated navigation
→ M-13 remains generator authority for SIMCORE_EVIDENCE_INDEX.md

Natural specimen registry
→ S-12 remains corpus authority

PR stale classification
→ S-11 remains classification authority

Architecture parsing/contracts
→ existing architecture checker remains parser/Contracts v2 enforcement authority

Release publication
→ existing permanent release caller remains publication authority
```

If a selected idea would duplicate one of these authorities rather than compose with it, reject or redesign it before freeze.

## 4. Candidate-to-design rule

```text
candidate
= classified/scored
!= accepted frozen idea
!= implementation authorization

select one candidate
→ inspect overlap / authority / gate
→ complete bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ confirm/revise Size / Importance / Difficulty / Runtime Class / Gate
→ assign freeze-time Apply Class
→ stop design transaction
```

For provisionally NON_RUNTIME system candidates, the freeze-time Apply Class is one of:

```text
NR_DOC_ONLY
NR_EXECUTABLE
NR_PROTECTED
```

until freeze, `NR_UNASSESSED` remains authoritative.

## 5. Production boundary

SYS-19 and SYS-01 design freezes change no SimCore production behavior.

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
current v0.64.7 live gate = unchanged / PENDING_REAL_LONG_CHAT
```
