# SimCore live evidence — v0.66.0 Stage B genuine edit from Prior EXACT

Date: 2026-08-29

Status: **STAGE B PASS · DIRECT LIVE PROVEN · POST-REBUILD EXACT RECOVERY · 40.224S EDIT-REBUILD LATENCY WATCH · STAGE D STALE-REFRESH NEGATIVE CONTROL DIRECT · NO RUNTIME CHANGE**

Production/live-gate authority:

```text
Version: 0.66.0
Release: M2-4 Session / Runtime Mirror Boundary Completion
validation: PENDING_REAL_LONG_CHAT
live gate: 06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_REAL_LONG_CHAT
```

Primary live contract:

`docs/SIMCORE_06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_ACTIVATION.md`

Preceding v0.66.0 Stage A / staging record:

`docs/SIMCORE_LIVE_06600_STAGE_A_ORDINARY_C_STAGE_B_STAGING_STAGE_D_PREFRESH_2026-08-29.md`

Historical frozen positive-control reference:

`docs/SIMCORE_LIVE_06500_GENUINE_EDIT_PRIOR_EXACT_PASS_2026-08-28.md`

## 1. Runtime episode

The runtime generation at the actual positive control was:

```text
boot 2026-08-29T05:23:58.694Z
generation mtdxquzq-i5ii0z
```

The earlier @2349 exact staging belonged to an older generation and was therefore not used as proof after the runtime boot changed.

This new generation established fresh exact outputs:

```text
@2350 -> @2351
Output representation EXACT
mirror COMMITTED

@2352 -> @2353
Prior representation EXACT
Edit origin NONE
Output representation EXACT
mirror COMMITTED
```

The operator then manually edited the visible assistant @2353 by one character and sent the natural request @2354 `[커뮤니티] 오스카 반응` without another reload/reroll.

## 2. Required Stage B control

Frozen target:

```text
Prior EXACT
current matches neither canonical nor Fresh
-> USER_EDIT_CANDIDATE
-> MANUAL_EDIT_REBUILT
-> snapshot UPDATED
```

Direct result:

```text
request @2354 -> assistant @2355
Mode C
Probe context CURRENT TURN
Runtime ACTIVE / output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
Warnings 0

Edit reconcile MANUAL_EDIT_REBUILT · 40.224 s
snapshot UPDATED

Prior representation EXACT
mirror CANONICAL
canonical 3383:5bf181d7
fresh     3383:5bf181d7

Edit origin USER_EDIT_CANDIDATE
current 3382:1bec0fa9
match NONE

Edit delta
vs canonical -1
vs fresh     -1
shape NEW_VISIBLE_REPRESENTATION
```

Classification:

```text
06600_STAGE_B_GENUINE_EDIT_FROM_PRIOR_EXACT
= PASS
= DIRECT LIVE PROVEN
= OPERATOR EDIT -1 CHAR
= PRIOR EXACT
= CURRENT MATCH NONE
= USER_EDIT_CANDIDATE
= MANUAL_EDIT_REBUILT
= SNAPSHOT UPDATED
= NO FALSE REPRESENTATION ACCEPTANCE
```

This directly closes the v0.66.0 Stage B M2-3 positive-control regression requirement.

## 3. Post-rebuild exact recovery

The new output returns immediately to exact representation identity:

```text
Deferred mirror COMMITTED
HOST_RAW   6825:d361829
CANONICAL  3577:fd54467
FRESH_CHAT 3577:fd54467
match CANONICAL
CANONICAL <-> FRESH EXACT
Representation ownership REPRESENTATION / mirror TRANSPORT_ONLY
```

The remaining output/frame path is healthy:

```text
RAW frame volume 81 -> 81 SAME
chapter 14 -> 15 ADVANCED
Chatindex 1148 -> 1149 ADVANCED
RAW frame regression NONE
Continuity summary PASS
Frame sequence PASS
Frame guard PASS
Narrative 21:45 -> 22:00
Visible chronology PASS_OR_NOT_APPLICABLE
Warnings 0
Compatibility diagnostics 0
```

Therefore the genuine-edit rebuild did not leave the current Session/Representation/Mirror state in a degraded correctness state.

## 4. Performance anomaly — 40.224 s manual rebuild

The same request reports:

```text
request total       41.495 s
Edit Reconcile      40.224 s
request share       96.9%
onSend storage       1.213 s
output handler       4.824 s
output storage       1.949 s
telemetry host write 2.794 s
```

The v0.65.0 equivalent direct genuine-edit control was:

```text
MANUAL_EDIT_REBUILT 4.401 s
```

Thus this v0.66.0 specimen is approximately 9.14x the historical v0.65.0 positive-control rebuild duration.

Correctness is still healthy, so this packet alone does not justify weakening the conservative genuine-edit path or declaring a correctness blocker. However, 40.224 s is too large to preserve merely as generic background timing noise.

Classification:

```text
06600_GENUINE_EDIT_REBUILD_LATENCY_40_224S
= WATCH
= HIGH-SEVERITY PERFORMANCE EVIDENCE
= EDIT_RECONCILE HOTSPOT
= ~9.14X VS V0.65 DIRECT POSITIVE CONTROL
= CORRECTNESS PASS
= CAUSE NOT PROVEN
= NON_BLOCKING FOR STAGE B CORRECTNESS
```

Promotion boundary:

```text
one direct 40s specimen                       -> WATCH
repeat comparable multi-tens-of-seconds case -> promote to FIX investigation
proof of deterministic M2-4 regression       -> FIX / release-gate review
correctness/state corruption                  -> BLOCKER
```

Do not fold a latency optimization into the live-evidence work item without separate diagnosis/design.

## 5. Natural Mode A output-finalization bonus before the edit

The immediately preceding @2352 -> @2353 Mode A turn is useful M2-4 finalization evidence:

```text
Mode A
SAME_FAST / Prior EXACT / Edit origin NONE
output EXACT / mirror COMMITTED
Frame sequence PASS
Frame guard PASS
Narrative clock ADVANCED
frame 2033-03-13 16:00
intermediate 19:30
terminal 21:45
scenes 2
tail MONOTONIC / EXPLICIT_TAIL
committed 21:45
```

This strengthens Stage A beyond the earlier Mode C specimen by exercising the extracted output-finalize transaction across a multi-scene explicit terminal timestamp commit.

Classification:

```text
06600_STAGE_A_MODE_A_EXPLICIT_TAIL_FINALIZATION
= PASS / BONUS DIRECT LIVE EVIDENCE
```

## 6. THOUGHTS compatibility bonus

The same @2352 -> @2353 packet naturally reports:

```text
Compatibility diagnostics 1
Preamble provenance THOUGHTS_COMPAT
policy SAFE_ENVELOPE_COMPAT
action STRIPPED
Output representation EXACT
mirror COMMITTED
Warnings 0
```

This is useful external compatibility-path evidence. It proves that a naturally occurring Thoughts compatibility strip did not disturb the final canonical/Fresh identity or mirror commit.

It does not prove one of the rarer Runtime Mirror opaque-candidate acceptance branches, because:

```text
Envelope recovery NOT_APPLICABLE
Safe-envelope reconcile NOT_APPLICABLE
```

Classification:

```text
06600_THOUGHTS_COMPAT_STRIP_EXACT_OUTPUT
= PASS / BONUS COMPATIBILITY EVIDENCE
= NOT RARE MIRROR-CANDIDATE PROOF
```

## 7. Stage D refresh boundary — stale checkpoint negative control

Operator clarification after the diagnostic review establishes that the first supplied packet in this generation, @2350 -> @2351, was taken **immediately after an intentional same-tab refresh**. The assistant output itself was not the trigger for the generation change; the operator refresh was.

Ordered boundary:

```text
older v0.66.0 generation mtde1oph-ivsjxp
last supplied checkpoint @2348 -> @2349

operator same-tab refresh

new runtime boot 2026-08-29T05:23:58.694Z
generation mtdxquzq-i5ii0z
first natural request @2350 -> @2351
```

The first post-refresh packet reports:

```text
Telemetry continuity FRESH · host-local-stale
Host-local boot STALE
Prior representation UNAVAILABLE
Session load COLD_INIT
COMPACT_V2 3826/16384 OK
HOST_LOCAL WRITTEN
```

This is therefore direct live evidence of the **stale-checkpoint rejection branch at a real refresh boundary**.

Bounded interpretation:

```text
06600_STAGE_D_STALE_REFRESH_NEGATIVE_CONTROL
= PASS / DIRECT FAIL-CLOSED EVIDENCE
= SAME-TAB REFRESH OPERATOR CONFIRMED
= STALE HOST-LOCAL CHECKPOINT NOT ADOPTED
= FRESH RUNTIME STATE STARTED
= PRIOR REPRESENTATION UNAVAILABLE AS EXPECTED
= NEW CURRENT-VERSION CHECKPOINT WRITTEN
= NO STATE CORRUPTION OBSERVED
```

It is **not** the required Stage D compatible-adoption positive control, because the available Host-local checkpoint was stale rather than eligible. The prior supplied checkpoint was many hours earlier, so this refresh did not satisfy the intended fresh-checkpoint ordering for compatible adoption.

The new generation subsequently wrote fresh current-version Host-local checkpoints (`3826`, `3806`, `4203` chars). Therefore a later intentionally ordered refresh performed while one of those checkpoints remains within the compatibility/TTL window can still close the positive Stage D gate.

Do not classify this real refresh as a Stage D failure. It proves the negative safety branch and leaves the compatible-adoption branch pending.

## 8. Live-gate disposition after this evidence

```text
Stage A ordinary Session/finalization continuity        PASS
  + Mode A explicit-tail finalization bonus             PASS
Stage B genuine visible edit positive control           PASS
Stage C ordinary exact/safe Deferred Mirror branch      PASS
  + natural THOUGHTS compat strip exact-output bonus    PASS
Stage D stale-refresh fail-closed negative control      PASS / BONUS DIRECT
Stage D compatible same-tab reload adoption             PENDING
Stage E B lifecycle / COMMUNITY coverage                PENDING / natural coverage
```

The v0.66.0 real-long-chat gate remains open. Stage B is closed; the compatible-adoption Stage D positive control remains the important required direct regression control.