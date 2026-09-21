from __future__ import annotations

import base64
import binascii
import json
import os
import re
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

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


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
            raise GitHubReadError(
                f"GitHub HTTP {exc.code}: {self._redact(exc.reason)}", status_code=exc.code
            ) from None
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

    def _branch_name(self, branch: str) -> str:
        if not isinstance(branch, str) or not branch or len(branch) > 200 or any(ch in branch for ch in "\r\n\x00"):
            raise GitHubReadError("branch must be a non-empty string <= 200 characters")
        return branch

    def get_branch(self, branch: str) -> dict[str, Any]:
        name = self._branch_name(branch)
        return self._get_json(f"{self._repo_api_prefix}/branches/{quote(name, safe='')}")

    def get_branch_protection(self, branch: str) -> dict[str, Any]:
        name = self._branch_name(branch)
        return self._get_json(f"{self._repo_api_prefix}/branches/{quote(name, safe='')}/protection")

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

    def list_runs_exact_sha(self, commit_sha: str) -> tuple[int, list[dict[str, Any]]]:
        if not isinstance(commit_sha, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", commit_sha):
            raise GitHubReadError("commit_sha must be a full 40-hex SHA")
        value = self._get_json(
            f"{self._repo_api_prefix}/actions/runs",
            {"head_sha": commit_sha.lower(), "per_page": 100},
        )
        total = value.get("total_count")
        runs = value.get("workflow_runs")
        if isinstance(total, bool) or not isinstance(total, int) or total < 0:
            raise GitHubReadError("workflow_runs total_count must be a non-negative integer")
        if not isinstance(runs, list):
            raise GitHubReadError("workflow_runs must be an array")
        return total, [item for item in runs if isinstance(item, dict)]

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


    def resolve_commit(self, ref: str) -> str:
        if not isinstance(ref, str) or not ref or len(ref) > 200:
            raise GitHubReadError("ref must be a non-empty string <= 200 characters")
        value = self._get_json(f"{self._repo_api_prefix}/commits/{quote(ref, safe='')}")
        sha = value.get("sha")
        if not isinstance(sha, str) or len(sha) != 40:
            raise GitHubReadError("resolved commit sha is invalid")
        if any(ch not in "0123456789abcdef" for ch in sha.lower()):
            raise GitHubReadError("resolved commit sha is invalid")
        return sha

    def get_repository_file(self, path: str, commit_sha: str, *, max_bytes: int) -> dict[str, Any]:
        if not isinstance(max_bytes, int) or isinstance(max_bytes, bool) or max_bytes <= 0:
            raise ValueError("max_bytes must be a positive integer")
        encoded_path = "/".join(quote(part, safe="") for part in path.split("/"))
        value = self._get_json(
            f"{self._repo_api_prefix}/contents/{encoded_path}",
            {"ref": commit_sha},
        )
        if value.get("type") != "file":
            raise GitHubReadError("repository content is not a file")
        size = value.get("size")
        if isinstance(size, bool) or not isinstance(size, int) or size < 0:
            raise GitHubReadError("repository file size is invalid")
        if size > max_bytes:
            raise GitHubReadError(f"repository file exceeds {max_bytes} byte bound")
        blob_sha = value.get("sha")
        if not isinstance(blob_sha, str) or len(blob_sha) != 40:
            raise GitHubReadError("repository blob sha is invalid")
        if value.get("encoding") != "base64" or not isinstance(value.get("content"), str):
            raise GitHubReadError("repository file content is not available as base64")
        encoded = "".join(value["content"].split())
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise GitHubReadError(f"repository file base64 decode failed: {self._redact(exc)}") from None
        if len(raw) > max_bytes:
            raise GitHubReadError(f"repository file exceeds {max_bytes} byte bound")
        if len(raw) != size:
            raise GitHubReadError("repository file decoded size does not match metadata")
        return {"content": raw, "blob_sha": blob_sha, "size": size}

    def compare_changed_paths(self, before_sha: str, after_sha: str) -> tuple[list[str], bool]:
        for name, value in (("before_sha", before_sha), ("after_sha", after_sha)):
            if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", value):
                raise GitHubReadError(f"{name} must be a full 40-hex SHA")
        before = before_sha.lower()
        after = after_sha.lower()
        value = self._get_json(f"{self._repo_api_prefix}/compare/{before}...{after}")
        base = value.get("base_commit")
        merge_base = value.get("merge_base_commit")
        status = value.get("status")
        if not isinstance(base, dict) or base.get("sha") != before:
            raise GitHubReadError("compare base identity mismatch")
        if not isinstance(merge_base, dict) or merge_base.get("sha") != before or status not in {"ahead", "identical"}:
            raise GitHubReadError("compare transition is not an ancestor transition")
        files = value.get("files")
        if not isinstance(files, list):
            raise GitHubReadError("compare files must be an array")
        paths: list[str] = []
        for item in files:
            if not isinstance(item, dict) or not isinstance(item.get("filename"), str):
                raise GitHubReadError("compare file metadata is invalid")
            paths.append(item["filename"])
        return paths, len(paths) < 300
