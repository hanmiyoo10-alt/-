# SimCore live evidence — v0.65.0 repeat-send SAME_HOST_SNAPSHOT bonus control

Date: 2026-08-28

Status: **EXTRA LIVE SAFETY CONTROL · SAME_HOST_SNAPSHOT OBSERVED · NO GATE CHANGE · NO RUNTIME CHANGE**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2296 -> assistant @2297
Mode B_START
```

This packet was captured after the required genuine-edit positive control had already been proven and the same logical request/output slot was exercised again as a repeat-send path.

## 1. Direct repeat-send evidence

```text
Pre snapshot: REPEAT-SEND · READ HIT · 1.883 s
Edit reconcile: SAME_HOST_SNAPSHOT · 1.535 s
snapshot UNCHANGED
representation host-raw

Prior representation: EXACT
canonical 2478:e77af72e
fresh     2478:e77af72e

Edit origin: NONE
current 2477:b4483d72
match NONE
shape NEW_VISIBLE_REPRESENTATION
```

The visible prior assistant remains the previously operator-edited `-1 char` representation and therefore does not equal the older canonical/Fresh fingerprints. Nevertheless the repeat-send path reports `SAME_HOST_SNAPSHOT`, `Edit origin NONE`, and `snapshot UNCHANGED` rather than performing a second manual rebuild.

Bounded interpretation:

```text
06500_REPEAT_SEND_SAME_HOST_SNAPSHOT
= DIRECT LIVE OBSERVATION
= REPEAT-SEND READ HIT
= NO SECOND USER_EDIT_CANDIDATE
= NO SECOND MANUAL_EDIT_REBUILT
= SNAPSHOT UNCHANGED
= EXTRA SAFETY / IDEMPOTENCE-STYLE CONTROL
```

This is consistent with the runtime recognizing the already-seen host snapshot on the repeat-send path. This evidence does not by itself establish every internal matching rule or authorize changing Edit Reconcile semantics.

## 2. Output/result health

```text
Runtime ACTIVE
output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
hooks NAMED

Output representation CANONICAL == FRESH_CHAT EXACT
Warnings 0
Compatibility diagnostics 0
```

The repeated output returns to exact canonical/Fresh identity.

## 3. Cache/history control

This packet also provides an unusually clean host-history control:

```text
Prompt prefix 100.0% stable
Cache topology STABLE 47/47 messages
126,672/126,672 chars
Cache integrity STABLE
Cache break NONE
History mutation NONE
Host prefix STABLE
Runtime identity stable/slow/volatile/full SAME
SimCore contribution NO_BREAK
```

Provider cache remains `UNVERIFIED` by policy. The local host/cache observations do not prove provider behavior.

## 4. Broadcast state

```text
Broadcast lifecycle OPEN
Broadcast end authority DENIED
Stored broadcast LOCKED
Warnings 0
Frame sequence PASS
Frame guard PASS
Continuity PASS
```

The prior open-scene closure-expression warning is absent in this repeat specimen. This does not close or invalidate the separately preserved warning family; it only proves that the warning is not mandatory on every rendering of the same broad B_START scenario.

## 5. Gate relationship

The required v0.65.0 Subgate B acceptance was already closed in:

`docs/SIMCORE_LIVE_06500_SUBGATE_B_CLOSE_2026-08-28.md`

This bonus packet changes no gate state.

```text
v0.65.0 product live evidence = COMPLETE already
M2-3 checkpoint evidence      = JUSTIFIED already
this packet                    = EXTRA SAFETY EVIDENCE
release-state sync             = STILL ADMINISTRATIVE NEXT STEP
```

Do not use this bonus packet to reopen M2-3 or to mix unrelated Broadcast/Structure fixes into the release-state synchronization step.
