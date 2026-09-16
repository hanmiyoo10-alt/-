#!/usr/bin/env python3
"""Compact read-only candidate/merge root-tree identity projection."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
from typing import Any

SHA40 = re.compile(r"^[0-9a-f]{40}$")
MAX_REQUEST_BYTES = 4096
ALLOWED_FIELDS = {"schemaVersion", "candidateCommit", "mergeCommit"}
PROOF_SCOPE = "ROOT_TREE_SNAPSHOT_ONLY"


def run_git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=repo, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )


def result(state: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "mode": "CANDIDATE_PAYLOAD_ID_V1",
        "state": state,
        "reasonCode": reason,
        "proofScope": PROOF_SCOPE,
        "mutationAuthorized": False,
        "mergeAuthorized": False,
        "ciFreshnessAuthorized": False,
        "semanticPayloadDivergenceClaimed": False,
        **extra,
    }


def validate_request(data: Any) -> str | None:
    if not isinstance(data, dict):
        return "REQUEST_INVALID"
    if set(data) != ALLOWED_FIELDS:
        return "REQUEST_SCHEMA_INVALID"
    if type(data.get("schemaVersion")) is not int or data["schemaVersion"] != 1:
        return "REQUEST_SCHEMA_INVALID"
    return None


def exact_commit_exists(repo: Path, value: str) -> bool:
    cp = run_git(repo, "cat-file", "-e", f"{value}^{{commit}}")
    return cp.returncode == 0


def root_tree(repo: Path, commit: str) -> str | None:
    cp = run_git(repo, "rev-parse", "--verify", f"{commit}^{{tree}}")
    value = cp.stdout.strip()
    if cp.returncode != 0 or not SHA40.fullmatch(value):
        return None
    return value


def compare_payload(repo: Path, data: Any) -> dict[str, Any]:
    request_error = validate_request(data)
    if request_error:
        return result("UNKNOWN", request_error)

    candidate = data["candidateCommit"]
    merge = data["mergeCommit"]
    invalid = [name for name, value in (
        ("candidateCommit", candidate), ("mergeCommit", merge)
    ) if not isinstance(value, str) or not SHA40.fullmatch(value)]
    if invalid:
        return result("UNKNOWN", "COMMIT_IDENTITY_INVALID", invalidFields=invalid)

    unreachable = [name for name, value in (
        ("candidateCommit", candidate), ("mergeCommit", merge)
    ) if not exact_commit_exists(repo, value)]
    if unreachable:
        return result("UNKNOWN", "COMMIT_UNREACHABLE", unreachableFields=unreachable)

    candidate_tree = root_tree(repo, candidate)
    merge_tree = root_tree(repo, merge)
    if candidate_tree is None or merge_tree is None:
        return result("UNKNOWN", "TREE_IDENTITY_UNAVAILABLE")

    commit_equal = candidate == merge
    tree_equal = candidate_tree == merge_tree
    state = "TREE_IDENTICAL" if tree_equal else "TREE_DIFFERENT"
    reason = "ROOT_TREE_IDENTICAL" if tree_equal else "ROOT_TREE_DIFFERENT"
    return result(
        state, reason,
        candidateCommit=candidate,
        candidateTree=candidate_tree,
        mergeCommit=merge,
        mergeTree=merge_tree,
        commitEqual=commit_equal,
        treeEqual=tree_equal,
        deeperSemanticComparisonRequired=not tree_equal,
    )


def load_request(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ValueError("REQUEST_READ_FAILED") from exc
    if not raw or len(raw) > MAX_REQUEST_BYTES or b"\x00" in raw:
        raise ValueError("REQUEST_SIZE_INVALID")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("REQUEST_JSON_INVALID") from exc
    request_error = validate_request(data)
    if request_error:
        raise ValueError(request_error)
    return data


def exit_code(payload: dict[str, Any]) -> int:
    return 0 if payload.get("state") in {"TREE_IDENTICAL", "TREE_DIFFERENT"} else 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--request-file", required=True)
    args = parser.parse_args(argv)
    try:
        data = load_request(Path(args.request_file))
        payload = compare_payload(Path(args.repo).resolve(), data)
    except ValueError as exc:
        payload = result("UNKNOWN", str(exc))
    except Exception:
        payload = result("UNKNOWN", "RUNTIME_ERROR")
    sys.stdout.write(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n")
    return exit_code(payload)


if __name__ == "__main__":
    raise SystemExit(main())
