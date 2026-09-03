#!/usr/bin/env python3
"""Resolve one bounded O4-H Voyage Scout benchmark request commit."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

MODULE_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = MODULE_DIR.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.build_o4h_voyage_inputs import SOURCE_REPOSITORY_SHA
from benchmarks.run_o4h_scout_cell import MEASUREMENT_ID

SCHEMA_VERSION = 1
MATRIX_ID = MEASUREMENT_ID
REQUEST_DIR = ".agent-skill-o4h-requests"
REQUEST_BRANCH_PREFIX = "refs/heads/agent-skill-o4h-request/"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
BRANCH_SUFFIX_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$")


class O4HRequestError(ValueError):
    pass


def _git(repo_root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo_root), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit={proc.returncode}"
        raise O4HRequestError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout.rstrip("\n")


def _validate_sha(value: str, label: str) -> str:
    normalized = str(value).strip().lower()
    if not SHA_RE.fullmatch(normalized):
        raise O4HRequestError(f"{label} must be a 40-character lowercase hex commit SHA")
    return normalized


def _validate_branch_ref(github_ref: str) -> str:
    if not github_ref.startswith(REQUEST_BRANCH_PREFIX):
        raise O4HRequestError("push ref is outside the O4-H request branch namespace")
    suffix = github_ref[len(REQUEST_BRANCH_PREFIX):]
    if (
        not BRANCH_SUFFIX_RE.fullmatch(suffix)
        or ".." in suffix
        or "//" in suffix
        or suffix.endswith("/")
    ):
        raise O4HRequestError("O4-H request branch suffix is malformed")
    return suffix


def _load_request(repo_root: Path, request_sha: str, request_path: str) -> dict[str, Any]:
    raw = _git(repo_root, "show", f"{request_sha}:{request_path}")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise O4HRequestError(f"request JSON is invalid: {exc}") from exc
    if not isinstance(payload, dict):
        raise O4HRequestError("request JSON must be an object")
    if set(payload) != {
        "schema_version",
        "matrix_id",
        "target_repository_sha",
        "source_repository_sha",
    }:
        raise O4HRequestError("request JSON fields changed")
    if payload["schema_version"] != SCHEMA_VERSION:
        raise O4HRequestError("unsupported request schema_version")
    if payload["matrix_id"] != MATRIX_ID:
        raise O4HRequestError("unexpected O4-H matrix_id")
    source_sha = _validate_sha(str(payload["source_repository_sha"]), "source_repository_sha")
    if source_sha != SOURCE_REPOSITORY_SHA:
        raise O4HRequestError("O4-H frozen source_repository_sha drifted")
    return payload


def resolve_push(repo_root: Path, github_ref: str, github_sha: str) -> dict[str, Any]:
    _validate_branch_ref(github_ref)
    request_sha = _validate_sha(github_sha, "github_sha")
    canonical = _git(repo_root, "rev-parse", f"{request_sha}^{{commit}}").strip().lower()
    if canonical != request_sha:
        raise O4HRequestError("github_sha does not resolve to the expected commit")

    parent_line = _git(repo_root, "rev-list", "--parents", "-n", "1", request_sha).split()
    if len(parent_line) != 2:
        raise O4HRequestError("request commit must have exactly one parent")
    parent_sha = _validate_sha(parent_line[1], "request parent")

    changes = [
        line
        for line in _git(
            repo_root,
            "diff-tree",
            "--no-commit-id",
            "--name-status",
            "-r",
            request_sha,
        ).splitlines()
        if line.strip()
    ]
    if len(changes) != 1:
        raise O4HRequestError("request commit must change exactly one path")
    fields = changes[0].split("\t", 1)
    if len(fields) != 2 or fields[0] != "A":
        raise O4HRequestError("request path must be newly added")
    request_path = fields[1]
    request_file = Path(request_path)
    if (
        request_file.parent.as_posix() != REQUEST_DIR
        or request_file.suffix != ".json"
        or not request_file.stem
    ):
        raise O4HRequestError("request file must be a direct JSON child of the O4-H request directory")

    payload = _load_request(repo_root, request_sha, request_path)
    target_sha = _validate_sha(str(payload["target_repository_sha"]), "target_repository_sha")
    if target_sha != parent_sha:
        raise O4HRequestError("target_repository_sha must equal the request commit parent")

    return {
        "schema_version": SCHEMA_VERSION,
        "execution_trigger": "push_request_commit",
        "matrix_id": MATRIX_ID,
        "request_commit_sha": request_sha,
        "target_repository_sha": target_sha,
        "source_repository_sha": SOURCE_REPOSITORY_SHA,
        "request_path": request_path,
        "request_branch": github_ref[len("refs/heads/"):],
        "retrospective_only": True,
        "diagnostic_replay_only": False,
        "assignment_candidate_only": True,
        "independent_assignment_case": True,
        "semantic_retry_ceiling_per_model": 0,
    }


def _write(path: Path | None, value: dict[str, Any]) -> None:
    text = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path is None:
        sys.stdout.write(text)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--github-ref", required=True)
    parser.add_argument("--github-sha", required=True)
    parser.add_argument("--output")
    args = parser.parse_args(argv)
    try:
        value = resolve_push(Path(args.repo_root).resolve(), args.github_ref, args.github_sha)
        _write(Path(args.output) if args.output else None, value)
    except O4HRequestError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
