# Upstream PR dossier — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `LIVE_A_B_PASS_CHAT_SMOKE_PENDING`

## Problem / motivation
On Android/Samsung, PocketRisu's sound keep-alive can keep Firefox Gecko work active while backgrounded. Android ActivityManager then kills the PocketRisu-correlated Gecko tab process for `excessive cpu`, and Firefox reconstructs the content process on resume.

## Minimal upstream scope
Prevent the continuous sound keep-alive loop from starting on Android Firefox only. Preserve existing behavior on other platforms.

## Dependencies
- existing `keepSessionAlive` setting
- existing browser/platform detection
- no server/session-lock/DB dependency

## Explicitly out of scope
- server/SSH issues
- stale-writer protocol
- hide/pagehide forced flush
- V3 iframe redesign
- general plugin throttling
- Android notifications

## Verification evidence
- official upstream still has the same continuous sound loop in `src/App.svelte`.
- local candidate commit: `4f693cba1c993b42407b1b73a9ae407f4e102b97`.
- one tracked file changed: `src/App.svelte`.
- `svelte-check`: 0 errors, 4 pre-existing warnings.
- production build: PASS.
- old Firefox AAudio player released at 02:52:55 KST after loading the candidate.
- no replacement Firefox AAudio player was created.
- Firefox stayed backgrounded from 02:53:10 through at least 02:58:59 with the same main/tab process set.
- main/tab `oom_score_adj` stayed around 900/910, but no `excessive cpu` kill occurred.
- server persistence stayed healthy and no 423 `Session deactivated` occurred.

## Upstream pitch
A keep-alive feature should not trigger the browser/OS condition that destroys the tab it is trying to preserve. On Android Firefox, continuous audio should therefore be skipped rather than looped.

## Review / PR state
- local A/B: PASS for >5 minutes background, audio remains stopped.
- remaining local gate: one normal foreground chat send with durable chat-content persist, plus longer natural-use observation.
- next action: when those pass, rebuild the one-file change from latest official upstream for PR.
