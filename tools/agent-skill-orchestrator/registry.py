from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract

PACKAGE_ROOT = Path(__file__).resolve().parent
MODEL_REGISTRY_PATH = PACKAGE_ROOT / "models" / "registry.json"
DOMAIN_REGISTRY_PATH = PACKAGE_ROOT / "domains" / "registry.json"
ROLE_REGISTRY_PATH = PACKAGE_ROOT / "roles" / "metadata.json"


def _read_json(path: Path | str) -> dict[str, Any]:
    target = Path(path)
    with target.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ContractValidationError(f"registry {target} must be a JSON object")
    return data


def _require_unique(items: list[dict[str, Any]], key: str, label: str) -> None:
    seen: set[str] = set()
    for index, item in enumerate(items):
        value = str(item[key])
        if value in seen:
            raise ContractValidationError(f"duplicate {label} {value!r} at index {index}")
        seen.add(value)


def validate_model_registry_data(data: dict[str, Any]) -> None:
    validate_contract(data, "model-registry.schema.json")
    _require_unique(data["profiles"], "profile_id", "model profile id")
    _require_unique(data["profiles"], "local_model_id", "local model id")


def validate_domain_registry_data(data: dict[str, Any]) -> None:
    validate_contract(data, "domain-registry.schema.json")
    _require_unique(data["domains"], "domain_id", "domain id")
    _require_unique(data["domains"], "scope", "domain scope")


def validate_role_registry_data(data: dict[str, Any]) -> None:
    validate_contract(data, "role-registry.schema.json")
    _require_unique(data["roles"], "role_id", "role id")


def load_model_registry(path: Path | str = MODEL_REGISTRY_PATH) -> dict[str, Any]:
    data = _read_json(path)
    validate_model_registry_data(data)
    return data


def load_domain_registry(path: Path | str = DOMAIN_REGISTRY_PATH) -> dict[str, Any]:
    data = _read_json(path)
    validate_domain_registry_data(data)
    return data


def load_role_registry(path: Path | str = ROLE_REGISTRY_PATH) -> dict[str, Any]:
    data = _read_json(path)
    validate_role_registry_data(data)
    return data


def registry_sha256(data: dict[str, Any]) -> str:
    return canonical_sha256(data)


def eligible_model_profiles(data: dict[str, Any] | None = None) -> tuple[str, ...]:
    registry = load_model_registry() if data is None else data
    validate_model_registry_data(registry)
    eligible = []
    for profile in registry["profiles"]:
        if not profile["enabled"]:
            continue
        if profile["license"]["status"] != "verified_metadata":
            continue
        if profile["access"]["class"] != "public_unauthenticated_https":
            continue
        eligible.append(profile["profile_id"])
    return tuple(sorted(eligible))
