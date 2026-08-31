# SimCore S7 PR1 Dry Final Release Identity Validation Profile Fix

Date: 2026-08-31 KST
Status: **FIX RECORDED · NON_RUNTIME · PRODUCTION UNCHANGED · REPAIR NEXT**
Classification: **FIX · S7_FINAL_RELEASE_IDENTITY_VALIDATION_PROFILE_BRIDGE · NON_RUNTIME**

## Trigger

S7 implementation PR #1067 first dry head:

```text
head = 1ab6af31c3e09344e27afdb2117cef00aa991fec
workflow run = 33384120706
Verify job = 99462766902 / FAIL
Required job = 99462896167 / FAIL
```

Bounded report:

```text
conclusion = FAIL
reasonCodes = PR1_DRY_QUALIFICATION_FAIL
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production latest/install sha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
production bytes = 574325
```

Exact nested dry failure:

```text
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: operator-release-card: 0.70.3 card name missing
```

## Root cause

The S7 runtime builder intentionally converges final v0.70.3 operator identity to:

```text
Post-M2 Simplification Convergence
```

The repository's exact v0.70.3 validation profile still carries the historical S1 internal checkpoint identity:

```text
products/simcore/releases/validation-profiles/0.70.3.json
releaseName = Runtime Cache Hash Primitive Convergence
```

The R2.9 `CURRENT_IDENTITY_INHERIT_BEHAVIOR` operator-card validator checks the current card name against `profile.releaseName` before normalizing the card back to its frozen 0.69.2 behavioral authority. Therefore the final S7 runtime identity is correct by frozen S7 design, while the exact-version validation profile is stale.

This is not a runtime regression and not a release-system architecture defect.

## Repair boundary

Allowed repair:

```text
update only validation-profiles/0.70.3.json releaseName
Runtime Cache Hash Primitive Convergence
→ Post-M2 Simplification Convergence
```

Frozen:

```text
schemaVersion = 1
releaseVersion = 0.70.3
all contract modes
all authorityVersion values
operator authorityIdentity = MamsHolic Exact Brand Alias Repair
host-local exact-current authority/reject versions
builder runtime transforms
candidate request identity
release-system code/workflows
production release-simcore
```

## Classification

```text
FIX = S7_FINAL_RELEASE_IDENTITY_VALIDATION_PROFILE_BRIDGE
RUNTIME = NO
RELEASE_SYSTEM_REDESIGN = NO
PRODUCTION_MUTATION = NONE
CANDIDATE_PERSISTENCE = NONE
BLOCKER = NO, provided repaired dry passes
```

## Next

Apply the one-field exact-version validation-profile bridge and rerun PR1 dry. If the repaired dry does not pass, preserve the next failure separately before further changes.
