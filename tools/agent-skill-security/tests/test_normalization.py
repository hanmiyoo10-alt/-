from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("agent_skill_security_evaluate", ROOT / "evaluate.py")
evaluate = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(evaluate)


class NormalizationTests(unittest.TestCase):
    def test_normalization_ignores_volatile_fields(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "fixture"
            target.mkdir()
            skill = target / "SKILL.md"
            skill.write_text("fixture\n", encoding="utf-8")
            base = {
                "findings": [
                    {
                        "id": "volatile-one",
                        "rule_id": "PROMPT_INJECTION_OVERRIDE",
                        "category": "prompt_injection",
                        "severity": "HIGH",
                        "title": "first title",
                        "description": "first description",
                        "file_path": str(skill),
                        "line_number": 7,
                        "snippet": "first snippet",
                        "analyzer": "static",
                    }
                ]
            }
            other = {
                "findings": [
                    {
                        **base["findings"][0],
                        "id": "volatile-two",
                        "title": "different title",
                        "description": "different description",
                        "snippet": "different snippet",
                    }
                ]
            }
            first = evaluate.normalize_findings(base, target_id="M01", target_path=target)
            second = evaluate.normalize_findings(other, target_id="M01", target_path=target)
            self.assertEqual(first, second)
            self.assertEqual(
                first[0],
                (
                    "M01",
                    "PROMPT_INJECTION_OVERRIDE",
                    "prompt_injection",
                    "HIGH",
                    "SKILL.md",
                    7,
                    "static",
                ),
            )

    def test_relative_paths_are_stable(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "fixture"
            nested = target / "scripts"
            nested.mkdir(parents=True)
            self.assertEqual(
                evaluate._normalize_relative_file_path("scripts/check.py", target),
                "scripts/check.py",
            )
            self.assertEqual(
                evaluate._normalize_relative_file_path(str(nested / "check.py"), target),
                "scripts/check.py",
            )

    def test_absolute_path_outside_target_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary) / "fixture"
            target.mkdir()
            outside = Path(temporary) / "outside.py"
            with self.assertRaises(evaluate.BenchmarkInvalid):
                evaluate._normalize_relative_file_path(str(outside), target)

    def test_semantic_category_required_for_must_catch(self):
        targets = [{"id": "M01", "kind": "malicious", "acceptableCategories": ["prompt_injection"]}]
        unrelated = [
            [("M01", "UNRELATED", "resource_abuse", "CRITICAL", "SKILL.md", 1, "static")]
            for _ in range(3)
        ]
        summary = evaluate._mode_disposition(mode="CORE", targets=targets, normalized_runs=unrelated)
        self.assertEqual(summary["disposition"], "NOT_ELIGIBLE")
        self.assertIn("MUST_CATCH_MISSED:M01", summary["reasonCodes"])

    def test_not_eligible_is_not_benchmark_invalid(self):
        targets = [{"id": "B01", "kind": "benign", "acceptableCategories": []}]
        run = [("B01", "PROMPT_INJECTION_OVERRIDE", "prompt_injection", "HIGH", "SKILL.md", 1, "static")]
        summary = evaluate._mode_disposition(mode="CORE", targets=targets, normalized_runs=[run, run, run])
        self.assertEqual(summary["disposition"], "NOT_ELIGIBLE")
        self.assertTrue(summary["normalizedDeterministic"])


if __name__ == "__main__":
    unittest.main()
