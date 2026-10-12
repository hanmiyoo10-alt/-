from __future__ import annotations

from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_TEXT = 200


def _text(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or len(value) > MAX_TEXT or any(ch in value for ch in "\r\n\x00"):
        raise ValueError("invalid bounded text")
    return value


def _integer(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("invalid non-negative integer")
    return value


def _optional_list_count(value: dict[str, Any], key: str) -> int | None:
    if key not in value or value[key] is None:
        return None
    items = value[key]
    if not isinstance(items, list) or len(items) > 1000:
        raise ValueError(f"{key} invalid")
    return len(items)


def repo_rulesets(reader: GitHubReader) -> dict[str, Any]:
    try:
        raw = reader.list_repository_rulesets()
        items = []
        for item in raw:
            items.append({
                "id": _integer(item.get("id")),
                "name": _text(item.get("name")),
                "target": _text(item.get("target")),
                "enforcement": _text(item.get("enforcement")),
                "source_type": _text(item.get("source_type")),
                "source": _text(item.get("source")),
                "created_at": _text(item.get("created_at")),
                "updated_at": _text(item.get("updated_at")),
                "bypass_actor_count": _optional_list_count(item, "bypass_actors"),
                "rule_count": _optional_list_count(item, "rules"),
            })
        return {"schema": "repo-rulesets.v1", "ok": True, "status": "OK", "count": len(items), "rulesets": items}
    except (GitHubReadError, ValueError):
        return {"schema": "repo-rulesets.v1", "ok": False, "status": "UNKNOWN", "count": None, "rulesets": []}


def repo_secret_metadata(reader: GitHubReader) -> dict[str, Any]:
    try:
        raw = reader.list_actions_secret_metadata()
        items = [{
            "name": _text(item.get("name")),
            "created_at": _text(item.get("created_at")),
            "updated_at": _text(item.get("updated_at")),
        } for item in raw]
        return {
            "schema": "repo-secret-metadata.v1",
            "ok": True,
            "status": "OK",
            "count": len(items),
            "secrets": items,
            "values_exposed": False,
        }
    except (GitHubReadError, ValueError):
        return {
            "schema": "repo-secret-metadata.v1",
            "ok": False,
            "status": "UNKNOWN",
            "count": None,
            "secrets": [],
            "values_exposed": False,
        }


def _project_alert(kind: str, item: dict[str, Any]) -> dict[str, Any]:
    base = {
        "number": _integer(item.get("number")),
        "state": _text(item.get("state")),
        "created_at": _text(item.get("created_at")),
        "updated_at": _text(item.get("updated_at")),
        "html_url": _text(item.get("html_url")),
    }
    if kind == "code_scanning":
        rule = item.get("rule") if isinstance(item.get("rule"), dict) else {}
        tool = item.get("tool") if isinstance(item.get("tool"), dict) else {}
        base.update({
            "rule_id": _text(rule.get("id")),
            "severity": _text(rule.get("security_severity_level") or rule.get("severity")),
            "tool": _text(tool.get("name")),
        })
    elif kind == "dependabot":
        dep = item.get("dependency") if isinstance(item.get("dependency"), dict) else {}
        pkg = dep.get("package") if isinstance(dep.get("package"), dict) else {}
        advisory = item.get("security_advisory") if isinstance(item.get("security_advisory"), dict) else {}
        base.update({
            "package": _text(pkg.get("name")),
            "manifest_path": _text(dep.get("manifest_path")),
            "severity": _text(advisory.get("severity")),
        })
    else:
        base.update({
            "secret_type": _text(item.get("secret_type")),
            "resolution": _text(item.get("resolution")),
            "resolved_at": _text(item.get("resolved_at")),
        })
    return base


def repo_security_alerts(reader: GitHubReader, kind: str, limit: int = 20) -> dict[str, Any]:
    safe_kind = kind if kind in {"code_scanning", "dependabot", "secret_scanning"} else None
    if safe_kind is None:
        return {
            "schema": "repo-security-alerts.v1",
            "ok": False,
            "status": "UNKNOWN",
            "kind": None,
            "count": None,
            "alerts": [],
        }
    try:
        raw = reader.list_security_alerts(safe_kind, per_page=limit)
        alerts = [_project_alert(safe_kind, item) for item in raw]
        return {
            "schema": "repo-security-alerts.v1",
            "ok": True,
            "status": "OK",
            "kind": safe_kind,
            "count": len(alerts),
            "alerts": alerts,
        }
    except (GitHubReadError, ValueError):
        return {
            "schema": "repo-security-alerts.v1",
            "ok": False,
            "status": "UNKNOWN",
            "kind": safe_kind,
            "count": None,
            "alerts": [],
        }


def repo_permission_probe(reader: GitHubReader, operation: str) -> dict[str, Any]:
    safe_operation = operation if operation in {
        "repository",
        "rulesets",
        "actions_secrets",
        "code_scanning",
        "dependabot",
        "secret_scanning",
        "environments",
        "deployments",
        "variables",
        "security_advisories",
        "code_quality",
    } else None
    if safe_operation is None:
        return {
            "schema": "repo-permission-probe.v1",
            "ok": False,
            "status": "UNKNOWN",
            "operation": None,
            "http_status": None,
            "accepted_permissions": None,
            "granted_permissions_inferred": False,
        }
    try:
        observed = reader.probe_accepted_permissions(safe_operation)
        accepted = observed.get("accepted_permissions")
        return {
            "schema": "repo-permission-probe.v1",
            "ok": accepted is not None,
            "status": "OBSERVED" if accepted is not None else "UNAVAILABLE",
            "operation": safe_operation,
            "http_status": observed.get("http_status"),
            "accepted_permissions": accepted,
            "granted_permissions_inferred": False,
        }
    except (GitHubReadError, ValueError):
        return {
            "schema": "repo-permission-probe.v1",
            "ok": False,
            "status": "UNKNOWN",
            "operation": safe_operation,
            "http_status": None,
            "accepted_permissions": None,
            "granted_permissions_inferred": False,
        }
