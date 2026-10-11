import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "migration_validator.py"
SPEC = importlib.util.spec_from_file_location("migration_validator", MODULE_PATH)
mv = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(mv)


def git(repo: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return proc.stdout.strip()


class MigrationValidatorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        git(self.repo, "init")
        git(self.repo, "config", "user.name", "test")
        git(self.repo, "config", "user.email", "test@example.com")

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path: str, content: str):
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def commit(self, message: str) -> str:
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-m", message)
        return git(self.repo, "rev-parse", "HEAD")

    def base_repo(self):
        self.write("plugins/termux/demo/a.txt", "alpha\n")
        self.write(
            "plugins/termux/demo/tests/test_depth.py",
            "from pathlib import Path\nROOT = Path(__file__).resolve().parents[4]\n",
        )
        return self.commit("base")

    def plan(self, changed_count=2, **overrides):
        plan = {
            "schema": "termux-migration-plan.v1",
            "old_root": "plugins/termux/demo",
            "new_root": "products/standalone/termux/demo",
            "authorized_paths": [
                "plugins/termux/demo/**",
                "products/standalone/termux/demo/**",
            ],
            "expected_changed_file_count": changed_count,
            "content_edit_relpaths": [],
            "allowed_old_root_relpaths": [],
            "scan_paths": ["products/standalone/termux/demo/tests/test_depth.py"],
        }
        plan.update(overrides)
        return mv._validate_plan(plan)

    def move_tree(self, edit_depth=False, keep_old=None):
        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        if edit_depth:
            p = new / "tests/test_depth.py"
            p.write_text(
                p.read_text(encoding="utf-8").replace("parents[4]", "parents[5]"),
                encoding="utf-8",
            )
        if keep_old:
            p = self.repo / f"plugins/termux/demo/{keep_old}"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("compat\n", encoding="utf-8")
        return self.commit("move")

    def test_exact_move_passes_with_location_warning(self):
        base = self.base_repo()
        head = self.move_tree()
        result = mv.validate(self.repo, base, head, self.plan())
        self.assertEqual(result["status"], "WARN")
        self.assertTrue(
            any(
                f["reason"] == "FIXED_PARENT_DEPTH_REFERENCE"
                for f in result["findings"]
            )
        )
        self.assertFalse(
            any(
                f["reason"] == "BYTE_PARITY_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_unauthorized_changed_path_fails(self):
        base = self.base_repo()
        self.move_tree()
        self.write("docs/extra.md", "x\n")
        head = self.commit("extra")
        result = mv.validate(self.repo, base, head, self.plan(changed_count=3))
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(
                f["reason"] == "CHANGED_PATH_OUTSIDE_AUTHORIZED_SCOPE"
                for f in result["findings"]
            )
        )

    def test_unauthorized_rename_source_fails_even_when_destination_is_authorized(self):
        self.write("plugins/termux/demo/a.txt", "alpha\n")
        self.write("docs/outside.txt", "outside\n")
        base = self.commit("base")
        new = self.repo / "products/standalone/termux/demo"
        new.mkdir(parents=True, exist_ok=True)
        (self.repo / "plugins/termux/demo/a.txt").rename(new / "a.txt")
        workflow = self.repo / ".github/workflows/outside.txt"
        workflow.parent.mkdir(parents=True, exist_ok=True)
        (self.repo / "docs/outside.txt").rename(workflow)
        head = self.commit("move")
        plan = self.plan(
            changed_count=2,
            authorized_paths=[
                "plugins/termux/demo/**",
                "products/standalone/termux/demo/**",
                ".github/workflows/outside.txt",
            ],
            scan_paths=[],
        )
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "FAIL")
        finding = next(
            f
            for f in result["findings"]
            if f["reason"] == "CHANGED_PATH_OUTSIDE_AUTHORIZED_SCOPE"
        )
        self.assertIn("docs/outside.txt", finding["paths"])

    def test_byte_parity_mismatch_fails(self):
        base = self.base_repo()
        head = self.move_tree(edit_depth=True)
        result = mv.validate(self.repo, base, head, self.plan())
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(
                f["reason"] == "BYTE_PARITY_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_declared_content_edit_is_allowed(self):
        base = self.base_repo()
        head = self.move_tree(edit_depth=True)
        plan = self.plan(content_edit_relpaths=["tests/test_depth.py"])
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "WARN")
        self.assertFalse(
            any(
                f["reason"] == "BYTE_PARITY_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_mode_change_fails_even_when_bytes_match(self):
        self.write("plugins/termux/demo/run.sh", "#!/bin/sh\nexit 0\n")
        os.chmod(self.repo / "plugins/termux/demo/run.sh", 0o755)
        base = self.commit("base executable")
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        (self.repo / "plugins/termux/demo").rename(new)
        os.chmod(new / "run.sh", 0o644)
        head = self.commit("move and drop executable bit")
        plan = self.plan(changed_count=1, scan_paths=[])
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(
                f["reason"] == "TREE_MODE_OR_TYPE_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_unexpected_old_root_residue_fails(self):
        base = self.base_repo()
        head = self.move_tree(keep_old="README.md")
        result = mv.validate(self.repo, base, head, self.plan(changed_count=3))
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(
                f["reason"] == "OLD_ROOT_RESIDUE_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_declared_old_root_residue_is_allowed(self):
        base = self.base_repo()
        head = self.move_tree(keep_old="README.md")
        plan = self.plan(
            changed_count=3,
            allowed_old_root_relpaths=["README.md"],
        )
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "WARN")
        self.assertFalse(
            any(
                f["reason"] == "OLD_ROOT_RESIDUE_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_option_like_ref_is_rejected_before_git_diff(self):
        self.base_repo()
        output = self.repo / "should-not-exist"
        with self.assertRaises(mv.ValidationUnknown):
            mv._resolve_commit(
                self.repo,
                f"--output={output}",
                "base_ref",
            )
        self.assertFalse(output.exists())

    def test_explicit_missing_scan_path_is_unknown(self):
        base = self.base_repo()
        head = self.move_tree()
        plan = self.plan(
            scan_paths=["products/standalone/termux/demo/missing.py"]
        )
        with self.assertRaises(mv.ValidationUnknown):
            mv.validate(self.repo, base, head, plan)

    def test_non_utf8_git_path_decode_is_unknown(self):
        with self.assertRaises(mv.ValidationUnknown):
            mv._zlist(b"good\x00bad-\xff\x00", "git path")

    def test_git_disables_lazy_fetch_and_terminal_prompt(self):
        completed = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout=b"ok\n",
            stderr=b"",
        )
        with mock.patch.object(
            mv.subprocess,
            "run",
            return_value=completed,
        ) as run:
            self.assertEqual(mv._git(self.repo, "status"), "ok\n")
        env = run.call_args.kwargs["env"]
        self.assertEqual(env["GIT_NO_LAZY_FETCH"], "1")
        self.assertEqual(env["GIT_TERMINAL_PROMPT"], "0")


if __name__ == "__main__":
    unittest.main()
