# M RDC supervisor guard

This owner keeps only the main-phone `M` Remote Desktop Commander runit service recoverably supervised when the shared Termux service supervisor disappears.

It owns exactly one fixed service:

```text
desktop-commander-remote
```

It does not own the shared Termux service tree, PocketRisu, Tailscale, SSH, notifications, provider authentication, or Android background-management policy. The initiating cause of top-level supervisor loss remains `UNKNOWN`.

## Guard commands

```sh
./m-rdc-supervisor-guard --check
./m-rdc-supervisor-guard --once
./m-rdc-supervisor-guard --loop
```

`--check` is read-only. `--once` performs at most one bounded repair attempt. `--loop` is the long-lived guard used by the fixed Termux:Boot launcher.

Production service and filesystem locations are fixed. Fixture relocation exists only when explicit test mode is enabled by the contract test.
## Read-only receipt

`--check` emits exactly four ordered lines:

```text
schema=mcl-m-rdc-supervisor.v1
service=desktop-commander-remote
supervision=<running|missing|operator_down|service_missing|unknown>
details=withheld
```

Exit `0` means the fixed service has a runit supervisor. Exit `1` means the supervisor or service is intentionally/physically absent. Exit `2` means the observed supervisor state is ambiguous.

The receipt does not expose PIDs, command lines, paths, logs, device/session identifiers, auth material, channel health, or whole-device health.

## Repair semantics

The guard first checks the fixed service directory and explicit `down` marker. It never overrides `down`.

A recognized `run:` or `down:` status means a runit supervisor already exists and no action is taken. Only the exact `runsv not running` condition may start one dedicated `runsv` for the fixed RDC service. Any other status is classified `unknown` and fails closed without broader recovery.
## Install contract

```sh
./install.sh --check
./install.sh --apply
```

`--check` is read-only and reports whether the fixed guard and fixed Termux:Boot launcher are present, executable, and byte-identical to repository source. `--apply` copies only those two files into their fixed MCL-owned locations and then re-runs the check. It does not start the guard or restart any service.

Installed locations:

```text
$HOME/.local/bin/mcl-m-rdc-supervisor-guard
$HOME/.termux/boot/31-mcl-m-rdc-supervisor-guard
```

The launcher starts the guard loop independently of the shared runit tree. The guard loop has single-instance locking, so repeated launcher execution does not intentionally create multiple active guards.

Live installation is a later `EXPERIMENT_CLOSE` action after merge and postmerge convergence. The implementation PR uses synthetic fixtures only.
## Hard boundaries

This owner must not:

- start, stop, restart, or kill the global `service-daemon` / `runsvdir` tree;
- acquire or periodically reassert Termux wake-lock ownership;
- touch PocketRisu, Tailscale, sshd, local-usage, notification, or any other service directory;
- turn channel/network health failures into process restarts;
- read or transform provider auth/session/token files or private logs;
- expose arbitrary service, path, command, package, URL, shell/eval, or Android-setting passthrough;
- introduce PM2, root requirements, or Android security bypasses.

RDC channel self-heal and the existing channel watchdog remain separate owners. This guard only restores the missing runit owner for the fixed RDC service.

A future natural top-level supervisor recurrence may provide additional soak evidence, but the contract test does not deliberately terminate shared device supervision merely to manufacture proof.
