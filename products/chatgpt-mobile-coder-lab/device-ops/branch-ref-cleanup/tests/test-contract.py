#!/usr/bin/env python3
import importlib.machinery
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "mcl-branch-ref-cleanup"
loader = importlib.machinery.SourceFileLoader("branch_ref_cleanup", str(SCRIPT))
spec = importlib.util.spec_from_loader(loader.name, loader)
branch_ref_cleanup = importlib.util.module_from_spec(spec)
loader.exec_module(branch_ref_cleanup)

def run(args, *, cwd=None, check=True):
    cp = subprocess.run(
        args, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=False,
    )
    if check and cp.returncode != 0:
        raise AssertionError(cp.stderr or cp.stdout)
    return cp

def git(repo, *args, check=True):
    return run(["git", "-C", str(repo), *args], check=check)

class BranchRefCleanupContractTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mcl-branch-ref-cleanup-test-"))
        self.remote = self.root / "remote.git"
        self.control = self.root / "control"
        run(["git", "init", "--bare", "-q", str(self.remote)])
        run(["git", "init", "-q", str(self.control)])
        git(self.control, "config", "user.name", "test")
        git(self.control, "config", "user.email", "test@example.invalid")
        (self.control / "README").write_text("base\n", encoding="utf-8")
        git(self.control, "add", "README")
        git(self.control, "commit", "-qm", "base")
        git(self.control, "branch", "-m", "server/work")
        self.base = git(self.control, "rev-parse", "HEAD").stdout.strip()
        self.branch = "server/example"
        git(self.control, "branch", self.branch, self.base)
        git(self.control, "remote", "add", "origin", str(self.remote))
        git(self.control, "push", "-q", "origin", f"{self.base}:refs/heads/{self.branch}")
        self.profiles = {
            "S": {
                "control": str(self.control),
                "branch_prefix": "server/",
                "protected_branch": "server/work",
                "protected_landing": None,
            },
        }

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def remote_head(self):
        out = git(
            self.control, "ls-remote", "--heads", "origin",
            f"refs/heads/{self.branch}",
        ).stdout.strip()
        return out.split("\t", 1)[0] if out else None

    def moved_commit(self):
        tree = git(self.control, "rev-parse", f"{self.base}^{{tree}}").stdout.strip()
        return git(
            self.control, "commit-tree", tree, "-p", self.base, "-m", "race",
        ).stdout.strip()

    def inspect(self, branch=None, head=None, executor="S"):
        return branch_ref_cleanup.inspect_target(
            executor,
            branch or self.branch,
            head or self.base,
            profiles=self.profiles,
        )

    def apply(self, **kwargs):
        return branch_ref_cleanup.apply_target(
            "S", self.branch, self.base,
            explicit_apply=True, profiles=self.profiles, **kwargs,
        )

    def test_inspect_is_read_only_and_eligible(self):
        result = self.inspect()
        self.assertTrue(result["eligible"])
        self.assertEqual(result["reasons"], [])
        self.assertEqual(result["observedRemoteHead"], self.base)
        self.assertEqual(result["localBranchHead"], self.base)
        self.assertEqual(self.remote_head(), self.base)

    def test_apply_requires_explicit_flag(self):
        result = branch_ref_cleanup.apply_target(
            "S", self.branch, self.base, profiles=self.profiles,
        )
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("EXPLICIT_APPLY_REQUIRED", result["reasonCodes"])
        self.assertEqual(self.remote_head(), self.base)

    def test_success_deletes_remote_only_and_preserves_local_ref(self):
        before_branch = git(self.control, "branch", "--show-current").stdout.strip()
        before_head = git(self.control, "rev-parse", "HEAD").stdout.strip()
        result = self.apply()
        self.assertEqual(result["status"], "REMOVED")
        self.assertIsNone(self.remote_head())
        self.assertEqual(
            git(self.control, "rev-parse", f"refs/heads/{self.branch}").stdout.strip(),
            self.base,
        )
        self.assertEqual(git(self.control, "branch", "--show-current").stdout.strip(), before_branch)
        self.assertEqual(git(self.control, "rev-parse", "HEAD").stdout.strip(), before_head)
        self.assertEqual(git(self.control, "status", "--porcelain=v1").stdout, "")

    def test_atomic_expected_old_rejects_race(self):
        moved = self.moved_commit()
        def move_remote():
            git(
                self.control, "push", "-q", "origin",
                f"{moved}:refs/heads/{self.branch}",
            )
        result = self.apply(before_delete=move_remote)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("REMOTE_DELETE_REJECTED", result["reasonCodes"])
        self.assertIn("REMOTE_HEAD_MOVED", result["reasonCodes"])
        self.assertEqual(self.remote_head(), moved)
        self.assertEqual(
            git(self.control, "rev-parse", f"refs/heads/{self.branch}").stdout.strip(),
            self.base,
        )

    def test_registered_worktree_blocks(self):
        target = self.root / "linked"
        git(self.control, "worktree", "add", "-q", str(target), self.branch)
        result = self.inspect()
        self.assertFalse(result["eligible"])
        self.assertIn("REGISTERED_WORKTREE_PRESENT", result["reasons"])
        self.assertEqual(self.remote_head(), self.base)

    def test_missing_remote_is_not_success(self):
        git(self.remote, "update-ref", "-d", f"refs/heads/{self.branch}")
        result = self.inspect()
        self.assertFalse(result["eligible"])
        self.assertIn("REMOTE_BRANCH_MISSING", result["reasons"])

    def test_remote_read_failure_is_distinct(self):
        git(self.control, "remote", "remove", "origin")
        result = self.inspect()
        self.assertFalse(result["eligible"])
        self.assertIn("REMOTE_HEAD_READ_FAILED", result["reasons"])
        self.assertNotIn("REMOTE_BRANCH_MISSING", result["reasons"])

    def test_expected_head_mismatch_blocks(self):
        result = self.inspect(head="0" * 40)
        self.assertFalse(result["eligible"])
        self.assertIn("REMOTE_HEAD_MISMATCH", result["reasons"])

    def test_local_branch_missing_blocks(self):
        git(self.control, "branch", "-D", self.branch)
        result = self.inspect()
        self.assertFalse(result["eligible"])
        self.assertIn("LOCAL_BRANCH_REF_MISSING", result["reasons"])
        self.assertEqual(self.remote_head(), self.base)

    def test_wrong_family_and_protected_branch_block(self):
        wrong = self.inspect(branch="mainphone/example")
        self.assertIn("BRANCH_FAMILY_INVALID", wrong["reasons"])
        protected = self.inspect(branch="server/work")
        self.assertIn("PROTECTED_BRANCH_DENIED", protected["reasons"])

    def test_malformed_branch_and_executor_block(self):
        malformed = self.inspect(branch="server/bad..name")
        self.assertIn("BRANCH_INVALID", malformed["reasons"])
        invalid = self.inspect(executor="UNKNOWN")
        self.assertIn("EXECUTOR_INVALID", invalid["reasons"])
    def test_cli_receipt_is_bounded(self):
        code, text = branch_ref_cleanup.run_cli(
            [
                "inspect",
                "--executor", "S",
                "--branch", self.branch,
                "--expected-head", self.base,
            ],
            profiles=self.profiles,
        )
        self.assertEqual(code, 0)
        receipt = json.loads(text)
        self.assertEqual(receipt["schema"], "mcl-branch-ref-cleanup.v1")
        self.assertEqual(receipt["status"], "ELIGIBLE")
        self.assertEqual(receipt["details"], "withheld")
        self.assertEqual(
            receipt["authority"]["repositoryMutationAuthorized"], False,
        )

    def test_cli_rejects_unknown_argument(self):
        code, text = branch_ref_cleanup.run_cli(
            [
                "inspect",
                "--executor", "S",
                "--branch", self.branch,
                "--expected-head", self.base,
                "--repo", "/tmp/other",
            ],
            profiles=self.profiles,
        )
        self.assertEqual(code, 2)
        self.assertIn("ARGUMENT_INVALID", json.loads(text)["reasonCodes"])

    def test_static_effect_surface_is_narrow(self):
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn("--force-with-lease=", source)
        forbidden = [
            '"--force"',
            "'--force'",
            '"fetch"',
            "'fetch'",
            '"reset"',
            "'reset'",
            '"clean"',
            "'clean'",
            '"checkout"',
            "'checkout'",
            '"stash"',
            "'stash'",
            '"worktree", "remove"',
            '"branch", "-D"',
            "shell=True",
            "gh ",
            "api.github.com",
        ]
        for token in forbidden:
            self.assertNotIn(token, source)

if __name__ == "__main__":
    unittest.main()
