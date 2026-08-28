# TaskBridge v0.3.1

TaskBridge is a low-RAM, provider-neutral long-task control plane designed for Android + Termux.

It tracks job identity, lifecycle, heartbeat, reconnect/stall state, event history, local process execution, and optional Android notifications without treating a lost UI/local observer as proof that a remote task failed.

## v0.3.1 scope

- Python standard library only.
- SQLite metadata store under `~/.local/state/taskbridge` by default.
- One lightweight coordinator daemon; workers exist only while jobs are active.
- The resident coordinator now runs from dedicated `coordinator.py` instead of keeping the full CLI/ChatGPT integration stack imported in the daemon process.
- `taskbridge.py` lazy-loads ChatGPT/calibration/notifier/runtime helpers only for commands that actually need them.
- `doctor` exposes `daemon_impl`; the optimized daemon reports `lean_coordinator_v1`.
- `shell` remains the executable adapter.
- `chatgpt_notification` is an observation-only adapter using Android notification access through `termux-notification-list`.
- ChatGPT integration does **not** scrape ChatGPT cookies, private auth, or undocumented endpoints.
- Notification text is not persisted by the observer; only opaque SHA-256 fingerprints and counts are stored.
- A newly observed ChatGPT notification remains a `MEDIUM` confidence candidate signal by default.
- A user may explicitly confirm completed observer jobs with `confirm-chatgpt JOB_ID`. Three unique local confirmations for the same package calibrate that **local TaskBridge state directory only**. Future matching notifications are then reported as `HIGH` confidence with semantic `locally_calibrated_response_completion_signal`.
- Local calibration is correlation evidence, not an official ChatGPT completion API and not a universal guarantee across devices, Android versions, or ChatGPT app versions.
- `watch-chatgpt` refuses to create another observer while one for the same package is already in `CREATED`, `ACTIVE`, or `RECONNECTED`, preventing duplicate watchers and duplicate completion alerts.
- Large shell outputs are written to per-job log files and referenced by path rather than retained in RAM/SQLite.

## Mobile usage

```bash
python taskbridge.py doctor
python taskbridge.py run -- sleep 60
python taskbridge.py list
python taskbridge.py status JOB_ID
python taskbridge.py events JOB_ID
python taskbridge.py cancel JOB_ID
```

ChatGPT notification observation and local calibration:

```bash
python taskbridge.py probe-chatgpt
python taskbridge.py watch-chatgpt --timeout 1800
python taskbridge.py confirm-chatgpt JOB_ID
python taskbridge.py chatgpt-calibration
```

`probe-chatgpt` checks whether Termux can read active notifications for the official ChatGPT Android package (`com.openai.chatgpt`). Android may require the user to grant Termux:API Notification Access first.

`watch-chatgpt` takes a privacy-preserving baseline and watches for a new or changed ChatGPT notification. Without local calibration, TaskBridge records `CHATGPT_NOTIFICATION_SEEN`, marks the observer job `COMPLETED` with `signal=MEDIUM`, and emits a local TaskBridge notification when `termux-notification` is available.

`confirm-chatgpt JOB_ID` is an explicit user assertion that a specific completed observer notification corresponded to an actual ChatGPT response completion. Only completed `chatgpt_notification` jobs containing `CHATGPT_NOTIFICATION_SEEN` are accepted, and the same job cannot increase the calibration count twice.

After three unique confirmations in the same local state directory, future observed ChatGPT notifications for that package finish with `signal=HIGH` and the local-only calibrated semantic. `doctor` and `chatgpt-calibration` show the calibration count and trust state.

Use `TASKBRIDGE_STATE_DIR=/some/path` or `--state-dir /some/path` to override local state storage.

## State contract

Logical states:

`CREATED -> ACTIVE -> SUSPECTED_STALL -> RECONNECTED -> COMPLETED / FAILED / CANCELLED / UNKNOWN`

`SUSPECTED_STALL` means local observation became unreliable. It is not automatically a remote failure.

For the ChatGPT observer, an observation timeout becomes `UNKNOWN`, not `FAILED`, because absence of a notification is not evidence that ChatGPT itself failed.

## Resource evidence

The coordinator design target remains <=25 MB idle RSS on Android/Termux. Earlier v0.1 real-device runs were roughly 22.8 MiB RSS; v0.2/v0.3 observer-enabled builds were later observed around 26.6-26.9 MiB on the same Android device. v0.3.1 changes the resident process architecture specifically to remove full CLI/ChatGPT imports from the coordinator. The expected RSS reduction must be verified on the real device before the <=25 MB target can be marked VERIFIED.
