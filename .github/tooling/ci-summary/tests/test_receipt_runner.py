from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("receipt_runner", ROOT / "receipt_runner.py")
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class ReceiptRunnerTests(unittest.TestCase):
    def manifest(self):
        return {
            "schemaVersion": 1,
            "suite": "Test Suite",
            "checks": [
                {"name": "one", "command": [sys.executable, "-c", "print('one')"]},
                {"name": "two", "command": [sys.executable, "-c", "print('two')"]},
            ],
        }

    def test_all_pass_records_all(self):
        with tempfile.TemporaryDirectory() as td:
            report = Path(td) / "report.json"
            code = mod.run_manifest(self.manifest(), str(report))
            self.assertEqual(0, code)
            data = json.loads(report.read_text())
            self.assertEqual("PASS", data["result"])
            self.assertEqual(2, data["completedCount"])
            self.assertEqual(["PASS", "PASS"], [x["status"] for x in data["checks"]])

    def test_failure_is_fail_fast_and_preserves_nonzero(self):
        manifest = self.manifest()
        manifest["checks"].insert(1, {"name": "fail", "command": [sys.executable, "-c", "raise SystemExit(7)"]})
        with tempfile.TemporaryDirectory() as td:
            report = Path(td) / "report.json"
            code = mod.run_manifest(manifest, str(report))
            self.assertEqual(7, code)
            data = json.loads(report.read_text())
            self.assertEqual("FAIL", data["result"])
            self.assertEqual(2, data["completedCount"])
            self.assertEqual(["PASS", "FAIL", "NOT_RUN"], [x["status"] for x in data["checks"]])
            self.assertEqual("fail", data["firstFailure"]["name"])

    def test_launch_failure_is_infra_error(self):
        manifest = {"schemaVersion": 1, "suite": "Test", "checks": [{"name": "missing", "command": ["definitely-no-such-command-xyz"]}]}
        with tempfile.TemporaryDirectory() as td:
            report = Path(td) / "report.json"
            code = mod.run_manifest(manifest, str(report))
            self.assertEqual(127, code)
            data = json.loads(report.read_text())
            self.assertEqual("INFRA_ERROR", data["result"])
            self.assertEqual("INFRA_ERROR", data["checks"][0]["status"])

    def test_initial_report_is_written_before_execution(self):
        manifest = self.manifest()
        with tempfile.TemporaryDirectory() as td:
            report = Path(td) / "report.json"
            mod._write_report(str(report), mod._initial_report(manifest))
            data = json.loads(report.read_text())
            self.assertEqual("RUNNING", data["result"])
            self.assertEqual(["NOT_RUN", "NOT_RUN"], [x["status"] for x in data["checks"]])

    def test_manifest_validation_rejects_duplicates(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "manifest.json"
            raw = self.manifest()
            raw["checks"][1]["name"] = "one"
            path.write_text(json.dumps(raw))
            with self.assertRaises(ValueError):
                mod._load_manifest(str(path))

    def test_manifest_validation_rejects_shell_string(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "manifest.json"
            raw = self.manifest()
            raw["checks"][0]["command"] = "echo bad"
            path.write_text(json.dumps(raw))
            with self.assertRaises(ValueError):
                mod._load_manifest(str(path))


if __name__ == "__main__":
    unittest.main()
