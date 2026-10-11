from __future__ import annotations

import subprocess
from typing import BinaryIO

NAME = "shell"
CAPABILITIES = {
    "can_start": True,
    "can_observe": True,
    "can_cancel": True,
    "can_resume": False,
    "can_retry_safely": False,
    "has_remote_status": False,
    "has_completion_signal": True,
}


def spawn(command: list[str], stdout: BinaryIO, stderr: BinaryIO) -> subprocess.Popen[bytes]:
    return subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=stdout,
        stderr=stderr,
        start_new_session=True,
        close_fds=True,
    )
