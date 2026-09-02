from __future__ import annotations

import hashlib
from typing import Any, Iterable

from canonical import canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from roles._compact import (
    RoleContractError,
    artifact_sha256,
    load_role_contract,
    validate_upstream_artifact,
)
from roles.critic import critic_input_projection, validate_critic_wire
from roles.mapper import mapper_input_projection, validate_mapper_wire
from roles.synthesizer import synthesizer_input_projection, validate_synthesizer_wire
from runtime.generation import SCOUT_MODEL_PROFILE_ID, scout_model_profile
from schema_validation import ContractValidationError, validate_contract

ROLE_ORDER = {"scout": 0, "mapper": 1, "critic": 2}


class SemanticRoleArtifactError(ValueError):
    pass


def prompt_sha256(prompt: str) -> str:
    if not isinstance(prompt, str) or not prompt:
        raise SemanticRoleArtifactError("role prompt must be non-empty text")
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def _model_identity(registry_data: dict[str, Any] | None = None) -> tuple[str, str]:
    profile = scout_model_profile(registry_data)
    if profile["profile_id"] != SCOUT_MODEL_PROFILE_ID:
        raise SemanticRoleArtifactError("O2-C model identity drifted from frozen O2-A profile")
    return str(profile["profile_id"]), str(profile["sha256"])


def _validate_generated_artifact(
    artifact: dict[str, Any],
    evidence_package: dict[str, Any],
    *,
    expected_role: str,
    expected_upstream: list[str],
) -> dict[str, Any]:
    try:
        validate_contract(
            artifact,
            "role-artifact.schema.json",
            known_source_refs=evidence_source_refs(evidence_package),
        )
    except ContractValidationError as exc:
        raise SemanticRoleArtifactError(f"generated {expected_role} RoleArtifact is invalid: {exc}") from exc
    if artifact["role"] != expected_role:
        raise SemanticRoleArtifactError(f"generated RoleArtifact role must be {expected_role}")
    if artifact["target_repository_sha"] != evidence_package["target_repository_sha"]:
        raise SemanticRoleArtifactError("generated RoleArtifact target SHA mismatch")
    if artifact["evidence_sha256"] != evidence_package_sha256(evidence_package):
        raise SemanticRoleArtifactError("generated RoleArtifact evidence digest mismatch")
    if artifact["upstream_artifact_sha256"] != expected_upstream:
        raise SemanticRoleArtifactError("generated RoleArtifact upstream digest chain mismatch")
    return artifact


def _validate_one_upstream(
    artifact: dict[str, Any],
    evidence_package: dict[str, Any],
    *,
    role: str,
) -> tuple[dict[str, Any], str]:
    try:
        validated = validate_upstream_artifact(artifact, evidence_package, allowed_roles={role})
    except RoleContractError as exc:
        raise SemanticRoleArtifactError(str(exc)) from exc
    return validated, artifact_sha256(validated)


def canonical_upstream_artifacts(
    upstream_artifacts: Iterable[dict[str, Any]],
    evidence_package: dict[str, Any],
    *,
    allowed_roles: Iterable[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    validate_evidence_package(evidence_package)
    allowed = frozenset(allowed_roles)
    validated: list[dict[str, Any]] = []
    seen_roles: set[str] = set()
    for raw in upstream_artifacts:
        try:
            artifact = validate_upstream_artifact(raw, evidence_package, allowed_roles=allowed)
        except RoleContractError as exc:
            raise SemanticRoleArtifactError(str(exc)) from exc
        role = str(artifact["role"])
        if role in seen_roles:
            raise SemanticRoleArtifactError(f"duplicate upstream role artifact: {role}")
        seen_roles.add(role)
        validated.append(artifact)
    if not validated:
        raise SemanticRoleArtifactError("at least one upstream RoleArtifact is required")
    validated.sort(key=lambda item: ROLE_ORDER[str(item["role"])])
    return validated, [artifact_sha256(item) for item in validated]


def build_mapper_role_artifact(
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    scout_artifact: dict[str, Any],
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    try:
        mapper_input_projection(evidence_package, scout_artifact)
        parsed = validate_mapper_wire(content, evidence_package)
    except (RoleContractError, ValueError) as exc:
        raise SemanticRoleArtifactError(str(exc)) from exc
    _, scout_sha = _validate_one_upstream(scout_artifact, evidence_package, role="scout")
    contract = load_role_contract("mapper.json", "mapper-compact-wire-v1", "mapper")
    status = str(contract.get("grounded_status"))
    if status != "SUPPORTED_LIKELY":
        raise SemanticRoleArtifactError("Mapper deterministic status projection changed")
    profile_id, model_digest = _model_identity(registry_data)

    claims = [
        {
            "id": f"claim-mapper-{index:03d}",
            "kind": "semantic_owner",
            "status": status,
            "value": item["v"],
            "refs": list(item["r"]),
            "role": "mapper",
        }
        for index, item in enumerate(parsed["o"], start=1)
    ]
    edges = [
        {
            "from": item["f"],
            "to": item["t"],
            "status": status,
            "refs": list(item["r"]),
            "role": "mapper",
        }
        for item in parsed["e"]
    ]
    upstream = [scout_sha]
    artifact = {
        "schema_version": 1,
        "role": "mapper",
        "model_profile_id": profile_id,
        "model_digest": model_digest,
        "target_repository_sha": evidence_package["target_repository_sha"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": prompt_sha256(prompt),
        "structured_response_sha256": canonical_sha256(parsed),
        "upstream_artifact_sha256": upstream,
        "records": {
            "claims": claims,
            "flow_edges": edges,
            "boundaries": [],
            "blockers": [],
            "conflicts": [],
        },
    }
    return _validate_generated_artifact(
        artifact, evidence_package, expected_role="mapper", expected_upstream=upstream
    )


def build_critic_role_artifact(
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    mapper_artifact: dict[str, Any],
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    try:
        critic_input_projection(evidence_package, mapper_artifact)
        parsed = validate_critic_wire(content, evidence_package, mapper_artifact)
    except (RoleContractError, ValueError) as exc:
        raise SemanticRoleArtifactError(str(exc)) from exc
    _, mapper_sha = _validate_one_upstream(mapper_artifact, evidence_package, role="mapper")
    contract = load_role_contract("critic.json", "critic-compact-wire-v1", "critic")
    status = str(contract.get("grounded_boundary_status"))
    if status != "SUPPORTED_LIKELY":
        raise SemanticRoleArtifactError("Critic deterministic boundary status projection changed")
    profile_id, model_digest = _model_identity(registry_data)

    boundaries = [
        {
            "kind": item["k"],
            "subject": item["v"],
            "status": status,
            "refs": list(item["r"]),
            "role": "critic",
        }
        for item in parsed["b"]
    ]
    blockers: list[dict[str, Any]] = []
    for item in parsed["q"]:
        subject = f"{item['i']}: {item['v']}"
        if len(subject) > 512:
            raise SemanticRoleArtifactError("Critic challenge blocker subject exceeds schema bound")
        blockers.append({
            "kind": item["k"],
            "subject": subject,
            "origin_role": "critic",
            "refs": list(item["r"]),
        })
    for item in parsed["u"]:
        blockers.append({
            "kind": item["k"],
            "subject": item["v"],
            "origin_role": "critic",
            "refs": list(item["r"]),
        })

    upstream = [mapper_sha]
    artifact = {
        "schema_version": 1,
        "role": "critic",
        "model_profile_id": profile_id,
        "model_digest": model_digest,
        "target_repository_sha": evidence_package["target_repository_sha"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": prompt_sha256(prompt),
        "structured_response_sha256": canonical_sha256(parsed),
        "upstream_artifact_sha256": upstream,
        "records": {
            "claims": [],
            "flow_edges": [],
            "boundaries": boundaries,
            "blockers": blockers,
            "conflicts": [],
        },
    }
    return _validate_generated_artifact(
        artifact, evidence_package, expected_role="critic", expected_upstream=upstream
    )


def build_synthesizer_role_artifact(
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    upstream_artifacts: Iterable[dict[str, Any]],
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    supplied = list(upstream_artifacts)
    validated, upstream = canonical_upstream_artifacts(
        supplied, evidence_package, allowed_roles={"scout", "mapper", "critic"}
    )
    try:
        projection = synthesizer_input_projection(evidence_package, validated)
        parsed = validate_synthesizer_wire(content, evidence_package, validated)
    except (RoleContractError, ValueError) as exc:
        raise SemanticRoleArtifactError(str(exc)) from exc
    profile_id, model_digest = _model_identity(registry_data)

    by_id = {item["id"]: item for item in projection["records"]}
    selected = [by_id[item] for item in parsed["s"]]

    claim_map: dict[str, str] = {}
    claims: list[dict[str, Any]] = []
    for item in selected:
        if item["type"] != "claim":
            continue
        record = item["record"]
        old_id = str(record["id"])
        if old_id in claim_map:
            raise SemanticRoleArtifactError(f"duplicate selected upstream claim id: {old_id}")
        new_id = f"claim-synthesizer-{len(claims) + 1:03d}"
        claim_map[old_id] = new_id
        claims.append({
            "id": new_id,
            "kind": record["kind"],
            "status": record["status"],
            "value": record["value"],
            "refs": list(record["refs"]),
            "role": "synthesizer",
        })

    edges: list[dict[str, Any]] = []
    boundaries: list[dict[str, Any]] = []
    blockers: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    for item in selected:
        record = item["record"]
        record_type = item["type"]
        if record_type == "flow_edge":
            edges.append({
                "from": record["from"],
                "to": record["to"],
                "status": record["status"],
                "refs": list(record["refs"]),
                "role": "synthesizer",
            })
        elif record_type == "boundary":
            boundaries.append({
                "kind": record["kind"],
                "subject": record["subject"],
                "status": record["status"],
                "refs": list(record["refs"]),
                "role": "synthesizer",
            })
        elif record_type == "blocker":
            blockers.append({
                "kind": record["kind"],
                "subject": record["subject"],
                "origin_role": record["origin_role"],
                "refs": list(record["refs"]),
            })
        elif record_type == "conflict":
            left = str(record["left_claim_id"])
            right = str(record["right_claim_id"])
            if left not in claim_map or right not in claim_map:
                raise SemanticRoleArtifactError(
                    "selected conflict cannot be remapped without both referenced selected claims"
                )
            conflicts.append({
                "id": record["id"],
                "subject": record["subject"],
                "left_claim_id": claim_map[left],
                "right_claim_id": claim_map[right],
                "resolution": record["resolution"],
            })

    artifact = {
        "schema_version": 1,
        "role": "synthesizer",
        "model_profile_id": profile_id,
        "model_digest": model_digest,
        "target_repository_sha": evidence_package["target_repository_sha"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": prompt_sha256(prompt),
        "structured_response_sha256": canonical_sha256(parsed),
        "upstream_artifact_sha256": upstream,
        "records": {
            "claims": claims,
            "flow_edges": edges,
            "boundaries": boundaries,
            "blockers": blockers,
            "conflicts": conflicts,
        },
    }
    return _validate_generated_artifact(
        artifact, evidence_package, expected_role="synthesizer", expected_upstream=upstream
    )


def semantic_role_artifact_sha256(
    artifact: dict[str, Any],
    evidence_package: dict[str, Any],
    *,
    expected_role: str,
) -> str:
    try:
        validate_contract(
            artifact,
            "role-artifact.schema.json",
            known_source_refs=evidence_source_refs(evidence_package),
        )
    except ContractValidationError as exc:
        raise SemanticRoleArtifactError(f"invalid semantic RoleArtifact: {exc}") from exc
    if artifact["role"] != expected_role or expected_role not in {"mapper", "critic", "synthesizer"}:
        raise SemanticRoleArtifactError("semantic RoleArtifact role mismatch")
    if artifact["target_repository_sha"] != evidence_package["target_repository_sha"]:
        raise SemanticRoleArtifactError("semantic RoleArtifact target SHA mismatch")
    if artifact["evidence_sha256"] != evidence_package_sha256(evidence_package):
        raise SemanticRoleArtifactError("semantic RoleArtifact evidence digest mismatch")
    return canonical_sha256(artifact)
