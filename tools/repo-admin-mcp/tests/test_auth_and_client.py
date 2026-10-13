from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from repo_admin_mcp.auth import AuthError, StaticTokenProvider, token_provider_from_env
from repo_admin_mcp.github_client import GitHubAdminClient, GitHubAdminError


class Delete404Client(GitHubAdminClient):
    def __init__(self) -> None:
        super().__init__(token_provider=StaticTokenProvider("synthetic-token"))

    def _request(self, method, url, payload=None):
        raise GitHubAdminError("GITHUB_API_REQUEST_FAILED", 404)


class AuthAndClientTests(unittest.TestCase):
    def test_pat_is_read_only_fallback_not_mutation_auth(self):
        with patch.dict(os.environ, {"REPO_ADMIN_GITHUB_TOKEN": "synthetic-token"}, clear=True):
            provider = token_provider_from_env()
            self.assertIsInstance(provider, StaticTokenProvider)
            with self.assertRaises(AuthError) as ctx:
                token_provider_from_env(require_app=True)
            self.assertEqual(ctx.exception.code, "MUTATION_REQUIRES_GITHUB_APP")

    def test_partial_app_configuration_fails_closed_even_with_pat(self):
        env = {
            "REPO_ADMIN_GITHUB_APP_ID": "123",
            "REPO_ADMIN_GITHUB_TOKEN": "synthetic-token",
        }
        with patch.dict(os.environ, env, clear=True):
            with self.assertRaises(AuthError) as ctx:
                token_provider_from_env(require_app=True)
            self.assertEqual(ctx.exception.code, "PARTIAL_GITHUB_APP_CONFIGURATION")

    def test_secret_delete_404_is_not_treated_as_absence(self):
        client = Delete404Client()
        with self.assertRaises(GitHubAdminError) as ctx:
            client.delete_environment_secret()
        self.assertEqual(ctx.exception.http_status, 404)


if __name__ == "__main__":
    unittest.main()
