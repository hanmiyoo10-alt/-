# SimCore 2.0M Major - Contracts v2

> Current production authority: `v0.66.0 - M2-4 Session / Runtime Mirror Boundary Completion`
>
> Production release: `release-simcore@4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
>
> Production runtime blob: `f0da13d4c47fd98e9065d7dbf253a3296151ee16`
>
> Validation: **LIVE_PASS**
>
> Durable checkpoint: **M2-4**
>
> Current architecture state: **v0.67.0 M2-5 Recovery retirement implementation materialized on the dedicated work branch; publication and live acceptance pending.**

This document is the living human-readable authority for the SimCore Contracts v2 architecture. Historical M0/M1/M2 evidence remains historical and is not rewritten to pretend retired seams never existed.

Machine-readable authority:

`config/simcore-architecture-v2.json`

Permanent drift guard:

`python3 scripts/simcore-architecture-check.py`

Production runtime authority remains `release-simcore`. The old `main/plugins/simcore` source mirror is not production authority.

---

## 1. Core architectural decision

The 2.0M Major is a staged mechanical ownership refactor, not a whole-system rewrite.

```text
preserve proven domain behavior
+
move only responsibility with direct ownership evidence
+
prove equivalence before deleting transition seams
```

Completed structural checkpoints:

```text
M2-1  v0.63.56  Recovery split behind compatibility facade
M2-2  v0.64.0   Representation ownership extraction
M2-3  v0.65.0   Edit Reconcile extraction + runtime identity convergence
M2-4  v0.66.0   Session / Runtime Mirror boundary completion
```

Current implementation checkpoint:

```text
M2-5  v0.67.0   retire the zero-runtime-caller Recovery compatibility facade only
```

M2-5 does not authorize unrelated Session cleanup, WATCH fixes, domain behavior changes or a replacement barrel module.

---

## 2. Layer contract

```text
Foundation
  contracts / store / kernel transition boundary
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
  recovery compatibility facade: v0.66 production only, retiring at v0.67
        ↓
Observability
  ops
        ↓
Runtime
  runtime-host / runtime-session / runtime-mirror / runtime-hooks
  runtime-cache / runtime-topology / runtime-cache-candidates
  runtime-telemetry / runtime-probe / runtime-contracts
```

Dependency rules remain:

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

Known Kernel transition exceptions may shrink when source edges disappear and may not expand silently.

---

## 3. Stable owners to preserve

M2-5 does not rewrite these owners:

```text
store
community
recurrence
lineage
handoff
evidence
time
frame
reaction
structure
prompt
ops
runtime-contracts
runtime-host
runtime-cache
runtime-topology
runtime-cache-candidates
runtime-telemetry
runtime-session
runtime-hooks
runtime-probe
lifecycle
representation
edit-reconcile
output-compat
bootstrap-migration
output-finalize
runtime-mirror
```

A speculative Turn Pipeline, State extraction or replacement compatibility barrel remains unauthorized.

---

## 4. Representation and Edit Reconcile

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

Frozen positive controls:

```text
Prior EXACT + genuine visible edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

and:

```text
Prior OUTPUT_MISMATCH + current exact prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

Neither module has a runtime Recovery dependency in v0.66 production.

---

## 5. Output Compat / Bootstrap Migration / Output Finalize

### Output Compat

Owns output envelope compatibility/canonicalization, bounded Fresh candidate planning and compatibility interpretation. It does not own the host Fresh read.

### Bootstrap Migration

Owns history bootstrap and legacy migration/repair coordination. It does not own ordinary output compatibility or manual-edit attribution.

### Output Finalize

Owns deterministic prepared-output to committed-state/content transition composition. It does not own Store I/O, host I/O, compatibility candidate policy or manual-edit attribution.

These three physical owners remain present and behavior-equivalent through M2-5.

---

## 6. Recovery transition contract

Exact v0.66 production truth:

```text
physical module: PRESENT
own policy: NONE
own state: NONE
own I/O: NONE
runtime callers: ZERO
implementation: forwarding facade over output-compat + bootstrap-migration
status: DEPRECATED TRANSITION SHIM
```

The separate M2-5 activation closed the deletion prerequisites through exact production/seam re-audit and permanent architecture validation.

Version-bound architecture rule:

```text
source version < 0.67.0
→ Recovery is REQUIRED

source version >= 0.67.0
→ Recovery must be ABSENT
```

This is represented as `physical: retiring` plus `retire_at_version: 0.67.0` in the machine contract and enforced by the architecture checker.

Target v0.67 shape:

```text
Recovery physical module = ABSENT
runtime require('./recovery') = 0
runtime recovery.* consumer = 0
replacement barrel = NONE
```

Historical documents and old release notes may still mention Recovery because they are evidence, not current physical inventory.

---

## 7. Session and Runtime Mirror

Session remains the per-chat application identity/current-state holder plus bounded request/output/persistence coordinator. It already delegates directly to `edit-reconcile`, `output-compat`, `bootstrap-migration` and `output-finalize`; its stale Recovery allowed-dependency declaration is retired in the M2-5 candidate contract.

Runtime Mirror remains the owner of one bounded Fresh observation, exact fingerprint facts, runtime/location/sequence guards and safe mirror transport. Output Compat interprets compatibility meaning. Representation records accepted canonical-equivalence provenance.

M2-5 does not change this transaction.

---

## 8. Frozen semantic safety invariants

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
```

A WATCH or DEFER item does not automatically modify these contracts.

---

## 9. Current M2 checkpoint ledger

```text
M2-1 v0.63.56  completed
M2-2 v0.64.0   completed
M2-3 v0.65.0   LIVE_PASS
M2-4 v0.66.0   LIVE_PASS
M2-5 v0.67.0   IMPLEMENTATION MATERIALIZED / PUBLICATION PENDING
```

M2-5 runtime mutation envelope is deliberately narrow:

```text
0.66.0 → 0.67.0 release identity
+ current release note/operator card
+ current runtime module-contract Recovery row removal
+ exact standalone Recovery module removal
```

All surviving physical module bodies must remain byte-identical except `runtime-telemetry`, whose only authorized change is `HOST_COMPAT_VERSION 0.66.0 → 0.67.0`, and `contracts`, whose only authorized change is removing the Recovery row.

---

## 10. CI architecture drift guard

Machine-readable contract:

`config/simcore-architecture-v2.json`

Checker:

`python3 scripts/simcore-architecture-check.py`

Workflow:

`.github/workflows/simcore-architecture-contracts.yml`

The checker enforces:

```text
all current physical modules declared
all required modules present
retiring modules required before retire_at_version
retiring modules forbidden at/after retire_at_version
no deferred module appears before promotion
no undeclared direct require edge
layer-direction rules
stale transition exceptions removed
Core → Runtime direct dependency forbidden
no duplicate module definitions
latest/install graph parity
```

The production workflow continues to materialize exact current `release-simcore` source. Therefore while production remains v0.66, Recovery must still be physically present for the architecture workflow to pass. The v0.67 candidate lane proves the inverse after materialization.

---

## 11. Version-sensitive permanent regression bridges

M2-5 preserves the behavior of the v0.66 release-sensitive suites but changes release identity and operator guidance.

The permanent registry routes through v0.67 bridges for:

```text
reload-cache-continuity
bounded-telemetry-capsule
host-local-telemetry
operator-release-card
```

The first two normalize only the release envelope and reuse frozen v0.66 behavior. Host-local explicitly proves v0.67 metadata/runtime/HOST identity equality, exact v0.67 capsule acceptance, v0.66 rejection and Recovery physical absence. Operator-card coverage validates the v0.67 M2-5 card and no-side-effect/non-authority constraints.

---

## 12. Deferred/WATCH separation

Still excluded from M2-5 runtime scope:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
COMMUNITY platform-family diversity recurrence
genuine-edit rebuild latency WATCH
B_START closure-expression wording WATCH
PRE_SIMCORE cache/history observations
provider-cache investigation
rare compatibility-path behavior changes
```

Current triage authority:

`docs/SIMCORE_POST_06600_DEFERRED_WATCH_TRIAGE_2026-08-29.md`

---

## 13. Current advancement boundary

```text
DONE  design/evidence and implementation authorization on main
DONE  dedicated v0.67 runtime work branch
DONE  deterministic deletion-only builder materialized in repository
DONE  architecture candidate contract and version-bound retirement guard
DONE  v0.67 release-sensitive regression bridges
NEXT  product PR permanent Architecture Contracts + SimCore Verify + Required
THEN  append-only exact candidate/release transaction
THEN  release-simcore publication
THEN  real long-chat ordinary continuity + same-tab reload/bootstrap validation
THEN  final main durable state synchronization
```

No product release is complete until the published v0.67 artifact and real long-chat evidence close the frozen live gate.
