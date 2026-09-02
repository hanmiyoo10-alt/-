# Feature-ID: FIRST-MESSAGE-SELECTION-INDEX-NORMALIZATION

## Classification

- System impact: NO_SYSTEM_UPDATE
- Importance: MEDIUM
- Difficulty: LOW
- Size: XS
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: NONE
- Priority: P1
- lifecycle status: READY_TO_PORT

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `b53207aa3a699e44f8f6477c7b46ad939894e6f3` centralizes first-message/alternate-greeting selection and proves invalid indices (`undefined`, `null`, `NaN`, out-of-range integers, negative values below -1, and fractional values) should normalize to the default greeting. Current `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e` guards only `Number.isFinite`, so finite out-of-range/fractional values can still produce an undefined greeting or invalid page state.

## Minimal safe scope

Normalize the persisted `fmIndex` at the rendering/navigation boundary. Accept only `-1` or an integer in `[0, alternateGreetings.length)`. Invalid values fall back to `-1`. Reuse the same normalization for displayed greeting, next/previous navigation, and page indicator.

## Ownership boundaries

- Browser chat UI only.
- No storage schema change or migration.
- No server/device/runtime change.
- No notification, service-manager, DB-flush, plugin-reload, or keepalive behavior changes.

## Mechanism

Add a small pure helper for index normalization/selection/navigation and use it at all first-message UI entry points. Preserve `-1` as the default-greeting sentinel and existing cyclic next/previous behavior.

## Compatibility / invariants

- Valid existing `fmIndex` values keep identical behavior.
- `-1` remains the default greeting.
- Invalid persisted values fail safely to the default greeting rather than indexing the array.
- No PocketRisu save/integrity or server-phone guardrail is touched.

## Validation / acceptance

Focused unit tests must cover valid indices plus `undefined`, `null`, `NaN`, out-of-range integers, values below `-1`, fractional values, and zero alternate greetings. The chat UI must use the helper for rendered text, next/previous transitions, and page display. Existing valid navigation semantics must remain unchanged.

## Risk / blast radius

LOW and UI-local. A mistake could alter alternate-greeting cycling, but rollback is a single feature commit/PR with no persisted migration.

## Rollback / fallback

Revert the isolated feature commit. Existing persisted data remains untouched.

## PR decomposition

One feature branch/PR: pure helper + focused tests + narrow chat-screen wiring only.

## Source evidence

- `nevaeh5379/HaejeokRisuai@b53207aa3a699e44f8f6477c7b46ad939894e6f3`
- merge `65838a46c9813c420fd0c6de097f1dd3e478f9e1`
- PocketRisu inspection base `278251f85a19bfdfd4cf3faae780e62682878f9e`
