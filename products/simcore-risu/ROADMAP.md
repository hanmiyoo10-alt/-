# SimCore Risu Roadmap

Status: **FINAL TARGET ROADMAP / PRE-IMPLEMENTATION / NO RELEASE AUTHORITY**

```text
R0  Independent product-root bootstrap                         DONE
R1  Final target design record                                DONE
R2  MYANG existing-content relocation                         REQUIRED / NOT PROVEN
R3  MYANG product authority bootstrap                         BLOCKED BY R2
R4  Host baseline audit                                       BLOCKED BY R3
R5  Native Fusion host-fit spike                              BLOCKED BY R4
R6  Trunk/upstream strategy freeze                            BLOCKED BY R5
R7  Native shell + migration skeleton                         BLOCKED BY R6
R8  Fusion core native adapter                                BLOCKED BY R7
R9  Memory / Knowledge / Reference / Canon Alignment          BLOCKED BY R8
R10 LightBoard + Private/Public Wiki native UI                BLOCKED BY R9
R11 Unified UI / diagnostics / import / backup                BLOCKED BY R10
R12 Fixture / replay qualification                            BLOCKED BY R11
R13 Bounded real-device acceptance                            BLOCKED BY R12
R14 Release-system design                                     BLOCKED BY R13
R15 First qualified SimCore Risu release                      BLOCKED BY R14
```

## R2 - MYANG existing-content relocation

Owner prerequisite:
- existing MYANG content is moved out before SimCore Risu work begins there.

Do not interpret repository sparsity as permission to delete or overwrite existing content.

After relocation, re-read MYANG and prove the destination state before R3.

## R3 - MYANG product authority bootstrap

Create only after R2:
- repository common rules / operating guidance;
- SimCore Risu product manifest;
- current-state authority;
- source/release/deployment boundaries;
- private donor-source/provenance policy;
- MYANG donor/upstream registry authority;
- owner-controlled plugin/module update routing;
- CI/bootstrap rules.

At this stage, migrate operational donor-watch/update routing toward MYANG while preserving original upstream identities and leaving `hanmiyoo10-alt/-` as a thin cross-project locator.

The current `products/simcore-risu/` root in `hanmiyoo10-alt/-` becomes a thin locator only after the migration is proven.

## R4 - Host baseline audit

Compare:
- official PocketRisu;
- `hanmiyoo10-alt/PocketRisu`;
- HaejeokRisu;
- RisuBard.

Focus:
- request lifecycle;
- edit/delete/reroll/branch identities;
- save/load/checkpoints;
- database/storage abstraction;
- background jobs/model broker;
- plugin v3 compatibility;
- Termux/mobile/web/desktop;
- upstream maintenance cost;
- GPL/provenance obligations.

## R5 - Native Fusion host-fit spike

Prove native bindings for:
- `HostTurnSnapshot.v1`;
- `SourceRevision.v1`;
- `StoryWorldlineEvent.v1`.

No full Fusion implementation before this proof.

## Preservation rule

The compatibility Fusion Plugin path remains valid even when native SimCore Risu becomes the flagship.

No required stage is complete until its stated evidence gate is satisfied.
