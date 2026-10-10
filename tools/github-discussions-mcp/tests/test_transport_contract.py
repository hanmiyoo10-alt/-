from __future__ import annotations

from pathlib import Path
import http.client
import os
import sys
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from github_discussions_mcp.graphql import (
    ALLOWED_DOCUMENTS,
    CATEGORIES_QUERY,
    DISCUSSION_GET_QUERY,
    DISCUSSION_UPDATE_MUTATION,
    DISCUSSIONS_LIST_QUERY,
    GRAPHQL_ENDPOINT,
)
from github_discussions_mcp.service import DiscussionService
from github_discussions_mcp.transport import (
    DedicatedCredentialUnavailable,
    GitHubGraphQLConfig,
    GitHubGraphQLTransport,
    GitHubGraphQLTransportError,
    TIMEOUT_ENV,
    TOKEN_ENV,
)


class TransportContractTests(unittest.TestCase):
    def test_only_four_fixed_graphql_documents_are_allowed(self):
        self.assertEqual(ALLOWED_DOCUMENTS, frozenset({
            CATEGORIES_QUERY,
            DISCUSSIONS_LIST_QUERY,
            DISCUSSION_GET_QUERY,
            DISCUSSION_UPDATE_MUTATION,
        }))

    def test_arbitrary_graphql_is_rejected_before_credential_check(self):
        transport = GitHubGraphQLTransport(GitHubGraphQLConfig(token=None))
        with self.assertRaises(GitHubGraphQLTransportError) as caught:
            transport.execute("query Arbitrary { viewer { login } }", {})
        self.assertEqual(caught.exception.reason_code, "GRAPHQL_DOCUMENT_NOT_ALLOWED")

    def test_missing_dedicated_credential_blocks_without_network(self):
        transport = GitHubGraphQLTransport(GitHubGraphQLConfig(token=None))
        with mock.patch("urllib.request.urlopen") as urlopen:
            with self.assertRaises(DedicatedCredentialUnavailable):
                transport.execute(CATEGORIES_QUERY, {"owner": "hanmiyoo10-alt", "name": "-"})
        urlopen.assert_not_called()

    def test_config_does_not_fallback_to_generic_github_token(self):
        with mock.patch.dict(
            os.environ,
            {
                "GITHUB_TOKEN": "generic-token-must-not-be-used",
            },
            clear=True,
        ):
            config = GitHubGraphQLConfig.from_env()
        self.assertIsNone(config.token)

    def test_nonfinite_timeout_falls_back_to_default(self):
        for raw in ("NaN", "inf", "-inf"):
            with self.subTest(raw=raw), mock.patch.dict(
                os.environ,
                {
                    TOKEN_ENV: "dedicated",
                    TIMEOUT_ENV: raw,
                },
                clear=True,
            ):
                config = GitHubGraphQLConfig.from_env()
                self.assertEqual(config.timeout_seconds, 8.0)

    def test_dedicated_token_is_redacted_from_repr(self):
        secret = "dedicated-secret-value"
        config = GitHubGraphQLConfig(token=secret)
        self.assertNotIn(secret, repr(config))

    def test_response_read_failures_are_translated_to_transport_errors(self):
        transport = GitHubGraphQLTransport(GitHubGraphQLConfig(token="dedicated"))
        for failure in (
            http.client.IncompleteRead(b'{"data":', 20),
            ConnectionResetError("reset"),
        ):
            with self.subTest(failure=type(failure).__name__):
                response = mock.MagicMock()
                response.read.side_effect = failure
                context = mock.MagicMock()
                context.__enter__.return_value = response
                context.__exit__.return_value = False
                with mock.patch("urllib.request.urlopen", return_value=context):
                    with self.assertRaises(GitHubGraphQLTransportError) as caught:
                        transport.execute(
                            CATEGORIES_QUERY,
                            {"owner": "hanmiyoo10-alt", "name": "-"},
                        )
                self.assertEqual(
                    caught.exception.reason_code,
                    "GITHUB_RESPONSE_READ_ERROR",
                )

    def test_endpoint_is_fixed(self):
        self.assertEqual(GRAPHQL_ENDPOINT, "https://api.github.com/graphql")
        self.assertFalse(hasattr(GitHubGraphQLConfig(), "endpoint"))

    def test_service_without_credential_returns_blocked_capability(self):
        service = DiscussionService(GitHubGraphQLTransport(GitHubGraphQLConfig(token=None)))
        result = service.discussion_get(3411)
        self.assertEqual(result["disposition"], "BLOCKED_CAPABILITY")
        self.assertEqual(result["reasonCode"], "DEDICATED_DISCUSSIONS_CREDENTIAL_UNAVAILABLE")

    def test_server_exposes_exactly_five_bounded_tools(self):
        source = (ROOT / "github_discussions_mcp" / "server.py").read_text(encoding="utf-8")
        self.assertEqual(source.count("@mcp.tool()"), 5)
        for name in (
            "discussion_categories",
            "discussion_list",
            "discussion_get",
            "discussion_update_guarded",
            "discussion_move_guarded",
        ):
            self.assertIn(f"def {name}(", source)
        for forbidden in (
            "category_rename",
            "discussion_create",
            "discussion_delete",
            "graphql_query",
            "generic_graphql",
        ):
            self.assertNotIn(f"def {forbidden}(", source)

    def test_source_has_no_category_rename_mutation_or_gh_token_fallback(self):
        package_source = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (ROOT / "github_discussions_mcp").glob("*.py")
        )
        self.assertNotIn("updateDiscussionCategory", package_source)
        self.assertNotIn('os.getenv("GITHUB_TOKEN")', package_source)
        self.assertNotIn("gh auth token", package_source)
        self.assertIn("atomicCas=False", package_source)


if __name__ == "__main__":
    unittest.main()
