import json
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
    def t5(self, candidate="../../../../.github/tooling/ci-summary/phase_receipt.py"):
        return {
            "old_working_dir": "plugins/termux/large-doc-editor",
            "new_working_dir": "products/standalone/termux/large-doc-editor",
            "old_reference": "../../../.github/tooling/ci-summary/phase_receipt.py",
            "candidate_new_reference": candidate,
        }

    def test_t5_one_level_deeper_preserves_same_target(self):
        out = check_reference(self.t5())
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
        out = check_reference(self.t5(
            "../../../.github/tooling/ci-summary/phase_receipt.py"
        ))
        self.assertEqual(out["status"], "FAIL")
        self.assertEqual(out["reason"], "RELOCATED_REFERENCE_MISMATCH")
        self.assertEqual(
            out["expected_new_reference"],
            "../../../../.github/tooling/ci-summary/phase_receipt.py",
        )

    def test_same_depth_move_can_preserve_relative_depth(self):
        out = check_reference({
            "old_working_dir": "plugins/termux/example",
            "new_working_dir": "products/termux/example",
            "old_reference": "../../../.github/tooling/helper.py",
            "candidate_new_reference": "../../../.github/tooling/helper.py",
        })
        self.assertEqual(out["status"], "PASS")
        self.assertEqual(out["working_dir_depth_delta"], 0)

    def test_repository_escape_is_unknown(self):
        out = check_reference({
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
                self.assertEqual(check_reference(case)["status"], "UNKNOWN")

    def test_candidate_that_targets_wrong_location_fails(self):
        out = check_reference(self.t5("../../../../docs/not-the-helper.py"))
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
        first = check_batch(request)
        second = check_batch(json.loads(json.dumps(request)))
        self.assertEqual(first, second)
        self.assertEqual(first["status"], "FAIL")
        self.assertEqual(
            [row["candidate_new_reference"] for row in first["results"]],
            [
                "../../../../.github/tooling/ci-summary/phase_receipt.py",
                "../../../.github/tooling/ci-summary/phase_receipt.py",
            ],
        )

    def test_batch_shape_and_limit_fail_closed(self):
        self.assertEqual(check_batch({"schema": SCHEMA})["status"], "UNKNOWN")
        self.assertEqual(
            check_batch({"schema": SCHEMA, "references": []})["status"],
            "UNKNOWN",
        )
        self.assertEqual(
            check_batch({"schema": SCHEMA, "references": [self.t5()] * 65})["status"],
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
        request = {"schema": SCHEMA, "references": [self.t5()]}
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
