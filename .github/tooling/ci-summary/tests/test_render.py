from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ci_summary_render", ROOT / "render.py")
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


def good_summary(result="PASS"):
    failure = None
    reasons = []
    counts = {"passed": 19, "total": 19, "failed": 0, "warnings": 0}
    if result == "FAIL":
        failure = {"phase": "validation_profile", "code": "VALIDATION_PROFILE_VERSION_MISMATCH", "message": "candidate mismatch"}
        reasons = ["VALIDATION_PROFILE_VERSION_MISMATCH"]
        counts = {"passed": 18, "total": 19, "failed": 1, "warnings": 0}
    return {
        "schemaVersion": 1,
        "workflow": "SimCore CI",
        "run": {"id": "8210", "attempt": 1, "event": "pull_request", "sha": "a" * 40},
        "scope": {"product": "SimCore", "profile": "PR_MAIN"},
        "result": result,
        "counts": counts,
        "checks": [
            {"name": "production_identity", "result": "PASS"},
            {"name": "docs_drift", "result": "PASS" if result == "PASS" else "FAIL"},
        ],
        "reasonCodes": reasons,
        "firstFailure": failure,
        "source": {"kind": "report", "path": ".simcore-ci/simcore-ci-report.json"},
        "complete": True,
    }


class RenderTests(unittest.TestCase):
    def test_pass_render_is_bounded(self):
        summary = mod.normalize_summary(good_summary())
        text = mod.render_text(summary)
        self.assertIn("Result: PASS", text)
        self.assertIn("Checks: 19/19 PASS", text)
        self.assertLessEqual(len(text.splitlines()) - 2, mod.MAX_TEXT_LINES_PASS)

    def test_fail_render_exposes_first_failure(self):
        summary = mod.normalize_summary(good_summary("FAIL"))
        text = mod.render_text(summary)
        self.assertIn("Result: FAIL", text)
        self.assertIn("VALIDATION_PROFILE_VERSION_MISMATCH", text)
        self.assertIn("Drill down:", text)
        self.assertLessEqual(len(text.splitlines()) - 2, mod.MAX_TEXT_LINES_FAIL)

    def test_cancelled_is_supported(self):
        raw = good_summary("FAIL")
        raw["result"] = "CANCELLED"
        raw["reasonCodes"] = ["WORKFLOW_CANCELLED"]
        raw["firstFailure"] = {"phase": "workflow", "code": "WORKFLOW_CANCELLED"}
        normalized = mod.normalize_summary(raw)
        self.assertEqual("CANCELLED", normalized["result"])

    def test_infra_error_is_supported(self):
        raw = good_summary("FAIL")
        raw["result"] = "INFRA_ERROR"
        raw["reasonCodes"] = ["REPORT_MISSING"]
        raw["firstFailure"] = {"phase": "report", "code": "REPORT_MISSING"}
        normalized = mod.normalize_summary(raw)
        self.assertEqual("INFRA_ERROR", normalized["result"])

    def test_malformed_pass_cannot_hide_reason_codes(self):
        raw = good_summary()
        raw["reasonCodes"] = ["BAD"]
        with self.assertRaises(mod.SummaryError):
            mod.normalize_summary(raw)

    def test_incomplete_pass_rejected(self):
        raw = good_summary()
        raw["complete"] = False
        with self.assertRaises(mod.SummaryError):
            mod.normalize_summary(raw)

    def test_reason_codes_are_sorted_deduped_and_bounded(self):
        raw = good_summary("FAIL")
        raw["reasonCodes"] = [f"CODE_{i:02d}" for i in range(25, -1, -1)] + ["CODE_01"]
        normalized = mod.normalize_summary(raw)
        self.assertEqual(20, len(normalized["reasonCodes"]))
        self.assertEqual(sorted(set(normalized["reasonCodes"])), normalized["reasonCodes"])

    def test_checks_are_bounded(self):
        raw = good_summary("FAIL")
        raw["checks"] = [{"name": f"check_{i}", "result": "FAIL"} for i in range(150)]
        normalized = mod.normalize_summary(raw)
        self.assertEqual(100, len(normalized["checks"]))
        self.assertLessEqual(len(mod.render_text(normalized).splitlines()) - 2, mod.MAX_TEXT_LINES_FAIL)

    def test_markdown_escapes_html_and_flattens_newlines(self):
        raw = good_summary("FAIL")
        raw["workflow"] = "<script>alert(1)</script>\nCI"
        raw["firstFailure"]["message"] = "<b>bad</b>\nsecond line"
        rendered = mod.render_markdown(mod.normalize_summary(raw))
        self.assertNotIn("<script>", rendered)
        self.assertIn("&lt;script&gt;", rendered)
        self.assertNotIn("<b>", rendered)
        self.assertIn("second line", rendered)

    def test_canonical_json_is_deterministic(self):
        summary = mod.normalize_summary(good_summary())
        first = mod.canonical_json(summary)
        second = mod.canonical_json(mod.normalize_summary(json.loads(first)))
        self.assertEqual(first, second)

    def test_oversized_input_file_yields_fallback_and_nonzero(self):
        with tempfile.TemporaryDirectory() as td:
            src = Path(td) / "huge.json"
            src.write_bytes(b"{" + b"x" * (mod.MAX_INPUT_BYTES + 1))
            proc = subprocess.run(
                [sys.executable, str(ROOT / "render.py"), "--input", str(src), "--workflow", "Test CI"],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(2, proc.returncode)
            self.assertIn("Result: INFRA_ERROR", proc.stdout)
            self.assertIn("CI_SUMMARY_RENDER_ERROR", proc.stdout)

    def test_missing_input_writes_fallback_outputs(self):
        with tempfile.TemporaryDirectory() as td:
            out_json = Path(td) / "summary.json"
            out_text = Path(td) / "inline.txt"
            out_md = Path(td) / "inline.md"
            proc = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "render.py"),
                    "--input",
                    str(Path(td) / "missing.json"),
                    "--workflow",
                    "Test CI",
                    "--json-out",
                    str(out_json),
                    "--text-out",
                    str(out_text),
                    "--markdown-out",
                    str(out_md),
                ],
                text=True,
                capture_output=True,
                check=False,
                env={**os.environ, "GITHUB_RUN_ID": "42", "GITHUB_RUN_ATTEMPT": "1", "GITHUB_EVENT_NAME": "push", "GITHUB_SHA": "b" * 40},
            )
            self.assertEqual(2, proc.returncode)
            data = json.loads(out_json.read_text())
            self.assertEqual("INFRA_ERROR", data["result"])
            self.assertFalse(data["complete"])
            self.assertIn("CI_SUMMARY_V1_BEGIN", out_text.read_text())
            self.assertIn("Result: INFRA_ERROR", out_md.read_text())

    def test_first_failure_message_is_truncated(self):
        raw = good_summary("FAIL")
        raw["firstFailure"]["message"] = "x" * 1000
        normalized = mod.normalize_summary(raw)
        self.assertLessEqual(len(normalized["firstFailure"]["message"]), mod.MAX_FIRST_FAILURE_MESSAGE)

    def test_schema_file_is_valid_json_and_names_contract(self):
        schema = json.loads((ROOT / "schema.json").read_text())
        self.assertEqual("CI_SUMMARY_V1", schema["title"])
        self.assertEqual(1, schema["properties"]["schemaVersion"]["const"])


if __name__ == "__main__":
    unittest.main()
