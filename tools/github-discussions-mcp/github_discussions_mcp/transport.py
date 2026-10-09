from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from .graphql import ALLOWED_DOCUMENTS, GRAPHQL_ENDPOINT

TOKEN_ENV = "GITHUB_DISCUSSIONS_TOKEN"
TIMEOUT_ENV = "GITHUB_DISCUSSIONS_TIMEOUT_SECONDS"


class DedicatedCredentialUnavailable(RuntimeError):
    pass


class GitHubGraphQLTransportError(RuntimeError):
    def __init__(self, reason_code: str) -> None:
        super().__init__(reason_code)
        self.reason_code = reason_code


@dataclass(frozen=True)
class GitHubGraphQLConfig:
    token: str | None = field(default=None, repr=False)
    timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls) -> "GitHubGraphQLConfig":
        raw = os.getenv(TIMEOUT_ENV, "8")
        try:
            timeout = float(raw)
        except ValueError:
            timeout = 8.0
        timeout = min(max(timeout, 1.0), 30.0)
        token = os.getenv(TOKEN_ENV)
        return cls(token=token if token else None, timeout_seconds=timeout)


class GitHubGraphQLTransport:
    """Fixed-endpoint GraphQL transport with no arbitrary document passthrough."""

    def __init__(self, config: GitHubGraphQLConfig | None = None) -> None:
        self.config = config or GitHubGraphQLConfig.from_env()

    def execute(self, document: str, variables: dict[str, Any]) -> dict[str, Any]:
        if document not in ALLOWED_DOCUMENTS:
            raise GitHubGraphQLTransportError("GRAPHQL_DOCUMENT_NOT_ALLOWED")
        if not self.config.token:
            raise DedicatedCredentialUnavailable("DEDICATED_DISCUSSIONS_CREDENTIAL_UNAVAILABLE")
        if not isinstance(variables, dict):
            raise GitHubGraphQLTransportError("GRAPHQL_VARIABLES_INVALID")

        payload = json.dumps(
            {"query": document, "variables": variables},
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode("utf-8")
        request = urllib.request.Request(
            GRAPHQL_ENDPOINT,
            data=payload,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.config.token}",
                "Content-Type": "application/json",
                "User-Agent": "github-discussions-mcp/0.1",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raise GitHubGraphQLTransportError(f"GITHUB_HTTP_{exc.code}") from exc
        except urllib.error.URLError as exc:
            raise GitHubGraphQLTransportError("GITHUB_NETWORK_ERROR") from exc
        except TimeoutError as exc:
            raise GitHubGraphQLTransportError("GITHUB_TIMEOUT") from exc

        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise GitHubGraphQLTransportError("GITHUB_JSON_INVALID") from exc
        if not isinstance(decoded, dict):
            raise GitHubGraphQLTransportError("GITHUB_RESPONSE_INVALID")
        errors = decoded.get("errors")
        if errors:
            raise GitHubGraphQLTransportError("GITHUB_GRAPHQL_ERROR")
        data = decoded.get("data")
        if not isinstance(data, dict):
            raise GitHubGraphQLTransportError("GITHUB_DATA_MISSING")
        return data
