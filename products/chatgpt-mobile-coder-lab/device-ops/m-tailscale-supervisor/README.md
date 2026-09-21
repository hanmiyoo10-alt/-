# M Tailscale supervisor guard

This owner keeps only the main-phone `M` `tailscaled` service recoverably supervised when its `runsv` owner is missing. It does not own the shared Termux service tree or network health.

Fixed services:

```text
tailscaled
mcl-m-tailscale-supervisor-guard
```

The internal guard service exists only to keep `mcl-m-tailscale-supervisor-guard --loop` under its own dedicated `runsv` owner.

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
- introduce PM2, root requirements, or Android security bypasses.

## Validation

`tests/test-contract.sh` uses synthetic fixtures only. It covers the observed `pgrep -x` false-negative class, live-orphan preservation, daemon-absent recovery, ambiguous fail-closed behavior, target run identity, guard-child restart, concurrent Boot launcher idempotence, install drift, fixture cleanup, syntax, and forbidden surfaces.

No deliberate phone reboot, network toggle, top-level supervisor failure, or live M service mutation is part of `IMPLEMENTATION_PR`.
