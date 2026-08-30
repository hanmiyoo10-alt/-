# CHAT-READING-POSITION-ANCHOR-RESTORE — design

Status: assistant-owned design draft

## Problem / evidence

Async layout changes above the chat viewport can move the content currently being read even when the user did not scroll. Raw `scrollTop` is a poor restoration authority because the desired position is relative to logical message content, not an absolute document coordinate.

Evidence: `rpaddict/RisuBard@f1ad9f75407e48e8053908ad7ab58fa94ff5faf6` adds `chatScrollAnchor.ts`, integration into `DefaultChatScreen.svelte`, and focused tests. The source captures a visible message anchor plus relative offset, performs container-local delta correction, bypasses restoration on context/missing/stable/latest-append conditions, observes bounded DOM/media layout changes, and cancels stale work after direct user interaction.

## Minimal safe scope

Preserve the top-visible logical message and its relative viewport offset only while the same chat/window context remains active and only in an explicit preserve-reading-position mode. Correct layout drift inside the chat container; do not introduce generic page scrolling, persistence, pagination, or chat-history mutation.

## Ownership boundaries

- User input owns the viewport immediately after direct wheel/touch/pointer/keyboard scrolling; pending restoration must cancel or freeze.
- Existing live-generation/autoscroll logic owns the latest-message path when the reader is at the bottom/latest message.
- `PROGRAMMATIC-SCROLL-ORIGIN` remains the arbiter for deliberate programmatic navigation/autoscroll. Anchor restoration may run only when that owner permits preservation; it must never disguise a programmatic jump as layout correction.
- Character/chat switch and pagination/render-window changes own context identity and invalidate stale anchors.
- The anchor observes rendered message identity; it does not own message ordering, canonical storage IDs, edit semantics, or history loading.

## Mechanism

1. Capture `{contextKey, anchorIdentity, relativeOffset, atLatest, message/window generation}` from the first visible stable message element after user-owned scrolling settles.
2. On bounded layout-change signals (child-list changes, media load, known render completion), locate the same anchor inside the same context.
3. If the anchor still exists and ownership permits preservation, measure offset drift and apply only the required delta to the chat container.
4. Ignore sub-pixel/noise drift below a small threshold.
5. Retry only for a small bounded settle window; cancel on direct user interaction, context generation change, explicit programmatic-scroll ownership, or anchor disappearance.
6. If the reader was at latest and message count grows through a live reply, do not restore the old anchor; leave the live-scroll owner in charge.

Do not assume a transient render index is a durable identity across page/window/context changes. Prefer canonical message identity when PocketRisu exposes it; otherwise pair render index with a strict context/window generation and invalidate aggressively.

## Compatibility / invariants

- No forced DB flush on `visibilitychange` or `pagehide`.
- `flushServerDbKeepalive()` remains a no-op.
- No changes to save/integrity optimization, V3 plugin reload, runit, Android notifications, package/runtime migration, or storage format.
- Correction is chat-container-local; never call page-level scrolling as fallback.
- Direct user interaction cancels stale restoration.
- Latest/live append behavior is not overridden.
- Context/window changes invalidate anchors before they can write scroll position.
- Programmatic navigation and anchor restoration have explicit non-overlapping ownership.

## Validation / acceptance

Acceptance requires focused automated tests plus a current-PocketRisu reproduction matrix:

- image above viewport gains final height: same anchored message remains at the same relative offset;
- markdown/widget expansion above viewport: same result;
- no meaningful drift: no scroll call;
- anchor deleted/folded/not rendered: no guessed correction;
- character/chat switch: stale anchor does nothing;
- pagination/render-window generation change: stale anchor does nothing;
- direct user scroll during settle retries: pending correction cancels;
- user at latest + new reply: normal live-scroll semantics win;
- user reading history + new unrelated layout shift: anchor preservation may run, but must not auto-jump to bottom;
- deliberate search/jump/programmatic scroll: programmatic owner wins and anchor capture resumes only after ownership settles;
- repeated media loads: retry count/time is bounded and no observer/listener leaks remain after teardown.

## Risk / blast radius

Risk is `MEDIUM` because competing scroll owners can create visible jitter or fight user intent. Blast radius should be limited to the default chat viewport and gated preservation behavior. No storage/data migration is in scope.

## Rollback / fallback

Implementation must remain removable as one isolated feature. On unexpected owner conflicts, disable anchor restoration and fall back to current PocketRisu scroll behavior; no persisted data requires rollback. Listener/observer teardown must be complete so feature disable/revert leaves no residual behavior.

## Dependencies

- Audit the personal fork's current chat-container element and all scroll writers.
- Resolve a safe same-context anchor identity or strict window-generation identity.
- Define composition with `PROGRAMMATIC-SCROLL-ORIGIN`.
- Confirm current pagination/render-window semantics, if any, before implementation.

Unresolved dependencies keep lifecycle at `DESIGN_NEEDED`.

## PR decomposition

1. **Contract/tests only:** add pure capture/restore helper tests with synthetic container geometry and context invalidation.
2. **One chat-screen integration:** wire bounded layout signals and teardown into the default chat container behind the existing/user-facing preservation setting if PocketRisu has an equivalent; otherwise keep configuration design explicit rather than silently changing global behavior.
3. **Ownership regression tests:** direct user interaction, live/latest append, deliberate programmatic scroll, and context/window invalidation.

Do not combine pagination, continuous-history loading, retry logic, or unrelated chat cleanup in the same branch/PR.