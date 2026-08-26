# SimCore NON_RUNTIME Apply Classification — 2026-08-26

Status: `CANONICAL NON_RUNTIME SUBCLASSIFICATION · IMPLEMENTATION-FORM AXIS · ORIGINAL + SYSTEM-IDEA INVENTORIES RECONCILED · NO RUNTIME CHANGE`

Purpose: classify NON_RUNTIME ideas by the form and authority-risk of their actual implementation so document-only repository memory, executable tooling, and protected repository/build/release/architecture-governance surfaces are not treated as one undifferentiated class.

Related authority:
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`

This document does not change an idea's core Runtime Class. Every item listed or referenced here remains `NON_RUNTIME` unless the main classification authority is separately changed for a substantive reason.

---

## 1. Canonical two-axis model

NON_RUNTIME ideas are tracked on two independent axes:

```text
CORE CLASS
= NON_RUNTIME

NR APPLY CLASS
= the implementation form / repository-authority risk of the non-runtime idea
```

Canonical rule:

```text
NON_RUNTIME
!= automatically document-only
!= automatically SAFE_NON_RUNTIME
```

The apply class exists to make that distinction explicit.

---

## 2. NR APPLY status vocabulary

```text
NR_DOC_ONLY
= the useful implementation is entirely non-executable repository memory / documentation
= no script/tool/test harness/build/release/CI authority is required
= examples: curated index, corpus, manual registry, checklist

NR_EXECUTABLE
= the useful implementation includes local executable tooling such as a script, generator, analyzer, formatter, or focused tooling test
= still no plugin/runtime behavior
= requires explicit static/semantic verification appropriate to the tool

NR_PROTECTED
= the idea remains non-runtime but its implementation can alter or police build, release, CI, repository-writer, branch, fixture-authority, or architecture-governance surfaces
= NON_RUNTIME alone does not authorize normal harvest
= requires its own gate and protected implementation transaction

NR_UNASSESSED
= design is not yet frozen or the gate is not sufficiently open to classify the final implementation form defensibly
= do not guess from the idea name alone
```

An idea may be reclassified only when its frozen design establishes a materially different implementation boundary.

---

## 3. Relationship to SAFE_NON_RUNTIME

NR APPLY CLASS and SAFE_NON_RUNTIME answer different questions.

```text
NR APPLY CLASS
= what kind of non-runtime implementation is this?

SAFE_NON_RUNTIME
= may this frozen item be implemented now under the pre-stabilization harvest exception?
```

Typical relationship:

```text
NR_DOC_ONLY
→ often easiest SAFE_NON_RUNTIME candidate

NR_EXECUTABLE
→ may still pass SAFE_NON_RUNTIME, but requires executable-tool verification

NR_PROTECTED
→ normally NOT ordinary SAFE_NON_RUNTIME harvestable merely because plugin bytes stay unchanged

NR_UNASSESSED
→ no implementation authorization
```

No apply class bypasses design-freeze, gate, work-bundling, current operational priority, or protected-transaction rules.

---

## 4. Original NR inventory classification

This table is the **original 14-item NON_RUNTIME pool**, not the complete universe of current NON_RUNTIME system ideas.

| ID | Idea | Importance | Difficulty | Current state | NR Apply Class | Reason / implementation form |
|---|---|---:|---:|---|---|---|
| S-09 | Evidence Index Entry Format | 5 | 1 | IMPLEMENTED | NR_DOC_ONLY | frozen eight-field contract + initial repository index materialization |
| S-10 | Authority Drift Check / Scan | 5 | 2 | IMPLEMENTED | NR_EXECUTABLE | read-only local authority audit tool |
| M-11 | Architecture Dependency Snapshot Generator | 5 | 3 | IMPLEMENTED | NR_EXECUTABLE | optional deterministic snapshot output from existing checker |
| M-07 | Commit / Observation Separation Guard | 5 | 4 | GATED POST_M2_4 | NR_UNASSESSED | classify after frozen design; likely protected boundary but do not pre-freeze final form |
| M-12 | State Writer Static Audit | 5 | 4 | GATED POST_M2_3 | NR_UNASSESSED | classify after frozen design; static audit may become executable/protected |
| M-16 | Differential Architecture Fixtures | 5 | 4 | GATED M2 implementation slice | NR_UNASSESSED | fixture/test-authority form must be frozen before classification |
| S-12 | Natural Evidence Corpus Index | 4 | 2 | IMPLEMENTED | NR_DOC_ONLY | specimen-centric durable repository index |
| M-10 | Live Diagnostic → Fixture Skeleton Generator | 4 | 3 | IMPLEMENTED | NR_EXECUTABLE | local reviewed-evidence → skeleton generator + schemas/tests |
| M-13 | Evidence Index Generator | 4 | 3 | IMPLEMENTED | NR_EXECUTABLE | curated manifest → deterministic generated index tool |
| M-08 | Snapshot Schema Inventory Generator | 4 | 3 | GATED POST_M2_3 | NR_UNASSESSED | generator form is plausible but final boundary waits for design freeze |
| M-14 | Release Evidence Packet | 4 | 3 | GATED R2.1 genuine release proof | NR_UNASSESSED | evidence packet may be document/tooling; dependency must open first |
| M-15 | Fixture Coverage Matrix by Ownership | 4 | 3 | GATED POST_M2_3 | NR_UNASSESSED | matrix may be document or generated tooling; classify after freeze |
| L-01 | Development-source Modular Build | 4 | 5 | FUTURE / POST_M2 | NR_PROTECTED | build/source topology is inherently protected even without runtime semantics |
| S-11 | Stale PR Hygiene Classifier | 3 | 2 | IMPLEMENTED | NR_EXECUTABLE | offline local PR metadata classifier |

Original-pool counts remain:

```text
ORIGINAL NON_RUNTIME total = 14

NR_DOC_ONLY    = 2
NR_EXECUTABLE  = 5
NR_PROTECTED   = 1
NR_UNASSESSED  = 6
```

Original implemented NR set:

```text
DOC_ONLY
S-09
S-12

EXECUTABLE
S-10
S-11
M-10
M-11
M-13
```

Original protected/future known boundary:

```text
L-01
→ NR_PROTECTED
→ FUTURE / POST_M2
```

---

## 5. System-idea NON_RUNTIME inventory

The separate 52-item system/operations idea inventory is also currently classified `NON_RUNTIME` at the core-class level.

Current system-idea authority:
- `docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md`

Current state after SYS-37 design freeze:

```text
SYSTEM NON_RUNTIME total = 52
FROZEN                  = 40
UNFROZEN                = 12

NR_DOC_ONLY   = 28
NR_EXECUTABLE = 7
NR_PROTECTED  = 5
NR_UNASSESSED = 12
```

Frozen system apply classes:

```text
NR_DOC_ONLY
SYS-19 Live-Gate Handoff Packet
SYS-01 Living Authority Map
SYS-51 Close-Step Trigger Matrix
SYS-08 Work-Item Close Receipt
SYS-48 Gate-Blocked Reason Surface
SYS-09 Change-Impact Review Map
SYS-11 Design-to-Implementation Drift Audit
SYS-13 Verification Proof Matrix
SYS-22 Test Intent Manifest
SYS-21 Forensic Classification Consistency Check
SYS-35 Repository Transaction Ledger
SYS-46 Canonical Task Card
SYS-47 User Handoff Card
SYS-05 Historical-vs-Living Document Registry
SYS-02 Decision / Supersession Graph
SYS-12 Current-State Snapshot Page
SYS-28 Verification Debt Index
SYS-23 Negative-Control Registry
SYS-33 Rollback Readiness Checklist
SYS-52 Operator Error Specimen Ledger
SYS-06 Evidence-to-Decision Trace Map
SYS-18 Evidence Provenance Chain Receipt
SYS-14 Evidence Freshness Ledger
SYS-16 Anomaly Recurrence Correlator
SYS-25 Golden Fixture Mutation Receipt
SYS-15 WATCH Aging Review
SYS-20 Natural Evidence Intake Checklist Generator
SYS-37 Release-System Residual Cleanup Registry

NR_EXECUTABLE
SYS-10 Stale Next-Action Scanner
SYS-03 Gate Dependency Graph
SYS-50 Work Bundling Conflict Detector
SYS-17 Missing Evidence Slot Analyzer
SYS-38 Architecture Contract Diff Reporter
SYS-04 Status Vocabulary Linter
SYS-07 Cross-Reference Integrity Auditor

NR_PROTECTED
SYS-42 Implementation Slice Conformance Checker
SYS-31 Version-Bump Blast-Radius Check
SYS-24 Fixture Orphan Detector
SYS-36 Branch/PR Relationship Auditor
SYS-49 Safe Parallel Work Finder
```

Why SYS-42, SYS-31, SYS-24, SYS-36, and SYS-49 are protected:

```text
SYS-42 = read-only machine checker policing frozen design / architecture-governance boundaries
SYS-31 = release-governance blast-radius preflight
SYS-24 = permanent fixture-authority membership policing
SYS-36 = branch/PR/base/head/merge/ancestry governance policing
SYS-49 = shared repository/work concurrency governance policing
→ all require dedicated protected implementation transactions
```

Why the frozen document-only systems are document-only:

```text
SYS-11 = human semantic design-fidelity review
SYS-13 = durable proof-scope matrix
SYS-22 = reviewed semantic test-intent/non-claim authority
SYS-21 = human forensic classification-consistency audit
SYS-35 = curated repository transaction lineage
SYS-46 = bounded internal task contract
SYS-47 = user-facing task/gate projection
SYS-05 = curated document lifecycle/role registry
SYS-02 = curated decision supersession lineage
SYS-12 = compact current-only projection
SYS-28 = curated verification-debt index
SYS-23 = curated negative-control registry
SYS-33 = curated rollback-readiness checklist
SYS-52 = curated operator/tooling process-regression ledger
SYS-06 = curated evidence→decision lineage map
SYS-18 = point-in-time provenance receipt
SYS-14 = curated claim-scoped evidence freshness ledger
SYS-16 = curated recurrence/correlation index
SYS-25 = prospective golden-fixture mutation receipt/template
SYS-15 = curated event-driven WATCH aging/relevance review
SYS-20 = curated natural-evidence intake checklist; semantic intake decisions remain human-reviewed and no second S-04 packet or automatic S-12/recurrence/classification authority is created
SYS-37 = curated release-system residual/cleanup-eligibility registry; source disposition, operational role, cleanup trigger and preservation constraints remain reviewed semantic facts and no cleanup primitive is created
```

Why SYS-17, SYS-38, SYS-04, and SYS-07 are executable:

```text
SYS-17 explicit reviewed slots + proof state → deterministic slot analysis
SYS-38 immutable architecture snapshots/contracts → exact architecture delta report
SYS-04 registered status namespace/target/lifecycle → deterministic vocabulary lint
SYS-07 registered structured references + reviewed metadata → deterministic reference findings
```

All remain read-only/non-runtime and do not become CI/release/runtime authority in v1.

Why SYS-24, SYS-36, and SYS-49 are protected rather than ordinary executable:

```text
SYS-24 → fixture-authority membership
SYS-36 → branch/repository relationship governance
SYS-49 → shared work/repository concurrency governance
```

The algorithms may be read-only, but the policies they police are protected surfaces.

System candidates that are not yet frozen remain `NR_UNASSESSED`; do not infer their apply class from names such as Scanner, Auditor, Ledger, Generator, Analyzer, Manifest, Reporter, Check, Linter, Graph, Snapshot, Index, Registry, Checklist, Detector, Receipt, or Report.

---

## 6. Combined current NON_RUNTIME classification counts

Across the original 14-item NR pool plus the separate 52-item system-idea pool:

```text
CURRENT INVENTORIED NON_RUNTIME total = 66

NR_DOC_ONLY    = 30
NR_EXECUTABLE  = 12
NR_PROTECTED   = 6
NR_UNASSESSED  = 18
```

This combined count is a classification view only. It does not merge the original NR queue with the system-idea design inventory or authorize implementation.

Current queue distinction:

```text
ORIGINAL NR harvest queue
= EMPTY

SYSTEM-IDEA gate-open design sweep
= CLOSED
= 40 FROZEN / 0 OPEN NOW

SYSTEM-IDEA gated design backlog
= 12
= WAITING_FOR_OWNING_GATES

FROZEN SYSTEM apply/implementation
= separate reselection required
= NOT AUTO-AUTHORIZED
```

Therefore wording such as `current open NR remains empty` is valid only for the **original NR harvest queue**. It does not mean every frozen system item is automatically safe/authorized to apply.

---

## 7. Verification expectations by apply class

### NR_DOC_ONLY

Minimum verification:

```text
referenced paths/IDs resolve
terminology matches frozen authority
no executable/runtime file changed
no fabricated current runtime fact
no release-simcore change
```

### NR_EXECUTABLE

Minimum verification adds:

```text
syntax/static validation
focused deterministic/semantic test where applicable
bounded input/output behavior
failure/fail-closed behavior
no network/writer/runtime authority unless explicitly frozen
CI coverage claim must distinguish actual focused-test execution from generic PR gate PASS
```

### NR_PROTECTED

Minimum treatment:

```text
separate design/gate explicitly authorizing protected authority or governance work
separate protected implementation transaction
permanent CI / repository / release / fixture / architecture-governance review as applicable
no bundling with product/runtime feature work
no assumption that read-only means ordinary harvest-safe
```

`NR_PROTECTED` is not a negative label; it means the work has a higher repository/governance blast radius despite remaining non-runtime.

---

## 8. Selection / freeze rule

For every newly frozen NON_RUNTIME idea, the same design-close transaction ends with:

```text
DESIGN FROZEN
→ classify NR APPLY CLASS
   NR_DOC_ONLY
   NR_EXECUTABLE
   NR_PROTECTED
→ record classification in its living inventory/ledger
→ STOP DESIGN WORK
```

If the idea is not frozen:

```text
NR_UNASSESSED
```

Actual implementation remains a later bounded transaction under normal tier/gate/current-phase policy.

Closed system-design gates remain closed after the gate-open sweep ends.

---

## 9. Relationship to R document classification

The R and NR axes deliberately solve different problems.

```text
R DOC APPLY CLASS
= can a RUNTIME idea have a useful document-only preparation before runtime implementation?

NR APPLY CLASS
= what form does the NON_RUNTIME implementation itself take?
```

Do not collapse the two systems into one status vocabulary.

---

## 10. Current operating verdict

```text
NR is not one homogeneous implementation bucket.

NR_DOC_ONLY
→ lowest implementation-form blast radius

NR_EXECUTABLE
→ local executable tooling; stronger verification required

NR_PROTECTED
→ build/release/CI/repository/fixture/architecture-governance boundary; separate protected work

NR_UNASSESSED
→ wait for design freeze / owning gate
```

Current phase summary:

```text
original gate-open NR harvest = EXHAUSTED / EMPTY
system gate-open design sweep = CLOSED
system gated design backlog = 12 / WAITING_FOR_GATE
frozen system application/implementation = separate reselection / not auto-authorized
SYS-42 = frozen NR_PROTECTED architecture-governance checker
SYS-31 = frozen NR_PROTECTED release-governance blast-radius checker
SYS-24 = frozen NR_PROTECTED fixture-authority orphan detector
SYS-36 = frozen NR_PROTECTED branch/PR relationship auditor
SYS-49 = frozen NR_PROTECTED safe-parallel-work evaluator
SYS-17 = frozen NR_EXECUTABLE bounded evidence-slot analyzer
SYS-22 = frozen NR_DOC_ONLY test-intent/non-claim authority
SYS-21 = frozen NR_DOC_ONLY human forensic-consistency audit
SYS-38 = frozen NR_EXECUTABLE architecture delta reporter
SYS-35 = frozen NR_DOC_ONLY repository transaction-lineage ledger
SYS-46 = frozen NR_DOC_ONLY canonical internal task-card contract
SYS-47 = frozen NR_DOC_ONLY user-facing handoff projection contract
SYS-05 = frozen NR_DOC_ONLY document lifecycle-role registry design
SYS-04 = frozen NR_EXECUTABLE registered-field status vocabulary linter design
SYS-02 = frozen NR_DOC_ONLY decision/supersession lineage graph design
SYS-12 = frozen NR_DOC_ONLY current-state snapshot projection design
SYS-28 = frozen NR_DOC_ONLY verification-debt index design
SYS-23 = frozen NR_DOC_ONLY negative-control registry design
SYS-33 = frozen NR_DOC_ONLY rollback-readiness checklist design
SYS-52 = frozen NR_DOC_ONLY operator/tooling process-regression specimen ledger design
SYS-06 = frozen NR_DOC_ONLY evidence-to-decision lineage map design
SYS-18 = frozen NR_DOC_ONLY evidence provenance chain receipt design
SYS-14 = frozen NR_DOC_ONLY claim-scoped evidence freshness ledger design
SYS-16 = frozen NR_DOC_ONLY anomaly recurrence/correlation index design
SYS-25 = frozen NR_DOC_ONLY golden-fixture mutation receipt design
SYS-15 = frozen NR_DOC_ONLY WATCH aging/relevance review design
SYS-20 = frozen NR_DOC_ONLY natural-evidence intake checklist design
SYS-37 = frozen NR_DOC_ONLY release-system residual cleanup registry design
SYS-07 = frozen NR_EXECUTABLE cross-reference integrity auditor design
```

Classification visibility does not bypass a gate, current product/live priority, or protected-transaction rule.
