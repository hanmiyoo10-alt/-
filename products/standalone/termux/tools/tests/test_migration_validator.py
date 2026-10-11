import json
import subprocess
import tempfile
import unittest
from pathlib import Path
import importlib.util


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
            any(f["reason"] == "FIXED_PARENT_DEPTH_REFERENCE" for f in result["findings"])
        )
        self.assertFalse(
            any(f["reason"] == "BYTE_PARITY_MISMATCH" for f in result["findings"])
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

    def test_byte_parity_mismatch_fails(self):
        base = self.base_repo()
        head = self.move_tree(edit_depth=True)
        result = mv.validate(self.repo, base, head, self.plan())
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(f["reason"] == "BYTE_PARITY_MISMATCH" for f in result["findings"])
        )

    def test_declared_content_edit_is_allowed(self):
        base = self.base_repo()
        head = self.move_tree(edit_depth=True)
        plan = self.plan(content_edit_relpaths=["tests/test_depth.py"])
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "WARN")
        self.assertFalse(
            any(f["reason"] == "BYTE_PARITY_MISMATCH" for f in result["findings"])
        )

    def test_unexpected_old_root_residue_fails(self):
        base = self.base_repo()
        head = self.move_tree(keep_old="README.md")
        result = mv.validate(self.repo, base, head, self.plan(changed_count=3))
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(
            any(f["reason"] == "OLD_ROOT_RESIDUE_MISMATCH" for f in result["findings"])
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
            any(f["reason"] == "OLD_ROOT_RESIDUE_MISMATCH" for f in result["findings"])
        )


if __name__ == "__main__":
    unittest.main()
