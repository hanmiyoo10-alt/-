from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from canonical import canonical_json_bytes, canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from schema_validation import ContractValidationError, validate_contract

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
CONTRACT_ROOT = PACKAGE_ROOT / "role-contracts"


class RoleContractError(ValueError):
    pass


def load_role_contract(filename: str, expected_id: str, expected_role: str) -> dict[str, Any]:
    path = CONTRACT_ROOT / filename
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise RoleContractError(f"{expected_role} contract must be a JSON object")
    if value.get("schema_version") != 1 or value.get("contract_id") != expected_id or value.get("role") != expected_role:
        raise RoleContractError(f"{expected_role} contract identity changed")
    return value


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise RoleContractError(f"duplicate JSON key: {key}")
        value[key] = item
    return value


def parse_wire(content: str, *, max_wire_bytes: int, role: str) -> Any:
    if not isinstance(content, str) or not content.strip():
        raise RoleContractError(f"{role} response is empty")
    if len(content.encode("utf-8")) > max_wire_bytes:
        raise RoleContractError(f"{role} response exceeds compact wire byte ceiling")
    try:
        return json.loads(content, object_pairs_hook=unique_object)
    except json.JSONDecodeError as exc:
        raise RoleContractError(f"{role} response is not exact JSON: {exc}") from exc


def enforce_canonical_ceiling(value: Any, *, max_wire_bytes: int, role: str) -> None:
    if len(canonical_json_bytes(value)) > max_wire_bytes:
        raise RoleContractError(f"{role} canonical response exceeds compact wire byte ceiling")


def validate_short_text(value: Any, *, label: str, max_bytes: int) -> str:
    if not isinstance(value, str) or not value or len(value.encode("utf-8")) > max_bytes:
        raise RoleContractError(f"{label} must be non-empty UTF-8 text within {max_bytes} bytes")
    return value


def validate_refs(
    refs: Any,
    *,
    known_refs: Iterable[str],
    label: str,
    max_refs: int,
    min_refs: int = 0,
) -> list[str]:
    if not isinstance(refs, list) or not (min_refs <= len(refs) <= max_refs):
        raise RoleContractError(f"{label} refs count invalid")
    if any(not isinstance(ref, str) for ref in refs):
        raise RoleContractError(f"{label} refs must be strings")
    if len(refs) != len(set(refs)):
        raise RoleContractError(f"{label} refs must be unique")
    known = frozenset(str(ref) for ref in known_refs)
    unknown = [ref for ref in refs if ref not in known]
    if unknown:
        raise RoleContractError(f"{label} references unknown evidence: {unknown[0]}")
    return list(refs)


def validate_upstream_artifact(
    artifact: Any,
    evidence_package: dict[str, Any],
    *,
    allowed_roles: Iterable[str],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    if not isinstance(artifact, dict):
        raise RoleContractError("upstream RoleArtifact must be an object")
    try:
        validate_contract(
            artifact,
            "role-artifact.schema.json",
            known_source_refs=evidence_source_refs(evidence_package),
        )
    except ContractValidationError as exc:
        raise RoleContractError(f"invalid upstream RoleArtifact: {exc}") from exc
    roles = frozenset(allowed_roles)
    if artifact["role"] not in roles:
        raise RoleContractError(f"upstream role {artifact['role']!r} is not allowed")
    if artifact["target_repository_sha"] != evidence_package["target_repository_sha"]:
        raise RoleContractError("upstream RoleArtifact target SHA mismatch")
    if artifact["evidence_sha256"] != evidence_package_sha256(evidence_package):
        raise RoleContractError("upstream RoleArtifact evidence digest mismatch")
    return artifact


def artifact_sha256(artifact: dict[str, Any]) -> str:
    return canonical_sha256(artifact)
