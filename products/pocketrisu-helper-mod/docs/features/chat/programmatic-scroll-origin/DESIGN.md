# Feature Design — Programmatic Chat Scroll Origin

Status: **DESIGN_NEEDED**
Feature-ID: `CHAT-PROGRAMMATIC-SCROLL-ORIGIN`

## Problem / evidence

Historical evidence from `PocketRisu-Alter/PocketRisu-Alter@d4c8d17931a0b662be9746ce54c0d45921f02fdd` shows a shared chat scroll container with two owners: streaming auto-follow / anchor correction performs programmatic scrolling, while a separate listener interprets any scroll event as user navigation and raises a floating scroll-navigation control. During streaming, programmatic ticks therefore kept the user-navigation overlay visible even without user input.

Additional historical evidence from `seto-sama/PocketRisu-Kei@4c93d174280480264add1749f6adf07314585903` shows the inverse ownership failure on Firefox: application settle/alignment logic rewrote `scrollTop` while an actual wheel gesture was still being published asynchronously. Firefox can retain fractional/sub-pixel wheel movement internally; writing the current position during settle can discard pending motion, make slow wheel scrolling appear stuck, or relatch streaming to the old bottom before the browser publishes the user's upward move. The source fix keeps wheel settle read-only with respect to `scrollTop`, captures an unsnapped anchor, and ignores a late `scrollend` after the interaction already settled.

Evidence remains `MEDIUM` for PocketRisu because the external failures are concrete and complementary, but current PocketRisu ownership has not yet been reproduced.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: current PocketRisu chat scroll-owner / auto-follow / scroll-nav / wheel-settle audit and direct reproduction
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Minimal safe scope

Only distinguish **programmatic auto-follow / anchor-correction scroll work** from deliberate user navigation, and ensure a user wheel-settle path does not rewrite browser-owned pending wheel position.

Do not redesign scrolling, paging, render windows, composer positioning, or history loading in this slice.

## Ownership boundaries

- Chat renderer / auto-follow owner: declares the bounded programmatic-scroll operation.
- Shared chat scroll container: carries or exposes the origin signal only for that operation.
- User-navigation UI listener: ignores the programmatic origin for nav visibility/timer behavior.
- User wheel/touch owner: its latest motion/direction is authoritative until the interaction settles; app alignment must not overwrite pending browser motion.
- Pagination / at-bottom / history-loading listeners: remain active unless direct testing proves they too are incorrectly user-only.

## Proposed mechanism

First inspect current PocketRisu. If the same coupling exists, add the narrowest origin contract available in the existing architecture, for example:

1. enter a scoped programmatic-scroll guard immediately before an application-owned scroll write;
2. dispatch/perform the scroll;
3. release the guard after the browser has delivered the corresponding event;
4. have only user-only UI effects consult that guard;
5. on a genuine wheel settle, capture current anchor/state without rewriting `scrollTop` merely to normalize or pixel-snap it;
6. treat late `scrollend` after a fallback settle as stale rather than re-settling the idle controller.

The external implementations use particular DOM/controller mechanisms; those mechanisms are evidence, not requirements. Prefer existing PocketRisu state ownership if available.

## Compatibility / invariants

- Real wheel/touch/keyboard/user drag scrolling must still activate user-navigation UI.
- Streaming auto-follow must continue following when the user has not opted out.
- Programmatic anchor-drift correction must continue working.
- Pagination/history loading and at-bottom detection must not be accidentally suppressed.
- Rapid user input overlapping a programmatic scroll must not be swallowed by a long-lived guard.
- A wheel settle must not write `scrollTop` solely to snap/normalize a value while the browser may still own pending async/sub-pixel wheel motion.
- The latest upward wheel intent must be able to break bottom latch even if Firefox publishes the new position after a fallback settle timer.
- Late `scrollend` must not replace a preserved user anchor after the controller is already idle.
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
7. Firefox fractional-wheel regression:
   - set a fractional/non-integer effective wheel position;
   - let fallback settle run before a late `scrollend`;
   - acceptance: the user position is not rewritten/snapped away.
8. Firefox late-publication regression:
   - begin at bottom;
   - dispatch upward wheel intent;
   - let settle timer fire before the browser publishes the changed `scrollTop`;
   - acceptance: the next streaming resize does not relatch the old bottom.
9. Re-run equivalent Chrome/Samsung/browser tests so Firefox-specific handling does not weaken other engines.

## Risk / blast radius

Low if the change is restricted to UI interpretation of one scroll origin and a wheel-settle path that avoids unnecessary writeback. Risk rises if a global scroll-event suppressor or broad browser-specific fork is introduced; do not do that.

## Rollback / fallback

Revert the origin guard/listener check and any bounded wheel-settle specialization as one isolated change. No persistent state or migration is involved.

## Dependencies / PR decomposition

### PR 1 — inspection + regression tests

- identify current scroll container owners;
- reproduce whether auto-follow raises user-only navigation;
- reproduce whether PocketRisu writes `scrollTop` while user wheel input is settling;
- add focused regression tests or a deterministic harness for both failure classes.

### PR 2 — bounded fix, only if reproduced

- add the smallest origin signal;
- make only user-only effects ignore programmatic origin;
- keep genuine wheel settle read-only with respect to pending browser-owned motion;
- run focused UI/scroll tests across Firefox and the currently supported Chromium/mobile paths.

If inspection shows PocketRisu already separates these origins and does not rewrite wheel position during settle, mark the source-specific mechanisms `ADOPTED` or `SUPERSEDED` instead of implementing anything.