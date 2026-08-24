# SimCore Release System v2 — RS2-4D Shadow Implementation Evidence

Date: 2026-08-24
Status: **SHADOW VERIFIED · NON-RUNTIME · PRODUCTION AUTHORITY UNCHANGED**
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

Actual production publication remains outside this shadow proof.

## Permanent candidate assets

Implemented:

```text
products/simcore/tooling/declare-production.mjs
products/simcore/tooling/post-publish-state-shadow.mjs
products/simcore/tests/post-publish-state-shadow.test.mjs
```

Supporting permanent CI/workflow integration:

```text
.github/workflows/simcore-release.yml
products/simcore/tooling/ci/classify.mjs
products/simcore/tooling/ci/self-test.mjs
```

`declare-production.mjs` may update only:

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

## Deterministic D shadow coverage

The permanent S1-S8 shadow suite covers:

```text
S1  normal post-publish declaration + bounded main replay + fresh sync-state check
S2  expected production parent mismatch rejection
S3  latest/install published identity divergence rejection before manifest mutation
S4  duplicate/already-promoted idempotent no-op
S5  newer-release/admin-recovery supersession protection
S6  SAME_VERSION_CORRECTION state declaration
S7  ROLLBACK state declaration
S8  interrupted state-render failure followed by bounded admin recovery
```

Legacy responsibility-map assertions also verify that the current legacy/state/release writers remain explicitly mapped while no authority retirement is claimed.

## Permanent CI proof

PR: `#212 — infra(simcore): complete RS2-4D post-publish state shadow`

Exact implementation head evaluated:

```text
e16c058272e4dd17a9295c681b62263b0e86d9d5
```

Permanent SimCore CI:

```text
run       32727321800
Verify    97431442047  SUCCESS
Required  97431540968  SUCCESS
```

Verifier steps included PR path classification, deployed-production materialization, CI-self-change trusted lane selection, proposed permanent verifier execution, bounded report generation, and stable Required aggregation.

Result:

```text
RS2_4D_SHADOW_VERIFIED
```

No new failure/anomaly was observed in this promotion run.

## Authority result

This D proof does **not** activate release authority.

Frozen false claims remain false:

```text
productionPublicationAuthorized = false
requiredCiActive = false
rs2_3Closed = false
rs2_4EntryAuthorized = false
```

Production/runtime/release-simcore mutation:

```text
NONE
```

The deployed SimCore runtime remains v0.64.6 and is outside this NON-RUNTIME work item.

## D exit / next boundary

RS2-4D local post-publish state shadow is complete and may now serve as evidence for the next R decision.

Next R work must remain separately gated:

```text
RS2-4E promotion / real-release / rollback / retirement readiness
+
any explicit activation-amendment decision required by the still-open RS2-3 enforcement gap
```

Do not start the next SimCore runtime version until the chosen R completion gate is satisfied.
