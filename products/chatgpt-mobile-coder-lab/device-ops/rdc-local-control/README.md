# Mobile Coder Lab RDC local control

`mcl-rdcctl` is a narrow read-only adapter for sanitized Mobile Coder Lab bridge receipts.

Version 1 supports only the existing server-phone direct-Termux profile:

```text
profile=s-termux
execution_context=termux
```

It does not own Remote Desktop Commander authentication, sessions, provider state, or the existing `rdc-termux` installation contract. Profile correctness remains owned by `../rdc-termux/verify.sh`.

## Commands

```sh
./mcl-rdcctl status --profile s-termux
./mcl-rdcctl verify --profile s-termux
```

Both commands are read-only. `status` always emits a bounded receipt for a supported profile. `verify` emits the same receipt and exits non-zero unless `result=pass`.

There are no restart, repair, install, activate, Git, PRoot, or arbitrary-path commands in v1.

## Receipt

Normal output is fixed ordered `key=value` data only. Child verifier output and raw runit status output are never passed through.
```text
schema=mcl-rdcctl.v1
profile=s-termux
execution_context=termux
rdc_version=<x.y.z|unknown>
service_state=<running|stopped|missing|unknown>
managed_profile=<pass|fail|unknown>
external_command_policy=<disabled|enabled|unknown>
result=<pass|fail|unknown>
```

`result=pass` proves only the bounded local S-Termux profile state represented above. It does not prove provider authentication, session restoration, relay/channel reachability, watchdog behavior, Android reboot persistence, Git cleanliness, or whole-device health.

## Privacy boundary

The adapter does not read authentication/session files, private logs, SSH material, Tailnet identity, browser storage, process environments, or PocketRisu state. It does not emit PIDs, command lines, filesystem paths, device/session/account identifiers, or free-form child diagnostics.

Production paths are fixed to the established S-Termux profile. A fixture root override exists only when explicit test mode is enabled by the contract test.

## S-Termux private recovery receipt gateway

`mcl-rdc-private-receipt` is a separate read-only gateway for one independently produced S-Termux private recovery receipt. It does not extend `mcl-rdcctl.v1` and does not inspect or infer provider/session state.

Production input is fixed to:

```text
/data/data/com.termux/files/home/.local/share/mcl-private/receipts/s-termux-session-recovery.receipt
```

The command accepts no arguments and forwards only this exact four-line contract:

```text
schema=mcl-private-check.v1
check=s-termux-session-recovery
result=<pass|fail|blocked|manual_auth_required|unknown>
details=withheld
```

The file must be a regular non-symlink file, remain within the fixed byte bound, and contain exactly those ordered fields. Missing, malformed, oversized, or symlink input fails closed with a fixed diagnostic; receipt content and the local path are never echoed on failure.

This gateway only validates an already-produced sanitized receipt. It never implements, installs, invokes, or describes the sensitive S device-local producer, and it never turns service/process state into a session-recovery result. The `mcl-private` path is a storage/classification boundary, not an OS sandbox. A test-only fixture-root override exists only under the explicit contract-test mode.
