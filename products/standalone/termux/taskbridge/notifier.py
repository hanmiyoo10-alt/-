from __future__ import annotations

import shutil
import subprocess


def available() -> bool:
    return shutil.which("termux-notification") is not None


def notify(title: str, content: str, *, notification_id: str = "taskbridge") -> bool:
    exe = shutil.which("termux-notification")
    if not exe:
        return False
    try:
        subprocess.run(
            [
                exe,
                "--id",
                notification_id,
                "--title",
                title,
                "--content",
                content,
                "--sound",
                "--alert-once",
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
        return True
    except (OSError, subprocess.TimeoutExpired):
        return False
