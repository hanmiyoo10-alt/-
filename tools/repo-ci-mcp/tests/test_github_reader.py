from __future__ import annotations

import os
import unittest
from unittest.mock import patch
from urllib.request import Request

from repo_ci_mcp.github_reader import GitHubReader, _SafeRedirectHandler


class ReaderTests(unittest.TestCase):
    def test_47_cross_origin_redirect_strips_auth(self):
        handler = _SafeRedirectHandler()
        req = Request("https://api.github.com/repos/x/y/actions/jobs/1/logs", headers={"Authorization":"Bearer secret"})
        redirected = handler.redirect_request(req, None, 302, "Found", {}, "https://pipelines.actions.githubusercontent.com/blob")
        self.assertIsNotNone(redirected)
        self.assertIsNone(redirected.get_header("Authorization"))

    def test_48_same_origin_redirect_keeps_auth(self):
        handler = _SafeRedirectHandler()
        req = Request("https://api.github.com/a", headers={"Authorization":"Bearer secret"})
        redirected = handler.redirect_request(req, None, 302, "Found", {}, "https://api.github.com/b")
        self.assertIsNotNone(redirected)
        self.assertEqual(redirected.get_header("Authorization"), "Bearer secret")

    def test_49_error_redacts_token_and_timeout_bounds(self):
        with patch.dict(os.environ, {"REPO_CI_GITHUB_TOKEN":"topsecret", "REPO_CI_GITHUB_TIMEOUT_SECONDS":"999"}, clear=False):
            reader = GitHubReader()
        self.assertNotIn("topsecret", reader._redact("failure topsecret here"))
        self.assertEqual(reader.timeout_seconds, 60.0)


if __name__ == "__main__":
    unittest.main()
