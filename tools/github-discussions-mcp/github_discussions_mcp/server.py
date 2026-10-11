from __future__ import annotations

from typing import Any

from mcp.server import MCPServer

from .service import DiscussionService
from .transport import GitHubGraphQLTransport

mcp = MCPServer(
    "GitHub Discussions MCP",
    instructions=(
        "Bounded GitHub Discussions connector for hanmiyoo10-alt/-. "
        "The repository and GraphQL documents are fixed. Read tools expose category/list/get evidence. "
        "Mutation tools use exact updatedAt pre-read guards plus exact post-write readback, but this is "
        "explicitly non-atomic (atomicCas=false). The server never exposes generic GraphQL, category "
        "rename, Discussion create/delete/close/reopen, comment/moderation, branch/ref/file, workflow, "
        "release, production, runtime, or device mutation."
    ),
)


def _service() -> DiscussionService:
    return DiscussionService(GitHubGraphQLTransport())


@mcp.tool()
def discussion_categories() -> dict[str, Any]:
    """List all bounded Discussion categories for the fixed canonical repository."""
    return _service().discussion_categories()


@mcp.tool()
def discussion_list(limit: int = 20, cursor: str | None = None) -> dict[str, Any]:
    """List one bounded page of Discussions ordered by updatedAt descending."""
    return _service().discussion_list(limit=limit, cursor=cursor)


@mcp.tool()
def discussion_get(number: int) -> dict[str, Any]:
    """Read one exact Discussion by number, including its bounded body and current updatedAt."""
    return _service().discussion_get(number)


@mcp.tool()
def discussion_update_guarded(
    number: int,
    node_id: str,
    expected_updated_at: str,
    title: str | None = None,
    body: str | None = None,
) -> dict[str, Any]:
    """Guarded title/body update. Currentness is non-atomic and every receipt reports atomicCas=false."""
    return _service().discussion_update_guarded(
        number,
        node_id,
        expected_updated_at,
        title=title,
        body=body,
    )


@mcp.tool()
def discussion_move_guarded(
    number: int,
    node_id: str,
    expected_updated_at: str,
    target_category_id: str,
) -> dict[str, Any]:
    """Guarded move to one existing category. Category creation/rename/deletion are not supported."""
    return _service().discussion_move_guarded(
        number,
        node_id,
        expected_updated_at,
        target_category_id,
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
