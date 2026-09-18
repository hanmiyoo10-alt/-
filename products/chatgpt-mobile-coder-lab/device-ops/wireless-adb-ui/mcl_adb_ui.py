#!/usr/bin/env python3
import argparse
import hashlib
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

EXPECTED_MODEL = "SM-G998N"
TARGET_PACKAGE = "com.openai.chatgpt"
REMOTE_XML = "/data/local/tmp/mcl-adb-ui-v1.xml"
MAX_XML_BYTES = 1_000_000
MAX_NODES = 1200
MAX_LABEL_CHARS = 80
DETAILS = "withheld"
SENSITIVE_TOKENS = (
    "password", "passcode", "verification code", "one-time", "otp",
    "email", "e-mail", "account", "username", "phone number",
    "sign in", "sign up", "log in", "login",
    "비밀번호", "인증번호", "이메일", "계정", "전화번호", "로그인",
)

class BoundedError(Exception):
    pass

class SubprocessRunner:
    def __init__(self, binary="adb"):
        self.binary = binary

    def run(self, args, timeout=12, max_output=65536):
        try:
            result = subprocess.run(
                [self.binary, *args],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=timeout,
            )
        except (OSError, subprocess.TimeoutExpired):
            return 127, b""
        if len(result.stdout) > max_output:
            return 125, b""
        return result.returncode, result.stdout

def _decode(value):
    return value.decode("utf-8", errors="replace").strip()

def _normalize(value):
    return re.sub(r"\s+", " ", value or "").strip()

def _bounded_label(value):
    value = _normalize(value)
    if not value or len(value) > MAX_LABEL_CHARS or "\x00" in value:
        return None
    return value

def _sensitive(attrs):
    if attrs.get("password", "").lower() == "true":
        return True
    haystack = " ".join(
        attrs.get(key, "") for key in ("text", "content-desc", "resource-id")
    ).lower()
    return any(token in haystack for token in SENSITIVE_TOKENS)

def _semantic_nodes(raw_xml):
    if not raw_xml or len(raw_xml) > MAX_XML_BYTES:
        raise BoundedError("xml_size")
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError as exc:
        raise BoundedError("xml_parse") from exc
    result = []
    visited = 0
    target_present = False
    for element in root.iter("node"):
        visited += 1
        if visited > MAX_NODES:
            raise BoundedError("node_limit")
        attrs = element.attrib
        if attrs.get("package") != TARGET_PACKAGE:
            continue
        target_present = True
        if _sensitive(attrs):
            continue
        editable = (
            attrs.get("class", "").endswith("EditText")
            or attrs.get("editable", "").lower() == "true"
        )
        actionable = attrs.get("clickable", "").lower() == "true"
        label = _bounded_label(attrs.get("content-desc")) or _bounded_label(attrs.get("text"))
        result.append({
            "actionable": actionable,
            "editable": editable,
            "label": label,
        })
    return target_present, result

def _snapshot_id(raw_xml):
    return "s-" + hashlib.sha256(raw_xml).hexdigest()[:16]

def _handle(snapshot, index, role):
    material = f"{snapshot}:{index}:{role}".encode("utf-8")
    return "h-" + hashlib.sha256(material).hexdigest()[:16]

def analyze(raw_xml):
    target_present, nodes = _semantic_nodes(raw_xml)
    snapshot = _snapshot_id(raw_xml)
    return {
        "snapshot": snapshot,
        "target_present": target_present,
        "nodes": nodes,
        "node_count": len(nodes),
        "actionable_count": sum(1 for node in nodes if node["actionable"]),
        "editable_count": sum(1 for node in nodes if node["editable"]),
    }

def find_action(analysis, label):
    label = _bounded_label(label)
    if label is None or any(token in label.lower() for token in SENSITIVE_TOKENS):
        return "blocked", "unknown", "none"
    matches = [
        index for index, node in enumerate(analysis["nodes"])
        if node["actionable"] and node["label"] == label
    ]
    if not matches:
        return "not_found", "0", "none"
    if len(matches) != 1:
        return "ambiguous", "many", "none"
    return "found", "1", _handle(analysis["snapshot"], matches[0], "action")

def find_editable(analysis):
    matches = [
        index for index, node in enumerate(analysis["nodes"])
        if node["editable"]
    ]
    if not matches:
        return "not_found", "0", "none"
    if len(matches) != 1:
        return "ambiguous", "many", "none"
    return "found", "1", _handle(analysis["snapshot"], matches[0], "editable")

class AdbClient:
    def __init__(self, runner=None):
        self.runner = runner or SubprocessRunner()

    def resolve(self):
        code, output = self.runner.run(["devices"])
        if code != 0:
            return {"connection": "unknown", "model": "unknown", "serial": None}
        serials = []
        for line in _decode(output).splitlines()[1:]:
            fields = line.split()
            if len(fields) >= 2 and fields[1] == "device":
                serials.append(fields[0])
        if not serials:
            return {"connection": "offline", "model": "unknown", "serial": None}
        if len(serials) != 1:
            return {"connection": "ambiguous", "model": "unknown", "serial": None}
        serial = serials[0]
        code, output = self.runner.run(
            ["-s", serial, "shell", "getprop", "ro.product.model"]
        )
        if code != 0:
            return {"connection": "connected", "model": "unknown", "serial": None}
        model = _decode(output)
        if model != EXPECTED_MODEL:
            return {"connection": "connected", "model": "mismatch", "serial": None}
        return {"connection": "connected", "model": "match", "serial": serial}

    def capture(self, serial):
        raw = None
        dump_ok = False
        code, _ = self.runner.run(
            ["-s", serial, "shell", "uiautomator", "dump", REMOTE_XML],
            timeout=18,
        )
        if code == 0:
            dump_ok = True
            code, output = self.runner.run(
                ["-s", serial, "exec-out", "cat", REMOTE_XML],
                timeout=12,
                max_output=MAX_XML_BYTES,
            )
            if code == 0 and output:
                raw = output
        code, _ = self.runner.run(
            ["-s", serial, "shell", "rm", "-f", REMOTE_XML],
            timeout=8,
        )
        cleanup = "pass" if code == 0 else "fail"
        return raw if dump_ok else None, cleanup

def _print(lines):
    sys.stdout.write("\n".join(lines) + "\n")

def status_receipt(client):
    target = client.resolve()
    result = "pass" if target["connection"] == "connected" and target["model"] == "match" else "blocked"
    return [
        "schema=mcl-wireless-adb-ui-status.v1",
        "target=s",
        "transport=wireless_adb",
        f"connection={target['connection']}",
        f"model={target['model']}",
        f"result={result}",
        f"details={DETAILS}",
    ]

def snapshot_receipt(client):
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return [
            "schema=mcl-wireless-adb-ui.v1", "target=s", "transport=wireless_adb",
            f"connection={target['connection']}", f"model={target['model']}",
            "target_package=unknown", "snapshot=none", "node_count=unknown",
            "actionable_count=unknown", "editable_count=unknown",
            "cleanup=unknown", f"details={DETAILS}",
        ]
    raw, cleanup = client.capture(target["serial"])
    if raw is None:
        return [
            "schema=mcl-wireless-adb-ui.v1", "target=s", "transport=wireless_adb",
            "connection=connected", "model=match", "target_package=unknown",
            "snapshot=none", "node_count=unknown", "actionable_count=unknown",
            "editable_count=unknown", f"cleanup={cleanup}", f"details={DETAILS}",
        ]
    try:
        analysis = analyze(raw)
    except BoundedError:
        return [
            "schema=mcl-wireless-adb-ui.v1", "target=s", "transport=wireless_adb",
            "connection=connected", "model=match", "target_package=unknown",
            "snapshot=none", "node_count=unknown", "actionable_count=unknown",
            "editable_count=unknown", f"cleanup={cleanup}", f"details={DETAILS}",
        ]
    present = "present" if analysis["target_present"] else "absent"
    return [
        "schema=mcl-wireless-adb-ui.v1", "target=s", "transport=wireless_adb",
        "connection=connected", "model=match", f"target_package={present}",
        f"snapshot={analysis['snapshot']}", f"node_count={analysis['node_count']}",
        f"actionable_count={analysis['actionable_count']}",
        f"editable_count={analysis['editable_count']}", f"cleanup={cleanup}",
        f"details={DETAILS}",
    ]

def find_receipt(client, role, label=None):
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return [
            "schema=mcl-wireless-adb-ui-find.v1", "snapshot=none",
            f"query_kind={'exact_label' if role == 'action' else 'unique_editable'}",
            f"role={role}", "match_count=unknown", "handle=none",
            "result=blocked", "cleanup=unknown", f"details={DETAILS}",
        ]
    raw, cleanup = client.capture(target["serial"])
    if raw is None:
        result, count, handle, snapshot = "unknown", "unknown", "none", "none"
    else:
        try:
            analysis = analyze(raw)
            snapshot = analysis["snapshot"]
            if role == "action":
                result, count, handle = find_action(analysis, label)
            else:
                result, count, handle = find_editable(analysis)
        except BoundedError:
            result, count, handle, snapshot = "unknown", "unknown", "none", "none"
    return [
        "schema=mcl-wireless-adb-ui-find.v1", f"snapshot={snapshot}",
        f"query_kind={'exact_label' if role == 'action' else 'unique_editable'}",
        f"role={role}", f"match_count={count}", f"handle={handle}",
        f"result={result}", f"cleanup={cleanup}", f"details={DETAILS}",
    ]

def parser():
    root = argparse.ArgumentParser(prog="mcl-adb-ui")
    sub = root.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    sub.add_parser("snapshot")
    find = sub.add_parser("find-action")
    find.add_argument("--label", required=True)
    sub.add_parser("find-editable")
    return root

def main(argv=None):
    args = parser().parse_args(argv)
    client = AdbClient()
    if args.command == "status":
        lines = status_receipt(client)
    elif args.command == "snapshot":
        lines = snapshot_receipt(client)
    elif args.command == "find-action":
        lines = find_receipt(client, "action", args.label)
    else:
        lines = find_receipt(client, "editable")
    _print(lines)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
