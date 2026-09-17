from __future__ import annotations

from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MAX_ITEMS = 100
SCHEMA = "repo-branch-protection.v1"


def _valid_branch(branch: object) -> str | None:
    if not isinstance(branch, str) or not branch or len(branch) > 200:
        return None
    if any(ch in branch for ch in "\r\n\x00"):
        return None
    return branch


def _bounded_list(value: object, field: str) -> list[Any]:
    if not isinstance(value, list) or len(value) > MAX_ITEMS:
        raise ValueError(f"{field} invalid")
    return value


def _required_checks(value: object) -> dict[str, Any]:
    if value is None:
        return {"configured": False, "strict": None, "contexts": [], "checks": []}
    if not isinstance(value, dict) or not isinstance(value.get("strict"), bool):
        raise ValueError("required_status_checks invalid")
    contexts = _bounded_list(value.get("contexts", []), "required_status_checks.contexts")
    if any(not isinstance(item, str) or len(item) > 200 for item in contexts):
        raise ValueError("required_status_checks.contexts invalid")
    raw_checks = _bounded_list(value.get("checks", []), "required_status_checks.checks")
    checks: list[dict[str, Any]] = []
    for item in raw_checks:
        if not isinstance(item, dict) or not isinstance(item.get("context"), str):
            raise ValueError("required_status_checks.check invalid")
        app_id = item.get("app_id")
        if app_id is not None and (isinstance(app_id, bool) or not isinstance(app_id, int)):
            raise ValueError("required_status_checks.check app_id invalid")
        checks.append({"context": item["context"], "app_id": app_id})
    return {
        "configured": True,
        "strict": value["strict"],
        "contexts": list(contexts),
        "checks": checks,
    }


def _optional_bool(value: dict[str, Any], key: str) -> bool | None:
    item = value.get(key)
    if item is None:
        return None
    if not isinstance(item, bool):
        raise ValueError(f"{key} invalid")
    return item


def _reviews(value: object) -> dict[str, Any]:
    if value is None:
        return {
            "configured": False,
            "required_approving_review_count": None,
            "dismiss_stale_reviews": None,
            "require_code_owner_reviews": None,
            "require_last_push_approval": None,
        }
    if not isinstance(value, dict):
        raise ValueError("required_pull_request_reviews invalid")
    count = value.get("required_approving_review_count")
    if count is not None and (isinstance(count, bool) or not isinstance(count, int) or count < 0):
        raise ValueError("required_approving_review_count invalid")
    return {
        "configured": True,
        "required_approving_review_count": count,
        "dismiss_stale_reviews": _optional_bool(value, "dismiss_stale_reviews"),
        "require_code_owner_reviews": _optional_bool(value, "require_code_owner_reviews"),
        "require_last_push_approval": _optional_bool(value, "require_last_push_approval"),
    }


def _restrictions(value: object) -> dict[str, Any]:
    if value is None:
        return {"configured": False, "users": 0, "teams": 0, "apps": 0}
    if not isinstance(value, dict):
        raise ValueError("restrictions invalid")
    result = {"configured": True}
    for key in ("users", "teams", "apps"):
        result[key] = len(_bounded_list(value.get(key, []), f"restrictions.{key}"))
    return result


def _setting_enabled(detail: dict[str, Any], key: str) -> bool:
    if key not in detail:
        raise ValueError(f"{key} missing")
    value = detail[key]
    if value is None:
        return False
    if not isinstance(value, dict) or not isinstance(value.get("enabled"), bool):
        raise ValueError(f"{key} invalid")
    return value["enabled"]


def _detail(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("protection detail invalid")
    return {
        "required_status_checks": _required_checks(value.get("required_status_checks")),
        "enforce_admins": _setting_enabled(value, "enforce_admins"),
        "required_pull_request_reviews": _reviews(value.get("required_pull_request_reviews")),
        "restrictions": _restrictions(value.get("restrictions")),
        "required_signatures": _setting_enabled(value, "required_signatures"),
        "required_linear_history": _setting_enabled(value, "required_linear_history"),
        "allow_force_pushes": _setting_enabled(value, "allow_force_pushes"),
        "allow_deletions": _setting_enabled(value, "allow_deletions"),
        "block_creations": _setting_enabled(value, "block_creations"),
        "required_conversation_resolution": _setting_enabled(value, "required_conversation_resolution"),
        "lock_branch": _setting_enabled(value, "lock_branch"),
        "allow_fork_syncing": _setting_enabled(value, "allow_fork_syncing"),
    }


def _result(branch: object, *, status: str, protected: bool | None,
            detail_disposition: str, detail: dict[str, Any] | None,
            summary: dict[str, Any] | None, reason_codes: list[str]) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "ok": status != "UNKNOWN",
        "status": status,
        "branch": branch,
        "protected": protected,
        "summary": summary,
        "detail_disposition": detail_disposition,
        "detail": detail,
        "reason_codes": reason_codes,
    }


def repo_branch_protection(reader: GitHubReader, branch: str = "main") -> dict[str, Any]:
    resolved = _valid_branch(branch)
    if resolved is None:
        return _result(branch, status="UNKNOWN", protected=None, summary=None,
                       detail_disposition="UNKNOWN", detail=None,
                       reason_codes=["BRANCH_INPUT_INVALID"])
    try:
        summary_value = reader.get_branch(resolved)
        protected = summary_value.get("protected")
        if not isinstance(protected, bool):
            raise ValueError("branch protected flag invalid")
        protection = summary_value.get("protection")
        if protection is not None and not isinstance(protection, dict):
            raise ValueError("branch protection summary invalid")
        summary = {"required_status_checks": None if protection is None else protection.get("required_status_checks")}
    except (GitHubReadError, ValueError):
        return _result(resolved, status="UNKNOWN", protected=None, summary=None,
                       detail_disposition="UNKNOWN", detail=None,
                       reason_codes=["BRANCH_SUMMARY_READ_FAILED"])

    if not protected:
        return _result(resolved, status="UNPROTECTED", protected=False, summary=summary,
                       detail_disposition="NOT_CONFIGURED", detail=None, reason_codes=[])

    try:
        detail_value = reader.get_branch_protection(resolved)
    except GitHubReadError as exc:
        if exc.status_code == 403:
            return _result(resolved, status="PARTIAL", protected=True, summary=summary,
                           detail_disposition="DETAIL_READ_BLOCKED_PERMISSION", detail=None,
                           reason_codes=["DETAIL_READ_BLOCKED_PERMISSION"])
        return _result(resolved, status="UNKNOWN", protected=True, summary=summary,
                       detail_disposition="UNKNOWN", detail=None,
                       reason_codes=["DETAIL_READ_FAILED"])
    try:
        detail = _detail(detail_value)
    except ValueError:
        return _result(resolved, status="UNKNOWN", protected=True, summary=summary,
                       detail_disposition="UNKNOWN", detail=None,
                       reason_codes=["DETAIL_RESPONSE_INVALID"])
    return _result(resolved, status="OK", protected=True, summary=summary,
                   detail_disposition="AVAILABLE", detail=detail, reason_codes=[])
