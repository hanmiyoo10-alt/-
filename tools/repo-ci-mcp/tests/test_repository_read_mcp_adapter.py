from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ADAPTER_PATH = ROOT / ".github/tooling/ci-summary/adapters/repository_read_mcp.py"
SPEC = importlib.util.spec_from_file_location("repository_read_mcp_adapter", ADAPTER_PATH)
assert SPEC and SPEC.loader
ADAPTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ADAPTER)

RUN = {"id": "42", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def adapt(install: str, compile_: str, unit_tests: str):
    return ADAPTER.adapt(
        workflow="Repository Read MCP CI",
        run=RUN,
        step_outcomes={"install": install, "compile": compile_, "unit_tests": unit_tests},
    )


class RepositoryReadMcpAdapterTests(unittest.TestCase):
    def test_all_success_is_pass(self):
        out = adapt("success", "success", "success")
        self.assertEqual(out["result"], "PASS")
        self.assertEqual(out["counts"], {"passed": 3, "total": 3, "failed": 0, "warnings": 0})
        self.assertEqual([row["result"] for row in out["checks"]], ["PASS", "PASS", "PASS"])
        self.assertTrue(out["complete"])

    def test_install_failure_is_visible(self):
        out = adapt("failure", "skipped", "skipped")
        self.assertEqual(out["result"], "FAIL")
        self.assertEqual(out["reasonCodes"], ["REPOSITORY_READ_MCP_INSTALL_FAILED"])
        self.assertEqual([row["result"] for row in out["checks"]], ["FAIL", "SKIPPED", "SKIPPED"])

    def test_compile_cancellation_is_visible(self):
        out = adapt("success", "cancelled", "skipped")
        self.assertEqual(out["result"], "CANCELLED")
        self.assertEqual(out["reasonCodes"], ["REPOSITORY_READ_MCP_COMPILE_CANCELLED"])
        self.assertEqual(out["counts"]["passed"], 1)

    def test_unit_test_failure_preserves_prior_passes(self):
        out = adapt("success", "success", "failure")
        self.assertEqual(out["result"], "FAIL")
        self.assertEqual(out["counts"]["passed"], 2)
        self.assertEqual(out["firstFailure"]["phase"], "unit_tests")

    def test_skipped_before_terminal_fails_closed(self):
        with self.assertRaises(ValueError):
            adapt("success", "skipped", "skipped")

    def test_success_after_terminal_fails_closed(self):
        with self.assertRaises(ValueError):
            adapt("failure", "success", "skipped")

    def test_invalid_outcome_fails_closed(self):
        with self.assertRaises(ValueError):
            adapt("green", "skipped", "skipped")


if __name__ == "__main__":
    unittest.main()
