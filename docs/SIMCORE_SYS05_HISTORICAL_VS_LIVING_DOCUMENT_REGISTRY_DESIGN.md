# SYS-05 — Historical-vs-Living Document Registry — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-05
Idea          = Historical-vs-Living Document Registry
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct related authority/contracts:
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- `docs/SIMCORE_AUTHORITY_DRIFT_CHECK_DESIGN.md`
- `docs/SIMCORE_DOC_ONLY_DRIFT_CLOSE_2026-08-26.md`

Downstream ideas expected to consume this registry rather than independently infer document lifecycle:
- SYS-04 Status Vocabulary Linter
- SYS-02 Decision / Supersession Graph
- SYS-12 Current-State Snapshot Page
- SYS-07 Cross-Reference Integrity Auditor

---

## 1. Problem

SimCore intentionally preserves both current operational memory and immutable point-in-time history.

That means old version numbers, old next actions, old release states, and old gate statements can be perfectly correct in historical evidence while the same wording would be a defect in a living authority.

Current project policy already states the constitutional distinction:

```text
living current authority
→ synchronize when current state changes

historical / frozen point-in-time record
→ preserve original meaning
```

But later tools and work sessions still need to know which rule applies to a particular document or section.

Without a curated lifecycle registry, each downstream review can independently guess from:

```text
filename
latest commit date
presence of an old version number
words such as CURRENT / PLAN / EVIDENCE
where the document happened to be linked from
```

Those heuristics are unsafe.

Failure modes include:

```text
FALSE DOC_DRIFT
→ valid historical evidence is rewritten merely because it contains old production wording

MISSED DOC_DRIFT
→ a living authority contains stale current prose but is ignored as "probably historical"

AUTHORITY CONFUSION
→ a frozen design or audit snapshot is treated as current operational instruction

DOWNSTREAM DUPLICATION
→ every linter/snapshot/supersession tool invents its own living-vs-historical classifier
```

SYS-05 defines a small curated **Historical-vs-Living Document Registry** that records the lifecycle/document-role contract already established by project authority.

It is classification metadata, not a current-state value store and not an automatic semantic classifier.

---

## 2. Core invariant

```text
reviewed document / bounded document family
+ explicit lifecycle role
+ optional section-role exceptions
→ one durable document-role registry entry

SYS-05
!= current-state authority
!= authority map
!= stale-content scanner
!= generic Markdown classifier
!= repository crawler
!= supersession graph
!= automatic document rewriter
```

The registry answers:

> When this document is reviewed, should its current-looking statements be maintained as living state, preserved as point-in-time history, or interpreted according to explicit mixed-section boundaries?

It does not answer:

> What is the current production version, gate, NEXT, or PASS result?

Those values remain in their natural authorities.

---

## 3. Constitutional relationship to existing systems

### 3.1 Live Document Consistency Policy

The policy owns the rule:

```text
living current authority = update when materially affected
historical/frozen record = preserve point-in-time meaning
```

SYS-05 records where that rule applies.
It cannot weaken or redefine the policy.

### 3.2 SYS-01 Living Authority Map

```text
SYS-01 key
= state family / operator question
→ which authority owns the answer?

SYS-05 key
= document / bounded document family
→ what lifecycle role does this artifact have?
```

A document can be `LIVING` in SYS-05 without being a primary authority for every fact it mentions.
Likewise, a historical evidence document can remain highly authoritative for its point-in-time observation while not being a current-state authority.

### 3.3 S-10 Authority Drift Check

S-10 checks bounded current-authority claims and already excludes historical sections.

SYS-05 may later provide reviewed lifecycle metadata to downstream audits, but v1 does not modify S-10, its parser, or CI wiring.

Important:

```text
registry says LIVING
!= content is clean

registry says HISTORICAL
!= content is unimportant
```

### 3.4 SYS-02 Decision / Supersession Graph

SYS-05 classifies document lifecycle.
SYS-02 may later model explicit decision/supersession relations.

The registry may contain one bounded `superseded_by` navigation field when the lifecycle classification requires it, but must not become a graph engine or infer transitive supersession.

---

## 4. Why binary file-level classification is insufficient

Some SimCore documents intentionally contain both current and historical material.

Canonical example:

```text
docs/CURRENT_DEVELOPMENT.md

current operational snapshot / current verdict
= LIVING

historical validation release ledger
= HISTORICAL sections inside the same file
```

Therefore v1 must not force every path into only:

```text
LIVING
or
HISTORICAL
```

Frozen rule:

```text
one document entry
→ one primary document role
→ zero or more explicit section-role exceptions
```

Section exceptions must be anchored by stable headings/markers or another explicit bounded selector.

Do not use vague prose ranges such as "roughly the old part near the bottom".

---

## 5. v1 artifact form

The useful v1 application is one curated living document, conceptually:

```text
docs/SIMCORE_DOCUMENT_LIFECYCLE_REGISTRY.md
```

No generator, crawler, parser, CI rule, GitHub Action, background watcher, or repository writer is required for v1.

The registry is maintained prospectively through the normal close-step/document-consistency routine when a document's lifecycle role is created or materially changed.

Do not attempt to enumerate every Markdown file in the repository merely for completeness.

---

## 6. Scope: curated, high-value registry

The registry includes documents/families when lifecycle ambiguity could materially affect current-state interpretation, drift review, handoff, or downstream tooling.

Required v1 coverage families:

```text
A. core living current-state authorities
B. mixed living + historical continuity documents
C. frozen design / contract documents commonly referenced during implementation
D. point-in-time release/live/implementation evidence families
E. historical plans that remain useful but are explicitly superseded as current instruction
F. generated/navigation views whose lifecycle must not be mistaken for semantic authority
G. templates that are reusable contracts but not current state
```

Out of scope by default:

```text
every incidental note
every one-off scratch file
arbitrary non-SimCore repository docs
all Git/GitHub objects
runtime source files
release-simcore plugin bytes
```

The registry is a SimCore document-memory boundary, not a universal repository catalog.

---

## 7. Canonical lifecycle-role vocabulary

Exactly seven v1 primary/section lifecycle roles:

```text
LIVING_CURRENT
LIVING_POLICY
FROZEN_DESIGN_CONTRACT
POINT_IN_TIME_EVIDENCE
HISTORICAL_PLAN
GENERATED_NAVIGATION
TEMPLATE_CONTRACT
```

### `LIVING_CURRENT`

Tracks current operational/project state and must be synchronized when materially affected.

Examples include current production/gate/progress/queue/ledger surfaces.

### `LIVING_POLICY`

An active operating/governance rule that remains current until explicitly replaced.

It is living, but not because it stores changing production values.

### `FROZEN_DESIGN_CONTRACT`

A completed design or contract preserved as the approved point-in-time implementation boundary.

Do not rewrite it merely to reflect later current production facts.
If the design is materially revised, create an explicit revision/supersession relation rather than silently modernizing old rationale.

### `POINT_IN_TIME_EVIDENCE`

Release/live/implementation/audit evidence whose factual meaning belongs to the recorded transaction/time/version.

Old versions/statuses are expected.

### `HISTORICAL_PLAN`

A plan/roadmap/activation document retained for history after it stops being current operational instruction.

When a currently active plan becomes historical, the role transition must be explicit.

### `GENERATED_NAVIGATION`

A generated/index/navigation artifact that may be refreshed but does not become the underlying semantic authority merely because it is current.

### `TEMPLATE_CONTRACT`

A reusable template/schema/procedure form. The contract may evolve through explicit revision, but an instantiated task/evidence result lives elsewhere.

---

## 8. Mixed-role documents

A document whose sections have materially different lifecycle behavior uses:

```text
Primary Role = <role>
Section Exceptions = [...]
```

Example concept:

```text
Path = docs/CURRENT_DEVELOPMENT.md
Primary Role = LIVING_CURRENT

Section exception:
- selector = heading: Historical Validation Release Ledger
- role = POINT_IN_TIME_EVIDENCE
```

Rules:
- primary role applies outside explicit exceptions;
- exception selectors must be stable and human-reviewable;
- nested ambiguity that cannot be expressed cleanly is `ROLE_UNRESOLVED`, not guessed;
- downstream tooling must not infer exceptions from version numbers alone.

---

## 9. Registry entry schema

Each v1 entry contains exactly these fields:

```text
Entry ID
Path / bounded family selector
Primary lifecycle role
Section-role exceptions
Current-state maintenance expectation
Authority / policy basis
Supersession state
Superseded-by / replacement ref (optional)
Downstream-use notes
Registry state
```

### 9.1 Entry ID

Stable registry-local identifier, e.g.:

```text
DOC-001
DOC-002
```

It is registry identity only and must not become a new work-item or evidence numbering system.

### 9.2 Path / bounded family selector

Prefer exact repository path.

A bounded family selector is allowed only when the family contract is structurally explicit, e.g. a documented version-specific evidence naming family.

Forbidden:

```text
all files containing "EVIDENCE"
all files older than 30 days
all docs with version numbers
```

No role may be assigned from timestamps or fuzzy filename semantics alone.

### 9.3 Current-state maintenance expectation

Exactly one:

```text
SYNC_WHEN_MATERIALLY_AFFECTED
REVIEW_ON_POLICY_CHANGE
PRESERVE_POINT_IN_TIME
REFRESH_FROM_OWNING_SOURCE
REVISE_ONLY_BY_EXPLICIT_SUPERSESSION
```

This field describes maintenance behavior; it does not authorize the mutation itself.

### 9.4 Authority / policy basis

One or more bounded references establishing why the role is correct.

Examples:
- Live Document Consistency Policy;
- document's own explicit Status/Purpose;
- current authority map;
- a superseding close/evidence document.

Do not use "looks old" as a basis.

### 9.5 Supersession state

Exactly one:

```text
CURRENT_ROLE_ACTIVE
SUPERSEDED_AS_CURRENT_INSTRUCTION
NOT_APPLICABLE
UNRESOLVED
```

This state is intentionally shallow.
Transitive decision history belongs to SYS-02.

---

## 10. Registry-state vocabulary

Exactly four top-level entry states:

```text
ROLE_READY
ROLE_MIXED_READY
ROLE_STALE
ROLE_UNRESOLVED
```

### `ROLE_READY`

One primary role is supportable and no section exception is required.

### `ROLE_MIXED_READY`

Primary role plus explicit bounded section exceptions are supportable.

### `ROLE_STALE`

The registry's role/supersession metadata no longer matches authoritative document lifecycle.

This is registry/documentation maintenance drift, not automatically runtime defect.

### `ROLE_UNRESOLVED`

The document's role cannot be classified without guessing or the owning authorities conflict.

Fail closed:

```text
unresolved role
!= historical
!= living
```

A downstream linter/snapshot must not silently choose whichever interpretation produces fewer findings.

---

## 11. Current SimCore examples validating the design

These are design examples, not a materialized v1 registry.

### `docs/CURRENT_DEVELOPMENT.md`

```text
Primary role = LIVING_CURRENT
Section exceptions = historical release/evidence ledger sections → POINT_IN_TIME_EVIDENCE
Registry state = ROLE_MIXED_READY
```

### `docs/SIMCORE_DEFERRED_LEDGER.md`

```text
Primary role = LIVING_CURRENT
Historical specimens embedded as evidence remain point-in-time content within a living ledger entry context
Maintenance = SYNC_WHEN_MATERIALLY_AFFECTED
```

Do not classify the entire file historical merely because it preserves old specimens.

### `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`

```text
Primary role = LIVING_POLICY
Maintenance = REVIEW_ON_POLICY_CHANGE
```

### `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`

```text
Primary role = FROZEN_DESIGN_CONTRACT
Maintenance = REVISE_ONLY_BY_EXPLICIT_SUPERSESSION
```

### version-specific live/release/implementation evidence documents

```text
Primary role = POINT_IN_TIME_EVIDENCE
Maintenance = PRESERVE_POINT_IN_TIME
```

### historical release-system base plans explicitly marked historical

```text
Primary role = HISTORICAL_PLAN
Supersession state = SUPERSEDED_AS_CURRENT_INSTRUCTION
```

The old plan may remain accurate history and useful design context.

---

## 12. Downstream consumption contract

SYS-05 exists primarily to prevent repeated lifecycle inference.

### SYS-04 Status Vocabulary Linter

May consume role metadata to decide where current-status vocabulary must be checked and where old status tokens are expected history.

SYS-04 must still own status-token semantics.

### SYS-12 Current-State Snapshot Page

May include only `LIVING_CURRENT` / relevant `LIVING_POLICY` sources selected by proper authority rules.

A registry role alone does not make a document a primary current-state authority; SYS-01 remains the authority-navigation layer.

### SYS-02 Decision / Supersession Graph

May use explicit `superseded_by` refs as reviewed inputs.
It must not infer graph edges from role transitions alone.

### SYS-07 Cross-Reference Integrity Auditor

May use registry roles to distinguish broken current links from historical references intentionally pointing to old artifacts.

No downstream executable integration is part of SYS-05 v1.

---

## 13. Lifecycle transitions

A document role may legitimately change.

Common transition:

```text
active plan
LIVING_CURRENT or LIVING_POLICY
→ replacement authority lands
→ HISTORICAL_PLAN / SUPERSEDED_AS_CURRENT_INSTRUCTION
```

Another common case:

```text
living generated/index view
→ still GENERATED_NAVIGATION
→ content refreshes without becoming semantic authority
```

Transition rule:

```text
owning authority changes first
→ lifecycle transition is reviewed
→ registry entry updated
→ living-document consistency / downstream projections reviewed
```

Never change the registry role first and use that metadata as permission to demote an actual authority.

---

## 14. Hard boundaries

SYS-05 must never become:

```text
repo-wide semantic classifier
newest-file-wins authority engine
status linter
stale-next scanner
current-state snapshot
supersession graph engine
Evidence Index
archive system
automatic doc rewriter
Git/GitHub writer
release authority
runtime/plugin feature
```

It stores reviewed lifecycle metadata only.

---

## 15. Verification plan for later NR_DOC_ONLY application

When `SIMCORE_DOCUMENT_LIFECYCLE_REGISTRY.md` is materialized, verify at least:

```text
1. every exact registered path exists
2. every bounded family selector has explicit documented scope
3. CURRENT_DEVELOPMENT is represented as mixed rather than falsely binary
4. current living authorities use a living role
5. frozen designs are not marked LIVING_CURRENT merely because they remain binding contracts
6. point-in-time evidence permits old version/status wording without DOC_DRIFT by itself
7. historical plans explicitly superseded as current instruction are not treated as active NEXT/roadmap authority
8. generated navigation is not promoted to semantic authority
9. templates are not mistaken for instantiated current work/evidence
10. unresolved role conflicts remain ROLE_UNRESOLVED
11. no role is inferred from timestamp/newest commit alone
12. no runtime/plugin/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-05.

---

## 16. Unified classification freeze verdict

Source/design inspection confirms:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 is curated lifecycle metadata and section-role boundaries;
- semantic lifecycle classification must be reviewed rather than guessed automatically;
- no executable crawler/linter is needed for the core value;
- downstream executable tools may consume the registry later under their own frozen designs;
- no runtime, release, CI, repository-writer, or architecture-governance authority changes.

---

## 17. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-05 here.
Materialization of the curated document lifecycle registry is a separate bounded `NR_DOC_ONLY` application transaction after the active system-design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
