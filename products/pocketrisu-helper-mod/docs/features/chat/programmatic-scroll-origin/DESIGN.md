# Feature Design — Programmatic Chat Scroll Origin

Status: **DESIGN_NEEDED**
Feature-ID: `CHAT-PROGRAMMATIC-SCROLL-ORIGIN`

## Problem / evidence

Historical evidence from `PocketRisu-Alter/PocketRisu-Alter@d4c8d17931a0b662be9746ce54c0d45921f02fdd` shows a shared chat scroll container with two owners: streaming auto-follow / anchor correction performs programmatic scrolling, while a separate listener interprets any scroll event as user navigation and raises a floating scroll-navigation control. During streaming, programmatic ticks therefore kept the user-navigation overlay visible even without user input.

Additional historical evidence from `seto-sama/PocketRisu-Kei@4c93d174280480264add1749f6adf07314585903` shows the inverse ownership failure on Firefox: application settle/alignment logic rewrote `scrollTop` while an actual wheel gesture was still being published asynchronously. Firefox can retain fractional/sub-pixel wheel movement internally; writing the current position during settle can discard pending motion, make slow wheel scrolling appear stuck, or relatch streaming to the old bottom before the browser publishes the user's upward move. The source fix keeps wheel settle read-only with respect to `scrollTop`, captures an unsnapped anchor, and ignores a late `scrollend` after the interaction already settled.

Forward evidence from `nevaeh5379/HaejeokRisuai@403a067465850e441c3f61e5802484302c1dfc3d` shows a third form of the same ownership bug family. Its BTW panel reacts to latest-message/message-count changes, waits for Svelte `tick()`, and then unconditionally assigns `messagesElement.scrollTop = messagesElement.scrollHeight`. This is acceptable only while application auto-follow still owns the viewport. If a user has intentionally scrolled upward to read history, message arrival must not silently reclaim that ownership and force the viewport to the bottom.

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

Only distinguish **programmatic auto-follow / anchor-correction scroll work** from deliberate user navigation, ensure a user wheel-settle path does not rewrite browser-owned pending wheel position, and ensure message-arrival auto-follow writes occur only while the viewport is still owned by the follow state.

Do not redesign scrolling, paging, render windows, composer positioning, or history loading in this slice.

## Ownership boundaries

- Chat renderer / auto-follow owner: declares the bounded programmatic-scroll operation and whether follow ownership is still valid.
- Shared chat scroll container: carries or exposes the origin signal only for that operation.
- User-navigation UI listener: ignores the programmatic origin for nav visibility/timer behavior.
- User wheel/touch owner: its latest motion/direction is authoritative until the interaction settles; app alignment must not overwrite pending browser motion.
- Message-arrival owner: may scroll to bottom only when the user remains in the explicit/derived auto-follow state; message arrival alone does not grant viewport ownership.
- Pagination / at-bottom / history-loading listeners: remain active unless direct testing proves they too are incorrectly user-only.

## Proposed mechanism

First inspect current PocketRisu. If the same coupling exists, add the narrowest origin contract available in the existing architecture, for example:

1. enter a scoped programmatic-scroll guard immediately before an application-owned scroll write;
2. dispatch/perform the scroll;
3. release the guard after the browser has delivered the corresponding event;
4. have only user-only UI effects consult that guard;
5. on a genuine wheel settle, capture current anchor/state without rewriting `scrollTop` merely to normalize or pixel-snap it;
6. treat late `scrollend` after a fallback settle as stale rather than re-settling the idle controller;
7. maintain an explicit or derivable `shouldFollowBottom`/equivalent ownership state and gate new-message bottom writes on it;
8. clear/suspend follow ownership immediately on genuine upward wheel/touch/drag/keyboard navigation, and only reacquire it through an existing deliberate bottom-return rule rather than merely because another message arrived.

The external implementations use particular DOM/controller mechanisms; those mechanisms are evidence, not requirements. Prefer existing PocketRisu state ownership if available.

## Compatibility / invariants

- Real wheel/touch/keyboard/user drag scrolling must still activate user-navigation UI.
- Streaming auto-follow must continue following when the user has not opted out.
- A user who intentionally moves upward must retain viewport ownership across subsequent streamed/message-arrival updates until the established follow-reacquisition condition is met.
- Message arrival by itself must never be treated as permission to reclaim bottom ownership.
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
   - Acceptance: programmatic ticks do not raise/re-arm user-only scroll navigation and the viewport follows normally.
3. During streaming, perform a real wheel/touch/user scroll upward.
   - Acceptance: user-navigation UI appears normally and the user's break-away from auto-follow remains intact.
4. While still above bottom, append/stream additional messages.
   - Acceptance: message-count or DOM updates do not force `scrollTop` back to `scrollHeight`.
5. Deliberately return to the bottom using the existing supported interaction.
   - Acceptance: follow ownership is reacquired and later messages can auto-follow again.
6. Exercise anchor correction / resize-induced scroll adjustment.
   - Acceptance: no false user-navigation activation.
7. Load older history near the paging threshold.
   - Acceptance: pagination/bottom-state logic is unchanged.
8. Verify the guard always clears after the bounded operation, including thrown/early-return paths if applicable.
9. Firefox fractional-wheel regression:
   - set a fractional/non-integer effective wheel position;
   - let fallback settle run before a late `scrollend`;
   - acceptance: the user position is not rewritten/snapped away.
10. Firefox late-publication regression:
   - begin at bottom;
   - dispatch upward wheel intent;
   - let settle timer fire before the browser publishes the changed `scrollTop`;
   - acceptance: the next streaming resize/message update does not relatch the old bottom.
11. Re-run equivalent Chrome/Samsung/browser tests so Firefox-specific handling does not weaken other engines.

## Risk / blast radius

Low if the change is restricted to UI interpretation of one scroll origin, a wheel-settle path that avoids unnecessary writeback, and a bounded auto-follow ownership gate. Risk rises if a global scroll-event suppressor, broad browser-specific fork, or new independent scroll state machine is introduced; do not do that.

## Rollback / fallback

Revert the origin guard/listener check, bounded follow-ownership gate, and any wheel-settle specialization as one isolated change. No persistent state or migration is involved.

## Dependencies / PR decomposition

### PR 1 — inspection + regression tests

- identify current scroll container owners;
- reproduce whether auto-follow raises user-only navigation;
- reproduce whether PocketRisu writes `scrollTop` while user wheel input is settling;
- reproduce whether message arrival can reclaim bottom after deliberate user break-away;
- add focused regression tests or a deterministic harness for these failure classes.

### PR 2 — bounded fix, only if reproduced

- add the smallest origin signal;
- make only user-only effects ignore programmatic origin;
- gate message-arrival bottom writes on existing/derived follow ownership;
- keep genuine wheel settle read-only with respect to pending browser-owned motion;
- run focused UI/scroll tests across Firefox and the currently supported Chromium/mobile paths.

If inspection shows PocketRisu already separates these origins, preserves user break-away across message arrival, and does not rewrite wheel position during settle, mark the source-specific mechanisms `ADOPTED` or `SUPERSEDED` instead of implementing anything.