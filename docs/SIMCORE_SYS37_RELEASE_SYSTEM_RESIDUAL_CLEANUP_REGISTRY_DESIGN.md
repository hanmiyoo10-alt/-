# SYS-37 — Release-System Residual Cleanup Registry — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · RELEASE-RESIDUAL MEMORY / CLEANUP-ELIGIBILITY CONTRACT · NO CLEANUP EXECUTION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-37
Idea          = Release-System Residual Cleanup Registry
Size          = SMALL
Importance    = 3 / MEDIUM
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

Direct operating context:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_FIRST_REAL_RELEASE_RETROSPECTIVE.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `products/simcore/releases/R_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS_STATUS.json`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3_PROJECT_AUTHORITY_CLOSURE_AMENDMENT.md`
- `docs/SIMCORE_SYS33_ROLLBACK_READINESS_CHECKLIST_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS36_BRANCH_PR_RELATIONSHIP_AUDITOR_DESIGN.md`
- `docs/SIMCORE_SYS52_OPERATOR_ERROR_SPECIMEN_LEDGER_DESIGN.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`

Existing authorities SYS-37 must not replace:
- current Release System v2/v2.1 policy and machine status files;
- exact Git/GitHub branch, workflow, commit and run identities;
- `release-simcore` as runtime/deployment authority;
- `main` release/state/evidence documents as administrative authority;
- SYS-33 rollback-readiness judgment;
- SYS-35 repository-transaction lineage;
- SYS-36 branch/PR relationship facts;
- SYS-52 operator/tooling process-error memory;
- source-owned WATCH / DEFER / FIX / BLOCKER classification.

---

## 1. Problem

Release System v2 and v2.1 intentionally keep safety evidence and historical artifacts even after an operating path is replaced or simplified.

That is correct, but it leaves a different maintenance question:

```text
Which release-system leftovers are still physically present?
Which are intentionally retained compatibility/history?
Which are current WATCH/DEFER items rather than cleanup work?
Which may be removed only after a named trigger?
Which cannot be removed because the required tool/capability is unavailable?
Which historical evidence must survive even after the physical artifact is retired?
```

Today those facts are distributed across release retrospective, v2.1 status, operator policy, RS2-3 closure amendments and dedicated evidence documents.

Representative current source-owned residuals include:

```text
LEGACY_ACTIVATION_SELF_TEST_SENTINELS
= DEFER / TEST_HARNESS_CLEANUP / NON_OPERATIONAL / NON_BLOCKING

CANDIDATE_TRANSPORT_REF_RETIREMENT
= DEFER / TOOL_SURFACE / NON_RUNTIME / NON_BLOCKING

PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
= WATCH / OBSERVABILITY / NON_RUNTIME / NON_BLOCKING

GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
= WATCH / NON_BLOCKING

REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= DEFER / ADMIN_GOVERNANCE / NON_RUNTIME / RESIDUAL
```

The danger is not merely forgetting cleanup.

A worse failure would be to treat every residual as deletable junk and accidentally remove:
- historical release evidence;
- compatibility surfaces still needed by a self-test;
- a fallback/recovery surface still relevant to rollback;
- a transport ref that cannot yet be safely retired;
- a WATCH that should remain observed rather than "fixed" without evidence.

SYS-37 defines one curated release-system residual registry that keeps **residual existence, authority posture, cleanup eligibility and preservation requirements separate**.

---

## 2. Core invariant

```text
source-owned release-system residual
+ exact residual identity / location
+ source-owned disposition
+ reviewed current operational role
+ reviewed cleanup eligibility / trigger
+ preservation constraints
+ bounded mutation surface when later cleanup is selected
+ exact evidence refs
→ curated release-system residual row

SYS-37
!= cleanup executor
!= auto-delete list
!= branch deleter
!= workflow retire tool
!= CI/release-policy mutator
!= release authority
!= residual severity engine
!= rollback selector
!= proof/debt engine
!= repository writer
```

Canonical question:

> What release-system residue still exists, why is it still here, and what exact condition must be true before a separate cleanup transaction may touch it?

SYS-37 does not answer:

> Should we delete it now?

> Is a release safe to publish?

> Is the residual a blocker?

> Is an old branch still related correctly?

Those answers remain with their owning authorities.

---

## 3. Why v1 is `NR_DOC_ONLY`

The hard part is semantic eligibility, not discovering files.

A repository crawler can list:
- workflow files;
- branches;
- comments/strings;
- release JSON;
- old docs.

It cannot safely decide:
- whether a legacy string is still required by a compatibility self-test;
- whether a branch/ref has enough durable evidence to retire;
- whether a physical legacy workflow remains an authorized fallback;
- whether a WATCH should be changed without new evidence;
- whether a cleanup would weaken rollback or recovery readiness.

Therefore useful v1 is a reviewed document registry, conceptually:

```text
docs/SIMCORE_RELEASE_SYSTEM_RESIDUAL_CLEANUP_REGISTRY.md
```

Apply class:

```text
NR_DOC_ONLY
```

No scanner, GitHub Action, branch cleanup bot, workflow remover, repository writer, release controller modification or runtime change is part of SYS-37 v1.

A later read-only existence checker could be designed separately if it consumes explicit registered paths/refs and does not decide cleanup eligibility.

---

## 4. Residual is not a synonym for defect

Frozen rule:

```text
RESIDUAL
!= BUG
!= DEBT automatically
!= BLOCKER
!= UNUSED
!= SAFE_TO_DELETE
```

A residual may be:
- intentionally preserved compatibility;
- an external/tool-surface defer;
- an observation-only WATCH;
- a historical physical leftover awaiting a safe cutover trigger;
- an administrative hardening gap outside current authorized operation.

The source-owned disposition is copied, never recomputed by SYS-37.

---

## 5. Frozen residual kinds

Exactly six v1 kinds:

```text
RR-01 LEGACY_COMPATIBILITY_ARTIFACT
RR-02 PHYSICAL_NONAUTHORITATIVE_LEFTOVER
RR-03 TOOL_SURFACE_RETIREMENT_DEFER
RR-04 OBSERVABILITY_WATCH
RR-05 ADMIN_GOVERNANCE_RESIDUAL
RR-06 ENVIRONMENT_COMPATIBILITY_WATCH
```

### RR-01 `LEGACY_COMPATIBILITY_ARTIFACT`

A physical/string/config artifact remains because an older compatibility/self-test surface still observes it.

Canonical example:

```text
LEGACY_ACTIVATION_SELF_TEST_SENTINELS
```

### RR-02 `PHYSICAL_NONAUTHORITATIVE_LEFTOVER`

A physical release/verification surface may remain after authority moved elsewhere, but it is explicitly non-authoritative and may still require a named cutover or preservation review before retirement.

This kind must not be inferred merely from file age.

### RR-03 `TOOL_SURFACE_RETIREMENT_DEFER`

Retirement is semantically acceptable or anticipated, but the current repository/tool surface does not provide the required bounded mutation capability.

Canonical example:

```text
CANDIDATE_TRANSPORT_REF_RETIREMENT
```

### RR-04 `OBSERVABILITY_WATCH`

A current mechanism is operational and no failure has been established, but the implementation shape remains under observation.

Canonical example:

```text
PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
```

This is not cleanup-eligible merely because a different design seems prettier.

### RR-05 `ADMIN_GOVERNANCE_RESIDUAL`

An external/platform administrative hardening capability remains unavailable or unverified while project-owned authority is valid under an explicit amended model.

Canonical example:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
```

### RR-06 `ENVIRONMENT_COMPATIBILITY_WATCH`

A dependency/runtime/toolchain warning exists without a demonstrated release correctness failure.

Canonical example:

```text
GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
```

---

## 6. Frozen source disposition field

Each row copies one source-owned governance disposition:

```text
WATCH
DEFER
FIX
BLOCKER
N/A
```

Rules:
- do not translate WATCH into cleanup-needed;
- do not translate DEFER into stale/overdue;
- FIX/BLOCKER may appear only if the owning release/evidence authority actually assigns it;
- `N/A` is allowed for a pure retained compatibility artifact with no governance disposition.

SYS-37 never changes the source disposition by itself.

---

## 7. Current operational role

Frozen vocabulary:

```text
NON_OPERATIONAL_HISTORY
COMPATIBILITY_ONLY
ACTIVE_NONAUTHORITATIVE_SUPPORT
ACTIVE_OPERATIONAL_WATCH
EXTERNAL_CAPABILITY_GAP
ROLE_UNRESOLVED
```

Meaning:

### `NON_OPERATIONAL_HISTORY`

No current release operation depends on the artifact; historical evidence remains.

### `COMPATIBILITY_ONLY`

Not release authority, but a current test/compatibility surface still references it.

### `ACTIVE_NONAUTHORITATIVE_SUPPORT`

Still participates in a supporting/fallback/recovery or transport role but is not the current semantic/publishing authority.

### `ACTIVE_OPERATIONAL_WATCH`

The mechanism is part of current operation and remains observation-only.

### `EXTERNAL_CAPABILITY_GAP`

There may be nothing local to delete. The residual is a missing external/platform capability or administrative hardening gap.

### `ROLE_UNRESOLVED`

Fail closed. No cleanup eligibility may be claimed.

---

## 8. Cleanup posture

Exactly six top-level cleanup postures:

```text
RESIDUAL_KEEP
RESIDUAL_CLEANUP_ELIGIBLE
RESIDUAL_CLEANUP_TRIGGERED
RESIDUAL_CLEANUP_BLOCKED
RESIDUAL_EXTERNAL_WAIT
RESIDUAL_CLOSED_PRESERVED
```

### `RESIDUAL_KEEP`

The current correct action is to keep the residual as-is.

Typical reasons:
- current operational WATCH;
- compatibility dependency still active;
- no evidence supports modification.

### `RESIDUAL_CLEANUP_ELIGIBLE`

The source-backed prerequisites for a cleanup transaction are already satisfied, but no cleanup is performed by SYS-37.

### `RESIDUAL_CLEANUP_TRIGGERED`

A named trigger event has occurred and the item should be reviewed for a separate cleanup work item.

This still does not authorize mutation.

### `RESIDUAL_CLEANUP_BLOCKED`

Cleanup may be desirable, but an exact required safety/identity/authority fact is unresolved.

### `RESIDUAL_EXTERNAL_WAIT`

The only missing condition is an external/tool/platform capability or event not controlled by the current SimCore repository transaction.

### `RESIDUAL_CLOSED_PRESERVED`

Physical/admin cleanup has already completed under separate evidence. The row remains as historical residual lineage rather than being deleted.

---

## 9. Cleanup triggers

Each non-closed row must name one bounded trigger or explicitly state `NONE_KEEP`.

Preferred v1 trigger vocabulary:

```text
NONE_KEEP
ON_SELF_TEST_MIGRATION
ON_BRANCH_DELETE_CAPABILITY
ON_REAL_RUN_BINDING_AMBIGUITY
ON_PLATFORM_RULESET_CAPABILITY
ON_CONCRETE_NODE_RUNTIME_INCOMPATIBILITY
ON_RELEASE_CUTOVER_PROOF
ON_ROLLBACK_FALLBACK_RETIREMENT
ON_NAMED_EVIDENCE
OTHER_NAMED_EVENT
```

Rules:
- a calendar date alone is not a cleanup trigger;
- elapsed time does not make a residual eligible;
- a trigger opens review; it does not perform cleanup;
- free-form triggers must name an observable event.

---

## 10. Required registry fields

A v1 residual row records:

```text
Residual ID
Name
Residual Kind
Exact Location / Identity
Source Authority
Source Disposition
Current Operational Role
Cleanup Posture
Cleanup Trigger
Preserve After Cleanup
Mutation Surface
Verification Required
Related Authority / System
Evidence Refs
Record State
```

### `Exact Location / Identity`

May be:
- repository path + anchor;
- exact branch/ref name;
- exact workflow/path;
- explicit external capability identifier;
- exact status-file key.

Do not use vague text such as `old release stuff`.

### `Preserve After Cleanup`

Names historical/evidence objects that must survive physical cleanup.

Typical examples:
- release retrospective;
- candidate receipt/spec;
- publication record;
- implementation evidence;
- immutable commit/run identities;
- historical amended-closure evidence.

### `Mutation Surface`

Frozen values:

```text
DOC_ONLY
WORKFLOW_OR_TOOLING
BRANCH_OR_REF
CI_OR_GOVERNANCE
EXTERNAL_PLATFORM
NONE
UNRESOLVED
```

This field does not authorize that mutation class.

### `Verification Required`

Short source-backed requirement such as:

```text
focused self-test
permanent SimCore Verify + Required
SYS-36 exact relationship audit
release-state/source reobservation
rollback-readiness recheck
supplemental governance proof
NONE_DOC_ONLY
```

---

## 11. Record state

Registry-record integrity uses:

```text
ACTIVE
SUPERSEDED→<Residual ID>
CLOSED
RETRACTED
```

Do not delete a row because cleanup finished.

`CLOSED` means the residual lifecycle is complete and evidence preserved, not that the historical condition never existed.

---

## 12. Constitutional seed mappings

These examples validate the schema; they do not materialize the future registry in this design transaction.

### 12.1 Legacy activation self-test sentinels

```text
Name                  = LEGACY_ACTIVATION_SELF_TEST_SENTINELS
Kind                  = RR-01 LEGACY_COMPATIBILITY_ARTIFACT
Source Disposition    = DEFER
Operational Role      = COMPATIBILITY_ONLY
Cleanup Posture       = RESIDUAL_KEEP or CLEANUP_TRIGGERED only after source-backed self-test migration
Cleanup Trigger       = ON_SELF_TEST_MIGRATION
Preserve After Cleanup= operator policy + release-approval implementation/qualification evidence
Mutation Surface      = WORKFLOW_OR_TOOLING
```

The current operator policy says the strings remain only for compatibility with an older broad self-test and are non-operational/non-blocking.

### 12.2 Candidate transport ref retirement

```text
Name                  = CANDIDATE_TRANSPORT_REF_RETIREMENT
Kind                  = RR-03 TOOL_SURFACE_RETIREMENT_DEFER
Source Disposition    = DEFER
Operational Role      = ACTIVE_NONAUTHORITATIVE_SUPPORT or NON_OPERATIONAL_HISTORY only after exact source review
Cleanup Posture       = RESIDUAL_EXTERNAL_WAIT while deletion authority is unavailable
Cleanup Trigger       = ON_BRANCH_DELETE_CAPABILITY
Preserve After Cleanup= candidate receipt / release spec / release evidence / commit identity
Mutation Surface      = BRANCH_OR_REF
Verification Required = SYS-36 exact relationship audit + durable release evidence review
```

Never force-update or repurpose the immutable candidate ref merely to make it disappear.

### 12.3 Permanent activation run-discovery polling

```text
Name               = PERMANENT_ACTIVATION_RUN_DISCOVERY_POLLING
Kind               = RR-04 OBSERVABILITY_WATCH
Source Disposition = WATCH
Operational Role   = ACTIVE_OPERATIONAL_WATCH
Cleanup Posture    = RESIDUAL_KEEP
Cleanup Trigger    = ON_REAL_RUN_BINDING_AMBIGUITY
Mutation Surface   = NONE until evidence justifies a separate redesign
```

The current retrospective explicitly says not to rewrite it without evidence.

### 12.4 Required-CI platform enforcement gap

```text
Name               = REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
Kind               = RR-05 ADMIN_GOVERNANCE_RESIDUAL
Source Disposition = DEFER
Operational Role   = EXTERNAL_CAPABILITY_GAP
Cleanup Posture    = RESIDUAL_EXTERNAL_WAIT
Cleanup Trigger    = ON_PLATFORM_RULESET_CAPABILITY
Mutation Surface   = EXTERNAL_PLATFORM / CI_OR_GOVERNANCE
Preserve           = RS2-3 amended-closure evidence
```

Project-owned gateway authority remains valid under its explicit amendment; SYS-37 must not rewrite history to pretend platform enforcement existed.

### 12.5 GitHub Actions Node warning

```text
Name               = GITHUB_ACTIONS_NODE20_TARGET_FORCED_NODE24
Kind               = RR-06 ENVIRONMENT_COMPATIBILITY_WATCH
Source Disposition = WATCH
Operational Role   = ACTIVE_OPERATIONAL_WATCH
Cleanup Posture    = RESIDUAL_KEEP
Cleanup Trigger    = ON_CONCRETE_NODE_RUNTIME_INCOMPATIBILITY
Mutation Surface   = NONE until evidence exists
```

No release correctness failure is currently attributed to it.

---

## 13. What is explicitly NOT a SYS-37 residual

Do not put these into the cleanup registry merely because they are incomplete/current:

```text
v0.64.7 real-long-chat gate PENDING
R2.1 genuine runtime release E2E proof PENDING
post-M2-3 genuine-edit revalidation requirement
future architecture checkpoint work
verification debt whose owner is SYS-28
open product/runtime feature work
```

Those are proof/gate/development obligations, not cleanup residue.

Likewise, an old document is not a residual merely because it is historical. SYS-05 owns document lifecycle semantics.

---

## 14. Relationship to rollback readiness

SYS-33 remains authoritative for whether recovery/rollback has an exact usable source and preservation plan.

Frozen rule:

```text
cleanup candidate touches fallback / recovery / release transport surface
→ review SYS-33 / current recovery authority first
→ if cleanup could weaken a required recovery path
→ RESIDUAL_CLEANUP_BLOCKED
```

SYS-37 never declares an artifact safe to delete merely because it is non-authoritative for normal publication.

---

## 15. Relationship to SYS-36 branch/PR relationship audit

For branch/ref residuals:

```text
SYS-36
= what branch/ref/commit relationship actually exists?

SYS-37
= given reviewed relationship facts, what is the residual/cleanup posture?
```

Therefore:

```text
RELATION_CLEAN
!= safe to delete branch/ref
```

A future candidate-ref cleanup transaction should use exact SYS-36 relationship evidence but still require source-owned cleanup eligibility.

---

## 16. Relationship to SYS-35 and SYS-52

SYS-35 records meaningful repository transactions after an actual cleanup/cutover operation occurs.

SYS-37 records the residual before/after that transaction and keeps its lifecycle visible.

SYS-52 records operator/tooling process deviations. A mistaken cleanup attempt may become a SYS-52 specimen, but that does not turn SYS-37 into an operator-error ledger.

---

## 17. No automatic cleanup promotion

Forbidden in v1:

```text
file age > N days → cleanup eligible
branch old → delete
DEFER count high → FIX
WATCH old → rewrite
non-authoritative → safe to remove
unused by text grep → unused operationally
closed release → delete all release artifacts
newer v2.1 path exists → old fallback removable
```

Every cleanup posture must cite an explicit current authority/evidence basis.

---

## 18. Later v1 application discipline

Later application should be one bounded document-only transaction.

Preferred artifact:

```text
docs/SIMCORE_RELEASE_SYSTEM_RESIDUAL_CLEANUP_REGISTRY.md
```

Initial materialization should seed only residuals whose current source authority and exact identity can be established without guessing.

Do not backfill every historical release-system artifact merely to make the registry look comprehensive.

A physical cleanup remains a **separate work item** with its own mutation class and verification:
- branch/ref cleanup may need protected repository work;
- workflow/tooling retirement may require permanent SimCore CI;
- governance hardening may require protected admin/CI work;
- external platform actions remain outside ordinary doc-only application.

Do not mix physical cleanup with runtime/product feature changes.

---

## 19. Later verification

Minimum document-only application verification:

```text
all residual IDs trace to source authority
all exact paths/refs/status keys resolve or are explicitly EXTERNAL/UNRESOLVED
source disposition copied without promotion
operational role and cleanup posture kept separate
no current WATCH rewritten without new evidence
no PENDING proof/gate obligation misclassified as cleanup residue
historical release evidence preserved
no branch/workflow/tool/CI mutation
no runtime/plugin/release-simcore change
```

No live-chat validation is required solely for materializing the registry.

---

## 20. Freeze verdict

```text
SYS-37 RELEASE-SYSTEM RESIDUAL CLEANUP REGISTRY
= DESIGN FROZEN
= SMALL / I3 / D2
= NON_RUNTIME
= NR_DOC_ONLY
= CURATED RELEASE-RESIDUAL / CLEANUP-ELIGIBILITY MEMORY
= SOURCE DISPOSITION PRESERVED
= OPERATIONAL ROLE != CLEANUP POSTURE
= NO AUTO DELETE / RETIRE / FIX
= NO BRANCH / WORKFLOW / CI / RELEASE MUTATION
= NO RUNTIME CHANGE
= OPEN DESIGN QUESTIONS 0
```

Application remains a later transaction under normal selection/gate policy.