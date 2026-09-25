# Upstream PR dossier — main-ssh-tunnel

Feature-ID: `main-ssh-tunnel`
Area: `main-phone`
PR status: `MERGED BASE (#2060) / FOLLOW-UP #2878 MERGED`
Isolation status: `ISOLATED`
Deployment status: `BASE DEPLOYED / GUARD-ANCHOR DEPLOYED / LIVE-PROVEN`

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

Real-device guard-owner proof completed on 2026-09-25 after merge/postmerge convergence. Exact merged guard + launcher bytes were backup-first deployed on M; guard-only hard loss was recovered by the anchor and anchor-only hard loss was recovered by the guard. Target tunnel supervision, localhost health, Tailscale, and the absence of the shared top-level runsvdir were preserved. No phone reboot, whole-Termux loss, network toggle, server kill, server sshd kill, or broad service-tree restart was used.

## Upstream pitch
Keep the existing runit-owned SSH tunnel behavior and its narrow supervisor guard. Add one independent anchor inside the existing Boot launcher so the guard owner can recover after its own process loss, while a surviving guard can recreate a missing anchor. Respect explicit `down`, fail closed on ambiguous identity, avoid health-based process churn, and do not broaden into a general watchdog or shared service supervisor.

## Review / PR state
- base incident evidence: repository issue #2048.
- base PR #2060: MERGED as `d9e93115f943138ad7c675fcc675e4a0460714b9`.
- 2026-09-24 natural guard-owner recurrence: #2786 comment evidence; the prior guard + launcher recovered the live path, but guard-owner durability remained incomplete.
- follow-up owner: #2786.
- follow-up PR #2878: MERGED as `0a25b7691bf5d768aced94403b32ebdb50f12cc3`.
- exact follow-up guard + launcher: DEPLOYED on M.
- follow-up synthetic guard↔anchor contract: PASS.
- real-device guard hard-loss → anchor recovery: PASS.
- real-device anchor hard-loss → guard recovery: PASS.
- final guard/anchor cardinality: exactly 1 / 1.
- tunnel supervision and localhost health: preserved.
- root cause of central `runsvdir` death and initiating cause of the historical guard-owner loss both remain `UNKNOWN`.
- follow-up state: `MERGED / DEPLOYED / LIVE-PROVEN`.
- no further deployment is pending for #2786; future shared-runsvdir diagnosis remains a separate owner.
