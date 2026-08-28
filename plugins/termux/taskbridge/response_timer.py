#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
import uuid
from typing import Any

import autowatch
import chatgpt_calibration
from store import Store

VERSION = "0.1.0"
META_SESSION = "chatgpt_response_timer_session_v1"
DEFAULT_PACKAGE = "com.openai.chatgpt"
ACTIVE_OBSERVER_STATES = {"CREATED", "ACTIVE", "RECONNECTED"}


def _notification_available() -> bool:
    return shutil.which("termux-notification") is not None


def _notify(
    title: str,
    content: str,
    *,
    notification_id: str,
    ongoing: bool,
    sound: bool,
    alert_once: bool,
) -> bool:
    exe = shutil.which("termux-notification")
    if not exe:
        return False
    args = [
        exe,
        "--id",
        notification_id,
        "--title",
        title,
        "--content",
        content,
    ]
    if ongoing:
        args.append("--ongoing")
    if sound:
        args.append("--sound")
    if alert_once:
        args.append("--alert-once")
    try:
        subprocess.run(
            args,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
        return True
    except (OSError, subprocess.TimeoutExpired):
        return False


def _remove_notification(notification_id: str) -> bool:
    exe = shutil.which("termux-notification-remove")
    if not exe:
        return False
    try:
        subprocess.run(
            [exe, notification_id],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
        return True
    except (OSError, subprocess.TimeoutExpired):
        return False


def _load(store: Store) -> dict[str, Any] | None:
    raw = store.get_meta(META_SESSION)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _save(store: Store, session: dict[str, Any]) -> dict[str, Any]:
    data = dict(session)
    data["updated_at"] = time.time()
    store.set_meta(META_SESSION, json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    return data


def _daemon_alive(store: Store) -> bool:
    raw = store.get_meta("daemon_pid")
    pid = int(raw) if raw and raw.isdigit() else None
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _observer_package(job: dict[str, Any]) -> str:
    command = job.get("command") or []
    return command[0] if command else DEFAULT_PACKAGE


def _elapsed(session: dict[str, Any], now_mono: float | None = None) -> int:
    now_mono = time.monotonic() if now_mono is None else float(now_mono)
    started = float(session.get("started_monotonic") or now_mono)
    return max(0, int(now_mono - started))


def _trusted_completion(store: Store, job: dict[str, Any]) -> bool:
    if job.get("logical_state") != "COMPLETED":
        return False
    if job.get("signal_confidence") != "HIGH":
        return False
    for event in reversed(store.events(job["job_id"], 50)):
        if event.get("event_type") != "CHATGPT_NOTIFICATION_SEEN":
            continue
        return event.get("detail", {}).get("semantic") == "locally_calibrated_response_completion_signal"
    return False


def _notification_id(observer_job_id: str) -> str:
    # Reuse the observer's existing TaskBridge notification id so live ticks do
    # not create a second notification stream. The final timer update overwrites
    # the normal completion notification with `완료 · Ns`.
    return f"taskbridge-{observer_job_id}"


def reconcile_after_startup(store: Store, *, now_mono: float | None = None) -> dict[str, Any] | None:
    session = _load(store)
    if not session or session.get("state") != "ACTIVE":
        return session
    now_mono = time.monotonic() if now_mono is None else float(now_mono)
    started = float(session.get("started_monotonic") or now_mono)
    if now_mono + 1.0 >= started:
        return session

    session["state"] = "UNKNOWN"
    session["reason"] = "monotonic_clock_reset_or_reboot"
    session["finished_at"] = time.time()
    session = _save(store, session)
    _notify(
        "ChatGPT 응답 타이머",
        "재부팅으로 타이머 상태를 확정할 수 없음",
        notification_id=session["notification_id"],
        ongoing=False,
        sound=False,
        alert_once=True,
    )
    return session


def start(store: Store, package: str = DEFAULT_PACKAGE) -> dict[str, Any]:
    if not _notification_available():
        raise RuntimeError("termux-notification is unavailable; install/enable Termux:API first")
    if not _daemon_alive(store):
        raise RuntimeError("TaskBridge daemon is not running; start it before the response timer")

    reconcile_after_startup(store)
    existing = _load(store)
    if existing and existing.get("state") == "ACTIVE":
        raise RuntimeError(f"response timer already active: {existing.get('session_id')}")

    calibration = chatgpt_calibration.status(store, package)
    if not calibration.get("trusted"):
        raise RuntimeError(
            "locally calibrated HIGH completion signal is not trusted yet; complete the ChatGPT calibration first"
        )

    cfg = autowatch.config(store)
    if not cfg.get("enabled"):
        raise RuntimeError("ChatGPT autowatch is disabled; enable it before starting the response timer")

    observer = autowatch.find_active_observer(store, package)
    if observer is None:
        observer = autowatch.arm_if_needed(store, force=True)
    if observer is None:
        raise RuntimeError("no active ChatGPT completion observer is available")

    now_wall = time.time()
    now_mono = time.monotonic()
    session = {
        "session_id": f"timer_{uuid.uuid4().hex[:12]}",
        "version": VERSION,
        "state": "ACTIVE",
        "mode": "explicit_start_auto_high_completion",
        "package": package,
        "observer_job_id": observer["job_id"],
        "observer_job_id_at_start": observer["job_id"],
        "observer_rebind_count": 0,
        "notification_id": _notification_id(observer["job_id"]),
        "started_at": now_wall,
        "started_monotonic": now_mono,
        "elapsed_seconds": 0,
        "last_notification_elapsed": 0,
        "finished_at": None,
        "completion_job_id": None,
        "completion_signal_confidence": None,
        "completion_semantic": None,
        "calibration_count_at_start": calibration.get("confirmed_count"),
        "calibration_threshold": calibration.get("threshold"),
        "scope": "local_taskbridge_state_only",
    }
    session = _save(store, session)
    _notify(
        "ChatGPT 응답 중",
        "응답 시작 · 0초",
        notification_id=session["notification_id"],
        ongoing=True,
        sound=False,
        alert_once=True,
    )
    return status(store)


def _complete(
    store: Store,
    session: dict[str, Any],
    job: dict[str, Any],
    *,
    now_mono: float | None = None,
) -> dict[str, Any]:
    elapsed = _elapsed(session, now_mono)
    session["state"] = "COMPLETED"
    session["elapsed_seconds"] = elapsed
    session["last_notification_elapsed"] = elapsed
    session["finished_at"] = time.time()
    session["completion_job_id"] = job["job_id"]
    session["completion_signal_confidence"] = "HIGH"
    session["completion_semantic"] = "locally_calibrated_response_completion_signal"
    session = _save(store, session)
    _notify(
        "ChatGPT 응답 완료",
        f"완료 · {elapsed}초",
        notification_id=session["notification_id"],
        ongoing=False,
        sound=True,
        alert_once=False,
    )
    return session


def _maybe_rebind(store: Store, session: dict[str, Any], current_job: dict[str, Any] | None) -> dict[str, Any]:
    if current_job is not None and current_job.get("logical_state") in ACTIVE_OBSERVER_STATES:
        return session

    replacement = autowatch.find_active_observer(store, session.get("package") or DEFAULT_PACKAGE)
    if replacement is None or replacement.get("job_id") == session.get("observer_job_id"):
        return session

    old_notification_id = session.get("notification_id")
    elapsed = _elapsed(session)
    session["observer_job_id"] = replacement["job_id"]
    session["observer_rebind_count"] = int(session.get("observer_rebind_count") or 0) + 1
    session["observer_rebound_at"] = time.time()
    session["notification_id"] = _notification_id(replacement["job_id"])
    session = _save(store, session)

    if old_notification_id and old_notification_id != session["notification_id"]:
        _remove_notification(old_notification_id)
    _notify(
        "ChatGPT 응답 중",
        f"응답 중 · {elapsed}초",
        notification_id=session["notification_id"],
        ongoing=True,
        sound=False,
        alert_once=True,
    )
    return session


def tick(store: Store, *, now_mono: float | None = None) -> bool:
    """Advance one timer tick. Returns True while a timer remains ACTIVE."""
    session = reconcile_after_startup(store, now_mono=now_mono)
    if not session or session.get("state") != "ACTIVE":
        return False

    current_job = None
    try:
        current_job = store.get_job(session["observer_job_id"])
    except KeyError:
        current_job = None

    if current_job is not None and _trusted_completion(store, current_job):
        _complete(store, session, current_job, now_mono=now_mono)
        return False

    session = _maybe_rebind(store, session, current_job)
    if session.get("state") != "ACTIVE":
        return False

    elapsed = _elapsed(session, now_mono)
    if elapsed != int(session.get("elapsed_seconds") or 0):
        session["elapsed_seconds"] = elapsed
        session = _save(store, session)

    if elapsed != int(session.get("last_notification_elapsed") or 0):
        _notify(
            "ChatGPT 응답 중",
            f"응답 중 · {elapsed}초",
            notification_id=session["notification_id"],
            ongoing=True,
            sound=False,
            alert_once=True,
        )
        session["last_notification_elapsed"] = elapsed
        _save(store, session)

    return True


def status(store: Store) -> dict[str, Any]:
    session = _load(store)
    if not session:
        return {"state": "IDLE", "session_id": None, "scope": "local_taskbridge_state_only"}
    data = dict(session)
    if data.get("state") == "ACTIVE":
        data["elapsed_seconds"] = _elapsed(data)
    return data


def stop(store: Store) -> dict[str, Any]:
    session = _load(store)
    if not session:
        return {"state": "IDLE", "session_id": None, "scope": "local_taskbridge_state_only"}
    if session.get("state") != "ACTIVE":
        return status(store)

    elapsed = _elapsed(session)
    session["state"] = "STOPPED"
    session["elapsed_seconds"] = elapsed
    session["finished_at"] = time.time()
    session["reason"] = "manual_stop"
    session = _save(store, session)
    _notify(
        "ChatGPT 응답 타이머",
        f"중지 · {elapsed}초",
        notification_id=session["notification_id"],
        ongoing=False,
        sound=False,
        alert_once=True,
    )
    return status(store)


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="response-timer", description="TaskBridge live ChatGPT response timer")
    p.add_argument("--state-dir", help="override TaskBridge state directory")
    sub = p.add_subparsers(dest="cmd", required=True)
    start_cmd = sub.add_parser("start", help="start at an explicit response boundary")
    start_cmd.add_argument("--package", default=DEFAULT_PACKAGE)
    sub.add_parser("status", help="show current timer state")
    sub.add_parser("stop", help="stop the active timer manually")
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    store = Store(args.state_dir)
    try:
        if args.cmd == "start":
            data = start(store, args.package)
        elif args.cmd == "status":
            data = status(store)
        elif args.cmd == "stop":
            data = stop(store)
        else:
            return 2
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    print(json.dumps(data, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
