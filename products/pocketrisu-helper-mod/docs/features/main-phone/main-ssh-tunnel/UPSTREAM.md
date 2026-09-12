# Upstream PR dossier — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Area: `main-phone`
PR status: `BLOCKED_BASELINE_CI (#2060)`
Isolation status: `ISOLATED`
Deployment status: `NOT_READY`

## Problem / motivation
On 2026-09-12 the main phone lost its central Termux `runsvdir`. The PocketRisu server and server sshd remained healthy and reachable, but once the core tunnel supervisor disappeared the localhost PocketRisu path was no longer respawned. Root cause of the `runsvdir` death remains `UNKNOWN`; the repair must not claim otherwise.

## Minimal upstream scope
Only the `main-ssh-tunnel` resilience boundary:
- add a narrow core-supervisor guard script;
- add a Termux:Boot launcher template for that guard;
- add a regression test for supervisor restoration and explicit `down` preservation;
- document the incident and recovery contract.

Excluded:
- PocketRisu server code/DB;
- server-phone runit/sshd;
- notification relay/tunnel semantics;
- reconnect watcher conversion into an active watchdog;
- broad Termux service-daemon restart policy;
- Android phantom-process tuning.

## Dependencies
Existing main-phone `pocketrisu-ssh-tunnel` service directory and Termux:Boot. No server-phone dependency.

## Verification evidence
Existing device evidence before this PR:
- server `/api/health`: ready during the incident;
- server sshd: running;
- main→server SSH port: reachable;
- main core service: `runsv not running`;
- core-only manual `runsv` recovery restored localhost health and remained stable on recheck.

Pre-PR validation:
- shell syntax for both scripts: PASS;
- isolated regression test: PASS;
- branch `git diff --check`: PASS;
- helper docs validator: both `main` and candidate currently return the same unrelated baseline failure set (`rc=1`), with no candidate-only delta.

Real-device destructive proof is deferred until merge/postmerge deployment. The test must not deliberately kill the server or server sshd.

## Upstream pitch
Keep the existing runit-owned SSH tunnel behavior, but add a tiny independent guard that restores only the missing core `runsv` supervisor when central Termux supervision disappears. Respect explicit `down`, avoid health-based process churn, and do not broaden into a general watchdog.

## Review / PR state
- incident evidence: repository issue #2048
- PR: #2060
- branch protection `Required`: PASS on current head.
- product workflow `PocketRisu helper docs`: FAIL from pre-existing baseline errors unrelated to this Feature-ID.
- baseline CI debt: issue #2064.
- next action: keep merge blocked until product-policy GREEN can be established without weakening validation or mixing unrelated Feature-IDs.
