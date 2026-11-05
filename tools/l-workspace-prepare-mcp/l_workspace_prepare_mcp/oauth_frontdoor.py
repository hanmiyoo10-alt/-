from __future__ import annotations

import asyncio
import json
import os
import urllib.parse
from typing import Any, Callable

from .config import (
    GITHUB_OAUTH_CLIENT_ID_ENV,
    GITHUB_OAUTH_CLIENT_SECRET_ENV,
    OAUTH_PUBLIC_BASE_URL_ENV,
    OAUTH_SCOPE,
    OAUTH_SIGNING_KEY_ENV,
)

_SECURITY_SCHEMES = [{"type": "oauth2", "scopes": [OAUTH_SCOPE]}]


class ClientDisconnected(Exception):
    pass


def _broker_from_env():
    # Reuse only the reviewed OAuth protocol implementation. The credential-admin
    # MCP server/tool catalog is never imported or mounted.
    from repo_admin_mcp import oauth as reviewed_oauth

    reviewed_oauth.OAUTH_SCOPE = OAUTH_SCOPE
    values = {
        OAUTH_PUBLIC_BASE_URL_ENV: os.environ.get(OAUTH_PUBLIC_BASE_URL_ENV, ""),
        GITHUB_OAUTH_CLIENT_ID_ENV: os.environ.get(GITHUB_OAUTH_CLIENT_ID_ENV, ""),
        GITHUB_OAUTH_CLIENT_SECRET_ENV: os.environ.get(GITHUB_OAUTH_CLIENT_SECRET_ENV, ""),
        OAUTH_SIGNING_KEY_ENV: os.environ.get(OAUTH_SIGNING_KEY_ENV, ""),
    }
    if not all(values.values()):
        raise RuntimeError("PARTIAL_OAUTH_CONFIGURATION")
    return reviewed_oauth.OAuthBroker(
        base_url=values[OAUTH_PUBLIC_BASE_URL_ENV],
        github_client_id=values[GITHUB_OAUTH_CLIENT_ID_ENV],
        github_client_secret=values[GITHUB_OAUTH_CLIENT_SECRET_ENV],
        signing_key=values[OAUTH_SIGNING_KEY_ENV],
    )


async def _read_body(receive: Callable[..., Any], *, limit: int = 16384) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while True:
        message = await receive()
        if message.get("type") == "http.disconnect":
            raise ClientDisconnected()
        if message.get("type") != "http.request":
            continue
        chunk = message.get("body", b"")
        size += len(chunk)
        if size > limit:
            raise ValueError("REQUEST_BODY_TOO_LARGE")
        chunks.append(chunk)
        if not message.get("more_body", False):
            return b"".join(chunks)


def _replay(body: bytes):
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return receive


async def _json(send, status: int, payload: dict[str, Any], headers=None) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    out = [
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body)).encode()),
        (b"cache-control", b"no-store"),
    ]
    out.extend(headers or [])
    await send({"type": "http.response.start", "status": status, "headers": out})
    await send({"type": "http.response.body", "body": body})


async def _forward_tools_list(app: Any, scope: dict[str, Any], body: bytes, send) -> None:
    captured: list[dict[str, Any]] = []

    async def capture(message):
        captured.append(message)

    await app(scope, _replay(body), capture)
    start = next((m for m in captured if m.get("type") == "http.response.start"), None)
    if start is None:
        for message in captured:
            await send(message)
        return
    raw = b"".join(
        m.get("body", b"") for m in captured if m.get("type") == "http.response.body"
    )
    try:
        payload = json.loads(raw.decode("utf-8"))
        tools = payload.get("result", {}).get("tools", [])
        if not isinstance(tools, list):
            raise ValueError("tools")
        for tool in tools:
            if not isinstance(tool, dict):
                continue
            tool["securitySchemes"] = _SECURITY_SCHEMES
            meta = tool.get("_meta")
            if not isinstance(meta, dict):
                meta = {}
                tool["_meta"] = meta
            meta["securitySchemes"] = _SECURITY_SCHEMES
        rewritten = json.dumps(payload, separators=(",", ":")).encode()
    except Exception:
        for message in captured:
            await send(message)
        return
    headers = [
        (key, value)
        for key, value in start.get("headers", [])
        if key.lower() != b"content-length"
    ]
    headers.append((b"content-length", str(len(rewritten)).encode()))
    await send({**start, "headers": headers})
    await send({"type": "http.response.body", "body": rewritten})


async def _redirect(send, location: str) -> None:
    await send({
        "type": "http.response.start",
        "status": 302,
        "headers": [(b"location", location.encode()), (b"cache-control", b"no-store")],
    })
    await send({"type": "http.response.body", "body": b""})


class OAuthMCPApp:
    DISCOVERY = {"server/discover", "initialize", "notifications/initialized", "tools/list"}

    def __init__(self, app: Any, broker: Any) -> None:
        self._app = app
        self._broker = broker
        self._gate = asyncio.Semaphore(4)

    async def _io(self, func, *args):
        async with self._gate:
            return await asyncio.to_thread(func, *args)

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self._app(scope, receive, send)
            return
        path = scope.get("path", "")
        method = scope.get("method", "GET").upper()

        if path == "/health" and method == "GET":
            await _json(send, 200, {"status": "ok"})
            return
        if path == "/.well-known/oauth-protected-resource" and method == "GET":
            await _json(send, 200, self._broker.protected_resource_metadata())
            return
        if path == "/.well-known/oauth-authorization-server" and method == "GET":
            await _json(send, 200, self._broker.authorization_server_metadata())
            return
        if path == "/oauth/authorize" and method == "GET":
            query = urllib.parse.parse_qs(scope.get("query_string", b"").decode(), keep_blank_values=True)
            if any(len(v) != 1 for v in query.values()):
                await _json(send, 400, {"error": "invalid_request"})
                return
            try:
                location = await self._io(
                    self._broker.begin_authorization,
                    {key: value[0] for key, value in query.items()},
                )
            except Exception as exc:
                await _json(send, getattr(exc, "http_status", 400), {
                    "error": getattr(exc, "code", "invalid_request"),
                    "error_description": getattr(exc, "description", "Authorization failed."),
                })
                return
            await _redirect(send, location)
            return
        if path == "/oauth/github/callback" and method == "GET":
            query = urllib.parse.parse_qs(scope.get("query_string", b"").decode(), keep_blank_values=True)
            if any(len(v) != 1 for v in query.values()):
                await _json(send, 400, {"error": "invalid_request"})
                return
            try:
                location = await self._io(
                    self._broker.complete_github_callback,
                    {key: value[0] for key, value in query.items()},
                )
            except Exception as exc:
                await _json(send, getattr(exc, "http_status", 400), {
                    "error": getattr(exc, "code", "invalid_request"),
                    "error_description": getattr(exc, "description", "Authorization failed."),
                })
                return
            await _redirect(send, location)
            return
        if path == "/oauth/token" and method == "POST":
            try:
                body = await _read_body(receive)
                query = urllib.parse.parse_qs(body.decode(), keep_blank_values=True)
                if any(len(v) != 1 for v in query.values()):
                    raise ValueError("duplicate")
                token = self._broker.exchange_token({key: value[0] for key, value in query.items()})
            except ClientDisconnected:
                return
            except Exception as exc:
                await _json(send, getattr(exc, "http_status", 400), {
                    "error": getattr(exc, "code", "invalid_request"),
                    "error_description": getattr(exc, "description", "Token exchange failed."),
                })
                return
            await _json(send, 200, token, headers=[(b"pragma", b"no-cache")])
            return
        if path != "/mcp":
            await _json(send, 404, {"error": "not_found"})
            return

        body = b""
        if method == "POST":
            try:
                body = await _read_body(receive)
            except ClientDisconnected:
                return
            except Exception:
                await _json(send, 400, {"error": "invalid_request"})
                return

        rpc_method = None
        rpc_id = None
        if body:
            try:
                message = json.loads(body.decode())
                if isinstance(message, dict):
                    rpc_method = message.get("method")
                    rpc_id = message.get("id")
            except Exception:
                pass

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        auth = headers.get(b"authorization", b"").split(None, 1)
        if len(auth) == 2 and auth[0].lower() == b"bearer":
            try:
                self._broker.verify_access_token(auth[1].decode("ascii"))
            except Exception:
                challenge = self._broker.challenge(error="invalid_token")
                await _json(send, 401, {"error": "unauthorized"},
                            headers=[(b"www-authenticate", challenge.encode())])
                return
            if rpc_method == "tools/list" and method == "POST":
                await _forward_tools_list(self._app, scope, body, send)
            else:
                await self._app(scope, _replay(body) if method == "POST" else receive, send)
            return

        if rpc_method in self.DISCOVERY:
            if rpc_method == "tools/list":
                await _forward_tools_list(self._app, scope, body, send)
            else:
                await self._app(scope, _replay(body), send)
            return

        challenge = self._broker.challenge(
            error="insufficient_scope",
            description="Connect the fixed GitHub owner to prepare an L workspace.",
        )
        if rpc_method == "tools/call":
            await _json(send, 200, {
                "jsonrpc": "2.0",
                "id": rpc_id,
                "result": {
                    "content": [{"type": "text", "text": "Authentication required."}],
                    "_meta": {"mcp/www_authenticate": [challenge]},
                    "isError": True,
                },
            }, headers=[(b"www-authenticate", challenge.encode())])
            return
        await _json(send, 401, {"error": "unauthorized"},
                    headers=[(b"www-authenticate", challenge.encode())])


def build_oauth_http_app(inner: Any) -> OAuthMCPApp:
    return OAuthMCPApp(inner, _broker_from_env())
