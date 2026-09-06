from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError

_CLASSIFICATIONS = ("FIX", "WATCH", "BLOCKER", "DEFER")
_EXPLICIT_CLASSIFICATION = re.compile(
    r"(?im)^\s*(?:classification\s*:\s*)?(FIX|WATCH|BLOCKER|DEFER)\b"
)
_TITLE_CLASSIFICATION = re.compile(r"(?i)^\s*\[?(FIX|WATCH|BLOCKER|DEFER)\]?\b")


def _error(errors: list[dict[str, str]], source: str, message: str) -> None:
    errors.append({"source": source, "message": message})


def _drift(
    drift: list[dict[str, Any]],
    code: str,
    expected: Any,
    actual: Any,
    source: str,
) -> None:
    drift.append(
        {
            "code": code,
            "severity": "hard",
            "source": source,
            "expected": expected,
            "actual": actual,
        }
    )


def _classify_issue(issue: dict[str, Any]) -> str | None:
    labels = issue.get("labels")
    if isinstance(labels, list):
        for label in labels:
            if isinstance(label, dict):
                name = str(label.get("name", "")).upper().strip()
            else:
                name = str(label).upper().strip()
            for classification in _CLASSIFICATIONS:
                if name == classification or name.startswith(f"{classification}:"):
                    return classification

    title = str(issue.get("title") or "")
    match = _TITLE_CLASSIFICATION.search(title)
    if match:
        return match.group(1).upper()

    body = str(issue.get("body") or "")
    match = _EXPLICIT_CLASSIFICATION.search(body)
    if match:
        return match.group(1).upper()
    return None


def _tracking(issues: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {
        "fix": [],
        "watch": [],
        "blocker": [],
        "defer": [],
        "unclassified": [],
    }
    for issue in issues:
        item = {
            "number": issue.get("number"),
            "title": issue.get("title"),
            "url": issue.get("html_url"),
            "updated_at": issue.get("updated_at"),
        }
        classification = _classify_issue(issue)
        key = classification.lower() if classification else "unclassified"
        result[key].append(item)
    return result


def build_status(reader: Any) -> dict[str, Any]:
    """Aggregate SimCore authorities without mutating any source."""

    errors: list[dict[str, str]] = []
    drift: list[dict[str, Any]] = []

    main_branch = getattr(reader, "main_branch", "main")
    configured_release_branch = getattr(reader, "release_branch", "release-simcore")
    repository = getattr(reader, "repository", "unknown")

    main_sha: str | None = None
    release_sha: str | None = None
    manifest: dict[str, Any] | None = None
    manifest_blob: str | None = None
    issues: list[dict[str, Any]] = []

    try:
        main_sha = reader.get_branch_sha(main_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    try:
        manifest, manifest_blob = reader.get_json_file("product-manifest.json", main_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    release_branch = configured_release_branch
    if manifest is not None:
        declared_release_branch = manifest.get("release_branch")
        if isinstance(declared_release_branch, str) and declared_release_branch.strip():
            release_branch = declared_release_branch.strip()

    try:
        release_sha = reader.get_branch_sha(release_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    production_files = {
        "latest": "plugins/simcore/latest.js",
        "install": "plugins/simcore/install.js",
        "expected_identical": True,
    }
    if manifest is not None:
        raw_files = manifest.get("production_files")
        if isinstance(raw_files, dict):
            for key in ("latest", "install", "expected_identical"):
                if key in raw_files:
                    production_files[key] = raw_files[key]

    latest_blob: str | None = None
    install_blob: str | None = None
    latest_path = production_files.get("latest")
    install_path = production_files.get("install")

    if isinstance(latest_path, str) and latest_path:
        try:
            _, latest_blob = reader.get_file(latest_path, release_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)
    else:
        _error(errors, "manifest:production_files.latest", "missing or invalid path")

    if isinstance(install_path, str) and install_path:
        try:
            _, install_blob = reader.get_file(install_path, release_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)
    else:
        _error(errors, "manifest:production_files.install", "missing or invalid path")

    try:
        issues = reader.list_open_issues()
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    expected_identical = bool(production_files.get("expected_identical", True))
    identical = latest_blob is not None and install_blob is not None and latest_blob == install_blob

    if manifest is None:
        _drift(drift, "MANIFEST_UNAVAILABLE", "valid product-manifest.json", None, "main")
    else:
        declared_release_commit = manifest.get("release_commit")
        if not isinstance(declared_release_commit, str) or not declared_release_commit:
            _drift(drift, "MANIFEST_RELEASE_COMMIT_INVALID", "non-empty sha", declared_release_commit, "manifest")
        elif release_sha is not None and declared_release_commit != release_sha:
            _drift(drift, "RELEASE_COMMIT_MISMATCH", declared_release_commit, release_sha, "release-simcore")

        declared_release_blob = manifest.get("release_blob")
        if not isinstance(declared_release_blob, str) or not declared_release_blob:
            _drift(drift, "MANIFEST_RELEASE_BLOB_INVALID", "non-empty blob sha", declared_release_blob, "manifest")
        elif latest_blob is not None and declared_release_blob != latest_blob:
            _drift(drift, "RELEASE_BLOB_MISMATCH", declared_release_blob, latest_blob, "latest.js")

    if expected_identical and latest_blob is not None and install_blob is not None and not identical:
        _drift(drift, "PRODUCTION_FILE_PARITY_MISMATCH", latest_blob, install_blob, "latest.js/install.js")

    production = {
        "version": manifest.get("production_version") if manifest else None,
        "name": manifest.get("release_name") if manifest else None,
        "manifest_release_commit": manifest.get("release_commit") if manifest else None,
        "manifest_release_blob": manifest.get("release_blob") if manifest else None,
        "manifest_blob": manifest_blob,
        "actual_blob": latest_blob,
    }
    validation = {
        "status": manifest.get("validation_status") if manifest else None,
        "priority": manifest.get("current_priority") if manifest else None,
        "milestone": manifest.get("major_update_milestone") if manifest else None,
        "phase": manifest.get("major_update_phase") if manifest else None,
        "checkpoint": manifest.get("major_update_checkpoint") if manifest else None,
    }

    return {
        "ok": not errors and not drift,
        "repository": repository,
        "main": {"branch": main_branch, "sha": main_sha},
        "release": {"branch": release_branch, "sha": release_sha},
        "production": production,
        "parity": {
            "expected_identical": expected_identical,
            "latest_path": latest_path,
            "install_path": install_path,
            "latest_blob": latest_blob,
            "install_blob": install_blob,
            "identical": identical,
        },
        "validation": validation,
        "tracking": _tracking(issues),
        "drift": drift,
        "errors": errors,
    }
