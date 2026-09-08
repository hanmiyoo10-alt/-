#!/usr/bin/env python3
"""Apply one bounded UTF-8 unified diff to an exact ordinary work-branch head.

This is a repository transport, not a release/main authority. It never executes
code from the target branch and only writes under the agent-patch/** namespace.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any

SHA40 = re.compile(r"^[0-9a-f]{40}$")
BRANCH = re.compile(r"^agent-patch/[A-Za-z0-9._/-]+$")
MAX_PATCH_BYTES = 65_536
MAX_PATCH_LINES = 4_000
MAX_FILES = 20
PROTECTED_PATHS = {
    ".github/workflows/repo-patch-write.yml",
    "tools/repo-write/patch_branch.py",
    "tools/repo-write/request_bridge.py",
}


class PatchWriteError(RuntimeError):
    def __init__(self, reason: str, *, detail: str | None = None, exit_code: int = 2) -> None:
        super().__init__(reason)
        self.reason = reason
        self.detail = detail
        self.exit_code = exit_code


def run(
    args: list[str],
    *,
    cwd: Path,
    check: bool = True,
    text: bool = True,
) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        args,
        cwd=cwd,
        text=text,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and cp.returncode != 0:
        detail = (cp.stderr or cp.stdout or "").strip()
        raise PatchWriteError("GIT_COMMAND_FAILED", detail=detail[:800], exit_code=3)
    return cp


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["git", *args], cwd=repo, check=check)


def write_result(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n"
    if path:
        path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def validate_branch(branch: str) -> None:
    if not BRANCH.fullmatch(branch):
        raise PatchWriteError("TARGET_BRANCH_DENIED")
    if ".." in branch or branch.endswith("/") or "//" in branch or "@{" in branch:
        raise PatchWriteError("TARGET_BRANCH_DENIED")


def validate_repo_path(path: str) -> None:
    if not path or path.startswith("/") or "\\" in path or "\x00" in path:
        raise PatchWriteError("INVALID_EXPECTED_PATH")
    parts = path.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise PatchWriteError("INVALID_EXPECTED_PATH")
    if path in PROTECTED_PATHS:
        raise PatchWriteError("SELF_MODIFICATION_DENIED")


def load_request(request_file: Path) -> dict[str, Any]:
    try:
        data = json.loads(request_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PatchWriteError("INVALID_REQUEST_FILE", detail=str(exc)[:300]) from exc
    if not isinstance(data, dict):
        raise PatchWriteError("INVALID_REQUEST_FILE")

    branch = data.get("branch")
    expected_head = data.get("expected_head")
    message = data.get("message")
    expected_paths = data.get("expected_paths")
    patch_sha256 = data.get("patch_sha256")

    if not isinstance(branch, str):
        raise PatchWriteError("INVALID_REQUEST_FILE")
    validate_branch(branch)
    if not isinstance(expected_head, str) or not SHA40.fullmatch(expected_head):
        raise PatchWriteError("INVALID_EXPECTED_HEAD")
    if not isinstance(message, str) or not (1 <= len(message) <= 200) or "\x00" in message:
        raise PatchWriteError("INVALID_COMMIT_MESSAGE")
    if not isinstance(patch_sha256, str) or not re.fullmatch(r"[0-9a-f]{64}", patch_sha256):
        raise PatchWriteError("INVALID_PATCH_HASH")
    if not isinstance(expected_paths, list) or not (1 <= len(expected_paths) <= MAX_FILES):
        raise PatchWriteError("INVALID_EXPECTED_PATHS")
    if not all(isinstance(p, str) for p in expected_paths):
        raise PatchWriteError("INVALID_EXPECTED_PATHS")
    if len(set(expected_paths)) != len(expected_paths):
        raise PatchWriteError("INVALID_EXPECTED_PATHS")
    for path in expected_paths:
        validate_repo_path(path)

    return {
        "branch": branch,
        "expected_head": expected_head,
        "message": message,
        "expected_paths": sorted(expected_paths),
        "patch_sha256": patch_sha256,
    }


def load_patch(patch_file: Path, expected_sha256: str) -> bytes:
    try:
        raw = patch_file.read_bytes()
    except OSError as exc:
        raise PatchWriteError("PATCH_READ_FAILED", detail=str(exc)[:300]) from exc
    if not raw or len(raw) > MAX_PATCH_BYTES:
        raise PatchWriteError("PATCH_SIZE_INVALID")
    if raw.count(b"\n") + 1 > MAX_PATCH_LINES:
        raise PatchWriteError("PATCH_LINE_LIMIT_EXCEEDED")
    if b"\x00" in raw or b"GIT binary patch" in raw or b"Binary files " in raw:
        raise PatchWriteError("BINARY_PATCH_DENIED")
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise PatchWriteError("PATCH_NOT_UTF8") from exc
    actual = hashlib.sha256(raw).hexdigest()
    if actual != expected_sha256:
        raise PatchWriteError("PATCH_HASH_MISMATCH")
    if not (raw.startswith(b"diff --git ") or raw.startswith(b"--- ")):
        raise PatchWriteError("PATCH_FORMAT_UNSUPPORTED")
    return raw


def remote_head(repo: Path, remote: str, branch: str) -> str | None:
    cp = git(repo, "ls-remote", "--heads", remote, f"refs/heads/{branch}", check=False)
    if cp.returncode != 0:
        raise PatchWriteError("REMOTE_HEAD_READ_FAILED", detail=(cp.stderr or "")[:500], exit_code=4)
    rows = [line for line in cp.stdout.splitlines() if line.strip()]
    if not rows:
        return None
    if len(rows) != 1:
        raise PatchWriteError("REMOTE_HEAD_AMBIGUOUS", exit_code=4)
    sha, _, ref = rows[0].partition("\t")
    if ref != f"refs/heads/{branch}" or not SHA40.fullmatch(sha):
        raise PatchWriteError("REMOTE_HEAD_INVALID", exit_code=4)
    return sha


def parse_name_status(raw: str) -> list[tuple[str, list[str]]]:
    tokens = raw.split("\0")
    if tokens and tokens[-1] == "":
        tokens.pop()
    out: list[tuple[str, list[str]]] = []
    i = 0
    while i < len(tokens):
        status = tokens[i]
        i += 1
        count = 2 if status.startswith(("R", "C")) else 1
        if i + count > len(tokens):
            raise PatchWriteError("DIFF_STATUS_INVALID")
        paths = tokens[i : i + count]
        i += count
        out.append((status, paths))
    return out


def tree_mode(repo: Path, rev: str, path: str) -> str | None:
    cp = git(repo, "ls-tree", rev, "--", path, check=False)
    if cp.returncode != 0:
        raise PatchWriteError("TREE_MODE_READ_FAILED")
    if not cp.stdout.strip():
        return None
    return cp.stdout.split(None, 1)[0]


def index_mode(repo: Path, path: str) -> str | None:
    cp = git(repo, "ls-files", "-s", "--", path, check=False)
    if cp.returncode != 0:
        raise PatchWriteError("INDEX_MODE_READ_FAILED")
    if not cp.stdout.strip():
        return None
    rows = [line for line in cp.stdout.splitlines() if line.strip()]
    if len(rows) != 1:
        raise PatchWriteError("INDEX_MODE_AMBIGUOUS")
    return rows[0].split(None, 1)[0]


def validate_staged_change(worktree: Path, expected_paths: list[str]) -> list[str]:
    cp = git(worktree, "diff", "--cached", "--name-status", "-z", "-M")
    statuses = parse_name_status(cp.stdout)
    if not statuses:
        raise PatchWriteError("PATCH_EMPTY_AFTER_APPLY")

    paths: set[str] = set()
    for status, status_paths in statuses:
        for path in status_paths:
            validate_repo_path(path)
            paths.add(path)
        if status.startswith("C"):
            raise PatchWriteError("COPY_PATCH_UNSUPPORTED")

        if status.startswith("R"):
            old, new = status_paths
            before_mode = tree_mode(worktree, "HEAD", old)
            after_mode = index_mode(worktree, new)
            if before_mode != "100644" or after_mode != "100644":
                raise PatchWriteError("SPECIAL_MODE_DENIED")
        else:
            path = status_paths[0]
            before_mode = tree_mode(worktree, "HEAD", path)
            after_mode = index_mode(worktree, path)
            modes = {m for m in (before_mode, after_mode) if m is not None}
            if not modes or modes - {"100644"}:
                raise PatchWriteError("SPECIAL_MODE_DENIED")

    actual = sorted(paths)
    if actual != sorted(expected_paths):
        raise PatchWriteError(
            "CHANGED_PATH_MISMATCH",
            detail=json.dumps({"expected": sorted(expected_paths), "actual": actual}, separators=(",", ":")),
        )

    summary = git(worktree, "diff", "--cached", "--summary").stdout
    if " mode change " in summary:
        raise PatchWriteError("MODE_CHANGE_DENIED")
    return actual


def apply_request(
    repo: Path,
    remote: str,
    request: dict[str, Any],
    patch_file: Path,
) -> dict[str, Any]:
    branch = request["branch"]
    expected = request["expected_head"]
    validate_branch(branch)

    observed = remote_head(repo, remote, branch)
    if observed is None:
        raise PatchWriteError("TARGET_BRANCH_NOT_FOUND", exit_code=4)
    if observed != expected:
        raise PatchWriteError(
            "EXPECTED_HEAD_MISMATCH",
            detail=json.dumps({"expected": expected, "observed": observed}, separators=(",", ":")),
            exit_code=4,
        )

    patch = load_patch(patch_file, request["patch_sha256"])

    fetch = git(repo, "fetch", "--no-tags", remote, f"refs/heads/{branch}", check=False)
    if fetch.returncode != 0:
        raise PatchWriteError("TARGET_FETCH_FAILED", detail=(fetch.stderr or "")[:500], exit_code=4)
    fetched = git(repo, "rev-parse", "FETCH_HEAD").stdout.strip()
    if fetched != expected:
        raise PatchWriteError("EXPECTED_HEAD_MOVED_DURING_FETCH", exit_code=4)

    temp_root = Path(tempfile.mkdtemp(prefix="repo-patch-write-"))
    worktree = temp_root / "worktree"
    patch_copy = temp_root / "request.patch"
    patch_copy.write_bytes(patch)
    added = False
    try:
        git(repo, "worktree", "add", "--detach", str(worktree), expected)
        added = True
        git(worktree, "config", "user.name", "repo-patch-write[bot]")
        git(worktree, "config", "user.email", "repo-patch-write@users.noreply.github.com")

        check = git(worktree, "apply", "--check", str(patch_copy), check=False)
        if check.returncode != 0:
            raise PatchWriteError("PATCH_DOES_NOT_APPLY", detail=(check.stderr or "")[:800])
        apply = git(worktree, "apply", "--index", str(patch_copy), check=False)
        if apply.returncode != 0:
            raise PatchWriteError("PATCH_APPLY_FAILED", detail=(apply.stderr or "")[:800])

        changed_paths = validate_staged_change(worktree, request["expected_paths"])
        diff_check = git(worktree, "diff", "--cached", "--check", check=False)
        if diff_check.returncode != 0:
            raise PatchWriteError("PATCH_DIFF_CHECK_FAILED", detail=(diff_check.stdout or diff_check.stderr)[:800])

        commit = git(worktree, "commit", "-m", request["message"], check=False)
        if commit.returncode != 0:
            raise PatchWriteError("PATCH_COMMIT_FAILED", detail=(commit.stderr or commit.stdout)[:800])
        new_head = git(worktree, "rev-parse", "HEAD").stdout.strip()
        parent = git(worktree, "rev-parse", "HEAD^").stdout.strip()
        if parent != expected or not SHA40.fullmatch(new_head):
            raise PatchWriteError("PATCH_COMMIT_SHAPE_INVALID")

        before_push = remote_head(repo, remote, branch)
        if before_push != expected:
            raise PatchWriteError(
                "REMOTE_HEAD_MOVED",
                detail=json.dumps({"expected": expected, "observed": before_push}, separators=(",", ":")),
                exit_code=4,
            )

        push = git(worktree, "push", remote, f"{new_head}:refs/heads/{branch}", check=False)
        if push.returncode != 0:
            now = remote_head(repo, remote, branch)
            reason = "REMOTE_HEAD_MOVED" if now != expected else "PUSH_FAILED_NON_RACE"
            raise PatchWriteError(reason, detail=(push.stderr or "")[:800], exit_code=4)

        after_push = remote_head(repo, remote, branch)
        if after_push != new_head:
            raise PatchWriteError(
                "POST_WRITE_HEAD_MISMATCH",
                detail=json.dumps({"expected": new_head, "observed": after_push}, separators=(",", ":")),
                exit_code=5,
            )

        return {
            "disposition": "PATCH_APPLIED",
            "old_head": expected,
            "new_head": new_head,
            "branch": branch,
            "changed_paths": changed_paths,
            "patch_sha256": request["patch_sha256"],
        }
    finally:
        if added:
            git(repo, "worktree", "remove", "--force", str(worktree), check=False)
        shutil.rmtree(temp_root, ignore_errors=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--remote", default="origin")
    parser.add_argument("--request-file", required=True)
    parser.add_argument("--patch-file", required=True)
    parser.add_argument("--result-out")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result_out = Path(args.result_out) if args.result_out else None
    request_file = Path(args.request_file)
    patch_file = Path(args.patch_file)
    repo = Path(args.repo).resolve()
    try:
        if not (repo / ".git").exists() and not (repo / "HEAD").exists():
            raise PatchWriteError("NOT_A_GIT_REPOSITORY")
        request = load_request(request_file)
        result = apply_request(repo, args.remote, request, patch_file)
        write_result(result_out, result)
        return 0
    except PatchWriteError as exc:
        payload = {
            "disposition": "PATCH_REJECTED",
            "reason": exc.reason,
        }
        if exc.detail:
            payload["detail"] = exc.detail
        write_result(result_out, payload)
        return exc.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
