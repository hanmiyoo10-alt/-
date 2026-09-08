# Remote Desktop Commander Runit Persistent Service Checkpoint

Date: 2026-09-09

Status: **SERVICE RESTART VERIFIED / BOOT WIRING CONFIGURED / REBOOT NOT YET VERIFIED**

## Result

Remote Desktop Commander was promoted from a manually launched foreground `npx` process to an isolated Termux runit service on the Android server phone.

Service directory:

```text
/data/data/com.termux/files/usr/var/service/desktop-commander-remote
```

Pinned package installation:

```text
/root/.local/share/desktop-commander-remote
@wonderwhy-er/desktop-commander@0.2.48
```

Service logs are supervised separately with `svlogd` under:

```text
/data/data/com.termux/files/home/.local/state/desktop-commander-remote
```

The service executes the pinned package entrypoint directly with the Termux Node binary instead of using `npx @latest` at runtime.

## Problems found and fixed

The first runit attempt exposed two issues.

1. `sv down` sent SIGTERM to the PRoot wrapper but the child process chain did not initially terminate cleanly.
2. a fresh `npx` cache used by the service failed with an `ENOENT` for an ephemeral package.json path.

The run wrapper was adjusted to forward termination to the process group, and the runtime was changed from ephemeral `npx` execution to the pinned local installation.

## Restart verification

A manual runit restart was performed from Termux.

Observed service lifecycle:

```text
SIGTERM received
heartbeat stopped
channel unsubscribed
device marked offline
MCP client/transport closed
device shutdown complete
```

The restarted service then automatically restored the persisted session and returned online without a new device-auth flow.

The remote channel briefly reported a transport failure during startup, then recovered automatically and reached:

```text
session restored
channel subscribed
device marked online
presence tracked
device ready
```

A subsequent ChatGPT Remote Desktop Commander tool call was delivered successfully through the restarted runit instance.

The runit supervise PID remained stable across repeated observations, and the old foreground `npx @latest` instance was no longer present.

The permanent repository remained:

```text
/root/nyang-repo
branch: server/work
status: clean
```

## Boot wiring

The service `down` marker was removed after manual restart verification, so runit now treats the service as normally up.

The existing Termux:Boot script already sources:

```text
$PREFIX/etc/profile.d/start-services.sh
```

That profile script starts `service-daemon`, which supervises:

```text
$PREFIX/var/service
```

The current `runsvdir` process is confirmed to supervise that directory.

Therefore `desktop-commander-remote` is now wired into the same Termux service startup path as the existing PocketRisu-related runit services.

## Remaining boundary

A real Android device reboot has **not** yet been performed for this service.

The next checkpoint is therefore limited to:

```text
reboot phone
→ Termux:Boot runs
→ service-daemon/runsvdir starts
→ desktop-commander-remote starts automatically
→ persisted session restores
→ ChatGPT tool call succeeds
→ PocketRisu/server/work remain healthy
```

No reboot was triggered automatically during this checkpoint.

No device ID, device code, account address, auth token, or session identifier is stored here.