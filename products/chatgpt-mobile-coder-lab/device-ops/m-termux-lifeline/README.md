# M Termux lifeline v1

This owner covers one narrow failure domain: the M device loses the Termux
control-plane process group while Android still considers `com.termux` runnable.

It does not cover Android force-stop, `FLAG_STOPPED`, RDC relay/transport loss,
PocketRisu, authentication/session repair, or general device recovery.

## Architecture

```text
user explicitly arms Android companion foreground service
        |
        v
non-exported LifelineService watchdog
        |
        | fixed RUN_COMMAND + one-shot result PendingIntent
        v
heartbeat-client.py --status
        |
        +-- exit 0 -> current singleton is active -> HEALTHY
        |
        +-- nonzero/missing/late result -> no liveness refresh
                                  |
                                  v
                        existing stale/cooldown policy
                                  |
                         fixed RUN_COMMAND recovery
                                  |
             mcl-m-termux-lifeline-recover
                 | RDC target guard --once
                 | Tailscale target guard --once
                 | re-arm heartbeat singleton
                 v
                         command-result callback
                                  |
                         fixed --status probe
                                  |
                         existing recovery outcome
```

The companion is the only initiator of liveness and recovery IPC. Termux does
not send a broadcast, ContentProvider call, local socket request, or network
message back to the companion.

## RUN_COMMAND result boundary

The Android companion already owns one fixed Termux `RUN_COMMAND` permission and
service path. V1 reuses that same reviewed transport for two fixed commands only:

- `~/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py --status`;
- `~/.local/bin/mcl-m-termux-lifeline-recover` with zero arguments.

Each invocation creates a fresh one-shot mutable PendingIntent that targets the
same non-exported `LifelineService`. Mutability exists only so Termux can fill
its documented command-result bundle. Currentness is not trusted from mutable
extras: the companion binds each outstanding operation to a unique creator-set
callback URI and in-memory operation kind. A late result, unexpected callback
URI, missing bundle, Termux internal error, or nonzero command exit code fails
closed.

The companion consumes only the documented result bundle's internal-error code
and exit code. It does not read, log, persist, or treat stdout/stderr as
authority.

If the companion process dies, its in-memory pending operation disappears. A
late PendingIntent may start a service instance, but a result callback received
while the service is not already armed is ignored and the service stops. A
callback therefore cannot silently re-arm a dead companion.

## Heartbeat singleton

`heartbeat-client.py` is now a local liveness primitive only. It owns one
singleton file lock and sleeps while holding that lock. It has exactly two
modes:

- no arguments: acquire and hold the singleton lock;
- `--status`: bounded proof that another live heartbeat singleton holds the lock.

There is no Termux-to-companion broadcast, ContentProvider, socket, arbitrary
Android command, or network path in the heartbeat client.

The boot helper still arms this singleton. Recovery re-arms it only after both
fixed target guards pass.

## Recovery

The recovery entry remains target-only and sequential:

```text
fixed RDC target guard --once
→ fixed Tailscale target guard --once
→ re-arm heartbeat singleton
→ prove heartbeat --status
```

It never starts a global `runsvdir` and never invokes either Termux:Boot guard
launcher. The guard-ring owners remain unchanged for their own boot semantics.

The local recovery receipt is `mcl-m-termux-lifeline-recovery.v4`:

- `rdc_target=pass|fail`;
- `tailscale_target=pass|fail|not_run`;
- `heartbeat_active=pass|fail|not_run`;
- `guard_ring_started=false`;
- `details=withheld`.

The receipt is bounded local observability only. The Android companion does not
parse its stdout. Recovery callback success proves only that the fixed recovery
entry exited successfully. The companion then requires a separate fresh
`heartbeat-client.py --status` result before the existing recovery outcome may
be accepted.

## Force-stop separation

The watchdog checks `ApplicationInfo.FLAG_STOPPED` before issuing a probe or
recovery command:

- STOPPED -> `BLOCKED_FORCE_STOP_DOMAIN`;
- unreadable/unknown -> `UNKNOWN_PACKAGE_STATE`;
- installed and not stopped -> continue to manual prerequisite checks.

The companion never clears stopped state and never issues force-stop or package
state mutation.

## Manual prerequisites and activation

The implementation does not grant `com.termux.permission.RUN_COMMAND` and does
not write `allow-external-apps=true`.

Live activation therefore remains explicit:

1. install the exact reviewed companion APK;
2. explicitly grant notification permission on Android 13+ so the status surface
   is visible;
3. explicitly grant the companion's RUN_COMMAND permission;
4. set `allow-external-apps=true` in Termux yourself and acknowledge that policy
   in the companion;
5. materialize the fixed Termux files through `termux/install.sh --install`;
6. arm the heartbeat singleton and companion deliberately.

The watchdog will not probe Termux until package state is readable/not-stopped,
RUN_COMMAND permission is present, and the user policy acknowledgement is set.

## Bounded observability

Normal durable evidence contains only semantic state. The companion never
records command stdout/stderr, process trees, PIDs, credentials, auth/session
data, arbitrary command output, Android identifiers, or caller-selected data.

The status surface may report states including `HEALTHY`,
`WAITING_FOR_FIRST_HEARTBEAT`, `NEEDS_MANUAL_RUN_COMMAND_PERMISSION`,
`NEEDS_MANUAL_TERMUX_POLICY`, `BLOCKED_FORCE_STOP_DOMAIN`,
`UNKNOWN_PACKAGE_STATE`, `RECOVERY_DISPATCHED`, `RECOVERY_VERIFYING`,
`RECOVERED`, and `RECOVERY_FAILED`.

## Validation

Repository contract tests:

```sh
python3 -m unittest discover \
  -s products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/tests -v

python3 -c "from pathlib import Path; p=Path('products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/termux/heartbeat-client.py'); compile(p.read_text(), str(p), 'exec')"

gradle \
  -p products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/android-companion \
  :app:testDebugUnitTest :app:assembleDebug

git diff --check
```

Source/build success does not install the APK or mutate M. Real-device
`HEALTHY` remains a later explicit postmerge acceptance proof.
