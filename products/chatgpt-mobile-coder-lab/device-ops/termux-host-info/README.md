# Mobile Coder Lab Termux host info

`mcl-termux-host-info` is a bounded read-only diagnostic adapter for native
Termux hosts. It consumes the existing `termux-info` command locally and emits
only a fixed sanitized receipt.

It is an on-demand drill-down owner. It is not part of every `sm-status` or
`mcl-preflight` invocation and it does not choose a device route.

## Command

```sh
./mcl-termux-host-info status
```

The caller must already have selected a native Termux semantic surface:
D-012 `S_TERMUX` for the server phone or D-012 `M` for the main phone.

## Receipt

```text
schema=mcl-termux-host-info.v1
termux_info=<pass|missing|failed|unknown>
termux_tools_version=<bounded-version|unknown>
package_arch=<aarch64|arm|x86_64|i686|unknown>
android_version=<positive-integer|unknown>
repo_entries=<nonnegative-integer|unknown>
package_update_view=<none|present|unknown>
details=withheld
```

A supported `status` invocation exits successfully when it can form the receipt,
including when `termux-info` itself is missing or fails. Those states stay
explicit in `termux_info`; there is deliberately no aggregate health/readiness
result.

`package_update_view` reflects only the local metadata displayed by that
`termux-info` invocation. `present` is not an upgrade recommendation and does
not prove package indexes are fresh.

## Privacy boundary

Raw `termux-info` output is captured only in private device-local temporary
scratch and removed before exit. The public receipt does not expose mirror URLs
or names, device manufacturer/model, kernel strings, Termux/LD environment
variables, plugin lists, upgradable package names, paths, host/user names,
device/session/account identifiers, credentials, or raw child diagnostics.

## Effect boundary

This owner never installs, updates, upgrades, repairs, or changes mirrors. It
does not call `termux-change-repo`, `termux-reload-settings`,
`termux-wake-lock`, `termux-setup-storage`, package mutation commands, Android
settings, service/process controls, Git, network fetchers, schedulers, or
notification commands.

If the essential `termux-info` surface is missing or broken, the receipt reports
that observation. Repair belongs to a separately authorized owner.
