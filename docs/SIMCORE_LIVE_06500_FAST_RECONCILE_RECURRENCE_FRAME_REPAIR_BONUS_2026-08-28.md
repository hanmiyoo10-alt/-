# SimCore live evidence — v0.65.0 repeated fast reconcile + frame repair bonus

Date: 2026-08-28

Status: **BONUS RECURRENCE · REPRESENTATION FAST RECONCILE REPRODUCED · FRAME SELF-REPAIR OBSERVED · NEW OUTPUT MISMATCH CREATED · NO GATE REOPEN**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2320 -> assistant @2321
Mode C
```

This packet was supplied after the v0.65.0 Subgate A and Subgate B live acceptance set had already been closed. It is bonus recurrence evidence only and does not add a new required gate.

## 1. Representation fast reconcile reproduced

The request entered with a prior output representation mismatch:

```text
Prior representation: OUTPUT_MISMATCH
mirror MISMATCH
canonical 5482:91487938
fresh     5386:693b55a8
```

The current visible previous assistant matched the recorded Fresh representation exactly:

```text
current 5386:693b55a8
match FRESH_CHAT
vs canonical -96
vs fresh +0
shape FRESH_EXACT_CARRYOVER
```

The extracted M2-3 owner again selected the frozen fast path:

```text
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 1.0 ms
snapshot UNCHANGED
```

Classification:

```text
06500_M2_3_FAST_RECONCILE_RECURRENCE
= PASS BONUS
= SECOND NATURAL RECURRENCE AFTER GATE CLOSE
= EXACT FRESH CARRYOVER
= NO FALSE USER_EDIT_CANDIDATE
= NO MANUAL REBUILD
= SNAPSHOT UNCHANGED
```

This materially strengthens the earlier one-off fast-reconcile acceptance specimen by showing the same routing can recur later in the same long-chat runtime.

## 2. Current output creates another natural mismatch

The new output itself then records:

```text
Deferred mirror: OUTPUT_MISMATCH
CANONICAL  6994:1ab03ab
FRESH_CHAT 6718:5a9585a
match MISMATCH
CANONICAL <-> FRESH delta -276 chars
```

This is a fresh natural mismatch specimen after a successful request-side fast reconcile. No unsafe mirror commit occurred.

Classification:

```text
CURRENT_OUTPUT_MISMATCH_AFTER_FAST_RECONCILE
= OBSERVED
= SAFE CONSERVATIVE MIRROR BLOCK
= NOT A FAILURE OF THE REQUEST-SIDE FAST RECONCILE
= NEW OPTIONAL FAST-RECONCILE OPPORTUNITY IF NEXT NATURAL REQUEST PRESERVES FRESH
```

Because the v0.65.0 gate is already closed, the next-turn opportunity is optional bonus evidence only.

## 3. Frame self-repair observed

The same packet reports:

```text
RAW frame continuity:
volume 80 -> 80 SAME
chapter 11 -> 12 ADVANCED
Chatindex 1131 -> 1132 ADVANCED
RAW frame regression NONE

Continuity summary: REPAIRED
Frame sequence: REPAIRED
Frame guard: REPAIRED · CHAPTER_TITLE_ADVANCE+CHATINDEX_SAME
```

The visible output is emitted as:

```text
volume 80
chapter 12
Chatindex 1132
```

Therefore the runtime did not leave the detected chapter/title/index inconsistency unresolved.

Bounded classification:

```text
06500_FRAME_REPAIR_LATE_LONG_CHAT
= DIRECT SELF-REPAIR OBSERVATION
= FINAL FRAME ADVANCEMENT CORRECT
= RAW REGRESSION NONE
= NO BLOCKING CONTINUITY FAILURE
```

This packet alone does not prove the exact upstream producer of the pre-guard inconsistency, so no source-changing FIX is authorized from this observation.

## 4. Cache/history observation remains separate

The packet also reports:

```text
Cache trajectory REGRESSED
frontier 37 -> 10
Cache break PRE_SIMCORE / CHAT_HISTORY
Host prefix SAME_FAMILY
SimCore contribution NOT_FIRST_BREAK
provider cache UNVERIFIED
```

Classification:

```text
LATE_LONG_CHAT_CACHE_TOPOLOGY_REGRESSION
= WATCH
= PRE_SIMCORE FIRST BREAK
= NO SIMCORE CAUSALITY PROVEN
= NO M2_3 CORRECTNESS FAILURE
```

Do not merge this with Representation or Frame attribution.

## 5. Other health signals

```text
binding BOUND
output COMMITTED
stale drops 0
hooks NAMED
Warnings 0
Compatibility diagnostics 0
Telemetry COMPACT_V2 4156/16384 OK
HOST_LOCAL WRITTEN
Frame guard final REPAIRED
Visible chronology PASS_OR_NOT_APPLICABLE
```

No new blocker is established.

## 6. Gate disposition

Existing authoritative close remains:

```text
v0.65.0 Subgate A PASS
v0.65.0 Subgate B PASS
M2-3 live acceptance COMPLETE
product live-evidence set COMPLETE
```

This packet adds:

```text
fast reconcile natural recurrence       BONUS PASS
frame self-repair                       BONUS POSITIVE
new output mismatch                     OBSERVATION / optional next-turn specimen
cache topology contraction              WATCH / PRE_SIMCORE
```

No release gate is reopened and no runtime change is authorized by this bonus evidence.
