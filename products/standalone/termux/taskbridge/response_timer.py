#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import autowatch
import chatgpt_calibration
from store import Store

VERSION = "0.2.0"
META_SESSION = "chatgpt_response_timer_session_v1"
DEFAULT_PACKAGE = "com.openai.chatgpt"
ACTIVE_OBSERVER_STATES = {"CREATED", "ACTIVE", "RECONNECTED"}
CAS_RETRIES = 8


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
    button1_text: str | None = None,
    button1_action: str | None = None,
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
    if button1_text and button1_action:
        args.extend(["--button1", button1_text, "--button1-action", button1_action])
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


def _decode(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _load_record(store: Store) -> tuple[dict[str, Any] | None, str | None]:
    raw = store.get_meta(META_SESSION)
    return _decode(raw), raw


def _load(store: Store) -> dict[str, Any] | None:
    return _load_record(store)[0]


def _save_cas(store: Store, session: dict[str, Any], expected_raw: str | None) -> dict[str, Any] | None:
    data = dict(session)
    data["updated_at"] = time.time()
    raw = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    if not store.compare_and_set_meta(META_SESSION, expected_raw, raw):
        return None
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
    return f"taskbridge-{observer_job_id}"


def _manual_complete_action(store: Store, session: dict[str, Any]) -> str:
    python = shlex.quote(sys.executable)
    script = shlex.quote(str(Path(__file__).resolve()))
    state_dir = shlex.quote(str(store.state_dir.resolve()))
    session_id = shlex.quote(str(session["session_id"]))
    return (
        f"{python} {script} --state-dir {state_dir} complete-manual --session-id {session_id} "
        ">/dev/null 2>&1"
    )


def _notify_active(store: Store, session: dict[str, Any], content: str) -> bool:
    return _notify(
        "ChatGPT 응답 중",
        content,
        notification_id=session["notification_id"],
        ongoing=True,
        sound=False,
        alert_once=True,
        button1_text="완료",
        button1_action=_manual_complete_action(store, session),
    )


def reconcile_after_startup(store: Store, *, now_mono: float | None = None) -> dict[str, Any] | None:
    for _ in range(CAS_RETRIES):
        session, raw = _load_record(store)
        if not session or session.get("state") != "ACTIVE":
            return session
        now_value = time.monotonic() if now_mono is None else float(now_mono)
        started = float(session.get("started_monotonic") or now_value)
        if now_value + 1.0 >= started:
            return session

        updated = dict(session)
        updated["state"] = "UNKNOWN"
        updated["reason"] = "monotonic_clock_reset_or_reboot"
        updated["finished_at"] = time.time()
        saved = _save_cas(store, updated, raw)
        if saved is None:
            continue
        _notify(
            "ChatGPT 응답 타이머",
            "재부팅으로 타이머 상태를 확정할 수 없음",
            notification_id=saved["notification_id"],
            ongoing=False,
            sound=False,
            alert_once=True,
        )
        return saved
    return _load(store)


def start(store: Store, package: str = DEFAULT_PACKAGE) -> dict[str, Any]:
    if not _notification_available():
        raise RuntimeError("termux-notification is unavailable; install/enable Termux:API first")
    if not _daemon_alive(store):
        raise RuntimeError("TaskBridge daemon is not running; start it before the response timer")

    reconcile_after_startup(store)
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

    for _ in range(CAS_RETRIES):
        existing, raw = _load_record(store)
        if existing and existing.get("state") == "ACTIVE":
            raise RuntimeError(f"response timer already active: {existing.get('session_id')}")

        now_wall = time.time()
        now_mono = time.monotonic()
        session = {
            "session_id": f"timer_{uuid.uuid4().hex[:12]}",
            "version": VERSION,
            "state": "ACTIVE",
            "mode": "explicit_start_auto_high_completion_manual_foreground_fallback",
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
            "foreground_auto_completion": "UNAVAILABLE_SUPPORTED_SIGNAL",
            "foreground_completion_fallback": "notification_action_button",
            "calibration_count_at_start": calibration.get("confirmed_count"),
            "calibration_threshold": calibration.get("threshold"),
            "scope": "local_taskbridge_state_only",
        }
        saved = _save_cas(store, session, raw)
        if saved is None:
            continue
        _notify_active(store, saved, "응답 시작 · 0초")
        return status(store)
    raise RuntimeError("response timer state changed concurrently; retry start")


def _auto_complete(
    store: Store,
    session: dict[str, Any],
    raw: str,
    job: dict[str, Any],
    *,
    now_mono: float | None = None,
) -> dict[str, Any] | None:
    elapsed = _elapsed(session, now_mono)
    updated = dict(session)
    updated["state"] = "COMPLETED"
    updated["elapsed_seconds"] = elapsed
    updated["last_notification_elapsed"] = elapsed
    updated["finished_at"] = time.time()
    updated["completion_job_id"] = job["job_id"]
    updated["completion_signal_confidence"] = "HIGH"
    updated["completion_semantic"] = "locally_calibrated_response_completion_signal"
    updated["reason"] = "automatic_high_completion"
    saved = _save_cas(store, updated, raw)
    if saved is None:
        return None
    _notify(
        "ChatGPT 응답 완료",
        f"완료 · {elapsed}초",
        notification_id=saved["notification_id"],
        ongoing=False,
        sound=True,
        alert_once=False,
    )
    return saved


def manual_complete(store: Store, session_id: str | None = None) -> dict[str, Any]:
    for _ in range(CAS_RETRIES):
        session, raw = _load_record(store)
        if not session:
            return {"state": "IDLE", "session_id": None, "scope": "local_taskbridge_state_only"}
        if session_id and session.get("session_id") != session_id:
            return status(store)
        if session.get("state") != "ACTIVE":
            return status(store)

        elapsed = _elapsed(session)
        updated = dict(session)
        updated["state"] = "COMPLETED"
        updated["elapsed_seconds"] = elapsed
        updated["last_notification_elapsed"] = elapsed
        updated["finished_at"] = time.time()
        updated["completion_job_id"] = None
        updated["completion_signal_confidence"] = "USER_CONFIRMED"
        updated["completion_semantic"] = "manual_foreground_completion"
        updated["completion_source"] = "notification_action_button"
        updated["reason"] = "manual_foreground_completion"
        saved = _save_cas(store, updated, raw)
        if saved is None:
            continue
        _notify(
            "ChatGPT 응답 완료",
            f"완료 · {elapsed}초 · 수동 확인",
            notification_id=saved["notification_id"],
            ongoing=False,
            sound=False,
            alert_once=True,
        )
        return saved
    raise RuntimeError("response timer state changed concurrently; retry manual completion")


def tick(store: Store, *, now_mono: float | None = None) -> bool:
    """Advance one timer tick without allowing stale ACTIVE state to overwrite newer commands."""
    for _ in range(CAS_RETRIES):
        session, raw = _load_record(store)
        if not session or session.get("state") != "ACTIVE":
            return False

        now_value = time.monotonic() if now_mono is None else float(now_mono)
        started = float(session.get("started_monotonic") or now_value)
        if now_value + 1.0 < started:
            updated = dict(session)
            updated["state"] = "UNKNOWN"
            updated["reason"] = "monotonic_clock_reset_or_reboot"
            updated["finished_at"] = time.time()
            saved = _save_cas(store, updated, raw)
            if saved is None:
                continue
            _notify(
                "ChatGPT 응답 타이머",
                "재부팅으로 타이머 상태를 확정할 수 없음",
                notification_id=saved["notification_id"],
                ongoing=False,
                sound=False,
                alert_once=True,
            )
            return False

        current_job = None
        try:
            current_job = store.get_job(session["observer_job_id"])
        except KeyError:
            current_job = None

        if current_job is not None and _trusted_completion(store, current_job):
            saved = _auto_complete(store, session, raw or "", current_job, now_mono=now_value)
            if saved is not None:
                return False
            continue

        updated = dict(session)
        old_notification_id = session.get("notification_id")
        rebound = False
        if current_job is None or current_job.get("logical_state") not in ACTIVE_OBSERVER_STATES:
            replacement = autowatch.find_active_observer(store, session.get("package") or DEFAULT_PACKAGE)
            if replacement is not None and replacement.get("job_id") != session.get("observer_job_id"):
                updated["observer_job_id"] = replacement["job_id"]
                updated["observer_rebind_count"] = int(session.get("observer_rebind_count") or 0) + 1
                updated["observer_rebound_at"] = time.time()
                updated["notification_id"] = _notification_id(replacement["job_id"])
                rebound = True

        elapsed = _elapsed(updated, now_value)
        previous_elapsed = int(session.get("elapsed_seconds") or 0)
        previous_notified = int(session.get("last_notification_elapsed") or 0)
        needs_notification = rebound or elapsed != previous_notified
        changed = rebound or elapsed != previous_elapsed or needs_notification
        if not changed:
            return True

        updated["elapsed_seconds"] = elapsed
        if needs_notification:
            updated["last_notification_elapsed"] = elapsed
        saved = _save_cas(store, updated, raw)
        if saved is None:
            continue

        if rebound and old_notification_id and old_notification_id != saved["notification_id"]:
            _remove_notification(old_notification_id)
        if needs_notification:
            _notify_active(store, saved, f"응답 중 · {elapsed}초")
        return True

    latest = _load(store)
    return bool(latest and latest.get("state") == "ACTIVE")


def status(store: Store) -> dict[str, Any]:
    session = _load(store)
    if not session:
        return {"state": "IDLE", "session_id": None, "scope": "local_taskbridge_state_only"}
    data = dict(session)
    if data.get("state") == "ACTIVE":
        data["elapsed_seconds"] = max(int(data.get("elapsed_seconds") or 0), _elapsed(data))
    return data


def stop(store: Store) -> dict[str, Any]:
    for _ in range(CAS_RETRIES):
        session, raw = _load_record(store)
        if not session:
            return {"state": "IDLE", "session_id": None, "scope": "local_taskbridge_state_only"}
        if session.get("state") != "ACTIVE":
            return status(store)

        elapsed = _elapsed(session)
        updated = dict(session)
        updated["state"] = "STOPPED"
        updated["elapsed_seconds"] = elapsed
        updated["finished_at"] = time.time()
        updated["reason"] = "manual_stop"
        saved = _save_cas(store, updated, raw)
        if saved is None:
            continue
        _notify(
            "ChatGPT 응답 타이머",
            f"중지 · {elapsed}초",
            notification_id=saved["notification_id"],
            ongoing=False,
            sound=False,
            alert_once=True,
        )
        return saved
    raise RuntimeError("response timer state changed concurrently; retry stop")


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="response-timer", description="TaskBridge live ChatGPT response timer")
    p.add_argument("--state-dir", help="override TaskBridge state directory")
    sub = p.add_subparsers(dest="cmd", required=True)
    start_cmd = sub.add_parser("start", help="start at an explicit response boundary")
    start_cmd.add_argument("--package", default=DEFAULT_PACKAGE)
    sub.add_parser("status", help="show current timer state")
    sub.add_parser("stop", help="stop the active timer manually")
    manual = sub.add_parser("complete-manual", help="mark the active timer complete from its notification action")
    manual.add_argument("--session-id", required=True)
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
        elif args.cmd == "complete-manual":
            data = manual_complete(store, args.session_id)
        else:
            return 2
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    print(json.dumps(data, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
