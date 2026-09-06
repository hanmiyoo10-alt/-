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
    release_branch: str = "release-simcore"
    api_base: str = "https://api.github.com"
    token: str | None = None
    timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls) -> "GitHubConfig":
        timeout_raw = os.getenv("SIMCORE_GITHUB_TIMEOUT_SECONDS", "8")
        try:
            timeout = float(timeout_raw)
        except ValueError:
            timeout = 8.0
        timeout = min(max(timeout, 1.0), 30.0)
        return cls(
            repository=os.getenv("SIMCORE_GITHUB_REPO", "hanmiyoo10-alt/-"),
            main_branch=os.getenv("SIMCORE_MAIN_BRANCH", "main"),
            release_branch=os.getenv("SIMCORE_RELEASE_BRANCH", "release-simcore"),
            api_base=os.getenv("SIMCORE_GITHUB_API", "https://api.github.com").rstrip("/"),
            token=os.getenv("SIMCORE_GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN"),
            timeout_seconds=timeout,
        )


class GitHubReader:
    """Small read-only GitHub REST adapter used by SimCore MCP tools."""

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

    def _request_json(self, url: str, source: str) -> tuple[Any, dict[str, str]]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "simcore-mcp/0.1",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.config.token:
            headers["Authorization"] = f"Bearer {self.config.token}"
        request = urllib.request.Request(url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                payload = response.read().decode("utf-8")
                response_headers = {k.lower(): v for k, v in response.headers.items()}
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8")[:300]
            except Exception:
                detail = ""
            suffix = f" {detail}" if detail else ""
            raise GitHubReadError(source, f"HTTP {exc.code}{suffix}") from exc
        except urllib.error.URLError as exc:
            raise GitHubReadError(source, f"network error: {exc.reason}") from exc
        except TimeoutError as exc:
            raise GitHubReadError(source, "request timeout") from exc
        try:
            return json.loads(payload), response_headers
        except json.JSONDecodeError as exc:
            raise GitHubReadError(source, "invalid JSON response") from exc

    def get_branch_sha(self, branch: str) -> str:
        quoted = urllib.parse.quote(branch, safe="")
        data, _ = self._request_json(self._url(f"/branches/{quoted}"), f"branch:{branch}")
        try:
            return str(data["commit"]["sha"])
        except (KeyError, TypeError) as exc:
            raise GitHubReadError(f"branch:{branch}", "missing commit sha") from exc

    def get_file(self, path: str, ref: str) -> tuple[str, str]:
        quoted_path = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
        quoted_ref = urllib.parse.quote(ref, safe="")
        data, _ = self._request_json(
            self._url(f"/contents/{quoted_path}?ref={quoted_ref}"),
            f"file:{ref}:{path}",
        )
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

    def get_commit(self, sha: str) -> dict[str, Any]:
        quoted = urllib.parse.quote(sha, safe="")
        data, _ = self._request_json(self._url(f"/commits/{quoted}"), f"commit:{sha}")
        if not isinstance(data, dict):
            raise GitHubReadError(f"commit:{sha}", "response is not an object")
        resolved = data.get("sha")
        if not isinstance(resolved, str) or not resolved:
            raise GitHubReadError(f"commit:{sha}", "missing commit sha")
        return data

    def compare_commits(self, base: str, head: str) -> dict[str, Any]:
        quoted_base = urllib.parse.quote(base, safe="")
        quoted_head = urllib.parse.quote(head, safe="")
        source = f"compare:{base}...{head}"
        data, _ = self._request_json(self._url(f"/compare/{quoted_base}...{quoted_head}"), source)
        if not isinstance(data, dict):
            raise GitHubReadError(source, "response is not an object")
        return data

    def list_workflow_runs(
        self,
        workflow_path: str,
        branch: str,
        *,
        event: str = "push",
        max_pages: int = 3,
    ) -> list[dict[str, Any]]:
        workflow_id = workflow_path.rsplit("/", 1)[-1]
        quoted_workflow = urllib.parse.quote(workflow_id, safe="")
        query_branch = urllib.parse.quote(branch, safe="")
        query_event = urllib.parse.quote(event, safe="")
        runs: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            source = f"workflow:{workflow_path}:page:{page}"
            data, _ = self._request_json(
                self._url(
                    f"/actions/workflows/{quoted_workflow}/runs"
                    f"?branch={query_branch}&event={query_event}&per_page=100&page={page}"
                ),
                source,
            )
            if not isinstance(data, dict):
                raise GitHubReadError(source, "response is not an object")
            page_runs = data.get("workflow_runs")
            if not isinstance(page_runs, list):
                raise GitHubReadError(source, "workflow_runs is not a list")
            runs.extend(item for item in page_runs if isinstance(item, dict))
            if len(page_runs) < 100:
                break
        return runs

    def list_open_issues(self, max_pages: int = 10) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            data, _ = self._request_json(
                self._url(f"/issues?state=open&per_page=100&page={page}&sort=updated&direction=desc"),
                f"issues:open:page:{page}",
            )
            if not isinstance(data, list):
                raise GitHubReadError(f"issues:open:page:{page}", "response is not a list")
            for item in data:
                if not isinstance(item, dict) or "pull_request" in item:
                    continue
                issues.append(item)
            if len(data) < 100:
                break
        return issues
