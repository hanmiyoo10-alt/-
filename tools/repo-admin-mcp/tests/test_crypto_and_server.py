from __future__ import annotations

import asyncio
import base64
import json
import os
import unittest
from unittest.mock import patch

from nacl.public import PrivateKey, SealedBox

from repo_admin_mcp.crypto import generate_ed25519_keypair, seal_for_github
from repo_admin_mcp.receipt import ReceiptError
from repo_admin_mcp.server import (
    ProtectedMCPApp,
    build_http_app,
    mcp,
    _receipt_signer,
    private_mirror_writer_bootstrap,
    private_mirror_writer_status,
)


async def run_asgi(app, path: str, authorization: bytes | None = None):
    headers = []
    if authorization is not None:
        headers.append((b"authorization", authorization))
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await app(
        {
            "type": "http",
            "method": "GET",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": headers,
            "http_version": "1.1",
            "scheme": "https",
            "server": ("test", 443),
            "client": ("127.0.0.1", 12345),
        },
        receive,
        send,
    )
    return sent


class InnerApp:
    def __init__(self):
        self.called = 0

    async def __call__(self, scope, receive, send):
        self.called += 1
        body = b"inner"
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": body})


class CryptoAndServerTests(unittest.TestCase):
    def test_generated_key_is_openssh_and_destroyable(self):
        material = generate_ed25519_keypair("test-comment")
        self.assertTrue(material.public_key.startswith("ssh-ed25519 "))
        self.assertIn("test-comment", material.public_key)
        self.assertIn(b"OPENSSH PRIVATE KEY", bytes(material.private_key))
        length = len(material.private_key)
        material.destroy()
        self.assertEqual(bytes(material.private_key), b"\x00" * length)

    def test_github_sealed_box_roundtrip(self):
        key = PrivateKey.generate()
        public_b64 = base64.b64encode(bytes(key.public_key)).decode("ascii")
        secret = bytearray(b"synthetic-private-key")
        encrypted = seal_for_github(public_b64, secret)
        clear = SealedBox(key).decrypt(base64.b64decode(encrypted))
        self.assertEqual(clear, bytes(secret))

    def test_exact_four_mcp_tools(self):
        tools = asyncio.run(mcp.list_tools())
        names = sorted(tool.name for tool in tools)
        self.assertEqual(names, [
            "private_mirror_writer_bootstrap",
            "private_mirror_writer_revoke",
            "private_mirror_writer_rotate",
            "private_mirror_writer_status",
        ])

    def test_status_auth_misconfiguration_returns_sanitized_unknown(self):
        with patch.dict(os.environ, {}, clear=True):
            result = private_mirror_writer_status()
        self.assertEqual(result["status"], "UNKNOWN")
        self.assertEqual(result["reasonCode"], "GITHUB_CREDENTIAL_NOT_CONFIGURED")
        self.assertNotIn("token", repr(result).lower())

    def test_mutation_rejects_pat_with_sanitized_blocked_result(self):
        with patch.dict(os.environ, {"REPO_ADMIN_GITHUB_TOKEN": "synthetic-token"}, clear=True):
            result = private_mirror_writer_bootstrap()
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(result["reasonCode"], "MUTATION_REQUIRES_GITHUB_APP")
        self.assertNotIn("synthetic-token", repr(result))

    def test_missing_cleanup_receipt_signing_key_is_explicit(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ReceiptError) as ctx:
                _receipt_signer()
        self.assertEqual(ctx.exception.code, "CLEANUP_RECEIPT_SIGNING_KEY_REQUIRED")

    def test_streamable_http_requires_access_token(self):
        with self.assertRaisesRegex(RuntimeError, "MCP_ACCESS_TOKEN_REQUIRED"):
            build_http_app("")

    def test_http_wrapper_rejects_unauthorized_without_leaking_token(self):
        token = "super-secret-mcp-token"
        inner = InnerApp()
        app = ProtectedMCPApp(inner, token)
        messages = asyncio.run(run_asgi(app, "/mcp"))
        start = next(msg for msg in messages if msg["type"] == "http.response.start")
        body = b"".join(msg.get("body", b"") for msg in messages if msg["type"] == "http.response.body")
        self.assertEqual(start["status"], 401)
        self.assertEqual(inner.called, 0)
        self.assertNotIn(token.encode(), body)

    def test_health_is_minimal_and_anonymous(self):
        inner = InnerApp()
        app = ProtectedMCPApp(inner, "secret")
        messages = asyncio.run(run_asgi(app, "/health"))
        start = next(msg for msg in messages if msg["type"] == "http.response.start")
        body = b"".join(msg.get("body", b"") for msg in messages if msg["type"] == "http.response.body")
        self.assertEqual(start["status"], 200)
        self.assertEqual(json.loads(body), {"status": "ok"})
        self.assertEqual(inner.called, 0)

    def test_authorized_request_reaches_inner_app(self):
        inner = InnerApp()
        app = ProtectedMCPApp(inner, "secret")
        messages = asyncio.run(run_asgi(app, "/mcp", b"Bearer secret"))
        start = next(msg for msg in messages if msg["type"] == "http.response.start")
        self.assertEqual(start["status"], 200)
        self.assertEqual(inner.called, 1)


if __name__ == "__main__":
    unittest.main()
