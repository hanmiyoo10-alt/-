#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from store import Store

VERSION = "0.4.0"
CHATGPT_PACKAGE = "com.openai.chatgpt"
TERMINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}


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

    probe_chatgpt = sub.add_parser("probe-chatgpt", help="probe Android notification access for the ChatGPT app")
    probe_chatgpt.add_argument("--package", default=CHATGPT_PACKAGE)

    watch_chatgpt = sub.add_parser("watch-chatgpt", help="watch for a new ChatGPT Android notification")
    watch_chatgpt.add_argument("--package", default=CHATGPT_PACKAGE)
    watch_chatgpt.add_argument("--timeout", type=int, default=1800, help="seconds before the observer stops as UNKNOWN")
    watch_chatgpt.add_argument("--poll-interval", type=float, default=5.0, help="notification polling interval in seconds (2-60)")

    confirm_chatgpt = sub.add_parser(
        "confirm-chatgpt",
        help="confirm that a completed observer notification matched an actual ChatGPT response completion",
    )
    confirm_chatgpt.add_argument("job_id")

    calibration = sub.add_parser("chatgpt-calibration", help="show local ChatGPT completion calibration status")
    calibration.add_argument("--package", default=CHATGPT_PACKAGE)

    autowatch = sub.add_parser("autowatch-chatgpt", help="keep exactly one ChatGPT notification observer armed automatically")
    autowatch_sub = autowatch.add_subparsers(dest="autowatch_cmd", required=True)
    autowatch_enable = autowatch_sub.add_parser("enable")
    autowatch_enable.add_argument("--package", default=CHATGPT_PACKAGE)
    autowatch_enable.add_argument("--poll-interval", type=float, default=5.0, help="notification polling interval in seconds (2-60)")
    autowatch_sub.add_parser("disable")
    autowatch_sub.add_parser("status")

    boot = sub.add_parser("boot", help="install or inspect the Termux:Boot launcher script")
    boot_sub = boot.add_subparsers(dest="boot_cmd", required=True)
    boot_install = boot_sub.add_parser("install")
    boot_install.add_argument("--wake-lock", action="store_true", help="request a Termux wake lock at boot (higher standby battery use)")
    boot_sub.add_parser("status")
    boot_sub.add_parser("remove")

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
    from runtime import launch_detached, pid_alive

    raw = store.get_meta("daemon_pid")
    pid = int(raw) if raw and raw.isdigit() else None
    if pid_alive(pid):
        return int(pid)

    coordinator = script.with_name("coordinator.py")
    if coordinator.exists():
        command = [
            sys.executable,
            str(coordinator),
            "--state-dir",
            str(store.state_dir),
            "--taskbridge-script",
            str(script),
        ]
    else:
        command = [sys.executable, str(script), "--state-dir", str(store.state_dir), "_daemon"]

    pid = launch_detached(command)
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


def find_active_chatgpt_observer(store: Store, package: str) -> dict | None:
    for job in store.list_jobs(500):
        if job.get("adapter") != "chatgpt_notification":
            continue
        command = job.get("command") or []
        job_package = command[0] if command else CHATGPT_PACKAGE
        if job_package != package:
            continue
        if job.get("logical_state") in {"CREATED", "ACTIVE", "RECONNECTED"}:
            return job
    return None


def _observer_package(job: dict) -> str:
    command = job.get("command") or []
    return command[0] if command else CHATGPT_PACKAGE


def validate_poll_interval(value: float) -> float:
    import autowatch

    try:
        return autowatch.validate_poll_interval(value)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def boot_script_path(home: Path | None = None) -> Path:
    root = Path.home() if home is None else Path(home)
    return root / ".termux" / "boot" / "50-taskbridge"


def render_boot_script(script: Path, store: Store, *, wake_lock: bool = False) -> str:
    import shlex

    python = shlex.quote(sys.executable)
    taskbridge = shlex.quote(str(script.resolve()))
    state_dir = shlex.quote(str(store.state_dir.resolve()))
    workdir = shlex.quote(str(script.resolve().parent))
    log_path = shlex.quote(str((store.state_dir / "boot.log").resolve()))
    lines = [
        "#!/data/data/com.termux/files/usr/bin/sh",
        "export HOME=/data/data/com.termux/files/home",
    ]
    if wake_lock:
        lines.append("command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock")
    lines.extend(
        [
            f"cd {workdir} || exit 1",
            f"{python} {taskbridge} --state-dir {state_dir} daemon start >> {log_path} 2>&1",
            "",
        ]
    )
    return "\n".join(lines)


def install_boot_script(script: Path, store: Store, *, wake_lock: bool = False, home: Path | None = None) -> Path:
    path = boot_script_path(home)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_boot_script(script, store, wake_lock=wake_lock))
    path.chmod(0o700)
    return path


def boot_status(home: Path | None = None) -> dict:
    path = boot_script_path(home)
    text = path.read_text(errors="replace") if path.exists() else ""
    return {
        "installed": path.exists(),
        "path": str(path),
        "wake_lock_requested": "termux-wake-lock" in text,
        "activation_note": "Open the Termux:Boot app once after installing it so Android can run boot scripts.",
    }


def do_reconnect(store: Store, job_id: str, script: Path) -> dict:
    from runtime import launch_detached, pid_alive

    job = store.get_job(job_id)
    if job["logical_state"] in TERMINAL_STATES:
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

    if args.cmd == "probe-chatgpt":
        from adapters import chatgpt_notification
        try:
            data = chatgpt_notification.probe(args.package)
        except Exception as exc:
            data = {
                "available": chatgpt_notification.available(),
                "package": args.package,
                "error": type(exc).__name__,
                "detail": str(exc)[:200],
            }
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return 1
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "watch-chatgpt":
        if args.timeout <= 0:
            raise SystemExit("--timeout must be greater than 0")
        poll_interval = validate_poll_interval(args.poll_interval)
        active = find_active_chatgpt_observer(store, args.package)
        if active:
            raise SystemExit(
                f"ChatGPT observer already active: {active['job_id']} "
                f"({active['logical_state']}/{active['local_state']})"
            )
        job = store.create_job(
            [args.package, str(args.timeout), str(poll_interval)],
            adapter="chatgpt_notification",
            name="ChatGPT notification observer",
        )
        ensure_daemon(store, script)
        store.request(job["job_id"], "RUN")
        print(job["job_id"])
        return 0

    if args.cmd == "confirm-chatgpt":
        import chatgpt_calibration
        job = store.get_job(args.job_id)
        if job.get("adapter") != "chatgpt_notification":
            raise SystemExit("job is not a ChatGPT notification observer")
        if job.get("logical_state") != "COMPLETED":
            raise SystemExit(f"observer job is not COMPLETED: {job.get('logical_state')}")
        events = store.events(args.job_id, 200)
        if not any(event["event_type"] == "CHATGPT_NOTIFICATION_SEEN" for event in events):
            raise SystemExit("observer job has no CHATGPT_NOTIFICATION_SEEN event")
        package = _observer_package(job)
        result = chatgpt_calibration.record_confirmation(store, package, args.job_id)
        if result["added"]:
            store.add_event(
                args.job_id,
                "CHATGPT_COMPLETION_CONFIRMED",
                {
                    "package": package,
                    "confirmed_count": result["confirmed_count"],
                    "threshold": result["threshold"],
                    "trusted": result["trusted"],
                    "scope": result["scope"],
                },
            )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "chatgpt-calibration":
        import chatgpt_calibration
        print(json.dumps(chatgpt_calibration.status(store, args.package), indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "autowatch-chatgpt":
        import autowatch

        if args.autowatch_cmd == "enable":
            poll_interval = validate_poll_interval(args.poll_interval)
            autowatch.enable(store, args.package, poll_interval)
            ensure_daemon(store, script)
            armed = autowatch.arm_if_needed(store)
            data = autowatch.status(store)
            data["armed_job_id"] = armed.get("job_id") if armed else None
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return 0
        if args.autowatch_cmd == "disable":
            data = autowatch.disable(store)
            ensure_daemon(store, script)
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return 0
        if args.autowatch_cmd == "status":
            print(json.dumps(autowatch.status(store), indent=2, ensure_ascii=False))
            return 0

    if args.cmd == "boot":
        if args.boot_cmd == "install":
            path = install_boot_script(script, store, wake_lock=args.wake_lock)
            data = boot_status()
            data["installed_path"] = str(path)
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return 0
        if args.boot_cmd == "status":
            print(json.dumps(boot_status(), indent=2, ensure_ascii=False))
            return 0
        if args.boot_cmd == "remove":
            path = boot_script_path()
            removed = path.exists()
            if removed:
                path.unlink()
            data = boot_status()
            data["removed"] = removed
            print(json.dumps(data, indent=2, ensure_ascii=False))
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
        if job["logical_state"] in TERMINAL_STATES:
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
        from adapters import chatgpt_notification
        import chatgpt_calibration
        import autowatch
        import notifier
        from runtime import pid_alive, process_rss_kb

        raw = store.get_meta("daemon_pid")
        daemon_pid = int(raw) if raw and raw.isdigit() else None
        active = [j for j in store.list_jobs(500) if j["logical_state"] not in TERMINAL_STATES]
        data = {
            "version": VERSION,
            "python": sys.version.split()[0],
            "state_dir": str(store.state_dir),
            "database": str(store.db_path),
            "database_ok": store.db_path.exists(),
            "daemon_pid": daemon_pid,
            "daemon_alive": pid_alive(daemon_pid),
            "daemon_impl": store.get_meta("daemon_impl"),
            "active_jobs": len(active),
            "termux_notification": notifier.available(),
            "termux_notification_list": chatgpt_notification.available(),
            "chatgpt_completion_calibration": chatgpt_calibration.status(store, CHATGPT_PACKAGE),
            "chatgpt_autowatch": autowatch.status(store),
            "boot": boot_status(),
            "self_rss_kb": process_rss_kb(),
            "daemon_rss_kb": process_rss_kb(daemon_pid) if pid_alive(daemon_pid) else None,
            "platform": sys.platform,
        }
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "daemon":
        from runtime import pid_alive, terminate_pid
        raw = store.get_meta("daemon_pid")
        daemon_pid = int(raw) if raw and raw.isdigit() else None
        if args.daemon_cmd == "start":
            print(ensure_daemon(store, script))
            return 0
        if args.daemon_cmd == "status":
            print(json.dumps({"pid": daemon_pid, "alive": pid_alive(daemon_pid), "impl": store.get_meta("daemon_impl")}))
            return 0
        if args.daemon_cmd == "stop":
            if terminate_pid(daemon_pid):
                store.set_meta("daemon_pid", "")
                store.set_meta("daemon_impl", "")
                print("stopped")
            else:
                print("not-running")
            return 0

    if args.cmd == "_daemon":
        from runtime import daemon_loop
        return daemon_loop(store, script, args.interval)

    if args.cmd == "_worker":
        from runtime import run_worker
        return run_worker(store, args.job_id)

    if args.cmd == "_adopt":
        from runtime import adopt_child
        return adopt_child(store, args.job_id, args.child_pid)

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
