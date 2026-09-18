#!/usr/bin/env python3
import argparse
import hashlib
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

EXPECTED_MODEL = "SM-G998N"
TARGET_PACKAGE = "com.openai.chatgpt"
REMOTE_XML = "/data/local/tmp/mcl-adb-ui-v1.xml"
MAX_XML_BYTES = 1_000_000
MAX_NODES = 1200
MAX_LABEL_CHARS = 80
MAX_TEXT_CHARS = 160
MAX_RESOURCE_ID_CHARS = 160
MAX_RESOURCE_LOCAL_CHARS = 80
MAX_COORDINATE = 10000
MAX_SEMANTIC_LIFT_DEPTH = 2
WAIT_ATTEMPTS = 8
WAIT_INTERVAL_SECONDS = 0.75
DETAILS = "withheld"
OPAQUE_SNAPSHOT_RE = re.compile(r"^s-[0-9a-f]{16}$")
OPAQUE_HANDLE_RE = re.compile(r"^h-[0-9a-f]{16}$")
BOUNDS_RE = re.compile(r"^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$")
ASCII_TEXT_RE = re.compile(r"^[A-Za-z0-9_ ]{1,160}$")
COMPONENT_LINE_RE = re.compile(r"^[A-Za-z0-9._]+/[A-Za-z0-9_.$]+$")
TARGET_COMPONENT_RE = re.compile(r"^com\.openai\.chatgpt/[A-Za-z0-9_.$]+$")
TARGET_RESOURCE_ID_RE = re.compile(
    r"^com\.openai\.chatgpt:id/([A-Za-z0-9_]{1,80})$"
)
MAX_RESOLVER_BYTES = 8192
NEW_CHAT_RESOURCE_IDS = frozenset({
    "new_chat",
    "new_chat_button",
    "newchat",
    "new_conversation",
    "new_conversation_button",
    "create_new_chat",
    "start_new_chat",
})
ALIASES = {
    "new_chat": ("New chat", "새 채팅", "새 대화"),
    "send": ("Send", "보내기"),
}
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

def _resource_id_local(value):
    value = value or ""
    if not value or len(value) > MAX_RESOURCE_ID_CHARS or "\x00" in value:
        return None
    match = TARGET_RESOURCE_ID_RE.fullmatch(value)
    if not match:
        return None
    local = match.group(1)
    if len(local) > MAX_RESOURCE_LOCAL_CHARS:
        return None
    return local

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

    def visit(element, parent_index=None):
        nonlocal visited, target_present
        current_index = None
        if element.tag == "node":
            visited += 1
            if visited > MAX_NODES:
                raise BoundedError("node_limit")
            attrs = element.attrib
            is_target = attrs.get("package") == TARGET_PACKAGE
            if is_target:
                target_present = True
            if is_target and not _sensitive(attrs):
                editable = (
                    attrs.get("class", "").endswith("EditText")
                    or attrs.get("editable", "").lower() == "true"
                )
                actionable = attrs.get("clickable", "").lower() == "true"
                label = (
                    _bounded_label(attrs.get("content-desc"))
                    or _bounded_label(attrs.get("text"))
                )
                current_index = len(result)
                result.append({
                    "actionable": actionable,
                    "editable": editable,
                    "label": label,
                    "text": attrs.get("text", ""),
                    "content_desc": attrs.get("content-desc", ""),
                    "focused": attrs.get("focused", "").lower() == "true",
                    "bounds": attrs.get("bounds", ""),
                    "resource_id_local": _resource_id_local(attrs.get("resource-id")),
                    "parent_index": parent_index,
                })
        for child in element:
            visit(child, current_index)

    visit(root)
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

def _valid_snapshot(value):
    return bool(OPAQUE_SNAPSHOT_RE.fullmatch(value or ""))

def _valid_handle(value):
    return bool(OPAQUE_HANDLE_RE.fullmatch(value or ""))

def parse_bounds(value):
    match = BOUNDS_RE.fullmatch(value or "")
    if not match:
        return None
    left, top, right, bottom = (int(part) for part in match.groups())
    if not (0 <= left < right <= MAX_COORDINATE):
        return None
    if not (0 <= top < bottom <= MAX_COORDINATE):
        return None
    return left, top, right, bottom

def _center(bounds):
    left, top, right, bottom = bounds
    return (left + right) // 2, (top + bottom) // 2

def _cleanup_join(*values):
    if any(value == "fail" for value in values):
        return "fail"
    if values and all(value == "pass" for value in values):
        return "pass"
    return "unknown"

def _handle_matches(analysis, handle, role):
    matches = []
    for index, node in enumerate(analysis["nodes"]):
        eligible = node["actionable"] if role == "action" else node["editable"]
        if eligible and _handle(analysis["snapshot"], index, role) == handle:
            matches.append((index, node))
    return matches

def _match_count(value):
    if value == 0:
        return "0"
    if value == 1:
        return "1"
    return "many"

def _nearest_actionable_target(analysis, source_index):
    nodes = analysis["nodes"]
    node = nodes[source_index]
    if node["actionable"]:
        return source_index
    current = source_index
    for _ in range(MAX_SEMANTIC_LIFT_DEPTH):
        parent_index = nodes[current].get("parent_index")
        if parent_index is None:
            return None
        parent = nodes[parent_index]
        if parent["actionable"]:
            return parent_index
        current = parent_index
    return None

def _new_chat_match_indices(analysis):
    labels = set(ALIASES["new_chat"])
    label_matches = set()
    resource_matches = set()
    for index, node in enumerate(analysis["nodes"]):
        target = _nearest_actionable_target(analysis, index)
        if target is None:
            continue
        if node["label"] in labels:
            label_matches.add(target)
        if node["resource_id_local"] in NEW_CHAT_RESOURCE_IDS:
            resource_matches.add(target)
    return label_matches, resource_matches, label_matches | resource_matches

def find_alias(analysis, alias):
    labels = ALIASES.get(alias)
    if labels is None:
        return "blocked", "unknown", "none"
    if alias == "new_chat":
        _, _, combined = _new_chat_match_indices(analysis)
        matches = sorted(combined)
    else:
        matches = [
            index for index, node in enumerate(analysis["nodes"])
            if node["actionable"] and node["label"] in labels
        ]
    if not matches:
        return "not_found", "0", "none"
    if len(matches) != 1:
        return "ambiguous", "many", "none"
    return "found", "1", _handle(analysis["snapshot"], matches[0], "action")

def _valid_ascii_text(value):
    return bool(ASCII_TEXT_RE.fullmatch(value or ""))

def _exact_text_matches(analysis, value):
    return [
        node for node in analysis["nodes"]
        if node["text"] == value or node["content_desc"] == value
    ]

def _focused_editables(analysis):
    return [
        node for node in analysis["nodes"]
        if node["editable"] and node["focused"]
    ]

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

    def resolve_target_component(self, serial):
        code, output = self.runner.run([
            "-s", serial, "shell", "cmd", "package", "resolve-activity", "--brief",
            "-a", "android.intent.action.MAIN",
            "-c", "android.intent.category.LAUNCHER",
            TARGET_PACKAGE,
        ], timeout=12, max_output=MAX_RESOLVER_BYTES)
        if code != 0:
            return "unknown", None
        text = _decode(output)
        if not text:
            return "blocked", None
        component_lines = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if COMPONENT_LINE_RE.fullmatch(line):
                component_lines.append(line)
            elif "/" in line:
                return "blocked", None
        if len(component_lines) != 1:
            return "blocked", None
        component = component_lines[0]
        if not TARGET_COMPONENT_RE.fullmatch(component):
            return "blocked", None
        return "found", component

    def launch_target(self, serial, component):
        return self.runner.run([
            "-s", serial, "shell", "am", "start",
            "-a", "android.intent.action.MAIN",
            "-c", "android.intent.category.LAUNCHER",
            "-n", component,
        ], timeout=12)

    def tap(self, serial, x, y):
        return self.runner.run(
            ["-s", serial, "shell", "input", "tap", str(x), str(y)],
            timeout=8,
        )

    def type_text(self, serial, encoded):
        return self.runner.run(
            ["-s", serial, "shell", "input", "text", encoded],
            timeout=12,
        )

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

def launch_receipt(client):
    target = client.resolve()
    connection = target["connection"]
    model = target["model"]
    result = "blocked"
    if connection == "connected" and model == "match":
        resolution, component = client.resolve_target_component(target["serial"])
        if resolution == "unknown":
            result = "unknown"
        elif resolution == "found":
            code, _ = client.launch_target(target["serial"], component)
            result = "launched" if code == 0 else "unknown"
    return [
        "schema=mcl-wireless-adb-ui-launch.v1",
        "target=s",
        f"package={TARGET_PACKAGE}",
        f"connection={connection}",
        f"model={model}",
        f"result={result}",
        f"details={DETAILS}",
    ]

def find_alias_receipt(client, alias):
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return [
            "schema=mcl-wireless-adb-ui-alias.v1",
            f"alias={alias}",
            "snapshot=none",
            "match_count=unknown",
            "handle=none",
            "result=blocked",
            "cleanup=unknown",
            f"details={DETAILS}",
        ]
    raw, cleanup = client.capture(target["serial"])
    if raw is None:
        snapshot, count, handle, result = "none", "unknown", "none", "unknown"
    else:
        try:
            analysis = analyze(raw)
            snapshot = analysis["snapshot"]
            result, count, handle = find_alias(analysis, alias)
        except BoundedError:
            snapshot, count, handle, result = "none", "unknown", "none", "unknown"
    return [
        "schema=mcl-wireless-adb-ui-alias.v1",
        f"alias={alias}",
        f"snapshot={snapshot}",
        f"match_count={count}",
        f"handle={handle}",
        f"result={result}",
        f"cleanup={cleanup}",
        f"details={DETAILS}",
    ]

def probe_new_chat_receipt(client):
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return [
            "schema=mcl-wireless-adb-ui-new-chat-probe.v1",
            "snapshot=none",
            "label_match_count=unknown",
            "resource_match_count=unknown",
            "combined_match_count=unknown",
            "handle=none",
            "result=blocked",
            "cleanup=unknown",
            f"details={DETAILS}",
        ]
    raw, cleanup = client.capture(target["serial"])
    if raw is None:
        return [
            "schema=mcl-wireless-adb-ui-new-chat-probe.v1",
            "snapshot=none",
            "label_match_count=unknown",
            "resource_match_count=unknown",
            "combined_match_count=unknown",
            "handle=none",
            "result=unknown",
            f"cleanup={cleanup}",
            f"details={DETAILS}",
        ]
    try:
        analysis = analyze(raw)
    except BoundedError:
        return [
            "schema=mcl-wireless-adb-ui-new-chat-probe.v1",
            "snapshot=none",
            "label_match_count=unknown",
            "resource_match_count=unknown",
            "combined_match_count=unknown",
            "handle=none",
            "result=unknown",
            f"cleanup={cleanup}",
            f"details={DETAILS}",
        ]
    label_matches, resource_matches, combined = _new_chat_match_indices(analysis)
    handle = "none"
    if len(combined) == 0:
        result = "not_found"
    elif len(combined) == 1:
        result = "found"
        index = next(iter(combined))
        handle = _handle(analysis["snapshot"], index, "action")
    else:
        result = "ambiguous"
    return [
        "schema=mcl-wireless-adb-ui-new-chat-probe.v1",
        f"snapshot={analysis['snapshot']}",
        f"label_match_count={_match_count(len(label_matches))}",
        f"resource_match_count={_match_count(len(resource_matches))}",
        f"combined_match_count={_match_count(len(combined))}",
        f"handle={handle}",
        f"result={result}",
        f"cleanup={cleanup}",
        f"details={DETAILS}",
    ]

def _action_receipt(
    pre_snapshot="none",
    post_snapshot="none",
    freshness="unknown",
    target_match="unknown",
    injection="unknown",
    transition="unknown",
    cleanup="unknown",
    result="unknown",
):
    return [
        "schema=mcl-wireless-adb-ui-action.v1",
        "action=activate",
        f"pre_snapshot={pre_snapshot}",
        f"post_snapshot={post_snapshot}",
        f"freshness={freshness}",
        f"target_match={target_match}",
        f"injection={injection}",
        f"transition={transition}",
        f"cleanup={cleanup}",
        f"result={result}",
        f"details={DETAILS}",
    ]

def activate_receipt(client, requested_snapshot, handle):
    if not _valid_snapshot(requested_snapshot) or not _valid_handle(handle):
        return _action_receipt(result="blocked")
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return _action_receipt(result="blocked")
    raw, cleanup_pre = client.capture(target["serial"])
    if raw is None:
        return _action_receipt(cleanup=cleanup_pre, result="unknown")
    try:
        analysis = analyze(raw)
    except BoundedError:
        return _action_receipt(cleanup=cleanup_pre, result="unknown")
    current = analysis["snapshot"]
    if current != requested_snapshot:
        return _action_receipt(
            pre_snapshot=current,
            freshness="stale",
            target_match="unknown",
            cleanup=cleanup_pre,
            result="stale",
        )
    matches = _handle_matches(analysis, handle, "action")
    if not matches:
        return _action_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="none",
            cleanup=cleanup_pre,
            result="blocked",
        )
    if len(matches) != 1:
        return _action_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="ambiguous",
            cleanup=cleanup_pre,
            result="blocked",
        )
    bounds = parse_bounds(matches[0][1]["bounds"])
    if bounds is None:
        return _action_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            cleanup=cleanup_pre,
            result="blocked",
        )
    x, y = _center(bounds)
    code, _ = client.tap(target["serial"], x, y)
    injection = "pass" if code == 0 else "fail"
    raw_post, cleanup_post = client.capture(target["serial"])
    cleanup = _cleanup_join(cleanup_pre, cleanup_post)
    post_snapshot = "none"
    transition = "unknown"
    if raw_post is not None:
        try:
            post = analyze(raw_post)
            post_snapshot = post["snapshot"]
            transition = "changed" if post_snapshot != current else "same"
        except BoundedError:
            pass
    return _action_receipt(
        pre_snapshot=current,
        post_snapshot=post_snapshot,
        freshness="pass",
        target_match="unique",
        injection=injection,
        transition=transition,
        cleanup=cleanup,
        result="acted" if injection == "pass" else "failed",
    )

def _type_receipt(
    pre_snapshot="none",
    post_snapshot="none",
    freshness="unknown",
    target_match="unknown",
    focus="unknown",
    injection="unknown",
    verified="unknown",
    cleanup="unknown",
    result="unknown",
):
    return [
        "schema=mcl-wireless-adb-ui-type.v1",
        f"pre_snapshot={pre_snapshot}",
        f"post_snapshot={post_snapshot}",
        f"freshness={freshness}",
        f"target_match={target_match}",
        f"focus={focus}",
        f"injection={injection}",
        f"verified={verified}",
        f"cleanup={cleanup}",
        f"result={result}",
        f"details={DETAILS}",
    ]

def type_ascii_receipt(client, requested_snapshot, handle, text_value):
    if not _valid_ascii_text(text_value):
        return _type_receipt(result="blocked")
    if not _valid_snapshot(requested_snapshot) or not _valid_handle(handle):
        return _type_receipt(result="blocked")
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return _type_receipt(result="blocked")
    raw_pre, cleanup_pre = client.capture(target["serial"])
    if raw_pre is None:
        return _type_receipt(cleanup=cleanup_pre, result="unknown")
    try:
        pre = analyze(raw_pre)
    except BoundedError:
        return _type_receipt(cleanup=cleanup_pre, result="unknown")
    current = pre["snapshot"]
    if current != requested_snapshot:
        return _type_receipt(
            pre_snapshot=current,
            freshness="stale",
            cleanup=cleanup_pre,
            result="stale",
        )
    matches = _handle_matches(pre, handle, "editable")
    if not matches:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="none",
            cleanup=cleanup_pre,
            result="blocked",
        )
    if len(matches) != 1:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="ambiguous",
            cleanup=cleanup_pre,
            result="blocked",
        )
    node = matches[0][1]
    if node["text"] != "":
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            cleanup=cleanup_pre,
            result="blocked",
        )
    bounds = parse_bounds(node["bounds"])
    if bounds is None:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            cleanup=cleanup_pre,
            result="blocked",
        )
    x, y = _center(bounds)
    tap_code, _ = client.tap(target["serial"], x, y)
    if tap_code != 0:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            focus="fail",
            injection="fail",
            cleanup=cleanup_pre,
            result="failed",
        )
    raw_focus, cleanup_focus = client.capture(target["serial"])
    cleanup = _cleanup_join(cleanup_pre, cleanup_focus)
    if raw_focus is None:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            focus="unknown",
            injection="unknown",
            cleanup=cleanup,
            result="unknown",
        )
    try:
        focus_analysis = analyze(raw_focus)
    except BoundedError:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            focus="unknown",
            cleanup=cleanup,
            result="unknown",
        )
    focused = _focused_editables(focus_analysis)
    if len(focused) != 1 or focused[0]["text"] != "":
        return _type_receipt(
            pre_snapshot=current,
            post_snapshot=focus_analysis["snapshot"],
            freshness="pass",
            target_match="unique",
            focus="fail",
            injection="unknown",
            cleanup=cleanup,
            result="failed",
        )
    encoded = text_value.replace(" ", "%s")
    input_code, _ = client.type_text(target["serial"], encoded)
    injection = "pass" if input_code == 0 else "fail"
    if input_code != 0:
        return _type_receipt(
            pre_snapshot=current,
            post_snapshot=focus_analysis["snapshot"],
            freshness="pass",
            target_match="unique",
            focus="pass",
            injection=injection,
            verified="unknown",
            cleanup=cleanup,
            result="failed",
        )
    raw_post, cleanup_post = client.capture(target["serial"])
    cleanup = _cleanup_join(cleanup_pre, cleanup_focus, cleanup_post)
    if raw_post is None:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            focus="pass",
            injection="pass",
            verified="unknown",
            cleanup=cleanup,
            result="unknown",
        )
    try:
        post = analyze(raw_post)
    except BoundedError:
        return _type_receipt(
            pre_snapshot=current,
            freshness="pass",
            target_match="unique",
            focus="pass",
            injection="pass",
            verified="unknown",
            cleanup=cleanup,
            result="unknown",
        )
    focused_post = _focused_editables(post)
    verified = (
        "pass"
        if len(focused_post) == 1 and focused_post[0]["text"] == text_value
        else "fail"
    )
    return _type_receipt(
        pre_snapshot=current,
        post_snapshot=post["snapshot"],
        freshness="pass",
        target_match="unique",
        focus="pass",
        injection="pass",
        verified=verified,
        cleanup=cleanup,
        result="typed" if verified == "pass" else "failed",
    )

def wait_text_receipt(client, text_value, sleeper=time.sleep):
    if not _valid_ascii_text(text_value):
        return [
            "schema=mcl-wireless-adb-ui-wait.v1",
            "query_kind=exact_text",
            "snapshot=none",
            "match_count=unknown",
            "result=blocked",
            "cleanup=unknown",
            f"details={DETAILS}",
        ]
    target = client.resolve()
    if target["connection"] != "connected" or target["model"] != "match":
        return [
            "schema=mcl-wireless-adb-ui-wait.v1",
            "query_kind=exact_text",
            "snapshot=none",
            "match_count=unknown",
            "result=blocked",
            "cleanup=unknown",
            f"details={DETAILS}",
        ]
    cleanups = []
    snapshot = "none"
    for attempt in range(WAIT_ATTEMPTS):
        raw, cleanup = client.capture(target["serial"])
        cleanups.append(cleanup)
        if raw is None:
            return [
                "schema=mcl-wireless-adb-ui-wait.v1",
                "query_kind=exact_text",
                "snapshot=none",
                "match_count=unknown",
                "result=unknown",
                f"cleanup={_cleanup_join(*cleanups)}",
                f"details={DETAILS}",
            ]
        try:
            analysis = analyze(raw)
        except BoundedError:
            return [
                "schema=mcl-wireless-adb-ui-wait.v1",
                "query_kind=exact_text",
                "snapshot=none",
                "match_count=unknown",
                "result=unknown",
                f"cleanup={_cleanup_join(*cleanups)}",
                f"details={DETAILS}",
            ]
        snapshot = analysis["snapshot"]
        matches = _exact_text_matches(analysis, text_value)
        if matches:
            count = "1" if len(matches) == 1 else "many"
            return [
                "schema=mcl-wireless-adb-ui-wait.v1",
                "query_kind=exact_text",
                f"snapshot={snapshot}",
                f"match_count={count}",
                "result=found",
                f"cleanup={_cleanup_join(*cleanups)}",
                f"details={DETAILS}",
            ]
        if attempt + 1 < WAIT_ATTEMPTS:
            sleeper(WAIT_INTERVAL_SECONDS)
    return [
        "schema=mcl-wireless-adb-ui-wait.v1",
        "query_kind=exact_text",
        f"snapshot={snapshot}",
        "match_count=0",
        "result=timeout",
        f"cleanup={_cleanup_join(*cleanups)}",
        f"details={DETAILS}",
    ]

def parser():
    root = argparse.ArgumentParser(prog="mcl-adb-ui")
    sub = root.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    sub.add_parser("snapshot")
    find = sub.add_parser("find-action")
    find.add_argument("--label", required=True)
    sub.add_parser("find-editable")
    sub.add_parser("launch-target")
    alias = sub.add_parser("find-alias")
    alias.add_argument("--alias", choices=sorted(ALIASES), required=True)
    sub.add_parser("probe-new-chat")
    activate = sub.add_parser("activate")
    activate.add_argument("--snapshot", required=True)
    activate.add_argument("--handle", required=True)
    type_ascii = sub.add_parser("type-ascii")
    type_ascii.add_argument("--snapshot", required=True)
    type_ascii.add_argument("--handle", required=True)
    type_ascii.add_argument("--text", required=True)
    wait = sub.add_parser("wait-text")
    wait.add_argument("--exact", required=True)
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
    elif args.command == "find-editable":
        lines = find_receipt(client, "editable")
    elif args.command == "launch-target":
        lines = launch_receipt(client)
    elif args.command == "find-alias":
        lines = find_alias_receipt(client, args.alias)
    elif args.command == "probe-new-chat":
        lines = probe_new_chat_receipt(client)
    elif args.command == "activate":
        lines = activate_receipt(client, args.snapshot, args.handle)
    elif args.command == "type-ascii":
        lines = type_ascii_receipt(client, args.snapshot, args.handle, args.text)
    else:
        lines = wait_text_receipt(client, args.exact)
    _print(lines)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
