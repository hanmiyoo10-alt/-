#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HELPER = Path(__file__).with_name("repo-actionlint-delta.py").resolve()
CLEAN = "name: test\non: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n"


def run(cwd: Path, *args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(
        args,
        cwd=cwd,
        env=merged,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def git(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    cp = run(cwd, "git", *args)
    if cp.returncode != 0:
        raise AssertionError(cp.stderr or cp.stdout)
    return cp


def commit(repo: Path, message: str, *paths: str) -> str:
    git(repo, "add", "--", *paths)
    git(repo, "commit", "-m", message)
    return git(repo, "rev-parse", "HEAD").stdout.strip()


def write(repo: Path, path: str, text: str) -> None:
    target = repo / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def workflow(text: str, *markers: str) -> str:
    suffix = "".join(f"# AL:{marker}\n" for marker in markers)
    return CLEAN + suffix


class ActionlintDeltaTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = self.root / "repo"
        git(self.root, "init", "-b", "main", str(self.repo))
        git(self.repo, "config", "user.name", "test")
        git(self.repo, "config", "user.email", "test@example.com")
        write(self.repo, "README.md", "seed\n")
        self.seed = commit(self.repo, "seed", "README.md")
        self.bindir = self.root / "bin"
        self.bindir.mkdir()
        self._write_fake_tools()
        self.env = {"PATH": f"{self.bindir}{os.pathsep}{os.environ['PATH']}"}

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_fake_tools(self) -> None:
        actionlint = self.bindir / "actionlint"
        actionlint.write_text(
            """#!/usr/bin/env python3
import json, sys
if '-version' in sys.argv:
    print('1.7.12-test')
    raise SystemExit(0)
text = sys.stdin.read()
if 'AL_INVALID_OUTPUT' in text:
    print('not-json')
    raise SystemExit(1)
if 'AL_EXIT_2' in text:
    raise SystemExit(2)
for line_no, line in enumerate(text.splitlines(), 1):
    if line.startswith('# AL:'):
        _, kind, message = line.split(':', 2)
        print(json.dumps({'kind': kind, 'message': message, 'line': line_no, 'column': 1, 'filepath': '<stdin>'}))
raise SystemExit(1 if '# AL:' in text else 0)
""",
            encoding="utf-8",
        )
        actionlint.chmod(0o755)
        shellcheck = self.bindir / "shellcheck"
        shellcheck.write_text(
            "#!/bin/sh\nprintf 'ShellCheck - shell script analysis tool\\nversion: 0.9.0-test\\n'\n",
            encoding="utf-8",
        )
        shellcheck.chmod(0o755)

    def helper(self, base: str, candidate: str, *, env: dict[str, str] | None = None) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
        cp = run(
            self.repo,
            sys.executable,
            str(HELPER),
            "--base",
            base,
            "--candidate",
            candidate,
            env=env or self.env,
        )
        stream = cp.stdout if cp.stdout.strip() else cp.stderr
        return cp, json.loads(stream)

    def add_workflow(self, name: str, text: str, message: str = "workflow") -> str:
        path = f".github/workflows/{name}"
        write(self.repo, path, text)
        return commit(self.repo, message, path)

    def test_no_workflow_changes_is_noop(self) -> None:
        write(self.repo, "notes.txt", "x\n")
        candidate = commit(self.repo, "notes", "notes.txt")
        cp, receipt = self.helper(self.seed, candidate)
        self.assertEqual(cp.returncode, 0)
        self.assertEqual(receipt["result"], "NOOP")
        self.assertEqual(receipt["changedWorkflows"], 0)

    def test_new_clean_workflow_passes(self) -> None:
        candidate = self.add_workflow("new.yml", CLEAN)
        cp, receipt = self.helper(self.seed, candidate)
        self.assertEqual((cp.returncode, receipt["result"], receipt["newDiagnosticCount"]), (0, "PASS", 0))

    def test_new_invalid_workflow_fails(self) -> None:
        candidate = self.add_workflow("bad.yml", workflow(CLEAN, "syntax-check:bad-key"))
        cp, receipt = self.helper(self.seed, candidate)
        self.assertEqual((cp.returncode, receipt["result"], receipt["newDiagnosticCount"]), (1, "FAIL", 1))

    def test_clean_modification_passes(self) -> None:
        base = self.add_workflow("mod.yml", CLEAN, "base")
        write(self.repo, ".github/workflows/mod.yml", CLEAN.replace("name: test", "name: changed"))
        candidate = commit(self.repo, "candidate", ".github/workflows/mod.yml")
        cp, receipt = self.helper(base, candidate)
        self.assertEqual((cp.returncode, receipt["result"]), (0, "PASS"))

    def test_preexisting_diagnostic_line_drift_is_not_new(self) -> None:
        base = self.add_workflow("noise.yml", workflow(CLEAN, "permissions:known-noise"), "base")
        text = CLEAN.replace("jobs:\n", "# shifted\njobs:\n") + "# AL:permissions:known-noise\n"
        write(self.repo, ".github/workflows/noise.yml", text)
        candidate = commit(self.repo, "candidate", ".github/workflows/noise.yml")
        cp, receipt = self.helper(base, candidate)
        self.assertEqual((cp.returncode, receipt["newDiagnosticCount"]), (0, 0))

    def test_candidate_only_diagnostic_is_new(self) -> None:
        base = self.add_workflow("delta.yml", workflow(CLEAN, "permissions:known-noise"), "base")
        write(
            self.repo,
            ".github/workflows/delta.yml",
            workflow(CLEAN, "permissions:known-noise", "syntax-check:new-error"),
        )
        candidate = commit(self.repo, "candidate", ".github/workflows/delta.yml")
        cp, receipt = self.helper(base, candidate)
        self.assertEqual((cp.returncode, receipt["newDiagnosticCount"]), (1, 1))
        self.assertEqual(receipt["files"][0]["newDiagnostics"], [{"kind": "syntax-check", "message": "new-error"}])

    def test_disappearing_diagnostic_is_improvement(self) -> None:
        base = self.add_workflow("better.yml", workflow(CLEAN, "permissions:old-noise"), "base")
        write(self.repo, ".github/workflows/better.yml", CLEAN)
        candidate = commit(self.repo, "candidate", ".github/workflows/better.yml")
        cp, receipt = self.helper(base, candidate)
        self.assertEqual((cp.returncode, receipt["result"], receipt["newDiagnosticCount"]), (0, "PASS", 0))

    def test_deleted_workflow_is_reported_without_lint(self) -> None:
        base = self.add_workflow("gone.yml", workflow(CLEAN, "x:y"), "base")
        (self.repo / ".github/workflows/gone.yml").unlink()
        candidate = commit(self.repo, "delete", ".github/workflows/gone.yml")
        cp, receipt = self.helper(base, candidate)
        self.assertEqual(cp.returncode, 0)
        self.assertEqual(receipt["files"][0]["disposition"], "DELETED_NOT_LINTED")

    def test_rename_preserves_provenance_and_delta(self) -> None:
        base = self.add_workflow("old.yml", workflow(CLEAN, "permissions:known-noise"), "base")
        git(self.repo, "mv", ".github/workflows/old.yml", ".github/workflows/new.yml")
        candidate = commit(self.repo, "rename", ".github/workflows/new.yml")
        cp, receipt = self.helper(base, candidate)
        record = receipt["files"][0]
        self.assertEqual((cp.returncode, record["change"]), (0, "renamed"))
        self.assertEqual(record["basePath"], ".github/workflows/old.yml")
        self.assertEqual(record["candidatePath"], ".github/workflows/new.yml")
        self.assertEqual(receipt["newDiagnosticCount"], 0)

    def test_invalid_actionlint_output_fails_closed(self) -> None:
        candidate = self.add_workflow("invalid.yml", CLEAN + "# AL_INVALID_OUTPUT\n")
        cp, receipt = self.helper(self.seed, candidate)
        self.assertEqual(cp.returncode, 3)
        self.assertEqual(receipt["result"], "ERROR")
        self.assertEqual(receipt["errorCode"], "ACTIONLINT_OUTPUT_INVALID")

    def test_actionlint_execution_failure_fails_closed(self) -> None:
        candidate = self.add_workflow("exec.yml", CLEAN + "# AL_EXIT_2\n")
        cp, receipt = self.helper(self.seed, candidate)
        self.assertEqual(cp.returncode, 3)
        self.assertEqual(receipt["errorCode"], "ACTIONLINT_EXECUTION_FAILED")

    def test_missing_actionlint_is_configuration_error(self) -> None:
        candidate = self.add_workflow("missing.yml", CLEAN)
        no_actionlint = self.root / "no-actionlint"
        no_actionlint.mkdir()
        os.symlink(shutil.which("git"), no_actionlint / "git")
        cp, receipt = self.helper(
            self.seed,
            candidate,
            env={"PATH": str(no_actionlint)},
        )
        self.assertEqual(cp.returncode, 2)
        self.assertEqual(receipt["errorCode"], "ACTIONLINT_NOT_FOUND")

    def test_helper_does_not_mutate_worktree(self) -> None:
        base = self.add_workflow("stable.yml", workflow(CLEAN, "permissions:known-noise"), "base")
        write(self.repo, ".github/workflows/stable.yml", CLEAN)
        candidate = commit(self.repo, "candidate", ".github/workflows/stable.yml")
        before = git(self.repo, "status", "--porcelain=v1", "--untracked-files=all").stdout
        cp, _ = self.helper(base, candidate)
        after = git(self.repo, "status", "--porcelain=v1", "--untracked-files=all").stdout
        self.assertEqual(cp.returncode, 0)
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
