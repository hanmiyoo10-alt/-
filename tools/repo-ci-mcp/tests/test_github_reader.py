from __future__ import annotations

import base64
import os
import unittest
from unittest.mock import patch
from urllib.request import Request

from repo_ci_mcp.github_reader import GitHubReadError, GitHubReader, _SafeRedirectHandler


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

    def test_50_resolve_commit_returns_exact_sha(self):
        reader = GitHubReader(repository="owner/repo")
        with patch.object(GitHubReader, "_get_json", return_value={"sha": "a" * 40}) as get_json:
            self.assertEqual(reader.resolve_commit("feature/x"), "a" * 40)
        get_json.assert_called_once_with("/repos/owner/repo/commits/feature%2Fx")

    def test_51_repository_file_is_read_at_exact_commit_and_decoded(self):
        reader = GitHubReader(repository="owner/repo")
        raw = b'{"nbformat":4}'
        payload = {
            "type": "file",
            "size": len(raw),
            "sha": "b" * 40,
            "encoding": "base64",
            "content": base64.b64encode(raw).decode(),
        }
        with patch.object(GitHubReader, "_get_json", return_value=payload) as get_json:
            result = reader.get_repository_file("notebooks/a b.ipynb", "a" * 40, max_bytes=1024)
        self.assertEqual(result, {"content": raw, "blob_sha": "b" * 40, "size": len(raw)})
        get_json.assert_called_once_with(
            "/repos/owner/repo/contents/notebooks/a%20b.ipynb", {"ref": "a" * 40}
        )

    def test_52_repository_file_rejects_oversize_before_decode(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {
            "type": "file",
            "size": 2048,
            "sha": "b" * 40,
            "encoding": "base64",
            "content": "",
        }
        with patch.object(GitHubReader, "_get_json", return_value=payload):
            with self.assertRaisesRegex(GitHubReadError, "exceeds 1024 byte bound"):
                reader.get_repository_file("demo.ipynb", "a" * 40, max_bytes=1024)


if __name__ == "__main__":
    unittest.main()
