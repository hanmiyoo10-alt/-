from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.exact_sha import repo_ci_exact_sha
from repo_ci_mcp.github_reader import GitHubReadError

SHA = "a" * 40
BEFORE = "b" * 40
BLOB = "c" * 40
WORKFLOW = ".github/workflows/product-simcore-candidate-materialize.yml"


def workflow_source(body: str) -> dict:
    raw = ("on:\n" + body).encode()
    return {"content": raw, "blob_sha": BLOB, "size": len(raw)}


def run(event: str, run_id: int = 1) -> dict:
    return {
        "id": run_id, "name": "Candidate materialize", "path": WORKFLOW,
        "event": event, "head_sha": SHA, "head_branch": "main",
        "status": "completed", "conclusion": "success", "run_number": run_id,
        "run_attempt": 1, "html_url": f"https://example.invalid/{run_id}",
    }


def reader() -> Mock:
    value = Mock()
    value.repository = "owner/repo"
    value.list_runs_exact_sha.return_value = (0, [])
    value.get_repository_file.return_value = workflow_source(
        "  push:\n    branches: [main]\n"
    )
    value.compare_changed_paths.return_value = (["docs/readme.md"], True)
    return value


class ExactShaTests(unittest.TestCase):
    def test_ran_preserves_all_matching_event_identities(self):
        value = reader()
        runs = [run("push", 1), run("workflow_dispatch", 2)]
        value.list_runs_exact_sha.return_value = (2, runs)
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="push", ref="main")
        self.assertEqual(result["disposition"], "RAN")
        self.assertEqual([item["event"] for item in result["runs"]], ["push", "workflow_dispatch"])
        value.get_repository_file.assert_not_called()

    def test_sha_only_empty_inventory_preserves_unknown(self):
        result = repo_ci_exact_sha(reader(), SHA)
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["WORKFLOW_REQUIRED_FOR_ABSENCE"])

    def test_path_filtered_absence_requires_complete_transition(self):
        value = reader()
        value.get_repository_file.return_value = workflow_source(
            "  push:\n    branches: [main]\n    paths:\n      - 'products/simcore/releases/candidate-requests/**'\n"
        )
        result = repo_ci_exact_sha(
            value, SHA, WORKFLOW, event="push", ref="main", before_sha=BEFORE,
        )
        self.assertEqual(result["disposition"], "EXPECTED_NO_RUN_PATH_FILTER")
        self.assertEqual(result["reason_codes"], ["PATH_FILTERED"])
        self.assertEqual(result["evidence"]["before_sha"], BEFORE)

    def test_matching_path_without_run_is_unexpected(self):
        value = reader()
        value.get_repository_file.return_value = workflow_source(
            "  push:\n    branches: [main]\n    paths:\n      - 'products/**'\n"
        )
        value.compare_changed_paths.return_value = (["products/demo/file.txt"], True)
        result = repo_ci_exact_sha(
            value, SHA, WORKFLOW, event="push", ref="main", before_sha=BEFORE,
        )
        self.assertEqual(result["disposition"], "MISSING_UNEXPECTED")
        self.assertEqual(result["reason_codes"], ["APPLICABLE_TRIGGER_NO_RUN"])

    def test_event_and_ref_inapplicable_are_distinct(self):
        value = reader()
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="pull_request", ref="main")
        self.assertEqual(result["disposition"], "TRIGGER_NOT_APPLICABLE")
        self.assertEqual(result["reason_codes"], ["EVENT_NOT_CONFIGURED"])
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="push", ref="dev")
        self.assertEqual(result["disposition"], "TRIGGER_NOT_APPLICABLE")
        self.assertEqual(result["reason_codes"], ["REF_FILTERED"])

    def test_path_filter_without_before_sha_stays_unknown(self):
        value = reader()
        value.get_repository_file.return_value = workflow_source(
            "  push:\n    paths: [docs/**]\n"
        )
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="push", ref="main")
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["TRANSITION_IDENTITY_REQUIRED"])

    def test_permission_block_is_not_missing(self):
        value = reader()
        value.get_repository_file.side_effect = GitHubReadError("forbidden", status_code=403)
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="push", ref="main")
        self.assertEqual(result["disposition"], "BLOCKED_CAPABILITY")
        self.assertEqual(result["reason_codes"], ["WORKFLOW_SOURCE_READ_BLOCKED"])

    def test_inventory_permission_block_is_explicit(self):
        value = reader()
        value.list_runs_exact_sha.side_effect = GitHubReadError("forbidden", status_code=403)
        result = repo_ci_exact_sha(value, SHA, WORKFLOW)
        self.assertEqual(result["disposition"], "BLOCKED_CAPABILITY")
        self.assertEqual(result["reason_codes"], ["RUN_INVENTORY_READ_BLOCKED"])

    def test_unsupported_trigger_and_incomplete_inventory_fail_closed(self):
        value = reader()
        value.get_repository_file.return_value = workflow_source(
            "  push:\n    types: [created]\n"
        )
        result = repo_ci_exact_sha(value, SHA, WORKFLOW, event="push", ref="main")
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["WORKFLOW_TRIGGER_UNSUPPORTED"])

        value = reader()
        value.list_runs_exact_sha.return_value = (2, [run("push")])
        result = repo_ci_exact_sha(value, SHA, WORKFLOW)
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["RUN_INVENTORY_INCOMPLETE"])

    def test_changed_path_bound_preserves_unknown(self):
        value = reader()
        value.get_repository_file.return_value = workflow_source(
            "  push:\n    paths: [docs/**]\n"
        )
        value.compare_changed_paths.return_value = (["docs/a.md"], False)
        result = repo_ci_exact_sha(
            value, SHA, WORKFLOW, event="push", ref="main", before_sha=BEFORE,
        )
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reason_codes"], ["CHANGED_PATHS_INCOMPLETE"])


if __name__ == "__main__":
    unittest.main()
