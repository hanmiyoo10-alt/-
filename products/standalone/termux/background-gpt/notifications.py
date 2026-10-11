from __future__ import annotations

import shutil
import subprocess
from typing import Callable

NOTIFICATION_ID = "gpt-background-response"


def format_elapsed(seconds: float) -> str:
    seconds = max(0.0, seconds)
    whole = int(seconds)
    hours, rem = divmod(whole, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


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

    def progress(self, elapsed: float, remote_status: str) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", f"GPT 백그라운드 응답 · {format_elapsed(elapsed)}",
            "--content", f"서버 상태 {remote_status}",
            "--ongoing",
            "--alert-once",
            "--priority", "low",
            "--icon", "hourglass_top",
        ])

    def complete(self, elapsed: float) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", "GPT 백그라운드 응답 완료",
            "--content", f"총 처리 시간 {format_elapsed(elapsed)}",
            "--priority", "high",
            "--sound",
            "--vibrate", "100,150,100",
            "--icon", "check_circle",
        ])

    def uncertain(self) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", "GPT 백그라운드 상태 확인 필요",
            "--content", "로컬 감시가 중단됨 · 서버 작업 실패로 간주하지 않음",
            "--priority", "default",
            "--alert-once",
            "--icon", "warning",
        ])

    def terminal_problem(self, remote_status: str) -> None:
        self._run([
            "termux-notification",
            "--id", NOTIFICATION_ID,
            "--title", "GPT 백그라운드 응답 종료",
            "--content", f"서버 상태 {remote_status}",
            "--priority", "high",
            "--sound",
            "--vibrate", "100,150,100",
            "--icon", "warning",
        ])

    def remove(self) -> None:
        if self.remove_available():
            self._run(["termux-notification-remove", NOTIFICATION_ID])


def require_notifications(no_notify: bool) -> None:
    if no_notify:
        return
    if not Notifier.available():
        raise SystemExit(
            "termux-notification not found. Install/enable Termux:API and the termux-api package, "
            "or use --no-notify for a terminal-only test."
        )
