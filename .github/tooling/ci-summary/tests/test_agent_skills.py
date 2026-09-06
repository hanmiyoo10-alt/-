from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("agent_skills", ROOT / "adapters" / "agent_skills.py")
agent_skills = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(agent_skills)

RUN = {"id": "123", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def receipt(results):
    return {
        "schemaVersion": 1,
        "receiptKind": "CI_PHASE_RECEIPT_V1",
        "phases": [
            {"name": name, "result": result}
            for name, result in zip(agent_skills.EXPECTED_PHASES, results)
        ],
        "metadata": {},
    }


def outcomes(*values):
    return dict(zip(agent_skills.EXPECTED_PHASES, values))


def adapt(raw, step_outcomes):
    return agent_skills.adapt(
        raw,
        workflow="Agent Skills CI",
        run=RUN,
        source_path=".ci-summary/agent-skills-phases.json",
        step_outcomes=step_outcomes,
    )


class AgentSkillsAdapterTests(unittest.TestCase):
    def test_pass(self):
        summary = adapt(receipt(["PASS"] * 4), outcomes(*(["success"] * 4)))
        self.assertEqual(summary["result"], "PASS")
        self.assertEqual(summary["counts"], {"passed": 4, "total": 4, "failed": 0, "warnings": 0})
        self.assertTrue(summary["complete"])
        self.assertEqual(summary["scope"]["profile"], "AGENT_SKILLS_CI")

    def test_first_phase_failure(self):
        summary = adapt(
            receipt(["RUNNING", "NOT_RUN", "NOT_RUN", "NOT_RUN"]),
            outcomes("failure", "skipped", "skipped", "skipped"),
        )
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["firstFailure"]["phase"], "python_compile")
        self.assertEqual(summary["reasonCodes"], ["AGENT_SKILLS_PYTHON_COMPILE_FAILED"])
        self.assertEqual(summary["counts"]["passed"], 0)

    def test_middle_phase_failure(self):
        summary = adapt(
            receipt(["PASS", "RUNNING", "NOT_RUN", "NOT_RUN"]),
            outcomes("success", "failure", "skipped", "skipped"),
        )
        self.assertEqual(summary["result"], "FAIL")
        self.assertEqual(summary["firstFailure"]["phase"], "skill_unit_tests")
        self.assertIn({"name": "skill_unit_tests", "result": "FAIL"}, summary["checks"])
        self.assertIn({"name": "live_eval_harness", "result": "SKIPPED"}, summary["checks"])

    def test_cancelled_phase(self):
        summary = adapt(
            receipt(["PASS", "PASS", "RUNNING", "NOT_RUN"]),
            outcomes("success", "success", "cancelled", "skipped"),
        )
        self.assertEqual(summary["result"], "CANCELLED")
        self.assertEqual(summary["reasonCodes"], ["AGENT_SKILLS_LIVE_EVAL_HARNESS_CANCELLED"])
        self.assertEqual(summary["counts"]["failed"], 0)

    def test_success_receipt_rejects_failed_step(self):
        with self.assertRaisesRegex(ValueError, "contradicts step outcomes"):
            adapt(receipt(["PASS"] * 4), outcomes("success", "success", "failure", "success"))

    def test_running_phase_rejects_success_outcome(self):
        with self.assertRaisesRegex(ValueError, "must have failure or cancelled"):
            adapt(
                receipt(["PASS", "RUNNING", "NOT_RUN", "NOT_RUN"]),
                outcomes("success", "success", "skipped", "skipped"),
            )

    def test_out_of_order_receipt_rejected(self):
        with self.assertRaisesRegex(ValueError, "PASS appears after unfinished"):
            adapt(
                receipt(["PASS", "NOT_RUN", "PASS", "NOT_RUN"]),
                outcomes("success", "skipped", "success", "skipped"),
            )

    def test_multiple_running_rejected(self):
        with self.assertRaisesRegex(ValueError, "multiple/out-of-order RUNNING"):
            adapt(
                receipt(["RUNNING", "RUNNING", "NOT_RUN", "NOT_RUN"]),
                outcomes("failure", "skipped", "skipped", "skipped"),
            )

    def test_main_missing_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(Path(temporary) / "missing.json"),
                "--output", str(output),
                "--python-compile-outcome", "skipped",
                "--skill-unit-tests-outcome", "skipped",
                "--live-eval-harness-outcome", "skipped",
                "--orchestrator-contracts-outcome", "skipped",
                "--run-id", "123",
                "--attempt", "1",
                "--event", "pull_request",
                "--sha", "a" * 40,
            ]
            self.assertEqual(agent_skills.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["result"], "INFRA_ERROR")
            self.assertFalse(summary["complete"])
            self.assertEqual(summary["reasonCodes"], ["AGENT_SKILLS_PHASE_RECEIPT_MISSING"])

    def test_main_malformed_receipt_is_infra_error(self):
        with tempfile.TemporaryDirectory() as temporary:
            report_path = Path(temporary) / "bad.json"
            report_path.write_text("[]", encoding="utf-8")
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(report_path),
                "--output", str(output),
                "--python-compile-outcome", "skipped",
                "--skill-unit-tests-outcome", "skipped",
                "--live-eval-harness-outcome", "skipped",
                "--orchestrator-contracts-outcome", "skipped",
            ]
            self.assertEqual(agent_skills.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["reasonCodes"], ["AGENT_SKILLS_SUMMARY_SOURCE_INVALID"])
            self.assertFalse(summary["complete"])


if __name__ == "__main__":
    unittest.main()
