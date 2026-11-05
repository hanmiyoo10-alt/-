#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

NOTIFICATION_ID = "gpt-response-watch"
DEFAULT_INTERVAL = 1.0


def default_state_dir() -> Path:
    override = os.environ.get("TERMUX_RESPONSE_WATCH_STATE_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".local" / "state" / "termux-response-watch"


def state_path() -> Path:
    return default_state_dir() / "state.json"


def format_elapsed(seconds: float) -> str:
    seconds = max(0.0, seconds)
    whole = int(seconds)
    hours, rem = divmod(whole, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass


def load_state(path: Path | None = None) -> dict[str, Any] | None:
    target = path or state_path()
    try:
        with target.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return None
    if not isinstance(data, dict):
        raise ValueError("state file must contain a JSON object")
    return data


def pid_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def elapsed_from_state(state: dict[str, Any], monotonic: Callable[[], float] = time.monotonic) -> float:
    started = float(state.get("started_monotonic", monotonic()))
    ended = state.get("ended_monotonic")
    end_value = float(ended) if ended is not None else monotonic()
    return max(0.0, end_value - started)


class Notifier:
    def __init__(self, runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run) -> None:
        self.runner = runner

    @staticmethod
    def available() -> bool:
        return shutil.which("termux-notification") is not None

    @staticmethod
    def remove_available() -> bool:
        return shutil.which("termux-notification-remove") is not None

    def _run(self, args: list[str]) -> None:
        self.runner(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True)

    def progress(self, elapsed: float, started_label: str) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", f"GPT 응답 중 · {format_elapsed(elapsed)}",
            "--content", f"경과 {format_elapsed(elapsed)} · 시작 {started_label}",
            "--ongoing",
            "--alert-once",
            "--priority", "low",
            "--icon", "hourglass_top",
        ])

    def complete(self, elapsed: float) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", "GPT 응답 완료",
            "--content", f"총 응답 시간 {format_elapsed(elapsed)}",
            "--priority", "high",
            "--sound",
            "--vibrate", "100,150,100",
            "--icon", "check_circle",
        ])

    def remove(self) -> None:
        if self.remove_available():
            self._run(["termux-notification-remove", NOTIFICATION_ID])


def kill_daemon(state: dict[str, Any]) -> None:
    pid = state.get("pid")
    if not isinstance(pid, int) or pid <= 0 or not pid_alive(pid):
        return
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return


def normalize_stale_state(state: dict[str, Any] | None) -> dict[str, Any] | None:
    if not state or state.get("status") != "running":
        return state
    pid = state.get("pid")
    if isinstance(pid, int) and pid_alive(pid):
        return state
    stale = dict(state)
    stale["status"] = "stale"
    stale["ended_monotonic"] = time.monotonic()
    stale["ended_at"] = now_iso()
    atomic_write_json(state_path(), stale)
    return stale


def require_notifications(no_notify: bool) -> None:
    if no_notify:
        return
    if not Notifier.available():
        raise SystemExit(
            "termux-notification not found. Install/enable Termux:API and the termux-api package, "
            "or use --no-notify for a terminal-only test."
        )


def cmd_start(args: argparse.Namespace) -> int:
    require_notifications(args.no_notify)
    current = normalize_stale_state(load_state())
    if current and current.get("status") == "running":
        if not args.replace:
            print(f"already running: {current.get('session_id')}", file=sys.stderr)
            return 2
        kill_daemon(current)

    session_id = uuid.uuid4().hex
    started_monotonic = time.monotonic()
    started_at = now_iso()
    payload: dict[str, Any] = {
        "schema": 1,
        "session_id": session_id,
        "status": "starting",
        "started_monotonic": started_monotonic,
        "started_at": started_at,
        "pid": None,
        "interval": args.interval,
        "notify": not args.no_notify,
    }
    atomic_write_json(state_path(), payload)

    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "_daemon",
        "--session", session_id,
        "--interval", str(args.interval),
    ]
    if args.no_notify:
        command.append("--no-notify")
    proc = subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    payload["pid"] = proc.pid
    payload["status"] = "running"
    atomic_write_json(state_path(), payload)
    print(f"started {session_id} at {started_at}")
    return 0


def cmd_done(args: argparse.Namespace) -> int:
    state = normalize_stale_state(load_state())
    if not state or state.get("status") != "running":
        print("no running response watch", file=sys.stderr)
        return 2
    elapsed = elapsed_from_state(state)
    done_state = dict(state)
    done_state["status"] = "done"
    done_state["ended_monotonic"] = time.monotonic()
    done_state["ended_at"] = now_iso()
    atomic_write_json(state_path(), done_state)
    kill_daemon(state)
    if state.get("notify", True):
        require_notifications(False)
        Notifier().complete(elapsed)
    print(f"done in {format_elapsed(elapsed)}")
    return 0


def cmd_cancel(args: argparse.Namespace) -> int:
    state = normalize_stale_state(load_state())
    if not state or state.get("status") not in {"running", "starting"}:
        print("no active response watch", file=sys.stderr)
        return 2
    cancelled = dict(state)
    cancelled["status"] = "cancelled"
    cancelled["ended_monotonic"] = time.monotonic()
    cancelled["ended_at"] = now_iso()
    atomic_write_json(state_path(), cancelled)
    kill_daemon(state)
    if state.get("notify", True) and Notifier.available():
        Notifier().remove()
    print("cancelled")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    state = normalize_stale_state(load_state())
    if not state:
        print(json.dumps({"status": "idle"}, ensure_ascii=False))
        return 0
    result = dict(state)
    if state.get("status") in {"running", "done", "cancelled", "stale"}:
        result["elapsed_seconds"] = round(elapsed_from_state(state), 3)
        result["elapsed"] = format_elapsed(result["elapsed_seconds"])
    if args.json:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    else:
        print(f"status={result.get('status')} elapsed={result.get('elapsed', '00:00')} session={result.get('session_id', '-')}")
    return 0


def cmd_daemon(args: argparse.Namespace) -> int:
    notifier = Notifier()
    while True:
        state = load_state()
        if not state:
            return 0
        if state.get("session_id") != args.session or state.get("status") != "running":
            return 0
        elapsed = elapsed_from_state(state)
        if not args.no_notify:
            try:
                started_label = datetime.fromisoformat(str(state["started_at"])).strftime("%H:%M:%S")
                notifier.progress(elapsed, started_label)
            except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
                pass
        time.sleep(max(0.2, args.interval))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Termux GPT response timer and completion notifier")
    sub = parser.add_subparsers(dest="command", required=True)

    start = sub.add_parser("start", help="start a response timer")
    start.add_argument("--replace", action="store_true", help="replace an existing active session")
    start.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="notification refresh interval in seconds")
    start.add_argument("--no-notify", action="store_true", help="run without Termux:API notifications")
    start.set_defaults(func=cmd_start)

    done = sub.add_parser("done", help="mark the response complete")
    done.set_defaults(func=cmd_done)

    cancel = sub.add_parser("cancel", help="cancel the current timer")
    cancel.set_defaults(func=cmd_cancel)

    status = sub.add_parser("status", help="show current timer status")
    status.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    status.set_defaults(func=cmd_status)

    daemon = sub.add_parser("_daemon", help=argparse.SUPPRESS)
    daemon.add_argument("--session", required=True)
    daemon.add_argument("--interval", type=float, default=DEFAULT_INTERVAL)
    daemon.add_argument("--no-notify", action="store_true")
    daemon.set_defaults(func=cmd_daemon)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if getattr(args, "interval", DEFAULT_INTERVAL) <= 0:
        raise SystemExit("--interval must be > 0")
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
