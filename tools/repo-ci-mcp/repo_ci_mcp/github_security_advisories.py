from __future__ import annotations

from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 256


def _text(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value or len(value) > MAX_TEXT:
        raise ValueError("invalid bounded text")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _project_advisory(item: dict[str, Any]) -> dict[str, str | None]:
    return {
        "ghsa_id": _text(item.get("ghsa_id"), required=True),
        "cve_id": _text(item.get("cve_id")),
        "state": _text(item.get("state"), required=True),
        "severity": _text(item.get("severity")),
        "published_at": _text(item.get("published_at")),
        "updated_at": _text(item.get("updated_at")),
        "closed_at": _text(item.get("closed_at")),
        "withdrawn_at": _text(item.get("withdrawn_at")),
    }


def repo_security_advisories(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None
    if safe_limit is None:
        return {
            "schema": "repo-security-advisories.v1",
            "ok": False,
            "status": "UNKNOWN",
            "scope": "recent",
            "limit": None,
            "count": None,
            "total_count": None,
            "advisories": [],
            "production_authority": False,
        }
    try:
        advisories = [_project_advisory(item) for item in reader.list_security_advisories(limit=safe_limit)]
        return {
            "schema": "repo-security-advisories.v1",
            "ok": True,
            "status": "OK",
            "scope": "recent",
            "limit": safe_limit,
            "count": len(advisories),
            "total_count": None,
            "advisories": advisories,
            "production_authority": False,
        }
    except (GitHubReadError, ValueError):
        return {
            "schema": "repo-security-advisories.v1",
            "ok": False,
            "status": "UNKNOWN",
            "scope": "recent",
            "limit": safe_limit,
            "count": None,
            "total_count": None,
            "advisories": [],
            "production_authority": False,
        }
