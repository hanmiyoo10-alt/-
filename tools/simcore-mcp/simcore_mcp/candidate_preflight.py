from __future__ import annotations

import re
from typing import Any

from .candidate_snapshot import candidate_snapshot
from .github_reader import GitHubReadError
from .release_preflight import release_preflight

_VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")


class _PinnedReader:
    """Read-only adapter that freezes configured main/release branch reads to exact SHAs."""

    def __init__(self, reader: Any, main_sha: str, release_sha: str) -> None:
        self._reader = reader
        self._main_sha = main_sha
        self._release_sha = release_sha

    @property
    def repository(self) -> str:
        return self._reader.repository

    @property
    def main_branch(self) -> str:
        return self._reader.main_branch

    @property
    def release_branch(self) -> str:
        return self._reader.release_branch

    def _pin_ref(self, ref: str) -> str:
        if ref == self.main_branch:
            return self._main_sha
        if ref == self.release_branch:
            return self._release_sha
        return ref

    def get_branch_sha(self, branch: str) -> str:
        if branch == self.main_branch:
            return self._main_sha
        if branch == self.release_branch:
            return self._release_sha
        return self._reader.get_branch_sha(branch)

    def get_file(self, path: str, ref: str) -> tuple[str, str]:
        return self._reader.get_file(path, self._pin_ref(ref))

    def get_json_file(self, path: str, ref: str) -> tuple[dict[str, Any], str]:
        return self._reader.get_json_file(path, self._pin_ref(ref))

    def get_commit(self, ref: str) -> dict[str, Any]:
        return self._reader.get_commit(ref)

    def compare_commits(self, base: str, head: str) -> dict[str, Any]:
        return self._reader.compare_commits(base, head)


def _is_exact_version(value: Any) -> bool:
    return isinstance(value, str) and _VERSION_RE.fullmatch(value) is not None


def _is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _error(errors: list[dict[str, str]], source: str, message: str) -> None:
    errors.append({"source": source, "message": message})


def _copy_component_errors(
    errors: list[dict[str, str]],
    component: str,
    report: Any,
) -> None:
    if not isinstance(report, dict):
        return
    raw_errors = report.get("errors")
    if not isinstance(raw_errors, list):
        return
    for item in raw_errors:
        if not isinstance(item, dict):
            continue
        source = item.get("source")
        message = item.get("message")
        _error(
            errors,
            f"{component}:{source}" if _is_nonempty_string(source) else component,
            str(message) if message is not None else "component error",
        )


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


def _not_executed_preflight() -> dict[str, Any]:
    return {
        "executed": False,
        "ready": False,
        "target": {"version": None},
        "components": {},
        "checks": [],
        "violations": [],
        "errors": [],
    }


def candidate_preflight(reader: Any, ref: str) -> dict[str, Any]:
    """Compose candidate snapshot and release preflight under frozen read-only authority."""
    checks: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    requested_ref = ref
    main_sha: str | None = None
    release_sha: str | None = None

    try:
        main_sha = reader.get_branch_sha(reader.main_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    try:
        release_sha = reader.get_branch_sha(reader.release_branch)
    except GitHubReadError as exc:
        _error(errors, exc.source, exc.message)

    snapshot: dict[str, Any] | None = None
    preflight: dict[str, Any] = _not_executed_preflight()

    if main_sha is not None and release_sha is not None:
        pinned = _PinnedReader(reader, main_sha, release_sha)
        snapshot = candidate_snapshot(pinned, requested_ref)
        _copy_component_errors(errors, "candidate_snapshot", snapshot)

    snapshot_dict = snapshot if isinstance(snapshot, dict) else {}
    identity = snapshot_dict.get("identity") if isinstance(snapshot_dict.get("identity"), dict) else {}
    latest_identity = identity.get("latest") if isinstance(identity.get("latest"), dict) else {}
    candidate_version = latest_identity.get("userscript_version")
    candidate_release_name = latest_identity.get("release_name")
    version_valid = _is_exact_version(candidate_version)

    if snapshot is not None and not version_valid:
        _error(
            errors,
            "candidate_target_version",
            "candidate latest userscript version is missing or not exact X.Y.Z",
        )

    if main_sha is not None and release_sha is not None and version_valid:
        pinned = _PinnedReader(reader, main_sha, release_sha)
        raw_preflight = release_preflight(pinned, candidate_version)
        if isinstance(raw_preflight, dict):
            preflight = {"executed": True, **raw_preflight}
        else:
            preflight = {
                "executed": True,
                "ready": False,
                "target": {"version": candidate_version},
                "components": {},
                "checks": [],
                "violations": [],
                "errors": [],
            }
            _error(errors, "release_preflight", "component returned non-object report")
        _copy_component_errors(errors, "release_preflight", preflight)

    resolved = snapshot_dict.get("resolved") if isinstance(snapshot_dict.get("resolved"), dict) else {}
    candidate_sha = resolved.get("sha")
    canonical = (
        snapshot_dict.get("canonical_candidate_shape")
        if isinstance(snapshot_dict.get("canonical_candidate_shape"), dict)
        else {}
    )
    production_context = (
        snapshot_dict.get("production_context")
        if isinstance(snapshot_dict.get("production_context"), dict)
        else {}
    )
    snapshot_profile = (
        snapshot_dict.get("validation_profile_context")
        if isinstance(snapshot_dict.get("validation_profile_context"), dict)
        else {}
    )

    preflight_target = preflight.get("target") if isinstance(preflight.get("target"), dict) else {}
    preflight_components = (
        preflight.get("components") if isinstance(preflight.get("components"), dict) else {}
    )
    profile_report = (
        preflight_components.get("validation_profile")
        if isinstance(preflight_components.get("validation_profile"), dict)
        else {}
    )
    production_report = (
        preflight_components.get("production_identity")
        if isinstance(preflight_components.get("production_identity"), dict)
        else {}
    )
    production_release = (
        production_report.get("release")
        if isinstance(production_report.get("release"), dict)
        else {}
    )

    snapshot_ok = snapshot_dict.get("ok") is True
    canonical_pass = canonical.get("pass") is True
    preflight_ready = preflight.get("executed") is True and preflight.get("ready") is True
    preflight_version = preflight_target.get("version")
    profile_release_name = profile_report.get("release_name")
    snapshot_profile_blob = snapshot_profile.get("blob")
    preflight_profile_blob = profile_report.get("blob")
    snapshot_main_sha = production_context.get("main_sha")
    snapshot_release_sha = production_context.get("release_head")
    preflight_release_sha = production_release.get("sha")

    _record_check(
        checks,
        violations,
        code="CANDIDATE_SNAPSHOT_OK",
        passed=snapshot_ok,
        expected=True,
        actual=snapshot_dict.get("ok") if snapshot is not None else None,
        source="component:candidate_snapshot",
    )
    _record_check(
        checks,
        violations,
        code="CANDIDATE_CANONICAL_SHAPE_PASS",
        passed=canonical_pass,
        expected=True,
        actual=canonical.get("pass"),
        source="component:candidate_snapshot:canonical_candidate_shape",
    )
    _record_check(
        checks,
        violations,
        code="CANDIDATE_TARGET_VERSION_VALID",
        passed=version_valid,
        expected="exact X.Y.Z",
        actual=candidate_version,
        source="component:candidate_snapshot:identity.latest.userscript_version",
    )
    _record_check(
        checks,
        violations,
        code="RELEASE_PREFLIGHT_READY",
        passed=preflight_ready,
        expected=True,
        actual=preflight.get("ready") if preflight.get("executed") is True else None,
        source="component:release_preflight",
    )
    _record_check(
        checks,
        violations,
        code="CANDIDATE_VERSION_MATCHES_PREFLIGHT_TARGET",
        passed=version_valid and preflight.get("executed") is True and preflight_version == candidate_version,
        expected=candidate_version if version_valid else None,
        actual=preflight_version,
        source="candidate:version+component:release_preflight:target.version",
    )
    _record_check(
        checks,
        violations,
        code="CANDIDATE_RELEASE_NAME_MATCHES_PROFILE",
        passed=(
            _is_nonempty_string(candidate_release_name)
            and _is_nonempty_string(profile_release_name)
            and candidate_release_name == profile_release_name
        ),
        expected=candidate_release_name if _is_nonempty_string(candidate_release_name) else None,
        actual=profile_release_name,
        source="candidate:release_name+component:release_preflight:validation_profile.release_name",
    )
    _record_check(
        checks,
        violations,
        code="CANDIDATE_PROFILE_BLOB_MATCHES_PREFLIGHT",
        passed=(
            _is_nonempty_string(snapshot_profile_blob)
            and _is_nonempty_string(preflight_profile_blob)
            and snapshot_profile_blob == preflight_profile_blob
        ),
        expected=snapshot_profile_blob if _is_nonempty_string(snapshot_profile_blob) else None,
        actual=preflight_profile_blob,
        source="component:candidate_snapshot:validation_profile_context.blob+component:release_preflight:validation_profile.blob",
    )
    _record_check(
        checks,
        violations,
        code="SNAPSHOT_MAIN_MATCHES_FROZEN_AUTHORITY",
        passed=main_sha is not None and snapshot_main_sha == main_sha,
        expected=main_sha,
        actual=snapshot_main_sha,
        source="authority:main_sha+component:candidate_snapshot:production_context.main_sha",
    )
    _record_check(
        checks,
        violations,
        code="SNAPSHOT_RELEASE_MATCHES_FROZEN_AUTHORITY",
        passed=release_sha is not None and snapshot_release_sha == release_sha,
        expected=release_sha,
        actual=snapshot_release_sha,
        source="authority:release_sha+component:candidate_snapshot:production_context.release_head",
    )
    _record_check(
        checks,
        violations,
        code="PREFLIGHT_RELEASE_MATCHES_FROZEN_AUTHORITY",
        passed=release_sha is not None and preflight_release_sha == release_sha,
        expected=release_sha,
        actual=preflight_release_sha,
        source="authority:release_sha+component:release_preflight:production_identity.release.sha",
    )

    return {
        "ready": not errors and not violations,
        "repository": reader.repository,
        "requested_ref": requested_ref,
        "authority": {
            "main_sha": main_sha,
            "release_sha": release_sha,
            "candidate_sha": candidate_sha,
        },
        "target": {
            "version": candidate_version if version_valid else None,
            "release_name": candidate_release_name,
        },
        "components": {
            "candidate_snapshot": snapshot,
            "release_preflight": preflight,
        },
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }


def build_candidate_preflight(reader: Any, ref: str) -> dict[str, Any]:
    return candidate_preflight(reader, ref)
