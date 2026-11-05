from __future__ import annotations

import unittest
from unittest.mock import Mock

from repo_ci_mcp.github_reader import GitHubReadError
from repo_ci_mcp.github_webhooks import repo_webhook_deliveries, repo_webhooks


class GithubWebhookTests(unittest.TestCase):
    def test_webhook_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_repository_webhooks.return_value = [{
            "id": 7,
            "name": "web",
            "active": True,
            "events": ["push", "pull_request"],
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "last_response": {"code": 200, "status": "ok", "message": "private"},
            "config": {"url": "https://secret.invalid/hook", "secret": "hidden"},
            "ping_url": "https://api.github.com/ping",
            "deliveries_url": "https://api.github.com/deliveries",
        }]
        result = repo_webhooks(reader, 10)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 1)
        self.assertIsNone(result["total_count"])
        self.assertEqual(result["webhooks"][0]["last_response"], {"code": 200, "status": "ok"})
        self.assertNotIn("secret.invalid", repr(result))
        self.assertNotIn("hidden", repr(result))
        self.assertNotIn("private", repr(result))
        self.assertFalse(result["notification_authority"])
        self.assertFalse(result["delivery_success_authority"])

    def test_delivery_projection_is_metadata_only(self):
        reader = Mock()
        reader.list_webhook_deliveries.return_value = [{
            "id": 9,
            "guid": "private-guid",
            "delivered_at": "2026-01-03T00:00:00Z",
            "redelivery": False,
            "duration": 0.25,
            "status": "OK",
            "status_code": 200,
            "event": "issues",
            "action": "opened",
            "installation_id": 123,
            "repository_id": 456,
            "url": "https://secret.invalid",
            "throttled_at": None,
            "request": {"headers": {"X-Hub-Signature-256": "secret"}, "payload": {"private": True}},
            "response": {"headers": {"X": "secret"}, "payload": "private"},
        }]
        result = repo_webhook_deliveries(reader, 3, 5)
        self.assertTrue(result["ok"])
        self.assertEqual(result["hook_id"], 3)
        self.assertEqual(result["count"], 1)
        self.assertNotIn("private-guid", repr(result))
        self.assertNotIn("secret.invalid", repr(result))
        self.assertNotIn("X-Hub-Signature", repr(result))
        self.assertNotIn("installation_id", repr(result))
        self.assertNotIn("repository_id", repr(result))

    def test_empty_first_pages_are_known_zero(self):
        reader = Mock()
        reader.list_repository_webhooks.return_value = []
        reader.list_webhook_deliveries.return_value = []
        hooks = repo_webhooks(reader, 1)
        deliveries = repo_webhook_deliveries(reader, 7, 1)
        self.assertTrue(hooks["ok"])
        self.assertEqual(hooks["count"], 0)
        self.assertTrue(deliveries["ok"])
        self.assertEqual(deliveries["count"], 0)

    def test_invalid_inputs_fail_closed_without_reader_call(self):
        reader = Mock()
        self.assertEqual(repo_webhooks(reader, 0)["reason_code"], "INVALID_LIMIT")
        self.assertEqual(repo_webhook_deliveries(reader, 0, 20)["reason_code"], "INVALID_HOOK_ID")
        self.assertEqual(repo_webhook_deliveries(reader, 1, 51)["reason_code"], "INVALID_LIMIT")
        reader.list_repository_webhooks.assert_not_called()
        reader.list_webhook_deliveries.assert_not_called()

    def test_http_404_remains_unknown_not_zero(self):
        reader = Mock()
        reader.list_webhook_deliveries.side_effect = GitHubReadError("not found", status_code=404)
        result = repo_webhook_deliveries(reader, 99, 5)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "RESOURCE_NOT_FOUND")
        self.assertIsNone(result["count"])
        self.assertEqual(result["deliveries"], [])

    def test_malformed_hook_evidence_is_unknown(self):
        reader = Mock()
        reader.list_repository_webhooks.return_value = [{
            "id": 7,
            "name": "web",
            "active": "true",
            "events": ["push"],
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "last_response": None,
        }]
        result = repo_webhooks(reader, 5)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")

    def test_malformed_delivery_evidence_is_unknown(self):
        reader = Mock()
        reader.list_webhook_deliveries.return_value = [{
            "id": 9,
            "delivered_at": "2026-01-03T00:00:00Z",
            "redelivery": False,
            "duration": float("inf"),
            "status": "OK",
            "status_code": 200,
            "event": "issues",
            "action": None,
            "throttled_at": None,
        }]
        result = repo_webhook_deliveries(reader, 3, 5)
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reason_code"], "MALFORMED_EVIDENCE")


if __name__ == "__main__":
    unittest.main()
