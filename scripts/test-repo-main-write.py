#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

HELPER = Path(__file__).with_name("repo-main-write.py").resolve()


def run(cwd: Path, *args: str, check: bool = True, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check, env=merged)


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


def helper(
    repo: Path,
    payload: str,
    allow: list[str],
    *extra: str,
    check: bool = True,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(HELPER), "--commit", payload, "--attempts", "5"]
    for rule in allow:
        cmd += ["--allow", rule]
    cmd += list(extra)
    return run(repo, *cmd, check=check, env=env)


def remote_text(remote: Path, path: str) -> str:
    return git(remote, "show", f"main:{path}").stdout


def remote_refs(remote: Path, prefix: str) -> list[str]:
    got = git(remote, "for-each-ref", "--format=%(refname)", prefix).stdout
    return [line.strip() for line in got.splitlines() if line.strip()]


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


def fake_gh_bin(root: Path) -> Path:
    bindir = root / "fake-gh-bin"
    bindir.mkdir(parents=True, exist_ok=True)
    gh_path = bindir / "gh"
    gh_path.write_text(
        """#!/usr/bin/env python3
import json
import os
import subprocess
import sys

args = sys.argv[1:]
if args[:2] == ['workflow', 'run']:
    raise SystemExit(0)
if args[:2] == ['run', 'list']:
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    print(json.dumps([{'databaseId': 501, 'headSha': sha, 'status': 'completed', 'conclusion': 'success'}]))
    raise SystemExit(0)
if args[:2] == ['run', 'view']:
    print(json.dumps({'status': 'completed', 'conclusion': 'success', 'jobs': [{'name': 'Required', 'conclusion': 'success'}]}))
    raise SystemExit(0)
if args and args[0] == 'api':
    protected = os.environ.get('FAKE_GH_PROTECTED') == '1'
    if protected:
        payload = {
            'protected': True,
            'protection': {
                'required_status_checks': {
                    'enforcement_level': 'everyone',
                    'contexts': [],
                    'checks': [{'context': 'Required', 'app_id': 15368}],
                },
            },
        }
    else:
        payload = {
            'protected': False,
            'protection': {
                'required_status_checks': {
                    'enforcement_level': 'off',
                    'contexts': [],
                    'checks': [],
                },
            },
        }
    print(json.dumps(payload))
    raise SystemExit(0)
print('unexpected fake gh invocation: ' + ' '.join(args), file=sys.stderr)
raise SystemExit(64)
""",
        encoding="utf-8",
    )
    gh_path.chmod(0o755)
    return bindir


def protected_env(bindir: Path, *, enabled: bool) -> dict[str, str]:
    return {
        "PATH": f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}",
        "GH_TOKEN": "test-token",
        "GITHUB_REPOSITORY": "owner/repo",
        "GITHUB_RUN_ID": "4242",
        "GITHUB_RUN_ATTEMPT": "1",
        "FAKE_GH_PROTECTED": "1" if enabled else "0",
    }


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


def test_native_protection_preserves_checked_pr_recovery(root: Path) -> None:
    remote, _ = new_remote(root, "native-protected")
    work = clone(remote, root / "native-protected-work")
    bindir = fake_gh_bin(root)
    base = git(remote, "rev-parse", "refs/heads/main").stdout.strip()
    write(work, "simcore.txt", "simcore-native-recovery\n")
    payload = commit(work, "native recovery payload", "simcore.txt")
    got = helper(
        work,
        payload,
        ["simcore.txt"],
        "--required-workflow", "simcore-ci.yml",
        "--required-profile", "MAIN_HEALTH",
        "--required-job", "Required",
        "--staging-prefix", "test-native",
        check=False,
        env=protected_env(bindir, enabled=True),
    )
    assert got.returncode == 9, (got.stdout, got.stderr)
    assert "MAIN_WRITE_REQUIRED_GATE_PASS" in got.stdout
    assert "MAIN_WRITE_NATIVE_PROTECTION_ACTIVE" in got.stdout
    match = re.search(r"MAIN_WRITE_CHECKED_PR_REQUIRED: base=([0-9a-f]{40}) commit=([0-9a-f]{40}) ref=([^\s]+)", got.stdout)
    assert match, got.stdout
    observed_base, candidate, stage = match.groups()
    assert observed_base == base
    assert git(remote, "rev-parse", "refs/heads/main").stdout.strip() == base
    assert remote_text(remote, "simcore.txt") == "simcore-base\n"
    refs = remote_refs(remote, "refs/heads/test-native/")
    assert refs == [f"refs/heads/{stage}"], refs
    assert git(remote, "rev-parse", refs[0]).stdout.strip() == candidate


def test_native_protection_off_keeps_direct_landing(root: Path) -> None:
    remote, _ = new_remote(root, "native-off")
    work = clone(remote, root / "native-off-work")
    bindir = fake_gh_bin(root)
    write(work, "simcore.txt", "simcore-direct-landing\n")
    payload = commit(work, "direct landing payload", "simcore.txt")
    got = helper(
        work,
        payload,
        ["simcore.txt"],
        "--required-workflow", "simcore-ci.yml",
        "--required-profile", "MAIN_HEALTH",
        "--required-job", "Required",
        "--staging-prefix", "test-native-off",
        env=protected_env(bindir, enabled=False),
    )
    assert got.returncode == 0, (got.stdout, got.stderr)
    assert "MAIN_WRITE_REQUIRED_GATE_PASS" in got.stdout
    assert "MAIN_WRITE_LANDED" in got.stdout
    assert "MAIN_WRITE_CHECKED_PR_REQUIRED" not in got.stdout
    assert remote_text(remote, "simcore.txt") == "simcore-direct-landing\n"
    assert remote_refs(remote, "refs/heads/test-native-off/") == []


def load_helper_module():
    spec = importlib.util.spec_from_file_location("repo_main_write", HELPER)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def gate_args(**overrides):
    values = {
        "required_workflow": "simcore-ci.yml",
        "required_profile": "MAIN_HEALTH",
        "required_job": "Required",
        "github_repository": "owner/repo",
        "branch": "main",
        "gate_timeout_seconds": 30,
        "gate_poll_seconds": 0.2,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def cp(code: int, stdout: str = "", stderr: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(["gh"], code, stdout=stdout, stderr=stderr)


def test_gate_exact_candidate_and_required_job() -> None:
    mod = load_helper_module()
    args = gate_args()
    sequence = [
        cp(0),
        cp(0, json.dumps([{"databaseId": 11, "headSha": "a" * 40, "status": "in_progress", "conclusion": ""}])),
        cp(0, json.dumps({"status": "completed", "conclusion": "success", "jobs": [{"name": "Required", "conclusion": "success"}]})),
    ]
    with patch.object(mod, "gh", side_effect=sequence):
        assert mod.wait_for_gate(args, "stage/ref", "a" * 40) is True


def test_gate_wrong_candidate_not_accepted() -> None:
    mod = load_helper_module()
    args = gate_args()
    with patch.object(mod, "gh", return_value=cp(0, json.dumps([{"databaseId": 11, "headSha": "b" * 40, "status": "completed", "conclusion": "success"}]))), \
         patch.object(mod.time, "sleep", side_effect=lambda _: None), \
         patch.object(mod.time, "monotonic", side_effect=[0, 2]):
        got = mod.find_gate_run(args, "stage/ref", "a" * 40, 1)
        assert got is None


def test_gate_missing_required_job_fails() -> None:
    mod = load_helper_module()
    args = gate_args()
    sequence = [
        cp(0),
        cp(0, json.dumps([{"databaseId": 12, "headSha": "a" * 40, "status": "completed", "conclusion": "success"}])),
        cp(0, json.dumps({"status": "completed", "conclusion": "success", "jobs": [{"name": "Verify", "conclusion": "success"}]})),
    ]
    with patch.object(mod, "gh", side_effect=sequence):
        assert mod.wait_for_gate(args, "stage/ref", "a" * 40) is False


def test_gate_failed_required_job_fails() -> None:
    mod = load_helper_module()
    args = gate_args()
    sequence = [
        cp(0),
        cp(0, json.dumps([{"databaseId": 13, "headSha": "a" * 40, "status": "completed", "conclusion": "failure"}])),
        cp(0, json.dumps({"status": "completed", "conclusion": "failure", "jobs": [{"name": "Required", "conclusion": "failure"}]})),
    ]
    with patch.object(mod, "gh", side_effect=sequence):
        assert mod.wait_for_gate(args, "stage/ref", "a" * 40) is False


def test_native_protection_readback() -> None:
    mod = load_helper_module()
    args = gate_args()
    protected = {
        "protected": True,
        "protection": {
            "required_status_checks": {
                "enforcement_level": "everyone",
                "contexts": [],
                "checks": [{"context": "Required", "app_id": 15368}],
            },
        },
    }
    with patch.object(mod, "gh", return_value=cp(0, json.dumps(protected))):
        got = mod.read_native_protection(args)
    assert got == {
        "protected": True,
        "enforcement": "everyone",
        "requiredPresent": True,
        "nativeRequiredActive": True,
    }


def test_staging_ref_safety() -> None:
    mod = load_helper_module()
    assert mod.safe_ref_prefix("repo-main-write-gate")
    assert mod.safe_ref_prefix("repo/main-write.gate")
    assert not mod.safe_ref_prefix("../bad")
    assert not mod.safe_ref_prefix("bad@{ref")
    assert not mod.safe_ref_prefix("bad ref")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="repo-main-write-test-") as td:
        root = Path(td)
        test_disjoint_stale_bases(root)
        test_reverse_order(root)
        test_actual_push_race_retry(root)
        test_content_conflict(root)
        test_denied_path(root)
        test_native_protection_preserves_checked_pr_recovery(root)
        test_native_protection_off_keeps_direct_landing(root)
    test_gate_exact_candidate_and_required_job()
    test_gate_wrong_candidate_not_accepted()
    test_gate_missing_required_job_fails()
    test_gate_failed_required_job_fails()
    test_native_protection_readback()
    test_staging_ref_safety()
    source = HELPER.read_text(encoding="utf-8")
    assert "--force" not in source
    assert "force-with-lease" not in source
    print("repo main-write coordination self-test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
