# SimCore System-Idea Candidate Inventory — 2026-08-26

Status: `CANDIDATE INVENTORY · NOT DESIGN FROZEN · SYSTEM/OPERATIONS SCOPE · NO RUNTIME CHANGE`

Purpose: collect non-duplicative candidate ideas for improving SimCore repository memory, verification, evidence handling, release operations, development ergonomics, and task-close discipline. These are candidate items only. A candidate becomes an accepted SimCore idea only after it is selected for a bounded design transaction and reaches `DESIGN FROZEN` under the normal design policy.

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

Candidate vocabulary:

```text
TYPE
DOC        = repository-memory/document artifact can be the useful implementation
TOOL       = local executable analysis/generation/checking tool
PROTECTED  = CI/release/repo-writer/build/harness authority may be affected

TIMING
NOW_DESIGNABLE
POST_M2_3
POST_M2_4
POST_RELEASE_PROOF
EVIDENCE
EXTERNAL
FUTURE
```

## A. Repository memory / authority-system candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-01 | Living Authority Map | DOC/TOOL | NOW_DESIGNABLE | machine-readable map of which living document owns each current-state family; reduce ambiguous authority lookups |
| SYS-02 | Decision / Supersession Graph | DOC | NOW_DESIGNABLE | record which policy/design/decision supersedes which older current instruction without rewriting history |
| SYS-03 | Gate Dependency Graph | DOC/TOOL | NOW_DESIGNABLE | explicit dependency graph from M2/release/evidence/external gates to ideas unlocked by each event |
| SYS-04 | Status Vocabulary Linter | TOOL | NOW_DESIGNABLE | detect unsupported or contradictory status tokens across living docs without inferring semantic truth |
| SYS-05 | Historical-vs-Living Document Registry | DOC | NOW_DESIGNABLE | classify docs as frozen historical, generated navigation, living authority, evidence, policy, or implementation progress |
| SYS-06 | Evidence-to-Decision Trace Map | DOC/TOOL | NOW_DESIGNABLE | show which evidence justified each FIX/WATCH/release/design closure and which decision document consumed it |
| SYS-07 | Cross-Reference Integrity Auditor | TOOL | NOW_DESIGNABLE | verify repo-relative document/section/fixture/ID references resolve and identify broken navigation links |
| SYS-08 | Work-Item Close Receipt | DOC/TOOL | NOW_DESIGNABLE | bounded receipt of result, verification, authority sync, anomaly disposition, production boundary, and canonical next step |
| SYS-09 | Change-Impact Review Map | DOC/TOOL | NOW_DESIGNABLE | given changed path families, identify which living authorities/evidence/fixtures require review before task close |
| SYS-10 | Stale Next-Action Scanner | TOOL | NOW_DESIGNABLE | detect living docs that advertise already-completed queues/tasks as current NEXT; bounded to explicit next-action sections |
| SYS-11 | Design-to-Implementation Drift Audit | TOOL | NOW_DESIGNABLE | compare frozen design invariants/allowed surface against an implementation transaction and flag unaccounted scope |
| SYS-12 | Current-State Snapshot Page | DOC | NOW_DESIGNABLE | one compact generated-or-reviewed navigation page for production identity, live gate, design queue, NR/R state, WATCHes, and canonical NEXT |

## B. Evidence / forensic-system candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-13 | Verification Proof Matrix | DOC/TOOL | NOW_DESIGNABLE | distinguish workflow PASS, gate PASS, focused-test execution, live evidence, and unclaimed coverage per system/tool |
| SYS-14 | Evidence Freshness Ledger | DOC/TOOL | NOW_DESIGNABLE | classify evidence as current, historical-but-valid, superseded-for-current-state, or awaiting revalidation without invalidating history |
| SYS-15 | WATCH Aging Review | DOC/TOOL | NOW_DESIGNABLE | periodically surface old WATCH items for REVIEW/KEEP/DEFER without auto-promoting severity |
| SYS-16 | Anomaly Recurrence Correlator | TOOL | NOW_DESIGNABLE | correlate reviewed corpus/anomaly metadata by scenario/contract/runtime family without reading raw chat bodies or inferring root cause |
| SYS-17 | Missing Evidence Slot Analyzer | DOC/TOOL | NOW_DESIGNABLE | compare frozen validation contracts with recorded evidence classes and show which required evidence slots remain genuinely open |
| SYS-18 | Evidence Provenance Chain Receipt | DOC/TOOL | NOW_DESIGNABLE | bounded path from specimen → evidence doc → classification → release/design decision |
| SYS-19 | Live-Gate Handoff Packet | DOC | NOW_DESIGNABLE | exact user-facing checklist for the current real-long-chat gate: target scenario, what to paste back, pass/fail/WATCH fields, no speculative extras |
| SYS-20 | Natural Evidence Intake Checklist Generator | TOOL | NOW_DESIGNABLE | derive a blank bounded intake checklist from S-12 schema and current live-gate needs; no automatic evidence judgment |
| SYS-21 | Forensic Classification Consistency Check | TOOL | NOW_DESIGNABLE | detect same anomaly/evidence ID carrying contradictory WATCH/DEFER/FIX/BLOCKER dispositions across living authorities |

## C. Regression / verification-system candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-22 | Test Intent Manifest | DOC/TOOL | NOW_DESIGNABLE | record what each permanent suite proves, what it deliberately does not prove, owner, maturity, and live-evidence dependency |
| SYS-23 | Negative-Control Registry | DOC | NOW_DESIGNABLE | catalog critical fail-closed/negative controls separately from positive golden paths so defensive behavior is visible |
| SYS-24 | Fixture Orphan Detector | TOOL | NOW_DESIGNABLE | find fixture files/suites not reachable from the permanent registry or registry IDs lacking implementation paths |
| SYS-25 | Golden Fixture Mutation Receipt | TOOL | NOW_DESIGNABLE | summarize semantic fixture changes between commits and require explicit reason for expected-output/control changes |
| SYS-26 | Coverage Promotion Readiness Scanner | TOOL | POST_M2_3 | determine whether HYBRID_TRANSITIONAL suites now have a directly executable real owner after ownership extraction; never auto-promote |
| SYS-27 | Cross-Version Regression Receipt | TOOL | POST_RELEASE_PROOF | compare required permanent-suite outcomes across two production releases and preserve deltas without treating identical PASS as live proof |
| SYS-28 | Verification Debt Index | DOC/TOOL | NOW_DESIGNABLE | unify non-blocking test-discovery/direct-execution WATCHes into one navigable debt surface without changing CI |
| SYS-29 | Contract-to-Fixture Gap View | DOC/TOOL | POST_M2_3 | ownership-aware view of contracts with direct executable, hybrid, or no fixture coverage; adjacent to but not a replacement for M-15 |

## D. Release / repository-transaction candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-30 | Release-to-Docs Convergence Receipt | TOOL | POST_RELEASE_PROOF | verify publication identity, manifest/current docs, LIVE_PENDING state, and evidence pointers converged after a genuine release |
| SYS-31 | Version-Bump Blast-Radius Check | TOOL | NOW_DESIGNABLE | verify a version change touched only expected release/runtime/docs surfaces and no unrelated system restructuring was bundled |
| SYS-32 | Release Candidate Provenance Viewer | DOC/TOOL | POST_RELEASE_PROOF | compact human navigation from work commit → candidate receipt → approval → release publication → live handoff |
| SYS-33 | Rollback Readiness Checklist | DOC | NOW_DESIGNABLE | predefine evidence/identity checks needed before using rollback mode; no rollback execution authority |
| SYS-34 | Post-Release Convergence Checklist Generator | TOOL | POST_RELEASE_PROOF | generate bounded close checklist from actual release receipt and current living authorities; no publication primitive |
| SYS-35 | Repository Transaction Ledger | DOC/TOOL | NOW_DESIGNABLE | compact record of bounded work branch, PR, CI, merge, evidence sync, and superseded objects for each substantive work item |
| SYS-36 | Branch/PR Relationship Auditor | TOOL | NOW_DESIGNABLE | identify duplicate active heads, merged work with lingering command-only PRs, or ambiguous transaction lineage; no auto-close/delete |
| SYS-37 | Release-System Residual Cleanup Registry | DOC | NOW_DESIGNABLE | explicitly track compatibility sentinels/deferred cleanup so release-system debt is visible but not mixed into product updates |

## E. Architecture / development-system candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-38 | Architecture Contract Diff Reporter | TOOL | NOW_DESIGNABLE | compare module/dependency graph snapshots between commits and explain added/removed edges/classifications |
| SYS-39 | Import-Boundary Trend Report | TOOL | EVIDENCE | show whether dependency direction is getting cleaner or more entangled over M2 checkpoints; descriptive only |
| SYS-40 | Dead Module / Export Scanner | TOOL | POST_M2_3 | identify registered modules/exports with no reachable use after extraction; never auto-delete |
| SYS-41 | Public Test-Seam Inventory | DOC/TOOL | POST_M2_3 | list exported direct execution seams and which hybrid fixtures can potentially migrate because of them |
| SYS-42 | Implementation Slice Conformance Checker | TOOL | NOW_DESIGNABLE | compare a bounded work diff to frozen design allowed/forbidden surface declarations |
| SYS-43 | M2 Checkpoint Close Pack | DOC/TOOL | POST_M2_3 | one checkpoint artifact bundling architecture graph, fixture maturity, debts, live-control requirements, and next gate |
| SYS-44 | Ownership Migration Ledger | DOC | POST_M2_3 | track ownership moved from Session/legacy orchestration to application services with before/after authority and remaining transitional calls |
| SYS-45 | State-Surface Change Receipt | DOC/TOOL | POST_M2_3 | bounded summary of state/schema/read/write surfaces changed by an architecture slice; does not replace future M-08/M-12 audits |

## F. Operator / workflow ergonomics candidates

| ID | Candidate | Type | Timing | Core value |
|---|---|---|---|---|
| SYS-46 | Canonical Task Card | DOC | NOW_DESIGNABLE | compact per-work-item template: goal, forbidden scope, branch, verification, close-step triggers, next operation |
| SYS-47 | User Handoff Card | DOC | NOW_DESIGNABLE | when human action is actually required, show exactly one physical action and the exact evidence to return; avoid generic instructions |
| SYS-48 | Gate-Blocked Reason Surface | DOC/TOOL | NOW_DESIGNABLE | for every currently gated idea, show the single blocking dependency/evidence and what event will legitimately unlock it |
| SYS-49 | Safe Parallel Work Finder | DOC/TOOL | NOW_DESIGNABLE | while a live gate is pending, identify only independent non-runtime/document/test work that cannot alter the pending production semantics |
| SYS-50 | Work Bundling Conflict Detector | TOOL | NOW_DESIGNABLE | flag attempts to combine runtime feature change with release/CI/repo-system restructuring or multiple unrelated authority changes |
| SYS-51 | Close-Step Trigger Matrix | DOC | NOW_DESIGNABLE | map changed work types to which RT-01…RT-12 close surfaces must run; avoid evaluating every surface mechanically |
| SYS-52 | Operator Error Specimen Ledger | DOC | NOW_DESIGNABLE | preserve tooling/operator mistakes separately from runtime defects so process regressions can be recognized without contaminating product anomaly history |

## 1. Candidate count

```text
TOTAL SYSTEM CANDIDATES = 52

NOW_DESIGNABLE      = 39
POST_M2_3           = 8
POST_M2_4           = 0 explicit candidates in this first pass
POST_RELEASE_PROOF  = 5
EVIDENCE             = 2
EXTERNAL             = 0 explicit candidates in this first pass
FUTURE               = 0 explicit candidates in this first pass
```

Some candidates carry multiple plausible implementation forms. Final `NR APPLY CLASS` is not assigned until the candidate is selected and its design is frozen.

## 2. High-leverage shortlist for the next design sweep

Recommended first design candidates, ordered by leverage and low overlap risk:

```text
SYS-09  Change-Impact Review Map
SYS-03  Gate Dependency Graph
SYS-08  Work-Item Close Receipt
SYS-13  Verification Proof Matrix
SYS-10  Stale Next-Action Scanner
SYS-21  Forensic Classification Consistency Check
SYS-48  Gate-Blocked Reason Surface
SYS-50  Work Bundling Conflict Detector
SYS-01  Living Authority Map
SYS-51  Close-Step Trigger Matrix
```

Why this group first:
- strengthens the operating system around work already being performed;
- mostly repository/non-runtime scope;
- minimizes dependency on M2-3 runtime ownership;
- does not require changing release publication or permanent CI authority;
- converts repeated manual reasoning into explicit contracts before executable automation is considered.

## 3. Non-duplication / authority boundaries

These candidates must not silently become second versions of existing authorities.

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

If a selected candidate would duplicate one of these authorities rather than compose with it, reject or redesign it before freeze.

## 4. Candidate-to-design rule

```text
candidate inventory
!= accepted idea
!= implementation authorization

select one candidate
→ inspect overlap / authority / gate
→ complete bounded design
→ OPEN DESIGN QUESTIONS = 0
→ DESIGN FROZEN
→ assign R/NR + apply class
→ stop design transaction
```

After a selected candidate freezes, current Design Sweep First policy may be applied to continue one-by-one through the chosen system-idea pool.

## 5. Production boundary

This inventory changes no SimCore production behavior.

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
current v0.64.7 live gate = unchanged / PENDING_REAL_LONG_CHAT
```
