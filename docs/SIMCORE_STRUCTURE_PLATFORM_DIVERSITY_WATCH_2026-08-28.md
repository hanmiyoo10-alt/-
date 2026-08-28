# SimCore Structure / Community Platform Diversity Watch

Date opened: 2026-08-28
Status: **DIRECT LIVE STRUCTURE WARNING · WATCH_ONLY · NON_BLOCKING · VALIDATOR WORKING · ROOT CAUSE UNPROVEN · NO RUNTIME CHANGE**

## Trigger specimen

Production/runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
request @2284 -> assistant @2285
Mode C
```

The request followed an operator manual edit of the previous assistant and a conservative `MANUAL_EDIT_REBUILT`, but the warning below belongs to the newly generated @2285 COMMUNITY output and must be classified separately from Edit Reconcile.

## Direct warning evidence

```text
Warnings: 2

COMMUNITY 1-1: 알 수 없는 플랫폼
COMMUNITY 1: 플랫폼 그룹 2개 (필요 서로 다른 3개; 감지: 여초, 남초)
```

Visible COMMUNITY sections:

```text
[맘스홀릭 / 예비맘·육아 수다방]
[더쿠 / 스퀘어]
[에펨코리아 / 포텐터진 게시판]
```

The validator therefore observes three rendered sections but recognizes only two required platform families because one rendered platform is outside the current taxonomy.

## Bounded interpretation

```text
visible COMMUNITY section count       3
recognized distinct platform families 2
required distinct platform families   3
unknown platform                       PRESENT
validator warning visibility           WORKING
```

Classification:

```text
COMMUNITY_PLATFORM_FAMILY_DIVERSITY_VIOLATION
= DIRECT VISIBLE/DIAGNOSTIC EVIDENCE
= UNKNOWN_PLATFORM + ONLY_TWO_RECOGNIZED_FAMILIES
= STRUCTURE/COMMUNITY CONTRACT SURFACE
= NON_BLOCKING FOR M2-3
= EDIT_RECONCILE ATTRIBUTION NONE
= EXACT PRODUCER CAUSE OPEN
= RUNTIME FIX AUTHORITY NONE
```

## What is not proven

Do not infer from this packet alone that the correct repair is any specific one of:

```text
add 맘스홀릭 to Community taxonomy
change prompt platform selection
relax three-family diversity requirement
map 맘스홀릭 into an existing family
rewrite Structure validator
normalize the visible platform label
```

The validator proves only that the generated visible label is not recognized by the current taxonomy and that the resulting recognized-family count is below the current requirement.

## Separation from existing Structure / Reaction watch

`docs/SIMCORE_STRUCTURE_REACTION_WATCH.md` tracks recurrent comment/reply reaction-tag contract violations and reaction normalization interaction.

This watch is different:

```text
Reaction watch   -> per-comment/reply reaction-tag shape
this watch       -> platform taxonomy / distinct-family diversity
```

Do not merge the root causes merely because both are emitted by Structure validation.

## State / representation context

The same packet reports:

```text
Output representation CANONICAL == FRESH_CHAT EXACT
Deferred mirror COMMITTED
Continuity PASS
Frame sequence PASS
Frame guard PASS
```

Therefore the platform warning is not a representation mismatch artifact.

No claim of persistent state corruption is supported by this packet.

## Promotion trigger

Promote from WATCH_ONLY to a narrow active Structure/Community investigation if another natural C/B COMMUNITY output reproduces either:

```text
unknown platform warning
or
recognized platform groups < required distinct groups
```

Preserve on recurrence:

```text
exact visible platform labels
recognized family list
required family count
Warnings detail
Mode
CANONICAL/FRESH relation
whether state is quarantined or committed
whether reroll clears or reproduces the platform choice
```

## Release discipline

Do not patch this inside:

```text
M2-3 Edit Reconcile ownership validation
Runtime Identity / Host-local telemetry closure
manual-rebuild performance research
Reaction-tag watch
```

A future fix, if evidence supports one, should be a separately attributable Community/Structure contract mini.
