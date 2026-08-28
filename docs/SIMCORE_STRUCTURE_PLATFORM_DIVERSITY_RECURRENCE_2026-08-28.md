# SimCore Structure / Community platform diversity recurrence

Date: 2026-08-28

Status: **RECURRENCE DIRECTLY OBSERVED · WATCH ESCALATED TO NARROW INVESTIGATION · NON_BLOCKING FOR v0.65.0 M2-3 · NO RUNTIME CHANGE**

Parent watch:

`docs/SIMCORE_STRUCTURE_PLATFORM_DIVERSITY_WATCH_2026-08-28.md`

## Trigger

The parent watch defined a promotion trigger: another natural C/B COMMUNITY output reproducing either an unknown platform warning or fewer recognized platform families than required.

The operator-supplied natural Mode C packet @2294 -> @2295 reproduces both conditions.

## Direct recurrence evidence

```text
Version 0.65.0
Mode C
request @2294 -> assistant @2295
Warnings 2

COMMUNITY 1-2: 알 수 없는 플랫폼
COMMUNITY 1: 플랫폼 그룹 2개 (필요 서로 다른 3개; 감지: 여초, 남초)
```

Visible platforms:

```text
[더쿠 / 스퀘어]
[맘스홀릭 / 예비맘·육아 수다방]
[에펨코리아 / 포텐터진 게시판]
```

The rendered COMMUNITY again contains three visible platform sections while the validator recognizes only two platform families. `맘스홀릭 / 예비맘·육아 수다방` is again the visible label outside the recognized family set in this specimen.

## Representation / state separation

The same packet is healthy on Edit Reconcile and output identity:

```text
Edit reconcile SAME_FAST
Prior representation EXACT
Edit origin NONE
snapshot UNCHANGED
Output representation CANONICAL == FRESH_CHAT EXACT
Deferred mirror COMMITTED
Frame sequence PASS
Frame guard PASS
```

Therefore the repeated Structure warning remains separately attributable from M2-3 Edit Reconcile.

## Classification

```text
COMMUNITY_PLATFORM_FAMILY_DIVERSITY_RECURRENCE
= WATCH
= RECURRENCE PROVEN
= INVESTIGATION TRIGGERED
= ROOT CAUSE STILL UNPROVEN
= NON_BLOCKING FOR ACTIVE v0.65.0 M2-3 LIVE CLOSE
= DO NOT PATCH INSIDE M2-3
```

This is not yet promoted to FIX because direct evidence still does not establish whether the proper repair belongs to taxonomy, prompt selection, label normalization, or another Structure/Community owner.

## Next investigation boundary

After the active v0.65.0 live gate closes, a separate narrow Structure/Community investigation should compare:

```text
visible platform labels
validator taxonomy/family mapping
prompt/requested diversity contract
generated platform selection
recognized family count
quarantine/state behavior
```

Do not mix that investigation with release-system work or M2-3 ownership validation.
