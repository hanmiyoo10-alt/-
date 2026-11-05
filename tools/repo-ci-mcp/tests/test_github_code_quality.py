from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_code_quality import repo_code_quality
from repo_ci_mcp.github_reader import GitHubReadError


class GithubCodeQualityTests(unittest.TestCase):
    def test_empty_first_page_is_known_zero(self):
        reader = Mock()
        reader.list_code_quality_findings.return_value = []
        result = repo_code_quality(reader, 20)
        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["scope"], "first_page")
        self.assertEqual(result["ordering"], "server_desc")
        self.assertEqual(result["count"], 0)
        self.assertIsNone(result["total_count"])
        self.assertEqual(result["findings"], [])
        self.assertEqual(result["http_status"], 200)
        self.assertFalse(result["ci_authority"])
        self.assertFalse(result["required_authority"])
        self.assertFalse(result["release_authority"])
        self.assertFalse(result["production_authority"])

    def test_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_code_quality_findings.return_value = [{
            "number": 42,
            "state": "open",
            "rule_id": "java/useless-null-check",
            "severity": "warning",
            "category": "maintainability",
            "path": "src/example.py",
            "start_line": 9,
            "start_column": 4,
            "end_line": 9,
            "end_column": 18,
            "created_at": "2026-01-23T12:34:56Z",
            "url": "https://example.invalid/private",
            "message": {"text": "must-not-leak"},
            "rule": {"description": "must-not-leak"},
        }]
        result = repo_code_quality(reader, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 1)
        self.assertIsNone(result["total_count"])
        self.assertEqual(result["findings"][0], {
            "number": 42,
            "state": "open",
            "rule_id": "java/useless-null-check",
            "severity": "warning",
            "category": "maintainability",
            "path": "src/example.py",
            "start_line": 9,
            "start_column": 4,
            "end_line": 9,
            "end_column": 18,
            "created_at": "2026-01-23T12:34:56Z",
        })
        rendered = repr(result)
        self.assertNotIn("must-not-leak", rendered)
        self.assertNotIn("example.invalid", rendered)

    def test_404_is_unknown_resource_not_found_not_zero(self):
        reader = Mock()
        reader.list_code_quality_findings.side_effect = GitHubReadError(
            "GitHub HTTP 404",
            status_code=404,
        )
        result = repo_code_quality(reader, 20)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["http_status"], 404)
        self.assertEqual(result["reason_code"], "RESOURCE_NOT_FOUND")
        self.assertIsNone(result["count"])
        self.assertEqual(result["findings"], [])

    def test_403_and_503_remain_distinct_unknowns(self):
        for status, reason in [(403, "HTTP_403"), (503, "SERVICE_UNAVAILABLE")]:
            with self.subTest(status=status):
                reader = Mock()
                reader.list_code_quality_findings.side_effect = GitHubReadError(
                    "blocked",
                    status_code=status,
                )
                result = repo_code_quality(reader, 20)
                self.assertEqual(result["status"], "UNKNOWN")
                self.assertEqual(result["http_status"], status)
                self.assertEqual(result["reason_code"], reason)

    def test_invalid_limit_fails_closed_without_reader_call(self):
        reader = Mock()
        result = repo_code_quality(reader, 0)
        self.assertFalse(result["ok"])
        self.assertEqual(result["reason_code"], "INVALID_LIMIT")
        self.assertIsNone(result["limit"])
        reader.list_code_quality_findings.assert_not_called()

    def test_malformed_path_fails_closed(self):
        reader = Mock()
        reader.list_code_quality_findings.return_value = [{
            "number": 1,
            "state": "open",
            "rule_id": "x/y",
            "severity": None,
            "category": None,
            "path": "../escape.py",
            "start_line": 1,
            "start_column": 1,
            "end_line": 1,
            "end_column": 2,
            "created_at": "2026-01-23T12:34:56Z",
        }]
        result = repo_code_quality(reader, 20)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")


if __name__ == "__main__":
    unittest.main()
