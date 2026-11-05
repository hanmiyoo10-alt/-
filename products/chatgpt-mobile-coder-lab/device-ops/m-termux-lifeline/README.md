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
                                  |
                         RECOVERED
                                  |
                  LifelinePolicy.COOLDOWN_MS settle
                                  |
              fresh prerequisite + heartbeat recheck
                                  |
          fixed RDC guard launcher (zero arguments)
                                  |
      fixed Tailscale guard launcher (zero arguments)
                                  |
                 post-recovery durability re-armed
```

The companion is the only initiator of liveness, recovery, and the bounded
post-recovery durability IPC. Termux does
not send a broadcast, ContentProvider call, local socket request, or network
message back to the companion.

## RUN_COMMAND result boundary

The Android companion already owns one fixed Termux `RUN_COMMAND` permission and
service path. V1 reuses that same reviewed transport for four fixed commands only:

- `~/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py --status`;
- `~/.local/bin/mcl-m-termux-lifeline-recover` with zero arguments;
- `~/.termux/boot/31-mcl-m-rdc-supervisor-guard` with zero arguments;
- `~/.termux/boot/32-mcl-m-tailscale-supervisor-guard` with zero arguments.

The two Boot launchers are not part of the emergency recovery script. They are
eligible only after the companion has independently verified `RECOVERED`, waited
the already-reviewed `LifelinePolicy.COOLDOWN_MS` settling window, rechecked
package/permission/policy prerequisites, and observed a fresh heartbeat.

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

## Post-recovery guard-ring durability

Emergency recovery stays target-only exactly as above. After the companion
classifies that same recovery generation as `RECOVERED`, it enters a separate
bounded durability phase instead of immediately recreating the long-lived
guard/anchor rings inside the phantom-pressure window.

The durability phase:

1. records the local recovered time for that recovery generation;
2. reuses `LifelinePolicy.COOLDOWN_MS` as the settling window and adds no new
   timing threshold;
3. continues bounded heartbeat probes while the cooldown settling window is
   still open;
4. fails closed if package state, RUN_COMMAND permission, or the explicit Termux
   policy acknowledgement becomes invalid;
5. if the heartbeat becomes stale during settling, exits the durability phase
   without a durability effect so the ordinary LifelinePolicy cooldown/recovery
   path can handle the new loss on the next watchdog tick;
6. after the cooldown boundary, requires one successful heartbeat timestamp at
   or after that boundary; if it is still missing, dispatches/waits only for the
   needed status probe;
7. once that post-settle heartbeat is present and fresh, gives the durability
   launcher sequence priority over the next periodic probe cycle;
8. makes exactly one durability attempt for that recovery generation;
9. invokes the fixed RDC Boot launcher with zero arguments, waits for its
   existing result callback, then invokes the fixed Tailscale Boot launcher with
   zero arguments;
10. accepts success only after both existing launchers return success.

Those launchers remain the owners of their fixed guard-service supervisor and
anchor convergence. The lifeline does not reimplement their runit logic, start a
global `runsvdir`, add a generic command/path surface, or retry the whole-Termux
loss/recovery event.

The bounded status vocabulary adds:

- `RECOVERED_SETTLING`;
- `POST_RECOVERY_SETTLING`;
- `POST_RECOVERY_DURABILITY_REARMING`;
- `POST_RECOVERY_DURABILITY_REARMED`;
- `POST_RECOVERY_DURABILITY_FAILED`.

A failed durability attempt is explicit and does not trigger another recovery
attempt or another loss stimulus. A later independent real loss may create a new
recovery generation and therefore a new one-shot durability phase.

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

## Explicit reboot auto re-arm

The Android companion has one separate durable user opt-in for reboot persistence.
Ordinary `Lifeline arm` starts only the current foreground service and does not
silently enable reboot persistence. The app exposes explicit enable/disable
controls for the `boot_auto_rearm_v1` preference, and `Lifeline disarm` clears
that preference before stopping the service so a deliberate disarm cannot
resurrect on the next reboot.

The manifest receiver accepts only `android.intent.action.BOOT_COMPLETED`. It is
not exported and there is no `LOCKED_BOOT_COMPLETED`, arbitrary broadcast, path,
command, package, or argv surface. Before requesting the fixed `LifelineService`,
the receiver requires all of the following current evidence:

- the explicit reboot auto-rearm preference is enabled;
- Termux is installed and not `FLAG_STOPPED`;
- the companion still holds `com.termux.permission.RUN_COMMAND`;
- the companion still holds `POST_NOTIFICATIONS`;
- the existing explicit Termux-policy acknowledgement is still set.

Any missing, stopped, denied, or unreadable prerequisite causes zero service
start effect. The receiver never grants a permission, writes Termux policy,
clears stopped state, changes Android settings, or invokes a recovery command.

Boot receiver dispatch is not health proof. The existing `LifelineService`
heartbeat and recovery state machine remains the only owner of `HEALTHY`; after
boot it must still obtain fresh fixed heartbeat evidence through the existing
RUN_COMMAND path. Phone reboot is also not #2756 process-loss acceptance.

Repository implementation/build proof does not install this APK or perform a
reboot. Live reboot persistence remains a later reviewed postmerge observation.

## Bounded observability

Normal durable evidence contains only semantic state. The companion never
records command stdout/stderr, process trees, PIDs, credentials, auth/session
data, arbitrary command output, Android identifiers, or caller-selected data.

The status surface may report states including `HEALTHY`,
`WAITING_FOR_FIRST_HEARTBEAT`, `NEEDS_MANUAL_RUN_COMMAND_PERMISSION`,
`NEEDS_MANUAL_TERMUX_POLICY`, `BLOCKED_FORCE_STOP_DOMAIN`,
`UNKNOWN_PACKAGE_STATE`, `RECOVERY_DISPATCHED`, `RECOVERY_VERIFYING`,
`RECOVERED_SETTLING`, `POST_RECOVERY_SETTLING`,
`POST_RECOVERY_DURABILITY_REARMING`,
`POST_RECOVERY_DURABILITY_REARMED`,
`POST_RECOVERY_DURABILITY_FAILED`, and `RECOVERY_FAILED`.

## Validation

Repository contract tests:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/tests -v

python3 -c "from pathlib import Path; p=Path('products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/termux/heartbeat-client.py'); compile(p.read_text(), str(p), 'exec')"

gradle \
  -p products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/android-companion \
  :app:testDebugUnitTest :app:assembleDebug

git diff --check
```

Source/build success does not install the APK or mutate M. Real-device
`HEALTHY` remains a later explicit postmerge acceptance proof.

## Exact-head review hardening

The RUN_COMMAND result path also preserves four callback/recovery currentness
invariants established during exact-head review:

- every operation callback URI contains a fresh random operation token rather
  than a process-local counter, so a PendingIntent created by an earlier service
  instance cannot become current after service recreation;
- recovery state is marked pending before the external RUN_COMMAND dispatch,
  so even an immediate result callback observes the correct recovery phase;
- RecoveryOutcome.VERIFY_TIMEOUT_MS is an absolute recovery deadline. A
  pending status probe never extends it, and a callback arriving at or after the
  deadline is ignored as recovery evidence;
- before every post-recovery status probe, the companion re-checks package
  stopped/readability state, its RUN_COMMAND permission, and the explicit user
  policy acknowledgement. A changed prerequisite fails closed without another
  probe.
