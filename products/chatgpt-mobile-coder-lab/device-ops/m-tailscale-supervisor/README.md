# M Tailscale supervisor guard

This owner keeps only the main-phone `M` `tailscaled` service recoverably supervised when its `runsv` owner is missing. It does not own the shared Termux service tree or network health.

Fixed services:

```text
tailscaled
mcl-m-tailscale-supervisor-guard
```

The internal guard service exists only to keep `mcl-m-tailscale-supervisor-guard --loop` under its own dedicated `runsv` owner. The Termux:Boot launcher also starts one independent bounded anchor loop so loss of that dedicated guard-service `runsv` after boot can be repaired without depending on the already-missing shared `runsvdir`.

## Guard commands

```sh
./m-tailscale-supervisor-guard --check
./m-tailscale-supervisor-guard --once
./m-tailscale-supervisor-guard --loop
```

`--check` is read-only. `--once` makes at most one bounded supervisor-restoration attempt. `--loop` is run by the fixed guard service.

Production paths and service names are fixed. Fixture relocation is available only under the explicit contract-test mode.

## Read-only receipt

`--check` emits exactly six bounded lines:

```text
schema=mcl-m-tailscale-supervisor.v1
service=tailscaled
supervision=<running|missing|operator_down|service_missing|unknown>
daemon=<present|absent|unknown>
recovery=<not_needed|orphan_present|eligible|not_applicable|blocked>
details=withheld
```

Exit `0` means the fixed service is already supervised. Exit `1` is a complete known non-supervised observation, including a preserved live orphan or daemon-absent recovery eligibility. Exit `2` means supervisor or daemon evidence is ambiguous.

No PIDs, command lines, addresses, Tailnet identity, peer state, credentials, session values, private logs, or network-health data are emitted.

## Daemon-presence contract

A missing supervisor is not enough to start a new `runsv`. The guard first proves daemon presence using the fixed `pidof tailscaled` path. If that does not find a daemon, it corroborates with exact `/proc/<pid>/comm == tailscaled` observation.

This deliberately does not rely on `pgrep -x tailscaled`: M has already shown a live daemon while that exact-name query returned no result. If daemon evidence is incomplete or malformed, the guard fails closed.

## Repair semantics

The target service directory and executable regular `run` identity must be valid. An explicit `down` marker is always preserved.

```text
supervised                         -> no action
missing supervisor + live daemon  -> orphan_present / no start / no kill
missing supervisor + daemon absent-> start exactly one dedicated target runsv
ambiguous evidence                 -> fail closed
```

The guard re-reads both supervisor and daemon state immediately before the start effect. It never treats PocketRisu reachability, RDC state, peer status, Wi-Fi/cellular changes, DNS, or general internet health as restart triggers.

The guard-service launcher follows the existing M per-service pattern: it validates the fixed guard-service `run`, respects `down`, serializes its short start section, and starts one dedicated guard-service `runsv` only for recognized missing-supervisor states.


## Guard-service anchor durability

The fixed Termux:Boot launcher keeps its original bounded immediate supervisor check and additionally starts one independent anchor process. The anchor owns only the fixed `mcl-m-tailscale-supervisor-guard` service supervisor.

```text
Boot launcher
→ immediate fixed guard-service supervision check
→ exactly one independent anchor loop
→ missing guard-service runsv => start one dedicated guard-service runsv
→ running/down => preserve
→ ambiguous or invalid identity => fail closed
```

The anchor uses fixed lock/PID state under the existing M Tailscale guard state directory. Repeated or concurrent Boot launcher invocation converges on one anchor. An explicit guard-service `down` marker is preserved. The anchor never reads network health, never inspects daemon presence, and never starts, stops, kills, or adopts `tailscaled` directly; those semantics remain exclusively in `m-tailscale-supervisor-guard`.

This extra layer addresses the observed case where the shared `runsvdir` was already absent and the dedicated guard-service `runsv` later disappeared while the live `tailscaled` orphan remained healthy.

### Mutual anchor self-recovery

The dedicated guard loop also performs one fixed anchor-presence ensure after each target-recovery iteration. It invokes only the installed launcher internal `--ensure-anchor` mode.

```text
guard loop
→ existing tailscaled recovery first
→ fixed launcher --ensure-anchor
   → live anchor          => no-op
   → missing/stale anchor => start exactly one anchor
   → live ambiguous PID   => fail closed
```

`--ensure-anchor` does not inspect or repair `tailscaled`, does not restart the guard-service supervisor, and does not touch the shared service tree. The existing anchor continues to own only guard-service supervisor restoration. Together they form a bounded two-member recovery ring: the anchor restores the guard-service `runsv`, while a surviving guard loop restores a missing anchor.

Anchor ensure is deliberately best-effort from the guard loop. A failure to prove or restore the anchor cannot stop the existing target-recovery iteration. Stale dead anchor lock/PID state is reclaimed through the existing fixed lock identity contract; a lock/PID referring to a live non-anchor process is preserved and fails closed without kill or duplicate anchor creation.

## Install contract

```sh
./install.sh --check
./install.sh --apply
```

The installer owns only the fixed guard binary, fixed guard-service run script, and fixed Termux:Boot launcher. It does not start, stop, restart, or kill the global service supervisor. Live installation is reserved for `EXPERIMENT_CLOSE` after merge/postmerge proof.

Installed locations:

```text
$HOME/.local/bin/mcl-m-tailscale-supervisor-guard
$PREFIX/var/service/mcl-m-tailscale-supervisor-guard/run
$HOME/.termux/boot/32-mcl-m-tailscale-supervisor-guard
```

## Hard boundaries

This owner must not:

- restart or kill the global `service-daemon` / top-level `runsvdir` tree;
- kill or replace a live orphan merely to make topology tidy;
- touch PocketRisu, RDC, sshd, notification, or unrelated service directories;
- own a Termux wake lock;
- react to network-health events;
- expose arbitrary service/path/command/environment passthrough;
- read credentials, Tailnet addresses, peer identifiers, session/auth material, or private logs;
- reboot the phone or reset Android networking;
- introduce PM2, root requirements, or Android security bypasses;
- let the independent guard anchor inspect or mutate the target `tailscaled` service directly.

## Validation

`tests/test-contract.sh` uses synthetic fixtures only. It covers the observed `pgrep -x` false-negative class, live-orphan preservation, daemon-absent recovery, ambiguous fail-closed behavior, target run identity, guard-child restart, independent-anchor idempotence, automatic guard-service supervisor restoration, concurrent Boot launcher convergence, install drift, fixture cleanup, syntax, and forbidden surfaces.

No deliberate phone reboot, network toggle, top-level supervisor failure, or live M service mutation is part of `IMPLEMENTATION_PR`.
