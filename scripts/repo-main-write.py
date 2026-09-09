#!/usr/bin/env python3
"""Safely integrate one product-owned payload commit onto the latest shared main branch.

Default mode preserves the existing ordinary fast-forward-only writer.
Protected mode first publishes the exact candidate commit to a temporary staging
ref, dispatches a required GitHub Actions workflow on that exact commit, waits
for the required job to pass, confirms main did not move, and then either lands
on an unprotected main or preserves the exact checked ref for a normal PR when
native protection is active.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time


def run_command(args: list[str], *, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        check=check,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )


def git(*args: str, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return run_command(["git", *args], check=check, capture=capture)


def git_checked_quiet(*args: str) -> subprocess.CompletedProcess[str]:
    """Keep routine successful Git output private while preserving failure diagnostics."""
    cp = git(*args, check=False, capture=True)
    if cp.returncode == 0:
        return cp
    print(f"MAIN_WRITE_GIT_COMMAND_FAILED: git {' '.join(args)}", file=sys.stderr)
    if cp.stdout:
        print(cp.stdout.strip(), file=sys.stderr)
    if cp.stderr:
        print(cp.stderr.strip(), file=sys.stderr)
    raise subprocess.CalledProcessError(cp.returncode, cp.args, output=cp.stdout, stderr=cp.stderr)


def gh(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run_command(["gh", *args], check=check, capture=True)


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


def safe_ref_prefix(value: str) -> bool:
    if not value or value.startswith("/") or value.endswith("/") or ".." in value or "@{" in value:
        return False
    return re.fullmatch(r"[A-Za-z0-9._/-]+", value) is not None


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--commit", required=True, help="Already-created payload commit")
    p.add_argument("--allow", action="append", required=True, help="Exact path or directory prefix ending in /")
    p.add_argument("--remote", default="origin")
    p.add_argument("--branch", default="main")
    p.add_argument("--attempts", type=int, default=6)
    p.add_argument("--pre-push-delay", type=float, default=0.0, help=argparse.SUPPRESS)

    p.add_argument("--required-workflow", help="Workflow file/name to dispatch before main update")
    p.add_argument("--required-profile", default="MAIN_HEALTH")
    p.add_argument("--required-job", default="Required")
    p.add_argument("--github-repository", default=os.environ.get("GITHUB_REPOSITORY", ""))
    p.add_argument("--staging-prefix", default="repo-main-write-gate")
    p.add_argument("--gate-timeout-seconds", type=int, default=900)
    p.add_argument("--gate-poll-seconds", type=float, default=5.0)
    p.add_argument("--verify-gate-only", action="store_true", help="Run protected gate proof but do not update main")
    return p.parse_args()


def validate_args(args: argparse.Namespace) -> int:
    if args.attempts < 1 or args.attempts > 20:
        print("MAIN_WRITE_INVALID_ATTEMPTS", file=sys.stderr)
        return 2
    if not args.required_workflow:
        if args.verify_gate_only:
            print("MAIN_WRITE_GATE_CONFIG_INVALID: --verify-gate-only requires --required-workflow", file=sys.stderr)
            return 2
        return 0
    if args.branch != "main":
        print("MAIN_WRITE_GATE_CONFIG_INVALID: protected mode supports main only", file=sys.stderr)
        return 2
    if not safe_ref_prefix(args.staging_prefix):
        print("MAIN_WRITE_GATE_CONFIG_INVALID: unsafe staging prefix", file=sys.stderr)
        return 2
    if not args.github_repository:
        print("MAIN_WRITE_GATE_CONFIG_INVALID: repository missing", file=sys.stderr)
        return 2
    if not (os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")):
        print("MAIN_WRITE_GATE_CONFIG_INVALID: GitHub token missing", file=sys.stderr)
        return 2
    if shutil.which("gh") is None:
        print("MAIN_WRITE_GATE_CONFIG_INVALID: gh CLI missing", file=sys.stderr)
        return 2
    if args.gate_timeout_seconds < 30 or args.gate_timeout_seconds > 3600:
        print("MAIN_WRITE_GATE_CONFIG_INVALID: timeout", file=sys.stderr)
        return 2
    if args.gate_poll_seconds < 0.2 or args.gate_poll_seconds > 60:
        print("MAIN_WRITE_GATE_CONFIG_INVALID: poll interval", file=sys.stderr)
        return 2
    return 0


def staging_ref(prefix: str, candidate: str, attempt: int) -> str:
    run_id = re.sub(r"[^A-Za-z0-9._-]", "-", os.environ.get("GITHUB_RUN_ID", "local"))
    run_attempt = re.sub(r"[^A-Za-z0-9._-]", "-", os.environ.get("GITHUB_RUN_ATTEMPT", "1"))
    nonce = f"{os.getpid()}-{int(time.time() * 1000)}"
    return f"{prefix.rstrip('/')}/{candidate[:12]}-{attempt}-{run_id}-{run_attempt}-{nonce}"


def cleanup_staging(remote: str, ref: str) -> None:
    cp = git("push", remote, "--delete", ref, check=False)
    if cp.returncode != 0:
        print(f"MAIN_WRITE_STAGING_CLEANUP_FAILED: ref={ref}", file=sys.stderr)


def dispatch_required_workflow(args: argparse.Namespace, ref: str) -> bool:
    cp = gh(
        "workflow", "run", args.required_workflow,
        "--repo", args.github_repository,
        "--ref", ref,
        "-f", f"profile={args.required_profile}",
        check=False,
    )
    if cp.returncode != 0:
        print("MAIN_WRITE_GATE_DISPATCH_FAILED", file=sys.stderr)
        if cp.stderr:
            print(cp.stderr.strip(), file=sys.stderr)
        return False
    return True


def find_gate_run(args: argparse.Namespace, ref: str, candidate: str, deadline: float) -> dict | None:
    while time.monotonic() < deadline:
        cp = gh(
            "run", "list",
            "--repo", args.github_repository,
            "--workflow", args.required_workflow,
            "--branch", ref,
            "--event", "workflow_dispatch",
            "--limit", "20",
            "--json", "databaseId,headSha,status,conclusion",
            check=False,
        )
        if cp.returncode != 0:
            time.sleep(args.gate_poll_seconds)
            continue
        try:
            rows = json.loads(cp.stdout or "[]")
        except json.JSONDecodeError:
            rows = []
        matches = [row for row in rows if row.get("headSha") == candidate]
        if len(matches) > 1:
            print("MAIN_WRITE_GATE_RUN_AMBIGUOUS", file=sys.stderr)
            return {"_error": "ambiguous"}
        if len(matches) == 1:
            return matches[0]
        time.sleep(args.gate_poll_seconds)
    print("MAIN_WRITE_GATE_RUN_NOT_FOUND", file=sys.stderr)
    return None


def wait_for_gate(args: argparse.Namespace, ref: str, candidate: str) -> bool:
    if not dispatch_required_workflow(args, ref):
        return False
    deadline = time.monotonic() + args.gate_timeout_seconds
    run = find_gate_run(args, ref, candidate, deadline)
    if not run or run.get("_error"):
        return False
    run_id = str(run["databaseId"])

    while time.monotonic() < deadline:
        cp = gh(
            "run", "view", run_id,
            "--repo", args.github_repository,
            "--json", "status,conclusion,jobs",
            check=False,
        )
        if cp.returncode != 0:
            time.sleep(args.gate_poll_seconds)
            continue
        try:
            data = json.loads(cp.stdout or "{}")
        except json.JSONDecodeError:
            time.sleep(args.gate_poll_seconds)
            continue

        if data.get("status") != "completed":
            time.sleep(args.gate_poll_seconds)
            continue

        if data.get("conclusion") != "success":
            print(f"MAIN_WRITE_GATE_WORKFLOW_FAILED: run={run_id} conclusion={data.get('conclusion')}", file=sys.stderr)
            return False

        jobs = [job for job in data.get("jobs", []) if job.get("name") == args.required_job]
        if not jobs:
            print(f"MAIN_WRITE_REQUIRED_JOB_MISSING: run={run_id} job={args.required_job}", file=sys.stderr)
            return False
        if len(jobs) != 1:
            print(f"MAIN_WRITE_REQUIRED_JOB_MISSING: run={run_id} duplicate_job={args.required_job}", file=sys.stderr)
            return False
        if jobs[0].get("conclusion") != "success":
            print(
                f"MAIN_WRITE_REQUIRED_JOB_FAILED: run={run_id} job={args.required_job} conclusion={jobs[0].get('conclusion')}",
                file=sys.stderr,
            )
            return False

        print(f"MAIN_WRITE_REQUIRED_GATE_PASS: run={run_id} commit={candidate} ref={ref}")
        return True

    print("MAIN_WRITE_GATE_TIMEOUT", file=sys.stderr)
    return False


def read_native_protection(args: argparse.Namespace) -> dict | None:
    cp = gh("api", f"repos/{args.github_repository}/branches/{args.branch}", check=False)
    if cp.returncode != 0:
        print("MAIN_WRITE_PROTECTION_READBACK_FAILED", file=sys.stderr)
        if cp.stderr:
            print(cp.stderr.strip(), file=sys.stderr)
        return None
    try:
        data = json.loads(cp.stdout or "{}")
    except json.JSONDecodeError:
        print("MAIN_WRITE_PROTECTION_READBACK_INVALID", file=sys.stderr)
        return None

    protected = data.get("protected") is True
    status = data.get("protection", {}).get("required_status_checks", {}) or {}
    enforcement = str(status.get("enforcement_level") or "off")
    contexts = [str(value) for value in status.get("contexts", []) if value]
    checks = [
        str(row.get("context") or row.get("name"))
        for row in status.get("checks", [])
        if isinstance(row, dict) and (row.get("context") or row.get("name"))
    ]
    required_present = args.required_job in set(contexts + checks)
    return {
        "protected": protected,
        "enforcement": enforcement,
        "requiredPresent": required_present,
        "nativeRequiredActive": protected and enforcement != "off" and required_present,
    }


def main() -> int:
    args = parse_args()
    invalid = validate_args(args)
    if invalid:
        return invalid

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
        git_checked_quiet("fetch", "--no-tags", args.remote, args.branch)
        base = out("rev-parse", remote_ref)
        git_checked_quiet("checkout", "--detach", base)
        git_checked_quiet("reset", "--hard", base)

        cp = git("cherry-pick", "--no-commit", payload, check=False)
        if cp.returncode != 0:
            conflicts = out("diff", "--name-only", "--diff-filter=U")
            git_checked_quiet("reset", "--hard", base)
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
            git_checked_quiet("reset", "--hard", base)
            print("MAIN_WRITE_PATH_DENIED_AFTER_INTEGRATION: " + ", ".join(denied_replayed), file=sys.stderr)
            return 2

        git_checked_quiet("commit", "-C", payload)
        candidate = out("rev-parse", "HEAD")

        stage = ""
        if args.required_workflow:
            stage = staging_ref(args.staging_prefix, candidate, attempt)
            staged = git("push", args.remote, f"{candidate}:refs/heads/{stage}", check=False)
            if staged.returncode != 0:
                print(f"MAIN_WRITE_STAGING_PUSH_FAILED: ref={stage}", file=sys.stderr)
                if staged.stderr:
                    print(staged.stderr.strip(), file=sys.stderr)
                return 7

            if not wait_for_gate(args, stage, candidate):
                cleanup_staging(args.remote, stage)
                return 8

            git_checked_quiet("fetch", "--no-tags", args.remote, args.branch)
            moved = out("rev-parse", remote_ref)
            if moved != base:
                print(f"MAIN_WRITE_BASE_MOVED_AFTER_GATE: attempt={attempt} old_base={base} new_base={moved}")
                cleanup_staging(args.remote, stage)
                if attempt < args.attempts:
                    time.sleep(min(0.25 * attempt, 1.0))
                continue

            if args.verify_gate_only:
                cleanup_staging(args.remote, stage)
                print(f"MAIN_WRITE_GATE_ONLY_PASS: attempt={attempt} base={base} commit={candidate}")
                return 0

            protection = read_native_protection(args)
            if protection is None:
                cleanup_staging(args.remote, stage)
                return 10
            if protection["protected"] and not protection["nativeRequiredActive"]:
                cleanup_staging(args.remote, stage)
                print(
                    "MAIN_WRITE_PROTECTION_READBACK_AMBIGUOUS: "
                    f"protected=true enforcement={protection['enforcement']} required={protection['requiredPresent']}",
                    file=sys.stderr,
                )
                return 10
            if protection["nativeRequiredActive"]:
                print(
                    "MAIN_WRITE_NATIVE_PROTECTION_ACTIVE: "
                    f"enforcement={protection['enforcement']} required={args.required_job}"
                )
                print(f"MAIN_WRITE_CHECKED_PR_REQUIRED: base={base} commit={candidate} ref={stage}")
                return 9

        if args.pre_push_delay > 0:
            time.sleep(args.pre_push_delay)

        push = git("push", args.remote, f"HEAD:{args.branch}", check=False)
        if push.returncode == 0:
            if stage:
                cleanup_staging(args.remote, stage)
            print(f"MAIN_WRITE_LANDED: attempt={attempt} base={base} commit={candidate}")
            return 0

        git_checked_quiet("fetch", "--no-tags", args.remote, args.branch)
        moved = out("rev-parse", remote_ref)
        if stage:
            cleanup_staging(args.remote, stage)
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