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


def coordinator_loop(store: Store, taskbridge_script: Path, interval: float = 2.0) -> int:
    store.set_meta("daemon_pid", str(os.getpid()))
    store.set_meta("daemon_started_at", str(utc_ts()))
    store.set_meta("daemon_impl", "lean_coordinator_v2_autowatch")

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
