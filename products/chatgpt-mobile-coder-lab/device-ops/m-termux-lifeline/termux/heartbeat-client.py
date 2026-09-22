#!/data/data/com.termux/files/usr/bin/python
import fcntl
import os
import socket
import sys
import time

SOCKET_NAME = "\0mcl-m-termux-lifeline-v1"
HEARTBEAT = b"MCL_M_TERMUX_LIFELINE_HEARTBEAT_V1\n"
RECOVERY_OK = b"MCL_M_TERMUX_LIFELINE_RECOVERY_OK_V1\n"
ACK = b"MCL_M_TERMUX_LIFELINE_ACK_V1\n"
MAX_FRAME_BYTES = 64
INTERVAL_SECONDS = 10.0
TIMEOUT_SECONDS = 2.0
STATE_DIR = "/data/data/com.termux/files/home/.local/state/mcl-m-termux-lifeline"
LOCK_PATH = STATE_DIR + "/heartbeat.lock"


def read_frame(sock):
    data = bytearray()
    while len(data) < MAX_FRAME_BYTES:
        chunk = sock.recv(1)
        if not chunk:
            break
        data.extend(chunk)
        if chunk == b"\n":
            break
    return bytes(data)


def exchange(frame, socket_factory=socket.socket):
    client = socket_factory(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        client.settimeout(TIMEOUT_SECONDS)
        client.connect(SOCKET_NAME)
        client.sendall(frame)
        return read_frame(client) == ACK
    except OSError:
        return False
    finally:
        try:
            client.close()
        except OSError:
            pass


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
            exchange(HEARTBEAT)
            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        return 0
    finally:
        os.close(lock_fd)


def main(argv):
    if not argv:
        return heartbeat_loop()
    if argv == ["--recovery-ok"]:
        return 0 if exchange(RECOVERY_OK) else 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
