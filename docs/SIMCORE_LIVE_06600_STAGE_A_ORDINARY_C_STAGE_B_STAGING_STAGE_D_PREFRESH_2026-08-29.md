# SimCore live evidence — v0.66.0 Stage A ordinary C + Stage B/D staging

Date: 2026-08-29

Status: **STAGE A PASS · STAGE C ORDINARY EXACT/SAFE BRANCH PASS · STAGE B ELIGIBLE EXACT STAGING · STAGE D PREFRESH CHECKPOINT READY · WATCHES NON_BLOCKING · NO RUNTIME CHANGE**

Production/live-gate authority at review time:

```text
Version: 0.66.0
Release: M2-4 Session / Runtime Mirror Boundary Completion
release-simcore commit: 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
validation: PENDING_REAL_LONG_CHAT
live gate: 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT
```

Primary contract:

`docs/SIMCORE_06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_ACTIVATION.md`

Operator packet:

```text
runtime boot 2026-08-28T20:12:31.445Z
generation mtde1oph-ivsjxp
request @2348 -> assistant @2349
Mode C
```

## 1. Stage A — ordinary Session/finalization continuity

The frozen Stage A plan requires a natural v0.66.0 request with bound/committed/safe output, semantically correct RAW input/output, appropriate Frame/chronology, bounded COMPACT_V2 and healthy Host-local checkpoint. At least one clean ordinary forward request must also show `SAME_FAST / Prior EXACT / Edit origin NONE`.

Direct packet:

```text
Version 0.66.0
Probe context CURRENT TURN
Runtime ACTIVE / output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
hooks NAMED

Edit reconcile SAME_FAST · 1.0 ms
snapshot UNCHANGED
Prior representation EXACT
canonical 2556:c6fb7632
fresh     2556:c6fb7632
Edit origin NONE
current 2556:c6fb7632
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

Output-side identity is exact:

```text
Deferred mirror COMMITTED
CANONICAL  2930:24fdc44
FRESH_CHAT 2930:24fdc44
match CANONICAL
Output representation EXACT
Representation owner REPRESENTATION / mirror TRANSPORT_ONLY
```

Frame/time/semantic continuity:

```text
RAW frame continuity volume 81->81 SAME
chapter 11->12 ADVANCED
Chatindex 1145->1146 ADVANCED
RAW frame regression NONE
Continuity summary PASS
Frame sequence PASS
Frame guard PASS
Narrative clock ADVANCED
2033-02-06 02:00 PM -> 2033-02-18 06:00 PM
Visible chronology PASS_OR_NOT_APPLICABLE
```

The RAW user asks for community evaluation of a fourth domestic game OST with a buoyant beat and keyboard-typing sound motif. The output directly covers the game OST, typing-sound rhythmic device, upbeat/trendy character and vocal-genre flexibility. No unrelated-source replay is visible.

Telemetry checkpoint:

```text
COMPACT_V2 4958/16384 OK
prompt 1413/4096
topology 2785/6144
trajectory 450/2048
MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
```

Classification:

```text
06600_STAGE_A_ORDINARY_SESSION_FINALIZATION
= PASS
= DIRECT LIVE PROVEN
= NATURAL MODE C
= SAME_FAST / PRIOR EXACT / ORIGIN NONE
= OUTPUT EXACT / MIRROR COMMITTED
= FRAME AND CHRONOLOGY HEALTHY
= BOUNDED CHECKPOINT HEALTHY
```

## 2. Stage C — ordinary Deferred Mirror branch

Stage C requires ordinary natural outputs to retain bounded Fresh observation, mirror commit when exact/safe, and no stale/superseded unsafe apply.

This packet directly gives:

```text
Fresh exact against canonical
Deferred mirror COMMITTED
stale drops 0
binding remains BOUND
output remains COMMITTED
```

Classification:

```text
06600_STAGE_C_ORDINARY_EXACT_SAFE_MIRROR
= PASS
= DIRECT LIVE PROVEN
```

This does not claim a naturally occurring rare Output Compat compatibility-candidate path. The activation contract explicitly keeps permanent differential fixtures primary for rare branches and does not require manufacturing malformed output.

## 3. Stage B — exact staging is ready, positive control not yet executed

Current output @2349 ends exact:

```text
CANONICAL == FRESH_CHAT
Output representation EXACT
Deferred mirror COMMITTED
```

Therefore @2349 is an eligible prior output for the required Stage B genuine visible edit control.

Next target:

```text
manually edit assistant @2349 so visible current matches neither canonical nor Fresh
-> send one ordinary natural request without reroll/reload
-> Prior representation EXACT
-> current match NONE
-> USER_EDIT_CANDIDATE
-> MANUAL_EDIT_REBUILT
-> snapshot UPDATED
```

Recommended order: execute Stage B before the Stage D refresh, because a runtime reload resets the memory-only Representation ledger and would remove the clean current `Prior EXACT` staging opportunity.

## 4. Stage D — current packet is a pre-refresh checkpoint, not adoption proof

The packet reports:

```text
Telemetry continuity FRESH · host-local-incompatible
Host-local boot INCOMPATIBLE
HOST_LOCAL WRITTEN
COMPACT_V2 4958/16384 OK
```

The established Host-local contract treats `boot INCOMPATIBLE` as the boot disposition of the checkpoint available when this runtime generation started; it is not a statement that the newly written current-version checkpoint is incompatible.

Because a fresh v0.66.0 checkpoint is now written, this packet can serve as the Stage D pre-refresh anchor.

Stage D still requires a later ordered episode:

```text
this v0.66.0 pre-refresh checkpoint
-> same-tab refresh
-> first natural request: compatible Host-local adoption / bounded precision truthful
-> second same-generation natural request: normal continuation
-> fresh bounded checkpoint written again
```

Classification:

```text
06600_STAGE_D_PREFRESH_CHECKPOINT
= READY / DIRECT
06600_STAGE_D_RELOAD_ADOPTION
= NOT YET EXERCISED BY THIS PACKET
```

## 5. Performance observation

Request-side Store write dominates this turn:

```text
request total 2.190 s
onSend storage 2.027 s
Turn storage 24,315 chars
request hotspot TURN_STORAGE 92.6%
```

Output side:

```text
output process storage 624 ms
output hotspot OUT_STORAGE 83.0%
```

Correctness remains healthy. Classification:

```text
06600_STORAGE_LATENCY
= WATCH
= PERFORMANCE EVIDENCE
= CAUSE NOT PROMOTED
= NON_BLOCKING FOR STAGE A/C CORRECTNESS
```

## 6. Cache / host-prefix reset observation

The packet also reports a full local prefix collapse:

```text
Cache topology COMMON_PREFIX 0/68
0/566843 chars
Cache break PRE_SIMCORE / HOST_PREFIX @0
Host prefix DELTA_LOCALIZED / SIZE_SHIFT_LOCALIZED / MEDIUM
system 396514 -> 399857 chars / +3343
family 8ec70a41 -> 174571e7 / RESET_CORRELATED
SimCore contribution NOT_FIRST_BREAK
provider cache UNVERIFIED
```

This is a substantial observer/cache-topology reset, but direct evidence places the first break in the host prefix before SimCore and does not establish SimCore causality.

Classification:

```text
06600_HOST_PREFIX_FAMILY_RESET_CACHE_COLLAPSE
= WATCH
= PRE_SIMCORE FIRST BREAK
= HOST PREFIX SIZE SHIFT CORRELATED
= SIMCORE CAUSALITY NOT PROVEN
= PROVIDER CACHE UNVERIFIED
= NO STAGE A/C CORRECTNESS FAILURE
```

## 7. Gate disposition after this packet

```text
Stage A ordinary Session/finalization continuity        PASS
Stage B genuine visible edit positive control            PENDING / staging ready at @2349
Stage C ordinary exact/safe Deferred Mirror branch       PASS
Stage D compatible same-tab reload adoption               PENDING / pre-refresh checkpoint ready
Stage E B lifecycle / COMMUNITY coverage when available   PENDING / natural availability preferred
```

No blocker is established by this packet. Do not close the v0.66.0 real-long-chat gate yet; Stage B and Stage D remain direct required controls, with Stage E to be covered naturally according to the frozen live plan.
