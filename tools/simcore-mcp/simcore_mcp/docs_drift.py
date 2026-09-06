from __future__ import annotations

import re
from typing import Any

from .github_reader import GitHubReadError

_SNAPSHOT_BEGIN = "<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->"
_SNAPSHOT_END = "<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->"
_RELEASE_BEGIN_RE = re.compile(r"<!-- SIMCORE_RELEASE_STATE:([^:]+):BEGIN -->")
_RELEASE_END_RE = re.compile(r"<!-- SIMCORE_RELEASE_STATE:([^:]+):END -->")
_BULLET_RE = re.compile(r"(?m)^-\s+([^:\n]+):\s*(.*?)\s*$")
_VERSION_RE = re.compile(r"\bv0\.\d+\.\d+\b")
_HEX40_RE = re.compile(r"\b[0-9a-f]{40}\b", re.IGNORECASE)

_SNAPSHOT_FIELDS = (
    ("SNAPSHOT_PRODUCT_MATCH", "Product", "product"),
    ("SNAPSHOT_VERSION_MATCH", "Version", "production_version"),
    ("SNAPSHOT_RELEASE_NAME_MATCH", "Release", "release_name"),
    ("SNAPSHOT_RELEASE_BRANCH_MATCH", "Release branch", "release_branch"),
    ("SNAPSHOT_RELEASE_COMMIT_MATCH", "Release commit", "release_commit"),
    ("SNAPSHOT_RELEASE_BLOB_MATCH", "Release blob", "release_blob"),
    ("SNAPSHOT_VALIDATION_STATUS_MATCH", "Declared validation status", "validation_status"),
    ("SNAPSHOT_MILESTONE_MATCH", "Major update milestone", "major_update_milestone"),
    ("SNAPSHOT_PHASE_MATCH", "Major update phase", "major_update_phase"),
    ("SNAPSHOT_CHECKPOINT_MATCH", "Major update checkpoint", "major_update_checkpoint"),
)


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


def _strip_md_value(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value.startswith("`") and value.endswith("`"):
        value = value[1:-1].strip()
    return value


def _parse_bullets(block: str | None) -> dict[str, str]:
    if block is None:
        return {}
    return {match.group(1).strip(): _strip_md_value(match.group(2)) for match in _BULLET_RE.finditer(block)}


def _extract_exact_block(text: str, begin: str, end: str) -> tuple[str | None, bool]:
    begin_count = text.count(begin)
    end_count = text.count(end)
    if begin_count != 1 or end_count != 1:
        return None, False
    start = text.index(begin) + len(begin)
    finish = text.index(end, start)
    if finish < start:
        return None, False
    return text[start:finish], True


def _extract_release_state(text: str) -> tuple[str | None, str | None, bool]:
    begins = list(_RELEASE_BEGIN_RE.finditer(text))
    ends = list(_RELEASE_END_RE.finditer(text))
    if len(begins) != 1 or len(ends) != 1:
        return None, None, False
    begin = begins[0]
    end = ends[0]
    mode = begin.group(1)
    if mode != end.group(1) or end.start() <= begin.end():
        return None, mode, False
    return text[begin.end():end.start()], mode, True


def _active_human_section(text: str) -> str | None:
    start_marker = "# 1. Current Operational State"
    start = text.find(start_marker)
    if start < 0:
        return None
    historical = text.find("## Historical validated precursor", start)
    fallback = text.find("# 2.", start)
    end = historical if historical >= 0 else fallback
    if end <= start:
        return None
    return text[start:end]


def _expected_text(value: Any) -> str | None:
    if not _is_nonempty_string(value):
        return None
    return value.strip()


def check_docs_drift(reader: Any) -> dict[str, Any]:
    """Verify SimCore current-document authority against manifest-owned state."""
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

    declared = {
        key: manifest.get(key) if manifest else None
        for key in (
            "product",
            "production_version",
            "release_name",
            "release_branch",
            "release_commit",
            "release_blob",
            "validation_status",
            "major_update_milestone",
            "major_update_phase",
            "major_update_checkpoint",
            "current_priority",
        )
    }
    development_memory_path = manifest.get("development_memory") if manifest else None
    path_valid = _is_nonempty_string(development_memory_path)
    _record_check(
        checks,
        violations,
        code="DEVELOPMENT_MEMORY_PATH_VALID",
        passed=path_valid,
        expected="non-empty manifest development_memory path",
        actual=development_memory_path,
        source="manifest:development_memory",
    )

    document_text: str | None = None
    document_blob: str | None = None
    if path_valid:
        try:
            document_text, document_blob = reader.get_file(development_memory_path, reader.main_branch)
        except GitHubReadError as exc:
            _error(errors, exc.source, exc.message)

    _record_check(
        checks,
        violations,
        code="DEVELOPMENT_MEMORY_AVAILABLE",
        passed=document_text is not None,
        expected="readable UTF-8 document",
        actual="available" if document_text is not None else None,
        source=f"{reader.main_branch}:{development_memory_path}" if path_valid else "manifest:development_memory",
    )

    snapshot_block: str | None = None
    snapshot_markers_valid = False
    if document_text is not None:
        snapshot_block, snapshot_markers_valid = _extract_exact_block(document_text, _SNAPSHOT_BEGIN, _SNAPSHOT_END)
    _record_check(
        checks,
        violations,
        code="PRODUCTION_SNAPSHOT_MARKERS_UNIQUE",
        passed=snapshot_markers_valid,
        expected="exactly one ordered begin/end marker pair",
        actual={
            "begin_count": document_text.count(_SNAPSHOT_BEGIN) if document_text is not None else 0,
            "end_count": document_text.count(_SNAPSHOT_END) if document_text is not None else 0,
        },
        source=f"{development_memory_path}:production-snapshot" if path_valid else "manifest:development_memory",
    )
    snapshot = _parse_bullets(snapshot_block)

    for code, label, manifest_key in _SNAPSHOT_FIELDS:
        expected = _expected_text(declared.get(manifest_key))
        actual = snapshot.get(label)
        _record_check(
            checks,
            violations,
            code=code,
            passed=snapshot_markers_valid and expected is not None and actual == expected,
            expected=expected,
            actual=actual,
            source=f"{development_memory_path}:production-snapshot:{label}" if path_valid else "manifest:development_memory",
        )

    release_block: str | None = None
    release_state_mode: str | None = None
    release_markers_valid = False
    if document_text is not None:
        release_block, release_state_mode, release_markers_valid = _extract_release_state(document_text)
    _record_check(
        checks,
        violations,
        code="RELEASE_STATE_MARKERS_VALID",
        passed=release_markers_valid,
        expected="exactly one ordered begin/end pair with matching mode",
        actual={"mode": release_state_mode},
        source=f"{development_memory_path}:release-state" if path_valid else "manifest:development_memory",
    )
    release_state = _parse_bullets(release_block)

    expected_commit = _expected_text(declared.get("release_commit"))
    actual_commit = release_state.get("Production commit")
    _record_check(
        checks,
        violations,
        code="RELEASE_STATE_COMMIT_MATCH",
        passed=release_markers_valid and expected_commit is not None and actual_commit == expected_commit,
        expected=expected_commit,
        actual=actual_commit,
        source=f"{development_memory_path}:release-state:Production commit" if path_valid else "manifest:development_memory",
    )

    expected_validation = _expected_text(declared.get("validation_status"))
    actual_validation = release_state.get("Validation status")
    _record_check(
        checks,
        violations,
        code="RELEASE_STATE_VALIDATION_MATCH",
        passed=release_markers_valid and expected_validation is not None and actual_validation == expected_validation,
        expected=expected_validation,
        actual=actual_validation,
        source=f"{development_memory_path}:release-state:Validation status" if path_valid else "manifest:development_memory",
    )

    active = _active_human_section(document_text) if document_text is not None else None
    active_available = active is not None
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_SECTION_AVAILABLE",
        passed=active_available,
        expected="bounded active human current-state section",
        actual="available" if active_available else None,
        source=f"{development_memory_path}:active-human" if path_valid else "manifest:development_memory",
    )

    has_guide = active_available and "## How to read current operational state" in active
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_GUIDE_PRESENT",
        passed=has_guide,
        expected=True,
        actual=has_guide,
        source=f"{development_memory_path}:active-human",
    )

    has_production_verdict = active_available and "## Production verdict" in active
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_PRODUCTION_VERDICT_ABSENT",
        passed=active_available and not has_production_verdict,
        expected=False,
        actual=has_production_verdict,
        source=f"{development_memory_path}:active-human",
    )

    version_literals = sorted(set(_VERSION_RE.findall(active or "")))
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_VERSION_LITERAL_ABSENT",
        passed=active_available and not version_literals,
        expected=[],
        actual=version_literals,
        source=f"{development_memory_path}:active-human",
    )

    hex40_literals = sorted(set(match.group(0) for match in _HEX40_RE.finditer(active or "")))
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_40HEX_LITERAL_ABSENT",
        passed=active_available and not hex40_literals,
        expected=[],
        actual=hex40_literals,
        source=f"{development_memory_path}:active-human",
    )

    current_priority = _expected_text(declared.get("current_priority"))
    duplicates_current_priority = bool(active_available and current_priority and current_priority in active)
    _record_check(
        checks,
        violations,
        code="ACTIVE_HUMAN_CURRENT_PRIORITY_LITERAL_ABSENT",
        passed=active_available and current_priority is not None and not duplicates_current_priority,
        expected=False,
        actual=duplicates_current_priority if current_priority is not None else None,
        source=f"{development_memory_path}:active-human",
    )

    return {
        "pass": not errors and not violations,
        "repository": reader.repository,
        "main": {
            "branch": reader.main_branch,
            "manifest_blob": manifest_blob,
            "development_memory_path": development_memory_path,
            "development_memory_blob": document_blob,
        },
        "declared": declared,
        "observed": {
            "production_snapshot": snapshot,
            "release_state_mode": release_state_mode,
            "release_state": release_state,
            "active_human": {
                "available": active_available,
                "has_guide": bool(has_guide),
                "has_production_verdict": bool(has_production_verdict),
                "version_literals": version_literals,
                "hex40_literals": hex40_literals,
                "duplicates_current_priority": duplicates_current_priority,
            },
        },
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }
