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

No apply class bypasses design-freeze, gate, work-bundling, or current Design Sweep First rules.

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

Current state after SYS-24 design freeze:

```text
SYSTEM NON_RUNTIME total = 52
FROZEN                  = 28
UNFROZEN                = 24

NR_DOC_ONLY   = 19
NR_EXECUTABLE = 6
NR_PROTECTED  = 3
NR_UNASSESSED = 24
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

NR_EXECUTABLE
SYS-10 Stale Next-Action Scanner
SYS-03 Gate Dependency Graph
SYS-50 Work Bundling Conflict Detector
SYS-17 Missing Evidence Slot Analyzer
SYS-38 Architecture Contract Diff Reporter
SYS-04 Status Vocabulary Linter

NR_PROTECTED
SYS-42 Implementation Slice Conformance Checker
SYS-31 Version-Bump Blast-Radius Check
SYS-24 Fixture Orphan Detector
```

Why SYS-42, SYS-31, and SYS-24 are protected:

```text
SYS-42
= read-only/non-runtime machine checker whose purpose is to police frozen design / architecture-governance boundaries

SYS-31
= read-only/non-runtime preflight whose purpose is to police release-mode, candidate-radius, live-gate and release/repository-system bundling boundaries

SYS-24
= read-only/non-runtime detector whose purpose is to police permanent fixture-authority membership across registry, permanent suite modules, and permanent fixture directories

→ all require dedicated protected implementation transactions
```

Why SYS-11, SYS-13, SYS-22, SYS-21, SYS-35, SYS-46, SYS-47, SYS-05, SYS-02, SYS-12, SYS-28, SYS-23, and SYS-33 are document-only:

```text
SYS-11 = human semantic design-fidelity review; automatic semantic judge intentionally prohibited
SYS-13 = durable proof-scope policy/matrix; no CI/log scanner required for v1
SYS-22 = reviewed semantic test-intent/non-claim authority; no harness/registry enforcement required for v1
SYS-21 = human forensic classification-consistency audit; automatic severity promotion/demotion intentionally prohibited
SYS-35 = curated cross-work repository transaction lineage; Git/GitHub already provide mechanical facts and automatic semantic inclusion would create noise/false authority
SYS-46 = bounded internal task identity/objective/work-type/scope/gate/mutation/stop contract; v1 is a template/procedural repository artifact and deliberately does not schedule, authorize, execute, or enforce work
SYS-47 = bounded user-facing projection of reviewed task/gate facts; v1 is a template/procedural communication contract and deliberately does not create task identity, live-experiment semantics, proof, classification, scheduling, or repository writes
SYS-05 = curated document lifecycle/role registry with explicit mixed-section exceptions; v1 deliberately avoids automatic semantic classification, crawling, linting, rewriting, or current-state value storage
SYS-02 = curated semantic predecessor/successor decision lineage with explicit affected/preserved scope; v1 deliberately prohibits automatic supersession inference from timestamps, versions, status words, references, commits, or semantic similarity
SYS-12 = compact current-only source-referenced projection page; v1 deliberately avoids parsing/generation, authority promotion, current-state selection, stale scanning, gate decisions, or repository writes
SYS-28 = curated verification-debt index preserving exact claim/proof/due/blocking semantics; v1 deliberately avoids evidence-requirement invention, CI/log scanning, automatic severity/blocker promotion, proof inference, and scalar quality scoring
SYS-23 = curated negative-control semantic registry; v1 deliberately leaves executable enforcement to actual fixture/test/live authorities and prohibits automatic inverse generation, absence-as-proof, fixture mutation, fuzzing, or CI/release integration
SYS-33 = curated pre-release rollback-readiness checklist; v1 deliberately does not execute rollback, auto-select historical sources, publish production, rewind refs, mutate state, replace permanent verification, or close LIVE/R2.1 proof
```

Why SYS-17, SYS-38, and SYS-04 are executable:

```text
SYS-17
explicit reviewed evidence slots
+ reviewed proof state
→ deterministic missing/not-claimed/conflicted/blocked analysis

SYS-38
immutable M-11 snapshots
+ immutable machine Contracts v2 inputs
→ deterministic exact architecture delta report

SYS-04
registered status namespace
+ registered structured target
+ reviewed SYS-05 lifecycle scope
→ deterministic vocabulary/namespace/cardinality lint

All three remain read-only/non-runtime.
None changes CI, release, repository-writer, runtime, or architecture-policy authority in v1.
```

Why SYS-24 is protected rather than ordinary executable:

```text
SYS-24
canonical permanent registry rows
+ permanent suite-module namespace
+ permanent fixture-directory namespace
→ deterministic ownership/orphan integrity findings

The algorithm is simple/read-only, but the policy being policed is fixture-authority membership.
The canonical NR model explicitly places fixture-authority policing in NR_PROTECTED.
```

System candidates that are not yet frozen remain `NR_UNASSESSED`; do not infer their apply class from names such as Scanner, Auditor, Ledger, Generator, Analyzer, Manifest, Reporter, Check, Linter, Graph, Snapshot, Index, Registry, Checklist, Detector, or Report.

---

## 6. Combined current NON_RUNTIME classification counts

Across the original 14-item NR pool plus the separate 52-item system-idea pool:

```text
CURRENT INVENTORIED NON_RUNTIME total = 66

NR_DOC_ONLY    = 21
NR_EXECUTABLE  = 11
NR_PROTECTED   = 4
NR_UNASSESSED  = 30
```

This combined count is a classification view only. It does not merge the original NR queue with the system-idea design sweep or authorize implementation.

Current queue distinction:

```text
ORIGINAL NR harvest queue
= EMPTY

SYSTEM-IDEA design sweep
= ACTIVE
= 12 gate-open NOW designs remain after SYS-24 freeze

SYSTEM-IDEA apply/implementation
= HOLD while Design Sweep First remains active
```

Therefore wording such as `current open NR remains empty` is valid only for the **original NR harvest queue**, not as a global statement about all NON_RUNTIME idea design work.

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

---

## 9. Relationship to R document classification

The R and NR axes deliberately solve different problems.

```text
R DOC APPLY CLASS
= can a RUNTIME idea have a useful document-only preparation before runtime implementation?

NR APPLY CLASS
= what form does the NON_RUNTIME implementation itself take?
```

Therefore:

```text
RUNTIME + DOC_APPLICABLE
→ runtime core parked; document slice may apply

NON_RUNTIME + NR_DOC_ONLY
→ the non-runtime idea itself is primarily a document/durable-memory implementation
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
→ wait for design freeze
```

Current phase summary:

```text
original gate-open NR harvest = EXHAUSTED / EMPTY
system-idea NON_RUNTIME design sweep = ACTIVE
system apply/implementation = HELD
SYS-42 = frozen NR_PROTECTED architecture-governance checker
SYS-31 = frozen NR_PROTECTED release-governance blast-radius checker
SYS-24 = frozen NR_PROTECTED fixture-authority orphan detector
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
```

Classification visibility does not bypass gate or Design Sweep First ordering.
