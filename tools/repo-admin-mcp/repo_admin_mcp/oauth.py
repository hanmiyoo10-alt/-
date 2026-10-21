from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable

import jwt

from .config import (
    EXPECTED_GITHUB_USER_ID,
    GITHUB_API,
    GITHUB_API_VERSION,
    OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    OAUTH_SCOPE,
)


class OAuthError(RuntimeError):
    def __init__(self, code: str, description: str, *, http_status: int = 400) -> None:
        super().__init__(code)
        self.code = code
        self.description = description
        self.http_status = http_status


@dataclass(frozen=True)
class PendingAuthorization:
    client_id: str
    redirect_uri: str
    client_state: str
    resource: str
    scope: str
    code_challenge: str
    expires_at: float


@dataclass(frozen=True)
class AuthorizationCode:
    client_id: str
    redirect_uri: str
    resource: str
    scope: str
    code_challenge: str
    subject: str
    expires_at: float


def _pkce_s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _bounded_text(value: Any, *, limit: int = 160) -> str:
    if not isinstance(value, str):
        return ""
    return value[:limit]


def _valid_origin_hostname(hostname: str) -> bool:
    if len(hostname) > 253:
        return False
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        pass
    labels = hostname.split(".")
    return all(
        label
        and len(label) <= 63
        and re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?", label)
        for label in labels
    )


def _is_loopback_hostname(hostname: str | None) -> bool:
    if hostname == "localhost":
        return True
    if not hostname:
        return False
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def _redirect_uri_matches_cimd(
    redirect_uri: str,
    registered_uri: str,
    *,
    application_type: str | None,
) -> bool:
    if redirect_uri == registered_uri:
        return True
    if application_type != "native":
        return False
    try:
        actual = urllib.parse.urlsplit(redirect_uri)
        registered = urllib.parse.urlsplit(registered_uri)
        actual_port = actual.port
        _ = registered.port
    except ValueError:
        return False
    return (
        actual.scheme == "http"
        and registered.scheme == "http"
        and _is_loopback_hostname(registered.hostname)
        and actual.hostname == registered.hostname
        and actual_port is not None
        and 1 <= actual_port <= 65535
        and actual.username is None
        and actual.password is None
        and registered.username is None
        and registered.password is None
        and actual.path == registered.path
        and actual.query == registered.query
        and actual.fragment == registered.fragment
    )


def _append_query_params(uri: str, params: dict[str, str]) -> str:
    parsed = urllib.parse.urlsplit(uri)
    encoded = urllib.parse.urlencode(params)
    query = f"{parsed.query}&{encoded}" if parsed.query else encoded
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, parsed.fragment))


class _RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class OAuthBroker:
    _CIMD_PATH = re.compile(r"^/oauth/(?:client\.json|[^/?#]+/client\.json)$")

    def __init__(
        self,
        *,
        base_url: str,
        github_client_id: str,
        github_client_secret: str,
        signing_key: str,
        now: Callable[[], float] = time.time,
        cimd_fetcher: Callable[[str], dict[str, Any]] | None = None,
        github_identity_fetcher: Callable[[str, str], tuple[int, str]] | None = None,
        max_pending_authorizations: int = 128,
        max_authorization_codes: int = 128,
    ) -> None:
        if any(char.isspace() or ord(char) == 0x7F for char in base_url):
            raise OAuthError(
                "INVALID_PUBLIC_BASE_URL",
                "OAuth public base URL must be a canonical HTTPS origin.",
            )
        base_url = base_url.rstrip("/")
        parsed = urllib.parse.urlsplit(base_url)
        try:
            parsed_port = parsed.port
        except ValueError:
            raise OAuthError(
                "INVALID_PUBLIC_BASE_URL",
                "OAuth public base URL must be a canonical HTTPS origin.",
            ) from None
        if (
            parsed.scheme != "https"
            or not parsed.netloc
            or not parsed.hostname
            or not _valid_origin_hostname(parsed.hostname)
            or parsed_port is not None and not 1 <= parsed_port <= 65535
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or "?" in base_url
            or "#" in base_url
            or parsed.query
            or parsed.fragment
        ):
            raise OAuthError("INVALID_PUBLIC_BASE_URL", "OAuth public base URL must be a canonical HTTPS origin.")
        if not github_client_id or not github_client_secret:
            raise OAuthError("GITHUB_OAUTH_CONFIGURATION_MISSING", "GitHub OAuth client configuration is incomplete.")
        if len(signing_key.encode("utf-8")) < 32:
            raise OAuthError("OAUTH_SIGNING_KEY_TOO_SHORT", "OAuth signing key must contain at least 32 bytes.")
        if (
            not isinstance(max_pending_authorizations, int)
            or not 1 <= max_pending_authorizations <= 4096
            or not isinstance(max_authorization_codes, int)
            or not 1 <= max_authorization_codes <= 4096
        ):
            raise OAuthError("INVALID_OAUTH_CAPACITY", "OAuth state capacity must be bounded.")

        self.resource = base_url
        self.issuer = base_url
        self._github_client_id = github_client_id
        self._github_client_secret = github_client_secret
        self._signing_key = signing_key
        self._now = now
        self._cimd_fetcher = cimd_fetcher or self._fetch_json
        self._github_identity_fetcher = github_identity_fetcher or self._github_identity
        self._pending: dict[str, PendingAuthorization] = {}
        self._codes: dict[str, AuthorizationCode] = {}
        self._max_pending_authorizations = max_pending_authorizations
        self._max_authorization_codes = max_authorization_codes
        self._lock = threading.RLock()

    @property
    def github_callback_url(self) -> str:
        return f"{self.issuer}/oauth/github/callback"

    @property
    def resource_metadata_url(self) -> str:
        return f"{self.issuer}/.well-known/oauth-protected-resource"

    def protected_resource_metadata(self) -> dict[str, Any]:
        return {
            "resource": self.resource,
            "authorization_servers": [self.issuer],
            "scopes_supported": [OAUTH_SCOPE],
            "resource_documentation": f"{self.issuer}/health",
        }

    def authorization_server_metadata(self) -> dict[str, Any]:
        return {
            "issuer": self.issuer,
            "authorization_endpoint": f"{self.issuer}/oauth/authorize",
            "token_endpoint": f"{self.issuer}/oauth/token",
            "client_id_metadata_document_supported": True,
            "token_endpoint_auth_methods_supported": ["none"],
            "code_challenge_methods_supported": ["S256"],
            "scopes_supported": [OAUTH_SCOPE],
            "response_types_supported": ["code"],
            "response_modes_supported": ["query"],
            "grant_types_supported": ["authorization_code"],
            "authorization_response_iss_parameter_supported": True,
        }

    def challenge(self, *, error: str = "invalid_token", description: str = "Authentication is required.") -> str:
        safe_error = _bounded_text(error, limit=64) or "invalid_token"
        safe_description = _bounded_text(description, limit=160) or "Authentication is required."
        return (
            f'Bearer resource_metadata="{self.resource_metadata_url}", '
            f'scope="{OAUTH_SCOPE}", error="{safe_error}", '
            f'error_description="{safe_description}"'
        )

    def _prune(self) -> None:
        now = self._now()
        self._pending = {key: value for key, value in self._pending.items() if value.expires_at > now}
        self._codes = {key: value for key, value in self._codes.items() if value.expires_at > now}

    def _validate_cimd(self, client_id: str, redirect_uri: str) -> None:
        try:
            parsed = urllib.parse.urlsplit(client_id)
            parsed_port = parsed.port
        except ValueError:
            raise OAuthError("invalid_client", "ChatGPT client identifier URL is malformed.") from None
        if (
            parsed.scheme != "https"
            or parsed.hostname != "chatgpt.com"
            or parsed_port is not None
            or parsed.query
            or parsed.fragment
            or not self._CIMD_PATH.fullmatch(parsed.path)
        ):
            raise OAuthError("invalid_client", "Only ChatGPT CIMD client identifiers are accepted.")

        try:
            metadata = self._cimd_fetcher(client_id)
        except Exception:
            raise OAuthError("invalid_client", "Unable to verify ChatGPT client metadata.") from None

        metadata_client_id = metadata.get("client_id")
        redirect_uris = metadata.get("redirect_uris")
        application_type = metadata.get("application_type")
        auth_methods = metadata.get("token_endpoint_auth_methods_supported")
        redirect_matches = (
            isinstance(redirect_uris, list)
            and any(
                isinstance(registered_uri, str)
                and _redirect_uri_matches_cimd(
                    redirect_uri,
                    registered_uri,
                    application_type=application_type if isinstance(application_type, str) else None,
                )
                for registered_uri in redirect_uris
            )
        )
        if (
            metadata_client_id != client_id
            or not redirect_matches
            or not isinstance(auth_methods, list)
            or "none" not in auth_methods
        ):
            raise OAuthError(
                "invalid_client",
                "ChatGPT client metadata does not match this client, redirect, or token method.",
            )

    def begin_authorization(
        self,
        params: dict[str, str],
        duplicate_fields: set[str] | None = None,
    ) -> str:
        minimum = {"client_id", "redirect_uri", "state"}
        if not minimum.issubset(params):
            raise OAuthError("invalid_request", "Missing OAuth client, redirect, or state parameters.")
        if not params["state"] or len(params["state"]) > 2048:
            raise OAuthError("invalid_request", "OAuth state is required and must be bounded.")

        # Client metadata must be proven before we can safely redirect an
        # authorization error back to the caller-controlled redirect URI.
        self._validate_cimd(params["client_id"], params["redirect_uri"])

        def client_error(error: str, description: str) -> str:
            return self._authorization_error_redirect(
                params["redirect_uri"],
                params["state"],
                error=error,
                error_description=description,
            )

        if duplicate_fields:
            return client_error("invalid_request", "Duplicate OAuth parameters are not accepted.")

        required = {
            "response_type",
            "code_challenge",
            "code_challenge_method",
            "resource",
            "scope",
        }
        if not required.issubset(params):
            return client_error("invalid_request", "Missing required OAuth authorization parameters.")
        if params["response_type"] != "code":
            return client_error("unsupported_response_type", "Only authorization-code flow is supported.")
        if params.get("response_mode", "query") != "query":
            return client_error(
                "unsupported_response_mode",
                "Only query authorization responses are supported.",
            )
        if params["code_challenge_method"] != "S256":
            return client_error("invalid_request", "PKCE S256 is required.")
        if len(params["code_challenge"]) != 43 or not re.fullmatch(r"[A-Za-z0-9_-]{43}", params["code_challenge"]):
            return client_error("invalid_request", "PKCE code challenge is invalid.")
        if params["resource"] != self.resource:
            return client_error("invalid_target", "OAuth resource does not match this MCP server.")
        if set(params["scope"].split()) != {OAUTH_SCOPE}:
            return client_error("invalid_scope", "Only the fixed repository-admin scope is accepted.")

        upstream_state = secrets.token_urlsafe(32)
        with self._lock:
            self._prune()
            if len(self._pending) >= self._max_pending_authorizations:
                return client_error(
                    "temporarily_unavailable",
                    "Too many authorization attempts are already in progress.",
                )
            self._pending[upstream_state] = PendingAuthorization(
                client_id=params["client_id"],
                redirect_uri=params["redirect_uri"],
                client_state=params["state"],
                resource=params["resource"],
                scope=params["scope"],
                code_challenge=params["code_challenge"],
                expires_at=self._now() + 300,
            )

        query = urllib.parse.urlencode({
            "client_id": self._github_client_id,
            "redirect_uri": self.github_callback_url,
            "state": upstream_state,
            "allow_signup": "false",
        })
        return f"https://github.com/login/oauth/authorize?{query}"

    def complete_github_callback(self, params: dict[str, str]) -> str:
        upstream_state = params.get("state", "")
        with self._lock:
            self._prune()
            pending = self._pending.pop(upstream_state, None)
        if pending is None:
            raise OAuthError("invalid_request", "OAuth state is invalid or expired.")

        if params.get("error"):
            return self._client_redirect(
                pending,
                error="access_denied",
                error_description="GitHub authorization was not completed.",
            )

        code = params.get("code", "")
        if not code:
            return self._client_redirect(
                pending,
                error="invalid_request",
                error_description="GitHub authorization code is missing.",
            )

        try:
            user_id, _login = self._github_identity_fetcher(code, self.github_callback_url)
        except Exception:
            return self._client_redirect(
                pending,
                error="access_denied",
                error_description="GitHub identity verification failed.",
            )

        if user_id != EXPECTED_GITHUB_USER_ID:
            return self._client_redirect(
                pending,
                error="access_denied",
                error_description="This GitHub account is not authorized for this MCP.",
            )

        auth_code = secrets.token_urlsafe(32)
        with self._lock:
            self._prune()
            if len(self._codes) >= self._max_authorization_codes:
                return self._client_redirect(
                    pending,
                    error="temporarily_unavailable",
                    error_description="Too many authorization codes are awaiting exchange.",
                )
            self._codes[auth_code] = AuthorizationCode(
                client_id=pending.client_id,
                redirect_uri=pending.redirect_uri,
                resource=pending.resource,
                scope=pending.scope,
                code_challenge=pending.code_challenge,
                subject=f"github:{user_id}",
                expires_at=self._now() + 120,
            )

        return _append_query_params(
            pending.redirect_uri,
            {"code": auth_code, "state": pending.client_state, "iss": self.issuer},
        )

    def _authorization_error_redirect(
        self,
        redirect_uri: str,
        client_state: str,
        *,
        error: str,
        error_description: str,
    ) -> str:
        return _append_query_params(
            redirect_uri,
            {
                "error": error,
                "error_description": error_description,
                "state": client_state,
                "iss": self.issuer,
            },
        )

    def _client_redirect(self, pending: PendingAuthorization, *, error: str, error_description: str) -> str:
        return self._authorization_error_redirect(
            pending.redirect_uri,
            pending.client_state,
            error=error,
            error_description=error_description,
        )

    def exchange_token(self, params: dict[str, str]) -> dict[str, Any]:
        if params.get("grant_type") != "authorization_code":
            raise OAuthError("unsupported_grant_type", "Only authorization_code is supported.")

        code = params.get("code", "")
        with self._lock:
            self._prune()
            record = self._codes.pop(code, None)
        if record is None:
            raise OAuthError("invalid_grant", "Authorization code is invalid, expired, or already used.")
        if params.get("client_id") != record.client_id:
            raise OAuthError("invalid_client", "Client ID does not match the authorization code.")
        if params.get("redirect_uri") != record.redirect_uri:
            raise OAuthError("invalid_grant", "Redirect URI does not match the authorization code.")
        if params.get("resource") != record.resource:
            raise OAuthError("invalid_target", "OAuth resource does not match the authorization code.")

        verifier = params.get("code_verifier", "")
        if not 43 <= len(verifier) <= 128 or not re.fullmatch(r"[A-Za-z0-9._~-]+", verifier):
            raise OAuthError("invalid_grant", "PKCE code verifier is invalid.")
        if not secrets.compare_digest(_pkce_s256(verifier), record.code_challenge):
            raise OAuthError("invalid_grant", "PKCE verification failed.")

        now = int(self._now())
        token = jwt.encode(
            {
                "iss": self.issuer,
                "aud": self.resource,
                "sub": record.subject,
                "iat": now,
                "nbf": now - 5,
                "exp": now + OAUTH_ACCESS_TOKEN_TTL_SECONDS,
                "scope": record.scope,
                "resource": record.resource,
                "client_id": record.client_id,
                "jti": secrets.token_urlsafe(18),
            },
            self._signing_key,
            algorithm="HS256",
        )
        return {
            "access_token": token,
            "token_type": "Bearer",
            "expires_in": OAUTH_ACCESS_TOKEN_TTL_SECONDS,
            "scope": record.scope,
        }

    def verify_access_token(self, token: str) -> dict[str, Any]:
        try:
            claims = jwt.decode(
                token,
                self._signing_key,
                algorithms=["HS256"],
                audience=self.resource,
                issuer=self.issuer,
                options={"require": ["iss", "aud", "sub", "iat", "nbf", "exp", "scope", "resource"]},
            )
        except jwt.PyJWTError:
            raise OAuthError("invalid_token", "Access token is invalid or expired.", http_status=401) from None

        if claims.get("sub") != f"github:{EXPECTED_GITHUB_USER_ID}":
            raise OAuthError("invalid_token", "Access token subject is not authorized.", http_status=401)
        if claims.get("resource") != self.resource:
            raise OAuthError("invalid_token", "Access token resource is invalid.", http_status=401)
        if set(str(claims.get("scope", "")).split()) != {OAUTH_SCOPE}:
            raise OAuthError("insufficient_scope", "Access token scope is insufficient.", http_status=403)
        return claims

    def _fetch_json(self, url: str) -> dict[str, Any]:
        request = urllib.request.Request(
            url,
            method="GET",
            headers={"Accept": "application/json", "User-Agent": "nyang-repo-admin-mcp/0.2"},
        )
        opener = urllib.request.build_opener(_RejectRedirects())
        try:
            with opener.open(request, timeout=10) as response:
                if response.getcode() != 200:
                    raise OAuthError("invalid_client", "Client metadata endpoint did not return HTTP 200.")
                raw = response.read(65537)
        except OAuthError:
            raise
        except Exception:
            raise OAuthError("invalid_client", "Unable to fetch client metadata.") from None
        if len(raw) > 65536:
            raise OAuthError("invalid_client", "Client metadata is too large.")
        try:
            value = json.loads(raw.decode("utf-8"))
        except Exception:
            raise OAuthError("invalid_client", "Client metadata is not valid JSON.") from None
        if not isinstance(value, dict):
            raise OAuthError("invalid_client", "Client metadata is not an object.")
        return value

    def _github_identity(self, code: str, redirect_uri: str) -> tuple[int, str]:
        token_request = urllib.request.Request(
            "https://github.com/login/oauth/access_token",
            method="POST",
            data=urllib.parse.urlencode({
                "client_id": self._github_client_id,
                "client_secret": self._github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            }).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "nyang-repo-admin-mcp/0.2",
            },
        )
        try:
            with urllib.request.urlopen(token_request, timeout=15) as response:
                token_payload = json.loads(response.read(65537).decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError):
            raise OAuthError("access_denied", "GitHub token exchange failed.", http_status=401) from None

        access_token = token_payload.get("access_token") if isinstance(token_payload, dict) else None
        granted_scope = token_payload.get("scope") if isinstance(token_payload, dict) else None
        token_type = token_payload.get("token_type") if isinstance(token_payload, dict) else None
        if not isinstance(access_token, str) or not access_token:
            raise OAuthError("access_denied", "GitHub token exchange did not return a token.", http_status=401)
        if granted_scope != "":
            raise OAuthError(
                "access_denied",
                "GitHub App user token unexpectedly carried an OAuth scope.",
                http_status=401,
            )
        if not isinstance(token_type, str) or token_type.lower() != "bearer":
            raise OAuthError(
                "access_denied",
                "GitHub App user token type is invalid.",
                http_status=401,
            )

        user_request = urllib.request.Request(
            f"{GITHUB_API}/user",
            method="GET",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": GITHUB_API_VERSION,
                "User-Agent": "nyang-repo-admin-mcp/0.2",
            },
        )
        try:
            with urllib.request.urlopen(user_request, timeout=15) as response:
                user_payload = json.loads(response.read(65537).decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError):
            raise OAuthError("access_denied", "GitHub identity readback failed.", http_status=401) from None

        if not isinstance(user_payload, dict):
            raise OAuthError("access_denied", "GitHub identity response is invalid.", http_status=401)
        user_id = user_payload.get("id")
        login = user_payload.get("login")
        if not isinstance(user_id, int) or not isinstance(login, str):
            raise OAuthError("access_denied", "GitHub identity response is incomplete.", http_status=401)
        return user_id, login
