from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("pocketrisu_helper", ROOT / "adapters" / "pocketrisu_helper.py")
pocketrisu_helper = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(pocketrisu_helper)

RUN = {"id": "123", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def receipt(result: str, *, phase: str = "docs_validation", metadata=None):
    return {
        "schemaVersion": 1,
        "receiptKind": "CI_PHASE_RECEIPT_V1",
        "phases": [{"name": phase, "result": result}],
        "metadata": {} if metadata is None else metadata,
    }


def adapt(raw, outcome: str):
    return pocketrisu_helper.adapt(
        raw,
        workflow="PocketRisu helper docs",
        run=RUN,
        source_path=".ci-summary/pocketrisu-helper-phases.json",
        step_outcome=outcome,
    )


class PocketRisuHelperAdapterTests(unittest.TestCase):
    def test_pass(self):
        summary = adapt(receipt("PASS"), "success")
        self.assertEqual(summary["result"], "PASS")
        self.assertEqual(summary["counts"], {"passed": 1, "total": 1, "failed": 0, "warnings": 0})
        self.assertEqual(summary["checks"], [{"name": "docs_validation", "result": "PASS"}])
        self.assertEqual(summary["scope"]["profile"], "POCKETRISU_HELPER_DOCS")
        self.assertTrue(summary["complete"])

    def test_failure(self):
        summary = adapt(receipt("RUNNING"), "failure")
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["reasonCodes"], ["POCKETRISU_HELPER_DOCS_VALIDATION_FAILED"])
        self.assertEqual(summary["firstFailure"]["phase"], "docs_validation")
        self.assertEqual(summary["counts"]["failed"], 1)

    def test_cancelled(self):
        summary = adapt(receipt("RUNNING"), "cancelled")
        self.assertEqual(summary["result"], "CANCELLED")
        self.assertEqual(summary["reasonCodes"], ["POCKETRISU_HELPER_DOCS_VALIDATION_CANCELLED"])
        self.assertEqual(summary["counts"]["failed"], 0)

    def test_pass_receipt_rejects_failed_step(self):
        with self.assertRaisesRegex(ValueError, "contradicts step outcome"):
            adapt(receipt("PASS"), "failure")

    def test_running_receipt_rejects_success_step(self):
        with self.assertRaisesRegex(ValueError, "must have failure or cancelled"):
            adapt(receipt("RUNNING"), "success")

    def test_not_run_receipt_rejected(self):
        with self.assertRaisesRegex(ValueError, "must contain RUNNING"):
            adapt(receipt("NOT_RUN"), "skipped")

    def test_wrong_phase_rejected(self):
        with self.assertRaisesRegex(ValueError, "phase mismatch"):
            adapt(receipt("RUNNING", phase="other"), "failure")

    def test_bad_metadata_rejected(self):
        with self.assertRaisesRegex(ValueError, "metadata invalid"):
            adapt(receipt("PASS", metadata=[]), "success")

    def test_main_missing_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(Path(temporary) / "missing.json"),
                "--output", str(output),
                "--docs-validation-outcome", "skipped",
                "--run-id", "123",
                "--attempt", "1",
                "--event", "pull_request",
                "--sha", "a" * 40,
            ]
            self.assertEqual(pocketrisu_helper.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["result"], "INFRA_ERROR")
            self.assertFalse(summary["complete"])
            self.assertEqual(summary["reasonCodes"], ["POCKETRISU_HELPER_PHASE_RECEIPT_MISSING"])

    def test_main_malformed_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            report = Path(temporary) / "bad.json"
            report.write_text("[]", encoding="utf-8")
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(report),
                "--output", str(output),
                "--docs-validation-outcome", "skipped",
            ]
            self.assertEqual(pocketrisu_helper.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["reasonCodes"], ["POCKETRISU_HELPER_SUMMARY_SOURCE_INVALID"])
            self.assertFalse(summary["complete"])


if __name__ == "__main__":
    unittest.main()
