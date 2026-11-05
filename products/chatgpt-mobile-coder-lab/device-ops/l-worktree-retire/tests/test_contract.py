#!/usr/bin/env python3
import importlib.machinery
import importlib.util
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "mcl-l-worktree-retire"
loader = importlib.machinery.SourceFileLoader("mcl_l_worktree_retire", str(SCRIPT))
spec = importlib.util.spec_from_loader(loader.name, loader)
mod = importlib.util.module_from_spec(spec)
loader.exec_module(mod)

def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True).stdout.strip()

class Contract(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="mcl-l-retire-test-"))
        self.remote = self.root / "remote.git"
        self.control = self.root / "control"
        self.worktrees = self.root / "worktrees"
        self.target = self.worktrees / "case"
        run("git", "init", "--bare", str(self.remote))
        run("git", "init", str(self.control))
        run("git", "-C", str(self.control), "config", "user.name", "test")
        run("git", "-C", str(self.control), "config", "user.email", "test@example.invalid")
        (self.control / "a.txt").write_text("a\n")
        run("git", "-C", str(self.control), "add", "a.txt")
        run("git", "-C", str(self.control), "commit", "-m", "init")
        run("git", "-C", str(self.control), "branch", "-M", "main")
        run("git", "-C", str(self.control), "remote", "add", "origin", str(self.remote))
        run("git", "-C", str(self.control), "push", "-u", "origin", "main")
        self.head = run("git", "-C", str(self.control), "rev-parse", "HEAD")
        self.worktrees.mkdir()
        run("git", "-C", str(self.control), "worktree", "add", "-b", "laptop/case",
            str(self.target), self.head)
        run("git", "-C", str(self.control), "push", "origin", "laptop/case")
        self.profile = {
            "control": str(self.control),
            "worktree_root": str(self.worktrees),
            "branch_prefix": "laptop/",
            "remote": "origin",
            "origin_url": str(self.remote),
        }

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_clean_target_is_eligible(self):
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertTrue(row["eligible"])
        self.assertEqual(row["observedHead"], self.head)
        self.assertEqual(row["remoteHead"], self.head)
        self.assertEqual(row["localHead"], self.head)

    def test_invalid_identity_fails_closed(self):
        self.assertFalse(mod.inspect_target("../x", self.head, profile=self.profile)["eligible"])
        self.assertFalse(mod.inspect_target("case", "bad", profile=self.profile)["eligible"])

    def test_dirty_and_holder_block(self):
        (self.target / "dirty.txt").write_text("x")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("WORKTREE_UNTRACKED", row["reasons"])
        os.remove(self.target / "dirty.txt")
        gitdir = Path(run("git", "-C", str(self.target), "rev-parse", "--absolute-git-dir"))
        (gitdir / mod.HOLDER_FILE).write_text("{}")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("WORKSPACE_HOLDER_PRESENT", row["reasons"])

    def test_apply_requires_explicit_flag(self):
        out = mod.apply_target("case", self.head, profile=self.profile)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertIn("EXPLICIT_APPLY_REQUIRED", out["reasonCodes"])

    def test_hidden_index_state_blocks(self):
        run("git", "-C", str(self.target), "update-index", "--assume-unchanged", "a.txt")
        (self.target / "a.txt").write_text("hidden\n")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("WORKTREE_ASSUME_UNCHANGED", row["reasons"])
        run("git", "-C", str(self.target), "update-index", "--no-assume-unchanged", "a.txt")
        run("git", "-C", str(self.target), "checkout", "--", "a.txt")
        run("git", "-C", str(self.target), "update-index", "--skip-worktree", "a.txt")
        (self.target / "a.txt").write_text("hidden-skip\n")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("WORKTREE_SKIP_WORKTREE", row["reasons"])

    def test_distinct_pushurl_blocks_before_removal(self):
        other_remote = self.root / "other.git"
        run("git", "init", "--bare", str(other_remote))
        run("git", "-C", str(self.control), "config", "remote.origin.pushurl", str(other_remote))
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("REMOTE_URL_BINDING_CONFLICT", row["reasons"])
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertTrue(self.target.exists())
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("PRESENT", self.head))

    def test_other_worktree_on_target_branch_blocks(self):
        other = self.worktrees / "other-case"
        run("git", "-C", str(self.control), "worktree", "add", "--force", str(other), "laptop/case")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertIn("BRANCH_REGISTERED_ELSEWHERE", row["reasons"])
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertTrue(self.target.exists())
        self.assertTrue(other.exists())
        self.assertEqual(mod._local_head(self.profile, "laptop/case"), self.head)
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("PRESENT", self.head))

    def test_success_removes_worktree_and_both_refs(self):
        before = mod._landing_snapshot(self.profile)
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "REMOVED")
        self.assertFalse(self.target.exists())
        self.assertIsNone(mod._local_head(self.profile, "laptop/case"))
        state, remote = mod._remote_head(self.profile, "laptop/case")
        self.assertEqual((state, remote), ("MISSING", None))
        self.assertEqual(mod._landing_snapshot(self.profile), before)

    def test_remote_race_blocks_after_worktree_remove(self):
        other = self.root / "other"
        run("git", "clone", str(self.remote), str(other))
        run("git", "-C", str(other), "config", "user.name", "test")
        run("git", "-C", str(other), "config", "user.email", "test@example.invalid")
        run("git", "-C", str(other), "checkout", "laptop/case")
        (other / "b.txt").write_text("b\n")
        run("git", "-C", str(other), "add", "b.txt")
        run("git", "-C", str(other), "commit", "-m", "move")
        moved = run("git", "-C", str(other), "rev-parse", "HEAD")
        def race():
            run("git", "-C", str(other), "push", "origin", "laptop/case")
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile,
                               before_remote_delete=race)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertIn("REMOTE_DELETE_REJECTED", out["reasonCodes"])
        self.assertIn("REMOTE_HEAD_MOVED", out["reasonCodes"])
        self.assertFalse(self.target.exists())
        self.assertEqual(mod._local_head(self.profile, "laptop/case"), self.head)
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("PRESENT", moved))

    def test_symbolic_ref_race_preserves_referent(self):
        main_before = run("git", "-C", str(self.control), "rev-parse", "refs/heads/main")
        def symbolic_race():
            run("git", "-C", str(self.control), "symbolic-ref",
                "refs/heads/laptop/case", "refs/heads/main")
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile,
                               before_local_delete=symbolic_race)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertIn("LOCAL_BRANCH_SYMBOLIC_REF", out["reasonCodes"])
        self.assertEqual(run("git", "-C", str(self.control), "rev-parse", "refs/heads/main"),
                         main_before)
        state = run("git", "-C", str(self.control), "symbolic-ref",
                    "refs/heads/laptop/case")
        self.assertEqual(state, "refs/heads/main")
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("MISSING", None))

    def test_local_race_blocks_expected_old_delete(self):
        alt = run("git", "-C", str(self.control), "rev-parse", "HEAD")
        def race():
            run("git", "-C", str(self.control), "update-ref", "refs/heads/laptop/case", alt + "^{}")
        # Create a distinct commit only after worktree removal is safe.
        # The hook is replaced below with an exact alternate existing commit.
        parent = run("git", "-C", str(self.control), "rev-parse", self.head + "^", cwd=None) if False else None
        # Use an annotated empty commit on a separate temp branch as the competing ref identity.
        run("git", "-C", str(self.control), "branch", "temp-race", self.head)
        run("git", "-C", str(self.control), "checkout", "temp-race")
        run("git", "-C", str(self.control), "commit", "--allow-empty", "-m", "race")
        moved = run("git", "-C", str(self.control), "rev-parse", "HEAD")
        run("git", "-C", str(self.control), "checkout", "main")
        def local_race():
            run("git", "-C", str(self.control), "update-ref",
                "refs/heads/laptop/case", moved, self.head)
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile,
                               before_local_delete=local_race)
        self.assertEqual(out["status"], "BLOCKED")
        self.assertIn("LOCAL_DELETE_REJECTED", out["reasonCodes"])
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("MISSING", None))
        self.assertEqual(mod._local_head(self.profile, "laptop/case"), moved)

    def _delete_remote(self):
        run("git", "-C", str(self.control), "push", "origin", ":refs/heads/laptop/case")

    def _make_stale(self):
        admin = Path(run("git", "-C", str(self.target), "rev-parse", "--absolute-git-dir"))
        shutil.rmtree(self.target)
        run("git", "-C", str(self.control), "worktree", "list", "--porcelain")
        return admin

    def test_present_remote_absent_is_eligible_and_retires(self):
        self._delete_remote()
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertTrue(row["eligible"])
        self.assertEqual(row["residueProfile"], "PRESENT_REMOTE_ABSENT")
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "REMOVED")
        self.assertEqual(out["residueProfile"], "PRESENT_REMOTE_ABSENT")
        self.assertFalse(self.target.exists())
        self.assertIsNone(mod._local_head(self.profile, "laptop/case"))
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("MISSING", None))

    def test_absent_stale_registration_remote_present_retires(self):
        admin = self._make_stale()
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertTrue(row["eligible"])
        self.assertEqual(row["residueProfile"], "ABSENT_STALE_REGISTRATION")
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "REMOVED")
        self.assertEqual(out["residueProfile"], "ABSENT_STALE_REGISTRATION")
        self.assertFalse(admin.exists())
        self.assertIsNone(mod._local_head(self.profile, "laptop/case"))
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("MISSING", None))

    def test_absent_stale_registration_remote_absent_retires(self):
        self._delete_remote()
        self._make_stale()
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertTrue(row["eligible"])
        self.assertEqual(row["residueProfile"], "ABSENT_STALE_REGISTRATION")
        out = mod.apply_target("case", self.head, explicit_apply=True, profile=self.profile)
        self.assertEqual(out["status"], "REMOVED")
        self.assertIsNone(mod._local_head(self.profile, "laptop/case"))
        self.assertEqual(mod._remote_head(self.profile, "laptop/case"), ("MISSING", None))

    def test_stale_dirty_admin_index_blocks(self):
        (self.target / "a.txt").write_text("dirty\n")
        run("git", "-C", str(self.target), "add", "a.txt")
        self._make_stale()
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertFalse(row["eligible"])
        self.assertIn("ADMIN_INDEX_DIRTY", row["reasons"])

    def test_stale_holder_blocks(self):
        admin = Path(run("git", "-C", str(self.target), "rev-parse", "--absolute-git-dir"))
        (admin / mod.HOLDER_FILE).write_text("{}")
        shutil.rmtree(self.target)
        run("git", "-C", str(self.control), "worktree", "list", "--porcelain")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertFalse(row["eligible"])
        self.assertIn("WORKSPACE_HOLDER_PRESENT", row["reasons"])

    def test_stale_ambiguous_admin_mapping_blocks(self):
        admin = self._make_stale()
        duplicate = admin.parent / (admin.name + "-duplicate")
        shutil.copytree(admin, duplicate)
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertFalse(row["eligible"])
        self.assertTrue(
            "ADMIN_IDENTITY_AMBIGUOUS" in row["reasons"]
            or "TARGET_NOT_EXACT_REGISTERED_WORKTREE" in row["reasons"]
        )

    def test_locked_stale_registration_blocks(self):
        run("git", "-C", str(self.control), "worktree", "lock", str(self.target))
        shutil.rmtree(self.target)
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertFalse(row["eligible"])
        self.assertTrue(
            "REGISTRATION_LOCKED" in row["reasons"]
            or "REGISTRATION_NOT_PRUNABLE" in row["reasons"]
        )

    def test_remote_third_head_blocks_before_retirement(self):
        other = self.root / "remote-mover"
        run("git", "clone", str(self.remote), str(other))
        run("git", "-C", str(other), "config", "user.name", "test")
        run("git", "-C", str(other), "config", "user.email", "test@example.invalid")
        run("git", "-C", str(other), "checkout", "laptop/case")
        (other / "remote.txt").write_text("move\n")
        run("git", "-C", str(other), "add", "remote.txt")
        run("git", "-C", str(other), "commit", "-m", "move")
        run("git", "-C", str(other), "push", "origin", "laptop/case")
        row = mod.inspect_target("case", self.head, profile=self.profile)
        self.assertFalse(row["eligible"])
        self.assertIn("REMOTE_HEAD_CONFLICT", row["reasons"])

if __name__ == "__main__":
    unittest.main()
