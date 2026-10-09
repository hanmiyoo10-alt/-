from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from github_discussions_mcp.graphql import (
    CATEGORIES_QUERY,
    DISCUSSION_GET_QUERY,
    DISCUSSION_UPDATE_MUTATION,
    DISCUSSIONS_LIST_QUERY,
    REPOSITORY_FULL_NAME,
)
from github_discussions_mcp.service import DiscussionService
from github_discussions_mcp.transport import GitHubGraphQLTransportError


CATEGORY_A = {
    "id": "CAT_A",
    "name": "Repository Operations",
    "slug": "repository-operations",
    "description": "repo ops",
    "isAnswerable": False,
    "createdAt": "2026-10-09T03:34:41Z",
    "updatedAt": "2026-10-09T03:34:41Z",
}
CATEGORY_B = {
    "id": "CAT_B",
    "name": "Canonical Main",
    "slug": "canonical-main",
    "description": "canonical",
    "isAnswerable": False,
    "createdAt": "2026-10-09T03:29:54Z",
    "updatedAt": "2026-10-09T03:29:54Z",
}


def discussion(
    *,
    discussion_id: str = "DISC_1",
    number: int = 3411,
    title: str = "Repo ops ideas",
    body: str = "body-v1",
    updated_at: str = "2026-10-09T05:47:15Z",
    category: dict = CATEGORY_A,
    viewer_can_update: bool = True,
) -> dict:
    return {
        "id": discussion_id,
        "number": number,
        "title": title,
        "body": body,
        "updatedAt": updated_at,
        "closed": False,
        "viewerCanUpdate": viewer_can_update,
        "url": f"https://github.com/hanmiyoo10-alt/-/discussions/{number}",
        "category": {
            "id": category["id"],
            "name": category["name"],
            "slug": category["slug"],
        },
    }


def categories_payload(categories=None, *, has_next: bool = False) -> dict:
    return {
        "repository": {
            "id": "REPO_1",
            "hasDiscussionsEnabled": True,
            "discussionCategories": {
                "nodes": list(categories if categories is not None else [CATEGORY_A, CATEGORY_B]),
                "pageInfo": {
                    "hasNextPage": has_next,
                    "endCursor": "cursor-next" if has_next else None,
                },
            },
        }
    }


def list_payload(nodes=None, *, has_next: bool = False) -> dict:
    items = nodes if nodes is not None else [discussion()]
    compact = []
    for item in items:
        compact.append({key: value for key, value in item.items() if key != "body"})
    return {
        "repository": {
            "id": "REPO_1",
            "hasDiscussionsEnabled": True,
            "discussions": {
                "nodes": compact,
                "pageInfo": {
                    "hasNextPage": has_next,
                    "endCursor": "next-page" if has_next else None,
                },
            },
        }
    }


def get_payload(item=None) -> dict:
    return {
        "repository": {
            "id": "REPO_1",
            "hasDiscussionsEnabled": True,
            "discussion": item if item is not None else discussion(),
        }
    }


def mutation_payload(item=None) -> dict:
    return {
        "updateDiscussion": {
            "discussion": item if item is not None else discussion(),
        }
    }


class FakeTransport:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def execute(self, document, variables):
        self.calls.append((document, variables))
        if not self.responses:
            raise AssertionError("unexpected transport call")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class DiscussionServiceTests(unittest.TestCase):
    def test_fixed_repository_identity(self):
        self.assertEqual(REPOSITORY_FULL_NAME, "hanmiyoo10-alt/-")

    def test_categories_returns_complete_inventory(self):
        transport = FakeTransport([categories_payload()])
        result = DiscussionService(transport).discussion_categories()
        self.assertEqual(result["disposition"], "PASS")
        self.assertEqual(result["repository"], REPOSITORY_FULL_NAME)
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["categories"][0]["id"], "CAT_A")
        self.assertEqual(transport.calls[0][0], CATEGORIES_QUERY)

    def test_categories_refuses_silent_truncation(self):
        transport = FakeTransport([categories_payload(has_next=True)])
        result = DiscussionService(transport).discussion_categories()
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reasonCode"], "CATEGORY_PAGE_BOUND_EXCEEDED")

    def test_list_is_bounded_and_preserves_cursor(self):
        transport = FakeTransport([list_payload(has_next=True)])
        result = DiscussionService(transport).discussion_list(limit=7, cursor="cursor-old")
        self.assertEqual(result["disposition"], "PASS")
        self.assertEqual(result["count"], 1)
        self.assertTrue(result["pageInfo"]["hasNextPage"])
        document, variables = transport.calls[0]
        self.assertEqual(document, DISCUSSIONS_LIST_QUERY)
        self.assertEqual(variables["first"], 7)
        self.assertEqual(variables["after"], "cursor-old")

    def test_list_invalid_limit_never_calls_transport(self):
        transport = FakeTransport([])
        result = DiscussionService(transport).discussion_list(limit=51)
        self.assertEqual(result["disposition"], "UNKNOWN")
        self.assertEqual(result["reasonCode"], "LIST_LIMIT_INVALID")
        self.assertEqual(transport.calls, [])

    def test_get_returns_exact_body_and_currentness(self):
        transport = FakeTransport([get_payload()])
        result = DiscussionService(transport).discussion_get(3411)
        self.assertEqual(result["disposition"], "PASS")
        self.assertEqual(result["discussion"]["id"], "DISC_1")
        self.assertEqual(result["discussion"]["body"], "body-v1")
        self.assertEqual(result["discussion"]["updatedAt"], "2026-10-09T05:47:15Z")
        self.assertEqual(transport.calls[0][0], DISCUSSION_GET_QUERY)

    def test_update_stale_updated_at_performs_zero_mutation(self):
        transport = FakeTransport([get_payload()])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:00:00Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "STALE_PRECONDITION")
        self.assertEqual(result["reasonCode"], "UPDATED_AT_MISMATCH")
        self.assertFalse(result["atomicCas"])
        self.assertFalse(result["mutationAttempted"])
        self.assertFalse(result["mutationMayHaveOccurred"])
        self.assertEqual(len(transport.calls), 1)

    def test_update_identity_mismatch_performs_zero_mutation(self):
        transport = FakeTransport([get_payload()])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DIFFERENT_ID",
            "2026-10-09T05:47:15Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "STALE_PRECONDITION")
        self.assertEqual(result["reasonCode"], "DISCUSSION_IDENTITY_MISMATCH")
        self.assertEqual(len(transport.calls), 1)

    def test_update_exact_precondition_mutates_once_and_requires_readback(self):
        before = discussion()
        after = discussion(
            title="new title",
            updated_at="2026-10-10T00:00:01Z",
        )
        transport = FakeTransport(
            [
                get_payload(before),
                mutation_payload(after),
                get_payload(after),
            ]
        )
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "UPDATED")
        self.assertFalse(result["atomicCas"])
        self.assertTrue(result["mutationAttempted"])
        self.assertFalse(result["mutationMayHaveOccurred"])
        self.assertEqual(result["postWriteUpdatedAt"], "2026-10-10T00:00:01Z")
        self.assertEqual(result["mutationFields"], ["title"])
        self.assertEqual([call[0] for call in transport.calls], [
            DISCUSSION_GET_QUERY,
            DISCUSSION_UPDATE_MUTATION,
            DISCUSSION_GET_QUERY,
        ])
        mutation_input = transport.calls[1][1]["input"]
        self.assertEqual(mutation_input, {
            "discussionId": "DISC_1",
            "title": "new title",
        })

    def test_update_body_receipt_uses_identity_not_large_body_echo(self):
        before = discussion()
        after = discussion(body="new body", updated_at="2026-10-10T00:00:02Z")
        transport = FakeTransport([
            get_payload(before),
            mutation_payload(after),
            get_payload(after),
        ])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            body="new body",
        )
        self.assertEqual(result["disposition"], "UPDATED")
        self.assertEqual(result["bodyIdentity"]["bytes"], len("new body".encode()))
        self.assertEqual(len(result["bodyIdentity"]["sha256"]), 64)
        self.assertNotIn("body", result)

    def test_mutation_transport_failure_preserves_uncertainty(self):
        transport = FakeTransport([
            get_payload(),
            GitHubGraphQLTransportError("GITHUB_TIMEOUT"),
        ])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "MUTATION_UNCERTAIN")
        self.assertEqual(result["reasonCode"], "GITHUB_TIMEOUT")
        self.assertTrue(result["mutationAttempted"])
        self.assertTrue(result["mutationMayHaveOccurred"])
        self.assertFalse(result["atomicCas"])
        self.assertEqual(len(transport.calls), 2)

    def test_postwrite_read_failure_preserves_uncertainty(self):
        after = discussion(title="new title", updated_at="2026-10-10T00:00:01Z")
        transport = FakeTransport([
            get_payload(),
            mutation_payload(after),
            GitHubGraphQLTransportError("GITHUB_NETWORK_ERROR"),
        ])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "MUTATION_UNCERTAIN")
        self.assertEqual(result["reasonCode"], "POSTWRITE_GITHUB_NETWORK_ERROR")
        self.assertTrue(result["mutationMayHaveOccurred"])

    def test_update_readback_mismatch_preserves_uncertainty(self):
        response = discussion(title="new title", updated_at="2026-10-10T00:00:01Z")
        raced = discussion(title="other writer", updated_at="2026-10-10T00:00:02Z")
        transport = FakeTransport([
            get_payload(),
            mutation_payload(response),
            get_payload(raced),
        ])
        result = DiscussionService(transport).discussion_update_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            title="new title",
        )
        self.assertEqual(result["disposition"], "MUTATION_UNCERTAIN")
        self.assertEqual(result["reasonCode"], "POSTWRITE_READBACK_MISMATCH")

    def test_move_rejects_unknown_category_before_discussion_read(self):
        transport = FakeTransport([categories_payload()])
        result = DiscussionService(transport).discussion_move_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            "CAT_UNKNOWN",
        )
        self.assertEqual(result["disposition"], "BLOCKED_CAPABILITY")
        self.assertEqual(result["reasonCode"], "TARGET_CATEGORY_NOT_FOUND")
        self.assertFalse(result["mutationAttempted"])
        self.assertEqual([call[0] for call in transport.calls], [CATEGORIES_QUERY])

    def test_move_exact_precondition_preserves_title_and_body(self):
        before = discussion(category=CATEGORY_A)
        after = discussion(
            category=CATEGORY_B,
            updated_at="2026-10-10T00:00:03Z",
        )
        transport = FakeTransport([
            categories_payload(),
            get_payload(before),
            mutation_payload(after),
            get_payload(after),
        ])
        result = DiscussionService(transport).discussion_move_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            "CAT_B",
        )
        self.assertEqual(result["disposition"], "UPDATED")
        self.assertFalse(result["atomicCas"])
        self.assertEqual(result["previousCategory"]["id"], "CAT_A")
        self.assertEqual(result["category"]["id"], "CAT_B")
        self.assertEqual(transport.calls[2][0], DISCUSSION_UPDATE_MUTATION)
        self.assertEqual(transport.calls[2][1]["input"], {
            "discussionId": "DISC_1",
            "categoryId": "CAT_B",
        })

    def test_move_readback_semantic_drift_is_uncertain(self):
        before = discussion(category=CATEGORY_A)
        response = discussion(category=CATEGORY_B, updated_at="2026-10-10T00:00:03Z")
        raced = discussion(
            category=CATEGORY_B,
            title="changed concurrently",
            updated_at="2026-10-10T00:00:04Z",
        )
        transport = FakeTransport([
            categories_payload(),
            get_payload(before),
            mutation_payload(response),
            get_payload(raced),
        ])
        result = DiscussionService(transport).discussion_move_guarded(
            3411,
            "DISC_1",
            "2026-10-09T05:47:15Z",
            "CAT_B",
        )
        self.assertEqual(result["disposition"], "MUTATION_UNCERTAIN")
        self.assertEqual(result["reasonCode"], "POSTWRITE_READBACK_MISMATCH")


if __name__ == "__main__":
    unittest.main()
