from __future__ import annotations

import asyncio
import hmac
import json
import os
import urllib.parse
from typing import Any, Callable

import uvicorn
from mcp.server import MCPServer

from .config import (
    GITHUB_OAUTH_CLIENT_ID_ENV,
    GITHUB_OAUTH_CLIENT_SECRET_ENV,
    MCP_ACCESS_TOKEN_ENV,
    OAUTH_PUBLIC_BASE_URL_ENV,
    OAUTH_SCOPE,
    OAUTH_SIGNING_KEY_ENV,
    TRANSPORT_ENV,
)
from .github_client import GitHubAdminClient
from .oauth import OAuthBroker, OAuthError
from .service import (
    private_mirror_writer_bootstrap as build_bootstrap,
    private_mirror_writer_revoke as build_revoke,
    private_mirror_writer_rotate as build_rotate,
    private_mirror_writer_status as build_status,
)

_OAUTH_TOOL_META = {"securitySchemes": [{"type": "oauth2", "scopes": [OAUTH_SCOPE]}]}

mcp = MCPServer(
    "Nyang Repository Admin MCP",
    instructions=(
        "Privileged but narrowly fixed credential lifecycle surface for the private myang promotion writer. "
        "Only two repositories, one environment, one Actions secret and matching deploy keys are in scope. "
        "Never return credential plaintext, ciphertext, GitHub authorization material or raw API payloads."
    ),
)


def _client(*, require_app: bool = False) -> GitHubAdminClient:
    return GitHubAdminClient(require_app=require_app)


def _client_failure(kind: str, error: Exception, status: str) -> dict[str, Any]:
    code = str(getattr(error, "code", "CLIENT_CONFIGURATION_ERROR"))[:120]
    http_status = getattr(error, "http_status", None)
    return {
        "schemaVersion": 1,
        "kind": kind,
        "status": status,
        "reasonCode": code,
        "httpStatus": http_status if isinstance(http_status, int) else None,
    }


@mcp.tool(meta=_OAUTH_TOOL_META)
def private_mirror_writer_status() -> dict[str, Any]:
    """Read sanitized metadata for the fixed private-mirror writer credential; never returns secret or key material."""
    try:
        client = _client()
    except Exception as exc:
        return _client_failure("PRIVATE_MIRROR_WRITER_STATUS", exc, "UNKNOWN")
    return build_status(client)


@mcp.tool(meta=_OAUTH_TOOL_META)
def private_mirror_writer_bootstrap() -> dict[str, Any]:
    """Create the fixed private-mirror writer only when metadata proves a clean absent state."""
    try:
        client = _client(require_app=True)
    except Exception as exc:
        return _client_failure("PRIVATE_MIRROR_WRITER_BOOTSTRAP", exc, "BLOCKED")
    return build_bootstrap(client)


@mcp.tool(meta=_OAUTH_TOOL_META)
def private_mirror_writer_rotate(
    expected_key_id: int,
    expected_secret_updated_at: str,
) -> dict[str, Any]:
    """Install a replacement writer secret and stop fail-closed before destructive old-key cleanup."""
    try:
        client = _client(require_app=True)
    except Exception as exc:
        return _client_failure("PRIVATE_MIRROR_WRITER_ROTATE", exc, "BLOCKED")
    return build_rotate(client, expected_key_id, expected_secret_updated_at)


@mcp.tool(meta=_OAUTH_TOOL_META)
def private_mirror_writer_revoke(
    expected_key_id: int,
    expected_secret_updated_at: str | None = None,
) -> dict[str, Any]:
    """Revoke the fixed writer credential using exact expected metadata; no wildcard deletion is possible."""
    try:
        client = _client(require_app=True)
    except Exception as exc:
        return _client_failure("PRIVATE_MIRROR_WRITER_REVOKE", exc, "BLOCKED")
    return build_revoke(client, expected_key_id, expected_secret_updated_at)


class _ClientDisconnected(Exception):
    pass


async def _read_body(receive: Callable[..., Any], *, limit: int = 16384) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while True:
        message = await receive()
        message_type = message.get("type")
        if message_type == "http.disconnect":
            raise _ClientDisconnected()
        if message_type != "http.request":
            continue
        chunk = message.get("body", b"")
        size += len(chunk)
        if size > limit:
            raise OAuthError("invalid_request", "Request body is too large.", http_status=413)
        chunks.append(chunk)
        if not message.get("more_body", False):
            return b"".join(chunks)


def _replay_receive(body: bytes) -> Callable[..., Any]:
    sent = False

    async def receive() -> dict[str, Any]:
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return receive


async def _respond_json(
    send: Callable[..., Any],
    status: int,
    payload: dict[str, Any],
    *,
    headers: list[tuple[bytes, bytes]] | None = None,
) -> None:
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    output_headers = [
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body)).encode("ascii")),
        (b"cache-control", b"no-store"),
    ]
    if headers:
        output_headers.extend(headers)
    await send({"type": "http.response.start", "status": status, "headers": output_headers})
    await send({"type": "http.response.body", "body": body})


async def _respond_redirect(send: Callable[..., Any], location: str) -> None:
    await send({
        "type": "http.response.start",
        "status": 302,
        "headers": [(b"location", location.encode("utf-8")), (b"cache-control", b"no-store")],
    })
    await send({"type": "http.response.body", "body": b""})


def _query_params(scope: dict[str, Any]) -> dict[str, str]:
    parsed = urllib.parse.parse_qs(scope.get("query_string", b"").decode("utf-8"), keep_blank_values=True)
    if any(len(values) != 1 for values in parsed.values()):
        raise OAuthError("invalid_request", "Duplicate OAuth parameters are not accepted.")
    return {key: values[0] for key, values in parsed.items()}


async def _forward_tools_list_with_security_schemes(
    app: Any,
    scope: dict[str, Any],
    body: bytes,
    send: Callable[..., Any],
) -> None:
    captured: list[dict[str, Any]] = []

    async def capture(message: dict[str, Any]) -> None:
        captured.append(message)

    await app(scope, _replay_receive(body), capture)
    start = next((message for message in captured if message.get("type") == "http.response.start"), None)
    if start is None:
        for message in captured:
            await send(message)
        return

    raw = b"".join(
        message.get("body", b"")
        for message in captured
        if message.get("type") == "http.response.body"
    )
    try:
        payload = json.loads(raw.decode("utf-8"))
        tools = payload.get("result", {}).get("tools", [])
        changed = False
        if isinstance(tools, list):
            for tool in tools:
                if not isinstance(tool, dict) or "securitySchemes" in tool:
                    continue
                meta = tool.get("_meta")
                schemes = meta.get("securitySchemes") if isinstance(meta, dict) else None
                if isinstance(schemes, list):
                    tool["securitySchemes"] = schemes
                    changed = True
        if not changed:
            raise ValueError("no rewrite required")
        rewritten = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    except Exception:
        for message in captured:
            await send(message)
        return

    headers = [
        (key, value)
        for key, value in start.get("headers", [])
        if key.lower() != b"content-length"
    ]
    headers.append((b"content-length", str(len(rewritten)).encode("ascii")))
    await send({**start, "headers": headers})
    await send({"type": "http.response.body", "body": rewritten})


class ProtectedMCPApp:
    """Legacy fixed-bearer wrapper retained only for bounded migration fallback."""

    def __init__(self, app: Any, access_token: str) -> None:
        if not access_token:
            raise RuntimeError("MCP_ACCESS_TOKEN_REQUIRED")
        self._app = app
        self._token = access_token.encode("utf-8")

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") == "http" and scope.get("path") == "/health":
            await _respond_json(send, 200, {"status": "ok"})
            return
        if scope.get("type") == "http":
            headers = {key.lower(): value for key, value in scope.get("headers", [])}
            auth = headers.get(b"authorization", b"")
            expected = b"Bearer " + self._token
            if not hmac.compare_digest(auth, expected):
                await _respond_json(
                    send,
                    401,
                    {"error": "unauthorized"},
                    headers=[(b"www-authenticate", b"Bearer")],
                )
                return
        await self._app(scope, receive, send)


class OAuthMCPApp:
    _DISCOVERY_METHODS = {"server/discover", "initialize", "notifications/initialized", "tools/list"}

    def __init__(self, app: Any, broker: OAuthBroker) -> None:
        self._app = app
        self._broker = broker
        self._oauth_io_gate = asyncio.Semaphore(4)

    async def _run_oauth_io(self, func: Callable[..., Any], *args: Any) -> Any:
        async with self._oauth_io_gate:
            return await asyncio.to_thread(func, *args)

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self._app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "GET").upper()

        if path == "/health" and method == "GET":
            await _respond_json(send, 200, {"status": "ok"})
            return

        if path in {
            "/.well-known/oauth-protected-resource",
            "/.well-known/oauth-protected-resource/mcp",
        } and method == "GET":
            await _respond_json(send, 200, self._broker.protected_resource_metadata())
            return

        if path == "/.well-known/oauth-authorization-server" and method == "GET":
            await _respond_json(send, 200, self._broker.authorization_server_metadata())
            return

        if path == "/oauth/authorize" and method == "GET":
            try:
                location = await self._run_oauth_io(self._broker.begin_authorization, _query_params(scope))
            except OAuthError as exc:
                await _respond_json(
                    send,
                    exc.http_status,
                    {"error": exc.code, "error_description": exc.description},
                )
                return
            await _respond_redirect(send, location)
            return

        if path == "/oauth/github/callback" and method == "GET":
            try:
                location = await self._run_oauth_io(self._broker.complete_github_callback, _query_params(scope))
            except OAuthError as exc:
                await _respond_json(
                    send,
                    exc.http_status,
                    {"error": exc.code, "error_description": exc.description},
                )
                return
            await _respond_redirect(send, location)
            return

        if path == "/oauth/token" and method == "POST":
            try:
                body = await _read_body(receive)
                form = urllib.parse.parse_qs(body.decode("utf-8"), keep_blank_values=True)
                if any(len(values) != 1 for values in form.values()):
                    raise OAuthError("invalid_request", "Duplicate token parameters are not accepted.")
                token = self._broker.exchange_token({key: values[0] for key, values in form.items()})
            except _ClientDisconnected:
                return
            except (UnicodeDecodeError, OAuthError) as exc:
                if isinstance(exc, OAuthError):
                    error, description, status = exc.code, exc.description, exc.http_status
                else:
                    error, description, status = "invalid_request", "Token request is not valid UTF-8.", 400
                await _respond_json(send, status, {"error": error, "error_description": description})
                return
            await _respond_json(send, 200, token)
            return

        if path != "/mcp":
            await _respond_json(send, 404, {"error": "not_found"})
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        auth = headers.get(b"authorization", b"")
        if auth.startswith(b"Bearer "):
            try:
                self._broker.verify_access_token(auth[7:].decode("ascii"))
            except (UnicodeDecodeError, OAuthError):
                challenge = self._broker.challenge(
                    error="invalid_token",
                    description="Reconnect the fixed GitHub owner to continue.",
                )
                await _respond_json(
                    send,
                    401,
                    {"error": "unauthorized"},
                    headers=[(b"www-authenticate", challenge.encode("utf-8"))],
                )
                return
            await self._app(scope, receive, send)
            return

        try:
            body = await _read_body(receive)
            message = json.loads(body.decode("utf-8")) if body else {}
        except _ClientDisconnected:
            return
        except Exception:
            challenge = self._broker.challenge(error="invalid_token", description="Authentication is required.")
            await _respond_json(
                send,
                401,
                {"error": "unauthorized"},
                headers=[(b"www-authenticate", challenge.encode("utf-8"))],
            )
            return

        rpc_method = message.get("method") if isinstance(message, dict) else None
        if rpc_method in self._DISCOVERY_METHODS:
            if rpc_method == "tools/list":
                await _forward_tools_list_with_security_schemes(self._app, scope, body, send)
            else:
                await self._app(scope, _replay_receive(body), send)
            return

        challenge = self._broker.challenge(
            error="insufficient_scope",
            description="Connect the fixed GitHub owner to use this privileged tool.",
        )
        if rpc_method == "tools/call":
            await _respond_json(
                send,
                200,
                {
                    "jsonrpc": "2.0",
                    "id": message.get("id"),
                    "result": {
                        "content": [{"type": "text", "text": "Authentication required."}],
                        "_meta": {"mcp/www_authenticate": [challenge]},
                        "isError": True,
                    },
                },
                headers=[(b"www-authenticate", challenge.encode("utf-8"))],
            )
            return

        await _respond_json(
            send,
            401,
            {"error": "unauthorized"},
            headers=[(b"www-authenticate", challenge.encode("utf-8"))],
        )


def build_oauth_broker_from_env() -> OAuthBroker:
    values = {
        OAUTH_PUBLIC_BASE_URL_ENV: os.environ.get(OAUTH_PUBLIC_BASE_URL_ENV, ""),
        GITHUB_OAUTH_CLIENT_ID_ENV: os.environ.get(GITHUB_OAUTH_CLIENT_ID_ENV, ""),
        GITHUB_OAUTH_CLIENT_SECRET_ENV: os.environ.get(GITHUB_OAUTH_CLIENT_SECRET_ENV, ""),
        OAUTH_SIGNING_KEY_ENV: os.environ.get(OAUTH_SIGNING_KEY_ENV, ""),
    }
    if not all(values.values()):
        raise RuntimeError("PARTIAL_OAUTH_CONFIGURATION")
    return OAuthBroker(
        base_url=values[OAUTH_PUBLIC_BASE_URL_ENV],
        github_client_id=values[GITHUB_OAUTH_CLIENT_ID_ENV],
        github_client_secret=values[GITHUB_OAUTH_CLIENT_SECRET_ENV],
        signing_key=values[OAUTH_SIGNING_KEY_ENV],
    )


def build_http_app(access_token: str | None = None, oauth_broker: OAuthBroker | None = None) -> Any:
    inner = mcp.streamable_http_app(
        streamable_http_path="/mcp",
        json_response=True,
        stateless_http=True,
        host="0.0.0.0",
    )
    if oauth_broker is not None:
        return OAuthMCPApp(inner, oauth_broker)

    oauth_values = [
        os.environ.get(OAUTH_PUBLIC_BASE_URL_ENV, ""),
        os.environ.get(GITHUB_OAUTH_CLIENT_ID_ENV, ""),
        os.environ.get(GITHUB_OAUTH_CLIENT_SECRET_ENV, ""),
        os.environ.get(OAUTH_SIGNING_KEY_ENV, ""),
    ]
    if any(oauth_values):
        if not all(oauth_values):
            raise RuntimeError("PARTIAL_OAUTH_CONFIGURATION")
        return OAuthMCPApp(inner, build_oauth_broker_from_env())

    token = access_token if access_token is not None else os.environ.get(MCP_ACCESS_TOKEN_ENV, "")
    return ProtectedMCPApp(inner, token)


def main() -> None:
    transport = os.environ.get(TRANSPORT_ENV, "stdio")
    if transport == "stdio":
        mcp.run()
        return
    if transport == "streamable-http":
        port = int(os.environ.get("PORT", "8000"))
        uvicorn.run(build_http_app(), host="0.0.0.0", port=port, log_level="info")
        return
    raise RuntimeError("UNSUPPORTED_MCP_TRANSPORT")


if __name__ == "__main__":
    main()
