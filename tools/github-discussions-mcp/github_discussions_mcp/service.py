from __future__ import annotations

import hashlib
from typing import Any, Protocol

from .graphql import (
    CATEGORIES_QUERY,
    DISCUSSION_GET_QUERY,
    DISCUSSIONS_LIST_QUERY,
    DISCUSSION_UPDATE_MUTATION,
    REPOSITORY_FULL_NAME,
    REPOSITORY_NAME,
    REPOSITORY_OWNER,
)
from .transport import (
    DedicatedCredentialUnavailable,
    GitHubGraphQLTransportError,
)

MODE = "GITHUB_DISCUSSIONS_CONNECTOR_V1"
MAX_LIST_LIMIT = 50
MAX_CURSOR_BYTES = 2048
MAX_NODE_ID_BYTES = 256
MAX_TIMESTAMP_BYTES = 96
MAX_TITLE_BYTES = 1024
MAX_BODY_BYTES = 128 * 1024
CURRENTNESS_CONTRACT = "EXACT_PRE_READ_PLUS_POST_WRITE_VERIFICATION_NON_ATOMIC"


class GraphQLTransport(Protocol):
    def execute(self, document: str, variables: dict[str, Any]) -> dict[str, Any]:
        ...


class ConnectorError(RuntimeError):
    def __init__(self, disposition: str, reason_code: str) -> None:
        super().__init__(reason_code)
        self.disposition = disposition
        self.reason_code = reason_code


def _base(operation: str, disposition: str, reason_code: str | None = None, **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "mode": MODE,
        "operation": operation,
        "repository": REPOSITORY_FULL_NAME,
        "disposition": disposition,
        "reasonCode": reason_code,
        **extra,
    }


def _bounded_text(value: Any, *, field: str, max_bytes: int, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ConnectorError("UNKNOWN", f"{field.upper()}_INVALID")
    if not allow_empty and not value:
        raise ConnectorError("UNKNOWN", f"{field.upper()}_INVALID")
    if len(value.encode("utf-8")) > max_bytes:
        raise ConnectorError("UNKNOWN", f"{field.upper()}_BOUND_EXCEEDED")
    return value


def _positive_number(value: Any) -> int:
    if type(value) is not int or value <= 0:
        raise ConnectorError("UNKNOWN", "DISCUSSION_NUMBER_INVALID")
    return value


def _page_info(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ConnectorError("UNKNOWN", "PAGE_INFO_INVALID")
    has_next = value.get("hasNextPage")
    end_cursor = value.get("endCursor")
    if not isinstance(has_next, bool):
        raise ConnectorError("UNKNOWN", "PAGE_INFO_INVALID")
    if end_cursor is not None and not isinstance(end_cursor, str):
        raise ConnectorError("UNKNOWN", "PAGE_INFO_INVALID")
    return {"hasNextPage": has_next, "endCursor": end_cursor}


def _category(node: Any) -> dict[str, Any]:
    if not isinstance(node, dict):
        raise ConnectorError("UNKNOWN", "CATEGORY_INVALID")
    category_id = _bounded_text(node.get("id"), field="category_id", max_bytes=MAX_NODE_ID_BYTES)
    name = _bounded_text(node.get("name"), field="category_name", max_bytes=MAX_TITLE_BYTES)
    slug = _bounded_text(node.get("slug"), field="category_slug", max_bytes=MAX_TITLE_BYTES)
    description = node.get("description")
    if description is not None and not isinstance(description, str):
        raise ConnectorError("UNKNOWN", "CATEGORY_DESCRIPTION_INVALID")
    is_answerable = node.get("isAnswerable")
    if not isinstance(is_answerable, bool):
        raise ConnectorError("UNKNOWN", "CATEGORY_IS_ANSWERABLE_INVALID")
    created_at = _bounded_text(node.get("createdAt"), field="category_created_at", max_bytes=MAX_TIMESTAMP_BYTES)
    updated_at = _bounded_text(node.get("updatedAt"), field="category_updated_at", max_bytes=MAX_TIMESTAMP_BYTES)
    return {
        "id": category_id,
        "name": name,
        "slug": slug,
        "description": description,
        "isAnswerable": is_answerable,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }


def _discussion(node: Any, *, include_body: bool) -> dict[str, Any]:
    if not isinstance(node, dict):
        raise ConnectorError("UNKNOWN", "DISCUSSION_INVALID")
    discussion_id = _bounded_text(node.get("id"), field="discussion_id", max_bytes=MAX_NODE_ID_BYTES)
    number = _positive_number(node.get("number"))
    title = _bounded_text(node.get("title"), field="title", max_bytes=MAX_TITLE_BYTES)
    updated_at = _bounded_text(node.get("updatedAt"), field="updated_at", max_bytes=MAX_TIMESTAMP_BYTES)
    closed = node.get("closed")
    viewer_can_update = node.get("viewerCanUpdate")
    url = node.get("url")
    if not isinstance(closed, bool):
        raise ConnectorError("UNKNOWN", "DISCUSSION_CLOSED_INVALID")
    if not isinstance(viewer_can_update, bool):
        raise ConnectorError("UNKNOWN", "DISCUSSION_VIEWER_CAPABILITY_INVALID")
    if not isinstance(url, str) or not url.startswith("https://github.com/"):
        raise ConnectorError("UNKNOWN", "DISCUSSION_SOURCE_LOCATOR_INVALID")
    raw_category = node.get("category")
    if not isinstance(raw_category, dict):
        raise ConnectorError("UNKNOWN", "DISCUSSION_CATEGORY_INVALID")
    category_id = _bounded_text(raw_category.get("id"), field="category_id", max_bytes=MAX_NODE_ID_BYTES)
    category_name = _bounded_text(raw_category.get("name"), field="category_name", max_bytes=MAX_TITLE_BYTES)
    category_slug = _bounded_text(raw_category.get("slug"), field="category_slug", max_bytes=MAX_TITLE_BYTES)
    result = {
        "id": discussion_id,
        "number": number,
        "title": title,
        "updatedAt": updated_at,
        "closed": closed,
        "viewerCanUpdate": viewer_can_update,
        "category": {
            "id": category_id,
            "name": category_name,
            "slug": category_slug,
        },
        "sourceLocator": url,
    }
    if include_body:
        body = node.get("body")
        if not isinstance(body, str):
            raise ConnectorError("UNKNOWN", "DISCUSSION_BODY_INVALID")
        body_bytes = body.encode("utf-8")
        if len(body_bytes) > MAX_BODY_BYTES:
            raise ConnectorError("UNKNOWN", "DISCUSSION_BODY_BOUND_EXCEEDED")
        result["body"] = body
    return result


def _body_identity(body: str) -> dict[str, Any]:
    raw = body.encode("utf-8")
    return {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
    }


class DiscussionService:
    def __init__(self, transport: GraphQLTransport) -> None:
        self.transport = transport

    @staticmethod
    def _repo_vars() -> dict[str, Any]:
        return {"owner": REPOSITORY_OWNER, "name": REPOSITORY_NAME}

    def _execute_read(self, document: str, variables: dict[str, Any]) -> dict[str, Any]:
        try:
            return self.transport.execute(document, variables)
        except DedicatedCredentialUnavailable as exc:
            raise ConnectorError("BLOCKED_CAPABILITY", "DEDICATED_DISCUSSIONS_CREDENTIAL_UNAVAILABLE") from exc
        except GitHubGraphQLTransportError as exc:
            raise ConnectorError("UNKNOWN", exc.reason_code) from exc

    def _repository(self, data: Any) -> dict[str, Any]:
        repository = data.get("repository") if isinstance(data, dict) else None
        if not isinstance(repository, dict):
            raise ConnectorError("UNKNOWN", "REPOSITORY_EVIDENCE_MISSING")
        enabled = repository.get("hasDiscussionsEnabled")
        if enabled is not True:
            if enabled is False:
                raise ConnectorError("BLOCKED_CAPABILITY", "DISCUSSIONS_DISABLED")
            raise ConnectorError("UNKNOWN", "DISCUSSIONS_ENABLEMENT_UNKNOWN")
        repo_id = repository.get("id")
        if not isinstance(repo_id, str) or not repo_id:
            raise ConnectorError("UNKNOWN", "REPOSITORY_ID_MISSING")
        return repository

    def _fetch_categories(self) -> tuple[str, list[dict[str, Any]], dict[str, Any]]:
        data = self._execute_read(CATEGORIES_QUERY, self._repo_vars())
        repository = self._repository(data)
        connection = repository.get("discussionCategories")
        if not isinstance(connection, dict):
            raise ConnectorError("UNKNOWN", "CATEGORY_CONNECTION_INVALID")
        nodes = connection.get("nodes")
        if not isinstance(nodes, list):
            raise ConnectorError("UNKNOWN", "CATEGORY_NODES_INVALID")
        page = _page_info(connection.get("pageInfo"))
        if page["hasNextPage"]:
            raise ConnectorError("UNKNOWN", "CATEGORY_PAGE_BOUND_EXCEEDED")
        categories = [_category(node) for node in nodes]
        return str(repository["id"]), categories, page

    def _fetch_discussion(self, number: int) -> tuple[str, dict[str, Any]]:
        data = self._execute_read(
            DISCUSSION_GET_QUERY,
            {**self._repo_vars(), "number": number},
        )
        repository = self._repository(data)
        node = repository.get("discussion")
        if node is None:
            raise ConnectorError("UNKNOWN", "DISCUSSION_NOT_FOUND")
        return str(repository["id"]), _discussion(node, include_body=True)

    def discussion_categories(self) -> dict[str, Any]:
        operation = "discussion_categories"
        try:
            repository_id, categories, page = self._fetch_categories()
            return _base(
                operation,
                "PASS",
                repositoryId=repository_id,
                categories=categories,
                count=len(categories),
                pageInfo=page,
            )
        except ConnectorError as exc:
            return _base(operation, exc.disposition, exc.reason_code)

    def discussion_list(self, limit: int = 20, cursor: str | None = None) -> dict[str, Any]:
        operation = "discussion_list"
        try:
            if type(limit) is not int or limit < 1 or limit > MAX_LIST_LIMIT:
                raise ConnectorError("UNKNOWN", "LIST_LIMIT_INVALID")
            if cursor is not None:
                cursor = _bounded_text(cursor, field="cursor", max_bytes=MAX_CURSOR_BYTES)
            data = self._execute_read(
                DISCUSSIONS_LIST_QUERY,
                {**self._repo_vars(), "first": limit, "after": cursor},
            )
            repository = self._repository(data)
            connection = repository.get("discussions")
            if not isinstance(connection, dict):
                raise ConnectorError("UNKNOWN", "DISCUSSION_CONNECTION_INVALID")
            nodes = connection.get("nodes")
            if not isinstance(nodes, list):
                raise ConnectorError("UNKNOWN", "DISCUSSION_NODES_INVALID")
            page = _page_info(connection.get("pageInfo"))
            discussions = [_discussion(node, include_body=False) for node in nodes]
            return _base(
                operation,
                "PASS",
                repositoryId=str(repository["id"]),
                discussions=discussions,
                count=len(discussions),
                pageInfo=page,
            )
        except ConnectorError as exc:
            return _base(operation, exc.disposition, exc.reason_code)

    def discussion_get(self, number: int) -> dict[str, Any]:
        operation = "discussion_get"
        try:
            number = _positive_number(number)
            repository_id, discussion = self._fetch_discussion(number)
            return _base(
                operation,
                "PASS",
                repositoryId=repository_id,
                discussion=discussion,
            )
        except ConnectorError as exc:
            return _base(operation, exc.disposition, exc.reason_code)

    @staticmethod
    def _validate_mutation_identity(
        number: Any,
        node_id: Any,
        expected_updated_at: Any,
    ) -> tuple[int, str, str]:
        return (
            _positive_number(number),
            _bounded_text(node_id, field="discussion_id", max_bytes=MAX_NODE_ID_BYTES),
            _bounded_text(expected_updated_at, field="expected_updated_at", max_bytes=MAX_TIMESTAMP_BYTES),
        )

    @staticmethod
    def _mutation_base(
        operation: str,
        disposition: str,
        reason_code: str | None,
        *,
        mutation_attempted: bool,
        mutation_may_have_occurred: bool,
        **extra: Any,
    ) -> dict[str, Any]:
        return _base(
            operation,
            disposition,
            reason_code,
            atomicCas=False,
            currentnessContract=CURRENTNESS_CONTRACT,
            mutationAttempted=mutation_attempted,
            mutationMayHaveOccurred=mutation_may_have_occurred,
            **extra,
        )

    @staticmethod
    def _precondition_result(
        operation: str,
        *,
        number: int,
        node_id: str,
        expected_updated_at: str,
        observed: dict[str, Any],
    ) -> dict[str, Any] | None:
        if observed["id"] != node_id or observed["number"] != number:
            return DiscussionService._mutation_base(
                operation,
                "STALE_PRECONDITION",
                "DISCUSSION_IDENTITY_MISMATCH",
                mutation_attempted=False,
                mutation_may_have_occurred=False,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed["updatedAt"],
            )
        if observed["updatedAt"] != expected_updated_at:
            return DiscussionService._mutation_base(
                operation,
                "STALE_PRECONDITION",
                "UPDATED_AT_MISMATCH",
                mutation_attempted=False,
                mutation_may_have_occurred=False,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed["updatedAt"],
            )
        if observed["viewerCanUpdate"] is not True:
            return DiscussionService._mutation_base(
                operation,
                "BLOCKED_CAPABILITY",
                "VIEWER_CANNOT_UPDATE",
                mutation_attempted=False,
                mutation_may_have_occurred=False,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed["updatedAt"],
            )
        return None

    def _execute_update_mutation(
        self,
        operation: str,
        mutation_input: dict[str, Any],
        *,
        number: int,
        node_id: str,
        expected_updated_at: str,
        observed_pre: dict[str, Any],
        mutation_fields: list[str],
    ) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        try:
            data = self.transport.execute(
                DISCUSSION_UPDATE_MUTATION,
                {"input": mutation_input},
            )
        except DedicatedCredentialUnavailable:
            return None, self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                "CREDENTIAL_LOST_DURING_MUTATION",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationFields=mutation_fields,
            )
        except GitHubGraphQLTransportError as exc:
            return None, self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                exc.reason_code,
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationFields=mutation_fields,
            )

        update = data.get("updateDiscussion") if isinstance(data, dict) else None
        response_node = update.get("discussion") if isinstance(update, dict) else None
        try:
            response_discussion = _discussion(response_node, include_body=True)
        except ConnectorError:
            return None, self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                "MUTATION_RESPONSE_INVALID",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationFields=mutation_fields,
            )
        if response_discussion["id"] != node_id or response_discussion["number"] != number:
            return None, self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                "MUTATION_RESPONSE_IDENTITY_MISMATCH",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationFields=mutation_fields,
            )
        return response_discussion, None

    def discussion_update_guarded(
        self,
        number: int,
        node_id: str,
        expected_updated_at: str,
        *,
        title: str | None = None,
        body: str | None = None,
    ) -> dict[str, Any]:
        operation = "discussion_update_guarded"
        try:
            number, node_id, expected_updated_at = self._validate_mutation_identity(
                number, node_id, expected_updated_at
            )
            if title is None and body is None:
                raise ConnectorError("UNKNOWN", "UPDATE_FIELDS_REQUIRED")
            if title is not None:
                title = _bounded_text(title, field="title", max_bytes=MAX_TITLE_BYTES)
            if body is not None:
                body = _bounded_text(
                    body,
                    field="body",
                    max_bytes=MAX_BODY_BYTES,
                    allow_empty=True,
                )
            _, observed_pre = self._fetch_discussion(number)
        except ConnectorError as exc:
            return self._mutation_base(
                operation,
                exc.disposition,
                exc.reason_code,
                mutation_attempted=False,
                mutation_may_have_occurred=False,
            )

        precondition = self._precondition_result(
            operation,
            number=number,
            node_id=node_id,
            expected_updated_at=expected_updated_at,
            observed=observed_pre,
        )
        if precondition:
            return precondition

        mutation_input: dict[str, Any] = {"discussionId": node_id}
        mutation_fields: list[str] = []
        if title is not None:
            mutation_input["title"] = title
            mutation_fields.append("title")
        if body is not None:
            mutation_input["body"] = body
            mutation_fields.append("body")

        response_discussion, uncertain = self._execute_update_mutation(
            operation,
            mutation_input,
            number=number,
            node_id=node_id,
            expected_updated_at=expected_updated_at,
            observed_pre=observed_pre,
            mutation_fields=mutation_fields,
        )
        if uncertain:
            return uncertain

        try:
            _, observed_post = self._fetch_discussion(number)
        except ConnectorError as exc:
            return self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                f"POSTWRITE_{exc.reason_code}",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationResponseUpdatedAt=response_discussion["updatedAt"] if response_discussion else None,
                mutationFields=mutation_fields,
            )

        expected_match = (
            observed_post["id"] == node_id
            and observed_post["number"] == number
            and observed_post["category"]["id"] == observed_pre["category"]["id"]
            and (title is None or observed_post["title"] == title)
            and (body is None or observed_post["body"] == body)
        )
        if not expected_match:
            return self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                "POSTWRITE_READBACK_MISMATCH",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                postWriteUpdatedAt=observed_post["updatedAt"],
                mutationFields=mutation_fields,
            )

        return self._mutation_base(
            operation,
            "UPDATED",
            None,
            mutation_attempted=True,
            mutation_may_have_occurred=False,
            discussionNumber=number,
            discussionId=node_id,
            expectedUpdatedAt=expected_updated_at,
            observedPreWriteUpdatedAt=observed_pre["updatedAt"],
            mutationResponseUpdatedAt=response_discussion["updatedAt"] if response_discussion else None,
            postWriteUpdatedAt=observed_post["updatedAt"],
            mutationFields=mutation_fields,
            title=observed_post["title"] if title is not None else None,
            bodyIdentity=_body_identity(observed_post["body"]) if body is not None else None,
            category=observed_post["category"],
            sourceLocator=observed_post["sourceLocator"],
        )

    def discussion_move_guarded(
        self,
        number: int,
        node_id: str,
        expected_updated_at: str,
        target_category_id: str,
    ) -> dict[str, Any]:
        operation = "discussion_move_guarded"
        try:
            number, node_id, expected_updated_at = self._validate_mutation_identity(
                number, node_id, expected_updated_at
            )
            target_category_id = _bounded_text(
                target_category_id,
                field="target_category_id",
                max_bytes=MAX_NODE_ID_BYTES,
            )
            _, categories, _ = self._fetch_categories()
            target = next(
                (category for category in categories if category["id"] == target_category_id),
                None,
            )
            if target is None:
                return self._mutation_base(
                    operation,
                    "BLOCKED_CAPABILITY",
                    "TARGET_CATEGORY_NOT_FOUND",
                    mutation_attempted=False,
                    mutation_may_have_occurred=False,
                    discussionNumber=number,
                    discussionId=node_id,
                    expectedUpdatedAt=expected_updated_at,
                    targetCategoryId=target_category_id,
                )
            _, observed_pre = self._fetch_discussion(number)
        except ConnectorError as exc:
            return self._mutation_base(
                operation,
                exc.disposition,
                exc.reason_code,
                mutation_attempted=False,
                mutation_may_have_occurred=False,
            )

        precondition = self._precondition_result(
            operation,
            number=number,
            node_id=node_id,
            expected_updated_at=expected_updated_at,
            observed=observed_pre,
        )
        if precondition:
            return {
                **precondition,
                "targetCategoryId": target_category_id,
            }

        response_discussion, uncertain = self._execute_update_mutation(
            operation,
            {
                "discussionId": node_id,
                "categoryId": target_category_id,
            },
            number=number,
            node_id=node_id,
            expected_updated_at=expected_updated_at,
            observed_pre=observed_pre,
            mutation_fields=["categoryId"],
        )
        if uncertain:
            return {
                **uncertain,
                "targetCategoryId": target_category_id,
            }

        try:
            _, observed_post = self._fetch_discussion(number)
        except ConnectorError as exc:
            return self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                f"POSTWRITE_{exc.reason_code}",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                mutationResponseUpdatedAt=response_discussion["updatedAt"] if response_discussion else None,
                mutationFields=["categoryId"],
                targetCategoryId=target_category_id,
            )

        expected_match = (
            observed_post["id"] == node_id
            and observed_post["number"] == number
            and observed_post["category"]["id"] == target_category_id
            and observed_post["title"] == observed_pre["title"]
            and observed_post["body"] == observed_pre["body"]
        )
        if not expected_match:
            return self._mutation_base(
                operation,
                "MUTATION_UNCERTAIN",
                "POSTWRITE_READBACK_MISMATCH",
                mutation_attempted=True,
                mutation_may_have_occurred=True,
                discussionNumber=number,
                discussionId=node_id,
                expectedUpdatedAt=expected_updated_at,
                observedPreWriteUpdatedAt=observed_pre["updatedAt"],
                postWriteUpdatedAt=observed_post["updatedAt"],
                mutationFields=["categoryId"],
                targetCategoryId=target_category_id,
            )

        return self._mutation_base(
            operation,
            "UPDATED",
            None,
            mutation_attempted=True,
            mutation_may_have_occurred=False,
            discussionNumber=number,
            discussionId=node_id,
            expectedUpdatedAt=expected_updated_at,
            observedPreWriteUpdatedAt=observed_pre["updatedAt"],
            mutationResponseUpdatedAt=response_discussion["updatedAt"] if response_discussion else None,
            postWriteUpdatedAt=observed_post["updatedAt"],
            mutationFields=["categoryId"],
            previousCategory=observed_pre["category"],
            category=observed_post["category"],
            targetCategoryId=target_category_id,
            sourceLocator=observed_post["sourceLocator"],
        )
