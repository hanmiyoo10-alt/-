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

This D work item remains infrastructure-only. It does not change SimCore runtime source, production version, or live product semantics.

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
→ bounded payload replay through repo-main-write
→ fresh landed-state sync-state --check
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

It may create or idempotently recover one bounded record:

```text
products/simcore/releases/records/<releaseId>.json
```

Admin recovery is fail-closed:

```text
manifest == P  → ordinary declaration to C
manifest == C  → same-release idempotent recovery permitted
manifest != P/C → ADMIN_RECOVERY_RELEASE_SUPERSEDED
```

It may not contact GitHub, write `release-simcore`, render the managed documents itself, or change roadmap/current-priority/provider fields.

`post-publish-state-shadow.mjs` first verifies the locally materialized simulated publication identity before any declaration write:

```text
resolved commit == C
latest blob == L
install blob == L
latest/install bytes identical
materialized Git blobs == L
source version/name == bound identity
```

It then exercises:

```text
declare-production
→ sync-state --write
→ fresh sync-state --check
→ LIVE_PENDING bounded record
```

Its report remains explicitly `SHADOW_ONLY`, with `productionMutation=NONE` and `mainMutation=LOCAL_WORKTREE_ONLY`.

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
S8  interrupted state-render failure followed by bounded admin recovery without republish
```

S1 uses an isolated local bare Git remote and the real `scripts/repo-main-write.py`, then creates a fresh clone and runs `sync-state --check` against the landed state.

Legacy responsibility-map assertions verify that the current legacy/state/release writers remain explicitly mapped while no authority retirement is claimed.

## Implementation anomaly preserved

### `RS2_4D_SPEC_AUTH_ENV_NOT_EXPORTED`

```text
Classification  FIX / WORKFLOW_HARNESS / PRE_CI / NON_RUNTIME
Observed        2026-08-24 during implementation review
Production      UNCHANGED
Runtime         UNCHANGED
```

The initial D workflow draft contained two `env:` mappings on the same step and kept `SPEC_AUTH_COMMIT` shell-local while the Node identity materializer consumed `process.env.SPEC_AUTH_COMMIT`.

If retained, the D shadow identity materialization could fail or receive an unavailable authorization identity. The workflow still had `contents: read`, no production publication authority, and no `release-simcore` write primitive, so impact was confined to the shadow harness.

Fix commit:

```text
8283da686653aa6e24929dd71d2dc420fc77f600
```

Fix:

```text
single step env mapping
+ explicit export SPEC_AUTH_COMMIT
+ Node consumes the exported immutable value
```

The anomaly is retained rather than erased because future R failures are intended to become permanent evidence/checks.

## Permanent CI proof after the fix

PR:

```text
#212 — infra(simcore): complete RS2-4D post-publish state shadow
```

The corrected implementation was included in validated PR head:

```text
495bd55990c0d1e7bd65c2cc9a73915ee82c954d
```

Permanent SimCore CI after the fix:

```text
run       32727464917  SUCCESS
Verify    97431945643  SUCCESS
Required  97432043800  SUCCESS
```

Verifier execution included PR path classification, deployed-production materialization, trusted-lane verification for CI self-change, proposed permanent verifier execution, the permanent S1-S8 D suite through CI self-test, bounded report generation, and stable Required aggregation.

An earlier PASS on `e16c0582...` is historical pre-fix evidence only and is not used as final D acceptance proof.

Current D result:

```text
RS2_4D_SHADOW_VERIFIED
```

## Changed-path / authority proof

PR #212 changed only R infrastructure/evidence surfaces. It did not change:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

`release-simcore` remained:

```text
47969d24771f6cc188df6e32150fc6fde519182d
```

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

RS2-4D local post-publish state shadow is complete and may serve as evidence for the next R decision.

Next R work remains separately gated:

```text
RS2-4E promotion / real-release / rollback / retirement readiness
+
explicit resolution of any activation blocker created by the still-open RS2-3 enforcement gap
+
repair of current main administrative state drift before production-authority activation
```

Do not start the next SimCore runtime version until the chosen R completion gate is satisfied.
