from __future__ import annotations

from copy import deepcopy
from typing import Any

from registry import load_model_registry, validate_model_registry_data

SCOUT_MODEL_PROFILE_ID = "qwen2.5-3b-instruct-q4_k_m"
TRANSPORT = "llama-server-v1-chat-completions"
GENERATION = {
    "temperature": 0,
    "seed": 42,
    "n_predict": 768,
    "ctx_size": 16384,
    "threads": 4,
    "gpu_layers": 0,
}
LLAMA_RUNTIME = {
    "release": "b10516",
    "source_digest": "b95502ba9aa0eb73a2f4fc8878d7fbe6a847a0b9",
    "artifact": "llama-b10516-bin-ubuntu-x64.tar.gz",
    "artifact_sha256": "f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35",
}


class GenerationPolicyError(ValueError):
    pass


def scout_generation() -> dict[str, Any]:
    return deepcopy(GENERATION)


def scout_model_profile(registry_data: dict[str, Any] | None = None) -> dict[str, Any]:
    registry = load_model_registry() if registry_data is None else registry_data
    validate_model_registry_data(registry)
    profiles = [item for item in registry["profiles"] if item["profile_id"] == SCOUT_MODEL_PROFILE_ID]
    if len(profiles) != 1:
        raise GenerationPolicyError("frozen Scout model profile missing or duplicated")
    profile = profiles[0]
    if not profile.get("enabled"):
        raise GenerationPolicyError("frozen Scout model profile is disabled")
    if profile["execution_surface"] != "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS":
        raise GenerationPolicyError("Scout model profile is outside zero-credit execution surface")
    if profile["access"]["class"] != "public_unauthenticated_https":
        raise GenerationPolicyError("Scout model profile access class changed")
    return deepcopy(profile)


def validate_generation(value: dict[str, Any]) -> None:
    if value != GENERATION:
        raise GenerationPolicyError("Scout generation parameters must equal the frozen O2-A profile")
