from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .github_reader import GitHubReader
from .summary import repo_ci_summary as build_repo_ci_summary

mcp = MCPServer(
    "Repository CI MCP",
    instructions=(
        "Read-only repository CI compact-summary retrieval. This server reads bounded GitHub Actions metadata, "
        "jobs, and exact CI_SUMMARY_V1 log blocks only. It never mutates GitHub, workflows, products, runtime, "
        "release branches, issues, pull requests, or production."
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


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
