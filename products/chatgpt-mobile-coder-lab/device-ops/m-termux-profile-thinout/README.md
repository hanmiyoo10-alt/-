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
package status = installed
package error flag = ok
target = $PREFIX/etc/profile.d/start-services.sh
stock sha256 = 8c8b8c5222a74bd037cb059ccbbedd4d94cf1f0b1b76b2df8cfa220b9de9d3f8
stock mode = 700
diversion = $PREFIX/etc/profile.d/start-services.sh.mcl-stock
diversion owner = LOCAL
```

The exact replacement contains only:

```sh
export SVDIR=$PREFIX/var/service
export LOGDIR=$PREFIX/var/log
```

It deliberately does not invoke `service-daemon`.

## States

`--check` recognizes three exact owned states:

- `stock`: no diversion, no archive, exact package-owned stock target;
- `thinned`: exact LOCAL diversion, exact stock archive, exact thin replacement;
- `interrupted`: exact LOCAL diversion and exact stock archive with the active
  target absent.

The interrupted state is deliberately explicit. It can result if execution is
interrupted after `dpkg-divert --add --rename` or during restore. It is not
treated as generic drift. `--apply` may finish it by installing the exact thin
replacement; `--restore` may return it to exact stock.

Package/version/status/error-flag drift, symlinks, non-LOCAL diversion
ownership, unexpected diversion targets, archive/replacement drift, or ambiguous
states fail closed.

## Operations

Run the reviewed source with `sh`:

```sh
sh mcl-m-termux-profile-thinout --check
sh mcl-m-termux-profile-thinout --apply
sh mcl-m-termux-profile-thinout --restore
```

`--check` is read-only. It first acquires a nonblocking shared `flock` on the
fixed `$PREFIX/etc/profile.d` directory file descriptor, then reports the exact
classified state. A concurrent mutation blocks the check rather than exposing a
mid-transaction state.

`--apply` and `--restore` acquire a nonblocking exclusive `flock` on that same
fixed directory file descriptor before their initial classification and hold it
through final readback/receipt. The lock creates no persistent lock file and is
released automatically when the process exits. A competing mutation fails
closed with zero profile/diversion effect.

`--apply` accepts exact `stock` or exact `interrupted`. From stock it
creates the fixed LOCAL package-aware diversion and then installs the exact
replacement. From interrupted it installs only the missing exact replacement.
Replacement installation is no-clobber: a concurrently restored stock target is
never overwritten.

`--restore` accepts exact `thinned` or exact `interrupted`. From thinned
it removes only the exact replacement, reaching interrupted, then removes the
matching LOCAL diversion with rename. From interrupted it removes that diversion
directly. If another actor has already completed restore, exact stock is accepted
as the reached postcondition. If diversion removal fails while the exact
interrupted state remains, the owner may restore the exact thin replacement
using the same no-clobber install so it does not strand the profile hook.

Every late failure reclassifies the actual filesystem/diversion state before
emitting a receipt. If the actual state cannot be classified, the receipt keeps
`state=unknown`; it never projects stale pre-mutation state.

## Race and rollback boundary

All mutation classification and effects are serialized by the fixed exclusive
directory-FD `flock`. This prevents two apply callers from both claiming one
diversion and prevents a delayed restore caller from deleting stock restored by
another invocation.

Recovery also never writes a replacement over an existing target. A prepared
replacement is moved with no-clobber semantics and accepted only when exact
replacement hash/mode readback succeeds.

A failed rollback reports the observed post-failure
`stock|thinned|interrupted|drift|conflict|unknown` classification instead of the
state that existed before mutation. The owner adds no daemon, lockfile, service,
watcher, retry loop, or persistent lock state.

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

1. exact merged owner `--check` sees reviewed stock or an explicitly recoverable
   interrupted state;
2. apply the fixed LOCAL diversion/replacement;
3. return M to the narrow #3306 service shape;
4. open a fresh interactive Termux shell;
5. prove shared top-level `runsvdir` remains absent;
6. prove M RDC, Tailscale, PocketRisu tunnel, and localhost health remain good;
7. re-run the bounded M phantom-budget observer;
8. use natural soak only, never manufacture an Android trim.

Refs #3344 #3342 #3231 #3306 #3305 #3232.
