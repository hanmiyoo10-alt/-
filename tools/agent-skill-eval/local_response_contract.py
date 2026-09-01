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
}
BASIS_CLAIMS = (
    "authority",
    "request_identity",
    "no_extra_io",
    "tests",
    "generated_release",
    "narrowest_boundary",
)
EVIDENCE_ID_RE = re.compile(r"E[1-9][0-9]*\Z")
FLOW_ID_RE = re.compile(r"F[1-9][0-9]*\Z")
DERIVED_IMPACT_VERDICTS = {"SUPPORTED", "PARTIAL", "UNKNOWN", "CONFLICT"}


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


def _validate_claim_evidence_status_allowlist(
    value: Any,
    registry: dict[str, Any],
) -> dict[str, dict[str, list[str]]]:
    if not isinstance(value, dict) or set(value) != set(BASIS_CLAIMS):
        raise ResponseContractError(
            "claim_evidence_status_allowlist must contain exactly " + ", ".join(BASIS_CLAIMS)
        )
    result: dict[str, dict[str, list[str]]] = {}
    for claim in BASIS_CLAIMS:
        raw_map = value.get(claim)
        if not isinstance(raw_map, dict) or not raw_map:
            raise ResponseContractError(
                f"claim_evidence_status_allowlist.{claim} must be a non-empty object"
            )
        normalized: dict[str, list[str]] = {}
        for evidence_id, raw_statuses in raw_map.items():
            if not isinstance(evidence_id, str) or evidence_id not in registry:
                raise ResponseContractError(
                    f"claim_evidence_status_allowlist.{claim} references unknown evidence id: {evidence_id}"
                )
            if not isinstance(raw_statuses, list) or not raw_statuses:
                raise ResponseContractError(
                    f"claim_evidence_status_allowlist.{claim}.{evidence_id} must be a non-empty list"
                )
            if len(raw_statuses) != len(set(raw_statuses)):
                raise ResponseContractError(
                    f"claim_evidence_status_allowlist.{claim}.{evidence_id} contains duplicate statuses"
                )
            if any(not isinstance(status, str) or status not in EVIDENCE_STATUSES for status in raw_statuses):
                raise ResponseContractError(
                    f"claim_evidence_status_allowlist.{claim}.{evidence_id} contains invalid evidence status"
                )
            normalized[evidence_id] = [
                status for status in EVIDENCE_STATUS_ORDER if status in raw_statuses
            ]
        result[claim] = normalized
    return result


def _validate_flow_edge_registry(
    value: Any,
    evidence_registry: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    if not isinstance(value, dict) or not 1 <= len(value) <= 8:
        raise ResponseContractError("flow_edge_registry must contain 1-8 entries")
    normalized: dict[str, dict[str, Any]] = {}
    for flow_id, raw in value.items():
        if not isinstance(flow_id, str) or FLOW_ID_RE.fullmatch(flow_id) is None:
            raise ResponseContractError(f"invalid flow edge id: {flow_id}")
        if not isinstance(raw, dict) or set(raw) != {"from", "to", "evidence_ids"}:
            raise ResponseContractError(
                f"flow edge {flow_id} must contain exactly from, to, evidence_ids"
            )
        source = raw.get("from")
        target = raw.get("to")
        evidence_ids = raw.get("evidence_ids")
        if not isinstance(source, str) or not source.strip() or len(source) > 120:
            raise ResponseContractError(f"flow edge {flow_id}.from invalid")
        if not isinstance(target, str) or not target.strip() or len(target) > 120:
            raise ResponseContractError(f"flow edge {flow_id}.to invalid")
        if source == target:
            raise ResponseContractError(f"flow edge {flow_id} must connect distinct endpoints")
        if not isinstance(evidence_ids, list) or not 1 <= len(evidence_ids) <= 4:
            raise ResponseContractError(f"flow edge {flow_id}.evidence_ids must contain 1-4 ids")
        if len(evidence_ids) != len(set(evidence_ids)):
            raise ResponseContractError(f"flow edge {flow_id}.evidence_ids contains duplicates")
        for evidence_id in evidence_ids:
            if not isinstance(evidence_id, str) or evidence_id not in evidence_registry:
                raise ResponseContractError(
                    f"flow edge {flow_id} references unknown evidence id: {evidence_id}"
                )
        normalized[flow_id] = {
            "from": source.strip(),
            "to": target.strip(),
            "evidence_ids": list(evidence_ids),
        }
    return normalized


def _validate_required_flow_edge_ids(
    value: Any,
    flow_registry: dict[str, Any],
) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ResponseContractError("required_flow_edge_ids must be a non-empty list")
    if len(value) != len(set(value)):
        raise ResponseContractError("required_flow_edge_ids contains duplicates")
    for flow_id in value:
        if not isinstance(flow_id, str) or flow_id not in flow_registry:
            raise ResponseContractError(
                f"required_flow_edge_ids references unknown flow edge: {flow_id}"
            )
    return list(value)


def _basis_enum(allowed: dict[str, list[str]]) -> list[str]:
    values = ["UNKNOWN"]
    for status in EVIDENCE_STATUS_ORDER:
        for evidence_id, statuses in allowed.items():
            if status in statuses:
                values.append(f"{status}:{evidence_id}")
    return values


def build_schema(contract: dict[str, Any]) -> dict[str, Any]:
    allowlist = contract.get("claim_evidence_status_allowlist")
    if not isinstance(allowlist, dict):
        raise ResponseContractError("claim_evidence_status_allowlist missing")
    flow_registry = contract.get("flow_edge_registry")
    if not isinstance(flow_registry, dict) or not flow_registry:
        raise ResponseContractError("flow_edge_registry missing")
    expected_scope = contract.get("expected_scope")
    if not isinstance(expected_scope, str) or not expected_scope:
        raise ResponseContractError("expected_scope missing")
    flow_ids = sorted(flow_registry, key=lambda value: int(value[1:]))
    return {
        "type": "object",
        "properties": {
            "scope": {"type": "string", "enum": [expected_scope]},
            "authority": {"type": "string", "enum": _basis_enum(allowlist["authority"])},
            "flow_edges": {
                "type": "array",
                "minItems": 0,
                "maxItems": min(3, len(flow_ids)),
                "items": {"type": "string", "enum": flow_ids},
            },
            "request_identity": {
                "type": "string",
                "enum": _basis_enum(allowlist["request_identity"]),
            },
            "no_extra_io": {
                "type": "string",
                "enum": _basis_enum(allowlist["no_extra_io"]),
            },
            "tests": {
                "type": "array",
                "maxItems": 2,
                "items": {"type": "string", "enum": _basis_enum(allowlist["tests"])},
            },
            "generated_release": {
                "type": "string",
                "enum": _basis_enum(allowlist["generated_release"]),
            },
            "narrowest_boundary": {
                "type": "string",
                "enum": _basis_enum(allowlist["narrowest_boundary"]),
            },
            "blocked_claims": {
                "type": "array",
                "maxItems": 2,
                "items": {"type": "string", "maxLength": 120},
            },
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
        "flow_edge_registry",
        "required_flow_edge_ids",
        "claim_evidence_status_allowlist",
    }
    if set(raw_contract) != expected:
        raise ResponseContractError(
            "response contract must contain exactly id, expected_scope, prompt_instruction, "
            "evidence_registry, flow_edge_registry, required_flow_edge_ids, "
            "claim_evidence_status_allowlist"
        )
    for key in ("id", "expected_scope", "prompt_instruction"):
        if not isinstance(raw_contract.get(key), str) or not raw_contract[key].strip():
            raise ResponseContractError(f"response contract {key} missing")

    registry = raw_contract.get("evidence_registry")
    if not isinstance(registry, dict) or not 1 <= len(registry) <= 16:
        raise ResponseContractError(
            "response contract evidence_registry must contain 1-16 entries"
        )
    for evidence_id, entry in registry.items():
        if not isinstance(evidence_id, str) or EVIDENCE_ID_RE.fullmatch(evidence_id) is None:
            raise ResponseContractError(f"invalid evidence id: {evidence_id}")
        if not isinstance(entry, dict) or set(entry) != {"source_path", "source_anchor"}:
            raise ResponseContractError(
                f"evidence {evidence_id} must contain exactly source_path and source_anchor"
            )
        for key in ("source_path", "source_anchor"):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise ResponseContractError(f"evidence {evidence_id} {key} missing")

    flow_registry = _validate_flow_edge_registry(
        raw_contract.get("flow_edge_registry"),
        registry,
    )
    required_flow_edge_ids = _validate_required_flow_edge_ids(
        raw_contract.get("required_flow_edge_ids"),
        flow_registry,
    )
    allowlist = _validate_claim_evidence_status_allowlist(
        raw_contract.get("claim_evidence_status_allowlist"),
        registry,
    )
    contract = dict(raw_contract)
    contract["flow_edge_registry"] = flow_registry
    contract["required_flow_edge_ids"] = required_flow_edge_ids
    contract["claim_evidence_status_allowlist"] = allowlist
    contract["schema"] = build_schema(contract)
    return contract


def response_format(contract: dict[str, Any] | None) -> dict[str, Any] | None:
    if contract is None:
        return None
    return {"type": "json_object", "schema": contract["schema"]}


def _bounded_string(
    value: Any,
    label: str,
    maximum: int,
    *,
    allow_empty: bool = True,
) -> str:
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
            raise ResponseContractError(
                f"duplicate context path with conflicting text: {path}"
            )
        result[path] = text
    return result


def validate_evidence_registry(
    contract: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, dict[str, str]]:
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
        source_path = _bounded_string(
            entry.get("source_path"),
            f"evidence {evidence_id}.source_path",
            180,
            allow_empty=False,
        )
        source_anchor = _bounded_string(
            entry.get("source_anchor"),
            f"evidence {evidence_id}.source_anchor",
            120,
            allow_empty=False,
        )
        source_text = sources.get(source_path)
        if source_text is None:
            raise ResponseContractError(
                f"evidence {evidence_id}.source_path is not a supplied context path: {source_path}"
            )
        if source_anchor not in source_text:
            raise ResponseContractError(
                f"evidence {evidence_id}.source_anchor not found verbatim in "
                f"{source_path}: {source_anchor}"
            )
        validated[evidence_id] = {
            "source_path": source_path,
            "source_anchor": source_anchor,
        }
    return validated


def validate_flow_edge_registry(
    contract: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    registry = validate_evidence_registry(contract, context)
    flow_registry = contract.get("flow_edge_registry")
    if not isinstance(flow_registry, dict) or not flow_registry:
        raise ResponseContractError("flow_edge_registry missing")
    validated: dict[str, dict[str, Any]] = {}
    for flow_id in sorted(flow_registry, key=lambda value: int(value[1:])):
        entry = flow_registry[flow_id]
        if not isinstance(entry, dict) or set(entry) != {"from", "to", "evidence_ids"}:
            raise ResponseContractError(f"flow edge {flow_id} malformed")
        for evidence_id in entry["evidence_ids"]:
            if evidence_id not in registry:
                raise ResponseContractError(
                    f"flow edge {flow_id} references unavailable evidence id: {evidence_id}"
                )
        validated[flow_id] = {
            "from": entry["from"],
            "to": entry["to"],
            "evidence_ids": list(entry["evidence_ids"]),
        }
    return validated


def evidence_legend(contract: dict[str, Any], context: dict[str, Any]) -> str:
    registry = validate_evidence_registry(contract, context)
    return "\n".join(
        f"{evidence_id} = {entry['source_path']} :: {entry['source_anchor']}"
        for evidence_id, entry in registry.items()
    )


def flow_edge_legend(contract: dict[str, Any], context: dict[str, Any]) -> str:
    flow_registry = validate_flow_edge_registry(contract, context)
    return "\n".join(
        f"{flow_id} = {entry['from']} -> {entry['to']} :: {','.join(entry['evidence_ids'])}"
        for flow_id, entry in flow_registry.items()
    )


def claim_evidence_legend(contract: dict[str, Any]) -> str:
    allowlist = contract.get("claim_evidence_status_allowlist")
    if not isinstance(allowlist, dict) or set(allowlist) != set(BASIS_CLAIMS):
        raise ResponseContractError(
            "claim_evidence_status_allowlist missing or malformed"
        )
    lines: list[str] = []
    for claim in BASIS_CLAIMS:
        pairs = [
            value
            for value in _basis_enum(allowlist[claim])
            if value != "UNKNOWN"
        ]
        lines.append(f"{claim} = {','.join(pairs)}")
    return "\n".join(lines)


def _validate_basis(
    value: Any,
    label: str,
    registry: dict[str, dict[str, str]],
    allowed: dict[str, list[str]],
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
        raise ResponseContractError(
            f"{label} references unknown evidence id: {evidence_id}"
        )
    if evidence_id not in allowed:
        raise ResponseContractError(
            f"{label} evidence id not compatible with claim: {evidence_id}"
        )
    if status not in allowed[evidence_id]:
        raise ResponseContractError(
            f"{label} status not compatible with claim/evidence: {status}:{evidence_id}"
        )
    return {"basis": basis, "status": status, "evidence_id": evidence_id}


def _derive_impact_verdict(
    authority: dict[str, Any],
    selected_flow_edge_ids: list[str],
    required_flow_edge_ids: list[str],
    request_identity: dict[str, Any],
    no_extra_io: dict[str, Any],
    test_bases: list[dict[str, Any]],
    generated_release: dict[str, Any],
    narrowest_boundary: dict[str, Any],
    blocked_claims: list[str],
) -> str:
    all_bases = [
        authority,
        request_identity,
        no_extra_io,
        *test_bases,
        generated_release,
        narrowest_boundary,
    ]
    if any(item["status"] == "CONFLICT" for item in all_bases):
        return "CONFLICT"
    has_any_grounding = bool(selected_flow_edge_ids) or any(
        item["status"] != "UNKNOWN" for item in all_bases
    )
    if not has_any_grounding:
        return "UNKNOWN"

    required_preservation = (
        authority,
        request_identity,
        no_extra_io,
        generated_release,
        narrowest_boundary,
    )
    required_resolved = all(
        item["status"] in {"DIRECT", "SUPPORTED_LIKELY"}
        for item in required_preservation
    )
    has_required_flow_chain = set(required_flow_edge_ids).issubset(
        set(selected_flow_edge_ids)
    )
    has_source_backed_test = any(
        item["status"] in {"DIRECT", "SUPPORTED_LIKELY"}
        for item in test_bases
    )
    if (
        required_resolved
        and has_required_flow_chain
        and has_source_backed_test
        and not blocked_claims
    ):
        return "SUPPORTED"
    return "PARTIAL"


def validate_impact_scope_output(
    content: str,
    contract: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ResponseContractError(
            f"structured response is not valid JSON: {exc}"
        ) from exc
    if not isinstance(payload, dict) or set(payload) != TOP_LEVEL_KEYS:
        raise ResponseContractError(
            f"structured response must contain exactly {sorted(TOP_LEVEL_KEYS)}"
        )
    scope = _bounded_string(payload.get("scope"), "scope", 80, allow_empty=False)
    if scope != contract["expected_scope"]:
        raise ResponseContractError(
            f"scope mismatch: expected {contract['expected_scope']}, got {scope}"
        )

    registry = validate_evidence_registry(contract, context)
    flow_registry = validate_flow_edge_registry(contract, context)
    allowlist = contract.get("claim_evidence_status_allowlist")
    if not isinstance(allowlist, dict):
        raise ResponseContractError("claim_evidence_status_allowlist missing")

    authority = _validate_basis(
        payload.get("authority"),
        "authority",
        registry,
        allowlist["authority"],
    )

    edges = payload.get("flow_edges")
    if not isinstance(edges, list) or len(edges) > min(3, len(flow_registry)):
        raise ResponseContractError("flow_edges must contain at most 3 registered F# ids")
    if len(edges) != len(set(edges)):
        raise ResponseContractError("duplicate flow edge id rejected")
    selected_flow_edge_ids: list[str] = []
    for index, flow_id in enumerate(edges):
        if not isinstance(flow_id, str) or flow_id not in flow_registry:
            raise ResponseContractError(
                f"flow_edges[{index}] must reference a registered flow edge id"
            )
        selected_flow_edge_ids.append(flow_id)

    request_identity = _validate_basis(
        payload.get("request_identity"),
        "request_identity",
        registry,
        allowlist["request_identity"],
    )
    no_extra_io = _validate_basis(
        payload.get("no_extra_io"),
        "no_extra_io",
        registry,
        allowlist["no_extra_io"],
    )

    tests = payload.get("tests")
    if not isinstance(tests, list) or len(tests) > 2:
        raise ResponseContractError("tests must contain at most 2 entries")
    test_bases = [
        _validate_basis(
            item,
            f"tests[{index}]",
            registry,
            allowlist["tests"],
        )
        for index, item in enumerate(tests)
    ]

    generated_release = _validate_basis(
        payload.get("generated_release"),
        "generated_release",
        registry,
        allowlist["generated_release"],
    )
    narrowest_boundary = _validate_basis(
        payload.get("narrowest_boundary"),
        "narrowest_boundary",
        registry,
        allowlist["narrowest_boundary"],
    )

    blocked = payload.get("blocked_claims")
    if not isinstance(blocked, list) or len(blocked) > 2:
        raise ResponseContractError(
            "blocked_claims must contain at most 2 entries"
        )
    for index, item in enumerate(blocked):
        _bounded_string(item, f"blocked_claims[{index}]", 120)

    required_flow_edge_ids = contract.get("required_flow_edge_ids")
    if not isinstance(required_flow_edge_ids, list):
        raise ResponseContractError("required_flow_edge_ids missing")
    derived_verdict = _derive_impact_verdict(
        authority,
        selected_flow_edge_ids,
        required_flow_edge_ids,
        request_identity,
        no_extra_io,
        test_bases,
        generated_release,
        narrowest_boundary,
        blocked,
    )
    if derived_verdict not in DERIVED_IMPACT_VERDICTS:
        raise ResponseContractError("derived impact verdict invalid")

    result = dict(payload)
    result["resolved_flow_edges"] = [
        {
            "id": flow_id,
            **flow_registry[flow_id],
        }
        for flow_id in selected_flow_edge_ids
    ]
    result["derived_impact_verdict"] = derived_verdict
    return result


def validate_content(
    content: str,
    contract: dict[str, Any] | None,
    context: dict[str, Any],
) -> dict[str, Any] | None:
    if contract is None:
        return None
    if contract.get("id") != "impact-scope-grounded-flow-v7":
        raise ResponseContractError(
            f"unsupported response contract id: {contract.get('id')}"
        )
    return validate_impact_scope_output(content, contract, context)
