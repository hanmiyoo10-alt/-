from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("termux_response_watch", ROOT / "adapters" / "termux_response_watch.py")
termux_response_watch = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(termux_response_watch)

RUN = {"id": "123", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def receipt(syntax: str, unit: str, *, metadata=None):
    return {
        "schemaVersion": 1,
        "receiptKind": "CI_PHASE_RECEIPT_V1",
        "phases": [
            {"name": "syntax_check", "result": syntax},
            {"name": "unit_tests", "result": unit},
        ],
        "metadata": {} if metadata is None else metadata,
    }


def adapt(raw, syntax: str, unit: str):
    return termux_response_watch.adapt(
        raw,
        workflow="Termux Response Watch",
        run=RUN,
        source_path=".ci-summary/termux-response-watch-phases.json",
        syntax_outcome=syntax,
        unit_outcome=unit,
    )


class TermuxResponseWatchAdapterTests(unittest.TestCase):
    def test_pass(self):
        summary = adapt(receipt("PASS", "PASS"), "success", "success")
        self.assertEqual(summary["result"], "PASS")
        self.assertEqual(summary["counts"], {"passed": 2, "total": 2, "failed": 0, "warnings": 0})
        self.assertEqual(summary["scope"]["profile"], "TERMUX_RESPONSE_WATCH")
        self.assertTrue(summary["complete"])

    def test_syntax_failure(self):
        summary = adapt(receipt("RUNNING", "NOT_RUN"), "failure", "skipped")
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["reasonCodes"], ["TERMUX_RESPONSE_WATCH_SYNTAX_CHECK_FAILED"])
        self.assertEqual(summary["firstFailure"]["phase"], "syntax_check")
        self.assertEqual(summary["checks"][1]["result"], "NOT_RUN")

    def test_unit_failure(self):
        summary = adapt(receipt("PASS", "RUNNING"), "success", "failure")
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["reasonCodes"], ["TERMUX_RESPONSE_WATCH_UNIT_TESTS_FAILED"])
        self.assertEqual(summary["counts"]["passed"], 1)

    def test_unit_cancelled(self):
        summary = adapt(receipt("PASS", "RUNNING"), "success", "cancelled")
        self.assertEqual(summary["result"], "CANCELLED")
        self.assertEqual(summary["counts"]["failed"], 0)
        self.assertEqual(summary["reasonCodes"], ["TERMUX_RESPONSE_WATCH_UNIT_TESTS_CANCELLED"])

    def test_pass_receipt_rejects_failed_outcome(self):
        with self.assertRaisesRegex(ValueError, "contradicts step outcome"):
            adapt(receipt("PASS", "PASS"), "success", "failure")

    def test_running_syntax_rejects_executed_successor(self):
        with self.assertRaisesRegex(ValueError, "executed successor"):
            adapt(receipt("RUNNING", "PASS"), "failure", "success")

    def test_running_unit_requires_passed_predecessor(self):
        with self.assertRaisesRegex(ValueError, "incomplete predecessor"):
            adapt(receipt("NOT_RUN", "RUNNING"), "skipped", "failure")

    def test_no_active_phase_rejected(self):
        with self.assertRaisesRegex(ValueError, "no active failure phase"):
            adapt(receipt("PASS", "NOT_RUN"), "success", "skipped")

    def test_bad_metadata_rejected(self):
        with self.assertRaisesRegex(ValueError, "metadata invalid"):
            adapt(receipt("PASS", "PASS", metadata=[]), "success", "success")

    def test_main_missing_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(Path(temporary) / "missing.json"),
                "--output", str(output),
                "--syntax-check-outcome", "skipped",
                "--unit-tests-outcome", "skipped",
                "--run-id", "123",
                "--attempt", "1",
                "--event", "pull_request",
                "--sha", "a" * 40,
            ]
            self.assertEqual(termux_response_watch.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["result"], "INFRA_ERROR")
            self.assertFalse(summary["complete"])
            self.assertEqual(summary["reasonCodes"], ["TERMUX_RESPONSE_WATCH_PHASE_RECEIPT_MISSING"])

    def test_main_malformed_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            report = Path(temporary) / "bad.json"
            report.write_text("[]", encoding="utf-8")
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(report),
                "--output", str(output),
                "--syntax-check-outcome", "skipped",
                "--unit-tests-outcome", "skipped",
            ]
            self.assertEqual(termux_response_watch.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["reasonCodes"], ["TERMUX_RESPONSE_WATCH_SUMMARY_SOURCE_INVALID"])
            self.assertFalse(summary["complete"])


if __name__ == "__main__":
    unittest.main()
