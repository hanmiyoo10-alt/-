import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from workflow_path_depth import SCHEMA, check_batch, check_reference


class WorkflowPathDepthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.temp.name)
        for rel in (
            "plugins/termux/large-doc-editor",
            "products/standalone/termux/large-doc-editor",
            "plugins/termux/example",
            "products/termux/example",
            "a",
            "b",
        ):
            (self.repo_root / rel).mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        self.temp.cleanup()

    def tree_proof(self, path):
        parts = path.split("/")
        return [
            {
                "path": "/".join(parts[: index + 1]),
                "mode": "040000",
                "type": "tree",
            }
            for index in range(len(parts))
        ]

    def check(self, item):
        return check_reference(
            item,
            self.repo_root,
            os.pathconf(self.repo_root, "PC_NAME_MAX"),
        )

    def batch(self, request):
        payload = dict(request)
        payload.setdefault("repo_root", str(self.repo_root))
        return check_batch(payload)

    def t5(self, candidate="../../../../.github/tooling/ci-summary/phase_receipt.py"):
        old_dir = "plugins/termux/large-doc-editor"
        new_dir = "products/standalone/termux/large-doc-editor"
        return {
            "old_working_dir": old_dir,
            "new_working_dir": new_dir,
            "old_reference": "../../../.github/tooling/ci-summary/phase_receipt.py",
            "candidate_new_reference": candidate,
            "old_working_dir_tree_proof": self.tree_proof(old_dir),
            "new_working_dir_tree_proof": self.tree_proof(new_dir),
        }

    def test_t5_one_level_deeper_preserves_same_target(self):
        out = self.check(self.t5())
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(
            out["resolved_target"],
            ".github/tooling/ci-summary/phase_receipt.py",
        )
        self.assertEqual(out["working_dir_depth_delta"], 1)
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
        self.assertEqual(
            out["expected_new_reference"],
            "../../../../.github/tooling/ci-summary/phase_receipt.py",
        )

    def test_same_depth_move_can_preserve_relative_depth(self):
        old_dir = "plugins/termux/example"
        new_dir = "products/termux/example"
        out = self.check({
            "old_working_dir": old_dir,
            "new_working_dir": new_dir,
            "old_reference": "../../../.github/tooling/helper.py",
            "candidate_new_reference": "../../../.github/tooling/helper.py",
            "old_working_dir_tree_proof": self.tree_proof(old_dir),
            "new_working_dir_tree_proof": self.tree_proof(new_dir),
        })
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(out["working_dir_depth_delta"], 0)

    def test_repository_escape_is_unknown(self):
        out = self.check({
            "old_working_dir": "a",
            "new_working_dir": "b",
            "old_reference": "../../outside",
            "candidate_new_reference": "../outside",
            "old_working_dir_tree_proof": self.tree_proof("a"),
            "new_working_dir_tree_proof": self.tree_proof("b"),
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

    def test_nul_in_reference_or_working_directory_is_unknown(self):
        nul = chr(0)
        cases = [
            {**self.t5(), "old_reference": "helper" + nul + ".py"},
            {**self.t5(), "candidate_new_reference": "helper" + nul + ".py"},
            {
                **self.t5(),
                "old_working_dir": "plugins/termux" + nul + "/large-doc-editor",
            },
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_symlink_or_incomplete_tree_proof_is_unknown(self):
        symlinked = self.t5()
        symlinked["old_working_dir_tree_proof"][1] = {
            "path": "plugins/termux",
            "mode": "120000",
            "type": "blob",
        }
        self.assertEqual(self.check(symlinked)["status"], "UNKNOWN")

        incomplete = self.t5()
        incomplete["new_working_dir_tree_proof"] = incomplete[
            "new_working_dir_tree_proof"
        ][:-1]
        self.assertEqual(self.check(incomplete)["status"], "UNKNOWN")

    def test_removed_old_directory_can_use_pre_move_tree_proof(self):
        old_dir = self.repo_root / "plugins/termux/large-doc-editor"
        old_dir.rmdir()
        out = self.check(self.t5())
        self.assertEqual(out["status"], "PASS")

    def test_unpaired_surrogate_in_path_input_is_unknown(self):
        surrogate = chr(0xD800)
        cases = [
            {**self.t5(), "old_reference": "../helper" + surrogate + ".py"},
            {
                **self.t5(),
                "candidate_new_reference": "../helper" + surrogate + ".py",
            },
            {
                **self.t5(),
                "new_working_dir": "products/standalone/termux/"
                + surrogate
                + "large-doc-editor",
            },
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
            self.skipTest("filesystem NAME_MAX is outside this bounded fixture")
        too_long = "a" * (name_max + 1)
        cases = [
            {**self.t5(), "old_reference": "../../" + too_long},
            {
                **self.t5(),
                "candidate_new_reference": "../../../" + too_long,
            },
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_multibyte_component_uses_encoded_byte_limit(self):
        name_max = os.pathconf(self.repo_root, "PC_NAME_MAX")
        char = "é"
        count = name_max // len(char.encode("utf-8")) + 1
        component = char * count
        if len(component) > 512:
            self.skipTest("fixture exceeds bounded character input")
        case = {**self.t5(), "old_reference": "../../" + component}
        self.assertEqual(self.check(case)["status"], "UNKNOWN")

    def test_candidate_that_targets_wrong_location_fails(self):
        out = self.check(self.t5("../../../../docs/not-the-helper.py"))
        self.assertEqual(out["status"], "FAIL")
        self.assertNotEqual(
            out["candidate_resolved_target"],
            out["resolved_target"],
        )

    def test_batch_preserves_input_order_and_aggregate_status(self):
        request = {
            "schema": SCHEMA,
            "references": [
                self.t5(),
                self.t5("../../../.github/tooling/ci-summary/phase_receipt.py"),
            ],
        }
        first = self.batch(request)
        second = self.batch(json.loads(json.dumps(request)))
        self.assertEqual(first, second)
        self.assertEqual(first["status"], "FAIL")
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
        self.assertEqual(
            [row["candidate_new_reference"] for row in first["results"]],
            [
                "../../../../.github/tooling/ci-summary/phase_receipt.py",
                "../../../.github/tooling/ci-summary/phase_receipt.py",
            ],
        )

    def test_batch_shape_and_limit_fail_closed(self):
        self.assertEqual(self.batch({"schema": SCHEMA})["status"], "UNKNOWN")
        self.assertEqual(
            self.batch({"schema": SCHEMA, "references": []})["status"],
            "UNKNOWN",
        )
        self.assertEqual(
            self.batch({"schema": SCHEMA, "references": [self.t5()] * 65})["status"],
            "UNKNOWN",
        )

    def test_cli_rejects_duplicate_keys_and_oversized_input(self):
        duplicate = (
            '{"schema":"termux-workflow-path-depth.v1",'
            '"schema":"termux-workflow-path-depth.v1","references":[]}'
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
        self.assertFalse(parsed["mutation_authorized"])
        self.assertFalse(parsed["network_used"])


if __name__ == "__main__":
    unittest.main()
