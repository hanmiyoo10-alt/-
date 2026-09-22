#!/usr/bin/env python3
"""Reconnect one already-paired Android device; never pairs or changes adbd.
Local config: ~/.config/fortune-adb/target.json with host, port, serial.
Run --start at shell startup; --once for a single check; --watch for foreground.
"""
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import subprocess
import sys
import time

BASE = Path.home() / ".local/state/fortune-adb"
CONFIG = Path.home() / ".config/fortune-adb/target.json"
BASE.mkdir(parents=True, exist_ok=True, mode=0o700)

def adb(*args):
    try:
        p = subprocess.run(["adb", *args], text=True, capture_output=True, timeout=12)
        return p.stdout.strip() if p.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""

def check():
    cfg = json.loads(CONFIG.read_text())
    host, port, serial = cfg["host"], int(cfg["port"]), cfg["serial"]
    if not 1 <= port <= 65535:
        raise ValueError("Invalid port")
    endpoint = f"{host}:{port}"
    devices = adb("devices")
    if any(line.split()[:2] == [endpoint, "device"] for line in devices.splitlines()):
        if adb("-s", endpoint, "shell", "getprop", "ro.serialno") == serial:
            return "connected"
        return "identity mismatch; no device actions performed"
    # Only accept the expected identity at the explicitly configured host.
    for line in adb("mdns", "services").splitlines():
        fields = line.split()
        if len(fields) >= 3 and fields[0].startswith("adb-" + serial + "-") and "_adb-tls-connect._tcp" in fields[1]:
            address = fields[-1]
            if address.startswith(host + ":") and address.rsplit(":", 1)[1].isdigit():
                endpoint = address
                break
    adb("connect", endpoint)
    if adb("-s", endpoint, "shell", "getprop", "ro.serialno") == serial:
        new_port = int(endpoint.rsplit(":", 1)[1])
        if new_port != port:
            cfg["port"] = new_port
            tmp = CONFIG.with_suffix(".tmp")
            tmp.write_text(json.dumps(cfg) + "\n")
            tmp.chmod(0o600)
            tmp.replace(CONFIG)
        return "connected"
    return "waiting for known endpoint or matching mDNS service"

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--once"
    if mode == "--start":
        subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "--watch"],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)
        return
    if mode == "--once":
        print(check())
        return
    if mode != "--watch":
        raise SystemExit("Use --start, --watch, or --once")
    with (BASE / "monitor.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        (BASE / "monitor.pid").write_text(str(os.getpid()) + "\n")
        handler = RotatingFileHandler(BASE / "monitor.log", maxBytes=65536, backupCount=1)
        logging.basicConfig(level=logging.INFO, handlers=[handler], format="%(asctime)s %(message)s")
        previous = None
        while True:
            try:
                state = check()
            except Exception as exc:
                state = "check failed: " + type(exc).__name__
            if state != previous:
                logging.info(state)
                previous = state
            time.sleep(15)

if __name__ == "__main__":
    main()
