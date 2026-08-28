#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from store import Store, utc_ts
import autowatch

TERMINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}
BOOT_ID_META = "system_boot_id"
DAEMON_IMPL = "lean_coordinator_v2_autowatch_reboot_recovery"


def pid_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def terminate_pid(pid: int | None, sig: int = signal.SIGTERM) -> bool:
    if not pid or not pid_alive(pid):
        return False
    try:
        os.kill(pid, sig)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def launch_detached(args: list[str]) -> int:
    with open(os.devnull, "rb") as devnull_in, open(os.devnull, "ab") as devnull_out:
        proc = subprocess.Popen(
            args,
            stdin=devnull_in,
            stdout=devnull_out,
            stderr=devnull_out,
            start_new_session=True,
            close_fds=True,
        )
    return int(proc.pid)


def read_boot_id(path: Path = Path("/proc/sys/kernel/random/boot_id")) -> str | None:
    try:
        value = path.read_text().strip()
    except (OSError, UnicodeError):
        return None
    return value or None


def read_boot_epoch() -> float | None:
    try:
        for line in Path("/proc/stat").read_text().splitlines():
            if line.startswith("btime "):
                return float(line.split()[1])
    except (OSError, UnicodeError, ValueError, IndexError):
        pass
    try:
        uptime = float(Path("/proc/uptime").read_text().split()[0])
        return time.time() - uptime
    except (OSError, UnicodeError, ValueError, IndexError):
        return None


def reconcile_rebooted_autowatch(
    store: Store,
    *,
    current_boot_id: str | None = None,
    boot_epoch: float | None = None,
) -> list[str]:
    """Invalidate automatic observers that provably belong to an earlier boot.

    PID numbers are not stable across reboots. Android may reuse an old worker PID
    for an unrelated process, and permission checks can make os.kill(pid, 0) look
    alive. Boot identity / boot time is therefore the authoritative reboot signal.
    """
    previous_boot_id = store.get_meta(BOOT_ID_META)
    if current_boot_id is None:
        current_boot_id = read_boot_id()
    if boot_epoch is None:
        boot_epoch = read_boot_epoch()

    boot_changed = bool(previous_boot_id and current_boot_id and previous_boot_id != current_boot_id)
    stale_ids: list[str] = []

    for job in store.list_jobs(limit=500):
        if job.get("adapter") != "chatgpt_notification":
            continue
        if job.get("name") != autowatch.AUTO_NAME:
            continue
        if job.get("logical_state") not in autowatch.ACTIVE_STATES:
            continue

        started = job.get("started_at") or job.get("created_at") or 0.0
        predates_boot = bool(boot_epoch and float(started) < float(boot_epoch) - 1.0)
        if not (boot_changed or predates_boot):
            continue

        store.transition(
            job["job_id"],
            "SUSPECTED_STALL",
            event_type="AUTOWATCH_REBOOT_STALE",
            detail={
                "reason": "observer_belongs_to_previous_boot",
                "previous_boot_id_known": bool(previous_boot_id),
                "current_boot_id_known": bool(current_boot_id),
                "boot_id_changed": boot_changed,
                "predates_current_boot": predates_boot,
                "old_worker_pid": job.get("worker_pid"),
            },
            local_state="STALE",
            remote_state="ANDROID_NOTIFICATION",
            signal_confidence="LOW",
            desired_action="NONE",
            worker_pid=None,
            child_pid=None,
            last_seen=utc_ts(),
        )
        stale_ids.append(job["job_id"])

    if current_boot_id:
        store.set_meta(BOOT_ID_META, current_boot_id)
    return stale_ids


def coordinator_loop(store: Store, taskbridge_script: Path, interval: float = 2.0) -> int:
    store.set_meta("daemon_pid", str(os.getpid()))
    store.set_meta("daemon_started_at", str(utc_ts()))
    store.set_meta("daemon_impl", DAEMON_IMPL)

    reboot_stale = reconcile_rebooted_autowatch(store)
    if reboot_stale:
        autowatch.arm_if_needed(store, force=True)

    while True:
        try:
            for job in store.list_jobs(limit=500):
                state = job["logical_state"]
                if state in TERMINAL_STATES:
                    continue

                action = job["desired_action"]
                if action == "CANCEL":
                    terminate_pid(job.get("child_pid"))
                    terminate_pid(job.get("worker_pid"))
                    store.transition(
                        job["job_id"],
                        "CANCELLED",
                        event_type="CANCELLED_BY_REQUEST",
                        local_state="STOPPED",
                        signal_confidence="HIGH",
                        desired_action="NONE",
                        worker_pid=None,
                        child_pid=None,
                    )
                    continue

                if action == "RUN" and state == "CREATED" and not pid_alive(job.get("worker_pid")):
                    pid = launch_detached(
                        [
                            sys.executable,
                            str(taskbridge_script),
                            "--state-dir",
                            str(store.state_dir),
                            "_worker",
                            job["job_id"],
                        ]
                    )
                    store.update_fields(job["job_id"], worker_pid=pid, local_state="STARTING", desired_action="NONE")
                    store.add_event(job["job_id"], "WORKER_LAUNCHED", {"pid": pid})
                    continue

                if state in {"ACTIVE", "RECONNECTED"} and not pid_alive(job.get("worker_pid")):
                    child_pid = job.get("child_pid")
                    if child_pid and pid_alive(child_pid):
                        store.transition(
                            job["job_id"],
                            "SUSPECTED_STALL",
                            event_type="WORKER_LOST_CHILD_ALIVE",
                            local_state="STALE",
                            signal_confidence="MEDIUM",
                            worker_pid=None,
                        )
                        adopt_pid = launch_detached(
                            [
                                sys.executable,
                                str(taskbridge_script),
                                "--state-dir",
                                str(store.state_dir),
                                "_adopt",
                                job["job_id"],
                                str(child_pid),
                            ]
                        )
                        store.update_fields(job["job_id"], worker_pid=adopt_pid)
                    else:
                        store.transition(
                            job["job_id"],
                            "SUSPECTED_STALL",
                            event_type="WORKER_LOST",
                            local_state="STALE",
                            signal_confidence="LOW",
                            worker_pid=None,
                        )

            autowatch.arm_if_needed(store)
            time.sleep(max(0.5, interval))
        except KeyboardInterrupt:
            break
        except Exception:
            time.sleep(max(1.0, interval))
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="taskbridge-coordinator")
    p.add_argument("--state-dir", required=True)
    p.add_argument("--taskbridge-script", required=True)
    p.add_argument("--interval", type=float, default=2.0)
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    store = Store(args.state_dir)
    return coordinator_loop(store, Path(args.taskbridge_script).resolve(), args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
