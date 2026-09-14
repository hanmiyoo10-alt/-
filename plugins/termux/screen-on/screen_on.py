#!/usr/bin/env python3
"""Control a display keep-awake overlay from native Termux.

The verified EONSOFT path remains the default until the repository-owned companion
passes equivalent real-device validation. Broadcast transport and physical screen
behavior remain separate claims.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from typing import Callable, Sequence

USER = "0"
OVERLAY_SETTINGS_ACTION = "android.settings.action.MANAGE_OVERLAY_PERMISSION"

PACKAGE = "com.eonsoft.ScreenON"
RECEIVER = f"{PACKAGE}/.ViewReceiver"
ADD_ACTION = "com.eonsoft.ACTION_ADD_VIEW"
REMOVE_ACTION = "com.eonsoft.ACTION_REMOVE_VIEW"

COMPANION_PACKAGE = "io.hanmiyoo.screenoncompanion"
COMPANION_RECEIVER = f"{COMPANION_PACKAGE}/.ScreenOnReceiver"
COMPANION_ON_ACTION = f"{COMPANION_PACKAGE}.action.ON"
COMPANION_OFF_ACTION = f"{COMPANION_PACKAGE}.action.OFF"
COMPANION_STATUS_ACTION = f"{COMPANION_PACKAGE}.action.STATUS"
COMPANION_RESULT_ON = 101
COMPANION_RESULT_OFF = 102
COMPANION_RESULT_STATUS_ON = 103
COMPANION_RESULT_STATUS_OFF = 104
COMPANION_RESULT_PERMISSION_REQUIRED = 201
COMPANION_RESULT_ERROR = 500

Runner = Callable[..., subprocess.CompletedProcess[str]]
_BROADCAST_RESULT = re.compile(
    r'Broadcast completed: result=(-?\d+)(?:,\s*data="([^"]*)")?'
)


class ScreenOnError(RuntimeError):
    pass


def _run(args: Sequence[str], runner: Runner) -> subprocess.CompletedProcess[str]:
    return runner(list(args), text=True, capture_output=True, check=False)


def _detail(result: subprocess.CompletedProcess[str]) -> str:
    return (result.stderr or result.stdout or "no command output").strip()


def require_package(
    runner: Runner = subprocess.run, package: str = PACKAGE
) -> None:
    result = _run(["pm", "path", "--user", USER, package], runner)
    paths = [line for line in result.stdout.splitlines() if line.startswith("package:")]
    if result.returncode != 0 or not paths:
        raise ScreenOnError(
            f"Package {package} not available for Android user {USER}: {_detail(result)}"
        )


def require_receiver(
    action: str,
    runner: Runner = subprocess.run,
    *,
    package: str = PACKAGE,
    receiver: str = RECEIVER,
) -> None:
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
            package,
        ],
        runner,
    )
    components = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    if result.returncode != 0 or receiver not in components:
        raise ScreenOnError(
            f"Expected receiver {receiver} did not resolve for {action}: {_detail(result)}"
        )


def preflight(
    action: str,
    runner: Runner = subprocess.run,
    *,
    package: str = PACKAGE,
    receiver: str = RECEIVER,
) -> None:
    require_package(runner, package)
    require_receiver(action, runner, package=package, receiver=receiver)


def _broadcast(
    action: str,
    runner: Runner,
    *,
    package: str,
    receiver: str,
) -> tuple[int, str]:
    preflight(action, runner, package=package, receiver=receiver)
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
            receiver,
        ],
        runner,
    )
    if result.returncode != 0:
        raise ScreenOnError(f"Android rejected the broadcast transport: {_detail(result)}")
    match = _BROADCAST_RESULT.search(result.stdout)
    if not match:
        raise ScreenOnError(f"Android did not report a broadcast result: {_detail(result)}")
    return int(match.group(1)), match.group(2) or ""


def send_broadcast(action: str, runner: Runner = subprocess.run) -> str:
    code, _ = _broadcast(action, runner, package=PACKAGE, receiver=RECEIVER)
    if code != 0:
        raise ScreenOnError(f"Android did not confirm EONSOFT transport: result={code}")
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


def _open_overlay_settings(package: str, runner: Runner) -> list[str]:
    require_package(runner, package)
    result = _run(
        [
            "am",
            "start",
            "--user",
            USER,
            "-a",
            OVERLAY_SETTINGS_ACTION,
            "-d",
            f"package:{package}",
        ],
        runner,
    )
    if result.returncode != 0:
        raise ScreenOnError(f"Could not open overlay settings for {package}: {_detail(result)}")
    return [
        "settings_open_request=OK",
        f"package={package}",
        "next=Enable 'Display over other apps', then run the on command.",
    ]


def command_setup(runner: Runner = subprocess.run) -> list[str]:
    return _open_overlay_settings(PACKAGE, runner)


def command_doctor(runner: Runner = subprocess.run) -> list[str]:
    require_package(runner, PACKAGE)
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


def _companion_broadcast(action: str, runner: Runner) -> tuple[int, str]:
    return _broadcast(
        action,
        runner,
        package=COMPANION_PACKAGE,
        receiver=COMPANION_RECEIVER,
    )


def command_companion_setup(runner: Runner = subprocess.run) -> list[str]:
    return _open_overlay_settings(COMPANION_PACKAGE, runner)


def command_companion_on(runner: Runner = subprocess.run) -> list[str]:
    code, data = _companion_broadcast(COMPANION_ON_ACTION, runner)
    if code == COMPANION_RESULT_PERMISSION_REQUIRED:
        raise ScreenOnError("Companion overlay permission is not granted; run setup first")
    if code != COMPANION_RESULT_ON or data != "overlay=ON":
        raise ScreenOnError(f"Companion did not attach the overlay: result={code} data={data!r}")
    return [
        f"transport=OK activity_manager_result={code}",
        data,
        "keep_awake_effect=UNKNOWN",
        "note=The repo-owned overlay is attached; physical timeout parity remains a separate real-device claim.",
    ]


def command_companion_off(runner: Runner = subprocess.run) -> list[str]:
    code, data = _companion_broadcast(COMPANION_OFF_ACTION, runner)
    if code != COMPANION_RESULT_OFF or data != "overlay=OFF":
        raise ScreenOnError(f"Companion did not release the overlay: result={code} data={data!r}")
    return [f"transport=OK activity_manager_result={code}", data]


def command_companion_status(runner: Runner = subprocess.run) -> list[str]:
    code, data = _companion_broadcast(COMPANION_STATUS_ACTION, runner)
    if code == COMPANION_RESULT_PERMISSION_REQUIRED:
        return [
            "transport_ready=YES",
            "overlay_permission=NO",
            "overlay=UNKNOWN",
            "keep_awake_effect=NO",
        ]
    if code == COMPANION_RESULT_STATUS_ON and data == "overlay=ON":
        return ["transport_ready=YES", "overlay_permission=YES", data, "keep_awake_effect=UNKNOWN"]
    if code == COMPANION_RESULT_STATUS_OFF and data == "overlay=OFF":
        return ["transport_ready=YES", "overlay_permission=YES", data, "keep_awake_effect=NO"]
    raise ScreenOnError(f"Companion status was not recognized: result={code} data={data!r}")


def command_companion_doctor(runner: Runner = subprocess.run) -> list[str]:
    require_package(runner, COMPANION_PACKAGE)
    for action in (COMPANION_ON_ACTION, COMPANION_OFF_ACTION, COMPANION_STATUS_ACTION):
        require_receiver(
            action,
            runner,
            package=COMPANION_PACKAGE,
            receiver=COMPANION_RECEIVER,
        )
    status = command_companion_status(runner)
    return [
        f"package=OK {COMPANION_PACKAGE}",
        f"receiver=OK {COMPANION_RECEIVER}",
        *status,
    ]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Control the Termux screen keep-awake route.")
    parser.add_argument(
        "--backend",
        choices=("eonsoft", "companion"),
        default="eonsoft",
        help="Effect backend. Default remains the real-device-verified EONSOFT route.",
    )
    parser.add_argument("command", choices=("doctor", "setup", "on", "off", "status"))
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    eonsoft_commands = {
        "doctor": command_doctor,
        "setup": command_setup,
        "on": command_on,
        "off": command_off,
    }
    companion_commands = {
        "doctor": command_companion_doctor,
        "setup": command_companion_setup,
        "on": command_companion_on,
        "off": command_companion_off,
        "status": command_companion_status,
    }
    try:
        if args.backend == "eonsoft":
            if args.command == "status":
                raise ScreenOnError("Reliable EONSOFT status remains unavailable; use doctor instead")
            lines = eonsoft_commands[args.command]()
        else:
            lines = companion_commands[args.command]()
    except ScreenOnError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    for line in lines:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
