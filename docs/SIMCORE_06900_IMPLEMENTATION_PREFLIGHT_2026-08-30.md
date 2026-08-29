# SimCore v0.69.0 M2-6 Implementation Preflight

Date: 2026-08-30 KST

Status: **PREFLIGHT PASS · IMPLEMENTATION MAY PROCEED**

## Exact parent

```text
release-simcore commit  6b31a5265f67daf5a90222d6c08bb85f3abde538
version                 0.68.0
blob                    5094755266444de311ec9cc8ffc7a4dd658e65b1
```

## Kernel state seam

Exact v0.68 Kernel imports exactly four domain owners:

```js
const { normalizePlatformMaxMap } = require('./community');
const recurrence = require('./recurrence');
const lineage = require('./lineage');
const handoff = require('./handoff');
```

Their use inside Kernel is bounded to `initialState()` / `reconcileState()`:

```text
initialState
  lineage.normalizeLineage(null)

reconcileState
  recurrence.normalizeRegistry
  lineage.normalizeLineage
  handoff.normalizeRegistry
  normalizePlatformMaxMap
```

The moved functions otherwise require only Kernel-owned `STATE_VERSION` and `CORE_STATE_VERSION`, both already exported.

No compatibility barrel is required.

## Proven direct consumers

Direct state-construction/reconciliation calls are present in exactly these current owners:

```text
lifecycle
bootstrap-migration
prompt
edit-reconcile
output-finalize
session
```

They may continue to retain their existing Kernel imports for Kernel-owned helpers/constants while adding one direct application/domain-legal `state-reconcile` dependency for `initialState` / `reconcileState` only.

## Target graph

```text
kernel (foundation)
  -> no domain dependencies

state-reconcile (application)
  -> kernel
  -> community
  -> recurrence
  -> lineage
  -> handoff

lifecycle (domain)
  cannot depend on application
```

The last line is a critical graph constraint. Because `lifecycle` currently calls `kernel.reconcileState`, blindly switching it to application-level `state-reconcile` would create a forbidden Domain -> Application edge.

Therefore the ownership extraction must preserve layer direction. The frozen design requirement that every direct consumer switch to `state-reconcile` conflicts with the existing contract classification of `lifecycle` as Domain.

## Preflight disposition

This is a design-level graph contradiction discovered before runtime mutation:

```text
V06900_LIFECYCLE_STATE_RECONCILE_LAYER_CONTRADICTION = BLOCKER
```

The runtime implementation may **not** proceed by creating a forbidden Domain -> Application edge or by retaining Kernel as a state-reconcile facade.

Required resolution is a narrow design convergence before code mutation. Acceptable resolutions must preserve behavior and may not broaden Lifecycle/Session ownership.

Runtime mutation performed by this preflight: **NONE**.
