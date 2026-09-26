#!/data/data/com.termux/files/usr/bin/python
import fcntl
import os
import subprocess
import sys
import time

AM_PATH = "/data/data/com.termux/files/usr/bin/am"
COMPANION_PACKAGE = "io.hanmiyoo.mcl.termuxlifeline"
HEARTBEAT_ACTION = "io.hanmiyoo.mcl.termuxlifeline.action.HEARTBEAT_V1"
RECOVERY_OK_ACTION = "io.hanmiyoo.mcl.termuxlifeline.action.RECOVERY_OK_V1"
INTERVAL_SECONDS = 10.0
DISPATCH_TIMEOUT_SECONDS = 2.0
STATE_DIR = "/data/data/com.termux/files/home/.local/state/mcl-m-termux-lifeline"
LOCK_PATH = STATE_DIR + "/heartbeat.lock"


def dispatch(action, runner=subprocess.run):
    if action not in (HEARTBEAT_ACTION, RECOVERY_OK_ACTION):
        return False
    argv = [AM_PATH, "broadcast", "-a", action, "-p", COMPANION_PACKAGE]
    try:
        result = runner(
            argv,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=DISPATCH_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def acquire_singleton():
    os.makedirs(STATE_DIR, mode=0o700, exist_ok=True)
    fd = os.open(LOCK_PATH, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(fd)
        return None
    return fd


def heartbeat_loop():
    lock_fd = acquire_singleton()
    if lock_fd is None:
        return 0
    try:
        while True:
            dispatch(HEARTBEAT_ACTION)
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        return 0
    finally:
        os.close(lock_fd)


def main(argv):
    if not argv:
        return heartbeat_loop()
    if argv == ["--recovery-ok"]:
        return 0 if dispatch(RECOVERY_OK_ACTION) else 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
