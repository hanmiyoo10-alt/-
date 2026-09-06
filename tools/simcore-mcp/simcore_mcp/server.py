from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .candidate_preflight import candidate_preflight
from .candidate_snapshot import candidate_snapshot
from .docs_drift import check_docs_drift
from .github_reader import GitHubReader
from .postmerge_health import postmerge_health
from .production_identity import verify_production_identity
from .relationship_audit import RelationshipReader, relationship_audit
from .release_preflight import release_preflight
from .status import build_status

mcp = MCPServer(
    "SimCore MCP",
    instructions=(
        "Read-only SimCore operational status, production-identity, documentation-drift, release-preflight, "
        "post-merge health, candidate-snapshot, candidate-preflight, and branch/PR relationship-audit tools. "
        "These tools never mutate GitHub, main, release-simcore, product manifests, issues, pull requests, "
        "workflows, HUMAN_EVIDENCE, release state, or production."
    ),
)


@mcp.tool()
def simcore_status() -> dict[str, Any]:
    """Return a read-only SimCore authority, parity, validation, and tracking snapshot."""
    return build_status(GitHubReader())


@mcp.tool()
def simcore_verify_production_identity() -> dict[str, Any]:
    """Verify declared SimCore production identity against deployed release authority."""
    return verify_production_identity(GitHubReader())


@mcp.tool()
def simcore_check_docs_drift() -> dict[str, Any]:
    """Verify current SimCore documentation authority against manifest-owned state."""
    return check_docs_drift(GitHubReader())


@mcp.tool()
def simcore_release_preflight(version: str) -> dict[str, Any]:
    """Run a read-only SimCore release preflight for an exact target version."""
    return release_preflight(GitHubReader(), version)


@mcp.tool()
def simcore_postmerge_health(commit_sha: str) -> dict[str, Any]:
    """Observe read-only post-merge health for an exact target commit."""
    return postmerge_health(GitHubReader(), commit_sha)


@mcp.tool()
def simcore_candidate_snapshot(ref: str) -> dict[str, Any]:
    """Resolve a ref to an immutable commit and snapshot exact SimCore candidate identity."""
    return candidate_snapshot(GitHubReader(), ref)


@mcp.tool()
def simcore_candidate_preflight(ref: str) -> dict[str, Any]:
    """Compose candidate snapshot and version preflight under one frozen read-only authority."""
    return candidate_preflight(GitHubReader(), ref)


@mcp.tool()
def simcore_branch_pr_relationship_audit(
    pr_number: int,
    mode: str = "BR-01",
    expected_base_ref: str | None = None,
    expected_base_sha: str | None = None,
    expected_head_ref: str | None = None,
    expected_head_sha: str | None = None,
    base_movement_policy: str | None = None,
    head_movement_policy: str | None = None,
    include_compare: bool = True,
    require_head_descends_from_base: bool = False,
) -> dict[str, Any]:
    """Run one bounded read-only SYS-36 branch/PR relationship audit."""
    return relationship_audit(
        RelationshipReader(),
        pr_number,
        mode,
        expected_base_ref,
        expected_base_sha,
        expected_head_ref,
        expected_head_sha,
        base_movement_policy,
        head_movement_policy,
        include_compare,
        require_head_descends_from_base,
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
