# Primary S RDC reversible retirement owner

This owner is the second thin-phone retirement wave for Mobile Coder Lab. It
owns only the reversible availability state of the primary server-phone
Ubuntu/PRoot Remote Desktop Commander endpoint together with the watchdog that
can restart that endpoint.

It does not own the direct-Termux `S-Termux` endpoint, PocketRisu, Tailscale,
sshd, Android state, routing policy, package installation, authentication,
session material, Git state, release, or production.

## Fixed targets

Production paths are fixed:

```text
$PREFIX/var/service/desktop-commander-watchdog
$PREFIX/var/service/desktop-commander-remote
$PREFIX/var/service/desktop-commander-remote-termux   # preservation gate only
```

The primary S run file, primary 0.2.52 bundle, watchdog run file and watchdog
script must match reviewed exact identities before any effect. The sibling
S-Termux service must report `run:`.

## Operations

The source file is ordinary repository mode 100644 and is invoked explicitly:

```sh
sh ./mcl-s-primary-rdc-retirement.sh --check
sh ./mcl-s-primary-rdc-retirement.sh --deactivate
sh ./mcl-s-primary-rdc-retirement.sh --activate
```

No operation accepts a service, path, version, command, retry count or timeout.

### Deactivate

From the exact active state only:

1. create/validate a mode-0600 watchdog `down` marker;
2. issue one fixed `sv down` to the watchdog;
3. observe status until exact `down:` or the fixed observation budget expires;
4. create/validate a mode-0600 primary RDC `down` marker;
5. issue one fixed `sv down` to primary RDC;
6. observe status until exact `down:`;
7. require the sibling S-Termux service still `run:`.

Status observation never repeats `sv down`. This is deliberate protection
against the false-negative class discovered in the first retirement wave.

### Activate / rollback

From the exact retired state only:

1. remove only the managed primary down marker;
2. issue one fixed `sv up` to primary RDC and observe exact `run:`;
3. remove only the managed watchdog down marker;
4. issue one fixed `sv up` to the watchdog and observe exact `run:`;
5. require S-Termux still `run:`.

Exact already-active/already-retired states are idempotent. Partial, foreign,
symlink, mode-drifted, SHA-drifted, wrong-version, missing-sibling or unknown
states fail closed.

## Test mode

Deterministic tests may redirect only into
`/tmp/mcl-s-primary-rdc-retirement-test-*` and may shorten the observation
budget. Production cannot select those values.

The fixture proves delayed runit visibility with one effect per target,
effect order, timeout/non-convergence classification, marker safety,
active/retired idempotence, partial-state rejection, identity rejection and
sibling preservation.

## Live boundary

Repository implementation and merge do not retire services. The owning packet
must separately enter EXPERIMENT_CLOSE with fresh main/#485, D-013,
continuity-zero, exact primary/watchdog identity, independent S-Termux health,
and preserved PocketRisu/Tailscale/sshd evidence.

Source packet: #3281.
