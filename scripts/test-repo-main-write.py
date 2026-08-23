#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HELPER = Path(__file__).with_name("repo-main-write.py").resolve()


def run(cwd: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)


def git(cwd: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(cwd, "git", *args, check=check)


def config(repo: Path) -> None:
    git(repo, "config", "user.name", "test")
    git(repo, "config", "user.email", "test@example.com")


def write(repo: Path, name: str, text: str) -> None:
    path = repo / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def commit(repo: Path, message: str, *paths: str) -> str:
    git(repo, "add", "--", *paths)
    git(repo, "commit", "-m", message)
    return git(repo, "rev-parse", "HEAD").stdout.strip()


def clone(remote: Path, dest: Path) -> Path:
    git(remote.parent, "clone", str(remote), str(dest))
    config(dest)
    return dest


def helper(repo: Path, payload: str, allow: list[str], *extra: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(HELPER), "--commit", payload, "--attempts", "5"]
    for rule in allow:
        cmd += ["--allow", rule]
    cmd += list(extra)
    return run(repo, *cmd, check=check)


def remote_text(remote: Path, path: str) -> str:
    return git(remote, "show", f"main:{path}").stdout


def new_remote(root: Path, name: str) -> tuple[Path, Path]:
    remote = root / f"{name}.git"
    seed = root / f"{name}-seed"
    git(root, "init", "--bare", str(remote))
    git(root, "clone", str(remote), str(seed))
    config(seed)
    git(seed, "switch", "-c", "main")
    for path, text in {
        "simcore.txt": "simcore-base\n",
        "usage.txt": "usage-base\n",
        "shared.txt": "shared-base\n",
        "denied.txt": "denied-base\n",
    }.items():
        write(seed, path, text)
    commit(seed, "seed", "simcore.txt", "usage.txt", "shared.txt", "denied.txt")
    git(seed, "push", "-u", "origin", "main")
    git(remote, "symbolic-ref", "HEAD", "refs/heads/main")
    return remote, seed


def test_disjoint_stale_bases(root: Path) -> None:
    remote, _ = new_remote(root, "disjoint")
    a = clone(remote, root / "disjoint-a")
    b = clone(remote, root / "disjoint-b")
    write(a, "simcore.txt", "simcore-A\n")
    ca = commit(a, "simcore payload", "simcore.txt")
    write(b, "usage.txt", "usage-B\n")
    cb = commit(b, "usage payload", "usage.txt")
    helper(a, ca, ["simcore.txt"])
    helper(b, cb, ["usage.txt"])
    assert remote_text(remote, "simcore.txt") == "simcore-A\n"
    assert remote_text(remote, "usage.txt") == "usage-B\n"


def test_reverse_order(root: Path) -> None:
    remote, _ = new_remote(root, "reverse")
    a = clone(remote, root / "reverse-a")
    b = clone(remote, root / "reverse-b")
    write(a, "simcore.txt", "simcore-A\n")
    ca = commit(a, "simcore payload", "simcore.txt")
    write(b, "usage.txt", "usage-B\n")
    cb = commit(b, "usage payload", "usage.txt")
    helper(b, cb, ["usage.txt"])
    helper(a, ca, ["simcore.txt"])
    assert remote_text(remote, "simcore.txt") == "simcore-A\n"
    assert remote_text(remote, "usage.txt") == "usage-B\n"


def test_actual_push_race_retry(root: Path) -> None:
    remote, _ = new_remote(root, "race")
    a = clone(remote, root / "race-a")
    b = clone(remote, root / "race-b")
    write(a, "simcore.txt", "simcore-race\n")
    ca = commit(a, "simcore race", "simcore.txt")
    write(b, "usage.txt", "usage-race\n")
    cb = commit(b, "usage race", "usage.txt")

    pa = subprocess.Popen(
        [sys.executable, str(HELPER), "--commit", ca, "--allow", "simcore.txt", "--attempts", "5", "--pre-push-delay", "1.0"],
        cwd=a, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    time.sleep(0.25)
    pb = helper(b, cb, ["usage.txt"])
    ao, ae = pa.communicate(timeout=10)
    assert pb.returncode == 0, (pb.stdout, pb.stderr)
    assert pa.returncode == 0, (ao, ae)
    assert "MAIN_WRITE_RACE_RETRY" in ao, ao
    assert remote_text(remote, "simcore.txt") == "simcore-race\n"
    assert remote_text(remote, "usage.txt") == "usage-race\n"


def test_content_conflict(root: Path) -> None:
    remote, _ = new_remote(root, "conflict")
    a = clone(remote, root / "conflict-a")
    b = clone(remote, root / "conflict-b")
    write(a, "shared.txt", "winner-A\n")
    ca = commit(a, "winner", "shared.txt")
    write(b, "shared.txt", "loser-B\n")
    cb = commit(b, "conflict", "shared.txt")
    helper(a, ca, ["shared.txt"])
    got = helper(b, cb, ["shared.txt"], check=False)
    assert got.returncode == 3, (got.stdout, got.stderr)
    assert "MAIN_WRITE_CONTENT_CONFLICT" in got.stderr
    assert remote_text(remote, "shared.txt") == "winner-A\n"


def test_denied_path(root: Path) -> None:
    remote, _ = new_remote(root, "denied")
    a = clone(remote, root / "denied-a")
    write(a, "denied.txt", "should-not-land\n")
    ca = commit(a, "denied", "denied.txt")
    got = helper(a, ca, ["simcore.txt"], check=False)
    assert got.returncode == 2, (got.stdout, got.stderr)
    assert "MAIN_WRITE_PATH_DENIED" in got.stderr
    assert remote_text(remote, "denied.txt") == "denied-base\n"


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="repo-main-write-test-") as td:
        root = Path(td)
        test_disjoint_stale_bases(root)
        test_reverse_order(root)
        test_actual_push_race_retry(root)
        test_content_conflict(root)
        test_denied_path(root)
    source = HELPER.read_text(encoding="utf-8")
    assert "--force" not in source
    assert "force-with-lease" not in source
    print("repo main-write coordination self-test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
