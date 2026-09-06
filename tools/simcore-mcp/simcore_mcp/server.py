from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .github_reader import GitHubReader
from .status import build_status

mcp = MCPServer(
    "SimCore MCP",
    instructions=(
        "Read-only SimCore operational status tools. MCP-01 never mutates GitHub, "
        "main, release-simcore, product manifests, issues, pull requests, or production."
    ),
)


@mcp.tool()
def simcore_status() -> dict[str, Any]:
    """Return a read-only SimCore authority, parity, validation, and tracking snapshot."""
    return build_status(GitHubReader())


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
