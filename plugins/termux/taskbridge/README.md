# TaskBridge v0.4

TaskBridge is a low-RAM, provider-neutral long-task control plane designed for Android + Termux.

It tracks job identity, lifecycle, heartbeat, reconnect/stall state, event history, local process execution, and Android notification observations without treating a lost UI/local observer as proof that a remote task failed.

## v0.4 scope

- Python standard library only.
- SQLite metadata store under `~/.local/state/taskbridge` by default.
- Lightweight resident coordinator plus short-lived workers.
- Resident daemon implementation: `lean_coordinator_v2_autowatch`.
- `shell` remains the executable local adapter.
- `chatgpt_notification` observes Android notifications using public Termux notification access.
- No ChatGPT cookies, private auth/session material, APK patching, or undocumented endpoints.
- Notification text is not persisted; only opaque hashes/counts and state metadata are stored.
- Existing local 3-confirmation calibration remains the gate for `HIGH` response-completion confidence.
- `autowatch-chatgpt` keeps at most one ChatGPT notification observer armed and automatically creates a fresh baseline after a completed detection.
- Automatic observer jobs use no wall-clock timeout (`0` internally) and are re-armed after 2 seconds following a normal completion.
- Observer read-loss/abnormal endings use a 30-second retry cooldown to avoid restart storms.
- Notification polling is configurable from 2 to 60 seconds; default is 5 seconds.
- Termux:Boot integration can install `~/.termux/boot/50-taskbridge` so the coordinator starts after reboot.
- Wake lock at boot is opt-in because it can increase standby battery use.

## Mobile usage

```bash
python taskbridge.py doctor
python taskbridge.py run -- sleep 60
python taskbridge.py list
python taskbridge.py status JOB_ID
python taskbridge.py events JOB_ID
python taskbridge.py cancel JOB_ID
```

Manual ChatGPT observation and calibration:

```bash
python taskbridge.py probe-chatgpt
python taskbridge.py watch-chatgpt --timeout 1800 --poll-interval 5
python taskbridge.py confirm-chatgpt JOB_ID
python taskbridge.py chatgpt-calibration
```

Continuous automatic ChatGPT observation:

```bash
python taskbridge.py autowatch-chatgpt enable --poll-interval 5
python taskbridge.py autowatch-chatgpt status
python taskbridge.py autowatch-chatgpt disable
```

When automatic watch is enabled, the coordinator maintains exactly one active `chatgpt_notification` observer for the configured package. A successful notification detection finishes that observer normally; after a short cooldown the coordinator creates a new observer with a fresh baseline. This prevents duplicate watchers while making repeated response notifications automatic.

The `HIGH` semantic remains installation-local correlation evidence only: `locally_calibrated_response_completion_signal`. It is not an official ChatGPT completion API and is not a universal guarantee across devices or app versions.

## Termux:Boot

Install the boot launcher:

```bash
python taskbridge.py boot install
python taskbridge.py boot status
```

Optional wake lock:

```bash
python taskbridge.py boot install --wake-lock
```

Remove it:

```bash
python taskbridge.py boot remove
```

Termux:Boot requires the add-on app to be installed from a compatible signing source and opened once after installation so Android permits its boot receiver to run. The generated boot script starts TaskBridge only; automatic ChatGPT watching resumes when `autowatch-chatgpt` is already enabled in local TaskBridge state.

The default boot script does **not** acquire a wake lock. Use `--wake-lock` only when stronger screen-off reliability is worth the additional standby battery cost.

## State contract

Logical states:

`CREATED -> ACTIVE -> SUSPECTED_STALL -> RECONNECTED -> COMPLETED / FAILED / CANCELLED / UNKNOWN`

`SUSPECTED_STALL` means local observation became unreliable. It is not automatically a remote failure.

For a manual ChatGPT observer, timeout becomes `UNKNOWN`, not `FAILED`, because absence of a notification is not evidence that ChatGPT itself failed.

## Resource evidence

The coordinator design target is <=25 MiB idle RSS on Android/Termux.

Real-device checkpoints on the current Android test device:

- v0.1: about 22.8 MiB daemon RSS.
- v0.2/v0.3 observer-enabled builds: about 26.6-26.9 MiB.
- v0.3.1 lean coordinator: `22600 KiB` (~22.1 MiB), VERIFIED below the 25 MiB target while the existing ChatGPT calibration remained `3/3`, `trusted=true`, `signal=HIGH`.

v0.4 adds only a small coordinator-side autowatch state module, but its final resident RSS and long-running automatic-watch behavior still require real-device verification.
