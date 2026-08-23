#!/usr/bin/env python3
"""Safely integrate one product-owned payload commit onto the latest shared main branch.

This helper intentionally uses ordinary fast-forward push semantics. It never force-pushes.
If another writer moves main between fetch and push, the payload is replayed on the new head
and retried. Real content conflicts and path-ownership violations fail closed.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path


def git(*args: str, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        check=check,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def out(*args: str) -> str:
    return git(*args).stdout.strip()


def allowed_path(path: str, allow: list[str]) -> bool:
    for rule in allow:
        rule = rule.strip()
        if not rule:
            continue
        if rule.endswith("/"):
            if path.startswith(rule):
                return True
        elif path == rule:
            return True
    return False


def commit_paths(commit: str) -> list[str]:
    text = out("diff-tree", "--no-commit-id", "--name-only", "-r", f"{commit}^!")
    return [line for line in text.splitlines() if line.strip()]


def integrated_paths(base: str) -> list[str]:
    text = out("diff", "--cached", "--name-only", base, "--")
    return [line for line in text.splitlines() if line.strip()]


def ensure_clean() -> None:
    status = out("status", "--porcelain", "--untracked-files=no")
    if status:
        raise SystemExit(f"MAIN_WRITE_DIRTY_WORKTREE: {status}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--commit", required=True, help="Already-created payload commit")
    p.add_argument("--allow", action="append", required=True, help="Exact path or directory prefix ending in /")
    p.add_argument("--remote", default="origin")
    p.add_argument("--branch", default="main")
    p.add_argument("--attempts", type=int, default=6)
    p.add_argument("--pre-push-delay", type=float, default=0.0, help=argparse.SUPPRESS)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if args.attempts < 1 or args.attempts > 20:
        print("MAIN_WRITE_INVALID_ATTEMPTS", file=sys.stderr)
        return 2

    payload = out("rev-parse", f"{args.commit}^{{commit}}")
    paths = commit_paths(payload)
    denied = [path for path in paths if not allowed_path(path, args.allow)]
    if denied:
        print("MAIN_WRITE_PATH_DENIED: " + ", ".join(denied), file=sys.stderr)
        return 2
    if not paths:
        print("MAIN_WRITE_ALREADY_APPLIED: empty payload")
        return 0

    ensure_clean()
    remote_ref = f"{args.remote}/{args.branch}"

    for attempt in range(1, args.attempts + 1):
        git("fetch", "--no-tags", args.remote, args.branch, capture=False)
        base = out("rev-parse", remote_ref)
        git("checkout", "--detach", base, capture=False)
        git("reset", "--hard", base, capture=False)

        cp = git("cherry-pick", "--no-commit", payload, check=False)
        if cp.returncode != 0:
            conflicts = out("diff", "--name-only", "--diff-filter=U")
            git("reset", "--hard", base, capture=False)
            if conflicts:
                print("MAIN_WRITE_CONTENT_CONFLICT: " + conflicts.replace("\n", ", "), file=sys.stderr)
                return 3
            print("MAIN_WRITE_INTEGRATION_FAILED", file=sys.stderr)
            if cp.stdout:
                print(cp.stdout, file=sys.stderr)
            if cp.stderr:
                print(cp.stderr, file=sys.stderr)
            return 4

        if git("diff", "--quiet", check=False).returncode == 0 and git("diff", "--cached", "--quiet", check=False).returncode == 0:
            print(f"MAIN_WRITE_ALREADY_APPLIED: base={base}")
            return 0

        replayed = integrated_paths(base)
        denied_replayed = [path for path in replayed if not allowed_path(path, args.allow)]
        if denied_replayed:
            git("reset", "--hard", base, capture=False)
            print("MAIN_WRITE_PATH_DENIED_AFTER_INTEGRATION: " + ", ".join(denied_replayed), file=sys.stderr)
            return 2

        git("commit", "-C", payload, capture=False)
        candidate = out("rev-parse", "HEAD")
        if args.pre_push_delay > 0:
            time.sleep(args.pre_push_delay)

        push = git("push", args.remote, f"HEAD:{args.branch}", check=False)
        if push.returncode == 0:
            print(f"MAIN_WRITE_LANDED: attempt={attempt} base={base} commit={candidate}")
            return 0

        git("fetch", "--no-tags", args.remote, args.branch, capture=False)
        moved = out("rev-parse", remote_ref)
        if moved == base:
            print("MAIN_WRITE_PUSH_FAILED_NON_RACE", file=sys.stderr)
            if push.stdout:
                print(push.stdout, file=sys.stderr)
            if push.stderr:
                print(push.stderr, file=sys.stderr)
            return 5

        print(f"MAIN_WRITE_RACE_RETRY: attempt={attempt} old_base={base} new_base={moved}")
        if attempt < args.attempts:
            time.sleep(min(0.25 * attempt, 1.0))

    print("MAIN_WRITE_RETRY_EXHAUSTED", file=sys.stderr)
    return 6


if __name__ == "__main__":
    raise SystemExit(main())
