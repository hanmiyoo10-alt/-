# Feature Design — Programmatic Chat Scroll Origin

Status: **DESIGN_NEEDED**
Feature-ID: `CHAT-PROGRAMMATIC-SCROLL-ORIGIN`

## Problem / evidence

Historical evidence from `PocketRisu-Alter/PocketRisu-Alter@d4c8d17931a0b662be9746ce54c0d45921f02fdd` shows a shared chat scroll container with two owners: streaming auto-follow / anchor correction performs programmatic scrolling, while a separate listener interprets any scroll event as user navigation and raises a floating scroll-navigation control. During streaming, programmatic ticks therefore kept the user-navigation overlay visible even without user input.

Evidence is `MEDIUM` for PocketRisu because the external failure is concrete but current PocketRisu ownership has not yet been reproduced.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: current PocketRisu chat scroll-owner / auto-follow / scroll-nav audit and direct reproduction
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Minimal safe scope

Only distinguish **programmatic auto-follow / anchor-correction scroll events** from deliberate user navigation for the UI effect that should react only to user navigation.

Do not redesign scrolling, paging, render windows, composer positioning, or history loading in this slice.

## Ownership boundaries

- Chat renderer / auto-follow owner: declares the bounded programmatic-scroll operation.
- Shared chat scroll container: carries or exposes the origin signal only for that operation.
- User-navigation UI listener: ignores the programmatic origin for nav visibility/timer behavior.
- Pagination / at-bottom / history-loading listeners: remain active unless direct testing proves they too are incorrectly user-only.

## Proposed mechanism

First inspect current PocketRisu. If the same coupling exists, add the narrowest origin contract available in the existing architecture, for example:

1. enter a scoped programmatic-scroll guard immediately before the scroll write;
2. dispatch/perform the scroll;
3. release the guard after the browser has delivered the corresponding event;
4. have only the user-navigation visibility effect consult that guard.

The external implementation uses a DOM dataset marker; that mechanism is evidence, not a requirement. Prefer an existing shared state/owner if PocketRisu already has one.

## Compatibility / invariants

- Real wheel/touch/keyboard/user drag scrolling must still activate user-navigation UI.
- Streaming auto-follow must continue following when the user has not opted out.
- Programmatic anchor-drift correction must continue working.
- Pagination/history loading and at-bottom detection must not be accidentally suppressed.
- Rapid user input overlapping a programmatic scroll must not be swallowed by a long-lived guard.
- No changes to DB flush, save/integrity, V3 plugin reload, runit, notifications, or system/runtime configuration.

## Validation / acceptance

1. Reproduce current behavior before modifying anything.
2. Start a streamed reply with auto-follow enabled and do not touch the scroll container.
   - Acceptance: programmatic ticks do not raise/re-arm user-only scroll navigation.
3. During streaming, perform a real wheel/touch/user scroll.
   - Acceptance: user-navigation UI appears normally and the user's break-away from auto-follow remains intact.
4. Exercise anchor correction / resize-induced scroll adjustment.
   - Acceptance: no false user-navigation activation.
5. Load older history near the paging threshold.
   - Acceptance: pagination/bottom-state logic is unchanged.
6. Verify the guard always clears after the bounded operation, including thrown/early-return paths if applicable.

## Risk / blast radius

Low if the change is restricted to UI interpretation of one scroll origin. Risk rises if a global scroll-event suppressor is introduced; do not do that.

## Rollback / fallback

Revert the origin guard and listener check as one isolated change. No persistent state or migration is involved.

## Dependencies / PR decomposition

### PR 1 — inspection + regression test

- identify current scroll container owners;
- reproduce whether auto-follow raises user-only navigation;
- add a focused regression test or deterministic harness.

### PR 2 — bounded fix, only if reproduced

- add the smallest origin signal;
- make only the user-navigation side effect ignore programmatic origin;
- run focused UI/scroll tests.

If inspection shows PocketRisu already separates these origins or lacks the conflicting UI listener, mark the idea `ADOPTED` or `SUPERSEDED` instead of implementing anything.
