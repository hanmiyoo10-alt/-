from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADAPTER_PATH = ROOT / "adapters" / "simcore.py"
SPEC = importlib.util.spec_from_file_location("ci_summary_simcore", ADAPTER_PATH)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)

RUN = {"id": "8219", "attempt": 1, "event": "push", "sha": "a" * 40}


def report(conclusion="PASS"):
    gates = [
        {"id": "GATE_STATIC", "planned": True, "status": "PASS", "reasonCode": None},
        {"id": "GATE_ARCH", "planned": True, "status": "PASS", "reasonCode": None},
        {"id": "GATE_REGRESSION", "planned": True, "status": "PASS", "reasonCode": None},
        {"id": "GATE_STATE", "planned": False, "status": "NOT_APPLICABLE", "reasonCode": None},
    ]
    reasons = []
    details = {}
    if conclusion in {"FAIL", "INFRA_ERROR"}:
        gates[2]["status"] = conclusion
        gates[2]["reasonCode"] = "PERMANENT_REGRESSION_FAIL" if conclusion == "FAIL" else "HARNESS_ERROR"
        reasons = [gates[2]["reasonCode"]]
        details = {"GATE_REGRESSION": {"exitCode": 1, "signal": None, "stderr": "bounded failure"}}
    return {
        "schemaVersion": 1,
        "profile": "MAIN_HEALTH",
        "conclusion": conclusion,
        "reasonCodes": reasons,
        "gates": gates,
        "observationIds": ["WATCH_ONE"],
        "details": details,
        "reportTruncated": False,
    }


class SimCoreAdapterTests(unittest.TestCase):
    def test_pass_mapping(self):
        summary = mod.adapt_report(report(), workflow="SimCore CI", run=RUN, source_path="report.json")
        self.assertEqual("PASS", summary["result"])
        self.assertEqual({"passed": 3, "total": 3, "failed": 0, "warnings": 1}, summary["counts"])
        self.assertEqual(["static", "arch", "regression"], [x["name"] for x in summary["checks"]])
        self.assertIsNone(summary["firstFailure"])

    def test_fail_mapping_exposes_first_gate(self):
        summary = mod.adapt_report(report("FAIL"), workflow="SimCore CI", run=RUN, source_path="report.json")
        self.assertEqual("FAIL", summary["result"])
        self.assertEqual("GATE_REGRESSION", summary["firstFailure"]["phase"])
        self.assertEqual("PERMANENT_REGRESSION_FAIL", summary["firstFailure"]["code"])
        self.assertEqual("bounded failure", summary["firstFailure"]["message"])

    def test_infra_mapping(self):
        summary = mod.adapt_report(report("INFRA_ERROR"), workflow="SimCore CI", run=RUN, source_path="report.json")
        self.assertEqual("INFRA_ERROR", summary["result"])
        self.assertEqual("HARNESS_ERROR", summary["firstFailure"]["code"])

    def test_noop_requires_no_planned_gates(self):
        raw = report()
        raw["profile"] = "PR_MAIN"
        raw["conclusion"] = "NOOP"
        raw["reasonCodes"] = ["NOOP_SIMCORE_DOC_ONLY"]
        for gate in raw["gates"]:
            gate["planned"] = False
            gate["status"] = "NOT_APPLICABLE"
        summary = mod.adapt_report(raw, workflow="SimCore CI", run=RUN, source_path="report.json")
        self.assertEqual("NOOP", summary["result"])
        self.assertEqual(0, summary["counts"]["total"])

    def test_pass_with_failed_gate_is_rejected(self):
        raw = report()
        raw["gates"][0]["status"] = "FAIL"
        raw["gates"][0]["reasonCode"] = "SOURCE_SYNTAX_INVALID"
        with self.assertRaises(ValueError):
            mod.adapt_report(raw, workflow="SimCore CI", run=RUN, source_path="report.json")

    def test_failed_conclusion_without_failed_gate_is_rejected(self):
        raw = report()
        raw["conclusion"] = "FAIL"
        raw["reasonCodes"] = ["MYSTERY"]
        with self.assertRaises(ValueError):
            mod.adapt_report(raw, workflow="SimCore CI", run=RUN, source_path="report.json")

    def test_pending_planned_gate_is_rejected(self):
        raw = report()
        raw["gates"][0]["status"] = "PENDING"
        with self.assertRaises(ValueError):
            mod.adapt_report(raw, workflow="SimCore CI", run=RUN, source_path="report.json")

    def test_missing_report_cli_emits_incomplete_infra_summary(self):
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / "adapter.json"
            proc = subprocess.run(
                [sys.executable, str(ADAPTER_PATH), "--report", str(Path(td) / "missing.json"), "--output", str(output), "--run-id", "42", "--attempt", "1", "--event", "push", "--sha", "b" * 40],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(0, proc.returncode)
            data = json.loads(output.read_text())
            self.assertEqual("INFRA_ERROR", data["result"])
            self.assertFalse(data["complete"])
            self.assertEqual(["SIMCORE_REPORT_MISSING"], data["reasonCodes"])

    def test_malformed_report_cli_emits_invalid_summary(self):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "bad.json"
            source.write_text("[]")
            output = Path(td) / "adapter.json"
            subprocess.run([sys.executable, str(ADAPTER_PATH), "--report", str(source), "--output", str(output)], check=True)
            data = json.loads(output.read_text())
            self.assertEqual(["SIMCORE_REPORT_INVALID"], data["reasonCodes"])


if __name__ == "__main__":
    unittest.main()
