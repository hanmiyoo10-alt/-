from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from .auth import TokenProvider, token_providers_from_env
from .config import (
    CANONICAL_REPOSITORY,
    ENVIRONMENT_NAME,
    GITHUB_API,
    GITHUB_API_VERSION,
    MIRROR_REPOSITORY,
    SECRET_NAME,
)


class GitHubAdminError(RuntimeError):
    def __init__(self, code: str, http_status: int | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.http_status = http_status


@dataclass(frozen=True)
class DeployKey:
    id: int
    title: str
    read_only: bool
    created_at: str | None
    enabled: bool = True


@dataclass(frozen=True)
class SecretMetadata:
    name: str
    created_at: str | None
    updated_at: str | None


@dataclass(frozen=True)
class EnvironmentPublicKey:
    key_id: str
    key: str


class GitHubAdminClient:
    def __init__(
        self,
        token_provider: TokenProvider | None = None,
        timeout: int = 20,
        *,
        require_app: bool = False,
    ) -> None:
        if token_provider is not None:
            self._mirror_token_provider = token_provider
            self._canonical_token_provider = token_provider
        else:
            self._mirror_token_provider, self._canonical_token_provider = token_providers_from_env(
                require_app=require_app
            )
        self._timeout = timeout

    def _request(
        self,
        method: str,
        url: str,
        payload: dict[str, Any] | None = None,
        *,
        token_provider: TokenProvider,
    ) -> tuple[int, Any, dict[str, str]]:
        data = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token_provider.token()}",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            "User-Agent": "nyang-repo-admin-mcp/0.1",
        }
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, method=method, data=data, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                raw = response.read()
                parsed = None if not raw else json.loads(raw.decode("utf-8"))
                return response.status, parsed, {k.lower(): v for k, v in response.headers.items()}
        except urllib.error.HTTPError as exc:
            raise GitHubAdminError("GITHUB_API_REQUEST_FAILED", exc.code) from None
        except Exception:
            raise GitHubAdminError("GITHUB_API_REQUEST_FAILED") from None

    def list_deploy_keys(self) -> list[DeployKey]:
        owner, repo = MIRROR_REPOSITORY.split("/", 1)
        _, payload, headers = self._request(
            "GET",
            f"{GITHUB_API}/repos/{owner}/{repo}/keys?per_page=100",
            token_provider=self._mirror_token_provider,
        )
        if 'rel="next"' in headers.get("link", ""):
            raise GitHubAdminError("DEPLOY_KEY_INVENTORY_TRUNCATED")
        if not isinstance(payload, list):
            raise GitHubAdminError("DEPLOY_KEY_RESPONSE_INVALID")
        result: list[DeployKey] = []
        for row in payload:
            if (
                not isinstance(row, dict) or
                not isinstance(row.get("id"), int) or
                not isinstance(row.get("title"), str) or
                not isinstance(row.get("read_only"), bool) or
                not isinstance(row.get("enabled"), bool)
            ):
                raise GitHubAdminError("DEPLOY_KEY_RESPONSE_INVALID")
            result.append(DeployKey(
                id=row["id"],
                title=row["title"],
                read_only=row["read_only"],
                created_at=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
                enabled=row["enabled"],
            ))
        return result

    def create_write_deploy_key(self, title: str, public_key: str) -> DeployKey:
        owner, repo = MIRROR_REPOSITORY.split("/", 1)
        _, row, _ = self._request(
            "POST",
            f"{GITHUB_API}/repos/{owner}/{repo}/keys",
            {
                "title": title,
                "key": public_key,
                "read_only": False,
            },
            token_provider=self._mirror_token_provider,
        )
        if (
            not isinstance(row, dict) or
            not isinstance(row.get("id"), int) or
            not isinstance(row.get("read_only"), bool) or
            not isinstance(row.get("enabled"), bool)
        ):
            raise GitHubAdminError("DEPLOY_KEY_CREATE_RESPONSE_INVALID")
        return DeployKey(
            id=row["id"],
            title=row.get("title") if isinstance(row.get("title"), str) else title,
            read_only=row["read_only"],
            created_at=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
            enabled=row["enabled"],
        )

    def delete_deploy_key(self, key_id: int) -> None:
        if not isinstance(key_id, int) or key_id <= 0:
            raise GitHubAdminError("INVALID_DEPLOY_KEY_ID")
        owner, repo = MIRROR_REPOSITORY.split("/", 1)
        self._request(
            "DELETE",
            f"{GITHUB_API}/repos/{owner}/{repo}/keys/{key_id}",
            token_provider=self._mirror_token_provider,
        )

    def get_environment_public_key(self) -> EnvironmentPublicKey:
        owner, repo = CANONICAL_REPOSITORY.split("/", 1)
        env = urllib.parse.quote(ENVIRONMENT_NAME, safe="")
        _, row, _ = self._request(
            "GET",
            f"{GITHUB_API}/repos/{owner}/{repo}/environments/{env}/secrets/public-key",
            token_provider=self._canonical_token_provider,
        )
        if not isinstance(row, dict) or not isinstance(row.get("key_id"), str) or not isinstance(row.get("key"), str):
            raise GitHubAdminError("ENVIRONMENT_PUBLIC_KEY_RESPONSE_INVALID")
        return EnvironmentPublicKey(key_id=row["key_id"], key=row["key"])

    def get_environment_secret(self) -> SecretMetadata | None:
        owner, repo = CANONICAL_REPOSITORY.split("/", 1)
        env = urllib.parse.quote(ENVIRONMENT_NAME, safe="")
        url = f"{GITHUB_API}/repos/{owner}/{repo}/environments/{env}/secrets?per_page=100"
        _, payload, headers = self._request(
            "GET",
            url,
            token_provider=self._canonical_token_provider,
        )
        if not isinstance(payload, dict):
            raise GitHubAdminError("ENVIRONMENT_SECRET_LIST_RESPONSE_INVALID")
        total_count = payload.get("total_count")
        rows = payload.get("secrets")
        if not isinstance(total_count, int) or total_count < 0 or not isinstance(rows, list):
            raise GitHubAdminError("ENVIRONMENT_SECRET_LIST_RESPONSE_INVALID")
        if total_count != len(rows) or 'rel="next"' in headers.get("link", ""):
            raise GitHubAdminError("ENVIRONMENT_SECRET_INVENTORY_TRUNCATED")

        match: SecretMetadata | None = None
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("name"), str):
                raise GitHubAdminError("ENVIRONMENT_SECRET_LIST_RESPONSE_INVALID")
            if row["name"] == SECRET_NAME:
                if match is not None:
                    raise GitHubAdminError("ENVIRONMENT_SECRET_IDENTITY_CONFLICT")
                match = SecretMetadata(
                    name=SECRET_NAME,
                    created_at=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
                    updated_at=row.get("updated_at") if isinstance(row.get("updated_at"), str) else None,
                )
        return match

    def put_environment_secret(self, encrypted_value: str, key_id: str) -> None:
        owner, repo = CANONICAL_REPOSITORY.split("/", 1)
        env = urllib.parse.quote(ENVIRONMENT_NAME, safe="")
        secret = urllib.parse.quote(SECRET_NAME, safe="")
        self._request(
            "PUT",
            f"{GITHUB_API}/repos/{owner}/{repo}/environments/{env}/secrets/{secret}",
            {
                "encrypted_value": encrypted_value,
                "key_id": key_id,
            },
            token_provider=self._canonical_token_provider,
        )

    def delete_environment_secret(self) -> None:
        owner, repo = CANONICAL_REPOSITORY.split("/", 1)
        env = urllib.parse.quote(ENVIRONMENT_NAME, safe="")
        secret = urllib.parse.quote(SECRET_NAME, safe="")
        url = f"{GITHUB_API}/repos/{owner}/{repo}/environments/{env}/secrets/{secret}"
        self._request("DELETE", url, token_provider=self._canonical_token_provider)
