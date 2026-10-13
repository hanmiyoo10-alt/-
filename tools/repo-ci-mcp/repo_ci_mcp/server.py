from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .branch_protection import repo_branch_protection as build_repo_branch_protection
from .canonical_main_status import canonical_main_status as build_canonical_main_status
from .exact_sha import repo_ci_exact_sha as build_repo_ci_exact_sha
from .github_reader import GitHubReader
from .github_attestations import repo_attestations as build_repo_attestations
from .github_code_quality import repo_code_quality as build_repo_code_quality
from .github_releases import (
    repo_release_assets as build_repo_release_assets,
    repo_releases as build_repo_releases,
    repo_tags as build_repo_tags,
)
from .github_webhooks import (
    repo_webhook_deliveries as build_repo_webhook_deliveries,
    repo_webhooks as build_repo_webhooks,
)
from .github_security_advisories import repo_security_advisories as build_repo_security_advisories
from .github_variables import repo_variable_metadata as build_repo_variable_metadata
from .github_deployments import (
    repo_deployment_statuses as build_repo_deployment_statuses,
    repo_deployments as build_repo_deployments,
    repo_environments as build_repo_environments,
)
from .github_observability import (
    repo_permission_probe as build_repo_permission_probe,
    repo_rulesets as build_repo_rulesets,
    repo_secret_metadata as build_repo_secret_metadata,
    repo_security_alerts as build_repo_security_alerts,
)
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
def repo_rulesets() -> dict[str, Any]:
    """Read a bounded projection of repository rulesets without admin mutation authority."""
    return build_repo_rulesets(GitHubReader())


@mcp.tool()
def repo_permission_probe(operation: str = "repository") -> dict[str, Any]:
    """Observe GitHub accepted-permissions header for one allowlisted read operation."""
    return build_repo_permission_probe(GitHubReader(), operation)


@mcp.tool()
def repo_secret_metadata() -> dict[str, Any]:
    """List repository Actions secret names/timestamps only; secret values are never exposed."""
    return build_repo_secret_metadata(GitHubReader())


@mcp.tool()
def repo_variable_metadata() -> dict[str, Any]:
    """List repository Actions variable names/timestamps only; variable values are never exposed."""
    return build_repo_variable_metadata(GitHubReader())


@mcp.tool()
def repo_security_alerts(kind: str, limit: int = 20) -> dict[str, Any]:
    """Read a bounded projection of one allowlisted repository security-alert family."""
    return build_repo_security_alerts(GitHubReader(), kind, limit)


@mcp.tool()
def repo_security_advisories(limit: int = 20) -> dict[str, Any]:
    """Read bounded recently-updated repository security advisory metadata only."""
    return build_repo_security_advisories(GitHubReader(), limit)


@mcp.tool()
def repo_code_quality(limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of repository Code Quality finding metadata."""
    return build_repo_code_quality(GitHubReader(), limit)


@mcp.tool()
def repo_attestations(subject_digest: str, limit: int = 20) -> dict[str, Any]:
    """Read bounded repository attestation metadata for one explicit SHA256 subject digest."""
    return build_repo_attestations(GitHubReader(), subject_digest, limit)


@mcp.tool()
def repo_releases(limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of repository release metadata."""
    return build_repo_releases(GitHubReader(), limit)


@mcp.tool()
def repo_tags(limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of repository tag names and commit SHAs."""
    return build_repo_tags(GitHubReader(), limit)


@mcp.tool()
def repo_release_assets(release_id: int, limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of metadata for one validated release id."""
    return build_repo_release_assets(GitHubReader(), release_id, limit)


@mcp.tool()
def repo_webhooks(limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of repository webhook metadata."""
    return build_repo_webhooks(GitHubReader(), limit)


@mcp.tool()
def repo_webhook_deliveries(hook_id: int, limit: int = 20) -> dict[str, Any]:
    """Read one bounded first page of metadata for one validated repository webhook id."""
    return build_repo_webhook_deliveries(GitHubReader(), hook_id, limit)


@mcp.tool()
def repo_environments() -> dict[str, Any]:
    """Read bounded GitHub environment control-plane metadata without production authority."""
    return build_repo_environments(GitHubReader())


@mcp.tool()
def repo_deployments(limit: int = 20) -> dict[str, Any]:
    """Read a bounded recent GitHub deployment projection without deployment authority."""
    return build_repo_deployments(GitHubReader(), limit)


@mcp.tool()
def repo_deployment_statuses(deployment_id: int, limit: int = 20) -> dict[str, Any]:
    """Read bounded recent statuses for one validated GitHub deployment id."""
    return build_repo_deployment_statuses(GitHubReader(), deployment_id, limit)


@mcp.tool()
def canonical_main_status() -> dict[str, Any]:
    """Compose direct main and issue #485 into one bounded fail-closed status result."""
    return build_canonical_main_status()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
