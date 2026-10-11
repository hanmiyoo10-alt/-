# S primary RDC channel watchdog v2

This owner manages only the primary server-phone S RDC outer channel watchdog.
It does not own RDC authentication, vendor source, S-Termux sibling RDC, M,
Tailscale, sshd, PocketRisu, Termux:Boot, or the global runsvdir tree.

Source packet: #2860.

## Why v2 exists

The earlier device-local watchdog sampled once per minute and restarted only
after four consecutive BAD samples. A natural 2026-09-24 channel incident was
user-visible for roughly three minutes yet self-healed before that threshold.
The watchdog behaved as designed, but its outer recovery latency was too long.

Current installed RDC reconnect bounds are:

- joining wedge: 30 s;
- heartbeat stale: 75 s;
- one recreate cap: 45 s;
- connection-state check cadence: 10 s.

V2 therefore uses elapsed BAD age rather than sample count:

```text
first persistent BAD observation -> bad-since epoch
BAD age < 120 s              -> native self-heal window
BAD age >= 120 s             -> evaluate restart safety gates
GOOD at any point            -> clear bad-since
```

The 120-second budget is the 75-second heartbeat-stale bound plus one complete
45-second recreate cap. The production runit loop polls every 30 seconds.

## Restart safety gates

A primary-S restart is eligible only when all are true:

1. the fixed primary S RDC runit service is currently running;
2. the fixed native log is readable;
3. the latest BAD marker is newer than the latest GOOD marker;
4. no authorization flow is newer than the latest Device ready marker;
5. persistent BAD age is at least 120 seconds;
6. the 15-minute restart cooldown is clear;
7. the persisted primary-S access session is fresh enough for safe restart.

BAD markers are limited to native channel error/closed/recreate/offline and
channel-subscription-timeout markers. GOOD markers are channel self-healed,
online, Device ready, and Received tool call.

Generic 401 text, Tailscale warnings, arbitrary network errors, or another
device's state are not restart authority.

At most one fixed command can restart the watched service:

```text
sv restart $PREFIX/var/service/desktop-commander-remote
```

A failed restart attempt enters the same 15-minute cooldown before another
attempt can occur.

## Production paths

- watchdog: `$HOME/.local/bin/rdc-health-watchdog`
- run file: `$PREFIX/var/service/desktop-commander-watchdog/run`
- watched RDC: `$PREFIX/var/service/desktop-commander-remote`
- watched log: `$HOME/.local/state/desktop-commander-remote/current`
- state: `$HOME/.local/state/desktop-commander-watchdog`
- persisted-session config: the existing primary-S Ubuntu/PRoot device config

The old `bad-count` file may remain for compatibility/observation but does not
grant restart authority in v2. V2 uses `bad-since-epoch`.

## Installer

```sh
sh ./install-s-termux.sh --check
sh ./install-s-termux.sh --apply
```

`--check` is read-only. `--apply` may write only the fixed watchdog script and
fixed watchdog run file. It never restarts RDC or the watchdog service.

Migration is accepted only when each existing target is one of:

- absent;
- exact v2 managed content;
- v2 managed marker with drift;
- the exact known legacy #2133 file SHA-256.

Foreign regular files, symlinks, and special files fail closed.

Repository source files remain ordinary 100644. Installation materializes the
two production targets as mode 700.

## Activation boundary

After merged-source installation, activation may restart only
`desktop-commander-watchdog` once so its loop changes from 60 seconds to
30 seconds. The primary RDC PID/generation must remain unchanged across that
activation.

Production `rdc-health-watchdog --check` must report a healthy/no-restart state
on the current healthy log before closure.

## Test mode

Tests may set the explicit test-mode variables documented in the scripts.
Fixture roots are restricted to `/tmp/mcl-s-rdc-watchdog-test-*` and
`/tmp/mcl-s-rdc-watchdog-install-test-*`; test mode cannot redirect production
paths.

Focused contract validation:

```sh
sh tests/test-contract.sh
```

The suite covers fresh BAD, 119 s, 120 s eligibility, self-heal reset,
authorization flow, stale session, cooldown, service-down, missing log,
restart success/failure, channel-subscription timeout, installer idempotence,
managed drift repair, foreign-file refusal, and symlink refusal.

## Evidence boundary

This owner improves bounded local recovery latency. It does not identify or fix
the common root cause of the synchronized 2026-09-24 S/S-Termux/M flap.
Natural long-duration channel evidence remains owned by #2143 and correlated
cross-endpoint interpretation remains separate.
