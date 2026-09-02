from __future__ import annotations

import hashlib
from typing import Any

from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from roles._compact import RoleContractError, artifact_sha256, validate_upstream_artifact
from roles.critic_parallel import (
    ParallelCriticContractError,
    validate_parallel_critic_wire,
)
from runtime.generation import SCOUT_MODEL_PROFILE_ID, scout_model_profile
from schema_validation import ContractValidationError, validate_contract


class ParallelCriticArtifactError(ValueError):
    pass


def parallel_critic_prompt_sha256(prompt: str) -> str:
    if not isinstance(prompt, str) or not prompt:
        raise ParallelCriticArtifactError("parallel Critic prompt must be non-empty text")
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def _model_identity(registry_data: dict[str, Any] | None = None) -> tuple[str, str]:
    profile = scout_model_profile(registry_data)
    if profile["profile_id"] != SCOUT_MODEL_PROFILE_ID:
        raise ParallelCriticArtifactError("parallel Critic model identity drifted from frozen O2 profile")
    return str(profile["profile_id"]), str(profile["sha256"])


def _validated_scout_upstream(
    scout_artifact: dict[str, Any],
    evidence_package: dict[str, Any],
) -> tuple[dict[str, Any], str]:
    try:
        validated = validate_upstream_artifact(
            scout_artifact,
            evidence_package,
            allowed_roles={"scout"},
        )
    except RoleContractError as exc:
        raise ParallelCriticArtifactError(str(exc)) from exc
    return validated, artifact_sha256(validated)


def build_parallel_critic_role_artifact(
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    scout_artifact: dict[str, Any],
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    _, scout_sha = _validated_scout_upstream(scout_artifact, evidence_package)
    try:
        parsed = validate_parallel_critic_wire(content, evidence_package)
    except ParallelCriticContractError as exc:
        raise ParallelCriticArtifactError(str(exc)) from exc
    profile_id, model_digest = _model_identity(registry_data)

    boundaries = [
        {
            "kind": item["k"],
            "subject": item["v"],
            "status": "SUPPORTED_LIKELY",
            "refs": list(item["r"]),
            "role": "critic",
        }
        for item in parsed["b"]
    ]
    blockers = [
        {
            "kind": item["k"],
            "subject": item["v"],
            "origin_role": "critic",
            "refs": list(item["r"]),
        }
        for family in ("c", "u")
        for item in parsed[family]
    ]
    artifact = {
        "schema_version": 1,
        "role": "critic",
        "model_profile_id": profile_id,
        "model_digest": model_digest,
        "target_repository_sha": evidence_package["target_repository_sha"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": parallel_critic_prompt_sha256(prompt),
        "structured_response_sha256": canonical_sha256(parsed),
        "upstream_artifact_sha256": [scout_sha],
        "records": {
            "claims": [],
            "flow_edges": [],
            "boundaries": boundaries,
            "blockers": blockers,
            "conflicts": [],
        },
    }
    try:
        validate_contract(
            artifact,
            "role-artifact.schema.json",
            known_source_refs=evidence_source_refs(evidence_package),
        )
    except ContractValidationError as exc:
        raise ParallelCriticArtifactError(f"generated parallel Critic RoleArtifact is invalid: {exc}") from exc
    return artifact


def parallel_critic_role_artifact_sha256(
    artifact: dict[str, Any],
    evidence_package: dict[str, Any],
) -> str:
    try:
        validate_contract(
            artifact,
            "role-artifact.schema.json",
            known_source_refs=evidence_source_refs(evidence_package),
        )
    except ContractValidationError as exc:
        raise ParallelCriticArtifactError(f"invalid parallel Critic RoleArtifact: {exc}") from exc
    if artifact["role"] != "critic":
        raise ParallelCriticArtifactError("parallel Critic RoleArtifact role mismatch")
    if artifact["target_repository_sha"] != evidence_package["target_repository_sha"]:
        raise ParallelCriticArtifactError("parallel Critic RoleArtifact target SHA mismatch")
    if artifact["evidence_sha256"] != evidence_package_sha256(evidence_package):
        raise ParallelCriticArtifactError("parallel Critic RoleArtifact evidence digest mismatch")
    return canonical_sha256(artifact)
