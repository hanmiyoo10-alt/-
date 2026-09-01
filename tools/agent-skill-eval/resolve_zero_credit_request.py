#!/usr/bin/env python3
"""Resolve a bounded zero-credit Agent Skill evaluation request.

This helper performs no network access and no repository mutation. For push-triggered
runs it proves that the event commit is a single-file control commit whose parent is
the exact repository state to evaluate. For workflow_dispatch it normalizes the
explicitly supplied skill/case against the current repository SHA.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
ALLOWED_SKILLS = frozenset({"plugin-authority-scan", "plugin-impact-scope"})
REQUEST_DIR = ".agent-skill-zero-credit-requests"
REQUEST_BRANCH_PREFIX = "refs/heads/agent-skill-zero-credit-request/"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
CASE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
BRANCH_SUFFIX_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$")


class RequestError(ValueError):
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
        raise RequestError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout.rstrip("\n")


def _validate_sha(value: str, label: str) -> str:
    normalized = str(value).strip().lower()
    if not SHA_RE.fullmatch(normalized):
        raise RequestError(f"{label} must be a 40-character lowercase hex commit SHA")
    return normalized


def _validate_skill(skill: str) -> str:
    normalized = str(skill).strip()
    if normalized not in ALLOWED_SKILLS:
        raise RequestError(f"unallowlisted skill: {normalized}")
    return normalized


def _validate_case_id(case_id: str) -> str:
    normalized = str(case_id).strip()
    if not CASE_RE.fullmatch(normalized):
        raise RequestError("case_id must be 1-128 characters of letters, digits, dot, underscore, or hyphen")
    return normalized


def _validate_branch_ref(github_ref: str) -> str:
    if not github_ref.startswith(REQUEST_BRANCH_PREFIX):
        raise RequestError("push ref is outside the zero-credit request branch namespace")
    suffix = github_ref[len(REQUEST_BRANCH_PREFIX) :]
    if not BRANCH_SUFFIX_RE.fullmatch(suffix) or ".." in suffix or "//" in suffix or suffix.endswith("/"):
        raise RequestError("zero-credit request branch suffix is malformed")
    return suffix


def _load_request_from_commit(repo_root: Path, commit_sha: str, path: str) -> dict[str, Any]:
    raw = _git(repo_root, "show", f"{commit_sha}:{path}")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RequestError(f"request JSON is invalid: {exc}") from exc
    if not isinstance(payload, dict):
        raise RequestError("request JSON must be an object")
    expected_keys = {"schema_version", "skill", "case_id", "target_repository_sha"}
    if set(payload) != expected_keys:
        raise RequestError("request JSON must contain exactly schema_version, skill, case_id, target_repository_sha")
    if payload.get("schema_version") != SCHEMA_VERSION:
        raise RequestError("unsupported request schema_version")
    return payload


def resolve_dispatch(github_sha: str, skill: str, case_id: str) -> dict[str, Any]:
    target = _validate_sha(github_sha, "github_sha")
    return {
        "schema_version": SCHEMA_VERSION,
        "execution_trigger": "workflow_dispatch",
        "request_commit_sha": target,
        "target_repository_sha": target,
        "request_path": None,
        "skill": _validate_skill(skill),
        "case_id": _validate_case_id(case_id),
    }


def resolve_push(repo_root: Path, github_ref: str, github_sha: str) -> dict[str, Any]:
    _validate_branch_ref(github_ref)
    request_sha = _validate_sha(github_sha, "github_sha")
    canonical = _git(repo_root, "rev-parse", f"{request_sha}^{{commit}}").strip().lower()
    if canonical != request_sha:
        raise RequestError("github_sha does not resolve to the expected commit")

    parent_line = _git(repo_root, "rev-list", "--parents", "-n", "1", request_sha).split()
    if len(parent_line) != 2:
        raise RequestError("request commit must have exactly one parent")
    parent_sha = _validate_sha(parent_line[1], "request parent")

    changes = [line for line in _git(repo_root, "diff-tree", "--no-commit-id", "--name-status", "-r", request_sha).splitlines() if line.strip()]
    if len(changes) != 1:
        raise RequestError("request commit must change exactly one path")
    fields = changes[0].split("\t", 1)
    if len(fields) != 2 or fields[0] != "A":
        raise RequestError("request path must be newly added, not modified/renamed/deleted")
    request_path = fields[1]
    request_file = Path(request_path)
    if request_file.parent.as_posix() != REQUEST_DIR or request_file.suffix != ".json" or not request_file.name:
        raise RequestError("request file must be a direct .json child of the zero-credit request directory")

    payload = _load_request_from_commit(repo_root, request_sha, request_path)
    target_sha = _validate_sha(str(payload["target_repository_sha"]), "target_repository_sha")
    if target_sha != parent_sha:
        raise RequestError("target_repository_sha must equal the request commit parent")

    return {
        "schema_version": SCHEMA_VERSION,
        "execution_trigger": "push_request_commit",
        "request_commit_sha": request_sha,
        "target_repository_sha": target_sha,
        "request_path": request_path,
        "skill": _validate_skill(str(payload["skill"])),
        "case_id": _validate_case_id(str(payload["case_id"])),
    }


def resolve(
    repo_root: Path,
    event_name: str,
    github_ref: str,
    github_sha: str,
    dispatch_skill: str = "",
    dispatch_case_id: str = "",
) -> dict[str, Any]:
    if event_name == "workflow_dispatch":
        return resolve_dispatch(github_sha, dispatch_skill, dispatch_case_id)
    if event_name == "push":
        return resolve_push(repo_root, github_ref, github_sha)
    raise RequestError(f"unsupported event_name: {event_name}")


def _write(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if path is None:
        sys.stdout.write(text)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--event-name", required=True)
    parser.add_argument("--github-ref", default="")
    parser.add_argument("--github-sha", required=True)
    parser.add_argument("--dispatch-skill", default="")
    parser.add_argument("--dispatch-case-id", default="")
    parser.add_argument("--output")
    args = parser.parse_args(argv)

    try:
        payload = resolve(
            Path(args.repo_root).resolve(),
            args.event_name,
            args.github_ref,
            args.github_sha,
            args.dispatch_skill,
            args.dispatch_case_id,
        )
        _write(Path(args.output) if args.output else None, payload)
    except RequestError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
