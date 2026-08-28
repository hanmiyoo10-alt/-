#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import notifier
from runtime import adopt_child, daemon_loop, launch_detached, pid_alive, process_rss_kb, run_worker, terminate_pid
from store import Store

VERSION = "0.1.0"


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="taskbridge", description="Low-RAM long-task control plane for Android/Termux")
    p.add_argument("--state-dir", help="override TaskBridge state directory")
    sub = p.add_subparsers(dest="cmd", required=True)

    add = sub.add_parser("add", help="register a shell job")
    add.add_argument("--name")
    add.add_argument("command", nargs=argparse.REMAINDER)

    run = sub.add_parser("run", help="register and start a shell job")
    run.add_argument("--name")
    run.add_argument("command", nargs=argparse.REMAINDER)

    start = sub.add_parser("start", help="start a registered job")
    start.add_argument("job_id")

    status = sub.add_parser("status", help="show one job")
    status.add_argument("job_id")
    status.add_argument("--json", action="store_true")

    ls = sub.add_parser("list", help="list recent jobs")
    ls.add_argument("--limit", type=int, default=20)
    ls.add_argument("--json", action="store_true")

    ev = sub.add_parser("events", help="show job event history")
    ev.add_argument("job_id")
    ev.add_argument("--limit", type=int, default=50)

    cancel = sub.add_parser("cancel", help="request cancellation")
    cancel.add_argument("job_id")

    reconnect = sub.add_parser("reconnect", help="reconcile a stalled/unknown job")
    reconnect.add_argument("job_id")

    sub.add_parser("doctor", help="inspect local runtime health")

    daemon = sub.add_parser("daemon", help="manage the coordinator")
    daemon_sub = daemon.add_subparsers(dest="daemon_cmd", required=True)
    daemon_sub.add_parser("start")
    daemon_sub.add_parser("status")
    daemon_sub.add_parser("stop")

    hidden = sub.add_parser("_daemon", help=argparse.SUPPRESS)
    hidden.add_argument("--interval", type=float, default=2.0)
    worker = sub.add_parser("_worker", help=argparse.SUPPRESS)
    worker.add_argument("job_id")
    adopt = sub.add_parser("_adopt", help=argparse.SUPPRESS)
    adopt.add_argument("job_id")
    adopt.add_argument("child_pid", type=int)
    return p


def normalize_command(parts: list[str]) -> list[str]:
    if parts and parts[0] == "--":
        parts = parts[1:]
    if not parts:
        raise SystemExit("command required; example: taskbridge run -- sleep 60")
    return parts


def ensure_daemon(store: Store, script: Path) -> int:
    raw = store.get_meta("daemon_pid")
    pid = int(raw) if raw and raw.isdigit() else None
    if pid_alive(pid):
        return int(pid)
    pid = launch_detached([sys.executable, str(script), "--state-dir", str(store.state_dir), "_daemon"])
    store.set_meta("daemon_pid", str(pid))
    deadline = time.time() + 2.0
    while time.time() < deadline:
        if pid_alive(pid):
            break
        time.sleep(0.05)
    return pid


def fmt_job(job: dict) -> str:
    age = "-" if not job.get("last_seen") else f"{max(0, int(time.time()-job['last_seen']))}s ago"
    cmd = " ".join(job.get("command", []))
    return (
        f"{job['job_id']}  {job['logical_state']:<16} local={job['local_state']:<10} "
        f"signal={job['signal_confidence']:<6} seen={age}  {cmd}"
    )


def do_reconnect(store: Store, job_id: str, script: Path) -> dict:
    job = store.get_job(job_id)
    if job["logical_state"] in {"COMPLETED", "FAILED", "CANCELLED"}:
        return job
    if pid_alive(job.get("worker_pid")):
        if job["logical_state"] in {"SUSPECTED_STALL", "UNKNOWN"}:
            store.transition(job_id, "RECONNECTED", event_type="RECONNECT_WORKER_ALIVE", local_state="RUNNING", signal_confidence="HIGH")
        return store.get_job(job_id)
    if pid_alive(job.get("child_pid")):
        if job["logical_state"] not in {"SUSPECTED_STALL", "UNKNOWN"}:
            store.transition(job_id, "SUSPECTED_STALL", event_type="RECONNECT_CHILD_ONLY", local_state="STALE", signal_confidence="MEDIUM", worker_pid=None)
        adopt_pid = launch_detached([sys.executable, str(script), "--state-dir", str(store.state_dir), "_adopt", job_id, str(job["child_pid"])])
        store.update_fields(job_id, worker_pid=adopt_pid)
        return store.get_job(job_id)
    if job["logical_state"] not in {"SUSPECTED_STALL", "UNKNOWN"}:
        store.transition(job_id, "SUSPECTED_STALL", event_type="RECONNECT_NO_LIVE_PROCESS", local_state="STALE", signal_confidence="LOW", worker_pid=None, child_pid=None)
    return store.get_job(job_id)


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    store = Store(args.state_dir)
    script = Path(__file__).resolve()

    if args.cmd == "add":
        job = store.create_job(normalize_command(args.command), name=args.name)
        print(job["job_id"])
        return 0
    if args.cmd == "run":
        job = store.create_job(normalize_command(args.command), name=args.name)
        ensure_daemon(store, script)
        store.request(job["job_id"], "RUN")
        print(job["job_id"])
        return 0
    if args.cmd == "start":
        ensure_daemon(store, script)
        job = store.get_job(args.job_id)
        if job["logical_state"] != "CREATED":
            raise SystemExit(f"job is not startable from {job['logical_state']}")
        store.request(args.job_id, "RUN")
        print(args.job_id)
        return 0
    if args.cmd == "status":
        job = do_reconnect(store, args.job_id, script)
        print(json.dumps(job, indent=2, ensure_ascii=False) if args.json else fmt_job(job))
        return 0
    if args.cmd == "list":
        jobs = store.list_jobs(args.limit)
        if args.json:
            print(json.dumps(jobs, indent=2, ensure_ascii=False))
        else:
            for job in jobs:
                print(fmt_job(job))
        return 0
    if args.cmd == "events":
        for event in store.events(args.job_id, args.limit):
            print(f"{event['id']:>5} {event['event_type']:<28} {event['logical_state'] or '-':<16} {json.dumps(event['detail'], ensure_ascii=False)}")
        return 0
    if args.cmd == "cancel":
        job = store.get_job(args.job_id)
        if job["logical_state"] in {"COMPLETED", "FAILED", "CANCELLED"}:
            print(fmt_job(job))
            return 0
        ensure_daemon(store, script)
        store.request(args.job_id, "CANCEL")
        print(args.job_id)
        return 0
    if args.cmd == "reconnect":
        print(fmt_job(do_reconnect(store, args.job_id, script)))
        return 0
    if args.cmd == "doctor":
        raw = store.get_meta("daemon_pid")
        daemon_pid = int(raw) if raw and raw.isdigit() else None
        active = [j for j in store.list_jobs(500) if j["logical_state"] not in {"COMPLETED", "FAILED", "CANCELLED"}]
        data = {
            "version": VERSION,
            "python": sys.version.split()[0],
            "state_dir": str(store.state_dir),
            "database": str(store.db_path),
            "database_ok": store.db_path.exists(),
            "daemon_pid": daemon_pid,
            "daemon_alive": pid_alive(daemon_pid),
            "active_jobs": len(active),
            "termux_notification": notifier.available(),
            "self_rss_kb": process_rss_kb(),
            "daemon_rss_kb": process_rss_kb(daemon_pid) if pid_alive(daemon_pid) else None,
            "platform": sys.platform,
        }
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return 0
    if args.cmd == "daemon":
        raw = store.get_meta("daemon_pid")
        daemon_pid = int(raw) if raw and raw.isdigit() else None
        if args.daemon_cmd == "start":
            print(ensure_daemon(store, script))
            return 0
        if args.daemon_cmd == "status":
            print(json.dumps({"pid": daemon_pid, "alive": pid_alive(daemon_pid)}))
            return 0
        if args.daemon_cmd == "stop":
            if terminate_pid(daemon_pid):
                store.set_meta("daemon_pid", "")
                print("stopped")
            else:
                print("not-running")
            return 0
    if args.cmd == "_daemon":
        return daemon_loop(store, script, args.interval)
    if args.cmd == "_worker":
        return run_worker(store, args.job_id)
    if args.cmd == "_adopt":
        return adopt_child(store, args.job_id, args.child_pid)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
