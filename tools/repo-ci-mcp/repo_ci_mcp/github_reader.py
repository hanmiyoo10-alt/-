from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_JOB_LOG_BYTES = 8 * 1024 * 1024
DEFAULT_REPOSITORY = "hanmiyoo10-alt/-"
DEFAULT_API = "https://api.github.com"
DEFAULT_TIMEOUT_SECONDS = 20.0


class GitHubReadError(RuntimeError):
    """Bounded read-only GitHub transport failure."""


class _SafeRedirectHandler(HTTPRedirectHandler):
    """Never carry Authorization across origins while following redirects."""

    @staticmethod
    def _origin(url: str) -> tuple[str, str, int | None]:
        parsed = urlparse(url)
        return (parsed.scheme.lower(), (parsed.hostname or "").lower(), parsed.port)

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is not None and self._origin(req.full_url) != self._origin(newurl):
            redirected.remove_header("Authorization")
        return redirected


def _bounded_message(value: object, limit: int = 300) -> str:
    text = " ".join(str(value).replace("\x00", "").split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


@dataclass(frozen=True)
class GitHubReader:
    repository: str = DEFAULT_REPOSITORY
    api_base: str = DEFAULT_API
    token: str | None = None
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS

    def __init__(
        self,
        repository: str | None = None,
        api_base: str | None = None,
        token: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        resolved_repo = repository or os.environ.get("REPO_CI_GITHUB_REPO") or DEFAULT_REPOSITORY
        resolved_api = (api_base or os.environ.get("REPO_CI_GITHUB_API") or DEFAULT_API).rstrip("/")
        resolved_token = token
        if resolved_token is None:
            resolved_token = os.environ.get("REPO_CI_GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN")
        if timeout_seconds is None:
            raw_timeout = os.environ.get("REPO_CI_GITHUB_TIMEOUT_SECONDS")
            try:
                resolved_timeout = float(raw_timeout) if raw_timeout else DEFAULT_TIMEOUT_SECONDS
            except ValueError:
                resolved_timeout = DEFAULT_TIMEOUT_SECONDS
        else:
            resolved_timeout = float(timeout_seconds)
        resolved_timeout = min(max(resolved_timeout, 1.0), 60.0)

        if "/" not in resolved_repo or resolved_repo.startswith("/") or resolved_repo.endswith("/"):
            raise ValueError("repository must use owner/name form")
        object.__setattr__(self, "repository", resolved_repo)
        object.__setattr__(self, "api_base", resolved_api)
        object.__setattr__(self, "token", resolved_token)
        object.__setattr__(self, "timeout_seconds", resolved_timeout)
        object.__setattr__(self, "_opener", build_opener(_SafeRedirectHandler()))

    @property
    def _repo_api_prefix(self) -> str:
        owner, name = self.repository.split("/", 1)
        return f"/repos/{quote(owner, safe='')}/{quote(name, safe='')}"

    def _redact(self, value: object) -> str:
        text = _bounded_message(value)
        if self.token:
            text = text.replace(self.token, "[REDACTED]")
        return text

    def _request(self, url: str) -> Request:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "repo-ci-mcp/0.1",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return Request(url, headers=headers, method="GET")

    def _absolute_url(self, path: str, query: dict[str, str | int] | None = None) -> str:
        if not path.startswith("/"):
            path = "/" + path
        url = urljoin(self.api_base + "/", path.lstrip("/"))
        if query:
            url += "?" + urlencode(query)
        return url

    def _open_bytes(self, url: str, *, limit: int) -> bytes:
        request = self._request(url)
        try:
            with self._opener.open(request, timeout=self.timeout_seconds) as response:
                length = response.headers.get("Content-Length")
                if length:
                    try:
                        if int(length) > limit:
                            raise GitHubReadError(f"response exceeds {limit} byte bound")
                    except ValueError:
                        pass
                data = response.read(limit + 1)
        except GitHubReadError:
            raise
        except HTTPError as exc:
            raise GitHubReadError(f"GitHub HTTP {exc.code}: {self._redact(exc.reason)}") from None
        except URLError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc.reason)}") from None
        except OSError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc)}") from None
        if len(data) > limit:
            raise GitHubReadError(f"response exceeds {limit} byte bound")
        return data

    def _get_json(self, path: str, query: dict[str, str | int] | None = None) -> dict[str, Any]:
        raw = self._open_bytes(self._absolute_url(path, query), limit=2 * 1024 * 1024)
        try:
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise GitHubReadError(f"GitHub JSON decode failed: {self._redact(exc)}") from None
        if not isinstance(value, dict):
            raise GitHubReadError("GitHub JSON response root must be an object")
        return value

    def get_run(self, run_id: int) -> dict[str, Any]:
        return self._get_json(f"{self._repo_api_prefix}/actions/runs/{run_id}")

    def list_workflow_runs(self, workflow_filename: str, ref: str) -> list[dict[str, Any]]:
        value = self._get_json(
            f"{self._repo_api_prefix}/actions/workflows/{quote(workflow_filename, safe='')}/runs",
            {"branch": ref, "per_page": 100},
        )
        runs = value.get("workflow_runs")
        if not isinstance(runs, list):
            raise GitHubReadError("workflow_runs must be an array")
        return [item for item in runs if isinstance(item, dict)]

    def list_jobs(self, run_id: int) -> tuple[int, list[dict[str, Any]]]:
        value = self._get_json(
            f"{self._repo_api_prefix}/actions/runs/{run_id}/jobs",
            {"per_page": 100},
        )
        total = value.get("total_count")
        jobs = value.get("jobs")
        if isinstance(total, bool) or not isinstance(total, int) or total < 0:
            raise GitHubReadError("jobs total_count must be a non-negative integer")
        if not isinstance(jobs, list):
            raise GitHubReadError("jobs must be an array")
        return total, [item for item in jobs if isinstance(item, dict)]

    def get_job_log(self, job_id: int) -> str:
        url = self._absolute_url(f"{self._repo_api_prefix}/actions/jobs/{job_id}/logs")
        raw = self._open_bytes(url, limit=MAX_JOB_LOG_BYTES)
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise GitHubReadError(f"job log UTF-8 decode failed: {self._redact(exc)}") from None
