# Upstream PR dossier — firefox-background-cpu-kill

Feature-ID: `firefox-background-cpu-kill`
Area: `shared`
PR status: `FORK_PR_OPEN`
Isolation status: `CLEAN`
Deployment status: `LOCAL_VERIFIED / FORK_ONLY`

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
- current PR: `hanmiyoo10-alt/PocketRisu#11`
- target: fork-local `deploy/termux-pocketrisu`
- candidate: `4f693cba1c993b42407b1b73a9ae407f4e102b97`
- state: OPEN / mergeable / non-draft.
- mistaken official PR `PocketRisu/PocketRisu#94`: CLOSED / NOT MERGED.
- official upstream submission is **not authorized by default**. This dossier is a rebuild recipe/evidence record, not permission to open an official PR.
- next action: validate/review/merge only inside `hanmiyoo10-alt/PocketRisu` unless the user explicitly requests an official upstream PR in a future task.
