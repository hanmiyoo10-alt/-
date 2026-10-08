# M interactive Termux profile thin-out

This owner keeps physical M on the thin-phone topology proven by #3306 even when
an operator opens a new interactive/login Termux shell.

## Problem

The `termux-services` package installs:

```text
$PREFIX/etc/profile.d/start-services.sh
```

The reviewed M package version is `0.13-1`. Its exact stock hook exports
`SVDIR` and `LOGDIR`, then starts the global `service-daemon`. On M that
recreates the shared `runsvdir` over every service directory. #3306 proved the
required PocketRisu/RDC/Tailscale device semantics do not need that broad tree.

The 2026-10-08 natural recurrence under #3231/#3342 showed current Android
phantom pressure at 27/32 globally and 26 Termux children after an interactive
Termux open, with runit supervision dominating the Termux set.

## Fixed production identity

The owner accepts no target, package, path, content, command, or retry selector.

```text
package = termux-services
version = 0.13-1
target = $PREFIX/etc/profile.d/start-services.sh
stock sha256 = 8c8b8c5222a74bd037cb059ccbbedd4d94cf1f0b1b76b2df8cfa220b9de9d3f8
stock mode = 700
diversion = $PREFIX/etc/profile.d/start-services.sh.mcl-stock
```

The exact replacement contains only:

```sh
export SVDIR=$PREFIX/var/service
export LOGDIR=$PREFIX/var/log
```

It deliberately does not invoke `service-daemon`.

## Operations

Run the reviewed source with `sh`:

```sh
sh mcl-m-termux-profile-thinout --check
sh mcl-m-termux-profile-thinout --apply
sh mcl-m-termux-profile-thinout --restore
```

`--check` is read-only. It classifies only exact stock or exact thinned state.
Package/version drift, symlinks, unexpected diversion identity, replacement
drift, archive drift, or ambiguous state fail closed.

`--apply` is legal only from exact stock state. It prepares the exact
replacement, uses a local package-aware `dpkg-divert --add --rename`, installs
the replacement at mode 700, and requires exact readback. A bounded rollback is
attempted only when the just-created replacement and archived stock identities
remain exact.

`--restore` is legal only from exact thinned state. It removes the exact
replacement, removes the matching local diversion with rename, and requires the
original stock identity to return. If diversion removal fails, it attempts to
restore the exact replacement rather than inventing another state.

## Effect boundary

This owner modifies only the package-owned profile hook/diversion state when
`--apply` or `--restore` is separately authorized.

It never:
- starts, stops, restarts, or kills `service-daemon`, `runsvdir`, or a service;
- edits service directories or Termux:Boot launchers;
- changes Android `settings`, `device_config`, phantom monitoring, or
  `max_phantom_processes`;
- touches PocketRisu server state, credentials, sessions, networking, packages,
  release, or production state.

The repository implementation stage is synthetic only. Live M apply belongs
after merge/postmerge convergence under #3344.

## Live acceptance after merge

1. exact merged owner `--check` sees the reviewed stock state;
2. apply the fixed diversion/replacement;
3. return M to the narrow #3306 service shape;
4. open a fresh interactive Termux shell;
5. prove shared top-level `runsvdir` remains absent;
6. prove M RDC, Tailscale, PocketRisu tunnel, and localhost health remain good;
7. re-run the bounded M phantom-budget observer;
8. use natural soak only, never manufacture an Android trim.

Refs #3344 #3342 #3231 #3306 #3305 #3232.
