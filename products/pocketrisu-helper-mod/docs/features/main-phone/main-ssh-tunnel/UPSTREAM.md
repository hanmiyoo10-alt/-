# Upstream PR dossier — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Area: `main-phone`
PR status: `PREPARED`
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

PR validation target:
- shell syntax for both scripts;
- isolated regression test passes;
- PocketRisu helper docs validator passes;
- exact diff contains only this Feature-ID.

Real-device destructive proof is deferred until merge/postmerge deployment. The test must not deliberately kill the server or server sshd.

## Upstream pitch
Keep the existing runit-owned SSH tunnel behavior, but add a tiny independent guard that restores only the missing core `runsv` supervisor when central Termux supervision disappears. Respect explicit `down`, avoid health-based process churn, and do not broaden into a general watchdog.

## Review / PR state
- incident evidence: repository issue #2048
- next action: open the isolated PR, run Required/feature validation, then stop before merge.
