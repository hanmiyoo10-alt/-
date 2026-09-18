#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import socket
import tempfile

SCHEMA = "mcl-gui.v1"
ABSTRACT_SOCKET = "\0mcl-gui-v1"
MAX_TEXT = 512
MAX_TIMEOUT = 15.0

def _socket_address():
    if os.environ.get("MCL_GUI_TEST_MODE") == "1":
        test_socket = os.environ.get("MCL_GUI_TEST_SOCKET")
        if not test_socket:
            raise RuntimeError("MCL_GUI_TEST_SOCKET_REQUIRED")
        return test_socket
    return ABSTRACT_SOCKET

def _request(payload):
    wire = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8") + b"\n"
    if len(wire) > 8192:
        raise RuntimeError("REQUEST_TOO_LARGE")
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        sock.settimeout(MAX_TIMEOUT + 2)
        sock.connect(_socket_address())
        sock.sendall(wire)
        data = bytearray()
        while True:
            chunk = sock.recv(65536)
            if not chunk:
                break
            data.extend(chunk)
            if b"\n" in data:
                break
            if len(data) > 12 * 1024 * 1024:
                raise RuntimeError("RESPONSE_TOO_LARGE")
        line = bytes(data).split(b"\n", 1)[0]
        response = json.loads(line.decode("utf-8"))
        if response.get("schema") != SCHEMA:
            raise RuntimeError("BAD_RESPONSE_SCHEMA")
        return response
    finally:
        sock.close()

def _scratch_root():
    if os.environ.get("MCL_GUI_TEST_MODE") == "1":
        root = Path(os.environ.get("MCL_GUI_TEST_TMP", tempfile.gettempdir())) / "mcl-gui"
    else:
        tmpdir = os.environ.get("TMPDIR", "")
        if not tmpdir.startswith("/data/data/com.termux/"):
            raise RuntimeError("TERMUX_PRIVATE_TMP_REQUIRED")
        root = Path(tmpdir) / "mcl-gui"
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(root, 0o700)
    return root

def materialize_screenshot(response):
    encoded = response.pop("screenshot_png_b64", None)
    if encoded is None:
        return response
    raw = base64.b64decode(encoded, validate=True)
    root = _scratch_root()
    fd, path = tempfile.mkstemp(prefix="shot-", suffix=".png", dir=root)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(raw)
        os.chmod(path, 0o600)
    except Exception:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    response["screenshot_path"] = path
    response["screenshot_sha256"] = hashlib.sha256(raw).hexdigest()
    response["cleanup_required"] = True
    return response

def cleanup_screenshot(path):
    target = Path(path)
    root = _scratch_root().resolve()
    resolved = target.resolve()
    if resolved.parent != root or not resolved.name.startswith("shot-") or resolved.suffix != ".png":
        raise RuntimeError("INVALID_SCREENSHOT_PATH")
    resolved.unlink(missing_ok=True)

def _bounded(value, name):
    if value is None or not value or len(value) > MAX_TEXT or "\x00" in value:
        raise RuntimeError(f"INVALID_{name}")
    return value

def _payload(args):
    payload = {"schema": SCHEMA}
    command = args.command
    if command == "status":
        payload["op"] = "status"
    elif command == "launch-chatgpt":
        payload["op"] = "launch_chatgpt"
    elif command == "snapshot":
        payload["op"] = "snapshot"
        payload["include_screenshot"] = bool(args.screenshot)
    elif command == "find-action":
        payload["op"] = "find_action"
        payload["label"] = _bounded(args.label, "LABEL")
    elif command == "click":
        payload["op"] = "click"
        payload["handle"] = _bounded(args.handle, "HANDLE")
    elif command == "find-editable":
        payload["op"] = "find_editable"
    elif command == "set-text":
        payload["op"] = "set_text"
        payload["handle"] = _bounded(args.handle, "HANDLE")
        payload["text"] = _bounded(args.text, "TEXT")
    elif command == "wait-text":
        payload["op"] = "wait_text"
        payload["text"] = _bounded(args.text, "TEXT")
        timeout = float(args.timeout)
        if timeout <= 0 or timeout > MAX_TIMEOUT:
            raise RuntimeError("INVALID_TIMEOUT")
        payload["timeout_ms"] = int(timeout * 1000)
    else:
        raise RuntimeError("UNSUPPORTED_COMMAND")
    return payload

def parser():
    p = argparse.ArgumentParser(prog="mcl-gui")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    sub.add_parser("launch-chatgpt")
    snap = sub.add_parser("snapshot")
    snap.add_argument("--screenshot", action="store_true")
    find = sub.add_parser("find-action")
    find.add_argument("label")
    click = sub.add_parser("click")
    click.add_argument("handle")
    sub.add_parser("find-editable")
    set_text = sub.add_parser("set-text")
    set_text.add_argument("handle")
    set_text.add_argument("text")
    wait = sub.add_parser("wait-text")
    wait.add_argument("text")
    wait.add_argument("timeout", type=float)
    return p

def main(argv=None):
    try:
        args = parser().parse_args(argv)
        response = _request(_payload(args))
        response = materialize_screenshot(response)
        print(json.dumps(response, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
        return 0 if response.get("status") in {"PASS", "OK", "FOUND"} else 2
    except Exception as exc:
        print(json.dumps({"schema": SCHEMA, "status": "ERROR", "reason": str(exc)}, sort_keys=True, separators=(",", ":")))
        return 2
