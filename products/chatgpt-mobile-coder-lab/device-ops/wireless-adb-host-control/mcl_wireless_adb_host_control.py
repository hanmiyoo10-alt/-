#!/usr/bin/env python3
"""Bounded L/WSL -> exact M/S Wireless ADB raw-mDNS controller."""

from __future__ import annotations

import base64
import binascii
import hashlib
import ipaddress
import json
import os
import stat
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

SCHEMA = "mcl-wireless-adb-host-control.v1"
SERVICE_TYPE = "_adb-tls-connect._tcp.local"
POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
PS_SOURCE = Path(__file__).with_name("windows-mdns-adb.ps1")
STATE_ROOT = Path.home() / ".local/state/mcl-wireless-adb-host-control"
PROFILES = {
    "M": {"model": "SM-S938N", "pin": STATE_ROOT / "l-to-m.v1"},
    "S": {"model": "SM-G998N", "pin": STATE_ROOT / "l-to-s.v1"},
}
MAX_PACKET = 4096
MAX_PACKETS = 16
MAX_RECORDS = 64
MAX_INSTANCES = 8
MAX_ENDPOINTS = 8
MAX_KNOWN_HOSTS_BYTES = 16 * 1024
MAX_PROTO_FIELDS = 128
MAX_PROTO_DEPTH = 4
MAX_CHILD_OUTPUT = 128 * 1024
FALSE_AUTHORITY = {
    "repositoryMutationAuthorized": False,
    "deviceMutationAuthorized": False,
    "mergeAuthorized": False,
    "releaseAuthorized": False,
    "productionAuthorized": False,
}


class HostControlError(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def profile(name: str) -> dict:
    if name not in PROFILES:
        raise HostControlError("PROFILE_INVALID")
    return PROFILES[name]


def norm_name(value: str) -> str:
    text = value.strip().rstrip(".").lower()
    if not text or len(text.encode("utf-8")) > 255:
        raise HostControlError("DNS_NAME_INVALID")
    return text


def _read_name(data: bytes, offset: int) -> tuple[str, int]:
    labels: list[str] = []
    cursor = offset
    consumed = None
    seen: set[int] = set()
    for _ in range(32):
        if cursor >= len(data):
            raise HostControlError("DNS_NAME_TRUNCATED")
        length = data[cursor]
        if length == 0:
            end = consumed if consumed is not None else cursor + 1
            return norm_name(".".join(labels)), end
        if length & 0xC0 == 0xC0:
            if cursor + 1 >= len(data):
                raise HostControlError("DNS_POINTER_TRUNCATED")
            pointer = ((length & 0x3F) << 8) | data[cursor + 1]
            if pointer >= len(data) or pointer in seen:
                raise HostControlError("DNS_POINTER_INVALID")
            seen.add(pointer)
            if consumed is None:
                consumed = cursor + 2
            cursor = pointer
            continue
        if length & 0xC0 or length > 63 or cursor + 1 + length > len(data):
            raise HostControlError("DNS_LABEL_INVALID")
        try:
            labels.append(data[cursor + 1:cursor + 1 + length].decode("ascii"))
        except UnicodeDecodeError as exc:
            raise HostControlError("DNS_LABEL_INVALID") from exc
        cursor += 1 + length
    raise HostControlError("DNS_POINTER_DEPTH")


def parse_dns(data: bytes) -> list[tuple]:
    if not 12 <= len(data) <= MAX_PACKET:
        raise HostControlError("DNS_PACKET_SIZE")
    _ident, flags, qd, an, ns, ar = struct.unpack_from("!HHHHHH", data, 0)
    if not flags & 0x8000:
        return []
    total = an + ns + ar
    if qd > 4 or total > MAX_RECORDS:
        raise HostControlError("DNS_RECORD_LIMIT")
    offset = 12
    for _ in range(qd):
        _name, offset = _read_name(data, offset)
        if offset + 4 > len(data):
            raise HostControlError("DNS_QUESTION_TRUNCATED")
        offset += 4
    records: list[tuple] = []
    for _ in range(total):
        owner, offset = _read_name(data, offset)
        if offset + 10 > len(data):
            raise HostControlError("DNS_RR_TRUNCATED")
        rtype, _rclass, _ttl, rdlen = struct.unpack_from("!HHIH", data, offset)
        offset += 10
        end = offset + rdlen
        if end > len(data):
            raise HostControlError("DNS_RDATA_TRUNCATED")
        if rtype == 12:
            target, consumed = _read_name(data, offset)
            if consumed > end:
                raise HostControlError("DNS_PTR_INVALID")
            records.append(("PTR", owner, target))
        elif rtype == 33:
            if rdlen < 7:
                raise HostControlError("DNS_SRV_INVALID")
            _priority, _weight, port = struct.unpack_from("!HHH", data, offset)
            target, consumed = _read_name(data, offset + 6)
            if not 1 <= port <= 65535 or consumed > end:
                raise HostControlError("DNS_SRV_INVALID")
            records.append(("SRV", owner, target, port))
        elif rtype == 1:
            if rdlen != 4:
                raise HostControlError("DNS_A_INVALID")
            records.append(("ADDR", owner, str(ipaddress.ip_address(data[offset:end]))))
        elif rtype == 28:
            if rdlen != 16:
                raise HostControlError("DNS_AAAA_INVALID")
            records.append(("ADDR", owner, str(ipaddress.ip_address(data[offset:end]))))
        offset = end
    return records


def _endpoint(address: str, port: int) -> str:
    ip = ipaddress.ip_address(address)
    return f"[{ip.compressed}]:{port}" if ip.version == 6 else f"{ip.compressed}:{port}"


def _service_token(instance: str) -> str:
    normalized = norm_name(instance)
    suffix = "." + norm_name(SERVICE_TYPE)
    if not normalized.endswith(suffix):
        raise HostControlError("SERVICE_INSTANCE_INVALID")
    token = normalized[:-len(suffix)]
    if not token or "." in token:
        raise HostControlError("SERVICE_INSTANCE_INVALID")
    return token


def candidates_from_packets(packets: list[bytes]) -> list[dict[str, str]]:
    if len(packets) > MAX_PACKETS:
        raise HostControlError("DISCOVERY_PACKET_LIMIT")
    records: list[tuple] = []
    for packet in packets:
        records.extend(parse_dns(packet))
        if len(records) > MAX_RECORDS:
            raise HostControlError("DISCOVERY_RECORD_LIMIT")
    service = norm_name(SERVICE_TYPE)
    instances = sorted({row[2] for row in records if row[0] == "PTR" and row[1] == service})
    if len(instances) > MAX_INSTANCES:
        raise HostControlError("DISCOVERY_INSTANCE_LIMIT")
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
        raw_addrs = sorted(addrs.get(target, set()))
        if len(raw_addrs) > MAX_ENDPOINTS:
            raise HostControlError("DISCOVERY_ENDPOINT_LIMIT")
        ipv4 = [addr for addr in raw_addrs if ipaddress.ip_address(addr).version == 4]
        ipv6 = [addr for addr in raw_addrs if ipaddress.ip_address(addr).version == 6]
        selected = None
        if len(ipv4) == 1:
            selected = ipv4[0]
        elif len(ipv4) == 0 and len(ipv6) == 1:
            selected = ipv6[0]
        if selected is not None:
            result.append({"instance": instance, "endpoint": _endpoint(selected, port)})
    return result


def _varint(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    for shift in range(0, 70, 7):
        if offset >= len(data):
            raise HostControlError("PROTO_TRUNCATED")
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
    raise HostControlError("PROTO_VARINT_INVALID")


def _proto_strings(data: bytes, depth: int = 0, budget: list[int] | None = None) -> set[str]:
    if depth > MAX_PROTO_DEPTH:
        raise HostControlError("PROTO_DEPTH")
    budget = budget or [MAX_PROTO_FIELDS]
    result: set[str] = set()
    offset = 0
    while offset < len(data):
        budget[0] -= 1
        if budget[0] < 0:
            raise HostControlError("PROTO_FIELD_LIMIT")
        key, offset = _varint(data, offset)
        wire = key & 7
        if key >> 3 == 0:
            raise HostControlError("PROTO_FIELD_INVALID")
        if wire == 0:
            _value, offset = _varint(data, offset)
        elif wire == 1:
            offset += 8
        elif wire == 2:
            length, offset = _varint(data, offset)
            end = offset + length
            if end > len(data):
                raise HostControlError("PROTO_TRUNCATED")
            payload = data[offset:end]
            if payload:
                try:
                    text = payload.decode("utf-8")
                except UnicodeDecodeError:
                    text = ""
                if text and 1 <= len(text) <= 255 and all(32 <= ord(ch) < 127 for ch in text):
                    try:
                        result.add(norm_name(text))
                    except HostControlError:
                        pass
                if depth < MAX_PROTO_DEPTH:
                    try:
                        result |= _proto_strings(payload, depth + 1, budget)
                    except HostControlError as exc:
                        if exc.reason in {"PROTO_FIELD_LIMIT", "PROTO_DEPTH"}:
                            raise
            offset = end
        elif wire == 5:
            offset += 4
        else:
            raise HostControlError("PROTO_WIRE_INVALID")
        if offset > len(data):
            raise HostControlError("PROTO_TRUNCATED")
    return result


def known_hosts_from_bytes(data: bytes) -> set[str]:
    if not 1 <= len(data) <= MAX_KNOWN_HOSTS_BYTES:
        raise HostControlError("KNOWN_HOSTS_SIZE")
    return _proto_strings(data)


def pin_digest(profile_name: str, instance: str) -> str:
    domain = f"mcl-wireless-adb-host-control:{profile_name}:v1\0".encode()
    return hashlib.sha256(domain + norm_name(instance).encode()).hexdigest()


def _pin_payload(profile_name: str, instance: str) -> dict:
    cfg = profile(profile_name)
    return {
        "schemaVersion": 1,
        "profile": profile_name,
        "targetModel": cfg["model"],
        "instanceDigest": pin_digest(profile_name, instance),
    }


def _write_pin(profile_name: str, instance: str, path: Path | None = None) -> None:
    cfg = profile(profile_name)
    path = path or cfg["pin"]
    fd = -1
    tmp = None
    try:
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(path.parent, 0o700)
        payload = (json.dumps(_pin_payload(profile_name, instance), separators=(",", ":"), sort_keys=True) + "\n").encode()
        fd, tmp = tempfile.mkstemp(prefix=".mcl-pin-", dir=path.parent)
        os.fchmod(fd, 0o600)
        os.write(fd, payload)
        os.fsync(fd)
        os.close(fd)
        fd = -1
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    except OSError as exc:
        raise HostControlError("PIN_WRITE_FAILED") from exc
    finally:
        if fd >= 0:
            try:
                os.close(fd)
            except OSError:
                pass
        if tmp:
            try:
                os.unlink(tmp)
            except OSError:
                pass


def _read_pin(profile_name: str, path: Path | None = None) -> dict:
    cfg = profile(profile_name)
    path = path or cfg["pin"]
    try:
        info = path.lstat()
    except OSError as exc:
        raise HostControlError("PIN_UNAVAILABLE") from exc
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_size > 1024:
        raise HostControlError("PIN_FILE_INVALID")
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise HostControlError("PIN_JSON_INVALID") from exc
    required = {"schemaVersion", "profile", "targetModel", "instanceDigest"}
    if not isinstance(value, dict) or set(value) != required:
        raise HostControlError("PIN_SCHEMA_INVALID")
    if value["schemaVersion"] != 1 or value["profile"] != profile_name or value["targetModel"] != cfg["model"]:
        raise HostControlError("PIN_SCHEMA_INVALID")
    digest = value["instanceDigest"]
    if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
        raise HostControlError("PIN_DIGEST_INVALID")
    return value


def _ps_unc_path() -> str:
    distro = os.environ.get("WSL_DISTRO_NAME", "").strip()
    if not distro or any(ch in distro for ch in "\\/"):
        raise HostControlError("WSL_DISTRO_INVALID")
    source = PS_SOURCE.resolve()
    if not source.is_file() or source.is_symlink():
        raise HostControlError("POWERSHELL_SOURCE_INVALID")
    return "\\\\wsl.localhost\\" + distro + str(source).replace("/", "\\")


def _ps_call(mode: str, profile_name: str, endpoint: str | None = None) -> dict:
    if mode not in {"mdns", "known-hosts", "connected", "connect"}:
        raise HostControlError("TRANSPORT_MODE_INVALID")
    profile(profile_name)
    argv = [
        POWERSHELL, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", _ps_unc_path(), "-Mode", mode, "-Profile", profile_name,
    ]
    try:
        proc = subprocess.run(
            argv,
            input=(endpoint + "\n") if endpoint is not None else "",
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise HostControlError("WINDOWS_TRANSPORT_FAILED") from exc
    if proc.returncode != 0 or len(proc.stdout.encode()) > MAX_CHILD_OUTPUT:
        raise HostControlError("WINDOWS_TRANSPORT_FAILED")
    try:
        value = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise HostControlError("WINDOWS_TRANSPORT_INVALID") from exc
    if not isinstance(value, dict) or value.get("ok") is not True:
        raise HostControlError("WINDOWS_TRANSPORT_INVALID")
    return value


def discover(profile_name: str, transport=_ps_call) -> list[dict[str, str]]:
    value = transport("mdns", profile_name)
    packets = value.get("packets")
    if not isinstance(packets, list) or len(packets) > MAX_PACKETS:
        raise HostControlError("DISCOVERY_PACKET_LIMIT")
    decoded: list[bytes] = []
    try:
        for item in packets:
            if not isinstance(item, str):
                raise ValueError
            raw = base64.b64decode(item, validate=True)
            if len(raw) > MAX_PACKET:
                raise ValueError
            decoded.append(raw)
    except (ValueError, binascii.Error) as exc:
        raise HostControlError("DISCOVERY_PACKET_INVALID") from exc
    return candidates_from_packets(decoded)


def known_hosts(profile_name: str, transport=_ps_call) -> set[str]:
    value = transport("known-hosts", profile_name)
    data = value.get("data")
    if not isinstance(data, str):
        raise HostControlError("KNOWN_HOSTS_INVALID")
    try:
        raw = base64.b64decode(data, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HostControlError("KNOWN_HOSTS_INVALID") from exc
    return known_hosts_from_bytes(raw)


def connected(profile_name: str, transport=_ps_call) -> list[dict[str, str]]:
    value = transport("connected", profile_name)
    rows = value.get("rows")
    if not isinstance(rows, list) or len(rows) > 16:
        raise HostControlError("CONNECTED_ROWS_INVALID")
    out = []
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"serial", "model"}:
            raise HostControlError("CONNECTED_ROWS_INVALID")
        serial, model = row["serial"], row["model"]
        if not isinstance(serial, str) or not isinstance(model, str) or not serial or len(serial) > 255 or len(model) > 64:
            raise HostControlError("CONNECTED_ROWS_INVALID")
        out.append({"serial": serial, "model": model})
    return out


def _transport_matches(candidate: dict[str, str], serial: str) -> bool:
    if serial == candidate["endpoint"]:
        return True
    try:
        s = norm_name(serial)
        instance = norm_name(candidate["instance"])
    except HostControlError:
        return False
    return s == instance or s + ".local" == instance


def _eligible(profile_name: str, pin: dict, hosts: set[str], candidates: list[dict[str, str]]) -> dict[str, str]:
    matched = []
    for row in candidates:
        if pin_digest(profile_name, row["instance"]) != pin["instanceDigest"]:
            continue
        if norm_name(_service_token(row["instance"])) not in hosts:
            continue
        matched.append(row)
    if len(matched) != 1:
        raise HostControlError("CANDIDATE_NOT_EXACT")
    return matched[0]


def bootstrap(profile_name: str, transport=_ps_call, pin_writer=_write_pin) -> dict:
    cfg = profile(profile_name)
    candidates = discover(profile_name, transport)
    hosts = known_hosts(profile_name, transport)
    rows = [row for row in connected(profile_name, transport) if row["model"] == cfg["model"]]
    eligible = [
        row for row in candidates
        if norm_name(_service_token(row["instance"])) in hosts
        and any(_transport_matches(row, connected_row["serial"]) for connected_row in rows)
    ]
    if len(rows) != 1 or len(eligible) != 1:
        raise HostControlError("BOOTSTRAP_CORRELATION_NOT_EXACT")
    pin_writer(profile_name, eligible[0]["instance"])
    return receipt("bootstrap", profile_name, "PINNED")


def inspect(profile_name: str, transport=_ps_call, pin_reader=_read_pin) -> dict:
    pin = pin_reader(profile_name)
    _eligible(profile_name, pin, known_hosts(profile_name, transport), discover(profile_name, transport))
    return receipt("inspect", profile_name, "READY")


def reconnect(profile_name: str, transport=_ps_call, pin_reader=_read_pin) -> dict:
    cfg = profile(profile_name)
    pin = pin_reader(profile_name)
    candidate = _eligible(profile_name, pin, known_hosts(profile_name, transport), discover(profile_name, transport))
    result = transport("connect", profile_name, candidate["endpoint"])
    if result.get("model") != cfg["model"]:
        raise HostControlError("TARGET_MODEL_MISMATCH")
    rows = [row for row in connected(profile_name, transport) if row["model"] == cfg["model"]]
    if len(rows) != 1:
        raise HostControlError("POSTCONNECT_MODEL_COUNT_INVALID")
    return receipt("reconnect", profile_name, "CONNECTED")


def receipt(operation: str, profile_name: str, status: str, reasons: list[str] | None = None) -> dict:
    cfg = profile(profile_name)
    return {
        "schemaVersion": 1,
        "mode": SCHEMA,
        "operation": operation,
        "profile": profile_name,
        "targetModel": cfg["model"],
        "status": status,
        "reasonCodes": sorted(set(reasons or [])),
        "identifiers": "withheld",
        "authority": dict(FALSE_AUTHORITY),
    }


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] not in {"inspect", "bootstrap", "reconnect"} or argv[2] not in PROFILES:
        p = argv[2] if len(argv) >= 3 and argv[2] in PROFILES else "M"
        print(json.dumps(receipt("invalid", p, "BLOCKED", ["OPERATION_INVALID"]), separators=(",", ":"), sort_keys=True))
        return 2
    operation, profile_name = argv[1], argv[2]
    try:
        result = {"inspect": inspect, "bootstrap": bootstrap, "reconnect": reconnect}[operation](profile_name)
        print(json.dumps(result, separators=(",", ":"), sort_keys=True))
        return 0
    except HostControlError as exc:
        print(json.dumps(receipt(operation, profile_name, "BLOCKED", [exc.reason]), separators=(",", ":"), sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
