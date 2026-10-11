#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

from store import Store

BOOT_MODE = "fast_launcher_v1"


def read_cmdline(pid: int | None) -> list[str] | None:
    if not pid or pid <= 0:
        return None
    try:
        raw = Path(f"/proc/{pid}/cmdline").read_bytes()
    except (OSError, PermissionError):
        return None
    parts = [part.decode(errors="replace") for part in raw.split(b"\0") if part]
    return parts or None


def coordinator_identity_matches(pid: int | None, coordinator: Path) -> bool:
    parts = read_cmdline(pid)
    if not parts:
        return False
    target = str(coordinator.resolve())
    return any(part == target or part.endswith("/coordinator.py") for part in parts)


def append_trace(state_dir: Path, message: str) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    path = state_dir / "boot.trace"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"{time.time():.6f} {message}\n")


def launch_coordinator(state_dir: Path, taskbridge_script: Path) -> int:
    coordinator = taskbridge_script.with_name("coordinator.py").resolve()
    store = Store(state_dir)
    raw = store.get_meta("daemon_pid")
    old_pid = int(raw) if raw and raw.isdigit() else None

    if coordinator_identity_matches(old_pid, coordinator):
        append_trace(state_dir, f"mode={BOOT_MODE} reused_pid={old_pid}")
        return int(old_pid)

    log_path = state_dir / "boot.log"
    state_dir.mkdir(parents=True, exist_ok=True)
    with open(os.devnull, "rb") as devnull_in, log_path.open("ab") as log:
        proc = subprocess.Popen(
            [
                sys.executable,
                str(coordinator),
                "--state-dir",
                str(state_dir),
                "--taskbridge-script",
                str(taskbridge_script.resolve()),
            ],
            stdin=devnull_in,
            stdout=log,
            stderr=log,
            start_new_session=True,
            close_fds=True,
        )

    pid = int(proc.pid)
    store.set_meta("daemon_pid", str(pid))
    store.set_meta("boot_mode", BOOT_MODE)
    store.set_meta("boot_launcher_pid", str(os.getpid()))
    store.set_meta("boot_launcher_at", str(time.time()))
    append_trace(state_dir, f"mode={BOOT_MODE} launched_pid={pid} old_pid={old_pid}")
    return pid


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="taskbridge-fast-boot")
    p.add_argument("--state-dir", required=True)
    p.add_argument("--taskbridge-script", required=True)
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    state_dir = Path(args.state_dir).resolve()
    taskbridge_script = Path(args.taskbridge_script).resolve()
    append_trace(state_dir, f"mode={BOOT_MODE} launcher_enter pid={os.getpid()}")
    pid = launch_coordinator(state_dir, taskbridge_script)
    print(pid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
