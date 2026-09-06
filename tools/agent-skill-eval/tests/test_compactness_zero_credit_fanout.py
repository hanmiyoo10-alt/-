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


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, TOOL_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


prepare_local = load_module("compactness_fanout_prepare", "prepare_local_eval.py")
context_builder = load_module("compactness_fanout_context", "build_local_context.py")


class CompactnessZeroCreditFanoutTests(unittest.TestCase):
    def test_existing_repository_harness_prepares_zero_credit_pair(self):
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / "matrix.json"
            code = prepare_local.main(
                [
                    "--repo-root",
                    str(REPO_ROOT),
                    "--skill",
                    "agent-execution-compactness",
                    "--case-id",
                    "existing-repository-harness",
                    "--repository-sha",
                    "a" * 40,
                    "--model-id",
                    prepare_local.DEFAULT_LOCAL_MODEL_ID,
                    "--output",
                    str(output),
                ]
            )
            self.assertEqual(code, 0)
            matrix = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(matrix["expected_output"], "Execution route: HARNESS")
        self.assertEqual(matrix["modes"], ["with_skill", "baseline_without_target_skill"])

    def test_existing_repository_harness_uses_deterministic_empty_context(self):
        context = context_builder.build_context(
            REPO_ROOT,
            PROFILE,
            "agent-execution-compactness",
            "existing-repository-harness",
        )
        self.assertEqual(context["blocks"], [])
        self.assertEqual(context["context_text"], "")
        self.assertEqual(context["context_bytes"], 0)
        self.assertEqual(context["context_sha256"], hashlib.sha256(b"").hexdigest())

    def test_unrelated_missing_compactness_context_remains_fail_closed(self):
        with self.assertRaises(context_builder.ContextError):
            context_builder.build_context(
                REPO_ROOT,
                PROFILE,
                "agent-execution-compactness",
                "ci-mcp-long-validation",
            )


if __name__ == "__main__":
    unittest.main()
