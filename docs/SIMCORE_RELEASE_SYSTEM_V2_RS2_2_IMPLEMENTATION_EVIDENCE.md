# SimCore Release System v2 — RS2-2 State Synchronization Implementation Evidence

Date: 2026-08-23
Status: **IMPLEMENTING · NON-RUNTIME**
Phase: `RS2-2 — State Synchronization`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2C_TARGET_MAPPING_WRITE_SAFETY_MIGRATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`

## Scope lock

This work item implements **RS2-2 only**.

Allowed:

```text
products/simcore/tooling/sync-state.mjs
products/simcore/state-sync/**
scripts/simcore-sync-memory.py transitional mode split
.github/workflows/simcore-release-state-sync.yml state-sync ownership cutover
product-manifest.json declaration normalization through the transitional legacy declaration owner
docs/CURRENT_DEVELOPMENT.md canonical machine-block migration
docs/SIMCORE_GUIDELINES.md canonical baseline enrollment
RS2-2 implementation / migration / close evidence
an RS2-2-only validation workflow while collecting implementation evidence
```

Forbidden:

```text
plugins/simcore/latest.js mutation
plugins/simcore/install.js mutation
release-simcore mutation
runtime semantic change
RS2-3 permanent-CI implementation
RS2-4 permanent-release-controller implementation
legacy release mechanism retirement
human prose auto-rewrite outside registered machine spans
manifest auto-heal by sync-state.mjs
```

## Evidence before repair

Observed on entry:

```text
main product-manifest.json
  production_version = 0.64.3
  release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf
  release_blob        = ff481aa904340b844ef29b0d89aa20bd6286286d

release-simcore
  version             = 0.64.6
  release_commit      = 47969d24771f6cc188df6e32150fc6fde519182d
  release_blob        = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

Classification:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

This drift is a required negative verifier fixture. `sync-state.mjs` must report it and refuse document writes. The declaration is normalized only through the transitional legacy manifest declaration path before document ownership cutover.

## Required close state

```text
STATE_SYNC_AVAILABLE                 YES
DOCUMENT_SYNC_CUTOVER_COMPLETE       YES
LEGACY_FULL_ROLLBACK_ONLY            YES
MANIFEST_DECLARATION_TRANSITIONAL    YES
CLEAN-1                              PASS
CLEAN-2                              PASS
RS2_2_CLOSED                         YES
RS2_3_ENTRY_AUTHORIZED               YES
runtime diff                         NONE
release-simcore diff                 NONE
```

## Validation record

Pending implementation, migration proof, and two post-cutover clean checks.
