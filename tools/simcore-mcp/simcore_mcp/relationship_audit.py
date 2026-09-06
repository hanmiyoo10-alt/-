from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .github_reader import GitHubReadError, GitHubReader

MODES = {
    "BR-01": "GENERIC_RELATION_AUDIT",
    "BR-02": "EXACT_BASE_TRANSACTION_AUDIT",
    "BR-03": "HISTORICAL_RELATION_AUDIT",
}
DISPOSITIONS = {
    "RELATION_CLEAN",
    "RELATION_REVIEW_REQUIRED",
    "RELATION_BLOCKED",
    "RELATION_NOT_APPLICABLE",
}
MAX_FINDINGS = 32
MAX_OBSERVATIONS = 32
MAX_ERRORS = 16


class RelationshipReader(GitHubReader):
    """Read-only GitHub adapter extension scoped to SYS-36 PR metadata."""

    def get_pull_request(self, pr_number: int) -> dict[str, Any]:
        if not isinstance(pr_number, int) or pr_number <= 0:
            raise GitHubReadError(f"pull:{pr_number}", "invalid PR number")
        data, _ = self._request_json(self._url(f"/pulls/{pr_number}"), f"pull:{pr_number}")
        if not isinstance(data, dict):
            raise GitHubReadError(f"pull:{pr_number}", "response is not an object")
        return data


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _error(exc: GitHubReadError) -> dict[str, str]:
    return {"source": exc.source, "message": exc.message}


def _is_not_found(exc: GitHubReadError) -> bool:
    return exc.message.startswith("HTTP 404")


def _repo_name(value: Any) -> str | None:
    if isinstance(value, dict):
        name = value.get("full_name")
        if isinstance(name, str) and name:
            return name
    return None


def _bounded_append(items: list[dict[str, Any]], item: dict[str, Any], limit: int) -> None:
    if len(items) < limit:
        items.append(item)


def _finding(findings: list[dict[str, Any]], code: str, layer: str, detail: str) -> None:
    _bounded_append(findings, {"code": code, "layer": layer, "detail": detail}, MAX_FINDINGS)


def _observation(observations: list[dict[str, Any]], code: str, detail: str) -> None:
    _bounded_append(observations, {"code": code, "detail": detail}, MAX_OBSERVATIONS)


def _read_branch(reader: Any, ref: str, errors: list[dict[str, str]]) -> tuple[str | None, bool]:
    try:
        return reader.get_branch_sha(ref), False
    except GitHubReadError as exc:
        if _is_not_found(exc):
            return None, True
        _bounded_append(errors, _error(exc), MAX_ERRORS)
        return None, False


def _disposition(findings: list[dict[str, Any]], errors: list[dict[str, str]]) -> str:
    blocked = {
        "BRF-01", "BRF-02", "BRF-03", "BRF-04", "BRF-05", "BRF-07",
        "BRF-09", "BRF-10", "BRF-11", "BRF-12", "BRF-13", "BRF-14",
    }
    review = {"BRF-06", "BRF-08"}
    codes = {item["code"] for item in findings}
    if errors or codes & blocked:
        return "RELATION_BLOCKED"
    if codes & review:
        return "RELATION_REVIEW_REQUIRED"
    return "RELATION_CLEAN"


def relationship_audit(
    reader: Any,
    pr_number: int,
    mode: str = "BR-01",
    expected_base_ref: str | None = None,
    expected_base_sha: str | None = None,
    expected_head_ref: str | None = None,
    expected_head_sha: str | None = None,
    base_movement_policy: str | None = None,
    head_movement_policy: str | None = None,
    include_compare: bool = True,
    require_head_descends_from_base: bool = False,
) -> dict[str, Any]:
    started = _now()
    findings: list[dict[str, Any]] = []
    observations: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    if mode not in MODES or not isinstance(pr_number, int) or pr_number <= 0:
        _finding(findings, "BRF-13", "INPUT", "unsupported mode or invalid PR number")
        return {
            "ok": False,
            "mode": {"id": mode, "name": MODES.get(mode)},
            "disposition": "RELATION_NOT_APPLICABLE" if mode not in MODES else "RELATION_BLOCKED",
            "repository": getattr(reader, "repository", None),
            "pr": {"number": pr_number},
            "contract": {},
            "capture": {"started_at": started, "completed_at": _now(), "raced": False},
            "fixed_relationship": None,
            "findings": findings,
            "observations": observations,
            "errors": errors,
        }

    try:
        pr = reader.get_pull_request(pr_number)
    except GitHubReadError as exc:
        if _is_not_found(exc):
            _finding(findings, "BRF-01", "L1", f"PR #{pr_number} not found")
        else:
            _bounded_append(errors, _error(exc), MAX_ERRORS)
        return {
            "ok": False,
            "mode": {"id": mode, "name": MODES[mode]},
            "disposition": "RELATION_BLOCKED",
            "repository": getattr(reader, "repository", None),
            "pr": {"number": pr_number},
            "contract": {},
            "capture": {"started_at": started, "completed_at": _now(), "raced": False},
            "fixed_relationship": None,
            "findings": findings,
            "observations": observations,
            "errors": errors,
        }

    state = pr.get("state")
    merged_at = pr.get("merged_at")
    closed_at = pr.get("closed_at")
    merge_sha = pr.get("merge_commit_sha")
    head = pr.get("head") if isinstance(pr.get("head"), dict) else {}
    base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
    head_ref = head.get("ref") if isinstance(head.get("ref"), str) else None
    head_sha = head.get("sha") if isinstance(head.get("sha"), str) else None
    base_ref = base.get("ref") if isinstance(base.get("ref"), str) else None
    base_sha = base.get("sha") if isinstance(base.get("sha"), str) else None
    head_repo = _repo_name(head.get("repo"))
    base_repo = _repo_name(base.get("repo"))
    repository = getattr(reader, "repository", None)
    merged = merged_at is not None

    if merged and state != "closed":
        _finding(findings, "BRF-02", "L1", "merged_at is set while PR state is not closed")
    elif state == "closed" and not merged:
        _observation(observations, "BRI-01", "closed PR has merged_at == null")
    if not merged and merge_sha:
        _observation(observations, "BRI-03", "merge_commit_sha present before merge was ignored")

    if head_repo and repository and head_repo != repository:
        _finding(findings, "BRF-13", "INPUT", f"head repository {head_repo} differs from configured repository {repository}")
    if base_repo and repository and base_repo != repository:
        _finding(findings, "BRF-13", "INPUT", f"base repository {base_repo} differs from configured repository {repository}")

    contract = {
        "expected_base_ref": expected_base_ref,
        "expected_base_sha": expected_base_sha,
        "expected_head_ref": expected_head_ref,
        "expected_head_sha": expected_head_sha,
        "base_movement_policy": base_movement_policy,
        "head_movement_policy": head_movement_policy,
        "require_head_descends_from_base": require_head_descends_from_base,
    }
    if mode == "BR-02":
        if not expected_base_ref or not expected_base_sha:
            _finding(findings, "BRF-05", "L4", "exact-base mode requires expected base ref and SHA")
        if bool(expected_head_ref) != bool(expected_head_sha):
            _finding(findings, "BRF-07", "L4", "expected head ref/SHA must be supplied together when head is frozen")
        if not base_movement_policy or not head_movement_policy:
            _finding(findings, "BRF-13", "INPUT", "exact-base mode requires explicit base/head movement policies")

    need_live = mode in {"BR-01", "BR-02"}
    initial_base = final_base = None
    initial_head = final_head = None
    base_missing = head_missing = False

    if need_live and (head_repo in {None, repository}) and (base_repo in {None, repository}):
        if base_ref:
            initial_base, base_missing = _read_branch(reader, base_ref, errors)
        else:
            _finding(findings, "BRF-13", "INPUT", "PR base ref is unavailable")
        if state == "open":
            if head_ref:
                initial_head, head_missing = _read_branch(reader, head_ref, errors)
            else:
                _finding(findings, "BRF-13", "INPUT", "open PR head ref is unavailable")

    if base_missing and need_live:
        _finding(findings, "BRF-03", "L2", f"base ref {base_ref!r} did not resolve")
    if head_missing and state == "open" and need_live:
        _finding(findings, "BRF-04", "L2", f"open PR head ref {head_ref!r} did not resolve")
    if mode == "BR-03" and state != "open" and head_ref:
        try:
            reader.get_branch_sha(head_ref)
        except GitHubReadError as exc:
            if _is_not_found(exc):
                _observation(observations, "BRI-02", "historical head ref absent after close is allowed")
            else:
                _bounded_append(errors, _error(exc), MAX_ERRORS)

    fixed_relationship = None
    if include_compare and base_sha and head_sha:
        try:
            comparison = reader.compare_commits(base_sha, head_sha)
            fixed_relationship = {
                "base_sha": base_sha,
                "head_sha": head_sha,
                "status": comparison.get("status"),
                "ahead_by": comparison.get("ahead_by"),
                "behind_by": comparison.get("behind_by"),
                "merge_base_sha": (
                    comparison.get("merge_base_commit", {}).get("sha")
                    if isinstance(comparison.get("merge_base_commit"), dict)
                    else None
                ),
            }
            if require_head_descends_from_base:
                status = comparison.get("status")
                behind_by = comparison.get("behind_by")
                if status not in {"ahead", "identical"} or (isinstance(behind_by, int) and behind_by > 0):
                    _finding(findings, "BRF-09", "L3", "fixed head does not satisfy requested base-ancestry contract")
        except GitHubReadError as exc:
            _bounded_append(errors, _error(exc), MAX_ERRORS)
            _finding(findings, "BRF-14", "L3", "recorded base/head fixed-SHA relationship could not be resolved")

    if merged:
        if not merge_sha:
            _finding(findings, "BRF-10", "L1", "merged PR has no merge-result identity")
        else:
            try:
                reader.get_commit(merge_sha)
            except GitHubReadError as exc:
                _bounded_append(errors, _error(exc), MAX_ERRORS)
                _finding(findings, "BRF-11", "L3", "merge-result commit did not resolve")

    if mode == "BR-02":
        if expected_base_ref and base_ref and expected_base_ref != base_ref:
            _finding(findings, "BRF-13", "L4", f"expected base ref {expected_base_ref} != PR base ref {base_ref}")
        if expected_head_ref and head_ref and expected_head_ref != head_ref:
            _finding(findings, "BRF-13", "L4", f"expected head ref {expected_head_ref} != PR head ref {head_ref}")
        observed_base = initial_base if need_live else base_sha
        observed_head = initial_head if state == "open" and need_live else head_sha
        if expected_base_sha and observed_base and expected_base_sha != observed_base:
            _finding(findings, "BRF-06", "L4", "current required base tip differs from expected base SHA")
        if expected_head_sha and observed_head and expected_head_sha != observed_head:
            _finding(findings, "BRF-08", "L4", "observed head differs from expected head SHA")

    raced = False
    if need_live and (head_repo in {None, repository}) and (base_repo in {None, repository}):
        if base_ref and initial_base is not None:
            final_base, _ = _read_branch(reader, base_ref, errors)
            if final_base is not None and final_base != initial_base:
                raced = True
        if state == "open" and head_ref and initial_head is not None:
            final_head, _ = _read_branch(reader, head_ref, errors)
            if final_head is not None and final_head != initial_head:
                raced = True
    if raced:
        _finding(findings, "BRF-12", "CAPTURE", "a required live ref moved during relationship capture")

    if mode == "BR-01" and initial_base and base_sha and initial_base != base_sha:
        _observation(observations, "BRI-04", "live base tip advanced relative to recorded PR base SHA; allowed in generic mode")
    if state == "open" and initial_head and head_sha and initial_head == head_sha:
        _observation(observations, "BRI-05", "live head ref matches recorded PR head SHA")

    disposition = _disposition(findings, errors)
    completed = _now()
    return {
        "ok": not errors,
        "mode": {"id": mode, "name": MODES[mode]},
        "disposition": disposition,
        "repository": repository,
        "pr": {
            "number": pr_number,
            "state": state,
            "merged": merged,
            "merged_at": merged_at,
            "closed_at": closed_at,
            "merge_commit_sha": merge_sha,
            "head": {"repo": head_repo, "ref": head_ref, "sha": head_sha},
            "base": {"repo": base_repo, "ref": base_ref, "sha": base_sha},
        },
        "contract": contract,
        "capture": {
            "started_at": started,
            "completed_at": completed,
            "initial_base_tip": initial_base,
            "final_base_tip": final_base,
            "initial_head_tip": initial_head,
            "final_head_tip": final_head,
            "raced": raced,
        },
        "fixed_relationship": fixed_relationship,
        "findings": findings,
        "observations": observations,
        "errors": errors,
    }
