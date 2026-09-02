from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any

from canonical import canonical_sha256
from runtime.generation import (
    GENERATION,
    LLAMA_RUNTIME,
    SCOUT_MODEL_PROFILE_ID,
    TRANSPORT,
)
from schema_validation import ContractValidationError, validate_contract

REGISTRY_PATH = Path(__file__).with_name("budget_profiles.json")
SCHEMA = "runtime-budget-profile-registry.schema.json"
DEFAULT_RUNTIME_BUDGET_PROFILE_ID = "standard-cpu-v1"
PROFILE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*-v[1-9][0-9]*$")
MAX_CONCURRENT_MODEL_WORKERS = 2
FROZEN_TOTAL_ROLE_CALLS = 4


class RuntimeBudgetProfileError(ValueError):
    pass


def _read_registry(path: Path | str) -> dict[str, Any]:
    try:
        with Path(path).open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeBudgetProfileError(f"cannot read runtime budget profile registry: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeBudgetProfileError("runtime budget profile registry must be a JSON object")
    return data


def validate_runtime_budget_registry_data(data: dict[str, Any]) -> None:
    try:
        validate_contract(data, SCHEMA)
    except ContractValidationError as exc:
        raise RuntimeBudgetProfileError(f"invalid runtime budget profile registry: {exc}") from exc

    profiles = data["profiles"]
    profile_ids = [str(item["profile_id"]) for item in profiles]
    if len(profile_ids) != len(set(profile_ids)):
        raise RuntimeBudgetProfileError("duplicate runtime budget profile id")

    for profile in profiles:
        profile_id = str(profile["profile_id"])
        if PROFILE_ID_RE.fullmatch(profile_id) is None:
            raise RuntimeBudgetProfileError(f"runtime budget profile id is not explicitly versioned: {profile_id}")
        if profile["model_profile_id"] != SCOUT_MODEL_PROFILE_ID:
            raise RuntimeBudgetProfileError(f"runtime budget model profile drifted for {profile_id}")
        if profile["transport"] != TRANSPORT:
            raise RuntimeBudgetProfileError(f"runtime budget transport drifted for {profile_id}")
        if profile["runtime_release"] != LLAMA_RUNTIME["release"]:
            raise RuntimeBudgetProfileError(f"runtime budget llama.cpp release drifted for {profile_id}")
        for key in ("temperature", "seed", "n_predict", "threads", "gpu_layers"):
            if profile[key] != GENERATION[key]:
                raise RuntimeBudgetProfileError(
                    f"runtime budget generation field {key} drifted for {profile_id}"
                )
        if profile["max_total_role_calls"] != FROZEN_TOTAL_ROLE_CALLS:
            raise RuntimeBudgetProfileError(
                f"runtime budget total role-call ceiling drifted for {profile_id}"
            )
        if profile["max_hosted_ai_calls"] != 0:
            raise RuntimeBudgetProfileError(
                f"runtime budget hosted-AI allowance must remain zero for {profile_id}"
            )
        concurrency = profile["max_concurrent_model_workers"]
        if concurrency < 1 or concurrency > MAX_CONCURRENT_MODEL_WORKERS:
            raise RuntimeBudgetProfileError(
                f"runtime budget concurrency must be within 1..{MAX_CONCURRENT_MODEL_WORKERS} for {profile_id}"
            )
        if profile_id == DEFAULT_RUNTIME_BUDGET_PROFILE_ID and concurrency != 2:
            raise RuntimeBudgetProfileError(
                "standard-cpu-v1 must preserve the frozen two-worker concurrency ceiling"
            )


def load_runtime_budget_registry(path: Path | str = REGISTRY_PATH) -> dict[str, Any]:
    data = _read_registry(path)
    validate_runtime_budget_registry_data(data)
    return deepcopy(data)


def runtime_budget_profile(
    profile_id: str = DEFAULT_RUNTIME_BUDGET_PROFILE_ID,
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    registry = load_runtime_budget_registry() if registry_data is None else deepcopy(registry_data)
    validate_runtime_budget_registry_data(registry)
    matches = [item for item in registry["profiles"] if item["profile_id"] == profile_id]
    if len(matches) != 1:
        raise RuntimeBudgetProfileError(f"unknown runtime budget profile id: {profile_id}")
    return deepcopy(matches[0])


def runtime_budget_profile_sha256(
    profile_id: str = DEFAULT_RUNTIME_BUDGET_PROFILE_ID,
    *,
    registry_data: dict[str, Any] | None = None,
) -> str:
    return canonical_sha256(runtime_budget_profile(profile_id, registry_data=registry_data))
