# SimCore live evidence — v0.65.0 genuine-edit exact staging

Date: 2026-08-28

Status: **STAGING READY · PRIOR/OUTPUT EXACT PROVEN · GENUINE-EDIT POSITIVE CONTROL NOT YET EXECUTED · NO RUNTIME CHANGE**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
```

This record preserves the operator-supplied packets immediately before the final required M2-3 genuine manual-edit positive control.

## Packet A — @2292 -> @2293

```text
Mode C
Edit reconcile SAME_FAST · 1.0 ms
snapshot UNCHANGED
Prior representation EXACT
canonical 2043:1da8a801
fresh     2043:1da8a801
Edit origin NONE
current 2043:1da8a801
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER

Output representation CANONICAL == FRESH_CHAT EXACT
Deferred mirror COMMITTED
Warnings 0
Frame sequence PASS
Frame guard PASS
```

This is a clean exact-carryover control after the previously proven representation-fast-reconcile episode.

## Packet B — @2294 -> @2295

```text
Mode C
Edit reconcile SAME_FAST · 0.0 ms
snapshot UNCHANGED
Prior representation EXACT
canonical 2630:655e222a
fresh     2630:655e222a
Edit origin NONE
current 2630:655e222a
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER

Output provenance:
CANONICAL 2478:e77af72
FRESH_CHAT 2478:e77af72
match CANONICAL
Output representation EXACT
Deferred mirror COMMITTED
```

The current assistant output @2295 therefore ends in exact canonical/Fresh identity and is an eligible starting representation for the final genuine-edit control.

## Required operator action

Before sending the next natural request in the target long chat:

```text
manually edit assistant @2295
→ change visible content so it matches neither recorded canonical nor Fresh
→ do not reroll
→ do not reload
→ send one ordinary natural request
→ capture full diagnostic
```

Target result:

```text
Prior representation EXACT
current match NONE
Edit origin USER_EDIT_CANDIDATE
Edit reconcile MANUAL_EDIT_REBUILT
snapshot UPDATED
```

The edit should remain a true visible user/operator edit. A tiny punctuation/text change is sufficient if it creates a distinct representation.

## Gate disposition

```text
Subgate A                                      PASS
ordinary exact carryover                       PASS
natural mismatch -> representation fast path   PASS
final genuine edit from Prior EXACT            PENDING
M2-3 Subgate B                                 PENDING only this final control
```

No v0.65.0 checkpoint advancement is authorized until the post-edit packet is reviewed.

The separate Structure/Community warning in @2295 is not an Edit Reconcile failure and is tracked independently.
