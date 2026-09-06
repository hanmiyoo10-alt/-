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


class CompactnessLiveEvalPromotionTests(unittest.TestCase):
    def test_live_allowlist_extends_only_the_live_adapter(self):
        base = load_module("compactness_live_base", TOOL_DIR / "prepare_eval.py")
        live = load_module("compactness_live_adapter", TOOL_DIR / "prepare_live_eval.py")
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
                }
            ),
        )

    def test_real_compactness_output_case_builds_paired_matrix(self):
        live = load_module("compactness_live_matrix", TOOL_DIR / "prepare_live_eval.py")
        matrix = live.load_live_base().build_matrix(
            REPO_ROOT,
            "agent-execution-compactness",
            "output",
            "forty-line-temp-module",
            "gpt-5.4",
            "a" * 40,
        )
        self.assertEqual(matrix["skill"], "agent-execution-compactness")
        self.assertEqual(matrix["case_id"], "forty-line-temp-module")
        self.assertEqual(matrix["expected_output"], "Execution route: MATERIALIZE")
        self.assertEqual(matrix["modes"], ["with_skill", "baseline_without_target_skill"])

    def test_live_workflow_uses_adapter_and_preserves_credit_gate(self):
        text = LIVE_WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("- agent-execution-compactness", text)
        self.assertIn("prepare_live_eval.py matrix", text)
        self.assertEqual(text.count("prepare_live_eval.py prove"), 2)
        self.assertNotIn("prepare_eval.py matrix", text)
        gate = text.index("Credit acknowledgement gate")
        install = text.index("Install pinned Copilot CLI package")
        invoke = text.index("Run paired Copilot eval")
        self.assertLess(gate, install)
        self.assertLess(gate, invoke)
        self.assertNotIn("pull_request:", text)
        self.assertNotIn("push:", text)

    def test_zero_credit_request_promotion_keeps_workflow_dispatch_unchanged(self):
        workflow = ZERO_CREDIT_WORKFLOW.read_text(encoding="utf-8")
        resolver = load_module("compactness_zero_credit_resolver_migration", ZERO_CREDIT_RESOLVER)
        self.assertNotIn("agent-execution-compactness", workflow)
        self.assertEqual(
            resolver.ALLOWED_SKILLS,
            frozenset(
                {
                    "plugin-authority-scan",
                    "plugin-impact-scope",
                    "agent-execution-compactness",
                }
            ),
        )


if __name__ == "__main__":
    unittest.main()
