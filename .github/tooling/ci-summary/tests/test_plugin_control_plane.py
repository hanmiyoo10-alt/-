from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADAPTER = ROOT / "adapters" / "plugin_control_plane.py"
SPEC = importlib.util.spec_from_file_location("plugin_control_plane", ADAPTER)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)
RUN = {"id": "1", "attempt": 1, "event": "pull_request", "sha": "a" * 40}


def receipt(result="PASS"):
    checks = [
        {"name": "a", "status": "PASS", "exitCode": 0},
        {"name": "b", "status": "PASS", "exitCode": 0},
        {"name": "c", "status": "PASS", "exitCode": 0},
    ]
    completed = 3
    failure = None
    if result in {"FAIL", "INFRA_ERROR"}:
        checks[1] = {"name": "b", "status": result, "exitCode": 1 if result == "FAIL" else 127}
        checks[2] = {"name": "c", "status": "NOT_RUN", "exitCode": None}
        completed = 2
        failure = checks[1].copy()
    return {
        "schemaVersion": 1,
        "suite": "Plugin Control Plane CI",
        "result": result,
        "failFast": True,
        "plannedCount": 3,
        "completedCount": completed,
        "checks": checks,
        "firstFailure": failure,
    }


class AdapterTests(unittest.TestCase):
    def test_pass(self):
        out = mod.adapt(receipt(), workflow="Plugin Control Plane CI", run=RUN, source_path="r.json")
        self.assertEqual("PASS", out["result"])
        self.assertEqual({"passed": 3, "total": 3, "failed": 0, "warnings": 0}, out["counts"])
        self.assertEqual(3, len(out["checks"]))

    def test_fail(self):
        out = mod.adapt(receipt("FAIL"), workflow="Plugin Control Plane CI", run=RUN, source_path="r.json")
        self.assertEqual("FAIL", out["result"])
        self.assertEqual(1, out["counts"]["passed"])
        self.assertEqual(3, out["counts"]["total"])
        self.assertEqual("b", out["firstFailure"]["phase"])
        self.assertTrue(out["reasonCodes"][0].startswith("PLUGIN_CONTROL_PLANE_CONTRACT_"))
        self.assertEqual(2, len(out["checks"]))

    def test_infra(self):
        out = mod.adapt(receipt("INFRA_ERROR"), workflow="Plugin Control Plane CI", run=RUN, source_path="r.json")
        self.assertEqual("INFRA_ERROR", out["result"])
        self.assertTrue(out["reasonCodes"][0].startswith("PLUGIN_CONTROL_PLANE_INFRA_"))

    def test_pass_with_not_run_is_rejected(self):
        raw = receipt()
        raw["completedCount"] = 2
        raw["checks"][2] = {"name": "c", "status": "NOT_RUN", "exitCode": None}
        with self.assertRaises(ValueError):
            mod.adapt(raw, workflow="x", run=RUN, source_path="r")

    def test_failed_receipt_must_stop_at_failure(self):
        raw = receipt("FAIL")
        raw["checks"][2] = {"name": "c", "status": "PASS", "exitCode": 0}
        with self.assertRaises(ValueError):
            mod.adapt(raw, workflow="x", run=RUN, source_path="r")

    def test_missing_receipt_cli_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            output = Path(td) / "out.json"
            proc = subprocess.run([sys.executable, str(ADAPTER), "--report", str(Path(td) / "missing.json"), "--output", str(output)], check=False)
            self.assertEqual(0, proc.returncode)
            data = json.loads(output.read_text())
            self.assertEqual("INFRA_ERROR", data["result"])
            self.assertFalse(data["complete"])
            self.assertEqual(["PLUGIN_CONTROL_PLANE_RECEIPT_MISSING"], data["reasonCodes"])


if __name__ == "__main__":
    unittest.main()
