# CURRENT — SimCore Risu

Status: **DESIGN_ONLY**

## Current state

The independent product root exists because the proposed native Risu application has become materially larger than the current SimCore plugin scope.

Current candidate product direction:

```text
official PocketRisu
→ owner PocketRisu fork
→ SimCore Risu flagship distribution

plus selective capability transplants from
HaejeokRisu + RisuBard + SimCore Fusion donors
```

No host base has been promoted to implementation authority yet.

## Current priority

`HOST_BASELINE_AUDIT`

Before native implementation:
1. inspect current official PocketRisu and `hanmiyoo10-alt/PocketRisu`;
2. compare HaejeokRisu and RisuBard host/product boundaries;
3. map native host lifecycle events to the frozen Fusion contracts;
4. prove a bounded native binding for `HostTurnSnapshot.v1`, `SourceRevision.v1` and `StoryWorldlineEvent.v1`;
5. decide the maintained trunk/upstream strategy.

## Preserved authority boundaries

- Current SimCore production remains owned by `plugin:simcore` and `release-simcore`.
- Current PocketRisu device/operations work remains owned by PocketRisu Helper Mod.
- This root has no release branch, updater, deployment authority or production artifact.
- Third-party GPL/provenance obligations must be reviewed before code transplant.

## Tracking

- #2961 Fusion architecture
- #3600 embedded host strategy
- #3601 independent product-root bootstrap
