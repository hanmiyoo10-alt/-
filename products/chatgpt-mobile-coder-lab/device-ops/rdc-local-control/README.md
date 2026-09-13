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
