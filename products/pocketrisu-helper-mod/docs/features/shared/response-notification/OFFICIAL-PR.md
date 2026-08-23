# Official upstream PR — response-notification

Feature-ID: `response-notification`

## Official PR
- Repository: `PocketRisu/PocketRisu`
- PR: `#61` — `feat: add native Termux response notifications`
- Result: `MERGED_UPSTREAM`
- Merged at: `2026-08-23T06:54:41Z`
- Upstream merge commit: `edfa396ea9f14d55e6e1c3ab9dc764e5e6dec320`
- Source head: `3f5b8f736dbe36001e26231d92661ef568a911a1`

## Accepted scope
The official PR accepted a localhost-only `/api/termux-notify` endpoint plus Termux native Android response notifications, response elapsed time tracking across auto-continue/resend, fixed notification ID reuse, and browser Notification fallback when Termux is unavailable.

## Validation submitted upstream
- native notification appears after response completion
- sound played once per completed response in the original test
- repeated responses reused one notification slot
- disabling PocketRisu notifications disabled response notifications
- `pnpm check`: 0 errors (existing accessibility warnings only)
- production build succeeded

## Follow-up boundary
The later phone-call/earphone infinite-sound behavior is tracked separately as Feature-ID `audio-notification`. Do not rewrite this merged upstream history as though the original PR failed.

## Meaning for this feature
This response-notification implementation is officially merged upstream. Keep local relay/audio follow-up fixes separate from the merged feature.
