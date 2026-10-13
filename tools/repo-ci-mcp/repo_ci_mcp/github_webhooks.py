from __future__ import annotations

import math
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 512
MAX_EVENTS = 100


def _text(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or (required and not value) or len(value) > MAX_TEXT:
        raise ValueError("invalid bounded text")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _positive_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError("invalid positive integer")
    return value


def _non_negative_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("invalid non-negative integer")
    return value


def _bool(value: object) -> bool:
    if not isinstance(value, bool):
        raise ValueError("invalid boolean")
    return value


def _duration(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("invalid duration")
    result = float(value)
    if result < 0 or not math.isfinite(result):
        raise ValueError("invalid duration")
    return result


def _events(value: object) -> list[str]:
    if not isinstance(value, list) or len(value) > MAX_EVENTS:
        raise ValueError("invalid event list")
    result: list[str] = []
    for item in value:
        text = _text(item, required=True)
        assert text is not None
        result.append(text)
    return result


def _last_response(value: object) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("invalid last_response")
    code = value.get("code")
    return {
        "code": None if code is None else _non_negative_int(code),
        "status": _text(value.get("status")),
    }


def _project_hook(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _positive_int(item.get("id")),
        "name": _text(item.get("name"), required=True),
        "active": _bool(item.get("active")),
        "events": _events(item.get("events")),
        "created_at": _text(item.get("created_at"), required=True),
        "updated_at": _text(item.get("updated_at"), required=True),
        "last_response": _last_response(item.get("last_response")),
    }


def _project_delivery(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _positive_int(item.get("id")),
        "delivered_at": _text(item.get("delivered_at"), required=True),
        "redelivery": _bool(item.get("redelivery")),
        "duration": _duration(item.get("duration")),
        "status": _text(item.get("status"), required=True),
        "status_code": _non_negative_int(item.get("status_code")),
        "event": _text(item.get("event"), required=True),
        "action": _text(item.get("action")),
        "throttled_at": _text(item.get("throttled_at")),
    }


def _safe_limit(limit: object) -> int | None:
    return limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None


def _safe_hook_id(hook_id: object) -> int | None:
    return hook_id if isinstance(hook_id, int) and not isinstance(hook_id, bool) and hook_id > 0 else None


def _reason_for_error(exc: GitHubReadError) -> str:
    if exc.status_code == 400:
        return "HTTP_400"
    if exc.status_code == 403:
        return "HTTP_403"
    if exc.status_code == 404:
        return "RESOURCE_NOT_FOUND"
    if exc.status_code == 422:
        return "HTTP_422"
    if exc.status_code is not None and 500 <= exc.status_code <= 599:
        return "GITHUB_SERVER_ERROR"
    if exc.status_code is not None:
        return "GITHUB_HTTP_ERROR"
    return "GITHUB_READ_ERROR"


def _result(*, schema: str, key: str, items: list[dict[str, Any]], limit: int | None,
            ok: bool, reason_code: str | None, http_status: int | None,
            hook_id: int | None = None) -> dict[str, Any]:
    result = {
        "schema": schema,
        "ok": ok,
        "status": "OK" if ok else "UNKNOWN",
        "scope": "first_page",
        "ordering": "server_default",
        "limit": limit,
        "count": len(items) if ok else None,
        "total_count": None,
        key: items,
        "http_status": http_status,
        "reason_code": reason_code,
        "ci_authority": False,
        "required_authority": False,
        "release_authority": False,
        "production_authority": False,
        "deployment_authority": False,
        "notification_authority": False,
        "delivery_success_authority": False,
    }
    if schema == "repo-webhook-deliveries.v1":
        result["hook_id"] = hook_id
    return result


def repo_webhooks(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = _safe_limit(limit)
    if safe_limit is None:
        return _result(schema="repo-webhooks.v1", key="webhooks", items=[], limit=None,
                       ok=False, reason_code="INVALID_LIMIT", http_status=None)
    try:
        items = [_project_hook(item) for item in reader.list_repository_webhooks(limit=safe_limit)]
        return _result(schema="repo-webhooks.v1", key="webhooks", items=items, limit=safe_limit,
                       ok=True, reason_code=None, http_status=200)
    except GitHubReadError as exc:
        return _result(schema="repo-webhooks.v1", key="webhooks", items=[], limit=safe_limit,
                       ok=False, reason_code=_reason_for_error(exc), http_status=exc.status_code)
    except ValueError:
        return _result(schema="repo-webhooks.v1", key="webhooks", items=[], limit=safe_limit,
                       ok=False, reason_code="MALFORMED_EVIDENCE", http_status=None)


def repo_webhook_deliveries(reader: GitHubReader, hook_id: int, limit: int = 20) -> dict[str, Any]:
    safe_id = _safe_hook_id(hook_id)
    safe_limit = _safe_limit(limit)
    if safe_id is None:
        return _result(schema="repo-webhook-deliveries.v1", key="deliveries", items=[],
                       limit=safe_limit, hook_id=None, ok=False,
                       reason_code="INVALID_HOOK_ID", http_status=None)
    if safe_limit is None:
        return _result(schema="repo-webhook-deliveries.v1", key="deliveries", items=[],
                       limit=None, hook_id=safe_id, ok=False,
                       reason_code="INVALID_LIMIT", http_status=None)
    try:
        items = [_project_delivery(item) for item in reader.list_webhook_deliveries(safe_id, limit=safe_limit)]
        return _result(schema="repo-webhook-deliveries.v1", key="deliveries", items=items,
                       limit=safe_limit, hook_id=safe_id, ok=True, reason_code=None, http_status=200)
    except GitHubReadError as exc:
        return _result(schema="repo-webhook-deliveries.v1", key="deliveries", items=[],
                       limit=safe_limit, hook_id=safe_id, ok=False,
                       reason_code=_reason_for_error(exc), http_status=exc.status_code)
    except ValueError:
        return _result(schema="repo-webhook-deliveries.v1", key="deliveries", items=[],
                       limit=safe_limit, hook_id=safe_id, ok=False,
                       reason_code="MALFORMED_EVIDENCE", http_status=None)
