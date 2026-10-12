from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 200
MAX_ENVIRONMENT_NAME = 255
DEPLOYMENT_STATES = {"error", "failure", "inactive", "in_progress", "queued", "pending", "success"}


def _text(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value or len(value) > MAX_TEXT:
        raise ValueError("invalid bounded text")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _environment_name(value: object, *, required: bool = False) -> str | None:
    if value is None and not required:
        return None
    if not isinstance(value, str) or not value or len(value) > MAX_ENVIRONMENT_NAME:
        raise ValueError("invalid environment name")
    if any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid environment name")
    return value


def _positive_integer(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError("invalid positive integer")
    return value


def _optional_bool(value: object) -> bool | None:
    if value is None:
        return None
    if not isinstance(value, bool):
        raise ValueError("invalid boolean")
    return value


def _sha(value: object) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-fA-F]{40}", value):
        raise ValueError("invalid deployment sha")
    return value.lower()


def _protection_summary(item: dict[str, Any]) -> tuple[int | None, list[str] | None]:
    if "protection_rules" not in item or item["protection_rules"] is None:
        return None, None
    rules = item["protection_rules"]
    if not isinstance(rules, list) or len(rules) > 100:
        raise ValueError("invalid protection rules")
    types: set[str] = set()
    for rule in rules:
        if not isinstance(rule, dict):
            raise ValueError("invalid protection rule")
        rule_type = _text(rule.get("type"), required=True)
        assert rule_type is not None
        types.add(rule_type)
    return len(rules), sorted(types)


def _branch_policy(item: dict[str, Any]) -> dict[str, bool | None] | None:
    value = item.get("deployment_branch_policy")
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError("invalid deployment branch policy")
    return {
        "protected_branches": _optional_bool(value.get("protected_branches")),
        "custom_branch_policies": _optional_bool(value.get("custom_branch_policies")),
    }


def _project_environment(item: dict[str, Any]) -> dict[str, Any]:
    count, types = _protection_summary(item)
    return {
        "id": _positive_integer(item.get("id")),
        "name": _environment_name(item.get("name"), required=True),
        "created_at": _text(item.get("created_at")),
        "updated_at": _text(item.get("updated_at")),
        "protection_rule_count": count,
        "protection_rule_types": types,
        "deployment_branch_policy": _branch_policy(item),
    }


def _project_deployment(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _positive_integer(item.get("id")),
        "ref": _text(item.get("ref"), required=True),
        "sha": _sha(item.get("sha")),
        "environment": _environment_name(item.get("environment"), required=True),
        "task": _text(item.get("task")),
        "transient_environment": _optional_bool(item.get("transient_environment")),
        "production_environment": _optional_bool(item.get("production_environment")),
        "created_at": _text(item.get("created_at")),
        "updated_at": _text(item.get("updated_at")),
    }


def _project_status(item: dict[str, Any]) -> dict[str, Any]:
    state = _text(item.get("state"), required=True)
    if state not in DEPLOYMENT_STATES:
        raise ValueError("unsupported deployment state")
    return {
        "id": _positive_integer(item.get("id")),
        "state": state,
        "environment": _environment_name(item.get("environment")),
        "created_at": _text(item.get("created_at")),
        "updated_at": _text(item.get("updated_at")),
    }


def repo_environments(reader: GitHubReader) -> dict[str, Any]:
    try:
        environments = [_project_environment(item) for item in reader.list_environments()]
        return {"schema": "repo-environments.v1", "ok": True, "status": "OK", "count": len(environments), "environments": environments, "production_authority": False}
    except (GitHubReadError, ValueError):
        return {"schema": "repo-environments.v1", "ok": False, "status": "UNKNOWN", "count": None, "environments": [], "production_authority": False}


def repo_deployments(reader: GitHubReader, limit: int = 20) -> dict[str, Any]:
    safe_limit = limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None
    if safe_limit is None:
        return {"schema": "repo-deployments.v1", "ok": False, "status": "UNKNOWN", "scope": "recent", "limit": None, "count": None, "deployments": [], "production_authority": False}
    try:
        deployments = [_project_deployment(item) for item in reader.list_deployments(limit=safe_limit)]
        return {"schema": "repo-deployments.v1", "ok": True, "status": "OK", "scope": "recent", "limit": safe_limit, "count": len(deployments), "deployments": deployments, "production_authority": False}
    except (GitHubReadError, ValueError):
        return {"schema": "repo-deployments.v1", "ok": False, "status": "UNKNOWN", "scope": "recent", "limit": safe_limit, "count": None, "deployments": [], "production_authority": False}


def repo_deployment_statuses(reader: GitHubReader, deployment_id: int, limit: int = 20) -> dict[str, Any]:
    safe_id = deployment_id if isinstance(deployment_id, int) and not isinstance(deployment_id, bool) and deployment_id > 0 else None
    safe_limit = limit if isinstance(limit, int) and not isinstance(limit, bool) and 1 <= limit <= 50 else None
    if safe_id is None or safe_limit is None:
        return {"schema": "repo-deployment-statuses.v1", "ok": False, "status": "UNKNOWN", "deployment_id": safe_id, "scope": "recent", "limit": safe_limit, "count": None, "statuses": [], "production_authority": False}
    try:
        statuses = [_project_status(item) for item in reader.list_deployment_statuses(safe_id, limit=safe_limit)]
        return {"schema": "repo-deployment-statuses.v1", "ok": True, "status": "OK", "deployment_id": safe_id, "scope": "recent", "limit": safe_limit, "count": len(statuses), "statuses": statuses, "production_authority": False}
    except (GitHubReadError, ValueError):
        return {"schema": "repo-deployment-statuses.v1", "ok": False, "status": "UNKNOWN", "deployment_id": safe_id, "scope": "recent", "limit": safe_limit, "count": None, "statuses": [], "production_authority": False}
