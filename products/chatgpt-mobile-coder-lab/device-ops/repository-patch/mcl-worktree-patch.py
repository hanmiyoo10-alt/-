#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parents[4]
PATCH_WRITER = ROOT / "tools/repo-write/patch_branch.py"
SERVER_BRANCH = re.compile(r"^server/[A-Za-z0-9._/-]+$")
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
MAX_FILES = 20
WORKTREE_ROOT = Path("/root/nyang-worktrees")
AUTHORITY = {
    "repositoryMutationAuthorized": False,
    "deviceMutationAuthorized": False,
    "mergeAuthorized": False,
    "releaseAuthorized": False,
    "productionAuthorized": False,
}


class PatchOwnerError(RuntimeError):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def load_patch_writer():
    spec = importlib.util.spec_from_file_location("repo_patch_write", PATCH_WRITER)
    if spec is None or spec.loader is None:
        raise PatchOwnerError("PATCH_HELPER_LOAD_FAILED")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PATCH = load_patch_writer()


def git(root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        ["git", "-C", str(root), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        env={k: v for k, v in os.environ.items() if k not in {"GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR"}},
    )
    if check and cp.returncode != 0:
        raise PatchOwnerError("GIT_COMMAND_FAILED")
    return cp


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_repo_path(value: str) -> None:
    if not isinstance(value, str) or not value or value.startswith("/") or "\\" in value or "\x00" in value:
        raise PatchOwnerError("INVALID_EXPECTED_PATH")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise PatchOwnerError("INVALID_EXPECTED_PATH")


def load_request(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise PatchOwnerError("INVALID_REQUEST_FILE") from exc
    required = {"schema", "message", "expected_paths", "patch_sha256"}
    if not isinstance(value, dict) or set(value) != required:
        raise PatchOwnerError("INVALID_REQUEST_FILE")
    if value["schema"] != "mcl-repository-patch-request.v1":
        raise PatchOwnerError("REQUEST_SCHEMA_INVALID")
    message = value["message"]
    if not isinstance(message, str) or not (1 <= len(message) <= 200) or "\x00" in message:
        raise PatchOwnerError("INVALID_COMMIT_MESSAGE")
    paths = value["expected_paths"]
    if not isinstance(paths, list) or not (1 <= len(paths) <= MAX_FILES):
        raise PatchOwnerError("INVALID_EXPECTED_PATHS")
    if not all(isinstance(item, str) for item in paths) or len(set(paths)) != len(paths):
        raise PatchOwnerError("INVALID_EXPECTED_PATHS")
    for item in paths:
        validate_repo_path(item)
    patch_hash = value["patch_sha256"]
    if not isinstance(patch_hash, str) or not SHA256.fullmatch(patch_hash):
        raise PatchOwnerError("INVALID_PATCH_HASH")
    return {
        "schema": value["schema"],
        "message": message,
        "expected_paths": sorted(paths),
        "patch_sha256": patch_hash,
    }


def validate_branch(branch: str) -> None:
    if not SERVER_BRANCH.fullmatch(branch) or branch == "server/work":
        raise PatchOwnerError("WORKSPACE_BRANCH_INVALID")
    if ".." in branch or branch.endswith("/") or "//" in branch or "@{" in branch:
        raise PatchOwnerError("WORKSPACE_BRANCH_INVALID")


def validate_worktree(worktree: Path, branch: str, expected_head: str) -> None:
    validate_branch(branch)
    if not worktree.is_absolute() or worktree == WORKTREE_ROOT or WORKTREE_ROOT not in worktree.parents:
        raise PatchOwnerError("WORKTREE_ROOT_INVALID")
    if not worktree.exists() or worktree.is_symlink() or not worktree.is_dir():
        raise PatchOwnerError("WORKTREE_INVALID")
    try:
        real = worktree.resolve(strict=True)
    except OSError as exc:
        raise PatchOwnerError("WORKTREE_REALPATH_FAILED") from exc
    if real != worktree:
        raise PatchOwnerError("WORKTREE_ALIAS_DENIED")
    top = git(worktree, "rev-parse", "--show-toplevel").stdout.strip()
    if top != str(worktree):
        raise PatchOwnerError("WORKTREE_TOPLEVEL_CONFLICT")
    actual_branch = git(worktree, "branch", "--show-current").stdout.strip()
    if actual_branch != branch:
        raise PatchOwnerError("WORKTREE_BRANCH_CONFLICT")
    head = git(worktree, "rev-parse", "HEAD").stdout.strip()
    if head != expected_head:
        raise PatchOwnerError("WORKTREE_HEAD_CONFLICT")


def validate_modes_and_paths(worktree: Path, expected_paths: list[str]) -> list[str]:
    raw = git(worktree, "diff", "--cached", "--name-status", "-z", "-M").stdout
    statuses = PATCH.parse_name_status(raw)
    if not statuses:
        raise PatchOwnerError("PATCH_EMPTY_AFTER_APPLY")
    actual: set[str] = set()
    for status, paths in statuses:
        if status.startswith("C"):
            raise PatchOwnerError("COPY_PATCH_UNSUPPORTED")
        for item in paths:
            validate_repo_path(item)
            actual.add(item)
        if status.startswith("R"):
            old, new = paths
            before = PATCH.tree_mode(worktree, "HEAD", old)
            after = PATCH.index_mode(worktree, new)
            if before != "100644" or after != "100644":
                raise PatchOwnerError("SPECIAL_MODE_DENIED")
        else:
            item = paths[0]
            before = PATCH.tree_mode(worktree, "HEAD", item)
            after = PATCH.index_mode(worktree, item)
            modes = {m for m in (before, after) if m is not None}
            if not modes or modes - {"100644"}:
                raise PatchOwnerError("SPECIAL_MODE_DENIED")
    result = sorted(actual)
    if result != sorted(expected_paths):
        raise PatchOwnerError("CHANGED_PATH_MISMATCH")
    summary = git(worktree, "diff", "--cached", "--summary").stdout
    if " mode change " in summary:
        raise PatchOwnerError("MODE_CHANGE_DENIED")
    return result


def staged_digest(worktree: Path) -> str:
    data = git(worktree, "diff", "--cached", "--binary").stdout.encode("utf-8")
    if not data:
        raise PatchOwnerError("PATCH_EMPTY_AFTER_APPLY")
    return sha256_bytes(data)


def committed_digest(worktree: Path, base_sha: str, new_head: str) -> str:
    data = git(worktree, "diff", "--binary", base_sha, new_head, "--").stdout.encode("utf-8")
    if not data:
        raise PatchOwnerError("COMMITTED_PATCH_EMPTY")
    return sha256_bytes(data)


def validate_committed_paths(worktree: Path, base_sha: str, new_head: str, expected_paths: list[str]) -> list[str]:
    raw = git(worktree, "diff", "--name-status", "-z", "-M", base_sha, new_head, "--").stdout
    statuses = PATCH.parse_name_status(raw)
    if not statuses:
        raise PatchOwnerError("COMMITTED_PATCH_EMPTY")
    actual: set[str] = set()
    for status, paths in statuses:
        if status.startswith("C"):
            raise PatchOwnerError("COPY_PATCH_UNSUPPORTED")
        for item in paths:
            validate_repo_path(item)
            actual.add(item)
        if status.startswith("R"):
            old, new = paths
            before = PATCH.tree_mode(worktree, base_sha, old)
            after = PATCH.tree_mode(worktree, new_head, new)
            if before != "100644" or after != "100644":
                raise PatchOwnerError("SPECIAL_MODE_DENIED")
        else:
            item = paths[0]
            before = PATCH.tree_mode(worktree, base_sha, item)
            after = PATCH.tree_mode(worktree, new_head, item)
            modes = {m for m in (before, after) if m is not None}
            if not modes or modes - {"100644"}:
                raise PatchOwnerError("SPECIAL_MODE_DENIED")
    result = sorted(actual)
    if result != sorted(expected_paths):
        raise PatchOwnerError("CHANGED_PATH_MISMATCH")
    summary = git(worktree, "diff", "--summary", base_sha, new_head, "--").stdout
    if " mode change " in summary:
        raise PatchOwnerError("MODE_CHANGE_DENIED")
    return result


def ensure_no_unstaged_or_untracked(worktree: Path) -> None:
    if git(worktree, "diff", "--name-only").stdout.strip():
        raise PatchOwnerError("UNSTAGED_CHANGE_PRESENT")
    if git(worktree, "ls-files", "--others", "--exclude-standard").stdout.strip():
        raise PatchOwnerError("UNTRACKED_FILE_PRESENT")


def result(phase: str, status: str, *, request: dict[str, Any] | None = None,
           base_sha: str | None = None, branch: str | None = None,
           changed_paths: list[str] | None = None, prepared_digest: str | None = None,
           new_head: str | None = None, reason_codes: list[str] | None = None) -> dict[str, Any]:
    return {
        "schema": "mcl-worktree-patch.v1",
        "status": status,
        "phase": phase,
        "reason_codes": sorted(set(reason_codes or [])),
        "base_sha": base_sha,
        "branch": branch,
        "changed_paths": changed_paths or [],
        "patch_sha256": request["patch_sha256"] if request else None,
        "prepared_digest": prepared_digest,
        "new_head": new_head,
        "authority": dict(AUTHORITY),
        "details": "withheld",
    }


def prepare(worktree: Path, branch: str, base_sha: str, request: dict[str, Any], patch_file: Path) -> dict[str, Any]:
    validate_worktree(worktree, branch, base_sha)
    if git(worktree, "status", "--porcelain=v1", "-uall").stdout:
        raise PatchOwnerError("WORKTREE_NOT_CLEAN")
    observed = PATCH.remote_head(worktree, "origin", branch)
    if observed != base_sha:
        raise PatchOwnerError("REMOTE_HEAD_CONFLICT")
    PATCH.load_patch(patch_file, request["patch_sha256"])
    check = git(worktree, "apply", "--check", str(patch_file), check=False)
    if check.returncode != 0:
        raise PatchOwnerError("PATCH_DOES_NOT_APPLY")
    applied = git(worktree, "apply", "--index", str(patch_file), check=False)
    if applied.returncode != 0:
        raise PatchOwnerError("PATCH_APPLY_FAILED")
    changed = validate_modes_and_paths(worktree, request["expected_paths"])
    diff_check = git(worktree, "diff", "--cached", "--check", check=False)
    if diff_check.returncode != 0:
        raise PatchOwnerError("PATCH_DIFF_CHECK_FAILED")
    ensure_no_unstaged_or_untracked(worktree)
    digest = staged_digest(worktree)
    return result("PREPARE", "PASS", request=request, base_sha=base_sha, branch=branch,
                  changed_paths=changed, prepared_digest=digest)


def commit(worktree: Path, branch: str, base_sha: str, request: dict[str, Any], expected_prepared: str) -> dict[str, Any]:
    if not SHA256.fullmatch(expected_prepared or ""):
        raise PatchOwnerError("PREPARED_DIGEST_INVALID")
    validate_worktree(worktree, branch, base_sha)
    ensure_no_unstaged_or_untracked(worktree)
    changed = validate_modes_and_paths(worktree, request["expected_paths"])
    digest = staged_digest(worktree)
    if digest != expected_prepared:
        raise PatchOwnerError("PREPARED_DIGEST_CONFLICT")
    cp = subprocess.run(
        ["git", "-C", str(worktree),
         "-c", "user.name=mcl-repository-patch[bot]",
         "-c", "user.email=mcl-repository-patch@users.noreply.github.com",
         "commit", "-m", request["message"]],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        env={k: v for k, v in os.environ.items() if k not in {"GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR"}},
    )
    if cp.returncode != 0:
        raise PatchOwnerError("PATCH_COMMIT_FAILED")
    new_head = git(worktree, "rev-parse", "HEAD").stdout.strip()
    parent = git(worktree, "rev-parse", "HEAD^").stdout.strip()
    if not SHA40.fullmatch(new_head) or parent != base_sha:
        raise PatchOwnerError("PATCH_COMMIT_SHAPE_INVALID")
    if git(worktree, "status", "--porcelain=v1", "-uall").stdout:
        raise PatchOwnerError("WORKTREE_NOT_CLEAN_AFTER_COMMIT")
    return result("COMMIT", "PASS", request=request, base_sha=base_sha, branch=branch,
                  changed_paths=changed, prepared_digest=digest, new_head=new_head)


def push(worktree: Path, branch: str, base_sha: str, request: dict[str, Any],
         expected_prepared: str, expected_new_head: str) -> dict[str, Any]:
    if not SHA256.fullmatch(expected_prepared or ""):
        raise PatchOwnerError("PREPARED_DIGEST_INVALID")
    if not SHA40.fullmatch(expected_new_head or ""):
        raise PatchOwnerError("NEW_HEAD_INVALID")
    validate_branch(branch)
    if not worktree.exists() or worktree.is_symlink():
        raise PatchOwnerError("WORKTREE_INVALID")
    top = git(worktree, "rev-parse", "--show-toplevel").stdout.strip()
    actual_branch = git(worktree, "branch", "--show-current").stdout.strip()
    head = git(worktree, "rev-parse", "HEAD").stdout.strip()
    parent = git(worktree, "rev-parse", "HEAD^").stdout.strip()
    if top != str(worktree) or actual_branch != branch:
        raise PatchOwnerError("WORKSPACE_IDENTITY_CONFLICT")
    if head != expected_new_head or parent != base_sha:
        raise PatchOwnerError("LOCAL_HEAD_CONFLICT")
    if git(worktree, "status", "--porcelain=v1", "-uall").stdout:
        raise PatchOwnerError("WORKTREE_NOT_CLEAN")
    changed = validate_committed_paths(worktree, base_sha, expected_new_head, request["expected_paths"])
    if committed_digest(worktree, base_sha, expected_new_head) != expected_prepared:
        raise PatchOwnerError("COMMITTED_PATCH_DIGEST_CONFLICT")
    before = PATCH.remote_head(worktree, "origin", branch)
    if before != base_sha:
        raise PatchOwnerError("REMOTE_HEAD_MOVED")
    cp = git(worktree, "push", "origin", expected_new_head + ":refs/heads/" + branch, check=False)
    if cp.returncode != 0:
        now = PATCH.remote_head(worktree, "origin", branch)
        raise PatchOwnerError("REMOTE_HEAD_MOVED" if now != base_sha else "PUSH_FAILED_NON_RACE")
    after = PATCH.remote_head(worktree, "origin", branch)
    if after != expected_new_head:
        raise PatchOwnerError("POST_WRITE_HEAD_MISMATCH")
    return result("PUSH", "PASS", request=request, base_sha=base_sha, branch=branch,
                  changed_paths=changed, prepared_digest=expected_prepared,
                  new_head=expected_new_head)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["prepare", "commit", "push"])
    parser.add_argument("--worktree", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--request-file", required=True)
    parser.add_argument("--patch-file", required=True)
    parser.add_argument("--prepared-digest")
    parser.add_argument("--new-head")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    phase = args.phase.upper()
    request = None
    try:
        if not SHA40.fullmatch(args.base_sha or ""):
            raise PatchOwnerError("BASE_SHA_INVALID")
        request = load_request(Path(args.request_file))
        worktree = Path(args.worktree)
        patch_file = Path(args.patch_file)
        if args.phase == "prepare":
            payload = prepare(worktree, args.branch, args.base_sha, request, patch_file)
        elif args.phase == "commit":
            payload = commit(worktree, args.branch, args.base_sha, request, args.prepared_digest or "")
        else:
            payload = push(worktree, args.branch, args.base_sha, request,
                           args.prepared_digest or "", args.new_head or "")
        sys.stdout.write(json.dumps(payload, sort_keys=True) + "\n")
        return 0
    except (PatchOwnerError, PATCH.PatchWriteError) as exc:
        reason = exc.reason if hasattr(exc, "reason") else "PATCH_HELPER_FAILED"
        sys.stdout.write(json.dumps(result(phase, "BLOCKED", request=request,
                                           base_sha=args.base_sha, branch=args.branch,
                                           reason_codes=[reason]), sort_keys=True) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
