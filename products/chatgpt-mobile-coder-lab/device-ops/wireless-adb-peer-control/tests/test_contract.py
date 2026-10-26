#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import io
import json
import os
import socket
import stat
import struct
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import mcl_adb_peer_control as peer

INSTANCE = "peer-guid._adb-tls-connect._tcp.local"
TOKEN = "peer-guid"
HOST = "peer-host.local"
ENDPOINT = "192.0.2.10:37123"


def enc(name: str) -> bytes:
    return peer._encode_name(name)


def rr(name: str, rtype: int, rdata: bytes) -> bytes:
    return enc(name) + struct.pack("!HHIH", rtype, 1, 120, len(rdata)) + rdata


def packet(records: list[bytes]) -> bytes:
    return struct.pack("!HHHHHH", 0, 0x8400, 0, len(records), 0, 0) + b"".join(records)


def discovery_packet(*, second_addr: bool = False, ipv6: bool = False) -> bytes:
    rows = [
        rr(peer.SERVICE_TYPE, 12, enc(INSTANCE)),
        rr(INSTANCE, 33, struct.pack("!HHH", 0, 0, 37123) + enc(HOST)),
    ]
    if ipv6:
        rows.append(rr(HOST, 28, socket.inet_pton(socket.AF_INET6, "2001:db8::10")))
    else:
        rows.append(rr(HOST, 1, socket.inet_aton("192.0.2.10")))
        if second_addr:
            rows.append(rr(HOST, 1, socket.inet_aton("192.0.2.11")))
    return packet(rows)


def proto_field(payload: bytes) -> bytes:
    length = len(payload)
    assert length < 128
    return bytes([0x0A, length]) + payload


def expect_reason(fn, reason: str) -> None:
    try:
        fn()
    except peer.PeerError as exc:
        assert exc.reason == reason, (exc.reason, reason)
        return
    raise AssertionError("expected PeerError " + reason)


TESTS = []


def case(fn):
    TESTS.append(fn)
    return fn


@case
def constants_and_query_are_fixed():
    query = peer.build_query()
    assert peer.TARGET_MODEL == "SM-G998N"
    assert peer.SERVICE_TYPE == "_adb-tls-connect._tcp.local"
    assert peer.ADB == "/data/data/com.termux/files/usr/bin/adb"
    assert enc(peer.SERVICE_TYPE) in query
    assert query[:2] == b"\x00\x00"


@case
def dns_ptr_srv_a_resolves_one_endpoint():
    rows = peer.candidates_from_packets([discovery_packet()])
    assert rows == [{"instance": INSTANCE, "endpoint": ENDPOINT}]


@case
def dns_aaaa_is_bounded_and_bracketed():
    rows = peer.candidates_from_packets([discovery_packet(ipv6=True)])
    assert rows == [{"instance": INSTANCE, "endpoint": "[2001:db8::10]:37123"}]


@case
def dns_truncation_fails_closed():
    expect_reason(lambda: peer.parse_dns(discovery_packet()[:-2]), "DNS_RDATA_TRUNCATED")


@case
def dns_compression_loop_fails_closed():
    expect_reason(lambda: peer._read_name(b"\xc0\x00", 0), "DNS_POINTER_INVALID")


@case
def dns_record_limit_fails_closed():
    raw = struct.pack("!HHHHHH", 0, 0, 0, peer.MAX_RECORDS + 1, 0, 0)
    expect_reason(lambda: peer.parse_dns(raw), "DNS_RECORD_LIMIT")


@case
def protobuf_known_host_strings_are_bounded():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "hosts.pb"
        path.write_bytes(proto_field(TOKEN.encode()))
        assert TOKEN in peer.known_hosts(path)


@case
def protobuf_field_limit_fails_closed():
    raw = b"\x08\x00" * (peer.MAX_PROTO_FIELDS + 1)
    expect_reason(lambda: peer._proto_strings(raw), "PROTO_FIELD_LIMIT")


@case
def pin_digest_is_domain_separated_and_normalized():
    assert peer.pin_digest(INSTANCE.upper() + ".") == peer.pin_digest(INSTANCE)
    ordinary = __import__("hashlib").sha256(peer.norm_name(INSTANCE).encode()).hexdigest()
    assert peer.pin_digest(INSTANCE) != ordinary


@case
def pin_write_read_is_private_and_opaque():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "state" / "m-to-s.v1"
        peer._write_pin(INSTANCE, path)
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        text = path.read_text()
        assert TOKEN not in text
        assert ENDPOINT not in text
        loaded = peer._read_pin(path)
        assert loaded == peer._pin_payload(INSTANCE)


@case
def pin_wrong_mode_fails_closed():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "m-to-s.v1"
        peer._write_pin(INSTANCE, path)
        os.chmod(path, 0o644)
        expect_reason(lambda: peer._read_pin(path), "PIN_FILE_INVALID")


@case
def exact_pin_and_known_host_select_one_candidate():
    row = {"instance": INSTANCE, "endpoint": ENDPOINT}
    assert peer.select_candidate(peer._pin_payload(INSTANCE), {TOKEN}, [row]) == row


@case
def pin_mismatch_fails_closed():
    row = {"instance": INSTANCE, "endpoint": ENDPOINT}
    pin = peer._pin_payload("other._adb-tls-connect._tcp.local")
    expect_reason(lambda: peer.select_candidate(pin, {TOKEN}, [row]), "CANDIDATE_NOT_EXACT")


@case
def known_host_mismatch_fails_closed():
    row = {"instance": INSTANCE, "endpoint": ENDPOINT}
    expect_reason(lambda: peer.select_candidate(peer._pin_payload(INSTANCE), {"other"}, [row]), "CANDIDATE_NOT_EXACT")


@case
def endpoint_ambiguity_fails_closed():
    rows = peer.candidates_from_packets([discovery_packet(second_addr=True)])
    assert rows == []
    expect_reason(lambda: peer.select_candidate(peer._pin_payload(INSTANCE), {TOKEN}, rows), "CANDIDATE_NOT_EXACT")


@case
def bootstrap_correlates_one_connected_exact_s_and_withholds_identifiers():
    calls = []
    pinned = []
    def runner(argv, timeout=10):
        calls.append(list(argv))
        if argv == [peer.ADB, "devices"]:
            return "List of devices attached\n" + ENDPOINT + "\tdevice\n"
        if argv == [peer.ADB, "-s", ENDPOINT, "shell", "getprop", "ro.product.model"]:
            return peer.TARGET_MODEL + "\n"
        raise AssertionError(argv)
    result = peer.bootstrap(
        discoverer=lambda: [{"instance": INSTANCE, "endpoint": ENDPOINT}],
        host_reader=lambda: {TOKEN},
        runner=runner,
        pin_writer=pinned.append,
    )
    assert pinned == [INSTANCE]
    rendered = json.dumps(result, sort_keys=True)
    assert result["status"] == "PINNED"
    assert TOKEN not in rendered and ENDPOINT not in rendered
    assert calls[-1] == [peer.ADB, "-s", ENDPOINT, "shell", "getprop", "ro.product.model"]


@case
def reconnect_uses_only_fixed_connect_and_model_argv():
    calls = []
    def runner(argv, timeout=10):
        calls.append(list(argv))
        if argv == [peer.ADB, "connect", ENDPOINT]:
            return "connected\n"
        if argv == [peer.ADB, "-s", ENDPOINT, "shell", "getprop", "ro.product.model"]:
            return peer.TARGET_MODEL + "\n"
        raise AssertionError(argv)
    result = peer.reconnect(
        discoverer=lambda: [{"instance": INSTANCE, "endpoint": ENDPOINT}],
        host_reader=lambda: {TOKEN},
        pin_reader=lambda: peer._pin_payload(INSTANCE),
        runner=runner,
    )
    assert result["status"] == "CONNECTED"
    assert calls == [
        [peer.ADB, "connect", ENDPOINT],
        [peer.ADB, "-s", ENDPOINT, "shell", "getprop", "ro.product.model"],
    ]


@case
def cli_and_source_expose_no_generic_effect_surface():
    source = (ROOT / "mcl_adb_peer_control.py").read_text()
    for forbidden in (
        "kill-server", "start-server", "tcpip", " pair ", ":5555",
        "android.provider.settings", "pm install", "pm uninstall",
    ):
        assert forbidden not in source.lower(), forbidden
    assert source.count('"shell"') == 1
    assert '"inspect", "bootstrap", "reconnect"' in source
    capture = io.StringIO()
    with contextlib.redirect_stdout(capture):
        code = peer.main(["tool", "reconnect", ENDPOINT])
    assert code == 2
    result = json.loads(capture.getvalue())
    assert result["status"] == "BLOCKED"
    assert result["reasonCodes"] == ["OPERATION_INVALID"]
    assert all(value is False for value in result["authority"].values())


def main() -> int:
    assert len(TESTS) == 18, len(TESTS)
    passed = 0
    for fn in TESTS:
        fn()
        passed += 1
        print("PASS", fn.__name__)
    print(f"{passed}/{len(TESTS)} PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
