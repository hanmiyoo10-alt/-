from __future__ import annotations

import copy
import unittest

from simcore_mcp.github_reader import GitHubReadError
from simcore_mcp.status import build_status


BASE_MANIFEST = {
    "product": "SimCore",
    "production_version": "0.70.10",
    "release_name": "Host-Local Telemetry Set Cost Attribution",
    "release_branch": "release-simcore",
    "release_commit": "release-head",
    "release_blob": "production-blob",
    "production_files": {
        "latest": "plugins/simcore/latest.js",
        "install": "plugins/simcore/install.js",
        "expected_identical": True,
    },
    "validation_status": "PENDING_REAL_LONG_CHAT",
    "current_priority": "07010_HOST_LOCAL_TELEMETRY_SET_COST_ATTRIBUTION_REAL_LONG_CHAT",
    "major_update_milestone": "2.0M",
    "major_update_phase": "M2",
    "major_update_checkpoint": "M2-6",
}


class FakeReader:
    repository = "hanmiyoo10-alt/-"
    main_branch = "main"
    release_branch = "release-simcore"

    def __init__(self) -> None:
        self.manifest = copy.deepcopy(BASE_MANIFEST)
        self.main_sha = "main-head"
        self.release_sha = "release-head"
        self.latest_blob = "production-blob"
        self.install_blob = "production-blob"
        self.issues = []
        self.failures: dict[str, GitHubReadError] = {}

    def get_branch_sha(self, branch: str) -> str:
        if branch in self.failures:
            raise self.failures[branch]
        if branch == "main":
            return self.main_sha
        return self.release_sha

    def get_json_file(self, path: str, ref: str):
        if "manifest" in self.failures:
            raise self.failures["manifest"]
        return copy.deepcopy(self.manifest), "manifest-blob"

    def get_file(self, path: str, ref: str):
        if path in self.failures:
            raise self.failures[path]
        if path.endswith("latest.js"):
            return "latest", self.latest_blob
        return "install", self.install_blob

    def list_open_issues(self):
        if "issues" in self.failures:
            raise self.failures["issues"]
        return copy.deepcopy(self.issues)


class StatusTests(unittest.TestCase):
    def test_healthy_snapshot(self) -> None:
        status = build_status(FakeReader())
        self.assertTrue(status["ok"])
        self.assertEqual(status["main"]["sha"], "main-head")
        self.assertTrue(status["parity"]["identical"])
        self.assertEqual(status["drift"], [])
        self.assertEqual(status["errors"], [])

    def test_latest_install_mismatch_is_hard_drift(self) -> None:
        reader = FakeReader()
        reader.install_blob = "different"
        status = build_status(reader)
        self.assertFalse(status["ok"])
        codes = {item["code"] for item in status["drift"]}
        self.assertIn("PRODUCTION_FILE_PARITY_MISMATCH", codes)

    def test_release_head_drift(self) -> None:
        reader = FakeReader()
        reader.release_sha = "other-release-head"
        status = build_status(reader)
        codes = {item["code"] for item in status["drift"]}
        self.assertIn("RELEASE_COMMIT_MISMATCH", codes)

    def test_release_blob_drift(self) -> None:
        reader = FakeReader()
        reader.latest_blob = "other-blob"
        reader.install_blob = "other-blob"
        status = build_status(reader)
        codes = {item["code"] for item in status["drift"]}
        self.assertIn("RELEASE_BLOB_MISMATCH", codes)

    def test_manifest_failure_is_visible(self) -> None:
        reader = FakeReader()
        reader.failures["manifest"] = GitHubReadError("manifest", "boom")
        status = build_status(reader)
        self.assertFalse(status["ok"])
        self.assertTrue(status["errors"])
        codes = {item["code"] for item in status["drift"]}
        self.assertIn("MANIFEST_UNAVAILABLE", codes)

    def test_partial_issue_api_failure_is_visible(self) -> None:
        reader = FakeReader()
        reader.failures["issues"] = GitHubReadError("issues", "timeout")
        status = build_status(reader)
        self.assertFalse(status["ok"])
        self.assertEqual(status["errors"][0]["source"], "issues")
        self.assertEqual(status["production"]["version"], "0.70.10")

    def test_issue_classification_labels_and_body(self) -> None:
        reader = FakeReader()
        reader.issues = [
            {"number": 1, "title": "Latency", "body": "Classification: WATCH\n", "labels": [], "html_url": "u1"},
            {"number": 2, "title": "Repair", "body": "Classification: FIX\n", "labels": [], "html_url": "u2"},
            {"number": 3, "title": "Unknown", "body": "nothing", "labels": [], "html_url": "u3"},
            {"number": 4, "title": "Labelled", "body": "", "labels": [{"name": "BLOCKER"}], "html_url": "u4"},
        ]
        status = build_status(reader)
        self.assertEqual([x["number"] for x in status["tracking"]["watch"]], [1])
        self.assertEqual([x["number"] for x in status["tracking"]["fix"]], [2])
        self.assertEqual([x["number"] for x in status["tracking"]["unclassified"]], [3])
        self.assertEqual([x["number"] for x in status["tracking"]["blocker"]], [4])

    def test_missing_production_path_is_error(self) -> None:
        reader = FakeReader()
        reader.manifest["production_files"]["latest"] = None
        status = build_status(reader)
        self.assertFalse(status["ok"])
        sources = {item["source"] for item in status["errors"]}
        self.assertIn("manifest:production_files.latest", sources)


if __name__ == "__main__":
    unittest.main()
