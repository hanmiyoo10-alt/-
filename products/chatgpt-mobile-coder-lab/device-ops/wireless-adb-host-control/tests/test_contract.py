#!/usr/bin/env python3
from __future__ import annotations

import base64
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
import mcl_wireless_adb_host_control as host

INSTANCE = "adb-device123-newgen._adb-tls-connect._tcp.local"
TOKEN = "adb-device123-newgen"
OLD_INSTANCE = "adb-device123-oldgen._adb-tls-connect._tcp.local"
OLD_TOKEN = "adb-device123-oldgen"
OTHER_INSTANCE = "adb-other999-newgen._adb-tls-connect._tcp.local"
OTHER_TOKEN = "adb-other999-newgen"
HOST = "peer-host.local"
ENDPOINT = "192.0.2.10:37123"


def enc(name: str) -> bytes:
    labels = name.rstrip(".").split(".")
    out = bytearray()
    for label in labels:
        raw = label.encode("ascii")
        out.append(len(raw))
        out.extend(raw)
    out.append(0)
    return bytes(out)


def rr(name: str, rtype: int, rdata: bytes) -> bytes:
    return enc(name) + struct.pack("!HHIH", rtype, 1, 120, len(rdata)) + rdata


def packet(records: list[bytes]) -> bytes:
    return struct.pack("!HHHHHH", 0, 0x8400, 0, len(records), 0, 0) + b"".join(records)


def discovery_packet(*, second_addr: bool = False, ipv6: bool = False) -> bytes:
    rows = [
        rr(host.SERVICE_TYPE, 12, enc(INSTANCE)),
        rr(INSTANCE, 33, struct.pack("!HHH", 0, 0, 37123) + enc(HOST)),
    ]
    if ipv6:
        rows.append(rr(HOST, 28, socket.inet_pton(socket.AF_INET6, "2001:db8::10")))
    else:
        rows.append(rr(HOST, 1, socket.inet_aton("192.0.2.10")))
        if second_addr:
            rows.append(rr(HOST, 1, socket.inet_aton("192.0.2.11")))
    return packet(rows)


def proto_string(value: str) -> bytes:
    raw = value.encode()
    assert len(raw) < 128
    return bytes([0x0A, len(raw)]) + raw


def expect_reason(fn, reason: str) -> None:
    try:
        fn()
    except host.HostControlError as exc:
        assert exc.reason == reason, (exc.reason, reason)
        return
    raise AssertionError("expected " + reason)


TESTS = []


def case(fn):
    TESTS.append(fn)
    return fn


@case
def fixed_profiles_and_service():
    assert host.SERVICE_TYPE == "_adb-tls-connect._tcp.local"
    assert host.PROFILES["M"]["model"] == "SM-S938N"
    assert host.PROFILES["S"]["model"] == "SM-G998N"
    expect_reason(lambda: host.profile("X"), "PROFILE_INVALID")


@case
def dns_ptr_srv_a_resolves_exact_endpoint():
    rows = host.candidates_from_packets([discovery_packet()])
    assert rows == [{"instance": INSTANCE, "endpoint": ENDPOINT}]


@case
def dns_aaaa_is_bracketed():
    rows = host.candidates_from_packets([discovery_packet(ipv6=True)])
    assert rows == [{"instance": INSTANCE, "endpoint": "[2001:db8::10]:37123"}]


@case
def dns_dual_stack_prefers_exact_single_ipv4():
    rows = [
        rr(host.SERVICE_TYPE, 12, enc(INSTANCE)),
        rr(INSTANCE, 33, struct.pack("!HHH", 0, 0, 37123) + enc(HOST)),
        rr(HOST, 1, socket.inet_aton("192.0.2.10")),
        rr(HOST, 28, socket.inet_pton(socket.AF_INET6, "2001:db8::10")),
    ]
    assert host.candidates_from_packets([packet(rows)]) == [{"instance": INSTANCE, "endpoint": ENDPOINT}]


@case
def dns_ambiguity_drops_candidate():
    assert host.candidates_from_packets([discovery_packet(second_addr=True)]) == []


@case
def dns_compression_loop_fails_closed():
    expect_reason(lambda: host._read_name(b"\xc0\x00", 0), "DNS_POINTER_INVALID")


@case
def discovery_packet_limit_fails_closed():
    expect_reason(
        lambda: host.candidates_from_packets([discovery_packet()] * (host.MAX_PACKETS + 1)),
        "DISCOVERY_PACKET_LIMIT",
    )


@case
def known_host_proto_extracts_token():
    assert TOKEN in host.known_hosts_from_bytes(proto_string(TOKEN))


@case
def known_host_size_fails_closed():
    expect_reason(lambda: host.known_hosts_from_bytes(b""), "KNOWN_HOSTS_SIZE")


@case
def pin_digest_is_profile_domain_separated():
    assert host.pin_digest("M", INSTANCE) != host.pin_digest("S", INSTANCE)


@case
def target_identity_digest_survives_generation_change():
    assert host.target_identity_digest("M", INSTANCE) == host.target_identity_digest("M", OLD_INSTANCE)
    assert host.target_identity_digest("M", INSTANCE) != host.target_identity_digest("S", INSTANCE)


@case
def v1_pin_remains_read_compatible():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "pin"
        path.write_text(json.dumps(host._pin_payload_v1("M", INSTANCE)) + "\n")
        os.chmod(path, 0o600)
        assert host._read_pin("M", path)["schemaVersion"] == 1


@case
def pin_write_read_is_private_and_opaque():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "state" / "pin"
        host._write_pin("M", INSTANCE, path)
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        text = path.read_text()
        assert TOKEN not in text and ENDPOINT not in text
        loaded = host._read_pin("M", path)
        assert loaded == host._pin_payload("M", INSTANCE)


@case
def pin_wrong_mode_fails_closed():
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "pin"
        host._write_pin("S", INSTANCE, path)
        os.chmod(path, 0o644)
        expect_reason(lambda: host._read_pin("S", path), "PIN_FILE_INVALID")


def transport_fixture(profile_name: str, *, connected: bool = True, connect_model: str | None = None):
    model = host.PROFILES[profile_name]["model"]
    calls = []
    def transport(mode: str, profile: str, endpoint: str | None = None):
        assert profile == profile_name
        calls.append((mode, profile, endpoint))
        if mode == "mdns":
            return {"ok": True, "packets": [base64.b64encode(discovery_packet()).decode()]}
        if mode == "known-hosts":
            return {"ok": True, "data": base64.b64encode(proto_string(TOKEN)).decode()}
        if mode == "connected":
            return {"ok": True, "rows": [{"serial": ENDPOINT, "model": model}]} if connected else {"ok": True, "rows": []}
        if mode == "connect":
            assert endpoint == ENDPOINT
            return {"ok": True, "model": connect_model or model}
        raise AssertionError(mode)
    return transport, calls


@case
def bootstrap_m_correlates_connected_exact_target():
    transport, calls = transport_fixture("M")
    pinned = []
    result = host.bootstrap("M", transport=transport, pin_writer=lambda p, i: pinned.append((p, i)))
    assert result["status"] == "PINNED"
    assert pinned == [("M", INSTANCE)]
    assert [x[0] for x in calls] == ["mdns", "known-hosts", "connected"]


@case
def bootstrap_s_correlates_connected_exact_target():
    transport, _calls = transport_fixture("S")
    pinned = []
    result = host.bootstrap("S", transport=transport, pin_writer=lambda p, i: pinned.append((p, i)))
    assert result["status"] == "PINNED"
    assert pinned == [("S", INSTANCE)]


@case
def bootstrap_requires_connected_target():
    transport, _calls = transport_fixture("M", connected=False)
    expect_reason(
        lambda: host.bootstrap("M", transport=transport, pin_writer=lambda _p, _i: None),
        "BOOTSTRAP_CORRELATION_NOT_EXACT",
    )


@case
def rebind_stale_trusted_service_instance_to_fresh_candidate():
    old_serial = OLD_INSTANCE.removesuffix(".local")
    calls = []
    pinned = []
    model = host.PROFILES["M"]["model"]
    def transport(mode: str, profile: str, endpoint: str | None = None):
        assert profile == "M"
        calls.append((mode, profile, endpoint))
        if mode == "mdns":
            return {"ok": True, "packets": [base64.b64encode(discovery_packet()).decode()]}
        if mode == "known-hosts":
            raw = proto_string(TOKEN) + proto_string(OLD_TOKEN)
            return {"ok": True, "data": base64.b64encode(raw).decode()}
        if mode == "connected":
            return {"ok": True, "rows": [{"serial": old_serial, "model": model}]}
        if mode == "connect":
            assert endpoint == ENDPOINT
            return {"ok": True, "model": model}
        raise AssertionError(mode)
    result = host.rebind("M", transport=transport, pin_writer=lambda p, i: pinned.append((p, i)))
    assert result["status"] == "PINNED"
    assert result["operation"] == "rebind"
    assert pinned == [("M", INSTANCE)]
    assert [x[0] for x in calls] == ["mdns", "known-hosts", "connected", "connect"]


@case
def rebind_wrong_target_identity_blocks_before_connect():
    old_serial = OLD_INSTANCE.removesuffix(".local")
    calls = []
    pinned = []
    model = host.PROFILES["M"]["model"]
    def transport(mode: str, profile: str, endpoint: str | None = None):
        calls.append((mode, profile, endpoint))
        if mode == "mdns":
            rows = [
                rr(host.SERVICE_TYPE, 12, enc(OTHER_INSTANCE)),
                rr(OTHER_INSTANCE, 33, struct.pack("!HHH", 0, 0, 37123) + enc(HOST)),
                rr(HOST, 1, socket.inet_aton("192.0.2.10")),
            ]
            return {"ok": True, "packets": [base64.b64encode(packet(rows)).decode()]}
        if mode == "known-hosts":
            return {"ok": True, "data": base64.b64encode(proto_string(OLD_TOKEN) + proto_string(OTHER_TOKEN)).decode()}
        if mode == "connected":
            return {"ok": True, "rows": [{"serial": old_serial, "model": model}]}
        if mode == "connect":
            raise AssertionError("connect must not run")
        raise AssertionError(mode)
    expect_reason(
        lambda: host.rebind("M", transport=transport, pin_writer=lambda p, i: pinned.append((p, i))),
        "REBIND_TARGET_IDENTITY_MISMATCH",
    )
    assert pinned == []
    assert [x[0] for x in calls] == ["mdns", "known-hosts", "connected"]


@case
def bootstrap_connected_writes_v2_pin_without_mdns_or_connect():
    service_serial = OLD_INSTANCE.removesuffix(".local")
    model = host.PROFILES["M"]["model"]
    calls = []
    pinned = []
    def transport(mode: str, profile: str, endpoint: str | None = None):
        calls.append((mode, profile, endpoint))
        if mode == "known-hosts":
            return {"ok": True, "data": base64.b64encode(proto_string(OLD_TOKEN)).decode()}
        if mode == "connected":
            return {"ok": True, "rows": [{"serial": service_serial, "model": model}]}
        raise AssertionError(mode)
    result = host.bootstrap_connected("M", transport=transport, pin_writer=lambda p, i: pinned.append((p, i)))
    assert result["status"] == "PINNED"
    assert result["operation"] == "bootstrap-connected"
    assert pinned == [("M", OLD_INSTANCE)]
    assert [x[0] for x in calls] == ["known-hosts", "connected"]


@case
def bootstrap_connected_filters_endpoint_rows_and_requires_one_service_row():
    model = host.PROFILES["S"]["model"]
    service_serial = OLD_INSTANCE.removesuffix(".local")
    def transport(mode: str, profile: str, endpoint: str | None = None):
        if mode == "known-hosts":
            return {"ok": True, "data": base64.b64encode(proto_string(OLD_TOKEN)).decode()}
        if mode == "connected":
            return {"ok": True, "rows": [
                {"serial": ENDPOINT, "model": model},
                {"serial": service_serial, "model": model},
            ]}
        raise AssertionError(mode)
    pinned = []
    result = host.bootstrap_connected("S", transport=transport, pin_writer=lambda p, i: pinned.append((p, i)))
    assert result["status"] == "PINNED"
    assert pinned == [("S", OLD_INSTANCE)]


@case
def bootstrap_connected_zero_service_rows_fails_closed():
    transport, _calls = transport_fixture("M")
    expect_reason(
        lambda: host.bootstrap_connected("M", transport=transport, pin_writer=lambda _p, _i: None),
        "CONNECTED_BOOTSTRAP_NOT_EXACT",
    )


@case
def rebind_requires_distinct_service_generations():
    serial = INSTANCE.removesuffix(".local")
    model = host.PROFILES["M"]["model"]
    def transport(mode: str, profile: str, endpoint: str | None = None):
        if mode == "mdns": return {"ok": True, "packets": [base64.b64encode(discovery_packet()).decode()]}
        if mode == "known-hosts": return {"ok": True, "data": base64.b64encode(proto_string(TOKEN)).decode()}
        if mode == "connected": return {"ok": True, "rows": [{"serial": serial, "model": model}]}
        raise AssertionError(mode)
    expect_reason(lambda: host.rebind("M", transport=transport, pin_writer=lambda _p, _i: None), "REBIND_NOT_REQUIRED")


@case
def rebind_rejects_non_service_connected_transport():
    transport, _calls = transport_fixture("M")
    expect_reason(lambda: host.rebind("M", transport=transport, pin_writer=lambda _p, _i: None), "CONNECTED_SERVICE_INSTANCE_INVALID")


@case
def rebind_requires_both_service_tokens_trusted():
    old_serial = OLD_INSTANCE.removesuffix(".local")
    model = host.PROFILES["M"]["model"]
    def transport(mode: str, profile: str, endpoint: str | None = None):
        if mode == "mdns": return {"ok": True, "packets": [base64.b64encode(discovery_packet()).decode()]}
        if mode == "known-hosts": return {"ok": True, "data": base64.b64encode(proto_string(TOKEN)).decode()}
        if mode == "connected": return {"ok": True, "rows": [{"serial": old_serial, "model": model}]}
        raise AssertionError(mode)
    expect_reason(lambda: host.rebind("M", transport=transport, pin_writer=lambda _p, _i: None), "REBIND_TRUST_NOT_EXACT")


@case
def rebind_model_mismatch_writes_no_pin():
    old_serial = OLD_INSTANCE.removesuffix(".local")
    model = host.PROFILES["M"]["model"]
    pinned = []
    def transport(mode: str, profile: str, endpoint: str | None = None):
        if mode == "mdns": return {"ok": True, "packets": [base64.b64encode(discovery_packet()).decode()]}
        if mode == "known-hosts": return {"ok": True, "data": base64.b64encode(proto_string(TOKEN) + proto_string(OLD_TOKEN)).decode()}
        if mode == "connected": return {"ok": True, "rows": [{"serial": old_serial, "model": model}]}
        if mode == "connect": return {"ok": True, "model": "WRONG"}
        raise AssertionError(mode)
    expect_reason(lambda: host.rebind("M", transport=transport, pin_writer=lambda p, i: pinned.append((p, i))), "TARGET_MODEL_MISMATCH")
    assert pinned == []


@case
def v2_pin_matches_fresh_generation_candidate():
    transport, _calls = transport_fixture("M")
    result = host.inspect("M", transport=transport, pin_reader=lambda p: host._pin_payload(p, OLD_INSTANCE))
    assert result["status"] == "READY"


@case
def inspect_requires_exact_pin_known_host_candidate():
    transport, _calls = transport_fixture("M")
    result = host.inspect("M", transport=transport, pin_reader=lambda p: host._pin_payload(p, INSTANCE))
    assert result["status"] == "READY"
    assert result["identifiers"] == "withheld"


@case
def reconnect_uses_one_internal_connect_and_model_verification():
    transport, calls = transport_fixture("S")
    result = host.reconnect("S", transport=transport, pin_reader=lambda p: host._pin_payload(p, INSTANCE))
    assert result["status"] == "CONNECTED"
    connect_calls = [x for x in calls if x[0] == "connect"]
    assert connect_calls == [("connect", "S", ENDPOINT)]
    assert calls[-1][0] == "connected"


@case
def reconnect_model_mismatch_fails_closed():
    transport, _calls = transport_fixture("M", connect_model="WRONG")
    expect_reason(
        lambda: host.reconnect("M", transport=transport, pin_reader=lambda p: host._pin_payload(p, INSTANCE)),
        "TARGET_MODEL_MISMATCH",
    )


@case
def cli_rejects_endpoint_selector_and_receipt_withholds_identifiers():
    capture = io.StringIO()
    with contextlib.redirect_stdout(capture):
        code = host.main(["tool", "reconnect", "M", ENDPOINT])
    assert code == 2
    result = json.loads(capture.getvalue())
    assert result["status"] == "BLOCKED"
    assert result["identifiers"] == "withheld"
    rendered = json.dumps(result)
    assert TOKEN not in rendered and ENDPOINT not in rendered
    assert all(value is False for value in result["authority"].values())


@case
def powershell_surface_excludes_broad_adb_controls():
    text = (ROOT / "windows-mdns-adb.ps1").read_text().lower()
    for forbidden in ("adb pair", "kill-server", "start-server", " tcpip ", "pm install", "pm uninstall"):
        assert forbidden not in text, forbidden
    assert "_adb-tls-connect._tcp.local." in text


def main() -> int:
    assert len(TESTS) == 32, len(TESTS)
    for fn in TESTS:
        fn()
        print("PASS", fn.__name__)
    print(f"{len(TESTS)}/{len(TESTS)} PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
