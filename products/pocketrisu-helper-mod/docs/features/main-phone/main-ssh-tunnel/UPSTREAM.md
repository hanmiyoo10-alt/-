# Upstream PR dossier — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Area: `main-phone`
PR status: `MERGED BASE (#2060) / FOLLOW-UP #2786 IMPLEMENTATION_PR`
Isolation status: `ISOLATED`
Deployment status: `BASE DEPLOYED / GUARD-ANCHOR FOLLOW-UP NOT DEPLOYED`

## Problem / motivation
On 2026-09-12 the main phone lost its central Termux `runsvdir`. The PocketRisu server and server sshd remained healthy and reachable, but once the core tunnel supervisor disappeared the localhost PocketRisu path was no longer respawned. Root cause of the `runsvdir` death remains `UNKNOWN`; the repair must not claim otherwise.

On 2026-09-24 a second natural incident exposed the next ownership gap: the already-installed core guard had itself disappeared with stale guard PID/lock state, and the core tunnel supervisor was again missing while server PocketRisu remained HTTP 200 / `ready` and M Tailscale/RDC remained reachable. Existing `--once` + Boot launcher recovery restored the path. The initiating cause of guard-owner loss remains `UNKNOWN`.

## Minimal upstream scope
Only the `main-ssh-tunnel` resilience boundary:
- preserve the narrow core-supervisor guard and its exact target;
- extend the existing Termux:Boot launcher with one independent fixed anchor loop;
- let the guard loop best-effort re-establish that anchor, forming a two-member guard↔anchor recovery ring;
- fail closed on ambiguous live PID/supervisor identity;
- extend the synthetic regression for supervisor restoration, explicit `down`, concurrent activation, guard hard-loss, anchor hard-loss, and ambiguous identity;
- document both incidents and the recovery contract.

Excluded:
- PocketRisu server code/DB;
- server-phone runit/sshd;
- notification relay/tunnel semantics;
- reconnect watcher conversion into an active watchdog;
- broad Termux service-daemon restart policy;
- Android phantom-process tuning.

## Dependencies
Existing main-phone `pocketrisu-ssh-tunnel` service directory and Termux:Boot. No server-phone dependency. The follow-up adds no new service directory, shared supervisor, network observer, or cross-product runtime owner.

## Verification evidence
Existing device evidence before this PR:
- server `/api/health`: ready during the incident;
- server sshd: running;
- main→server SSH port: reachable;
- main core service: `runsv not running`;
- core-only manual `runsv` recovery restored localhost health and remained stable on recheck.

Base #2060 validation:
- shell syntax for both scripts: PASS;
- isolated regression test: PASS;
- branch `git diff --check`: PASS;
- historical pre-#2066 helper docs validation: `main` and candidate returned the same unrelated baseline failure set (`rc=1`), with no candidate-only delta; after #2066 repaired that baseline and this branch was refreshed onto current `main`, the helper docs validator passes.

#2786 follow-up synthetic validation:
- shell syntax for guard, launcher, and regression test: PASS;
- fixed fixture contract: PASS for target restoration, explicit `down`, ambiguous supervisor fail-closed, concurrent launcher convergence, guard hard-loss → anchor recovery, anchor hard-loss → guard recovery, and live unrelated PID preservation;
- no application/network-health trigger is introduced;
- helper-docs and exact diff validation remain required before PR publication.

Real-device guard-owner loss proof is deferred until merge/postmerge deployment. No phone reboot, whole-Termux loss, network toggle, server kill, or server sshd kill belongs to IMPLEMENTATION_PR.

## Upstream pitch
Keep the existing runit-owned SSH tunnel behavior and its narrow supervisor guard. Add one independent anchor inside the existing Boot launcher so the guard owner can recover after its own process loss, while a surviving guard can recreate a missing anchor. Respect explicit `down`, fail closed on ambiguous identity, avoid health-based process churn, and do not broaden into a general watchdog or shared service supervisor.

## Review / PR state
- base incident evidence: repository issue #2048.
- base PR #2060: MERGED as `d9e93115f943138ad7c675fcc675e4a0460714b9`.
- 2026-09-24 natural guard-owner recurrence: #2786 comment evidence; old deployed guard + launcher recovered the live path, but the guard had previously disappeared.
- follow-up owner: #2786, current stage `IMPLEMENTATION_PR`.
- follow-up source uses the existing two files plus the existing feature regression test and docs; no new service/runtime owner file is needed.
- follow-up synthetic guard↔anchor contract: PASS.
- follow-up is not merged and not deployed on M.
- root cause of central `runsvdir` death and initiating cause of the later guard-owner loss both remain `UNKNOWN`.
- next action: publish one non-closing #2786 PR after helper-docs/diff validation; do not live-apply until merge + postmerge convergence.
