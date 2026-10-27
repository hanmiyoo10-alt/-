from __future__ import annotations

import asyncio
import json
import unittest

from l_workspace_prepare_mcp.oauth_frontdoor import OAuthMCPApp
from l_workspace_prepare_mcp.config import OAUTH_SCOPE


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


if __name__ == "__main__":
    unittest.main()
