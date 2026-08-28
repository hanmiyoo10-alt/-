# SimCore v0.64.11 — Pre-Refresh Compaction Pass / Runtime Identity Split

Date: 2026-08-28 KST
Status: **LIVE EVIDENCE · PRE_REFRESH HOLD · BLOCKER CONFIRMED · DO NOT REFRESH**
Live gate: `06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT`
Production branch: `release-simcore`
Observed production commit: `7765ad75359f8d9736a7dea65141e4e45b713c10`
Observed production plugin blob: `cb2fe57da379f9b552f05d0f33eae9cffe498e52`

## 1. Verdict

Three consecutive natural requests from one real long-chat runtime generation prove that the v0.64.11 compact telemetry exporter and Host-local write path now satisfy the pre-refresh size/write objective:

```text
COMPACT_V2 <= 16,384
HOST_LOCAL WRITTEN
```

However, the exact released source contains a split version identity:

```text
//@version 0.64.11
const SIMCORE_RUNTIME_VERSION = '0.64.10';
const HOST_COMPAT_VERSION = '0.64.11';
```

`checkpointRuntimeTelemetry()` passes `SIMCORE_RUNTIME_VERSION` into `captureCompact()` as `sourceVersion`, while Host-local boot compatibility requires `sourceVersion === HOST_COMPAT_VERSION`.

Therefore the pre-refresh Host-local capsule being written by this production build carries:

```text
sourceVersion = 0.64.10
```

while the same released build's Host-local consumer requires:

```text
sourceVersion = 0.64.11
```

A real refresh must not be performed for gate acceptance because the written capsule is deterministically incompatible with the released consumer's version check.

Classification:

```text
06411_RUNTIME_IDENTITY_SPLIT
= BLOCKER
= FIX
= LIVE_REPRODUCED
= PRE_REFRESH_STOP
= RELEASE_BUILDER_VERSION_STAMP
= HANDOFF_COMPATIBILITY
```

This is separate from the v0.64.10 oversize defect. The compaction repair itself is live-proven at the pre-refresh boundary.

## 2. Live specimens

All three packets came from runtime generation:

```text
mtcs4wi0-lrlsg6
```

No refresh occurred between them.

### Specimen A — user @2230 / assistant @2231

```text
Version: 0.64.10
Telemetry continuity: FRESH · host-local-empty
Telemetry capsule: COMPACT_V2 · 4,152/16,384 chars
· prompt 1,381/4,096
· topology 1,968/6,144
· trajectory 489/2,048
· prompt precision LINE_BOUND
· topology precision COMPLETE_PREFIX
· OK
Session surface: WINDOW ACCESS_ERROR · GLOBAL_THIS ACCESS_ERROR · relation NONE
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 4152 chars · host 45.0 ms · 46.0 ms total · trigger OUTPUT_COMMIT
Warnings: 0
```

### Specimen B — user @2232 / assistant @2233

```text
Version: 0.64.10
Telemetry capsule: COMPACT_V2 · 4,055/16,384 chars
· prompt 1,182/4,096
· topology 2,034/6,144
· trajectory 525/2,048
· OK
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 4055 chars · host 36.0 ms · 39.0 ms total · trigger OUTPUT_COMMIT
Warnings: 0
```

### Specimen C — user @2234 / assistant @2235

```text
Version: 0.64.10
Telemetry capsule: COMPACT_V2 · 4,387/16,384 chars
· prompt 1,413/4,096
· topology 2,102/6,144
· trajectory 558/2,048
· OK
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 4387 chars · host 96.0 ms · 99.0 ms total · trigger OUTPUT_COMMIT
Warnings: 0
```

## 3. What these packets prove

### 3.1 Compaction objective — LIVE PASS at pre-refresh boundary

Observed complete capsule sizes:

```text
4,152
4,055
4,387
```

All are comfortably below the frozen 16,384-character whole-capsule limit.

Every reported component is also below its v0.64.11 engineering budget:

```text
prompt     <= 4,096
 topology   <= 6,144
 trajectory <= 2,048
```

The prior v0.64.10 real long-chat oversize values of 40,291–59,965 chars are not recurring in these specimens.

### 3.2 Host-local capability/write objective — LIVE PASS

All three packets report:

```text
API PRESENT
store USABLE
clear REMOVE
boot EMPTY
HOST_LOCAL WRITTEN
```

Unlike v0.64.10, the real Host-local write boundary is now reached and succeeds repeatedly.

### 3.3 Session fallback fact remains unchanged

All three continue to report:

```text
WINDOW ACCESS_ERROR
GLOBAL_THIS ACCESS_ERROR
relation NONE
SESSION UNAVAILABLE
```

This is expected from the previously classified v0.64.9 host capability evidence and does not invalidate the Host-local fallback result.

## 4. Exact production identity defect

The exact released plugin has metadata version:

```text
//@version 0.64.11
```

but the same production source defines:

```text
const SIMCORE_RUNTIME_VERSION = '0.64.10';
```

The Last Turn Diagnostic renders its version from `SIMCORE_RUNTIME_VERSION`, explaining the observed live header:

```text
Version: 0.64.10
```

The SimCore panel title and log prefix also consume the same stale runtime constant.

More importantly, telemetry capture uses:

```text
sourceVersion: SIMCORE_RUNTIME_VERSION
```

so the successfully written Host-local COMPACT_V2 capsule is stamped `0.64.10`.

The runtime telemetry consumer separately defines:

```text
const HOST_COMPAT_VERSION = '0.64.11';
```

and rejects a Host-local capsule unless:

```text
String(capsule.sourceVersion || '') === HOST_COMPAT_VERSION
```

Thus this is not merely a display-label defect. It directly blocks the intended Host-local reload adoption contract.

## 5. Builder cause

The v0.64.11 builder explicitly patches:

```text
//@version 0.64.10 -> //@version 0.64.11
HOST_COMPAT_VERSION 0.64.10 -> 0.64.11
```

but does not patch:

```text
SIMCORE_RUNTIME_VERSION 0.64.10 -> 0.64.11
```

The resulting released artifact therefore has three version surfaces that no longer agree.

Root-cause classification:

```text
FIX
RELEASE_BUILDER_VERSION_STAMP
RUNTIME_IDENTITY
HANDOFF_COMPATIBILITY
LIVE_GATE_BLOCKING
```

## 6. Semantic and neighboring-turn review

The three supplied current-turn RAW pairs remain semantically aligned with their user requests.

- @2230 -> @2231: community reaction about Miwoo's recovered condition is on-topic.
- @2232 -> @2233: requested stage-only performance is rendered as the stage scene.
- @2234 -> @2235: requested community reaction to that special stage is on-topic.

All three are bound and committed, representation is CANONICAL/FRESH exact, deferred mirror commits, stale drops remain zero, and no new replay symptom is established by these packets.

The middle A packet reports:

```text
Continuity summary: REPAIRED
Frame sequence: REPAIRED
Frame guard: REPAIRED · CHAPTER_TITLE_ADVANCE+CHATINDEX_SAME
```

This is preserved as a separate Frame observation. It is not attributed to telemetry compaction or version identity because the Host-local identity split is independently proven directly from released source and appears across the surrounding packets.

The PRE_SIMCORE chat-history cache breaks are likewise kept separate. Provider cache remains `UNVERIFIED`.

## 7. Gate disposition

Do not perform the same-tab refresh yet.

Current gate decomposition:

```text
COMPACT_V2 real long-chat size            PASS / LIVE PROVEN
component budgets                         PASS / LIVE PROVEN
HOST_LOCAL capability                     PASS / LIVE PROVEN
HOST_LOCAL real write                     PASS / LIVE PROVEN
runtime/manifest version identity          FAIL / SOURCE CONFIRMED
Host-local sourceVersion compatibility     FAIL / SOURCE CONFIRMED
same-tab refresh adoption                  NOT ELIGIBLE YET
second-post-refresh exact recovery         NOT TESTED
```

Overall gate remains OPEN and blocked.

The narrow next repair is to converge the released version identity surfaces so that the exact production runtime, diagnostic, capsule `sourceVersion`, Host compatibility version, and release metadata all identify the same v0.64.11-compatible build. The repair must preserve the already live-proven COMPACT_V2 shape and Host-local write behavior.

After that repair is published, restart the live sequence from a fresh pre-refresh natural request and require a correctly identified capsule before refreshing.

## 8. Non-claims

This evidence does not claim:

- same-tab reload adoption passed,
- v0.64.11 live gate closed,
- provider cache behavior is known,
- PRE_SIMCORE cache break is caused by SimCore,
- Frame repair is caused by telemetry compaction,
- M2-3 may proceed.

M2-3 remains frozen.
