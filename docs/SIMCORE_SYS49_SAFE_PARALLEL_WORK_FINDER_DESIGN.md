# SYS-49 — Safe Parallel Work Finder — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_PROTECTED · READ-ONLY PARALLEL-WORK GOVERNANCE · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-49
Idea          = Safe Parallel Work Finder
Size          = MEDIUM
Importance    = 4 / HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_PROTECTED
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`
- `docs/SIMCORE_SYS36_BRANCH_PR_RELATIONSHIP_AUDITOR_DESIGN.md`
- `docs/SIMCORE_SYS03_GATE_DEPENDENCY_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS31_VERSION_BUMP_BLAST_RADIUS_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS07_PARALLEL_MAIN_ACTIVITY_WATCH_2026-08-26.md`
- current repository coordination / main-write policy
- current live-gate / release / selection authorities when a candidate depends on them

Existing authorities SYS-49 must not replace:
- SYS-46 task identity, objective, scope, gate, mutation and stop boundaries;
- SYS-50 same-transaction bundling rules;
- SYS-09 reviewed change-family semantics;
- SYS-36 Git/GitHub branch/PR/base/head/merge/ancestry facts;
- SYS-03 gate dependency truth;
- current selection/NEXT authority;
- release-simcore production authority;
- repository writer / branch / protected infrastructure authority;
- live-gate and evidence authorities;
- user authorization and current task selection.

---

## 1. Problem

SimCore can legitimately have more than one bounded activity in flight.

Canonical current example:

```text
v0.64.7 real-long-chat gate = pending
+ system-idea NON_RUNTIME design sweep = active
```

That does not mean arbitrary work may run concurrently.

Two separately legitimate tasks can still conflict through:

```text
the same mutable file
the same semantic living authority
the same branch/ref
the same exact-base contract
one task changing an authority the other consumes
one task producing evidence or output required by the other
shared close-sync documents
production/release identity movement
CI/release/repository-governance movement
anomaly capture that must preempt ordinary close work
```

Conversely, two tasks may share repository context without being unsafe if their substantive mutation, authority and dependency surfaces are independent and their shared convergence is explicitly serialized.

Without one bounded parallel-safety contract, common shortcuts are dangerous:

```text
different branches
→ assume safe

no identical filenames
→ assume safe

both tasks individually valid
→ assume safe together

SYS-50 BUNDLE_CLEAN for each
→ assume parallel safe

SYS-36 RELATION_CLEAN
→ assume parallel safe

same base branch
→ assume shared base remains stable

only close docs overlap
→ either over-block all parallel work or silently race living-state convergence
```

SYS-49 defines a read-only **Safe Parallel Work Finder** that evaluates whether already-legitimate bounded work items may overlap, and if so under which explicit guards.

---

## 2. Core invariant

```text
2+ independently legitimate bounded tasks
+ canonical SYS-46 task facts
+ reviewed mutation/read/dependency profile
+ SYS-09 change-family context when material
+ SYS-36 relationship facts when repository relations matter
+ current gate/dependency facts
+ frozen parallel conflict/guard rules
→ deterministic pairwise + group parallel-safety disposition

SYS-49
!= task selector
!= global NEXT authority
!= task authorizer
!= scheduler
!= branch creator
!= PR creator
!= merge queue
!= repository writer
!= lock service
!= work bundling detector
!= GitHub relationship auditor
!= CI/release authority
!= release authorizer
```

Canonical question:

> Given these already-defined work transactions, what may overlap safely, what must be guarded or serialized, and what cannot be assessed without resolving missing authority facts?

SYS-49 does not answer:

> Which task should exist?

> Which task has higher priority?

> May a closed gate be bypassed because another task is safe?

> Should a branch/PR be merged or deleted?

---

## 3. Parallel work is not bundling

Frozen distinction:

```text
SYS-50
= may objective A and objective B coexist inside ONE transaction?

SYS-49
= may transaction A and transaction B remain DISTINCT and execute concurrently?
```

A SYS-50 split requirement may produce two legitimate separate tasks.
It does not automatically mean those separated tasks are safe to execute at the same time.

Likewise:

```text
BUNDLE_CLEAN
!= PARALLEL_SAFE
```

Each task keeps its own:
- Work ID;
- objective ID;
- task card;
- branch/transaction identity where applicable;
- evidence;
- close receipt;
- stop condition.

SYS-49 never merges identities merely to make concurrency easier.

---

## 4. Frozen v1 top-level dispositions

Exactly five:

```text
PARALLEL_SAFE
PARALLEL_GUARDED
PARALLEL_SERIALIZE_REQUIRED
PARALLEL_NOT_STARTABLE
PARALLEL_BLOCKED
```

### `PARALLEL_SAFE`

All participating tasks are independently startable and no frozen shared-mutation, authority-dependency, repository-relation or protected-governance conflict is present.

Meaning only:

```text
these bounded tasks may overlap under their existing contracts
```

It does not mean either task is verified or complete.

### `PARALLEL_GUARDED`

Substantive work may overlap, but one or more named phases or shared mutable surfaces must be serialized/revalidated.

Typical example:

```text
independent design work
+ both later update shared living progress/deferred ledgers
→ primary work may overlap
→ shared close-sync writes must serialize
→ fresh reread required before each close
```

### `PARALLEL_SERIALIZE_REQUIRED`

The tasks must not substantively overlap because one depends on, governs, invalidates, or collides with the other on a frozen conflict surface.

### `PARALLEL_NOT_STARTABLE`

At least one task is deterministically not startable under its current canonical gate/task posture.

Examples:
- gate closed;
- task state blocked/stale;
- prerequisite event has not occurred;
- design is frozen but implementation authorization is still HOLD.

Parallel safety never bypasses this state.

### `PARALLEL_BLOCKED`

Required safety inputs are missing, contradictory, stale, raced, or semantically unresolved, so a safe result would require guessing.

Fail closed:

```text
unknown overlap != safe overlap
```

---

## 5. Result precedence

For a requested task set:

```text
PARALLEL_BLOCKED
> PARALLEL_NOT_STARTABLE
> PARALLEL_SERIALIZE_REQUIRED
> PARALLEL_GUARDED
> PARALLEL_SAFE
```

A higher-severity pair/group finding cannot be hidden by other clean pairs.

Example:

```text
A ↔ B = SAFE
A ↔ C = GUARDED
B ↔ C = SERIALIZE_REQUIRED
→ group result = PARALLEL_SERIALIZE_REQUIRED
```

---

## 6. Eligibility before compatibility

SYS-49 evaluates compatibility only after task legitimacy is represented exactly.

Each task must provide or resolve:

```text
Work ID
objective ID
canonical task state / equivalent bounded authority
current gate/start posture
primary work type
IN / OUT scope
allowed / forbidden mutation surfaces
required source authorities
stop conditions
```

Preferred source:
- SYS-46 Canonical Task Card, or
- a frozen design/plan artifact that explicitly carries equivalent design-only transaction boundaries.

If a task is `TASK_CARD_BLOCKED`, `TASK_CARD_STALE`, superseded, or otherwise not startable:

```text
→ PARALLEL_NOT_STARTABLE
```

If the task definition itself is ambiguous:

```text
→ PARALLEL_BLOCKED
```

A parallel assessment never upgrades a task into legitimacy.

---

## 7. Frozen v1 parallel profile

SYS-49 does not crawl diffs and invent intent.
It consumes a reviewed bounded profile for each task.

Conceptual v1 profile:

```json
{
  "workId": "...",
  "objectiveId": "...",
  "workType": "WT-xx",
  "taskState": "...",
  "gateState": "...",
  "primaryWriteScopes": ["..."],
  "supportingWriteScopes": ["..."],
  "closeSyncWriteScopes": ["..."],
  "evidenceWriteScopes": ["..."],
  "readAuthorities": ["..."],
  "producedAuthorities": ["..."],
  "requiredPredecessorWorkIds": ["..."],
  "protectedSurfaces": ["..."],
  "branchRelationRef": "optional SYS-36 report/receipt",
  "sourceAuthorityRefs": ["docs/..."]
}
```

The exact storage form may be frozen at implementation time without changing these semantics.

### 7.1 Write-scope kinds

Exactly four semantic write roles:

```text
PRIMARY_WRITE
SUPPORTING_WRITE
CLOSE_SYNC_WRITE
EVIDENCE_WRITE
```

These are parallelism roles only.
They do not replace SYS-50 transaction roles or SYS-09 change families.

### 7.2 Scope identity

A write/read scope may name:
- exact repository path;
- registered path family;
- semantic living authority;
- protected authority surface;
- release/production identity surface;
- bounded registry/manifest domain.

Important:

```text
semantic authority overlap
may exist even when filenames differ
```

and:

```text
same file
may be read-only for one task and writable for another
```

Therefore path equality alone is neither necessary nor sufficient for a safe-parallel decision.

---

## 8. Read/write authority model

SYS-49 distinguishes:

```text
READ AUTHORITY
= task consumes the current value/contract

WRITE AUTHORITY
= task may change that value/contract
```

Frozen rule:

```text
Task A writes authority X
+ Task B's legitimacy/scope/gate/design assumes X remains unchanged
→ not parallel safe by default
```

If B can continue only after seeing A's result:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

If B's substantive work is independent but must refresh X before close:

```text
→ PARALLEL_GUARDED
```

The source contract decides which case applies.
SYS-49 must not guess semantic independence.

---

## 9. Frozen v1 safety dimensions

Every assessment reviews these dimensions.

```text
P1 TASK / GATE STARTABILITY
P2 DIRECT WORK DEPENDENCY
P3 PRIMARY / SUPPORTING MUTATION OVERLAP
P4 LIVING CLOSE-SYNC OVERLAP
P5 AUTHORITY WRITE→READ INVALIDATION
P6 BRANCH / PR / EXACT-BASE RELATION
P7 PROTECTED GOVERNANCE INTERFERENCE
P8 PRODUCTION / LIVE-EVIDENCE STABILITY
P9 CAPTURE / ASSESSMENT FRESHNESS
```

No single dimension can promote a pair to SAFE when another dimension is unresolved.

---

## 10. PF-01 — Non-startable task

If either task's current canonical state says work cannot start:

```text
→ PARALLEL_NOT_STARTABLE
```

Examples:

```text
gate = POST_M2_3 but M2-3 not closed
implementation = HOLD under active Design Sweep First
blocked live gate prerequisite
superseded task card
```

High importance or a clean relation does not override this.

---

## 11. PF-02 — Direct predecessor dependency

If:

```text
Task B requires an output/decision/evidence/authority produced by Task A
```

then:

```text
A → B
→ PARALLEL_SERIALIZE_REQUIRED
```

This includes explicit SYS-03 dependency or an equivalent source-owned prerequisite.

Do not transform a predecessor relation into parallelism merely because different files are used.

---

## 12. PF-03 — Shared primary mutation authority

If two tasks both perform `PRIMARY_WRITE` against the same exact path or same semantic authority:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

Examples:
- both redesign the same policy contract;
- both change the same runtime ownership surface;
- both change the same fixture-authority registry as their primary objective;
- both modify the same release/repository-governance authority.

No "last writer wins" semantics are allowed for authoritative repository state.

---

## 13. PF-04 — Primary write versus supporting write collision

If one task's primary mutation collides with another task's supporting mutation on the same contract/authority:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

Reason:
- a supporting change cannot safely validate against a moving primary contract unless the owning design explicitly allows independent composition.

If the support is generated/recomputed after the primary task closes, that is a predecessor relation, not parallel execution.

---

## 14. PF-05 — Shared close-sync only

If substantive mutation scopes are disjoint, but tasks both require `CLOSE_SYNC_WRITE` to shared living authorities such as:

```text
system idea inventory
progress ledger
NON_RUNTIME classification ledger
deferred/current NEXT state
```

then:

```text
→ PARALLEL_GUARDED
```

Required guards:

```text
PG-01 SERIALIZE_SHARED_CLOSE_SYNC
PG-02 FRESH_REREAD_BEFORE_CLOSE
PG-03 RECOMPUTE_DERIVED_COUNTS_AND_NEXT
```

Meaning:
- substantive design/implementation may proceed concurrently;
- the first close updates the living authority;
- the second close must reread the newly current authority and recompute counts/NEXT rather than writing from its original base snapshot.

This rule is the primary safeguard against lost updates during parallel document work.

---

## 15. PF-06 — One task writes another task's defining authority

If Task A changes an authority that defines Task B's:
- gate;
- selection;
- objective;
- frozen design contract;
- mutation boundary;
- proof obligation;
- protected-system policy;

then:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

unless B's source authority explicitly says the change is irrelevant to its bounded scope.

No automatic irrelevance inference is allowed.

---

## 16. PF-07 — Same mutable branch

Two tasks writing directly to the same mutable branch are not automatically unsafe, but their write phases cannot be treated as independent.

If:

```text
same branch
+ any overlapping write authority
→ PARALLEL_SERIALIZE_REQUIRED
```

If:

```text
same branch
+ substantive write scopes disjoint
+ only independent commits / close sync
```

then at best:

```text
→ PARALLEL_GUARDED
```

Required guards:

```text
PG-04 ONE_WRITER_AT_A_TIME_ON_SHARED_REF
PG-05 VERIFY_PARENT_BEFORE_WRITE
PG-02 FRESH_REREAD_BEFORE_CLOSE
```

A branch name is a mutable transport ref, not a concurrency lock.

---

## 17. PF-08 — Different branches are not sufficient

Frozen anti-inference rule:

```text
different branches
!= PARALLEL_SAFE
```

Different branches remove one immediate ref-write collision but do not resolve:
- shared semantic authority;
- common exact-base contract;
- predecessor dependency;
- production identity movement;
- shared close-sync state;
- protected infrastructure movement.

Branch separation is evidence for one dimension only.

---

## 18. PF-09 — Exact-base sibling transactions

Two transactions may both begin from the same exact base SHA.

If completion of either transaction can advance the base required by the other:

```text
Task A expectedBase = P
Task B expectedBase = P
Task A closes/merges → base becomes P1
Task B still requires exact P
```

then end-to-end parallel completion is not safe.

If substantive work may be prepared independently and replay/rebuild is an explicitly allowed contract:

```text
→ PARALLEL_GUARDED
```

Required guards:

```text
PG-06 SERIALIZE_PROMOTION_OR_MERGE
PG-07 REAUDIT_SYS36_BEFORE_PROMOTION
PG-08 REPLAY_OR_REBUILD_IF_EXACT_BASE_MOVED
```

If replay/rebuild is not authorized or would invalidate the work/evidence:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

SYS-49 consumes SYS-36 facts; it does not implement Git ancestry or exact-base verification itself.

---

## 19. PF-10 — SYS-36 relationship uncertainty

When branch/PR relationships materially affect safety, a current coherent SYS-36 result is required.

```text
RELATION_BLOCKED
RELATION_SNAPSHOT_RACED
required exact ref/SHA unresolved
stale relationship capture after branch movement
```

→

```text
PARALLEL_BLOCKED
```

Critical non-equivalence:

```text
SYS-36 RELATION_CLEAN
!= PARALLEL_SAFE
```

RELATION_CLEAN merely allows SYS-49 to reason from coherent repository facts.

---

## 20. PF-11 — Protected governance mutation

Protected authority changes receive conservative concurrency treatment.

If Task A changes:

```text
CI/release system authority
repository writer / branch coordination
fixture-authority governance
architecture-governance enforcement
release-simcore publication authority
```

and Task B relies on that same governed surface remaining stable:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

Examples:
- local tooling implementation while a separate task rewires its permanent CI enrollment;
- runtime implementation while repository coordination rules governing its write path are being redesigned;
- fixture work while fixture-authority membership rules are being changed;
- release work while release mechanism authority is being redesigned.

This preserves the standing rule that feature/runtime and repository/release-system redesign remain independently attributable.

---

## 21. PF-12 — Production / live-evidence stability

Production/live tasks may require a stable runtime identity.

If Task B's evidence claim requires the production identity to remain fixed while Task A can publish/change that identity:

```text
→ PARALLEL_SERIALIZE_REQUIRED
```

Example:

```text
real-long-chat validation for production version V
+ release transaction that would move production to V+1
→ do not overlap the evidence window with the publication
```

However:

```text
pending live gate / user observation
+ unrelated NON_RUNTIME design-only work
```

may remain compatible when the design work cannot change plugin/runtime/release authority.

If both may later write shared living close records:

```text
→ PARALLEL_GUARDED
```

rather than automatically SAFE.

---

## 22. PF-13 — Immediate anomaly capture priority

SimCore requires suspicious real-world behavior to be preserved immediately before unrelated work proceeds.

Therefore if a live/evidence task discovers a new anomaly while another task is approaching a shared close-sync write:

```text
new anomaly evidence/classification capture
→ takes priority on its owning evidence/living authority
```

The other task must:

```text
stop shared close write
reread current authority
incorporate the new WATCH / DEFER / FIX / BLOCKER posture if relevant
recompute NEXT/close state
```

Parallel assessment becomes stale and must be reevaluated if the anomaly changes scope/gate/priority authority.

This is not product-blocker promotion by SYS-49; the owning evidence authority classifies the anomaly.

---

## 23. PF-14 — Read-only overlap

Two tasks may read the same authority concurrently.

```text
shared READ only
+ no write/dependency invalidation
→ no conflict by itself
```

Reading the same design, release identity or inventory is normal.

If one later writes that authority, PF-05/PF-06/PF-11 applies depending on role.

---

## 24. PF-15 — No filename-only reasoning

Frozen anti-inference rules:

```text
no shared paths
!= safe

shared path
!= automatically unsafe
```

Examples:

```text
Task A writes policy A
Task B writes policy B
both different files
but B's contract depends on policy A
→ serialize
```

```text
Task A reads CURRENT_DEVELOPMENT.md
Task B reads CURRENT_DEVELOPMENT.md
→ read-only overlap alone is fine
```

SYS-49 needs semantic authority roles, not only file lists.

---

## 25. PF-16 — Scope changes invalidate the assessment

Parallel safety is point-in-time.

Any material change to one task's:

```text
objective
work type
IN/OUT scope
mutation boundary
gate
protected surface
branch/base/head relation
dependency
required authority set
```

makes the prior assessment:

```text
PARALLEL_ASSESSMENT_STALE
```

No cached SAFE/GUARDED result may survive a material task-card amendment or supersession.

Required action:

```text
refresh source authorities
→ rerun SYS-36 if repository relation changed
→ recompute SYS-49
```

---

## 26. Frozen guard vocabulary

Exactly these v1 guards:

```text
PG-01 SERIALIZE_SHARED_CLOSE_SYNC
PG-02 FRESH_REREAD_BEFORE_CLOSE
PG-03 RECOMPUTE_DERIVED_COUNTS_AND_NEXT
PG-04 ONE_WRITER_AT_A_TIME_ON_SHARED_REF
PG-05 VERIFY_PARENT_BEFORE_WRITE
PG-06 SERIALIZE_PROMOTION_OR_MERGE
PG-07 REAUDIT_SYS36_BEFORE_PROMOTION
PG-08 REPLAY_OR_REBUILD_IF_EXACT_BASE_MOVED
PG-09 RECHECK_GATE_AFTER_UPSTREAM_CHANGE
PG-10 ANOMALY_EVIDENCE_PRIORITY
PG-11 RECOMPUTE_PARALLEL_MATRIX_ON_SCOPE_CHANGE
```

A GUARD is an operational condition for allowed overlap.
It is not a new repository permission or lock primitive.

---

## 27. Pairwise and group evaluation

For N tasks:

```text
1. validate each task independently
2. evaluate every pair across P1..P9
3. evaluate shared mutable authority writer cardinality across the whole set
4. aggregate strongest disposition
5. emit one explicit guard set
```

Group-level rule:

```text
2+ writers to one semantic primary authority
→ SERIALIZE_REQUIRED
```

even if path aliases would make pairwise filename checks appear disjoint.

Shared close-sync writers may remain `GUARDED` only when all primary/substantive authority mutations remain independent.

---

## 28. Finding vocabulary

Canonical v1 findings:

```text
PWF-01 TASK_INPUT_UNRESOLVED
PWF-02 TASK_NOT_STARTABLE
PWF-03 DIRECT_PREDECESSOR_DEPENDENCY
PWF-04 PRIMARY_WRITE_OVERLAP
PWF-05 PRIMARY_SUPPORT_WRITE_COLLISION
PWF-06 SHARED_CLOSE_SYNC
PWF-07 AUTHORITY_WRITE_READ_INVALIDATION
PWF-08 SAME_MUTABLE_REF_WRITE
PWF-09 EXACT_BASE_SIBLING_REVALIDATION
PWF-10 RELATION_FACTS_UNRESOLVED
PWF-11 PROTECTED_GOVERNANCE_INTERFERENCE
PWF-12 PRODUCTION_IDENTITY_STABILITY_CONFLICT
PWF-13 ASSESSMENT_STALE
PWF-14 GROUP_MULTIWRITER_CONFLICT
PWF-15 SEMANTIC_SCOPE_UNRESOLVED
PWF-16 ANOMALY_PREEMPTED_CLOSE_SYNC
```

Informational observations may include:

```text
PWI-01 SHARED_READ_ONLY
PWI-02 DISJOINT_PRIMARY_MUTATION
PWI-03 SEPARATE_BRANCHES_OBSERVED
PWI-04 SHARED_BASE_NO_EXACT_BASE_CONTRACT
PWI-05 LIVE_GATE_WITH_NONRUNTIME_DESIGN_COMPATIBLE
```

Informational codes never promote a pair to SAFE when stronger findings exist.

---

## 29. Relationship to SYS-46 Canonical Task Card

SYS-46 owns task identity/scope.

```text
SYS-46
→ what exactly is each task?

SYS-49
→ may those already-defined tasks overlap?
```

SYS-49 must not rewrite a task card to make a conflict disappear.

If safe parallelism requires changing a task's scope:

```text
amend/supersede task under SYS-46
→ then rerun SYS-49
```

---

## 30. Relationship to SYS-50 Work Bundling Conflict Detector

```text
SYS-50
same transaction compatibility

SYS-49
distinct transaction concurrency compatibility
```

Mandatory non-equivalences:

```text
BUNDLE_CLEAN != PARALLEL_SAFE
BUNDLE_SPLIT_REQUIRED != PARALLEL_SAFE
BUNDLE_SPLIT_REQUIRED != PARALLEL_SERIALIZE_REQUIRED automatically
```

After a split, SYS-49 performs a fresh concurrency review of the resulting separate tasks.

---

## 31. Relationship to SYS-09 Change-Impact Review Map

SYS-09 provides reviewed semantic change-family context.

SYS-49 may use it to understand that a task affects:
- runtime;
- living state;
- evidence;
- fixtures;
- architecture;
- local tooling;
- CI/release/repository authority;
- shared repository coordination.

SYS-49 does not infer CF-* families from paths/diffs and does not redefine review obligations.

A change family alone never determines parallel safety; actual role/dependency/mutation authority matters.

---

## 32. Relationship to SYS-36 Branch/PR Relationship Auditor

SYS-36 provides exact relationship facts.
SYS-49 provides the concurrency judgment.

```text
SYS-36
→ branch A at SHA H1
→ branch B at SHA H2
→ main at P
→ exact-base relation / PR state coherent

SYS-49
→ given those facts plus task scopes and authority relations, may A and B overlap?
```

SYS-49 never duplicates GitHub capture, merge-state logic, ancestry or race detection.

If relationship facts matter but no current SYS-36 result exists:

```text
→ PARALLEL_BLOCKED
```

rather than a guessed SAFE.

---

## 33. Relationship to SYS-03 gate dependencies

SYS-03 owns review-event → dependent gated-item relationships.

If one candidate task is a direct prerequisite of another:

```text
SYS-03 dependency
→ SYS-49 DIRECT_PREDECESSOR_DEPENDENCY
→ serialize
```

SYS-49 cannot open the dependent gate or weaken the dependency.

---

## 34. Relationship to SYS-31 / release authority

SYS-31 owns release/version blast-radius review.

SYS-49 may identify concurrency interference when:
- one task changes release infrastructure the other relies on;
- one task changes production identity during the other's live-evidence window;
- exact-base release/candidate relationships need serialized promotion.

It does not perform release-radius analysis or authorize publication.

```text
PARALLEL_SAFE
!= RELEASE_READY
```

---

## 35. Relationship to SYS-42

```text
SYS-49
= may separately scoped implementation tasks overlap?

SYS-42
= did one actual implementation stay inside its own frozen slice?
```

A pair may be parallel-safe and one task may still violate its own implementation slice.
Conversely, two individually conformant slices may still conflict through shared authority or branch coordination.

---

## 36. Relationship to SYS-35 transaction ledger

SYS-35 may later preserve meaningful transaction lineage after work closes.

SYS-49 is current/preflight coordination, not historical transaction authority.

A SYS-49 assessment may be cited as point-in-time coordination evidence but does not prove who authored later commits or whether a merge actually occurred.

---

## 37. Real specimen — parallel main activity during SYS-07

The existing WATCH is a canonical specimen:

```text
SYS-07 bounded design work
base main = 14e692f...

parallel unrelated canonical-main commit lands
= 2453a6e...

no overlapping SYS-07 paths
no release-simcore impact
no semantic conflict observed
```

Operational lesson already frozen there:

```text
base→head compare
!= transaction authorship
```

SYS-49 extends the lesson:

```text
parallel main activity
!= defect by itself
```

but safe concurrent work requires explicit scope/authority/ref guards.

For two direct-main writers with disjoint substantive scope:

```text
→ at best PARALLEL_GUARDED
→ each write must verify current parent and reread shared living state
```

This design does not review or absorb the unrelated canonical-main work-decomposition system itself.

---

## 38. Canonical positive control — pending live gate + system design

Current SimCore posture provides a positive compatibility pattern:

```text
Task A
= v0.64.7 real-long-chat observation / evidence task
= cannot change runtime/release bytes during observation

Task B
= system-idea design-only transaction
= main docs only
= system implementation/application HOLD
```

Their substantive objectives may overlap in time.

However, if both need to update shared living evidence/progress/deferred state:

```text
→ PARALLEL_GUARDED
```

with:

```text
PG-01 SERIALIZE_SHARED_CLOSE_SYNC
PG-02 FRESH_REREAD_BEFORE_CLOSE
PG-10 ANOMALY_EVIDENCE_PRIORITY
PG-11 RECOMPUTE_PARALLEL_MATRIX_ON_SCOPE_CHANGE
```

This preserves useful parallel progress without allowing a live anomaly to be overwritten by a stale design-close snapshot.

---

## 39. Minimum later implementation shape

Preferred later protected implementation:

```text
products/simcore/tooling/safe-parallel-work-rules-v1.json
products/simcore/tooling/safe-parallel-work-core.mjs
products/simcore/tooling/safe-parallel-work.mjs
products/simcore/tooling/safe-parallel-work.test.mjs
```

Conceptual flow:

```text
reviewed task profiles
+ optional current SYS-36 normalized report
+ reviewed dependency/authority facts
→ deterministic local core
→ bounded compatibility matrix/report
```

The deterministic core is:
- local;
- read-only;
- no repository writes;
- no branch/PR mutation;
- no automatic task creation;
- no automatic scheduling;
- no merge/close/delete primitive;
- no release publication;
- no permanent CI integration in the implementation transaction.

SYS-49 should consume a supplied SYS-36 report/receipt rather than duplicate live GitHub collection inside the deterministic core.

---

## 40. Why SYS-49 is `NR_PROTECTED`

Although the preferred core is read-only, its purpose is repository/work-governance policing.

A false `PARALLEL_SAFE` can authorize operators to act concurrently across:
- shared main writers;
- branch/PR transactions;
- exact-base promotions;
- release/production evidence windows;
- CI/repository-governance changes;
- shared living authority writers.

Canonical NR policy treats branch/repository/release governance policing as protected territory.

Therefore:

```text
Apply Class = NR_PROTECTED
```

Later implementation requires its own protected transaction and explicit verification of fail-closed behavior.

`NR_PROTECTED` does not grant write authority.
It restricts how the read-only judgment tool may be introduced and trusted.

---

## 41. No CI / scheduler / lock integration in implementation transaction

Frozen separation:

```text
SYS-49 implementation
!= required CI gate
!= branch protection
!= merge queue
!= scheduler
!= repository mutex
!= automatic lock
!= work dispatcher
```

If later evidence justifies automated enforcement or shared locks, that is a separate protected repository-system design and implementation transaction.

Do not bundle it into the first SYS-49 implementation.

---

## 42. Output contract

Machine-readable v1 output is bounded to:

```text
schemaVersion
assessmentId
evaluatedAt
taskIds[]
sourceAuthorityRefs[]
overallDisposition
pairResults[]
groupFindings[]
guards[]
assessmentFreshness
notClaims[]
```

Each pair result includes:

```text
taskA
taskB
disposition
findings[]
guards[]
```

No raw chat body, full diff, secret/token, patch proposal, branch mutation command, or scheduling command is emitted.

---

## 43. Evidence honesty / non-claims

Mandatory non-claims:

```text
PARALLEL_SAFE
!= task authorization
!= gate open beyond cited authority
!= BUNDLE_CLEAN
!= implementation conformance
!= CI PASS
!= merge approval
!= release readiness
!= LIVE_PASS
!= proof that future branch tips remain unchanged
```

`PARALLEL_GUARDED` means overlap is safe only while every named guard remains satisfied.

A stale assessment cannot be cited as current safety proof.

---

## 44. Required later verification specimens

Any future implementation must include at least:

```text
T1 two independently startable tasks, disjoint primary/support/close writes, no dependency
→ PARALLEL_SAFE

T2 two tasks write same PRIMARY semantic authority
→ PARALLEL_SERIALIZE_REQUIRED

T3 same exact file primary write by both
→ PARALLEL_SERIALIZE_REQUIRED

T4 disjoint primary work but same living CLOSE_SYNC authority
→ PARALLEL_GUARDED + PG-01/02/03

T5 Task A writes gate/design authority consumed by Task B
→ PARALLEL_SERIALIZE_REQUIRED

T6 explicit predecessor A → B
→ PARALLEL_SERIALIZE_REQUIRED

T7 two read-only consumers of same authority
→ no conflict by itself

T8 different branches but shared semantic primary authority
→ MUST NOT return PARALLEL_SAFE

T9 same mutable main branch, disjoint primary writes
→ at best PARALLEL_GUARDED + PG-04/05

T10 two exact-base sibling transactions, replay allowed
→ PARALLEL_GUARDED + PG-06/07/08

T11 exact-base sibling, replay not allowed
→ PARALLEL_SERIALIZE_REQUIRED

T12 SYS-36 relation snapshot raced/unresolved where relation matters
→ PARALLEL_BLOCKED

T13 SYS-36 RELATION_CLEAN but primary write overlap exists
→ MUST NOT return PARALLEL_SAFE

T14 one task not startable under gate/HOLD
→ PARALLEL_NOT_STARTABLE

T15 protected repository/CI authority mutation while other task relies on it
→ PARALLEL_SERIALIZE_REQUIRED

T16 production live validation + production publication during evidence window
→ PARALLEL_SERIALIZE_REQUIRED

T17 pending live gate observation + unrelated design-only work with shared close ledgers
→ PARALLEL_GUARDED

T18 new live anomaly appears before design shared-close write
→ anomaly guard/fresh reread required; prior assessment stale when authority changes

T19 task-card mutation after assessment
→ PARALLEL_ASSESSMENT_STALE / rerun required

T20 no network/write/scheduler/merge primitive in deterministic core
→ verified
```

No real long-chat validation is required solely for SYS-49 implementation.
Real repository concurrency specimens may later be used as bounded operational evidence without changing the deterministic contract.

---

## 45. Failure / ambiguity behavior

Fail closed when:
- task identity is ambiguous;
- write/read semantic scope is unresolved;
- task card is stale/contradictory;
- dependency direction is unresolved;
- branch relation matters but SYS-36 facts are absent/stale/raced;
- a protected surface relation cannot be established;
- an apparent supporting/close role may actually hide a primary mutation;
- a current authority changed after the assessment.

Never convert uncertainty into:

```text
probably independent
probably different enough
probably safe on separate branches
```

---

## 46. Non-goals

SYS-49 v1 does not:

```text
select NEXT
change priority
open/close gates
create task cards
split task cards
create branches
create/close/merge PRs
rebase/replay automatically
write main
write release-simcore
lock repository refs
schedule workers
start background jobs
monitor GitHub continuously
modify CI workflows
modify branch protection
change release infrastructure
classify runtime anomalies
repair conflicts
```

---

## 47. Design acceptance

SYS-49 is complete when all are true:

```text
1. separate transactions are distinguished from bundling
2. startability is checked before compatibility
3. semantic authority overlap is not reduced to filename overlap
4. shared primary writes serialize
5. shared close-sync only can be guarded rather than globally blocked
6. direct predecessor dependencies serialize
7. authority write→read invalidation serializes unless explicit source semantics permit guarded refresh
8. different branches are not treated as sufficient safety proof
9. exact-base siblings require promotion/replay guards or serialization
10. SYS-36 facts are consumed without duplicating relationship capture
11. RELATION_CLEAN is not treated as PARALLEL_SAFE
12. protected governance movement receives conservative treatment
13. production/live evidence can require stable production identity
14. immediate anomaly capture can preempt stale close-sync work
15. material task/scope/ref changes stale the assessment
16. output never schedules or mutates work
17. apply class is NR_PROTECTED
18. no runtime/release-simcore change occurs
```

All conditions are frozen here.

---

## 48. Application / implementation posture

```text
DESIGN = FROZEN
APPLY CLASS = NR_PROTECTED
IMPLEMENTATION = HOLD
CI / SCHEDULER / LOCK INTEGRATION = NOT AUTHORIZED
RUNTIME CHANGE = NONE
RELEASE-SIMCORE CHANGE = NONE
REAL LONG-CHAT VALIDATION = NOT REQUIRED SOLELY FOR SYS-49
```

Actual implementation must wait for a separately selected protected implementation transaction.

---

## 49. Verdict

```text
SYS-49 SAFE PARALLEL WORK FINDER
= FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_PROTECTED

Core safety rule:
parallel work is permitted only from independently legitimate task definitions plus explicit semantic mutation/dependency/repository facts;
branch separation, file separation, BUNDLE_CLEAN, or RELATION_CLEAN alone are never enough.

Primary useful allowance:
disjoint substantive work may overlap while shared living close-sync is serialized under fresh-reread/recompute guards.

Implementation/application remains HOLD.
Plugin/runtime/release-simcore remains unchanged.
```