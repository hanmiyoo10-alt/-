# S retired runsv detachment owner

This owner removes only the runit supervisor footprint of four already-retired
S-Termux services. It does not delete service source, remove retirement down
markers, activate a service, restart runsvdir, or change Android policy.

The fixed cohort is:

- `mcl-detached-owner-runtime`;
- `desktop-commander-remote`;
- `desktop-commander-watchdog`;
- `llmgateway-bridge`.

`ssh-agent` is deliberately excluded because it has not passed the same reviewed
MCL retirement chain.

## State model

Attached-retired means every fixed directory is still directly under
`$PREFIX/var/service`, its exact run file and mode match the reviewed identity,
its mode-0600 `down` marker is present, the target is `down:`, and its `runsv`
supervisor is still present.

Detached-retired means those exact directories have been renamed into:

```text
$PREFIX/var/service/.mcl-retired-services/
```

The archive root is a real mode-0700 directory. Service bytes and down markers
remain unchanged. Since the archived directory begins with a dot it is outside
the normal top-level runsvdir service set.

## Operations

Invoke the ordinary 100644 source explicitly through `sh`:

```sh
sh mcl-s-retired-runsv-detachment.sh --check
sh mcl-s-retired-runsv-detachment.sh --detach
sh mcl-s-retired-runsv-detachment.sh --reattach
```

There is no caller-selected service, path, archive, command, PID, signal, retry
count, or fallback.

Detach first proves all four exact retired identities plus six preserved live
services. It creates only the fixed archive and performs same-filesystem renames.
It never calls `sv up`, removes a down marker, signals runsv/runsvdir, or
restarts the service daemon. It waits only for runit to observe each top-level
directory removal. If a detach fails after earlier fixed targets moved, it
attempts one bounded reattach of only those targets.

Reattach moves the exact archived directories back to their original names. The
existing mode-0600 down markers stay in place, so runsv supervision may return
without starting the retired target application. The original retirement owners
remain the only owners allowed to reactivate their services later.

## Preservation boundary

The owner requires these current services to remain running but has no mutation
surface for them:

- `desktop-commander-remote-termux`;
- `local-usage-runtime-engine`;
- `local-usage-runtime-manager`;
- `pocketrisu`;
- `sshd`;
- `tailscaled`.

It does not touch PocketRisu data, Usage Dashboard data, network state, Android
settings, Git/release/production authority, or the shared `runsvdir`.

A successful live detach proves only the bounded Termux process-shape reduction.
It is not proof of a particular Android ActivityManager phantom-process count or
headroom.
