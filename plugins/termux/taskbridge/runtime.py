from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from adapters import chatgpt_notification
from adapters import shell as shell_adapter
import chatgpt_calibration
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


def _run_chatgpt_notification_worker(store: Store, job_id: str, interval: float = 2.0) -> int:
    job = store.get_job(job_id)
    if job["logical_state"] in {"COMPLETED", "FAILED", "CANCELLED"}:
        return 0

    package = job["command"][0] if job.get("command") else chatgpt_notification.CHATGPT_PACKAGE
    try:
        timeout_seconds = float(job["command"][1]) if len(job.get("command", [])) > 1 else 1800.0
    except (TypeError, ValueError):
        timeout_seconds = 1800.0
    try:
        poll_interval_seconds = float(job["command"][2]) if len(job.get("command", [])) > 2 else float(interval)
    except (TypeError, ValueError):
        poll_interval_seconds = float(interval)
    if poll_interval_seconds <= 0:
        poll_interval_seconds = float(interval)

    if not chatgpt_notification.available():
        store.transition(
            job_id,
            "UNKNOWN",
            event_type="CHATGPT_OBSERVER_UNAVAILABLE",
            detail={"reason": "termux-notification-list unavailable"},
            local_state="STOPPED",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="LOW",
            desired_action="NONE",
            worker_pid=None,
            last_seen=utc_ts(),
        )
        return 0

    try:
        baseline = chatgpt_notification.snapshot(package)
    except Exception as exc:
        store.transition(
            job_id,
            "UNKNOWN",
            event_type="CHATGPT_OBSERVER_START_ERROR",
            detail={"error": type(exc).__name__},
            error_code=type(exc).__name__,
            local_state="STOPPED",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="LOW",
            desired_action="NONE",
            worker_pid=None,
            last_seen=utc_ts(),
        )
        return 0

    stdout_path, _ = store.job_paths(job_id)
    observer_path = stdout_path.parent / "observer.json"
    observer_path.write_text(
        json.dumps(
            {
                "package": package,
                "baseline_fingerprints": sorted(baseline),
                "semantic": "new-notification-candidate-only",
            },
            indent=2,
        )
    )

    store.transition(
        job_id,
        "ACTIVE" if job["logical_state"] == "CREATED" else "RECONNECTED",
        event_type="CHATGPT_OBSERVER_STARTED",
        detail={
            "package": package,
            "timeout_seconds": timeout_seconds,
            "poll_interval_seconds": poll_interval_seconds,
        },
        worker_pid=os.getpid(),
        local_state="OBSERVING",
        remote_state="ANDROID_NOTIFICATION",
        signal_confidence="MEDIUM",
        desired_action="NONE",
        started_at=job.get("started_at") or utc_ts(),
        last_seen=utc_ts(),
        result_ref=str(observer_path),
    )

    started = time.monotonic()
    read_errors = 0
    while True:
        current_job = store.get_job(job_id)
        if current_job["logical_state"] == "CANCELLED":
            return 0

        if timeout_seconds > 0 and time.monotonic() - started >= timeout_seconds:
            store.transition(
                job_id,
                "UNKNOWN",
                event_type="CHATGPT_OBSERVER_TIMEOUT",
                detail={"timeout_seconds": timeout_seconds},
                local_state="STOPPED",
                remote_state="ANDROID_NOTIFICATION",
                signal_confidence="LOW",
                desired_action="NONE",
                worker_pid=None,
                last_seen=utc_ts(),
            )
            return 0

        try:
            current = chatgpt_notification.snapshot(package)
        except Exception as exc:
            read_errors += 1
            if read_errors >= 3:
                latest = store.get_job(job_id)
                if latest["logical_state"] not in {"COMPLETED", "FAILED", "CANCELLED"}:
                    store.transition(
                        job_id,
                        "SUSPECTED_STALL",
                        event_type="CHATGPT_OBSERVER_READ_LOST",
                        detail={"error": type(exc).__name__, "consecutive_errors": read_errors},
                        error_code=type(exc).__name__,
                        local_state="STOPPED",
                        remote_state="ANDROID_NOTIFICATION",
                        signal_confidence="LOW",
                        desired_action="NONE",
                        worker_pid=None,
                        last_seen=utc_ts(),
                    )
                return 0
            time.sleep(max(0.5, poll_interval_seconds))
            continue

        read_errors = 0
        new_fingerprints = current - baseline
        if new_fingerprints:
            calibration = chatgpt_calibration.status(store, package)
            trusted = bool(calibration["trusted"])
            confidence = "HIGH" if trusted else "MEDIUM"
            semantic = (
                "locally_calibrated_response_completion_signal"
                if trusted
                else "candidate_only_not_response_completion_proof"
            )
            observer_path.write_text(
                json.dumps(
                    {
                        "package": package,
                        "baseline_count": len(baseline),
                        "observed_count": len(current),
                        "new_count": len(new_fingerprints),
                        "semantic": semantic,
                        "calibration_count": calibration["confirmed_count"],
                        "calibration_threshold": calibration["threshold"],
                        "calibration_scope": calibration["scope"],
                    },
                    indent=2,
                )
            )
            store.transition(
                job_id,
                "COMPLETED",
                event_type="CHATGPT_NOTIFICATION_SEEN",
                detail={
                    "package": package,
                    "new_count": len(new_fingerprints),
                    "semantic": semantic,
                    "calibration_count": calibration["confirmed_count"],
                    "calibration_threshold": calibration["threshold"],
                    "calibration_scope": calibration["scope"],
                },
                local_state="STOPPED",
                remote_state="ANDROID_NOTIFICATION",
                signal_confidence=confidence,
                desired_action="NONE",
                last_seen=utc_ts(),
                worker_pid=None,
            )
            notifier.notify(
                "ChatGPT 응답 완료 감지" if trusted else "ChatGPT 알림 감지",
                (
                    f"{job_id} · 로컬 검증 {calibration['confirmed_count']}/{calibration['threshold']}"
                    if trusted
                    else f"{job_id} · 새 ChatGPT 알림 {len(new_fingerprints)}개"
                ),
                notification_id=f"taskbridge-{job_id}",
            )
            return 0

        store.update_fields(
            job_id,
            last_seen=utc_ts(),
            local_state="OBSERVING",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="MEDIUM",
        )
        time.sleep(max(0.5, poll_interval_seconds))


def run_worker(store: Store, job_id: str, heartbeat_interval: float = 5.0) -> int:
    job = store.get_job(job_id)
    if job["adapter"] == "chatgpt_notification":
        return _run_chatgpt_notification_worker(store, job_id, interval=heartbeat_interval)
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
