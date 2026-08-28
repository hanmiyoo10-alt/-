# TaskBridge v0.1

TaskBridge is a low-RAM, provider-neutral long-task control plane designed for Android + Termux.

It tracks job identity, lifecycle, heartbeat, reconnect/stall state, event history, local process execution, and optional Android notifications without treating a lost UI/local observer as proof that a remote task failed.

## v0.1 scope

- Python standard library only.
- SQLite metadata store under `~/.local/state/taskbridge` by default.
- One lightweight coordinator daemon; shell workers exist only while jobs are active.
- `shell` is the first executable adapter.
- ChatGPT remains an observer/integration target; v0.1 does **not** scrape ChatGPT cookies, private auth, or undocumented endpoints.
- Large outputs are written to per-job log files and referenced by path rather than retained in RAM/SQLite.

## Mobile usage

```bash
python taskbridge.py doctor
python taskbridge.py run -- sleep 60
python taskbridge.py list
python taskbridge.py status JOB_ID
python taskbridge.py events JOB_ID
python taskbridge.py cancel JOB_ID
```

Use `TASKBRIDGE_STATE_DIR=/some/path` or `--state-dir /some/path` to override local state storage.

## State contract

Logical states:

`CREATED -> ACTIVE -> SUSPECTED_STALL -> RECONNECTED -> COMPLETED / FAILED / CANCELLED / UNKNOWN`

`SUSPECTED_STALL` means local observation became unreliable. It is not automatically a remote failure.

## Resource target

The Python v0.1 coordinator has a design target of <=25 MB idle RSS on a representative Android/Termux device. This is a target, not a verified measurement, until real-device validation is completed.
