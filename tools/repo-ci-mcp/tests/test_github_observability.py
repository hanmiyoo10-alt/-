from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_observability import (
    repo_permission_probe,
    repo_rulesets,
    repo_secret_metadata,
    repo_security_alerts,
)


class GithubObservabilityTests(unittest.TestCase):
    def test_rulesets_projection_is_bounded(self):
        reader = Mock()
        reader.list_repository_rulesets.return_value = [{
            "id": 7, "name": "main rules", "target": "branch", "enforcement": "active",
            "source_type": "Repository", "source": "owner/repo",
            "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-02T00:00:00Z",
            "bypass_actors": [{"id": 1}], "rules": [{"type": "required_status_checks"}],
        }]
        result = repo_rulesets(reader)
        self.assertTrue(result["ok"])
        self.assertEqual(result["rulesets"][0]["rule_count"], 1)
        self.assertEqual(result["rulesets"][0]["bypass_actor_count"], 1)
        self.assertNotIn("rules", result["rulesets"][0])

    def test_rulesets_preserve_omitted_detail_counts_as_unknown(self):
        reader = Mock()
        reader.list_repository_rulesets.return_value = [{
            "id": 8, "name": "summary-only", "target": "branch", "enforcement": "active",
            "source_type": "Repository", "source": "owner/repo",
            "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-02T00:00:00Z",
        }]
        result = repo_rulesets(reader)
        self.assertTrue(result["ok"])
        self.assertIsNone(result["rulesets"][0]["rule_count"])
        self.assertIsNone(result["rulesets"][0]["bypass_actor_count"])

    def test_secret_projection_exposes_metadata_only(self):
        reader = Mock()
        reader.list_actions_secret_metadata.return_value = [{
            "name": "DEPLOY_TOKEN", "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z", "value": "must-not-leak",
        }]
        result = repo_secret_metadata(reader)
        self.assertEqual(result["secrets"], [{
            "name": "DEPLOY_TOKEN", "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
        }])
        self.assertFalse(result["values_exposed"])
        self.assertNotIn("must-not-leak", repr(result))

    def test_security_alert_projection_omits_raw_payload(self):
        reader = Mock()
        reader.list_security_alerts.return_value = [{
            "number": 3, "state": "open", "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z", "html_url": "https://github.com/o/r/security/code-scanning/3",
            "rule": {"id": "py/x", "security_severity_level": "high", "description": "raw"},
            "tool": {"name": "CodeQL", "version": "extra"},
            "instances": [{"location": {"path": "private"}}],
        }]
        result = repo_security_alerts(reader, "code_scanning", 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["alerts"][0]["rule_id"], "py/x")
        self.assertNotIn("instances", repr(result))

    def test_permission_probe_never_infers_granted_permissions(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200, "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "repository")
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertFalse(result["granted_permissions_inferred"])
        self.assertIsNone(result["accepted_permissions"])

    def test_invalid_security_kind_fails_closed(self):
        reader = Mock()
        reader.list_security_alerts.side_effect = ValueError("unsupported")
        result = repo_security_alerts(reader, "advisories", 20)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertFalse(result["ok"])

    def test_deployment_permission_operations_are_allowlisted(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": "deployments=read",
        }
        result = repo_permission_probe(reader, "deployments")
        self.assertEqual(result["status"], "OBSERVED")
        reader.probe_accepted_permissions.assert_called_once_with("deployments")

        reader.reset_mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "environments")
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertFalse(result["granted_permissions_inferred"])
        reader.probe_accepted_permissions.assert_called_once_with("environments")

    def test_variable_permission_operation_is_allowlisted(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "variables")
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertFalse(result["granted_permissions_inferred"])
        reader.probe_accepted_permissions.assert_called_once_with("variables")

    def test_security_advisories_permission_operation_is_allowlisted(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "security_advisories")
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertFalse(result["granted_permissions_inferred"])
        reader.probe_accepted_permissions.assert_called_once_with("security_advisories")

    def test_code_quality_permission_operation_is_allowlisted(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 404,
            "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "code_quality")
        self.assertEqual(result["status"], "UNAVAILABLE")
        self.assertEqual(result["http_status"], 404)
        self.assertFalse(result["granted_permissions_inferred"])
        reader.probe_accepted_permissions.assert_called_once_with("code_quality")

    def test_release_permission_operations_are_allowlisted(self):
        reader = Mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": None,
        }
        result = repo_permission_probe(reader, "releases")
        self.assertEqual(result["status"], "UNAVAILABLE")
        reader.probe_accepted_permissions.assert_called_once_with("releases")

        reader.reset_mock()
        reader.probe_accepted_permissions.return_value = {
            "http_status": 200,
            "accepted_permissions": "metadata=read",
        }
        result = repo_permission_probe(reader, "tags")
        self.assertEqual(result["status"], "OBSERVED")
        self.assertFalse(result["granted_permissions_inferred"])
        reader.probe_accepted_permissions.assert_called_once_with("tags")

    def test_invalid_permission_probe_operation_is_not_echoed(self):
        reader = Mock()
        operation = "x" * 5000 + chr(10) + "secret"
        result = repo_permission_probe(reader, operation)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["operation"])
        reader.probe_accepted_permissions.assert_not_called()


if __name__ == "__main__":
    unittest.main()
