# SimCore Risu

Status: **RESEARCH PRODUCT ROOT · DESIGN ONLY · NO RUNTIME/RELEASE/PRODUCTION AUTHORITY**

SimCore Risu is the independent application-level product root for the idea that grew beyond a single SimCore plugin: a Risu-lineage host with SimCore Fusion integrated natively.

## Product intent

Target product shape:

```text
PocketRisu lineage / owner fork
        +
SimCore Fusion
        +
selected host/product donor capabilities
        ↓
SimCore Risu
```

This root exists so native-host work does not blur ownership with either current production SimCore or PocketRisu Helper Mod operations.

## Candidate lineage

Current candidate host lineage:

```text
PocketRisu/PocketRisu
        ↓ upstream compatibility reference
hanmiyoo10-alt/PocketRisu
        ↓ owner fork / candidate development trunk
SimCore Risu
```

Capability donors under review include:
- HaejeokRisu: host performance, SQL/storage, Termux/cross-platform, low-memory lessons;
- RisuBard: bounded context, Wiki UX, save/load, durability, migration/product integration;
- SimCore Fusion donors already tracked by the SimCore architecture program.

No donor source is imported by this bootstrap.

## Ownership

This root may own, after separate design and implementation authorization:
- native host adapter for Fusion;
- integrated application UI for Runtime, Memory, Wiki, Canon Alignment, LightBoard, Worldlines and diagnostics;
- host-native request/source/branch/save/load integration;
- app-level storage/model-broker/background-job integration;
- upstream/fork integration strategy for the SimCore Risu distribution.

This root does **not** currently own:
- SimCore production runtime or release state;
- `release-simcore`;
- PocketRisu Helper Mod operations or device deployment;
- official PocketRisu upstream;
- any third-party donor runtime or code.

## Current authority

- manifest: `products/simcore-risu/product.json`
- current state: `products/simcore-risu/CURRENT.md`
- roadmap: `products/simcore-risu/ROADMAP.md`
- boundaries: `products/simcore-risu/BOUNDARIES.md`
- guidelines: `docs/SIMCORE-RISU_GUIDELINES.md`

Tracking:
- Fusion architecture: #2961
- host strategy: #3600
- root bootstrap: #3601
