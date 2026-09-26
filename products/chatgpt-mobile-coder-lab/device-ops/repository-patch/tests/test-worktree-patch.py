from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parents[5]
MODULE_PATH = ROOT / "products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-worktree-patch.py"

def load_primitive_without_bytecode(module_path: Path):
    previous_setting = sys.dont_write_bytecode
    try:
        sys.dont_write_bytecode = True
        spec = importlib.util.spec_from_file_location("mcl_worktree_patch", module_path)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.dont_write_bytecode = previous_setting


m = load_primitive_without_bytecode(MODULE_PATH)


def run(cwd: Path, *args: str) -> str:
    cp = subprocess.run(["git", "-C", str(cwd), *args], text=True,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if cp.returncode != 0:
        raise AssertionError(cp.stderr or cp.stdout)
    return cp.stdout.strip()


class WorktreePatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="mcl-worktree-patch-test-"))
        self.remote = self.tmp / "remote.git"
        self.seed = self.tmp / "seed"
        self.worktree = self.tmp / "worktrees" / "case"
        self.tmp.joinpath("worktrees").mkdir()
        subprocess.run(["git", "init", "--bare", str(self.remote)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["git", "init", str(self.seed)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run(self.seed, "config", "user.name", "fixture")
        run(self.seed, "config", "user.email", "fixture@example.invalid")
        (self.seed / "docs").mkdir()
        (self.seed / "docs/demo.txt").write_text("one\n", encoding="utf-8")
        run(self.seed, "add", "docs/demo.txt")
        run(self.seed, "commit", "-m", "base")
        run(self.seed, "branch", "-M", "server/demo")
        run(self.seed, "remote", "add", "origin", str(self.remote))
        run(self.seed, "push", "-u", "origin", "server/demo")
        self.base = run(self.seed, "rev-parse", "HEAD")
        subprocess.run(
            ["git", "clone", "--branch", "server/demo", str(self.remote), str(self.worktree)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        run(self.worktree, "config", "user.name", "fixture")
        run(self.worktree, "config", "user.email", "fixture@example.invalid")
        self.old_root = m.WORKTREE_ROOT
        m.WORKTREE_ROOT = self.worktree.parent
        self.patch = self.tmp / "request.patch"
        self.patch.write_text(
            "diff --git a/docs/demo.txt b/docs/demo.txt\n"
            "--- a/docs/demo.txt\n"
            "+++ b/docs/demo.txt\n"
            "@@ -1 +1 @@\n"
            "-one\n"
            "+two\n",
            encoding="utf-8",
        )
        patch_hash = hashlib.sha256(self.patch.read_bytes()).hexdigest()
        self.request = {
            "schema": "mcl-repository-patch-request.v1",
            "message": "docs: update demo",
            "expected_paths": ["docs/demo.txt"],
            "patch_sha256": patch_hash,
        }
        self.request_file = self.tmp / "request.json"
        self.request_file.write_text(json.dumps(self.request), encoding="utf-8")

    def tearDown(self):
        m.WORKTREE_ROOT = self.old_root
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_test_loader_does_not_write_source_bytecode_and_restores_setting(self):
        source_root = self.tmp / "loader-source"
        primitive = source_root / MODULE_PATH.relative_to(ROOT)
        helper = source_root / "tools/repo-write/patch_branch.py"
        primitive.parent.mkdir(parents=True)
        helper.parent.mkdir(parents=True)
        shutil.copy2(MODULE_PATH, primitive)
        shutil.copy2(ROOT / "tools/repo-write/patch_branch.py", helper)
        before = sorted(path.relative_to(source_root) for path in source_root.rglob("*.pyc"))
        self.assertEqual(before, [])
        previous_setting = sys.dont_write_bytecode
        try:
            sys.dont_write_bytecode = False
            loaded = load_primitive_without_bytecode(primitive)
            self.assertEqual(loaded.__file__, str(primitive))
            self.assertFalse(sys.dont_write_bytecode)
        finally:
            sys.dont_write_bytecode = previous_setting
        after = sorted(path.relative_to(source_root) for path in source_root.rglob("*.pyc"))
        self.assertEqual(after, before)

    def test_helper_import_does_not_write_source_bytecode(self):
        source_root = self.tmp / "source"
        primitive = source_root / MODULE_PATH.relative_to(ROOT)
        helper = source_root / "tools/repo-write/patch_branch.py"
        primitive.parent.mkdir(parents=True)
        helper.parent.mkdir(parents=True)
        shutil.copy2(MODULE_PATH, primitive)
        shutil.copy2(ROOT / "tools/repo-write/patch_branch.py", helper)
        before = sorted(path.relative_to(source_root) for path in source_root.rglob("*.pyc"))
        self.assertEqual(before, [])
        env = os.environ.copy()
        env.pop("PYTHONDONTWRITEBYTECODE", None)
        env.pop("PYTHONPYCACHEPREFIX", None)
        result = subprocess.run(
            [sys.executable, str(primitive), "--help"],
            cwd="/", env=env, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        after = sorted(path.relative_to(source_root) for path in source_root.rglob("*.pyc"))
        self.assertEqual(after, before)

    def test_helper_import_restores_bytecode_setting_on_failure(self):
        bad_helper = self.tmp / "bad_patch_writer.py"
        bad_helper.write_text("raise RuntimeError('blocked loader')\n", encoding="utf-8")
        previous_writer = m.PATCH_WRITER
        previous_setting = sys.dont_write_bytecode
        try:
            m.PATCH_WRITER = bad_helper
            sys.dont_write_bytecode = False
            with self.assertRaisesRegex(RuntimeError, "blocked loader"):
                m.load_patch_writer()
            self.assertFalse(sys.dont_write_bytecode)
        finally:
            m.PATCH_WRITER = previous_writer
            sys.dont_write_bytecode = previous_setting

    def test_request_schema_is_strict(self):
        parsed = m.load_request(self.request_file)
        self.assertEqual(parsed["expected_paths"], ["docs/demo.txt"])
        bad = dict(self.request, branch="server/demo")
        self.request_file.write_text(json.dumps(bad), encoding="utf-8")
        with self.assertRaisesRegex(m.PatchOwnerError, "INVALID_REQUEST_FILE"):
            m.load_request(self.request_file)

    def test_non_server_and_landing_branches_are_denied(self):
        with self.assertRaisesRegex(m.PatchOwnerError, "WORKSPACE_BRANCH_INVALID"):
            m.validate_branch("agent-patch/demo")
        with self.assertRaisesRegex(m.PatchOwnerError, "WORKSPACE_BRANCH_INVALID"):
            m.validate_branch("server/work")

    def test_prepare_only_stages_patch(self):
        req = m.load_request(self.request_file)
        out = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(out["phase"], "PREPARE")
        self.assertEqual(run(self.worktree, "rev-parse", "HEAD"), self.base)
        self.assertEqual(run(self.worktree, "diff", "--cached", "--name-only"), "docs/demo.txt")
        remote_head = subprocess.run(
            ["git", "ls-remote", str(self.remote), "refs/heads/server/demo"],
            text=True, stdout=subprocess.PIPE, check=True,
        ).stdout.split()[0]
        self.assertEqual(remote_head, self.base)

    def test_commit_creates_one_child_without_push(self):
        req = m.load_request(self.request_file)
        prepared = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        committed = m.commit(
            self.worktree, "server/demo", self.base, req, prepared["prepared_digest"])
        self.assertEqual(committed["status"], "PASS")
        self.assertNotEqual(committed["new_head"], self.base)
        self.assertEqual(run(self.worktree, "rev-parse", "HEAD^"), self.base)
        remote_head = subprocess.run(
            ["git", "ls-remote", str(self.remote), "refs/heads/server/demo"],
            text=True, stdout=subprocess.PIPE, check=True,
        ).stdout.split()[0]
        self.assertEqual(remote_head, self.base)

    def test_push_updates_only_exact_remote_old_head(self):
        req = m.load_request(self.request_file)
        prepared = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        committed = m.commit(
            self.worktree, "server/demo", self.base, req, prepared["prepared_digest"])
        pushed = m.push(
            self.worktree, "server/demo", self.base, req,
            prepared["prepared_digest"], committed["new_head"])
        self.assertEqual(pushed["status"], "PASS")
        remote_head = subprocess.run(
            ["git", "ls-remote", str(self.remote), "refs/heads/server/demo"],
            text=True, stdout=subprocess.PIPE, check=True,
        ).stdout.split()[0]
        self.assertEqual(remote_head, committed["new_head"])

    def test_stale_remote_blocks_push(self):
        req = m.load_request(self.request_file)
        prepared = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        committed = m.commit(
            self.worktree, "server/demo", self.base, req, prepared["prepared_digest"])
        other = self.tmp / "other"
        subprocess.run(
            ["git", "clone", "--branch", "server/demo", str(self.remote), str(other)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        run(other, "config", "user.name", "fixture")
        run(other, "config", "user.email", "fixture@example.invalid")
        (other / "other.txt").write_text("other\n", encoding="utf-8")
        run(other, "add", "other.txt")
        run(other, "commit", "-m", "concurrent")
        run(other, "push", "origin", "server/demo")
        with self.assertRaisesRegex(m.PatchOwnerError, "REMOTE_HEAD_MOVED"):
            m.push(
                self.worktree, "server/demo", self.base, req,
                prepared["prepared_digest"], committed["new_head"])

    def test_dirty_workspace_blocks_prepare(self):
        (self.worktree / "foreign.txt").write_text("x\n", encoding="utf-8")
        req = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PatchOwnerError, "WORKTREE_NOT_CLEAN"):
            m.prepare(self.worktree, "server/demo", self.base, req, self.patch)

    def test_wrong_patch_hash_blocks(self):
        req = dict(self.request, patch_sha256="0" * 64)
        self.request_file.write_text(json.dumps(req), encoding="utf-8")
        parsed = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PATCH.PatchWriteError, "PATCH_HASH_MISMATCH"):
            m.prepare(self.worktree, "server/demo", self.base, parsed, self.patch)

    def test_path_mismatch_blocks_after_apply(self):
        req = dict(self.request, expected_paths=["docs/other.txt"])
        self.request_file.write_text(json.dumps(req), encoding="utf-8")
        parsed = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PatchOwnerError, "CHANGED_PATH_MISMATCH"):
            m.prepare(self.worktree, "server/demo", self.base, parsed, self.patch)

    def test_binary_patch_is_rejected(self):
        self.patch.write_bytes(b"diff --git a/x b/x\nGIT binary patch\n\x00")
        req = dict(self.request, patch_sha256=hashlib.sha256(self.patch.read_bytes()).hexdigest())
        self.request_file.write_text(json.dumps(req), encoding="utf-8")
        parsed = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PATCH.PatchWriteError, "BINARY_PATCH_DENIED"):
            m.prepare(self.worktree, "server/demo", self.base, parsed, self.patch)

    def test_prepared_digest_detects_index_drift(self):
        req = m.load_request(self.request_file)
        prepared = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        (self.worktree / "docs/demo.txt").write_text("three\n", encoding="utf-8")
        run(self.worktree, "add", "docs/demo.txt")
        with self.assertRaisesRegex(m.PatchOwnerError, "PREPARED_DIGEST_CONFLICT"):
            m.commit(
                self.worktree, "server/demo", self.base, req,
                prepared["prepared_digest"])

    def test_wrong_worktree_root_is_denied(self):
        m.WORKTREE_ROOT = self.tmp / "different-root"
        with self.assertRaisesRegex(m.PatchOwnerError, "WORKTREE_ROOT_INVALID"):
            m.validate_worktree(self.worktree, "server/demo", self.base)

    def test_wrong_head_blocks_prepare(self):
        req = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PatchOwnerError, "WORKTREE_HEAD_CONFLICT"):
            m.prepare(self.worktree, "server/demo", "0" * 40, req, self.patch)

    def test_special_mode_patch_is_rejected(self):
        self.patch.write_text(
            "diff --git a/docs/demo.txt b/docs/demo.txt\n"
            "old mode 100644\n"
            "new mode 100755\n",
            encoding="utf-8",
        )
        req = dict(self.request, patch_sha256=hashlib.sha256(self.patch.read_bytes()).hexdigest())
        self.request_file.write_text(json.dumps(req), encoding="utf-8")
        parsed = m.load_request(self.request_file)
        with self.assertRaisesRegex(m.PatchOwnerError, "SPECIAL_MODE_DENIED"):
            m.prepare(self.worktree, "server/demo", self.base, parsed, self.patch)

    def test_push_rejects_commit_that_no_longer_matches_prepared_digest(self):
        req = m.load_request(self.request_file)
        prepared = m.prepare(self.worktree, "server/demo", self.base, req, self.patch)
        committed = m.commit(
            self.worktree, "server/demo", self.base, req, prepared["prepared_digest"])
        (self.worktree / "docs/demo.txt").write_text("three\n", encoding="utf-8")
        run(self.worktree, "add", "docs/demo.txt")
        run(self.worktree, "commit", "--amend", "--no-edit")
        amended = run(self.worktree, "rev-parse", "HEAD")
        self.assertNotEqual(amended, committed["new_head"])
        with self.assertRaisesRegex(m.PatchOwnerError, "COMMITTED_PATCH_DIGEST_CONFLICT"):
            m.push(
                self.worktree, "server/demo", self.base, req,
                prepared["prepared_digest"], amended)

    def test_result_never_grants_authority(self):
        payload = m.result("PREPARE", "PASS", request=self.request, base_sha=self.base,
                           branch="server/demo", changed_paths=["docs/demo.txt"],
                           prepared_digest="a" * 64)
        self.assertTrue(all(value is False for value in payload["authority"].values()))
        self.assertEqual(payload["details"], "withheld")


if __name__ == "__main__":
    unittest.main()
