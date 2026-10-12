from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_reader import GitHubReadError
from repo_ci_mcp.github_releases import repo_release_assets, repo_releases, repo_tags


class GithubReleaseTests(unittest.TestCase):
    def test_release_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_repository_releases.return_value = [{
            "id": 7, "tag_name": "v1", "target_commitish": "main", "name": "Release 1",
            "draft": False, "prerelease": False, "immutable": False,
            "created_at": "2026-01-01T00:00:00Z", "published_at": "2026-01-02T00:00:00Z",
            "body": "must-not-leak", "author": {"login": "private"}, "assets": [{"name": "raw"}],
        }]
        result = repo_releases(reader, 10)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 1)
        self.assertIsNone(result["total_count"])
        self.assertNotIn("must-not-leak", repr(result))
        self.assertNotIn("private", repr(result))
        self.assertFalse(result["release_authority"])

    def test_tag_projection_requires_exact_sha(self):
        reader = Mock()
        reader.list_repository_tags.return_value = [{"name": "v1", "sha": "A" * 40, "zipball_url": "private"}]
        result = repo_tags(reader, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["tags"], [{"name": "v1", "sha": "a" * 40}])
        self.assertNotIn("zipball", repr(result))
        reader.list_repository_tags.return_value = [{"name": "v1", "sha": "short"}]
        self.assertEqual(repo_tags(reader, 5)["reason_code"], "MALFORMED_EVIDENCE")

    def test_asset_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_release_assets.return_value = [{
            "id": 9, "name": "artifact.zip", "state": "uploaded",
            "content_type": "application/zip", "size": 12, "digest": "sha256:abc",
            "download_count": 0, "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z", "uploader": {"login": "private"},
            "browser_download_url": "https://example.invalid/raw",
        }]
        result = repo_release_assets(reader, 3, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["release_id"], 3)
        self.assertEqual(result["count"], 1)
        self.assertNotIn("private", repr(result))
        self.assertNotIn("example.invalid", repr(result))

    def test_empty_first_pages_are_known_zero(self):
        reader = Mock()
        reader.list_repository_releases.return_value = []
        reader.list_repository_tags.return_value = []
        reader.list_release_assets.return_value = []
        self.assertEqual(repo_releases(reader, 1)["count"], 0)
        self.assertEqual(repo_tags(reader, 1)["count"], 0)
        self.assertEqual(repo_release_assets(reader, 1, 1)["count"], 0)

    def test_invalid_inputs_fail_closed_without_reader_call(self):
        reader = Mock()
        self.assertEqual(repo_releases(reader, 0)["reason_code"], "INVALID_LIMIT")
        self.assertEqual(repo_tags(reader, 51)["reason_code"], "INVALID_LIMIT")
        self.assertEqual(repo_release_assets(reader, 0, 20)["reason_code"], "INVALID_RELEASE_ID")
        self.assertEqual(repo_release_assets(reader, 1, 0)["reason_code"], "INVALID_LIMIT")
        reader.list_repository_releases.assert_not_called()
        reader.list_repository_tags.assert_not_called()
        reader.list_release_assets.assert_not_called()

    def test_http_404_remains_unknown_not_zero(self):
        reader = Mock()
        reader.list_release_assets.side_effect = GitHubReadError("not found", status_code=404)
        result = repo_release_assets(reader, 99, 5)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "RESOURCE_NOT_FOUND")
        self.assertIsNone(result["count"])
        self.assertEqual(result["assets"], [])

    def test_malformed_release_evidence_is_unknown(self):
        reader = Mock()
        reader.list_repository_releases.return_value = [{
            "id": 7, "tag_name": "v1", "target_commitish": "main", "name": None,
            "draft": "false", "prerelease": False, "immutable": False,
            "created_at": "2026-01-01T00:00:00Z", "published_at": None,
        }]
        result = repo_releases(reader, 5)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")


if __name__ == "__main__":
    unittest.main()
