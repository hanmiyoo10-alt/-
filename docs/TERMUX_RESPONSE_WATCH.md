# Termux GPT Response Watch Prototype

Date: 2026-08-26
Status: PROTOTYPE · NON-PRODUCTION
Scope: `plugins/termux/response-watch/`
Canonical issue: `#445`

## Primary goal

Show live elapsed time while a GPT response is in progress and emit a completion notification containing total response time.

This release has one goal only: timer + notification plumbing. Automatic ChatGPT Android response-state detection is intentionally outside this implementation until a reliable observation point is verified on a real device.

## Evidence and platform boundary

VERIFIED:

- Termux:API exposes `termux-notification` with stable notification ids, ongoing notifications, sound, vibration, and alert-once behavior.
- `termux-notification-remove` exists for notifications created by Termux.
- OpenAI's public Android help documents app behavior, haptics, and scheduled-task notifications.

UNKNOWN:

- A supported external hook that signals ordinary ChatGPT Android response-generation start/finish.
- Whether a future AccessibilityService companion can identify generation state robustly across app updates without reading sensitive content.

Therefore the completion detector is separated from the timer. Any future detector only needs to call the stable `start` and `done` commands.

## Runtime contract

`start`
: creates a session, persists monotonic start time, and launches a detached refresher.

`done`
: freezes elapsed time, stops the refresher, and emits a high-priority completion alert.

`cancel`
: stops the refresher and removes the Termux notification.

`status`
: reports the current state; a dead refresher is marked `stale` rather than silently trusted.

## Notification behavior

During generation:

- one notification id: `gpt-response-watch`
- title contains elapsed time
- ongoing/pinned
- low priority
- alert-once so each refresh does not repeatedly buzz

On completion:

- same notification id
- no ongoing flag
- total elapsed time
- high priority
- one sound + vibration alert

## Regression contract

Repository CI must pass without Android by testing pure state and command construction logic. Real-device validation must separately verify:

1. one live notification is updated rather than duplicated;
2. elapsed time advances approximately once per second;
3. `done` produces one completion sound/vibration;
4. `cancel` removes the notification;
5. battery impact is acceptable for short/medium response durations.

No production release is authorized by this prototype.
