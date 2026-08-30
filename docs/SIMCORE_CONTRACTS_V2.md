# SimCore 2.0M Major - Contracts v2

> Current production authority: `v0.69.1 - Refreshless Targeted Update Liveness Repair`
>
> Production release: `release-simcore@5dc5ec1099c6097a6a0e46effeb826889a4741c3`
>
> Production runtime blob: `de764f2c98174aa7f8ae8dc356d83aa6851b3745`
>
> Validation: **LIVE_PASS**
>
> Durable checkpoint: **M2-6**
>
> Current architecture state: **M2 architecture frozen at M2-6. No M2-7 is authorized. Future runtime work returns to source-proven quality/performance maintenance unless a separate roadmap reconciliation proves new structural debt.**

This document is the living human-readable authority for the SimCore Contracts v2 architecture. Historical M0/M1/M2 evidence remains in its point-in-time documents and is not rewritten.

Machine-readable authority:

`config/simcore-architecture-v2.json`

Permanent drift guard:

`python3 scripts/simcore-architecture-check.py`

Runtime source authority remains exact `release-simcore`. `main/plugins/simcore/*` is not production runtime authority.

---

## 1. Core architectural decision

The 2.0M Major completed as a staged mechanical ownership refactor rather than a whole-system rewrite.

```text
preserve proven behavior
+
move responsibility only with direct ownership evidence
+
prove equivalence before deleting transition seams
+
freeze after each justified checkpoint
```

Completed structural checkpoints:

```text
M2-1  v0.63.56  Recovery split behind compatibility facade
M2-2  v0.64.0   Representation ownership extraction
M2-3  v0.65.0   Edit Reconcile extraction + runtime identity convergence
M2-4  v0.66.0   Session / Runtime Mirror boundary completion
M2-5  v0.67.0   Recovery compatibility facade retirement
M2-6  v0.69.0   State Reconcile ownership extraction + Kernel dependency inversion
```

Post-M2 quality/maintenance releases do not advance the M2 checkpoint automatically.

```text
v0.68.0  Community Parent-Local Alias Classification Repair
v0.69.1  Refreshless Targeted Update Liveness Repair
```

M2-7 is **not preauthorized**.

---

## 2. Frozen layer contract

```text
Foundation
  contracts / store / kernel
        ↓
Domain
  community / recurrence / lineage / handoff / state-reconcile
  evidence / time / frame / lifecycle / reaction
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

1. Foundation depends only on Foundation.
2. Domain depends only on Foundation/Domain.
3. Validation remains judge-only.
4. Representation remains memory-only identity/provenance authority.
5. Application may compose lower layers and Application services, but may not call Runtime directly.
6. Runtime may consume lower layers through explicit adapters; Core must never depend upward on Runtime.
7. Store owns persistence mechanics, not semantic decisions.
8. Observability renders bounded facts and does not mutate business state to simplify diagnostics.
9. No circular imports.
10. Raw Fresh/response bodies are not retained for provenance convenience.
11. Kernel transition exceptions are now zero. New upward Foundation exceptions require a new architecture decision, not an inline waiver.

---

## 3. Terminal M2-6 physical ownership truth

Current production physically contains:

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
  state-reconcile
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

The generic foundation `state` module remains **DEFERRED** and must not be introduced merely because M2 is complete.

---

## 4. Kernel / State Reconcile freeze

M2-6 retired the last source-proven Kernel transition debt.

Kernel now owns shared state-version constants and cross-cutting primitives only. It has:

```text
kernel -> community   0
kernel -> recurrence  0
kernel -> lineage     0
kernel -> handoff     0
transition exceptions 0
```

`state-reconcile` is the physical **Domain integration owner** for:

```text
portable-state initial assembly
cross-domain portable-state normalization composition
legacy field cleanup already owned by the former reconcileState path
```

Allowed direct dependencies:

```text
kernel
community
recurrence
lineage
handoff
```

It does not absorb the semantic policy of those domain owners.

The original v0.69 design proposed `state-reconcile` at Application layer. Exact preflight discovered that `Lifecycle.prepareTurn()` is a direct reconciliation consumer while Lifecycle remains Domain. The repository stopped before runtime mutation and converged only this layer field:

```text
state-reconcile: application -> domain
```

Authority:

`docs/SIMCORE_06900_LIFECYCLE_STATE_RECONCILE_LAYER_CONTRADICTION_DESIGN_CONVERGENCE_2026-08-30.md`

This corrected Domain classification is the frozen terminal M2-6 contract.

---

## 5. State / Session / Runtime Mirror boundary

Session remains the narrowed per-chat application state holder/orchestrator plus bounded request/output/persistence sequencing.

State Reconcile owns portable-state construction/reconciliation composition.

Runtime Mirror owns host observation, exact base/opaque-candidate facts, identity/location/staleness guards and mirror transport. Output Compat interprets compatibility meaning. Representation records accepted canonical-equivalence provenance.

No compatibility facade remains in Kernel for `initialState()` or `reconcileState()`.

Frozen consumer shape includes:

```text
lifecycle
prompt
bootstrap-migration
edit-reconcile
output-finalize
session
```

consuming `state-reconcile` directly where reconciliation is required.

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

## 7. Persistent-state compatibility freeze

M2-6 was behavior-preserving. The terminal architecture therefore keeps these frozen unless new evidence forces redesign:

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

Ownership movement alone is never authority for a schema/version bump.

---

## 8. Frozen semantic safety invariants

Frozen unless separately promoted through source/live evidence:

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
OUTPUT_COMMIT as Host-local telemetry durability authority
```

---

## 9. Terminal M2 checkpoint ledger

```text
M2-1 v0.63.56  completed
M2-2 v0.64.0   completed
M2-3 v0.65.0   LIVE_PASS
M2-4 v0.66.0   LIVE_PASS
M2-5 v0.67.0   LIVE_PASS
v0.68.0        LIVE_PASS / checkpoint M2-5 unchanged
M2-6 v0.69.0   structural live matrix PASS
v0.69.1        LIVE_PASS / durable checkpoint M2-6 terminally accepted
```

Terminal authority:

- `docs/SIMCORE_06900_M2_6_IMPLEMENTATION_EVIDENCE_2026-08-30.md`
- `docs/SIMCORE_06900_M2_6_REAL_LONG_CHAT_EVIDENCE_2026-08-30.md`
- `docs/SIMCORE_LIVE_06901_RELEASE_CLOSE_2026-08-30.md`
- `docs/SIMCORE_POST_M2_6_ARCHITECTURE_FREEZE_OBSERVATION_REVIEW_2026-08-30.md`

---

## 10. CI architecture drift guard

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

For current v0.69.1 production the checker must accept physical `state-reconcile`, zero Kernel transition exceptions, corrected Domain classification, and Recovery absence.

---

## 11. Post-M2 WATCH / DEFER separation

No item below is automatically promoted merely because M2 closed:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
  highest-priority investigation, symptom recurrent, root cause unproven

genuine-edit latency WATCH
  40.224 s historical outlier; comparable multi-tens recurrence still required

LONG_CHAT_STORAGE / COLD_INIT
  recurrent performance observation; bounded SimCore-owned redundant-work source not yet proven

B_START wording/closure heuristic WATCH
THOUGHTS_UNRESOLVED_KNOWLEDGE_QUARANTINE WATCH
PRE_SIMCORE / cache-history / host-prefix frontier WATCH/DEFER
provider cache UNVERIFIED
runtime-topology fingerprint dedupe DEFER / low-risk slimming
request-pipeline / turn-pipeline extraction DEFER
generic foundation state module DEFER
broader generated COMMUNITY platform-family diversity DEFER / observe
```

No provider-cache tuning or Structure relaxation is authorized by these observations.

---

## 12. Post-M2 advancement boundary

```text
DONE  v0.69.1 production LIVE_PASS
DONE  durable checkpoint M2-6
DONE  post-M2-6 architecture freeze review
DONE  M2 architecture freeze decision

CURRENT ADMIN TASK
  converge living Contracts v2 machine/human authority to terminal v0.69.1 / M2-6 truth

AFTER CONVERGENCE
  investigate PARTIAL_PREVIOUS_TURN_REPLAY attribution
  and performance lanes separately

NEXT RUNTIME VERSION
  not selected until one lane has a source-proven owner + bounded repair contract
```

`v0.70.x` is reserved as the next non-M quality/performance version family, but no scope is frozen and implementation is not authorized.

M2-7 requires a separate roadmap reconciliation with new source/live evidence.
