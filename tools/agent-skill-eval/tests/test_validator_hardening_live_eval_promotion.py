from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
TOOL_DIR = HERE.parents[1]
REPO_ROOT = HERE.parents[3]
LIVE_WORKFLOW = REPO_ROOT / ".github/workflows/agent-skill-live-eval.yml"
ZERO_CREDIT_WORKFLOW = REPO_ROOT / ".github/workflows/agent-skill-zero-credit-eval.yml"
ZERO_CREDIT_RESOLVER = TOOL_DIR / "resolve_zero_credit_request.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class ValidatorHardeningLiveEvalPromotionTests(unittest.TestCase):
    def test_live_allowlist_extends_only_the_live_adapter(self):
        base = load_module("validator_hardening_live_base", TOOL_DIR / "prepare_eval.py")
        live = load_module("validator_hardening_live_adapter", TOOL_DIR / "prepare_live_eval.py")
        self.assertEqual(
            base.ALLOWED_SKILLS,
            frozenset({"plugin-authority-scan", "plugin-impact-scope"}),
        )
        self.assertEqual(
            live.LIVE_ALLOWED_SKILLS,
            frozenset(
                {
                    "plugin-authority-scan",
                    "plugin-impact-scope",
                    "agent-execution-compactness",
                    "validator-hardening",
                }
            ),
        )

    def test_real_validator_hardening_output_case_builds_paired_matrix(self):
        live = load_module("validator_hardening_live_matrix", TOOL_DIR / "prepare_live_eval.py")
        repository_sha = "b" * 40
        matrix = live.load_live_base().build_matrix(
            REPO_ROOT,
            "validator-hardening",
            "output",
            "path-ref-adversarial",
            "gpt-5.4",
            repository_sha,
        )
        self.assertEqual(matrix["repository_sha"], repository_sha)
        self.assertEqual(matrix["skill"], "validator-hardening")
        self.assertEqual(
            matrix["fixture_path"],
            ".agents/skills/validator-hardening/evals/evals.json",
        )
        self.assertEqual(matrix["case_id"], "path-ref-adversarial")
        self.assertIn("migration_validator.py", matrix["prompt"])
        self.assertIn("read-only static hardening review", matrix["expected_output"])
        self.assertTrue(any("NUL/control" in item for item in matrix["assertions"]))
        self.assertEqual(matrix["requested_model"], "gpt-5.4")
        self.assertEqual(matrix["modes"], ["with_skill", "baseline_without_target_skill"])

    def test_live_workflow_uses_adapter_and_preserves_credit_gate(self):
        text = LIVE_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("- validator-hardening", text)
        self.assertIn("prepare_live_eval.py matrix", text)
        self.assertEqual(text.count("prepare_live_eval.py prove"), 2)
        gate = text.index("Credit acknowledgement gate")
        install = text.index("Install pinned Copilot CLI package")
        invoke = text.index("Run paired Copilot eval")
        self.assertLess(gate, install)
        self.assertLess(gate, invoke)
        self.assertNotIn("pull_request:", text)
        self.assertNotIn("push:", text)

    def test_zero_credit_surfaces_do_not_promote_validator_hardening(self):
        workflow = ZERO_CREDIT_WORKFLOW.read_text(encoding="utf-8")
        resolver = load_module(
            "validator_hardening_zero_credit_resolver",
            ZERO_CREDIT_RESOLVER,
        )
        self.assertNotIn("validator-hardening", workflow)
        self.assertNotIn("validator-hardening", resolver.ALLOWED_SKILLS)


if __name__ == "__main__":
    unittest.main()
