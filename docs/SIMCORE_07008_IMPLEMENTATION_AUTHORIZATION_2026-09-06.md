# SimCore v0.70.8 Implementation Authorization

Date: 2026-09-06 KST
Status: **IMPLEMENTATION AUTHORIZED · DEDICATED #1544 REPAIR · RUNTIME**
Release: **v0.70.8 Repeat-Send Representation Rewind Guard**
Classification: **CORRECTNESS / REPRESENTATION + EDIT-RECONCILE MINI**

## 1. Authority

Frozen design:

- `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_DESIGN_2026-09-06.md`
- design merge `c9fcffed8da5936f1abac8d5d641f9f4b16f07a1`

Root-cause evidence:

- `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_ROOT_CAUSE_EVIDENCE_2026-09-06.md`
- tracking `#1544`

Operator authorization:

```text
IMPLEMENT v0.70.8 = YES
```

The operator explicitly authorized implementation after the design freeze.

## 2. Fresh pre-implementation authority

At authorization capture:

```text
main = c9fcffed8da5936f1abac8d5d641f9f4b16f07a1
production version = 0.70.7
production release = Output Snapshot Set Cost Attribution
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
```

The v0.70.7 machine release record still declares `LIVE_PENDING / PENDING_REAL_LONG_CHAT`.

This does not block v0.70.8 because the frozen v0.70.8 design is the dedicated repair for unresolved correctness FIX `#1544` discovered on that live path. The release-advancement rule explicitly permits the dedicated repair and forbids skipping it for unrelated work.

R2.11 is already implemented/closed and is not an active implementation-lane owner. No R2.11 source change is authorized in this transaction.

## 3. Exact implementation boundary

Authorized runtime change is limited to:

```text
PROVEN_REPEAT_SEND_REWIND
+ prior OUTPUT_MISMATCH
+ current exact prior Fresh
+ exact bounded repeat-send index/location geometry
-> REPRESENTATION_FAST_RECONCILED
-> snapshot UNCHANGED
-> compatibilitySource fresh-exact-repeat-send-rewind
```

The existing same-slot Fresh carryover authority remains unchanged.

The implementation may pass the already-known request `sendIndex` into Edit Reconcile as bounded ephemeral context and inspect only the existing Session/Representation facts allowed by the frozen design.

Required direct-owner permanent regression must include:

- ordinary same-slot Fresh carryover positive control;
- target repeat-send rewind positive control;
- independent negative controls for each rewind-geometry requirement;
- genuine user-edit negative/control;
- clean reroll / prior EXACT control.

## 4. Frozen surfaces

No authorization is granted for:

```text
#1545 CURRENT_DEVELOPMENT drift repair
#1546 Community alias repair
#1556 repeat-send pre-snapshot performance work
REPEATED_OUT_STORAGE_LATENCY optimization
R2.11 / release-system architecture changes
SnapshotStore schema / retention changes
Deferred Mirror authority changes
provider/cache work
Core/Prompt/Broadcast/Frame/Time/Lineage/Handoff/Recurrence/Summary/Community semantics
```

No new Host read, storage operation, network operation, timer, polling, retry, persistent schema field, raw-body retention, or background worker is authorized.

## 5. Mandatory sequence

```text
1. durable authorization record on main
2. fresh main + release-simcore/source preflight
3. dedicated v0.70.8 implementation branch
4. frozen-scope implementation + direct-owner regression
5. static/permanent CI qualification
6. implementation evidence on qualified exact head
7. implementation merge to main
8. fresh append-only candidate transaction
9. exact approval + Permanent Release
10. direct release-simcore readback, latest.js == install.js
11. real long-chat validation using three-lens protocol
12. #1544 evidence close/reclassification
13. main continuity/long-term documentation synchronization
```

Any anomaly is preserved before repair and classified `WATCH / DEFER / FIX / BLOCKER`.

## 6. Tooling anomaly during authorization capture

Repeated premature `create_file` calls targeted branch `auth/simcore-07008-implementation-20260906` before the branch existed. GitHub rejected each call with HTTP 404 `Branch ... not found`.

Disposition:

```text
CLASSIFICATION = WATCH / TOOLING ORDERING / NON_RUNTIME
REPOSITORY MUTATION = NONE
PRODUCTION EXPOSURE = NONE
RECOVERY = CREATE BRANCH FIRST, THEN WRITE THE SAME AUTHORITY DOCUMENT
```

This does not alter authorization semantics.

## 7. Current disposition

```text
V07008_DESIGN = FROZEN
V07008_IMPLEMENTATION_AUTHORIZED = YES
V07008_IMPLEMENTATION = NOT YET STARTED
TARGET = #1544 ONLY
R2_11_COUPLING = FORBIDDEN
PRODUCTION = v0.70.7 UNCHANGED
release-simcore MUTATION BY THIS AUTH RECORD = NONE
```
