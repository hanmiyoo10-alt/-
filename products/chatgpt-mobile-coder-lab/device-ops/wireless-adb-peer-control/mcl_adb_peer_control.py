#!/usr/bin/env python3
"""Fixed M Termux -> exact S Wireless ADB peer controller."""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import socket
import stat
import struct
import subprocess
import sys
import tempfile
import time
from pathlib import Path

SCHEMA = "mcl-wireless-adb-peer-control.v1"
TARGET_MODEL = "SM-G998N"
SERVICE_TYPE = "_adb-tls-connect._tcp.local"
MDNS_GROUP = "224.0.0.251"
MDNS_PORT = 5353
ADB = "/data/data/com.termux/files/usr/bin/adb"
PIN_PATH = Path.home() / ".local/state/mcl-wireless-adb-peer-control/m-to-s.v1"
KNOWN_HOSTS_PATH = Path.home() / ".android/adb_known_hosts.pb"

MAX_PACKET = 4096
MAX_PACKETS = 16
MAX_RECORDS = 64
MAX_INSTANCES = 8
MAX_ENDPOINTS = 8
MAX_KNOWN_HOSTS_BYTES = 16 * 1024
MAX_PROTO_FIELDS = 128
MAX_PROTO_DEPTH = 4
DISCOVERY_SECONDS = 2.0
PIN_DOMAIN = b"mcl-wireless-adb-peer-control:m-to-s:v1\0"
FALSE_AUTHORITY = {
    "repositoryMutationAuthorized": False,
    "deviceMutationAuthorized": False,
    "mergeAuthorized": False,
    "releaseAuthorized": False,
    "productionAuthorized": False,
}


class PeerError(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def norm_name(value: str) -> str:
    text = value.strip().rstrip(".").lower()
    if not text or len(text.encode("utf-8")) > 255:
        raise PeerError("DNS_NAME_INVALID")
    return text


def _encode_name(name: str) -> bytes:
    out = bytearray()
    for label in norm_name(name).split("."):
        raw = label.encode("ascii")
        if not 1 <= len(raw) <= 63:
            raise PeerError("DNS_LABEL_INVALID")
        out.append(len(raw))
        out.extend(raw)
    out.append(0)
    return bytes(out)


def build_query() -> bytes:
    return struct.pack("!HHHHHH", 0, 0, 1, 0, 0, 0) + _encode_name(SERVICE_TYPE) + struct.pack("!HH", 12, 1)


def _read_name(data: bytes, offset: int) -> tuple[str, int]:
    labels: list[str] = []
    cursor = offset
    consumed = None
    seen: set[int] = set()
    for _ in range(32):
        if cursor >= len(data):
            raise PeerError("DNS_NAME_TRUNCATED")
        length = data[cursor]
        if length == 0:
            end = consumed if consumed is not None else cursor + 1
            return norm_name(".".join(labels)), end
        if length & 0xC0 == 0xC0:
            if cursor + 1 >= len(data):
                raise PeerError("DNS_POINTER_TRUNCATED")
            pointer = ((length & 0x3F) << 8) | data[cursor + 1]
            if pointer >= len(data) or pointer in seen:
                raise PeerError("DNS_POINTER_INVALID")
            seen.add(pointer)
            if consumed is None:
                consumed = cursor + 2
            cursor = pointer
            continue
        if length & 0xC0 or length > 63 or cursor + 1 + length > len(data):
            raise PeerError("DNS_LABEL_INVALID")
        try:
            label = data[cursor + 1:cursor + 1 + length].decode("ascii")
        except UnicodeDecodeError as exc:
            raise PeerError("DNS_LABEL_INVALID") from exc
        labels.append(label)
        cursor += 1 + length
    raise PeerError("DNS_POINTER_DEPTH")


def parse_dns(data: bytes) -> list[tuple]:
    if not 12 <= len(data) <= MAX_PACKET:
        raise PeerError("DNS_PACKET_SIZE")
    _ident, _flags, qd, an, ns, ar = struct.unpack_from("!HHHHHH", data, 0)
    total = an + ns + ar
    if qd > 4 or total > MAX_RECORDS:
        raise PeerError("DNS_RECORD_LIMIT")
    offset = 12
    for _ in range(qd):
        _name, offset = _read_name(data, offset)
        if offset + 4 > len(data):
            raise PeerError("DNS_QUESTION_TRUNCATED")
        offset += 4
    records: list[tuple] = []
    for _ in range(total):
        owner, offset = _read_name(data, offset)
        if offset + 10 > len(data):
            raise PeerError("DNS_RR_TRUNCATED")
        rtype, _rclass, _ttl, rdlen = struct.unpack_from("!HHIH", data, offset)
        offset += 10
        end = offset + rdlen
        if end > len(data):
            raise PeerError("DNS_RDATA_TRUNCATED")
        if rtype == 12:
            target, consumed = _read_name(data, offset)
            if consumed > end:
                raise PeerError("DNS_PTR_INVALID")
            records.append(("PTR", owner, target))
        elif rtype == 33:
            if rdlen < 7:
                raise PeerError("DNS_SRV_INVALID")
            _priority, _weight, port = struct.unpack_from("!HHH", data, offset)
            target, consumed = _read_name(data, offset + 6)
            if not 1 <= port <= 65535 or consumed > end:
                raise PeerError("DNS_SRV_INVALID")
            records.append(("SRV", owner, target, port))
        elif rtype == 1:
            if rdlen != 4:
                raise PeerError("DNS_A_INVALID")
            records.append(("ADDR", owner, str(ipaddress.ip_address(data[offset:end]))))
        elif rtype == 28:
            if rdlen != 16:
                raise PeerError("DNS_AAAA_INVALID")
            records.append(("ADDR", owner, str(ipaddress.ip_address(data[offset:end]))))
        offset = end
    return records


def _service_token(instance: str) -> str:
    normalized = norm_name(instance)
    suffix = "." + norm_name(SERVICE_TYPE)
    if not normalized.endswith(suffix):
        raise PeerError("SERVICE_INSTANCE_INVALID")
    token = normalized[:-len(suffix)]
    if not token or "." in token:
        raise PeerError("SERVICE_INSTANCE_INVALID")
    return token


def _endpoint(address: str, port: int) -> str:
    ip = ipaddress.ip_address(address)
    return f"[{ip.compressed}]:{port}" if ip.version == 6 else f"{ip.compressed}:{port}"


def candidates_from_packets(packets: list[bytes]) -> list[dict[str, str]]:
    if len(packets) > MAX_PACKETS:
        raise PeerError("DISCOVERY_PACKET_LIMIT")
    records: list[tuple] = []
    for packet in packets:
        records.extend(parse_dns(packet))
        if len(records) > MAX_RECORDS:
            raise PeerError("DISCOVERY_RECORD_LIMIT")
    service = norm_name(SERVICE_TYPE)
    instances = sorted({row[2] for row in records if row[0] == "PTR" and row[1] == service})
    if len(instances) > MAX_INSTANCES:
        raise PeerError("DISCOVERY_INSTANCE_LIMIT")
    srvs: dict[str, set[tuple[str, int]]] = {}
    addrs: dict[str, set[str]] = {}
    for row in records:
        if row[0] == "SRV":
            srvs.setdefault(row[1], set()).add((row[2], row[3]))
        elif row[0] == "ADDR":
            addrs.setdefault(row[1], set()).add(row[2])
    result = []
    for instance in instances:
        srv = srvs.get(instance, set())
        if len(srv) != 1:
            continue
        target, port = next(iter(srv))
        endpoints = sorted({_endpoint(addr, port) for addr in addrs.get(target, set())})
        if len(endpoints) > MAX_ENDPOINTS:
            raise PeerError("DISCOVERY_ENDPOINT_LIMIT")
        if len(endpoints) == 1:
            result.append({"instance": instance, "endpoint": endpoints[0]})
    return result


def discover() -> list[dict[str, str]]:
    query = build_query()
    packets: list[bytes] = []
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    try:
        sock.settimeout(0.2)
        sock.sendto(query, (MDNS_GROUP, MDNS_PORT))
        deadline = time.monotonic() + DISCOVERY_SECONDS
        while time.monotonic() < deadline and len(packets) < MAX_PACKETS:
            try:
                packet, _peer = sock.recvfrom(MAX_PACKET + 1)
            except socket.timeout:
                continue
            if len(packet) > MAX_PACKET:
                raise PeerError("DNS_PACKET_SIZE")
            packets.append(packet)
    finally:
        sock.close()
    return candidates_from_packets(packets)


def _varint(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    for shift in range(0, 70, 7):
        if offset >= len(data):
            raise PeerError("PROTO_TRUNCATED")
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
    raise PeerError("PROTO_VARINT_INVALID")


def _proto_strings(data: bytes, depth: int = 0, budget: list[int] | None = None) -> set[str]:
    if depth > MAX_PROTO_DEPTH:
        raise PeerError("PROTO_DEPTH")
    budget = budget or [MAX_PROTO_FIELDS]
    result: set[str] = set()
    offset = 0
    while offset < len(data):
        budget[0] -= 1
        if budget[0] < 0:
            raise PeerError("PROTO_FIELD_LIMIT")
        key, offset = _varint(data, offset)
        wire = key & 7
        if key >> 3 == 0:
            raise PeerError("PROTO_FIELD_INVALID")
        if wire == 0:
            _value, offset = _varint(data, offset)
        elif wire == 1:
            offset += 8
        elif wire == 2:
            length, offset = _varint(data, offset)
            end = offset + length
            if end > len(data):
                raise PeerError("PROTO_TRUNCATED")
            payload = data[offset:end]
            if payload:
                try:
                    text = payload.decode("utf-8")
                except UnicodeDecodeError:
                    text = ""
                if text and 1 <= len(text) <= 255 and all(32 <= ord(ch) < 127 for ch in text):
                    try:
                        result.add(norm_name(text))
                    except PeerError:
                        pass
                if depth < MAX_PROTO_DEPTH:
                    try:
                        result |= _proto_strings(payload, depth + 1, budget)
                    except PeerError as exc:
                        if exc.reason in {"PROTO_FIELD_LIMIT", "PROTO_DEPTH"}:
                            raise
            offset = end
        elif wire == 5:
            offset += 4
        else:
            raise PeerError("PROTO_WIRE_INVALID")
        if offset > len(data):
            raise PeerError("PROTO_TRUNCATED")
    return result


def known_hosts(path: Path = KNOWN_HOSTS_PATH) -> set[str]:
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise PeerError("KNOWN_HOSTS_UNAVAILABLE") from exc
    if not 1 <= len(data) <= MAX_KNOWN_HOSTS_BYTES:
        raise PeerError("KNOWN_HOSTS_SIZE")
    strings = _proto_strings(data)
    return {item for item in strings if 1 <= len(item) <= 255}


def pin_digest(instance: str) -> str:
    return hashlib.sha256(PIN_DOMAIN + norm_name(instance).encode()).hexdigest()


def _pin_payload(instance: str) -> dict:
    return {"schemaVersion": 1, "targetModel": TARGET_MODEL, "instanceDigest": pin_digest(instance)}


def _write_pin(instance: str, path: Path) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    payload = (json.dumps(_pin_payload(instance), separators=(",", ":"), sort_keys=True) + "\n").encode()
    fd, tmp = tempfile.mkstemp(prefix=".mcl-pin-", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        os.write(fd, payload)
        os.fsync(fd)
        os.close(fd)
        fd = -1
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    finally:
        if fd >= 0:
            os.close(fd)
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass


def write_pin(instance: str) -> None:
    _write_pin(instance, PIN_PATH)


def _read_pin(path: Path) -> dict:
    try:
        info = path.lstat()
    except OSError as exc:
        raise PeerError("PIN_UNAVAILABLE") from exc
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_size > 1024:
        raise PeerError("PIN_FILE_INVALID")
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise PeerError("PIN_JSON_INVALID") from exc
    if set(value) != {"schemaVersion", "targetModel", "instanceDigest"} or value.get("schemaVersion") != 1 or value.get("targetModel") != TARGET_MODEL:
        raise PeerError("PIN_SCHEMA_INVALID")
    digest = value.get("instanceDigest")
    if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
        raise PeerError("PIN_DIGEST_INVALID")
    return value


def read_pin() -> dict:
    return _read_pin(PIN_PATH)


def select_candidate(pin: dict, hosts: set[str], candidates: list[dict[str, str]]) -> dict[str, str]:
    matched = []
    for candidate in candidates:
        instance = candidate["instance"]
        if pin_digest(instance) != pin["instanceDigest"]:
            continue
        if norm_name(_service_token(instance)) not in hosts:
            continue
        matched.append(candidate)
    if len(matched) != 1:
        raise PeerError("CANDIDATE_NOT_EXACT")
    return matched[0]


def _run(argv: list[str], timeout: int = 10) -> str:
    env = {k: os.environ[k] for k in ("HOME", "PATH", "LANG", "LC_ALL") if k in os.environ}
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, env=env, check=False)
    except (OSError, subprocess.SubprocessError) as exc:
        raise PeerError("ADB_EXEC_FAILED") from exc
    if proc.returncode != 0 or len(proc.stdout) + len(proc.stderr) > 8192:
        raise PeerError("ADB_EXEC_FAILED")
    return proc.stdout


def _model(endpoint: str, runner=_run) -> str:
    return runner([ADB, "-s", endpoint, "shell", "getprop", "ro.product.model"]).strip()


def connected_s(runner=_run) -> list[str]:
    lines = runner([ADB, "devices"]).splitlines()[1:]
    result = []
    for line in lines:
        fields = line.split()
        if len(fields) >= 2 and fields[1] == "device":
            endpoint = fields[0]
            if _model(endpoint, runner) == TARGET_MODEL:
                result.append(endpoint)
    return result


def bootstrap(*, discoverer=discover, host_reader=known_hosts, runner=_run, pin_writer=write_pin) -> dict:
    candidates = discoverer()
    hosts = host_reader()
    connected = connected_s(runner)
    eligible = [
        row for row in candidates
        if _service_token(row["instance"]) in hosts and row["endpoint"] in connected
    ]
    if len(eligible) != 1 or len(connected) != 1:
        raise PeerError("BOOTSTRAP_CORRELATION_NOT_EXACT")
    pin_writer(eligible[0]["instance"])
    return receipt("PINNED")


def inspect(*, discoverer=discover, host_reader=known_hosts, pin_reader=read_pin) -> dict:
    select_candidate(pin_reader(), host_reader(), discoverer())
    return receipt("READY")


def reconnect(*, discoverer=discover, host_reader=known_hosts, pin_reader=read_pin, runner=_run) -> dict:
    candidate = select_candidate(pin_reader(), host_reader(), discoverer())
    runner([ADB, "connect", candidate["endpoint"]])
    if _model(candidate["endpoint"], runner) != TARGET_MODEL:
        raise PeerError("TARGET_MODEL_MISMATCH")
    return receipt("CONNECTED")


def receipt(status: str, reasons: list[str] | None = None) -> dict:
    return {
        "schemaVersion": 1,
        "mode": SCHEMA,
        "status": status,
        "reasonCodes": sorted(set(reasons or [])),
        "targetModel": TARGET_MODEL,
        "identifiers": "withheld",
        "authority": dict(FALSE_AUTHORITY),
    }


def main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[1] not in {"inspect", "bootstrap", "reconnect"}:
        print(json.dumps(receipt("BLOCKED", ["OPERATION_INVALID"]), separators=(",", ":")))
        return 2
    try:
        result = {"inspect": inspect, "bootstrap": bootstrap, "reconnect": reconnect}[argv[1]]()
        print(json.dumps(result, separators=(",", ":"), sort_keys=True))
        return 0
    except PeerError as exc:
        print(json.dumps(receipt("BLOCKED", [exc.reason]), separators=(",", ":"), sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
