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


def _project_variable(item: dict[str, Any]) -> dict[str, str | None]:
    return {
        "name": _text(item.get("name"), required=True),
        "created_at": _text(item.get("created_at")),
        "updated_at": _text(item.get("updated_at")),
    }


def repo_variable_metadata(reader: GitHubReader) -> dict[str, Any]:
    try:
        variables = [_project_variable(item) for item in reader.list_actions_variable_metadata()]
        return {
            "schema": "repo-variable-metadata.v1",
            "ok": True,
            "status": "OK",
            "count": len(variables),
            "variables": variables,
            "values_exposed": False,
            "configuration_authority": False,
            "production_authority": False,
        }
    except (GitHubReadError, ValueError):
        return {
            "schema": "repo-variable-metadata.v1",
            "ok": False,
            "status": "UNKNOWN",
            "count": None,
            "variables": [],
            "values_exposed": False,
            "configuration_authority": False,
            "production_authority": False,
        }
