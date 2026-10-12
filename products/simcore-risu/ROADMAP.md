# SimCore Risu Roadmap

Status: **DESIGN ROADMAP · NO RELEASE AUTHORITY**

```text
R0  Product root bootstrap
R1  Host baseline audit
R2  Native Fusion host-fit spike
R3  Trunk/upstream strategy freeze
R4  Native shell + migration skeleton
R5  Fusion core native adapter
R6  Memory/Knowledge/Reference service integration
R7  LightBoard + Private/Public Wiki native UI
R8  Canon Alignment native surface
R9  import/backup/migration qualification
R10 bounded real-device acceptance
R11 release-system design
R12 first qualified SimCore Risu release
```

## R0 — Product root bootstrap

Goal:
- isolate product ownership;
- define manifest/current/boundaries;
- register the root without creating runtime or release authority.

## R1 — Host baseline audit

Compare:
- official PocketRisu;
- `hanmiyoo10-alt/PocketRisu`;
- HaejeokRisu;
- RisuBard.

Focus:
- request lifecycle;
- edit/delete/reroll/branch identity;
- save/load/checkpoint behavior;
- database/storage abstraction;
- background jobs/model broker;
- plugin v3 compatibility;
- Termux/mobile/web/desktop;
- upstream maintenance cost;
- GPL/provenance obligations.

## R2 — Native Fusion host-fit spike

Prove native bindings for:
- `HostTurnSnapshot.v1`;
- `SourceRevision.v1`;
- `StoryWorldlineEvent.v1`.

No full Fusion implementation before this proof.

## Preservation rule

The compatibility Fusion Plugin path remains valid even if the native SimCore Risu product becomes the flagship.
