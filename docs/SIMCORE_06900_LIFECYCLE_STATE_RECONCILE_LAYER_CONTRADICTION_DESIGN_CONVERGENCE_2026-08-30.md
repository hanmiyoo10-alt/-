# SimCore v0.69.0 Lifecycle / State-Reconcile Layer Contradiction Design Convergence

Date: 2026-08-30 KST

Status: **BLOCKER RESOLVED · DESIGN CONVERGED · IMPLEMENTATION MAY RESUME ON FRESH RUNTIME BRANCH**

Classification: **BLOCKER → FIX · PRE-RUNTIME ARCHITECTURE CONTRADICTION**

## Trigger

The first implementation preflight was executed against exact v0.68 production before any runtime mutation.

It confirmed the intended Kernel seam, but also found one direct consumer omitted by the original layer reasoning:

```text
Lifecycle.prepareTurn()
  -> kernel.reconcileState(kernel.clone(baseState))
```

The frozen design classified new `state-reconcile` as `application` and also required direct consumers to leave Kernel state reconciliation.

Current Contracts v2 classifies Lifecycle as `domain`, and the layer policy forbids:

```text
domain -> application
```

Therefore a literal implementation of the original layer assignment would create a forbidden edge:

```text
lifecycle(domain) -> state-reconcile(application)
```

The first runtime work branch stopped before plugin mutation. The observed contradiction is:

```text
V06900_LIFECYCLE_STATE_RECONCILE_LAYER_CONTRADICTION = BLOCKER
```

## Rejected resolutions

### Keep Kernel as a compatibility facade

Rejected. It would preserve the exact transition debt the release exists to remove.

### Move Lifecycle reconciliation to Session only

Rejected for the clean path. `Lifecycle.prepareTurn` is an existing exported seam and currently owns its own input reconciliation. Making it depend on callers supplying pre-normalized state would change seam semantics and expand orchestration assumptions.

### Reclassify Lifecycle as application

Rejected. This is broader architecture movement than the frozen release requires and would change the established request-domain ownership contract.

### Copy reconciliation into Lifecycle

Rejected. It would duplicate portable-state ownership and domain normalizers.

## Selected narrow convergence

Change exactly one architectural classification in the v0.69 target:

```text
state-reconcile.layer
APPLICATION -> DOMAIN
```

Everything else about the owner remains frozen.

`state-reconcile` is a narrow domain integration owner for portable-state normalization composition. It may depend on:

```text
kernel       foundation
community    domain
recurrence   domain
lineage      domain
handoff      domain
```

This is legal under the existing Contracts v2 Domain dependency policy:

```text
domain -> foundation/domain
```

Consumers then remain legal:

```text
lifecycle(domain)       -> state-reconcile(domain)
prompt(application)     -> state-reconcile(domain)
bootstrap-migration(app)-> state-reconcile(domain)
edit-reconcile(app)     -> state-reconcile(domain)
output-finalize(app)    -> state-reconcile(domain)
session(application)    -> state-reconcile(domain)
```

No cycle is introduced because `state-reconcile` does not depend on Lifecycle, Prompt, Session, or any application owner.

## Ownership semantics remain unchanged

The layer correction does **not** turn State Reconcile into a new semantic domain policy owner.

It still owns only:

```text
portable-state initial assembly
cross-domain portable-state normalization composition
legacy field cleanup already present in current reconcileState
```

Community, Recurrence, Lineage, and Handoff retain their own normalizer semantics.

Kernel retains only foundation constants/shared primitives.

## Frozen implementation after convergence

```text
exact v0.68 source
-> version 0.69.0
-> add physical domain module state-reconcile
-> move initialState/reconcileState mechanically
-> Kernel domain requires 4 -> 0
-> Kernel transition exceptions 4 -> 0
-> all six direct state-reconcile consumer owners switch away from kernel.initialState/reconcileState
-> STATE_VERSION / CORE_STATE_VERSION unchanged
-> persistent state/schema unchanged
-> no unrelated behavior change
```

The proven consumer set is:

```text
lifecycle
bootstrap-migration
prompt
edit-reconcile
output-finalize
session
```

## Authorization convergence

This document supersedes the original v0.69 design and implementation authorization **only for the `state-reconcile` layer field**.

All other frozen design boundaries and stop conditions remain authoritative.

Canonical target after this convergence:

```text
state-reconcile = physical required domain owner
allowed dependencies = kernel, community, recurrence, lineage, handoff
```

## Process disposition

The first runtime branch is evidence-only and must not be reused as the implementation branch because its preflight discovered a frozen-design blocker.

After this convergence lands on main:

```text
create fresh runtime branch
repeat exact-parent preflight
implement only converged target
run static/differential/architecture CI
```

Runtime mutation in the blocker-discovery transaction: **NONE**.

Release-simcore mutation: **NONE**.
