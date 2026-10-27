from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import patch

from l_workspace_prepare_mcp.oauth_frontdoor import OAuthMCPApp
from l_workspace_prepare_mcp.config import OAUTH_SCOPE
from l_workspace_prepare_mcp import server as server_module


class Broker:
    def protected_resource_metadata(self):
        return {"resource": "https://example.test"}

    def authorization_server_metadata(self):
        return {"issuer": "https://example.test"}

    def verify_access_token(self, token):
        if token != "ok":
            raise ValueError("bad")

    def challenge(self, **kwargs):
        return 'Bearer resource_metadata="https://example.test/.well-known/oauth-protected-resource"'

    def begin_authorization(self, params):
        return "https://example.test/redirect"

    def complete_github_callback(self, params):
        return "https://chatgpt.com/callback"

    def exchange_token(self, params):
        return {"access_token": "x", "token_type": "Bearer"}


class ToolsApp:
    async def __call__(self, scope, receive, send):
        while True:
            message = await receive()
            if message.get("type") == "http.request" and not message.get("more_body", False):
                break
        body = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "result": {"tools": [{"name": "prepare_workspace", "inputSchema": {"type": "object"}}]},
        }).encode()
        await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": body})


async def call(app, body, headers=None):
    sent = []
    delivered = False

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.request", "body": b"", "more_body": False}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        sent.append(message)

    await app({
        "type": "http", "path": "/mcp", "method": "POST",
        "query_string": b"", "headers": headers or [],
    }, receive, send)
    raw = b"".join(m.get("body", b"") for m in sent if m.get("type") == "http.response.body")
    return sent, json.loads(raw)


async def call_inner_public_host(app):
    sent = []
    delivered = False
    body = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}
    }).encode()

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.disconnect"}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        sent.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "https",
        "path": "/mcp",
        "raw_path": b"/mcp",
        "query_string": b"",
        "root_path": "",
        "headers": [
            (b"host", b"l-gram.tail48930e.ts.net"),
            (b"content-type", b"application/json"),
            (b"accept", b"application/json, text/event-stream"),
        ],
        "client": ("127.0.0.1", 1234),
        "server": ("127.0.0.1", 8766),
        "state": {},
    }
    async with app.router.lifespan_context(app):
        await app(scope, receive, send)
    start = next(m for m in sent if m.get("type") == "http.response.start")
    raw = b"".join(
        m.get("body", b"") for m in sent if m.get("type") == "http.response.body"
    )
    return start["status"], json.loads(raw)


class OAuthFrontdoorTests(unittest.TestCase):
    def test_anonymous_tools_list_advertises_oauth_without_entering_tool_call(self):
        app = OAuthMCPApp(ToolsApp(), Broker())
        _sent, payload = asyncio.run(call(app, json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}
        }).encode()))
        tool = payload["result"]["tools"][0]
        expected = [{"type": "oauth2", "scopes": [OAUTH_SCOPE]}]
        self.assertEqual(tool["securitySchemes"], expected)
        self.assertEqual(tool["_meta"]["securitySchemes"], expected)

    def test_unauthenticated_tool_call_is_denied(self):
        app = OAuthMCPApp(ToolsApp(), Broker())
        _sent, payload = asyncio.run(call(app, json.dumps({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": "prepare_workspace", "arguments": {}},
        }).encode()))
        self.assertTrue(payload["result"]["isError"])
        self.assertIn("mcp/www_authenticate", payload["result"]["_meta"])


    def test_inner_mcp_accepts_reviewed_public_funnel_host(self):
        with patch.object(server_module, "build_oauth_http_app", side_effect=lambda app: app):
            app = server_module.build_http_app()

        status, payload = asyncio.run(call_inner_public_host(app))
        self.assertEqual(status, 200)
        self.assertEqual(
            [tool["name"] for tool in payload["result"]["tools"]],
            ["prepare_workspace"],
        )


    def test_http_transport_disables_uvicorn_access_log(self):
        app = object()
        with (
            patch.dict(
                server_module.os.environ,
                {server_module.TRANSPORT_ENV: "streamable-http", "PORT": "9876"},
                clear=False,
            ),
            patch.object(server_module, "build_http_app", return_value=app),
            patch.object(server_module.uvicorn, "run") as run,
        ):
            server_module.main()

        run.assert_called_once_with(
            app,
            host="127.0.0.1",
            port=9876,
            access_log=False,
        )


if __name__ == "__main__":
    unittest.main()
