from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 512
SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")


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


def _bool(value: object, *, optional: bool = False) -> bool | None:
    if value is None and optional:
        return None
    if not isinstance(value, bool):
        raise ValueError("invalid boolean")
    return value


def _sha(value: object) -> str:
    text = _text(value, required=True)
    assert text is not None
    if not SHA_RE.fullmatch(text):
        raise ValueError("invalid commit sha")
    return text.lower()


def _project_release(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _positive_int(item.get("id")),
        "tag_name": _text(item.get("tag_name"), required=True),
        "target_commitish": _text(item.get("target_commitish"), required=True),
        "name": _text(item.get("name")),
        "draft": _bool(item.get("draft")),
        "prerelease": _bool(item.get("prerelease")),
        "immutable": _bool(item.get("immutable"), optional=True),
        "created_at": _text(item.get("created_at"), required=True),
        "published_at": _text(item.get("published_at")),
    }


def _project_tag(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": _text(item.get("name"), required=True),
        "sha": _sha(item.get("sha")),
    }


def _project_asset(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _positive_int(item.get("id")),
        "name": _text(item.get("name"), required=True),
        "state": _text(item.get("state"), required=True),
        "content_type": _text(item.get("content_type"), required=True),
        "size": _non_negative_int(item.get("size")),
        "digest": _text(item.get("digest")),
        "download_count": _non_negative_int(item.get("download_count")),
        "created_at": _text(item.get("created_at"), required=True),
        "updated_at": _text(item.get("updated_at"), required=True),
    }


def _safe_limit(limit: object) -> int | None:
    return limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None


def _safe_release_id(release_id: object) -> int | None:
    return release_id if isinstance(release_id, int) and not isinstance(release_id, bool) and release_id > 0 else None


def _reason_for_error(exc: GitHubReadError) -> str:
    if exc.status_code == 403:
        return "HTTP_403"
    if exc.status_code == 404:
        return "RESOURCE_NOT_FOUND"
    if exc.status_code is not None and 500 <= exc.status_code <= 599:
        return "GITHUB_SERVER_ERROR"
    if exc.status_code is not None:
        return "GITHUB_HTTP_ERROR"
    return "GITHUB_READ_ERROR"


def _result(
    *, schema: str, key: str, items: list[dict[str, Any]], limit: int | None,
    ok: bool, reason_code: str | None, http_status: int | None,
    release_id: int | None = None,
) -> dict[str, Any]:
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
    }
    if schema == "repo-release-assets.v1":
        result["release_id"] = release_id
    return result


def repo_releases(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = _safe_limit(limit)
    if safe_limit is None:
        return _result(schema="repo-releases.v1", key="releases", items=[], limit=None, ok=False, reason_code="INVALID_LIMIT", http_status=None)
    try:
        items = [_project_release(item) for item in reader.list_repository_releases(limit=safe_limit)]
        return _result(schema="repo-releases.v1", key="releases", items=items, limit=safe_limit, ok=True, reason_code=None, http_status=200)
    except GitHubReadError as exc:
        return _result(schema="repo-releases.v1", key="releases", items=[], limit=safe_limit, ok=False, reason_code=_reason_for_error(exc), http_status=exc.status_code)
    except ValueError:
        return _result(schema="repo-releases.v1", key="releases", items=[], limit=safe_limit, ok=False, reason_code="MALFORMED_EVIDENCE", http_status=None)


def repo_tags(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = _safe_limit(limit)
    if safe_limit is None:
        return _result(schema="repo-tags.v1", key="tags", items=[], limit=None, ok=False, reason_code="INVALID_LIMIT", http_status=None)
    try:
        items = [_project_tag(item) for item in reader.list_repository_tags(limit=safe_limit)]
        return _result(schema="repo-tags.v1", key="tags", items=items, limit=safe_limit, ok=True, reason_code=None, http_status=200)
    except GitHubReadError as exc:
        return _result(schema="repo-tags.v1", key="tags", items=[], limit=safe_limit, ok=False, reason_code=_reason_for_error(exc), http_status=exc.status_code)
    except ValueError:
        return _result(schema="repo-tags.v1", key="tags", items=[], limit=safe_limit, ok=False, reason_code="MALFORMED_EVIDENCE", http_status=None)


def repo_release_assets(reader: GitHubReader, release_id: int, limit: int = 20) -> dict[str, Any]:
    safe_id = _safe_release_id(release_id)
    safe_limit = _safe_limit(limit)
    if safe_id is None:
        return _result(schema="repo-release-assets.v1", key="assets", items=[], limit=safe_limit, release_id=None, ok=False, reason_code="INVALID_RELEASE_ID", http_status=None)
    if safe_limit is None:
        return _result(schema="repo-release-assets.v1", key="assets", items=[], limit=None, release_id=safe_id, ok=False, reason_code="INVALID_LIMIT", http_status=None)
    try:
        items = [_project_asset(item) for item in reader.list_release_assets(safe_id, limit=safe_limit)]
        return _result(schema="repo-release-assets.v1", key="assets", items=items, limit=safe_limit, release_id=safe_id, ok=True, reason_code=None, http_status=200)
    except GitHubReadError as exc:
        return _result(schema="repo-release-assets.v1", key="assets", items=[], limit=safe_limit, release_id=safe_id, ok=False, reason_code=_reason_for_error(exc), http_status=exc.status_code)
    except ValueError:
        return _result(schema="repo-release-assets.v1", key="assets", items=[], limit=safe_limit, release_id=safe_id, ok=False, reason_code="MALFORMED_EVIDENCE", http_status=None)
