# SimCore Release System v2 — RS2-2 State Synchronization Implementation Evidence

Date: 2026-08-23
Status: **IMPLEMENTED · CUTOVER COMPLETE · CLOSED · NON-RUNTIME**
Phase: `RS2-2 — State Synchronization`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2C_TARGET_MAPPING_WRITE_SAFETY_MIGRATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`

## Scope result

RS2-2 only was implemented. No SimCore runtime code, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, or `release-simcore` commit was changed. RS2-3 Permanent CI and RS2-4 Permanent Release Workflow remain design-only.

Implemented permanent surfaces:

```text
products/simcore/tooling/sync-state.mjs
products/simcore/state-sync/target-registry.json
products/simcore/state-sync/current-claim-probes.json
products/simcore/state-sync/writer-policy.json
products/simcore/state-sync/schema/**
products/simcore/state-sync/test-sync-state.mjs
products/simcore/state-sync/migrate-markers.mjs
scripts/simcore-sync-memory.py
.github/workflows/simcore-release-state-sync.yml
products/simcore/state-sync/RS2_2_STATUS.json
```

The one-time migration helper remains as bounded provenance/recovery tooling; ordinary state synchronization does not call it.

## Evidence before repair

Entry state:

```text
main product-manifest.json
  production_version = 0.64.3
  release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf
  release_blob        = ff481aa904340b844ef29b0d89aa20bd6286286d

release-simcore
  production_version = 0.64.6
  release_commit      = 47969d24771f6cc188df6e32150fc6fde519182d
  release_blob        = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

Classification:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

The new verifier preserved this as a negative fixture and returned a blocked identity result. It did not repair the manifest itself.

## Implementation validation

Read-only implementation validation proved:

```text
sync-state harness self-tests                    PASS
entry manifest drift fail-closed                 PASS
same-version commit/blob identity checking       PASS
managed-block stale detection                    PASS
legacy-marker resurrection blocker               PASS
dual-writer configuration blocker                PASS
render mode                                       PASS
sandbox legacy manifest-only normalization       PASS
one-time marker migration                        PASS
unmanaged prefix/suffix byte preservation        PASS
post-migration state check                       PASS
no-op write / idempotence                        PASS
release-simcore unchanged                        PASS
```

Key successful implementation runs:

```text
run 32635619409 / job 97184798281   PASS
run 32635843321 / job 97185364544   PASS
run 32635887358                     PASS on latest-main-integrated implementation head
```

Implementation PR:

```text
#146 infra(simcore): implement RS2-2 state synchronization
merge commit d463871f1e858551276ea207c48a18b170ff0b2d
```

## Cutover

The post-main bounded migration executed after implementation merge.

Order:

```text
release-simcore identity materialized
→ scripts/simcore-sync-memory.py --manifest-only
→ source identity verified
→ CURRENT_DEVELOPMENT legacy marker pair migrated
→ Guidelines production baseline enrolled
→ sync-state --check
→ bounded three-file payload
→ scripts/repo-main-write.py
```

Canonical cutover main commit:

```text
0e9bb560bf1b52983dbf37c5adbdc39468a79912
infra(simcore): apply RS2-2 state-sync cutover
```

Post-cutover manifest identity:

```text
production_version = 0.64.6
release_name        = Post-B_END C Clock Handoff Authority
release_commit      = 47969d24771f6cc188df6e32150fc6fde519182d
release_blob        = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

Canonical document ownership:

```text
docs/CURRENT_DEVELOPMENT.md
  SIMCORE_SYNC:PRODUCTION_SNAPSHOT

docs/SIMCORE_GUIDELINES.md
  SIMCORE_SYNC:PRODUCTION_BASELINE
```

The old `SIMCORE_PRODUCTION_SNAPSHOT` marker pair is no longer the active document authority.

## Writer ownership after cutover

```text
product-manifest.json declaration
  → scripts/simcore-sync-memory.py --manifest-only
  → transitional until RS2-4

document machine blocks
  → products/simcore/tooling/sync-state.mjs only

legacy full document writer
  → scripts/simcore-sync-memory.py --legacy-full
  → rollback-only
  → implicit/full-by-default mode forbidden

main integration
  → scripts/repo-main-write.py
```

No normal `DUAL_WRITE` state exists.

## CLEAN-1 / CLEAN-2

Evidence-only PR #148 intentionally remained unmerged.

Workflow run:

```text
32636108262
```

CLEAN-1:

```text
job 97186003801
checkout            0e9bb560bf1b52983dbf37c5adbdc39468a79912
source identity     IDENTITY_VERIFIED
managed targets     CLEAN / CLEAN
writer policy       WRITER_POLICY_CLEAN
result              CHECK_CLEAN_WITH_OBSERVATIONS
blockers            0
drifts              0
observations         2
```

CLEAN-2:

```text
job 97186003817
independent checkout 0e9bb560bf1b52983dbf37c5adbdc39468a79912
sync-state --write   writes = 0
managed file hashes  unchanged
result               CHECK_CLEAN_WITH_OBSERVATIONS
blockers             0
drifts               0
observations          2
```

The two open observations are human-managed current-state prose only:

```text
HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
HUMAN_CURRENT_RELEASE_SECTION_STALE
```

Disposition:

```text
OBSERVATION / REPORT_ONLY / NON_BLOCKING
```

They are not machine-block drift and are intentionally not auto-rewritten by RS2-2.

## Final operational state

```text
STATE_SYNC_AVAILABLE                 YES
DOCUMENT_SYNC_CUTOVER_COMPLETE       YES
LEGACY_FULL_ROLLBACK_ONLY            YES
MANIFEST_DECLARATION_TRANSITIONAL    YES
SOURCE_IDENTITY                      VERIFIED
MANAGED_TARGETS                      CLEAN
WRITER_POLICY                        CLEAN
CLEAN-1                              PASS
CLEAN-2                              PASS
RS2_2_CLOSED                         YES
RS2_3_ENTRY_AUTHORIZED               YES
runtime diff                         NONE
release-simcore diff                 NONE
```

Machine-readable close record:

```text
products/simcore/state-sync/RS2_2_STATUS.json
```

## Handoff

RS2-3 Permanent CI may now consume:

```text
products/simcore/tooling/test.mjs
products/simcore/tooling/sync-state.mjs --check
products/simcore/state-sync/target-registry.json
products/simcore/state-sync/current-claim-probes.json
products/simcore/state-sync/writer-policy.json
products/simcore/state-sync/RS2_2_STATUS.json
```

RS2-3 must not reinterpret the transitional manifest declaration owner as permanent release authority. That transition remains RS2-4 scope.
