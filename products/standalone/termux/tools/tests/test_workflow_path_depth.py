import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

TOOLS = Path(__file__).resolve().parents[1]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import workflow_path_depth as wpd
from workflow_path_depth import SCHEMA, check_batch


class WorkflowPathDepthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.temp.name) / "repo"
        self.repo_root.mkdir()
        self.git("init", "-q")
        self.git("config", "user.name", "test")
        self.git("config", "user.email", "test@example.invalid")

        self.write("plugins/termux/large-doc-editor/anchor.txt", "old\n")
        self.write("plugins/termux/example/anchor.txt", "old\n")
        self.write("a/anchor.txt", "old\n")
        self.write(".github/tooling/ci-summary/phase_receipt.py", "print('receipt')\n")
        self.write("shared/helper.py", "print('shared')\n")
        self.commit("old")
        self.old_oid = self.rev()

        self.remove_tree("plugins/termux/large-doc-editor")
        self.remove_tree("plugins/termux/example")
        self.write("products/standalone/termux/large-doc-editor/anchor.txt", "new\n")
        self.write("products/termux/example/anchor.txt", "new\n")
        self.write("b/anchor.txt", "new\n")
        self.commit("new")
        self.new_oid = self.rev()

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args, check=True):
        return subprocess.run(
            ["git", "-C", str(self.repo_root), *args],
            check=check,
            capture_output=True,
            text=True,
        )

    def rev(self):
        return self.git("rev-parse", "HEAD").stdout.strip()

    def write(self, rel, text):
        path = self.repo_root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def remove_tree(self, rel):
        path = self.repo_root / rel
        if not path.exists() and not path.is_symlink():
            return
        if path.is_symlink() or path.is_file():
            path.unlink()
            return
        for child in sorted(path.rglob("*"), reverse=True):
            if child.is_symlink() or child.is_file():
                child.unlink()
            else:
                child.rmdir()
        path.rmdir()

    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def batch(self, references, old_ref=None, new_ref=None):
        return check_batch({
            "schema": SCHEMA,
            "repo_root": str(self.repo_root),
            "old_ref": old_ref or self.old_oid,
            "new_ref": new_ref or self.new_oid,
            "references": references,
        })

    def check(self, item, old_ref=None, new_ref=None):
        out = self.batch([item], old_ref=old_ref, new_ref=new_ref)
        self.assertEqual(len(out["results"]), 1)
        return out["results"][0]

    def t5(self, candidate="../../../../.github/tooling/ci-summary/phase_receipt.py"):
        return {
            "old_working_dir": "plugins/termux/large-doc-editor",
            "new_working_dir": "products/standalone/termux/large-doc-editor",
            "old_reference": "../../../.github/tooling/ci-summary/phase_receipt.py",
            "candidate_new_reference": candidate,
        }

    def test_t5_removed_old_directory_uses_authenticated_old_tree(self):
        self.assertFalse(
            (self.repo_root / "plugins/termux/large-doc-editor").exists()
        )
        out = self.check(self.t5())
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(
            out["resolved_target"],
            ".github/tooling/ci-summary/phase_receipt.py",
        )
        self.assertEqual(out["working_dir_depth_delta"], 1)
        self.assertEqual(out["tree_evidence"], "AUTHENTICATED_LOCAL_GIT")
        self.assertEqual(
            out["expected_new_reference"],
            "../../../../.github/tooling/ci-summary/phase_receipt.py",
        )

    def test_t5_old_depth_candidate_fails_with_expected_reference(self):
        out = self.check(self.t5(
            "../../../.github/tooling/ci-summary/phase_receipt.py"
        ))
        self.assertEqual(out["status"], "FAIL")
        self.assertEqual(out["reason"], "RELOCATED_REFERENCE_MISMATCH")

    def test_same_depth_move_can_preserve_relative_depth(self):
        out = self.check({
            "old_working_dir": "plugins/termux/example",
            "new_working_dir": "products/termux/example",
            "old_reference": "../../../shared/helper.py",
            "candidate_new_reference": "../../../shared/helper.py",
        })
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(out["working_dir_depth_delta"], 0)

    def test_repository_escape_is_unknown(self):
        out = self.check({
            "old_working_dir": "a",
            "new_working_dir": "b",
            "old_reference": "../../outside",
            "candidate_new_reference": "../outside",
        })
        self.assertEqual(out["status"], "UNKNOWN")

    def test_absolute_backslash_and_noncanonical_inputs_are_unknown(self):
        cases = [
            {**self.t5(), "old_reference": "/tmp/x"},
            {**self.t5(), "old_reference": "..\\..\\x"},
            {**self.t5(), "new_working_dir": "products//x"},
            {**self.t5(), "new_working_dir": "products/../x"},
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_parent_traversal_after_component_is_unknown(self):
        cases = [
            {**self.t5(), "old_reference": "link/../helper.py"},
            {
                **self.t5(),
                "candidate_new_reference": "link/../phase_receipt.py",
            },
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_nul_and_surrogate_inputs_are_unknown(self):
        nul = chr(0)
        surrogate = chr(0xD800)
        cases = [
            {**self.t5(), "old_reference": "helper" + nul + ".py"},
            {**self.t5(), "candidate_new_reference": "../x" + surrogate},
            {**self.t5(), "new_working_dir": "products/" + surrogate + "/x"},
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_parent_only_references_are_unknown(self):
        cases = [
            {**self.t5(), "old_reference": ".."},
            {**self.t5(), "candidate_new_reference": "../../../.."},
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_component_exceeding_filesystem_name_max_is_unknown(self):
        name_max = os.pathconf(self.repo_root, "PC_NAME_MAX")
        if name_max >= 512:
            self.skipTest("filesystem NAME_MAX outside bounded fixture")
        too_long = "a" * (name_max + 1)
        for case in (
            {**self.t5(), "old_reference": "../../" + too_long},
            {**self.t5(), "candidate_new_reference": "../../../" + too_long},
        ):
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_multibyte_component_uses_encoded_byte_limit(self):
        name_max = os.pathconf(self.repo_root, "PC_NAME_MAX")
        component = "é" * (name_max // 2 + 1)
        if len(component) > 512:
            self.skipTest("fixture exceeds character bound")
        self.assertEqual(
            self.check({**self.t5(), "old_reference": "../../" + component})[
                "status"
            ],
            "UNKNOWN",
        )

    def test_authenticated_working_directory_symlink_is_unknown(self):
        self.git("checkout", "-q", self.old_oid)
        self.remove_tree("plugins/termux/large-doc-editor")
        (self.repo_root / "actual/old").mkdir(parents=True)
        (self.repo_root / "plugins/termux/large-doc-editor").symlink_to(
            self.repo_root / "actual/old",
            target_is_directory=True,
        )
        self.commit("old-symlink")
        symlink_old = self.rev()
        self.git("checkout", "-q", self.new_oid)
        out = self.check(self.t5(), old_ref=symlink_old)
        self.assertEqual(out["status"], "UNKNOWN")

    def test_authenticated_target_parent_symlink_is_unknown(self):
        self.git("checkout", "-q", self.old_oid)
        self.remove_tree("shared")
        (self.repo_root / "real-shared").mkdir()
        self.write("real-shared/helper.py", "print('real')\n")
        (self.repo_root / "shared").symlink_to(
            self.repo_root / "real-shared",
            target_is_directory=True,
        )
        self.write("old/work/anchor.txt", "x\n")
        self.commit("target-symlink")
        symlink_old = self.rev()

        self.git("checkout", "-q", self.new_oid)
        self.write("new/work/anchor.txt", "x\n")
        self.commit("new-work")
        new_work = self.rev()

        item = {
            "old_working_dir": "old/work",
            "new_working_dir": "new/work",
            "old_reference": "../../shared/helper.py",
            "candidate_new_reference": "../../shared/helper.py",
        }
        out = self.check(item, old_ref=symlink_old, new_ref=new_work)
        self.assertEqual(out["status"], "UNKNOWN")

    def test_missing_target_in_new_tree_is_unknown(self):
        self.git("checkout", "-q", self.new_oid)
        (self.repo_root / "shared/helper.py").unlink()
        self.commit("remove-target")
        missing_new = self.rev()
        out = self.check({
            "old_working_dir": "plugins/termux/example",
            "new_working_dir": "products/termux/example",
            "old_reference": "../../../shared/helper.py",
            "candidate_new_reference": "../../../shared/helper.py",
        }, new_ref=missing_new)
        self.assertEqual(out["status"], "UNKNOWN")

    def test_candidate_that_targets_wrong_location_fails(self):
        self.write("docs/not-the-helper.py", "x\n")
        self.commit("wrong-target-exists")
        wrong_new = self.rev()
        out = self.check(
            self.t5("../../../../docs/not-the-helper.py"),
            new_ref=wrong_new,
        )
        self.assertEqual(out["status"], "FAIL")
        self.assertNotEqual(
            out["candidate_resolved_target"],
            out["resolved_target"],
        )

    def test_batch_preserves_input_order_and_aggregate_status(self):
        request = [
            self.t5(),
            self.t5("../../../.github/tooling/ci-summary/phase_receipt.py"),
        ]
        first = self.batch(request)
        second = self.batch(json.loads(json.dumps(request)))
        self.assertEqual(first, second)
        self.assertEqual(first["status"], "FAIL")
        self.assertTrue(first["git_read_only_used"])
        for field in (
            "mutation_authorized",
            "execution_authorized",
            "network_used",
            "github_used",
            "merge_authorized",
            "release_authorized",
            "production_authorized",
            "runtime_authorized",
            "device_authorized",
        ):
            self.assertFalse(first[field])

    def test_batch_caches_repeated_git_tree_reads(self):
        references = [self.t5()] * 64
        with mock.patch.object(wpd, "_git", wraps=wpd._git) as git_call:
            out = self.batch(references)
        ls_tree_calls = [
            call
            for call in git_call.call_args_list
            if len(call.args) > 1 and call.args[1] == "ls-tree"
        ]
        self.assertEqual(out["status"], "PASS")
        self.assertLess(len(ls_tree_calls), 20)

    def test_batch_shape_ref_and_limit_fail_closed(self):
        self.assertEqual(check_batch({"schema": SCHEMA})["status"], "UNKNOWN")
        self.assertEqual(
            check_batch({
                "schema": SCHEMA,
                "repo_root": str(self.repo_root),
                "old_ref": self.old_oid,
                "new_ref": self.new_oid,
                "references": [],
            })["status"],
            "UNKNOWN",
        )
        self.assertEqual(self.batch([self.t5()] * 65)["status"], "UNKNOWN")
        self.assertEqual(
            self.batch([self.t5()], old_ref="-bad-ref")["status"],
            "UNKNOWN",
        )

    def test_cli_rejects_duplicate_keys_and_oversized_input(self):
        duplicate = (
            '{"schema":"termux-workflow-path-depth.v1",'
            '"schema":"termux-workflow-path-depth.v1"}'
        )
        run = subprocess.run(
            [sys.executable, str(TOOLS / "workflow_path_depth.py")],
            input=duplicate,
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(run.returncode, 2)
        self.assertEqual(json.loads(run.stdout)["status"], "UNKNOWN")

        with tempfile.NamedTemporaryFile("wb", delete=False) as handle:
            handle.write(b" " * (64 * 1024 + 1))
            target = Path(handle.name)
        try:
            run = subprocess.run(
                [sys.executable, str(TOOLS / "workflow_path_depth.py"), str(target)],
                check=False,
                capture_output=True,
                text=True,
            )
        finally:
            target.unlink(missing_ok=True)
        self.assertEqual(run.returncode, 2)
        self.assertEqual(json.loads(run.stdout)["status"], "UNKNOWN")

    def test_cli_returns_deterministic_json_and_status(self):
        request = {
            "schema": SCHEMA,
            "repo_root": str(self.repo_root),
            "old_ref": self.old_oid,
            "new_ref": self.new_oid,
            "references": [self.t5()],
        }
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
            json.dump(request, handle)
            target = Path(handle.name)
        try:
            run = subprocess.run(
                [sys.executable, str(TOOLS / "workflow_path_depth.py"), str(target)],
                check=False,
                capture_output=True,
                text=True,
            )
        finally:
            target.unlink(missing_ok=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        parsed = json.loads(run.stdout)
        self.assertEqual(parsed["status"], "PASS")
        self.assertEqual(parsed["old_oid"], self.old_oid)
        self.assertEqual(parsed["new_oid"], self.new_oid)
        self.assertFalse(parsed["mutation_authorized"])
        self.assertFalse(parsed["network_used"])

    def test_ambient_git_repository_overrides_do_not_change_evidence(self):
        previous = {
            key: os.environ.get(key)
            for key in ("GIT_DIR", "GIT_WORK_TREE", "GIT_OBJECT_DIRECTORY")
        }
        try:
            os.environ["GIT_DIR"] = str(self.repo_root / "missing.git")
            os.environ["GIT_WORK_TREE"] = str(self.repo_root / "missing-work")
            os.environ["GIT_OBJECT_DIRECTORY"] = str(self.repo_root / "missing-objects")
            out = self.batch([self.t5()])
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
        self.assertEqual(out["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
