from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .branch_protection import repo_branch_protection as build_repo_branch_protection
from .canonical_main_status import canonical_main_status as build_canonical_main_status
from .exact_sha import repo_ci_exact_sha as build_repo_ci_exact_sha
from .github_reader import GitHubReader
from .notebook import repo_notebook_read as build_repo_notebook_read
from .overview import repo_ci_overview as build_repo_ci_overview
from .summary import repo_ci_summary as build_repo_ci_summary

mcp = MCPServer(
    "Repository CI MCP",
    instructions=(
        "Read-only bounded repository retrieval. This server exposes compact CI summaries, bounded multi-workflow "
        "CI projections, notebook semantic reads, detailed branch-protection reads, and canonical-main status "
        "composition from explicit GitHub "
        "authorities only. It never mutates GitHub, workflows, products, runtime, release branches, issues, "
        "pull requests, refs, or production."
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
def repo_ci_exact_sha(sha: str, workflow: str | None = None, event: str | None = None, ref: str | None = None, before_sha: str | None = None) -> dict[str, Any]:
    """Inventory all-event exact-SHA workflow runs and explain a proven workflow absence conservatively."""
    return build_repo_ci_exact_sha(GitHubReader(), sha=sha, workflow=workflow, event=event, ref=ref, before_sha=before_sha)


@mcp.tool()
def repo_notebook_read(
    path: str,
    ref: str | None = None,
    start_cell: int = 0,
    max_cells: int = 20,
    include_outputs: bool = False,
) -> dict[str, Any]:
    """Read a bounded semantic projection of one committed Jupyter/Colab notebook."""
    return build_repo_notebook_read(
        GitHubReader(), path=path, ref=ref, start_cell=start_cell,
        max_cells=max_cells, include_outputs=include_outputs,
    )


@mcp.tool()
def repo_branch_protection(branch: str = "main") -> dict[str, Any]:
    """Read bounded branch-protection detail while preserving permission-blocked partial evidence."""
    return build_repo_branch_protection(GitHubReader(), branch=branch)


@mcp.tool()
def canonical_main_status() -> dict[str, Any]:
    """Compose direct main and issue #485 into one bounded fail-closed status result."""
    return build_canonical_main_status()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
