from __future__ import annotations

import re
from typing import Any

from .docs_drift import check_docs_drift
from .github_reader import GitHubReadError
from .production_identity import verify_production_identity

_VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
_PROFILE_DIR = "products/simcore/releases/validation-profiles"
_REQUIRED_CONTRACTS = (
    "reload-cache-continuity",
    "operator-release-card",
    "host-local-telemetry",
    "bounded-telemetry-capsule",
)
_SUPPORTED_MODES = frozenset(
    {
        "INHERIT_BEHAVIOR",
        "CURRENT_IDENTITY_INHERIT_BEHAVIOR",
        "EXACT_CURRENT_IDENTITY",
        "CHANGED_CONTRACT",
    }
)
_INHERITED_MODES = frozenset({"INHERIT_BEHAVIOR", "CURRENT_IDENTITY_INHERIT_BEHAVIOR"})
_EXACT_CURRENT_MODES = frozenset({"EXACT_CURRENT_IDENTITY", "CHANGED_CONTRACT"})


def _valid_version(value: Any) -> bool:
    return isinstance(value, str) and bool(_VERSION_RE.fullmatch(value))


def _version_tuple(value: str) -> tuple[int, int, int]:
    return tuple(int(part) for part in value.split("."))  # type: ignore[return-value]


def _nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


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


def _copy_component_errors(name: str, report: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in report.get("errors", []) if isinstance(report, dict) else []:
        if isinstance(item, dict):
            out.append({"component": name, **item})
        else:
            out.append({"component": name, "source": name, "message": str(item)})
    return out


def _validate_contracts(contracts: Any, target: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    observed: dict[str, Any] = {}
    violations: list[dict[str, Any]] = []
    if not isinstance(contracts, dict):
        return observed, violations

    for contract_id in sorted(contracts):
        contract = contracts[contract_id]
        issues: list[dict[str, str]] = []
        mode: Any = contract.get("mode") if isinstance(contract, dict) else None
        authority_version: Any = contract.get("authorityVersion") if isinstance(contract, dict) else None

        def issue(code: str, message: str) -> None:
            issues.append({"code": code, "message": message})

        if not isinstance(contract_id, str) or not contract_id:
            issue("VALIDATION_PROFILE_CONTRACT_INVALID", "contract id must be non-empty")
        if not isinstance(contract, dict):
            issue("VALIDATION_PROFILE_CONTRACT_INVALID", "contract must be an object")
        else:
            if mode not in _SUPPORTED_MODES:
                issue("VALIDATION_PROFILE_MODE_INVALID", "contract mode is not explicit/supported")
            if not _valid_version(authority_version):
                issue("VALIDATION_PROFILE_VERSION_INVALID", "authorityVersion must be an exact semantic version")
            if mode in _INHERITED_MODES and authority_version == target:
                issue("VALIDATION_PROFILE_INHERITANCE_SELF_REFERENCE", "inherited authority must name a predecessor")
            if mode in _EXACT_CURRENT_MODES and authority_version != target:
                issue("VALIDATION_PROFILE_EXACT_IDENTITY_CONTRADICTION", "exact-current authority must equal target")
            if mode == "CURRENT_IDENTITY_INHERIT_BEHAVIOR":
                identity = contract.get("authorityIdentity")
                if not isinstance(identity, dict) or not _nonempty(identity.get("releaseName")):
                    issue("VALIDATION_PROFILE_AUTHORITY_IDENTITY_MISSING", "authorityIdentity.releaseName is required")

            if "rejectVersions" in contract:
                reject_versions = contract.get("rejectVersions")
                if not isinstance(reject_versions, list):
                    issue("VALIDATION_PROFILE_REJECT_VERSIONS_INVALID", "rejectVersions must be an array")
                else:
                    seen: set[str] = set()
                    for version in reject_versions:
                        if not _valid_version(version):
                            issue("VALIDATION_PROFILE_VERSION_INVALID", "rejectVersions entries must be exact semantic versions")
                            continue
                        if version == target:
                            issue("VALIDATION_PROFILE_REJECT_CURRENT_IDENTITY", "contract cannot reject target releaseVersion")
                        if version in seen:
                            issue("VALIDATION_PROFILE_REJECT_VERSION_DUPLICATE", f"duplicate reject version: {version}")
                        seen.add(version)

        passed = not issues
        observed[contract_id] = {
            "pass": passed,
            "mode": mode,
            "authority_version": authority_version,
            "issues": issues,
        }
        if not passed:
            violations.append(
                {
                    "contract": contract_id,
                    "severity": "hard",
                    "issues": issues,
                }
            )

    return observed, violations


def release_preflight(reader: Any, version: str) -> dict[str, Any]:
    """Run a read-only SimCore release preflight for an exact target version."""
    checks: list[dict[str, Any]] = []
    violations: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    target_valid = _valid_version(version)
    _record_check(
        checks,
        violations,
        code="TARGET_VERSION_VALID",
        passed=target_valid,
        expected="exact X.Y.Z semantic version",
        actual=version,
        source="input:version",
    )

    production = verify_production_identity(reader)
    docs = check_docs_drift(reader)
    errors.extend(_copy_component_errors("production_identity", production))
    errors.extend(_copy_component_errors("docs_drift", docs))

    production_version = production.get("declared", {}).get("production_version") if isinstance(production, dict) else None
    production_version_valid = _valid_version(production_version)
    _record_check(
        checks,
        violations,
        code="PRODUCTION_VERSION_AVAILABLE",
        passed=production_version_valid,
        expected="exact X.Y.Z production version",
        actual=production_version,
        source="component:production_identity:declared.production_version",
    )

    advances = bool(
        target_valid
        and production_version_valid
        and _version_tuple(version) > _version_tuple(production_version)
    )
    _record_check(
        checks,
        violations,
        code="TARGET_ADVANCES_PRODUCTION",
        passed=advances,
        expected=f"> {production_version}" if production_version_valid else "target newer than production",
        actual=version if target_valid else None,
        source="input:version+component:production_identity",
    )

    profile_path = f"{_PROFILE_DIR}/{version}.json" if target_valid else None
    profile: dict[str, Any] | None = None
    profile_blob: str | None = None
    profile_errors: list[dict[str, Any]] = []
    if profile_path is not None:
        try:
            raw, profile_blob = reader.get_json_file(profile_path, reader.main_branch)
            if isinstance(raw, dict):
                profile = raw
            else:
                profile_errors.append({
                    "source": f"{reader.main_branch}:{profile_path}",
                    "message": "validation profile must be a JSON object",
                })
        except GitHubReadError as exc:
            profile_errors.append({"source": exc.source, "message": exc.message})
    errors.extend({"component": "validation_profile", **item} for item in profile_errors)

    profile_available = profile is not None
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_AVAILABLE",
        passed=profile_available,
        expected="readable JSON object",
        actual="available" if profile_available else None,
        source=f"{reader.main_branch}:{profile_path}" if profile_path else "input:version",
    )

    schema = profile.get("schemaVersion") if profile else None
    schema_ok = profile_available and schema == 1
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_SCHEMA_SUPPORTED",
        passed=schema_ok,
        expected=1,
        actual=schema,
        source=f"{profile_path}:schemaVersion" if profile_path else "input:version",
    )

    profile_version = profile.get("releaseVersion") if profile else None
    profile_version_ok = profile_available and target_valid and _valid_version(profile_version) and profile_version == version
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_VERSION_MATCH",
        passed=profile_version_ok,
        expected=version if target_valid else None,
        actual=profile_version,
        source=f"{profile_path}:releaseVersion" if profile_path else "input:version",
    )

    release_name = profile.get("releaseName") if profile else None
    name_ok = profile_available and _nonempty(release_name)
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_NAME_VALID",
        passed=name_ok,
        expected="non-empty string",
        actual=release_name,
        source=f"{profile_path}:releaseName" if profile_path else "input:version",
    )

    contracts = profile.get("contracts") if profile else None
    contracts_object = isinstance(contracts, dict)
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_CONTRACTS_OBJECT",
        passed=contracts_object,
        expected="object",
        actual=type(contracts).__name__ if contracts is not None else None,
        source=f"{profile_path}:contracts" if profile_path else "input:version",
    )

    missing_required = [contract for contract in _REQUIRED_CONTRACTS if not isinstance(contracts, dict) or contract not in contracts]
    required_ok = contracts_object and not missing_required
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_REQUIRED_CONTRACTS_PRESENT",
        passed=required_ok,
        expected=list(_REQUIRED_CONTRACTS),
        actual={"missing": missing_required},
        source=f"{profile_path}:contracts" if profile_path else "input:version",
    )

    observed_contracts, contract_violations = _validate_contracts(contracts, version) if target_valid else ({}, [])
    contracts_valid = contracts_object and not contract_violations
    _record_check(
        checks,
        violations,
        code="VALIDATION_PROFILE_CONTRACTS_VALID",
        passed=contracts_valid,
        expected="all declared contracts valid under canonical projected semantics",
        actual={"invalid_contracts": [item["contract"] for item in contract_violations]},
        source=f"{profile_path}:contracts" if profile_path else "input:version",
    )

    production_pass = bool(isinstance(production, dict) and production.get("pass") is True)
    _record_check(
        checks,
        violations,
        code="PRODUCTION_IDENTITY_PASS",
        passed=production_pass,
        expected=True,
        actual=production.get("pass") if isinstance(production, dict) else None,
        source="component:production_identity",
    )

    docs_pass = bool(isinstance(docs, dict) and docs.get("pass") is True)
    _record_check(
        checks,
        violations,
        code="DOCS_DRIFT_PASS",
        passed=docs_pass,
        expected=True,
        actual=docs.get("pass") if isinstance(docs, dict) else None,
        source="component:docs_drift",
    )

    profile_report = {
        "pass": profile_available and schema_ok and profile_version_ok and name_ok and required_ok and contracts_valid and not profile_errors,
        "path": profile_path,
        "blob": profile_blob,
        "release_version": profile_version,
        "release_name": release_name,
        "required_contracts": list(_REQUIRED_CONTRACTS),
        "contracts": observed_contracts,
        "violations": contract_violations,
        "errors": profile_errors,
    }

    return {
        "ready": not errors and not violations,
        "repository": reader.repository,
        "target": {
            "version": version,
            "profile_path": profile_path,
            "production_version": production_version,
        },
        "components": {
            "production_identity": production,
            "docs_drift": docs,
            "validation_profile": profile_report,
        },
        "checks": checks,
        "violations": violations,
        "errors": errors,
    }
