#!/usr/bin/env python3
"""Resolve and validate bounded structured response contracts for local Agent Skill evals."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
CLAIM_STATUSES = {"DIRECT", "SUPPORTED_LIKELY", "UNKNOWN", "CONFLICT"}
EVIDENCE_STATUSES = CLAIM_STATUSES - {"UNKNOWN"}
EVIDENCE_STATUS_ORDER = ("DIRECT", "SUPPORTED_LIKELY", "CONFLICT")
VERDICTS = {"SUPPORTED", "PARTIAL", "UNKNOWN", "CONFLICT"}
EDGE_KEYS = {"from", "to", "basis"}
TOP_LEVEL_KEYS = {
    "scope",
    "authority",
    "flow_edges",
    "request_identity",
    "no_extra_io",
    "tests",
    "generated_release",
    "narrowest_boundary",
    "blocked_claims",
    "verdict",
}
BASIS_CLAIMS = (
    "authority",
    "flow_edges",
    "request_identity",
    "no_extra_io",
    "tests",
    "generated_release",
    "narrowest_boundary",
)
EVIDENCE_ID_RE = re.compile(r"E[1-9][0-9]*\Z")


class ResponseContractError(ValueError):
    pass


def _load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ResponseContractError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ResponseContractError("JSON object required")
    return data


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def contract_sha256(contract: dict[str, Any] | None) -> str | None:
    if contract is None:
        return None
    return hashlib.sha256(canonical_json(contract).encode("utf-8")).hexdigest()


def _basis_enum(evidence_ids: list[str]) -> list[str]:
    return ["UNKNOWN", *(f"{status}:{evidence_id}" for status in EVIDENCE_STATUS_ORDER for evidence_id in evidence_ids)]


def _validate_claim_evidence_allowlist(
    value: Any,
    registry: dict[str, Any],
) -> dict[str, list[str]]:
    if not isinstance(value, dict) or set(value) != set(BASIS_CLAIMS):
        raise ResponseContractError(
            "claim_evidence_allowlist must contain exactly " + ", ".join(BASIS_CLAIMS)
        )
    result: dict[str, list[str]] = {}
    for claim in BASIS_CLAIMS:
        evidence_ids = value.get(claim)
        if not isinstance(evidence_ids, list) or not evidence_ids:
            raise ResponseContractError(f"claim_evidence_allowlist.{claim} must be a non-empty list")
        if len(evidence_ids) != len(set(evidence_ids)):
            raise ResponseContractError(f"claim_evidence_allowlist.{claim} contains duplicates")
        normalized: list[str] = []
        for evidence_id in evidence_ids:
            if not isinstance(evidence_id, str) or evidence_id not in registry:
                raise ResponseContractError(
                    f"claim_evidence_allowlist.{claim} references unknown evidence id: {evidence_id}"
                )
            normalized.append(evidence_id)
        result[claim] = normalized
    return result


def build_schema(contract: dict[str, Any]) -> dict[str, Any]:
    allowlist = contract.get("claim_evidence_allowlist")
    if not isinstance(allowlist, dict):
        raise ResponseContractError("claim_evidence_allowlist missing")
    expected_scope = contract.get("expected_scope")
    if not isinstance(expected_scope, str) or not expected_scope:
        raise ResponseContractError("expected_scope missing")
    return {
        "type": "object",
        "properties": {
            "scope": {"type": "string", "enum": [expected_scope]},
            "authority": {"type": "string", "enum": _basis_enum(allowlist["authority"])},
            "flow_edges": {
                "type": "array",
                "minItems": 1,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "from": {"type": "string", "minLength": 1, "maxLength": 80},
                        "to": {"type": "string", "minLength": 1, "maxLength": 80},
                        "basis": {"type": "string", "enum": _basis_enum(allowlist["flow_edges"])},
                    },
                    "required": ["from", "to", "basis"],
                    "additionalProperties": False,
                },
            },
            "request_identity": {"type": "string", "enum": _basis_enum(allowlist["request_identity"])},
            "no_extra_io": {"type": "string", "enum": _basis_enum(allowlist["no_extra_io"])},
            "tests": {
                "type": "array",
                "maxItems": 2,
                "items": {"type": "string", "enum": _basis_enum(allowlist["tests"])},
            },
            "generated_release": {"type": "string", "enum": _basis_enum(allowlist["generated_release"])},
            "narrowest_boundary": {"type": "string", "enum": _basis_enum(allowlist["narrowest_boundary"])},
            "blocked_claims": {
                "type": "array",
                "maxItems": 2,
                "items": {"type": "string", "maxLength": 120},
            },
            "verdict": {"type": "string", "enum": ["SUPPORTED", "PARTIAL", "UNKNOWN", "CONFLICT"]},
        },
        "required": [
            "scope",
            "authority",
            "flow_edges",
            "request_identity",
            "no_extra_io",
            "tests",
            "generated_release",
            "narrowest_boundary",
            "blocked_claims",
            "verdict",
        ],
        "additionalProperties": False,
    }


def load_contract(path: Path, skill: str, case_id: str) -> dict[str, Any] | None:
    data = _load_json(path)
    if data.get("schema_version") != SCHEMA_VERSION:
        raise ResponseContractError("unsupported response-contract schema_version")
    contracts = data.get("contracts")
    if not isinstance(contracts, dict):
        raise ResponseContractError("response contracts map missing")
    skill_map = contracts.get(str(skill))
    if skill_map is None:
        return None
    if not isinstance(skill_map, dict):
        raise ResponseContractError("skill response-contract map must be an object")
    raw_contract = skill_map.get(str(case_id))
    if raw_contract is None:
        return None
    if not isinstance(raw_contract, dict):
        raise ResponseContractError("response contract must be an object")
    expected = {
        "id",
        "expected_scope",
        "prompt_instruction",
        "evidence_registry",
        "claim_evidence_allowlist",
    }
    if set(raw_contract) != expected:
        raise ResponseContractError(
            "response contract must contain exactly id, expected_scope, prompt_instruction, evidence_registry, claim_evidence_allowlist"
        )
    for key in ("id", "expected_scope", "prompt_instruction"):
        if not isinstance(raw_contract.get(key), str) or not raw_contract[key].strip():
            raise ResponseContractError(f"response contract {key} missing")
    registry = raw_contract.get("evidence_registry")
    if not isinstance(registry, dict) or not 1 <= len(registry) <= 16:
        raise ResponseContractError("response contract evidence_registry must contain 1-16 entries")
    for evidence_id, entry in registry.items():
        if not isinstance(evidence_id, str) or EVIDENCE_ID_RE.fullmatch(evidence_id) is None:
            raise ResponseContractError(f"invalid evidence id: {evidence_id}")
        if not isinstance(entry, dict) or set(entry) != {"source_path", "source_anchor"}:
            raise ResponseContractError(f"evidence {evidence_id} must contain exactly source_path and source_anchor")
        for key in ("source_path", "source_anchor"):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise ResponseContractError(f"evidence {evidence_id} {key} missing")
    allowlist = _validate_claim_evidence_allowlist(raw_contract.get("claim_evidence_allowlist"), registry)
    contract = dict(raw_contract)
    contract["claim_evidence_allowlist"] = allowlist
    contract["schema"] = build_schema(contract)
    return contract


def response_format(contract: dict[str, Any] | None) -> dict[str, Any] | None:
    if contract is None:
        return None
    return {"type": "json_object", "schema": contract["schema"]}


def _bounded_string(value: Any, label: str, maximum: int, *, allow_empty: bool = True) -> str:
    if not isinstance(value, str):
        raise ResponseContractError(f"{label} must be a string")
    if not allow_empty and not value:
        raise ResponseContractError(f"{label} must not be empty")
    if len(value) > maximum:
        raise ResponseContractError(f"{label} exceeds max length {maximum}")
    return value


def _source_map(context: dict[str, Any]) -> dict[str, str]:
    blocks = context.get("blocks")
    if not isinstance(blocks, list):
        raise ResponseContractError("context blocks missing")
    result: dict[str, str] = {}
    for block in blocks:
        if not isinstance(block, dict):
            raise ResponseContractError("context block must be an object")
        path = block.get("path")
        text = block.get("text")
        if not isinstance(path, str) or not path or not isinstance(text, str):
            raise ResponseContractError("context block path/text missing")
        if path in result and result[path] != text:
            raise ResponseContractError(f"duplicate context path with conflicting text: {path}")
        result[path] = text
    return result


def validate_evidence_registry(contract: dict[str, Any], context: dict[str, Any]) -> dict[str, dict[str, str]]:
    registry = contract.get("evidence_registry")
    if not isinstance(registry, dict) or not registry:
        raise ResponseContractError("response contract evidence_registry missing")
    sources = _source_map(context)
    validated: dict[str, dict[str, str]] = {}
    for evidence_id in sorted(registry, key=lambda value: int(value[1:])):
        entry = registry[evidence_id]
        if not isinstance(evidence_id, str) or EVIDENCE_ID_RE.fullmatch(evidence_id) is None:
            raise ResponseContractError(f"invalid evidence id: {evidence_id}")
        if not isinstance(entry, dict) or set(entry) != {"source_path", "source_anchor"}:
            raise ResponseContractError(f"evidence {evidence_id} malformed")
        source_path = _bounded_string(entry.get("source_path"), f"evidence {evidence_id}.source_path", 180, allow_empty=False)
        source_anchor = _bounded_string(entry.get("source_anchor"), f"evidence {evidence_id}.source_anchor", 120, allow_empty=False)
        source_text = sources.get(source_path)
        if source_text is None:
            raise ResponseContractError(f"evidence {evidence_id}.source_path is not a supplied context path: {source_path}")
        if source_anchor not in source_text:
            raise ResponseContractError(
                f"evidence {evidence_id}.source_anchor not found verbatim in {source_path}: {source_anchor}"
            )
        validated[evidence_id] = {"source_path": source_path, "source_anchor": source_anchor}
    return validated


def evidence_legend(contract: dict[str, Any], context: dict[str, Any]) -> str:
    registry = validate_evidence_registry(contract, context)
    return "\n".join(
        f"{evidence_id} = {entry['source_path']} :: {entry['source_anchor']}"
        for evidence_id, entry in registry.items()
    )


def claim_evidence_legend(contract: dict[str, Any]) -> str:
    allowlist = contract.get("claim_evidence_allowlist")
    if not isinstance(allowlist, dict) or set(allowlist) != set(BASIS_CLAIMS):
        raise ResponseContractError("claim_evidence_allowlist missing or malformed")
    return "\n".join(f"{claim} = {','.join(allowlist[claim])}" for claim in BASIS_CLAIMS)


def _validate_basis(
    value: Any,
    label: str,
    registry: dict[str, dict[str, str]],
    allowed_ids: list[str],
) -> dict[str, Any]:
    basis = _bounded_string(value, label, 40, allow_empty=False)
    if basis == "UNKNOWN":
        return {"basis": basis, "status": "UNKNOWN", "evidence_id": None}
    if ":" not in basis:
        raise ResponseContractError(f"{label} must be UNKNOWN or STATUS:E#")
    status, evidence_id = basis.split(":", 1)
    if status not in EVIDENCE_STATUSES:
        raise ResponseContractError(f"{label} status invalid")
    if evidence_id not in registry:
        raise ResponseContractError(f"{label} references unknown evidence id: {evidence_id}")
    if evidence_id not in allowed_ids:
        raise ResponseContractError(f"{label} evidence id not compatible with claim: {evidence_id}")
    return {"basis": basis, "status": status, "evidence_id": evidence_id}


def _validate_edge(
    value: Any,
    index: int,
    registry: dict[str, dict[str, str]],
    allowed_ids: list[str],
) -> dict[str, Any]:
    label = f"flow_edges[{index}]"
    if not isinstance(value, dict) or set(value) != EDGE_KEYS:
        raise ResponseContractError(f"{label} must contain exactly {sorted(EDGE_KEYS)}")
    _bounded_string(value.get("from"), f"{label}.from", 80, allow_empty=False)
    _bounded_string(value.get("to"), f"{label}.to", 80, allow_empty=False)
    return _validate_basis(value.get("basis"), f"{label}.basis", registry, allowed_ids)


def validate_impact_scope_output(content: str, contract: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ResponseContractError(f"structured response is not valid JSON: {exc}") from exc
    if not isinstance(payload, dict) or set(payload) != TOP_LEVEL_KEYS:
        raise ResponseContractError(f"structured response must contain exactly {sorted(TOP_LEVEL_KEYS)}")
    scope = _bounded_string(payload.get("scope"), "scope", 80, allow_empty=False)
    if scope != contract["expected_scope"]:
        raise ResponseContractError(f"scope mismatch: expected {contract['expected_scope']}, got {scope}")

    registry = validate_evidence_registry(contract, context)
    allowlist = contract.get("claim_evidence_allowlist")
    if not isinstance(allowlist, dict):
        raise ResponseContractError("claim_evidence_allowlist missing")

    authority = _validate_basis(payload.get("authority"), "authority", registry, allowlist["authority"])
    edges = payload.get("flow_edges")
    if not isinstance(edges, list) or not 1 <= len(edges) <= 3:
        raise ResponseContractError("flow_edges must contain 1-3 entries")
    seen_edges: set[tuple[str, str, str]] = set()
    edge_bases: list[dict[str, Any]] = []
    for index, edge in enumerate(edges):
        edge_bases.append(_validate_edge(edge, index, registry, allowlist["flow_edges"]))
        identity = (str(edge["from"]), str(edge["to"]), str(edge["basis"]))
        if identity in seen_edges:
            raise ResponseContractError("duplicate flow edge rejected")
        seen_edges.add(identity)

    request_identity = _validate_basis(
        payload.get("request_identity"), "request_identity", registry, allowlist["request_identity"]
    )
    no_extra_io = _validate_basis(payload.get("no_extra_io"), "no_extra_io", registry, allowlist["no_extra_io"])
    tests = payload.get("tests")
    if not isinstance(tests, list) or len(tests) > 2:
        raise ResponseContractError("tests must contain at most 2 entries")
    test_bases = [
        _validate_basis(item, f"tests[{index}]", registry, allowlist["tests"])
        for index, item in enumerate(tests)
    ]
    generated_release = _validate_basis(
        payload.get("generated_release"), "generated_release", registry, allowlist["generated_release"]
    )
    narrowest_boundary = _validate_basis(
        payload.get("narrowest_boundary"), "narrowest_boundary", registry, allowlist["narrowest_boundary"]
    )

    blocked = payload.get("blocked_claims")
    if not isinstance(blocked, list) or len(blocked) > 2:
        raise ResponseContractError("blocked_claims must contain at most 2 entries")
    for index, item in enumerate(blocked):
        _bounded_string(item, f"blocked_claims[{index}]", 120)

    verdict = payload.get("verdict")
    if verdict not in VERDICTS:
        raise ResponseContractError("verdict invalid")
    required_preservation = (request_identity, no_extra_io, generated_release, narrowest_boundary)
    if verdict == "SUPPORTED" and any(item["status"] in {"UNKNOWN", "CONFLICT"} for item in required_preservation):
        raise ResponseContractError("SUPPORTED verdict conflicts with unresolved required preservation claim")

    all_bases = [authority, *edge_bases, request_identity, no_extra_io, *test_bases, generated_release, narrowest_boundary]
    if any(item["status"] == "CONFLICT" for item in all_bases) and verdict != "CONFLICT":
        raise ResponseContractError("CONFLICT evidence basis requires CONFLICT verdict")
    return payload


def validate_content(content: str, contract: dict[str, Any] | None, context: dict[str, Any]) -> dict[str, Any] | None:
    if contract is None:
        return None
    if contract.get("id") != "impact-scope-evidence-compat-v4":
        raise ResponseContractError(f"unsupported response contract id: {contract.get('id')}")
    return validate_impact_scope_output(content, contract, context)
