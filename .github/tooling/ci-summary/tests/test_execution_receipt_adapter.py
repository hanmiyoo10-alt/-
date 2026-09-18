from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
SPEC = importlib.util.spec_from_file_location(
    "execution_receipt_adapter", ROOT / "execution_receipt_adapter.py"
)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)

PROJECTOR = (
    REPO
    / ".github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs"
)


class ExecutionReceiptAdapterTests(unittest.TestCase):
    def report(self, result: str = "PASS"):
        checks = [
            {"name": "lint", "status": "PASS", "exitCode": 0},
            {"name": "test", "status": "PASS", "exitCode": 0},
        ]
        first_failure = None
        completed = 2
        if result == "RUNNING":
            checks[1] = {"name": "test", "status": "NOT_RUN", "exitCode": None}
            completed = 1
        elif result == "FAIL":
            checks[1] = {"name": "test", "status": "FAIL", "exitCode": 7}
            first_failure = {"name": "test", "status": "FAIL", "exitCode": 7}
        elif result == "INFRA_ERROR":
            checks[1] = {"name": "test", "status": "INFRA_ERROR", "exitCode": 127}
            first_failure = {
                "name": "test",
                "status": "INFRA_ERROR",
                "exitCode": 127,
                "message": "launch failed",
            }
        return {
            "schemaVersion": 1,
            "suite": "Example Checks",
            "result": result,
            "failFast": True,
            "plannedCount": 2,
            "completedCount": completed,
            "checks": checks,
            "firstFailure": first_failure,
        }
    def facts(self, report):
        return mod.build_facts(
            report,
            source_kind="REPOSITORY_SHA",
            source_locator="refs/heads/main",
            source_identity="a" * 40,
            execution_surface="REMOTE_HARNESS:M",
            artifact_locator="artifact:ci/example-report.json",
        )

    def project(self, facts):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "facts.json"
            path.write_text(json.dumps(facts), encoding="utf-8")
            proc = subprocess.run(
                ["node", str(PROJECTOR), "--input-file", str(path)],
                text=True,
                capture_output=True,
                check=False,
            )
            return proc.returncode, json.loads(proc.stdout)

    def test_pass_maps_to_complete_pass_and_projects_cleanly(self):
        facts = self.facts(self.report("PASS"))
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("PASS", facts["result"])
        self.assertEqual(
            [
                {"name": "planned", "value": 2},
                {"name": "completed", "value": 2},
                {"name": "passed", "value": 2},
                {"name": "failed", "value": 0},
                {"name": "infra_error", "value": 0},
                {"name": "not_run", "value": 0},
            ],
            facts["counters"],
        )
        code, receipt = self.project(facts)
        self.assertEqual(0, code)
        self.assertEqual("VALID", receipt["validity"])
        self.assertEqual("PASS", receipt["result"])

    def test_running_preserves_not_run_without_fake_pass(self):
        facts = self.facts(self.report("RUNNING"))
        self.assertEqual("RUNNING", facts["attentionState"])
        self.assertEqual("PARTIAL", facts["result"])
        counters = {row["name"]: row["value"] for row in facts["counters"]}
        self.assertEqual(1, counters["not_run"])
        self.assertEqual(["RUNNER_IN_PROGRESS"], facts["reasonCodes"])
        code, receipt = self.project(facts)
        self.assertEqual(3, code)
        self.assertEqual("PARTIAL", receipt["result"])
    def test_fail_emits_attention_step_and_failure_exit(self):
        facts = self.facts(self.report("FAIL"))
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("FAIL", facts["result"])
        self.assertEqual(7, facts["exitCode"])
        self.assertEqual("test", facts["steps"][1]["name"])
        self.assertEqual("FAIL", facts["steps"][1]["result"])
        self.assertEqual(["CHECK_FAILED"], facts["reasonCodes"])
        code, receipt = self.project(facts)
        self.assertEqual(2, code)
        self.assertEqual("FAIL", receipt["result"])

    def test_infra_error_is_blocked_not_pass(self):
        facts = self.facts(self.report("INFRA_ERROR"))
        self.assertEqual("BLOCKED", facts["attentionState"])
        self.assertEqual("BLOCKED", facts["result"])
        self.assertEqual(["RUNNER_INFRA_ERROR"], facts["reasonCodes"])
        self.assertEqual(["RUNNER_COMMAND_LAUNCH_BLOCKED"], facts["blockers"])
        code, receipt = self.project(facts)
        self.assertEqual(3, code)
        self.assertEqual("BLOCKED", receipt["result"])

    def test_large_pass_suite_stays_bounded_and_keeps_counts(self):
        report = self.report("PASS")
        report["plannedCount"] = 80
        report["completedCount"] = 80
        report["checks"] = [
            {"name": f"check-{i}", "status": "PASS", "exitCode": 0}
            for i in range(80)
        ]
        facts = self.facts(report)
        self.assertEqual(1, len(facts["steps"]))
        counters = {row["name"]: row["value"] for row in facts["counters"]}
        self.assertEqual(80, counters["planned"])
        self.assertEqual(80, counters["passed"])
        self.assertEqual(
            ["artifact:ci/example-report.json"], facts["artifactLocators"]
        )
    def test_loader_rejects_inconsistent_pass(self):
        report = self.report("PASS")
        report["checks"][1]["status"] = "NOT_RUN"
        report["checks"][1]["exitCode"] = None
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "report.json"
            path.write_text(json.dumps(report), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "completedCount conflicts"):
                mod._load_report(str(path))

    def test_loader_rejects_symlink_report(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "target.json"
            link = Path(td) / "report.json"
            target.write_text(json.dumps(self.report()), encoding="utf-8")
            link.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "regular non-symlink"):
                mod._load_report(str(link))

    def test_adapter_source_is_pure_no_execution_or_network(self):
        source = (ROOT / "execution_receipt_adapter.py").read_text(encoding="utf-8")
        self.assertNotIn("import subprocess", source)
        self.assertNotIn("urllib", source)
        self.assertNotIn("requests", source)
        self.assertNotIn("os.system", source)
        self.assertNotIn("Popen", source)

    def test_cli_writes_facts_without_raw_failure_message(self):
        report = self.report("INFRA_ERROR")
        with tempfile.TemporaryDirectory() as td:
            report_path = Path(td) / "report.json"
            output_path = Path(td) / "facts.json"
            report_path.write_text(json.dumps(report), encoding="utf-8")
            code = mod.main([
                "--report", str(report_path),
                "--source-kind", "REPOSITORY_SHA",
                "--source-locator", "refs/heads/main",
                "--source-identity", "b" * 40,
                "--execution-surface", "LOCAL_HARNESS",
                "--artifact-locator", "artifact:ci/report.json",
                "--output", str(output_path),
            ])
            self.assertEqual(0, code)
            rendered = output_path.read_text(encoding="utf-8")
            self.assertNotIn("launch failed", rendered)
            self.assertIn("RUNNER_INFRA_ERROR", rendered)


if __name__ == "__main__":
    unittest.main()
