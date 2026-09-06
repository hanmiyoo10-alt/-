from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


class GitHubReadError(RuntimeError):
    def __init__(self, source: str, message: str) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message


@dataclass(frozen=True)
class GitHubConfig:
    repository: str = "hanmiyoo10-alt/-"
    main_branch: str = "main"
    release_branch: str = "release-usage-dashboard"
    api_base: str = "https://api.github.com"
    token: str | None = None
    timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls) -> "GitHubConfig":
        try:
            timeout = float(os.getenv("USAGE_DASHBOARD_MCP_GITHUB_TIMEOUT_SECONDS", "8"))
        except ValueError:
            timeout = 8.0
        timeout = min(max(timeout, 1.0), 30.0)
        return cls(
            repository=os.getenv("USAGE_DASHBOARD_MCP_GITHUB_REPO", "hanmiyoo10-alt/-"),
            main_branch=os.getenv("USAGE_DASHBOARD_MCP_MAIN_BRANCH", "main"),
            release_branch=os.getenv("USAGE_DASHBOARD_MCP_RELEASE_BRANCH", "release-usage-dashboard"),
            api_base=os.getenv("USAGE_DASHBOARD_MCP_GITHUB_API", "https://api.github.com").rstrip("/"),
            token=os.getenv("USAGE_DASHBOARD_MCP_GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN"),
            timeout_seconds=timeout,
        )


class GitHubReader:
    """Small read-only GitHub REST adapter for MCP-UD-01."""

    def __init__(self, config: GitHubConfig | None = None) -> None:
        self.config = config or GitHubConfig.from_env()

    @property
    def repository(self) -> str:
        return self.config.repository

    @property
    def main_branch(self) -> str:
        return self.config.main_branch

    @property
    def release_branch(self) -> str:
        return self.config.release_branch

    def _url(self, path: str) -> str:
        repo = "/".join(urllib.parse.quote(part, safe="") for part in self.repository.split("/", 1))
        return f"{self.config.api_base}/repos/{repo}{path}"

    def _request_json(self, url: str, source: str) -> Any:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "usage-dashboard-mcp/0.1",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.config.token:
            headers["Authorization"] = f"Bearer {self.config.token}"
        request = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                payload = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raise GitHubReadError(source, f"HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise GitHubReadError(source, f"network error: {exc.reason}") from exc
        except TimeoutError as exc:
            raise GitHubReadError(source, "request timeout") from exc
        try:
            return json.loads(payload)
        except json.JSONDecodeError as exc:
            raise GitHubReadError(source, "invalid JSON response") from exc

    def get_branch_sha(self, branch: str) -> str:
        quoted = urllib.parse.quote(branch, safe="")
        data = self._request_json(self._url(f"/branches/{quoted}"), f"branch:{branch}")
        try:
            return str(data["commit"]["sha"])
        except (KeyError, TypeError) as exc:
            raise GitHubReadError(f"branch:{branch}", "missing commit sha") from exc

    def get_file(self, path: str, ref: str) -> tuple[str, str]:
        quoted_path = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
        quoted_ref = urllib.parse.quote(ref, safe="")
        data = self._request_json(self._url(f"/contents/{quoted_path}?ref={quoted_ref}"), f"file:{ref}:{path}")
        try:
            blob_sha = str(data["sha"])
            encoding = data["encoding"]
            content = data["content"]
        except (KeyError, TypeError) as exc:
            raise GitHubReadError(f"file:{ref}:{path}", "missing content metadata") from exc
        if encoding != "base64" or not isinstance(content, str):
            raise GitHubReadError(f"file:{ref}:{path}", f"unsupported encoding: {encoding!r}")
        try:
            decoded = base64.b64decode(content, validate=False).decode("utf-8")
        except Exception as exc:
            raise GitHubReadError(f"file:{ref}:{path}", "invalid base64/utf-8 content") from exc
        return decoded, blob_sha

    def get_json_file(self, path: str, ref: str) -> tuple[dict[str, Any], str]:
        text, blob_sha = self.get_file(path, ref)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise GitHubReadError(f"json:{ref}:{path}", "invalid JSON file") from exc
        if not isinstance(parsed, dict):
            raise GitHubReadError(f"json:{ref}:{path}", "JSON root is not an object")
        return parsed, blob_sha
