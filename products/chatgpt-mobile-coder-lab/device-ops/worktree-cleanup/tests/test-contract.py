#!/usr/bin/env python3
import importlib.util
from importlib.machinery import SourceFileLoader
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
SCRIPT = HERE / "mcl-worktree-cleanup"
loader = SourceFileLoader("mcl_worktree_cleanup", str(SCRIPT))
spec = importlib.util.spec_from_loader(loader.name, loader)
mod = importlib.util.module_from_spec(spec)
loader.exec_module(mod)

def git(repo, *args, check=True):
    result = subprocess.run(["git", "-C", str(repo), *args], text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode != 0:
        raise AssertionError(result.stderr)
    return result

class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.control = base / "control"
        self.root = base / "worktrees"
        self.root.mkdir()
        self.control.mkdir()
        git(self.control, "init", "-b", "control")
        git(self.control, "config", "user.email", "test@example.invalid")
        git(self.control, "config", "user.name", "MCL Cleanup Test")
        (self.control / ".gitignore").write_text("ignored.bin\n", encoding="utf-8")
        (self.control / "tracked.txt").write_text("base\n", encoding="utf-8")
        git(self.control, "add", ".gitignore", "tracked.txt")
        git(self.control, "commit", "-m", "base")
        self.base_sha = git(self.control, "rev-parse", "HEAD").stdout.strip()
        self.target_name = "fixture"
        self.target = self.root / self.target_name
        self.branch = "server/fixture"
        git(self.control, "worktree", "add", "-b", self.branch, str(self.target), self.base_sha)
        self.profiles = {
            "S": {"control": str(self.control), "worktree_root": str(self.root),
                  "branch_prefix": "server/", "protected_landing": None},
            "M": {"control": str(self.control), "worktree_root": str(self.root),
                  "branch_prefix": "mainphone/", "protected_landing": str(self.root / "mainphone-work")},
        }

    def tearDown(self):
        self.tmp.cleanup()

    def inspect(self, **kwargs):
        return mod.inspect_target("S", kwargs.get("target", self.target_name),
                                  kwargs.get("branch", self.branch),
                                  kwargs.get("head", self.base_sha), profiles=self.profiles)

    def test_fixed_profiles_and_clean_exact_target(self):
        self.assertEqual(mod.PROFILES["S"]["control"], "/root/nyang-repo")
        self.assertEqual(mod.PROFILES["M"]["protected_landing"], "/data/data/com.termux/files/home/nyang-worktrees/mainphone-work")
        result = self.inspect()
        self.assertTrue(result["eligible"], result)

    def test_inspect_is_read_only(self):
        before = (git(self.control, "worktree", "list", "--porcelain").stdout,
                  git(self.target, "status", "--porcelain=v1", "--ignored=matching").stdout,
                  git(self.control, "rev-parse", f"refs/heads/{self.branch}").stdout)
        self.assertTrue(self.inspect()["eligible"])
        after = (git(self.control, "worktree", "list", "--porcelain").stdout,
                 git(self.target, "status", "--porcelain=v1", "--ignored=matching").stdout,
                 git(self.control, "rev-parse", f"refs/heads/{self.branch}").stdout)
        self.assertEqual(before, after)

    def test_target_path_guards(self):
        self.assertIn("TARGET_BASENAME_INVALID", self.inspect(target="../escape")["reasons"])
        self.assertIn("TARGET_BASENAME_INVALID", self.inspect(target=str(self.target))["reasons"])
        orphan = self.root / "orphan"; orphan.mkdir()
        self.assertIn("TARGET_NOT_REGISTERED", self.inspect(target="orphan")["reasons"])
        alias = self.root / "alias"; alias.symlink_to(self.target)
        self.assertIn("TARGET_SYMLINK_OR_ALIAS", self.inspect(target="alias")["reasons"])

    def test_branch_head_and_ref_guards(self):
        self.assertIn("EXPECTED_BRANCH_FAMILY_INVALID", self.inspect(branch="mainphone/x")["reasons"])
        self.assertIn("TARGET_BRANCH_CONFLICT", self.inspect(branch="server/other")["reasons"])
        self.assertIn("TARGET_HEAD_CONFLICT", self.inspect(head="0" * 40)["reasons"])
        with mock.patch.object(mod, "_branch_ref_sha", return_value="1" * 40):
            self.assertIn("LOCAL_BRANCH_REF_CONFLICT", self.inspect()["reasons"])
        git(self.target, "checkout", "--detach")
        self.assertIn("TARGET_DETACHED", self.inspect()["reasons"])

    def test_dirty_classes_block_without_names(self):
        cases = []
        (self.target / "tracked.txt").write_text("dirty\n", encoding="utf-8")
        cases.append(("WORKTREE_TRACKED_DIRTY", self.inspect()))
        git(self.target, "restore", "tracked.txt")
        (self.target / "tracked.txt").write_text("staged\n", encoding="utf-8"); git(self.target, "add", "tracked.txt")
        cases.append(("WORKTREE_STAGED", self.inspect()))
        git(self.target, "restore", "--staged", "tracked.txt"); git(self.target, "restore", "tracked.txt")
        (self.target / "secret-name.txt").write_text("x", encoding="utf-8")
        cases.append(("WORKTREE_UNTRACKED", self.inspect()))
        (self.target / "secret-name.txt").unlink()
        (self.target / "ignored.bin").write_text("x", encoding="utf-8")
        cases.append(("WORKTREE_IGNORED", self.inspect()))
        for reason, result in cases:
            self.assertIn(reason, result["reasons"])
            receipt = mod._receipt("inspect", "BLOCKED", "S", self.target_name, self.branch, self.base_sha, result["reasons"])
            text = json.dumps(receipt)
            self.assertNotIn("secret-name.txt", text)
            self.assertNotIn(str(self.root), text)

    def test_holder_presence_blocks_and_is_unchanged(self):
        git_dir = Path(git(self.target, "rev-parse", "--absolute-git-dir").stdout.strip())
        holder = git_dir / mod.HOLDER_FILE
        original = b'{"owned":"elsewhere"}\n'
        holder.write_bytes(original)
        result = self.inspect()
        self.assertIn("WORKSPACE_HOLDER_PRESENT", result["reasons"])
        self.assertEqual(holder.read_bytes(), original)

    def test_protected_landing_blocks(self):
        profiles = {"M": {"control": str(self.control), "worktree_root": str(self.root),
                           "branch_prefix": "mainphone/", "protected_landing": str(self.target)}}
        result = mod.inspect_target("M", self.target_name, "mainphone/fixture", self.base_sha, profiles=profiles)
        self.assertIn("PROTECTED_LANDING_TARGET", result["reasons"])

    def test_apply_requires_explicit_flag(self):
        receipt = mod.apply_target("S", self.target_name, self.branch, self.base_sha,
                                   explicit_apply=False, profiles=self.profiles)
        self.assertEqual(receipt["status"], "BLOCKED")
        self.assertIn("EXPLICIT_APPLY_REQUIRED", receipt["reasonCodes"])
        self.assertTrue(self.target.exists())

    def test_apply_reruns_eligibility_and_blocks_race(self):
        def race():
            (self.target / "race.tmp").write_text("x", encoding="utf-8")
        receipt = mod.apply_target("S", self.target_name, self.branch, self.base_sha,
                                   explicit_apply=True, profiles=self.profiles, before_recheck=race)
        self.assertEqual(receipt["status"], "BLOCKED")
        self.assertIn("RECHECK_BLOCKED", receipt["reasonCodes"])
        self.assertIn("WORKTREE_UNTRACKED", receipt["reasonCodes"])
        self.assertTrue(self.target.exists())

    def test_successful_apply_removes_only_worktree_and_preserves_branch(self):
        control_before = mod._repo_snapshot(str(self.control))
        receipt = mod.apply_target("S", self.target_name, self.branch, self.base_sha,
                                   explicit_apply=True, profiles=self.profiles)
        self.assertEqual(receipt["status"], "REMOVED", receipt)
        self.assertFalse(self.target.exists())
        self.assertEqual(git(self.control, "rev-parse", f"refs/heads/{self.branch}").stdout.strip(), self.base_sha)
        self.assertEqual(mod._repo_snapshot(str(self.control)), control_before)
        self.assertNotIn(str(self.target), git(self.control, "worktree", "list", "--porcelain").stdout)

    def test_receipt_is_bounded_and_denies_authority(self):
        (self.target / "private-filename.txt").write_text("x", encoding="utf-8")
        code, text = mod.run_cli(["inspect", "--executor", "S", "--target", self.target_name,
                                  "--expected-branch", self.branch, "--expected-head", self.base_sha], profiles=self.profiles)
        self.assertEqual(code, 2)
        data = json.loads(text)
        self.assertEqual(data["details"], "withheld")
        self.assertFalse(any(data["authority"].values()))
        self.assertNotIn(str(self.root), text)
        self.assertNotIn("private-filename.txt", text)

    def test_cli_has_no_root_or_command_passthrough(self):
        code, text = mod.run_cli(["inspect", "--executor", "S", "--target", self.target_name,
                                  "--expected-branch", self.branch, "--expected-head", self.base_sha,
                                  "--repo", str(self.control)], profiles=self.profiles)
        self.assertEqual(code, 2)
        self.assertIn("ARGUMENT_INVALID", text)

    def test_static_forbidden_effect_surface(self):
        text = SCRIPT.read_text(encoding="utf-8")
        forbidden = ["worktree\", \"prune", "reset\", \"--hard", "clean\", \"-f", "branch\", \"-D",
                     "push\", \"--delete", "rm -rf", "shutil.rmtree", "shell=True", "git clean", "--force"]
        for needle in forbidden:
            self.assertNotIn(needle, text)
        self.assertIn('"worktree", "remove", target', text)

if __name__ == "__main__":
    unittest.main()
