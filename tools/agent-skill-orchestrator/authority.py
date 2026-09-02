from __future__ import annotations

import re
from typing import Any, Iterable

from canonical import canonical_sha256
from registry import load_domain_registry, registry_sha256, validate_domain_registry_data
from schema_validation import ContractValidationError, validate_contract

AUTHORITY_OBSERVATION_SCHEMA = "authority-observation.schema.json"
AUTHORITY_SNAPSHOT_SCHEMA = "authority-snapshot.schema.json"
SHA40_RE = re.compile(r"^[0-9a-f]{40}$")


class AuthorityError(ValueError):
    pass


def _validated_repository_sha(value: str) -> str:
    normalized = str(value).strip().lower()
    if not SHA40_RE.fullmatch(normalized):
        raise AuthorityError("target_repository_sha must be a 40-character lowercase hex SHA")
    return normalized


def _find_domain(domains: dict[str, Any], scope: str) -> dict[str, Any]:
    matches = [item for item in domains["domains"] if item["scope"] == scope]
    if len(matches) != 1:
        raise AuthorityError(f"unregistered scope: {scope}")
    return matches[0]


def _authority_key(item: dict[str, Any]) -> tuple[str, str]:
    return str(item["kind"]), str(item["value"])


def _blockers_for(authorities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blockers: list[dict[str, Any]] = []
    for item in authorities:
        status = item["status"]
        if status == "OBSERVED":
            continue
        blockers.append(
            {
                "kind": "missing_evidence" if status == "MISSING" else "unknown",
                "subject": f"authority {item['kind']}:{item['value']} is {status}",
                "origin_role": "deterministic",
                "refs": [],
            }
        )
    return blockers


def _overall_status(authorities: list[dict[str, Any]]) -> str:
    observed = sum(1 for item in authorities if item["status"] == "OBSERVED")
    if observed == len(authorities):
        return "RESOLVED"
    if observed > 0:
        return "PARTIAL"
    return "UNKNOWN"


def validate_authority_snapshot(snapshot: dict[str, Any]) -> None:
    try:
        validate_contract(snapshot, AUTHORITY_SNAPSHOT_SCHEMA, known_source_refs=())
    except ContractValidationError as exc:
        raise AuthorityError(f"invalid authority snapshot: {exc}") from exc

    authorities = snapshot["authorities"]
    if authorities != sorted(authorities, key=_authority_key):
        raise AuthorityError("authority snapshot authorities must be in canonical kind/value order")

    seen: set[tuple[str, str]] = set()
    for index, item in enumerate(authorities):
        key = _authority_key(item)
        if key in seen:
            raise AuthorityError(f"duplicate authority snapshot entry at index {index}: {key!r}")
        seen.add(key)
        has_sha = "source_sha" in item
        if item["status"] == "OBSERVED" and not has_sha:
            raise AuthorityError(f"OBSERVED authority requires source_sha: {key!r}")
        if item["status"] != "OBSERVED" and has_sha:
            raise AuthorityError(f"non-OBSERVED authority must not carry source_sha: {key!r}")

    expected_status = _overall_status(authorities)
    if snapshot["overall_status"] != expected_status:
        raise AuthorityError(
            f"authority overall_status must be derived as {expected_status}, got {snapshot['overall_status']}"
        )
    expected_blockers = _blockers_for(authorities)
    if snapshot["blockers"] != expected_blockers:
        raise AuthorityError("authority blockers must be derived exactly from UNKNOWN/MISSING authorities")


def resolve_authority(
    scope: str,
    target_repository_sha: str,
    observations: Iterable[dict[str, Any]],
    *,
    domain_registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Resolve declared domain authority from explicit deterministic repository observations."""
    domains = load_domain_registry() if domain_registry_data is None else domain_registry_data
    try:
        validate_domain_registry_data(domains)
    except ContractValidationError as exc:
        raise AuthorityError(f"invalid domain registry: {exc}") from exc

    domain = _find_domain(domains, scope)
    target_sha = _validated_repository_sha(target_repository_sha)
    declared = sorted(
        ({"kind": str(item["kind"]), "value": str(item["value"])} for item in domain["authority_refs"]),
        key=_authority_key,
    )
    declared_keys = {_authority_key(item) for item in declared}

    observed_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for index, raw in enumerate(observations):
        try:
            validate_contract(raw, AUTHORITY_OBSERVATION_SCHEMA)
        except ContractValidationError as exc:
            raise AuthorityError(f"invalid authority observation at index {index}: {exc}") from exc
        key = _authority_key(raw)
        if key not in declared_keys:
            raise AuthorityError(f"undeclared authority observation: {key!r}")
        if key in observed_by_key:
            raise AuthorityError(f"duplicate authority observation: {key!r}")
        has_sha = "source_sha" in raw
        if raw["status"] == "OBSERVED" and not has_sha:
            raise AuthorityError(f"OBSERVED authority observation requires source_sha: {key!r}")
        if raw["status"] == "MISSING" and has_sha:
            raise AuthorityError(f"MISSING authority observation must not carry source_sha: {key!r}")
        observed_by_key[key] = dict(raw)

    authorities: list[dict[str, Any]] = []
    for declared_item in declared:
        key = _authority_key(declared_item)
        observation = observed_by_key.get(key)
        if observation is None:
            authorities.append({**declared_item, "status": "UNKNOWN"})
            continue
        resolved = {**declared_item, "status": observation["status"]}
        if observation["status"] == "OBSERVED":
            resolved["source_sha"] = observation["source_sha"]
        authorities.append(resolved)

    snapshot = {
        "schema_version": 1,
        "scope": scope,
        "target_repository_sha": target_sha,
        "domain_registry_sha256": registry_sha256(domains),
        "authority_profile": f"{domain['domain_id']}-current",
        "authorities": authorities,
        "overall_status": _overall_status(authorities),
        "blockers": _blockers_for(authorities),
    }
    validate_authority_snapshot(snapshot)
    return snapshot


def authority_snapshot_sha256(snapshot: dict[str, Any]) -> str:
    validate_authority_snapshot(snapshot)
    return canonical_sha256(snapshot)


def observed_authority_sha(snapshot: dict[str, Any], kind: str, value: str) -> str:
    validate_authority_snapshot(snapshot)
    matches = [
        item
        for item in snapshot["authorities"]
        if item["kind"] == kind and item["value"] == value
    ]
    if len(matches) != 1:
        raise AuthorityError(f"authority not declared in snapshot: {(kind, value)!r}")
    item = matches[0]
    if item["status"] != "OBSERVED":
        raise AuthorityError(f"authority is not OBSERVED: {(kind, value)!r} ({item['status']})")
    return str(item["source_sha"])
