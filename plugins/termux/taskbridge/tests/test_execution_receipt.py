from __future__ import annotations

import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))

import execution_receipt

PROJECTOR = (
    REPO
    / ".github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs"
)


def job(**overrides):
    value = {
        "job_id": "job_0123456789ab",
        "name": "receipt fixture",
        "adapter": "shell",
        "command": [sys.executable, "-c", "print('PRIVATE_COMMAND_SENTINEL')"],
        "logical_state": "COMPLETED",
        "local_state": "STOPPED",
        "remote_state": "LOCAL_PROCESS",
        "signal_confidence": "HIGH",
        "desired_action": "NONE",
        "worker_pid": None,
        "child_pid": None,
        "exit_code": 0,
        "result_ref": "/private/taskbridge/jobs/job_0123456789ab/stdout.log",
        "error_code": None,
        "created_at": 10.0,
        "started_at": 11.0,
        "last_seen": 12.0,
        "finished_at": 13.0,
        "updated_at": 13.0,
    }
    value.update(overrides)
    return value


def payload(current=None):
    return {
        "schemaVersion": 1,
        "job": current or job(),
        "sourceIdentity": {
            "kind": "REPOSITORY_SHA",
            "locator": "refs/heads/main",
            "identity": "a" * 40,
        },
        "executionSurface": "REMOTE_HARNESS:M",
        "artifactLocator": "artifact:taskbridge/status.json",
    }


class ExecutionReceiptTests(unittest.TestCase):
    def project(self, facts):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "facts.json"
            source.write_text(json.dumps(facts), encoding="utf-8")
            proc = subprocess.run(
                ["node", str(PROJECTOR), "--input-file", str(source)],
                text=True,
                capture_output=True,
                check=False,
            )
            return proc.returncode, json.loads(proc.stdout)

    def test_completed_zero_exit_is_pass_and_omits_private_job_fields(self):
        facts = execution_receipt.project_taskbridge_facts(payload())
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("PASS", facts["result"])
        self.assertEqual(0, facts["exitCode"])
        rendered = json.dumps(facts)
        self.assertNotIn("PRIVATE_COMMAND_SENTINEL", rendered)
        self.assertNotIn("/private/taskbridge", rendered)
        self.assertNotIn("worker_pid", rendered)
        self.assertNotIn("child_pid", rendered)
        self.assertEqual(
            {
                "kind": "REPOSITORY_SHA",
                "locator": "refs/heads/main",
                "identity": "a" * 40,
            },
            facts["sourceIdentity"],
        )
        code, receipt = self.project(facts)
        self.assertEqual(0, code)
        self.assertEqual("PASS", receipt["result"])

    def test_completed_nonzero_exit_is_conflict(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(job(exit_code=3))
        )
        self.assertEqual("CONFLICT", facts["result"])
        self.assertIn("TASKBRIDGE_COMPLETED_EXIT_CONFLICT", facts["conflicts"])
        code, receipt = self.project(facts)
        self.assertEqual(2, code)
        self.assertEqual("CONFLICT", receipt["result"])

    def test_failed_nonzero_exit_is_fail(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="FAILED",
                    exit_code=7,
                    error_code=None,
                )
            )
        )
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("FAIL", facts["result"])
        code, receipt = self.project(facts)
        self.assertEqual(2, code)
        self.assertEqual("FAIL", receipt["result"])

    def test_failed_error_code_without_exit_is_fail(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="FAILED",
                    exit_code=None,
                    error_code="FileNotFoundError",
                )
            )
        )
        self.assertEqual("FAIL", facts["result"])
        self.assertIn("FileNotFoundError", facts["reasonCodes"])
    def test_failed_without_failure_evidence_is_conflict(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="FAILED",
                    exit_code=None,
                    error_code=None,
                )
            )
        )
        self.assertEqual("CONFLICT", facts["result"])
        self.assertIn("TASKBRIDGE_FAILED_EVIDENCE_MISSING", facts["conflicts"])

    def test_active_and_reconnected_are_running_partial(self):
        for state in ("ACTIVE", "RECONNECTED"):
            with self.subTest(state=state):
                facts = execution_receipt.project_taskbridge_facts(
                    payload(
                        job(
                            logical_state=state,
                            local_state="RUNNING",
                            exit_code=None,
                            finished_at=None,
                            worker_pid=123,
                            child_pid=456,
                        )
                    )
                )
                self.assertEqual("RUNNING", facts["attentionState"])
                self.assertEqual("PARTIAL", facts["result"])
                _, receipt = self.project(facts)
                self.assertEqual("PARTIAL", receipt["result"])

    def test_created_is_running_partial(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="CREATED",
                    local_state="NOT_STARTED",
                    remote_state="UNKNOWN",
                    signal_confidence="LOW",
                    exit_code=None,
                    result_ref=None,
                    started_at=None,
                    last_seen=None,
                    finished_at=None,
                )
            )
        )
        self.assertEqual("RUNNING", facts["attentionState"])
        self.assertEqual("PARTIAL", facts["result"])
        self.assertIn("TASKBRIDGE_JOB_NOT_STARTED", facts["reasonCodes"])

    def test_suspected_stall_preserves_unknown_instead_of_failure(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="SUSPECTED_STALL",
                    local_state="STALE",
                    exit_code=None,
                    finished_at=None,
                    worker_pid=None,
                )
            )
        )
        self.assertEqual("NEEDS_REVIEW", facts["attentionState"])
        self.assertEqual("UNKNOWN", facts["result"])
        self.assertIn(
            "TASKBRIDGE_COMPLETION_STATE_UNKNOWN",
            facts["requiredUnknowns"],
        )
        _, receipt = self.project(facts)
        self.assertEqual("UNKNOWN", receipt["result"])

    def test_unknown_state_preserves_unknown(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="UNKNOWN",
                    local_state="STOPPED",
                    exit_code=None,
                    finished_at=None,
                )
            )
        )
        self.assertEqual("UNKNOWN", facts["attentionState"])
        self.assertEqual("UNKNOWN", facts["result"])

    def test_cancelled_is_blocked(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(
                job(
                    logical_state="CANCELLED",
                    exit_code=None,
                    result_ref=None,
                )
            )
        )
        self.assertEqual("BLOCKED", facts["attentionState"])
        self.assertEqual("BLOCKED", facts["result"])
        _, receipt = self.project(facts)
        self.assertEqual("BLOCKED", receipt["result"])

    def test_unsupported_non_shell_adapter_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "job.adapter unsupported"):
            execution_receipt.project_taskbridge_facts(
                payload(job(adapter="chatgpt_notification"))
            )

    def test_terminal_local_state_contradiction_is_conflict(self):
        facts = execution_receipt.project_taskbridge_facts(
            payload(job(local_state="RUNNING"))
        )
        self.assertEqual("CONFLICT", facts["result"])
        self.assertIn(
            "TASKBRIDGE_COMPLETED_LOCAL_STATE_CONFLICT",
            facts["conflicts"],
        )
    def test_caller_identity_and_artifact_are_required(self):
        current = payload()
        current.pop("sourceIdentity")
        with self.assertRaisesRegex(ValueError, "sourceIdentity"):
            execution_receipt.project_taskbridge_facts(current)

        current = payload()
        current["artifactLocator"] = ""
        with self.assertRaisesRegex(ValueError, "artifactLocator"):
            execution_receipt.project_taskbridge_facts(current)

    def test_cli_is_stdout_only(self):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td) / "input.json"
            source.write_text(json.dumps(payload()), encoding="utf-8")
            out = io.StringIO()
            with redirect_stdout(out):
                rc = execution_receipt.main(["--input-file", str(source)])
            self.assertEqual(0, rc)
            facts = json.loads(out.getvalue())
            self.assertEqual("PASS", facts["result"])
            self.assertEqual([], list(Path(td).glob("*.out")))

    def test_source_is_pure_and_does_not_touch_taskbridge_owner_state(self):
        source = (ROOT / "execution_receipt.py").read_text(encoding="utf-8")
        for forbidden in (
            "import subprocess",
            "from subprocess",
            "sqlite3",
            "from store",
            "import store",
            "from runtime",
            "import runtime",
            "socket",
            "urllib",
            "requests",
            "os.kill",
            "Popen",
            "write_text(",
            "open(",
        ):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
