#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from notifications import Notifier, format_elapsed, require_notifications
from openai_backend import (
    TERMINAL_STATUSES,
    ApiError,
    OpenAIBackend,
    extract_output_text,
    response_id,
    response_status,
)
from state_store import (
    atomic_write_json,
    elapsed_seconds,
    load_state,
    normalize_local_watcher,
    now_iso,
    state_path,
)

DEFAULT_INTERVAL = 5.0
MAX_CONSECUTIVE_POLL_ERRORS = 5


def backend_from_env() -> OpenAIBackend:
    return OpenAIBackend()


def configured_model(cli_model: str | None) -> str:
    value = cli_model or os.environ.get("OPENAI_MODEL")
    if not value:
        raise SystemExit("model is required: pass --model or set OPENAI_MODEL")
    return value


def prompt_from_args(args: argparse.Namespace) -> str:
    if args.prompt is not None:
        return args.prompt
    if not sys.stdin.isatty():
        value = sys.stdin.read()
        if value.strip():
            return value
    raise SystemExit("prompt is required as an argument or stdin")


def persist_remote_snapshot(state: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    updated = dict(state)
    status = response_status(response)
    updated["remote_status"] = status
    updated["last_remote_check_at"] = now_iso()
    created_at = response.get("created_at")
    if isinstance(created_at, (int, float)):
        updated["response_created_at"] = created_at
    completed_at = response.get("completed_at")
    if isinstance(completed_at, (int, float)):
        updated["response_completed_at"] = completed_at
    if status in TERMINAL_STATUSES and "response_completed_at" not in updated:
        updated["response_completed_at"] = time.time()
    return updated


def spawn_watcher(state: dict[str, Any], interval: float, no_notify: bool) -> dict[str, Any]:
    session_id = str(state["session_id"])
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "_watch",
        "--session", session_id,
        "--interval", str(interval),
    ]
    if no_notify:
        command.append("--no-notify")
    proc = subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    updated = dict(state)
    updated["watcher_pid"] = proc.pid
    updated["watcher_status"] = "running"
    updated["watcher_started_at"] = now_iso()
    updated["interval"] = interval
    atomic_write_json(state_path(), updated)
    return updated


def current_state() -> dict[str, Any] | None:
    return normalize_local_watcher(load_state())


def cmd_submit(args: argparse.Namespace) -> int:
    require_notifications(args.no_notify)
    prompt = prompt_from_args(args)
    model = configured_model(args.model)
    backend = backend_from_env()

    current = current_state()
    if current and current.get("remote_status") not in TERMINAL_STATUSES:
        if not args.replace:
            print(
                f"active response already tracked: {current.get('response_id', '-')}; use --replace to cancel it first",
                file=sys.stderr,
            )
            return 2
        old_response_id = current.get("response_id")
        if isinstance(old_response_id, str) and old_response_id:
            cancelled = backend.cancel(old_response_id)
            current = persist_remote_snapshot(current, cancelled)
            current["watcher_status"] = "stopped"
            atomic_write_json(state_path(), current)

    response = backend.submit(prompt, model)
    rid = response_id(response)
    status = response_status(response)
    session_id = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "schema": 1,
        "session_id": session_id,
        "response_id": rid,
        "model": model,
        "remote_status": status,
        "submitted_at": now_iso(),
        "submitted_at_epoch": time.time(),
        "watcher_pid": None,
        "watcher_status": "not_started",
        "notify": not args.no_notify,
        "interval": args.interval,
    }
    payload = persist_remote_snapshot(payload, response)
    atomic_write_json(state_path(), payload)

    if not args.no_watch and status not in TERMINAL_STATUSES:
        try:
            payload = spawn_watcher(payload, args.interval, args.no_notify)
        except OSError as exc:
            payload["watcher_status"] = "stale"
            payload["watcher_error"] = type(exc).__name__
            atomic_write_json(state_path(), payload)
            print("response submitted, but local watcher could not start", file=sys.stderr)

    print(f"submitted response={rid} status={status} model={model}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    state = current_state()
    if not state:
        result: dict[str, Any] = {"status": "idle"}
    else:
        if args.refresh:
            try:
                response = backend_from_env().retrieve(str(state["response_id"]))
                state = persist_remote_snapshot(state, response)
                atomic_write_json(state_path(), state)
            except ApiError as exc:
                state = dict(state)
                state["last_poll_error"] = f"api:{exc.status_code or 'network'}"
        result = dict(state)
        result["elapsed_seconds"] = round(elapsed_seconds(state), 3)
        result["elapsed"] = format_elapsed(result["elapsed_seconds"])
    if args.json:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    else:
        if result.get("status") == "idle":
            print("status=idle")
        else:
            print(
                "remote={remote} watcher={watcher} elapsed={elapsed} response={response}".format(
                    remote=result.get("remote_status", "unknown"),
                    watcher=result.get("watcher_status", "unknown"),
                    elapsed=result.get("elapsed", "00:00"),
                    response=result.get("response_id", "-"),
                )
            )
    return 0


def cmd_result(args: argparse.Namespace) -> int:
    state = current_state()
    if not state or not state.get("response_id"):
        print("no tracked response", file=sys.stderr)
        return 2
    try:
        response = backend_from_env().retrieve(str(state["response_id"]))
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 3
    state = persist_remote_snapshot(state, response)
    atomic_write_json(state_path(), state)
    status = state.get("remote_status")
    if status != "completed":
        print(f"response is not completed: {status}", file=sys.stderr)
        return 2
    text = extract_output_text(response)
    if not text:
        print("completed response contained no text output", file=sys.stderr)
        return 4
    print(text)
    return 0


def cmd_cancel(args: argparse.Namespace) -> int:
    state = current_state()
    if not state or not state.get("response_id"):
        print("no tracked response", file=sys.stderr)
        return 2
    if state.get("remote_status") in TERMINAL_STATUSES:
        print(f"already terminal: {state.get('remote_status')}")
        return 0
    try:
        response = backend_from_env().cancel(str(state["response_id"]))
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 3
    state = persist_remote_snapshot(state, response)
    state["watcher_status"] = "stopped"
    atomic_write_json(state_path(), state)
    if state.get("notify", True) and Notifier.available():
        try:
            Notifier().remove()
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
    print(f"cancel requested: {state.get('remote_status')}")
    return 0


def cmd_resume(args: argparse.Namespace) -> int:
    state = current_state()
    if not state or not state.get("response_id"):
        print("no tracked response", file=sys.stderr)
        return 2
    require_notifications(args.no_notify)
    try:
        response = backend_from_env().retrieve(str(state["response_id"]))
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 3
    state = persist_remote_snapshot(state, response)
    atomic_write_json(state_path(), state)
    if state.get("remote_status") in TERMINAL_STATUSES:
        print(f"remote already terminal: {state.get('remote_status')}")
        return 0
    if state.get("watcher_status") == "running":
        print("watcher already running")
        return 0
    state["notify"] = not args.no_notify
    spawn_watcher(state, args.interval, args.no_notify)
    print(f"watcher resumed for {state.get('response_id')}")
    return 0


def cmd_watch(args: argparse.Namespace) -> int:
    notifier = Notifier()
    consecutive_errors = 0
    while True:
        state = load_state()
        if not state or state.get("session_id") != args.session:
            return 0
        if state.get("watcher_status") != "running":
            return 0
        rid = state.get("response_id")
        if not isinstance(rid, str) or not rid:
            return 2
        try:
            response = backend_from_env().retrieve(rid)
            consecutive_errors = 0
        except ApiError as exc:
            consecutive_errors += 1
            state = dict(state)
            state["consecutive_poll_errors"] = consecutive_errors
            state["last_poll_error"] = f"api:{exc.status_code or 'network'}"
            state["last_poll_error_at"] = now_iso()
            if consecutive_errors >= MAX_CONSECUTIVE_POLL_ERRORS:
                state["watcher_status"] = "stale"
                atomic_write_json(state_path(), state)
                if not args.no_notify:
                    try:
                        notifier.uncertain()
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        pass
                return 3
            atomic_write_json(state_path(), state)
            time.sleep(max(2.0, args.interval))
            continue

        state = persist_remote_snapshot(state, response)
        state["consecutive_poll_errors"] = 0
        status = str(state.get("remote_status", "unknown"))
        if status in TERMINAL_STATUSES:
            state["watcher_status"] = "stopped"
            state["watcher_stopped_at"] = now_iso()
            atomic_write_json(state_path(), state)
            if not args.no_notify:
                try:
                    if status == "completed":
                        notifier.complete(elapsed_seconds(state))
                    else:
                        notifier.terminal_problem(status)
                except (subprocess.CalledProcessError, FileNotFoundError):
                    pass
            return 0

        atomic_write_json(state_path(), state)
        if not args.no_notify:
            try:
                notifier.progress(elapsed_seconds(state), status)
            except (subprocess.CalledProcessError, FileNotFoundError):
                pass
        time.sleep(max(2.0, args.interval))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Termux background OpenAI response client prototype")
    sub = parser.add_subparsers(dest="command", required=True)

    submit = sub.add_parser("submit", help="submit a background response")
    submit.add_argument("prompt", nargs="?", help="prompt text; stdin is used when omitted")
    submit.add_argument("--model", help="OpenAI model id; defaults to OPENAI_MODEL")
    submit.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="poll interval in seconds")
    submit.add_argument("--no-notify", action="store_true", help="disable Termux:API notifications")
    submit.add_argument("--no-watch", action="store_true", help="submit without launching the detached watcher")
    submit.add_argument("--replace", action="store_true", help="cancel the currently tracked active response before replacing it")
    submit.set_defaults(func=cmd_submit)

    status = sub.add_parser("status", help="show local state")
    status.add_argument("--refresh", action="store_true", help="retrieve current status from OpenAI before printing")
    status.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    status.set_defaults(func=cmd_status)

    result = sub.add_parser("result", help="print text output for the tracked completed response")
    result.set_defaults(func=cmd_result)

    cancel = sub.add_parser("cancel", help="cancel the tracked background response")
    cancel.set_defaults(func=cmd_cancel)

    resume = sub.add_parser("resume", help="restart local polling for the tracked response")
    resume.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="poll interval in seconds")
    resume.add_argument("--no-notify", action="store_true", help="disable Termux:API notifications")
    resume.set_defaults(func=cmd_resume)

    watch = sub.add_parser("_watch", help=argparse.SUPPRESS)
    watch.add_argument("--session", required=True)
    watch.add_argument("--interval", type=float, default=DEFAULT_INTERVAL)
    watch.add_argument("--no-notify", action="store_true")
    watch.set_defaults(func=cmd_watch)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    interval = getattr(args, "interval", DEFAULT_INTERVAL)
    if interval <= 0:
        raise SystemExit("--interval must be > 0")
    try:
        return int(args.func(args))
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
