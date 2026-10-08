# M Termux lifeline v1

This owner covers one narrow failure domain: the M device loses the entire
Termux process group while Android still considers com.termux runnable.

It does not cover Android force-stop, FLAG_STOPPED, RDC relay/transport loss,
PocketRisu, authentication/session repair, or general device recovery.

## Architecture

~~~
M Android companion foreground service
        ↑ dynamic receiver exists only while armed
        ↑ fixed package-scoped TermuxAm broadcasts
        ↑ getSentFromUid() must equal installed com.termux UID
Termux heartbeat client

heartbeat stale
        ↓
read com.termux ApplicationInfo.FLAG_STOPPED
        ├─ stopped / unknown
        │    → block or fail closed
        └─ installed + not stopped
             ↓
manual prerequisites already satisfied
             ↓
one fixed RUN_COMMAND dispatch
             ↓
~/.local/bin/mcl-m-termux-lifeline-recover
        ├─ fixed RDC target guard --once
        ├─ fixed Tailscale target guard --once after RDC PASS
        └─ re-arm fixed heartbeat client after target repair
             ↓
fixed RECOVERY_OK broadcast + bounded v3 local receipt
~~~

The companion lives outside the Termux process and UID boundary. While armed it
registers one dynamic exported receiver for exactly two package-scoped actions.
The Android side checks BroadcastReceiver.getSentFromUid() against the actual
installed com.termux UID and rejects intents carrying caller payload. There is no
manifest receiver, synchronous sender ACK, or network listener.

## Safety boundary

The Android manifest intentionally contains only foreground-service permissions,
POST_NOTIFICATIONS for the user-visible lifeline status proof, plus
com.termux.permission.RUN_COMMAND. There is no INTERNET, accessibility, overlay,
wake-lock, device-admin, root, shared-UID, or exported service surface.
POST_NOTIFICATIONS is requested only from the explicit in-app notification
permission button on Android 13+; launch and arm never request it automatically.

RUN_COMMAND is fixed to:
- package com.termux;
- service com.termux.app.RunCommandService;
- action com.termux.RUN_COMMAND;
- path $HOME/.local/bin/mcl-m-termux-lifeline-recover;
- zero arguments;
- fixed Termux home working directory;
- background execution.

There is no caller-selected command, path, argument, working directory,
environment, stdin, result PendingIntent, terminal foreground request, retry
count, or fallback executable.

The recovery script never starts a global runsvdir. It may invoke only the two
already-reviewed fixed M target guards with literal `--once`, sequenced RDC
before Tailscale. Their own contracts remain the owner of RDC and Tailscale
supervisor repair. The emergency recovery path does not invoke either Termux:Boot
guard launcher and therefore does not intentionally re-arm the guard-service /
independent-anchor rings while Android process pressure is already high.

## Force-stop separation

A stale heartbeat is not enough to authorize recovery.

The companion first reads ApplicationInfo.FLAG_STOPPED:
- STOPPED → BLOCKED_FORCE_STOP_DOMAIN;
- package state unreadable/unknown → UNKNOWN_PACKAGE_STATE;
- installed and not stopped → continue to prerequisite checks.

The companion never clears stopped state and never issues force-stop or package
state mutation. The force-stop domain belongs to the next separate packet.

## Manual prerequisites and activation

The implementation does not grant com.termux.permission.RUN_COMMAND and does
not write Termux allow-external-apps=true.

Termux RUN_COMMAND requires both user-controlled prerequisites. Live activation
therefore remains a later explicit opt-in:
1. install the companion APK;
2. press the in-app notification permission button and grant notification
   permission on Android 13+ so the reviewed HEALTHY status surface is visible;
3. grant its RUN_COMMAND permission through Android;
4. set allow-external-apps=true in the user's Termux configuration;
5. materialize the fixed Termux files with termux/install.sh --install;
6. arm the heartbeat and companion service deliberately.

Notification permission affects proof/status visibility only. It does not grant
RUN_COMMAND recovery authority or replace either Termux prerequisite.

install.sh only copies the reviewed fixed files and modes. It does not change
Android permissions, Termux settings, or start runtime processes.

Reference: Termux RUN_COMMAND Intent documentation.

## Termux files

Repository files map to fixed locations:
- heartbeat-client.py → ~/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py;
- mcl-m-termux-lifeline-recover → ~/.local/bin/mcl-m-termux-lifeline-recover;
- 30-mcl-m-termux-lifeline-heartbeat →
  ~/.termux/boot/30-mcl-m-termux-lifeline-heartbeat.

The heartbeat client uses one local singleton lock and a 10-second heartbeat.
Each send invokes the installed TermuxAm wrapper with only `broadcast -a <fixed
reviewed action> -p io.hanmiyoo.mcl.termuxlifeline`. The fixed `--status`
operation proves the singleton lock is actively held, while fixed
`--heartbeat-once` performs exactly one reviewed heartbeat dispatch. Recovery
re-arm is accepted only after singleton liveness, one heartbeat dispatch, and a
second singleton-liveness proof all succeed. The sender never claims a receiver
ACK. The companion declares a heartbeat stale after 45 seconds. Each loss episode
gets at most one recovery attempt, with a five-minute cooldown before a later
episode.

Recovery is accepted only from receiver-side truth when both a post-attempt
heartbeat broadcast and the fixed RECOVERY_OK broadcast arrive through the same
UID/action/package gate before the 30-second verification timeout.

## Bounded observability

Durable/local receipts contain only semantic status:
- RDC target repair pass/fail;
- Tailscale target repair pass/fail/not-run;
- heartbeat startup proof pass/fail/not-run, rendered as `heartbeat_dispatch`;
- RECOVERY_OK dispatch pass/fail/not-run;
- fixed `guard_ring_started=false`;
- withheld details.

The Termux recovery receipt is `mcl-m-termux-lifeline-recovery.v3`. A target
`pass` proves only that the fixed target guard's bounded `--once` effect
returned successfully; it is not durable-survival proof under Android phantom
trimming. `heartbeat_dispatch=pass` additionally requires active singleton
proof, one fixed heartbeat dispatch, and active singleton proof again. The
receipt still does not claim companion acknowledgement.
Receiver-side heartbeat/RECOVERY_OK timestamps remain the recovery truth used by
the Android state machine.

No process tree, PID, command output, credentials, auth/session data, broadcast
payload transcript, or arbitrary stdout/stderr is collected as evidence.

## Validation

Repository contract tests:

~~~sh
python3 -m unittest discover \
  -s products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/tests -v

python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/termux/heartbeat-client.py

gradle \
  -p products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline/android-companion \
  :app:testDebugUnitTest :app:assembleDebug

git diff --check
~~~

The specialized MCL M Termux Lifeline workflow runs these contracts and builds
a debug APK for review. Building an APK is not live activation.

## Current activation state

Repository implementation and APK build evidence are separate from device
activation. No APK install, permission grant, Termux settings change, Termux
process kill, or live whole-process-loss experiment is authorized by this owner
implementation stage.
