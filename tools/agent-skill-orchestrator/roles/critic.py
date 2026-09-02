from __future__ import annotations

import json
from typing import Any

from evidence import evidence_source_refs, validate_evidence_package
from roles._compact import (
    RoleContractError,
    artifact_sha256,
    enforce_canonical_ceiling,
    load_role_contract,
    parse_wire,
    validate_refs,
    validate_short_text,
    validate_upstream_artifact,
)

CONTRACT_FILE = "critic.json"
CONTRACT_ID = "critic-compact-wire-v1"


class CriticContractError(RoleContractError):
    pass


def _contract() -> dict[str, Any]:
    value = load_role_contract(CONTRACT_FILE, CONTRACT_ID, "critic")
    expected = {
        "schema_version", "contract_id", "role", "max_wire_bytes", "max_boundaries",
        "max_challenges", "max_unresolved", "max_refs_per_record", "max_value_bytes",
        "boundary_kinds", "blocker_kinds", "grounded_boundary_status",
    }
    if set(value) != expected or value["grounded_boundary_status"] != "SUPPORTED_LIKELY":
        raise CriticContractError("Critic contract fields changed")
    return value


def critic_response_schema() -> dict[str, Any]:
    c = _contract()
    refs = {
        "type": "array",
        "maxItems": int(c["max_refs_per_record"]),
        "uniqueItems": True,
        "items": {"type": "string", "pattern": "^S[1-9][0-9]*@L[1-9][0-9]*$"},
    }
    boundary = {
        "type": "object",
        "properties": {
            "k": {"type": "string", "enum": list(c["boundary_kinds"])},
            "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
            "r": {**refs, "minItems": 1},
        },
        "required": ["k", "v", "r"],
        "additionalProperties": False,
    }
    challenge = {
        "type": "object",
        "properties": {
            "i": {"type": "string", "pattern": "^claim-[A-Za-z0-9._-]+$"},
            "k": {"type": "string", "enum": list(c["blocker_kinds"])},
            "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
            "r": refs,
        },
        "required": ["i", "k", "v", "r"],
        "additionalProperties": False,
    }
    unresolved = {
        "type": "object",
        "properties": {
            "k": {"type": "string", "enum": list(c["blocker_kinds"])},
            "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
            "r": refs,
        },
        "required": ["k", "v", "r"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "b": {"type": "array", "maxItems": int(c["max_boundaries"]), "items": boundary},
            "q": {"type": "array", "maxItems": int(c["max_challenges"]), "items": challenge},
            "u": {"type": "array", "maxItems": int(c["max_unresolved"]), "items": unresolved},
        },
        "required": ["b", "q", "u"],
        "additionalProperties": False,
    }


def critic_input_projection(
    evidence_package: dict[str, Any],
    mapper_artifact: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    try:
        artifact = validate_upstream_artifact(mapper_artifact, evidence_package, allowed_roles={"mapper"})
    except RoleContractError as exc:
        raise CriticContractError(str(exc)) from exc
    records = artifact["records"]
    return {
        "artifact_sha256": artifact_sha256(artifact),
        "role": "mapper",
        "claims": [
            {key: item[key] for key in ("id", "kind", "status", "value", "refs")}
            for item in records["claims"]
        ],
        "flow_edges": [
            {key: item[key] for key in ("from", "to", "status", "refs")}
            for item in records["flow_edges"]
        ],
        "blockers": list(records["blockers"]),
        "conflicts": list(records["conflicts"]),
    }


def validate_critic_wire(
    content: str,
    evidence_package: dict[str, Any],
    mapper_artifact: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    c = _contract()
    upstream = critic_input_projection(evidence_package, mapper_artifact)
    try:
        payload = parse_wire(content, max_wire_bytes=int(c["max_wire_bytes"]), role="Critic")
    except RoleContractError as exc:
        raise CriticContractError(str(exc)) from exc
    if not isinstance(payload, dict) or set(payload) != {"b", "q", "u"}:
        raise CriticContractError("Critic response must contain exactly b,q,u")
    boundaries, challenges, unresolved = payload["b"], payload["q"], payload["u"]
    if not isinstance(boundaries, list) or len(boundaries) > int(c["max_boundaries"]):
        raise CriticContractError("Critic boundary list is invalid")
    if not isinstance(challenges, list) or len(challenges) > int(c["max_challenges"]):
        raise CriticContractError("Critic challenge list is invalid")
    if not isinstance(unresolved, list) or len(unresolved) > int(c["max_unresolved"]):
        raise CriticContractError("Critic unresolved list is invalid")

    known = evidence_source_refs(evidence_package)
    boundary_kinds = frozenset(c["boundary_kinds"])
    blocker_kinds = frozenset(c["blocker_kinds"])
    mapper_claim_ids = frozenset(item["id"] for item in upstream["claims"])

    normalized_b: list[dict[str, Any]] = []
    seen_b: set[tuple[str, str]] = set()
    for index, item in enumerate(boundaries):
        label = f"b[{index}]"
        if not isinstance(item, dict) or set(item) != {"k", "v", "r"}:
            raise CriticContractError(f"{label} fields invalid")
        kind = item["k"]
        if kind not in boundary_kinds:
            raise CriticContractError(f"{label} boundary kind invalid")
        value = validate_short_text(item["v"], label=f"{label}.v", max_bytes=int(c["max_value_bytes"]))
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=1,
        )
        key = (kind, value)
        if key in seen_b:
            raise CriticContractError(f"duplicate Critic boundary: {kind!r}/{value!r}")
        seen_b.add(key)
        normalized_b.append({"k": kind, "v": value, "r": refs})

    normalized_q: list[dict[str, Any]] = []
    seen_q: set[tuple[str, str, str]] = set()
    for index, item in enumerate(challenges):
        label = f"q[{index}]"
        if not isinstance(item, dict) or set(item) != {"i", "k", "v", "r"}:
            raise CriticContractError(f"{label} fields invalid")
        claim_id = item["i"]
        if not isinstance(claim_id, str) or claim_id not in mapper_claim_ids:
            raise CriticContractError(f"{label} references unknown Mapper claim")
        kind = item["k"]
        if kind not in blocker_kinds:
            raise CriticContractError(f"{label} blocker kind invalid")
        value = validate_short_text(item["v"], label=f"{label}.v", max_bytes=int(c["max_value_bytes"]))
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=0,
        )
        key = (claim_id, kind, value)
        if key in seen_q:
            raise CriticContractError(f"duplicate Critic challenge for {claim_id!r}")
        seen_q.add(key)
        normalized_q.append({"i": claim_id, "k": kind, "v": value, "r": refs})

    normalized_u: list[dict[str, Any]] = []
    seen_u: set[tuple[str, str]] = set()
    for index, item in enumerate(unresolved):
        label = f"u[{index}]"
        if not isinstance(item, dict) or set(item) != {"k", "v", "r"}:
            raise CriticContractError(f"{label} fields invalid")
        kind = item["k"]
        if kind not in blocker_kinds:
            raise CriticContractError(f"{label} blocker kind invalid")
        value = validate_short_text(item["v"], label=f"{label}.v", max_bytes=int(c["max_value_bytes"]))
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=0,
        )
        key = (kind, value)
        if key in seen_u:
            raise CriticContractError(f"duplicate Critic unresolved record: {kind!r}/{value!r}")
        seen_u.add(key)
        normalized_u.append({"k": kind, "v": value, "r": refs})

    canonical = {"b": normalized_b, "q": normalized_q, "u": normalized_u}
    try:
        enforce_canonical_ceiling(canonical, max_wire_bytes=int(c["max_wire_bytes"]), role="Critic")
    except RoleContractError as exc:
        raise CriticContractError(str(exc)) from exc
    return canonical


def build_critic_prompt(
    evidence_package: dict[str, Any],
    mapper_artifact: dict[str, Any],
) -> str:
    validate_evidence_package(evidence_package)
    c = _contract()
    upstream = critic_input_projection(evidence_package, mapper_artifact)
    lines = [
        "ROLE: critic",
        "Find missing preservation/risk boundaries and bounded challenges to validated Mapper claims.",
        "Do not resolve upstream blockers/conflicts, declare release/device truth, write patches, choose status/confidence, or give a final verdict.",
        "Return compact JSON only with exact keys b,q,u.",
        "Boundary: {\"k\":\"boundary_kind\",\"v\":\"subject\",\"r\":[\"S#@L#\"]}; challenge: {\"i\":\"claim-mapper-...\",\"k\":\"blocker_kind\",\"v\":\"subject\",\"r\":[]}; unresolved uses k,v,r.",
        f"Maximum response bytes: {c['max_wire_bytes']}; boundaries/challenges/unresolved each <= {c['max_boundaries']}.",
        "Validated Mapper typed projection follows; it is not raw model prose:",
        json.dumps(upstream, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        f"SCOPE: {evidence_package['scope']}",
        "EVIDENCE:",
    ]
    for item in evidence_package["sources"]:
        lines.extend([
            f"REF {item['source_ref']['ref']} | authority_class={item['authority_class']} | path={item['path']} | source_sha={item['source_sha']}",
            item["content"],
            "END_REF",
        ])
    return "\n".join(lines).rstrip() + "\n"
