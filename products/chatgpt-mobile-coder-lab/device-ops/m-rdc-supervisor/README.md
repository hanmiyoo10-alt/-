# M RDC supervisor guard

This owner keeps only the main-phone `M` Remote Desktop Commander runit service recoverably supervised when the shared Termux service supervisor disappears.

It owns one fixed target service and one fixed internal guard service:

```text
desktop-commander-remote
mcl-m-rdc-supervisor-guard
```

The internal service exists only to keep `mcl-m-rdc-supervisor-guard --loop` under a dedicated `runsv` owner. It does not broaden the guard's target beyond `desktop-commander-remote`.

It does not own the shared Termux service tree, PocketRisu, Tailscale, SSH, notifications, provider authentication, or Android background-management policy. The initiating cause of top-level supervisor or guard-process loss remains `UNKNOWN`.

## Guard commands

```sh
./m-rdc-supervisor-guard --check
./m-rdc-supervisor-guard --once
./m-rdc-supervisor-guard --loop
```

`--check` is read-only. `--once` performs at most one bounded repair attempt. `--loop` is the long-lived guard run by the fixed MCL-owned runit service.

Production service and filesystem locations are fixed. Fixture relocation exists only when explicit test mode is enabled by the contract test.
## Read-only receipt

`--check` emits exactly four ordered lines:

```text
schema=mcl-m-rdc-supervisor.v1
service=desktop-commander-remote
supervision=<running|missing|operator_down|service_missing|unknown>
details=withheld
```

Exit `0` means the fixed RDC service has a runit supervisor. Exit `1` means the supervisor or service is intentionally/physically absent. Exit `2` means the observed supervisor state is ambiguous.

The receipt does not expose PIDs, command lines, paths, logs, device/session identifiers, auth material, channel health, or whole-device health.

## Repair semantics

The guard first checks the fixed RDC service directory and explicit `down` marker. It never overrides `down`.

A recognized `run:` or `down:` status means an RDC runit supervisor already exists and no action is taken. Only the exact `runsv not running` condition may start one dedicated `runsv` for the fixed RDC service. Any other status is classified `unknown` and fails closed without broader recovery.

The guard service uses ordinary runit child restart semantics. If the guard child exits while its dedicated `runsv` remains alive, runit starts the guard child again. The guard's own single-instance lock remains a second boundary against duplicate active loops.

## Guard-service anchor durability

The fixed Termux:Boot launcher also starts one independent bounded anchor process. The anchor owns only the fixed mcl-m-rdc-supervisor-guard service supervisor.

    Boot launcher
    -> immediate fixed guard-service supervision check
    -> exactly one independent anchor loop
    -> missing guard-service runsv => start one dedicated guard-service runsv
    -> running/down => preserve
    -> ambiguous or invalid identity => fail closed

The dedicated guard loop performs the reverse ensure after each existing RDC target-recovery iteration:

    guard loop
    -> existing desktop-commander-remote recovery first
    -> fixed launcher --ensure-anchor
       -> live anchor          => no-op
       -> missing/stale anchor => start exactly one anchor
       -> live ambiguous PID   => fail closed

Together they form one bounded two-member recovery ring: the anchor restores the guard-service runsv, while a surviving guard loop restores a missing anchor. Anchor ensure is best-effort and cannot stop or weaken the existing RDC target-recovery loop.

The anchor never inspects channel/network/auth/session state and never touches desktop-commander-remote directly. It owns only the fixed guard-service supervisor. Stale dead anchor pid/lock state is reclaimed through the fixed identity contract; a live unrelated PID/lock is preserved and fails closed.

## Install contract

```sh
./install.sh --check
./install.sh --apply
```

`--check` is read-only and reports whether the fixed guard, fixed guard-service run script, and fixed Termux:Boot launcher are present, executable, and byte-identical to repository source. The install receipt is `mcl-m-rdc-supervisor-install.v2`; the RDC repair receipt remains `mcl-m-rdc-supervisor.v1`.

`--apply` materializes only those three fixed files and then re-runs the check. If the shared `runsvdir` is already alive, normal runit discovery may begin supervising the newly materialized guard service; the installer never starts, stops, restarts, or kills the shared supervisor itself.

Installed locations:

```text
$HOME/.local/bin/mcl-m-rdc-supervisor-guard
$PREFIX/var/service/mcl-m-rdc-supervisor-guard/run
$HOME/.termux/boot/31-mcl-m-rdc-supervisor-guard
```

The Boot launcher never starts the guard child directly. It checks only the fixed guard service, respects its explicit `down` marker, and starts a dedicated `runsv` only when `sv status` reports either the recognized `runsv not running` state or the virgin-service `unable to open supervise/ok: file does not exist` state while the fixed service directory and executable regular `run` identity are valid. Ambiguous status still fails closed.

Ordinary runit `supervise/lock` provides the primary single-owner boundary for the guard service. The launcher also serializes its own short check/start section, and the guard child keeps its existing single-instance lock.
Live installation remains a later `EXPERIMENT_CLOSE` action after merge and postmerge convergence. The implementation PR uses synthetic fixtures only.

## Hard boundaries

This owner must not:

- start, stop, restart, or kill the global `service-daemon` / `runsvdir` tree;
- acquire or periodically reassert Termux wake-lock ownership;
- touch PocketRisu, Tailscale, sshd, local-usage, notification, or any unrelated service directory;
- turn channel/network health failures into process restarts;
- read or transform provider auth/session/token files or private logs;
- expose arbitrary service, path, command, package, URL, shell/eval, or Android-setting passthrough;
- introduce PM2, root requirements, or Android security bypasses.

RDC channel self-heal and the existing channel watchdog remain separate owners. This guard only restores the missing runit owner for the fixed RDC service, while its dedicated runit service keeps the guard child itself restartable.

A future natural top-level supervisor recurrence may provide additional soak evidence, but the contract test does not deliberately terminate shared device supervision merely to manufacture proof. Whole-Termux process-group loss or Android force-stop remains a separate failure domain.
