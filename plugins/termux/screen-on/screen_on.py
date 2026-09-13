#!/usr/bin/env python3
"""Control EONSOFT Screen ON's verified keep-awake overlay from Termux.

This wrapper deliberately distinguishes transport success from keep-awake state.
Ordinary Termux cannot reliably query Screen ON's overlay app-op/effect state, so
commands never infer that the display is being held awake merely because Android
accepted a broadcast.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from typing import Callable, Sequence

PACKAGE = "com.eonsoft.ScreenON"
USER = "0"
RECEIVER = f"{PACKAGE}/.ViewReceiver"
ADD_ACTION = "com.eonsoft.ACTION_ADD_VIEW"
REMOVE_ACTION = "com.eonsoft.ACTION_REMOVE_VIEW"
OVERLAY_SETTINGS_ACTION = "android.settings.action.MANAGE_OVERLAY_PERMISSION"

Runner = Callable[..., subprocess.CompletedProcess[str]]


class ScreenOnError(RuntimeError):
    pass


def _run(args: Sequence[str], runner: Runner) -> subprocess.CompletedProcess[str]:
    return runner(list(args), text=True, capture_output=True, check=False)


def _detail(result: subprocess.CompletedProcess[str]) -> str:
    return (result.stderr or result.stdout or "no command output").strip()


def require_package(runner: Runner = subprocess.run) -> None:
    result = _run(["pm", "path", "--user", USER, PACKAGE], runner)
    paths = [line for line in result.stdout.splitlines() if line.startswith("package:")]
    if result.returncode != 0 or not paths:
        raise ScreenOnError(f"Screen ON package not available for Android user {USER}: {_detail(result)}")


def require_receiver(action: str, runner: Runner = subprocess.run) -> None:
    result = _run(
        [
            "cmd",
            "package",
            "query-receivers",
            "--user",
            USER,
            "--components",
            "-a",
            action,
            "-p",
            PACKAGE,
        ],
        runner,
    )
    components = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    if result.returncode != 0 or RECEIVER not in components:
        raise ScreenOnError(
            f"Expected receiver {RECEIVER} did not resolve for {action}: {_detail(result)}"
        )


def preflight(action: str, runner: Runner = subprocess.run) -> None:
    require_package(runner)
    require_receiver(action, runner)


def send_broadcast(action: str, runner: Runner = subprocess.run) -> str:
    preflight(action, runner)
    result = _run(
        [
            "cmd",
            "activity",
            "broadcast",
            "--user",
            USER,
            "--include-stopped-packages",
            "-a",
            action,
            "-n",
            RECEIVER,
        ],
        runner,
    )
    if result.returncode != 0 or "Broadcast completed: result=0" not in result.stdout:
        raise ScreenOnError(f"Android did not confirm the broadcast transport: {_detail(result)}")
    return "transport=OK activity_manager_result=0"


def command_on(runner: Runner = subprocess.run) -> list[str]:
    transport = send_broadcast(ADD_ACTION, runner)
    return [
        transport,
        "keep_awake=UNKNOWN",
        "note=Screen ON 'Display over other apps' permission is required; broadcast success alone does not prove the overlay effect.",
    ]


def command_off(runner: Runner = subprocess.run) -> list[str]:
    transport = send_broadcast(REMOVE_ACTION, runner)
    return [
        transport,
        "overlay_release=UNKNOWN",
        "note=REMOVE_VIEW was delivered, but ordinary Termux does not independently query the resulting overlay state.",
    ]


def command_setup(runner: Runner = subprocess.run) -> list[str]:
    require_package(runner)
    result = _run(
        [
            "am",
            "start",
            "--user",
            USER,
            "-a",
            OVERLAY_SETTINGS_ACTION,
            "-d",
            f"package:{PACKAGE}",
        ],
        runner,
    )
    if result.returncode != 0:
        raise ScreenOnError(f"Could not open Screen ON overlay settings: {_detail(result)}")
    return [
        "settings_open_request=OK",
        "next=Enable 'Display over other apps' for Screen ON, then run the on command.",
    ]


def command_doctor(runner: Runner = subprocess.run) -> list[str]:
    require_package(runner)
    require_receiver(ADD_ACTION, runner)
    require_receiver(REMOVE_ACTION, runner)
    return [
        f"package=OK {PACKAGE}",
        f"add_receiver=OK {RECEIVER}",
        f"remove_receiver=OK {RECEIVER}",
        "transport_ready=YES",
        "overlay_permission=UNKNOWN",
        "keep_awake_ready=UNKNOWN",
        "note=Run setup and verify the Android overlay permission manually; this wrapper does not fabricate status.",
    ]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Control the verified Screen ON overlay broadcast route from native Termux."
    )
    parser.add_argument("command", choices=("doctor", "setup", "on", "off"))
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    commands = {
        "doctor": command_doctor,
        "setup": command_setup,
        "on": command_on,
        "off": command_off,
    }
    try:
        lines = commands[args.command]()
    except ScreenOnError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    for line in lines:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
