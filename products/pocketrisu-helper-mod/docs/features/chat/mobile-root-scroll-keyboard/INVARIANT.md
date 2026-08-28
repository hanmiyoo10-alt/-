# Mobile root-scroll / soft-keyboard invariant

Feature-ID: `MOBILE-ROOT-SCROLL-KEYBOARD`
Status: `HOLD — regression invariant / investigation only`

## Problem / evidence

Historical source evidence: `Nagase-Kotono/PocketRisu-kotono` commit `37ef6e3b4215d52d580e95a23b11e6ff3afdcad5` removed a global `documentElement` scroll clamp because iOS soft-keyboard focus legitimately moved the root/visual viewport and the clamp forced it back to zero, producing lift/snap-back oscillation while typing. The same source warns that removing the guard re-exposes a separate Chrome/Edge root-displacement failure mode.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: current PocketRisu reproduction / scroll-owner audit
- Priority: `P0`
- Lifecycle status: `HOLD`

## Invariants

1. Browser/OS soft-keyboard viewport motion is not equivalent to app-owned chat scrolling.
2. Do not globally clamp `documentElement.scrollTop/scrollLeft` as a universal fix for chat displacement without platform-specific evidence and acceptance tests.
3. Bookmark/search/message jumps should scroll the owning chat container directly rather than relying on root-climbing APIs when an inner scroll owner exists.
4. A fix for iOS keyboard motion must not silently reintroduce desktop Chrome/Edge root displacement.
5. Plugin/custom-CSS DOM inflation must be treated as a separate root-layout failure class, not papered over by a universal scroll clamp.

## Minimal safe scope if reproduced

INSPECT_ONLY first. Identify one concrete PocketRisu call site that can move the root or one reproducible keyboard oscillation. Prefer a local scroll-owner correction at that call site. Do not add a new global root listener as the first slice.

## Validation / acceptance

- iOS: focus composer, type rapidly, change lines, dismiss/reopen keyboard; no lift/snap-back oscillation.
- visualViewport resize/focus transitions do not fight app code.
- bookmark/search/message jump lands correctly inside the chat container.
- Chrome/Edge long generated response does not displace the document root.
- plugin/custom-CSS inflated-root case does not cause the app to become unreachable.
- no full DB flush, notification, service-manager, or storage behavior changes.

## Risk / rollback

Blast radius is UI scroll/focus only if kept local. A global listener would increase blast radius and is therefore out of scope. Roll back by reverting the isolated scroll-owner change.

## Follow-up

Remain `HOLD` until current PocketRisu reproduces a relevant failure or inspection finds a concrete root-climbing scroll path. No implementation branch/PR should be opened from historical evidence alone.
