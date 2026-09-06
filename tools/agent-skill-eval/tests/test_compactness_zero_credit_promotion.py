from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
TOOL_DIR = HERE.parents[1]
REPO_ROOT = HERE.parents[3]
PROFILE = TOOL_DIR / "local-context-profiles.json"
WORKFLOW = REPO_ROOT / ".github/workflows/agent-skill-zero-credit-eval.yml"


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, TOOL_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


resolver = load_module("compactness_zero_credit_resolver", "resolve_zero_credit_request.py")
prepare_local = load_module("compactness_zero_credit_prepare", "prepare_local_eval.py")
context_builder = load_module("compactness_zero_credit_context", "build_local_context.py")


class CompactnessZeroCreditPromotionTests(unittest.TestCase):
    def test_zero_credit_skill_allowlists_are_exact_and_local(self):
        expected = {
            "plugin-authority-scan",
            "plugin-impact-scope",
            "agent-execution-compactness",
        }
        self.assertEqual(set(resolver.ALLOWED_SKILLS), expected)
        self.assertEqual(set(prepare_local.LOCAL_SKILLS), expected)
        base = prepare_local._load_base()
        self.assertEqual(
            set(base.ALLOWED_SKILLS),
            {"plugin-authority-scan", "plugin-impact-scope"},
        )

    def test_compactness_request_normalizes_and_unrelated_skill_fails_closed(self):
        sha = "a" * 40
        out = resolver.resolve_dispatch(
            sha,
            "agent-execution-compactness",
            "forty-line-temp-module",
            "qwen2.5-1.5b-instruct-q4_k_m",
        )
        self.assertEqual(out["target_repository_sha"], sha)
        self.assertEqual(out["skill"], "agent-execution-compactness")
        self.assertEqual(out["case_id"], "forty-line-temp-module")
        with self.assertRaises(resolver.RequestError):
            resolver.resolve_dispatch(sha, "simcore", "x")

    def test_real_compactness_fixture_prepares_local_pair_matrix(self):
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / "matrix.json"
            code = prepare_local.main(
                [
                    "--repo-root",
                    str(REPO_ROOT),
                    "--skill",
                    "agent-execution-compactness",
                    "--case-id",
                    "forty-line-temp-module",
                    "--repository-sha",
                    "b" * 40,
                    "--model-id",
                    prepare_local.DEFAULT_LOCAL_MODEL_ID,
                    "--output",
                    str(output),
                ]
            )
            self.assertEqual(code, 0)
            matrix = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(matrix["skill"], "agent-execution-compactness")
        self.assertEqual(matrix["case_id"], "forty-line-temp-module")
        self.assertEqual(matrix["expected_output"], "Execution route: MATERIALIZE")
        self.assertEqual(
            matrix["modes"],
            ["with_skill", "baseline_without_target_skill"],
        )
        self.assertEqual(
            matrix["execution_surface"],
            "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS",
        )

    def test_exact_compactness_case_gets_deterministic_empty_context(self):
        context = context_builder.build_context(
            REPO_ROOT,
            PROFILE,
            "agent-execution-compactness",
            "forty-line-temp-module",
        )
        self.assertEqual(context["blocks"], [])
        self.assertEqual(context["context_text"], "")
        self.assertEqual(context["context_bytes"], 0)
        self.assertEqual(context["context_sha256"], hashlib.sha256(b"").hexdigest())

    def test_other_missing_compactness_context_stays_fail_closed(self):
        with self.assertRaises(context_builder.ContextError):
            context_builder.build_context(
                REPO_ROOT,
                PROFILE,
                "agent-execution-compactness",
                "existing-unittest-command",
            )

    def test_existing_zero_credit_harness_security_boundary_is_unchanged(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("agent-skill-zero-credit-request/**", workflow)
        self.assertIn(".agent-skill-zero-credit-requests/*.json", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("copilot-requests", workflow.lower())
        self.assertIn("resolve_zero_credit_request.py", workflow)
        self.assertIn("prepare_local_eval.py", workflow)
        self.assertIn("build_local_context.py", workflow)


if __name__ == "__main__":
    unittest.main()
