from __future__ import annotations

import json
from typing import Any

from canonical import canonical_json_bytes
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

CONTRACT_FILE = "mapper.json"
CONTRACT_ID = "mapper-compact-wire-v1"


class MapperContractError(RoleContractError):
    pass


def _contract() -> dict[str, Any]:
    value = load_role_contract(CONTRACT_FILE, CONTRACT_ID, "mapper")
    expected = {
        "schema_version", "contract_id", "role", "max_wire_bytes", "max_owners",
        "max_edges", "max_refs_per_record", "max_value_bytes", "grounded_status",
    }
    if set(value) != expected or value["grounded_status"] != "SUPPORTED_LIKELY":
        raise MapperContractError("Mapper contract fields changed")
    return value


def mapper_response_schema() -> dict[str, Any]:
    c = _contract()
    ref_schema = {
        "type": "array",
        "minItems": 1,
        "maxItems": int(c["max_refs_per_record"]),
        "uniqueItems": True,
        "items": {"type": "string", "pattern": "^S[1-9][0-9]*@L[1-9][0-9]*$"},
    }
    return {
        "type": "object",
        "properties": {
            "o": {
                "type": "array",
                "maxItems": int(c["max_owners"]),
                "items": {
                    "type": "object",
                    "properties": {
                        "v": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
                        "r": ref_schema,
                    },
                    "required": ["v", "r"],
                    "additionalProperties": False,
                },
            },
            "e": {
                "type": "array",
                "maxItems": int(c["max_edges"]),
                "items": {
                    "type": "object",
                    "properties": {
                        "f": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
                        "t": {"type": "string", "minLength": 1, "maxLength": int(c["max_value_bytes"])},
                        "r": ref_schema,
                    },
                    "required": ["f", "t", "r"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["o", "e"],
        "additionalProperties": False,
    }


def validate_mapper_wire(content: str, evidence_package: dict[str, Any]) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    c = _contract()
    try:
        payload = parse_wire(content, max_wire_bytes=int(c["max_wire_bytes"]), role="Mapper")
    except RoleContractError as exc:
        raise MapperContractError(str(exc)) from exc
    if not isinstance(payload, dict) or set(payload) != {"o", "e"}:
        raise MapperContractError("Mapper response must contain exactly o,e")
    owners = payload["o"]
    edges = payload["e"]
    if not isinstance(owners, list) or len(owners) > int(c["max_owners"]):
        raise MapperContractError("Mapper owner list is invalid")
    if not isinstance(edges, list) or len(edges) > int(c["max_edges"]):
        raise MapperContractError("Mapper edge list is invalid")

    known = evidence_source_refs(evidence_package)
    normalized_owners: list[dict[str, Any]] = []
    seen_owners: set[str] = set()
    for index, item in enumerate(owners):
        label = f"o[{index}]"
        if not isinstance(item, dict) or set(item) != {"v", "r"}:
            raise MapperContractError(f"{label} fields invalid")
        value = validate_short_text(item["v"], label=f"{label}.v", max_bytes=int(c["max_value_bytes"]))
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=1,
        )
        if value in seen_owners:
            raise MapperContractError(f"duplicate Mapper owner: {value!r}")
        seen_owners.add(value)
        normalized_owners.append({"v": value, "r": refs})

    normalized_edges: list[dict[str, Any]] = []
    seen_edges: set[tuple[str, str]] = set()
    for index, item in enumerate(edges):
        label = f"e[{index}]"
        if not isinstance(item, dict) or set(item) != {"f", "t", "r"}:
            raise MapperContractError(f"{label} fields invalid")
        source = validate_short_text(item["f"], label=f"{label}.f", max_bytes=int(c["max_value_bytes"]))
        target = validate_short_text(item["t"], label=f"{label}.t", max_bytes=int(c["max_value_bytes"]))
        if source == target:
            raise MapperContractError(f"{label} self-edge is invalid")
        refs = validate_refs(
            item["r"], known_refs=known, label=label,
            max_refs=int(c["max_refs_per_record"]), min_refs=1,
        )
        key = (source, target)
        if key in seen_edges:
            raise MapperContractError(f"duplicate Mapper edge: {source!r}->{target!r}")
        seen_edges.add(key)
        normalized_edges.append({"f": source, "t": target, "r": refs})

    canonical = {"o": normalized_owners, "e": normalized_edges}
    try:
        enforce_canonical_ceiling(canonical, max_wire_bytes=int(c["max_wire_bytes"]), role="Mapper")
    except RoleContractError as exc:
        raise MapperContractError(str(exc)) from exc
    return canonical


def mapper_input_projection(
    evidence_package: dict[str, Any],
    scout_artifact: dict[str, Any],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    try:
        artifact = validate_upstream_artifact(scout_artifact, evidence_package, allowed_roles={"scout"})
    except RoleContractError as exc:
        raise MapperContractError(str(exc)) from exc
    records = artifact["records"]
    return {
        "artifact_sha256": artifact_sha256(artifact),
        "role": "scout",
        "claims": [
            {key: item[key] for key in ("id", "kind", "status", "value", "refs")}
            for item in records["claims"]
        ],
        "blockers": list(records["blockers"]),
        "conflicts": list(records["conflicts"]),
    }


def build_mapper_prompt(
    evidence_package: dict[str, Any],
    scout_artifact: dict[str, Any],
) -> str:
    validate_evidence_package(evidence_package)
    c = _contract()
    upstream = mapper_input_projection(evidence_package, scout_artifact)
    lines = [
        "ROLE: mapper",
        "Propose only semantic owners and producer-to-consumer edges grounded in supplied evidence.",
        "Do not declare release truth, device truth, patches, confidence, status, conflict resolution, or a final verdict.",
        "Return compact JSON only: {\"o\":[{\"v\":\"owner\",\"r\":[\"S#@L#\"]}],\"e\":[{\"f\":\"producer\",\"t\":\"consumer\",\"r\":[\"S#@L#\"]}]}",
        f"Maximum response bytes: {c['max_wire_bytes']}; owners: {c['max_owners']}; edges: {c['max_edges']}.",
        "Every non-empty record must cite supplied refs. If no grounded mapping is available, return exactly {\"o\":[],\"e\":[]}.",
        "Validated Scout typed projection follows; it is not raw model prose:",
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


def mapper_wire_sha256(content: str, evidence_package: dict[str, Any]) -> str:
    from canonical import canonical_sha256
    return canonical_sha256(validate_mapper_wire(content, evidence_package))
