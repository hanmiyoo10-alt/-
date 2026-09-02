from __future__ import annotations

from typing import Any

from evidence import evidence_package_sha256, validate_evidence_package
from roles._compact import RoleContractError, artifact_sha256, validate_upstream_artifact
from runtime.generation import LLAMA_RUNTIME, TRANSPORT, scout_generation, scout_model_profile
from runtime.llama_cpp import classify_finish_reason
from runtime.parallel_critic_artifact import (
    ParallelCriticArtifactError,
    build_parallel_critic_role_artifact,
    parallel_critic_prompt_sha256,
    parallel_critic_role_artifact_sha256,
)
from runtime.semantic_role_receipt import (
    SemanticRoleReceiptError,
    response_sha256,
    semantic_role_execution_receipt_sha256,
)
from schema_validation import ContractValidationError, validate_contract

SCHEMA = "semantic-role-execution-receipt-v2.schema.json"


class ParallelCriticReceiptError(ValueError):
    pass


def _scout_sha(
    scout_artifact: dict[str, Any],
    evidence_package: dict[str, Any],
) -> str:
    try:
        validated = validate_upstream_artifact(
            scout_artifact,
            evidence_package,
            allowed_roles={"scout"},
        )
    except RoleContractError as exc:
        raise ParallelCriticReceiptError(str(exc)) from exc
    return artifact_sha256(validated)


def build_parallel_critic_execution_result(
    *,
    content: str,
    finish_reason: str,
    evidence_package: dict[str, Any],
    prompt: str,
    scout_artifact: dict[str, Any],
    runtime_version: str,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    if not isinstance(finish_reason, str) or not finish_reason.strip():
        raise ParallelCriticReceiptError("finish_reason must be non-empty text")
    if not isinstance(runtime_version, str) or not runtime_version:
        raise ParallelCriticReceiptError("runtime_version must be non-empty text")

    upstream_sha = _scout_sha(scout_artifact, evidence_package)
    profile = scout_model_profile(registry_data)
    classified = classify_finish_reason(finish_reason)
    artifact = None
    artifact_sha = "NONE"
    status = classified
    error = None

    if classified == "COMPLETED":
        try:
            artifact = build_parallel_critic_role_artifact(
                content,
                evidence_package,
                prompt,
                scout_artifact,
                registry_data=registry_data,
            )
            artifact_sha = parallel_critic_role_artifact_sha256(
                artifact,
                evidence_package,
            )
        except ParallelCriticArtifactError as exc:
            status = "INVALID"
            error = str(exc)

    try:
        prompt_sha = parallel_critic_prompt_sha256(prompt)
        response_sha = response_sha256(content)
    except (ParallelCriticArtifactError, SemanticRoleReceiptError) as exc:
        raise ParallelCriticReceiptError(str(exc)) from exc

    receipt = {
        "schema_version": 2,
        "role": "critic",
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
        "prompt_sha256": prompt_sha,
        "response_sha256": response_sha,
        "upstream_artifact_sha256": [upstream_sha],
        "role_artifact_sha256": artifact_sha,
        "finish_reason": finish_reason,
        "model_call_count": 1,
        "hosted_ai_call_count": 0,
    }
    try:
        validate_contract(receipt, SCHEMA)
    except ContractValidationError as exc:
        raise ParallelCriticReceiptError(
            f"invalid parallel Critic execution receipt: {exc}"
        ) from exc
    if status == "COMPLETED" and artifact is None:
        raise ParallelCriticReceiptError(
            "completed parallel Critic execution must include a RoleArtifact"
        )
    if status != "COMPLETED" and artifact_sha != "NONE":
        raise ParallelCriticReceiptError(
            "non-completed parallel Critic execution must not claim a RoleArtifact"
        )
    return {"artifact": artifact, "receipt": receipt, "error": error}


def parallel_critic_execution_receipt_sha256(receipt: dict[str, Any]) -> str:
    try:
        return semantic_role_execution_receipt_sha256(receipt)
    except SemanticRoleReceiptError as exc:
        raise ParallelCriticReceiptError(str(exc)) from exc
