from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .candidate_snapshot import candidate_snapshot
from .docs_drift import check_docs_drift
from .github_reader import GitHubReader
from .postmerge_health import postmerge_health
from .production_identity import verify_production_identity
from .release_preflight import release_preflight
from .status import build_status

mcp = MCPServer(
    "SimCore MCP",
    instructions=(
        "Read-only SimCore operational status, production-identity, documentation-drift, release-preflight, "
        "post-merge health, and candidate-snapshot tools. These tools never mutate GitHub, main, release-simcore, "
        "product manifests, issues, pull requests, workflows, HUMAN_EVIDENCE, release state, or production."
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


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
