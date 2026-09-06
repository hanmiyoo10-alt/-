from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .github_reader import GitHubReader
from .local_reader import LocalBridgeReader
from .status import build_status

mcp = MCPServer(
    "Local Usage Dashboard MCP",
    instructions=(
        "Read-only Local Usage Dashboard status. MCP-UD-01 never mutates GitHub, "
        "release-usage-dashboard, plugin/runtime state, bridge manager state, or physical acceptance."
    ),
)


@mcp.tool()
def usage_dashboard_status() -> dict[str, Any]:
    """Return sanitized production authority and same-device bridge status."""
    return build_status(GitHubReader(), LocalBridgeReader())


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
