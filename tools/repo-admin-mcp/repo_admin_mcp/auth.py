from __future__ import annotations

import base64
import calendar
import json
import os
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from .config import (
    GITHUB_API,
    GITHUB_API_VERSION,
    GITHUB_APP_ID_ENV,
    GITHUB_APP_INSTALLATION_ID_ENV,
    GITHUB_APP_PRIVATE_KEY_ENV,
    GITHUB_TOKEN_ENV,
)


class AuthError(RuntimeError):
    def __init__(self, code: str, http_status: int | None = None) -> None:
        super().__init__(code)
        self.code = code
        self.http_status = http_status


class TokenProvider(Protocol):
    def token(self) -> str: ...


@dataclass
class StaticTokenProvider:
    value: str

    def token(self) -> str:
        return self.value


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


class GitHubAppInstallationTokenProvider:
    def __init__(
        self,
        app_id: str,
        installation_id: str,
        private_key_pem: str,
        *,
        repositories: tuple[str, ...],
        permissions: dict[str, str],
    ) -> None:
        if not app_id.isdigit() or not installation_id.isdigit():
            raise AuthError("INVALID_GITHUB_APP_IDENTITY")
        if not repositories or not all(isinstance(name, str) and name for name in repositories):
            raise AuthError("INVALID_GITHUB_APP_REPOSITORY_SCOPE")
        if not permissions or not all(
            isinstance(name, str) and name and level in {"read", "write"}
            for name, level in permissions.items()
        ):
            raise AuthError("INVALID_GITHUB_APP_PERMISSION_SCOPE")
        self._app_id = app_id
        self._installation_id = installation_id
        self._private_key_pem = private_key_pem
        self._repositories = repositories
        self._permissions = dict(permissions)
        self._cached_token: str | None = None
        self._expires_epoch = 0.0
        self._lock = threading.Lock()

    def _jwt(self) -> str:
        now = int(time.time())
        header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
        payload = _b64url(json.dumps(
            {"iat": now - 60, "exp": now + 540, "iss": self._app_id},
            separators=(",", ":"),
        ).encode())
        signing_input = f"{header}.{payload}".encode("ascii")
        try:
            key = serialization.load_pem_private_key(self._private_key_pem.encode(), password=None)
            signature = key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
        except Exception:
            raise AuthError("INVALID_GITHUB_APP_PRIVATE_KEY") from None
        return f"{header}.{payload}.{_b64url(signature)}"

    def token(self) -> str:
        with self._lock:
            if self._cached_token and time.time() < self._expires_epoch - 60:
                return self._cached_token
            jwt = self._jwt()
            request = urllib.request.Request(
                f"{GITHUB_API}/app/installations/{self._installation_id}/access_tokens",
                method="POST",
                data=json.dumps({
                    "repositories": list(self._repositories),
                    "permissions": self._permissions,
                }, separators=(",", ":")).encode("utf-8"),
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {jwt}",
                    "X-GitHub-Api-Version": GITHUB_API_VERSION,
                    "Content-Type": "application/json",
                    "User-Agent": "nyang-repo-admin-mcp/0.1",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=20) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                raise AuthError("GITHUB_APP_TOKEN_REQUEST_FAILED", exc.code) from None
            except Exception:
                raise AuthError("GITHUB_APP_TOKEN_REQUEST_FAILED") from None
            token = payload.get("token")
            expires_at = payload.get("expires_at")
            if not isinstance(token, str) or not token or not isinstance(expires_at, str):
                raise AuthError("GITHUB_APP_TOKEN_RESPONSE_INVALID")
            try:
                expires_epoch = calendar.timegm(time.strptime(expires_at, "%Y-%m-%dT%H:%M:%SZ"))
            except ValueError:
                expires_epoch = time.time() + 300
            self._cached_token = token
            self._expires_epoch = expires_epoch
            return token


def token_providers_from_env(*, require_app: bool = False) -> tuple[TokenProvider, TokenProvider]:
    app_values = [
        os.environ.get(GITHUB_APP_ID_ENV),
        os.environ.get(GITHUB_APP_INSTALLATION_ID_ENV),
        os.environ.get(GITHUB_APP_PRIVATE_KEY_ENV),
    ]
    if any(app_values):
        if not all(app_values):
            raise AuthError("PARTIAL_GITHUB_APP_CONFIGURATION")
        access = "write" if require_app else "read"
        mirror = GitHubAppInstallationTokenProvider(
            app_values[0] or "",
            app_values[1] or "",
            app_values[2] or "",
            repositories=("myang",),
            permissions={"administration": access},
        )
        canonical = GitHubAppInstallationTokenProvider(
            app_values[0] or "",
            app_values[1] or "",
            app_values[2] or "",
            repositories=("-",),
            permissions={"environments": access},
        )
        return mirror, canonical

    token = os.environ.get(GITHUB_TOKEN_ENV, "")
    if token:
        if require_app:
            raise AuthError("MUTATION_REQUIRES_GITHUB_APP")
        provider = StaticTokenProvider(token)
        return provider, provider
    raise AuthError("GITHUB_CREDENTIAL_NOT_CONFIGURED")
