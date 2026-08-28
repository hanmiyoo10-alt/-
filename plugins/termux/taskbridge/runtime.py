from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from adapters import shell as shell_adapter
import notifier
from store import Store, utc_ts


def pid_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    else:
        return True


def terminate_pid(pid: int | None, sig: int = signal.SIGTERM) -> bool:
    if not pid or not pid_alive(pid):
        return False
    try:
        os.kill(pid, sig)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def launch_detached(args: list[str], *, cwd: Path | None = None) -> int:
    with open(os.devnull, "rb") as devnull_in, open(os.devnull, "ab") as devnull_out:
        proc = subprocess.Popen(
            args,
            stdin=devnull_in,
            stdout=devnull_out,
            stderr=devnull_out,
            cwd=str(cwd) if cwd else None,
            start_new_session=True,
            close_fds=True,
        )
    return int(proc.pid)


def run_worker(store: Store, job_id: str, heartbeat_interval: float = 5.0) -> int:
    job = store.get_job(job_id)
    if job["adapter"] != "shell":
        store.transition(job_id, "FAILED", event_type="ADAPTER_UNSUPPORTED", error_code="ADAPTER_UNSUPPORTED", local_state="STOPPED", desired_action="NONE")
        return 2
    if job["logical_state"] in {"COMPLETED", "FAILED", "CANCELLED"}:
        return 0

    stdout_path, stderr_path = store.job_paths(job_id)
    store.transition(
        job_id,
        "ACTIVE" if job["logical_state"] == "CREATED" else "RECONNECTED",
        event_type="WORKER_STARTED",
        worker_pid=os.getpid(),
        local_state="RUNNING",
        remote_state="LOCAL_PROCESS",
        signal_confidence="HIGH",
        desired_action="NONE",
        started_at=job.get("started_at") or utc_ts(),
        last_seen=utc_ts(),
        result_ref=str(stdout_path),
    )

    try:
        with stdout_path.open("ab", buffering=0) as out, stderr_path.open("ab", buffering=0) as err:
            child = shell_adapter.spawn(job["command"], out, err)
            store.update_fields(job_id, child_pid=int(child.pid))
            store.add_event(job_id, "CHILD_STARTED", {"pid": int(child.pid)})
            while True:
                rc = child.poll()
                if rc is not None:
                    break
                store.heartbeat(job_id)
                time.sleep(max(0.5, heartbeat_interval))
    except FileNotFoundError:
        store.transition(job_id, "FAILED", event_type="EXEC_NOT_FOUND", error_code="EXEC_NOT_FOUND", local_state="STOPPED", desired_action="NONE")
        return 127
    except Exception as exc:
        current = store.get_job(job_id)
        if current["logical_state"] == "CANCELLED":
            return 0
        store.transition(job_id, "FAILED", event_type="WORKER_EXCEPTION", error_code=type(exc).__name__, local_state="STOPPED", desired_action="NONE")
        return 1

    current = store.get_job(job_id)
    if current["logical_state"] == "CANCELLED":
        return int(rc)
    final = "COMPLETED" if rc == 0 else "FAILED"
    store.transition(
        job_id,
        final,
        event_type="PROCESS_EXIT",
        detail={"exit_code": int(rc)},
        exit_code=int(rc),
        local_state="STOPPED",
        remote_state="LOCAL_PROCESS",
        signal_confidence="HIGH",
        desired_action="NONE",
        last_seen=utc_ts(),
        worker_pid=None,
        child_pid=None,
    )
    notifier.notify("TaskBridge 작업 완료" if rc == 0 else "TaskBridge 작업 실패", f"{job_id} · exit={int(rc)}", notification_id=f"taskbridge-{job_id}")
    return int(rc)


def adopt_child(store: Store, job_id: str, child_pid: int, interval: float = 5.0) -> int:
    job = store.get_job(job_id)
    if not pid_alive(child_pid):
        if job["logical_state"] not in {"COMPLETED", "FAILED", "CANCELLED"}:
            store.transition(job_id, "UNKNOWN", event_type="ADOPT_TARGET_GONE", local_state="STOPPED", signal_confidence="LOW", worker_pid=None, child_pid=None)
        return 0
    if job["logical_state"] in {"SUSPECTED_STALL", "UNKNOWN"}:
        store.transition(job_id, "RECONNECTED", event_type="ADOPT_STARTED", local_state="RUNNING", signal_confidence="MEDIUM", worker_pid=os.getpid())
    while pid_alive(child_pid):
        store.heartbeat(job_id, local_state="RUNNING")
        time.sleep(max(0.5, interval))
    job = store.get_job(job_id)
    if job["logical_state"] not in {"COMPLETED", "FAILED", "CANCELLED"}:
        store.transition(
            job_id,
            "UNKNOWN",
            event_type="ADOPT_TARGET_EXIT_UNKNOWN",
            detail={"reason": "exit code unavailable after parent/worker loss"},
            local_state="STOPPED",
            signal_confidence="LOW",
            worker_pid=None,
            child_pid=None,
        )
    return 0


def daemon_loop(store: Store, script_path: Path, interval: float = 2.0) -> int:
    store.set_meta("daemon_pid", str(os.getpid()))
    store.set_meta("daemon_started_at", str(utc_ts()))
    while True:
        try:
            for job in store.list_jobs(limit=500):
                state = job["logical_state"]
                if state in {"COMPLETED", "FAILED", "CANCELLED"}:
                    continue
                action = job["desired_action"]
                if action == "CANCEL":
                    terminate_pid(job.get("child_pid"))
                    terminate_pid(job.get("worker_pid"))
                    store.transition(job["job_id"], "CANCELLED", event_type="CANCELLED_BY_REQUEST", local_state="STOPPED", signal_confidence="HIGH", desired_action="NONE", worker_pid=None, child_pid=None)
                    continue
                if action == "RUN" and state == "CREATED" and not pid_alive(job.get("worker_pid")):
                    pid = launch_detached([sys.executable, str(script_path), "--state-dir", str(store.state_dir), "_worker", job["job_id"]])
                    store.update_fields(job["job_id"], worker_pid=pid, local_state="STARTING", desired_action="NONE")
                    store.add_event(job["job_id"], "WORKER_LAUNCHED", {"pid": pid})
                    continue
                if state in {"ACTIVE", "RECONNECTED"} and not pid_alive(job.get("worker_pid")):
                    child_pid = job.get("child_pid")
                    if child_pid and pid_alive(child_pid):
                        store.transition(job["job_id"], "SUSPECTED_STALL", event_type="WORKER_LOST_CHILD_ALIVE", local_state="STALE", signal_confidence="MEDIUM", worker_pid=None)
                        adopt_pid = launch_detached([sys.executable, str(script_path), "--state-dir", str(store.state_dir), "_adopt", job["job_id"], str(child_pid)])
                        store.update_fields(job["job_id"], worker_pid=adopt_pid)
                    else:
                        store.transition(job["job_id"], "SUSPECTED_STALL", event_type="WORKER_LOST", local_state="STALE", signal_confidence="LOW", worker_pid=None)
            time.sleep(max(0.5, interval))
        except KeyboardInterrupt:
            break
        except Exception:
            time.sleep(max(1.0, interval))
    return 0


def process_rss_kb(pid: int | None = None) -> int | None:
    target = "self" if pid is None else str(pid)
    try:
        for line in Path(f"/proc/{target}/status").read_text().splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    except (OSError, ValueError, IndexError):
        return None
    return None
