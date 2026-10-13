from __future__ import annotations

import hmac
import json
import os
from typing import Any

import uvicorn
from mcp.server import MCPServer

from .config import MCP_ACCESS_TOKEN_ENV, TRANSPORT_ENV
from .github_client import GitHubAdminClient
from .service import (
    private_mirror_writer_bootstrap as build_bootstrap,
    private_mirror_writer_revoke as build_revoke,
    private_mirror_writer_rotate as build_rotate,
    private_mirror_writer_status as build_status,
)

mcp = MCPServer(
    "Nyang Repository Admin MCP",
    instructions=(
        "Privileged but narrowly fixed credential lifecycle surface for the private myang promotion writer. "
        "Only two repositories, one environment, one Actions secret and matching deploy keys are in scope. "
        "Never return credential plaintext, ciphertext, GitHub authorization material or raw API payloads."
    ),
)


def _client() -> GitHubAdminClient:
    return GitHubAdminClient()


@mcp.tool()
def private_mirror_writer_status() -> dict[str, Any]:
    """Read sanitized metadata for the fixed private-mirror writer credential; never returns secret or key material."""
    return build_status(_client())


@mcp.tool()
def private_mirror_writer_bootstrap() -> dict[str, Any]:
    """Create the fixed private-mirror writer only when metadata proves a clean absent state."""
    return build_bootstrap(_client())


@mcp.tool()
def private_mirror_writer_rotate(expected_key_id: int, expected_secret_updated_at: str) -> dict[str, Any]:
    """Rotate the fixed writer credential using exact expected metadata and fail closed on drift."""
    return build_rotate(_client(), expected_key_id, expected_secret_updated_at)


@mcp.tool()
def private_mirror_writer_revoke(expected_key_id: int, expected_secret_updated_at: str) -> dict[str, Any]:
    """Revoke the fixed writer credential using exact expected metadata; no wildcard deletion is possible."""
    return build_revoke(_client(), expected_key_id, expected_secret_updated_at)


class ProtectedMCPApp:
    def __init__(self, app: Any, access_token: str) -> None:
        if not access_token:
            raise RuntimeError("MCP_ACCESS_TOKEN_REQUIRED")
        self._app = app
        self._token = access_token.encode("utf-8")

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") == "http" and scope.get("path") == "/health":
            body = b'{"status":"ok"}'
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return
        if scope.get("type") == "http":
            headers = {key.lower(): value for key, value in scope.get("headers", [])}
            auth = headers.get(b"authorization", b"")
            expected = b"Bearer " + self._token
            if not hmac.compare_digest(auth, expected):
                body = json.dumps({"error": "unauthorized"}, separators=(",", ":")).encode()
                await send({
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(body)).encode()),
                        (b"www-authenticate", b"Bearer"),
                    ],
                })
                await send({"type": "http.response.body", "body": body})
                return
        await self._app(scope, receive, send)


def build_http_app(access_token: str | None = None) -> Any:
    token = access_token if access_token is not None else os.environ.get(MCP_ACCESS_TOKEN_ENV, "")
    inner = mcp.streamable_http_app(
        streamable_http_path="/mcp",
        json_response=True,
        stateless_http=True,
        host="0.0.0.0",
    )
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
