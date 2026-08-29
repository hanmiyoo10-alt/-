# SimCore 2.0M Major — Contracts v2

> Current production authority: `v0.66.0 — M2-4 Session / Runtime Mirror Boundary Completion`
>
> Production release: `release-simcore@4b6ae1a4c63f6be658c6163168cc46a1adef60aa`
>
> Production runtime blob: `f0da13d4c47fd98e9065d7dbf253a3296151ee16`
>
> Validation: **LIVE_PASS**
>
> Durable checkpoint: **M2-4**
>
> Current architecture state: **M2-5 transition-debt review; no v0.67 runtime implementation authorized by this document alone.**

This document is the living human-readable authority for the SimCore Contracts v2 architecture. Historical M0/M1 intent remains preserved in `docs/SIMCORE_2M_ARCHITECTURE_AUDIT.md` and the versioned M2 activation/evidence documents. Where those historical planning documents use future-tense wording for M2-2, M2-3, or M2-4, the current production state recorded here is authoritative.

Machine-readable authority:

`config/simcore-architecture-v2.json`

Permanent drift guard:

`python3 scripts/simcore-architecture-check.py`

The CI workflow materializes `release-simcore/plugins/simcore/latest.js` and `install.js` and checks this contract against actual production source. The old `main/plugins/simcore` source mirror is not production authority.

---

## 1. Core architectural decision

The 2.0M Major is a staged mechanical ownership refactor, not a whole-system rewrite.

The stable rule remains:

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

Current review:

```text
M2-5+
transition-debt retirement only after exact-production zero-consumer/equivalence proof
```

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
  recovery compatibility facade (deprecated, zero runtime callers in v0.66)
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
3. Validation may compose Foundation/Domain/Validation but remains judge-only.
4. Representation depends only on Foundation/Representation and remains memory-only.
5. Application may compose lower layers and Application services, but may not call Runtime directly.
6. Runtime may consume lower layers through explicit interfaces/adapters; Core must never depend upward on Runtime.
7. Store owns persistence mechanics, not semantic decisions.
8. Observability renders bounded structured facts; it does not mutate business state to simplify diagnostics.
9. No circular imports.
10. Raw Fresh/response bodies are not retained merely for representation/provenance convenience.

Known Foundation transition debt remains limited to the exact current Kernel edges declared in the machine contract. Exceptions may shrink when source edges disappear and may not expand silently.

---

## 3. Stable owners to preserve

These remain coherent current owners and are not M2-5 rewrite targets:

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
```

`lifecycle` remains the current request-domain preparation coordinator plus Broadcast lifecycle owner. A speculative Turn Pipeline is not authorized merely for aesthetic modularity.

---

## 4. Representation contract — current since M2-2, narrowed through M2-4

Representation owns:

```text
exact fingerprint identity
CANONICAL / HOST_RAW / FRESH_CHAT relation taxonomy
bounded provenance ledger/metadata
exact carryover classification
accepted canonical-equivalence identity facts
```

Representation does not own:

```text
raw response-body persistence
semantic envelope parsing or prose repair
chat writes
persistent Core state
history mutation
provider cache
network
timers
```

Canonical invariant:

> **Fresh is identity evidence, not a body source.**

M2-4 removed Output Compat policy-label interpretation from Representation's identity authority. Output Compat owns compatibility meaning; Representation owns the resulting identity relation/provenance.

---

## 5. Edit Reconcile contract — current since M2-3

`edit-reconcile` is the single application service for previous-assistant reconciliation.

It owns the current decision tree for:

```text
SAME_FAST
SAME_HOST_FAST
snapshot exact carryover
representation exact carryover
USER_EDIT_CANDIDATE
REPRESENTATION_DRIFT_CORRELATED
AMBIGUOUS_CHANGE
manual rebuild fallback coordination
bounded reconcile receipts
```

It does not own:

```text
representation taxonomy/provenance storage
host Fresh reads
Deferred Mirror transport
provider cache claims
diagnostic rendering
```

Frozen positive controls:

```text
Prior EXACT
current != canonical
current != Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

and:

```text
Prior OUTPUT_MISMATCH
current == prior Fresh EXACT
same trusted slot/location/canonical identity
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

M2-4 migrated Edit Reconcile's surviving physical-owner dependencies directly to `output-compat`, `bootstrap-migration`, and `output-finalize`. It does not require Recovery at runtime.

---

## 6. Output Compat / Bootstrap Migration / Recovery transition state

### Output Compat

Current physical owner since M2-1, expanded mechanically in M2-4.

Owns:

```text
preamble compatibility classification
response-envelope compatibility/canonicalization
bounded Fresh candidate-plan construction
compatibility candidate meaning/interpretation
safe structural-boundary compatibility metadata
```

Does not own host Fresh reads, history bootstrap, manual-edit attribution, or persistent raw bodies.

### Bootstrap Migration

Current physical owner since M2-1.

Owns:

```text
history bootstrap
legacy clock/age repair
legacy contamination repair
cold/migration coordination
```

It does not own ordinary output compatibility or manual-edit attribution.

### Recovery compatibility facade

Current v0.66 production truth:

```text
physical module: PRESENT
own policy: NONE
own state: NONE
own I/O: NONE
runtime callers: ZERO
implementation: forwarding compatibility facade over output-compat + bootstrap-migration
status: DEPRECATED TRANSITION SHIM
```

M2-4 deliberately retained this facade after migrating runtime consumers to physical owners. Physical deletion is therefore a valid M2-5 candidate, but deletion is **not** authorized merely because this document says it is deprecated.

Required deletion gate:

```text
exact current production re-audit
+ zero runtime require('./recovery')
+ zero runtime recovery.* consumer
+ no intentional dynamic/public consumer
+ no permanent test/tool requiring Recovery as the target seam
+ architecture/dependency legality
+ differential compatibility/bootstrap equivalence
→ separate M2-5 runtime implementation may be authorized
```

If a real consumer is found, fail closed and re-design instead of deleting the facade for cleanliness.

---

## 7. Output Finalize contract — current since M2-4

`output-finalize` is a physical application owner in v0.66 production.

It owns deterministic prepared-output to committed-state/content transition composition, including the existing ordering of Frame/Time/Reaction/Structure-derived commit decisions and bounded finalization receipts.

It does not own:

```text
Store I/O
host I/O
Session identity
Output Compat candidate policy
manual edit attribution
diagnostic rendering
```

M2-4 extraction was mechanical. Future releases must not use the extraction as permission to reorder finalization semantics without a separately promoted defect/design.

---

## 8. Session contract — current post-M2-4

Session remains a real stateful application orchestrator, not a pass-through shell.

Current ownership:

```text
per-chat application identity/current state
trusted output identity anchors
bounded init/bootstrap lifecycle identity
request/output/persistence sequencing
physical-owner delegation
```

No longer physically owns:

```text
Edit Reconcile decision tree
Output Finalize transaction
Store deferred-prune running/dedupe mechanics
Recovery-facade runtime routing
```

Session may still coordinate when lower-owner operations run. Coordination is not ownership of their policy.

---

## 9. Runtime Mirror contract — current post-M2-4

Runtime Mirror owns runtime facts and transport:

```text
one bounded Fresh host observation
Fresh exact fingerprint comparison
exact base/opaque-candidate observation facts
runtime epoch/currentness
location identity
schedule sequence / expected output slot
strict stale/superseded/session guards
safe mirror write
bounded runtime timing/status
```

Runtime Mirror does not own:

```text
raw Fresh retention
compatibility candidate meaning
Representation taxonomy/provenance
persistent Core state policy
```

M2-4 transaction:

```text
Output Compat builds candidate observation plan
→ Runtime Mirror reads Fresh at most once and returns exact-match facts
→ Output Compat interprets compatibility meaning
→ Runtime Mirror rechecks identity/location/sequence guards
→ safe transport if still current
→ Representation records accepted canonical-equivalence provenance
```

Ambiguous candidate matches and interpreter failures remain fail-closed.

---

## 10. Structure and semantic safety invariants

Structure remains a judge, not a repair engine.

Frozen through M2 mechanical work unless separately promoted:

```text
Broadcast lifecycle / Broadcast End Authority
Frame semantics
Continuity semantics
Evidence
Lineage
Handoff
Recurrence
Reaction semantics
Structure acceptance / COMMUNITY quarantine
TAIL_AFTER_CURRENT_USER
History stabilization = OBSERVE_ONLY
Host Prefix Attribution
cache trajectory observation policy
provider cache = UNVERIFIED
persistent Core schema
network/timer/provider-routing policy
Deferred Mirror strict identity/location/staleness gates
Fresh/raw-body non-retention
```

A WATCH, DEFER or quality investigation does not automatically modify these contracts.

---

## 11. Current M2 checkpoint ledger

### M2-1 — v0.63.56

```text
Recovery split into output-compat + bootstrap-migration
compatibility facade retained
```

### M2-2 — v0.64.0

```text
Representation physical ownership extracted
Fresh identity/provenance authority separated from Runtime Mirror
```

### M2-3 — v0.65.0

```text
Edit Reconcile physically extracted
runtime identity converged
real long-chat LIVE_PASS
```

### M2-4 — v0.66.0

```text
Output Finalize physically extracted
Store retention-housekeeping mechanics moved to Store
runtime Recovery callers migrated to physical owners
Runtime Mirror observation separated from Output Compat interpretation
Representation accepted-canonical-equivalence relation decoupled from compatibility labels
real long-chat LIVE_PASS
```

### M2-5+ — current review lane

Allowed only as separately evidenced debt retirement.

First selected design candidate:

```text
v0.67.0
Recovery Transition Debt Retirement
```

This remains implementation-blocked until the post-v0.66 contract convergence and exact-production audit are durably closed.

---

## 12. CI architecture drift guard

Machine-readable contract:

`config/simcore-architecture-v2.json`

Checker:

`python3 scripts/simcore-architecture-check.py`

Workflow:

`.github/workflows/simcore-architecture-contracts.yml`

The permanent workflow checks the architecture contract against **materialized `release-simcore` production latest/install**, not the historical `main/plugins/simcore` mirror.

The checker enforces:

```text
all physical production modules declared
all required modules present
no deferred module appears before promotion
no undeclared direct require edge
layer-direction rules
transition exceptions cannot expand silently
stale transition exceptions must be removed when their source edge disappears
Core → Runtime direct dependency forbidden
no duplicate module definitions
no dependency cycles
latest/install production graph parity
```

The checker is a drift guard, not permission to widen architecture. Passing it means the declared dependency contract matches the inspected source under those rules; it does not prove runtime/live correctness by itself.

---

## 13. Relationship to deferred/WATCH work

The post-v0.66 review preserves separate lanes for:

```text
PARTIAL_PREVIOUS_TURN_REPLAY recurrence
COMMUNITY platform-family diversity recurrence
genuine-edit multi-tens-of-seconds latency WATCH
B_START closure-expression wording WATCH
PRE_SIMCORE cache/history observations
provider-cache investigation
rare compatibility-path natural validation
```

These are not bundled into M2-5 Recovery retirement without a separate owner, cause and repair contract.

Current triage authority:

`docs/SIMCORE_POST_06600_DEFERRED_WATCH_TRIAGE_2026-08-29.md`

---

## 14. Current authorization boundary

This Contracts v2 convergence is non-runtime architecture administration.

It does not mutate `release-simcore` and does not itself implement v0.67.

The next authorization decision is bounded:

```text
post-v0.66 Contracts/config convergence passes permanent architecture CI
+
exact production source re-audit confirms Recovery zero-consumer/deprecated-shim shape
+
no newly discovered blocker requires preserving Recovery
→ v0.67 M2-5 implementation may be authorized on a fresh runtime work branch
```

Implementation, candidate/release publication, real long-chat validation and terminal main synchronization remain separate workflow stages.
