# Upstream PR dossier — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Area: `main-phone`
PR status: `MERGED (#2060)`
Isolation status: `ISOLATED`
Deployment status: `DEPLOY_READY`

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
- historical pre-#2066 helper docs validation: `main` and candidate returned the same unrelated baseline failure set (`rc=1`), with no candidate-only delta; after #2066 repaired that baseline and this branch was refreshed onto current `main`, the helper docs validator passes.

Real-device destructive proof is deferred until merge/postmerge deployment. The test must not deliberately kill the server or server sshd.

## Upstream pitch
Keep the existing runit-owned SSH tunnel behavior, but add a tiny independent guard that restores only the missing core `runsv` supervisor when central Termux supervision disappears. Respect explicit `down`, avoid health-based process churn, and do not broaden into a general watchdog.

## Review / PR state
- incident evidence: repository issue #2048
- PR #2060: MERGED as `d9e93115f943138ad7c675fcc675e4a0460714b9`.
- merged-main `Required`: PASS.
- merged-main `PocketRisu helper docs`: PASS.
- fresh detached-main shell syntax, isolated guard regression, helper-docs validator, and `git diff --check`: PASS.
- main-phone pre-deploy INSPECT_ONLY: localhost health ready; central `runsvdir` absent; guard and Boot launcher absent.
- root cause of central `runsvdir` death remains `UNKNOWN`.
- next action: deploy only the two merged guard files to the main phone with backup-first and verify without broad service restart.
