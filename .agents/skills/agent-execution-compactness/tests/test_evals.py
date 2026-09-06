from __future__ import annotations

import json
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
FIXTURE = SKILL_ROOT / "evals" / "evals.json"

EXECUTION_ROUTES = {
    "EXISTING_COMMAND",
    "HARNESS",
    "INLINE_SMALL",
    "MATERIALIZE",
    "EXCEPTION",
}


def reference_decision(facts):
    if facts["secret_bearing"] or facts["validation_weakening"]:
        return "REJECT", None
    if facts["independent_goals"] > 1:
        return "SPLIT", None
    if facts["existing_command"]:
        return "EXECUTE", "EXISTING_COMMAND"
    if facts["existing_harness"]:
        return "EXECUTE", "HARNESS"

    crosses_guardrail = (
        facts["logical_lines"] > 20
        or facts["source_bytes"] > 2048
        or facts["generated_files"] > 1
        or facts["mixed_pipeline"]
    )
    if crosses_guardrail:
        if not facts["file_surface_available"] and facts["scratch_external_only"]:
            return "EXECUTE", "EXCEPTION"
        return "EXECUTE", "MATERIALIZE"
    return "EXECUTE", "INLINE_SMALL"


class EvalContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.cases = cls.payload["evals"]

    def test_fixture_identity_and_case_set(self):
        self.assertEqual(self.payload["skill_name"], "agent-execution-compactness")
        self.assertEqual(self.payload["schema_version"], 1)
        self.assertEqual(len(self.cases), 10)
        self.assertEqual(
            {case["id"] for case in self.cases},
            {
                "existing-unittest-command",
                "existing-repository-harness",
                "five-line-import-smoke",
                "forty-line-temp-module",
                "three-heredoc-modules",
                "validation-deletion",
                "real-device-no-file-surface",
                "ci-mcp-long-validation",
                "secret-bearing-inline",
                "multiple-independent-goals",
            },
        )

    def test_every_case_has_live_eval_compatible_prompt_and_expected_output(self):
        for case in self.cases:
            with self.subTest(case=case["id"]):
                self.assertIsInstance(case["prompt"], str)
                self.assertTrue(case["prompt"].strip())
                self.assertIsInstance(case["expected_output"], str)
                self.assertTrue(case["expected_output"].strip())
                self.assertIsInstance(case["assertions"], list)
                self.assertTrue(case["assertions"])

    def test_structured_expectations_match_reference_guardrail(self):
        for case in self.cases:
            with self.subTest(case=case["id"]):
                action, route = reference_decision(case["facts"])
                self.assertEqual(action, case["expected_action"])
                self.assertEqual(route, case["expected_route"])
                if route is not None:
                    self.assertIn(route, EXECUTION_ROUTES)

    def test_required_materialize_cases_are_machine_proven(self):
        by_id = {case["id"]: case for case in self.cases}
        self.assertEqual(by_id["forty-line-temp-module"]["expected_route"], "MATERIALIZE")
        self.assertEqual(by_id["three-heredoc-modules"]["expected_route"], "MATERIALIZE")
        self.assertGreater(by_id["forty-line-temp-module"]["facts"]["logical_lines"], 20)
        self.assertGreater(by_id["three-heredoc-modules"]["facts"]["generated_files"], 1)
        self.assertTrue(by_id["three-heredoc-modules"]["facts"]["mixed_pipeline"])

    def test_safety_dispositions_preempt_execution_routing(self):
        by_id = {case["id"]: case for case in self.cases}
        for case_id in ("validation-deletion", "secret-bearing-inline"):
            self.assertEqual(by_id[case_id]["expected_action"], "REJECT")
            self.assertIsNone(by_id[case_id]["expected_route"])
        self.assertEqual(by_id["multiple-independent-goals"]["expected_action"], "SPLIT")
        self.assertIsNone(by_id["multiple-independent-goals"]["expected_route"])

    def test_existing_ci_mcp_harness_wins_before_size_guardrails(self):
        case = next(case for case in self.cases if case["id"] == "ci-mcp-long-validation")
        self.assertTrue(case["facts"]["existing_harness"])
        self.assertGreater(case["facts"]["logical_lines"], 20)
        self.assertEqual(reference_decision(case["facts"]), ("EXECUTE", "HARNESS"))

    def test_real_device_exception_requires_no_file_surface_and_explicit_external_scratch(self):
        case = next(case for case in self.cases if case["id"] == "real-device-no-file-surface")
        self.assertFalse(case["facts"]["file_surface_available"])
        self.assertTrue(case["facts"]["scratch_external_only"])
        self.assertEqual(reference_decision(case["facts"]), ("EXECUTE", "EXCEPTION"))

    def test_fanout_eval_prefers_evidence_equivalent_existing_harness(self):
        case = next(case for case in self.cases if case["id"] == "existing-repository-harness")
        self.assertEqual(reference_decision(case["facts"]), ("EXECUTE", "HARNESS"))
        self.assertIn("several manual repository calls", case["prompt"])
        self.assertTrue(
            any("visible fan-out" in assertion for assertion in case["assertions"]),
            "safe consolidation eval must explicitly cover visible fan-out",
        )

    def test_fanout_eval_preserves_required_split_and_targeted_drilldown(self):
        by_id = {case["id"]: case for case in self.cases}
        split_case = by_id["multiple-independent-goals"]
        self.assertEqual(reference_decision(split_case["facts"]), ("SPLIT", None))
        self.assertTrue(any("visible fan-out" in assertion for assertion in split_case["assertions"]))

        drilldown_case = by_id["ci-mcp-long-validation"]
        self.assertEqual(reference_decision(drilldown_case["facts"]), ("EXECUTE", "HARNESS"))
        self.assertIn("unless the summary is insufficient", drilldown_case["prompt"])
        self.assertTrue(any("targeted drill-down" in assertion for assertion in drilldown_case["assertions"]))


if __name__ == "__main__":
    unittest.main()
