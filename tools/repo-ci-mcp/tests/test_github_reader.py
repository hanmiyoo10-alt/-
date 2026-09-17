from __future__ import annotations

import base64
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
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

    def test_53_branch_reads_encode_name_and_use_protection_endpoint(self):
        reader = GitHubReader(repository="owner/repo")
        with patch.object(GitHubReader, "_get_json", return_value={}) as get_json:
            reader.get_branch("feature/x")
            reader.get_branch_protection("feature/x")
        self.assertEqual(get_json.call_args_list[0].args, ("/repos/owner/repo/branches/feature%2Fx",))
        self.assertEqual(get_json.call_args_list[1].args, ("/repos/owner/repo/branches/feature%2Fx/protection",))

    def test_54_http_error_preserves_status_code_without_token(self):
        reader = GitHubReader(repository="owner/repo", token="topsecret")
        error = HTTPError("https://api.github.com/x", 403, "Forbidden topsecret", None, None)
        with patch.object(reader._opener, "open", side_effect=error):
            with self.assertRaises(GitHubReadError) as caught:
                reader._open_bytes("https://api.github.com/x", limit=32)
        self.assertEqual(caught.exception.status_code, 403)
        self.assertNotIn("topsecret", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
