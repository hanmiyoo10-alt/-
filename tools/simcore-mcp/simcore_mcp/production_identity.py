from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError

_VERSION_LINE = re.compile(r"(?m)^//@version[ \t]+([^\r\n]+?)[ \t]*$")


def _is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _error(errors: list[dict[str, str]], source: str, message: str) -> None:
    errors.append({"source": source, "message": message})


def _record_check(
    checks: list[dict[str, Any]],
    violations: list[dict[str, Any]],
    *,
    code: str,
    passed: bool,
    expected: Any,
    actual: Any,
    source: str,
) -> None:
    item = {
        "code": code,
        "pass": bool(passed),
        "expected": expected,
        "actual": actual,
        "source": source,
    }
    checks.append(item)
    if not passed:
        violations.append({**item, "severity": "hard"})


def _parse_userscript_version(text: str) -> str | None:
    matches = [match.group(1).strip() for match in _VERSION_LINE.finditer(text)]
    if len(matches) != 1 or not matches[0]:
        return None
    return matches[0]


def verify_production_identity(reader: Any) -> dict[str, Any]:
    """Verify manifest-to-deployed SimCore production identity without mutation."""
    checks: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    manifest: dict[str, Any] | None = None
    manifest_blob: str | None = None

    try:
        manifest, manifest_blob = reader.get_json_file("product-manifest.json", reader.main_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    _record_check(
        checks,
        violations,
        code="MANIFEST_AVAILABLE",
        passed=manifest is not None,
        expected="readable JSON object",
        actual="available" if manifest is not None else None,
        source=f"{reader.main_branch}:product-manifest.json",
    )

    production_version = manifest.get("production_version") if manifest else None
    release_branch = manifest.get("release_branch") if manifest else None
    release_commit = manifest.get("release_commit") if manifest else None
    release_blob = manifest.get("release_blob") if manifest else None
    production_files = manifest.get("production_files") if manifest else None
    if not isinstance(production_files, dict):
        production_files = {}

    latest_path = production_files.get("latest")
    install_path = production_files.get("install")
    expected_identical_raw = production_files.get("expected_identical")
    expected_identical = expected_identical_raw is not False

    version_valid = _is_nonempty_string(production_version)
    release_branch_valid = _is_nonempty_string(release_branch)
    release_commit_valid = _is_nonempty_string(release_commit)
    release_blob_valid = _is_nonempty_string(release_blob)
    latest_path_valid = _is_nonempty_string(latest_path)
    install_path_valid = _is_nonempty_string(install_path)

    for code, passed, actual, source in (
        ("PRODUCTION_VERSION_VALID", version_valid, production_version, "manifest:production_version"),
        ("RELEASE_BRANCH_VALID", release_branch_valid, release_branch, "manifest:release_branch"),
        ("RELEASE_COMMIT_VALID", release_commit_valid, release_commit, "manifest:release_commit"),
        ("RELEASE_BLOB_VALID", release_blob_valid, release_blob, "manifest:release_blob"),
        ("LATEST_PATH_VALID", latest_path_valid, latest_path, "manifest:production_files.latest"),
        ("INSTALL_PATH_VALID", install_path_valid, install_path, "manifest:production_files.install"),
    ):
        _record_check(
            checks,
            violations,
            code=code,
            passed=passed,
            expected="non-empty string",
            actual=actual,
            source=source,
        )

    actual_release_head: str | None = None
    if release_branch_valid:
        try:
            actual_release_head = reader.get_branch_sha(release_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)

    _record_check(
        checks,
        violations,
        code="RELEASE_HEAD_MATCH",
        passed=release_commit_valid and actual_release_head is not None and release_commit == actual_release_head,
        expected=release_commit if release_commit_valid else None,
        actual=actual_release_head,
        source=f"branch:{release_branch}" if release_branch_valid else "manifest:release_branch",
    )

    latest_text: str | None = None
    latest_blob: str | None = None
    install_text: str | None = None
    install_blob: str | None = None

    if release_branch_valid and latest_path_valid:
        try:
            latest_text, latest_blob = reader.get_file(latest_path, release_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)

    if release_branch_valid and install_path_valid:
        try:
            install_text, install_blob = reader.get_file(install_path, release_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)

    _record_check(
        checks,
        violations,
        code="RELEASE_BLOB_MATCH",
        passed=release_blob_valid and latest_blob is not None and release_blob == latest_blob,
        expected=release_blob if release_blob_valid else None,
        actual=latest_blob,
        source=f"{release_branch}:{latest_path}"
        if release_branch_valid and latest_path_valid
        else "manifest:production_files.latest",
    )

    parity_pass = True
    if expected_identical:
        parity_pass = latest_blob is not None and install_blob is not None and latest_blob == install_blob
    _record_check(
        checks,
        violations,
        code="PRODUCTION_FILE_PARITY",
        passed=parity_pass,
        expected="identical" if expected_identical else "not required",
        actual={
            "latest_blob": latest_blob,
            "install_blob": install_blob,
            "identical": latest_blob is not None and install_blob is not None and latest_blob == install_blob,
        },
        source="manifest:production_files.expected_identical",
    )

    latest_version: str | None = None
    if latest_text is not None:
        latest_version = _parse_userscript_version(latest_text)
        if latest_version is None:
            _error(
                errors,
                f"version:{release_branch}:{latest_path}",
                "missing or ambiguous userscript //@version metadata",
            )

    install_version: str | None = None
    if install_text is not None:
        install_version = _parse_userscript_version(install_text)
        if install_version is None:
            _error(
                errors,
                f"version:{release_branch}:{install_path}",
                "missing or ambiguous userscript //@version metadata",
            )

    _record_check(
        checks,
        violations,
        code="LATEST_VERSION_MATCH",
        passed=version_valid and latest_version is not None and production_version == latest_version,
        expected=production_version if version_valid else None,
        actual=latest_version,
        source=f"{release_branch}:{latest_path}:userscript-version"
        if release_branch_valid and latest_path_valid
        else "manifest:production_files.latest",
    )
    _record_check(
        checks,
        violations,
        code="INSTALL_VERSION_MATCH",
        passed=version_valid and install_version is not None and production_version == install_version,
        expected=production_version if version_valid else None,
        actual=install_version,
        source=f"{release_branch}:{install_path}:userscript-version"
        if release_branch_valid and install_path_valid
        else "manifest:production_files.install",
    )

    return {
        "pass": not errors and not violations,
        "repository": reader.repository,
        "main": {
            "branch": reader.main_branch,
            "manifest_blob": manifest_blob,
        },
        "release": {
            "branch": release_branch if release_branch_valid else None,
            "sha": actual_release_head,
        },
        "declared": {
            "production_version": production_version,
            "release_branch": release_branch,
            "release_commit": release_commit,
            "release_blob": release_blob,
            "latest_path": latest_path,
            "install_path": install_path,
            "expected_identical": expected_identical_raw,
        },
        "observed": {
            "latest_blob": latest_blob,
            "install_blob": install_blob,
            "latest_version": latest_version,
            "install_version": install_version,
        },
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }
