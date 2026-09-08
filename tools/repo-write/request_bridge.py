#!/usr/bin/env python3
"""Parse and render the owner-authored issue-comment transport for repo patch writes."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from typing import Any

START = "<!-- repo-patch-request:v1 -->"
END = "<!-- /repo-patch-request:v1 -->"
PATCH_SEPARATOR = "---PATCH---"
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
BRANCH = re.compile(r"^agent-patch/[A-Za-z0-9._/-]+$")
MAX_BODY_BYTES = 98_304
MAX_PATCH_BYTES = 65_536
MAX_PATCH_LINES = 4_000
MAX_FILES = 20


class BridgeError(RuntimeError):
    def __init__(self, reason: str, detail: str | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.detail = detail


def compact_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def safe_path(path: str) -> bool:
    if not path or path.startswith("/") or "\\" in path or "\x00" in path:
        return False
    return all(part not in {"", ".", ".."} for part in path.split("/"))


def parse_envelope(body: str) -> tuple[dict[str, Any], str]:
    if len(body.encode("utf-8")) > MAX_BODY_BYTES:
        raise BridgeError("REQUEST_BODY_TOO_LARGE")
    if body.count(START) != 1 or body.count(END) != 1:
        raise BridgeError("REQUEST_ENVELOPE_COUNT_INVALID")
    before, rest = body.split(START, 1)
    middle, after = rest.split(END, 1)
    if before.strip() or after.strip():
        raise BridgeError("REQUEST_ENVELOPE_EXTRANEOUS_TEXT")
    if middle.count(PATCH_SEPARATOR) != 1:
        raise BridgeError("REQUEST_PATCH_SEPARATOR_INVALID")

    metadata_text, patch = middle.split(PATCH_SEPARATOR, 1)
    metadata_text = metadata_text.strip()
    patch = patch.lstrip("\r\n")
    if not metadata_text or not patch:
        raise BridgeError("REQUEST_CONTENT_MISSING")
    try:
        metadata = json.loads(metadata_text)
    except json.JSONDecodeError as exc:
        raise BridgeError("REQUEST_METADATA_INVALID_JSON", str(exc)[:300]) from exc
    if not isinstance(metadata, dict):
        raise BridgeError("REQUEST_METADATA_INVALID")
    return metadata, patch


def normalize_metadata(metadata: dict[str, Any], patch: str) -> dict[str, Any]:
    expected_keys = {
        "schemaVersion",
        "branch",
        "expectedHead",
        "workIssue",
        "patchSha256",
        "message",
        "expectedPaths",
    }
    if set(metadata) != expected_keys:
        raise BridgeError("REQUEST_METADATA_KEYS_INVALID")
    if metadata["schemaVersion"] != 1:
        raise BridgeError("REQUEST_SCHEMA_UNSUPPORTED")

    branch = metadata["branch"]
    expected_head = metadata["expectedHead"]
    work_issue = metadata["workIssue"]
    patch_sha256 = metadata["patchSha256"]
    message = metadata["message"]
    expected_paths = metadata["expectedPaths"]

    if not isinstance(branch, str) or not BRANCH.fullmatch(branch):
        raise BridgeError("TARGET_BRANCH_DENIED")
    if ".." in branch or branch.endswith("/") or "//" in branch or "@{" in branch:
        raise BridgeError("TARGET_BRANCH_DENIED")
    if not isinstance(expected_head, str) or not SHA40.fullmatch(expected_head):
        raise BridgeError("EXPECTED_HEAD_INVALID")
    if not isinstance(work_issue, int) or isinstance(work_issue, bool) or work_issue <= 0:
        raise BridgeError("WORK_ISSUE_INVALID")
    if not isinstance(patch_sha256, str) or not SHA256.fullmatch(patch_sha256):
        raise BridgeError("PATCH_HASH_INVALID")
    if not isinstance(message, str) or not (1 <= len(message) <= 200) or "\x00" in message:
        raise BridgeError("MESSAGE_INVALID")
    if not isinstance(expected_paths, list) or not (1 <= len(expected_paths) <= MAX_FILES):
        raise BridgeError("EXPECTED_PATHS_INVALID")
    if not all(isinstance(path, str) and safe_path(path) for path in expected_paths):
        raise BridgeError("EXPECTED_PATHS_INVALID")
    if len(set(expected_paths)) != len(expected_paths):
        raise BridgeError("EXPECTED_PATHS_INVALID")

    patch_bytes = patch.encode("utf-8")
    if not patch_bytes or len(patch_bytes) > MAX_PATCH_BYTES:
        raise BridgeError("PATCH_SIZE_INVALID")
    if patch_bytes.count(b"\n") + 1 > MAX_PATCH_LINES:
        raise BridgeError("PATCH_LINE_LIMIT_EXCEEDED")
    if b"\x00" in patch_bytes or b"GIT binary patch" in patch_bytes or b"Binary files " in patch_bytes:
        raise BridgeError("BINARY_PATCH_DENIED")
    actual_hash = hashlib.sha256(patch_bytes).hexdigest()
    if actual_hash != patch_sha256:
        raise BridgeError("PATCH_HASH_MISMATCH")

    return {
        "schema_version": 1,
        "branch": branch,
        "expected_head": expected_head,
        "work_issue": work_issue,
        "patch_sha256": patch_sha256,
        "message": message,
        "expected_paths": sorted(expected_paths),
    }


def parse_event(event: dict[str, Any], queue_issue: int) -> tuple[dict[str, Any], str]:
    issue = event.get("issue")
    comment = event.get("comment")
    repository = event.get("repository")
    if not isinstance(issue, dict) or not isinstance(comment, dict) or not isinstance(repository, dict):
        raise BridgeError("EVENT_SHAPE_INVALID")
    if issue.get("number") != queue_issue or issue.get("pull_request") is not None:
        raise BridgeError("WRONG_QUEUE_ISSUE")

    owner = repository.get("owner")
    user = comment.get("user")
    if not isinstance(owner, dict) or not isinstance(user, dict):
        raise BridgeError("EVENT_ACTOR_INVALID")
    owner_login = owner.get("login")
    if (
        not isinstance(owner_login, str)
        or user.get("login") != owner_login
        or comment.get("author_association") != "OWNER"
        or user.get("type") == "Bot"
    ):
        raise BridgeError("REQUEST_ACTOR_DENIED")

    body = comment.get("body")
    if not isinstance(body, str):
        raise BridgeError("REQUEST_BODY_INVALID")
    metadata, patch = parse_envelope(body)
    return normalize_metadata(metadata, patch), patch


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(compact_json(payload) + "\n", encoding="utf-8")


def parse_command(args: argparse.Namespace) -> int:
    event_file = Path(args.event_file or os.environ.get("GITHUB_EVENT_PATH", ""))
    result_out = Path(args.result_out)
    try:
        event = json.loads(event_file.read_text(encoding="utf-8"))
        if not isinstance(event, dict):
            raise BridgeError("EVENT_SHAPE_INVALID")
        request, patch = parse_event(event, args.queue_issue)
        Path(args.request_out).write_text(compact_json(request) + "\n", encoding="utf-8")
        Path(args.patch_out).write_text(patch, encoding="utf-8", newline="")
        write_json(result_out, {"disposition": "REQUEST_ACCEPTED", "branch": request["branch"], "work_issue": request["work_issue"], "patch_sha256": request["patch_sha256"]})
        return 0
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        write_json(result_out, {"disposition": "REQUEST_REJECTED", "reason": "EVENT_READ_FAILED", "detail": str(exc)[:300]})
        return 2
    except BridgeError as exc:
        payload: dict[str, Any] = {"disposition": "REQUEST_REJECTED", "reason": exc.reason}
        if exc.detail:
            payload["detail"] = exc.detail
        write_json(result_out, payload)
        return 2


def receipt_command(args: argparse.Namespace) -> int:
    parse_result = json.loads(Path(args.parse_result).read_text(encoding="utf-8"))
    write_result: dict[str, Any] | None = None
    if args.write_result and Path(args.write_result).exists():
        write_result = json.loads(Path(args.write_result).read_text(encoding="utf-8"))

    if parse_result.get("disposition") != "REQUEST_ACCEPTED":
        payload = parse_result
    elif write_result is None:
        payload = {"disposition": "PATCH_REJECTED", "reason": "WRITE_RESULT_MISSING"}
    else:
        payload = write_result

    lines = [
        "<!-- repo-patch-receipt:v1 -->",
        "Repository Patch Write receipt",
        "",
        f"`{compact_json(payload)}`",
        "",
        "Transport only; this receipt is not source/release/production authority.",
    ]
    Path(args.receipt_out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    parse = sub.add_parser("parse-event")
    parse.add_argument("--event-file")
    parse.add_argument("--queue-issue", type=int, default=1876)
    parse.add_argument("--request-out", required=True)
    parse.add_argument("--patch-out", required=True)
    parse.add_argument("--result-out", required=True)

    receipt = sub.add_parser("render-receipt")
    receipt.add_argument("--parse-result", required=True)
    receipt.add_argument("--write-result")
    receipt.add_argument("--receipt-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "parse-event":
        return parse_command(args)
    return receipt_command(args)


if __name__ == "__main__":
    raise SystemExit(main())
