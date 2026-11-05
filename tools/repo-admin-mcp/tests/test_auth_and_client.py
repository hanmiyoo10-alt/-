from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from repo_admin_mcp.auth import AuthError, StaticTokenProvider, token_providers_from_env
from repo_admin_mcp.github_client import GitHubAdminClient, GitHubAdminError


class Delete404Client(GitHubAdminClient):
    def __init__(self) -> None:
        super().__init__(token_provider=StaticTokenProvider("synthetic-token"))

    def _request(self, method, url, payload=None, *, token_provider=None):
        raise GitHubAdminError("GITHUB_API_REQUEST_FAILED", 404)


class SecretList404Client(GitHubAdminClient):
    def __init__(self) -> None:
        super().__init__(token_provider=StaticTokenProvider("synthetic-token"))

    def _request(self, method, url, payload=None, *, token_provider=None):
        raise GitHubAdminError("GITHUB_API_REQUEST_FAILED", 404)


class SecretListClient(GitHubAdminClient):
    def __init__(self, payload, headers=None) -> None:
        super().__init__(token_provider=StaticTokenProvider("synthetic-token"))
        self.payload = payload
        self.headers = headers or {}

    def _request(self, method, url, payload=None, *, token_provider=None):
        return 200, self.payload, self.headers


class DeployKeyListClient(GitHubAdminClient):
    def __init__(self, payload) -> None:
        super().__init__(token_provider=StaticTokenProvider("synthetic-token"))
        self.payload = payload

    def _request(self, method, url, payload=None, *, token_provider=None):
        return 200, self.payload, {}


class AuthAndClientTests(unittest.TestCase):
    def test_pat_is_read_only_fallback_not_mutation_auth(self):
        with patch.dict(os.environ, {"REPO_ADMIN_GITHUB_TOKEN": "synthetic-token"}, clear=True):
            mirror, canonical = token_providers_from_env()
            self.assertIsInstance(mirror, StaticTokenProvider)
            self.assertIs(mirror, canonical)
            with self.assertRaises(AuthError) as ctx:
                token_providers_from_env(require_app=True)
            self.assertEqual(ctx.exception.code, "MUTATION_REQUIRES_GITHUB_APP")

    def test_partial_app_configuration_fails_closed_even_with_pat(self):
        env = {
            "REPO_ADMIN_GITHUB_APP_ID": "123",
            "REPO_ADMIN_GITHUB_TOKEN": "synthetic-token",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(AuthError) as ctx:
                token_providers_from_env(require_app=True)
            self.assertEqual(ctx.exception.code, "PARTIAL_GITHUB_APP_CONFIGURATION")

    def test_app_mutation_tokens_are_repo_and_permission_scoped_separately(self):
        env = {
            "REPO_ADMIN_GITHUB_APP_ID": "123",
            "REPO_ADMIN_GITHUB_INSTALLATION_ID": "456",
            "REPO_ADMIN_GITHUB_APP_PRIVATE_KEY": "synthetic-pem",
        }
        with patch.dict(os.environ, env, clear=True):
            mirror, canonical = token_providers_from_env(require_app=True)
        self.assertEqual(mirror._repositories, ("myang",))
        self.assertEqual(mirror._permissions, {"administration": "write"})
        self.assertEqual(canonical._repositories, ("-",))
        self.assertEqual(canonical._permissions, {"environments": "write"})

    def test_app_status_tokens_are_read_only_per_repo(self):
        env = {
            "REPO_ADMIN_GITHUB_APP_ID": "123",
            "REPO_ADMIN_GITHUB_INSTALLATION_ID": "456",
            "REPO_ADMIN_GITHUB_APP_PRIVATE_KEY": "synthetic-pem",
        }
        with patch.dict(os.environ, env, clear=True):
            mirror, canonical = token_providers_from_env()
        self.assertEqual(mirror._permissions, {"administration": "read"})
        self.assertEqual(canonical._permissions, {"environments": "read"})

    def test_secret_list_404_is_not_treated_as_absence(self):
        client = SecretList404Client()
        with self.assertRaises(GitHubAdminError) as ctx:
            client.get_environment_secret()
        self.assertEqual(ctx.exception.http_status, 404)

    def test_complete_empty_secret_inventory_proves_absence(self):
        client = SecretListClient({"total_count": 0, "secrets": []})
        self.assertIsNone(client.get_environment_secret())

    def test_incomplete_secret_inventory_fails_closed(self):
        client = SecretListClient(
            {"total_count": 2, "secrets": [{"name": "OTHER", "created_at": None, "updated_at": None}]},
            {"link": '<next>; rel="next"'},
        )
        with self.assertRaises(GitHubAdminError) as ctx:
            client.get_environment_secret()
        self.assertEqual(ctx.exception.code, "ENVIRONMENT_SECRET_INVENTORY_TRUNCATED")

    def test_deploy_key_enabled_state_is_preserved(self):
        client = DeployKeyListClient([
            {
                "id": 7,
                "title": "myang-private-promotion-writer-disabled",
                "read_only": False,
                "enabled": False,
                "created_at": "2026-10-13T09:00:00Z",
            }
        ])
        keys = client.list_deploy_keys()
        self.assertEqual(len(keys), 1)
        self.assertFalse(keys[0].read_only)
        self.assertFalse(keys[0].enabled)

    def test_deploy_key_missing_enabled_fails_closed(self):
        client = DeployKeyListClient([
            {
                "id": 7,
                "title": "myang-private-promotion-writer-unknown",
                "read_only": False,
                "created_at": "2026-10-13T09:00:00Z",
            }
        ])
        with self.assertRaises(GitHubAdminError) as ctx:
            client.list_deploy_keys()
        self.assertEqual(ctx.exception.code, "DEPLOY_KEY_RESPONSE_INVALID")

    def test_matching_secret_requires_updated_at(self):
        client = SecretListClient({
            "total_count": 1,
            "secrets": [{
                "name": "MYANG_DISTRIBUTION_SSH_KEY",
                "created_at": "2026-10-13T09:00:00Z",
                "updated_at": None,
            }],
        })
        with self.assertRaises(GitHubAdminError) as ctx:
            client.get_environment_secret()
        self.assertEqual(ctx.exception.code, "ENVIRONMENT_SECRET_METADATA_INVALID")

    def test_secret_delete_404_is_not_treated_as_absence(self):
        client = Delete404Client()
        with self.assertRaises(GitHubAdminError) as ctx:
            client.delete_environment_secret()
        self.assertEqual(ctx.exception.http_status, 404)


if __name__ == "__main__":
    unittest.main()
