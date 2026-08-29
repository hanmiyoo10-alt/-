# SimCore 2.0M Major - Contracts v2

> Current production authority: `v0.68.0 - Community Parent-Local Alias Classification Repair`
>
> Production release: `release-simcore@6b31a5265f67daf5a90222d6c08bb85f3abde538`
>
> Production runtime blob: `5094755266444de311ec9cc8ffc7a4dd658e65b1`
>
> Validation: **LIVE_PASS**
>
> Durable checkpoint: **M2-5**
>
> Current architecture state: **Post-M2-5 review complete. v0.69.0 M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion is design-frozen; implementation requires separate authorization after this architecture-authority projection converges.**

This document is the living human-readable authority for the SimCore Contracts v2 architecture. Historical M0/M1/M2 evidence remains in the release/design evidence documents and is not rewritten to pretend retired seams never existed.

Machine-readable authority:

`config/simcore-architecture-v2.json`

Permanent drift guard:

`python3 scripts/simcore-architecture-check.py`

Runtime source authority remains exact `release-simcore`. `main/plugins/simcore/*` is not production runtime authority.

---

## 1. Core architectural decision

The 2.0M Major remains a staged mechanical ownership refactor, not a whole-system rewrite.

```text
preserve proven behavior
+
move only responsibility with direct ownership evidence
+
prove equivalence before deleting transition seams
+
freeze again after each justified checkpoint
```

Completed structural checkpoints:

```text
M2-1  v0.63.56  Recovery split behind compatibility facade
M2-2  v0.64.0   Representation ownership extraction
M2-3  v0.65.0   Edit Reconcile extraction + runtime identity convergence
M2-4  v0.66.0   Session / Runtime Mirror boundary completion
M2-5  v0.67.0   Recovery compatibility facade retirement
```

Post-M2-5 runtime mini:

```text
v0.68.0  Community Parent-Local Alias Classification Repair
checkpoint remains M2-5
LIVE_PASS
```

Fresh roadmap reconciliation selected exactly one additional currently justified structural checkpoint:

```text
M2-6  v0.69.0  State Reconcile Ownership Extraction + Kernel Dependency Inversion
```

M2-7 is not preauthorized.

---

## 2. Layer contract

```text
Foundation
  contracts / store / kernel
        ↓
Domain
  community / recurrence / lineage / handoff / evidence
  time / frame / lifecycle / reaction
        ↓
Validation
  structure
        ↓
Representation
  representation
        ↓
Application
  prompt / session / edit-reconcile
  output-compat / bootstrap-migration / output-finalize
        ↓
Observability
  ops
        ↓
Runtime
  runtime-host / runtime-session / runtime-mirror / runtime-hooks
  runtime-cache / runtime-topology / runtime-cache-candidates
  runtime-telemetry / runtime-probe / runtime-contracts
```

Dependency rules:

1. Foundation depends only on Foundation except explicitly recorded transition exceptions.
2. Domain depends only on Foundation/Domain.
3. Validation remains judge-only.
4. Representation remains memory-only identity/provenance authority.
5. Application may compose lower layers and Application services, but may not call Runtime directly.
6. Runtime may consume lower layers through explicit adapters; Core must never depend upward on Runtime.
7. Store owns persistence mechanics, not semantic decisions.
8. Observability renders bounded facts and does not mutate business state to simplify diagnostics.
9. No circular imports.
10. Raw Fresh/response bodies are not retained for provenance convenience.

Known Kernel transition exceptions may shrink and must disappear when their exact source edges disappear. They may not expand silently.

---

## 3. Current v0.68 physical ownership truth

Current production physically contains the stable owners below:

```text
foundation
  contracts
  store
  kernel

domain
  community
  recurrence
  lineage
  handoff
  evidence
  time
  frame
  lifecycle
  reaction

validation
  structure

representation
  representation

application
  prompt
  session
  edit-reconcile
  output-compat
  bootstrap-migration
  output-finalize

observability
  ops

runtime
  runtime-contracts
  runtime-host
  runtime-cache
  runtime-topology
  runtime-cache-candidates
  runtime-telemetry
  runtime-session
  runtime-mirror
  runtime-hooks
  runtime-probe
```

Recovery is historical only and is physically absent from v0.67 and later production.

The previously discussed generic foundation `state` module remains **DEFERRED**. It must not be silently repurposed as the selected M2-6 owner.

---

## 4. Remaining Kernel transition debt

Exact v0.68 production still contains four direct upward Kernel dependencies:

```js
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');
```

Those dependencies are used by portable-state initial assembly/reconciliation, not by broad Kernel domain policy.

Current contract therefore records exactly these transition exceptions:

```text
kernel -> community
kernel -> recurrence
kernel -> lineage
kernel -> handoff
```

No fifth exception is permitted.

The frozen v0.69 M2-6 design removes all four by introducing one application-level `state-reconcile` composition owner. Until v0.69 implementation is separately authorized and proven, the four exceptions remain truthful current-production declarations.

---

## 5. Recovery retirement contract

Recovery transition history:

```text
v0.66 production
  physical module PRESENT
  own policy/state/I/O NONE
  runtime callers ZERO
  forwarding compatibility facade only

v0.67+
  physical module ABSENT
  runtime require('./recovery') = 0
  replacement barrel = NONE
```

Recovery retirement is complete and LIVE_PASS-proven. Historical documents may still mention the facade because they are point-in-time evidence.

The machine contract marks Recovery as `retired`; it is not a current required module and must not reappear without a new design.

---

## 6. Representation and Edit Reconcile invariants

Representation owns exact fingerprint identity, CANONICAL/HOST_RAW/FRESH_CHAT relations, bounded provenance and accepted canonical-equivalence facts.

Canonical invariant:

> **Fresh is identity evidence, not a body source.**

Edit Reconcile remains the single application service for previous-assistant reconciliation and preserves:

```text
SAME_FAST
SAME_HOST_FAST
REPRESENTATION_DRIFT_CORRELATED
REPRESENTATION_FAST_RECONCILED
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
```

Positive controls remain:

```text
Prior EXACT + genuine visible edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

and:

```text
Prior OUTPUT_MISMATCH + current exact prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ no false manual-edit rebuild
```

---

## 7. State / Session / Runtime Mirror boundary

Session remains the narrowed per-chat application state holder/orchestrator plus bounded request/output/persistence sequencing.

Runtime Mirror owns host observation, exact base/opaque-candidate facts, identity/location/staleness guards and mirror transport. Output Compat interprets compatibility meaning. Representation records accepted canonical-equivalence provenance.

Current v0.68 Kernel still owns portable-state assembly/reconciliation composition. This is the one source-proven seam selected for M2-6.

Frozen v0.69 target:

```text
kernel
  foundation primitives/constants only
  zero domain upward requires
  zero transition exceptions

state-reconcile
  application physical owner
  portable-state initial assembly
  cross-domain reconciliation composition
  allowed direct dependencies:
    kernel / community / recurrence / lineage / handoff

session
  consumes state-reconcile instead of kernel.initialState/reconcileState
  otherwise behaviorally unchanged
```

No broad Session receipt/state rewrite is authorized by that target.

---

## 8. Persistent-state compatibility freeze

The v0.69 ownership move is behavior-preserving. Therefore the following remain frozen unless new evidence forces redesign:

```text
persisted field names and meanings
SnapshotStore key shape
mirror portable-state shape
STATE_VERSION
CORE_STATE_VERSION
Community classifier version = 3
narrative clock / repair versions
recurrence version
lineage version
handoff version
```

A schema/version bump discovered during the M2-6 implementation preflight is a stop condition, not a convenience edit.

---

## 9. Frozen semantic safety invariants

Frozen unless separately promoted:

```text
Broadcast lifecycle / Broadcast End Authority
Frame / Time / Continuity
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Reaction semantics
Structure judge-only acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
History stabilization = OBSERVE_ONLY
Host Prefix Attribution
provider cache = UNVERIFIED
persistent Core schema
network/timer/provider-routing policy
Deferred Mirror strict identity/location/staleness gates
Fresh/raw-body non-retention
Community v3 parent/local alias classification semantics
```

WATCH/DEFER items remain separate from M2-6 unless direct evidence proves causality.

---

## 10. Current M2 checkpoint ledger

```text
M2-1 v0.63.56  completed
M2-2 v0.64.0   completed
M2-3 v0.65.0   LIVE_PASS
M2-4 v0.66.0   LIVE_PASS
M2-5 v0.67.0   LIVE_PASS
v0.68.0        LIVE_PASS / checkpoint M2-5 unchanged
M2-6 v0.69.0   DESIGN FROZEN / IMPLEMENTATION NOT YET AUTHORIZED
```

Post-M2-5 roadmap authority:

`docs/SIMCORE_POST_M2_5_ROADMAP_RECONCILIATION_2026-08-30.md`

Frozen v0.69 design authority:

`docs/SIMCORE_06900_M2_6_STATE_RECONCILE_OWNERSHIP_EXTRACTION_KERNEL_DEPENDENCY_INVERSION_DESIGN_2026-08-30.md`

If the exact filename differs, the commit titled `docs(simcore): freeze v0.69 M2-6 state reconcile design` remains the design authority until the document index is normalized.

---

## 11. CI architecture drift guard

Machine-readable contract:

`config/simcore-architecture-v2.json`

Checker:

`python3 scripts/simcore-architecture-check.py`

The checker enforces:

```text
all current physical modules declared
all required modules present
no deferred module appears before promotion
no undeclared direct require edge
layer-direction rules
stale transition exceptions removed
Core -> Runtime direct dependency forbidden
no duplicate module definitions
latest/install graph parity
```

For exact v0.68 production, the checker must accept the four declared Kernel transition exceptions and Recovery absence.

For the future v0.69 candidate, the candidate architecture contract must promote physical `state-reconcile`, remove the four Kernel exceptions, and prove a cycle-free application-layer dependency graph.

---

## 12. Deferred / WATCH separation

Still outside the selected M2-6 runtime scope:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
broad COMMUNITY diversity recurrence
genuine-edit latency WATCH
B_START wording/closure heuristic WATCH
THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE
PRE_SIMCORE / cache-history frontier
provider-cache engineering or claims
runtime-topology fingerprint dedupe
request-pipeline / turn-pipeline extraction
generic foundation state module
```

No item above may be folded into v0.69 merely because implementation touches adjacent source.

---

## 13. Current advancement boundary

```text
DONE  v0.68 production LIVE_PASS
DONE  R2.8 first genuine terminal convergence proof
DONE  post-M2-5 roadmap reconciliation
DONE  v0.69 M2-6 design freeze
DONE  post-v0.68 Contracts v2 human/machine authority projection
NEXT  separate v0.69 implementation authorization
THEN  dedicated runtime work branch from exact v0.68 production
THEN  state-reconcile extraction + Kernel inversion only
THEN  static/differential/permanent CI
THEN  normal exact candidate + permanent release transaction
THEN  release-simcore publication
THEN  real long-chat Stage A/B/C
THEN  human LIVE_PASS + R2.8 terminal convergence
THEN  post-M2-6 architecture freeze review
```

No automatic M2-7 follows a successful v0.69 release.
