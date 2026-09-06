from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("usage_dashboard", ROOT / "adapters" / "usage_dashboard.py")
usage_dashboard = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(usage_dashboard)

RUN = {"id": "123", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def receipt(results, test_total=None):
    metadata = {} if test_total is None else {"test_total": test_total}
    return {
        "schemaVersion": 1,
        "receiptKind": "CI_PHASE_RECEIPT_V1",
        "phases": [
            {"name": name, "result": result}
            for name, result in zip(usage_dashboard.EXPECTED_PHASES, results)
        ],
        "metadata": metadata,
    }


def adapt(raw, *, identity_required=False, identity_outcome="skipped", validation_outcome="success"):
    return usage_dashboard.adapt(
        raw,
        workflow="Reusable Usage Dashboard Validate",
        run=RUN,
        source_path=".ci-summary/usage-dashboard-phases.json",
        identity_required=identity_required,
        identity_outcome=identity_outcome,
        validation_outcome=validation_outcome,
    )


class UsageDashboardAdapterTests(unittest.TestCase):
    def test_ordinary_pass(self):
        summary = adapt(receipt(["PASS"] * 7, test_total=87))
        self.assertEqual(summary["result"], "PASS")
        self.assertEqual(summary["counts"], {"passed": 7, "total": 7, "failed": 0, "warnings": 0})
        self.assertEqual(summary["scope"]["profile"], "CANDIDATE_VALIDATION")
        self.assertIn({"name": "full_test_suite_87_tests", "result": "PASS"}, summary["checks"])

    def test_exact_sha_pass(self):
        summary = adapt(
            receipt(["PASS"] * 7, test_total=91),
            identity_required=True,
            identity_outcome="success",
        )
        self.assertEqual(summary["result"], "PASS")
        self.assertEqual(summary["counts"]["passed"], 8)
        self.assertEqual(summary["counts"]["total"], 8)
        self.assertEqual(summary["checks"][0], {"name": "candidate_identity", "result": "PASS"})
        self.assertEqual(summary["scope"]["profile"], "EXACT_SHA_VALIDATION")

    def test_phase_failure_uses_running_phase(self):
        raw = receipt(["PASS", "PASS", "RUNNING", "NOT_RUN", "NOT_RUN", "NOT_RUN", "NOT_RUN"])
        summary = adapt(raw, validation_outcome="failure")
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["counts"]["passed"], 2)
        self.assertEqual(summary["firstFailure"]["phase"], "reconciliation")
        self.assertEqual(summary["reasonCodes"], ["USAGE_DASHBOARD_RECONCILIATION_FAILED"])
        self.assertIn({"name": "reconciliation", "result": "FAIL"}, summary["checks"])
        self.assertIn({"name": "full_test_suite", "result": "SKIPPED"}, summary["checks"])

    def test_phase_cancellation_is_distinct(self):
        raw = receipt(["PASS", "PASS", "PASS", "RUNNING", "NOT_RUN", "NOT_RUN", "NOT_RUN"])
        summary = adapt(raw, validation_outcome="cancelled")
        self.assertEqual(summary["result"], "CANCELLED")
        self.assertEqual(summary["firstFailure"]["phase"], "syntax_checks")
        self.assertEqual(summary["reasonCodes"], ["USAGE_DASHBOARD_SYNTAX_CHECKS_CANCELLED"])

    def test_identity_failure_needs_no_phase_receipt(self):
        summary = adapt(
            None,
            identity_required=True,
            identity_outcome="failure",
            validation_outcome="skipped",
        )
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["firstFailure"]["phase"], "candidate_identity")
        self.assertEqual(summary["counts"]["total"], 8)

    def test_required_identity_cannot_be_skipped(self):
        with self.assertRaisesRegex(ValueError, "identity step was skipped"):
            adapt(receipt(["PASS"] * 7), identity_required=True, identity_outcome="skipped")

    def test_success_cannot_hide_running_phase(self):
        with self.assertRaisesRegex(ValueError, "successful validation contradicts"):
            adapt(receipt(["PASS", "RUNNING", "NOT_RUN", "NOT_RUN", "NOT_RUN", "NOT_RUN", "NOT_RUN"]))

    def test_out_of_order_receipt_rejected(self):
        with self.assertRaisesRegex(ValueError, "PASS appears after unfinished phase"):
            adapt(receipt(["PASS", "NOT_RUN", "PASS", "NOT_RUN", "NOT_RUN", "NOT_RUN", "NOT_RUN"]), validation_outcome="failure")

    def test_main_falls_back_on_missing_receipt(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(Path(temporary) / "missing.json"),
                "--output", str(output),
                "--identity-required", "false",
                "--identity-outcome", "skipped",
                "--validation-outcome", "failure",
                "--run-id", "123",
                "--attempt", "1",
                "--event", "pull_request",
                "--sha", "a" * 40,
            ]
            self.assertEqual(usage_dashboard.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["result"], "INFRA_ERROR")
            self.assertFalse(summary["complete"])
            self.assertEqual(summary["reasonCodes"], ["USAGE_DASHBOARD_PHASE_RECEIPT_MISSING"])


if __name__ == "__main__":
    unittest.main()
