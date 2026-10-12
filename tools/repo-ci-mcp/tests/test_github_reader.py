from __future__ import annotations

import base64
import os
import unittest
from unittest.mock import patch
from email.message import Message
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


    def test_55_exact_sha_run_inventory_uses_head_sha_without_event_filter(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {"total_count": 2, "workflow_runs": [{"id": 1}, {"id": 2}]}
        with patch.object(GitHubReader, "_get_json", return_value=payload) as get_json:
            total, runs = reader.list_runs_exact_sha("a" * 40)
        self.assertEqual((total, len(runs)), (2, 2))
        get_json.assert_called_once_with("/repos/owner/repo/actions/runs", {"head_sha": "a" * 40, "per_page": 100})

    def test_56_compare_changed_paths_requires_ancestor_and_marks_300_incomplete(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {"base_commit": {"sha": "b" * 40}, "merge_base_commit": {"sha": "b" * 40}, "status": "ahead",
                   "files": [{"filename": f"f/{i}"} for i in range(300)]}
        with patch.object(GitHubReader, "_get_json", return_value=payload):
            paths, complete = reader.compare_changed_paths("b" * 40, "a" * 40)
        self.assertEqual(len(paths), 300)
        self.assertFalse(complete)


    def test_57_rulesets_and_secret_metadata_use_fixed_repository_endpoints(self):
        reader = GitHubReader(repository="owner/repo")
        with patch.object(GitHubReader, "_get_json_value", return_value=[]) as get_value:
            self.assertEqual(reader.list_repository_rulesets(), [])
        get_value.assert_called_once_with("/repos/owner/repo/rulesets", {"per_page": 100, "page": 1})
        with patch.object(GitHubReader, "_get_json", return_value={"total_count": 0, "secrets": []}) as get_json:
            self.assertEqual(reader.list_actions_secret_metadata(), [])
        get_json.assert_called_once_with("/repos/owner/repo/actions/secrets", {"per_page": 100})

    def test_57b_rulesets_paginate_until_short_page(self):
        reader = GitHubReader(repository="owner/repo")
        first = [{"id": index} for index in range(100)]
        second = [{"id": 100}]
        with patch.object(GitHubReader, "_get_json_value", side_effect=[first, second]) as get_value:
            result = reader.list_repository_rulesets()
        self.assertEqual(len(result), 101)
        self.assertEqual(
            get_value.call_args_list[0].args,
            ("/repos/owner/repo/rulesets", {"per_page": 100, "page": 1}),
        )
        self.assertEqual(
            get_value.call_args_list[1].args,
            ("/repos/owner/repo/rulesets", {"per_page": 100, "page": 2}),
        )

    def test_57c_rulesets_fail_closed_at_pagination_ceiling(self):
        reader = GitHubReader(repository="owner/repo")
        full_page = [{"id": index} for index in range(100)]
        with patch.object(
            GitHubReader,
            "_get_json_value",
            side_effect=[full_page] * 10,
        ) as get_value:
            with self.assertRaisesRegex(GitHubReadError, "bounded page limit"):
                reader.list_repository_rulesets()
        self.assertEqual(get_value.call_count, 10)

    def test_57d_environments_paginate_and_prove_complete_inventory(self):
        reader = GitHubReader(repository="owner/repo")
        first = {"total_count": 101, "environments": [{"id": index} for index in range(100)]}
        second = {"total_count": 101, "environments": [{"id": 100}]}
        with patch.object(GitHubReader, "_get_json", side_effect=[first, second]) as get_json:
            result = reader.list_environments()
        self.assertEqual(len(result), 101)
        self.assertEqual(
            get_json.call_args_list[0].args,
            ("/repos/owner/repo/environments", {"per_page": 100, "page": 1}),
        )
        self.assertEqual(
            get_json.call_args_list[1].args,
            ("/repos/owner/repo/environments", {"per_page": 100, "page": 2}),
        )

    def test_57dd_environments_accept_full_page_when_total_is_complete(self):
        reader = GitHubReader(repository="owner/repo")
        page = {"total_count": 100, "environments": [{"id": index} for index in range(100)]}
        with patch.object(GitHubReader, "_get_json", return_value=page) as get_json:
            result = reader.list_environments()
        self.assertEqual(len(result), 100)
        self.assertEqual(get_json.call_count, 1)

    def test_57de_environments_reject_duplicate_ids_across_pages(self):
        reader = GitHubReader(repository="owner/repo")
        first = {"total_count": 101, "environments": [{"id": index} for index in range(100)]}
        second = {"total_count": 101, "environments": [{"id": 99}]}
        with patch.object(GitHubReader, "_get_json", side_effect=[first, second]):
            with self.assertRaisesRegex(GitHubReadError, "duplicate environment id"):
                reader.list_environments()

    def test_57e_environments_reject_incomplete_total(self):
        reader = GitHubReader(repository="owner/repo")
        with patch.object(
            GitHubReader,
            "_get_json",
            return_value={"total_count": 2, "environments": [{"id": 1}]},
        ):
            with self.assertRaisesRegex(GitHubReadError, "inventory incomplete"):
                reader.list_environments()

    def test_57f_deployments_and_statuses_use_fixed_bounded_endpoints(self):
        reader = GitHubReader(repository="owner/repo")
        with patch.object(GitHubReader, "_get_json_value", return_value=[]) as get_value:
            self.assertEqual(reader.list_deployments(limit=7), [])
        get_value.assert_called_once_with("/repos/owner/repo/deployments", {"per_page": 7})
        with patch.object(GitHubReader, "_get_json_value", return_value=[]) as get_value:
            self.assertEqual(reader.list_deployment_statuses(42, limit=3), [])
        get_value.assert_called_once_with(
            "/repos/owner/repo/deployments/42/statuses",
            {"per_page": 3},
        )
        with self.assertRaisesRegex(ValueError, "positive integer"):
            reader.list_deployment_statuses(0, limit=3)
        with self.assertRaisesRegex(ValueError, "1..50"):
            reader.list_deployments(limit=51)

    def test_57g_variables_paginate_and_prove_complete_inventory(self):
        reader = GitHubReader(repository="owner/repo")
        first = {
            "total_count": 101,
            "variables": [{"name": f"VAR_{index}"} for index in range(100)],
        }
        second = {"total_count": 101, "variables": [{"name": "VAR_100"}]}
        with patch.object(GitHubReader, "_get_json", side_effect=[first, second]) as get_json:
            result = reader.list_actions_variable_metadata()
        self.assertEqual(len(result), 101)
        self.assertEqual(
            get_json.call_args_list[0].args,
            ("/repos/owner/repo/actions/variables", {"per_page": 100, "page": 1}),
        )
        self.assertEqual(
            get_json.call_args_list[1].args,
            ("/repos/owner/repo/actions/variables", {"per_page": 100, "page": 2}),
        )

    def test_57ga_variables_strip_value_at_reader_boundary(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {
            "total_count": 1,
            "variables": [{
                "name": "VISIBLE_NAME",
                "value": "READER_MUST_DROP_THIS_VALUE",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-02T00:00:00Z",
            }],
        }
        with patch.object(GitHubReader, "_get_json", return_value=payload):
            result = reader.list_actions_variable_metadata()
        self.assertEqual(result, [{
            "name": "VISIBLE_NAME",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
        }])
        self.assertNotIn("READER_MUST_DROP_THIS_VALUE", repr(result))

    def test_57h_variables_reject_duplicate_names_case_insensitively(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {"total_count": 2, "variables": [{"name": "ONE"}, {"name": "one"}]}
        with patch.object(GitHubReader, "_get_json", return_value=payload):
            with self.assertRaisesRegex(GitHubReadError, "duplicate variable name"):
                reader.list_actions_variable_metadata()

    def test_57i_variables_reject_incomplete_inventory(self):
        reader = GitHubReader(repository="owner/repo")
        payload = {"total_count": 2, "variables": [{"name": "ONE"}]}
        with patch.object(GitHubReader, "_get_json", return_value=payload):
            with self.assertRaisesRegex(GitHubReadError, "inventory incomplete"):
                reader.list_actions_variable_metadata()

    def test_58_security_alert_kind_is_allowlisted_and_bounded(self):
        reader = GitHubReader(repository="owner/repo")
        with self.assertRaisesRegex(ValueError, "unsupported security alert kind"):
            reader.list_security_alerts("advisories", per_page=10)
        with self.assertRaisesRegex(ValueError, "1..50"):
            reader.list_security_alerts("code_scanning", per_page=51)

    def test_59_permission_probe_reads_header_without_inferring_grant(self):
        reader = GitHubReader(repository="owner/repo")
        response = unittest.mock.MagicMock()
        response.status = 200
        response.headers = {"X-Accepted-GitHub-Permissions": "metadata=read"}
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        with patch.object(reader._opener, "open", return_value=response):
            observed = reader.probe_accepted_permissions("repository")
        self.assertEqual(observed, {"http_status": 200, "accepted_permissions": "metadata=read"})

    def test_60_permission_probe_preserves_header_on_http_error(self):
        reader = GitHubReader(repository="owner/repo")
        headers = Message()
        headers["X-Accepted-GitHub-Permissions"] = "administration=read"
        error = HTTPError("https://api.github.com/x", 403, "Forbidden", headers, None)
        with patch.object(reader._opener, "open", side_effect=error):
            observed = reader.probe_accepted_permissions("rulesets")
        self.assertEqual(observed, {"http_status": 403, "accepted_permissions": "administration=read"})


    def test_60_variables_permission_probe_uses_fixed_endpoint(self):
        reader = GitHubReader(repository="owner/repo")
        response = unittest.mock.MagicMock()
        response.status = 200
        response.headers = {"X-Accepted-GitHub-Permissions": "variables=read"}
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        with patch.object(reader._opener, "open", return_value=response) as opened:
            result = reader.probe_accepted_permissions("variables")
        self.assertEqual(result["accepted_permissions"], "variables=read")
        self.assertEqual(
            opened.call_args.args[0].full_url,
            "https://api.github.com/repos/owner/repo/actions/variables?per_page=1",
        )

    def test_61_deployment_permission_probes_use_fixed_endpoints(self):
        reader = GitHubReader(repository="owner/repo")
        response = unittest.mock.MagicMock()
        response.status = 200
        response.headers = {"X-Accepted-GitHub-Permissions": "deployments=read"}
        response.__enter__.return_value = response
        response.__exit__.return_value = False

        with patch.object(reader._opener, "open", return_value=response) as opened:
            reader.probe_accepted_permissions("environments")
        self.assertEqual(
            opened.call_args.args[0].full_url,
            "https://api.github.com/repos/owner/repo/environments?per_page=1",
        )

        with patch.object(reader._opener, "open", return_value=response) as opened:
            reader.probe_accepted_permissions("deployments")
        self.assertEqual(
            opened.call_args.args[0].full_url,
            "https://api.github.com/repos/owner/repo/deployments?per_page=1",
        )


if __name__ == "__main__":
    unittest.main()
