# SimCore live evidence — v0.66.0 Stage D same-tab reload adoption

Date: 2026-08-29

Status: **STAGE D PASS · SAME-TAB COMPATIBLE HOST-LOCAL ADOPTION LIVE PROVEN · SECOND SAME-GENERATION RECOVERY PROVEN · NO RUNTIME CHANGE**

Primary live contract:

`docs/SIMCORE_06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_ACTIVATION.md`

Related records:

- `docs/SIMCORE_LIVE_06600_STAGE_A_ORDINARY_C_STAGE_B_STAGING_STAGE_D_PREFRESH_2026-08-29.md`
- `docs/SIMCORE_LIVE_06600_STAGE_B_GENUINE_EDIT_PASS_2026-08-29.md`

## 1. Operator boundary

The operator performed a same-tab refresh immediately before request `@2356`.

Pre-refresh generation had already written current-version bounded Host-local checkpoints, including the Stage B episode ending with:

```text
Version 0.66.0
HOST_LOCAL WRITTEN
COMPACT_V2 bounded
```

After refresh the runtime boot changed to:

```text
boot 2026-08-29T05:50:23.247Z
generation mtdyotn3-dp9pax
```

This is therefore an ordered same-tab reload episode, not an inferred runtime reset.

## 2. First post-refresh request — compatible adoption

Packet:

```text
request @2356 -> assistant @2357
Mode C
Probe context CURRENT TURN
Runtime ACTIVE / output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
hooks NAMED
```

Reload/telemetry fields:

```text
Telemetry continuity ADOPTED
via host-local
from 0.66.0
age 6m 39.2s
topology RESTORED
runtime-prefix RESTORED
trajectory RESTORED
handoff prompt LINE_BOUND
topology COMPLETE_PREFIX

Host-local transport
API PRESENT
store USABLE
clear REMOVE
boot CONSUMED

COMPACT_V2 4131/16384 OK
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

The age is inside the established 10-minute compatibility TTL, so this is a valid compatible Host-local adoption.

First-request precision is truthfully bounded:

```text
Prompt prefix >=35.5% / HANDOFF_LINE_BOUND
Handoff precision prompt LINE_BOUND / topology COMPLETE_PREFIX
```

The new generation has no prior in-memory Representation ledger, as expected:

```text
Prior representation UNAVAILABLE
Edit origin NONE
```

Current output correctness is healthy:

```text
Deferred mirror COMMITTED
CANONICAL == FRESH_CHAT
Output representation EXACT
Warnings 0
Frame sequence PASS
Frame guard PASS
Continuity summary PASS
```

Classification:

```text
06600_STAGE_D_FIRST_POST_REFRESH_ADOPTION
= PASS
= SAME-TAB OPERATOR BOUNDARY
= CURRENT-VERSION HOST_LOCAL ADOPTED
= TTL PASS / 6m39.2s < 10m
= ONE-SHOT boot CONSUMED
= TOPOLOGY/RUNTIME-PREFIX/TRAJECTORY RESTORED
= FIRST-REQUEST BOUNDED PRECISION TRUTHFUL
= FRESH CHECKPOINT WRITTEN
```

## 3. Second same-generation request — ordinary recovery

Packet:

```text
request @2358 -> assistant @2359
same boot/generation mtdyotn3-dp9pax
Mode A
LOCATION_REUSE
```

Representation returns to ordinary exact observation:

```text
Edit reconcile SAME_FAST
snapshot UNCHANGED
Prior representation EXACT
mirror CANONICAL
canonical 2729:6f4a0136
fresh     2729:6f4a0136
Edit origin NONE
current matches FRESH_CHAT
shape FRESH_EXACT_CARRYOVER

Deferred mirror COMMITTED
CANONICAL == FRESH_CHAT
Output representation EXACT
Warnings 0
```

The retained `Telemetry continuity ADOPTED` and `boot CONSUMED` fields are generation-level boot provenance. They do not indicate repeated mailbox reads.

This packet also writes another fresh bounded checkpoint:

```text
COMPACT_V2 4108/16384 OK
HOST_LOCAL WRITTEN
```

Frame/chronology result:

```text
RAW frame regression NONE
Continuity summary REPAIRED
Frame sequence REPAIRED
Frame guard REPAIRED / CHATINDEX_SAME
Narrative clock ADVANCED
```

The guard repaired an intermediate same-Chatindex condition and final visible output committed the expected `Chatindex 1151`. No final regression or state corruption is observed.

Classification:

```text
06600_STAGE_D_SECOND_SAME_GENERATION_RECOVERY
= PASS
= LOCATION_REUSE
= PRIOR EXACT
= SAME_FAST
= OUTPUT EXACT
= MIRROR COMMITTED
= FRESH CHECKPOINT WRITTEN
```

## 4. Third same-generation confirmation

Packet `@2360 -> @2361` remains in the same generation and provides an additional confirmation:

```text
LOCATION_REUSE
Prior representation EXACT
SAME_FAST
Edit origin NONE
Output representation EXACT
Deferred mirror COMMITTED
Frame sequence PASS
Frame guard PASS
Warnings 0
COMPACT_V2 4505/16384 OK
HOST_LOCAL WRITTEN
```

This confirms the repaired second-request Frame observation did not leave persistent continuity damage.

## 5. Cache/history observations

Across the episode, cache observation reports a `PRE_SIMCORE / CHAT_HISTORY` first break with `SimCore contribution NOT_FIRST_BREAK` and provider cache `UNVERIFIED`.

These remain separate cache/history WATCH observations and do not affect Stage D correctness.

## 6. Final Stage D verdict

Frozen Stage D target:

```text
pre-refresh bounded current-version checkpoint
-> same-tab refresh
-> compatible Host-local adoption
-> bounded first reobserve precision truthful
-> second same-generation request proceeds normally
-> fresh bounded checkpoint written again
```

Observed result:

```text
pre-refresh current-version Host checkpoint         PASS
same-tab operator refresh                           PASS
new runtime generation                              PASS
ADOPTED via host-local from 0.66.0                  PASS
TTL 6m39.2s < 10m                                   PASS
boot CONSUMED                                       PASS
RESTORED topology/runtime-prefix/trajectory         PASS
first-request HANDOFF_LINE_BOUND truthful           PASS
second same-generation Prior EXACT / SAME_FAST      PASS
fresh post-adoption checkpoints written             PASS
third same-generation confirmation                  PASS bonus
```

Final classification:

```text
06600_STAGE_D_RELOAD_CONTINUITY_REGRESSION
= PASS
= DIRECT LIVE PROVEN
= SAME-TAB COMPATIBLE ADOPTION
= ONE-SHOT CONSUMED
= BOUNDED HANDOFF TRUTHFUL
= EXACT SAME-GENERATION RECOVERY PROVEN
```

## 7. Live-gate disposition after Stage D

```text
Stage A ordinary Session/finalization continuity        PASS
Stage B genuine visible edit positive control           PASS
Stage C ordinary exact/safe Deferred Mirror branch      PASS
Stage D compatible same-tab reload adoption             PASS
Stage E B lifecycle / COMMUNITY coverage                PENDING / natural coverage preferred
```

The v0.66.0 real-long-chat gate remains open only for the remaining Stage E natural B-lifecycle/finalization coverage and any final release-state review required by the control plane. The existing 40.224-second genuine-edit rebuild latency remains a separate high-severity performance WATCH and is not altered by this Stage D PASS.
