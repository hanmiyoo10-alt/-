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

    def test_git_disables_lazy_fetch_replacements_and_ambient_repo_overrides(self):
        completed = subprocess.CompletedProcess(
            args=[],
            returncode=0,
            stdout=b"ok\n",
            stderr=b"",
        )
        ambient = {
            "GIT_DIR": "/tmp/wrong.git",
            "GIT_WORK_TREE": "/tmp/wrong-tree",
            "GIT_COMMON_DIR": "/tmp/wrong-common",
            "GIT_INDEX_FILE": "/tmp/wrong-index",
            "GIT_OBJECT_DIRECTORY": "/tmp/wrong-objects",
            "GIT_ALTERNATE_OBJECT_DIRECTORIES": "/tmp/alternate",
            "GIT_NAMESPACE": "wrong",
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "diff.renameLimit",
            "GIT_CONFIG_VALUE_0": "1",
            "GIT_TRACE": "/tmp/trace.log",
            "GIT_TRACE2_EVENT": "/tmp/trace2.json",
            "GIT_GLOB_PATHSPECS": "1",
        }
        with mock.patch.dict(os.environ, ambient, clear=False):
            with mock.patch.object(
                mv.subprocess,
                "run",
                return_value=completed,
            ) as run:
                self.assertEqual(mv._git(self.repo, "status"), "ok\n")
        env = run.call_args.kwargs["env"]
        self.assertEqual(env["GIT_NO_LAZY_FETCH"], "1")
        self.assertEqual(env["GIT_NO_REPLACE_OBJECTS"], "1")
        self.assertEqual(env["GIT_TERMINAL_PROMPT"], "0")
        self.assertEqual(env["GIT_OPTIONAL_LOCKS"], "0")
        self.assertEqual(env["GIT_LITERAL_PATHSPECS"], "1")
        for key in ambient:
            self.assertNotIn(key, env)

    def test_colon_prefixed_paths_are_treated_as_literal_pathspecs(self):
        self.write(":old/a.txt", "alpha\n")
        base = self.commit("colon base")
        (self.repo / ":old").rename(self.repo / ":new")
        head = self.commit("colon move")
        plan = mv._validate_plan(
            {
                "schema": "termux-migration-plan.v1",
                "old_root": ":old",
                "new_root": ":new",
                "authorized_paths": [":old/**", ":new/**"],
                "expected_changed_file_count": 1,
                "content_edit_relpaths": [],
                "allowed_old_root_relpaths": [],
                "scan_paths": [],
            }
        )
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["base_old_inventory"], ["a.txt"])
        self.assertEqual(result["head_new_inventory"], ["a.txt"])

    def test_automatic_scan_skips_oversized_blob_without_reading_body(self):
        self.write(
            "plugins/termux/demo/large.py",
            "x" * (mv.MAX_SCAN_BYTES + 1),
        )
        base = self.commit("base with large blob")
        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        head = self.commit("move with large scan candidate")
        plan = self.plan(changed_count=1, scan_paths=[])
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "PASS")
        self.assertFalse(
            any(
                f.get("path") == "products/standalone/termux/demo/large.py"
                for f in result["findings"]
            )
        )

    def test_explicit_oversized_scan_path_is_unknown(self):
        self.write(
            "plugins/termux/demo/large.py",
            "x" * (mv.MAX_SCAN_BYTES + 1),
        )
        base = self.commit("base with large blob")
        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        head = self.commit("move with large scan candidate")
        plan = self.plan(
            changed_count=1,
            scan_paths=["products/standalone/termux/demo/large.py"],
        )
        with self.assertRaises(mv.ValidationUnknown):
            mv.validate(self.repo, base, head, plan)

    def test_diff_includes_gitlink_changes_even_when_config_ignores_submodules(self):
        self.write("seed.txt", "one\n")
        seed_one = self.commit("seed one")
        self.write("seed.txt", "two\n")
        seed_two = self.commit("seed two")

        self.write("plugins/termux/demo/a.txt", "alpha\n")
        git(self.repo, "add", "-A")
        subprocess.run(
            ["git", "-C", str(self.repo), "update-index", "--add", "--index-info"],
            input=f"160000 {seed_one}\tvendor/lib\n",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        git(self.repo, "commit", "-m", "base with gitlink")
        base = git(self.repo, "rev-parse", "HEAD")

        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        git(self.repo, "add", "-A")
        subprocess.run(
            ["git", "-C", str(self.repo), "update-index", "--add", "--index-info"],
            input=f"160000 {seed_two}\tvendor/lib\n",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        git(self.repo, "commit", "-m", "move plus gitlink update")
        head = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "config", "diff.ignoreSubmodules", "all")

        plan = self.plan(changed_count=2, scan_paths=[])
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "FAIL")
        finding = next(
            f
            for f in result["findings"]
            if f["reason"] == "CHANGED_PATH_OUTSIDE_AUTHORIZED_SCOPE"
        )
        self.assertIn("vendor/lib", finding["paths"])

    def test_diff_output_is_bounded_before_materializing_unbounded_payload(self):
        self.write("plugins/termux/demo/a.txt", "alpha\n")
        base = self.commit("base")
        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        head = self.commit("move")
        plan = self.plan(changed_count=1, scan_paths=[])

        with mock.patch.object(mv, "MAX_DIFF_OUTPUT_BYTES", 8):
            with self.assertRaises(mv.ValidationUnknown):
                mv.validate(self.repo, base, head, plan)

    def test_missing_auto_scan_blob_is_unknown(self):
        self.write("plugins/termux/demo/a.py", "print('x')\n")
        base = self.commit("base")
        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        head = self.commit("move")
        plan = self.plan(changed_count=1, scan_paths=[])

        entry = mv._tree_entry(
            self.repo,
            mv._resolve_commit(self.repo, head, "head_ref"),
            "products/standalone/termux/demo/a.py",
        )
        object_path = (
            self.repo / ".git" / "objects" / entry["oid"][:2] / entry["oid"][2:]
        )
        self.assertTrue(object_path.exists())
        object_path.unlink()

        with self.assertRaises(mv.ValidationUnknown):
            mv.validate(self.repo, base, head, plan)

    def test_noncanonical_authorization_scope_is_unknown(self):
        with self.assertRaises(mv.ValidationUnknown):
            self.plan(
                authorized_paths=[
                    "plugins/termux/demo/**",
                    "products/standalone/termux/demo/** ",
                ]
            )
        with self.assertRaises(mv.ValidationUnknown):
            self.plan(
                authorized_paths=[
                    "plugins/termux/demo/**",
                    "products//standalone/termux/demo/**",
                ]
            )

    def test_boolean_changed_file_count_is_unknown(self):
        with self.assertRaises(mv.ValidationUnknown):
            self.plan(changed_count=True)

    def test_replacement_object_does_not_change_validation_evidence(self):
        base = self.base_repo()
        head = self.move_tree()

        git(self.repo, "checkout", "-b", "replacement", base)
        self.write("plugins/termux/demo/a.txt", "replacement\n")
        replacement = self.commit("replacement")
        git(self.repo, "replace", base, replacement)

        result = mv.validate(self.repo, base, head, self.plan())
        self.assertEqual(result["status"], "WARN")
        self.assertFalse(
            any(
                f["reason"] == "BYTE_PARITY_MISMATCH"
                for f in result["findings"]
            )
        )

    def test_rename_detection_ignores_low_configured_limit(self):
        for index, ch in enumerate(("A", "B", "C")):
            self.write(
                f"plugins/termux/demo/file-{index}.txt",
                ch * 2000 + "\n",
            )
        base = self.commit("base three")

        old = self.repo / "plugins/termux/demo"
        new = self.repo / "products/standalone/termux/demo"
        new.parent.mkdir(parents=True, exist_ok=True)
        old.rename(new)
        for index in range(3):
            p = new / f"file-{index}.txt"
            p.write_text(p.read_text(encoding="utf-8") + "edited\n", encoding="utf-8")
        head = self.commit("edited moves")
        git(self.repo, "config", "diff.renameLimit", "1")

        plan = self.plan(
            changed_count=3,
            content_edit_relpaths=[
                "file-0.txt",
                "file-1.txt",
                "file-2.txt",
            ],
            scan_paths=[],
        )
        result = mv.validate(self.repo, base, head, plan)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["changed_file_count"], 3)
        self.assertTrue(
            all(change["status"].startswith("R") for change in result["changes"])
        )

    def test_changed_file_count_has_bounded_upper_limit(self):
        with self.assertRaises(mv.ValidationUnknown):
            self.plan(changed_count=mv.MAX_CHANGED_FILES + 1)


if __name__ == "__main__":
    unittest.main()
