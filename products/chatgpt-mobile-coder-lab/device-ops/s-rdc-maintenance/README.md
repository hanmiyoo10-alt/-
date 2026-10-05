# Primary S RDC maintenance owner

This owner provides one bounded maintenance path for the existing primary
server-phone `S` Remote Desktop Commander endpoint.

V1 is deliberately fixed to one migration:

```text
@wonderwhy-er/desktop-commander
0.2.48 → 0.2.52
```

It is not the channel-failure watchdog. Persistent channel-stall recovery remains
owned by `device-ops/s-rdc-channel-watchdog/**`. The direct-Termux `S-Termux`
endpoint remains a separate owner and stays pinned to 0.2.51.

## Why this owner exists

The primary S service was already healthy when 0.2.52 became available. The
existing watchdog may restart that service only after its reviewed persistent-BAD
recovery gates. A planned healthy package migration therefore needs a separate,
explicit effect reason instead of widening incident recovery semantics.

## Fixed topology

Production execution is from the existing S-Termux control surface. The owner
targets only:

- the primary S bundle inside the Ubuntu PRoot rootfs;
- one fixed 0.2.52 staging sibling;
- one fixed 0.2.48 rollback sibling;
- the fixed primary-S `desktop-commander-remote` runit service;
- the existing primary-S bounded log and persisted-session evidence;
- the existing primary-S channel-watchdog `--check` gate.
No caller selects a version, package, service, path, command, URL, registry,
shell, device, or retry count.

## Commands

The repository source exposes:

```text
./mcl-s-rdc-maintenance --check
./mcl-s-rdc-maintenance --stage
./mcl-s-rdc-maintenance --activate
./mcl-s-rdc-maintenance --label-check
./mcl-s-rdc-maintenance --label-stage
./mcl-s-rdc-maintenance --label-activate

./install-s-termux.sh --check
./install-s-termux.sh --apply
```

The installer only materializes the exact maintenance controller into the fixed
S-Termux local-bin target. It never stages a package and never restarts a
service.

`--check` is read-only. It observes the active/staged/rollback bundle versions
and fixed service state and emits bounded semantic fields only.

`--stage` may install only exact Desktop Commander 0.2.52 into the fixed sibling
staging directory. It must leave the running 0.2.48 bundle and service untouched.
A repeated exact stage is a no-op. Foreign or symlink staging state blocks.

## Activation contract

`--activate` requires all of the following before promotion:

1. active primary-S bundle is exact 0.2.48;
2. fixed staged bundle is exact 0.2.52 and carries the owner marker;
3. rollback location is absent;
4. primary-S runit service reports running;
5. the existing channel watchdog `--check` reports healthy;
6. persisted primary-S session evidence is locally fresh enough for the same
   restart-safety class used by the watchdog;
7. the fixed local RDC log is readable.

The target bundle is promoted by same-filesystem fixed-path renames and the
owner requests exactly one primary-S restart. It then waits only for a bounded
new local `Device ready` observation and rejects a new authorization flow.

If target readiness is not proven, the owner restores the preserved exact
0.2.48 bundle and requests at most one rollback restart. There is no retry loop,
force break, takeover, latest-wins rule, or automatic widening.

A successful local activation is not the whole live proof. The packet still
requires an external Remote Desktop Commander roundtrip on S and preservation
evidence for S-Termux 0.2.51 before `LIVE_PROVEN`.

## Primary-S display-label repair

After the 0.2.52 migration is already complete, the same owner exposes one
separate reversible label repair. The live service run is accepted only at the
reviewed pre-label SHA-256
`c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252`.

`--label-stage` is restart-free. It materializes the repository-owned
`device-name-shim.cjs` and one exact staged run sibling whose only semantic
change is a fixed Node `--require` for that shim. The deterministic candidate
run SHA-256 is
`e498f0350f651ebb03a859aac9409806c14bab98b7806e9b7c57a970b1b62069`.

The shim accepts only the already-exported label `S` and overrides
`os.hostname()` process-locally. There is no caller-selected label, global
`NODE_OPTIONS`, Android/PRoot hostname mutation or vendor package patch.

`--label-activate` requires exact 0.2.52 active bundle, exact 0.2.48 rollback
bundle, running service, healthy watchdog, fresh persisted session and readable
log. It preserves the exact original run, promotes the exact staged run and
requests one restart. Success requires a new `Device ready: S` observation and
no new authorization flow. Failure restores the exact original run and requests
at most one rollback restart. Repeating an already exact successful state is a
no-op.

## Evidence boundary

Normal output contains only:

```text
schema
operation
active_version
staged
backup
service
result
details=withheld
```

The owner does not emit provider tokens, authorization codes, device/session
identifiers, raw configuration, raw logs, process trees, PIDs, command lines,
or account identity.

## Explicit non-ownership

This owner does not modify:

- `S-Termux` or its 0.2.51 package/profile;
- the primary-S channel-watchdog source or timing contract;
- PocketRisu, Tailscale, sshd, Termux:Boot, or global runit ownership;
- Git branches/worktrees or D-013/D-014 state;
- M/L routes;
- release or production state.

The controller has no generic package manager, service controller, or arbitrary
shell surface.

## Validation

Repository contract validation:

```text
sh products/chatgpt-mobile-coder-lab/device-ops/s-rdc-maintenance/tests/test-contract.sh
sh -n products/chatgpt-mobile-coder-lab/device-ops/s-rdc-maintenance/mcl-s-rdc-maintenance
sh -n products/chatgpt-mobile-coder-lab/device-ops/s-rdc-maintenance/install-s-termux.sh
```

The test harness uses only fixed `/tmp/mcl-s-rdc-maintenance-*` fixture roots.
Test relocation never changes production paths.

## Live-stage boundary

Implementation and merge do not activate the device migration. After merged-main
convergence, the owning packet may separately enter `EXPERIMENT_CLOSE` and run
the exact merged installer/check/stage/activate sequence under fresh S/S-Termux
evidence. Failure remains failure or explicit exact rollback; no result may be
promoted merely because package installation succeeded.
