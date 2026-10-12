from __future__ import annotations

from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 256
MAX_PATH = 4096
VALID_STATES = {"open", "dismissed"}


def _text(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value or len(value) > MAX_TEXT:
        raise ValueError("invalid bounded text")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _path(value: object) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_PATH:
        raise ValueError("invalid repository path")
    if value.startswith("/") or chr(92) in value or any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid repository path")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValueError("invalid repository path")
    return value


def _positive_int(value: object, *, required: bool = False) -> int | None:
    if value is None and not required:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError("invalid positive integer")
    return value


def _project_finding(item: dict[str, Any]) -> dict[str, Any]:
    state = _text(item.get("state"), required=True)
    if state not in VALID_STATES:
        raise ValueError("invalid code quality state")
    return {
        "number": _positive_int(item.get("number"), required=True),
        "state": state,
        "rule_id": _text(item.get("rule_id"), required=True),
        "severity": _text(item.get("severity")),
        "category": _text(item.get("category")),
        "path": _path(item.get("path")),
        "start_line": _positive_int(item.get("start_line")),
        "start_column": _positive_int(item.get("start_column")),
        "end_line": _positive_int(item.get("end_line")),
        "end_column": _positive_int(item.get("end_column")),
        "created_at": _text(item.get("created_at"), required=True),
    }


def _reason_for_error(exc: GitHubReadError) -> str:
    if exc.status_code == 403:
        return "HTTP_403"
    if exc.status_code == 404:
        return "RESOURCE_NOT_FOUND"
    if exc.status_code == 503:
        return "SERVICE_UNAVAILABLE"
    if exc.status_code is not None:
        return "GITHUB_HTTP_ERROR"
    return "GITHUB_READ_ERROR"


def _unknown(limit: int | None, *, http_status: int | None, reason_code: str) -> dict[str, Any]:
    return {
        "schema": "repo-code-quality.v1",
        "ok": False,
        "status": "UNKNOWN",
        "scope": "first_page",
        "ordering": "server_desc",
        "limit": limit,
        "count": None,
        "total_count": None,
        "findings": [],
        "http_status": http_status,
        "reason_code": reason_code,
        "ci_authority": False,
        "required_authority": False,
        "release_authority": False,
        "production_authority": False,
    }


def repo_code_quality(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None
    if safe_limit is None:
        return _unknown(None, http_status=None, reason_code="INVALID_LIMIT")
    try:
        findings = [_project_finding(item) for item in reader.list_code_quality_findings(limit=safe_limit)]
        return {
            "schema": "repo-code-quality.v1",
            "ok": True,
            "status": "OK",
            "scope": "first_page",
            "ordering": "server_desc",
            "limit": safe_limit,
            "count": len(findings),
            "total_count": None,
            "findings": findings,
            "http_status": 200,
            "reason_code": None,
            "ci_authority": False,
            "required_authority": False,
            "release_authority": False,
            "production_authority": False,
        }
    except GitHubReadError as exc:
        return _unknown(
            safe_limit,
            http_status=exc.status_code,
            reason_code=_reason_for_error(exc),
        )
    except ValueError:
        return _unknown(
            safe_limit,
            http_status=None,
            reason_code="MALFORMED_EVIDENCE",
        )
