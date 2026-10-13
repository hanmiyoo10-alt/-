# CURRENT - SimCore Risu

Status: **FINAL TARGET DESIGN RECORDED / PRE-IMPLEMENTATION**

## Current state

The final target product design is recorded in:

`products/simcore-risu/FINAL_TARGET_DESIGN_V1_2026-10-12.md`

The intended repository topology is now:

```text
PocketRisu/PocketRisu
-> hanmiyoo10-alt/PocketRisu
-> hanmiyoo10-alt/myang
-> SimCore Risu
```

Roles:
- official PocketRisu: upstream compatibility reference;
- `hanmiyoo10-alt/PocketRisu`: owner integration/staging fork;
- `hanmiyoo10-alt/myang`: future flagship application repository;
- `hanmiyoo10-alt/-`: current SimCore production authority, Fusion contracts/donor research, compatibility coordination.

## Current priority

`WAIT_MYANG_EXISTING_CONTENT_RELOCATION`

A future MYANG donor/update hub policy is now recorded at:

`products/simcore-risu/DONOR_UPDATE_HUB_POLICY_V1_2026-10-13.md`

After MYANG is cleared and bootstrapped, MYANG is intended to become the canonical private intake/update/distribution hub for owner-adapted donor/plugin builds. Original upstream links remain preserved as provenance.

No update URL is rewritten before the MYANG gate completes.

The owner requires all existing MYANG content to be moved out before SimCore Risu work begins there.

Point-in-time MYANG evidence observed on 2026-10-12:

```text
main = 3297a5745740ebb7962d875c5fa96ba8806c7e32

root:
- README.md
- repo-cockpit-aggregator/
```

This is evidence of the observed state only. Re-read MYANG before any migration or mutation.

## Blocking gate

Until MYANG existing-content relocation is proven complete:

- no SimCore Risu implementation is started in MYANG;
- no SimCore Risu release/deployment/production authority is created there;
- no existing MYANG content is deleted or overwritten by assumption;
- the current monorepo product root remains the design/coordination authority.

## Next work after the gate

1. re-read MYANG current authority/state;
2. establish MYANG repository/product rules and manifest;
3. bind MYANG as the SimCore Risu product repository;
4. perform host baseline audit across official PocketRisu, owner PocketRisu, HaejeokRisu and RisuBard;
5. prove native `HostTurnSnapshot.v1`, `SourceRevision.v1` and `StoryWorldlineEvent.v1` bindings;
6. freeze trunk/upstream strategy before implementation broadens.

## Preserved authority boundaries

- Current SimCore production remains owned by `plugin:simcore` and `release-simcore`.
- Current PocketRisu device/operations work remains owned by PocketRisu Helper Mod.
- This root has no release branch, updater, deployment authority or production artifact.
- Owner-supplied donor artifacts may be inspected/adapted/transplanted at source level for the owner's private build under the recorded private-source policy.
- Public/shared redistribution remains separately license/provenance-gated.
- Final design recorded does not mean implementation complete.

## Tracking

- #2961 Fusion architecture
- #3599 LoreQAcustom donor
- #3600 host/repository strategy
- #3601 independent product-root bootstrap
