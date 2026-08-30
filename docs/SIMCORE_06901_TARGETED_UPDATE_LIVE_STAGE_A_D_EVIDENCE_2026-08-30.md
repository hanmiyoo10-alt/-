# SimCore v0.69.1 Targeted Update Live Stage A-D Evidence

Date: 2026-08-30 KST
Status: **STAGE A-D PASS · STAGE E FULL-PAGE REFRESH PENDING · TERMINAL LIVE_PASS NOT YET AUTHORIZED**
Classification: **HUMAN REAL-LONG-CHAT / TARGETED UPDATE LIVENESS / PERFORMANCE WATCH PRESERVED**

## 1. Production authority

```text
Version: 0.69.1
Release: Refreshless Targeted Update Liveness Repair
release-simcore commit: 5dc5ec1099c6097a6a0e46effeb826889a4741c3
latest/install blob: de764f2c98174aa7f8ae8dc356d83aa6851b3745
latest.js == install.js: YES
machine validation before this packet: PENDING_REAL_LONG_CHAT
current priority: 06901_REFRESHLESS_TARGETED_UPDATE_LIVENESS_REAL_LONG_CHAT
```

Frozen live authority:

- `docs/SIMCORE_06901_REFRESHLESS_TARGETED_UPDATE_LIVENESS_REPAIR_DESIGN_2026-08-30.md`
- v0.69.0 predecessor real-long-chat evidence in `docs/SIMCORE_06900_M2_6_REAL_LONG_CHAT_EVIDENCE_2026-08-30.md`

## 2. Evidence packet

The operator supplied two consecutive v0.69.1 current-turn diagnostics from one new runtime generation:

```text
Runtime boot: 2026-08-30T01:29:10.103Z
generation: mtf4sqtz-1844dn
```

The packet is supplied in the targeted-update acceptance context. The diagnostic report can prove the new version/generation, hook/output behavior and post-update continuity; the fact that the operator used the host `+` replacement without a browser refresh is an operator action fact rather than a field independently encoded by the diagnostic format.

## 3. Stage A predecessor baseline

The immediately preceding v0.69.0 live packet already proved an ordinary healthy predecessor runtime with:

```text
Version 0.69.0
CURRENT TURN
request hook SEEN
Core handshake FOUND
output COMMITTED
binding BOUND
stale drops 0
UI parts 2
hook cleanup NAMED
```

v0.69.0 M2-6 live semantics were separately accepted before this patch release.

Stage A:

```text
PASS
```

## 4. Stage B targeted replacement outcome

The first supplied v0.69.1 specimen began only seconds after the new runtime boot and showed a new patch identity and generation:

```text
Version: 0.69.1
Runtime boot: 2026-08-30T01:29:10.103Z
generation: mtf4sqtz-1844dn
Reload safety: ARMED
epoch 1
stale drops 0
UI parts 2
hook cleanup NAMED
```

There was no duplicate UI symptom, no stale-generation commit, no missing-module/bootstrap exception, and no apparent replacement hang surfaced in the accepted post-update request.

Cross-version telemetry correctly failed closed:

```text
Telemetry continuity: FRESH / host-local-incompatible
Host-local boot: INCOMPATIBLE
```

This is expected after `HOST_COMPAT_VERSION` changed from 0.69.0 to 0.69.1 and is explicitly allowed by the frozen design.

Stage B:

```text
PASS in operator targeted-update context
new version active = YES
new generation active = YES
UI duplication symptom = NONE
old-version active symptom = NONE
page refresh requirement = NOT INDICATED BY PACKET / OPERATOR-ACTION AUTHORITY
```

## 5. Stage C first natural request after replacement

Specimen:

```text
user @2512 -> assistant @2513
Mode C
```

Observed:

```text
Probe context: CURRENT TURN
Request hook: SEEN
Core handshake: FOUND
Runtime: ACTIVE / output COMMITTED
binding: BOUND
mirror: COMMITTED
stale drops: 0
hooks: NAMED
Warnings: 0
```

Hook activity was exactly one request and one output for the new generation at this point:

```text
Hook activity: request 1 / output 1
```

This is strong live evidence against duplicate processing after replacement.

State behavior:

```text
Session load: COLD_INIT
Edit reconcile: SAME_FAST
snapshot: UNCHANGED
Deferred mirror: COMMITTED
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS
Evidence mode: DUAL
root fence: APPLIED
source fence: APPLIED
```

The cold Core initialization is acceptable because telemetry capsules are not Core semantic state authority. The request still reconstructed coherent lineage/frame/evidence state from the current chat and committed normally.

OUTPUT_COMMIT durable telemetry also remained intact, directly exercising the path v0.69.1 was required not to regress:

```text
Session surface: WINDOW ACCESS_ERROR / GLOBAL_THIS ACCESS_ERROR
Host-local transport: API PRESENT / store USABLE
Telemetry checkpoint: HOST_LOCAL WRITTEN
trigger: OUTPUT_COMMIT
host write: 746 ms
```

Stage C:

```text
PASS
```

## 6. Stage D second same-generation request

Specimen:

```text
user @2514 -> assistant @2515
same generation mtf4sqtz-1844dn
Mode C
```

Observed:

```text
CURRENT TURN
request hook SEEN
Core handshake FOUND
Runtime ACTIVE / output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
Warnings 0
Session load LOCATION_REUSE
Edit reconcile SAME_FAST
Prior representation EXACT
current match FRESH_CHAT
snapshot UNCHANGED
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

Hook activity advanced exactly once again:

```text
previous: request 1 / output 1
current:  request 2 / output 2
```

No double request/output processing and no duplicate UI symptom appeared.

OUTPUT_COMMIT Host-local durability remained functional:

```text
HOST_LOCAL WRITTEN
trigger OUTPUT_COMMIT
host write 123 ms
```

Stage D:

```text
PASS
```

## 7. Performance observations

The patch target is liveness correctness, not long-chat storage optimization.

The first post-update request was expensive:

```text
handshake total: 1.526 s
character load: 1.456 s
turn storage: 2.602 s
post-onSend: 4.815 s
request done: 8.947 s
output storage: 1.513 s
```

The second request improved materially but storage remained elevated:

```text
request done: 1.044 s
turn storage: 939 ms
output storage: 857 ms
```

Classification:

```text
WATCH · LONG_CHAT_STORAGE / COLD_INIT COST
V06901 CAUSALITY = NOT ESTABLISHED
TARGETED UPDATE LIVENESS FAILURE = NO
```

Do not fold this into the v0.69.1 correctness patch.

## 8. Cache/history observation

Second turn reports:

```text
Cache integrity: DEGRADED
Cache break: PRE_SIMCORE / CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
History stabilization: OBSERVE_ONLY
provider cache: UNVERIFIED
```

Classification remains the existing separate WATCH/DEFER lane.

## 9. Acceptance matrix so far

```text
Stage A predecessor baseline                    PASS
Stage B genuine targeted replacement context   PASS by operator action + new runtime evidence
Stage C first post-update natural request       PASS
Stage D second same-generation request          PASS
OUTPUT_COMMIT Host-local durability             PASS
Duplicate request/output symptom                NONE
Duplicate UI symptom                            NONE
Stale-generation commit symptom                 NONE
0.69.1 attributable FIX/BLOCKER                 NONE OBSERVED
Stage E ordinary full-page refresh              PENDING
```

## 10. Why terminal LIVE_PASS remains pending

The frozen v0.69.1 design requires one final ordinary browser/page refresh after at least one successful v0.69.1 OUTPUT_COMMIT.

Purpose:

```text
prove removing Host-local work from targeted UNLOAD did not regress the existing OUTPUT_COMMIT -> reload continuity contract
```

Accepted Stage-E outcomes include valid Host-local adoption, another legitimate non-fresh Core session source, or truthful safe fail-closed telemetry, provided the first post-refresh natural request and the following normal request remain coherent.

Therefore:

```text
V06901_TARGETED_UPDATE_A_D = PASS
V06901_STAGE_E = PENDING
V06901_TERMINAL_LIVE_PASS = NOT YET
```

No production mutation or terminal release-state convergence is authorized by this evidence document.
