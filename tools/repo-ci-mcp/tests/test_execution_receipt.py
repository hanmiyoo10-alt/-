from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from repo_ci_mcp.execution_receipt import project_ci_summary_facts
from repo_ci_mcp.github_reader import GitHubReadError
from repo_ci_mcp.summary import BEGIN, END, repo_ci_summary

REPO = Path(__file__).resolve().parents[3]
PROJECTOR = (
    REPO
    / ".github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs"
)


def compact_block(
    run_id: int = 42,
    sha: str = "abcdef1234567890abcdef1234567890abcdef12",
    result: str = "PASS",
    extra: tuple[str, ...] = (),
) -> str:
    return "\n".join(
        (
            BEGIN,
            "CI SUMMARY · Test",
            f"Result: {result}",
            *extra,
            f"Run: {run_id} · attempt 1",
            f"Commit: {sha[:12]}",
            END,
            "",
        )
    )


def github_run(
    *,
    run_id: int = 42,
    sha: str = "abcdef1234567890abcdef1234567890abcdef12",
    status: str = "completed",
    conclusion: str | None = "success",
) -> dict:
    return {
        "id": run_id,
        "run_number": 7,
        "event": "push",
        "head_branch": "main",
        "head_sha": sha,
        "status": status,
        "conclusion": conclusion,
        "path": ".github/workflows/simcore-ci.yml",
    }


class FakeReader:
    repository = "hanmiyoo10-alt/-"

    def __init__(
        self,
        *,
        selected: dict | None = None,
        jobs: list[dict] | None = None,
        logs: dict[int, object] | None = None,
    ):
        self.selected = selected or github_run()
        self.jobs = jobs or [{"id": 9, "name": "test", "conclusion": "success"}]
        self.logs = logs or {
            9: compact_block(self.selected["id"], self.selected["head_sha"])
        }

    def get_run(self, run_id):
        return self.selected

    def list_workflow_runs(self, filename, ref):
        return [self.selected]

    def list_jobs(self, run_id):
        return len(self.jobs), self.jobs

    def get_job_log(self, job_id):
        value = self.logs[job_id]
        if isinstance(value, Exception):
            raise value
        return value


class ExecutionReceiptTests(unittest.TestCase):
    def owner_result(
        self,
        *,
        selected: dict | None = None,
        result: str = "PASS",
        extra: tuple[str, ...] = (),
        log_error: Exception | None = None,
    ) -> dict:
        run = selected or github_run()
        logs = {
            9: log_error
            if log_error is not None
            else compact_block(run["id"], run["head_sha"], result, extra)
        }
        return repo_ci_summary(
            FakeReader(selected=run, logs=logs),
            workflow="simcore",
            run_id=run["id"],
        )

    def project(self, facts: dict):
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

    def test_complete_pass_projects_to_generic_pass_without_raw_text(self):
        owner = self.owner_result()
        owner["summary"]["text"] = "RAW_COMPACT_SUMMARY_SENTINEL"
        facts = project_ci_summary_facts(owner)
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("PASS", facts["result"])
        self.assertEqual(
            "abcdef1234567890abcdef1234567890abcdef12",
            facts["sourceIdentity"]["identity"],
        )
        self.assertEqual(
            ["github-actions:run:42", "github-actions:job:9"],
            facts["artifactLocators"],
        )
        self.assertNotIn("RAW_COMPACT_SUMMARY_SENTINEL", json.dumps(facts))
        code, receipt = self.project(facts)
        self.assertEqual(0, code)
        self.assertEqual("PASS", receipt["result"])
        self.assertEqual("KNOWN", receipt["sourceIdentity"]["status"])

    def test_incomplete_pass_is_partial_not_pass(self):
        owner = self.owner_result(extra=("Summary complete: false",))
        facts = project_ci_summary_facts(owner)
        self.assertEqual("NEEDS_REVIEW", facts["attentionState"])
        self.assertEqual("PARTIAL", facts["result"])
        self.assertIn("CI_SUMMARY_INCOMPLETE", facts["reasonCodes"])
        code, receipt = self.project(facts)
        self.assertEqual(3, code)
        self.assertEqual("PARTIAL", receipt["result"])

    def test_noop_is_partial_not_pass(self):
        owner = self.owner_result(result="NOOP")
        facts = project_ci_summary_facts(owner)
        self.assertEqual("NEEDS_REVIEW", facts["attentionState"])
        self.assertEqual("PARTIAL", facts["result"])
        self.assertEqual(["CI_SUMMARY_NOOP"], facts["reasonCodes"])
        _, receipt = self.project(facts)
        self.assertEqual("PARTIAL", receipt["result"])
    def test_fail_remains_fail(self):
        run = github_run(conclusion="failure")
        owner = self.owner_result(selected=run, result="FAIL")
        facts = project_ci_summary_facts(owner)
        self.assertEqual("COMPLETE", facts["attentionState"])
        self.assertEqual("FAIL", facts["result"])
        code, receipt = self.project(facts)
        self.assertEqual(2, code)
        self.assertEqual("FAIL", receipt["result"])

    def test_infra_error_and_cancelled_are_blocked(self):
        for result, conclusion in (("INFRA_ERROR", "failure"), ("CANCELLED", "cancelled")):
            with self.subTest(result=result):
                run = github_run(conclusion=conclusion)
                owner = self.owner_result(selected=run, result=result)
                facts = project_ci_summary_facts(owner)
                self.assertEqual("BLOCKED", facts["attentionState"])
                self.assertEqual("BLOCKED", facts["result"])
                _, receipt = self.project(facts)
                self.assertEqual("BLOCKED", receipt["result"])

    def test_unknown_remains_unknown(self):
        run = github_run(conclusion="failure")
        owner = self.owner_result(selected=run, result="UNKNOWN")
        facts = project_ci_summary_facts(owner)
        self.assertEqual("UNKNOWN", facts["attentionState"])
        self.assertEqual("UNKNOWN", facts["result"])
        _, receipt = self.project(facts)
        self.assertEqual("UNKNOWN", receipt["result"])

    def test_nonterminal_owner_error_is_running_partial(self):
        run = github_run(status="in_progress", conclusion=None)
        owner = self.owner_result(selected=run)
        self.assertFalse(owner["ok"])
        self.assertEqual("RUN_NOT_TERMINAL", owner["errors"][0]["code"])
        facts = project_ci_summary_facts(owner)
        self.assertEqual("RUNNING", facts["attentionState"])
        self.assertEqual("PARTIAL", facts["result"])
        _, receipt = self.project(facts)
        self.assertEqual("PARTIAL", receipt["result"])

    def test_job_log_unavailable_is_blocked(self):
        owner = self.owner_result(log_error=GitHubReadError("transport down"))
        self.assertFalse(owner["ok"])
        self.assertEqual("JOB_LOG_UNAVAILABLE", owner["errors"][0]["code"])
        facts = project_ci_summary_facts(owner)
        self.assertEqual("BLOCKED", facts["result"])
        self.assertIn("JOB_LOG_UNAVAILABLE", facts["reasonCodes"])
        _, receipt = self.project(facts)
        self.assertEqual("BLOCKED", receipt["result"])

    def test_missing_summary_block_is_unknown(self):
        owner = repo_ci_summary(
            FakeReader(logs={9: "ordinary log only\n"}),
            workflow="simcore",
            run_id=42,
        )
        self.assertEqual("SUMMARY_BLOCK_MISSING", owner["errors"][0]["code"])
        facts = project_ci_summary_facts(owner)
        self.assertEqual("UNKNOWN", facts["result"])
        self.assertIn("SUMMARY_BLOCK_MISSING", facts["reasonCodes"])
        _, receipt = self.project(facts)
        self.assertEqual("UNKNOWN", receipt["result"])
    def test_pass_with_failed_run_conclusion_is_conflict(self):
        run = github_run(conclusion="failure")
        owner = self.owner_result(selected=run, result="PASS")
        facts = project_ci_summary_facts(owner)
        self.assertEqual("CONFLICT", facts["result"])
        self.assertIn(
            "CI_SUMMARY_PASS_RUN_CONCLUSION_CONFLICT",
            facts["conflicts"],
        )
        code, receipt = self.project(facts)
        self.assertEqual(2, code)
        self.assertEqual("CONFLICT", receipt["result"])

    def test_malformed_head_sha_is_rejected(self):
        owner = self.owner_result()
        owner["run"]["head_sha"] = "short"
        with self.assertRaisesRegex(ValueError, "run.head_sha invalid"):
            project_ci_summary_facts(owner)

    def test_extra_top_level_field_is_rejected(self):
        owner = self.owner_result()
        owner["unexpected"] = True
        with self.assertRaisesRegex(ValueError, "unsupported field"):
            project_ci_summary_facts(owner)

    def test_adapter_source_is_pure_and_does_not_parse_raw_logs(self):
        source = (
            REPO / "tools/repo-ci-mcp/repo_ci_mcp/execution_receipt.py"
        ).read_text(encoding="utf-8")
        for forbidden in (
            "GitHubReader",
            "urlopen",
            "requests",
            "subprocess",
            "get_job_log",
            "CI_SUMMARY_V1_BEGIN",
            "CI_SUMMARY_V1_END",
            "normalize_log_line",
            "_candidate_blocks",
            "write_text(",
        ):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
