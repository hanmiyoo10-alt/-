from __future__ import annotations

import re
from typing import Any

from .docs_drift import check_docs_drift
from .github_reader import GitHubReadError
from .production_identity import verify_production_identity

_SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")
_SIMCORE_CI = ".github/workflows/simcore-ci.yml"
_CANONICAL_DOCS = ".github/workflows/canonical-main-docs.yml"
_SUPERSEDE = frozenset({"cancelled", "skipped"})
_HARD_FAIL = frozenset({"failure", "timed_out", "action_required", "startup_failure", "stale"})


def _check(checks, violations, code, passed, expected, actual, source):
    item = {"code": code, "pass": bool(passed), "expected": expected, "actual": actual, "source": source}
    checks.append(item)
    if not passed:
        violations.append({**item, "severity": "hard"})


def _component_errors(name, report):
    out = []
    for item in report.get("errors", []) if isinstance(report, dict) else []:
        out.append({"component": name, **item} if isinstance(item, dict) else {"component": name, "source": name, "message": str(item)})
    return out


def _message(commit):
    inner = commit.get("commit") if isinstance(commit, dict) else None
    value = inner.get("message") if isinstance(inner, dict) else None
    return value if isinstance(value, str) and value else None


def _subject(commit):
    message = _message(commit)
    return message.splitlines()[0].strip() if message else None


def _run_summary(run):
    if not isinstance(run, dict):
        return None
    return {key: run.get(key) for key in ("id", "head_sha", "head_branch", "event", "status", "conclusion", "created_at", "run_number")}


def _run_key(run):
    return (
        run.get("created_at") if isinstance(run.get("created_at"), str) else "",
        run.get("run_number") if isinstance(run.get("run_number"), int) else -1,
        run.get("id") if isinstance(run.get("id"), int) else -1,
    )


def _descends(reader, target, candidate, cache, errors):
    if candidate == target:
        return True
    if candidate in cache:
        return cache[candidate]
    try:
        comparison = reader.compare_commits(target, candidate)
    except GitHubReadError as exc:
        errors.append({"source": exc.source, "message": exc.message})
        cache[candidate] = None
        return None
    merge_base = comparison.get("merge_base_commit") if isinstance(comparison, dict) else None
    sha = merge_base.get("sha") if isinstance(merge_base, dict) else None
    cache[candidate] = isinstance(sha, str) and sha.lower() == target
    return cache[candidate]


def _workflow(reader, path, target, main_branch, cache, errors):
    empty = {"pass": False, "workflow_path": path, "resolution": "NONE", "exact": None, "selected": None}
    try:
        runs = reader.list_workflow_runs(path, main_branch, event="push", max_pages=3)
    except GitHubReadError as exc:
        errors.append({"source": exc.source, "message": exc.message})
        return {**empty, "reason": "workflow read failed"}

    runs = [r for r in runs if isinstance(r, dict) and r.get("head_branch") == main_branch and r.get("event") == "push"]
    exacts = sorted((r for r in runs if str(r.get("head_sha") or "").lower() == target), key=_run_key)
    exact = exacts[-1] if exacts else None
    exact_summary = _run_summary(exact)
    reason = "exact run absent"

    if exact is not None:
        if exact.get("status") != "completed":
            return {**empty, "exact": exact_summary, "reason": "exact run is not terminal"}
        conclusion = exact.get("conclusion")
        if conclusion == "success":
            return {"pass": True, "workflow_path": path, "resolution": "EXACT", "exact": exact_summary, "selected": exact_summary, "reason": "exact target run succeeded"}
        if conclusion in _HARD_FAIL:
            return {**empty, "exact": exact_summary, "reason": f"exact target hard-failed: {conclusion}"}
        if conclusion not in _SUPERSEDE:
            return {**empty, "exact": exact_summary, "reason": f"exact target conclusion not supersedable: {conclusion}"}
        reason = f"exact target {conclusion}; successor permitted"

    candidates = sorted(
        (
            r for r in runs
            if str(r.get("head_sha") or "").lower() != target
            and r.get("status") == "completed"
            and r.get("conclusion") == "success"
            and isinstance(r.get("head_sha"), str)
        ),
        key=_run_key,
    )
    for candidate in candidates:
        sha = str(candidate["head_sha"]).lower()
        result = _descends(reader, target, sha, cache, errors)
        if result is True:
            return {"pass": True, "workflow_path": path, "resolution": "SUCCESSOR", "exact": exact_summary, "selected": _run_summary(candidate), "reason": reason}
        if result is None:
            break
    return {**empty, "exact": exact_summary, "reason": f"{reason}; no proven successful descendant run"}


def postmerge_health(reader: Any, commit_sha: str) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    valid = isinstance(commit_sha, str) and bool(_SHA_RE.fullmatch(commit_sha))
    target = commit_sha.lower() if valid else commit_sha
    _check(checks, violations, "TARGET_COMMIT_SHA_VALID", valid, "40 hexadecimal characters", commit_sha, "input:commit_sha")

    target_commit = None
    target_subject = None
    first_parent = None
    if valid:
        try:
            target_commit = reader.get_commit(target)
            target_subject = _subject(target_commit)
            parents = target_commit.get("parents") if isinstance(target_commit, dict) else None
            if isinstance(parents, list) and parents and isinstance(parents[0], dict) and isinstance(parents[0].get("sha"), str):
                first_parent = parents[0]["sha"].lower()
        except GitHubReadError as exc:
            errors.append({"source": exc.source, "message": exc.message})
    target_ok = isinstance(target_commit, dict)
    _check(checks, violations, "TARGET_COMMIT_AVAILABLE", target_ok, "readable GitHub commit", "available" if target_ok else None, f"commit:{target}" if valid else "input:commit_sha")

    main_head = None
    if valid:
        try:
            main_head = reader.get_branch_sha(reader.main_branch).lower()
        except GitHubReadError as exc:
            errors.append({"source": exc.source, "message": exc.message})
    _check(checks, violations, "MAIN_HEAD_AVAILABLE", main_head is not None, "current main commit sha", main_head, f"branch:{reader.main_branch}")

    reachable = False
    compare_status = None
    successors = []
    scan_complete = False
    if valid and target_ok and main_head:
        if target == main_head:
            reachable = True
            compare_status = "identical"
            scan_complete = True
        else:
            try:
                comparison = reader.compare_commits(target, main_head)
                compare_status = comparison.get("status") if isinstance(comparison.get("status"), str) else None
                merge_base = comparison.get("merge_base_commit")
                merge_sha = merge_base.get("sha") if isinstance(merge_base, dict) else None
                reachable = isinstance(merge_sha, str) and merge_sha.lower() == target
                raw_commits = comparison.get("commits")
                if isinstance(raw_commits, list):
                    successors = [c for c in raw_commits if isinstance(c, dict)]
                    total = comparison.get("total_commits")
                    scan_complete = not isinstance(total, int) or total <= len(successors)
                    if not scan_complete:
                        errors.append({"source": f"compare:{target}...{main_head}", "message": f"successor commit scan incomplete: total_commits={total}, returned={len(successors)}"})
                else:
                    errors.append({"source": f"compare:{target}...{main_head}", "message": "comparison commits list unavailable"})
            except GitHubReadError as exc:
                errors.append({"source": exc.source, "message": exc.message})
    _check(checks, violations, "TARGET_REACHABLE_FROM_MAIN", reachable, f"ancestor of {reader.main_branch}", {"main_head": main_head, "compare_status": compare_status}, f"compare:{target}...{main_head}" if valid and main_head else "input:commit_sha")

    reverts = []
    if reachable and scan_complete:
        expected_subject = f'Revert "{target_subject}"' if target_subject else None
        for item in successors:
            message = _message(item) or ""
            subject = _subject(item)
            by_sha = f"this reverts commit {target}" in message.lower()
            by_subject = bool(expected_subject and subject == expected_subject)
            if by_sha or by_subject:
                reverts.append({"sha": item.get("sha"), "subject": subject, "matched_by": "sha" if by_sha else "subject"})
    no_revert = reachable and scan_complete and not reverts
    _check(checks, violations, "NO_EXPLICIT_REVERT_OF_TARGET", no_revert, True, {"scan_complete": scan_complete, "matching_commits": reverts}, f"compare:{target}...{main_head}" if valid and main_head else "input:commit_sha")

    cache = {main_head: reachable} if main_head else {}
    unavailable = {"pass": False, "resolution": "NONE", "exact": None, "selected": None, "reason": "target unavailable"}
    simcore = {"workflow_path": _SIMCORE_CI, **unavailable}
    docs_workflow = {"workflow_path": _CANONICAL_DOCS, **unavailable}
    if valid and target_ok and reachable:
        simcore = _workflow(reader, _SIMCORE_CI, target, reader.main_branch, cache, errors)
        docs_workflow = _workflow(reader, _CANONICAL_DOCS, target, reader.main_branch, cache, errors)
    for code, report, path in (
        ("SIMCORE_CI_POSTMERGE_SUCCESS", simcore, _SIMCORE_CI),
        ("CANONICAL_DOCS_POSTMERGE_SUCCESS", docs_workflow, _CANONICAL_DOCS),
    ):
        _check(checks, violations, code, bool(report.get("pass")), "successful exact or proven descendant-successor main push run", {"resolution": report.get("resolution"), "selected": report.get("selected"), "reason": report.get("reason")}, path)

    baseline = None
    baseline_blob = None
    if valid and target_ok:
        try:
            baseline, baseline_blob = reader.get_json_file("product-manifest.json", target)
        except GitHubReadError as exc:
            errors.append({"source": exc.source, "message": exc.message})
    baseline_ok = isinstance(baseline, dict)
    _check(checks, violations, "TARGET_MANIFEST_AVAILABLE", baseline_ok, "readable target-time product-manifest.json", "available" if baseline_ok else None, f"{target}:product-manifest.json" if valid else "input:commit_sha")

    production = verify_production_identity(reader)
    docs = check_docs_drift(reader)
    errors.extend(_component_errors("production_identity", production))
    errors.extend(_component_errors("docs_drift", docs))
    declared = production.get("declared", {}) if isinstance(production, dict) else {}
    declared = declared if isinstance(declared, dict) else {}
    baseline_fields = {key: baseline.get(key) if baseline else None for key in ("production_version", "release_branch", "release_commit", "release_blob")}

    for code, key in (
        ("PRODUCTION_BASELINE_VERSION_MATCH", "production_version"),
        ("PRODUCTION_BASELINE_RELEASE_BRANCH_MATCH", "release_branch"),
        ("PRODUCTION_BASELINE_RELEASE_COMMIT_MATCH", "release_commit"),
        ("PRODUCTION_BASELINE_RELEASE_BLOB_MATCH", "release_blob"),
    ):
        expected, actual = baseline_fields[key], declared.get(key)
        _check(checks, violations, code, baseline_ok and expected is not None and expected == actual, expected, actual, f"target-manifest:{key}+component:production_identity")

    prod_pass = bool(isinstance(production, dict) and production.get("pass") is True)
    docs_pass = bool(isinstance(docs, dict) and docs.get("pass") is True)
    _check(checks, violations, "CURRENT_PRODUCTION_IDENTITY_PASS", prod_pass, True, production.get("pass") if isinstance(production, dict) else None, "component:production_identity")
    _check(checks, violations, "CURRENT_DOCS_DRIFT_PASS", docs_pass, True, docs.get("pass") if isinstance(docs, dict) else None, "component:docs_drift")

    return {
        "healthy": not errors and not violations,
        "repository": reader.repository,
        "target": {"commit_sha": target, "subject": target_subject, "resolved": target_ok, "first_parent_sha": first_parent, "baseline_manifest_blob": baseline_blob},
        "main": {"branch": reader.main_branch, "sha": main_head, "target_reachable": reachable if valid else None, "compare_status": compare_status},
        "workflows": {"simcore_ci": simcore, "canonical_docs": docs_workflow},
        "revert": {"explicit_revert_found": bool(reverts) if reachable and scan_complete else None, "scan_complete": scan_complete, "matching_commits": reverts},
        "production_baseline": {"manifest_blob": baseline_blob, **baseline_fields},
        "components": {"production_identity": production, "docs_drift": docs},
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }
