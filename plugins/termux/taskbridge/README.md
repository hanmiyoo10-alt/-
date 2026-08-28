# TaskBridge v0.2

TaskBridge is a low-RAM, provider-neutral long-task control plane designed for Android + Termux.

It tracks job identity, lifecycle, heartbeat, reconnect/stall state, event history, local process execution, and optional Android notifications without treating a lost UI/local observer as proof that a remote task failed.

## v0.2 scope

- Python standard library only.
- SQLite metadata store under `~/.local/state/taskbridge` by default.
- One lightweight coordinator daemon; workers exist only while jobs are active.
- `shell` remains the executable adapter.
- `chatgpt_notification` is an observation-only adapter using Android notification access through `termux-notification-list`.
- ChatGPT integration does **not** scrape ChatGPT cookies, private auth, or undocumented endpoints.
- Notification text is not persisted by the observer; only opaque SHA-256 fingerprints and counts are stored.
- A newly observed ChatGPT notification is initially a `MEDIUM` confidence candidate signal, not proof that a text response completed. Real-device correlation is required before strengthening that semantic claim.
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

ChatGPT notification observation:

```bash
python taskbridge.py probe-chatgpt
python taskbridge.py watch-chatgpt --timeout 1800
```

`probe-chatgpt` checks whether Termux can read active notifications for the official ChatGPT Android package (`com.openai.chatgpt`). Android may require the user to grant Termux:API Notification Access first.

`watch-chatgpt` takes a privacy-preserving baseline and watches for a new or changed ChatGPT notification. If one appears, TaskBridge records `CHATGPT_NOTIFICATION_SEEN`, marks the observer job `COMPLETED` with `signal=MEDIUM`, and emits a local TaskBridge notification when `termux-notification` is available.

Use `TASKBRIDGE_STATE_DIR=/some/path` or `--state-dir /some/path` to override local state storage.

## State contract

Logical states:

`CREATED -> ACTIVE -> SUSPECTED_STALL -> RECONNECTED -> COMPLETED / FAILED / CANCELLED / UNKNOWN`

`SUSPECTED_STALL` means local observation became unreliable. It is not automatically a remote failure.

For the ChatGPT observer, an observation timeout becomes `UNKNOWN`, not `FAILED`, because absence of a notification is not evidence that ChatGPT itself failed.

## Resource evidence

The coordinator design target is <=25 MB idle RSS on Android/Termux. Real-device validation on the current test device has observed the daemon at roughly 22.8 MiB RSS while shell jobs and notifications were working. This is one-device evidence, not a guarantee across Android vendors or OS versions.
