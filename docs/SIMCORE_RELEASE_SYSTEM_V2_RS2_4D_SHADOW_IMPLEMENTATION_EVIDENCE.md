# SimCore Release System v2 — RS2-4D Shadow Implementation Evidence

Date: 2026-08-24
Status: **IMPLEMENTATION IN PROGRESS · SHADOW ONLY · NON-RUNTIME**
Parent shadow status: `products/simcore/releases/RS2_4_SHADOW_STATUS.json`
Design authority: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4D_POST_PUBLISH_STATE_EVIDENCE_LEGACY_SHADOW.md`

## Entry truth

```text
RS2-4 A/B/C shadow             SHADOW_VERIFIED
production publication         DISABLED
release-simcore                47969d24771f6cc188df6e32150fc6fde519182d
RS2-3                          PROMOTION_READY
requiredCiActive               false
rs2_3Closed                    false
rs2_4EntryAuthorized           false
```

## PFFL START PRECHECK

Applicable prior failure:

```text
RS2_4_SHADOW_TEST_REPO_CWD_NOT_BOUND
= FIX / HARNESS / DIRECT_EVIDENCE
```

Prevention applied:

```text
D shadow tests use explicit isolated root arguments
local file-state helper never infers repository root from synthetic test Git identity
all writes are path-contained below supplied root
```

Open cleanup defer from A/B/C:

```text
SHADOW_PROOF_REF_DELETE_TOOL_SURFACE_UNAVAILABLE
= DEFER / TOOL_SURFACE / NO_PRODUCTION_AUTHORITY
```

It is not a blocker for D local-state shadow implementation.

## D shadow goal

Implement and prove the local post-publish state boundary without claiming a real publication occurred:

```text
identity-bound simulated published C/L/version/name
→ declare-production local helper
→ manifest declares C + PENDING_REAL_LONG_CHAT
→ sync-state renders registered machine blocks from that declaration
→ bounded deployment record created
→ only four D-authorized paths differ inside isolated root
```

Actual main documents and actual `product-manifest.json` must remain unchanged by shadow proof.

## Permanent candidate asset

Planned local helper:

```text
products/simcore/tooling/declare-production.mjs
```

It may update only:

```text
production_version
release_name
release_branch
release_commit
release_blob
validation_status
```

It may create one bounded record:

```text
products/simcore/releases/records/<releaseId>.json
```

It may not:

```text
contact GitHub
write release-simcore
render CURRENT_DEVELOPMENT
render SIMCORE_GUIDELINES
change roadmap/current_priority/provider fields
```

## Forbidden activation claims

This work item must not set:

```text
productionPublicationAuthorized = true
requiredCiActive = true
rs2_3Closed = true
rs2_4EntryAuthorized = true
```

No runtime deployment or long-chat gate is part of this NON-RUNTIME shadow work.
