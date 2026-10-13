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
DEFAULT_API_VERSION = "2022-11-28"
CODE_QUALITY_API_VERSION = "2026-03-10"
ATTESTATIONS_API_VERSION = "2026-03-10"
DEFAULT_JSON_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_RELEASE_LIST_BYTES = 64 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 20.0
MAX_RULESET_PAGES = 10
MAX_ENVIRONMENT_PAGES = 10
MAX_VARIABLE_PAGES = 10
VARIABLE_PAGE_SIZE = 30


class GitHubReadError(RuntimeError):
    """Bounded read-only GitHub transport failure."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        accepted_permissions: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.accepted_permissions = accepted_permissions


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

    def _request(self, url: str, *, api_version: str = DEFAULT_API_VERSION) -> Request:
        if api_version not in {DEFAULT_API_VERSION, CODE_QUALITY_API_VERSION, ATTESTATIONS_API_VERSION}:
            raise ValueError("unsupported GitHub API version")
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "repo-ci-mcp/0.1",
            "X-GitHub-Api-Version": api_version,
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

    @staticmethod
    def _accepted_permissions(headers: object) -> str | None:
        getter = getattr(headers, "get", None)
        if not callable(getter):
            return None
        value = getter("X-Accepted-GitHub-Permissions")
        if not isinstance(value, str):
            return None
        value = value.strip()
        if not value or len(value) > 1000 or any(ch in value for ch in "\r\n\x00"):
            return None
        return value

    def _open_bytes(
        self,
        url: str,
        *,
        limit: int,
        api_version: str = DEFAULT_API_VERSION,
    ) -> bytes:
        request = self._request(url, api_version=api_version)
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
                f"GitHub HTTP {exc.code}: {self._redact(exc.reason)}",
                status_code=exc.code,
                accepted_permissions=self._accepted_permissions(exc.headers),
            ) from None
        except URLError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc.reason)}") from None
        except OSError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc)}") from None
        if len(data) > limit:
            raise GitHubReadError(f"response exceeds {limit} byte bound")
        return data

    def _get_json_value(
        self,
        path: str,
        query: dict[str, str | int] | None = None,
        *,
        api_version: str = DEFAULT_API_VERSION,
        max_bytes: int = DEFAULT_JSON_RESPONSE_BYTES,
    ) -> Any:
        if isinstance(max_bytes, bool) or not isinstance(max_bytes, int) or not 1 <= max_bytes <= MAX_RELEASE_LIST_BYTES:
            raise ValueError("max_bytes must be a bounded positive integer")
        raw = self._open_bytes(
            self._absolute_url(path, query),
            limit=max_bytes,
            api_version=api_version,
        )
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise GitHubReadError(f"GitHub JSON decode failed: {self._redact(exc)}") from None

    def _get_json(self, path: str, query: dict[str, str | int] | None = None) -> dict[str, Any]:
        value = self._get_json_value(path, query)
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


    def list_repository_rulesets(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for page in range(1, MAX_RULESET_PAGES + 1):
            value = self._get_json_value(
                f"{self._repo_api_prefix}/rulesets",
                {"per_page": 100, "page": page},
            )
            if not isinstance(value, list) or len(value) > 100:
                raise GitHubReadError("rulesets response must be a bounded array")
            if any(not isinstance(item, dict) for item in value):
                raise GitHubReadError("rulesets response item invalid")
            items.extend(value)
            if len(value) < 100:
                return items
        raise GitHubReadError("rulesets pagination exceeds bounded page limit")

    def list_actions_secret_metadata(self) -> list[dict[str, Any]]:
        value = self._get_json(f"{self._repo_api_prefix}/actions/secrets", {"per_page": 100})
        secrets = value.get("secrets")
        total = value.get("total_count")
        if isinstance(total, bool) or not isinstance(total, int) or total < 0:
            raise GitHubReadError("secrets total_count invalid")
        if not isinstance(secrets, list) or len(secrets) > 100:
            raise GitHubReadError("secrets response must be a bounded array")
        if any(not isinstance(item, dict) for item in secrets):
            raise GitHubReadError("secret metadata item invalid")
        return list(secrets)

    def list_actions_variable_metadata(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_names: set[str] = set()
        expected_total: int | None = None
        for page in range(1, MAX_VARIABLE_PAGES + 1):
            value = self._get_json(
                f"{self._repo_api_prefix}/actions/variables",
                {"per_page": VARIABLE_PAGE_SIZE, "page": page},
            )
            total = value.get("total_count")
            variables = value.get("variables")
            if isinstance(total, bool) or not isinstance(total, int) or total < 0:
                raise GitHubReadError("variables total_count invalid")
            if expected_total is None:
                expected_total = total
            elif total != expected_total:
                raise GitHubReadError("variables total_count changed during pagination")
            if not isinstance(variables, list) or len(variables) > VARIABLE_PAGE_SIZE:
                raise GitHubReadError("variables response must be a bounded array")
            if any(not isinstance(item, dict) for item in variables):
                raise GitHubReadError("variable metadata item invalid")
            page_items = []
            for item in variables:
                name = item.get("name")
                if not isinstance(name, str) or not name or len(name) > 256:
                    raise GitHubReadError("variable name invalid")
                if any(ch in name for ch in "\r\n\x00"):
                    raise GitHubReadError("variable name invalid")
                duplicate_key = name.casefold()
                if duplicate_key in seen_names:
                    raise GitHubReadError("duplicate variable name")
                seen_names.add(duplicate_key)
                page_items.append({
                    "name": name,
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                })
            items.extend(page_items)
            if len(items) > expected_total:
                raise GitHubReadError("variable inventory exceeds total_count")
            if len(items) == expected_total:
                return items
            if len(variables) < VARIABLE_PAGE_SIZE:
                raise GitHubReadError("variable inventory incomplete")
        raise GitHubReadError("variable pagination exceeds bounded page limit")

    @staticmethod
    def _recent_limit(limit: int) -> int:
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 50:
            raise ValueError("limit must be an integer in 1..50")
        return limit

    @staticmethod
    def _deployment_id(deployment_id: int) -> int:
        if isinstance(deployment_id, bool) or not isinstance(deployment_id, int) or deployment_id <= 0:
            raise ValueError("deployment_id must be a positive integer")
        return deployment_id

    def list_environments(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        expected_total: int | None = None
        for page in range(1, MAX_ENVIRONMENT_PAGES + 1):
            value = self._get_json(
                f"{self._repo_api_prefix}/environments",
                {"per_page": 100, "page": page},
            )
            total = value.get("total_count")
            environments = value.get("environments")
            if isinstance(total, bool) or not isinstance(total, int) or total < 0:
                raise GitHubReadError("environments total_count invalid")
            if expected_total is None:
                expected_total = total
            elif total != expected_total:
                raise GitHubReadError("environments total_count changed during pagination")
            if not isinstance(environments, list) or len(environments) > 100:
                raise GitHubReadError("environments response must be a bounded array")
            if any(not isinstance(item, dict) for item in environments):
                raise GitHubReadError("environment item invalid")
            for item in environments:
                environment_id = item.get("id")
                if isinstance(environment_id, bool) or not isinstance(environment_id, int) or environment_id < 0:
                    raise GitHubReadError("environment id invalid")
                if environment_id in seen_ids:
                    raise GitHubReadError("duplicate environment id")
                seen_ids.add(environment_id)
            items.extend(environments)
            if len(items) > expected_total:
                raise GitHubReadError("environment inventory exceeds total_count")
            if len(items) == expected_total:
                return items
            if len(environments) < 100:
                raise GitHubReadError("environment inventory incomplete")
        raise GitHubReadError("environment pagination exceeds bounded page limit")

    def list_deployments(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/deployments",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("deployments response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("deployment item invalid")
        return list(value)

    def list_deployment_statuses(self, deployment_id: int, *, limit: int) -> list[dict[str, Any]]:
        safe_id = self._deployment_id(deployment_id)
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/deployments/{safe_id}/statuses",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("deployment statuses response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("deployment status item invalid")
        return list(value)

    def list_security_alerts(self, kind: str, *, per_page: int) -> list[dict[str, Any]]:
        paths = {
            "code_scanning": "code-scanning/alerts",
            "dependabot": "dependabot/alerts",
            "secret_scanning": "secret-scanning/alerts",
        }
        if kind not in paths:
            raise ValueError("unsupported security alert kind")
        if isinstance(per_page, bool) or not isinstance(per_page, int) or not 1 <= per_page <= 50:
            raise ValueError("per_page must be an integer in 1..50")
        value = self._get_json_value(
            f"{self._repo_api_prefix}/{paths[kind]}", {"per_page": per_page}
        )
        if not isinstance(value, list) or len(value) > per_page:
            raise GitHubReadError("security alerts response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("security alert item invalid")
        return list(value)

    def list_security_advisories(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/security-advisories",
            {"per_page": safe_limit, "sort": "updated", "direction": "desc"},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("security advisories response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("security advisory item invalid")
        return [{
            "ghsa_id": item.get("ghsa_id"),
            "cve_id": item.get("cve_id"),
            "state": item.get("state"),
            "severity": item.get("severity"),
            "published_at": item.get("published_at"),
            "updated_at": item.get("updated_at"),
            "closed_at": item.get("closed_at"),
            "withdrawn_at": item.get("withdrawn_at"),
        } for item in value]

    def list_code_quality_findings(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/code-quality/findings",
            {"per_page": safe_limit, "direction": "desc"},
            api_version=CODE_QUALITY_API_VERSION,
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("code quality findings response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("code quality finding item invalid")
        findings = []
        for item in value:
            rule = item.get("rule")
            location = item.get("location")
            if not isinstance(rule, dict) or not isinstance(location, dict):
                raise GitHubReadError("code quality finding nested metadata invalid")
            findings.append({
                "number": item.get("number"),
                "state": item.get("state"),
                "rule_id": rule.get("id"),
                "severity": rule.get("severity"),
                "category": rule.get("category"),
                "path": location.get("path"),
                "start_line": location.get("start_line"),
                "start_column": location.get("start_column"),
                "end_line": location.get("end_line"),
                "end_column": location.get("end_column"),
                "created_at": item.get("created_at"),
            })
        return findings

    @staticmethod
    def _release_id(release_id: int) -> int:
        if isinstance(release_id, bool) or not isinstance(release_id, int) or release_id <= 0:
            raise ValueError("release_id must be a positive integer")
        return release_id

    def list_repository_releases(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/releases",
            {"per_page": safe_limit},
            max_bytes=MAX_RELEASE_LIST_BYTES,
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("releases response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("release item invalid")
        return [{
            "id": item.get("id"),
            "tag_name": item.get("tag_name"),
            "target_commitish": item.get("target_commitish"),
            "name": item.get("name"),
            "draft": item.get("draft"),
            "prerelease": item.get("prerelease"),
            "immutable": item.get("immutable"),
            "created_at": item.get("created_at"),
            "published_at": item.get("published_at"),
        } for item in value]

    def list_repository_tags(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/tags",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("tags response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("tag item invalid")
        tags = []
        for item in value:
            commit = item.get("commit")
            if not isinstance(commit, dict):
                raise GitHubReadError("tag commit metadata invalid")
            tags.append({"name": item.get("name"), "sha": commit.get("sha")})
        return tags

    def list_release_assets(self, release_id: int, *, limit: int) -> list[dict[str, Any]]:
        safe_id = self._release_id(release_id)
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/releases/{safe_id}/assets",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("release assets response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("release asset item invalid")
        return [{
            "id": item.get("id"),
            "name": item.get("name"),
            "state": item.get("state"),
            "content_type": item.get("content_type"),
            "size": item.get("size"),
            "digest": item.get("digest"),
            "download_count": item.get("download_count"),
            "created_at": item.get("created_at"),
            "updated_at": item.get("updated_at"),
        } for item in value]

    @staticmethod
    def _hook_id(hook_id: int) -> int:
        if isinstance(hook_id, bool) or not isinstance(hook_id, int) or hook_id <= 0:
            raise ValueError("hook_id must be a positive integer")
        return hook_id

    def list_repository_webhooks(self, *, limit: int) -> list[dict[str, Any]]:
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/hooks",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("webhooks response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("webhook item invalid")
        hooks = []
        for item in value:
            last_response = item.get("last_response")
            if last_response is not None and not isinstance(last_response, dict):
                raise GitHubReadError("webhook last_response metadata invalid")
            hooks.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "active": item.get("active"),
                "events": item.get("events"),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "last_response": None if last_response is None else {
                    "code": last_response.get("code"),
                    "status": last_response.get("status"),
                },
            })
        return hooks

    def list_webhook_deliveries(self, hook_id: int, *, limit: int) -> list[dict[str, Any]]:
        safe_id = self._hook_id(hook_id)
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/hooks/{safe_id}/deliveries",
            {"per_page": safe_limit},
        )
        if not isinstance(value, list) or len(value) > safe_limit:
            raise GitHubReadError("webhook deliveries response must be a bounded array")
        if any(not isinstance(item, dict) for item in value):
            raise GitHubReadError("webhook delivery item invalid")
        return [{
            "id": item.get("id"),
            "delivered_at": item.get("delivered_at"),
            "redelivery": item.get("redelivery"),
            "duration": item.get("duration"),
            "status": item.get("status"),
            "status_code": item.get("status_code"),
            "event": item.get("event"),
            "action": item.get("action"),
            "throttled_at": item.get("throttled_at"),
        } for item in value]

    @staticmethod
    def _subject_digest(subject_digest: str) -> str:
        if not isinstance(subject_digest, str) or not re.fullmatch(r"sha256:[0-9a-fA-F]{64}", subject_digest):
            raise ValueError("subject_digest must be sha256:<64 hex>")
        return "sha256:" + subject_digest[7:].lower()

    def list_repository_attestations(self, subject_digest: str, *, limit: int) -> list[dict[str, Any]]:
        safe_digest = self._subject_digest(subject_digest)
        safe_limit = self._recent_limit(limit)
        value = self._get_json_value(
            f"{self._repo_api_prefix}/attestations/{quote(safe_digest, safe='')}",
            {"per_page": safe_limit},
            api_version=ATTESTATIONS_API_VERSION,
        )
        if not isinstance(value, dict):
            raise GitHubReadError("attestations response root must be an object")
        items = value.get("attestations")
        if not isinstance(items, list) or len(items) > safe_limit:
            raise GitHubReadError("attestations response must be a bounded array")
        if any(not isinstance(item, dict) for item in items):
            raise GitHubReadError("attestation item invalid")
        return [{
            "repository_id": item.get("repository_id"),
            "initiator": item.get("initiator"),
        } for item in items]

    def probe_accepted_permissions(self, operation: str) -> dict[str, Any]:
        paths = {
            "repository": self._repo_api_prefix,
            "rulesets": f"{self._repo_api_prefix}/rulesets",
            "actions_secrets": f"{self._repo_api_prefix}/actions/secrets",
            "code_scanning": f"{self._repo_api_prefix}/code-scanning/alerts",
            "dependabot": f"{self._repo_api_prefix}/dependabot/alerts",
            "secret_scanning": f"{self._repo_api_prefix}/secret-scanning/alerts",
            "environments": f"{self._repo_api_prefix}/environments",
            "deployments": f"{self._repo_api_prefix}/deployments",
            "variables": f"{self._repo_api_prefix}/actions/variables",
            "security_advisories": f"{self._repo_api_prefix}/security-advisories",
            "code_quality": f"{self._repo_api_prefix}/code-quality/findings",
            "releases": f"{self._repo_api_prefix}/releases",
            "tags": f"{self._repo_api_prefix}/tags",
            "webhooks": f"{self._repo_api_prefix}/hooks",
        }
        if operation not in paths:
            raise ValueError("unsupported permission probe operation")
        query = {"per_page": 1} if operation != "repository" else None
        api_version = CODE_QUALITY_API_VERSION if operation == "code_quality" else DEFAULT_API_VERSION
        request = self._request(
            self._absolute_url(paths[operation], query),
            api_version=api_version,
        )
        try:
            with self._opener.open(request, timeout=self.timeout_seconds) as response:
                return {
                    "http_status": int(getattr(response, "status", 200)),
                    "accepted_permissions": self._accepted_permissions(response.headers),
                }
        except HTTPError as exc:
            return {
                "http_status": exc.code,
                "accepted_permissions": self._accepted_permissions(exc.headers),
            }
        except URLError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc.reason)}") from None
        except OSError as exc:
            raise GitHubReadError(f"GitHub transport error: {self._redact(exc)}") from None

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
