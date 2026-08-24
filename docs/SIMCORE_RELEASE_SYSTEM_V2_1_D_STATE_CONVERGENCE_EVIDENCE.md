# SimCore Release System v2.1 — D LIVE_PENDING State Convergence Evidence

Date: 2026-08-25
Status: **IMPLEMENTED · PENDING PERMANENT CI · NON-RUNTIME**

## Purpose

R2.1-D consolidates the fragmented post-publication administrative closure into one application-level owner:

`products/simcore/tooling/release-state-converge.mjs`

The already-qualified caller path remains stable through the compatibility adapter:

`products/simcore/tooling/post-publish-state.mjs`

Both normal permanent publication and exceptional post-publish recovery already call this adapter, so moving application ownership behind it makes both paths use the same convergence logic without rewriting the production publisher topology.

## Transaction

Given immutable publication evidence, the owner performs:

```text
validate publication input / required live gate
→ observe actual release-simcore C + blob + latest/install equality
→ declare production identity + PENDING_REAL_LONG_CHAT
→ set manifest current_priority = liveScenarioId
→ render/check canonical sync-state blocks
→ finalize per-release LIVE_PENDING record
→ render machine-managed CURRENT_DEVELOPMENT live-gate block
→ persist deterministic state receipt
→ final sync-state replay check
```

Durable state receipt:

`products/simcore/releases/state-receipts/<releaseId>.json`

It records machine-known publication/run/production/live-gate facts and the R lifecycle:

`REAL_RELEASE_LIVE_PENDING`

The legacy caller-facing report field `lifecycleState=LIVE_PENDING` remains compatibility-stable; the R v2.1 lifecycle is exposed as `rLifecycleState=REAL_RELEASE_LIVE_PENDING` and in the state receipt.

## Idempotency

```text
exact durable state already present
→ ALREADY_CONVERGED / PASS
→ mainMutation = NONE
→ productionMutation = ALREADY_PUBLISHED_UPSTREAM

conflicting existing state receipt
→ STATE_RECEIPT_CONFLICT / BLOCK

newer unrelated main production
→ ADMIN_RECOVERY_RELEASE_SUPERSEDED / BLOCK
```

No force or publication primitive exists in the convergence owner or adapter.

## Document ownership boundary

`sync-state` retains ownership of the existing canonical production snapshot/baseline blocks.

`release-state-converge` owns only the non-overlapping bounded marker block:

```text
SIMCORE_RELEASE_STATE:LIVE_PENDING
```

This block carries the exact release transaction, production commit, validation status, current priority/live gate, and R lifecycle. The final `sync-state --check` runs after this block is rendered, proving it does not corrupt the canonical sync-state blocks.

## Permanent coverage added

The existing permanent post-publish state suite now additionally proves:

```text
D-N2/D-N3/D-N4 observed production identity mismatch blocks
D-N6 newer main production blocks
D-N7 missing required live gate blocks before mutation
D-N9 adapter/owner contain no publication primitive
D-N10 exact replay = ALREADY_CONVERGED / no mutation
D-N12 conflicting state receipt blocks
```

It also proves successful convergence writes current_priority, the LIVE_PENDING document block, and the deterministic state receipt while preserving existing caller compatibility.

## Safety boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
publisher topology rewrite = NONE
human LIVE_PASS authority = unchanged
current production = v0.64.7
current human gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

R2.1-D is not closed until permanent Verify/Required PASS, merge, and durable-main re-observation.
