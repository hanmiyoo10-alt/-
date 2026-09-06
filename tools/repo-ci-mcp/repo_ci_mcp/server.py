from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .canonical_main_status import canonical_main_status as build_canonical_main_status
from .github_reader import GitHubReader
from .overview import repo_ci_overview as build_repo_ci_overview
from .summary import repo_ci_summary as build_repo_ci_summary

mcp = MCPServer(
    "Repository CI MCP",
    instructions=(
        "Read-only bounded repository retrieval. This server exposes compact CI summaries, bounded multi-workflow "
        "CI projections, and canonical-main status composition from explicit GitHub authorities only. It never "
        "mutates GitHub, workflows, products, runtime, release branches, issues, pull requests, refs, or production."
    ),
)


@mcp.tool()
def repo_ci_summary(
    workflow: str | None = None,
    ref: str | None = None,
    run_id: int | None = None,
) -> dict[str, Any]:
    """Return one validated read-only CI_SUMMARY_V1 transport block for a supported workflow run."""
    return build_repo_ci_summary(GitHubReader(), workflow=workflow, ref=ref, run_id=run_id)


@mcp.tool()
def repo_ci_overview(workflows: list[str], ref: str | None = None) -> dict[str, Any]:
    """Project 2–5 validated workflow summaries into one bounded read-only CI overview."""
    return build_repo_ci_overview(GitHubReader(), workflows=workflows, ref=ref)


@mcp.tool()
def canonical_main_status() -> dict[str, Any]:
    """Compose direct main and issue #485 into one bounded fail-closed status result."""
    return build_canonical_main_status()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
