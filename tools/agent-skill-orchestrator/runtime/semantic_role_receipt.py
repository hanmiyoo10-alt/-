from __future__ import annotations

import hashlib
from typing import Any, Iterable

from canonical import canonical_sha256
from evidence import evidence_package_sha256, validate_evidence_package
from runtime.generation import LLAMA_RUNTIME, TRANSPORT, scout_generation, scout_model_profile
from runtime.llama_cpp import classify_finish_reason
from runtime.semantic_role_artifact import (
    SemanticRoleArtifactError,
    build_critic_role_artifact,
    build_mapper_role_artifact,
    build_synthesizer_role_artifact,
    canonical_upstream_artifacts,
    prompt_sha256,
    semantic_role_artifact_sha256,
)
from schema_validation import ContractValidationError, validate_contract

SCHEMA = "semantic-role-execution-receipt-v2.schema.json"
SEMANTIC_ROLES = frozenset({"mapper", "critic", "synthesizer"})


class SemanticRoleReceiptError(ValueError):
    pass


def response_sha256(content: str) -> str:
    if not isinstance(content, str):
        raise SemanticRoleReceiptError("role response must be text")
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _upstream_chain(
    role: str,
    upstream_artifacts: Iterable[dict[str, Any]],
    evidence_package: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[str]]:
    supplied = list(upstream_artifacts)
    if role == "mapper":
        allowed = {"scout"}
        required_roles = {"scout"}
    elif role == "critic":
        allowed = {"mapper"}
        required_roles = {"mapper"}
    elif role == "synthesizer":
        allowed = {"scout", "mapper", "critic"}
        required_roles = {"mapper", "critic"}
    else:
        raise SemanticRoleReceiptError(f"unsupported semantic role: {role}")
    try:
        validated, digests = canonical_upstream_artifacts(
            supplied, evidence_package, allowed_roles=allowed
        )
    except SemanticRoleArtifactError as exc:
        raise SemanticRoleReceiptError(str(exc)) from exc
    roles = {str(item["role"]) for item in validated}
    if not required_roles.issubset(roles):
        missing = sorted(required_roles - roles)
        raise SemanticRoleReceiptError(
            f"{role} upstream RoleArtifact chain is missing required roles: {missing}"
        )
    if role in {"mapper", "critic"} and len(validated) != 1:
        raise SemanticRoleReceiptError(f"{role} requires exactly one upstream RoleArtifact")
    return validated, digests


def _build_artifact(
    role: str,
    *,
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    upstream_artifacts: list[dict[str, Any]],
    registry_data: dict[str, Any] | None,
) -> dict[str, Any]:
    if role == "mapper":
        return build_mapper_role_artifact(
            content,
            evidence_package,
            prompt,
            upstream_artifacts[0],
            registry_data=registry_data,
        )
    if role == "critic":
        return build_critic_role_artifact(
            content,
            evidence_package,
            prompt,
            upstream_artifacts[0],
            registry_data=registry_data,
        )
    if role == "synthesizer":
        return build_synthesizer_role_artifact(
            content,
            evidence_package,
            prompt,
            upstream_artifacts,
            registry_data=registry_data,
        )
    raise SemanticRoleReceiptError(f"unsupported semantic role: {role}")


def build_semantic_role_execution_result(
    *,
    role: str,
    content: str,
    finish_reason: str,
    evidence_package: dict[str, Any],
    prompt: str,
    upstream_artifacts: Iterable[dict[str, Any]],
    runtime_version: str,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if role not in SEMANTIC_ROLES:
        raise SemanticRoleReceiptError(f"unsupported semantic role: {role}")
    validate_evidence_package(evidence_package)
    if not isinstance(finish_reason, str) or not finish_reason.strip():
        raise SemanticRoleReceiptError("finish_reason must be non-empty text")
    if not isinstance(runtime_version, str) or not runtime_version:
        raise SemanticRoleReceiptError("runtime_version must be non-empty text")
    validated_upstream, upstream_digests = _upstream_chain(
        role, upstream_artifacts, evidence_package
    )
    profile = scout_model_profile(registry_data)
    classified = classify_finish_reason(finish_reason)
    artifact = None
    artifact_sha = "NONE"
    status = classified
    error = None

    if classified == "COMPLETED":
        try:
            artifact = _build_artifact(
                role,
                content=content,
                evidence_package=evidence_package,
                prompt=prompt,
                upstream_artifacts=validated_upstream,
                registry_data=registry_data,
            )
            artifact_sha = semantic_role_artifact_sha256(
                artifact, evidence_package, expected_role=role
            )
        except SemanticRoleArtifactError as exc:
            status = "INVALID"
            error = str(exc)

    receipt = {
        "schema_version": 2,
        "role": role,
        "execution_status": status,
        "model_profile_id": profile["profile_id"],
        "model_repository": profile["repository"],
        "model_revision": profile["revision"],
        "model_file": profile["file"],
        "model_sha256": profile["sha256"],
        "runtime_release": LLAMA_RUNTIME["release"],
        "runtime_source_digest": LLAMA_RUNTIME["source_digest"],
        "runtime_artifact": LLAMA_RUNTIME["artifact"],
        "runtime_artifact_sha256": LLAMA_RUNTIME["artifact_sha256"],
        "runtime_version": runtime_version,
        "transport": TRANSPORT,
        "generation": scout_generation(),
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": prompt_sha256(prompt),
        "response_sha256": response_sha256(content),
        "upstream_artifact_sha256": upstream_digests,
        "role_artifact_sha256": artifact_sha,
        "finish_reason": finish_reason,
        "model_call_count": 1,
        "hosted_ai_call_count": 0,
    }
    try:
        validate_contract(receipt, SCHEMA)
    except ContractValidationError as exc:
        raise SemanticRoleReceiptError(f"invalid semantic role execution receipt: {exc}") from exc
    if status == "COMPLETED" and artifact is None:
        raise SemanticRoleReceiptError("completed semantic role execution must include a RoleArtifact")
    if status != "COMPLETED" and artifact_sha != "NONE":
        raise SemanticRoleReceiptError("non-completed semantic role execution must not claim a RoleArtifact")
    return {"artifact": artifact, "receipt": receipt, "error": error}


def semantic_role_execution_receipt_sha256(receipt: dict[str, Any]) -> str:
    try:
        validate_contract(receipt, SCHEMA)
    except ContractValidationError as exc:
        raise SemanticRoleReceiptError(f"invalid semantic role execution receipt: {exc}") from exc
    return canonical_sha256(receipt)
