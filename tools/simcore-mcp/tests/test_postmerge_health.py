from __future__ import annotations

import unittest
from copy import deepcopy
from unittest.mock import patch

from simcore_mcp.github_reader import GitHubConfig, GitHubReadError, GitHubReader
from simcore_mcp.postmerge_health import postmerge_health

TARGET = "a" * 40
MAIN = "b" * 40
SUCCESSOR = "c" * 40
OTHER = "d" * 40

GOOD_MANIFEST = {
    "production_version": "0.70.10",
    "release_branch": "release-simcore",
    "release_commit": "e" * 40,
    "release_blob": "f" * 40,
}
GOOD_PRODUCTION = {
    "pass": True,
    "declared": deepcopy(GOOD_MANIFEST),
    "violations": [],
    "errors": [],
}
GOOD_DOCS = {"pass": True, "violations": [], "errors": []}


def commit(sha, message="Merge pull request #1 from x/y\n\nthing", parents=None):
    return {
        "sha": sha,
        "commit": {"message": message},
        "parents": [{"sha": p} for p in (parents or [OTHER])],
    }


def run(run_id, sha, *, conclusion="success", status="completed", created="2026-09-06T00:00:00Z"):
    return {
        "id": run_id,
        "head_sha": sha,
        "head_branch": "main",
        "event": "push",
        "status": status,
        "conclusion": conclusion,
        "created_at": created,
        "run_number": run_id,
    }


class FakeReader:
    repository = "owner/repo"
    main_branch = "main"

    def __init__(self):
        self.main_head = TARGET
        self.target_commit = commit(TARGET)
        self.target_error = None
        self.manifest = deepcopy(GOOD_MANIFEST)
        self.manifest_blob = "manifest-blob"
        self.manifest_error = None
        self.workflow_errors = {}
        self.workflow_runs = {
            ".github/workflows/simcore-ci.yml": [run(1, TARGET)],
            ".github/workflows/canonical-main-docs.yml": [run(2, TARGET)],
        }
        self.compare_target_main = None
        self.descendants = {SUCCESSOR, MAIN}
        self.compare_errors = set()
        self.successor_commits = []
        self.total_commits = None

    def get_commit(self, sha):
        if self.target_error:
            raise self.target_error
        return deepcopy(self.target_commit)

    def get_branch_sha(self, branch):
        return self.main_head

    def compare_commits(self, base, head):
        if head in self.compare_errors:
            raise GitHubReadError(f"compare:{base}...{head}", "boom")
        if head == self.main_head and self.compare_target_main is not None:
            return deepcopy(self.compare_target_main)
        reachable = head in self.descendants or head == self.main_head
        commits = deepcopy(self.successor_commits) if head == self.main_head else []
        total = self.total_commits if self.total_commits is not None else len(commits)
        return {
            "status": "ahead" if reachable else "diverged",
            "merge_base_commit": {"sha": base if reachable else OTHER},
            "total_commits": total,
            "commits": commits,
        }

    def list_workflow_runs(self, workflow_path, branch, *, event="push", max_pages=3):
        if workflow_path in self.workflow_errors:
            raise self.workflow_errors[workflow_path]
        return deepcopy(self.workflow_runs[workflow_path])

    def get_json_file(self, path, ref):
        if self.manifest_error:
            raise self.manifest_error
        return deepcopy(self.manifest), self.manifest_blob


def violation_codes(result):
    return {item["code"] for item in result["violations"]}


class PostmergeHealthTests(unittest.TestCase):
    def run_health(self, reader=None, sha=TARGET, production=None, docs=None):
        reader = reader or FakeReader()
        production = deepcopy(production if production is not None else GOOD_PRODUCTION)
        docs = deepcopy(docs if docs is not None else GOOD_DOCS)
        with patch("simcore_mcp.postmerge_health.verify_production_identity", return_value=production), patch(
            "simcore_mcp.postmerge_health.check_docs_drift", return_value=docs
        ):
            return postmerge_health(reader, sha)

    def test_exact_current_main_all_green(self):
        result = self.run_health()
        self.assertTrue(result["healthy"])
        self.assertEqual(14, len(result["checks"]))
        self.assertEqual("EXACT", result["workflows"]["simcore_ci"]["resolution"])
        self.assertEqual([], result["violations"])
        self.assertEqual([], result["errors"])

    def test_target_ancestor_newer_main_exact_runs_green(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.descendants.add(MAIN)
        result = self.run_health(reader=reader)
        self.assertTrue(result["healthy"])
        self.assertTrue(result["main"]["target_reachable"])

    def test_cancelled_exact_uses_successful_descendant(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.workflow_runs[".github/workflows/simcore-ci.yml"] = [
            run(1, TARGET, conclusion="cancelled", created="2026-09-06T00:00:00Z"),
            run(3, SUCCESSOR, created="2026-09-06T00:01:00Z"),
        ]
        reader.workflow_runs[".github/workflows/canonical-main-docs.yml"] = [
            run(2, TARGET, conclusion="cancelled", created="2026-09-06T00:00:00Z"),
            run(4, SUCCESSOR, created="2026-09-06T00:01:00Z"),
        ]
        result = self.run_health(reader=reader)
        self.assertTrue(result["healthy"])
        self.assertEqual("SUCCESSOR", result["workflows"]["simcore_ci"]["resolution"])
        self.assertEqual(SUCCESSOR, result["workflows"]["canonical_docs"]["selected"]["head_sha"])

    def test_hard_failed_exact_not_masked_by_successor(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.workflow_runs[".github/workflows/simcore-ci.yml"] = [
            run(1, TARGET, conclusion="failure", created="2026-09-06T00:00:00Z"),
            run(3, SUCCESSOR, created="2026-09-06T00:01:00Z"),
        ]
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("SIMCORE_CI_POSTMERGE_SUCCESS", violation_codes(result))
        self.assertEqual("NONE", result["workflows"]["simcore_ci"]["resolution"])

    def test_target_not_reachable(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.descendants.discard(MAIN)
        reader.compare_target_main = {
            "status": "diverged",
            "merge_base_commit": {"sha": OTHER},
            "total_commits": 0,
            "commits": [],
        }
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("TARGET_REACHABLE_FROM_MAIN", violation_codes(result))

    def test_explicit_revert_by_sha_detected(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.successor_commits = [commit(SUCCESSOR, f"Revert x\n\nThis reverts commit {TARGET}.")]
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("NO_EXPLICIT_REVERT_OF_TARGET", violation_codes(result))
        self.assertTrue(result["revert"]["explicit_revert_found"])

    def test_explicit_revert_by_subject_detected(self):
        reader = FakeReader()
        reader.main_head = MAIN
        subject = reader.target_commit["commit"]["message"].splitlines()[0]
        reader.successor_commits = [commit(SUCCESSOR, f'Revert "{subject}"')]
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("NO_EXPLICIT_REVERT_OF_TARGET", violation_codes(result))

    def test_malformed_sha_fails_without_target_reads(self):
        reader = FakeReader()
        reader.target_error = AssertionError("must not call target commit")
        result = self.run_health(reader=reader, sha="main")
        self.assertFalse(result["healthy"])
        self.assertIn("TARGET_COMMIT_SHA_VALID", violation_codes(result))

    def test_target_commit_failure_visible(self):
        reader = FakeReader()
        reader.target_error = GitHubReadError(f"commit:{TARGET}", "not found")
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("TARGET_COMMIT_AVAILABLE", violation_codes(result))
        self.assertTrue(result["errors"])

    def test_one_workflow_failure_preserves_other(self):
        reader = FakeReader()
        reader.workflow_errors[".github/workflows/simcore-ci.yml"] = GitHubReadError("workflow:simcore", "boom")
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertFalse(result["workflows"]["simcore_ci"]["pass"])
        self.assertTrue(result["workflows"]["canonical_docs"]["pass"])

    def test_target_manifest_failure_visible(self):
        reader = FakeReader()
        reader.manifest_error = GitHubReadError(f"json:{TARGET}:product-manifest.json", "bad")
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("TARGET_MANIFEST_AVAILABLE", violation_codes(result))

    def test_baseline_version_mismatch(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["declared"]["production_version"] = "0.70.11"
        result = self.run_health(production=production)
        self.assertFalse(result["healthy"])
        self.assertIn("PRODUCTION_BASELINE_VERSION_MATCH", violation_codes(result))

    def test_baseline_commit_and_blob_mismatch(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["declared"]["release_commit"] = "1" * 40
        production["declared"]["release_blob"] = "2" * 40
        result = self.run_health(production=production)
        self.assertFalse(result["healthy"])
        codes = violation_codes(result)
        self.assertIn("PRODUCTION_BASELINE_RELEASE_COMMIT_MATCH", codes)
        self.assertIn("PRODUCTION_BASELINE_RELEASE_BLOB_MATCH", codes)

    def test_production_component_failure_propagates(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["pass"] = False
        production["errors"] = [{"source": "prod", "message": "boom"}]
        result = self.run_health(production=production)
        self.assertFalse(result["healthy"])
        self.assertIn("CURRENT_PRODUCTION_IDENTITY_PASS", violation_codes(result))
        self.assertTrue(any(item.get("component") == "production_identity" for item in result["errors"]))

    def test_docs_component_failure_propagates(self):
        docs = deepcopy(GOOD_DOCS)
        docs["pass"] = False
        docs["errors"] = [{"source": "docs", "message": "boom"}]
        result = self.run_health(docs=docs)
        self.assertFalse(result["healthy"])
        self.assertIn("CURRENT_DOCS_DRIFT_PASS", violation_codes(result))

    def test_incomplete_revert_scan_fails_closed(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.successor_commits = [commit(SUCCESSOR, "normal")]
        reader.total_commits = 2
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("NO_EXPLICIT_REVERT_OF_TARGET", violation_codes(result))
        self.assertTrue(any("scan incomplete" in item["message"] for item in result["errors"]))

    def test_main_advances_unrelated_and_stays_healthy(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.successor_commits = [commit(MAIN, "unrelated main change")]
        result = self.run_health(reader=reader)
        self.assertTrue(result["healthy"])

    def test_later_legitimate_production_advance_is_baseline_mismatch(self):
        production = deepcopy(GOOD_PRODUCTION)
        production["declared"] = {
            "production_version": "0.70.11",
            "release_branch": "release-simcore",
            "release_commit": "3" * 40,
            "release_blob": "4" * 40,
        }
        result = self.run_health(production=production)
        self.assertFalse(result["healthy"])
        self.assertIn("PRODUCTION_BASELINE_VERSION_MATCH", violation_codes(result))

    def test_pending_exact_does_not_use_successor(self):
        reader = FakeReader()
        reader.main_head = MAIN
        reader.workflow_runs[".github/workflows/simcore-ci.yml"] = [
            run(1, TARGET, conclusion=None, status="in_progress"),
            run(3, SUCCESSOR, created="2026-09-06T00:01:00Z"),
        ]
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("SIMCORE_CI_POSTMERGE_SUCCESS", violation_codes(result))

    def test_unknown_exact_conclusion_fails_closed(self):
        reader = FakeReader()
        reader.workflow_runs[".github/workflows/simcore-ci.yml"] = [run(1, TARGET, conclusion="neutral")]
        result = self.run_health(reader=reader)
        self.assertFalse(result["healthy"])
        self.assertIn("SIMCORE_CI_POSTMERGE_SUCCESS", violation_codes(result))


class GitHubReaderMCP05Tests(unittest.TestCase):
    def make_reader(self):
        return GitHubReader(GitHubConfig(repository="owner/repo", api_base="https://api.github.test"))

    def test_get_commit(self):
        reader = self.make_reader()
        with patch.object(reader, "_request_json", return_value=({"sha": TARGET}, {})) as request:
            data = reader.get_commit(TARGET)
        self.assertEqual(TARGET, data["sha"])
        self.assertIn(f"/commits/{TARGET}", request.call_args.args[0])

    def test_compare_commits(self):
        reader = self.make_reader()
        payload = {"merge_base_commit": {"sha": TARGET}}
        with patch.object(reader, "_request_json", return_value=(payload, {})) as request:
            data = reader.compare_commits(TARGET, MAIN)
        self.assertEqual(payload, data)
        self.assertIn(f"/compare/{TARGET}...{MAIN}", request.call_args.args[0])

    def test_list_workflow_runs_paginates_bounded(self):
        reader = self.make_reader()
        page1 = {"workflow_runs": [{"id": i} for i in range(100)]}
        page2 = {"workflow_runs": [{"id": 101}]}
        with patch.object(reader, "_request_json", side_effect=[(page1, {}), (page2, {})]) as request:
            runs = reader.list_workflow_runs(".github/workflows/simcore-ci.yml", "main", max_pages=3)
        self.assertEqual(101, len(runs))
        self.assertEqual(2, request.call_count)
        self.assertIn("/actions/workflows/simcore-ci.yml/runs", request.call_args_list[0].args[0])
        self.assertIn("branch=main", request.call_args_list[0].args[0])
        self.assertIn("event=push", request.call_args_list[0].args[0])


if __name__ == "__main__":
    unittest.main()
