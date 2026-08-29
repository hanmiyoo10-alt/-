# SimCore Post-M2-5 Roadmap Reconciliation

Date: 2026-08-30 KST
Status: **RECONCILED · ONE M2-6 RELEASE WARRANTED · NO AUTOMATIC M2-7**
Classification: **ARCHITECTURE ROADMAP / SOURCE-EVIDENCE REVIEW**

## 1. Purpose

M2-5 was the last previously selected high-risk structural checkpoint. The roadmap explicitly required a fresh post-M2-5 review instead of mechanically inventing another M-series release.

This review asks one question:

> Does exact current production still contain a bounded structural debt whose ownership is source-proven, mechanically extractable, and important enough to justify one more M2 release?

The answer is **yes**, but only for one narrowly evidenced seam: cross-domain portable-state reconciliation currently living inside Kernel.

## 2. Current production authority

```text
Version: 0.68.0
Release: Community Parent-Local Alias Classification Repair
release-simcore: 6b31a5265f67daf5a90222d6c08bb85f3abde538
latest/install blob: 5094755266444de311ec9cc8ffc7a4dd658e65b1
validation: LIVE_PASS
major checkpoint: M2-5
```

Runtime behavior authority remains exact `release-simcore` production plus real long-chat evidence. Main is design/evidence/roadmap authority.

## 3. Administrative prerequisite discovered before M2-6

The current machine/human Contracts v2 projection is stale relative to production: it still describes a v0.66/M2-4 baseline and a pending v0.67 Recovery retirement while production is v0.68 LIVE_PASS / M2-5.

Therefore:

```text
POST_06800_ARCHITECTURE_AUTHORITY_PROJECTION_CONVERGENCE
= REQUIRED BEFORE v0.69 IMPLEMENTATION ACTIVATION
```

This is a non-runtime prerequisite. It must not be mixed into the v0.69 runtime implementation transaction.

## 4. Candidate review

### 4.1 Kernel dependency inversion / transition-exception cleanup

Disposition: **SELECTED**

Exact v0.68 production source shows Kernel directly importing four domain owners:

```js
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');
```

Those upward dependencies are concentrated in portable-state construction/reconciliation rather than scattered across Kernel policy:

```text
initialState()
  -> lineage.normalizeLineage(null)

reconcileState()
  -> recurrence.normalizeRegistry(...)
  -> lineage.normalizeLineage(...)
  -> handoff.normalizeRegistry(...)
  -> community.normalizePlatformMaxMap(...)
```

The current architecture contract already classifies exactly these four edges as Kernel transition exceptions. No new upward dependency has been added.

This is therefore a source-proven ownership seam, not speculative cleanup.

### 4.2 Lifecycle request-side composition cleanup / Request Pipeline

Disposition: **DEFER**

Lifecycle remains an explicit current request-domain coordinator. There is no new live or source evidence showing that extracting a Request Pipeline is necessary for correctness, isolation, or bounded maintenance.

Do not create `request-pipeline` merely because it exists as a roadmap possibility.

### 4.3 Session residual receipt/state shell / generic State module

Disposition: **PARTIALLY ADDRESSED, OTHERWISE DEFER**

The selected M2-6 seam removes cross-domain state reconciliation from Kernel and gives it one narrow application owner. It does **not** authorize a broad Session rewrite, receipt redesign, or a generic foundation-level `state` god-object.

The previously deferred generic `state` module remains deferred.

### 4.4 runtime-topology fingerprint dedupe

Disposition: **DEFER / LOW-RISK SLIMMING LANE**

This remains useful possible slimming, but it is not a high-risk ownership blocker and does not justify extending M2 by itself.

## 5. M2-6 selection

Selected next runtime release:

```text
v0.69.0
M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion
```

Target architecture:

```text
Kernel
= foundation shared primitives only
= zero domain upward requires
= zero transition exceptions

State Reconcile
= application owner
= portable-state initial assembly + reconciliation composition
= calls domain-owned normalizers without absorbing their semantic policy

Session
= state holder/orchestrator
= consumes State Reconcile
= no broad orchestration expansion
```

The purpose is not to change state semantics. It is to move the existing composition to the correct layer and make the dependency graph truthful.

## 6. Why a new physical application owner is preferable

Rejected alternatives:

1. **Copy domain normalization into Kernel**
   - would duplicate semantic ownership and make Kernel more powerful.

2. **Keep Kernel imports but hide them behind aliases**
   - would preserve the inverted dependency under cosmetic indirection.

3. **Move reconciliation into Lifecycle**
   - Lifecycle owns request preparation, not generic persisted-state hydration.

4. **Move all reconciliation directly into Session**
   - would re-inflate the Session owner that M2-3/M2-4 deliberately narrowed.

5. **Create a foundation `state` module that imports domain modules**
   - would reproduce the same forbidden upward dependency under a new name.

A narrow application-level `state-reconcile` owner is the smallest ownership-correct seam.

## 7. Frozen M2-6 boundaries

M2-6 may:

- add one physical application module `state-reconcile`;
- mechanically transfer `initialState()` and `reconcileState()` composition from Kernel;
- keep `STATE_VERSION` / `CORE_STATE_VERSION` and shared pure helpers in Kernel unless implementation proof shows a smaller equivalent constant move is required;
- switch direct reconciliation consumers to `state-reconcile`;
- remove Kernel's `community`, `recurrence`, `lineage`, and `handoff` direct requires;
- retire all four Kernel transition exceptions;
- update module inventory/contracts for the exact ownership move.

M2-6 may not:

- redesign state shape or semantics;
- bump persisted state versions solely because ownership moved;
- create a compatibility facade that preserves the old Kernel dependency;
- redesign Lifecycle, Session receipts, Output Compat, Representation, Edit Reconcile, Output Finalize, Runtime Mirror, or Prompt semantics;
- create generic `state`, `request-pipeline`, or `turn-pipeline` owners;
- alter persistent keys/schema;
- add network, polling, timers, host authority, or provider-cache claims;
- repair unrelated WATCH items;
- modify R2.x release-system topology.

## 8. Separate WATCH / investigation lanes

The following remain outside M2-6:

- `PARTIAL_PREVIOUS_TURN_REPLAY`
- broad COMMUNITY platform-family diversity recurrence
- genuine-edit latency WATCH
- B_START closure-expression warning
- PRE_SIMCORE / cache-history frontier
- provider cache `UNVERIFIED`
- rare compatibility routes requiring natural evidence
- `THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE`

No WATCH may be smuggled into v0.69 merely because implementation touches adjacent source.

## 9. M-series disposition after M2-6

If v0.69 successfully removes the source-proven Kernel transition debt with behavioral equivalence:

```text
M2-6 = final currently justified structural M2 checkpoint
M2-7 = NOT PREAUTHORIZED
next action = architecture freeze + observation/performance/investigation review
```

A future M2-7 requires new source or live evidence and a separate roadmap reconciliation.

## 10. Verdict

```text
POST_M2_5_REVIEW
= COMPLETE

M2_6_WARRANTED
= YES

SELECTED_SCOPE
= STATE_RECONCILE_OWNERSHIP_EXTRACTION_AND_KERNEL_DEPENDENCY_INVERSION

V06900_DESIGN
= AUTHORIZED TO FREEZE

V06900_IMPLEMENTATION
= BLOCKED UNTIL POST_06800_ARCHITECTURE_AUTHORITY_PROJECTION_CONVERGENCE CLOSES

AUTOMATIC_M2_7
= NO
```
