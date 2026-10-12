from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_deployments import (
    repo_deployment_statuses,
    repo_deployments,
    repo_environments,
)


class GithubDeploymentsTests(unittest.TestCase):
    def test_empty_environment_inventory_is_known_zero(self):
        reader = Mock()
        reader.list_environments.return_value = []
        result = repo_environments(reader)
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["environments"], [])
        self.assertFalse(result["production_authority"])

    def test_environment_projection_omits_reviewer_identities(self):
        reader = Mock()
        reader.list_environments.return_value = [{
            "id": 10,
            "name": "production",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "protection_rules": [
                {"type": "required_reviewers", "reviewers": [{"reviewer": {"login": "private"}}]},
                {"type": "wait_timer", "wait_timer": 5},
            ],
            "deployment_branch_policy": {
                "protected_branches": True,
                "custom_branch_policies": False,
            },
        }]
        result = repo_environments(reader)
        self.assertTrue(result["ok"])
        env = result["environments"][0]
        self.assertEqual(env["protection_rule_count"], 2)
        self.assertEqual(env["protection_rule_types"], ["required_reviewers", "wait_timer"])
        self.assertNotIn("reviewers", env)
        self.assertNotIn("private", repr(result))

    def test_environment_name_accepts_github_255_character_bound(self):
        reader = Mock()
        name = "e" * 255
        reader.list_environments.return_value = [{"id": 11, "name": name}]
        result = repo_environments(reader)
        self.assertTrue(result["ok"])
        self.assertEqual(result["environments"][0]["name"], name)

        reader.list_deployments.return_value = [{
            "id": 12,
            "ref": "main",
            "sha": "a" * 40,
            "environment": name,
        }]
        result = repo_deployments(reader, 1)
        self.assertTrue(result["ok"])
        self.assertEqual(result["deployments"][0]["environment"], name)

    def test_deployment_projection_omits_payload_and_actor_data(self):
        reader = Mock()
        reader.list_deployments.return_value = [{
            "id": 77,
            "ref": "main",
            "sha": "a" * 40,
            "environment": "production",
            "task": "deploy",
            "transient_environment": False,
            "production_environment": True,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "payload": {"secret": "must-not-leak"},
            "creator": {"login": "private-actor"},
            "description": "raw arbitrary description",
        }]
        result = repo_deployments(reader, 10)
        self.assertTrue(result["ok"])
        self.assertEqual(result["scope"], "recent")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["deployments"][0]["sha"], "a" * 40)
        rendered = repr(result)
        self.assertNotIn("must-not-leak", rendered)
        self.assertNotIn("private-actor", rendered)
        self.assertNotIn("raw arbitrary", rendered)
        self.assertFalse(result["production_authority"])

    def test_deployment_ref_accepts_bounded_value_over_200_characters(self):
        reader = Mock()
        ref = "r" * 512
        reader.list_deployments.return_value = [{
            "id": 78,
            "ref": ref,
            "sha": "a" * 40,
            "environment": "production",
        }]
        result = repo_deployments(reader, 1)
        self.assertTrue(result["ok"])
        self.assertEqual(result["deployments"][0]["ref"], ref)

    def test_empty_deployment_list_is_known_zero(self):
        reader = Mock()
        reader.list_deployments.return_value = []
        result = repo_deployments(reader, 20)
        self.assertEqual(result["status"], "OK")
        self.assertEqual(result["count"], 0)

    def test_deployment_status_projection_is_bounded(self):
        reader = Mock()
        reader.list_deployment_statuses.return_value = [{
            "id": 88,
            "state": "success",
            "environment": "production-canary",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:01:00Z",
            "description": "raw",
            "log_url": "https://example.invalid/private",
            "creator": {"login": "private"},
        }]
        result = repo_deployment_statuses(reader, 77, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["deployment_id"], 77)
        self.assertEqual(result["statuses"], [{
            "id": 88,
            "state": "success",
            "environment": "production-canary",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:01:00Z",
        }])
        self.assertNotIn("example.invalid", repr(result))
        self.assertNotIn("private", repr(result))

    def test_invalid_inputs_fail_closed_without_echo(self):
        reader = Mock()
        result = repo_deployment_statuses(reader, 0, 999)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertIsNone(result["deployment_id"])
        self.assertIsNone(result["limit"])
        reader.list_deployment_statuses.assert_not_called()

    def test_malformed_deployment_fails_closed(self):
        reader = Mock()
        reader.list_deployments.return_value = [{
            "id": 1,
            "ref": "main",
            "sha": "not-a-sha",
            "environment": "prod",
        }]
        result = repo_deployments(reader, 20)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertFalse(result["ok"])


if __name__ == "__main__":
    unittest.main()
