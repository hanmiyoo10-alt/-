from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_security_advisories import repo_security_advisories


class GithubSecurityAdvisoriesTests(unittest.TestCase):
    def test_empty_advisory_inventory_is_known_zero(self):
        reader = Mock()
        reader.list_security_advisories.return_value = []
        result = repo_security_advisories(reader, 20)
        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["scope"], "recent")
        self.assertEqual(result["count"], 0)
        self.assertIsNone(result["total_count"])
        self.assertEqual(result["advisories"], [])
        self.assertFalse(result["production_authority"])

    def test_advisory_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_security_advisories.return_value = [{
            "ghsa_id": "GHSA-aaaa-bbbb-cccc",
            "cve_id": "CVE-2026-0001",
            "state": "published",
            "severity": "high",
            "published_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "closed_at": None,
            "withdrawn_at": None,
            "summary": "must-not-leak",
            "description": "must-not-leak",
            "vulnerabilities": [{"package": {"name": "private"}}],
            "credits": [{"login": "private-user"}],
            "private_fork": {"full_name": "owner/private"},
            "html_url": "https://example.invalid/private",
        }]
        result = repo_security_advisories(reader, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 1)
        self.assertIsNone(result["total_count"])
        self.assertEqual(result["advisories"][0], {
            "ghsa_id": "GHSA-aaaa-bbbb-cccc",
            "cve_id": "CVE-2026-0001",
            "state": "published",
            "severity": "high",
            "published_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "closed_at": None,
            "withdrawn_at": None,
        })
        rendered = repr(result)
        self.assertNotIn("must-not-leak", rendered)
        self.assertNotIn("private-user", rendered)
        self.assertNotIn("example.invalid", rendered)

    def test_nullable_severity_is_preserved(self):
        reader = Mock()
        reader.list_security_advisories.return_value = [{
            "ghsa_id": "GHSA-null-seve-rity",
            "cve_id": None,
            "state": "triage",
            "severity": None,
            "published_at": None,
            "updated_at": "2026-01-02T00:00:00Z",
            "closed_at": None,
            "withdrawn_at": None,
        }]
        result = repo_security_advisories(reader, 5)
        self.assertTrue(result["ok"])
        self.assertIsNone(result["advisories"][0]["severity"])

    def test_invalid_limit_fails_closed_without_reader_call(self):
        reader = Mock()
        result = repo_security_advisories(reader, 0)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["limit"])
        self.assertIsNone(result["count"])
        reader.list_security_advisories.assert_not_called()

    def test_malformed_advisory_fails_closed(self):
        reader = Mock()
        reader.list_security_advisories.return_value = [{
            "ghsa_id": None,
            "cve_id": None,
            "state": "published",
            "severity": "high",
        }]
        result = repo_security_advisories(reader, 20)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["count"])
        self.assertEqual(result["advisories"], [])


if __name__ == "__main__":
    unittest.main()
