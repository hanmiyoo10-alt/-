from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from canonical import canonical_json_bytes, canonical_sha256
from evidence import evidence_package_sha256, evidence_source_refs, validate_evidence_package
from registry import load_model_registry
from runtime.generation import SCOUT_MODEL_PROFILE_ID, scout_model_profile
from schema_validation import ContractValidationError, validate_contract

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = PACKAGE_ROOT / "role-contracts" / "scout.json"


class ScoutContractError(ValueError):
    pass


def _load_contract(path: Path | str = CONTRACT_PATH) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ScoutContractError("Scout contract must be a JSON object")
    required = {
        "schema_version", "contract_id", "role", "max_wire_bytes", "max_records",
        "max_refs_per_record", "record_kinds", "statuses", "source_selection_value",
        "unknown_value"
    }
    if set(data) != required:
        raise ScoutContractError("Scout contract fields changed")
    if data["schema_version"] != 1 or data["contract_id"] != "scout-compact-wire-v2" or data["role"] != "scout":
        raise ScoutContractError("Scout contract identity changed")
    return data


def scout_response_schema(contract: dict[str, Any] | None = None) -> dict[str, Any]:
    c = _load_contract() if contract is None else contract
    return {
        "type": "object",
        "properties": {
            "r": {
                "type": "array",
                "maxItems": int(c["max_records"]),
                "items": {
                    "type": "object",
                    "properties": {
                        "k": {"type": "string", "enum": sorted(c["record_kinds"])},
                        "s": {"type": "string", "enum": sorted(c["statuses"])},
                        "v": {"type": "string", "maxLength": 64},
                        "r": {
                            "type": "array",
                            "maxItems": int(c["max_refs_per_record"]),
                            "uniqueItems": True,
                            "items": {"type": "string", "pattern": "^S[1-9][0-9]*@L[1-9][0-9]*$"},
                        },
                    },
                    "required": ["k", "s", "v", "r"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["r"],
        "additionalProperties": False,
    }


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise ScoutContractError(f"duplicate JSON key: {key}")
        out[key] = value
    return out


def _source_by_ref(evidence_package: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(item["source_ref"]["ref"]): item for item in evidence_package["sources"]}


def validate_scout_wire(content: str, evidence_package: dict[str, Any]) -> dict[str, Any]:
    validate_evidence_package(evidence_package)
    contract = _load_contract()
    if not isinstance(content, str) or not content.strip():
        raise ScoutContractError("Scout response is empty")
    if len(content.encode("utf-8")) > int(contract["max_wire_bytes"]):
        raise ScoutContractError("Scout response exceeds compact wire byte ceiling")
    try:
        payload = json.loads(content, object_pairs_hook=_unique_object)
    except json.JSONDecodeError as exc:
        raise ScoutContractError(f"Scout response is not exact JSON: {exc}") from exc
    if not isinstance(payload, dict) or set(payload) != {"r"}:
        raise ScoutContractError("Scout response must contain exactly r")
    records = payload["r"]
    if not isinstance(records, list) or len(records) > int(contract["max_records"]):
        raise ScoutContractError("Scout record list is invalid")

    known = evidence_source_refs(evidence_package)
    by_ref = _source_by_ref(evidence_package)
    normalized: list[dict[str, Any]] = []
    for index, record in enumerate(records):
        label = f"r[{index}]"
        if not isinstance(record, dict) or set(record) != {"k", "s", "v", "r"}:
            raise ScoutContractError(f"{label} fields invalid")
        kind = record["k"]
        status = record["s"]
        value = record["v"]
        refs = record["r"]
        if kind not in contract["record_kinds"] or status not in contract["statuses"]:
            raise ScoutContractError(f"{label} kind/status invalid")
        if not isinstance(value, str) or not value or len(value.encode("utf-8")) > 64:
            raise ScoutContractError(f"{label} value invalid")
        if not isinstance(refs, list) or len(refs) > int(contract["max_refs_per_record"]):
            raise ScoutContractError(f"{label} refs invalid")
        if any(not isinstance(ref, str) or ref not in known for ref in refs):
            raise ScoutContractError(f"{label} references unknown evidence")
        if len(refs) != len(set(refs)):
            raise ScoutContractError(f"{label} refs must be unique")

        if status == "U":
            if refs or value != contract["unknown_value"]:
                raise ScoutContractError(f"{label} UNKNOWN must have no refs and value=unknown")
        else:
            if not refs:
                raise ScoutContractError(f"{label} non-UNKNOWN record requires evidence refs")
            if kind == "s" and value != contract["source_selection_value"]:
                raise ScoutContractError(f"{label} source selection cannot carry semantic prose")
            if kind == "a":
                classes = {str(by_ref[ref]["authority_class"]) for ref in refs}
                if len(classes) != 1 or value not in classes:
                    raise ScoutContractError(
                        f"{label} authority record must reference exactly one supplied authority class"
                    )
        normalized.append({"k": kind, "s": status, "v": value, "r": list(refs)})

    canonical = {"r": normalized}
    if len(canonical_json_bytes(canonical)) > int(contract["max_wire_bytes"]):
        raise ScoutContractError("Scout canonical response exceeds compact wire byte ceiling")
    return canonical


def build_scout_prompt(evidence_package: dict[str, Any]) -> str:
    validate_evidence_package(evidence_package)
    contract = _load_contract()
    lines = [
        "ROLE: scout",
        "Select only relevant supplied evidence and supplied authority classes.",
        "Do not infer semantic owners, flows, release truth, device truth, patches, confidence, conflicts, or a final verdict.",
        "Return compact JSON only: {\"r\":[{\"k\":\"a|s\",\"s\":\"D|L|U\",\"v\":\"...\",\"r\":[\"S#@L#\"]}]}",
        f"Maximum response bytes: {contract['max_wire_bytes']}; maximum records: {contract['max_records']}.",
        "For k=s use value relevant_source. For U use value unknown and no refs.",
        "For k=a use exactly one authority_class shown below per record; all refs in that record must share that class.",
        "If multiple authority classes are relevant, emit separate k=a records. Different classes do not by themselves mean conflict; do not report authority conflict.",
        f"SCOPE: {evidence_package['scope']}",
        "EVIDENCE:",
    ]
    for item in evidence_package["sources"]:
        lines.extend([
            f"REF {item['source_ref']['ref']} | authority_class={item['authority_class']} | path={item['path']} | source_sha={item['source_sha']}",
            item["content"],
            "END_REF",
        ])
    if evidence_package["blockers"]:
        lines.append("DETERMINISTIC_BLOCKERS_PRESENT: do not erase them; Scout output cannot resolve them.")
    return "\n".join(lines).rstrip() + "\n"


def prompt_sha256(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def build_role_artifact(
    content: str,
    evidence_package: dict[str, Any],
    prompt: str,
    *,
    registry_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    parsed = validate_scout_wire(content, evidence_package)
    profile = scout_model_profile(load_model_registry() if registry_data is None else registry_data)
    statuses = _load_contract()["statuses"]
    claims: list[dict[str, Any]] = []
    for index, item in enumerate(parsed["r"], start=1):
        kind = "authority" if item["k"] == "a" else "other"
        claims.append({
            "id": f"claim-scout-{index:03d}",
            "kind": kind,
            "status": statuses[item["s"]],
            "value": item["v"],
            "refs": list(item["r"]),
            "role": "scout",
        })
    artifact = {
        "schema_version": 1,
        "role": "scout",
        "model_profile_id": SCOUT_MODEL_PROFILE_ID,
        "model_digest": profile["sha256"],
        "target_repository_sha": evidence_package["target_repository_sha"],
        "evidence_sha256": evidence_package_sha256(evidence_package),
        "prompt_sha256": prompt_sha256(prompt),
        "structured_response_sha256": canonical_sha256(parsed),
        "upstream_artifact_sha256": [],
        "records": {
            "claims": claims,
            "flow_edges": [],
            "boundaries": [],
            "blockers": [],
            "conflicts": [],
        },
    }
    try:
        validate_contract(artifact, "role-artifact.schema.json", known_source_refs=evidence_source_refs(evidence_package))
    except ContractValidationError as exc:
        raise ScoutContractError(f"generated Scout RoleArtifact is invalid: {exc}") from exc
    return artifact


def role_artifact_sha256(artifact: dict[str, Any], evidence_package: dict[str, Any]) -> str:
    try:
        validate_contract(artifact, "role-artifact.schema.json", known_source_refs=evidence_source_refs(evidence_package))
    except ContractValidationError as exc:
        raise ScoutContractError(f"invalid Scout RoleArtifact: {exc}") from exc
    if artifact["role"] != "scout" or artifact["model_profile_id"] != SCOUT_MODEL_PROFILE_ID:
        raise ScoutContractError("Scout RoleArtifact identity mismatch")
    return canonical_sha256(artifact)
