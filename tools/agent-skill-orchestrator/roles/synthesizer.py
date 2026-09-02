from __future__ import annotations

import json
from typing import Any, Iterable

from evidence import validate_evidence_package
from roles._compact import (
    RoleContractError,
    artifact_sha256,
    enforce_canonical_ceiling,
    load_role_contract,
    parse_wire,
    validate_upstream_artifact,
)

CONTRACT_FILE = "synthesizer.json"
CONTRACT_ID = "synthesizer-compact-wire-v1"
ROLE_ORDER = {"scout": 0, "mapper": 1, "critic": 2}
RECORD_FAMILIES = (
    ("claims", "C", "claim"),
    ("flow_edges", "E", "flow_edge"),
    ("boundaries", "B", "boundary"),
    ("blockers", "K", "blocker"),
    ("conflicts", "X", "conflict"),
)


class SynthesizerContractError(RoleContractError):
    pass


def _contract() -> dict[str, Any]:
    value = load_role_contract(CONTRACT_FILE, CONTRACT_ID, "synthesizer")
    expected = {
        "schema_version", "contract_id", "role", "max_wire_bytes", "max_selected_ids",
        "mandatory_statuses", "mandatory_all_blockers", "mandatory_unresolved_conflicts",
    }
    if set(value) != expected:
        raise SynthesizerContractError("Synthesizer contract fields changed")
    if value["mandatory_statuses"] != ["UNKNOWN", "CONFLICT"]:
        raise SynthesizerContractError("Synthesizer mandatory status policy changed")
    if value["mandatory_all_blockers"] is not True or value["mandatory_unresolved_conflicts"] is not True:
        raise SynthesizerContractError("Synthesizer mandatory preservation policy changed")
    return value


def synthesizer_response_schema() -> dict[str, Any]:
    c = _contract()
    return {
        "type": "object",
        "properties": {
            "s": {
                "type": "array",
                "maxItems": int(c["max_selected_ids"]),
                "uniqueItems": True,
                "items": {"type": "string", "pattern": "^[CEBKX][1-9][0-9]*$"},
            }
        },
        "required": ["s"],
        "additionalProperties": False,
    }


def synthesizer_input_projection(
    evidence_package: dict[str, Any],
    upstream_artifacts: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    artifacts = list(upstream_artifacts)
    if not artifacts:
        raise SynthesizerContractError("Synthesizer requires at least one validated upstream RoleArtifact")

    validated: list[dict[str, Any]] = []
    seen_roles: set[str] = set()
    seen_shas: set[str] = set()
    for raw in artifacts:
        try:
            artifact = validate_upstream_artifact(
                raw,
                evidence_package,
                allowed_roles={"scout", "mapper", "critic"},
            )
        except RoleContractError as exc:
            raise SynthesizerContractError(str(exc)) from exc
        role = str(artifact["role"])
        if role in seen_roles:
            raise SynthesizerContractError(f"duplicate upstream role artifact: {role}")
        sha = artifact_sha256(artifact)
        if sha in seen_shas:
            raise SynthesizerContractError("duplicate upstream RoleArtifact digest")
        seen_roles.add(role)
        seen_shas.add(sha)
        validated.append(artifact)

    validated.sort(key=lambda item: ROLE_ORDER[str(item["role"])])
    records: list[dict[str, Any]] = []
    counters = {prefix: 0 for _, prefix, _ in RECORD_FAMILIES}
    mandatory: list[str] = []
    c = _contract()
    mandatory_statuses = frozenset(c["mandatory_statuses"])

    for artifact in validated:
        role = str(artifact["role"])
        sha = artifact_sha256(artifact)
        for family, prefix, record_type in RECORD_FAMILIES:
            for record in artifact["records"][family]:
                counters[prefix] += 1
                record_id = f"{prefix}{counters[prefix]}"
                item = {
                    "id": record_id,
                    "type": record_type,
                    "source_role": role,
                    "artifact_sha256": sha,
                    "record": record,
                }
                records.append(item)
                if record_type in {"claim", "flow_edge", "boundary"} and record.get("status") in mandatory_statuses:
                    mandatory.append(record_id)
                elif record_type == "blocker" and c["mandatory_all_blockers"]:
                    mandatory.append(record_id)
                elif record_type == "conflict" and c["mandatory_unresolved_conflicts"] and record.get("resolution") == "UNRESOLVED":
                    mandatory.append(record_id)

    if len(mandatory) > int(c["max_selected_ids"]):
        raise SynthesizerContractError("mandatory upstream records exceed Synthesizer selection ceiling")

    return {
        "artifacts": [
            {"role": artifact["role"], "artifact_sha256": artifact_sha256(artifact)}
            for artifact in validated
        ],
        "records": records,
        "mandatory_ids": mandatory,
    }


def validate_synthesizer_wire(
    content: str,
    evidence_package: dict[str, Any],
    upstream_artifacts: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    c = _contract()
    projection = synthesizer_input_projection(evidence_package, upstream_artifacts)
    try:
        payload = parse_wire(content, max_wire_bytes=int(c["max_wire_bytes"]), role="Synthesizer")
    except RoleContractError as exc:
        raise SynthesizerContractError(str(exc)) from exc
    if not isinstance(payload, dict) or set(payload) != {"s"}:
        raise SynthesizerContractError("Synthesizer response must contain exactly s")
    selected = payload["s"]
    if not isinstance(selected, list) or len(selected) > int(c["max_selected_ids"]):
        raise SynthesizerContractError("Synthesizer selection list is invalid")
    if any(not isinstance(item, str) for item in selected):
        raise SynthesizerContractError("Synthesizer selection ids must be strings")
    if len(selected) != len(set(selected)):
        raise SynthesizerContractError("Synthesizer selection ids must be unique")

    valid_order = [item["id"] for item in projection["records"]]
    known = frozenset(valid_order)
    for item in selected:
        if item not in known:
            raise SynthesizerContractError(f"Synthesizer selected unknown upstream record id: {item}")

    union = set(selected)
    union.update(projection["mandatory_ids"])
    normalized = {"s": [item for item in valid_order if item in union]}
    if len(normalized["s"]) > int(c["max_selected_ids"]):
        raise SynthesizerContractError("Synthesizer mandatory union exceeds selection ceiling")
    try:
        enforce_canonical_ceiling(normalized, max_wire_bytes=int(c["max_wire_bytes"]), role="Synthesizer")
    except RoleContractError as exc:
        raise SynthesizerContractError(str(exc)) from exc
    return normalized


def build_synthesizer_prompt(
    evidence_package: dict[str, Any],
    upstream_artifacts: Iterable[dict[str, Any]],
) -> str:
    c = _contract()
    projection = synthesizer_input_projection(evidence_package, upstream_artifacts)
    return "\n".join([
        "ROLE: synthesizer",
        "Select the narrowest useful subset of supplied validated upstream typed records.",
        "Do not author new claims, edges, boundaries, blockers, conflicts, status, confidence, release/device truth, patches, or a final verdict.",
        "Return compact JSON only: {\"s\":[\"C1\",\"E1\"]}.",
        "UNKNOWN/CONFLICT records, all blockers, and unresolved conflicts are preserved deterministically even if you omit them.",
        f"Maximum response bytes: {c['max_wire_bytes']}; maximum selected ids: {c['max_selected_ids']}.",
        "VALIDATED_TYPED_UPSTREAM_INDEX:",
        json.dumps(projection, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
    ]).rstrip() + "\n"
