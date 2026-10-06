# Upstream PR dossier — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
PR status: `GREEN`
Isolation status: `CLEAN`
Deployment status: `LOCAL_VERIFIED / UPSTREAM_PR_GREEN`

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
- post-fix persistence: 161 durable `chat-content` commits observed after the fix.
- no additional Firefox `excessive cpu` kills observed after 01:55 KST in retained watcher events.
- latest-upstream rebuild base: `3d30fc5a1982b1b5d149b97e188b8ee45d89e1d2`.
- upstream candidate SHA: `d79f8af15f08b471de37aab4841deb536e0bdf5d`.
- official PR: `PocketRisu/PocketRisu#94`.
- current PR state: OPEN / GREEN / mergeable / non-draft.
- CodeQL Advanced: PASS.
- PR Check Linux/Test: PASS, including svelte-check, build, tests, and compatibility tests.
- reviews: none yet; changes-requested: none.
- next action: wait for maintainer review/merge; do not broaden this PR with same-process or LMKD work.
