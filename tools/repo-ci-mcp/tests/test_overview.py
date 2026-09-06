from __future__ import annotations

import unittest
from unittest.mock import patch

from repo_ci_mcp.overview import MAX_OVERVIEW_WORKFLOWS, repo_ci_overview


class Reader:
    repository = "hanmiyoo10-alt/-"


def summary_result(workflow: str, result: str = "PASS", *, ok: bool = True, complete: bool = True):
    if not ok:
        return {
            "ok": False,
            "repository": Reader.repository,
            "selection": {"workflow_key": workflow},
            "run": None,
            "summary": None,
            "source": None,
            "errors": [{"code": "RUN_NOT_FOUND", "message": "missing"}],
        }
    return {
        "ok": True,
        "repository": Reader.repository,
        "selection": {"workflow_key": workflow},
        "run": {
            "id": 100 + len(workflow),
            "head_branch": "main",
            "head_sha": "a" * 40,
            "status": "completed",
            "conclusion": "success" if result in {"PASS", "NOOP"} else "failure",
        },
        "summary": {"result": result, "complete": complete, "text": "large compact block intentionally omitted by overview"},
        "source": {"kind": "github_actions_job_log_compact_block", "job_id": 77, "job_name": "test"},
        "errors": [],
    }


class RepoCiOverviewTests(unittest.TestCase):
    def test_projects_two_workflows_without_embedding_summary_text(self):
        def build(_reader, *, workflow, ref, run_id=None):
            self.assertEqual(ref, "main")
            self.assertIsNone(run_id)
            return summary_result(workflow, "PASS" if workflow == "simcore" else "NOOP")

        with patch("repo_ci_mcp.overview.repo_ci_summary", side_effect=build) as mocked:
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills"])

        self.assertTrue(out["ok"])
        self.assertFalse(out["attention_required"])
        self.assertEqual(out["selection"]["workflow_keys"], ["simcore", "agent-skills"])
        self.assertEqual(out["result_counts"]["PASS"], 1)
        self.assertEqual(out["result_counts"]["NOOP"], 1)
        self.assertEqual(mocked.call_count, 2)
        self.assertNotIn("text", out["items"][0])
        self.assertNotIn("text", out["items"][1])

    def test_mixed_pass_fail_is_not_aggregate_green(self):
        def build(_reader, *, workflow, ref, run_id=None):
            return summary_result(workflow, "FAIL" if workflow == "agent-skills" else "PASS")

        with patch("repo_ci_mcp.overview.repo_ci_summary", side_effect=build):
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills"])

        self.assertTrue(out["ok"])
        self.assertTrue(out["attention_required"])
        self.assertEqual(out["attention_workflows"], ["agent-skills"])
        self.assertEqual(out["result_counts"]["PASS"], 1)
        self.assertEqual(out["result_counts"]["FAIL"], 1)
        self.assertNotIn("result", out)

    def test_partial_retrieval_failure_preserves_successful_sibling(self):
        def build(_reader, *, workflow, ref, run_id=None):
            if workflow == "agent-skills":
                return summary_result(workflow, ok=False)
            return summary_result(workflow, "PASS")

        with patch("repo_ci_mcp.overview.repo_ci_summary", side_effect=build):
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills"])

        self.assertFalse(out["ok"])
        self.assertTrue(out["attention_required"])
        self.assertEqual(out["unavailable_count"], 1)
        self.assertEqual(out["items"][0]["ci_result"], "PASS")
        self.assertEqual(out["items"][1]["errors"][0]["code"], "RUN_NOT_FOUND")

    def test_incomplete_summary_requires_attention_without_changing_transport_ok(self):
        def build(_reader, *, workflow, ref, run_id=None):
            return summary_result(workflow, "PASS", complete=workflow != "agent-skills")

        with patch("repo_ci_mcp.overview.repo_ci_summary", side_effect=build):
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills"])

        self.assertTrue(out["ok"])
        self.assertTrue(out["attention_required"])
        self.assertEqual(out["attention_workflows"], ["agent-skills"])

    def test_explicit_ref_is_forwarded_to_every_component(self):
        seen = []

        def build(_reader, *, workflow, ref, run_id=None):
            seen.append((workflow, ref))
            return summary_result(workflow)

        with patch("repo_ci_mcp.overview.repo_ci_summary", side_effect=build):
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills", "plugin-control-plane"], ref="release-check")

        self.assertTrue(out["ok"])
        self.assertEqual(
            seen,
            [
                ("simcore", "release-check"),
                ("agent-skills", "release-check"),
                ("plugin-control-plane", "release-check"),
            ],
        )

    def test_invalid_requests_fail_before_repository_reads(self):
        cases = [
            (["simcore"], "WORKFLOW_COUNT_INVALID"),
            (["simcore"] * (MAX_OVERVIEW_WORKFLOWS + 1), "WORKFLOW_COUNT_INVALID"),
            (["simcore", ".github/workflows/simcore-ci.yml"], "WORKFLOW_DUPLICATE"),
            (["simcore", "not-a-workflow"], "WORKFLOW_UNSUPPORTED"),
        ]
        for workflows, code in cases:
            with self.subTest(workflows=workflows), patch("repo_ci_mcp.overview.repo_ci_summary") as mocked:
                out = repo_ci_overview(Reader(), workflows)
                self.assertFalse(out["ok"])
                self.assertEqual(out["errors"][0]["code"], code)
                mocked.assert_not_called()

    def test_empty_ref_fails_before_repository_reads(self):
        with patch("repo_ci_mcp.overview.repo_ci_summary") as mocked:
            out = repo_ci_overview(Reader(), ["simcore", "agent-skills"], ref="")
        self.assertFalse(out["ok"])
        self.assertEqual(out["errors"][0]["code"], "REF_INVALID")
        mocked.assert_not_called()


if __name__ == "__main__":
    unittest.main()
