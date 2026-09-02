from __future__ import annotations

import hashlib
from typing import Any

from canonical import canonical_sha256
from evidence import evidence_package_sha256
from roles.scout import (
    ScoutContractError,
    build_role_artifact,
    prompt_sha256,
    role_artifact_sha256,
)
from runtime.generation import LLAMA_RUNTIME, TRANSPORT, scout_generation, scout_model_profile
from runtime.llama_cpp import classify_finish_reason
from schema_validation import ContractValidationError, validate_contract


class RoleReceiptError(ValueError):
    pass


def response_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def build_scout_execution_result(
    *,
    content: str,
    finish_reason: str,
    evidence_package: dict[str, Any],
    prompt: str,
    runtime_version: str,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    profile = scout_model_profile(registry_data)
    classified = classify_finish_reason(finish_reason)
    artifact = None
    artifact_sha = "NONE"
    status = classified
    error = None

    if classified == "COMPLETED":
        try:
            artifact = build_role_artifact(
                content,
                evidence_package,
                prompt,
                registry_data=registry_data,
            )
            artifact_sha = role_artifact_sha256(artifact, evidence_package)
        except ScoutContractError as exc:
            status = "INVALID"
            error = str(exc)

    receipt = {
        "schema_version": 1,
        "role": "scout",
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
        "role_artifact_sha256": artifact_sha,
        "finish_reason": finish_reason,
        "model_call_count": 1,
        "hosted_ai_call_count": 0,
    }
    try:
        validate_contract(receipt, "role-execution-receipt.schema.json")
    except ContractValidationError as exc:
        raise RoleReceiptError(f"invalid role execution receipt: {exc}") from exc

    if status == "COMPLETED" and artifact is None:
        raise RoleReceiptError("completed Scout execution must include a RoleArtifact")
    if status != "COMPLETED" and artifact_sha != "NONE":
        raise RoleReceiptError("non-completed Scout execution must not claim a RoleArtifact")
    return {"artifact": artifact, "receipt": receipt, "error": error}


def role_execution_receipt_sha256(receipt: dict[str, Any]) -> str:
    try:
        validate_contract(receipt, "role-execution-receipt.schema.json")
    except ContractValidationError as exc:
        raise RoleReceiptError(f"invalid role execution receipt: {exc}") from exc
    return canonical_sha256(receipt)
