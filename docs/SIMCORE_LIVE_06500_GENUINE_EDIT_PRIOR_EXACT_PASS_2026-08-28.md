# SimCore live evidence — v0.65.0 genuine edit from Prior EXACT

Date: 2026-08-28

Status: **DIRECT LIVE PASS · FINAL REQUIRED M2-3 GENUINE-EDIT CONTROL CLOSED · NO RUNTIME CHANGE**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2296 -> assistant @2297
Mode B_START
```

## 1. Required frozen control

Target:

```text
Prior representation EXACT
current matches neither canonical nor Fresh
→ Edit origin USER_EDIT_CANDIDATE
→ Edit reconcile MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

The preceding eligible output @2295 had already been preserved in:

`docs/SIMCORE_LIVE_06500_GENUINE_EDIT_EXACT_STAGING_2026-08-28.md`

with:

```text
CANONICAL == FRESH_CHAT
Output representation EXACT
Deferred mirror COMMITTED
```

The operator then manually changed the visible prior assistant by one character and sent the next natural request without reroll or reload.

## 2. Direct request-side result

The diagnostic reports:

```text
Edit reconcile: MANUAL_EDIT_REBUILT · 4.401 s
snapshot UPDATED

Prior representation: EXACT
mirror CANONICAL
canonical 2478:e77af72e
fresh     2478:e77af72e

Edit origin: USER_EDIT_CANDIDATE
current 2477:b4483d72
match NONE

Edit delta:
vs canonical -1
vs fresh     -1
shape NEW_VISIBLE_REPRESENTATION
```

Classification:

```text
06500_M2_3_GENUINE_EDIT_FROM_PRIOR_EXACT
= PASS
= DIRECT LIVE PROVEN
= OPERATOR EDIT -1 CHAR
= PRIOR EXACT
= CURRENT MATCH NONE
= USER_EDIT_CANDIDATE
= MANUAL_EDIT_REBUILT
= SNAPSHOT UPDATED
= NO FALSE FRESH-ALIAS ACCEPTANCE
```

This is the exact final positive control required by the frozen M2-3 acceptance contract.

## 3. Post-rebuild output recovery

The new output returned to exact representation identity:

```text
Deferred mirror COMMITTED
CANONICAL  4430:2cfc541
FRESH_CHAT 4430:2cfc541
match CANONICAL
Output representation EXACT
```

The output was committed and bound with stale drops 0.

## 4. Performance observation

The required conservative rebuild cost:

```text
request total 5.417 s
Edit Reconcile 4.401 s
share 81.2%
```

This is direct long-chat boundary-latency evidence but not a correctness failure. Do not weaken genuine-edit rebuild safety from this datapoint.

Classification:

```text
GENUINE_EDIT_REBUILD_LATENCY_4_401S
= PERFORMANCE EVIDENCE
= NON_BLOCKING FOR M2-3 CORRECTNESS
```

## 5. Separate B_START warning

The same packet reports:

```text
Warnings 1
열린 방송 장면에 종결 표현이 있음
Broadcast lifecycle OPEN
Broadcast end authority DENIED
Stored broadcast LOCKED
```

The visible response used an episode-ending phrase while the user explicitly opened a broadcast and the runtime correctly kept B_START open.

This warning is not attributed to Edit Reconcile. The exact warning family was already observed in the v0.64.1 B_START evidence and classified as a conservative wording/heuristic WATCH with no lifecycle state harm because the broadcast remained OPEN and subsequent turns could continue.

Current classification:

```text
B_START_OPEN_SCENE_CLOSURE_EXPRESSION_RECURRENCE
= WATCH
= KNOWN WARNING FAMILY
= LIFECYCLE STATE REMAINS OPEN/LOCKED
= NO M2-3 ATTRIBUTION
= NON_BLOCKING FOR THIS EDIT-RECONCILE CONTROL
```

Preserve it for the separate Broadcast/Structure quality ledger; do not patch it inside M2-3 ownership validation.

## 6. Control verdict

```text
Prior EXACT                           PASS
operator-created distinct visible rep PASS
current match NONE                    PASS
USER_EDIT_CANDIDATE                   PASS
MANUAL_EDIT_REBUILT                   PASS
snapshot UPDATED                      PASS
new output exact + mirror committed   PASS
```

The final required M2-3 genuine-edit positive control is closed.