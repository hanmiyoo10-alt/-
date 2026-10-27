from __future__ import annotations

import os

import uvicorn
from mcp.server import MCPServer

from .config import TRANSPORT_ENV
from .oauth_frontdoor import build_oauth_http_app
from .service import WorkspacePrepareService

mcp = MCPServer(
    "MCL L Workspace Prepare MCP",
    instructions=(
        "One bounded tool prepares the exact L repository workspace already authorized "
        "by a current MCL packet, D-013 lease and D-014 manifest. No generic shell, Git, "
        "file, holder, PR, merge, release, runtime or device authority is exposed."
    ),
)


@mcp.tool()
def prepare_workspace(packet_number: int, manifest_id: str) -> dict:
    """Prepare only the exact manifest-declared L worktree after fresh repository revalidation."""
    return WorkspacePrepareService().prepare_workspace(packet_number, manifest_id)


def build_http_app():
    inner = mcp.streamable_http_app(
        streamable_http_path="/mcp",
        json_response=True,
        stateless_http=True,
        host="0.0.0.0",
    )
    return build_oauth_http_app(inner)


def main() -> None:
    transport = os.environ.get(TRANSPORT_ENV, "stdio")
    if transport == "stdio":
        mcp.run(transport="stdio")
        return
    if transport != "streamable-http":
        raise RuntimeError("TRANSPORT_UNSUPPORTED")
    port = int(os.environ.get("PORT", "8766"))
    uvicorn.run(
        build_http_app(),
        host="127.0.0.1",
        port=port,
        access_log=False,
    )


if __name__ == "__main__":
    main()
