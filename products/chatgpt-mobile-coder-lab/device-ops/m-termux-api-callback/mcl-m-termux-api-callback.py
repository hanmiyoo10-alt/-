#!/usr/bin/env python3
"""Bounded Termux:API callback probe for Android 16.

This owner exposes exactly one operation, `battery-status`, and emits only a
sanitized semantic receipt. It never emits the returned battery JSON.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import secrets
import socket
import stat
import struct
import subprocess
import sys
import time
from typing import Callable, Mapping

SCHEMA = "mcl-m-termux-api-callback.v1"
OPERATION = "battery_status"
TRANSPORT = "filesystem_unix"
TERMUX_HOME = Path("/data/data/com.termux/files/home")
SOCKET_DIR_NAME = "mcl-m-termux-api-callback"
AM_PATH = "/data/data/com.termux/files/usr/bin/am"
COMPONENT = "com.termux.api/.TermuxApiReceiver"
API_METHOD = "BatteryStatus"
TIMEOUT_SECONDS = 3.0
MAX_PAYLOAD_BYTES = 16 * 1024
UNIX_PATH_BYTES_MAX = 107

Receipt = dict[str, str]


class ProbeBlocked(RuntimeError):
    def __init__(self, connection: str, peer: str, payload: str):
        super().__init__("blocked")
        self.connection = connection
        self.peer = peer
        self.payload = payload


class ProbeUnknown(RuntimeError):
    pass


def base_receipt(**overrides: str) -> Receipt:
    receipt: Receipt = {
        "schema": SCHEMA,
        "operation": OPERATION,
        "transport": TRANSPORT,
        "connection": "unknown",
        "peer": "unknown",
        "payload": "unknown",
        "result": "unknown",
        "details": "withheld",
    }
    receipt.update(overrides)
    return receipt


def render_receipt(receipt: Mapping[str, str]) -> str:
    order = (
        "schema",
        "operation",
        "transport",
        "connection",
        "peer",
        "payload",
        "result",
        "details",
    )
    return "".join(f"{key}={receipt[key]}\n" for key in order)


def build_broadcast_argv(socket_path: Path) -> list[str]:
    return [
        AM_PATH,
        "broadcast",
        "--user",
        "0",
        "-n",
        COMPONENT,
        "--es",
        "socket_output",
        str(socket_path),
        "--es",
        "api_method",
        API_METHOD,
    ]


def _validate_owned_directory(path: Path, uid: int, *, exact_mode: int | None) -> None:
    try:
        st = path.lstat()
    except OSError as exc:
        raise ProbeBlocked("unknown", "unknown", "unknown") from exc
    if stat.S_ISLNK(st.st_mode) or not stat.S_ISDIR(st.st_mode) or st.st_uid != uid:
        raise ProbeBlocked("unknown", "unknown", "unknown")
    if exact_mode is not None and stat.S_IMODE(st.st_mode) != exact_mode:
        raise ProbeBlocked("unknown", "unknown", "unknown")


def prepare_socket_dir(home: Path = TERMUX_HOME, uid: int | None = None) -> Path:
    current_uid = os.getuid() if uid is None else uid
    _validate_owned_directory(home, current_uid, exact_mode=None)

    cache_dir = home / ".cache"
    if not cache_dir.exists():
        try:
            cache_dir.mkdir(mode=0o700)
        except OSError as exc:
            raise ProbeBlocked("unknown", "unknown", "unknown") from exc
    _validate_owned_directory(cache_dir, current_uid, exact_mode=None)

    socket_dir = cache_dir / SOCKET_DIR_NAME
    if not socket_dir.exists():
        try:
            socket_dir.mkdir(mode=0o700)
        except OSError as exc:
            raise ProbeBlocked("unknown", "unknown", "unknown") from exc
    _validate_owned_directory(socket_dir, current_uid, exact_mode=0o700)
    return socket_dir


def make_socket_path(socket_dir: Path, token: str | None = None) -> Path:
    value = secrets.token_hex(6) if token is None else token
    if not value or any(ch not in "0123456789abcdef" for ch in value):
        raise ProbeBlocked("unknown", "unknown", "unknown")
    path = socket_dir / f"cb-{value}.sock"
    if len(os.fsencode(path)) > UNIX_PATH_BYTES_MAX:
        raise ProbeBlocked("unknown", "unknown", "unknown")
    if path.exists() or path.is_symlink():
        raise ProbeBlocked("unknown", "unknown", "unknown")
    return path


def _peer_uid(conn: socket.socket) -> int:
    size = struct.calcsize("3i")
    raw = conn.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, size)
    _pid, uid, _gid = struct.unpack("3i", raw)
    return uid


def decode_payload(data: bytes) -> dict:
    if len(data) > MAX_PAYLOAD_BYTES:
        raise ProbeBlocked("connected", "same_uid", "oversize")
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ProbeBlocked("connected", "same_uid", "invalid_utf8") from exc
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ProbeBlocked("connected", "same_uid", "invalid_json") from exc
    if not isinstance(value, dict):
        raise ProbeBlocked("connected", "same_uid", "invalid_json")
    return value


def accept_payload(
    server: socket.socket,
    *,
    expected_uid: int,
    timeout_seconds: float,
    peer_uid_reader: Callable[[socket.socket], int] = _peer_uid,
) -> dict:
    server.settimeout(timeout_seconds)
    try:
        conn, _ = server.accept()
    except TimeoutError as exc:
        raise ProbeBlocked("timeout", "unknown", "unknown") from exc
    except OSError as exc:
        raise ProbeUnknown("accept failed") from exc

    with conn:
        try:
            peer_uid = peer_uid_reader(conn)
        except OSError as exc:
            raise ProbeUnknown("peer credential read failed") from exc
        if peer_uid != expected_uid:
            raise ProbeBlocked("connected", "mismatch", "unknown")

        conn.settimeout(timeout_seconds)
        chunks: list[bytes] = []
        total = 0
        while True:
            try:
                chunk = conn.recv(min(4096, MAX_PAYLOAD_BYTES + 1 - total))
            except TimeoutError as exc:
                raise ProbeBlocked("connected", "same_uid", "unknown") from exc
            except OSError as exc:
                raise ProbeUnknown("payload read failed") from exc
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_PAYLOAD_BYTES:
                raise ProbeBlocked("connected", "same_uid", "oversize")
        return decode_payload(b"".join(chunks))


def _launch_broadcast(socket_path: Path):
    return subprocess.Popen(
        build_broadcast_argv(socket_path),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=False,
        close_fds=True,
    )


def _reap_process(proc) -> None:
    if proc is None:
        return
    try:
        if proc.poll() is not None:
            return
    except Exception:
        return
    try:
        proc.wait(timeout=0.25)
        return
    except Exception:
        pass
    try:
        proc.terminate()
        proc.wait(timeout=0.25)
        return
    except Exception:
        pass
    try:
        proc.kill()
        proc.wait(timeout=0.25)
    except Exception:
        pass


def run_battery_status(
    *,
    home: Path = TERMUX_HOME,
    timeout_seconds: float = TIMEOUT_SECONDS,
    launcher: Callable[[Path], object] = _launch_broadcast,
    peer_uid_reader: Callable[[socket.socket], int] = _peer_uid,
    uid_getter: Callable[[], int] = os.getuid,
    token_factory: Callable[[], str] = lambda: secrets.token_hex(6),
) -> Receipt:
    expected_uid = uid_getter()
    server: socket.socket | None = None
    proc = None
    socket_path: Path | None = None
    try:
        socket_dir = prepare_socket_dir(home, expected_uid)
        socket_path = make_socket_path(socket_dir, token_factory())

        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(str(socket_path))
        os.chmod(socket_path, 0o600)
        server.listen(1)

        proc = launcher(socket_path)
        accept_payload(
            server,
            expected_uid=expected_uid,
            timeout_seconds=timeout_seconds,
            peer_uid_reader=peer_uid_reader,
        )
        return base_receipt(
            connection="connected",
            peer="same_uid",
            payload="valid_json",
            result="pass",
        )
    except ProbeBlocked as exc:
        return base_receipt(
            connection=exc.connection,
            peer=exc.peer,
            payload=exc.payload,
            result="blocked",
        )
    except (OSError, ProbeUnknown, subprocess.SubprocessError):
        return base_receipt(result="unknown")
    finally:
        if server is not None:
            try:
                server.close()
            except OSError:
                pass
        _reap_process(proc)
        if socket_path is not None:
            try:
                socket_path.unlink(missing_ok=True)
            except OSError:
                pass


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args != ["battery-status"]:
        sys.stdout.write(render_receipt(base_receipt(result="blocked")))
        return 64

    receipt = run_battery_status()
    sys.stdout.write(render_receipt(receipt))
    if receipt["result"] == "pass":
        return 0
    if receipt["result"] == "blocked":
        return 3
    return 4


if __name__ == "__main__":
    raise SystemExit(main())
